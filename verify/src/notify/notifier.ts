/**
 * Notifier — how Cardinal Verify actually sends the consent and verifier links.
 *
 * Two triggers, both consent-first by construction:
 *   - a request is created  → the *candidate* is emailed their consent link
 *   - the candidate consents → each *source* is emailed their verifier link
 *
 * So a reference is never contacted until the candidate has signed — the same
 * gate the API enforces, now reflected in who gets mail and when.
 *
 * Zero dependencies: the default just logs (so links stay copy-pasteable from
 * the console), and the SendGrid sender is a single `fetch` to its HTTP API.
 * Any other provider (Postmark, Mailgun, raw SMTP) is a drop-in `Notifier`.
 */

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface Notifier {
  /** Human-readable transport name, surfaced in logs/history. */
  readonly kind: string;
  send(email: OutboundEmail): Promise<void>;
}

/**
 * Default transport: log the message instead of sending it. Keeps the
 * copy-the-link workflow working (and every send visible) with no config, and
 * is what the tests use.
 */
export class ConsoleNotifier implements Notifier {
  readonly kind = 'console';
  private readonly log: (msg: string) => void;
  constructor(log: (msg: string) => void = (m) => console.log(m)) {
    this.log = log;
  }
  async send(email: OutboundEmail): Promise<void> {
    this.log(`[verify] (no mailer configured) would email ${email.to} — ${email.subject}`);
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
 * Choose a transport from the environment:
 *   SENDGRID_API_KEY + VERIFY_MAIL_FROM  → real email via SendGrid
 *   otherwise                            → console (links stay copy-pasteable)
 */
export function notifierFromEnv(env: NodeJS.ProcessEnv = process.env): Notifier {
  if (env.SENDGRID_API_KEY && env.VERIFY_MAIL_FROM) {
    return new SendGridNotifier(env.SENDGRID_API_KEY, env.VERIFY_MAIL_FROM, env.VERIFY_MAIL_FROM_NAME);
  }
  return new ConsoleNotifier();
}
