import { test } from 'node:test';
import assert from 'node:assert/strict';

import { AccountingService } from '../service/accountingService.ts';
import { ConflictError, NotFoundError, ValidationError } from '../service/errors.ts';
import { createInMemoryStore } from '../store/store.ts';

function makeService(start = '2026-07-16T12:00:00.000Z') {
  const clock = { current: new Date(start) };
  let seq = 0;
  const service = new AccountingService({
    store: createInMemoryStore(),
    now: () => new Date(clock.current.getTime()),
    newId: (prefix) => `${prefix}_${++seq}`,
  });
  return { service, clock };
}

function seed(service: AccountingService) {
  const company = service.createCompany({ name: 'Blue Ridge Press LLC' });
  const revenue = service.createAccount({ companyId: company.id, type: 'income', name: 'Consulting Revenue', code: '4000' });
  const software = service.createAccount({ companyId: company.id, type: 'expense', name: 'Software', code: '6000' });
  const customer = service.createCustomer({ companyId: company.id, name: 'Acme Co', email: 'ap@acme.example' });
  return { company, revenue, software, customer };
}

test('invoice is created as a draft with computed subtotal, tax, and total', () => {
  const { service } = makeService();
  const { company, customer, revenue } = seed(service);
  const invoice = service.createInvoice({
    companyId: company.id,
    customerId: customer.id,
    incomeAccountId: revenue.id,
    taxRateBps: 725, // 7.25%
    lines: [
      { description: 'Consulting', quantity: 10, unitPriceCents: 15000 }, // 150000
      { description: 'Setup fee', quantity: 1, unitPriceCents: 5000 }, // 5000
    ],
  });
  assert.equal(invoice.status, 'draft');
  assert.equal(invoice.number, undefined);
  assert.equal(invoice.subtotalCents, 155000);
  assert.equal(invoice.taxCents, Math.round((155000 * 725) / 10000)); // 11238
  assert.equal(invoice.totalCents, 155000 + 11238);
  assert.equal(invoice.balanceCents, invoice.totalCents);
  assert.equal(invoice.amountPaidCents, 0);
});

test('full path: issue assigns a number, payments settle the balance and mark it paid', () => {
  const { service } = makeService();
  const { company, customer } = seed(service);
  const draft = service.createInvoice({
    companyId: company.id,
    customerId: customer.id,
    lines: [{ description: 'Retainer', quantity: 1, unitPriceCents: 100000 }],
  });

  const issued = service.issueInvoice(draft.id, { issueDate: '2026-07-16' });
  assert.equal(issued.status, 'open');
  assert.equal(issued.number, 'INV-0001');
  assert.equal(issued.balanceCents, 100000);

  const partial = service.recordPayment(draft.id, { amountCents: 40000, method: 'ach' });
  assert.equal(partial.status, 'open');
  assert.equal(partial.amountPaidCents, 40000);
  assert.equal(partial.balanceCents, 60000);

  const settled = service.recordPayment(draft.id, { amountCents: 60000 });
  assert.equal(settled.status, 'paid');
  assert.equal(settled.balanceCents, 0);
  assert.equal(settled.payments.length, 2);
  assert.ok(settled.history.some((e) => e.event === 'paid'));
});

test('invoice numbers increment per company as invoices are issued', () => {
  const { service } = makeService();
  const { company, customer } = seed(service);
  const mk = () =>
    service.issueInvoice(
      service.createInvoice({
        companyId: company.id,
        customerId: customer.id,
        lines: [{ description: 'x', quantity: 1, unitPriceCents: 1000 }],
      }).id,
    ).number;
  assert.equal(mk(), 'INV-0001');
  assert.equal(mk(), 'INV-0002');
  assert.equal(mk(), 'INV-0003');
});

test('payments are rejected on drafts and when they exceed the balance', () => {
  const { service } = makeService();
  const { company, customer } = seed(service);
  const draft = service.createInvoice({
    companyId: company.id,
    customerId: customer.id,
    lines: [{ description: 'x', quantity: 1, unitPriceCents: 5000 }],
  });
  assert.throws(() => service.recordPayment(draft.id, { amountCents: 5000 }), ConflictError);
  service.issueInvoice(draft.id);
  assert.throws(() => service.recordPayment(draft.id, { amountCents: 5001 }), ValidationError);
  assert.throws(() => service.recordPayment(draft.id, { amountCents: 0 }), ValidationError);
});

