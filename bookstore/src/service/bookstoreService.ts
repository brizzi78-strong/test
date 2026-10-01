/**
 * BookstoreService — sellers, books, listings, and orders paid in USD or CARD.
 *
 * Rules enforced here rather than left to callers:
 *   - stock is reserved when an order is placed and returned only on cancel;
 *   - prices are USD; a CARD order gets a quote that expires, and the CARD
 *     amount is derived from it;
 *   - a submitted transaction hash is *recorded*, not trusted — an order only
 *     reaches `paid` once that payment is verified (by an operator or, later,
 *     a chain indexer);
 *   - order status changes follow the state machine in ../domain/workflow.ts.
 *
 * There is deliberately no profit-sharing, holder distribution, staking, or
 * trading facility here. See ../../BOOKSTORE_PLATFORM_PLAN.md for why each of
 * those is absent — every one is a licensing or registration requirement not
 * incurred.
 */

import { randomUUID } from 'node:crypto';
import type {
  Book,
  BookFormat,
  CardPayment,
  Listing,
  ListingCondition,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Quote,
  Seller,
  SellerKind,
} from '../domain/types.ts';
import {
  BOOK_FORMATS,
  LISTING_CONDITIONS,
  PAYMENT_METHODS,
  SELLER_KINDS,
} from '../domain/types.ts';
import {
  DEFAULT_CARD_DISCOUNT_BPS,
  DEFAULT_QUOTE_TTL_MS,
  cardAmountFor,
  clampBps,
  discountFor,
  isQuoteExpired,
  isValidAddress,
  isValidTxHash,
  subtotalOf,
} from '../domain/pricing.ts';
import { canTransition, holdsStock } from '../domain/workflow.ts';
import type { Collection, Store } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';

export interface ServiceOptions {
  store: Store;
  now?: () => Date;
  newId?: (prefix: string) => string;
  /** Discount in basis points for paying in CARD (500 = 5%). */
  cardDiscountBps?: number;
  /** How long a USD→CARD quote stays valid. */
  quoteTtlMs?: number;
}

export interface CartLine {
  listingId: string;
  quantity: number;
}

