/**
 * Item state machine and packet-status derivation.
 *
 * Item transitions are enforced centrally; the packet's status is always
 * derived from its items (never set directly), so the two can't drift apart.
 */

import type { ItemStatus, PacketStatus, PaperworkItem } from './types.ts';

/** Allowed `from -> to` transitions for a single paperwork item. */
const ITEM_TRANSITIONS: Record<ItemStatus, readonly ItemStatus[]> = {
  assigned: ['submitted'],
  submitted: ['approved', 'returned'],
  // A returned item is corrected and re-submitted.
  returned: ['submitted'],
  approved: [],
};

export function canTransitionItem(from: ItemStatus, to: ItemStatus): boolean {
  return ITEM_TRANSITIONS[from].includes(to);
}

/**
 * Derive the packet status from its items:
 *   - all approved            -> complete
 *   - all submitted/approved  -> submitted (awaiting review, nothing outstanding)
 *   - nothing submitted yet   -> not_started
 *   - otherwise               -> in_progress
 *
 * `canceled` is a terminal status set explicitly by the service and is never
 * produced by this function.
 */
export function derivePacketStatus(items: readonly PaperworkItem[]): PacketStatus {
  if (items.length === 0) return 'not_started';

  const allApproved = items.every((i) => i.status === 'approved');
  if (allApproved) return 'complete';

  const anyStarted = items.some((i) => i.status !== 'assigned');
  if (!anyStarted) return 'not_started';

  // Every item is either submitted or approved (none assigned/returned) -> ready
  // for review with nothing outstanding from the employee.
  const allInReview = items.every((i) => i.status === 'submitted' || i.status === 'approved');
  if (allInReview) return 'submitted';

  return 'in_progress';
}
