/**
 * Persistence abstraction — the service depends on this interface, not on a
 * concrete database, so the in-memory store used in tests can be swapped for
 * SQLite without touching business logic.
 */

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

export interface Store {
  materials: Collection<Material>;
  vendors: Collection<Vendor>;
  customers: Collection<Customer>;
  stock: Collection<StockRecord>;
  movements: Collection<StockMovement>;
  purchaseOrders: Collection<PurchaseOrder>;
  goodsReceipts: Collection<GoodsReceipt>;
  vendorInvoices: Collection<VendorInvoice>;
  salesOrders: Collection<SalesOrder>;
  deliveries: Collection<Delivery>;
  customerInvoices: Collection<CustomerInvoice>;
}

export interface Collection<T> {
  get(id: string): T | undefined;
  put(entity: T): void;
  remove(id: string): void;
  list(predicate?: (entity: T) => boolean): T[];
}

class InMemoryCollection<T extends { id: string }> implements Collection<T> {
  private readonly items = new Map<string, T>();

  get(id: string): T | undefined {
    return this.items.get(id);
  }

  put(entity: T): void {
    this.items.set(entity.id, entity);
  }

  remove(id: string): void {
    this.items.delete(id);
  }

  list(predicate?: (entity: T) => boolean): T[] {
    const all = [...this.items.values()];
    return predicate ? all.filter(predicate) : all;
  }
}

export function createInMemoryStore(): Store {
  return {
    materials: new InMemoryCollection<Material>(),
    vendors: new InMemoryCollection<Vendor>(),
    customers: new InMemoryCollection<Customer>(),
    stock: new InMemoryCollection<StockRecord>(),
    movements: new InMemoryCollection<StockMovement>(),
    purchaseOrders: new InMemoryCollection<PurchaseOrder>(),
    goodsReceipts: new InMemoryCollection<GoodsReceipt>(),
    vendorInvoices: new InMemoryCollection<VendorInvoice>(),
    salesOrders: new InMemoryCollection<SalesOrder>(),
    deliveries: new InMemoryCollection<Delivery>(),
    customerInvoices: new InMemoryCollection<CustomerInvoice>(),
  };
}
