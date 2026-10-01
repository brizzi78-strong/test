/**
 * RoundingService — all domain behavior behind the API.
 *
 * Owns validation, the round → issue/recognition harvest, stoplight
 * transitions (red requires a reason), and the dashboard summary.
 */

import { randomUUID } from 'node:crypto';
import { builtInTemplates } from '../domain/seed.ts';
import { computeSummary } from '../domain/metrics.ts';
import type {
  Answer,
  Audience,
  Issue,
  Question,
  Recognition,
  Round,
  RoundTemplate,
  Stoplight,
  Summary,
  Unit,
} from '../domain/types.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';
import type { Collection, Store } from '../store/store.ts';

const AUDIENCES: Audience[] = ['employee', 'patient'];
const KINDS: Question['kind'][] = ['scale', 'yesNo', 'text'];
const STOPLIGHTS: Stoplight[] = ['green', 'yellow', 'red'];

export interface ServiceOptions {
  store: Store;
  /** Clock, injectable for tests. */
  now?: () => Date;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}

function optionalString(value: unknown, field: string): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`);
  return value.trim();
}

function asRecord(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(`${what} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, field: string): unknown[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ValidationError(`${field} must be an array`);
  return value;
}

export class RoundingService {
  private readonly store: Store;
  private readonly now: () => Date;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
  }

  private listOwned<T>(collection: Collection, ownerId: string): T[] {
    return this.store.list(collection, (d) => d.ownerId === ownerId) as unknown as T[];
  }

  private getOwned<T extends { ownerId: string }>(
    collection: Collection,
    ownerId: string,
    id: string,
    what: string,
  ): T {
    const doc = this.store.get(collection, id) as unknown as T | undefined;
    if (!doc || doc.ownerId !== ownerId) throw new NotFoundError(`${what} not found`);
    return doc;
  }

  // ---- units ----

  createUnit(ownerId: string, input: unknown): Unit {
    const body = asRecord(input, 'unit');
    const name = requireString(body.name, 'name');
    const cadenceGoal = body.cadenceGoal === undefined ? 10 : body.cadenceGoal;
    if (typeof cadenceGoal !== 'number' || !Number.isInteger(cadenceGoal) || cadenceGoal < 1) {
      throw new ValidationError('cadenceGoal must be a positive integer');
    }
    const clash = this.listOwned<Unit>('units', ownerId).some(
      (u) => u.name.toLowerCase() === name.toLowerCase(),
    );
    if (clash) throw new ConflictError(`unit "${name}" already exists`);
    const unit: Unit = { id: randomUUID(), ownerId, name, cadenceGoal };
    this.store.put('units', unit);
    return unit;
  }

  listUnits(ownerId: string): Unit[] {
    return this.listOwned<Unit>('units', ownerId).sort((a, b) => a.name.localeCompare(b.name));
  }

  // ---- templates ----

  /** Seed the built-in templates for this owner on first touch. */
  private ensureSeeded(ownerId: string): void {
    const existing = this.listOwned<RoundTemplate>('templates', ownerId);
    if (existing.some((t) => t.builtIn)) return;
    for (const tmpl of builtInTemplates(ownerId)) this.store.put('templates', tmpl);
  }

  listTemplates(ownerId: string): RoundTemplate[] {
    this.ensureSeeded(ownerId);
    return this.listOwned<RoundTemplate>('templates', ownerId).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  createTemplate(ownerId: string, input: unknown): RoundTemplate {
    const body = asRecord(input, 'template');
    const name = requireString(body.name, 'name');
    const audience = body.audience;
    if (typeof audience !== 'string' || !AUDIENCES.includes(audience as Audience)) {
      throw new ValidationError(`audience must be one of: ${AUDIENCES.join(', ')}`);
    }
    const rawQuestions = asArray(body.questions, 'questions');
    if (rawQuestions.length === 0) throw new ValidationError('at least one question is required');
    const questions: Question[] = rawQuestions.map((raw, i) => {
      const rec = asRecord(raw, `questions[${i}]`);
      const kind = rec.kind;
      if (typeof kind !== 'string' || !KINDS.includes(kind as Question['kind'])) {
        throw new ValidationError(`questions[${i}].kind must be one of: ${KINDS.join(', ')}`);
      }
      return {
        id: randomUUID(),
        prompt: requireString(rec.prompt, `questions[${i}].prompt`),
        kind: kind as Question['kind'],
      };
    });
    const template: RoundTemplate = {
      id: randomUUID(),
      ownerId,
      name,
      audience: audience as Audience,
      questions,
      builtIn: false,
    };
    this.store.put('templates', template);
    return template;
  }

  // ---- rounds ----

  createRound(ownerId: string, input: unknown): { round: Round; issues: Issue[]; recognitions: Recognition[] } {
    this.ensureSeeded(ownerId);
    const body = asRecord(input, 'round');
    const template = this.getOwned<RoundTemplate>(
      'templates',
      ownerId,
      requireString(body.templateId, 'templateId'),
      'template',
    );
    const unit = this.getOwned<Unit>('units', ownerId, requireString(body.unitId, 'unitId'), 'unit');
    const leader = requireString(body.leader, 'leader');
    const subject = requireString(body.subject, 'subject');
    const notes = optionalString(body.notes, 'notes');

    const answers = this.validateAnswers(template, asArray(body.answers, 'answers'));
    const at = this.now().toISOString();

    const issues: Issue[] = asArray(body.issues, 'issues').map((raw, i) => {
      const rec = asRecord(raw, `issues[${i}]`);
      return this.buildIssue(ownerId, unit.id, {
        description: requireString(rec.description, `issues[${i}].description`),
        owner: optionalString(rec.owner, `issues[${i}].owner`) || leader,
      });
    });

    const recognitions: Recognition[] = asArray(body.recognitions, 'recognitions').map((raw, i) => {
      const rec = asRecord(raw, `recognitions[${i}]`);
      return {
        id: randomUUID(),
        ownerId,
        unitId: unit.id,
        recipient: requireString(rec.recipient, `recognitions[${i}].recipient`),
        message: requireString(rec.message, `recognitions[${i}].message`),
        createdAt: at,
      };
    });

    const round: Round = {
      id: randomUUID(),
      ownerId,
      templateId: template.id,
      unitId: unit.id,
      leader,
      subject,
      conductedAt: at,
      answers,
      notes,
      issueIds: issues.map((i) => i.id),
      recognitionIds: recognitions.map((r) => r.id),
    };

    for (const issue of issues) {
      issue.sourceRoundId = round.id;
      this.store.put('issues', issue);
    }
    for (const recognition of recognitions) {
      recognition.sourceRoundId = round.id;
      this.store.put('recognitions', recognition);
    }
    this.store.put('rounds', round);
    return { round, issues, recognitions };
  }

  private validateAnswers(template: RoundTemplate, raw: unknown[]): Answer[] {
    const seen = new Set<string>();
    return raw.map((entry, i) => {
      const rec = asRecord(entry, `answers[${i}]`);
      const questionId = requireString(rec.questionId, `answers[${i}].questionId`);
      const question = template.questions.find((question) => question.id === questionId);
      if (!question) throw new ValidationError(`answers[${i}]: unknown questionId "${questionId}"`);
      if (seen.has(questionId)) throw new ValidationError(`answers[${i}]: duplicate answer for "${questionId}"`);
      seen.add(questionId);
      const value = rec.value;
      switch (question.kind) {
        case 'scale':
          if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) {
            throw new ValidationError(`answers[${i}]: "${question.prompt}" expects an integer 1–5`);
          }
          break;
        case 'yesNo':
          if (typeof value !== 'boolean') {
            throw new ValidationError(`answers[${i}]: "${question.prompt}" expects true or false`);
          }
          break;
        case 'text':
          if (typeof value !== 'string' || value.trim().length === 0) {
            throw new ValidationError(`answers[${i}]: "${question.prompt}" expects text`);
          }
          break;
      }
      return { questionId, value: typeof value === 'string' ? value.trim() : value } as Answer;
    });
  }

  listRounds(ownerId: string): Round[] {
    return this.listOwned<Round>('rounds', ownerId).sort((a, b) =>
      b.conductedAt.localeCompare(a.conductedAt),
    );
  }

  getRound(ownerId: string, id: string): Round {
    return this.getOwned<Round>('rounds', ownerId, id, 'round');
  }

  // ---- issues (stoplight board) ----

  private buildIssue(
    ownerId: string,
    unitId: string,
    input: { description: string; owner: string },
  ): Issue {
    const at = this.now().toISOString();
    return {
      id: randomUUID(),
      ownerId,
      unitId,
      description: input.description,
      owner: input.owner,
      status: 'yellow',
      statusReason: '',
      createdAt: at,
      updatedAt: at,
      history: [{ at, status: 'yellow', note: 'raised' }],
    };
  }

  createIssue(ownerId: string, input: unknown): Issue {
    const body = asRecord(input, 'issue');
    const unit = this.getOwned<Unit>('units', ownerId, requireString(body.unitId, 'unitId'), 'unit');
    const issue = this.buildIssue(ownerId, unit.id, {
      description: requireString(body.description, 'description'),
      owner: optionalString(body.owner, 'owner') || 'unassigned',
    });
    this.store.put('issues', issue);
    return issue;
  }

  listIssues(ownerId: string, status?: string): Issue[] {
    if (status !== undefined && !STOPLIGHTS.includes(status as Stoplight)) {
      throw new ValidationError(`status must be one of: ${STOPLIGHTS.join(', ')}`);
    }
    return this.listOwned<Issue>('issues', ownerId)
      .filter((i) => status === undefined || i.status === status)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  updateIssue(ownerId: string, id: string, input: unknown): Issue {
    const issue = this.getOwned<Issue>('issues', ownerId, id, 'issue');
    const body = asRecord(input, 'update');
    if (body.description !== undefined) issue.description = requireString(body.description, 'description');
    if (body.owner !== undefined) issue.owner = requireString(body.owner, 'owner');
    if (body.status !== undefined) {
      const status = body.status;
      if (typeof status !== 'string' || !STOPLIGHTS.includes(status as Stoplight)) {
        throw new ValidationError(`status must be one of: ${STOPLIGHTS.join(', ')}`);
      }
      const reason = optionalString(body.statusReason, 'statusReason');
      if (status === 'red' && reason.length === 0) {
        throw new ValidationError('a red status requires a statusReason — tell staff why');
      }
      if (status !== issue.status || reason !== issue.statusReason) {
        issue.status = status as Stoplight;
        issue.statusReason = reason;
        issue.history.push({ at: this.now().toISOString(), status: issue.status, note: reason });
      }
    } else if (body.statusReason !== undefined) {
      issue.statusReason = optionalString(body.statusReason, 'statusReason');
    }
    issue.updatedAt = this.now().toISOString();
    this.store.put('issues', issue);
    return issue;
  }

  // ---- recognitions ----

  createRecognition(ownerId: string, input: unknown): Recognition {
    const body = asRecord(input, 'recognition');
    const unit = this.getOwned<Unit>('units', ownerId, requireString(body.unitId, 'unitId'), 'unit');
    const recognition: Recognition = {
      id: randomUUID(),
      ownerId,
      unitId: unit.id,
      recipient: requireString(body.recipient, 'recipient'),
      message: requireString(body.message, 'message'),
      createdAt: this.now().toISOString(),
    };
    this.store.put('recognitions', recognition);
    return recognition;
  }

  listRecognitions(ownerId: string): Recognition[] {
    return this.listOwned<Recognition>('recognitions', ownerId).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  // ---- dashboard ----

  summary(ownerId: string): Summary {
    return computeSummary(
      this.listUnits(ownerId),
      this.listOwned<Round>('rounds', ownerId),
      this.listOwned<Issue>('issues', ownerId),
      this.listOwned<Recognition>('recognitions', ownerId),
      this.now(),
    );
  }
}
