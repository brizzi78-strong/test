/**
 * A worked example program the workbench can seed on demand: **Parkinson's
 * disease**, built around MAO-B inhibition — the mechanism behind the
 * rasagiline / selegiline / safinamide class that preserves dopamine in the
 * Parkinsonian brain.
 *
 * The descriptor values below are the standard, openly published
 * physicochemical figures for these molecules (the kind you'd read off a
 * PubChem record). They are reference data for a teaching example, not a
 * recipe — see the module README's "Scope, honestly". Potencies are
 * order-of-magnitude MAO-B figures for illustration, not a substitute for a
 * primary assay.
 */

import type { AssayMetric, CompoundSource, Descriptors, TargetKind } from './types.ts';

export interface DemoTargetSpec {
  name: string;
  kind: TargetKind;
  organism: string;
  notes: string;
}

export interface DemoCompoundSpec {
  name: string;
  smiles: string;
  source: CompoundSource;
  descriptors: Descriptors;
  /** Optional illustrative potency against the demo target. */
  screen?: { metric: AssayMetric; valueNanomolar: number };
  note: string;
}

export interface DemoProgramSpec {
  program: { name: string; indication: string; description: string };
  target: DemoTargetSpec;
  compounds: DemoCompoundSpec[];
}

export const PARKINSONS_DEMO: DemoProgramSpec = {
  program: {
    name: "Parkinson's disease — MAO-B program",
    indication: "Parkinson's disease",
    description:
      'A worked example: inhibit monoamine oxidase B (MAO-B) to slow the breakdown of dopamine in the ' +
      'basal ganglia, easing the motor symptoms of Parkinson’s. Seeded with published, marketed ' +
      'MAO-B inhibitors plus levodopa — which scores well on the rules yet has famously poor passive ' +
      'oral uptake, a reminder that drug-likeness filters do not capture everything.',
  },
  target: {
    name: 'MAO-B (monoamine oxidase B)',
    kind: 'enzyme',
    organism: 'Homo sapiens',
    notes:
      'Outer-mitochondrial-membrane flavoenzyme that oxidatively deaminates dopamine. Reversible or ' +
      'irreversible inhibition raises synaptic dopamine and is a mainstay adjunct in Parkinson’s.',
  },
  compounds: [
    {
      name: 'Rasagiline',
      smiles: 'C#CCN[C@H]1CCc2ccccc21',
      source: 'known_drug',
      descriptors: { molecularWeight: 171.24, logP: 2.6, hBondDonors: 1, hBondAcceptors: 1, rotatableBonds: 3, tpsa: 12.03, aromaticRings: 1 },
      screen: { metric: 'IC50', valueNanomolar: 14 },
      note: 'Second-generation irreversible MAO-B inhibitor; small, potent, and cleanly drug-like.',
    },
    {
      name: 'Selegiline',
      smiles: 'C#CCN(C)[C@@H](C)Cc1ccccc1',
      source: 'known_drug',
      descriptors: { molecularWeight: 187.28, logP: 2.9, hBondDonors: 0, hBondAcceptors: 1, rotatableBonds: 5, tpsa: 3.24, aromaticRings: 1 },
      screen: { metric: 'IC50', valueNanomolar: 40 },
      note: 'The original selective MAO-B inhibitor; metabolizes to amphetamine species, hence newer analogs.',
    },
    {
      name: 'Safinamide',
      smiles: 'CC(NCc1ccc(OCc2cccc(F)c2)cc1)C(N)=O',
      source: 'known_drug',
      descriptors: { molecularWeight: 302.34, logP: 2.3, hBondDonors: 2, hBondAcceptors: 3, rotatableBonds: 6, tpsa: 64.35, aromaticRings: 2 },
      screen: { metric: 'IC50', valueNanomolar: 98 },
      note: 'Reversible MAO-B inhibitor with add-on glutamate-modulating activity; larger but still Ro5-clean.',
    },
    {
      name: 'Levodopa',
      smiles: 'N[C@@H](Cc1ccc(O)c(O)c1)C(O)=O',
      source: 'known_drug',
      descriptors: { molecularWeight: 197.19, logP: -2.7, hBondDonors: 4, hBondAcceptors: 5, rotatableBonds: 3, tpsa: 103.78, aromaticRings: 1 },
      note: 'The dopamine precursor cornerstone of Parkinson’s therapy. A useful teaching case: it passes the Rule of Five and scores respectably here, yet its very low logP means poor passive absorption — it actually crosses the gut and blood–brain barrier on an active amino-acid transporter, and is co-dosed with carbidopa. The rules do not catch that.',
    },
  ],
};
