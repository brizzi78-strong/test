/**
 * ErpService — the SAP-style supply chain core.
 *
 * Two document chains do all the work:
 *
 *   Procure-to-pay: createPurchaseOrder → postGoodsReceipt → postVendorInvoice
 *     A goods receipt puts stock on hand and re-weights the material's
 *     moving-average cost with the PO price. The vendor invoice is three-way
 *     matched (invoice vs order vs receipts): a price different from the PO
 *     or a quantity beyond what was received posts the invoice as "blocked"
 *     (payment hold) instead of rejecting it, like SAP invoice verification.
 *
 *   Order-to-cash: createSalesOrder → postDelivery → postCustomerInvoice
 *     A delivery is the goods issue: it needs enough stock on hand, relieves
 *     inventory at moving-average cost (that's COGS), and billing then only
 *     invoices what was actually delivered.
 *
 * Clock and id generator are injected for deterministic tests.
 */

import { randomUUID } from 'node:crypto';
import type {
  Availability,
  Customer,
  CustomerInvoice,
  CustomerInvoiceLine,
  Delivery,
  DeliveryLine,
  DocumentFlow,
  FlowDocument,
  GoodsReceipt,
  GoodsReceiptLine,
  Material,
  PurchaseOrder,
  PurchaseOrderLine,
  SalesOrder,
  SalesOrderLine,
  StockMovement,
  StockOverviewRow,
  StockRecord,
  Vendor,
  VendorInvoice,
  VendorInvoiceLine,
} from '../domain/types.ts';
import type { Store } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';

export interface ServiceOptions {
  store: Store;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

export class ErpService {
  private readonly store: Store;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((prefix) => `${prefix}_${randomUUID().replace(/-/g, '')}`);
  }

  // ── Master data ────────────────────────────────────────────────────────────

  createMaterial(input: { companyId: string; sku: string; description: string; unit?: string }): Material {
    const companyId = requireString(input.companyId, 'companyId');
    const sku = requireString(input.sku, 'sku');
    const description = requireString(input.description, 'description');
    const unit = optionalString(input.unit) ?? 'EA';
    const dup = this.store.materials.list((m) => m.companyId === companyId && m.sku === sku);
    if (dup.length > 0) throw new ConflictError(`material sku already exists: ${sku}`);
    const material: Material = {
      id: this.newId('mat'),
      companyId,
      sku,
      description,
      unit,
      createdAt: this.now().toISOString(),
    };
    this.store.materials.put(material);
    return material;
  }

  getMaterial(id: string): Material {
    const material = this.store.materials.get(id);
    if (!material) throw new NotFoundError('Material', id);
    return material;
  }

  listMaterials(filter: { companyId?: string } = {}): Material[] {
    return this.store.materials
      .list((m) => !filter.companyId || m.companyId === filter.companyId)
      .sort(byField('sku'));
  }

  createVendor(input: { companyId: string; name: string }): Vendor {
    const vendor: Vendor = {
      id: this.newId('ven'),
      companyId: requireString(input.companyId, 'companyId'),
      name: requireString(input.name, 'name'),
      createdAt: this.now().toISOString(),
    };
    this.store.vendors.put(vendor);
    return vendor;
  }

  listVendors(filter: { companyId?: string } = {}): Vendor[] {
    return this.store.vendors
      .list((v) => !filter.companyId || v.companyId === filter.companyId)
      .sort(byField('name'));
  }

  createCustomer(input: { companyId: string; name: string }): Customer {
    const customer: Customer = {
      id: this.newId('cus'),
      companyId: requireString(input.companyId, 'companyId'),
      name: requireString(input.name, 'name'),
      createdAt: this.now().toISOString(),
    };
    this.store.customers.put(customer);
    return customer;
  }

  listCustomers(filter: { companyId?: string } = {}): Customer[] {
    return this.store.customers
      .list((c) => !filter.companyId || c.companyId === filter.companyId)
      .sort(byField('name'));
  }

