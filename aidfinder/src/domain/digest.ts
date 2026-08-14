/**
 * Family digest — turns a student's current state into the email a parent
 * or guardian actually reads: the money dashboard, a recent activity log
 * (every status change, newest first), and what's due soon.
 *
 * Pure formatting: no I/O. The service decides when to build one and hands
 * it to a Notifier.
 */

import type { ApplicationStatus } from './types.ts';

export interface DigestActivityEntry {
  opportunityName: string;
  status: ApplicationStatus;
  at: string;
}

export interface DigestDeadline {
  opportunityName: string;
  nextDeadline: string;
  daysLeft: number;
  estimatedAmount: number;
}

export interface DigestInput {
  /** Blank when the student hasn't entered a name. */
  studentName: string;
  potential: number;
  submitted: number;
  won: number;
  /** Newest first; the digest shows the most recent handful. */
  activity: DigestActivityEntry[];
  /** Soonest first. */
  upcoming: DigestDeadline[];
}

export interface Digest {
  subject: string;
  text: string;
  html: string;
}

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  planned: 'started tracking',
  'in-progress': 'started working on',
  submitted: 'submitted',
  won: 'won',
  declined: 'was declined for',
};

const MAX_ACTIVITY = 8;
const MAX_UPCOMING = 5;

function money(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

function dateLabel(iso: string): string {
  return iso.slice(0, 10);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildDigest(input: DigestInput): Digest {
  const who = input.studentName.trim() || 'Your student';
  const subject =
    input.won > 0
      ? `${who} has won ${money(input.won)} in college aid so far`
      : `${who}'s college money update: ${money(input.potential)}/yr matched`;

  const activity = input.activity.slice(0, MAX_ACTIVITY);
  const upcoming = input.upcoming.slice(0, MAX_UPCOMING);

  const textLines: string[] = [
    `${who}'s college funding progress`,
    '',
    `Matched (estimated/yr): ${money(input.potential)}`,
    `Applied for (awaiting decision): ${money(input.submitted)}`,
    `Won: ${money(input.won)}`,
    '',
  ];

  textLines.push('Recent activity:');
  if (activity.length === 0) {
    textLines.push('  (nothing tracked yet)');
  } else {
    for (const a of activity) {
      textLines.push(`  - ${dateLabel(a.at)}: ${STATUS_LABEL[a.status]} ${a.opportunityName}`);
    }
  }
  textLines.push('');

  textLines.push('Upcoming deadlines:');
  if (upcoming.length === 0) {
    textLines.push('  (nothing due soon)');
  } else {
    for (const u of upcoming) {
      textLines.push(
        `  - ${u.opportunityName}: due ${u.nextDeadline} (${u.daysLeft} day${u.daysLeft === 1 ? '' : 's'}) — est. ${money(u.estimatedAmount)}/yr`,
      );
    }
  }
  textLines.push('', '— sent by AidFinder');

  const activityHtml =
    activity.length === 0
      ? '<li>(nothing tracked yet)</li>'
      : activity
          .map(
            (a) =>
              `<li><strong>${dateLabel(a.at)}</strong>: ${STATUS_LABEL[a.status]} ${escapeHtml(a.opportunityName)}</li>`,
          )
          .join('');

  const upcomingHtml =
    upcoming.length === 0
      ? '<li>(nothing due soon)</li>'
      : upcoming
          .map(
            (u) =>
              `<li>${escapeHtml(u.opportunityName)}: due <strong>${u.nextDeadline}</strong> (${u.daysLeft} day${u.daysLeft === 1 ? '' : 's'}) — est. ${money(u.estimatedAmount)}/yr</li>`,
          )
          .join('');

  const html = `
    <h2>${escapeHtml(who)}'s college funding progress</h2>
    <p>
      <strong>Matched (estimated/yr):</strong> ${money(input.potential)}<br>
      <strong>Applied for (awaiting decision):</strong> ${money(input.submitted)}<br>
      <strong>Won:</strong> ${money(input.won)}
    </p>
    <h3>Recent activity</h3>
    <ul>${activityHtml}</ul>
    <h3>Upcoming deadlines</h3>
    <ul>${upcomingHtml}</ul>
    <p style="color:#64748b;font-size:13px">Sent by AidFinder.</p>
  `.trim();

  return { subject, text: textLines.join('\n'), html };
}
