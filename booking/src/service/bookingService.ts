/**
 * BookingService — appointments, the people who perform them, and the
 * references collected when vetting those people.
 *
 * Scheduling rules that are enforced here (not left to callers):
 *   - an appointment's time is derived from its service's duration;
 *   - a worker can't be double-booked: confirming (or requesting with a worker,
 *     or rescheduling) checks for an overlapping appointment the worker still
 *     owns;
 *   - status changes follow the state machine in ../domain/workflow.ts.
 *
 * Driver's-license numbers are sensitive: the store keeps the full value but
 * every worker returned by this service is masked to the last four.
 */

import { randomUUID } from 'node:crypto';
import type {
  Appointment,
  AppointmentStatus,
  Company,
  Reference,
  ReferenceStatus,
  Service,
  Worker,
} from '../domain/types.ts';
import { canTransition, endInstant, occupiesTime, rangesOverlap } from '../domain/workflow.ts';
import type { Collection, Store } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';

export interface ServiceOptions {
  store: Store;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

export class BookingService {
  private readonly store: Store;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((p) => `${p}_${randomUUID()}`);
  }

  // --- companies / services / workers ------------------------------------

  createCompany(input: { name: string }): Company {
    const company: Company = { id: this.newId('co'), name: requireString(input.name, 'name'), createdAt: this.ts() };
    this.store.companies.put(company);
    return company;
  }

  createService(input: { companyId: string; name: string; durationMinutes: number; priceCents?: number }): Service {
    this.requireCompany(input.companyId);
    const service: Service = {
      id: this.newId('svc'),
      companyId: input.companyId,
      name: requireString(input.name, 'name'),
      durationMinutes: requirePositiveInt(input.durationMinutes, 'durationMinutes'),
      priceCents: input.priceCents === undefined ? undefined : requireNonNegativeInt(input.priceCents, 'priceCents'),
      createdAt: this.ts(),
    };
    this.store.services.put(service);
    return service;
  }

  listServices(filter?: { companyId?: string }): Service[] {
    return this.store.services.list((s) => !filter?.companyId || s.companyId === filter.companyId);
  }

  createWorker(input: {
    companyId: string;
    name: string;
    email?: string;
    phone?: string;
    licenseState?: string;
    licenseNumber?: string;
    linkedinUrl?: string;
  }): Worker {
    this.requireCompany(input.companyId);
    const worker: Worker = {
      id: this.newId('wrk'),
      companyId: input.companyId,
      name: requireString(input.name, 'name'),
      email: optionalString(input.email),
      phone: optionalString(input.phone),
      licenseState: optionalString(input.licenseState),
      licenseNumber: optionalString(input.licenseNumber),
      linkedinUrl: input.linkedinUrl === undefined ? undefined : validateUrl(input.linkedinUrl),
      createdAt: this.ts(),
    };
    this.store.workers.put(worker);
    return publicWorker(worker);
  }

  getWorker(id: string): Worker {
    return publicWorker(this.require(this.store.workers, 'Worker', id));
  }

  listWorkers(filter?: { companyId?: string }): Worker[] {
    return this.store.workers
      .list((w) => !filter?.companyId || w.companyId === filter.companyId)
      .map(publicWorker);
  }

  // --- appointments ------------------------------------------------------

  requestAppointment(input: {
    companyId: string;
    serviceId: string;
    clientName: string;
    clientPhone?: string;
    address?: string;
    start: string;
    workerId?: string;
    notes?: string;
  }): Appointment {
    const company = this.requireCompany(input.companyId);
    const service = this.require(this.store.services, 'Service', input.serviceId);
    if (service.companyId !== company.id) throw new ValidationError('service belongs to another company');

    const start = validateInstant(input.start, 'start');
    const appt: Appointment = {
      id: this.newId('apt'),
      companyId: company.id,
      serviceId: service.id,
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      clientName: requireString(input.clientName, 'clientName'),
      clientPhone: optionalString(input.clientPhone),
      address: optionalString(input.address),
      start,
      end: endInstant(start, service.durationMinutes),
      status: 'requested',
      notes: optionalString(input.notes),
      history: [{ at: this.ts(), event: 'requested' }],
      createdAt: this.ts(),
      updatedAt: this.ts(),
    };
    if (input.workerId) this.assignWorker(appt, input.workerId);
    this.store.appointments.put(appt);
    return appt;
  }