  // ── Procure-to-pay ─────────────────────────────────────────────────────────

  createPurchaseOrder(input: {
    companyId: string;
    vendorId: string;
    lines: Array<{ materialId: string; quantity: number; unitPriceCents: number }>;
  }): PurchaseOrder {
    const companyId = requireString(input.companyId, 'companyId');
    const vendorId = requireString(input.vendorId, 'vendorId');
    const vendor = this.store.vendors.get(vendorId);
    if (!vendor) throw new NotFoundError('Vendor', vendorId);
    if (vendor.companyId !== companyId) throw new ValidationError('vendor belongs to a different company');

    const lines = requireLines(input.lines).map((line, i): PurchaseOrderLine => {
      const material = this.getMaterial(requireString(line.materialId, `lines[${i}].materialId`));
      if (material.companyId !== companyId) throw new ValidationError(`lines[${i}]: material belongs to a different company`);
      return {
        lineNo: i + 1,
        materialId: material.id,
        quantity: requireQuantity(line.quantity, `lines[${i}].quantity`),
        unitPriceCents: requireCents(line.unitPriceCents, `lines[${i}].unitPriceCents`),
        receivedQty: 0,
        invoicedQty: 0,
      };
    });

    const po: PurchaseOrder = {
      id: this.newId('po'),
      companyId,
      vendorId,
      lines,
      status: 'open',
      totalCents: lines.reduce((t, l) => t + Math.round(l.quantity * l.unitPriceCents), 0),
      createdAt: this.now().toISOString(),
    };
    this.store.purchaseOrders.put(po);
    return po;
  }

  getPurchaseOrder(id: string): PurchaseOrder {
    const po = this.store.purchaseOrders.get(id);
    if (!po) throw new NotFoundError('PurchaseOrder', id);
    return po;
  }

  listPurchaseOrders(filter: { companyId?: string; vendorId?: string } = {}): PurchaseOrder[] {
    return this.store.purchaseOrders
      .list((po) => {
        if (filter.companyId && po.companyId !== filter.companyId) return false;
        if (filter.vendorId && po.vendorId !== filter.vendorId) return false;
        return true;
      })
      .sort(byField('createdAt'));
  }

  /** Receive goods against a PO: stock in, moving average re-weighted at the PO price. */
  postGoodsReceipt(input: { purchaseOrderId: string; lines: Array<{ lineNo: number; quantity: number }> }): GoodsReceipt {
    const po = this.getPurchaseOrder(requireString(input.purchaseOrderId, 'purchaseOrderId'));
    const grLines = requireLines(input.lines).map((line, i): GoodsReceiptLine => {
      const poLine = findLine(po.lines, line.lineNo, i);
      const quantity = requireQuantity(line.quantity, `lines[${i}].quantity`);
      const open = poLine.quantity - poLine.receivedQty;
      if (quantity > open) {
        throw new ConflictError(`line ${poLine.lineNo}: receipt of ${quantity} exceeds open quantity ${open}`);
      }
      return { lineNo: poLine.lineNo, quantity, unitCostCents: poLine.unitPriceCents };
    });

    const gr: GoodsReceipt = {
      id: this.newId('gr'),
      companyId: po.companyId,
      purchaseOrderId: po.id,
      lines: grLines,
      createdAt: this.now().toISOString(),
    };

    for (const line of grLines) {
      const poLine = po.lines.find((l) => l.lineNo === line.lineNo)!;
      poLine.receivedQty = round3(poLine.receivedQty + line.quantity);
      this.receiveStock(po.companyId, poLine.materialId, line.quantity, line.unitCostCents, gr.id);
    }
    po.status = po.lines.every((l) => l.receivedQty >= l.quantity)
      ? 'received'
      : po.lines.some((l) => l.receivedQty > 0)
        ? 'partially_received'
        : 'open';
    this.store.purchaseOrders.put(po);
    this.store.goodsReceipts.put(gr);
    return gr;
  }

