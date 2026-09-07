/**
 * Time & attendance domain: a timesheet is just a list of dated hour entries
 * per employee. Totalling a date range gives the hours for a pay period, which
 * is what payroll needs for an hourly worker.
 *
 * Hours are stored as an integer number of minutes to avoid floating-point
 * drift (so 7.5 hours = 450 minutes); the API accepts and returns decimal hours.
 */

export interface TimeEntry {
  id: string;
  companyId: string;
  employeeId: string;
  /** ISO calendar date of the work, YYYY-MM-DD. */
  date: string;
  minutes: number;
  note?: string;
  createdAt: string;
}

export interface PeriodSummary {
  employeeId: string;
  from: string;
  to: string;
  entries: number;
  minutes: number;
  hours: number;
}
