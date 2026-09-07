/**
 * Drive the SMTP client through a full submission against a scripted in-memory
 * server (greeting → EHLO → STARTTLS → AUTH LOGIN → MAIL/RCPT/DATA → QUIT),
 * asserting the exact command sequence, the AUTH credentials, and the RFC822
 * message. No network, no real TLS — the socket + upgrade are injected.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Duplex } from 'node:stream';

import { SmtpNotifier, smtpFromEnv } from '../notify/smtpNotifier.ts';
import type { SmtpDeps } from '../notify/smtpNotifier.ts';

/** A Duplex that plays an SMTP server: it reacts to each command with a reply. */
class FakeSmtpServer extends Duplex {
  readonly commands: string[] = [];
  readonly authLines: string[] = [];
  message = '';
  private inData = false;
  private buf = '';
  private readonly caps: string[];

  constructor(caps: string[] = ['STARTTLS', 'AUTH LOGIN']) {
    super();
    this.caps = caps;
  }

  greet(): void {
    this.push('220 fake ESMTP ready\r\n');
  }

  _read(): void {}

  _write(chunk: Buffer | string, _enc: string, cb: () => void): void {
    this.buf += chunk.toString();
    let i: number;
    while ((i = this.buf.indexOf('\r\n')) >= 0) {
      const line = this.buf.slice(0, i);
      this.buf = this.buf.slice(i + 2);
      this.handle(line);
    }
    cb();
  }

  private handle(line: string): void {
    if (this.inData) {
      if (line === '.') {
        this.inData = false;
        this.push('250 2.0.0 Ok: queued\r\n');
      } else {
        this.message += line + '\n';
      }
      return;
    }
    const upper = line.toUpperCase();
    if (upper.startsWith('EHLO')) {
      this.commands.push('EHLO');
      const lines = ['fake greets you', ...this.caps, 'SIZE 10485760'];
      const reply = lines.map((l, idx) => `250${idx === lines.length - 1 ? ' ' : '-'}${l}`).join('\r\n');
      this.push(reply + '\r\n');
    } else if (upper === 'STARTTLS') {
      this.commands.push('STARTTLS');
      this.push('220 Ready to start TLS\r\n');
    } else if (upper === 'AUTH LOGIN') {
      this.commands.push('AUTH');
      this.push('334 VXNlcm5hbWU6\r\n'); // "Username:"
    } else if (upper.startsWith('MAIL FROM')) {
      this.commands.push('MAIL');
      this.push('250 2.1.0 Ok\r\n');
    } else if (upper.startsWith('RCPT TO')) {
      this.commands.push('RCPT');
      this.push('250 2.1.5 Ok\r\n');
    } else if (upper === 'DATA') {
      this.commands.push('DATA');
      this.inData = true;
      this.push('354 End data with <CR><LF>.<CR><LF>\r\n');
    } else if (upper === 'QUIT') {
      this.commands.push('QUIT');
      this.push('221 2.0.0 Bye\r\n');
    } else if (this.commands[this.commands.length - 1] === 'AUTH') {
      // The two base64 AUTH LOGIN steps (username, then password).
      this.authLines.push(line);
      this.push(this.authLines.length === 1 ? '334 UGFzc3dvcmQ6\r\n' : '235 2.7.0 Authenticated\r\n');
    }
  }
}

function depsFor(server: FakeSmtpServer): SmtpDeps {
  return {
    connect: async () => {
      queueMicrotask(() => server.greet());
      return server;
    },
    upgrade: async (socket) => socket, // pretend the TLS handshake succeeded
  };
}

test('SMTP client completes a full authenticated submission', async () => {
  const server = new FakeSmtpServer();
  const notifier = new SmtpNotifier(
    { host: 'smtp.example.com', port: 587, secure: false, user: 'rob', password: 's3cret', from: 'no-reply@blueridgepressllc.com', fromName: 'Blue Ridge Press' },
    depsFor(server),
  );

  await notifier.send({ to: 'ref@example.com', subject: 'A quick verification', text: 'Please respond.', html: '<p>Please respond.</p>' });

  // Command order: EHLO, STARTTLS, EHLO (post-TLS), AUTH, MAIL, RCPT, DATA, QUIT.
  assert.deepEqual(server.commands, ['EHLO', 'STARTTLS', 'EHLO', 'AUTH', 'MAIL', 'RCPT', 'DATA', 'QUIT']);

  // AUTH LOGIN carried base64 of the username then the password.
  assert.equal(Buffer.from(server.authLines[0], 'base64').toString(), 'rob');
  assert.equal(Buffer.from(server.authLines[1], 'base64').toString(), 's3cret');

  // The message has the right envelope headers and both MIME parts.
  assert.match(server.message, /From: Blue Ridge Press <no-reply@blueridgepressllc\.com>/);
  assert.match(server.message, /To: ref@example\.com/);
  assert.match(server.message, /Subject: A quick verification/);
  assert.match(server.message, /multipart\/alternative/);
  assert.match(server.message, /text\/plain/);
  assert.match(server.message, /text\/html/);
});

test('SMTP client skips STARTTLS/AUTH when the server offers neither and no creds', async () => {
  const server = new FakeSmtpServer([]); // no STARTTLS, no AUTH advertised
  const notifier = new SmtpNotifier(
    { host: 'localhost', port: 25, secure: false, from: 'no-reply@blueridgepressllc.com' },
    depsFor(server),
  );
  await notifier.send({ to: 'ref@example.com', subject: 'Hello', text: 'Plain only.' });
  assert.deepEqual(server.commands, ['EHLO', 'MAIL', 'RCPT', 'DATA', 'QUIT']);
  assert.match(server.message, /text\/plain; charset=utf-8/);
});

test('a rejecting server surfaces the SMTP error', async () => {
  const server = new FakeSmtpServer([]);
  // Force a 550 on RCPT by intercepting that one command.
  const realWrite = server._write.bind(server);
  server._write = ((chunk: Buffer | string, enc: string, cb: () => void) => {
    if (chunk.toString().toUpperCase().startsWith('RCPT TO')) {
      server.push('550 5.1.1 No such user\r\n');
      cb();
      return true;
    }
    return realWrite(chunk, enc, cb);
  }) as typeof server._write;

  const notifier = new SmtpNotifier({ host: 'localhost', port: 25, secure: false, from: 'a@b.com' }, depsFor(server));
  await assert.rejects(() => notifier.send({ to: 'nobody@example.com', subject: 's', text: 't' }), /SMTP expected 250\/251 but got.*550/);
});

test('smtpFromEnv needs SMTP_HOST and VERIFY_MAIL_FROM', () => {
  assert.equal(smtpFromEnv({} as NodeJS.ProcessEnv), undefined);
  assert.equal(smtpFromEnv({ SMTP_HOST: 'smtp.x.com' } as NodeJS.ProcessEnv), undefined);
  const n = smtpFromEnv({ SMTP_HOST: 'smtp.x.com', VERIFY_MAIL_FROM: 'a@b.com', SMTP_PORT: '465' } as NodeJS.ProcessEnv);
  assert.equal(n?.kind, 'smtp');
});
