/**
 * SmtpNotifier — send mail over plain SMTP (SUBMISSION), no dependencies.
 *
 * Speaks just enough of RFC 5321 to submit a message to a mail server you
 * already have: greeting → EHLO → optional STARTTLS → AUTH LOGIN → MAIL/RCPT/
 * DATA → QUIT. Works with a domain mailbox, Gmail, Fastmail, iCloud, etc.
 *
 * Bodies are base64-encoded, which sidesteps line-length and dot-stuffing
 * pitfalls entirely (the base64 alphabet has no '.'), so the DATA payload is
 * always safe to transmit verbatim.
 *
 * The socket plumbing is injectable so the whole conversation can be exercised
 * against a scripted fake server in tests.
 */

import { connect as netConnect } from 'node:net';
import { connect as tlsConnect } from 'node:tls';
import { randomUUID } from 'node:crypto';
import type { Duplex } from 'node:stream';
import type { Notifier, OutboundEmail } from './notifier.ts';

export interface SmtpConfig {
  host: string;
  port: number;
  /** true → connect with TLS immediately (port 465). false → try STARTTLS. */
  secure: boolean;
  user?: string;
  password?: string;
  /** Envelope + From address, e.g. "no-reply@blueridgepressllc.com". */
  from: string;
  fromName?: string;
  /** Name announced in EHLO (defaults to the From domain). */
  clientName?: string;
}

export interface SmtpDeps {
  connect: (opts: { host: string; port: number; secure: boolean }) => Promise<Duplex>;
  upgrade: (socket: Duplex, host: string) => Promise<Duplex>;
}

const CRLF = '\r\n';

/** Buffers a socket into CRLF lines and aggregates multiline SMTP replies. */
class Wire {
  private socket: Duplex;
  private buffer = '';
  private lineQueue: string[] = [];
  private waiter: ((line: string) => void) | null = null;
  private failed: Error | null = null;
  private onData: ((chunk: string) => void) | null = null;
  private onError: ((err: Error) => void) | null = null;

  constructor(socket: Duplex) {
    this.socket = socket;
    this.bind();
  }

  /** Swap in the upgraded (TLS) socket after STARTTLS; detach the old one. */
  replace(socket: Duplex): void {
    if (this.onData) this.socket.removeListener('data', this.onData);
    if (this.onError) this.socket.removeListener('error', this.onError);
    this.socket = socket;
    this.buffer = '';
    this.bind();
  }

  private bind(): void {
    this.socket.setEncoding('utf8');
    this.onData = (chunk: string) => {
      this.buffer += chunk;
      let i: number;
      while ((i = this.buffer.indexOf(CRLF)) >= 0) {
        const line = this.buffer.slice(0, i);
        this.buffer = this.buffer.slice(i + 2);
        if (this.waiter) {
          const w = this.waiter;
          this.waiter = null;
          w(line);
        } else {
          this.lineQueue.push(line);
        }
      }
    };
    this.onError = (err: Error) => {
      this.failed = err;
    };
    this.socket.on('data', this.onData);
    this.socket.on('error', this.onError);
  }

  private readLine(): Promise<string> {
    if (this.failed) return Promise.reject(this.failed);
    const queued = this.lineQueue.shift();
    if (queued !== undefined) return Promise.resolve(queued);
    return new Promise((resolve) => {
      this.waiter = resolve;
    });
  }

  /** Read a full reply (following 250- continuations) and assert its code. */
  async expect(...codes: number[]): Promise<{ code: number; text: string }> {
    const lines: string[] = [];
    let code = 0;
    for (;;) {
      const line = await this.readLine();
      lines.push(line);
      code = Number(line.slice(0, 3));
      if (line.charAt(3) !== '-') break; // space (or end) = final line
    }
    if (codes.length && !codes.includes(code)) {
      throw new Error(`SMTP expected ${codes.join('/')} but got: ${lines.join(' ').slice(0, 200)}`);
    }
    return { code, text: lines.join('\n') };
  }

  send(line: string): void {
    this.socket.write(line + CRLF);
  }

  sendRaw(data: string): void {
    this.socket.write(data);
  }

  end(): void {
    try {
      this.socket.end();
    } catch {
      /* already closed */
    }
  }
}