  confirmAppointment(id: string, input?: { workerId?: string; by?: string }): Appointment {
    const appt = this.getAppointment(id);
    this.assertTransition(appt, 'confirmed');
    if (input?.workerId) this.assignWorker(appt, input.workerId);
    if (!appt.workerId) throw new ValidationError('a worker must be assigned before confirming');
    return this.transition(appt, 'confirmed', input?.by);
  }

  completeAppointment(id: string, input?: { by?: string }): Appointment {
    const appt = this.getAppointment(id);
    this.assertTransition(appt, 'completed');
    return this.transition(appt, 'completed', input?.by);
  }

  cancelAppointment(id: string, input?: { by?: string; reason?: string }): Appointment {
    const appt = this.getAppointment(id);
    this.assertTransition(appt, 'cancelled');
    return this.transition(appt, 'cancelled', input?.by, input?.reason);
  }

  markNoShow(id: string, input?: { by?: string }): Appointment {
    const appt = this.getAppointment(id);
    this.assertTransition(appt, 'no_show');
    return this.transition(appt, 'no_show', input?.by);
  }

  /** Move an appointment to a new start time (only while it can still happen). */
  rescheduleAppointment(id: string, input: { start: string; by?: string }): Appointment {
    const appt = this.getAppointment(id);
    if (appt.status !== 'requested' && appt.status !== 'confirmed') {
      throw new ConflictError(`a ${appt.status} appointment cannot be rescheduled`);
    }
    const newStart = validateInstant(input.start, 'start');
    const newEnd = endInstant(newStart, appt.durationMinutes);
    if (appt.workerId) this.checkSlot(appt, appt.workerId, newStart, newEnd);
    appt.start = newStart;
    appt.end = newEnd;
    return this.transition(appt, appt.status, input.by, undefined, 'rescheduled');
  }

  getAppointment(id: string): Appointment {
    return this.require(this.store.appointments, 'Appointment', id);
  }

