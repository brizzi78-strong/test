import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
const SRC='/home/user/test/cardinals-promise/book/cardinals-toolkit-book.pdf';
const OUT='/home/user/test/cardinals-promise/publishing/kdp-interior.pdf';
const src=await PDFDocument.load(fs.readFileSync(SRC));
const out=await PDFDocument.create();
const idx=src.getPageIndices().slice(1); // drop cover (page 0)
const pages=await out.copyPages(src, idx);
for(const p of pages) out.addPage(p);
fs.writeFileSync(OUT, await out.save());
const n=out.getPageCount();
const spine=(n*0.002347);
console.log('interior pages:', n);
console.log('spine:', spine.toFixed(4));
console.log('wrap width:', (17.25+spine).toFixed(4));
