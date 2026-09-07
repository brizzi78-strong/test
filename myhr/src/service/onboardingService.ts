/**
 * OnboardingService — orchestration for MyHR new-hire paperwork.
 *
 * Responsibilities:
 *   - manage companies, employees, and reusable packet templates
 *   - assign an onboarding packet and drive each form through its lifecycle
 *   - enforce signature requirements and legal item-state transitions
 *   - keep an append-only history on every packet (audit trail)
 *
 * The clock and id generator are injected so the lifecycle is deterministic
 * under test.
 */

import { randomUUID } from 'node:crypto';
import type {
  Company,
  Employee,
  ItemStatus,
  OnboardingPacket,
  PacketTemplate,
  PaperworkItem,
  PaperworkType,
  Signature,
  TransitionEvent,
} from '../domain/types.ts';
import { PAPERWORK_TYPES, REQUIRES_SIGNATURE } from '../domain/types.ts';
import { canTransitionItem, derivePacketStatus } from '../domain/workflow.ts';
import type { Collection, Store } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';

export interface ServiceOptions {
  store: Store;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class OnboardingService {
  private readonly store: Store;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((prefix) => `${prefix}_${randomUUID()}`);
  }

  // --- Companies ---------------------------------------------------------

  createCompany(input: { name: string }): Company {
    const company: Company = {
      id: this.newId('co'),
      name: requireString(input.name, 'name'),
      createdAt: this.timestamp(),
    };
    this.store.companies.put(company);
    return company;
  }

  // --- Employees ---------------------------------------------------------

  createEmployee(input: {
    companyId: string;
    firstName: string;
    lastName: string;
    email: string;
    position: string;
    startDate: string;
  }): Employee {
    this.requireCompany(input.companyId);
    const email = requireString(input.email, 'email');
    if (!EMAIL_RE.test(email)) {
      throw new ValidationError(`email is not a valid address: ${email}`);
    }
    const startDate = requireString(input.startDate, 'startDate');
    if (!DATE_RE.test(startDate)) {
      throw new ValidationError('startDate must be an ISO date (YYYY-MM-DD)');
    }
    const employee: Employee = {
      id: this.newId('emp'),
      companyId: input.companyId,
      firstName: requireString(input.firstName, 'firstName'),
      lastName: requireString(input.lastName, 'lastName'),
      email,
      position: requireString(input.position, 'position'),
      startDate,
      createdAt: this.timestamp(),
    };
    this.store.employees.put(employee);
    return employee;
  }

  // --- Packet templates --------------------------------------------------

  createTemplate(input: {
    companyId: string;
    name: string;
    items: PaperworkType[];
  }): PacketTemplate {
    this.requireCompany(input.companyId);
    const items = this.validateTypes(input.items);
    const template: PacketTemplate = {
      id: this.newId('tpl'),
      companyId: input.companyId,
      name: requireString(input.name, 'name'),
      items,
      createdAt: this.timestamp(),
    };
    this.store.templates.put(template);
    return template;
  }

  // --- Packets -----------------------------------------------------------

  createPacket(input: {
    companyId: string;
    employeeId: string;
    templateId: string;
  }): OnboardingPacket {
    const company = this.requireCompany(input.companyId);
    const employee = this.require(this.store.employees, 'Employee', input.employeeId);
    const template = this.require(this.store.templates, 'PacketTemplate', input.templateId);

    if (employee.companyId !== company.id) {
      throw new ValidationError('employee does not belong to company');
    }
    if (template.companyId !== company.id) {
      throw new ValidationError('template does not belong to company');
    }

    const ts = this.timestamp();
    const items: PaperworkItem[] = template.items.map((type) => ({ type, status: 'assigned' }));
    const packet: OnboardingPacket = {
      id: this.newId('pkt'),
      companyId: company.id,
      employeeId: employee.id,
      templateId: template.id,
      status: derivePacketStatus(items),
      items,
      history: [],
      createdAt: ts,
      updatedAt: ts,
    };
    this.store.packets.put(packet);
    return packet;
  }

  getPacket(packetId: string): OnboardingPacket {
    return this.require(this.store.packets, 'OnboardingPacket', packetId);
  }

  listPackets(filter?: { companyId?: string; employeeId?: string }): OnboardingPacket[] {
    return this.store.packets.list((p) => {
      if (filter?.companyId && p.companyId !== filter.companyId) return false;
      if (filter?.employeeId && p.employeeId !== filter.employeeId) return false;
      return true;
    });
  }

