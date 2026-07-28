/**
 * Core domain types for the Employee Directory (HRIS core).
 *
 * This is the system of record the rest of the platform hangs off: the
 * canonical employee record, the department tree, and the manager
 * relationships that form the org chart. Recruiting hands a hired candidate
 * here; Payroll, Benefits, MyHR, and Training all reference an employee that
 * lives here.
 *
 * String-literal unions (not TS enums) keep the source runnable directly under
 * Node's type stripping with no build step.
 */

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary' | 'intern';

export const EMPLOYMENT_TYPES: readonly EmploymentType[] = [
  'full_time',
  'part_time',
  'contract',
  'temporary',
  'intern',
];

/**
 * Where an employee sits in the employment lifecycle.
 * - `active`     – currently employed and working
 * - `on_leave`   – employed but on leave (medical, parental, sabbatical)
 * - `terminated` – no longer employed (can be reactivated on rehire)
 */
export type EmploymentStatus = 'active' | 'on_leave' | 'terminated';

export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  /** Parent department, forming a department tree. */
  parentId?: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  personalEmail?: string;
  phone?: string;
  jobTitle: string;
  departmentId?: string;
  /** The employee's manager (another employee in the same company). */
  managerId?: string;
  employmentType: EmploymentType;
  status: EmploymentStatus;
  /** ISO date (YYYY-MM-DD). */
  hireDate: string;
  /** ISO date; set when terminated. */
  terminationDate?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}
