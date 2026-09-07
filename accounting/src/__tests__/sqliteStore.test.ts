/**
 * The SQLite store persists across service instances: bill and pay through one
 * service, reopen the database, and the invoice (with its payments and paid
 * status) is still there.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { AccountingService } from '../service/accountingService.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';

test('invoices, payments, and expenses survive a reopen', () => {
  const dir = mkdtempSync(join(tmpdir(), 'accounting-'));
  const dbPath = join(dir, 'books.db');
  try {
    const first = createSqliteStore(dbPath);
    let invoiceId: string;
    let companyId: string;
    try {
      const service = new AccountingService({ store: first });
      const co = service.createCompany({ name: 'Persistent LLC' });
      companyId = co.id;
      const acct = service.createAccount({ companyId: co.id, type: 'expense', name: 'Rent' });
      const cust = service.createCustomer({ companyId: co.id, name: 'Client' });
      const inv = service.createInvoice({
        companyId: co.id,
        customerId: cust.id,
        lines: [{ description: 'Job', quantity: 1, unitPriceCents: 25000 }],
      });
      invoiceId = inv.id;
      service.issueInvoice(inv.id);
      service.recordPayment(inv.id, { amountCents: 25000 });
      service.recordExpense({ companyId: co.id, vendor: 'Landlord', accountId: acct.id, amountCents: 90000, date: '2026-07-01' });
    } finally {
      first.close();
    }

    const second = createSqliteStore(dbPath);
    try {
      const service = new AccountingService({ store: second });
      const reloaded = service.getInvoice(invoiceId);
      assert.equal(reloaded.status, 'paid');
      assert.equal(reloaded.balanceCents, 0);
      assert.equal(reloaded.payments.length, 1);
      assert.equal(service.listExpenses({ companyId }).length, 1);
    } finally {
      second.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