  /**
   * Post a vendor invoice with a three-way match against the PO and its
   * receipts. Price or quantity variances post the invoice as "blocked"
   * (payment hold) with the reasons recorded — never silently paid, never
   * rejected outright.
   */
  postVendorInvoice(input: {
    purchaseOrderId: string;
    lines: Array<{ lineNo: number; quantity: number; unitPriceCents: number }>;
  }): VendorInvoice {
    const po = this.getPurchaseOrder(requireString(input.purchaseOrderId, 'purchaseOrderId'));
    const blockedReasons: string[] = [];
    const invLines = requireLines(input.lines).map((line, i): VendorInvoiceLine => {
      const poLine = findLine(po.lines, line.lineNo, i);
      const quantity = requireQuantity(line.quantity, `lines[${i}].quantity`);
      const unitPriceCents = requireCents(line.unitPriceCents, `lines[${i}].unitPriceCents`);
      const uninvoiced = poLine.quantity - poLine.invoicedQty;
      if (quantity > uninvoiced) {
        throw new ConflictError(`line ${poLine.lineNo}: invoice of ${quantity} exceeds uninvoiced quantity ${uninvoiced}`);
      }
      if (unitPriceCents !== poLine.unitPriceCents) {
        blockedReasons.push(
          `line ${poLine.lineNo}: price variance — invoiced ${unitPriceCents}¢, ordered ${poLine.unitPriceCents}¢`,
        );
      }
      if (poLine.invoicedQty + quantity > poLine.receivedQty) {
        blockedReasons.push(
          `line ${poLine.lineNo}: quantity variance — invoiced ${round3(poLine.invoicedQty + quantity)}, received ${poLine.receivedQty}`,
        );
      }
      return { lineNo: poLine.lineNo, quantity, unitPriceCents, amountCents: Math.round(quantity * unitPriceCents) };
    });

    const invoice: VendorInvoice = {
      id: this.newId('vi'),
      companyId: po.companyId,
      purchaseOrderId: po.id,
      lines: invLines,
      totalCents: invLines.reduce((t, l) => t + l.amountCents, 0),
      status: blockedReasons.length ? 'blocked' : 'posted',
      blockedReasons,
      createdAt: this.now().toISOString(),
    };
    for (const line of invLines) {
      const poLine = po.lines.find((l) => l.lineNo === line.lineNo)!;
      poLine.invoicedQty = round3(poLine.invoicedQty + line.quantity);
    }
    this.store.purchaseOrders.put(po);
    this.store.vendorInvoices.put(invoice);
    return invoice;
  }

  // ── Order-to-cash ──────────────────────────────────────────────────────────

  createSalesOrder(input: {
    companyId: string;
    customerId: string;
    lines: Array<{ materialId: string; quantity: number; unitPriceCents: number }>;
  }): SalesOrder {
    const companyId = requireString(input.companyId, 'companyId');
    const customerId = requireString(input.customerId, 'customerId');
    const customer = this.store.customers.get(customerId);
    if (!customer) throw new NotFoundError('Customer', customerId);
    if (customer.companyId !== companyId) throw new ValidationError('customer belongs to a different company');

    const lines = requireLines(input.lines).map((line, i): SalesOrderLine => {
      const material = this.getMaterial(requireString(line.materialId, `lines[${i}].materialId`));
      if (material.companyId !== companyId) throw new ValidationError(`lines[${i}]: material belongs to a different company`);
      return {
        lineNo: i + 1,
        materialId: material.id,
        quantity: requireQuantity(line.quantity, `lines[${i}].quantity`),
        unitPriceCents: requireCents(line.unitPriceCents, `lines[${i}].unitPriceCents`),
        deliveredQty: 0,
        billedQty: 0,
      };
    });

    const so: SalesOrder = {
      id: this.newId('so'),
      companyId,
      customerId,
      lines,
      status: 'open',
      totalCents: lines.reduce((t, l) => t + Math.round(l.quantity * l.unitPriceCents), 0),
      createdAt: this.now().toISOString(),
    };
    this.store.salesOrders.put(so);
    return so;
  }

