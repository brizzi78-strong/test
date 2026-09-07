/**
 * The mail transport and message builders: the SendGrid sender shapes a correct
 * v3 payload and surfaces API errors, and the two emails carry their link and
 * the scope note.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SendGridNotifier, ConsoleNotifier, notifierFromEnv } from '../notify/notifier.ts';
import { consentEmail, verifierEmail } from '../notify/messages.ts';

test('SendGrid sender POSTs a valid v3 payload', async () => {
  let captured: { url: string; init: RequestInit } | undefined;
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    captured = { url: String(url), init: init ?? {} };
    return new Response('', { status: 202 });
  }) as unknown as typeof fetch;

  const notifier = new SendGridNotifier('SG.key', 'no-reply@blueridgepressllc.com', 'Blue Ridge Press', fakeFetch);
  await notifier.send({ to: 'ref@example.com', subject: 'Hi', text: 'plain', html: '<p>rich</p>' });

  assert.equal(captured!.url, 'https://api.sendgrid.com/v3/mail/send');
  assert.match(String((captured!.init.headers as Record<string, string>).authorization), /^Bearer SG\.key$/);
  const payload = JSON.parse(captured!.init.body as string);
  assert.equal(payload.personalizations[0].to[0].email, 'ref@example.com');
  assert.equal(payload.from.email, 'no-reply@blueridgepressllc.com');
  assert.equal(payload.from.name, 'Blue Ridge Press');
  assert.equal(payload.content[0].type, 'text/plain'); // plain must precede html
  assert.equal(payload.content[1].type, 'text/html');
});

test('SendGrid sender throws on a non-2xx response', async () => {
  const fakeFetch = (async () => new Response('bad request', { status: 400 })) as unknown as typeof fetch;
  const notifier = new SendGridNotifier('SG.key', 'from@example.com', undefined, fakeFetch);
  await assert.rejects(() => notifier.send({ to: 'x@example.com', subject: 's', text: 't' }), /sendgrid responded 400/);
});

test('env selects SendGrid only when key and from are both set', () => {
  assert.equal(notifierFromEnv({} as NodeJS.ProcessEnv).kind, 'console');
  assert.equal(notifierFromEnv({ SENDGRID_API_KEY: 'SG.k' } as NodeJS.ProcessEnv).kind, 'console');
  assert.equal(
    notifierFromEnv({ SENDGRID_API_KEY: 'SG.k', VERIFY_MAIL_FROM: 'a@b.com' } as NodeJS.ProcessEnv).kind,
    'sendgrid',
  );
});

test('the console notifier never throws', async () => {
  await new ConsoleNotifier(() => {}).send({ to: 'a@b.com', subject: 's', text: 't' });
});

test('the two emails carry the link and the scope note', () => {
  const c = consentEmail({ to: 'cand@x.com', companyName: 'Blue Ridge Press LLC', candidateFirstName: 'Jordan', url: 'https://v/c/tok' });
  assert.match(c.text, /https:\/\/v\/c\/tok/);
  assert.match(c.subject, /Blue Ridge Press LLC/);
  assert.match(c.text, /does not authorize criminal or credit/);

  const v = verifierEmail({ to: 'ref@x.com', companyName: 'Blue Ridge Press LLC', candidateName: 'Jordan Rivera', itemType: 'reference', subject: 'Pat Lee', url: 'https://v/v/tok' });
  assert.match(v.text, /https:\/\/v\/v\/tok/);
  assert.match(v.text, /give a reference for Jordan Rivera/);
  assert.match(v.html!, /does not authorize criminal or credit/);
});
