/**
 * AidService: the application layer between the HTTP API and the store.
 *
 * Owns input validation, the student profile, the tracked-application
 * pipeline, and the automated outputs — matches, the deadline-ordered action
 * plan, and the money dashboard. All matching math is delegated to the pure
 * engine in domain/engine.ts.
 */

import { randomUUID } from 'node:crypto';
import { CATALOG, findOpportunity } from '../domain/catalog.ts';
import {
  daysUntil,
  matchProfile,
  nearMisses,
  nextDeadline,
  totalEstimated,
} from '../domain/engine.ts';
import type { NearMiss } from '../domain/engine.ts';
import { buildIcs } from '../domain/ics.ts';
import {
  APPLICATION_STATUSES,
  DEGREE_LEVELS,
  FIELDS_OF_STUDY,
} from '../domain/types.ts';
import type {
  Application,
  ApplicationStatus,
  DegreeLevel,
  FieldOfStudy,
  Match,
  Opportunity,
  StudentProfile,
} from '../domain/types.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';
import type { Store } from '../store/store.ts';

const STATE_PATTERN = /^[A-Z]{2}$/;

export interface MatchReport {
  matches: Match[];
  totalEstimated: number;
}

export interface PlanItem {
  opportunity: Opportunity;
  estimatedAmount: number;
  nextDeadline: string | null;
  daysLeft: number | null;
  /** Tracked application status, or "unstarted" when only matched. */
  status: ApplicationStatus | 'unstarted';
  applicationId: string | null;
  action: string;
}

export interface Dashboard {
  potential: number;
  submitted: number;
  won: number;
}

export class AidService {
  private readonly store: Store;
  private readonly now: () => Date;

