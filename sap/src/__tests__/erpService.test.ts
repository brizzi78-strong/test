import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ErpService } from '../service/erpService.ts';
import { createInMemoryStore } from '../store/store.ts';

function makeService() {
  let seq = 0;
  let tick = 0;
  return new ErpService({
    store: createInMemoryStore(),
    newId: (prefix) => `${prefix}_${++seq}`,
    now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, ++tick)),
  });
}

function seedCompany(service: ErpService) {
  const material = service.createMaterial({ companyId: 'co1', sku: 'WIDGET-1', description: 'Widget', unit: 'EA' });
  const vendor = service.createVendor({ companyId: 'co1', name: 'Acme Supply' });
  const customer = service.createCustomer({ companyId: 'co1', name: 'Blue Ridge Press' });
  return { material, vendor, customer };
}

test('material skus are unique per company', () => {
  const service = makeService();
  service.createMaterial({ companyId: 'co1', sku: 'WIDGET-1', description: 'Widget' });
  assert.throws(
    () => service.createMaterial({ companyId: 'co1', sku: 'WIDGET-1', description: 'Duplicate' }),
    /sku already exists/,
  );
  // Same sku in another company is fine.
  service.createMaterial({ companyId: 'co2', sku: 'WIDGET-1', description: 'Other company' });
});

test('procure-to-pay: PO → goods receipts → status and stock', () => {
  const service = makeService();
  const { material, vendor } = seedCompany(service);

  const po = service.createPurchaseOrder({
    companyId: 'co1',
    vendorId: vendor.id,
    lines: [{ materialId: material.id, quantity: 10, unitPriceCents: 250 }],
  });
  assert.equal(po.status, 'open');
  assert.equal(po.totalCents, 2500);

  service.postGoodsReceipt({ purchaseOrderId: po.id, lines: [{ lineNo: 1, quantity: 4 }] });
  assert.equal(service.getPurchaseOrder(po.id).status, 'partially_received');
  assert.equal(service.availability(material.id).onHand, 4);

  service.postGoodsReceipt({ purchaseOrderId: po.id, lines: [{ lineNo: 1, quantity: 6 }] });
  const received = service.getPurchaseOrder(po.id);
  assert.equal(received.status, 'received');
  assert.equal(received.lines[0].receivedQty, 10);
  assert.equal(service.availability(material.id).onHand, 10);
  assert.equal(service.availability(material.id).movingAvgCents, 250);

  // Receiving more than ordered is refused.
  assert.throws(
    () => service.postGoodsReceipt({ purchaseOrderId: po.id, lines: [{ lineNo: 1, quantity: 1 }] }),
    /exceeds open quantity/,
  );
});

test('goods receipts re-weight the moving-average cost', () => {
  const service = makeService();
  const { material, vendor } = seedCompany(service);

  const cheap = service.createPurchaseOrder({
    companyId: 'co1',
    vendorId: vendor.id,
    lines: [{ materialId: material.id, quantity: 10, unitPriceCents: 100 }],
  });
  service.postGoodsReceipt({ purchaseOrderId: cheap.id, lines: [{ lineNo: 1, quantity: 10 }] });

  const dear = service.createPurchaseOrder({
    companyId: 'co1',
    vendorId: vendor.id,
    lines: [{ materialId: material.id, quantity: 10, unitPriceCents: 200 }],
  });
  service.postGoodsReceipt({ purchaseOrderId: dear.id, lines: [{ lineNo: 1, quantity: 10 }] });

  const availability = service.availability(material.id);
  assert.equal(availability.onHand, 20);
  assert.equal(availability.movingAvgCents, 150); // (10·100 + 10·200) / 20
  assert.equal(availability.stockValueCents, 3000);
});

test('three-way match: clean invoices post, variances block', () => {
  const service = makeService();
  const { material, vendor } = seedCompany(service);
  const po = service.createPurchaseOrder({
    companyId: 'co1',
    vendorId: vendor.id,
    lines: [{ materialId: material.id, quantity: 10, unitPriceCents: 250 }],
  });
  service.postGoodsReceipt({ purchaseOrderId: po.id, lines: [{ lineNo: 1, quantity: 6 }] });

  // Matches order price and stays within received quantity → posted.
  const clean = service.postVendorInvoice({
    purchaseOrderId: po.id,
    lines: [{ lineNo: 1, quantity: 6, unitPriceCents: 250 }],
  });
  assert.equal(clean.status, 'posted');
  assert.equal(clean.totalCents, 1500);
  assert.deepEqual(clean.blockedReasons, []);

  // Invoiced beyond what was received → blocked with a quantity variance.
  const early = service.postVendorInvoice({
    purchaseOrderId: po.id,
    lines: [{ lineNo: 1, quantity: 2, unitPriceCents: 250 }],
  });
  assert.equal(early.status, 'blocked');
  assert.match(early.blockedReasons[0], /quantity variance/);

  // Price differs from the order → blocked with a price variance.
  const pricey = service.postVendorInvoice({
    purchaseOrderId: po.id,
    lines: [{ lineNo: 1, quantity: 1, unitPriceCents: 300 }],
  });
  assert.equal(pricey.status, 'blocked');
  assert.match(pricey.blockedReasons[0], /price variance/);

  // Invoicing beyond the ordered quantity is refused outright.
  assert.throws(
    () => service.postVendorInvoice({ purchaseOrderId: po.id, lines: [{ lineNo: 1, quantity: 5, unitPriceCents: 250 }] }),
    /exceeds uninvoiced quantity/,
  );
});

