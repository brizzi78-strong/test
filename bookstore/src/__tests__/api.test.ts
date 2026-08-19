import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createApp } from '../api/server.ts';

async function start(opts: Parameters<typeof createApp>[0] = {}) {
  const { server } = createApp(opts);
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;
  return { base: `http://127.0.0.1:${port}`, close: () => new Promise<void>((r) => server.close(() => r())) };
}

async function req(base: string, method: string, path: string, opts: { body?: unknown; auth?: [string, string] } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.auth) headers.authorization = 'Basic ' + Buffer.from(opts.auth.join(':')).toString('base64');
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

const TX = '0x' + 'b'.repeat(64);

test('the storefront and health check are served', async () => {
  const { base, close } = await start();
  try {
    const page = await fetch(`${base}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Cardinal Books/);
    assert.equal((await req(base, 'GET', '/health')).json.status, 'ok');
  } finally {
    await close();
  }
});

test('/api/meta states plainly that CARD is not an investment', async () => {
  const { base, close } = await start();
  try {
    const meta = await req(base, 'GET', '/api/meta');
    assert.equal(meta.status, 200);
    assert.match(meta.json.notice, /not an investment/i);
    assert.match(meta.json.notice, /no profits are distributed/i);
  } finally {
    await close();
  }
});

test('a full CARD purchase over HTTP: catalog, order, quote, pay, verify, fulfil', async () => {
  const { base, close } = await start();
  try {
    const seller = (await req(base, 'POST', '/api/sellers', { body: { name: 'Blue Ridge Press', kind: 'publisher' } })).json.id;
    const book = (await req(base, 'POST', '/api/books', {
      body: { title: "The Cardinal's Promise", author: 'Rob Brizzi', format: 'hardcover', genres: ['memoir'] },
    })).json.id;
    const listing = (await req(base, 'POST', '/api/listings', {
      body: { bookId: book, sellerId: seller, priceCents: 2400, stock: 3 },
    })).json.id;

    const catalog = await req(base, 'GET', '/api/books?q=cardinal');
    assert.equal(catalog.json.length, 1);
    const offers = await req(base, 'GET', `/api/books/${book}/listings`);
    assert.equal(offers.json[0].id, listing);

    const order = await req(base, 'POST', '/api/orders', {
      body: { buyerName: 'Pat', paymentMethod: 'card_token', items: [{ listingId: listing, quantity: 1 }] },
    });
    assert.equal(order.status, 201);
    assert.equal(order.json.discountCents, 120); // default 5%
    assert.equal(order.json.totalCents, 2280);

    const quote = await req(base, 'POST', `/api/orders/${order.json.id}/quote`, { body: { centsPerCard: 0.15 } });
    assert.equal(quote.json.cardAmount, '15200');

    const paid = await req(base, 'POST', `/api/orders/${order.json.id}/card-payment`, {
      body: { quoteId: quote.json.id, txHash: TX },
    });
    assert.equal(paid.json.status, 'pending_payment', 'recorded, not yet settled');
    assert.equal(paid.json.cardPayment.verified, false);

    const verified = await req(base, 'POST', `/api/orders/${order.json.id}/verify-payment`, { body: {} });
    assert.equal(verified.json.status, 'paid');

    const fulfilled = await req(base, 'POST', `/api/orders/${order.json.id}/fulfill`, { body: {} });
    assert.equal(fulfilled.json.status, 'fulfilled');

    // Stock was reserved at order time and stays gone after fulfilment.
    assert.equal((await req(base, 'GET', `/api/listings/${listing}`)).json.stock, 2);
  } finally {
    await close();
  }
});

test('an oversized order is refused with 409 and leaves stock intact', async () => {
  const { base, close } = await start();
  try {
    const seller = (await req(base, 'POST', '/api/sellers', { body: { name: 'P', kind: 'publisher' } })).json.id;
    const book = (await req(base, 'POST', '/api/books', { body: { title: 'B', author: 'A', format: 'ebook' } })).json.id;
    const listing = (await req(base, 'POST', '/api/listings', {
      body: { bookId: book, sellerId: seller, priceCents: 1000, stock: 1 },
    })).json.id;

    const bad = await req(base, 'POST', '/api/orders', {
      body: { buyerName: 'Pat', paymentMethod: 'usd', items: [{ listingId: listing, quantity: 5 }] },
    });
    assert.equal(bad.status, 409);
    assert.equal((await req(base, 'GET', `/api/listings/${listing}`)).json.stock, 1);
  } finally {
    await close();
  }
});

test('when a login is configured, buyers can still shop but seller routes are gated', async () => {
  const { base, close } = await start({ user: 'admin', password: 'secret' });
  try {
    // Open to everyone: browsing, and placing an order.
    assert.equal((await fetch(`${base}/`)).status, 200);
    assert.equal((await req(base, 'GET', '/api/books')).status, 200);

    // Gated: creating catalog entries.
    const denied = await req(base, 'POST', '/api/books', { body: { title: 'X', author: 'Y', format: 'ebook' } });
    assert.equal(denied.status, 401);

    const allowed = await req(base, 'POST', '/api/books', {
      body: { title: 'X', author: 'Y', format: 'ebook' },
      auth: ['admin', 'secret'],
    });
    assert.equal(allowed.status, 201);

    // Wrong password is refused.
    assert.equal(
      (await req(base, 'POST', '/api/books', { body: { title: 'Z', author: 'Y', format: 'ebook' }, auth: ['admin', 'nope'] })).status,
      401,
    );

    // A buyer with no credentials can still order the gated-in catalog item.
    const seller = (await req(base, 'POST', '/api/sellers', { body: { name: 'P', kind: 'publisher' }, auth: ['admin', 'secret'] })).json.id;
    const listing = (await req(base, 'POST', '/api/listings', {
      body: { bookId: allowed.json.id, sellerId: seller, priceCents: 500, stock: 2 },
      auth: ['admin', 'secret'],
    })).json.id;
    const order = await req(base, 'POST', '/api/orders', {
      body: { buyerName: 'Anon', paymentMethod: 'usd', items: [{ listingId: listing, quantity: 1 }] },
    });
    assert.equal(order.status, 201);
  } finally {
    await close();
  }
});
