/**
 * Notifier — how AidFinder actually sends the family progress digest.
 *
 * Zero dependencies: the default just logs (so the digest stays visible in
 * server logs with no config), the SendGrid sender is a single `fetch` to
 * its HTTP API, and raw SMTP works with any mailbox. Same shape as the
 * Notifier in verify/, duplicated here since every app in this repo is
 * standalone.
 */

import { smtpFromEnv } from './smtpNotifier.ts';

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface Notifier {
  /** Human-readable transport name, surfaced in the send result. */
  readonly kind: string;
  send(email: OutboundEmail): Promise<void>;
}

/**
 * Default transport: log the message instead of sending it. Lets the digest
 * feature work with no configuration (and is what the tests use) — the
 * content is still visible, just in the server log instead of an inbox.
 */
export class ConsoleNotifier implements Notifier {
  readonly kind = 'console';
  private readonly log: (msg: string) => void;
  constructor(log: (msg: string) => void = (m) => console.log(m)) {
    this.log = log;
  }
  async send(email: OutboundEmail): Promise<void> {
    this.log(`[aidfinder] (no mailer configured) would email ${email.to} — ${email.subject}`);
  }
}

/** Send via SendGrid's v3 HTTP API — one POST, no SDK. */
export class SendGridNotifier implements Notifier {
  readonly kind = 'sendgrid';
  private readonly apiKey: string;
  private readonly from: string;
  private readonly fromName?: string;
  private readonly fetchImpl: typeof fetch;
  constructor(apiKey: string, from: string, fromName?: string, fetchImpl: typeof fetch = fetch) {
    this.apiKey = apiKey;
    this.from = from;
    this.fromName = fromName;
    this.fetchImpl = fetchImpl;
  }

  async send(email: OutboundEmail): Promise<void> {
    const content: Array<{ type: string; value: string }> = [{ type: 'text/plain', value: email.text }];
    if (email.html) content.push({ type: 'text/html', value: email.html }); // text/plain must precede text/html
    const res = await this.fetchImpl('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: email.to }] }],
        from: this.fromName ? { email: this.from, name: this.fromName } : { email: this.from },
        subject: email.subject,
        content,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`sendgrid responded ${res.status}: ${detail.slice(0, 200)}`);
    }
  }
}

/**
 * Choose a transport from the environment, in order of preference:
 *   SENDGRID_API_KEY + AIDFINDER_MAIL_FROM  → real email via SendGrid (HTTP API)
 *   SMTP_HOST + AIDFINDER_MAIL_FROM         → real email via SMTP
 *   otherwise                               → console (digest stays in the logs)
 */
export function notifierFromEnv(env: NodeJS.ProcessEnv = process.env): Notifier {
  if (env.SENDGRID_API_KEY && env.AIDFINDER_MAIL_FROM) {
    return new SendGridNotifier(env.SENDGRID_API_KEY, env.AIDFINDER_MAIL_FROM, env.AIDFINDER_MAIL_FROM_NAME);
  }
  const smtp = smtpFromEnv(env);
  if (smtp) return smtp;
  return new ConsoleNotifier();
}