  /**
   * Employee submits (or re-submits) one form. Forms in REQUIRES_SIGNATURE must
   * include a signature.
   */
  submitItem(
    packetId: string,
    type: PaperworkType,
    input: { data?: Record<string, unknown>; signature?: { name: string; ipAddress?: string } },
  ): OnboardingPacket {
    const packet = this.getPacket(packetId);
    const item = this.requireItem(packet, type);
    this.assertItemTransition(item, 'submitted');

    let signature: Signature | undefined;
    if (REQUIRES_SIGNATURE.includes(type)) {
      const name = input.signature?.name;
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw new ValidationError(`${type} requires a signature`);
      }
      signature = { name: name.trim(), signedAt: this.timestamp(), ipAddress: input.signature?.ipAddress };
    }

    item.data = input.data ?? item.data;
    item.signature = signature;
    item.status = 'submitted';
    item.submittedAt = this.timestamp();
    item.returnNote = undefined;

    this.record(packet, { event: 'item.submitted', itemType: type });
    return this.save(packet);
  }

  /** HR approves a submitted form. */
  approveItem(
    packetId: string,
    type: PaperworkType,
    input: { reviewedBy: string },
  ): OnboardingPacket {
    const packet = this.getPacket(packetId);
    const item = this.requireItem(packet, type);
    this.assertItemTransition(item, 'approved');

    const reviewedBy = requireString(input.reviewedBy, 'reviewedBy');
    item.status = 'approved';
    item.reviewedBy = reviewedBy;
    item.reviewedAt = this.timestamp();

    this.record(packet, { event: 'item.approved', itemType: type, by: reviewedBy });
    return this.save(packet);
  }

  /** HR returns a submitted form for correction. */
  returnItem(
    packetId: string,
    type: PaperworkType,
    input: { reviewedBy: string; note: string },
  ): OnboardingPacket {
    const packet = this.getPacket(packetId);
    const item = this.requireItem(packet, type);
    this.assertItemTransition(item, 'returned');

    const reviewedBy = requireString(input.reviewedBy, 'reviewedBy');
    const note = requireString(input.note, 'note');
    item.status = 'returned';
    item.reviewedBy = reviewedBy;
    item.reviewedAt = this.timestamp();
    item.returnNote = note;

    this.record(packet, { event: 'item.returned', itemType: type, by: reviewedBy, note });
    return this.save(packet);
  }

  cancelPacket(packetId: string, input?: { reason?: string }): OnboardingPacket {
    const packet = this.getPacket(packetId);
    if (packet.status === 'complete' || packet.status === 'canceled') {
      throw new ConflictError(`packet is already in terminal state '${packet.status}'`);
    }
    // Set the terminal status before recording; record() preserves 'canceled'
    // instead of re-deriving it from the items.
    packet.status = 'canceled';
    this.record(packet, { event: 'packet.canceled', note: input?.reason });
    return this.save(packet);
  }

  // --- internals ---------------------------------------------------------

  private record(packet: OnboardingPacket, meta: Omit<TransitionEvent, 'at'>): void {
    packet.history.push({ at: this.timestamp(), ...meta });
    if (packet.status !== 'canceled') {
      packet.status = derivePacketStatus(packet.items);
    }
  }

  private save(packet: OnboardingPacket): OnboardingPacket {
    packet.updatedAt = this.timestamp();
    this.store.packets.put(packet);
    return packet;
  }

  private assertItemTransition(item: PaperworkItem, to: ItemStatus): void {
    if (!canTransitionItem(item.status, to)) {
      throw new ConflictError(
        `illegal transition '${item.status}' -> '${to}' for item '${item.type}'`,
      );
    }
  }

  private requireItem(packet: OnboardingPacket, type: PaperworkType): PaperworkItem {
    const item = packet.items.find((i) => i.type === type);
    if (!item) throw new NotFoundError('PaperworkItem', `${packet.id}/${type}`);
    return item;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private requireCompany(id: string): Company {
    return this.require(this.store.companies, 'Company', id);
  }

  private require<T>(collection: Collection<T>, what: string, id: string): T {
    if (typeof id !== 'string' || id.length === 0) {
      throw new ValidationError(`${what} id is required`);
    }
    const found = collection.get(id);
    if (!found) throw new NotFoundError(what, id);
    return found;
  }

  private validateTypes(types: PaperworkType[]): PaperworkType[] {
    if (!Array.isArray(types) || types.length === 0) {
      throw new ValidationError('items must be a non-empty array');
    }
    const seen = new Set<PaperworkType>();
    for (const t of types) {
      if (!PAPERWORK_TYPES.includes(t)) {
        throw new ValidationError(`unknown paperwork type: ${String(t)}`);
      }
      seen.add(t);
    }
    return [...seen];
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}