test('order-to-cash: ATP, delivery at moving-average COGS, billing', () => {
  const service = makeService();
  const { material, vendor, customer } = seedCompany(service);

  // Stock up: 20 on hand at a 150¢ moving average.
  const po = service.createPurchaseOrder({
    companyId: 'co1',
    vendorId: vendor.id,
    lines: [{ materialId: material.id, quantity: 20, unitPriceCents: 150 }],
  });
  service.postGoodsReceipt({ purchaseOrderId: po.id, lines: [{ lineNo: 1, quantity: 20 }] });

  const so = service.createSalesOrder({
    companyId: 'co1',
    customerId: customer.id,
    lines: [{ materialId: material.id, quantity: 12, unitPriceCents: 500 }],
  });
  assert.equal(so.totalCents, 6000);

  // The open order commits stock even before delivery.
  const atp = service.availability(material.id);
  assert.equal(atp.onHand, 20);
  assert.equal(atp.committed, 12);
  assert.equal(atp.availableToPromise, 8);

  const delivery = service.postDelivery({ salesOrderId: so.id, lines: [{ lineNo: 1, quantity: 5 }] });
  assert.equal(delivery.cogsCents, 750); // 5 × 150¢ moving average
  assert.equal(service.getSalesOrder(so.id).status, 'partially_delivered');
  assert.equal(service.availability(material.id).onHand, 15);

  // Billing with no lines bills exactly what was delivered and not yet billed.
  const invoice = service.postCustomerInvoice({ salesOrderId: so.id });
  assert.equal(invoice.totalCents, 2500); // 5 × 500¢ order price
  assert.equal(service.getSalesOrder(so.id).lines[0].billedQty, 5);

  // Nothing delivered-unbilled left → billing again is refused.
  assert.throws(() => service.postCustomerInvoice({ salesOrderId: so.id }), /non-empty array/);
  assert.throws(
    () => service.postCustomerInvoice({ salesOrderId: so.id, lines: [{ lineNo: 1, quantity: 1 }] }),
    /exceeds delivered unbilled/,
  );

  service.postDelivery({ salesOrderId: so.id, lines: [{ lineNo: 1, quantity: 7 }] });
  assert.equal(service.getSalesOrder(so.id).status, 'delivered');
});

test('delivery is refused when stock cannot cover it', () => {
  const service = makeService();
  const { material, customer } = seedCompany(service);
  const so = service.createSalesOrder({
    companyId: 'co1',
    customerId: customer.id,
    lines: [{ materialId: material.id, quantity: 3, unitPriceCents: 500 }],
  });
  assert.throws(
    () => service.postDelivery({ salesOrderId: so.id, lines: [{ lineNo: 1, quantity: 3 }] }),
    /insufficient stock/,
  );
});

test('document flow chains every document to its order', () => {
  const service = makeService();
  const { material, vendor, customer } = seedCompany(service);

  const po = service.createPurchaseOrder({
    companyId: 'co1',
    vendorId: vendor.id,
    lines: [{ materialId: material.id, quantity: 10, unitPriceCents: 100 }],
  });
  service.postGoodsReceipt({ purchaseOrderId: po.id, lines: [{ lineNo: 1, quantity: 10 }] });
  service.postVendorInvoice({ purchaseOrderId: po.id, lines: [{ lineNo: 1, quantity: 10, unitPriceCents: 100 }] });

  const poFlow = service.documentFlow(po.id);
  assert.deepEqual(poFlow.documents.map((d) => d.type), ['purchase_order', 'goods_receipt', 'vendor_invoice']);

  const so = service.createSalesOrder({
    companyId: 'co1',
    customerId: customer.id,
    lines: [{ materialId: material.id, quantity: 2, unitPriceCents: 300 }],
  });
  service.postDelivery({ salesOrderId: so.id, lines: [{ lineNo: 1, quantity: 2 }] });
  service.postCustomerInvoice({ salesOrderId: so.id });

  const soFlow = service.documentFlow(so.id);
  assert.deepEqual(soFlow.documents.map((d) => d.type), ['sales_order', 'delivery', 'customer_invoice']);
});

test('stock movements journal explains quantity on hand', () => {
  const service = makeService();
  const { material, vendor, customer } = seedCompany(service);
  const po = service.createPurchaseOrder({
    companyId: 'co1',
    vendorId: vendor.id,
    lines: [{ materialId: material.id, quantity: 5, unitPriceCents: 100 }],
  });
  service.postGoodsReceipt({ purchaseOrderId: po.id, lines: [{ lineNo: 1, quantity: 5 }] });
  const so = service.createSalesOrder({
    companyId: 'co1',
    customerId: customer.id,
    lines: [{ materialId: material.id, quantity: 2, unitPriceCents: 300 }],
  });
  service.postDelivery({ salesOrderId: so.id, lines: [{ lineNo: 1, quantity: 2 }] });

  const movements = service.listMovements({ materialId: material.id });
  assert.deepEqual(movements.map((m) => [m.type, m.quantity]), [
    ['goods_receipt', 5],
    ['goods_issue', -2],
  ]);
  const net = movements.reduce((t, m) => t + m.quantity, 0);
  assert.equal(net, service.availability(material.id).onHand);
});

test('cross-company references are rejected', () => {
  const service = makeService();
  const { material } = seedCompany(service);
  const otherVendor = service.createVendor({ companyId: 'co2', name: 'Elsewhere Inc' });
  assert.throws(
    () =>
      service.createPurchaseOrder({
        companyId: 'co1',
        vendorId: otherVendor.id,
        lines: [{ materialId: material.id, quantity: 1, unitPriceCents: 100 }],
      }),
    /different company/,
  );
});