  constructor(opts: { store: Store; now?: () => Date }) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
  }

  // --- profile ------------------------------------------------------------

  getProfile(ownerId: string): StudentProfile | null {
    return this.store.getProfile(ownerId) ?? null;
  }

  updateProfile(ownerId: string, input: unknown): StudentProfile {
    const profile = parseProfile(ownerId, input, this.now().toISOString());
    this.store.putProfile(profile);
    return profile;
  }

  // --- catalog & matching -------------------------------------------------

  listOpportunities(): Opportunity[] {
    return CATALOG;
  }

  getMatches(ownerId: string): MatchReport {
    const profile = this.requireProfile(ownerId);
    const matches = matchProfile(profile, this.now());
    return { matches, totalEstimated: totalEstimated(matches) };
  }

  /**
   * Opportunities the student could realistically unlock (every blocker is
   * fixable), with what's standing in the way and the dollars at stake.
   */
  getNearMisses(ownerId: string): { nearMisses: NearMiss[]; totalPotential: number } {
    const profile = this.requireProfile(ownerId);
    const misses = nearMisses(profile);
    return {
      nearMisses: misses,
      totalPotential: misses.reduce((sum, m) => sum + m.potentialAmount, 0),
    };
  }

  /** The dated, still-actionable plan items as an iCalendar file with reminders. */
  getPlanCalendar(ownerId: string): string {
    const actionable = this.getPlan(ownerId).filter(
      (item) =>
        item.nextDeadline !== null &&
        (item.status === 'unstarted' || item.status === 'planned' || item.status === 'in-progress'),
    );
    return buildIcs(
      actionable.map((item) => ({
        id: item.opportunity.id,
        name: item.opportunity.name,
        date: item.nextDeadline!,
        estimatedAmount: item.estimatedAmount,
        url: item.opportunity.url,
      })),
      this.now(),
    );
  }

  /**
   * The automation payoff: every match plus every tracked application, merged
   * and ordered by next deadline (rolling ones last), each with the single
   * next action to take.
   */
  getPlan(ownerId: string): PlanItem[] {
    const profile = this.requireProfile(ownerId);
    const today = this.now();
    const apps = this.store.listApplications(ownerId);
    const byOpportunity = new Map(apps.map((a) => [a.opportunityId, a]));
    const items = new Map<string, PlanItem>();

    for (const match of matchProfile(profile, today)) {
      const app = byOpportunity.get(match.opportunity.id);
      items.set(match.opportunity.id, planItem(match.opportunity, match.estimatedAmount, app, today));
    }
    // Tracked applications survive in the plan even if a profile edit un-matches them.
    for (const app of apps) {
      if (items.has(app.opportunityId)) continue;
      const opp = findOpportunity(app.opportunityId);
      if (opp) items.set(opp.id, planItem(opp, 0, app, today));
    }

    return [...items.values()].sort((a, b) => {
      if (a.nextDeadline === null && b.nextDeadline === null) return b.estimatedAmount - a.estimatedAmount;
      if (a.nextDeadline === null) return 1;
      if (b.nextDeadline === null) return -1;
      return a.nextDeadline.localeCompare(b.nextDeadline);
    });
  }

  // --- application pipeline -------------------------------------------------

  trackApplication(ownerId: string, input: unknown): Application {
    const obj = asObject(input);
    const opportunityId = obj.opportunityId;
    if (typeof opportunityId !== 'string' || !findOpportunity(opportunityId)) {
      throw new ValidationError('opportunityId must reference a catalog opportunity');
    }
    const existing = this.store
      .listApplications(ownerId)
      .find((a) => a.opportunityId === opportunityId);
    if (existing) throw new ConflictError(`already tracking ${opportunityId}`);
    const timestamp = this.now().toISOString();
    const app: Application = {
      id: randomUUID(),
      ownerId,
      opportunityId,
      status: 'planned',
      amountWon: 0,
      note: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.store.putApplication(app);
    return app;
  }

  listApplications(ownerId: string): { applications: Application[]; dashboard: Dashboard } {
    const applications = this.store
      .listApplications(ownerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { applications, dashboard: this.dashboard(ownerId, applications) };
  }

  updateApplication(ownerId: string, id: string, input: unknown): Application {
    const app = this.loadApplication(ownerId, id);
    const obj = asObject(input);
    if (obj.status !== undefined) {
      if (
        typeof obj.status !== 'string' ||
        !APPLICATION_STATUSES.includes(obj.status as ApplicationStatus)
      ) {
        throw new ValidationError(`status must be one of: ${APPLICATION_STATUSES.join(', ')}`);
      }
      app.status = obj.status as ApplicationStatus;
    }
    if (obj.amountWon !== undefined) {
      if (typeof obj.amountWon !== 'number' || !Number.isFinite(obj.amountWon) || obj.amountWon < 0) {
        throw new ValidationError('amountWon must be a non-negative number');
      }
      app.amountWon = Math.round(obj.amountWon);
    }
    if (obj.note !== undefined) {
      if (typeof obj.note !== 'string') throw new ValidationError('note must be a string');
      app.note = obj.note;
    }
    if (app.status !== 'won') app.amountWon = 0;
    app.updatedAt = this.now().toISOString();
    this.store.putApplication(app);
    return app;
  }

  deleteApplication(ownerId: string, id: string): void {
    this.loadApplication(ownerId, id);
    this.store.deleteApplication(id);
  }

  // --- internals ------------------------------------------------------------

  private dashboard(ownerId: string, applications: Application[]): Dashboard {
    const profile = this.store.getProfile(ownerId);
    const potential = profile ? totalEstimated(matchProfile(profile, this.now())) : 0;
    let submitted = 0;
    let won = 0;
    for (const app of applications) {
      const opp = findOpportunity(app.opportunityId);
      if (app.status === 'submitted' && opp) {
        submitted += profile ? estimateFor(profile, opp) : 0;
      }
      if (app.status === 'won') won += app.amountWon;
    }
    return { potential, submitted, won };
  }

  private requireProfile(ownerId: string): StudentProfile {
    const profile = this.store.getProfile(ownerId);
    if (!profile) throw new ValidationError('set up your student profile first (PUT /profile)');
    return profile;
  }

  private loadApplication(ownerId: string, id: string): Application {
    const app = this.store.getApplication(id);
    if (!app || app.ownerId !== ownerId) throw new NotFoundError(`no application with id ${id}`);
    return app;
  }
}

function planItem(
  opp: Opportunity,
  estimatedAmount: number,
  app: Application | undefined,
  today: Date,
): PlanItem {
  const deadline = nextDeadline(opp.deadline, today);
  const status: PlanItem['status'] = app?.status ?? 'unstarted';
  return {
    opportunity: opp,
    estimatedAmount,
    nextDeadline: deadline,
    daysLeft: deadline ? daysUntil(deadline, today) : null,
    status,
    applicationId: app?.id ?? null,
    action: actionFor(status, opp, deadline, today),
  };
}

function actionFor(
  status: PlanItem['status'],
  opp: Opportunity,
  deadline: string | null,
  today: Date,
): string {
  const due = deadline ? `due ${deadline} (${daysUntil(deadline, today)} days)` : 'apply any time';
  switch (status) {
    case 'unstarted':
      return `Start the application — ${due}`;
    case 'planned':
      return `Begin working on it — ${due}`;
    case 'in-progress':
      return `Finish and submit — ${due}`;
    case 'submitted':
      return 'Submitted — watch for the decision';
    case 'won':
      return 'Won — congratulations!';
    case 'declined':
      return `Declined — ${opp.renewable ? 'reapply next cycle' : 'move on to the next one'}`;
  }
}

function estimateFor(profile: StudentProfile, opp: Opportunity): number {
  const matches = matchProfile(profile, new Date(profile.updatedAt), [opp]);
  return matches[0]?.estimatedAmount ?? Math.round((opp.amountMin + opp.amountMax) / 2);
}

// --- input parsing/validation helpers --------------------------------------

function asObject(input: unknown): Record<string, unknown> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('request body must be a JSON object');
  }
  return input as Record<string, unknown>;
}

