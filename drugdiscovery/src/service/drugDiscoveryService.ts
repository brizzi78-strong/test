/**
 * DrugDiscoveryService — programs, biological targets, candidate compounds,
 * screening results, and the discovery pipeline.
 *
 * The value over a spreadsheet is the loop: `evaluateCompound` scores a design
 * against the published drug-likeness rules the moment you enter it,
 * `recordScreen` attaches measured potency, and `rankCandidates` fuses the two
 * into "advance these first" for a given target. A candidate only moves down
 * the pipeline through `advanceCompound`, which enforces the funnel order.
 */

import { randomUUID } from 'node:crypto';
import type {
  AssayMetric,
  Compound,
  CompoundSource,
  Descriptors,
  Program,
  Screen,
  Stage,
  Target,
  TargetKind,
} from '../domain/types.ts';
import { ASSAY_METRICS, COMPOUND_SOURCES, DESCRIPTOR_KEYS, STAGES, TARGET_KINDS } from '../domain/types.ts';
import {
  canAdvance,
  drugLikeness,
  nextStages,
  rankForTarget,
  type DrugLikeness,
  type RankedCompound,
} from '../domain/chem.ts';
import type { Collection, Store } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';

export interface ServiceOptions {
  store: Store;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

export interface CompoundView extends Compound {
  drugLikeness: DrugLikeness;
  nextStages: readonly Stage[];
}

export class DrugDiscoveryService {
  private readonly store: Store;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((p) => `${p}_${randomUUID()}`);
  }

  // --- programs --------------------------------------------------------------

  createProgram(input: { name: string; indication?: string; description?: string }): Program {
    const program: Program = {
      id: this.newId('prog'),
      name: requireString(input.name, 'name'),
      indication: optionalString(input.indication),
      description: optionalString(input.description),
      createdAt: this.ts(),
    };
    this.store.programs.put(program);
    return program;
  }

  getProgram(id: string): Program {
    return this.require(this.store.programs, 'Program', id);
  }

  listPrograms(): Program[] {
    return this.store.programs.list();
  }

  // --- targets ---------------------------------------------------------------

  createTarget(input: { programId: string; name: string; kind: TargetKind; organism?: string; notes?: string }): Target {
    this.requireProgram(input.programId);
    if (!TARGET_KINDS.includes(input.kind)) {
      throw new ValidationError(`kind must be one of: ${TARGET_KINDS.join(', ')}`);
    }
    const target: Target = {
      id: this.newId('tgt'),
      programId: input.programId,
      name: requireString(input.name, 'name'),
      kind: input.kind,
      organism: optionalString(input.organism),
      notes: optionalString(input.notes),
      createdAt: this.ts(),
    };
    this.store.targets.put(target);
    return target;
  }

  getTarget(id: string): Target {
    return this.require(this.store.targets, 'Target', id);
  }

  listTargets(filter?: { programId?: string }): Target[] {
    return this.store.targets.list((t) => !filter?.programId || t.programId === filter.programId);
  }

  // --- compounds -------------------------------------------------------------

  /**
   * Register ("create") a candidate molecule. This is molecular design as data
   * entry: a name, an optional SMILES label, a descriptor profile, and where it
   * came from. New candidates enter the pipeline at the `hit` stage.
   */
  createCompound(input: {
    programId: string;
    name: string;
    smiles?: string;
    descriptors: Descriptors;
    source: CompoundSource;
    targetId?: string;
    notes?: string;
  }): CompoundView {
    this.requireProgram(input.programId);
    if (!COMPOUND_SOURCES.includes(input.source)) {
      throw new ValidationError(`source must be one of: ${COMPOUND_SOURCES.join(', ')}`);
    }
    if (input.targetId !== undefined) this.requireTargetInProgram(input.targetId, input.programId);

    const compound: Compound = {
      id: this.newId('cpd'),
      programId: input.programId,
      name: requireString(input.name, 'name'),
      smiles: optionalString(input.smiles),
      descriptors: validateDescriptors(input.descriptors),
      source: input.source,
      stage: 'hit',
      targetId: input.targetId,
      notes: optionalString(input.notes),
      createdAt: this.ts(),
      updatedAt: this.ts(),
    };
    this.store.compounds.put(compound);
    return this.view(compound);
  }

  getCompound(id: string): CompoundView {
    return this.view(this.require(this.store.compounds, 'Compound', id));
  }

  listCompounds(filter?: { programId?: string; targetId?: string; stage?: Stage }): CompoundView[] {
    return this.store.compounds
      .list(
        (c) =>
          (!filter?.programId || c.programId === filter.programId) &&
          (!filter?.targetId || c.targetId === filter.targetId) &&
          (!filter?.stage || c.stage === filter.stage),
      )
      .map((c) => this.view(c));
  }

