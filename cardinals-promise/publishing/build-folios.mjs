import { chromium } from 'playwright-core';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BOOK = '/home/user/test/cardinals-promise/book/cardinals-toolkit-book.html';
const OUT = '/home/user/test/cardinals-promise/book/cardinals-toolkit-book.pdf';
const TMP = '/tmp/claude-0/-home-user-test/f033ae22-6343-5f45-bb02-1ac0346c5634/scratchpad/_book_raw.pdf';

// 1. Render the book to PDF (no header/footer)
const html = fs.readFileSync(BOOK, 'utf8');
const b = await chromium.launch({ executablePath: EXE });
const p = await b.newPage();
await p.setContent(html, { waitUntil: 'networkidle' });
await p.pdf({ path: TMP, preferCSSPageSize: true, printBackground: true });
await b.close();

// 2. Stamp folios with pdf-lib. Folio = sheet number (matches the TOC, which counts
//    from the cover). Skip the cover (sheet 1). Bottom-center, small, muted gray.
const bytes = fs.readFileSync(TMP);
const pdf = await PDFDocument.load(bytes);
const font = await pdf.embedFont(StandardFonts.Helvetica);
const pages = pdf.getPages();
const SIZE = 9, COLOR = rgb(0.55, 0.51, 0.47), Y = 30; // ~0.42in from bottom
pages.forEach((pg, i) => {
  if (i === 0) return;                 // no folio on the cover
  const n = String(i + 1);             // sheet number = TOC number
  const w = font.widthOfTextAtSize(n, SIZE);
  const { width } = pg.getSize();
  pg.drawText(n, { x: (width - w) / 2, y: Y, size: SIZE, font, color: COLOR });
});
fs.writeFileSync(OUT, await pdf.save());

// 3. Verify: Chapter 1 should sit on sheet 37 and now show "37"
const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(OUT)) }).promise;
const pg37 = await doc.getPage(37);
const txt = (await pg37.getTextContent()).items.map(x => x.str).join(' ').replace(/\s+/g, ' ');
console.log('pages:', doc.numPages);
console.log('sheet 37 is Chapter 1:', /Something Has Changed/.test(txt));
console.log('sheet 37 shows folio 37:', /(^|\s)37(\s|$)/.test(txt.trim().split(' ').slice(-3).join(' ')));