function parseProfile(ownerId: string, input: unknown, updatedAt: string): StudentProfile {
  const obj = asObject(input);

  const state = String(obj.state ?? '').trim().toUpperCase();
  if (!STATE_PATTERN.test(state)) throw new ValidationError('state must be a 2-letter code');

  const degreeLevel = obj.degreeLevel;
  if (typeof degreeLevel !== 'string' || !DEGREE_LEVELS.includes(degreeLevel as DegreeLevel)) {
    throw new ValidationError(`degreeLevel must be one of: ${DEGREE_LEVELS.join(', ')}`);
  }

  const fieldOfStudy = obj.fieldOfStudy ?? 'undecided';
  if (typeof fieldOfStudy !== 'string' || !FIELDS_OF_STUDY.includes(fieldOfStudy as FieldOfStudy)) {
    throw new ValidationError(`fieldOfStudy must be one of: ${FIELDS_OF_STUDY.join(', ')}`);
  }

  let gpa: number | null = null;
  if (obj.gpa !== undefined && obj.gpa !== null && obj.gpa !== '') {
    const value = Number(obj.gpa);
    if (!Number.isFinite(value) || value < 0 || value > 4.0) {
      throw new ValidationError('gpa must be between 0 and 4.0 (leave blank if unknown)');
    }
    gpa = Math.round(value * 100) / 100;
  }

  const householdIncome = Number(obj.householdIncome);
  if (!Number.isFinite(householdIncome) || householdIncome < 0) {
    throw new ValidationError('householdIncome must be a non-negative number');
  }

  const householdSize = Number(obj.householdSize);
  if (!Number.isInteger(householdSize) || householdSize < 1 || householdSize > 20) {
    throw new ValidationError('householdSize must be a whole number between 1 and 20');
  }

  return {
    ownerId,
    state,
    degreeLevel: degreeLevel as DegreeLevel,
    fieldOfStudy: fieldOfStudy as FieldOfStudy,
    gpa,
    householdIncome: Math.round(householdIncome),
    householdSize,
    enrolledHalfTimePlus: obj.enrolledHalfTimePlus !== false,
    usCitizenOrEligibleNoncitizen: obj.usCitizenOrEligibleNoncitizen !== false,
    firstGeneration: obj.firstGeneration === true,
    communityService: obj.communityService === true,
    militaryAffiliation: obj.militaryAffiliation === true,
    employed: obj.employed === true,
    updatedAt,
  };
}
