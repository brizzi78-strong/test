/**
 * Bookstore HTTP server — one self-contained app.
 *
 *   GET /            → the storefront (browse, cart, checkout)
 *   /api/*           → JSON API
 *
 * Seller/admin write routes can be password-gated (BOOKSTORE_USER /
 * BOOKSTORE_PASSWORD). Browsing and ordering are always open. A durable SQLite
 * store is selected with BOOKSTORE_DB; unset uses the in-memory store.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { BookstoreService } from '../service/bookstoreService.ts';
import { DomainError, ValidationError } from '../service/errors.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';
import { STOREFRONT_PAGE } from '../ui/pages.ts';
import type { BookFormat, OrderStatus, SellerKind } from '../domain/types.ts';

export interface AppServer {
  server: Server;
  service: BookstoreService;
}

export interface AppOptions {
  store?: Store;
  user?: string;
  password?: string;
  cardDiscountBps?: number;
}

export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): Store {
  return env.BOOKSTORE_DB ? createSqliteStore(env.BOOKSTORE_DB) : createInMemoryStore();
}

export function createApp(opts: AppOptions = {}): AppServer {
  const discountEnv = process.env.CARD_DISCOUNT_BPS;
  const service = new BookstoreService({
    store: opts.store ?? storeFromEnv(),
    cardDiscountBps: opts.cardDiscountBps ?? (discountEnv ? Number(discountEnv) : undefined),
  });
  const user = opts.user ?? process.env.BOOKSTORE_USER;
  const password = opts.password ?? process.env.BOOKSTORE_PASSWORD;
  const gate = user && password ? { user, password } : undefined;
  const server = createServer(makeListener(service, gate));
  return { server, service };
}

/**
 * Routes that require the seller/admin login when one is configured. Browsing
 * and placing orders stay open — buyers have no account.
 */
function isGatedRoute(method: string, path: string): boolean {
  if (method === 'GET') {
    return path.startsWith('/api/orders') || path === '/api/sellers';
  }
  if (method !== 'POST') return false;
  if (path === '/api/orders') return false; // buyers place orders
  if (/^\/api\/orders\/[^/]+\/(quote|card-payment)$/.test(path)) return false; // buyers pay
  if (/^\/api\/orders\/[^/]+\/cancel$/.test(path)) return false; // buyers cancel
  return true; // sellers, books, listings, fulfil, verify, refund
}

function makeListener(service: BookstoreService, gate: { user: string; password: string } | undefined) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const path = url.pathname;
      const method = req.method ?? 'GET';

      if (gate && isGatedRoute(method, path) && !authorized(req, gate)) {
        res.writeHead(401, {
          'www-authenticate': 'Basic realm="Bookstore", charset="UTF-8"',
          'content-type': 'application/json',
        });
        res.end(JSON.stringify({ error: { code: 'unauthorized', message: 'authentication required' } }));
        return;
      }

      if (method === 'GET' && (path === '/' || path === '/index.html')) return html(res, STOREFRONT_PAGE);
      if (method === 'GET' && path === '/health') return json(res, 200, { status: 'ok' });
      if (path.startsWith('/api/')) return await api(service, method, path, url, req, res);

      json(res, 404, { error: { code: 'not_found', message: 'not found' } });
    } catch (err) {
      if (err instanceof DomainError) return json(res, err.status, { error: { code: err.code, message: err.message } });
      const message = err instanceof Error ? err.message : 'internal error';
      if (!res.headersSent) json(res, 500, { error: { code: 'internal', message } });
      else res.end();
    }
  };
}