test('a draft can be voided; a paid invoice cannot', () => {
  const { service } = makeService();
  const { company, customer } = seed(service);
  const a = service.createInvoice({
    companyId: company.id,
    customerId: customer.id,
    lines: [{ description: 'x', quantity: 1, unitPriceCents: 5000 }],
  });
  const voided = service.voidInvoice(a.id, { reason: 'duplicate' });
  assert.equal(voided.status, 'void');
  assert.equal(voided.balanceCents, 0);

  const b = service.createInvoice({
    companyId: company.id,
    customerId: customer.id,
    lines: [{ description: 'y', quantity: 1, unitPriceCents: 5000 }],
  });
  service.issueInvoice(b.id);
  service.recordPayment(b.id, { amountCents: 5000 });
  assert.throws(() => service.voidInvoice(b.id), ConflictError);
});

test('expenses must post to an expense account belonging to the company', () => {
  const { service } = makeService();
  const { company, revenue, software } = seed(service);
  // Posting an expense to an income account is rejected.
  assert.throws(
    () => service.recordExpense({ companyId: company.id, vendor: 'GitHub', accountId: revenue.id, amountCents: 2100, date: '2026-07-10' }),
    ValidationError,
  );
  const exp = service.recordExpense({ companyId: company.id, vendor: 'GitHub', accountId: software.id, amountCents: 2100, date: '2026-07-10' });
  assert.equal(exp.amountCents, 2100);
});

test('profit & loss recognizes issued-invoice revenue and expenses, grouped by account', () => {
  const { service } = makeService();
  const { company, customer, revenue, software } = seed(service);

  // Issued invoice in-window (income).
  const inv = service.createInvoice({
    companyId: company.id,
    customerId: customer.id,
    incomeAccountId: revenue.id,
    lines: [{ description: 'Consulting', quantity: 1, unitPriceCents: 200000 }],
  });
  service.issueInvoice(inv.id, { issueDate: '2026-07-05' });

  // A draft invoice should NOT count as revenue.
  service.createInvoice({
    companyId: company.id,
    customerId: customer.id,
    incomeAccountId: revenue.id,
    lines: [{ description: 'Not sent', quantity: 1, unitPriceCents: 999999 }],
  });

  // Expenses, one in-window and one out-of-window.
  service.recordExpense({ companyId: company.id, vendor: 'AWS', accountId: software.id, amountCents: 15000, date: '2026-07-08' });
  service.recordExpense({ companyId: company.id, vendor: 'AWS', accountId: software.id, amountCents: 99999, date: '2026-08-08' });

  const pl = service.profitAndLoss({ companyId: company.id, from: '2026-07-01', to: '2026-07-31' });
  assert.equal(pl.income.totalCents, 200000);
  assert.equal(pl.income.lines.length, 1);
  assert.equal(pl.income.lines[0].name, 'Consulting Revenue');
  assert.equal(pl.expenses.totalCents, 15000);
  assert.equal(pl.netCents, 185000);
});

test('accounts-receivable aging buckets open balances by days past due', () => {
  const { service } = makeService();
  const { company, customer } = seed(service);

  const current = service.createInvoice({
    companyId: company.id,
    customerId: customer.id,
    dueDate: '2026-07-20',
    lines: [{ description: 'a', quantity: 1, unitPriceCents: 10000 }],
  });
  service.issueInvoice(current.id, { issueDate: '2026-07-01' });

  const overdue = service.createInvoice({
    companyId: company.id,
    customerId: customer.id,
    dueDate: '2026-06-01',
    lines: [{ description: 'b', quantity: 1, unitPriceCents: 30000 }],
  });
  service.issueInvoice(overdue.id, { issueDate: '2026-05-15' });

  const aging = service.accountsReceivable({ companyId: company.id, asOf: '2026-07-10' });
  assert.equal(aging.totalCents, 40000);
  assert.equal(aging.buckets.current, 10000); // due 07-20, not yet due on 07-10
  assert.equal(aging.buckets.d31_60, 30000); // due 06-01 -> 39 days past on 07-10
  assert.equal(aging.invoices.length, 2);
});

test('unknown ids and empty line lists are rejected', () => {
  const { service } = makeService();
  const { company, customer } = seed(service);
  assert.throws(() => service.getInvoice('inv_nope'), NotFoundError);
  assert.throws(
    () => service.createInvoice({ companyId: company.id, customerId: customer.id, lines: [] }),
    ValidationError,
  );
});
