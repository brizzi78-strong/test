/**
 * Core domain types for Drug Discovery — a computational cheminformatics
 * workbench for the early pharmaceutical R&D pipeline: register biological
 * targets, design candidate molecules, score their drug-likeness against the
 * published medicinal-chemistry rules, record screening potencies, and advance
 * the survivors through the discovery stages.
 *
 * Scope, honestly (see README): this tool reasons about molecules as abstract
 * numeric property profiles — molecular weight, lipophilicity, hydrogen-bond
 * counts, polar surface area. It computes the same public drug-likeness
 * filters a cheminformatics team uses (Lipinski, Veber, lead-likeness). It is
 * deliberately NOT a synthesis planner: it holds no reagents, routes, or
 * lab procedures, and nothing here tells you how to make a molecule — only
 * whether a proposed molecule looks like a viable oral drug candidate.
 */

/** A discovery program — one therapeutic effort, e.g. "BTK inhibitors for RA". */
export interface Program {
  id: string;
  name: string;
  /** The disease area or therapeutic hypothesis this program pursues. */
  indication?: string;
  description?: string;
  createdAt: string;
}

/** What kind of biological target a compound is meant to act on. */
export type TargetKind = 'enzyme' | 'receptor' | 'ion_channel' | 'transporter' | 'nucleic_acid' | 'protein_protein' | 'other';
export const TARGET_KINDS: readonly TargetKind[] = [
  'enzyme',
  'receptor',
  'ion_channel',
  'transporter',
  'nucleic_acid',
  'protein_protein',
  'other',
];

/** A biological target a program is trying to modulate. */
export interface Target {
  id: string;
  programId: string;
  name: string;
  kind: TargetKind;
  organism?: string;
  /** Free-text mechanism note, e.g. "inhibit kinase ATP-binding site". */
  notes?: string;
  createdAt: string;
}

/**
 * The physicochemical descriptor profile that drives every drug-likeness
 * rule. These are the standard, published descriptors a cheminformatics
 * toolkit computes from a structure; here they are supplied directly so the
 * workbench stays free of any structure-to-property prediction engine.
 */
export interface Descriptors {
  /** g/mol. */
  molecularWeight: number;
  /** Calculated octanol–water partition coefficient (lipophilicity). */
  logP: number;
  /** Hydrogen-bond donor count. */
  hBondDonors: number;
  /** Hydrogen-bond acceptor count. */
  hBondAcceptors: number;
  /** Freely rotatable bonds (a flexibility proxy for oral bioavailability). */
  rotatableBonds: number;
  /** Topological polar surface area, Å². */
  tpsa: number;
  /** Number of aromatic rings. */
  aromaticRings: number;
}

export const DESCRIPTOR_KEYS: readonly (keyof Descriptors)[] = [
  'molecularWeight',
  'logP',
  'hBondDonors',
  'hBondAcceptors',
  'rotatableBonds',
  'tpsa',
  'aromaticRings',
];

/** Where a candidate came from. */
export type CompoundSource = 'designed' | 'library' | 'natural_product' | 'known_drug';
export const COMPOUND_SOURCES: readonly CompoundSource[] = ['designed', 'library', 'natural_product', 'known_drug'];

/**
 * The discovery/development pipeline. A candidate advances one stage at a time
 * as evidence accumulates, or is discontinued. The ordering encodes the real
 * funnel: most hits never reach a development candidate.
 */
export type Stage =
  | 'hit'
  | 'lead'
  | 'candidate'
  | 'preclinical'
  | 'phase_1'
  | 'phase_2'
  | 'phase_3'
  | 'approved'
  | 'discontinued';
export const STAGES: readonly Stage[] = [
  'hit',
  'lead',
  'candidate',
  'preclinical',
  'phase_1',
  'phase_2',
  'phase_3',
  'approved',
  'discontinued',
];

/**
 * A candidate drug molecule. Identified by name and, optionally, a SMILES
 * string (a text notation for the structure — stored as an opaque label, not
 * parsed). Its descriptor profile is what the drug-likeness rules run on.
 */
export interface Compound {
  id: string;
  programId: string;
  name: string;
  /** Optional SMILES notation, stored verbatim as an identifier only. */
  smiles?: string;
  descriptors: Descriptors;
  source: CompoundSource;
  stage: Stage;
  /** Optional primary target this candidate is being developed against. */
  targetId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** The kind of binding/activity measurement a screen produced. */
export type AssayMetric = 'IC50' | 'EC50' | 'Ki' | 'Kd';
export const ASSAY_METRICS: readonly AssayMetric[] = ['IC50', 'EC50', 'Ki', 'Kd'];

/**
 * One screening result: how potent a compound was against a target, expressed
 * in nanomolar (lower is more potent). This is the experimental signal that,
 * combined with drug-likeness, decides which candidates advance.
 */
export interface Screen {
  id: string;
  programId: string;
  compoundId: string;
  targetId: string;
  metric: AssayMetric;
  /** Potency in nM. Smaller = tighter binding / more potent. */
  valueNanomolar: number;
  notes?: string;
  at: string;
}
