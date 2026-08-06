/**
 * Pure logic, no I/O: the published drug-likeness rule filters, a composite
 * "developability" score, potency math, the pipeline state machine, and the
 * screening rank that turns descriptors + assays into "advance these first" —
 * the actual decision loop behind the workbench.
 *
 * The rule thresholds below are the textbook, openly published cutoffs
 * (Lipinski 1997, Veber 2002, Ghose 1999). Nothing here is proprietary or
 * hazardous; it is arithmetic on molecular property numbers.
 */

import type { AssayMetric, Compound, Descriptors, Screen, Stage } from './types.ts';

/** One rule filter's verdict. */
export interface RuleResult {
  rule: string;
  pass: boolean;
  /** Human-readable notes on which criteria failed. */
  violations: string[];
}

/**
 * Lipinski's Rule of Five — the canonical oral-drug-likeness filter. A
 * molecule is flagged when two or more criteria fail (one violation is
 * tolerated, as in the original rule).
 */
export function lipinski(d: Descriptors): RuleResult {
  const violations: string[] = [];
  if (d.molecularWeight > 500) violations.push(`MW ${round(d.molecularWeight)} > 500`);
  if (d.logP > 5) violations.push(`logP ${round(d.logP)} > 5`);
  if (d.hBondDonors > 5) violations.push(`H-bond donors ${d.hBondDonors} > 5`);
  if (d.hBondAcceptors > 10) violations.push(`H-bond acceptors ${d.hBondAcceptors} > 10`);
  return { rule: 'Lipinski Ro5', pass: violations.length <= 1, violations };
}

/**
 * Veber's rules — oral bioavailability from flexibility and polar surface
 * area. Both criteria must hold.
 */
export function veber(d: Descriptors): RuleResult {
  const violations: string[] = [];
  if (d.rotatableBonds > 10) violations.push(`rotatable bonds ${d.rotatableBonds} > 10`);
  if (d.tpsa > 140) violations.push(`TPSA ${round(d.tpsa)} > 140`);
  return { rule: 'Veber', pass: violations.length === 0, violations };
}

/**
 * Lead-likeness — tighter bounds for a starting point you still intend to grow
 * during optimization (leads should be smaller and less lipophilic than the
 * final drug).
 */
export function leadLike(d: Descriptors): RuleResult {
  const violations: string[] = [];
  if (d.molecularWeight > 350) violations.push(`MW ${round(d.molecularWeight)} > 350`);
  if (d.logP > 3.5) violations.push(`logP ${round(d.logP)} > 3.5`);
  return { rule: 'Lead-like', pass: violations.length === 0, violations };
}

export interface DrugLikeness {
  rules: RuleResult[];
  /** Total criteria breaches across all rules. */
  totalViolations: number;
  /** 0–100 developability heuristic; higher is a cleaner oral-drug profile. */
  score: number;
  /** One-line verdict for display. */
  verdict: 'excellent' | 'good' | 'marginal' | 'poor';
}

/**
 * A composite 0–100 developability score. It rewards staying inside each
 * property's preferred window and penalizes distance past the Ro5/Veber
 * ceilings. Deliberately simple and monotonic so a medicinal chemist can
 * predict how a proposed tweak moves the number.
 */
export function drugLikeness(d: Descriptors): DrugLikeness {
  const rules = [lipinski(d), veber(d), leadLike(d)];
  const totalViolations = rules.reduce((n, r) => n + r.violations.length, 0);

  let score = 100;
  score -= overBy(d.molecularWeight, 500) * 0.1; // ~10 pts per 100 g/mol over
  score -= overBy(d.logP, 5) * 12; // lipophilicity is punished hard
  score -= underBy(d.logP, -0.4) * 6; // too polar hurts permeability too
  score -= overBy(d.hBondDonors, 5) * 6;
  score -= overBy(d.hBondAcceptors, 10) * 4;
  score -= overBy(d.rotatableBonds, 10) * 4;
  score -= overBy(d.tpsa, 140) * 0.4;
  score = clamp(Math.round(score), 0, 100);

  const verdict = score >= 85 ? 'excellent' : score >= 65 ? 'good' : score >= 40 ? 'marginal' : 'poor';
  return { rules, totalViolations, score, verdict };
}