  getSalesOrder(id: string): SalesOrder {
    const so = this.store.salesOrders.get(id);
    if (!so) throw new NotFoundError('SalesOrder', id);
    return so;
  }

  listSalesOrders(filter: { companyId?: string; customerId?: string } = {}): SalesOrder[] {
    return this.store.salesOrders
      .list((so) => {
        if (filter.companyId && so.companyId !== filter.companyId) return false;
        if (filter.customerId && so.customerId !== filter.customerId) return false;
        return true;
      })
      .sort(byField('createdAt'));
  }

  /** Goods issue: needs stock on hand; relieves inventory at moving-average cost. */
  postDelivery(input: { salesOrderId: string; lines: Array<{ lineNo: number; quantity: number }> }): Delivery {
    const so = this.getSalesOrder(requireString(input.salesOrderId, 'salesOrderId'));
    const dlLines = requireLines(input.lines).map((line, i): DeliveryLine => {
      const soLine = findLine(so.lines, line.lineNo, i);
      const quantity = requireQuantity(line.quantity, `lines[${i}].quantity`);
      const open = soLine.quantity - soLine.deliveredQty;
      if (quantity > open) {
        throw new ConflictError(`line ${soLine.lineNo}: delivery of ${quantity} exceeds open quantity ${open}`);
      }
      const stock = this.stockFor(so.companyId, soLine.materialId);
      if (stock.quantity < quantity) {
        throw new ConflictError(
          `line ${soLine.lineNo}: insufficient stock — on hand ${stock.quantity}, requested ${quantity}`,
        );
      }
      return { lineNo: soLine.lineNo, quantity, unitCostCents: stock.movingAvgCents };
    });

    const delivery: Delivery = {
      id: this.newId('dl'),
      companyId: so.companyId,
      salesOrderId: so.id,
      lines: dlLines,
      cogsCents: dlLines.reduce((t, l) => t + Math.round(l.quantity * l.unitCostCents), 0),
      createdAt: this.now().toISOString(),
    };

    for (const line of dlLines) {
      const soLine = so.lines.find((l) => l.lineNo === line.lineNo)!;
      soLine.deliveredQty = round3(soLine.deliveredQty + line.quantity);
      this.issueStock(so.companyId, soLine.materialId, line.quantity, delivery.id);
    }
    so.status = so.lines.every((l) => l.deliveredQty >= l.quantity)
      ? 'delivered'
      : so.lines.some((l) => l.deliveredQty > 0)
        ? 'partially_delivered'
        : 'open';
    this.store.salesOrders.put(so);
    this.store.deliveries.put(delivery);
    return delivery;
  }

  /**
   * Bill a sales order at the order's prices. Omit `lines` to bill everything
   * delivered but not yet billed; explicit lines cannot exceed that quantity.
   */
  postCustomerInvoice(input: {
    salesOrderId: string;
    lines?: Array<{ lineNo: number; quantity: number }>;
  }): CustomerInvoice {
    const so = this.getSalesOrder(requireString(input.salesOrderId, 'salesOrderId'));
    const requested =
      input.lines ??
      so.lines
        .filter((l) => l.deliveredQty > l.billedQty)
        .map((l) => ({ lineNo: l.lineNo, quantity: round3(l.deliveredQty - l.billedQty) }));
    const invLines = requireLines(requested).map((line, i): CustomerInvoiceLine => {
      const soLine = findLine(so.lines, line.lineNo, i);
      const quantity = requireQuantity(line.quantity, `lines[${i}].quantity`);
      const billable = round3(soLine.deliveredQty - soLine.billedQty);
      if (quantity > billable) {
        throw new ConflictError(`line ${soLine.lineNo}: invoice of ${quantity} exceeds delivered unbilled quantity ${billable}`);
      }
      return {
        lineNo: soLine.lineNo,
        quantity,
        unitPriceCents: soLine.unitPriceCents,
        amountCents: Math.round(quantity * soLine.unitPriceCents),
      };
    });

    const invoice: CustomerInvoice = {
      id: this.newId('ci'),
      companyId: so.companyId,
      salesOrderId: so.id,
      lines: invLines,
      totalCents: invLines.reduce((t, l) => t + l.amountCents, 0),
      createdAt: this.now().toISOString(),
    };
    for (const line of invLines) {
      const soLine = so.lines.find((l) => l.lineNo === line.lineNo)!;
      soLine.billedQty = round3(soLine.billedQty + line.quantity);
    }
    this.store.salesOrders.put(so);
    this.store.customerInvoices.put(invoice);
    return invoice;
  }

