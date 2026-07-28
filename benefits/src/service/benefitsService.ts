/**
 * BenefitsService — orchestration for benefits election / enrollment.
 *
 * Responsibilities:
 *   - manage companies, employees, and a company's benefit-plan catalog
 *   - let an employee elect a plan + coverage tier per benefit type (or waive),
 *     list dependents, and submit; a benefits admin confirms
 *   - enforce that elections reference real plans/tiers/dependents and that
 *     edits only happen before submission
 *   - compute the total monthly premium, and keep an append-only history
 *
 * The clock and id generator are injected so the lifecycle is deterministic
 * under test. Money is handled in integer cents to avoid float drift.
 */

import { randomUUID } from 'node:crypto';
import type {
  BenefitPlan,
  BenefitType,
  Company,
  CoverageTier,
  Dependent,
  DependentRelationship,
  Election,
  Employee,
  Enrollment,
  EnrollmentEvent,
  PlanTier,
} from '../domain/types.ts';
import { BENEFIT_TYPES, COVERAGE_TIERS } from '../domain/types.ts';
import { canTransition, totalMonthlyCostCents } from '../domain/workflow.ts';
import type { Collection, Store } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';

export interface ServiceOptions {
  store: Store;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RELATIONSHIPS: readonly DependentRelationship[] = ['spouse', 'domestic_partner', 'child', 'other'];

export interface EnrollmentSummary {
  enrollment: Enrollment;
  monthlyCostCents: number;
}

export class BenefitsService {
  private readonly store: Store;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((prefix) => `${prefix}_${randomUUID()}`);
  }

  // --- Companies / employees --------------------------------------------

  createCompany(input: { name: string }): Company {
    const company: Company = {
      id: this.newId('co'),
      name: requireString(input.name, 'name'),
      createdAt: this.timestamp(),
    };
    this.store.companies.put(company);
    return company;
  }

  createEmployee(input: {
    companyId: string;
    firstName: string;
    lastName: string;
    email: string;
  }): Employee {
    this.requireCompany(input.companyId);
    const email = requireString(input.email, 'email');
    if (!EMAIL_RE.test(email)) {
      throw new ValidationError(`email is not a valid address: ${email}`);
    }
    const employee: Employee = {
      id: this.newId('emp'),
      companyId: input.companyId,
      firstName: requireString(input.firstName, 'firstName'),
      lastName: requireString(input.lastName, 'lastName'),
      email,
      createdAt: this.timestamp(),
    };
    this.store.employees.put(employee);
    return employee;
  }

  // --- Plans -------------------------------------------------------------

  createPlan(input: {
    companyId: string;
    type: BenefitType;
    name: string;
    carrier?: string;
    tiers: PlanTier[];
  }): BenefitPlan {
    this.requireCompany(input.companyId);
    if (!BENEFIT_TYPES.includes(input.type)) {
      throw new ValidationError(`unknown benefit type: ${String(input.type)}`);
    }
    const tiers = this.validateTiers(input.tiers);
    const plan: BenefitPlan = {
      id: this.newId('plan'),
      companyId: input.companyId,
      type: input.type,
      name: requireString(input.name, 'name'),
      carrier: input.carrier,
      tiers,
      createdAt: this.timestamp(),
    };
    this.store.plans.put(plan);
    return plan;
  }

  getPlan(id: string): BenefitPlan {
    return this.require(this.store.plans, 'BenefitPlan', id);
  }

  listPlans(filter?: { companyId?: string; type?: BenefitType }): BenefitPlan[] {
    return this.store.plans.list((p) => {
      if (filter?.companyId && p.companyId !== filter.companyId) return false;
      if (filter?.type && p.type !== filter.type) return false;
      return true;
    });
  }

  // --- Enrollments -------------------------------------------------------

