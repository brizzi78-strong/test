/**
 * ReportService — the deliverable itself: an executive, print-ready PDF of a
 * verification, carrying everything a recipient needs to trust it:
 *
 *   - the findings, exactly as the sources attested them;
 *   - the consent record (who signed, when, under which disclosure);
 *   - the authenticity block: tracking number, verification code, a scannable
 *     QR to the public /verify page, and the HMAC integrity seal.
 *
 * Built on the in-house PDF writer and QR encoder — no dependencies, so a
 * report renders identically anywhere the service runs.
 */

import type { Candidate } from '../domain/types.ts';
import type { Store } from '../store/store.ts';
import { NotFoundError } from './errors.ts';
import { CertificateService } from './certificate.ts';
import { encodeQr } from './qr.ts';
import { PdfDoc, type PdfPage, type FontName, type RGB, hex, textWidth } from './pdf.ts';

const MAROON = hex('#6E1223');
const MAROON_DEEP = hex('#3E0D16');
const INK = hex('#1f1a16');
const GRAY = hex('#6d645c');
const CREAM = hex('#f7f0e4');
const LINE = hex('#ddd3c2');
const WHITE: RGB = [1, 1, 1];
const GOOD = hex('#2E7D4F');
const WARN = hex('#B0771C');

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;

export interface ReportOptions {
  store: Store;
  cert: CertificateService;
}

export class ReportService {
  private readonly store: Store;
  private readonly cert: CertificateService;

  constructor(opts: ReportOptions) {
    this.store = opts.store;
    this.cert = opts.cert;
  }