/**
 * Convert a potency in nM to its pIC50/pKi-style figure (−log10 of the molar
 * concentration). 100 nM → 7.0, 1 nM → 9.0. Higher is more potent. This is
 * the standard way potencies are compared on a linear scale.
 */
export function pPotency(valueNanomolar: number): number {
  if (!(valueNanomolar > 0)) throw new Error('potency must be a positive nM value');
  const molar = valueNanomolar * 1e-9;
  return round(-Math.log10(molar), 2);
}

/** A 0–100 potency score: pPotency 5 (10 µM) → 0, pPotency 10 (0.1 nM) → 100. */
export function potencyScore(valueNanomolar: number): number {
  const p = pPotency(valueNanomolar);
  return clamp(Math.round(((p - 5) / (10 - 5)) * 100), 0, 100);
}

// --- pipeline state machine -------------------------------------------------

const NEXT: Record<Stage, readonly Stage[]> = {
  hit: ['lead', 'discontinued'],
  lead: ['candidate', 'discontinued'],
  candidate: ['preclinical', 'discontinued'],
  preclinical: ['phase_1', 'discontinued'],
  phase_1: ['phase_2', 'discontinued'],
  phase_2: ['phase_3', 'discontinued'],
  phase_3: ['approved', 'discontinued'],
  approved: [],
  discontinued: [],
};

export function canAdvance(from: Stage, to: Stage): boolean {
  return NEXT[from].includes(to);
}

/** The stages a compound at `from` may move to next (for UI affordances). */
export function nextStages(from: Stage): readonly Stage[] {
  return NEXT[from];
}

// --- screening rank ---------------------------------------------------------

export interface RankedCompound {
  compound: Compound;
  drugLikenessScore: number;
  /** Best (lowest-nM) potency recorded against the ranking target, if any. */
  bestPotencyNanomolar?: number;
  potencyScore?: number;
  /** Composite used for ordering: potency-weighted when a screen exists. */
  overall: number;
}

/**
 * Rank a program's compounds as candidates against one target — the core
 * screening decision. Drug-likeness is always available; potency is folded in
 * when the compound has been screened against that target. Compounds with a
 * measured potency sort ahead of unscreened ones at equal developability,
 * because a validated hit beats an untested design.
 */
export function rankForTarget(compounds: Compound[], screens: Screen[], targetId: string, limit = 20): RankedCompound[] {
  const bestByCompound = bestPotencyPerCompound(screens, targetId);

  const ranked: RankedCompound[] = compounds
    .filter((c) => c.stage !== 'discontinued')
    .map((c) => {
      const dl = drugLikeness(c.descriptors).score;
      const best = bestByCompound.get(c.id);
      if (best === undefined) {
        return { compound: c, drugLikenessScore: dl, overall: dl * 0.5 };
      }
      const ps = potencyScore(best);
      return {
        compound: c,
        drugLikenessScore: dl,
        bestPotencyNanomolar: best,
        potencyScore: ps,
        overall: Math.round(ps * 0.6 + dl * 0.4),
      };
    });

  return ranked.sort((a, b) => b.overall - a.overall).slice(0, limit);
}

function bestPotencyPerCompound(screens: Screen[], targetId: string): Map<string, number> {
  const best = new Map<string, number>();
  for (const s of screens) {
    if (s.targetId !== targetId) continue;
    const prev = best.get(s.compoundId);
    if (prev === undefined || s.valueNanomolar < prev) best.set(s.compoundId, s.valueNanomolar);
  }
  return best;
}

// --- small numeric helpers --------------------------------------------------

const overBy = (v: number, ceiling: number): number => Math.max(0, v - ceiling);
const underBy = (v: number, floor: number): number => Math.max(0, floor - v);
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

function round(v: number, dp = 1): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

export const _metricLabel: Record<AssayMetric, string> = {
  IC50: 'IC₅₀',
  EC50: 'EC₅₀',
  Ki: 'Kᵢ',
  Kd: 'K_d',
};
