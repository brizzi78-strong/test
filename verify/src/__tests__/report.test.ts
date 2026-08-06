import { test } from 'node:test';
import assert from 'node:assert/strict';

import { VerifyService } from '../service/verifyService.ts';
import { CertificateService } from '../service/certificate.ts';
import { ReportService } from '../service/report.ts';
import { NotFoundError } from '../service/errors.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import type { Notifier } from '../notify/notifier.ts';

const silent: Notifier = { kind: 'silent', async send() {} };

function makeHarness() {
  let seq = 0;
  const store: Store = createInMemoryStore();
  const svc = new VerifyService({
    store,
    now: () => new Date('2026-07-29T12:00:00.000Z'),
    newId: (p) => `${p}_${++seq}`,
    notifier: silent,
    baseUrl: 'https://verify.example.com',
  });
  const cert = new CertificateService({ store, secret: 'test-secret', baseUrl: 'https://verify.example.com' });
  const report = new ReportService({ store, cert });
  return { store, svc, cert, report };
}

async function seedCompleted(svc: VerifyService, itemCount = 2) {
  const company = svc.createCompany({ name: 'Blue Ridge Press LLC' });
  const candidate = svc.createCandidate({
    companyId: company.id,
    firstName: 'Jordan',
    lastName: 'Rivera',
    email: 'jordan@example.com',
  });
  const items = Array.from({ length: itemCount }, (_, i) => ({
    type: 'reference' as const,
    subject: `Reference ${i + 1}`,
    detail: 'Former manager',
    contactEmail: `ref${i + 1}@example.com`,
  }));
  const request = await svc.createRequest({ companyId: company.id, candidateId: candidate.id, items });
  await svc.recordConsent(request.consentToken, { signedName: 'Jordan Rivera' });
  for (const item of request.items)
    svc.submitVerification(item.token, {
      verifierName: 'Pat Lee',
      confirmed: true,
      answers: { relationship: 'Manager for 3 years', rehire: 'yes' },
    });
  return svc.getRequest(request.id);
}

/** Every xref offset must point exactly at its `N 0 obj` header. */
function assertXrefValid(pdf: Buffer): void {
  const raw = pdf.toString('latin1');
  const startxref = Number(raw.match(/startxref\n(\d+)\n%%EOF/)?.[1]);
  assert.ok(Number.isInteger(startxref), 'startxref present');
  assert.match(raw.slice(startxref, startxref + 4), /^xref/);
  const table = raw.slice(startxref);
  const entries = [...table.matchAll(/^(\d{10}) 00000 n /gm)].map((m) => Number(m[1]));
  assert.ok(entries.length > 0, 'xref has in-use entries');
  entries.forEach((offset, i) => {
    const head = raw.slice(offset, offset + 12);
    assert.match(head, new RegExp(`^${i + 1} 0 obj`), `object ${i + 1} at its offset`);
  });
}

test('renders a structurally valid PDF with the report content', async () => {
  const { svc, cert, report } = makeHarness();
  const request = await seedCompleted(svc);
  const pdf = report.pdf(request.id);
  const raw = pdf.toString('latin1');

  assert.match(raw, /^%PDF-1\.4\n/);
  assert.match(raw, /%%EOF\n$/);
  assertXrefValid(pdf);

  const ref = cert.reference(request.id);
  assert.ok(raw.includes('Verification Report'), 'title');
  assert.ok(raw.includes(ref.trackingNumber), 'tracking number');
  assert.ok(raw.includes(ref.verificationCode), 'verification code');
  assert.ok(raw.includes('Jordan Rivera'), 'candidate + consent signer');
  assert.ok(raw.includes('ALL SOURCES CONFIRMED'), 'result');
  assert.ok(raw.includes('CONSENT RECORD'), 'consent section');
});

test('the printed integrity seal matches the certificate seal', async () => {
  const { store, svc, cert, report } = makeHarness();
  const request = await seedCompleted(svc);
  const raw = report.pdf(request.id).toString('latin1');
  const hash = cert.integrity(
    store.requests.get(request.id)!,
    store.candidates.get(request.candidateId),
    store.companies.get(request.companyId),
  );
  // The hash is printed split across two mono lines of 32 chars each.
  assert.ok(raw.includes(hash.slice(0, 32)), 'first half printed');
  assert.ok(raw.includes(hash.slice(32)), 'second half printed');
});

test('an in-progress request still renders, marked incomplete', async () => {
  const { svc, report } = makeHarness();
  const company = svc.createCompany({ name: 'Blue Ridge Press LLC' });
  const candidate = svc.createCandidate({
    companyId: company.id, firstName: 'Sam', lastName: 'Poe', email: 's@example.com',
  });
  const request = await svc.createRequest({
    companyId: company.id,
    candidateId: candidate.id,
    items: [{ type: 'employment', subject: 'Acme Co', contactEmail: 'hr@acme.example' }],
  });
  const raw = report.pdf(request.id).toString('latin1');
  assert.ok(raw.includes('NOT YET COMPLETE'));
  assert.ok(raw.includes('Authorization not yet recorded'));
  assert.ok(raw.includes('Awaiting response from the source.'));
});

test('many findings paginate onto continuation pages, footer on each', async () => {
  const { svc, report } = makeHarness();
  const request = await seedCompleted(svc, 14);
  const raw = report.pdf(request.id).toString('latin1');
  const count = Number(raw.match(/\/Count (\d+)/)?.[1]);
  assert.ok(count >= 2, `expected multiple pages, got ${count}`);
  const footers = raw.match(/page \d+ of \d+/g) ?? [];
  assert.equal(footers.length, count, 'every page carries the footer');
  assertXrefValid(report.pdf(request.id));
});

test('unknown request throws NotFound', () => {
  const { report } = makeHarness();
  assert.throws(() => report.pdf('nope'), NotFoundError);
});
