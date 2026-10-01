import { test } from 'node:test';
import assert from 'node:assert/strict';

import { BookstoreService } from '../service/bookstoreService.ts';
import { createInMemoryStore } from '../store/store.ts';
import { ConflictError, ValidationError } from '../service/errors.ts';
import { cardAmountFor, discountFor } from '../domain/pricing.ts';

function svc(opts: { now?: () => Date; cardDiscountBps?: number; quoteTtlMs?: number } = {}) {
  let seq = 0;
  return new BookstoreService({
    store: createInMemoryStore(),
    now: opts.now ?? (() => new Date('2026-08-10T12:00:00.000Z')),
    newId: (p) => `${p}_${++seq}`,
    cardDiscountBps: opts.cardDiscountBps,
    quoteTtlMs: opts.quoteTtlMs,
  });
}

function setup(s: BookstoreService) {
  const seller = s.createSeller({ name: 'Blue Ridge Press', kind: 'publisher' });
  const book = s.createBook({ title: "The Cardinal's Promise", author: 'Rob Brizzi', format: 'hardcover', genres: ['memoir'] });
  const listing = s.createListing({ bookId: book.id, sellerId: seller.id, priceCents: 2400, stock: 5 });
  return { seller, book, listing };
}

const TX = '0x' + 'a'.repeat(64);

test('placing an order reserves stock and totals the lines', () => {
  const s = svc();
  const { listing } = setup(s);
  const order = s.placeOrder({ buyerName: 'Pat', paymentMethod: 'usd', items: [{ listingId: listing.id, quantity: 2 }] });
  assert.equal(order.status, 'pending_payment');
  assert.equal(order.subtotalCents, 4800);
  assert.equal(order.discountCents, 0);
  assert.equal(order.totalCents, 4800);
  assert.equal(s.getListing(listing.id).stock, 3);
});

test('paying in CARD applies a discount — a discount, never a distribution', () => {
  const s = svc({ cardDiscountBps: 500 });
  const { listing } = setup(s);
  const order = s.placeOrder({ buyerName: 'Pat', paymentMethod: 'card_token', items: [{ listingId: listing.id, quantity: 1 }] });
  assert.equal(order.subtotalCents, 2400);
  assert.equal(order.discountCents, 120); // 5%
  assert.equal(order.totalCents, 2280);
});

test('an order for more than the available stock is refused, and reserves nothing', () => {
  const s = svc();
  const { listing } = setup(s);
  assert.throws(
    () => s.placeOrder({ buyerName: 'Pat', paymentMethod: 'usd', items: [{ listingId: listing.id, quantity: 9 }] }),
    ConflictError,
  );
  assert.equal(s.getListing(listing.id).stock, 5, 'stock must be untouched when the order fails');
});

test('duplicate lines for one listing are summed against stock, not checked separately', () => {
  const s = svc();
  const { listing } = setup(s);
  assert.throws(
    () => s.placeOrder({
      buyerName: 'Pat',
      paymentMethod: 'usd',
      items: [{ listingId: listing.id, quantity: 3 }, { listingId: listing.id, quantity: 3 }],
    }),
    ConflictError,
  );
  assert.equal(s.getListing(listing.id).stock, 5);
});

test('cancelling an order returns its stock; fulfilling does not', () => {
  const s = svc();
  const { listing } = setup(s);
  const a = s.placeOrder({ buyerName: 'A', paymentMethod: 'usd', items: [{ listingId: listing.id, quantity: 2 }] });
  assert.equal(s.getListing(listing.id).stock, 3);
  s.cancelOrder(a.id);
  assert.equal(s.getListing(listing.id).stock, 5, 'cancelled stock returns to the shelf');

  const b = s.placeOrder({ buyerName: 'B', paymentMethod: 'usd', items: [{ listingId: listing.id, quantity: 1 }] });
  s.markUsdPaid(b.id);
  s.fulfillOrder(b.id);
  assert.equal(s.getListing(listing.id).stock, 4, 'fulfilled stock has left the shelf');
});

test('a recorded CARD payment does not mark the order paid until it is verified', () => {
  const s = svc();
  const { listing } = setup(s);
  const order = s.placeOrder({ buyerName: 'Pat', paymentMethod: 'card_token', items: [{ listingId: listing.id, quantity: 1 }] });
  const quote = s.quoteOrderInCard(order.id, { centsPerCard: 0.15 });

  const recorded = s.recordCardPayment(order.id, { quoteId: quote.id, txHash: TX });
  assert.equal(recorded.status, 'pending_payment', 'a submitted hash is not settled money');
  assert.equal(recorded.cardPayment?.verified, false);

  const verified = s.verifyCardPayment(order.id);
  assert.equal(verified.status, 'paid');
  assert.equal(verified.cardPayment?.verified, true);
  assert.throws(() => s.verifyCardPayment(order.id), ConflictError); // not twice
});

