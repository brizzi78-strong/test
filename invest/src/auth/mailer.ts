/**
 * Mailer — how Cardinal Trading sends email-verification and password-reset links.
 *
 * Same shape as the Cardinal Verify notifier: zero dependencies, and the
 * default transport just logs the message — so with no config, the links
 * stay copy-pasteable from the console (which is also what the tests hook).
 * Real email is one env pair away: SENDGRID_API_KEY + INVEST_MAIL_FROM
 * sends via SendGrid's v3 HTTP API (a single fetch, no SDK). Any other
 * provider — Postmark, Mailgun, raw SMTP like verify's SmtpNotifier — is a
 * drop-in `Mailer`.
 */

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  /** Human-readable transport name, surfaced in logs. */
  readonly kind: string;
  send(email: OutboundEmail): Promise<void>;
}

/** Default transport: log instead of sending, keeping links visible. */
export class ConsoleMailer implements Mailer {
  readonly kind = 'console';
  private readonly log: (msg: string) => void;
  constructor(log: (msg: string) => void = (m) => console.log(m)) {
    this.log = log;
  }
  async send(email: OutboundEmail): Promise<void> {
    this.log(`[cardinal-trading] (no mailer configured) would email ${email.to} — ${email.subject}\n${email.text}`);
  }
}

/** Send via SendGrid's v3 HTTP API — one POST, no SDK. */
export class SendGridMailer implements Mailer {
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
    const res = await this.fetchImpl('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: email.to }] }],
        from: this.fromName ? { email: this.from, name: this.fromName } : { email: this.from },
        subject: email.subject,
        content: [{ type: 'text/plain', value: email.text }],
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
 *   SENDGRID_API_KEY + INVEST_MAIL_FROM → real email via SendGrid
 *   otherwise                           → console (links stay copy-pasteable)
 */
export function mailerFromEnv(env: NodeJS.ProcessEnv = process.env): Mailer {
  if (env.SENDGRID_API_KEY && env.INVEST_MAIL_FROM) {
    return new SendGridMailer(env.SENDGRID_API_KEY, env.INVEST_MAIL_FROM, env.INVEST_MAIL_FROM_NAME);
  }
  return new ConsoleMailer();
}
