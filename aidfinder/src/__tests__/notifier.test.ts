import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConsoleNotifier, SendGridNotifier, notifierFromEnv } from '../notify/notifier.ts';

describe('ConsoleNotifier', () => {
  it('logs instead of sending, so the digest is never silently lost with no config', async () => {
    const lines: string[] = [];
    const notifier = new ConsoleNotifier((m) => lines.push(m));
    await notifier.send({ to: 'parent@example.com', subject: 'Update', text: 'body' });
    assert.equal(lines.length, 1);
    assert.match(lines[0]!, /parent@example\.com/);
    assert.match(lines[0]!, /Update/);
  });
});

describe('SendGridNotifier', () => {
  it('POSTs the v3 mail/send shape with both text and html parts', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(null, { status: 202 });
    }) as typeof fetch;

    const notifier = new SendGridNotifier('key123', 'noreply@thecardinalspromise.blog', 'AidFinder', fakeFetch);
    await notifier.send({ to: 'parent@example.com', subject: 'Update', text: 'plain', html: '<p>html</p>' });

    assert.equal(calls.length, 1);
    const [{ url, init }] = calls;
    assert.equal(url, 'https://api.sendgrid.com/v3/mail/send');
    const body = JSON.parse(init.body as string);
    assert.equal(body.personalizations[0].to[0].email, 'parent@example.com');
    assert.equal(body.from.email, 'noreply@thecardinalspromise.blog');
    assert.equal(body.content[0].type, 'text/plain');
    assert.equal(body.content[1].type, 'text/html');
  });

  it('throws with the response body on a non-2xx reply', async () => {
    const fakeFetch = (async () => new Response('bad key', { status: 401 })) as typeof fetch;
    const notifier = new SendGridNotifier('bad', 'noreply@thecardinalspromise.blog', undefined, fakeFetch);
    await assert.rejects(
      () => notifier.send({ to: 'parent@example.com', subject: 'x', text: 'x' }),
      /sendgrid responded 401/,
    );
  });
});

describe('notifierFromEnv', () => {
  it('prefers SendGrid when both a key and a from-address are set', () => {
    const notifier = notifierFromEnv({
      SENDGRID_API_KEY: 'key',
      AIDFINDER_MAIL_FROM: 'noreply@thecardinalspromise.blog',
    } as NodeJS.ProcessEnv);
    assert.equal(notifier.kind, 'sendgrid');
  });

  it('falls back to SMTP when only SMTP is configured', () => {
    const notifier = notifierFromEnv({
      SMTP_HOST: 'smtp.example.com',
      AIDFINDER_MAIL_FROM: 'noreply@thecardinalspromise.blog',
    } as NodeJS.ProcessEnv);
    assert.equal(notifier.kind, 'smtp');
  });

  it('defaults to console when nothing is configured', () => {
    const notifier = notifierFromEnv({} as NodeJS.ProcessEnv);
    assert.equal(notifier.kind, 'console');
  });
});
