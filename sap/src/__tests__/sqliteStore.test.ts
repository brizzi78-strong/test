import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ErpService } from '../service/erpService.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';

test('sqlite store survives a close and reopen', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sap-test-'));
  const path = join(dir, 'erp.db');
  try {
    const store = createSqliteStore(path);
    const service = new ErpService({ store });
    const material = service.createMaterial({ companyId: 'co1', sku: 'INK-BLK', description: 'Black ink' });
    const vendor = service.createVendor({ companyId: 'co1', name: 'Acme Supply' });
    const po = service.createPurchaseOrder({
      companyId: 'co1',
      vendorId: vendor.id,
      lines: [{ materialId: material.id, quantity: 5, unitPriceCents: 100 }],
    });
    service.postGoodsReceipt({ purchaseOrderId: po.id, lines: [{ lineNo: 1, quantity: 5 }] });
    store.close();

    const reopened = createSqliteStore(path);
    const service2 = new ErpService({ store: reopened });
    assert.equal(service2.getPurchaseOrder(po.id).status, 'received');
    assert.equal(service2.availability(material.id).onHand, 5);
    assert.equal(service2.availability(material.id).stockValueCents, 500);
    reopened.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