  /** Render the full report for a request as PDF bytes. */
  pdf(requestId: string): Buffer {
    const request = this.store.requests.get(requestId);
    if (!request) throw new NotFoundError('VerificationRequest', requestId);
    const candidate = this.store.candidates.get(request.candidateId);
    const company = this.store.companies.get(request.companyId);
    const ref = this.cert.reference(requestId);
    const record = this.cert.certificate(requestId, ref.verificationCode);

    const doc = new PdfDoc(`Verification Report ${ref.trackingNumber}`);
    const cur = new Cursor(doc);

    // --- Brand band ------------------------------------------------------
    cur.page.rect(0, PAGE_H - 92, PAGE_W, 92, MAROON_DEEP);
    cur.page.rect(0, PAGE_H - 96, PAGE_W, 4, MAROON);
    cur.page.text('BLUE RIDGE PRESS LLC', MARGIN, PAGE_H - 44, { font: 'bold', size: 15, color: WHITE });
    cur.page.text('PROFESSIONAL VERIFICATION & REFERENCE SERVICES', MARGIN, PAGE_H - 60, {
      size: 7.5,
      color: hex('#d9bfb3'),
    });
    const trackLabel = 'REPORT NO.';
    cur.page.text(trackLabel, PAGE_W - MARGIN - textWidth(trackLabel, 'regular', 7), PAGE_H - 40, {
      size: 7,
      color: hex('#d9bfb3'),
    });
    cur.page.text(ref.trackingNumber, PAGE_W - MARGIN - textWidth(ref.trackingNumber, 'bold', 12), PAGE_H - 54, {
      font: 'bold',
      size: 12,
      color: WHITE,
    });
    cur.y = PAGE_H - 132;

    // --- Title -----------------------------------------------------------
    cur.text('Verification Report', { font: 'bold', size: 22, color: INK });
    cur.gap(6);
    const issued = record.issuedAt ? new Date(record.issuedAt).toUTCString() : 'In progress — findings to date';
    cur.text(issued, { size: 9, color: GRAY });
    cur.gap(14);

    // --- Summary grid ----------------------------------------------------
    const resultText =
      record.result === 'all_confirmed' ? 'ALL SOURCES CONFIRMED' : record.result === 'partial' ? 'PARTLY CONFIRMED' : 'NOT YET COMPLETE';
    const resultColor = record.result === 'all_confirmed' ? GOOD : WARN;
    const rows: [string, string, RGB?, FontName?][] = [
      ['Candidate', fullName(candidate)],
      ['Requested by', company?.name ?? 'Unknown'],
      ['Scope', record.scope.map(scopeLabel).join(', ')],
      [
        'Sources',
        `${record.sources.confirmed} confirmed · ${record.sources.declined} declined · ${record.sources.pending} pending (of ${record.sources.total})`,
      ],
      ['Result', resultText, resultColor, 'bold'],
    ];
    const boxH = 26 + rows.length * 17;
    cur.ensure(boxH + 10);
    cur.page.rect(MARGIN, cur.y - boxH, CONTENT_W, boxH, CREAM);
    cur.page.rect(MARGIN, cur.y - boxH, 3, boxH, MAROON);
    let ry = cur.y - 22;
    for (const [label, value, color, font] of rows) {
      cur.page.text(label.toUpperCase(), MARGIN + 18, ry, { size: 6.8, color: GRAY });
      cur.page.text(value, MARGIN + 120, ry, { font: font ?? 'regular', size: 9.5, color: color ?? INK });
      ry -= 17;
    }
    cur.y -= boxH + 20;

    // --- Consent record --------------------------------------------------
    cur.heading('Consent record');
    if (request.consent) {
      cur.text(
        `Written authorization e-signed by ${request.consent.signedName} on ${new Date(request.consent.signedAt).toUTCString()}.`,
        { size: 9.5, color: INK },
      );
      cur.gap(4);
      cur.text(
        `Disclosure version ${request.consent.disclosureVersion}. No source was contacted before this authorization was recorded.`,
        { size: 8.5, color: GRAY },
      );
    } else {
      cur.text('Authorization not yet recorded — no sources have been contacted.', { size: 9.5, color: WARN });
    }
    cur.gap(16);

    // --- Findings --------------------------------------------------------
    cur.heading('Findings');
    for (const item of request.items) {
      cur.ensure(64);
      cur.page.line(MARGIN, cur.y + 4, PAGE_W - MARGIN, cur.y + 4, LINE, 0.7);
      cur.gap(12);
      cur.page.text(item.subject, MARGIN, cur.y, { font: 'bold', size: 10.5, color: INK });
      const tag = scopeLabel(item.type).toUpperCase();
      cur.page.text(tag, PAGE_W - MARGIN - textWidth(tag, 'regular', 6.8), cur.y + 1, { size: 6.8, color: MAROON });
      cur.gap(13);
      if (item.detail) {
        cur.text(item.detail, { size: 8.5, color: GRAY });
        cur.gap(3);
      }
      if (item.status === 'completed' && item.response) {
        const verdict = item.response.confirmed ? 'CONFIRMED' : 'NOT CONFIRMED';
        cur.page.text(verdict, MARGIN, cur.y, {
          font: 'bold',
          size: 8.5,
          color: item.response.confirmed ? GOOD : WARN,
        });
        const by = `— by ${item.response.verifierName}`;
        cur.page.text(by, MARGIN + textWidth(verdict, 'bold', 8.5) + 6, cur.y, { size: 8.5, color: GRAY });
        cur.gap(13);
        for (const [key, value] of Object.entries(item.response.answers ?? {})) {
          cur.wrapped(`${labelize(key)}:  ${value}`, 'regular', 8.5, GRAY, 14);
        }
      } else if (item.status === 'declined') {
        cur.text('Source declined to respond.', { size: 8.5, color: GRAY });
        cur.gap(6);
      } else {
        cur.text('Awaiting response from the source.', { size: 8.5, color: GRAY });
        cur.gap(6);
      }
      cur.gap(8);
    }
    cur.gap(10);

    // --- Authenticity ----------------------------------------------------
    const qr = encodeQr(ref.verifyUrl);
    const qrScale = 96 / (qr.size + 8);
    const qrBox = (qr.size + 8) * qrScale;
    const authH = Math.max(qrBox + 28, 118);
    cur.ensure(authH + 8);
    cur.page.rect(MARGIN, cur.y - authH, CONTENT_W, authH, CREAM);
    cur.page.rect(MARGIN, cur.y - authH, 3, authH, MAROON);
    // QR (white plate + dark modules) at the left.
    const qx = MARGIN + 16;
    const qy = cur.y - 14 - qrBox;
    cur.page.rect(qx, qy, qrBox, qrBox, WHITE);
    for (let row = 0; row < qr.size; row++) {
      let col = 0;
      while (col < qr.size) {
        if (!qr.modules[row][col]) {
          col++;
          continue;
        }
        let run = 1;
        while (col + run < qr.size && qr.modules[row][col + run]) run++;
        cur.page.rect(qx + (col + 4) * qrScale, qy + qrBox - (row + 5) * qrScale, run * qrScale, qrScale, INK);
        col += run;
      }
    }
    const ax = qx + qrBox + 18;
    let ay = cur.y - 26;
    cur.page.text('VERIFY THIS REPORT', ax, ay, { size: 6.8, color: GRAY });
    ay -= 15;
    cur.page.text(ref.trackingNumber, ax, ay, { font: 'bold', size: 12, color: INK });
    ay -= 13;
    cur.page.text(`Verification code: ${ref.verificationCode}`, ax, ay, { size: 9, color: INK });
    ay -= 12;
    cur.page.text('Scan the code, or enter both values at:', ax, ay, { size: 8, color: GRAY });
    ay -= 11;
    cur.page.text(ref.verifyUrl.split('?')[0], ax, ay, { font: 'mono', size: 7.5, color: MAROON });
    ay -= 15;
    cur.page.text('Integrity seal (HMAC-SHA256) — any alteration to the findings breaks it:', ax, ay, {
      size: 7,
      color: GRAY,
    });
    ay -= 9;
    const hash = record.integrity.hash;
    cur.page.text(hash.slice(0, 32), ax, ay, { font: 'mono', size: 6.5, color: GRAY });
    ay -= 8;
    cur.page.text(hash.slice(32), ax, ay, { font: 'mono', size: 6.5, color: GRAY });
    cur.y -= authH + 16;

    // --- Footer on every page -------------------------------------------
    cur.finishPages((page, index, total) => {
      page.line(MARGIN, 46, PAGE_W - MARGIN, 46, LINE, 0.7);
      const disc =
        'Blue Ridge Press LLC provides independent, consent-based verification of professional references, past employment, and education. ' +
        'This report reflects information confirmed by the named sources as of the report date and is one input to your decision. ' +
        'It is not a consumer report; no criminal, credit, or motor-vehicle records are included.';
      const lines = wrap(disc, 'regular', 6.5, CONTENT_W - 60);
      let fy = 38;
      for (const line of lines) {
        page.text(line, MARGIN, fy, { size: 6.5, color: GRAY });
        fy -= 8;
      }
      const pn = `${ref.trackingNumber} · page ${index + 1} of ${total}`;
      page.text(pn, PAGE_W - MARGIN - textWidth(pn, 'regular', 6.5), 38, { size: 6.5, color: GRAY });
    });

    return doc.render();
  }
}

