/**
 * A tiny, dependency-free PDF writer — just enough to lay out a clean,
 * printable report: filled rectangles, stroked lines, and text in the three
 * standard base-14 fonts (Helvetica, Helvetica-Bold, Courier), which every
 * PDF viewer ships, so nothing is embedded and files stay small.
 *
 * Streams are left uncompressed on purpose: the output stays inspectable in
 * tests (and by curious humans) and the reports are a few KB anyway.
 * Coordinates follow the PDF convention — origin at the bottom-left, points.
 */

export type FontName = 'regular' | 'bold' | 'mono';

export interface TextOptions {
  font?: FontName;
  size?: number;
  color?: RGB;
}

/** Channels 0–1, PDF's native color space. */
export type RGB = [number, number, number];

/** #rrggbb → PDF RGB triple. */
export function hex(color: string): RGB {
  const n = parseInt(color.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Helvetica / Helvetica-Bold advance widths (AFM, per mille) for chars 32–126.
// Courier is monospaced at 600. Used for measuring, centering, and wrapping.
// prettier-ignore
const W_REG = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
// prettier-ignore
const W_BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

/** Width of `text` at `size` points in the given font. */
export function textWidth(text: string, font: FontName, size: number): number {
  if (font === 'mono') return text.length * 600 * (size / 1000);
  const table = font === 'bold' ? W_BOLD : W_REG;
  let units = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    units += code >= 32 && code <= 126 ? table[code - 32] : 556;
  }
  return units * (size / 1000);
}

// Common typographic characters that WinAnsi encodes above 0x7F.
const WINANSI: Record<string, number> = {
  '–': 150, '—': 151, '‘': 145, '’': 146,
  '“': 147, '”': 148, '•': 149, '·': 183,
  '©': 169, '®': 174, '…': 133, '°': 176,
};

/** Escape a JS string into a PDF literal string in WinAnsi encoding. */
function pdfString(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (ch === '\\' || ch === '(' || ch === ')') out += '\\' + ch;
    else if (code >= 32 && code <= 126) out += ch;
    else {
      const mapped = WINANSI[ch] ?? (code <= 255 ? code : 63); // 63 = '?'
      out += '\\' + mapped.toString(8).padStart(3, '0');
    }
  }
  return out;
}

function num(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

export class PdfPage {
  readonly width: number;
  readonly height: number;
  private readonly ops: string[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  rect(x: number, y: number, w: number, h: number, color: RGB): void {
    this.ops.push(
      `${num(color[0])} ${num(color[1])} ${num(color[2])} rg ${num(x)} ${num(y)} ${num(w)} ${num(h)} re f`,
    );
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB, width = 1): void {
    this.ops.push(
      `${num(color[0])} ${num(color[1])} ${num(color[2])} RG ${num(width)} w ${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S`,
    );
  }

  text(str: string, x: number, y: number, opts: TextOptions = {}): void {
    const font = opts.font ?? 'regular';
    const size = opts.size ?? 10;
    const [r, g, b] = opts.color ?? [0, 0, 0];
    const f = font === 'bold' ? 'F2' : font === 'mono' ? 'F3' : 'F1';
    this.ops.push(
      `BT /${f} ${num(size)} Tf ${num(r)} ${num(g)} ${num(b)} rg ${num(x)} ${num(y)} Td (${pdfString(str)}) Tj ET`,
    );
  }

  content(): string {
    return this.ops.join('\n');
  }
}

export class PdfDoc {
  private readonly pages: PdfPage[] = [];
  private title: string;

  constructor(title = 'Document') {
    this.title = title;
  }

  page(width = 612, height = 792): PdfPage {
    const p = new PdfPage(width, height);
    this.pages.push(p);
    return p;
  }

  /** Serialize the document; offsets in the xref are exact byte positions. */
  render(): Buffer {
    // Object plan: 1 Catalog, 2 Pages, 3 Info, 4–6 fonts, then per page:
    // page object + content stream.
    const chunks: Buffer[] = [];
    const offsets: number[] = [];
    let position = 0;
    const emit = (s: string | Buffer) => {
      const b = typeof s === 'string' ? Buffer.from(s, 'latin1') : s;
      chunks.push(b);
      position += b.length;
    };
    const obj = (body: string | Buffer) => {
      offsets.push(position);
      const id = offsets.length;
      emit(`${id} 0 obj\n`);
      emit(body);
      emit('\nendobj\n');
      return id;
    };

    emit('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    const pageIds = this.pages.map((_, i) => 7 + i * 2);
    obj(`<< /Type /Catalog /Pages 2 0 R >>`); // 1
    obj(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${this.pages.length} >>`); // 2
    obj(`<< /Title (${pdfString(this.title)}) /Producer (Blue Ridge Press Verify) >>`); // 3
    obj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`); // 4
    obj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`); // 5
    obj(`<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>`); // 6

    for (const page of this.pages) {
      const contentId = offsets.length + 2; // the stream object right after
      obj(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(page.width)} ${num(page.height)}] ` +
          `/Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents ${contentId} 0 R >>`,
      );
      const stream = Buffer.from(page.content(), 'latin1');
      obj(Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, 'latin1'), stream, Buffer.from('\nendstream', 'latin1')]));
    }

    const xrefAt = position;
    emit(`xref\n0 ${offsets.length + 1}\n`);
    emit('0000000000 65535 f \n');
    for (const off of offsets) emit(`${String(off).padStart(10, '0')} 00000 n \n`);
    emit(`trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);

    return Buffer.concat(chunks);
  }
}
