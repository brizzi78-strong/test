/**
 * Domain model for Cardinal Rounds — evidence-based leader rounding.
 *
 * The core loop mirrors what Studer Group / Huron built their practice on:
 * leaders round on employees and patients using a structured template, and
 * every round can "harvest" two kinds of follow-through artifacts:
 *
 *   - Issues   -> tracked on a stoplight board (green / yellow / red)
 *   - Kudos    -> recognition captured at the source, not lost in a notebook
 *
 * Everything is scoped to an ownerId (the requesting user) for the same
 * lightweight tenancy the other apps in this repo use.
 */

export type QuestionKind = 'scale' | 'yesNo' | 'text';

export interface Question {
  id: string;
  prompt: string;
  kind: QuestionKind;
}

export type Audience = 'employee' | 'patient';

export interface RoundTemplate {
  id: string;
  ownerId: string;
  name: string;
  audience: Audience;
  questions: Question[];
  /** Seeded templates ship with the app and cannot be deleted. */
  builtIn: boolean;
}

export interface Unit {
  id: string;
  ownerId: string;
  name: string;
  /** Rounds-per-30-days goal used by the dashboard's cadence meter. */
  cadenceGoal: number;
}

export type AnswerValue = number | boolean | string;

export interface Answer {
  questionId: string;
  value: AnswerValue;
}

export interface Round {
  id: string;
  ownerId: string;
  templateId: string;
  unitId: string;
  /** Who conducted the round (leader name). */
  leader: string;
  /** Who was rounded on — an employee name or a patient room/label. */
  subject: string;
  conductedAt: string; // ISO timestamp
  answers: Answer[];
  notes: string;
  /** Ids of artifacts harvested from this round. */
  issueIds: string[];
  recognitionIds: string[];
}

/**
 * Stoplight status, as reported back to staff:
 *   green  — done / resolved
 *   yellow — in progress
 *   red    — can't do right now; requires an explanation (the "why")
 */
export type Stoplight = 'green' | 'yellow' | 'red';

export interface IssueEvent {
  at: string;
  status: Stoplight;
  note: string;
}

export interface Issue {
  id: string;
  ownerId: string;
  unitId: string;
  description: string;
  owner: string; // accountable person, free text
  status: Stoplight;
  /** Required when status is red: the honest "here's why we can't yet". */
  statusReason: string;
  sourceRoundId?: string;
  createdAt: string;
  updatedAt: string;
  history: IssueEvent[];
}

export interface Recognition {
  id: string;
  ownerId: string;
  unitId: string;
  recipient: string;
  message: string;
  sourceRoundId?: string;
  createdAt: string;
}

/** Per-unit rollup for the dashboard. */
export interface UnitSummary {
  unitId: string;
  unitName: string;
  rounds30Days: number;
  cadenceGoal: number;
  openIssues: number; // yellow + red
  redIssues: number;
  recognitions30Days: number;
  /** Mean of all scale answers (1–5) in the window, null when none. */
  avgScore: number | null;
}

export interface Summary {
  totals: {
    rounds: number;
    rounds30Days: number;
    issues: { green: number; yellow: number; red: number };
    recognitions: number;
  };
  units: UnitSummary[];
}
