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
import { buildDigest } from '../domain/digest.ts';
import type { Digest, DigestActivityEntry, DigestDeadline, DigestInput } from '../domain/digest.ts';
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
import { ConsoleNotifier } from '../notify/notifier.ts';
import type { Notifier } from '../notify/notifier.ts';

const STATE_PATTERN = /^[A-Z]{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PARENT_EMAILS = 5;

/** Status changes worth waking a parent up for — not every keystroke. */
const NOTIFY_ON_STATUS = new Set<ApplicationStatus>(['submitted', 'won', 'declined']);

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
  private readonly notifier: Notifier;

  constructor(opts: { store: Store; now?: () => Date; notifier?: Notifier }) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
    this.notifier = opts.notifier ?? new ConsoleNotifier();
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
      history: [{ status: 'planned', at: timestamp }],
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
    const previousStatus = app.status;
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
    if (app.status !== previousStatus) {
      app.history = [...app.history, { status: app.status, at: app.updatedAt }];
    }
    this.store.putApplication(app);

    if (app.status !== previousStatus && NOTIFY_ON_STATUS.has(app.status)) {
      // Fire-and-forget: a flaky mail provider should never block or fail a status update.
      this.autoNotify(ownerId).catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error('[aidfinder] auto-digest failed:', err);
      });
    }

    return app;
  }

  deleteApplication(ownerId: string, id: string): void {
    this.loadApplication(ownerId, id);
    this.store.deleteApplication(id);
  }

  // --- family digest ---------------------------------------------------------

  /** Build the parent/guardian digest without sending it — for an in-app preview. */
  previewDigest(ownerId: string): Digest {
    const profile = this.requireProfile(ownerId);
    return buildDigest(this.buildDigestInput(ownerId, profile));
  }

  /** Send the digest to every parent/guardian email on file. */
  async sendDigest(ownerId: string): Promise<{ sent: string[]; kind: string }> {
    const profile = this.requireProfile(ownerId);
    if (profile.parentEmails.length === 0) {
      throw new ValidationError('add a parent or guardian email to your profile first');
    }
    const digest = buildDigest(this.buildDigestInput(ownerId, profile));
    for (const to of profile.parentEmails) {
      await this.notifier.send({ to, subject: digest.subject, text: digest.text, html: digest.html });
    }
    return { sent: profile.parentEmails, kind: this.notifier.kind };
  }

  private async autoNotify(ownerId: string): Promise<void> {
    const profile = this.store.getProfile(ownerId);
    if (!profile || profile.parentEmails.length === 0) return;
    await this.sendDigest(ownerId);
  }

  private buildDigestInput(ownerId: string, profile: StudentProfile): DigestInput {
    const applications = this.store.listApplications(ownerId);
    const dashboard = this.dashboard(ownerId, applications);
    const activity: DigestActivityEntry[] = applications
      .flatMap((a) => {
        const name = findOpportunity(a.opportunityId)?.name ?? a.opportunityId;
        return a.history.map((h) => ({ opportunityName: name, status: h.status, at: h.at }));
      })
      .sort((a, b) => b.at.localeCompare(a.at));
    const upcoming: DigestDeadline[] = this.getPlan(ownerId)
      .filter(
        (item) =>
          item.nextDeadline !== null &&
          (item.status === 'unstarted' || item.status === 'planned' || item.status === 'in-progress'),
      )
      .map((item) => ({
        opportunityName: item.opportunity.name,
        nextDeadline: item.nextDeadline!,
        daysLeft: item.daysLeft!,
        estimatedAmount: item.estimatedAmount,
      }));
    return {
      studentName: profile.studentName,
      potential: dashboard.potential,
      submitted: dashboard.submitted,
      won: dashboard.won,
      activity,
      upcoming,
    };
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
    studentName: parseStudentName(obj),
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
    studentIsMinor: obj.studentIsMinor === true,
    parentEmails: parseParentEmails(obj),
    updatedAt,
  };
}

function parseStudentName(obj: Record<string, unknown>): string {
  const raw = obj.studentName;
  if (raw === undefined || raw === null || raw === '') return '';
  if (typeof raw !== 'string') throw new ValidationError('studentName must be a string');
  // Strip control characters (incl. CR/LF) so this can never inject headers
  // once it lands in an email Subject line.
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\x00-\x1F\x7F]/g, ' ').trim().slice(0, 80);
}

function parseParentEmails(obj: Record<string, unknown>): string[] {
  const raw = obj.parentEmails;
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new ValidationError('parentEmails must be an array of email addresses');
  if (raw.length > MAX_PARENT_EMAILS) {
    throw new ValidationError(`parentEmails can list at most ${MAX_PARENT_EMAILS} addresses`);
  }
  const emails = raw.map((e, i) => {
    if (typeof e !== 'string') throw new ValidationError(`parentEmails[${i}] must be a string`);
    const trimmed = e.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      throw new ValidationError(`parentEmails[${i}] is not a valid email address`);
    }
    return trimmed;
  });
  return [...new Set(emails)];
}
