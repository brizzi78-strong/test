/**
 * Employment-status transitions and org-graph helpers (cycle detection,
 * reporting chains). Pure functions over lookups, so they're easy to test and
 * carry no storage concerns.
 */

import type { Employee, EmploymentStatus } from './types.ts';

const STATUS_TRANSITIONS: Record<EmploymentStatus, readonly EmploymentStatus[]> = {
  active: ['on_leave', 'terminated'],
  on_leave: ['active', 'terminated'],
  // A terminated employee can be reactivated on rehire.
  terminated: ['active'],
};

export function canChangeStatus(from: EmploymentStatus, to: EmploymentStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

/** A function that returns an entity's parent id (manager or parent dept). */
export type ParentOf = (id: string) => string | undefined;

/**
 * Walk the chain of parents from `startId` upward, returning the ordered list
 * of ancestor ids. Stops at the root or if a cycle is detected (defensive).
 */
export function ancestors(startId: string, parentOf: ParentOf): string[] {
  const chain: string[] = [];
  const seen = new Set<string>([startId]);
  let current = parentOf(startId);
  while (current && !seen.has(current)) {
    chain.push(current);
    seen.add(current);
    current = parentOf(current);
  }
  return chain;
}

/**
 * Would making `parentId` the parent of `childId` create a cycle? True if
 * they're the same node, or if `parentId` is already a descendant of `childId`
 * (i.e. `childId` appears in `parentId`'s ancestor chain).
 */
export function wouldCreateCycle(childId: string, parentId: string, parentOf: ParentOf): boolean {
  if (childId === parentId) return true;
  return ancestors(parentId, parentOf).includes(childId);
}

/** The reporting chain for an employee: manager, manager's manager, … to the top. */
export function reportingChain(employeeId: string, employees: ReadonlyMap<string, Employee>): string[] {
  return ancestors(employeeId, (id) => employees.get(id)?.managerId);
}
