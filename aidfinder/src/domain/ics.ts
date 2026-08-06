/**
 * iCalendar export: turn the deadline plan into a standards-compliant .ics
 * file that drops every scholarship deadline into the student's calendar
 * with reminders one week and one day out — the "never miss a deadline"
 * half of the automation, no scheduler required.
 */

export interface IcsDeadline {
  /** Stable id for the event UID, e.g. the opportunity id. */
  id: string;
  name: string;
  /** ISO yyyy-mm-dd deadline date. */
  date: string;
  /** Estimated annual dollars, for the event description; 0 to omit. */
  estimatedAmount: number;
  url: string;
}

const CRLF = '\r\n';

/** Escape iCalendar TEXT values (RFC 5545 §3.3.11). */
function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Fold lines longer than 75 octets with a CRLF + space (RFC 5545 §3.1). */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ' ' + rest.slice(75);
  }
  parts.push(rest);
  return parts.join(CRLF);
}

function dateBasic(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

/** The day after an all-day event's date (all-day DTEND is exclusive). */
function nextDayBasic(isoDate: string): string {
  const next = new Date(new Date(`${isoDate}T00:00:00Z`).getTime() + 86_400_000);
  return next.toISOString().slice(0, 10).replace(/-/g, '');
}

export function buildIcs(deadlines: IcsDeadline[], now: Date): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AidFinder//Deadline Plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold('X-WR-CALNAME:College money deadlines'),
  ];
  for (const d of deadlines) {
    const amount =
      d.estimatedAmount > 0 ? ` (est. $${Math.round(d.estimatedAmount).toLocaleString('en-US')}/yr)` : '';
    const summary = escapeText(`Deadline: ${d.name}${amount}`);
    lines.push(
      'BEGIN:VEVENT',
      fold(`UID:${d.id}@aidfinder`),
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateBasic(d.date)}`,
      `DTEND;VALUE=DATE:${nextDayBasic(d.date)}`,
      fold(`SUMMARY:${summary}`),
      fold(`DESCRIPTION:${escapeText(`Apply: ${d.url}`)}`),
      fold(`URL:${d.url}`),
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'TRIGGER:-P7D',
      fold(`DESCRIPTION:${escapeText(`One week until the ${d.name} deadline`)}`),
      'END:VALARM',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'TRIGGER:-P1D',
      fold(`DESCRIPTION:${escapeText(`LAST DAY TOMORROW: ${d.name}`)}`),
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join(CRLF) + CRLF;
}
