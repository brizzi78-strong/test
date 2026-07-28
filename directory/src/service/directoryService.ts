/**
 * DirectoryService — orchestration for the employee directory / HRIS core.
 *
 * Responsibilities:
 *   - manage companies, the department tree, and the canonical employee record
 *   - keep the org graph sound: unique work emails per company, managers in the
 *     same company, and no cycles in the manager or department hierarchies
 *   - drive employment-status changes through a small state machine
 *   - answer org-chart questions (direct reports, reporting chain)
 *
 * Clock and id generator are injected for deterministic tests.
 */

import { randomUUID } from 'node:crypto';
import type {
  Company,
  Department,
  Employee,
  EmploymentStatus,
  EmploymentType,
} from '../domain/types.ts';
import { EMPLOYMENT_TYPES } from '../domain/types.ts';
import { canChangeStatus, reportingChain, wouldCreateCycle } from '../domain/orgchart.ts';
import type { Collection, Store } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';

export interface ServiceOptions {
  store: Store;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class DirectoryService {
  private readonly store: Store;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((prefix) => `${prefix}_${randomUUID()}`);
  }

  // --- Companies ---------------------------------------------------------

  createCompany(input: { name: string }): Company {
    const company: Company = {
      id: this.newId('co'),
      name: requireString(input.name, 'name'),
      createdAt: this.timestamp(),
    };
    this.store.companies.put(company);
    return company;
  }

  // --- Departments -------------------------------------------------------

  createDepartment(input: { companyId: string; name: string; parentId?: string }): Department {
    this.requireCompany(input.companyId);
    const id = this.newId('dept');
    if (input.parentId) {
      const parent = this.require(this.store.departments, 'Department', input.parentId);
      if (parent.companyId !== input.companyId) {
        throw new ValidationError('parent department belongs to another company');
      }
      // A brand-new department can't yet be an ancestor, but guard anyway.
      if (wouldCreateCycle(id, input.parentId, (d) => this.store.departments.get(d)?.parentId)) {
        throw new ConflictError('department parent would create a cycle');
      }
    }
    const department: Department = {
      id,
      companyId: input.companyId,
      name: requireString(input.name, 'name'),
      parentId: input.parentId,
      createdAt: this.timestamp(),
    };
    this.store.departments.put(department);
    return department;
  }

  listDepartments(companyId: string): Department[] {
    return this.store.departments.list((d) => d.companyId === companyId);
  }

  // --- Employees ---------------------------------------------------------

  createEmployee(input: {
    companyId: string;
    firstName: string;
    lastName: string;
    workEmail: string;
    jobTitle: string;
    employmentType: EmploymentType;
    hireDate: string;
    departmentId?: string;
    managerId?: string;
    personalEmail?: string;
    phone?: string;
    location?: string;
  }): Employee {
    const company = this.requireCompany(input.companyId);
    const workEmail = this.validateEmail(input.workEmail, 'workEmail');
    this.assertEmailAvailable(company.id, workEmail, null);
    if (!EMPLOYMENT_TYPES.includes(input.employmentType)) {
      throw new ValidationError(`unknown employmentType: ${String(input.employmentType)}`);
    }
    if (!DATE_RE.test(input.hireDate ?? '')) {
      throw new ValidationError('hireDate must be an ISO date (YYYY-MM-DD)');
    }
    if (input.departmentId) this.requireDepartmentInCompany(company.id, input.departmentId);

    const id = this.newId('emp');
    const employee: Employee = {
      id,
      companyId: company.id,
      firstName: requireString(input.firstName, 'firstName'),
      lastName: requireString(input.lastName, 'lastName'),
      workEmail,
      personalEmail: input.personalEmail,
      phone: input.phone,
      jobTitle: requireString(input.jobTitle, 'jobTitle'),
      departmentId: input.departmentId,
      employmentType: input.employmentType,
      status: 'active',
      hireDate: input.hireDate,
      location: input.location,
      createdAt: this.timestamp(),
      updatedAt: this.timestamp(),
    };
    if (input.managerId) {
      this.applyManager(employee, input.managerId);
    }
    this.store.employees.put(employee);
    return employee;
  }

  getEmployee(id: string): Employee {
    return this.require(this.store.employees, 'Employee', id);
  }

