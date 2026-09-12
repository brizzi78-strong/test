import { chromium } from 'playwright-core';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
const FOLIO_TTF = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';
const EXE = '/opt/pw-browsers/chromium';
const BOOK = '/home/user/test/cardinals-promise/book/cardinals-toolkit-book.html';
const OUT = '/home/user/test/cardinals-promise/book/cardinals-toolkit-book.pdf';
const SCR = '/tmp/claude-0/-home-user-test/f033ae22-6343-5f45-bb02-1ac0346c5634/scratchpad';
const TMP = `${SCR}/_book_raw.pdf`;

// 1. Render the book to PDF (no header/footer)
const html = fs.readFileSync(BOOK, 'utf8');
const b = await chromium.launch({ executablePath: EXE });
const p = await b.newPage();
await p.setContent(html, { waitUntil: 'networkidle' });
await p.pdf({ path: TMP, preferCSSPageSize: true, printBackground: true });
await b.close();

// --- read heading map + page texts ---
const HM = JSON.parse(fs.readFileSync(`${SCR}/headmap.json`, 'utf8'));
const HEX = { yellow:[0.420,0.129,0.659], red:[0.647,0.110,0.188], blue:[0.114,0.306,0.537] };
const SKIP = ['cardinal moment','you are not alone','aging whispers before it shouts','our mission','why i wrote'];
const tdoc = await getDocument({ data: new Uint8Array(fs.readFileSync(TMP)) }).promise;
const ptext = [];
for (let i = 1; i <= tdoc.numPages; i++) { const pg = await tdoc.getPage(i);
  const tc = await pg.getTextContent(); ptext.push(tc.items.map(x=>x.str).join(' ').replace(/\s+/g,' ').trim()); }
const chapAt = folio => { let cur=null; for (const c of HM.chapters) if (c.start!=null && c.start<=folio && (!cur||c.start>cur.start)) cur=c; return cur; };

// 2. Stamp folios + running heads
const bytes = fs.readFileSync(TMP);
const pdf = await PDFDocument.load(bytes);
pdf.registerFontkit(fontkit);
const font = await pdf.embedFont(fs.readFileSync(FOLIO_TTF), { subset: true });
const pages = pdf.getPages();
const SIZE = 11, COLOR = rgb(0.122, 0.239, 0.478), Y = 32;
const HSIZE = 8;
let heads = 0;
pages.forEach((pg, i) => {
  const folio = i + 1;
  const { width, height } = pg.getSize();
  if (i === 0) return;                                    // no folio/head on the cover
  const n = String(folio);
  pg.drawText(n, { x: (width - font.widthOfTextAtSize(n, SIZE))/2, y: Y, size: SIZE, font, color: COLOR });
  if (folio < HM.firstStart || (HM.aboutSheet && folio >= HM.aboutSheet)) return;
  const ch = chapAt(folio);
  if (!ch || folio === ch.start) return;                 // skip chapter openers
  const t = (ptext[i] || '').toLowerCase();
  if (t.length < 90 || SKIP.some(s => t.includes(s))) return;
  const head = (folio % 2 === 1)
    ? `CHAPTER ${ch.num} · ${ch.title.toUpperCase()}`
    : `PART ${ch.part} · ${ch.partShort.toUpperCase()}`;
  const [r,g,bl] = HEX[ch.color] || HEX.blue;
  pg.drawText(head, { x: (width - font.widthOfTextAtSize(head, HSIZE))/2, y: height - 40, size: HSIZE, font, color: rgb(r,g,bl) });
  heads++;
});
fs.writeFileSync(OUT, await pdf.save());

const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(OUT)) }).promise;
console.log('pages:', doc.numPages, '| running heads stamped:', heads);