export class BookstoreService {
  private readonly store: Store;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;
  readonly cardDiscountBps: number;
  readonly quoteTtlMs: number;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((p) => `${p}_${randomUUID()}`);
    this.cardDiscountBps = clampBps(opts.cardDiscountBps ?? DEFAULT_CARD_DISCOUNT_BPS);
    this.quoteTtlMs = opts.quoteTtlMs ?? DEFAULT_QUOTE_TTL_MS;
  }

  // --- sellers -------------------------------------------------------------

  createSeller(input: { name: string; kind: SellerKind; email?: string; payoutAddress?: string }): Seller {
    if (!SELLER_KINDS.includes(input.kind)) {
      throw new ValidationError(`kind must be one of: ${SELLER_KINDS.join(', ')}`);
    }
    const payoutAddress = optionalString(input.payoutAddress);
    if (payoutAddress !== undefined && !isValidAddress(payoutAddress)) {
      throw new ValidationError('payoutAddress must be a 0x-prefixed 40-character hex address');
    }
    const seller: Seller = {
      id: this.newId('slr'),
      name: requireString(input.name, 'name'),
      kind: input.kind,
      email: optionalString(input.email),
      payoutAddress,
      createdAt: this.ts(),
    };
    this.store.sellers.put(seller);
    return seller;
  }

  getSeller(id: string): Seller {
    return this.require(this.store.sellers, 'Seller', id);
  }

  listSellers(filter?: { kind?: SellerKind }): Seller[] {
    return this.store.sellers.list((s) => !filter?.kind || s.kind === filter.kind);
  }

  // --- books ---------------------------------------------------------------

  createBook(input: {
    title: string;
    author: string;
    isbn?: string;
    description?: string;
    genres?: string[];
    format: BookFormat;
  }): Book {
    if (!BOOK_FORMATS.includes(input.format)) {
      throw new ValidationError(`format must be one of: ${BOOK_FORMATS.join(', ')}`);
    }
    const book: Book = {
      id: this.newId('bk'),
      title: requireString(input.title, 'title'),
      author: requireString(input.author, 'author'),
      isbn: optionalString(input.isbn),
      description: optionalString(input.description),
      genres: optionalStringArray(input.genres) ?? [],
      format: input.format,
      createdAt: this.ts(),
    };
    this.store.books.put(book);
    return book;
  }

  getBook(id: string): Book {
    return this.require(this.store.books, 'Book', id);
  }

  /** Browse the catalog, optionally filtered by free-text query or genre. */
  listBooks(filter?: { q?: string; genre?: string; format?: BookFormat }): Book[] {
    const q = filter?.q?.trim().toLowerCase();
    const genre = filter?.genre?.trim().toLowerCase();
    return this.store.books
      .list((b) => {
        if (filter?.format && b.format !== filter.format) return false;
        if (genre && !b.genres.some((g) => g.toLowerCase() === genre)) return false;
        if (q && !`${b.title} ${b.author}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  // --- listings ------------------------------------------------------------

  createListing(input: {
    bookId: string;
    sellerId: string;
    priceCents: number;
    stock: number;
    condition?: ListingCondition;
  }): Listing {
    this.require(this.store.books, 'Book', input.bookId);
    this.require(this.store.sellers, 'Seller', input.sellerId);
    const condition = input.condition ?? 'new';
    if (!LISTING_CONDITIONS.includes(condition)) {
      throw new ValidationError(`condition must be one of: ${LISTING_CONDITIONS.join(', ')}`);
    }
    const listing: Listing = {
      id: this.newId('lst'),
      bookId: input.bookId,
      sellerId: input.sellerId,
      priceCents: requirePositiveInt(input.priceCents, 'priceCents'),
      stock: requireNonNegativeInt(input.stock, 'stock'),
      condition,
      active: true,
      createdAt: this.ts(),
      updatedAt: this.ts(),
    };
    this.store.listings.put(listing);
    return listing;
  }

  getListing(id: string): Listing {
    return this.require(this.store.listings, 'Listing', id);
  }

  listListings(filter?: { bookId?: string; sellerId?: string; activeOnly?: boolean }): Listing[] {
    return this.store.listings
      .list((l) => {
        if (filter?.bookId && l.bookId !== filter.bookId) return false;
        if (filter?.sellerId && l.sellerId !== filter.sellerId) return false;
        if (filter?.activeOnly && (!l.active || l.stock <= 0)) return false;
        return true;
      })
      .sort((a, b) => a.priceCents - b.priceCents);
  }

  updateListing(id: string, input: { priceCents?: number; stock?: number; active?: boolean }): Listing {
    const listing = this.getListing(id);
    if (input.priceCents !== undefined) listing.priceCents = requirePositiveInt(input.priceCents, 'priceCents');
    if (input.stock !== undefined) listing.stock = requireNonNegativeInt(input.stock, 'stock');
    if (input.active !== undefined) {
      if (typeof input.active !== 'boolean') throw new ValidationError('active must be a boolean');
      listing.active = input.active;
    }
    listing.updatedAt = this.ts();
    this.store.listings.put(listing);
    return listing;
  }

  // --- orders --------------------------------------------------------------

  /**
   * Place an order. Stock is reserved immediately; the whole order is validated
   * before any stock moves, so a failure partway through can't leave listings
   * decremented for an order that was never created.
   */
  placeOrder(input: {
    buyerName: string;
    buyerEmail?: string;
    items: CartLine[];
    paymentMethod: PaymentMethod;
  }): Order {
    if (!PAYMENT_METHODS.includes(input.paymentMethod)) {
      throw new ValidationError(`paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`);
    }
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new ValidationError('an order needs at least one item');
    }

    // Validate everything and build the lines before mutating any stock.
    const resolved: Array<{ listing: Listing; item: OrderItem }> = [];
    const wanted = new Map<string, number>();
    for (const line of input.items) {
      const quantity = requirePositiveInt(line.quantity, 'quantity');
      const listing = this.require(this.store.listings, 'Listing', line.listingId);
      if (!listing.active) throw new ConflictError(`listing ${listing.id} is not active`);
      const already = wanted.get(listing.id) ?? 0;
      const total = already + quantity;
      if (total > listing.stock) {
        throw new ConflictError(`only ${listing.stock} left of listing ${listing.id}`);
      }
      wanted.set(listing.id, total);
      const book = this.require(this.store.books, 'Book', listing.bookId);
      resolved.push({
        listing,
        item: {
          listingId: listing.id,
          bookId: book.id,
          title: book.title,
          sellerId: listing.sellerId,
          unitPriceCents: listing.priceCents,
          quantity,
          lineTotalCents: listing.priceCents * quantity,
        },
      });
    }

    const items = resolved.map((r) => r.item);
    const subtotalCents = subtotalOf(items);
    const discountCents = discountFor(subtotalCents, input.paymentMethod, this.cardDiscountBps);

    const order: Order = {
      id: this.newId('ord'),
      buyerName: requireString(input.buyerName, 'buyerName'),
      buyerEmail: optionalString(input.buyerEmail),
      items,
      subtotalCents,
      discountCents,
      totalCents: subtotalCents - discountCents,
      paymentMethod: input.paymentMethod,
      status: 'pending_payment',
      history: [{ at: this.ts(), event: 'placed' }],
      createdAt: this.ts(),
      updatedAt: this.ts(),
    };

    // Everything validated — now reserve stock.
    for (const [listingId, quantity] of wanted) {
      const listing = this.getListing(listingId);
      listing.stock -= quantity;
      listing.updatedAt = this.ts();
      this.store.listings.put(listing);
    }
    this.store.orders.put(order);
    return order;
  }

  getOrder(id: string): Order {
    return this.require(this.store.orders, 'Order', id);
  }

  listOrders(filter?: { status?: OrderStatus; buyerEmail?: string }): Order[] {
    return this.store.orders
      .list((o) => {
        if (filter?.status && o.status !== filter.status) return false;
        if (filter?.buyerEmail && o.buyerEmail !== filter.buyerEmail) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // --- CARD payment --------------------------------------------------------

  /**
   * Quote the order's USD total in CARD at the given rate. Quotes expire; a
   * buyer who takes too long simply re-quotes. Re-quoting an order is allowed
   * (the rate moves) — the latest quote is the one a payment must reference.
   */
  quoteOrderInCard(orderId: string, input: { centsPerCard: number }): Quote {
    const order = this.getOrder(orderId);
    if (order.paymentMethod !== 'card_token') {
      throw new ValidationError('only card_token orders can be quoted in CARD');
    }
    if (order.status !== 'pending_payment') {
      throw new ConflictError(`a ${order.status} order cannot be quoted`);
    }
    const centsPerCard = input.centsPerCard;
    if (!Number.isFinite(centsPerCard) || centsPerCard <= 0) {
      throw new ValidationError('centsPerCard must be a positive number');
    }
    const issued = this.now();
    const quote: Quote = {
      id: this.newId('qte'),
      orderId: order.id,
      usdCents: order.totalCents,
      cardAmount: cardAmountFor(order.totalCents, centsPerCard),
      centsPerCard,
      issuedAt: issued.toISOString(),
      expiresAt: new Date(issued.getTime() + this.quoteTtlMs).toISOString(),
    };
    this.store.quotes.put(quote);
    return quote;
  }

  getQuote(id: string): Quote {
    return this.require(this.store.quotes, 'Quote', id);
  }

  /**
   * Record that the buyer says they sent CARD. This does **not** mark the order
   * paid — the platform is non-custodial and has not seen the money. The hash
   * is stored with `verified: false` until confirmed on-chain.
   */
  recordCardPayment(orderId: string, input: { quoteId: string; txHash: string; fromAddress?: string }): Order {
    const order = this.getOrder(orderId);
    if (order.paymentMethod !== 'card_token') {
      throw new ValidationError('this order is not a CARD order');
    }
    if (order.status !== 'pending_payment') {
      throw new ConflictError(`a ${order.status} order cannot take a payment`);
    }
    const quote = this.require(this.store.quotes, 'Quote', input.quoteId);
    if (quote.orderId !== order.id) throw new ValidationError('quote belongs to another order');
    if (isQuoteExpired(quote.expiresAt, this.now())) {
      throw new ConflictError('quote has expired — request a new quote and pay that amount');
    }
    const txHash = requireString(input.txHash, 'txHash');
    if (!isValidTxHash(txHash)) {
      throw new ValidationError('txHash must be a 0x-prefixed 64-character hex string');
    }
    const fromAddress = optionalString(input.fromAddress);
    if (fromAddress !== undefined && !isValidAddress(fromAddress)) {
      throw new ValidationError('fromAddress must be a 0x-prefixed 40-character hex address');
    }

    const payment: CardPayment = {
      txHash,
      fromAddress,
      quoteId: quote.id,
      cardAmount: quote.cardAmount,
      recordedAt: this.ts(),
      verified: false,
    };
    order.cardPayment = payment;
    order.updatedAt = this.ts();
    order.history.push({ at: this.ts(), event: 'card_payment_recorded', note: txHash });
    this.store.orders.put(order);
    return order;
  }

  /**
   * Confirm a recorded CARD payment was actually seen on-chain, and move the
   * order to `paid`. Called by an operator today; by a chain indexer later.
   */
  verifyCardPayment(orderId: string, input?: { by?: string }): Order {
    const order = this.getOrder(orderId);
    if (!order.cardPayment) throw new ConflictError('no CARD payment has been recorded for this order');
    if (order.cardPayment.verified) throw new ConflictError('this payment is already verified');
    this.assertTransition(order, 'paid');
    order.cardPayment.verified = true;
    order.cardPayment.verifiedAt = this.ts();
    return this.transition(order, 'paid', input?.by, order.cardPayment.txHash, 'card_payment_verified');
  }

  /** Settle a USD order (the USD rail is out of scope here; this records it). */
  markUsdPaid(orderId: string, input?: { by?: string; reference?: string }): Order {
    const order = this.getOrder(orderId);
    if (order.paymentMethod !== 'usd') throw new ValidationError('this order is not a USD order');
    this.assertTransition(order, 'paid');
    return this.transition(order, 'paid', input?.by, input?.reference);
  }

  // --- fulfilment ----------------------------------------------------------

  fulfillOrder(id: string, input?: { by?: string; note?: string }): Order {
    const order = this.getOrder(id);
    this.assertTransition(order, 'fulfilled');
    return this.transition(order, 'fulfilled', input?.by, input?.note);
  }

  /** Cancel an unpaid order and return its reserved stock to the listings. */
  cancelOrder(id: string, input?: { by?: string; reason?: string }): Order {
    const order = this.getOrder(id);
    this.assertTransition(order, 'cancelled');
    if (holdsStock(order.status)) this.returnStock(order);
    return this.transition(order, 'cancelled', input?.by, input?.reason);
  }

  refundOrder(id: string, input?: { by?: string; reason?: string }): Order {
    const order = this.getOrder(id);
    this.assertTransition(order, 'refunded');
    return this.transition(order, 'refunded', input?.by, input?.reason);
  }

  // --- internals -----------------------------------------------------------

  private returnStock(order: Order): void {
    for (const item of order.items) {
      const listing = this.store.listings.get(item.listingId);
      if (!listing) continue; // listing deleted; nothing to return it to
      listing.stock += item.quantity;
      listing.updatedAt = this.ts();
      this.store.listings.put(listing);
    }
  }

  private transition(
    order: Order,
    to: OrderStatus,
    by?: string,
    note?: string,
    event?: string,
  ): Order {
    order.status = to;
    order.updatedAt = this.ts();
    order.history.push({ at: this.ts(), event: event ?? to, by, note });
    this.store.orders.put(order);
    return order;
  }

  private assertTransition(order: Order, to: OrderStatus): void {
    if (!canTransition(order.status, to)) {
      throw new ConflictError(`cannot change a ${order.status} order to ${to}`);
    }
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

function optionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw new ValidationError('expected an array of strings');
  }
  const cleaned = value.map((v) => v.trim()).filter((v) => v.length > 0);
  return cleaned.length === 0 ? undefined : cleaned;
}

function requirePositiveInt(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new ValidationError(`${field} must be a positive integer`);
  }
  return value as number;
}

function requireNonNegativeInt(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new ValidationError(`${field} must be a non-negative integer`);
  }
  return value as number;
}
