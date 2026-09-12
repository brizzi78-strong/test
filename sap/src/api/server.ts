/**
 * Cardinal ERP HTTP server — a small JSON API over ErpService.
 *
 *   GET    /health                              liveness
 *   GET    /meta                                service descriptor
 *
 *   POST   /materials                           { companyId, sku, description, unit? }
 *   GET    /materials?companyId                 list materials
 *   GET    /materials/:id                       one material
 *   GET    /materials/:id/availability          ATP: on hand, committed, available
 *   POST   /vendors                             { companyId, name }
 *   GET    /vendors?companyId                   list vendors
 *   POST   /customers                           { companyId, name }
 *   GET    /customers?companyId                 list customers
 *
 *   POST   /purchase-orders                     { companyId, vendorId, lines: [{ materialId, quantity, unitPriceCents }] }
 *   GET    /purchase-orders?companyId&vendorId  list POs
 *   GET    /purchase-orders/:id                 one PO
 *   POST   /purchase-orders/:id/goods-receipts  { lines: [{ lineNo, quantity }] }
 *   POST   /purchase-orders/:id/invoices        { lines: [{ lineNo, quantity, unitPriceCents }] } (three-way matched)
 *
 *   POST   /sales-orders                        { companyId, customerId, lines: [{ materialId, quantity, unitPriceCents }] }
 *   GET    /sales-orders?companyId&customerId   list SOs
 *   GET    /sales-orders/:id                    one SO
 *   POST   /sales-orders/:id/deliveries         { lines: [{ lineNo, quantity }] } (goods issue)
 *   POST   /sales-orders/:id/invoices           { lines?: [{ lineNo, quantity }] } (defaults to all delivered unbilled)
 *
 *   GET    /stock?companyId                     stock overview with valuation
 *   GET    /movements?materialId&companyId      stock movement journal
 *   GET    /document-flow/:orderId              document chain for a PO or SO
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { ErpService } from '../service/erpService.ts';
import { DomainError, ValidationError } from '../service/errors.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';

export interface AppServer {
  server: Server;
  service: ErpService;
}

export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): Store {
  return env.SAP_DB ? createSqliteStore(env.SAP_DB) : createInMemoryStore();
}

export function createApp(store: Store = storeFromEnv()): AppServer {
  const service = new ErpService({ store });
  const server = createServer(makeListener(service));
  return { server, service };
}

function makeListener(service: ErpService) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const path = url.pathname;
      const method = req.method ?? 'GET';
      const q = url.searchParams;
      const seg = path.split('/').filter(Boolean).map(decodeURIComponent);

      if (method === 'GET' && path === '/health') return json(res, 200, { status: 'ok' });
      if (method === 'GET' && path === '/meta') return json(res, 200, { service: 'sap' });

      if (method === 'POST' && path === '/materials') {
        return json(res, 201, service.createMaterial((await readJson(req)) as never));
      }
      if (method === 'GET' && path === '/materials') {
        return json(res, 200, service.listMaterials({ companyId: q.get('companyId') ?? undefined }));
      }
      if (method === 'GET' && seg[0] === 'materials' && seg.length === 2) {
        return json(res, 200, service.getMaterial(seg[1]));
      }
      if (method === 'GET' && seg[0] === 'materials' && seg[2] === 'availability' && seg.length === 3) {
        return json(res, 200, service.availability(seg[1]));
      }

      if (method === 'POST' && path === '/vendors') {
        return json(res, 201, service.createVendor((await readJson(req)) as never));
      }
      if (method === 'GET' && path === '/vendors') {
        return json(res, 200, service.listVendors({ companyId: q.get('companyId') ?? undefined }));
      }
      if (method === 'POST' && path === '/customers') {
        return json(res, 201, service.createCustomer((await readJson(req)) as never));
      }
      if (method === 'GET' && path === '/customers') {
        return json(res, 200, service.listCustomers({ companyId: q.get('companyId') ?? undefined }));
      }

      if (method === 'POST' && path === '/purchase-orders') {
        return json(res, 201, service.createPurchaseOrder((await readJson(req)) as never));
      }
      if (method === 'GET' && path === '/purchase-orders') {
        return json(res, 200, service.listPurchaseOrders({
          companyId: q.get('companyId') ?? undefined,
          vendorId: q.get('vendorId') ?? undefined,
        }));
      }
      if (method === 'GET' && seg[0] === 'purchase-orders' && seg.length === 2) {
        return json(res, 200, service.getPurchaseOrder(seg[1]));
      }
      if (method === 'POST' && seg[0] === 'purchase-orders' && seg[2] === 'goods-receipts' && seg.length === 3) {
        const body = (await readJson(req)) as { lines?: never };
        return json(res, 201, service.postGoodsReceipt({ purchaseOrderId: seg[1], lines: body.lines as never }));
      }
      if (method === 'POST' && seg[0] === 'purchase-orders' && seg[2] === 'invoices' && seg.length === 3) {
        const body = (await readJson(req)) as { lines?: never };
        return json(res, 201, service.postVendorInvoice({ purchaseOrderId: seg[1], lines: body.lines as never }));
      }

      if (method === 'POST' && path === '/sales-orders') {
        return json(res, 201, service.createSalesOrder((await readJson(req)) as never));
      }
      if (method === 'GET' && path === '/sales-orders') {
        return json(res, 200, service.listSalesOrders({
          companyId: q.get('companyId') ?? undefined,
          customerId: q.get('customerId') ?? undefined,
        }));
      }
      if (method === 'GET' && seg[0] === 'sales-orders' && seg.length === 2) {
        return json(res, 200, service.getSalesOrder(seg[1]));
      }
      if (method === 'POST' && seg[0] === 'sales-orders' && seg[2] === 'deliveries' && seg.length === 3) {
        const body = (await readJson(req)) as { lines?: never };
        return json(res, 201, service.postDelivery({ salesOrderId: seg[1], lines: body.lines as never }));
      }
      if (method === 'POST' && seg[0] === 'sales-orders' && seg[2] === 'invoices' && seg.length === 3) {
        const body = (await readJson(req)) as { lines?: never };
        return json(res, 201, service.postCustomerInvoice({ salesOrderId: seg[1], lines: body.lines }));
      }

      if (method === 'GET' && path === '/stock') {
        return json(res, 200, service.stockOverview(q.get('companyId') ?? ''));
      }
      if (method === 'GET' && path === '/movements') {
        return json(res, 200, service.listMovements({
          materialId: q.get('materialId') ?? undefined,
          companyId: q.get('companyId') ?? undefined,
        }));
      }
      if (method === 'GET' && seg[0] === 'document-flow' && seg.length === 2) {
        return json(res, 200, service.documentFlow(seg[1]));
      }

      json(res, 404, { error: { code: 'not_found', message: 'route not found' } });
    } catch (err) {
      if (err instanceof DomainError) return json(res, err.status, { error: { code: err.code, message: err.message } });
      const message = err instanceof Error ? err.message : 'internal error';
      if (!res.headersSent) json(res, 500, { error: { code: 'internal', message } });
      else res.end();
    }
  };
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

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body ?? null));
}
