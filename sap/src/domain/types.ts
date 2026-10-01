/**
 * SAP-style ERP domain: the two document chains every ERP is built around.
 *
 *   Procure-to-pay (SAP "MM"):  PurchaseOrder → GoodsReceipt → VendorInvoice
 *   Order-to-cash  (SAP "SD"):  SalesOrder → Delivery → CustomerInvoice
 *
 * Goods receipts and deliveries move stock; stock carries a moving-average
 * unit cost so goods issues price cost of goods sold the way SAP's price
 * control "V" does. Vendor invoices are three-way matched against the order
 * and receipts — variances don't reject the invoice, they post it "blocked"
 * (a payment hold), which is how SAP's logistics invoice verification works.
 *
 * All money is integer cents. Quantities may be fractional (e.g. 2.5 kg).
 */

export interface Material {
  id: string;
  companyId: string;
  /** Human material number, unique per company (SAP's MATNR). */
  sku: string;
  description: string;
  /** Unit of measure, e.g. "EA", "KG", "BOX". */
  unit: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  companyId: string;
  name: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  createdAt: string;
}

/** On-hand stock per material, valued at a moving-average unit cost. */
export interface StockRecord {
  id: string;
  companyId: string;
  materialId: string;
  quantity: number;
  /** Per-unit moving-average cost; re-weighted on every goods receipt. */
  movingAvgCents: number;
}

/** Journal of every stock change, so quantity on hand is always explainable. */
export interface StockMovement {
  id: string;
  companyId: string;
  materialId: string;
  type: 'goods_receipt' | 'goods_issue';
  /** Positive for receipts, negative for issues. */
  quantity: number;
  /** Cost applied per unit: PO price on receipt, moving average on issue. */
  unitCostCents: number;
  /** The document that caused the movement (goods receipt / delivery id). */
  refDocId: string;
  createdAt: string;
}

export type PurchaseOrderStatus = 'open' | 'partially_received' | 'received';

export interface PurchaseOrderLine {
  lineNo: number;
  materialId: string;
  quantity: number;
  unitPriceCents: number;
  receivedQty: number;
  invoicedQty: number;
}

export interface PurchaseOrder {
  id: string;
  companyId: string;
  vendorId: string;
  lines: PurchaseOrderLine[];
  status: PurchaseOrderStatus;
  totalCents: number;
  createdAt: string;
}

export interface GoodsReceiptLine {
  lineNo: number;
  quantity: number;
  unitCostCents: number;
}

export interface GoodsReceipt {
  id: string;
  companyId: string;
  purchaseOrderId: string;
  lines: GoodsReceiptLine[];
  createdAt: string;
}

export type VendorInvoiceStatus = 'posted' | 'blocked';

export interface VendorInvoiceLine {
  lineNo: number;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
}

export interface VendorInvoice {
  id: string;
  companyId: string;
  purchaseOrderId: string;
  lines: VendorInvoiceLine[];
  totalCents: number;
  status: VendorInvoiceStatus;
  /** Why the three-way match put a payment hold on this invoice (if it did). */
  blockedReasons: string[];
  createdAt: string;
}

export type SalesOrderStatus = 'open' | 'partially_delivered' | 'delivered';

export interface SalesOrderLine {
  lineNo: number;
  materialId: string;
  quantity: number;
  unitPriceCents: number;
  deliveredQty: number;
  billedQty: number;
}

export interface SalesOrder {
  id: string;
  companyId: string;
  customerId: string;
  lines: SalesOrderLine[];
  status: SalesOrderStatus;
  totalCents: number;
  createdAt: string;
}

export interface DeliveryLine {
  lineNo: number;
  quantity: number;
  /** Moving-average cost at the moment of goods issue. */
  unitCostCents: number;
}

export interface Delivery {
  id: string;
  companyId: string;
  salesOrderId: string;
  lines: DeliveryLine[];
  /** Cost of goods sold for this delivery. */
  cogsCents: number;
  createdAt: string;
}

export interface CustomerInvoiceLine {
  lineNo: number;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
}

export interface CustomerInvoice {
  id: string;
  companyId: string;
  salesOrderId: string;
  lines: CustomerInvoiceLine[];
  totalCents: number;
  createdAt: string;
}

/** SAP's ATP ("available to promise") view of one material. */
export interface Availability {
  materialId: string;
  onHand: number;
  /** Undelivered quantity promised on open sales orders. */
  committed: number;
  availableToPromise: number;
  movingAvgCents: number;
  stockValueCents: number;
}

export interface StockOverviewRow {
  materialId: string;
  sku: string;
  description: string;
  unit: string;
  onHand: number;
  movingAvgCents: number;
  valueCents: number;
}

/** One entry in a document-flow chain (SAP's "document flow" screen). */
export interface FlowDocument {
  type: 'purchase_order' | 'goods_receipt' | 'vendor_invoice' | 'sales_order' | 'delivery' | 'customer_invoice';
  id: string;
  createdAt: string;
  summary: string;
}

export interface DocumentFlow {
  rootId: string;
  documents: FlowDocument[];
}
