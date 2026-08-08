import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp, type AppServer } from '../api/server.ts';
import { createInMemoryStore } from '../store/store.ts';
import type { Notifier, OutboundEmail } from '../notify/notifier.ts';

class FakeNotifier implements Notifier {
  readonly kind = 'fake';
  sent: OutboundEmail[] = [];
  async send(email: OutboundEmail): Promise<void> {
    this.sent.push(email);
  }
}

/** Fire-and-forget auto-notify only needs microtask/event-loop turns to settle. */
function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

let app: AppServer;
let base: string;

before(async () => {
  app = createApp(createInMemoryStore());
  await new Promise<void>((resolve) => app.server.listen(0, resolve));
  base = `http://localhost:${(app.server.address() as AddressInfo).port}`;
});

after(() => app.server.close());

async function call(
  method: string,
  path: string,
  body?: unknown,
  user = 'demo',
): Promise<{ status: number; json: any }> {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', 'x-user-id': user },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

const goodProfile = {
  state: 'nc',
  degreeLevel: 'high-school-senior',
  fieldOfStudy: 'stem',
  gpa: 3.6,
  householdIncome: 48000,
  householdSize: 4,
  communityService: true,
};

describe('AidFinder API', () => {
  it('serves the web app and health check', async () => {
    const health = await fetch(base + '/health');
    assert.equal(health.status, 200);
    const home = await fetch(base + '/');
    assert.equal(home.status, 200);
    assert.match(await home.text(), /AidFinder/);
  });

  it('exposes the opportunity catalog without a profile', async () => {
    const res = await call('GET', '/opportunities');
    assert.equal(res.status, 200);
    assert.ok(res.json.opportunities.length >= 24);
  });

  it('requires a profile before matching or planning', async () => {
    assert.equal((await call('GET', '/matches')).status, 400);
    assert.equal((await call('GET', '/near-misses')).status, 400);
    assert.equal((await call('GET', '/plan')).status, 400);
    assert.equal((await call('GET', '/plan.ics')).status, 400);
  });

  it('validates the profile', async () => {
    const badState = await call('PUT', '/profile', { ...goodProfile, state: 'North Carolina' });
    assert.equal(badState.status, 400);
    const badGpa = await call('PUT', '/profile', { ...goodProfile, gpa: 5 });
    assert.equal(badGpa.status, 400);
    const badLevel = await call('PUT', '/profile', { ...goodProfile, degreeLevel: 'phd' });
    assert.equal(badLevel.status, 400);
  });

  it('walks profile → matches → plan → tracked application → won', async () => {
    const saved = await call('PUT', '/profile', goodProfile);
    assert.equal(saved.status, 200);
    assert.equal(saved.json.profile.state, 'NC'); // normalized

    const matches = await call('GET', '/matches');
    assert.equal(matches.status, 200);
    assert.ok(matches.json.matches.length >= 8);
    assert.ok(matches.json.totalEstimated > 0);
    const ids = matches.json.matches.map((m: any) => m.opportunity.id);
    assert.ok(ids.includes('pell-grant'));
    assert.ok(ids.includes('next-nc-scholarship')); // NC resident
    assert.ok(!ids.includes('gi-bill')); // no military affiliation

    const plan = await call('GET', '/plan');
    assert.equal(plan.status, 200);
    // Dated deadlines come before rolling ones, in date order.
    const dated = plan.json.plan.filter((p: any) => p.nextDeadline !== null);
    const rollingIdx = plan.json.plan.findIndex((p: any) => p.nextDeadline === null);
    for (let i = 1; i < dated.length; i++) {
      assert.ok(dated[i - 1].nextDeadline <= dated[i].nextDeadline);
    }
    if (rollingIdx !== -1) assert.equal(rollingIdx, dated.length);

    const tracked = await call('POST', '/applications', { opportunityId: 'dell-scholars' });
    assert.equal(tracked.status, 201);
    const appId = tracked.json.id;
    assert.equal(tracked.json.status, 'planned');

    // Tracking the same opportunity twice conflicts.
    assert.equal((await call('POST', '/applications', { opportunityId: 'dell-scholars' })).status, 409);
    // Unknown opportunity is rejected.
    assert.equal((await call('POST', '/applications', { opportunityId: 'nigerian-prince' })).status, 400);

    const planned = await call('GET', '/plan');
    const dellItem = planned.json.plan.find((p: any) => p.opportunity.id === 'dell-scholars');
    assert.equal(dellItem.status, 'planned');
    assert.equal(dellItem.applicationId, appId);

    const submitted = await call('PUT', `/applications/${appId}`, { status: 'submitted' });
    assert.equal(submitted.status, 200);
    let apps = await call('GET', '/applications');
    assert.equal(apps.json.dashboard.submitted, 20000); // dell midpoint

    const won = await call('PUT', `/applications/${appId}`, { status: 'won', amountWon: 20000 });
    assert.equal(won.status, 200);
    apps = await call('GET', '/applications');
    assert.equal(apps.json.dashboard.won, 20000);
    assert.equal(apps.json.dashboard.submitted, 0);

    // Reverting the status clears the winnings.
    await call('PUT', `/applications/${appId}`, { status: 'in-progress' });
    apps = await call('GET', '/applications');
    assert.equal(apps.json.applications[0].amountWon, 0);

    const removed = await call('DELETE', `/applications/${appId}`);
    assert.equal(removed.status, 200);
    assert.equal((await call('GET', '/applications')).json.applications.length, 0);
  });

  it('reports near misses with what would unlock them', async () => {
    await call('PUT', '/profile', goodProfile);
    const res = await call('GET', '/near-misses');
    assert.equal(res.status, 200);
    // GPA 3.6 is 0.1 under Cameron Impact's 3.7 cutoff.
    const cameron = res.json.nearMisses.find((n: any) => n.opportunity.id === 'cameron-impact');
    assert.ok(cameron);
    assert.equal(cameron.blockers[0].code, 'gpa');
    assert.ok(res.json.totalPotential >= cameron.potentialAmount);
  });

  it('exports the plan as an iCalendar file', async () => {
    await call('PUT', '/profile', goodProfile);
    await call('POST', '/applications', { opportunityId: 'coca-cola-scholars' });
    const res = await fetch(base + '/plan.ics', { headers: { 'x-user-id': 'demo' } });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/calendar/);
    const ics = await res.text();
    assert.match(ics, /BEGIN:VCALENDAR/);
    assert.match(ics, /UID:coca-cola-scholars@aidfinder/);
    assert.match(ics, /BEGIN:VALARM/);
    // Rolling-deadline items (e.g. tax credits) have no date and are excluded.
    assert.ok(!ics.includes('UID:aotc@aidfinder'));
  });

  it('keeps a tracked application in the plan after the profile stops matching it', async () => {
    await call('PUT', '/profile', goodProfile, 'u2');
    const tracked = await call('POST', '/applications', { opportunityId: 'next-nc-scholarship' }, 'u2');
    assert.equal(tracked.status, 201);
    // Move out of state: Next NC no longer matches, but the tracked app remains.
    await call('PUT', '/profile', { ...goodProfile, state: 'VA' }, 'u2');
    const matches = await call('GET', '/matches', undefined, 'u2');
    assert.ok(!matches.json.matches.some((m: any) => m.opportunity.id === 'next-nc-scholarship'));
    const plan = await call('GET', '/plan', undefined, 'u2');
    assert.ok(plan.json.plan.some((p: any) => p.opportunity.id === 'next-nc-scholarship'));
  });

  it('scopes data by user', async () => {
    await call('PUT', '/profile', goodProfile, 'alice');
    const tracked = await call('POST', '/applications', { opportunityId: 'pell-grant' }, 'alice');
    assert.equal((await call('GET', `/applications`, undefined, 'bob')).json.applications.length, 0);
    assert.equal(
      (await call('PUT', `/applications/${tracked.json.id}`, { status: 'won' }, 'bob')).status,
      404,
    );
  });

  it('reports required fields on the profile: studentName, studentIsMinor, parentEmails', async () => {
    const res = await call('PUT', '/profile', {
      ...goodProfile,
      studentName: 'Ada',
      studentIsMinor: true,
      parentEmails: ['Mom@Example.com', ' dad@example.com '],
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.profile.studentName, 'Ada');
    assert.equal(res.json.profile.studentIsMinor, true);
    assert.deepEqual(res.json.profile.parentEmails, ['Mom@Example.com', 'dad@example.com']); // trimmed

    const badEmail = await call('PUT', '/profile', { ...goodProfile, parentEmails: ['not-an-email'] });
    assert.equal(badEmail.status, 400);

    const tooMany = await call('PUT', '/profile', {
      ...goodProfile,
      parentEmails: Array.from({ length: 6 }, (_, i) => `p${i}@example.com`),
    });
    assert.equal(tooMany.status, 400);
  });

  it('strips control characters from studentName so it cannot inject an email header', async () => {
    const res = await call('PUT', '/profile', {
      ...goodProfile,
      studentName: 'Ada\r\nBcc: attacker@evil.com',
    });
    assert.equal(res.status, 200);
    assert.ok(!res.json.profile.studentName.includes('\r'));
    assert.ok(!res.json.profile.studentName.includes('\n'));
  });

  it('gates every route except /health behind Basic auth when configured', async () => {
    const gated = createApp(createInMemoryStore(), { user: 'u', password: 'p' });
    await new Promise<void>((resolve) => gated.server.listen(0, resolve));
    const gatedBase = `http://localhost:${(gated.server.address() as AddressInfo).port}`;
    try {
      assert.equal((await fetch(gatedBase + '/health')).status, 200);
      assert.equal((await fetch(gatedBase + '/opportunities')).status, 401);
      const authed = await fetch(gatedBase + '/opportunities', {
        headers: { authorization: 'Basic ' + Buffer.from('u:p').toString('base64') },
      });
      assert.equal(authed.status, 200);
    } finally {
      gated.server.close();
    }
  });
});

describe('Family digest', () => {
  let digestApp: AppServer;
  let digestBase: string;
  let notifier: FakeNotifier;

  before(async () => {
    notifier = new FakeNotifier();
    digestApp = createApp(createInMemoryStore(), { notifier });
    await new Promise<void>((resolve) => digestApp.server.listen(0, resolve));
    digestBase = `http://localhost:${(digestApp.server.address() as AddressInfo).port}`;
  });

  after(() => digestApp.server.close());

  async function digestCall(
    method: string,
    path: string,
    body?: unknown,
    user = 'demo',
  ): Promise<{ status: number; json: any }> {
    const res = await fetch(digestBase + path, {
      method,
      headers: { 'content-type': 'application/json', 'x-user-id': user },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, json: await res.json() };
  }

  it('requires a profile before previewing or sending', async () => {
    assert.equal((await digestCall('GET', '/digest/preview', undefined, 'nopro')).status, 400);
    assert.equal((await digestCall('POST', '/digest/send', undefined, 'nopro')).status, 400);
  });

  it('previews the digest without sending anything', async () => {
    await digestCall('PUT', '/profile', { ...goodProfile, studentName: 'Ada' }, 'preview-user');
    const before = notifier.sent.length;
    const res = await digestCall('GET', '/digest/preview', undefined, 'preview-user');
    assert.equal(res.status, 200);
    assert.match(res.json.subject, /Ada/);
    assert.ok(res.json.text.includes('Matched (estimated/yr)'));
    assert.equal(notifier.sent.length, before); // nothing sent
  });

  it('requires a parent/guardian email before sending', async () => {
    await digestCall('PUT', '/profile', goodProfile, 'noparent');
    const res = await digestCall('POST', '/digest/send', undefined, 'noparent');
    assert.equal(res.status, 400);
    assert.match(res.json.error, /parent/i);
  });

  it('sends one email per parent address on manual send', async () => {
    await digestCall(
      'PUT',
      '/profile',
      { ...goodProfile, studentName: 'Ada', parentEmails: ['mom@example.com', 'dad@example.com'] },
      'send-user',
    );
    const res = await digestCall('POST', '/digest/send', undefined, 'send-user');
    assert.equal(res.status, 200);
    assert.deepEqual(res.json.sent, ['mom@example.com', 'dad@example.com']);
    assert.equal(res.json.kind, 'fake');
    const toThisUser = notifier.sent.filter((e) => res.json.sent.includes(e.to));
    assert.equal(toThisUser.length, 2);
  });

  it('auto-sends when an application is submitted, won, or declined — not on planned/in-progress', async () => {
    await digestCall(
      'PUT',
      '/profile',
      { ...goodProfile, parentEmails: ['auto-parent@example.com'] },
      'auto-user',
    );
    const tracked = await digestCall('POST', '/applications', { opportunityId: 'dell-scholars' }, 'auto-user');
    const appId = tracked.json.id;

    const beforeInProgress = notifier.sent.length;
    await digestCall('PUT', `/applications/${appId}`, { status: 'in-progress' }, 'auto-user');
    await flushAsync();
    assert.equal(notifier.sent.length, beforeInProgress, 'in-progress should not trigger an email');

    await digestCall('PUT', `/applications/${appId}`, { status: 'submitted' }, 'auto-user');
    await flushAsync();
    const afterSubmitted = notifier.sent.filter((e) => e.to === 'auto-parent@example.com');
    assert.equal(afterSubmitted.length, 1, 'submitted should trigger exactly one email');

    await digestCall('PUT', `/applications/${appId}`, { status: 'won', amountWon: 20000 }, 'auto-user');
    await flushAsync();
    const afterWon = notifier.sent.filter((e) => e.to === 'auto-parent@example.com');
    assert.equal(afterWon.length, 2, 'won should trigger a second email');
    assert.match(afterWon[1]!.subject, /won \$20,000/);
  });

  it('never auto-sends when no parent email is on file', async () => {
    await digestCall('PUT', '/profile', goodProfile, 'no-parent-auto');
    const tracked = await digestCall(
      'POST',
      '/applications',
      { opportunityId: 'coca-cola-scholars' },
      'no-parent-auto',
    );
    const before = notifier.sent.length;
    await digestCall('PUT', `/applications/${tracked.json.id}`, { status: 'submitted' }, 'no-parent-auto');
    await flushAsync();
    assert.equal(notifier.sent.length, before);
  });

  it('reflects the activity log — every status change, newest first', async () => {
    await digestCall(
      'PUT',
      '/profile',
      { ...goodProfile, parentEmails: ['activity-parent@example.com'] },
      'activity-user',
    );
    const tracked = await digestCall(
      'POST',
      '/applications',
      { opportunityId: 'dell-scholars' },
      'activity-user',
    );
    await digestCall('PUT', `/applications/${tracked.json.id}`, { status: 'in-progress' }, 'activity-user');
    await digestCall('PUT', `/applications/${tracked.json.id}`, { status: 'submitted' }, 'activity-user');
    const preview = await digestCall('GET', '/digest/preview', undefined, 'activity-user');
    const submittedIdx = preview.json.text.indexOf('submitted Dell Scholars');
    const startedTrackingIdx = preview.json.text.indexOf('started tracking Dell Scholars');
    const startedWorkingIdx = preview.json.text.indexOf('started working on Dell Scholars');
    assert.ok(submittedIdx >= 0 && startedTrackingIdx >= 0 && startedWorkingIdx >= 0);
    assert.ok(submittedIdx < startedWorkingIdx && startedWorkingIdx < startedTrackingIdx); // newest first
  });
});
