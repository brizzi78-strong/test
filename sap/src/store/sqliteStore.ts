/**
 * Durable SQLite-backed Store using Node's built-in `node:sqlite` (no external
 * dependency), implementing the same Store/Collection interface as the
 * in-memory store.
 */

import { DatabaseSync } from 'node:sqlite';
import type {
  Customer,
  CustomerInvoice,
  Delivery,
  GoodsReceipt,
  Material,
  PurchaseOrder,
  SalesOrder,
  StockMovement,
  StockRecord,
  Vendor,
  VendorInvoice,
} from '../domain/types.ts';
import type { Collection, Store } from './store.ts';

class SqliteCollection<T extends { id: string }> implements Collection<T> {
  private readonly getStmt;
  private readonly putStmt;
  private readonly delStmt;
  private readonly allStmt;

  constructor(db: DatabaseSync, table: string) {
    this.getStmt = db.prepare(`SELECT data FROM ${table} WHERE id = ?`);
    this.putStmt = db.prepare(
      `INSERT INTO ${table} (id, data) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
    );
    this.delStmt = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
    this.allStmt = db.prepare(`SELECT data FROM ${table}`);
  }

  get(id: string): T | undefined {
    const row = this.getStmt.get(id) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as T) : undefined;
  }

  put(entity: T): void {
    this.putStmt.run(entity.id, JSON.stringify(entity));
  }

  remove(id: string): void {
    this.delStmt.run(id);
  }

  list(predicate?: (entity: T) => boolean): T[] {
    const rows = this.allStmt.all() as Array<{ data: string }>;
    const all = rows.map((r) => JSON.parse(r.data) as T);
    return predicate ? all.filter(predicate) : all;
  }
}

const TABLES = [
  'materials',
  'vendors',
  'customers',
  'stock',
  'movements',
  'purchase_orders',
  'goods_receipts',
  'vendor_invoices',
  'sales_orders',
  'deliveries',
  'customer_invoices',
] as const;

export interface SqliteStore extends Store {
  close(): void;
}

export function createSqliteStore(path: string): SqliteStore {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  for (const table of TABLES) {
    db.exec(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
  }
  return {
    materials: new SqliteCollection<Material>(db, 'materials'),
    vendors: new SqliteCollection<Vendor>(db, 'vendors'),
    customers: new SqliteCollection<Customer>(db, 'customers'),
    stock: new SqliteCollection<StockRecord>(db, 'stock'),
    movements: new SqliteCollection<StockMovement>(db, 'movements'),
    purchaseOrders: new SqliteCollection<PurchaseOrder>(db, 'purchase_orders'),
    goodsReceipts: new SqliteCollection<GoodsReceipt>(db, 'goods_receipts'),
    vendorInvoices: new SqliteCollection<VendorInvoice>(db, 'vendor_invoices'),
    salesOrders: new SqliteCollection<SalesOrder>(db, 'sales_orders'),
    deliveries: new SqliteCollection<Delivery>(db, 'deliveries'),
    customerInvoices: new SqliteCollection<CustomerInvoice>(db, 'customer_invoices'),
    close: () => db.close(),
  };
}