// --- layout helpers --------------------------------------------------------

/** Top-down layout cursor that opens continuation pages as content overflows. */
class Cursor {
  page: PdfPage;
  y: number;
  private readonly doc: PdfDoc;
  private readonly pages: PdfPage[] = [];

  constructor(doc: PdfDoc) {
    this.doc = doc;
    this.page = doc.page(PAGE_W, PAGE_H);
    this.pages.push(this.page);
    this.y = PAGE_H - MARGIN;
  }

  ensure(height: number): void {
    if (this.y - height < 72) {
      this.page = this.doc.page(PAGE_W, PAGE_H);
      this.pages.push(this.page);
      this.y = PAGE_H - MARGIN;
    }
  }

  gap(points: number): void {
    this.y -= points;
  }

  text(str: string, opts: Parameters<PdfPage['text']>[2] = {}): void {
    const size = opts?.size ?? 10;
    this.ensure(size + 4);
    this.page.text(str, MARGIN, this.y - size, opts);
    this.y -= size + 4;
  }

  heading(str: string): void {
    this.ensure(30);
    this.page.text(str.toUpperCase(), MARGIN, this.y - 9, { font: 'bold', size: 8.5, color: MAROON });
    this.y -= 20;
  }

  wrapped(str: string, font: FontName, size: number, color: RGB, indent = 0): void {
    for (const line of wrap(str, font, size, CONTENT_W - indent)) {
      this.ensure(size + 3);
      this.page.text(line, MARGIN + indent, this.y - size, { font, size, color });
      this.y -= size + 3;
    }
  }

  finishPages(draw: (page: PdfPage, index: number, total: number) => void): void {
    this.pages.forEach((p, i) => draw(p, i, this.pages.length));
  }
}

function wrap(text: string, font: FontName, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (textWidth(next, font, size) <= maxWidth) line = next;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fullName(candidate?: Candidate): string {
  return candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Unknown';
}

function scopeLabel(type: string): string {
  return type === 'employment' ? 'Employment' : type === 'education' ? 'Education' : 'Reference';
}

function labelize(key: string): string {
  const words = key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
