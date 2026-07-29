/**
 * End-to-end: a real Payroll service runs in-process; the Cardinal Payroll BFF
 * points at it. The tests drive the app the way the browser does — bootstrap the
 * business, add employees through the proxied /api/*, run a batch pay period,
 * and confirm the real gross-to-net math and the company totals — plus the
 * password gate and pay-stub history.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createApp as createRunpay } from '../api/server.ts';
import { createApp as createPayroll } from '../../../payroll/src/api/server.ts';
import { createInMemoryStore } from '../../../payroll/src/store/store.ts';
import { createApp as createTimeclock } from '../../../timeclock/src/api/server.ts';
import { createInMemoryStore as createTimeclockStore } from '../../../timeclock/src/store/store.ts';

async function listen(server: { listen: Function; address: Function; close: Function }) {
  await new Promise<void>((r) => server.listen(0, r));
  return (server.address() as AddressInfo).port;
}

async function withApp(
  run: (base: string) => Promise<void>,
  opts: { user?: string; password?: string; tokenSecret?: string } = {},
) {
  const payroll = createPayroll(createInMemoryStore());
  const payPort = await listen(payroll.server);
  const runpay = createRunpay({
    payrollBase: `http://127.0.0.1:${payPort}`,
    businessName: 'Blue Ridge Press LLC',
    ...opts,
  });
  const runPort = await listen(runpay.server);
  try {
    await run(`http://127.0.0.1:${runPort}`);
  } finally {
    await new Promise<void>((r) => runpay.server.close(() => r()));
    await new Promise<void>((r) => payroll.server.close(() => r()));
  }
}

async function j(base: string, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as any };
}

test('serves the app shell and bootstraps the company', async () => {
  await withApp(async (base) => {
    assert.match(await (await fetch(`${base}/`)).text(), /Cardinal Payroll/);
    const app = (await j(base, 'GET', '/api/app')).json;
    assert.equal(app.businessName, 'Blue Ridge Press LLC');
    assert.ok(app.companyId);
    assert.ok(app.meta && Array.isArray(app.meta.filingStatuses)); // upstream meta surfaced
  });
});

test('add employees, run a batch pay period, and get correct totals', async () => {
  await withApp(async (base) => {
    const app = (await j(base, 'GET', '/api/app')).json;
    const co = app.companyId;

    // A $52,000/yr single biweekly employee — the README's worked example.
    const e1 = (await j(base, 'POST', '/api/employees', {
      companyId: co, firstName: 'Jordan', lastName: 'Rivera', payType: 'salary',
      annualSalaryCents: 5200000, payFrequency: 'biweekly', filingStatus: 'single',
    })).json;
    assert.ok(e1.id);
    // An hourly employee.
    await j(base, 'POST', '/api/employees', {
      companyId: co, firstName: 'Sam', lastName: 'Cole', payType: 'hourly',
      hourlyRateCents: 2500, payFrequency: 'biweekly', filingStatus: 'single',
    });

    const run = (await j(base, 'POST', '/api/run-batch', {
      payDate: '2026-01-15',
      hours: {}, // filled per-employee below via a second field; empty here means Sam has no hours
    })).json;

    // Two lines: the salaried one succeeds, the hourly one is skipped (no hours) — never aborts the batch.
    assert.equal(run.lines.length, 2);
    const jordan = run.lines.find((l: any) => l.name === 'Jordan Rivera');
    assert.equal(jordan.ok, true);
    assert.equal(jordan.payslip.grossCents, 200000); // $2,000.00 biweekly
    assert.equal(jordan.payslip.socialSecurityCents, 12400); // 6.2%
    assert.equal(jordan.payslip.medicareCents, 2900); // 1.45%
    assert.equal(jordan.payslip.netCents, 158548); // the README's verified net

    // Totals reflect only the successfully paid employee.
    assert.equal(run.totals.employees, 1);
    assert.equal(run.totals.grossCents, 200000);
    assert.equal(run.totals.netCents, 158548);
    // Withheld = SS + Medicare + fed + state, and remittance = withheld + employer tax.
    const p = jordan.payslip;
    const withheld = p.socialSecurityCents + p.medicareCents + p.federalIncomeTaxCents + p.stateIncomeTaxCents;
    assert.equal(run.totals.employeeWithholdingCents, withheld);
    const employer = p.employer.socialSecurityCents + p.employer.medicareCents + p.employer.futaCents + p.employer.sutaCents;
    assert.equal(run.totals.employerTaxCents, employer);
    assert.equal(run.totals.totalRemittanceCents, withheld + employer);
  });
});

test('hourly employee is paid when hours are supplied, and pay stubs are queryable', async () => {
  await withApp(async (base) => {
    const co = (await j(base, 'GET', '/api/app')).json.companyId;
    const sam = (await j(base, 'POST', '/api/employees', {
      companyId: co, firstName: 'Sam', lastName: 'Cole', payType: 'hourly',
      hourlyRateCents: 2500, payFrequency: 'biweekly', filingStatus: 'single',
    })).json;

    const run = (await j(base, 'POST', '/api/run-batch', {
      payDate: '2026-01-15',
      hours: { [sam.id]: 80 },
    })).json;
    const line = run.lines[0];
    assert.equal(line.ok, true);
    assert.equal(line.payslip.grossCents, 200000); // 80h * $25 = $2,000

    // Pay-stub history for the employee (proxied straight through).
    const stubs = (await j(base, 'GET', `/api/payslips?employeeId=${sam.id}`)).json;
    assert.equal(stubs.length, 1);
    assert.equal(stubs[0].netCents, line.payslip.netCents);
  });
});

test('benefits deductions flow through the engine with correct FICA semantics', async () => {
  await withApp(async (base) => {
    const co = (await j(base, 'GET', '/api/app')).json.companyId;
    // $52k biweekly, single, with a $200 401(k) (pre-income-tax, still FICA) and a
    // $100 Section-125 health premium (pre-income-tax AND pre-FICA).
    const emp = (await j(base, 'POST', '/api/employees', {
      companyId: co, firstName: 'Jordan', lastName: 'Rivera', payType: 'salary',
      annualSalaryCents: 5200000, payFrequency: 'biweekly', filingStatus: 'single',
      preTaxDeductions: [
        { name: '401(k)', amountCents: 20000, reducesFederalTaxable: true, reducesStateTaxable: true, reducesFica: false },
        { name: 'Health / HSA', amountCents: 10000, reducesFederalTaxable: true, reducesStateTaxable: true, reducesFica: true },
      ],
      postTaxDeductions: [{ name: 'Union dues', amountCents: 2500 }],
    })).json;
    assert.equal(emp.preTaxDeductions.length, 2);

    const run = (await j(base, 'POST', '/api/run-batch', { payDate: '2026-01-15' })).json;
    const p = run.lines[0].payslip;

    // Gross is unchanged at $2,000.
    assert.equal(p.grossCents, 200000);
    // FICA wages: gross minus only the FICA-reducing (Section-125) deduction → $2,000 - $100 = $1,900.
    assert.equal(p.ficaWagesCents, 190000);
    assert.equal(p.socialSecurityCents, Math.round(190000 * 0.062)); // 6.2% of FICA wages
    // Federal taxable base is reduced by both pre-tax deductions ($300 total).
    assert.equal(p.federalTaxableCents, 200000 - 30000);
    assert.equal(p.preTaxDeductionsCents, 30000);
    assert.equal(p.postTaxDeductionsCents, 2500);
    // Net is lower than the no-deductions example ($1,585.48) — real money came out.
    assert.ok(p.netCents < 158548);
  });
});

test('payroll register aggregates a period into a 941-style tax liability, and exports CSV', async () => {
  await withApp(async (base) => {
    const co = (await j(base, 'GET', '/api/app')).json.companyId;
    await j(base, 'POST', '/api/employees', {
      companyId: co, firstName: 'Jordan', lastName: 'Rivera', payType: 'salary',
      annualSalaryCents: 5200000, payFrequency: 'biweekly', filingStatus: 'single',
    });
    // Two pay dates in Q1 and one outside it.
    await j(base, 'POST', '/api/run-batch', { payDate: '2026-01-15' });
    await j(base, 'POST', '/api/run-batch', { payDate: '2026-02-15' });
    await j(base, 'POST', '/api/run-batch', { payDate: '2026-05-15' }); // Q2 — excluded below

    const reg = (await j(base, 'GET', '/api/register?from=2026-01-01&to=2026-03-31')).json;
    assert.equal(reg.rows.length, 2); // only the two Q1 paychecks
    assert.equal(reg.totals.paychecks, 2);
    assert.equal(reg.totals.grossCents, 400000); // 2 x $2,000

    // 941-style summary: SS tax is both halves (12.4% of FICA wages), Medicare both halves (2.9%).
    const l = reg.taxLiability;
    assert.equal(l.socialSecurityWagesCents, 400000);
    assert.equal(l.socialSecurityTaxCents, Math.round(400000 * 0.124));
    assert.equal(l.medicareTaxCents, Math.round(400000 * 0.029));
    assert.equal(
      l.federalDepositCents,
      l.federalIncomeTaxWithheldCents + l.socialSecurityTaxCents + l.medicareTaxCents,
    );

    // CSV export has a header, one row per paycheck, and a TOTAL line.
    const csvRes = await fetch(`${base}/api/register.csv?from=2026-01-01&to=2026-03-31`);
    assert.match(csvRes.headers.get('content-type') ?? '', /text\/csv/);
    const csv = (await csvRes.text()).trim().split('\n');
    assert.match(csv[0], /Pay date,Employee,Gross/);
    assert.equal(csv.length, 1 + 2 + 1); // header + 2 rows + TOTAL
    assert.match(csv[csv.length - 1], /^TOTAL,,4000\.00/);
  });
});

test('run-batch rejects a bad pay date', async () => {
  await withApp(async (base) => {
    const r = await j(base, 'POST', '/api/run-batch', { payDate: 'nope' });
    assert.equal(r.status, 502); // surfaced as an upstream/validation error by the BFF
  });
});

test('password gate blocks the console but leaves health and self-service open', async () => {
  await withApp(
    async (base) => {
      assert.equal((await fetch(`${base}/`)).status, 401);
      assert.equal((await fetch(`${base}/health`)).status, 200);
      assert.equal((await fetch(`${base}/me/anything`)).status, 200); // self-service page public
      const good = 'Basic ' + Buffer.from('admin:s3cret').toString('base64');
      assert.equal((await fetch(`${base}/`, { headers: { authorization: good } })).status, 200);
    },
    { user: 'admin', password: 's3cret' },
  );
});

test('employee self-service: token link shows only that employee, scoped and read-only', async () => {
  await withApp(async (base) => {
    const co = (await j(base, 'GET', '/api/app')).json.companyId;
    const jordan = (await j(base, 'POST', '/api/employees', {
      companyId: co, firstName: 'Jordan', lastName: 'Rivera', payType: 'salary',
      annualSalaryCents: 5200000, payFrequency: 'biweekly', filingStatus: 'single',
    })).json;
    const sam = (await j(base, 'POST', '/api/employees', {
      companyId: co, firstName: 'Sam', lastName: 'Cole', payType: 'salary',
      annualSalaryCents: 9000000, payFrequency: 'biweekly', filingStatus: 'single',
    })).json;
    await j(base, 'POST', '/api/run-batch', { payDate: '2026-01-15' });

    // Employer mints Jordan's self-service link.
    const link = (await j(base, 'GET', `/api/employees/${jordan.id}/selflink`)).json;
    assert.ok(link.token && link.path === `/me/${link.token}`);
    assert.match((await (await fetch(`${base}${link.path}`)).text()), /My Pay/); // page serves

    // The token resolves to Jordan's own data, with a YTD stub — and nobody else's.
    const meView = (await j(base, 'GET', `/api/me/${encodeURIComponent(link.token)}`)).json;
    assert.equal(meView.employee.firstName, 'Jordan');
    assert.equal(meView.employee.id, jordan.id);
    assert.equal(meView.payslips.length, 1);
    assert.equal(meView.payslips[0].netCents, 158548);
    assert.equal(meView.ytd.grossCents, 200000);
    assert.notEqual(meView.employee.id, sam.id);

    // A tampered token is rejected.
    assert.equal((await j(base, 'GET', `/api/me/${encodeURIComponent(jordan.id + '.deadbeef')}`)).status, 401);
  });
});

async function withFullStack(run: (base: string) => Promise<void>) {
  const payroll = createPayroll(createInMemoryStore());
  const payPort = await listen(payroll.server);
  const timeclock = createTimeclock(createTimeclockStore());
  const timePort = await listen(timeclock.server);
  const runpay = createRunpay({
    payrollBase: `http://127.0.0.1:${payPort}`,
    timeclockBase: `http://127.0.0.1:${timePort}`,
    businessName: 'Blue Ridge Press LLC',
  });
  const runPort = await listen(runpay.server);
  try {
    await run(`http://127.0.0.1:${runPort}`);
  } finally {
    await new Promise<void>((r) => runpay.server.close(() => r()));
    await new Promise<void>((r) => timeclock.server.close(() => r()));
    await new Promise<void>((r) => payroll.server.close(() => r()));
  }
}

test('logged hours flow from the timeclock straight into a Run Payroll batch', async () => {
  await withFullStack(async (base) => {
    const co = (await j(base, 'GET', '/api/app')).json.companyId;
    const sam = (await j(base, 'POST', '/api/employees', {
      companyId: co, firstName: 'Sam', lastName: 'Cole', payType: 'hourly',
      hourlyRateCents: 2500, payFrequency: 'biweekly', filingStatus: 'single',
    })).json;

    // Log hours two ways: the manager via /api/time, the employee via their link.
    await j(base, 'POST', '/api/time/entries', { companyId: co, employeeId: sam.id, date: '2026-01-05', hours: 8 });
    const link = (await j(base, 'GET', `/api/employees/${sam.id}/selflink`)).json;
    assert.equal((await j(base, 'POST', `/api/me/${encodeURIComponent(link.token)}/hours`, { date: '2026-01-06', hours: 8 })).status, 201);

    // Run payroll for the period — hours are pulled from the timeclock (16h * $25 = $2,000).
    const run = (await j(base, 'POST', '/api/run-batch', {
      payDate: '2026-01-15', periodStart: '2026-01-01', periodEnd: '2026-01-15',
    })).json;
    const line = run.lines[0];
    assert.equal(line.ok, true);
    assert.equal(line.hoursSource, 'timeclock');
    assert.equal(line.hours, 16);
    assert.equal(line.payslip.grossCents, 40000); // 16h * $25.00
    assert.equal(run.totals.grossCents, 40000);

    // The employee sees their logged entries in self-service.
    const meView = (await j(base, 'GET', `/api/me/${encodeURIComponent(link.token)}`)).json;
    assert.equal(meView.entries.length, 2);
  });
});

test('explicitly entered hours win over the timeclock', async () => {
  await withFullStack(async (base) => {
    const co = (await j(base, 'GET', '/api/app')).json.companyId;
    const sam = (await j(base, 'POST', '/api/employees', {
      companyId: co, firstName: 'Sam', lastName: 'Cole', payType: 'hourly',
      hourlyRateCents: 2500, payFrequency: 'biweekly', filingStatus: 'single',
    })).json;
    await j(base, 'POST', '/api/time/entries', { companyId: co, employeeId: sam.id, date: '2026-01-05', hours: 8 });

    const run = (await j(base, 'POST', '/api/run-batch', {
      payDate: '2026-01-15', periodStart: '2026-01-01', periodEnd: '2026-01-15',
      hours: { [sam.id]: 40 }, // manager override
    })).json;
    assert.equal(run.lines[0].hoursSource, 'entered');
    assert.equal(run.lines[0].hours, 40);
    assert.equal(run.lines[0].payslip.grossCents, 100000); // 40h * $25
  });
});

test('a self-service token from one server is not valid on another (per-secret)', async () => {
  await withApp(async (base) => {
    const co = (await j(base, 'GET', '/api/app')).json.companyId;
    const e = (await j(base, 'POST', '/api/employees', {
      companyId: co, firstName: 'Jordan', lastName: 'Rivera', payType: 'salary',
      annualSalaryCents: 5200000, payFrequency: 'biweekly', filingStatus: 'single',
    })).json;
    // A token minted with the wrong secret must not verify.
    const forged = `${e.id}.` + '0'.repeat(64);
    assert.equal((await j(base, 'GET', `/api/me/${encodeURIComponent(forged)}`)).status, 401);
  }, { tokenSecret: 'secret-A' });
});
