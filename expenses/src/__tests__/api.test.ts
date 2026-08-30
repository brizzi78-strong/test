import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp, type AppServer } from '../api/server.ts';
import { DEFAULT_POLICY } from '../domain/policy.ts';
import type { ExpenseReport } from '../domain/types.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';

let app: AppServer;
let base: string;
let store: Store;

before(async () => {
  store = createInMemoryStore();
  // Pin the policy so an EXPENSES_POLICY in the developer/CI environment
  // cannot change what this suite asserts.
  app = createApp(store, { policy: DEFAULT_POLICY });
  await new Promise<void>((resolve) => app.server.listen(0, resolve));
  base = `http://localhost:${(app.server.address() as AddressInfo).port}`;
});

after(() => app.server.close());

async function call(
  method: string,
  path: string,
  body?: unknown,
  user = 'ada',
): Promise<{ status: number; json: any }> {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', 'x-user-id': user },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

const today = new Date().toISOString().slice(0, 10);

describe('Expenses API', () => {
  it('serves the web app, health check, and policy', async () => {
    const health = await fetch(base + '/health');
    assert.equal(health.status, 200);
    const home = await fetch(base + '/');
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Expenses/);
    const policy = await call('GET', '/policy');
    assert.equal(policy.json.policy.mileageRateCentsPerMile, 70);
  });

  it('auto-approves a compliant report on submit', async () => {
    const created = await call('POST', '/reports', { title: 'Client lunch' });
    assert.equal(created.status, 201);
    const id = created.json.report.id;

    const added = await call('POST', `/reports/${id}/expenses`, {
      date: today,
      category: 'meals',
      merchant: 'Bistro',
      amountCents: 2_000,
    });
    assert.equal(added.status, 201);
    assert.deepEqual(added.json.evaluation.violations, []);
    assert.equal(added.json.evaluation.autoApprovable, true);

    const submitted = await call('POST', `/reports/${id}/submit`);
    assert.equal(submitted.json.report.status, 'approved');
    assert.equal(submitted.json.report.autoApproved, true);
    assert.ok(submitted.json.report.history.some((h: any) => h.by === 'policy-engine'));
  });

  it('routes a flagged report through the approver queue', async () => {
    const { json: createdJson } = await call('POST', '/reports', {
      title: 'Conference travel',
      approverId: 'grace',
    });
    const id = createdJson.report.id;

    // $30 meal with no receipt -> MISSING_RECEIPT flag, no auto-approval.
    const added = await call('POST', `/reports/${id}/expenses`, {
      date: today,
      category: 'meals',
      merchant: 'Airport Grill',
      amountCents: 3_000,
    });
    assert.deepEqual(
      added.json.evaluation.violations.map((v: any) => v.code),
      ['MISSING_RECEIPT'],
    );

    const submitted = await call('POST', `/reports/${id}/submit`);
    assert.equal(submitted.json.report.status, 'submitted');

    const queue = await call('GET', '/approvals', undefined, 'grace');
    assert.equal(queue.json.reports.length, 1);
    assert.equal(queue.json.reports[0].report.id, id);

    // Owner cannot approve their own report even if named approver elsewhere.
    const selfApprove = await call('POST', `/reports/${id}/approve`);
    assert.equal(selfApprove.status, 403);

    const approved = await call('POST', `/reports/${id}/approve`, undefined, 'grace');
    assert.equal(approved.json.report.status, 'approved');
    assert.equal(approved.json.report.autoApproved, undefined);

    const reimbursed = await call('POST', `/reports/${id}/reimburse`, undefined, 'grace');
    assert.equal(reimbursed.json.report.status, 'reimbursed');
  });

  it('supports reject and revise-and-resubmit', async () => {
    const { json: createdJson } = await call('POST', '/reports', {
      title: 'Team dinner',
      approverId: 'grace',
    });
    const id = createdJson.report.id;
    await call('POST', `/reports/${id}/expenses`, {
      date: today,
      category: 'entertainment',
      merchant: 'Karaoke Palace',
      amountCents: 12_000,
      receipt: 'karaoke.pdf',
    });
    await call('POST', `/reports/${id}/submit`);

    const rejected = await call('POST', `/reports/${id}/reject`, { reason: 'Over the entertainment limit' }, 'grace');
    assert.equal(rejected.json.report.status, 'rejected');
    assert.equal(rejected.json.report.rejectionReason, 'Over the entertainment limit');

    const reopened = await call('POST', `/reports/${id}/reopen`);
    assert.equal(reopened.json.report.status, 'draft');
    assert.equal(reopened.json.report.rejectionReason, undefined);

    const expenseId = reopened.json.report.expenses[0].id;
    const updated = await call('PUT', `/reports/${id}/expenses/${expenseId}`, {
      date: today,
      category: 'entertainment',
      merchant: 'Karaoke Palace',
      amountCents: 9_500,
      receipt: 'karaoke.pdf',
    });
    assert.deepEqual(updated.json.evaluation.violations, []);

    const resubmitted = await call('POST', `/reports/${id}/submit`);
    assert.equal(resubmitted.json.report.status, 'approved');
    assert.equal(resubmitted.json.report.autoApproved, true);
  });

  it('computes mileage amounts server-side', async () => {
    const { json: createdJson } = await call('POST', '/reports', { title: 'Site visit' });
    const id = createdJson.report.id;
    const added = await call('POST', `/reports/${id}/expenses`, {
      date: today,
      category: 'mileage',
      merchant: 'Personal car',
      miles: 42,
    });
    assert.equal(added.json.report.expenses[0].amountCents, 2_940);
  });

  it('flags duplicates across the same user’s reports', async () => {
    const first = await call('POST', '/reports', { title: 'Week 1' }, 'dup-user');
    await call(
      'POST',
      `/reports/${first.json.report.id}/expenses`,
      { date: today, category: 'ground_transport', merchant: 'Uber', amountCents: 1_800 },
      'dup-user',
    );
    const second = await call('POST', '/reports', { title: 'Week 2' }, 'dup-user');
    const added = await call(
      'POST',
      `/reports/${second.json.report.id}/expenses`,
      { date: today, category: 'ground_transport', merchant: 'uber', amountCents: 1_800 },
      'dup-user',
    );
    assert.deepEqual(
      added.json.evaluation.violations.map((v: any) => v.code),
      ['DUPLICATE'],
    );
  });

  it('validates input and enforces ownership', async () => {
    const bad = await call('POST', '/reports', {});
    assert.equal(bad.status, 400);

    const { json: createdJson } = await call('POST', '/reports', { title: 'Mine' });
    const id = createdJson.report.id;
    const badExpense = await call('POST', `/reports/${id}/expenses`, {
      date: 'not-a-date',
      category: 'meals',
      merchant: 'X',
      amountCents: 100,
    });
    assert.equal(badExpense.status, 400);

    const stranger = await call('GET', `/reports/${id}`, undefined, 'mallory');
    assert.equal(stranger.status, 403);

    const emptySubmit = await call('POST', `/reports/${id}/submit`);
    assert.equal(emptySubmit.status, 400);

    const missing = await call('GET', '/reports/does-not-exist');
    assert.equal(missing.status, 404);
  });

  it('reports analytics per user', async () => {
    const { json } = await call('GET', '/analytics', undefined, 'dup-user');
    assert.equal(json.reportCount, 2);
    assert.equal(json.totalCents, 3_600);
    assert.equal(json.byCategory.ground_transport, 3_600);
  });

  it('stores receipt attachments, strips them from lists, serves them in detail', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
    const { json: createdJson } = await call('POST', '/reports', { title: 'Receipts' }, 'rex');
    const id = createdJson.report.id;
    const added = await call(
      'POST',
      `/reports/${id}/expenses`,
      { date: today, category: 'meals', merchant: 'Deli', amountCents: 2_600, receipt: { name: 'deli.png', dataUrl } },
      'rex',
    );
    assert.equal(added.status, 201);
    assert.deepEqual(added.json.evaluation.violations, []);

    const list = await call('GET', '/reports', undefined, 'rex');
    const listed = list.json.reports[0].report.expenses[0].receipt;
    assert.deepEqual(listed, { name: 'deli.png', hasData: true });

    const detail = await call('GET', `/reports/${id}`, undefined, 'rex');
    assert.equal(detail.json.report.expenses[0].receipt.dataUrl, dataUrl);
  });

  it('rejects malformed or oversized receipt attachments', async () => {
    const { json: createdJson } = await call('POST', '/reports', { title: 'Bad receipts' }, 'rex');
    const id = createdJson.report.id;
    const base = { date: today, category: 'meals', merchant: 'Deli', amountCents: 1_000 };

    const notDataUrl = await call('POST', `/reports/${id}/expenses`,
      { ...base, receipt: { name: 'x', dataUrl: 'https://example.com/receipt.png' } }, 'rex');
    assert.equal(notDataUrl.status, 400);

    const wrongMime = await call('POST', `/reports/${id}/expenses`,
      { ...base, receipt: { name: 'x', dataUrl: 'data:text/html;base64,PGI+' } }, 'rex');
    assert.equal(wrongMime.status, 400);

    // Correct prefix but HTML metacharacters after it — the anchored regex
    // must reject anything beyond the base64 alphabet (stored-XSS guard).
    const breakout = await call('POST', `/reports/${id}/expenses`,
      { ...base, receipt: { name: 'x', dataUrl: 'data:image/png;base64,x"><img src=x onerror=alert(1)>' } }, 'rex');
    assert.equal(breakout.status, 400);

    const oversized = await call('POST', `/reports/${id}/expenses`,
      { ...base, receipt: { name: 'x', dataUrl: 'data:image/png;base64,' + 'A'.repeat(700_001) } }, 'rex');
    assert.equal(oversized.status, 400);
  });

  it('runs the reimbursement queue: approve, list, pay out', async () => {
    const { json: createdJson } = await call('POST', '/reports', { title: 'Payable', approverId: 'fin' }, 'pat');
    const id = createdJson.report.id;
    await call('POST', `/reports/${id}/expenses`,
      { date: today, category: 'meals', merchant: 'Cafe', amountCents: 3_000 }, 'pat');
    await call('POST', `/reports/${id}/submit`, undefined, 'pat');
    await call('POST', `/reports/${id}/approve`, undefined, 'fin');

    const queue = await call('GET', '/reimbursements', undefined, 'fin');
    assert.deepEqual(queue.json.reports.map((r: any) => r.report.id), [id]);

    await call('POST', `/reports/${id}/reimburse`, undefined, 'fin');
    const drained = await call('GET', '/reimbursements', undefined, 'fin');
    assert.deepEqual(drained.json.reports, []);
  });

  it('keeps the stored attachment when a list-shaped receipt is round-tripped through update', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
    const { json: createdJson } = await call('POST', '/reports', { title: 'Round trip' }, 'rex');
    const id = createdJson.report.id;
    await call('POST', `/reports/${id}/expenses`,
      { date: today, category: 'meals', merchant: 'Deli', amountCents: 2_600, receipt: { name: 'deli.png', dataUrl } }, 'rex');

    // Fetch via the list (attachment bytes replaced with hasData), edit a
    // field, and PUT the expense straight back — the attachment must survive.
    const list = await call('GET', '/reports', undefined, 'rex');
    const listed = list.json.reports.find((r: any) => r.report.id === id).report.expenses[0];
    const updated = await call('PUT', `/reports/${id}/expenses/${listed.id}`,
      { ...listed, amountCents: 2_700 }, 'rex');
    assert.equal(updated.status, 200);

    const detail = await call('GET', `/reports/${id}`, undefined, 'rex');
    assert.equal(detail.json.report.expenses[0].amountCents, 2_700);
    assert.equal(detail.json.report.expenses[0].receipt.dataUrl, dataUrl);
  });

  it('normalizes legacy string receipts persisted before attachments existed', async () => {
    const legacy: ExpenseReport = {
      id: 'legacy-1',
      ownerId: 'old-timer',
      approverId: 'manager',
      title: 'Pre-upgrade trip',
      status: 'approved',
      expenses: [{
        id: 'legacy-e1', date: today, category: 'meals', merchant: 'Old Cafe',
        description: '', amountCents: 2_600,
        receipt: 'lunch.jpg' as never,
      }],
      createdAt: new Date().toISOString(),
      history: [],
    };
    store.put(legacy);

    const detail = await call('GET', '/reports/legacy-1', undefined, 'old-timer');
    assert.deepEqual(detail.json.report.expenses[0].receipt, { name: 'lunch.jpg' });
    assert.deepEqual(detail.json.evaluation.violations, []);

    const csv = await fetch(base + '/export.csv', { headers: { 'x-user-id': 'old-timer' } });
    assert.match(await csv.text(), /Old Cafe,,26\.00,personal,lunch\.jpg/);
  });

  it('runs the card feed: import, auto-match, one-click expense, dismiss, restore', async () => {
    const imported = await call('POST', '/card-transactions/import', {
      transactions: [
        { date: today, merchant: 'Delta', amountCents: 41_800, last4: '4242' },
        { date: today, merchant: 'Hertz', amountCents: 9_900, last4: '4242' },
        { date: today, merchant: 'Spotify', amountCents: 1_099, last4: '4242' },
      ],
    }, 'card-user');
    assert.equal(imported.status, 201);
    assert.equal(imported.json.imported.length, 3);

    // Re-import of the same feed is a no-op.
    const again = await call('POST', '/card-transactions/import', {
      transactions: [{ date: today, merchant: 'delta ', amountCents: 41_800, last4: '4242' }],
    }, 'card-user');
    assert.equal(again.json.imported.length, 0);
    assert.equal(again.json.duplicateCount, 1);

    // Entering an expense with the same amount auto-matches the charge.
    const { json: createdJson } = await call('POST', '/reports', { title: 'Card trip' }, 'card-user');
    const reportId = createdJson.report.id;
    const added = await call('POST', `/reports/${reportId}/expenses`,
      { date: today, category: 'airfare', merchant: 'Delta Air Lines', amountCents: 41_800, receipt: { name: 't.pdf' } }, 'card-user');
    const airfare = added.json.report.expenses[0];
    assert.equal(airfare.paymentMethod, 'card');
    assert.ok(airfare.cardTransactionId);
    // Card charges are not reimbursable to the filer.
    assert.equal(added.json.evaluation.totalCents, 41_800);
    assert.equal(added.json.evaluation.reimbursableCents, 0);

    // One-click expense straight from a charge.
    const unmatched = await call('GET', '/card-transactions?status=unmatched', undefined, 'card-user');
    const hertz = unmatched.json.transactions.find((t: any) => t.merchant === 'Hertz');
    const fromTxn = await call('POST', `/card-transactions/${hertz.id}/expense`,
      { reportId, category: 'ground_transport' }, 'card-user');
    assert.equal(fromTxn.status, 201);
    const rental = fromTxn.json.report.expenses.find((e: any) => e.merchant === 'Hertz');
    assert.equal(rental.amountCents, 9_900);
    assert.equal(rental.paymentMethod, 'card');

    // Personal spend gets dismissed — and can be restored.
    const spotify = unmatched.json.transactions.find((t: any) => t.merchant === 'Spotify');
    await call('POST', `/card-transactions/${spotify.id}/dismiss`, undefined, 'card-user');
    const afterDismiss = await call('GET', '/card-transactions?status=unmatched', undefined, 'card-user');
    assert.equal(afterDismiss.json.transactions.length, 0);
    await call('POST', `/card-transactions/${spotify.id}/restore`, undefined, 'card-user');

    // Deleting the expense returns its charge to the feed.
    await call('DELETE', `/reports/${reportId}/expenses/${rental.id}`, undefined, 'card-user');
    const restored = await call('GET', '/card-transactions?status=unmatched', undefined, 'card-user');
    assert.deepEqual(restored.json.transactions.map((t: any) => t.merchant).sort(), ['Hertz', 'Spotify']);

    // Amount edits re-run matching: changing the airfare amount unlinks it.
    const edited = await call('PUT', `/reports/${reportId}/expenses/${airfare.id}`,
      { date: today, category: 'airfare', merchant: 'Delta Air Lines', amountCents: 40_000, receipt: { name: 't.pdf' } }, 'card-user');
    const editedAirfare = edited.json.report.expenses.find((e: any) => e.id === airfare.id);
    assert.equal(editedAirfare.cardTransactionId, undefined);
    assert.equal(edited.json.evaluation.reimbursableCents, 40_000);

    // Analytics see the feed and the card/out-of-pocket split.
    const analytics = await call('GET', '/analytics', undefined, 'card-user');
    assert.equal(analytics.json.unmatchedTransactionCount, 3);
    assert.equal(analytics.json.reimbursableCents, 40_000);
    assert.equal(analytics.json.cardCents, 0);

    // Strangers cannot touch another user's feed.
    const stranger = await call('POST', `/card-transactions/${spotify.id}/dismiss`, undefined, 'mallory');
    assert.equal(stranger.status, 403);
  });

  it('validates card feed imports atomically — a bad row rejects the whole batch', async () => {
    const empty = await call('POST', '/card-transactions/import', { transactions: [] }, 'atomic-user');
    assert.equal(empty.status, 400);
    const midBatchBad = await call('POST', '/card-transactions/import', {
      transactions: [
        { date: today, merchant: 'Good Charge', amountCents: 100, last4: '1111' },
        { date: today, merchant: 'X', amountCents: 100, last4: 'abcd' },
      ],
    }, 'atomic-user');
    assert.equal(midBatchBad.status, 400);
    const feed = await call('GET', '/card-transactions', undefined, 'atomic-user');
    assert.deepEqual(feed.json.transactions, []);
    const badStatus = await fetch(base + '/card-transactions?status=nope', { headers: { 'x-user-id': 'card-user' } });
    assert.equal(badStatus.status, 400);
  });

  it('honors an explicit payment method: personal never matches, card is never reimbursed', async () => {
    await call('POST', '/card-transactions/import', {
      transactions: [{ date: today, merchant: 'Cafe Charge', amountCents: 1_000, last4: '9999' }],
    }, 'optout-user');
    const { json: createdJson } = await call('POST', '/reports', { title: 'Opt out' }, 'optout-user');
    const id = createdJson.report.id;

    // Same amount as the charge, but explicitly out of pocket: no match.
    const personal = await call('POST', `/reports/${id}/expenses`,
      { date: today, category: 'meals', merchant: 'Cash Cafe', amountCents: 1_000, paymentMethod: 'personal' }, 'optout-user');
    const cash = personal.json.report.expenses[0];
    assert.equal(cash.paymentMethod, 'personal');
    assert.equal(cash.cardTransactionId, undefined);
    assert.equal(personal.json.evaluation.reimbursableCents, 1_000);
    const feed = await call('GET', '/card-transactions?status=unmatched', undefined, 'optout-user');
    assert.equal(feed.json.transactions.length, 1);

    // Declared card spend with no feed charge yet: excluded from reimbursement.
    const declared = await call('POST', `/reports/${id}/expenses`,
      { date: today, category: 'software', merchant: 'SaaS Co', amountCents: 2_400, paymentMethod: 'card' }, 'optout-user');
    assert.equal(declared.json.evaluation.reimbursableCents, 1_000);
  });

  it('drops a round-tripped card flag on edit instead of stranding a phantom card expense', async () => {
    await call('POST', '/card-transactions/import', {
      transactions: [{ date: today, merchant: 'Hotel Charge', amountCents: 20_000, last4: '9999' }],
    }, 'phantom-user');
    const { json: createdJson } = await call('POST', '/reports', { title: 'Phantom' }, 'phantom-user');
    const id = createdJson.report.id;
    const added = await call('POST', `/reports/${id}/expenses`,
      { date: today, category: 'lodging', merchant: 'Hotel', amountCents: 20_000, receipt: { name: 'h.pdf' } }, 'phantom-user');
    const linked = added.json.report.expenses[0];
    assert.equal(linked.paymentMethod, 'card');

    // Round-trip the serialized expense (carrying paymentMethod: 'card') with
    // a new amount: the link breaks, and the stale flag must not survive.
    const edited = await call('PUT', `/reports/${id}/expenses/${linked.id}`,
      { ...linked, amountCents: 19_000 }, 'phantom-user');
    const expense = edited.json.report.expenses[0];
    assert.equal(expense.cardTransactionId, undefined);
    assert.notEqual(expense.paymentMethod, 'card');
    assert.equal(edited.json.evaluation.reimbursableCents, 19_000);
    // The charge is back in the feed and the unlink is on the audit trail.
    const feed = await call('GET', '/card-transactions?status=unmatched', undefined, 'phantom-user');
    assert.equal(feed.json.transactions.length, 1);
    assert.ok(edited.json.report.history.some((h: any) => h.action === 'card-unlinked'));
  });

  it('runs the budgeting component: set limits, track spend, roll over, flag overspend', async () => {
    const thisMonth = today.slice(0, 7);
    const lastMonth = (() => {
      const [y, m] = thisMonth.split('-').map(Number);
      return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    })();
    const dayIn = (month: string) => `${month}-15`;

    const set = await call('PUT', '/budgets/meals', { amountCents: 50_000 }, 'bud');
    assert.equal(set.status, 200);
    assert.equal(set.json.budget.amountCents, 50_000);
    assert.equal(set.json.budget.rollover, false);
    assert.equal(set.json.budget.category, 'meals');

    // Setting the same category again updates rather than duplicating.
    await call('PUT', '/budgets/meals', { amountCents: 60_000, startMonth: lastMonth }, 'bud');
    await call('PUT', '/budgets/lodging', { amountCents: 100_000, startMonth: lastMonth }, 'bud');
    const listed = await call('GET', '/budgets', undefined, 'bud');
    assert.deepEqual(listed.json.budgets.map((b: any) => b.category), ['lodging', 'meals']);
    assert.equal(listed.json.budgets.find((b: any) => b.category === 'meals').amountCents, 60_000);

    // Spend: meals over the limit this month, lodging under, plus an unbudgeted category.
    const { json: repJson } = await call('POST', '/reports', { title: 'Budget run' }, 'bud');
    const rid = repJson.report.id;
    const add = (date: string, category: string, amountCents: number) =>
      call('POST', `/reports/${rid}/expenses`,
        { date, category, merchant: `${category} vendor`, amountCents, receipt: { name: 'r.pdf' } }, 'bud');
    await add(dayIn(thisMonth), 'meals', 65_000);
    await add(dayIn(thisMonth), 'lodging', 30_000);
    await add(dayIn(thisMonth), 'software', 12_000);

    const summary = await call('GET', `/budgets/summary?month=${thisMonth}`, undefined, 'bud');
    assert.equal(summary.status, 200);
    const meals = summary.json.budgets.find((b: any) => b.category === 'meals');
    assert.equal(meals.spentCents, 65_000);
    assert.equal(meals.availableCents, 60_000);
    assert.equal(meals.remainingCents, -5_000);
    assert.equal(meals.status, 'over');
    const lodging = summary.json.budgets.find((b: any) => b.category === 'lodging');
    assert.equal(lodging.remainingCents, 70_000);
    assert.equal(lodging.status, 'under');
    assert.equal(summary.json.overCount, 1);
    assert.equal(summary.json.totalAvailableCents, 160_000);
    assert.equal(summary.json.totalSpentCents, 95_000);
    assert.equal(summary.json.unbudgetedCents, 12_000, 'software has no budget');

    // Turning rollover on must not invent carry from months that were never
    // rolling over — the balance starts accumulating from the change.
    await add(dayIn(lastMonth), 'lodging', 20_000);
    await call('PUT', '/budgets/lodging', { amountCents: 100_000, rollover: true }, 'bud');
    const justEnabled = await call('GET', `/budgets/summary?month=${thisMonth}`, undefined, 'bud');
    assert.equal(
      justEnabled.json.budgets.find((b: any) => b.category === 'lodging').rolloverCents,
      0,
      'no retroactive carry from before rollover was enabled',
    );

    // Re-basing the budget to last month makes it roll over from there:
    // $1,000 limit less $200 spent leaves $800 to carry into this month.
    await call('PUT', '/budgets/lodging',
      { amountCents: 100_000, rollover: true, startMonth: lastMonth }, 'bud');
    const rolled = await call('GET', `/budgets/summary?month=${thisMonth}`, undefined, 'bud');
    const rolledLodging = rolled.json.budgets.find((b: any) => b.category === 'lodging');
    assert.equal(rolledLodging.rolloverCents, 80_000, 'last month left 80k unspent');
    assert.equal(rolledLodging.availableCents, 180_000);

    // Raising a rolling budget's limit keeps the balance already built up
    // instead of replaying old months at the new, higher limit.
    const raised = await call('PUT', '/budgets/lodging', { amountCents: 150_000 }, 'bud');
    assert.equal(raised.json.budget.carryFromMonth, thisMonth);
    assert.equal(raised.json.budget.carryFromCents, 80_000);
    const afterRaise = await call('GET', `/budgets/summary?month=${thisMonth}`, undefined, 'bud');
    const raisedLodging = afterRaise.json.budgets.find((b: any) => b.category === 'lodging');
    assert.equal(raisedLodging.rolloverCents, 80_000);
    assert.equal(raisedLodging.availableCents, 230_000);
    // Put it back so the totals below stay predictable.
    await call('PUT', '/budgets/lodging',
      { amountCents: 100_000, rollover: true, startMonth: lastMonth }, 'bud');

    // Rejected reports do not count against a budget.
    const { json: rejJson } = await call('POST', '/reports', { title: 'Rejected spend', approverId: 'bud-mgr' }, 'bud');
    const rejId = rejJson.report.id;
    await call('POST', `/reports/${rejId}/expenses`,
      { date: dayIn(thisMonth), category: 'meals', merchant: 'X', amountCents: 40_000, receipt: { name: 'r.pdf' } }, 'bud');
    await call('POST', `/reports/${rejId}/submit`, undefined, 'bud');
    await call('POST', `/reports/${rejId}/reject`, { reason: 'not approved' }, 'bud-mgr');
    const afterReject = await call('GET', `/budgets/summary?month=${thisMonth}`, undefined, 'bud');
    assert.equal(afterReject.json.budgets.find((b: any) => b.category === 'meals').spentCents, 65_000);

    const removed = await call('DELETE', '/budgets/lodging', undefined, 'bud');
    assert.equal(removed.status, 200);
    const afterDelete = await call('GET', '/budgets', undefined, 'bud');
    assert.deepEqual(afterDelete.json.budgets.map((b: any) => b.category), ['meals']);
  });

  it('keeps budgets per user and validates their input', async () => {
    await call('PUT', '/budgets/meals', { amountCents: 10_000 }, 'bud-a');
    const otherUser = await call('GET', '/budgets', undefined, 'bud-b');
    assert.deepEqual(otherUser.json.budgets, []);
    const strangerDelete = await call('DELETE', '/budgets/meals', undefined, 'bud-b');
    assert.equal(strangerDelete.status, 404);

    const badCategory = await call('PUT', '/budgets/yachts', { amountCents: 10_000 }, 'bud-a');
    assert.equal(badCategory.status, 400);
    const badAmount = await call('PUT', '/budgets/meals', { amountCents: 0 }, 'bud-a');
    assert.equal(badAmount.status, 400);
    const fractional = await call('PUT', '/budgets/meals', { amountCents: 10.5 }, 'bud-a');
    assert.equal(fractional.status, 400);
    const badRollover = await call('PUT', '/budgets/meals', { amountCents: 100, rollover: 'yes' }, 'bud-a');
    assert.equal(badRollover.status, 400);
    const badStart = await call('PUT', '/budgets/meals', { amountCents: 100, startMonth: '2026-13' }, 'bud-a');
    assert.equal(badStart.status, 400);
    const badMonth = await call('GET', '/budgets/summary?month=nope', undefined, 'bud-a');
    assert.equal(badMonth.status, 400);

    // "summary" must route to the summary, never be read as a category.
    const summary = await call('GET', '/budgets/summary', undefined, 'bud-a');
    assert.equal(summary.status, 200);
    assert.ok(Array.isArray(summary.json.budgets));
  });

  it('exports expenses as CSV for the filer and the approver, neutralizing formula injection', async () => {
    const { json: createdJson } = await call('POST', '/reports', { title: 'CSV run', approverId: 'csv-fin' }, 'csv-user');
    const id = createdJson.report.id;
    await call('POST', `/reports/${id}/expenses`,
      { date: today, category: 'meals', merchant: '=HYPERLINK("http://evil")', amountCents: 3_000 }, 'csv-user');
    await call('POST', `/reports/${id}/submit`, undefined, 'csv-user');
    await call('POST', `/reports/${id}/approve`, undefined, 'csv-fin');

    const mine = await fetch(base + '/export.csv', { headers: { 'x-user-id': 'csv-user' } });
    assert.equal(mine.status, 200);
    assert.match(mine.headers.get('content-type') ?? '', /text\/csv/);
    const text = await mine.text();
    assert.match(text, /^report,owner,status,date,category,merchant,description,amount_usd,payment,receipt\n/);
    assert.match(text, /CSV run,csv-user,approved,.*,meals,"'=HYPERLINK\(""http:\/\/evil""\)",,30\.00,personal,/);

    const queue = await fetch(base + '/export.csv?scope=approvals', { headers: { 'x-user-id': 'csv-fin' } });
    assert.match(await queue.text(), /CSV run,csv-user,approved/);
  });
});
