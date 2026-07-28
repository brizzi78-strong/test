/**
 * Core domain types for the Orchestrator — the shared-identity layer.
 *
 * Each HR service keeps its own local records, so a person exists as several
 * disconnected rows across services. The orchestrator introduces a *canonical*
 * company and person, and a link map that records the id that same entity has
 * in each downstream service. Hiring cascades creation across the services and
 * records the mapping, turning "one employee record" from marketing into a real
 * lookup.
 */

/** Normalized identity used to provision a person into every service. */
export interface PersonInput {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  employmentType: string;
  hireDate: string;
}

/** Canonical company plus the id it has in each downstream service. */
export interface Company {
  id: string;
  name: string;
  /** service name -> that service's company id */
  links: Record<string, string>;
  createdAt: string;
}

/** Canonical person plus the id they have in each downstream service. */
export interface Person {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  employmentType: string;
  hireDate: string;
  /** service name -> that service's record id (employee/candidate/learner) */
  links: Record<string, string>;
  createdAt: string;
}