async function api(
  service: BookstoreService,
  method: string,
  path: string,
  url: URL,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const q = url.searchParams;
  const seg = path.split('/').filter(Boolean); // ["api", ...]
  const body = method === 'GET' ? {} : ((await readJson(req)) as Record<string, unknown>);

  if (method === 'GET' && path === '/api/meta') {
    return json(res, 200, {
      service: 'bookstore',
      cardDiscountBps: service.cardDiscountBps,
      quoteTtlMs: service.quoteTtlMs,
      /** Stated in the API so no client can mistake this for an investment product. */
      notice: 'CARD is accepted as payment. It is not an investment; no profits are distributed to holders.',
    });
  }

  // Sellers
  if (method === 'POST' && path === '/api/sellers') return json(res, 201, service.createSeller(body as never));
  if (method === 'GET' && path === '/api/sellers')
    return json(res, 200, service.listSellers({ kind: (q.get('kind') as SellerKind | null) ?? undefined }));
  if (method === 'GET' && seg[1] === 'sellers' && seg[2]) return json(res, 200, service.getSeller(seg[2]));

  // Books
  if (method === 'POST' && path === '/api/books') return json(res, 201, service.createBook(body as never));
  if (method === 'GET' && path === '/api/books')
    return json(res, 200, service.listBooks({
      q: q.get('q') ?? undefined,
      genre: q.get('genre') ?? undefined,
      format: (q.get('format') as BookFormat | null) ?? undefined,
    }));
  if (method === 'GET' && seg[1] === 'books' && seg[2] && seg.length === 3) return json(res, 200, service.getBook(seg[2]));
  if (method === 'GET' && seg[1] === 'books' && seg[3] === 'listings')
    return json(res, 200, service.listListings({ bookId: seg[2], activeOnly: q.get('all') !== 'true' }));

  // Listings
  if (method === 'POST' && path === '/api/listings') return json(res, 201, service.createListing(body as never));
  if (method === 'GET' && path === '/api/listings')
    return json(res, 200, service.listListings({
      bookId: q.get('bookId') ?? undefined,
      sellerId: q.get('sellerId') ?? undefined,
      activeOnly: q.get('all') !== 'true',
    }));
  if (method === 'GET' && seg[1] === 'listings' && seg[2]) return json(res, 200, service.getListing(seg[2]));
  if (method === 'POST' && seg[1] === 'listings' && seg[3] === 'update')
    return json(res, 200, service.updateListing(seg[2], body as never));

  // Orders
  if (method === 'POST' && path === '/api/orders') return json(res, 201, service.placeOrder(body as never));
  if (method === 'GET' && path === '/api/orders')
    return json(res, 200, service.listOrders({
      status: (q.get('status') as OrderStatus | null) ?? undefined,
      buyerEmail: q.get('buyerEmail') ?? undefined,
    }));
  if (method === 'GET' && seg[1] === 'orders' && seg[2] && seg.length === 3) return json(res, 200, service.getOrder(seg[2]));
  if (method === 'POST' && seg[1] === 'orders' && seg[3] === 'quote')
    return json(res, 200, service.quoteOrderInCard(seg[2], body as never));
  if (method === 'POST' && seg[1] === 'orders' && seg[3] === 'card-payment')
    return json(res, 200, service.recordCardPayment(seg[2], body as never));
  if (method === 'POST' && seg[1] === 'orders' && seg[3] === 'verify-payment')
    return json(res, 200, service.verifyCardPayment(seg[2], body as never));
  if (method === 'POST' && seg[1] === 'orders' && seg[3] === 'mark-usd-paid')
    return json(res, 200, service.markUsdPaid(seg[2], body as never));
  if (method === 'POST' && seg[1] === 'orders' && seg[3] === 'fulfill')
    return json(res, 200, service.fulfillOrder(seg[2], body as never));
  if (method === 'POST' && seg[1] === 'orders' && seg[3] === 'cancel')
    return json(res, 200, service.cancelOrder(seg[2], body as never));
  if (method === 'POST' && seg[1] === 'orders' && seg[3] === 'refund')
    return json(res, 200, service.refundOrder(seg[2], body as never));

  json(res, 404, { error: { code: 'not_found', message: 'route not found' } });
}

function authorized(req: IncomingMessage, gate: { user: string; password: string }): boolean {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Basic ')) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return false;
  }
  const i = decoded.indexOf(':');
  if (i < 0) return false;
  return safeEqual(decoded.slice(0, i), gate.user) && safeEqual(decoded.slice(i + 1), gate.password);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new ValidationError('request body is not valid JSON');
  }
}

function html(res: ServerResponse, page: string): void {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(page);
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body ?? null));
}