  startEnrollment(input: { companyId: string; employeeId: string }): Enrollment {
    const company = this.requireCompany(input.companyId);
    const employee = this.require(this.store.employees, 'Employee', input.employeeId);
    if (employee.companyId !== company.id) {
      throw new ValidationError('employee does not belong to company');
    }
    const ts = this.timestamp();
    const enrollment: Enrollment = {
      id: this.newId('enr'),
      companyId: company.id,
      employeeId: employee.id,
      status: 'not_started',
      elections: [],
      dependents: [],
      history: [{ at: ts, event: 'started' }],
      createdAt: ts,
      updatedAt: ts,
    };
    this.store.enrollments.put(enrollment);
    return enrollment;
  }

  getEnrollment(id: string): Enrollment {
    return this.require(this.store.enrollments, 'Enrollment', id);
  }

  listEnrollments(filter?: { companyId?: string; employeeId?: string }): Enrollment[] {
    return this.store.enrollments.list((e) => {
      if (filter?.companyId && e.companyId !== filter.companyId) return false;
      if (filter?.employeeId && e.employeeId !== filter.employeeId) return false;
      return true;
    });
  }

  /** Enrollment plus its computed monthly premium (in cents). */
  getSummary(id: string): EnrollmentSummary {
    const enrollment = this.getEnrollment(id);
    return { enrollment, monthlyCostCents: this.costOf(enrollment) };
  }

  addDependent(
    enrollmentId: string,
    input: { name: string; relationship: DependentRelationship; dateOfBirth?: string },
  ): Enrollment {
    const enrollment = this.getEnrollment(enrollmentId);
    this.assertEditable(enrollment);
    if (!RELATIONSHIPS.includes(input.relationship)) {
      throw new ValidationError(`unknown relationship: ${String(input.relationship)}`);
    }
    const dependent: Dependent = {
      id: this.newId('dep'),
      name: requireString(input.name, 'name'),
      relationship: input.relationship,
      dateOfBirth: input.dateOfBirth,
    };
    enrollment.dependents.push(dependent);
    this.touchInProgress(enrollment);
    this.record(enrollment, { event: 'dependent.added', note: dependent.name });
    return this.save(enrollment);
  }

  /** Elect a plan + tier for a benefit type (replaces any prior decision for it). */
  elect(
    enrollmentId: string,
    input: { type: BenefitType; planId: string; tier: CoverageTier; dependentIds?: string[] },
  ): Enrollment {
    const enrollment = this.getEnrollment(enrollmentId);
    this.assertEditable(enrollment);

    const plan = this.getPlan(input.planId);
    if (plan.companyId !== enrollment.companyId) {
      throw new ValidationError('plan does not belong to the enrollment company');
    }
    if (plan.type !== input.type) {
      throw new ValidationError(`plan is not a ${input.type} plan`);
    }
    if (!plan.tiers.some((t) => t.tier === input.tier)) {
      throw new ValidationError(`plan does not offer tier: ${input.tier}`);
    }
    const dependentIds = input.dependentIds ?? [];
    for (const id of dependentIds) {
      if (!enrollment.dependents.some((d) => d.id === id)) {
        throw new ValidationError(`unknown dependent on this enrollment: ${id}`);
      }
    }

    const election: Election = {
      type: input.type,
      waived: false,
      planId: plan.id,
      tier: input.tier,
      dependentIds,
    };
    this.setElection(enrollment, election);
    this.touchInProgress(enrollment);
    this.record(enrollment, { event: 'elected', type: input.type });
    return this.save(enrollment);
  }

  /** Waive a benefit type (replaces any prior decision for it). */
  waive(enrollmentId: string, type: BenefitType): Enrollment {
    const enrollment = this.getEnrollment(enrollmentId);
    this.assertEditable(enrollment);
    if (!BENEFIT_TYPES.includes(type)) {
      throw new ValidationError(`unknown benefit type: ${String(type)}`);
    }
    this.setElection(enrollment, { type, waived: true });
    this.touchInProgress(enrollment);
    this.record(enrollment, { event: 'waived', type });
    return this.save(enrollment);
  }

  submit(enrollmentId: string): Enrollment {
    const enrollment = this.getEnrollment(enrollmentId);
    if (enrollment.status !== 'in_progress') {
      throw new ConflictError(`enrollment must be 'in_progress' to submit (is '${enrollment.status}')`);
    }
    if (enrollment.elections.length === 0) {
      throw new ConflictError('make at least one election or waiver before submitting');
    }
    this.transition(enrollment, 'submitted');
    enrollment.submittedAt = this.timestamp();
    this.record(enrollment, { event: 'submitted' });
    return this.save(enrollment);
  }