  listAppointments(filter?: {
    companyId?: string;
    workerId?: string;
    status?: AppointmentStatus;
    from?: string;
    to?: string;
  }): Appointment[] {
    return this.store.appointments
      .list((a) => {
        if (filter?.companyId && a.companyId !== filter.companyId) return false;
        if (filter?.workerId && a.workerId !== filter.workerId) return false;
        if (filter?.status && a.status !== filter.status) return false;
        if (filter?.from && a.start < filter.from) return false;
        if (filter?.to && a.start >= filter.to) return false;
        return true;
      })
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  // --- references --------------------------------------------------------

  addReference(input: {
    companyId: string;
    workerId: string;
    refereeName: string;
    relationship: string;
    phone?: string;
    email?: string;
  }): Reference {
    const company = this.requireCompany(input.companyId);
    const worker = this.require(this.store.workers, 'Worker', input.workerId);
    if (worker.companyId !== company.id) throw new ValidationError('worker belongs to another company');
    const ref: Reference = {
      id: this.newId('ref'),
      companyId: company.id,
      workerId: worker.id,
      refereeName: requireString(input.refereeName, 'refereeName'),
      relationship: requireString(input.relationship, 'relationship'),
      phone: optionalString(input.phone),
      email: optionalString(input.email),
      status: 'requested',
      createdAt: this.ts(),
      updatedAt: this.ts(),
    };
    this.store.references.put(ref);
    return ref;
  }

  recordReference(id: string, input: { status: ReferenceStatus; rating?: number; notes?: string }): Reference {
    const ref = this.require(this.store.references, 'Reference', id);
    if (input.status !== 'received' && input.status !== 'declined') {
      throw new ValidationError("reference status must be 'received' or 'declined'");
    }
    if (input.rating !== undefined) {
      const r = input.rating;
      if (!Number.isInteger(r) || r < 1 || r > 5) throw new ValidationError('rating must be an integer 1–5');
      ref.rating = r;
    }
    ref.status = input.status;
    ref.notes = optionalString(input.notes) ?? ref.notes;
    ref.updatedAt = this.ts();
    this.store.references.put(ref);
    return ref;
  }

  listReferences(filter: { workerId?: string; companyId?: string }): Reference[] {
    return this.store.references.list(
      (r) =>
        (!filter.workerId || r.workerId === filter.workerId) &&
        (!filter.companyId || r.companyId === filter.companyId),
    );
  }

  getReference(id: string): Reference {
    return this.require(this.store.references, 'Reference', id);
  }

  // --- internals ---------------------------------------------------------

  private assignWorker(appt: Appointment, workerId: string): void {
    const worker = this.require(this.store.workers, 'Worker', workerId);
    if (worker.companyId !== appt.companyId) throw new ValidationError('worker belongs to another company');
    // Validate the slot BEFORE mutating: the in-memory store hands back live
    // references, so a partial mutation that then fails would leak a phantom
    // booking. Only assign once the slot is proven free.
    this.checkSlot(appt, worker.id, appt.start, appt.end);
    appt.workerId = worker.id;
    appt.workerName = worker.name;
  }

  private checkSlot(appt: Appointment, workerId: string, start: string, end: string): void {
    const clash = this.store.appointments
      .list((a) => a.companyId === appt.companyId && a.id !== appt.id && a.workerId === workerId && occupiesTime(a.status))
      .some((a) => rangesOverlap(start, end, a.start, a.end));
    if (clash) {
      const w = this.store.workers.get(workerId);
      throw new ConflictError(`${w?.name ?? 'worker'} already has an appointment overlapping that time`);
    }
  }

  private transition(
    appt: Appointment,
    to: AppointmentStatus,
    by?: string,
    note?: string,
    event?: string,
  ): Appointment {
    appt.status = to;
    appt.updatedAt = this.ts();
    appt.history.push({ at: this.ts(), event: event ?? to, by, note });
    this.store.appointments.put(appt);
    return appt;
  }

  private assertTransition(appt: Appointment, to: AppointmentStatus): void {
    if (!canTransition(appt.status, to)) {
      throw new ConflictError(`cannot change a ${appt.status} appointment to ${to}`);
    }
  }

  private requireCompany(id: string): Company {
    return this.require(this.store.companies, 'Company', id);
  }

  private require<T>(collection: Collection<T>, what: string, id: string): T {
    if (typeof id !== 'string' || id.length === 0) throw new ValidationError(`${what} id is required`);
    const found = collection.get(id);
    if (!found) throw new NotFoundError(what, id);
    return found;
  }

  private ts(): string {
    return this.now().toISOString();
  }
}

/** Mask a worker's license number to the last four before returning it. */
function publicWorker(worker: Worker): Worker {
  if (!worker.licenseNumber) return { ...worker };
  const last4 = worker.licenseNumber.slice(-4);
  return { ...worker, licenseNumber: `••••${last4}` };
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new ValidationError(`${field} is required`);
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new ValidationError('expected a string');
  const t = value.trim();
  return t.length === 0 ? undefined : t;
}

function requirePositiveInt(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) throw new ValidationError(`${field} must be a positive integer`);
  return value as number;
}

function requireNonNegativeInt(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) throw new ValidationError(`${field} must be a non-negative integer`);
  return value as number;
}

function validateInstant(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new ValidationError(`${field} must be an ISO date-time string`);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ValidationError(`${field} is not a valid date-time`);
  return d.toISOString();
}

function validateUrl(value: unknown): string | undefined {
  const s = optionalString(value);
  if (s === undefined) return undefined;
  try {
    // eslint-disable-next-line no-new
    new URL(s);
    return s;
  } catch {
    throw new ValidationError('linkedinUrl must be a valid URL');
  }
}
