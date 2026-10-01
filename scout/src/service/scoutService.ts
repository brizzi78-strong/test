/**
 * The scouting shop: a demand catalog (the hot list), a scan log of every
 * appraisal made, and an inventory that walks each bought copy from owned to
 * listed to sold. In-memory — restarting the app starts a fresh shop.
 */

import { randomUUID } from 'node:crypto';
import {
  appraise,
  demandScore,
  isValidIsbn13,
  velocityTier,
  MARKETPLACE_FEE_BPS,
  OUTBOUND_SHIPPING_CENTS,
} from '../domain/appraise.ts';
import type { Appraisal, Condition, DemandSignal } from '../domain/types.ts';
import { CONDITIONS } from '../domain/types.ts';
import { DomainError } from './errors.ts';

export interface CatalogEntry extends DemandSignal {
  demandScore: number;
  tier: string;
  estDaysToSell: number;
}

export interface Scan {
  id: string;
  scannedAt: string;
  appraisal: Appraisal;
  /** Set once the scan is converted into an inventory item. */
  itemId?: string;
}

export type ItemStatus = 'owned' | 'listed' | 'sold';

export interface InventoryItem {
  id: string;
  isbn13: string;
  title: string;
  condition: Condition;
  costCents: number;
  boughtAt: string;
  status: ItemStatus;
  listPriceCents?: number;
  listedAt?: string;
  soldCents?: number;
  soldAt?: string;
  /** sold − fee − shipping − cost; set when sold. */
  profitCents?: number;
}

export interface Stats {
  catalogCount: number;
  scanCount: number;
  buyCount: number;
  passCount: number;
  ownedCount: number;
  listedCount: number;
  soldCount: number;
  /** Cost of everything bought and not yet sold. */
  investedCents: number;
  /** Sum of active list prices. */
  listedValueCents: number;
  realizedProfitCents: number;
}

const SEED_CATALOG: DemandSignal[] = [
  { isbn13: '9780735211292', title: 'Atomic Habits', author: 'James Clear', binding: 'hardcover', salesRank: 1_200, avgSoldCents: 1450, activeOfferCents: 1299 },
  { isbn13: '9780593135204', title: 'Project Hail Mary', author: 'Andy Weir', binding: 'hardcover', salesRank: 3_800, avgSoldCents: 1650 },
  { isbn13: '9780062316097', title: 'Sapiens', author: 'Yuval Noah Harari', binding: 'paperback', salesRank: 9_500, avgSoldCents: 1250, activeOfferCents: 1099 },
  { isbn13: '9780399590504', title: 'Educated', author: 'Tara Westover', binding: 'paperback', salesRank: 32_000, avgSoldCents: 950 },
  { isbn13: '9780134685991', title: 'Effective Java (3rd Edition)', author: 'Joshua Bloch', binding: 'paperback', salesRank: 58_000, avgSoldCents: 3900, activeOfferCents: 3550 },
  { isbn13: '9780132350884', title: 'Clean Code', author: 'Robert C. Martin', binding: 'paperback', salesRank: 41_000, avgSoldCents: 2850 },
  { isbn13: '9781324001850', title: 'The Overstory', author: 'Richard Powers', binding: 'paperback', salesRank: 210_000, avgSoldCents: 1100 },
  { isbn13: '9780316769488', title: 'The Catcher in the Rye', author: 'J.D. Salinger', binding: 'paperback', salesRank: 780_000, avgSoldCents: 750 },
  { isbn13: '9781984822185', title: 'Normal People', author: 'Sally Rooney', binding: 'paperback', salesRank: 1_900_000, avgSoldCents: 600 },
];

export class ScoutService {
  private readonly catalog = new Map<string, DemandSignal>();
  private readonly scans: Scan[] = [];
  private readonly items: InventoryItem[] = [];

  constructor(opts: { seed?: boolean } = {}) {
    if (opts.seed !== false) {
      for (const signal of SEED_CATALOG) this.catalog.set(signal.isbn13, { ...signal });
    }
  }

  /** The hot list: every tracked edition, most-wanted first. */
  listCatalog(): CatalogEntry[] {
    return [...this.catalog.values()]
      .map((signal) => {
        const { tier, estDaysToSell } = velocityTier(signal.salesRank);
        return { ...signal, demandScore: demandScore(signal), tier, estDaysToSell };
      })
      .sort((a, b) => b.demandScore - a.demandScore || a.salesRank - b.salesRank);
  }