  listEmployees(filter?: {
    companyId?: string;
    departmentId?: string;
    managerId?: string;
    status?: EmploymentStatus;
    search?: string;
  }): Employee[] {
    const q = filter?.search?.trim().toLowerCase();
    return this.store.employees.list((e) => {
      if (filter?.companyId && e.companyId !== filter.companyId) return false;
      if (filter?.departmentId && e.departmentId !== filter.departmentId) return false;
      if (filter?.managerId && e.managerId !== filter.managerId) return false;
      if (filter?.status && e.status !== filter.status) return false;
      if (q) {
        const hay = `${e.firstName} ${e.lastName} ${e.workEmail} ${e.jobTitle}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  updateEmployee(
    id: string,
    patch: {
      firstName?: string;
      lastName?: string;
      workEmail?: string;
      personalEmail?: string;
      phone?: string;
      jobTitle?: string;
      location?: string;
    },
  ): Employee {
    const employee = this.getEmployee(id);
    if (patch.workEmail !== undefined) {
      const email = this.validateEmail(patch.workEmail, 'workEmail');
      this.assertEmailAvailable(employee.companyId, email, employee.id);
      employee.workEmail = email;
    }
    if (patch.firstName !== undefined) employee.firstName = requireString(patch.firstName, 'firstName');
    if (patch.lastName !== undefined) employee.lastName = requireString(patch.lastName, 'lastName');
    if (patch.jobTitle !== undefined) employee.jobTitle = requireString(patch.jobTitle, 'jobTitle');
    if (patch.personalEmail !== undefined) employee.personalEmail = patch.personalEmail || undefined;
    if (patch.phone !== undefined) employee.phone = patch.phone || undefined;
    if (patch.location !== undefined) employee.location = patch.location || undefined;
    return this.save(employee);
  }

  assignDepartment(id: string, departmentId: string | null): Employee {
    const employee = this.getEmployee(id);
    if (departmentId) this.requireDepartmentInCompany(employee.companyId, departmentId);
    employee.departmentId = departmentId ?? undefined;
    return this.save(employee);
  }

  setManager(id: string, managerId: string | null): Employee {
    const employee = this.getEmployee(id);
    if (managerId) {
      this.applyManager(employee, managerId);
    } else {
      employee.managerId = undefined;
    }
    return this.save(employee);
  }

  changeStatus(id: string, input: { to: EmploymentStatus; effectiveDate?: string }): Employee {
    const employee = this.getEmployee(id);
    if (!canChangeStatus(employee.status, input.to)) {
      throw new ConflictError(`illegal status change '${employee.status}' -> '${input.to}'`);
    }
    const effective = input.effectiveDate ?? this.today();
    if (!DATE_RE.test(effective)) {
      throw new ValidationError('effectiveDate must be an ISO date (YYYY-MM-DD)');
    }
    if (input.to === 'terminated') {
      employee.terminationDate = effective;
    } else if (input.to === 'active') {
      employee.terminationDate = undefined;
    }
    employee.status = input.to;
    return this.save(employee);
  }

  directReports(managerId: string): Employee[] {
    this.getEmployee(managerId);
    return this.store.employees.list((e) => e.managerId === managerId);
  }

  /** The employee's reporting chain, resolved to employees, top-most last. */
  reportingChain(id: string): Employee[] {
    this.getEmployee(id);
    const map = new Map(this.store.employees.list().map((e) => [e.id, e]));
    return reportingChain(id, map).map((mid) => map.get(mid)!).filter(Boolean);
  }

  // --- internals ---------------------------------------------------------

  private applyManager(employee: Employee, managerId: string): void {
    const manager = this.require(this.store.employees, 'Employee (manager)', managerId);
    if (manager.companyId !== employee.companyId) {
      throw new ValidationError('manager belongs to another company');
    }
    if (manager.id === employee.id) {
      throw new ValidationError('an employee cannot be their own manager');
    }
    if (manager.status === 'terminated') {
      throw new ConflictError('a terminated employee cannot be a manager');
    }
    if (wouldCreateCycle(employee.id, managerId, (mid) => this.store.employees.get(mid)?.managerId)) {
      throw new ConflictError('that manager assignment would create a reporting cycle');
    }
    employee.managerId = managerId;
  }

  private assertEmailAvailable(companyId: string, workEmail: string, exceptId: string | null): void {
    const lower = workEmail.toLowerCase();
    const clash = this.store.employees.list(
      (e) => e.companyId === companyId && e.id !== exceptId && e.workEmail.toLowerCase() === lower,
    );
    if (clash.length > 0) {
      throw new ConflictError(`workEmail already in use: ${workEmail}`);
    }
  }

  private requireDepartmentInCompany(companyId: string, departmentId: string): Department {
    const dept = this.require(this.store.departments, 'Department', departmentId);
    if (dept.companyId !== companyId) {
      throw new ValidationError('department belongs to another company');
    }
    return dept;
  }

  private validateEmail(value: unknown, field: string): string {
    const email = requireString(value, field);
    if (!EMAIL_RE.test(email)) throw new ValidationError(`${field} is not a valid address: ${email}`);
    return email;
  }

  private save(employee: Employee): Employee {
    employee.updatedAt = this.timestamp();
    this.store.employees.put(employee);
    return employee;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private today(): string {
    return this.timestamp().slice(0, 10);
  }

  private requireCompany(id: string): Company {
    return this.require(this.store.companies, 'Company', id);
  }

  private require<T>(collection: Collection<T>, what: string, id: string): T {
    if (typeof id !== 'string' || id.length === 0) {
      throw new ValidationError(`${what} id is required`);
    }
    const found = collection.get(id);
    if (!found) throw new NotFoundError(what, id);
    return found;
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}