const realDeps: SmtpDeps = {
  connect: ({ host, port, secure }) =>
    new Promise((resolve, reject) => {
      const socket = secure
        ? tlsConnect({ host, port, servername: host }, () => resolve(socket))
        : netConnect({ host, port }, () => resolve(socket));
      socket.once('error', reject);
    }),
  upgrade: (socket, host) =>
    new Promise((resolve, reject) => {
      const tls = tlsConnect({ socket: socket as never, servername: host }, () => resolve(tls));
      tls.once('error', reject);
    }),
};

export class SmtpNotifier implements Notifier {
  readonly kind = 'smtp';
  private readonly cfg: SmtpConfig;
  private readonly deps: SmtpDeps;

  constructor(cfg: SmtpConfig, deps: SmtpDeps = realDeps) {
    this.cfg = cfg;
    this.deps = deps;
  }

  async send(email: OutboundEmail): Promise<void> {
    const { host, port, secure, user, password } = this.cfg;
    const ehloName = this.cfg.clientName ?? this.cfg.from.split('@')[1] ?? 'localhost';
    const socket = await this.deps.connect({ host, port, secure });
    const wire = new Wire(socket);
    try {
      await wire.expect(220);
      wire.send(`EHLO ${ehloName}`);
      let caps = (await wire.expect(250)).text.toUpperCase();

      if (!secure && caps.includes('STARTTLS')) {
        wire.send('STARTTLS');
        await wire.expect(220);
        wire.replace(await this.deps.upgrade(socket, host));
        wire.send(`EHLO ${ehloName}`);
        caps = (await wire.expect(250)).text.toUpperCase();
      }

      if (user && password) {
        wire.send('AUTH LOGIN');
        await wire.expect(334);
        wire.send(Buffer.from(user).toString('base64'));
        await wire.expect(334);
        wire.send(Buffer.from(password).toString('base64'));
        await wire.expect(235);
      }

      wire.send(`MAIL FROM:<${this.cfg.from}>`);
      await wire.expect(250);
      wire.send(`RCPT TO:<${email.to}>`);
      await wire.expect(250, 251);
      wire.send('DATA');
      await wire.expect(354);
      wire.sendRaw(this.buildMessage(email) + CRLF + '.' + CRLF);
      await wire.expect(250);
      wire.send('QUIT');
      await wire.expect(221).catch(() => undefined);
    } finally {
      wire.end();
    }
  }

  private buildMessage(email: OutboundEmail): string {
    const domain = this.cfg.from.split('@')[1] ?? 'localhost';
    const fromHeader = this.cfg.fromName ? `${encodeHeader(this.cfg.fromName)} <${this.cfg.from}>` : this.cfg.from;
    const headers = [
      `From: ${fromHeader}`,
      `To: ${email.to}`,
      `Subject: ${encodeHeader(email.subject)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${randomUUID()}@${domain}>`,
      'MIME-Version: 1.0',
    ];

    if (!email.html) {
      headers.push('Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64');
      return headers.join(CRLF) + CRLF + CRLF + b64(email.text);
    }

    const boundary = `=_verify_${randomUUID().replace(/-/g, '')}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    const part = (ctype: string, body: string) =>
      `--${boundary}${CRLF}Content-Type: ${ctype}; charset=utf-8${CRLF}Content-Transfer-Encoding: base64${CRLF}${CRLF}${b64(body)}`;
    return (
      headers.join(CRLF) +
      CRLF +
      CRLF +
      part('text/plain', email.text) +
      CRLF +
      part('text/html', email.html) +
      CRLF +
      `--${boundary}--`
    );
  }
}

/** base64-encode, wrapped to 76-char lines (RFC 2045). */
function b64(text: string): string {
  const raw = Buffer.from(text, 'utf8').toString('base64');
  return raw.replace(/.{1,76}/g, '$&' + CRLF).trimEnd();
}

/** RFC 2047-encode a header value only if it has non-ASCII characters. */
function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

/** Build an SmtpNotifier from env, or undefined if SMTP isn't configured. */
export function smtpFromEnv(env: NodeJS.ProcessEnv = process.env): SmtpNotifier | undefined {
  if (!env.SMTP_HOST || !env.VERIFY_MAIL_FROM) return undefined;
  const port = Number(env.SMTP_PORT ?? 587);
  return new SmtpNotifier({
    host: env.SMTP_HOST,
    port,
    secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : port === 465,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    from: env.VERIFY_MAIL_FROM,
    fromName: env.VERIFY_MAIL_FROM_NAME,
  });
}