  // ── Inventory & reporting ──────────────────────────────────────────────────

  /** ATP check: on hand minus what open sales orders have already promised. */
  availability(materialId: string): Availability {
    const material = this.getMaterial(materialId);
    const stock = this.stockFor(material.companyId, material.id);
    const committed = this.store.salesOrders
      .list((so) => so.companyId === material.companyId)
      .flatMap((so) => so.lines)
      .filter((l) => l.materialId === material.id)
      .reduce((t, l) => t + Math.max(0, l.quantity - l.deliveredQty), 0);
    return {
      materialId: material.id,
      onHand: stock.quantity,
      committed: round3(committed),
      availableToPromise: round3(stock.quantity - committed),
      movingAvgCents: stock.movingAvgCents,
      stockValueCents: Math.round(stock.quantity * stock.movingAvgCents),
    };
  }

  stockOverview(companyId: string): StockOverviewRow[] {
    const id = requireString(companyId, 'companyId');
    return this.listMaterials({ companyId: id }).map((m) => {
      const stock = this.stockFor(id, m.id);
      return {
        materialId: m.id,
        sku: m.sku,
        description: m.description,
        unit: m.unit,
        onHand: stock.quantity,
        movingAvgCents: stock.movingAvgCents,
        valueCents: Math.round(stock.quantity * stock.movingAvgCents),
      };
    });
  }

  listMovements(filter: { materialId?: string; companyId?: string } = {}): StockMovement[] {
    return this.store.movements
      .list((mv) => {
        if (filter.materialId && mv.materialId !== filter.materialId) return false;
        if (filter.companyId && mv.companyId !== filter.companyId) return false;
        return true;
      })
      .sort(byField('createdAt'));
  }

  /** The chain of documents around a purchase or sales order (SAP document flow). */
  documentFlow(orderId: string): DocumentFlow {
    const id = requireString(orderId, 'orderId');
    const po = this.store.purchaseOrders.get(id);
    if (po) {
      const documents: FlowDocument[] = [
        { type: 'purchase_order', id: po.id, createdAt: po.createdAt, summary: `${po.status} · ${cents(po.totalCents)}` },
        ...this.store.goodsReceipts
          .list((gr) => gr.purchaseOrderId === po.id)
          .map((gr): FlowDocument => ({
            type: 'goods_receipt',
            id: gr.id,
            createdAt: gr.createdAt,
            summary: `${sumQty(gr.lines)} received`,
          })),
        ...this.store.vendorInvoices
          .list((vi) => vi.purchaseOrderId === po.id)
          .map((vi): FlowDocument => ({
            type: 'vendor_invoice',
            id: vi.id,
            createdAt: vi.createdAt,
            summary: `${vi.status} · ${cents(vi.totalCents)}`,
          })),
      ];
      return { rootId: po.id, documents: documents.sort(byField('createdAt')) };
    }
    const so = this.getSalesOrder(id);
    const documents: FlowDocument[] = [
      { type: 'sales_order', id: so.id, createdAt: so.createdAt, summary: `${so.status} · ${cents(so.totalCents)}` },
      ...this.store.deliveries
        .list((dl) => dl.salesOrderId === so.id)
        .map((dl): FlowDocument => ({
          type: 'delivery',
          id: dl.id,
          createdAt: dl.createdAt,
          summary: `${sumQty(dl.lines)} delivered · COGS ${cents(dl.cogsCents)}`,
        })),
      ...this.store.customerInvoices
        .list((ci) => ci.salesOrderId === so.id)
        .map((ci): FlowDocument => ({
          type: 'customer_invoice',
          id: ci.id,
          createdAt: ci.createdAt,
          summary: cents(ci.totalCents),
        })),
    ];
    return { rootId: so.id, documents: documents.sort(byField('createdAt')) };
  }