  confirm(enrollmentId: string, input: { confirmedBy: string }): Enrollment {
    const enrollment = this.getEnrollment(enrollmentId);
    if (enrollment.status !== 'submitted') {
      throw new ConflictError(`enrollment must be 'submitted' to confirm (is '${enrollment.status}')`);
    }
    const by = requireString(input.confirmedBy, 'confirmedBy');
    this.transition(enrollment, 'confirmed');
    enrollment.confirmedAt = this.timestamp();
    this.record(enrollment, { event: 'confirmed', by });
    return this.save(enrollment);
  }

  /** Reopen a submitted enrollment so the employee can edit again. */
  reopen(enrollmentId: string): Enrollment {
    const enrollment = this.getEnrollment(enrollmentId);
    if (enrollment.status !== 'submitted') {
      throw new ConflictError(`only a 'submitted' enrollment can be reopened (is '${enrollment.status}')`);
    }
    this.transition(enrollment, 'in_progress');
    enrollment.submittedAt = undefined;
    this.record(enrollment, { event: 'reopened' });
    return this.save(enrollment);
  }

  // --- internals ---------------------------------------------------------

  private costOf(enrollment: Enrollment): number {
    const plans = new Map<string, BenefitPlan>();
    for (const e of enrollment.elections) {
      if (e.planId && !plans.has(e.planId)) {
        const plan = this.store.plans.get(e.planId);
        if (plan) plans.set(plan.id, plan);
      }
    }
    return totalMonthlyCostCents(enrollment.elections, plans);
  }

  private setElection(enrollment: Enrollment, election: Election): void {
    enrollment.elections = enrollment.elections.filter((e) => e.type !== election.type);
    enrollment.elections.push(election);
  }

  private assertEditable(enrollment: Enrollment): void {
    if (enrollment.status !== 'not_started' && enrollment.status !== 'in_progress') {
      throw new ConflictError(
        `enrollment is '${enrollment.status}' and can't be edited; reopen it first`,
      );
    }
  }

  private touchInProgress(enrollment: Enrollment): void {
    if (enrollment.status === 'not_started') {
      this.transition(enrollment, 'in_progress');
    }
  }

  private transition(enrollment: Enrollment, to: Enrollment['status']): void {
    if (!canTransition(enrollment.status, to)) {
      throw new ConflictError(`illegal transition '${enrollment.status}' -> '${to}'`);
    }
    enrollment.status = to;
  }

  private record(enrollment: Enrollment, meta: Omit<EnrollmentEvent, 'at'>): void {
    enrollment.history.push({ at: this.timestamp(), ...meta });
  }

  private save(enrollment: Enrollment): Enrollment {
    enrollment.updatedAt = this.timestamp();
    this.store.enrollments.put(enrollment);
    return enrollment;
  }

  private timestamp(): string {
    return this.now().toISOString();
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

  private validateTiers(tiers: PlanTier[]): PlanTier[] {
    if (!Array.isArray(tiers) || tiers.length === 0) {
      throw new ValidationError('tiers must be a non-empty array');
    }
    const seen = new Set<CoverageTier>();
    const out: PlanTier[] = [];
    for (const t of tiers) {
      if (!t || !COVERAGE_TIERS.includes(t.tier)) {
        throw new ValidationError(`unknown coverage tier: ${String(t?.tier)}`);
      }
      if (typeof t.monthlyCostCents !== 'number' || !Number.isInteger(t.monthlyCostCents) || t.monthlyCostCents < 0) {
        throw new ValidationError('monthlyCostCents must be a non-negative integer');
      }
      if (seen.has(t.tier)) throw new ValidationError(`duplicate tier: ${t.tier}`);
      seen.add(t.tier);
      out.push({ tier: t.tier, monthlyCostCents: t.monthlyCostCents });
    }
    return out;
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}