test('an expired quote cannot be paid against', () => {
  let now = new Date('2026-08-10T12:00:00.000Z');
  const s = svc({ now: () => now, quoteTtlMs: 60_000 });
  const { listing } = setup(s);
  const order = s.placeOrder({ buyerName: 'Pat', paymentMethod: 'card_token', items: [{ listingId: listing.id, quantity: 1 }] });
  const quote = s.quoteOrderInCard(order.id, { centsPerCard: 0.15 });

  now = new Date('2026-08-10T12:02:00.000Z'); // two minutes later, TTL was one
  assert.throws(() => s.recordCardPayment(order.id, { quoteId: quote.id, txHash: TX }), ConflictError);
});

test('a malformed transaction hash or address is rejected', () => {
  const s = svc();
  const { listing } = setup(s);
  const order = s.placeOrder({ buyerName: 'Pat', paymentMethod: 'card_token', items: [{ listingId: listing.id, quantity: 1 }] });
  const quote = s.quoteOrderInCard(order.id, { centsPerCard: 0.15 });
  assert.throws(() => s.recordCardPayment(order.id, { quoteId: quote.id, txHash: 'nope' }), ValidationError);
  assert.throws(() => s.createSeller({ name: 'X', kind: 'author', payoutAddress: '0x123' }), ValidationError);
});

test('a quote from another order cannot be used to pay this one', () => {
  const s = svc();
  const { listing } = setup(s);
  const a = s.placeOrder({ buyerName: 'A', paymentMethod: 'card_token', items: [{ listingId: listing.id, quantity: 1 }] });
  const b = s.placeOrder({ buyerName: 'B', paymentMethod: 'card_token', items: [{ listingId: listing.id, quantity: 1 }] });
  const quoteForB = s.quoteOrderInCard(b.id, { centsPerCard: 0.15 });
  assert.throws(() => s.recordCardPayment(a.id, { quoteId: quoteForB.id, txHash: TX }), ValidationError);
});

test('the order state machine is enforced', () => {
  const s = svc();
  const { listing } = setup(s);
  const order = s.placeOrder({ buyerName: 'Pat', paymentMethod: 'usd', items: [{ listingId: listing.id, quantity: 1 }] });
  assert.throws(() => s.fulfillOrder(order.id), ConflictError); // can't fulfil before paying
  s.markUsdPaid(order.id);
  s.fulfillOrder(order.id);
  assert.throws(() => s.cancelOrder(order.id), ConflictError); // fulfilled can't be cancelled
  s.refundOrder(order.id); // but can be refunded
  assert.equal(s.getOrder(order.id).status, 'refunded');
});

test('USD→CARD conversion rounds up so the seller is never short-paid', () => {
  // $22.80 at 0.15 cents per CARD = 15,200 CARD exactly
  assert.equal(cardAmountFor(2280, 0.15), '15200');
  // A rate that doesn't divide evenly rounds up rather than truncating
  assert.equal(cardAmountFor(100, 3), '33.333334');
  assert.throws(() => cardAmountFor(100, 0), /positive/);
});

test('the CARD discount is bounded, so a misconfigured rate cannot zero out prices', () => {
  assert.equal(discountFor(10_000, 'card_token', 500), 500);
  assert.equal(discountFor(10_000, 'usd', 500), 0, 'USD orders get no CARD discount');
  assert.equal(discountFor(10_000, 'card_token', 99_000), 5_000, 'clamped to the 50% maximum');
  assert.equal(discountFor(10_000, 'card_token', -5), 0);
});

test('catalog search filters by title, author, and genre', () => {
  const s = svc();
  const seller = s.createSeller({ name: 'Press', kind: 'publisher' });
  s.createBook({ title: "The Cardinal's Promise", author: 'Rob Brizzi', format: 'hardcover', genres: ['memoir'] });
  s.createBook({ title: 'Deep Sea Facts', author: 'Ada Wells', format: 'paperback', genres: ['science'] });
  void seller;
  assert.equal(s.listBooks({ q: 'cardinal' }).length, 1);
  assert.equal(s.listBooks({ q: 'brizzi' }).length, 1, 'search matches the author too');
  assert.equal(s.listBooks({ genre: 'science' }).length, 1);
  assert.equal(s.listBooks({ genre: 'MEMOIR' }).length, 1, 'genre match is case-insensitive');
  assert.equal(s.listBooks().length, 2);
});