  /**
   * Score a descriptor profile on demand without persisting anything — the
   * "what if I tweak this?" affordance for a medicinal chemist exploring a
   * design before committing it.
   */
  evaluateDescriptors(descriptors: Descriptors): DrugLikeness {
    return drugLikeness(validateDescriptors(descriptors));
  }

  /** Advance a candidate one stage down the funnel (or discontinue it). */
  advanceCompound(id: string, to: Stage): CompoundView {
    if (!STAGES.includes(to)) throw new ValidationError(`stage must be one of: ${STAGES.join(', ')}`);
    const compound = this.require(this.store.compounds, 'Compound', id);
    if (!canAdvance(compound.stage, to)) {
      const allowed = nextStages(compound.stage);
      const from = compound.stage;
      throw new ConflictError(
        allowed.length ? `cannot move from ${from} to ${to}; allowed: ${allowed.join(', ')}` : `${from} is a terminal stage`,
      );
    }
    const updated: Compound = { ...compound, stage: to, updatedAt: this.ts() };
    this.store.compounds.put(updated);
    return this.view(updated);
  }

  // --- screening -------------------------------------------------------------

  recordScreen(input: {
    compoundId: string;
    targetId: string;
    metric: AssayMetric;
    valueNanomolar: number;
    notes?: string;
  }): Screen {
    const compound = this.require(this.store.compounds, 'Compound', input.compoundId);
    this.requireTargetInProgram(input.targetId, compound.programId);
    if (!ASSAY_METRICS.includes(input.metric)) {
      throw new ValidationError(`metric must be one of: ${ASSAY_METRICS.join(', ')}`);
    }
    if (!Number.isFinite(input.valueNanomolar) || input.valueNanomolar <= 0) {
      throw new ValidationError('valueNanomolar must be a positive number');
    }
    const screen: Screen = {
      id: this.newId('scr'),
      programId: compound.programId,
      compoundId: input.compoundId,
      targetId: input.targetId,
      metric: input.metric,
      valueNanomolar: input.valueNanomolar,
      notes: optionalString(input.notes),
      at: this.ts(),
    };
    this.store.screens.put(screen);
    return screen;
  }

  listScreens(filter?: { compoundId?: string; targetId?: string }): Screen[] {
    return this.store.screens.list(
      (s) =>
        (!filter?.compoundId || s.compoundId === filter.compoundId) &&
        (!filter?.targetId || s.targetId === filter.targetId),
    );
  }

  /**
   * Rank a program's candidates against one target, fusing drug-likeness with
   * the best recorded potency — the screening decision the whole workbench
   * exists to support.
   */
  rankCandidates(targetId: string, limit?: number): RankedCompound[] {
    const target = this.require(this.store.targets, 'Target', targetId);
    const compounds = this.store.compounds.list((c) => c.programId === target.programId);
    const screens = this.store.screens.list((s) => s.targetId === targetId);
    return rankForTarget(compounds, screens, targetId, limit);
  }

  // --- helpers ---------------------------------------------------------------

  private view(compound: Compound): CompoundView {
    return { ...compound, drugLikeness: drugLikeness(compound.descriptors), nextStages: nextStages(compound.stage) };
  }

  private requireProgram(id: string): Program {
    return this.require(this.store.programs, 'Program', id);
  }

  private requireTargetInProgram(targetId: string, programId: string): Target {
    const target = this.require(this.store.targets, 'Target', targetId);
    if (target.programId !== programId) {
      throw new ValidationError(`target ${targetId} does not belong to program ${programId}`);
    }
    return target;
  }

  private require<T>(col: Collection<T>, what: string, id: string): T {
    const found = col.get(id);
    if (!found) throw new NotFoundError(what, id);
    return found;
  }

  private ts(): string {
    return this.now().toISOString();
  }
}

// --- input validation -------------------------------------------------------

function requireString(v: unknown, field: string): string {
  if (typeof v !== 'string' || v.trim() === '') throw new ValidationError(`${field} is required`);
  return v.trim();
}

function optionalString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') throw new ValidationError('expected a string');
  const trimmed = v.trim();
  return trimmed === '' ? undefined : trimmed;
}

function validateDescriptors(d: Descriptors): Descriptors {
  if (d === null || typeof d !== 'object') throw new ValidationError('descriptors object is required');
  const src = d as unknown as Record<string, unknown>;
  const out = {} as Record<string, number>;
  for (const key of DESCRIPTOR_KEYS) {
    const v = src[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new ValidationError(`descriptors.${key} must be a finite number`);
    // logP is the one descriptor that is legitimately negative (polar molecules).
    if (v < 0 && key !== 'logP') throw new ValidationError(`descriptors.${key} must not be negative`);
    out[key] = v;
  }
  return out as unknown as Descriptors;
}