  upsertSignal(input: unknown): CatalogEntry {
    const body = asRecord(input, 'signal');
    const isbn13 = String(body.isbn13 ?? '').replaceAll('-', '').trim();
    if (!isValidIsbn13(isbn13)) throw new DomainError('isbn13 must be 13 digits with a valid check digit');
    const title = String(body.title ?? '').trim();
    const author = String(body.author ?? '').trim();
    if (!title) throw new DomainError('title is required');
    if (!author) throw new DomainError('author is required');
    const binding = body.binding === 'hardcover' ? 'hardcover' : 'paperback';
    const salesRank = positiveInt(body.salesRank, 'salesRank');
    const avgSoldCents = positiveInt(body.avgSoldCents, 'avgSoldCents');
    const activeOfferCents =
      body.activeOfferCents === undefined || body.activeOfferCents === null
        ? undefined
        : positiveInt(body.activeOfferCents, 'activeOfferCents');
    const signal: DemandSignal = { isbn13, title, author, binding, salesRank, avgSoldCents, activeOfferCents };
    this.catalog.set(isbn13, signal);
    const { tier, estDaysToSell } = velocityTier(salesRank);
    return { ...signal, demandScore: demandScore(signal), tier, estDaysToSell };
  }

  /** Appraise one copy in hand and record the scan. */
  scan(input: unknown): Scan {
    const body = asRecord(input, 'scan');
    const isbn13 = String(body.isbn13 ?? '').replaceAll('-', '').trim();
    if (!isValidIsbn13(isbn13)) throw new DomainError('isbn13 must be 13 digits with a valid check digit');
    const signal = this.catalog.get(isbn13);
    if (!signal) throw new DomainError(`ISBN ${isbn13} is not in the demand catalog — add it first`, 404);
    const condition = body.condition as Condition;
    if (!CONDITIONS.includes(condition)) {
      throw new DomainError(`condition must be one of: ${CONDITIONS.join(', ')}`);
    }
    const askCents = nonNegativeInt(body.askCents, 'askCents');
    const scan: Scan = {
      id: randomUUID(),
      scannedAt: new Date().toISOString(),
      appraisal: appraise(signal, condition, askCents),
    };
    this.scans.unshift(scan);
    return scan;
  }

  listScans(limit = 50): Scan[] {
    return this.scans.slice(0, limit);
  }

  /** Convert a scan into an owned inventory item at its asking price. */
  buy(scanId: string): InventoryItem {
    const scan = this.scans.find((s) => s.id === scanId);
    if (!scan) throw new DomainError('scan not found', 404);
    if (scan.itemId) throw new DomainError('this scan was already bought', 409);
    const { appraisal } = scan;
    const item: InventoryItem = {
      id: randomUUID(),
      isbn13: appraisal.isbn13,
      title: appraisal.title,
      condition: appraisal.condition,
      costCents: appraisal.askCents,
      boughtAt: new Date().toISOString(),
      status: 'owned',
    };
    this.items.unshift(item);
    scan.itemId = item.id;
    return item;
  }

  listInventory(): InventoryItem[] {
    return [...this.items];
  }

  listItem(itemId: string, input: unknown): InventoryItem {
    const item = this.mustItem(itemId);
    if (item.status === 'sold') throw new DomainError('item already sold', 409);
    const body = asRecord(input, 'listing');
    const priceCents = positiveInt(body.priceCents, 'priceCents');
    item.status = 'listed';
    item.listPriceCents = priceCents;
    item.listedAt = new Date().toISOString();
    return item;
  }

  markSold(itemId: string, input: unknown): InventoryItem {
    const item = this.mustItem(itemId);
    if (item.status === 'sold') throw new DomainError('item already sold', 409);
    if (item.status !== 'listed') throw new DomainError('list the item before marking it sold', 409);
    const body = asRecord(input ?? {}, 'sale');
    const soldCents =
      body.soldCents === undefined || body.soldCents === null
        ? item.listPriceCents!
        : positiveInt(body.soldCents, 'soldCents');
    const fee = Math.round((soldCents * MARKETPLACE_FEE_BPS) / 10000);
    item.status = 'sold';
    item.soldCents = soldCents;
    item.soldAt = new Date().toISOString();
    item.profitCents = soldCents - fee - OUTBOUND_SHIPPING_CENTS - item.costCents;
    return item;
  }

  stats(): Stats {
    const buys = this.scans.filter((s) => s.appraisal.verdict === 'buy').length;
    const unsold = this.items.filter((i) => i.status !== 'sold');
    const listed = this.items.filter((i) => i.status === 'listed');
    const sold = this.items.filter((i) => i.status === 'sold');
    return {
      catalogCount: this.catalog.size,
      scanCount: this.scans.length,
      buyCount: buys,
      passCount: this.scans.length - buys,
      ownedCount: this.items.filter((i) => i.status === 'owned').length,
      listedCount: listed.length,
      soldCount: sold.length,
      investedCents: unsold.reduce((acc, i) => acc + i.costCents, 0),
      listedValueCents: listed.reduce((acc, i) => acc + (i.listPriceCents ?? 0), 0),
      realizedProfitCents: sold.reduce((acc, i) => acc + (i.profitCents ?? 0), 0),
    };
  }

  private mustItem(itemId: string): InventoryItem {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) throw new DomainError('inventory item not found', 404);
    return item;
  }
}

function asRecord(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new DomainError(`${what} body must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function positiveInt(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new DomainError(`${field} must be a positive integer`);
  return n;
}

function nonNegativeInt(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new DomainError(`${field} must be a non-negative integer`);
  return n;
}