  // ── Stock internals ────────────────────────────────────────────────────────

  private stockFor(companyId: string, materialId: string): StockRecord {
    const existing = this.store.stock.list((s) => s.companyId === companyId && s.materialId === materialId)[0];
    if (existing) return existing;
    return { id: this.newId('stk'), companyId, materialId, quantity: 0, movingAvgCents: 0 };
  }

  private receiveStock(companyId: string, materialId: string, quantity: number, unitCostCents: number, refDocId: string): void {
    const stock = this.stockFor(companyId, materialId);
    const newQty = round3(stock.quantity + quantity);
    // Moving average, SAP price control "V": re-weight the old value with the
    // receipt's value; a receipt onto zero stock simply takes the new price.
    stock.movingAvgCents = Math.round(
      (stock.quantity * stock.movingAvgCents + quantity * unitCostCents) / newQty,
    );
    stock.quantity = newQty;
    this.store.stock.put(stock);
    this.recordMovement(companyId, materialId, 'goods_receipt', quantity, unitCostCents, refDocId);
  }

  private issueStock(companyId: string, materialId: string, quantity: number, refDocId: string): void {
    const stock = this.stockFor(companyId, materialId);
    stock.quantity = round3(stock.quantity - quantity);
    this.store.stock.put(stock);
    this.recordMovement(companyId, materialId, 'goods_issue', -quantity, stock.movingAvgCents, refDocId);
  }

  private recordMovement(
    companyId: string,
    materialId: string,
    type: StockMovement['type'],
    quantity: number,
    unitCostCents: number,
    refDocId: string,
  ): void {
    this.store.movements.put({
      id: this.newId('mv'),
      companyId,
      materialId,
      type,
      quantity,
      unitCostCents,
      refDocId,
      createdAt: this.now().toISOString(),
    });
  }
}

// ── Validation helpers ───────────────────────────────────────────────────────

function requireLines<T>(lines: T[]): T[] {
  if (!Array.isArray(lines) || lines.length === 0) throw new ValidationError('lines must be a non-empty array');
  return lines;
}

function findLine<T extends { lineNo: number }>(lines: T[], lineNo: unknown, i: number): T {
  if (typeof lineNo !== 'number' || !Number.isInteger(lineNo)) {
    throw new ValidationError(`lines[${i}].lineNo must be an integer`);
  }
  const line = lines.find((l) => l.lineNo === lineNo);
  if (!line) throw new ValidationError(`lines[${i}]: no order line ${lineNo}`);
  return line;
}

function requireQuantity(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new ValidationError(`${field} must be a positive number`);
  }
  return round3(value);
}

function requireCents(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${field} must be a non-negative integer (cents)`);
  }
  return value;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new ValidationError(`${field} is required`);
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new ValidationError('expected a string');
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

/** Quantities keep at most 3 decimals so repeated +/- never drifts. */
function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function byField<T>(field: keyof T): (a: T, b: T) => number {
  return (a, b) => (a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0);
}

function cents(value: number): string {
  return `$${(value / 100).toFixed(2)}`;
}

function sumQty(lines: Array<{ quantity: number }>): number {
  return round3(lines.reduce((t, l) => t + l.quantity, 0));
}
