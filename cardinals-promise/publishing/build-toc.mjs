import { chromium } from 'playwright-core';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

const BOOK = '/home/user/test/cardinals-promise/book/cardinals-toolkit-book.html';
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SCR = '/tmp/claude-0/-home-user-test/f033ae22-6343-5f45-bb02-1ac0346c5634/scratchpad';

const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// ---- 1. Extract chapter/section structure from the book body ----
const raw = fs.readFileSync(BOOK, 'utf8');
const firstChap = raw.indexOf('<section class="chapter');
const body = raw.slice(firstChap);
// Walk h1/h2 in order
const headings = [];
const re = /<(h1|h2)\b([^>]*)>([\s\S]*?)<\/\1>/g;
let m;
while ((m = re.exec(body))) {
  const tag = m[1];
  const attrs = m[2];
  const text = m[3].replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ')
    .replace(/\s+/g,' ').trim();
  headings.push({ tag, attrs, text, fm: /class="[^"]*\bfm\b/.test(attrs) });
}
// Group into chapters: an h1 whose text starts with "Chapter N".
// Skip fm-class h2s (back matter: About the Author, Index, ...) and close on them.
const chapters = [];
let cur = null;
for (const h of headings) {
  const cm = h.tag === 'h1' && /^Chapter\s+(\d+)\s+(.*)$/.exec(h.text);
  if (cm) {
    cur = { num: +cm[1], title: cm[2].trim(), secs: [] };
    chapters.push(cur);
  } else if (h.tag === 'h2' && h.fm) {
    cur = null; // back-matter heading closes the chapter grouping
  } else if (h.tag === 'h2' && cur) {
    cur.secs.push(h.text);
  } else if (h.tag === 'h1') {
    cur = null;
  }
}
console.log('chapters found:', chapters.length, '| sections total:',
  chapters.reduce((a,c)=>a+c.secs.length,0));

// ---- 2. Static structure: colors + parts ----
const color = {1:'yellow',2:'red',3:'yellow',4:'red',5:'yellow',6:'yellow',7:'yellow',
  8:'yellow',9:'yellow',10:'red',11:'yellow',12:'red',13:'blue',14:'blue',15:'blue',16:'blue',
  17:'blue',18:'blue',19:'blue',20:'blue',21:'blue',22:'blue',23:'red',24:'yellow',25:'blue',
  26:'red',27:'red',28:'red',29:'blue'};
const parts = [
  { title:'Part 1 — Something Has Changed', chs:[1,2,3,4,5] },
  { title:'Part 2 — Care Options',          chs:[6,7,8,9,10,11,12] },
  { title:'Part 3 — Paying for Care',       chs:[13,14,15,16,17,18] },
  { title:'Part 4 — The Documents That Matter', chs:[19,20,21,22,23,24,25,26] },
  { title:'Part 5 — Hospice and the Last Days', chs:[27,28,29] },
];
const byNum = Object.fromEntries(chapters.map(c=>[c.num,c]));

// ---- 3. Build TOC HTML. Page numbers use data-key placeholders "000". ----
const P = '<span class="lead"></span>';
const pg = key => `<span class="tocpg" data-key="${key}">000</span>`;
let html = `<h2 class="fm">Contents</h2>\n<div class="toc">\n`;
// front matter (kept as-is)
html += `  <ul>
    <li>Why I Wrote This Toolkit${P}${pg('fm:why')}</li>
    <li>You Are Not Alone${P}${pg('fm:notalone')}</li>
    <li>Before You Begin: Aging Whispers Before It Shouts${P}${pg('fm:begin')}</li>
    <li>How to Use This Handbook${P}${pg('fm:howto')}</li>
    <li>Start Here: What Are You Facing? — The First 24–72 Hours${P}${pg('fm:starthere')}</li>
    <li>Find Your Situation: Five Pathways${P}${pg('fm:pathways')}</li>
    <li><span class="tocdot d-blue"></span>For the Future Planners${P}${pg('fm:future')}</li>
  </ul>\n`;
for (const part of parts) {
  html += `  <div class="tocpart">${part.title}</div>\n`;
  for (const n of part.chs) {
    const c = byNum[n];
    html += `  <div class="tchap c-${color[n]}"><span class="cnum">Chapter ${n}:</span>` +
            `<span class="ctitle">${esc(c.title)}</span>${P}${pg('c'+n)}</div>\n`;
    html += `  <div class="tsecs">\n`;
    c.secs.forEach((s,i) => {
      html += `    <div class="tsec"><span>${esc(s)}</span>${P}${pg(`c${n}s${i}`)}</div>\n`;
    });
    html += `  </div>\n`;
  }
}
// back matter
html += `  <div class="tocpart">Back of the Book</div>
  <ul>
    <li>About the Author${P}${pg('bm:author')}</li>
    <li>Your State Guide${P}${pg('bm:state')}</li>
    <li>Index${P}${pg('bm:index')}</li>
    <li>Numbers That Matter${P}${pg('bm:numbers')}</li>
  </ul>\n</div>\n\n`;

// ---- 4. Splice into book, replacing old Contents ----
const start = raw.indexOf('<h2 class="fm">Contents</h2>');
const end = raw.indexOf('<!-- ============ COPYRIGHT ============ -->');
let newHtml = raw.slice(0, start) + html + raw.slice(end);
fs.writeFileSync(`${SCR}/book-expanded.html`, newHtml);

// ---- 5. Pager: instrument headings + TOC page-number spans, render, read sheets ----
const fmKey = {
  'Why I Wrote This Toolkit':'fm:why', 'You Are Not Alone':'fm:notalone',
  'Aging Whispers Before It Shouts':'fm:begin',
  'How to Use This Handbook':'fm:howto', 'What Are You Facing?':'fm:starthere',
  'Find Your Situation':'fm:pathways', 'For the Future Planners':'fm:future',
  'About the Author':'bm:author', 'Your State Guide':'bm:state',
  'Index':'bm:index', 'Numbers That Matter':'bm:numbers',
};
async function renderPages(inputHtml) {
  // Instrument every heading in the whole document with a keyed sentinel.
  // Prose mentions of these phrases live outside <h1>/<h2> tags, so they're never touched.
  const anchors = [];
  let curNum = null, secIdx = 0;
  const inst = inputHtml.replace(/<(h1|h2)\b([^>]*)>([\s\S]*?)<\/\1>/g, (mm, tag, attrs, inner) => {
    const text = inner.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ')
      .replace(/\s+/g,' ').trim();
    let key = null;
    const isFm = /class="[^"]*\bfm\b/.test(attrs);
    const cm = tag==='h1' && /^Chapter\s+(\d+)\s+/.exec(text);
    if (cm) { curNum = +cm[1]; secIdx = 0; key = 'c'+curNum; }
    else if (fmKey[text]) { if (isFm) curNum = null; key = fmKey[text]; }
    else if (tag==='h2' && isFm) { curNum = null; }
    else if (tag==='h2' && curNum!=null) { key = `c${curNum}s${secIdx}`; secIdx++; }
    else if (tag==='h1') { curNum = null; }
    if (!key) return mm;
    const tok = `ZQX${anchors.length}ZQX`;
    anchors.push({ key, tok });
    return `<${tag}${attrs}>${inner}<span style="font-size:1px;color:#fff;">${tok}</span></${tag}>`;
  });
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage();
  await page.setContent(inst, { waitUntil: 'networkidle' });
  const pdf = `${SCR}/_probe.pdf`;
  await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
  await browser.close();
  const data = new Uint8Array(fs.readFileSync(pdf));
  const doc = await getDocument({ data }).promise;
  const txt = [];
  for (let i=1;i<=doc.numPages;i++){ const p=await doc.getPage(i); const tc=await p.getTextContent();
    txt.push(tc.items.map(it=>it.str).join('')); }
  const pageByKey = {};
  for (const a of anchors) {
    for (let i=0;i<txt.length;i++){ if (txt[i].includes(a.tok)){ pageByKey[a.key]=i+1; break; } }
  }
  return { numPages: doc.numPages, pageByKey, txt };
}

// front/back matter keys → locate by their heading text on the page
function locateText(txt, needle) {
  const n = needle.replace(/\s+/g,' ').toLowerCase();
  for (let i=0;i<txt.length;i++) if (txt[i].toLowerCase().replace(/\s+/g,' ').includes(n)) return i+1;
  return -1;
}
const fmProbe = {
  'fm:why':'Why I Wrote This Toolkit', 'fm:begin':'Aging Whispers Before It Shouts',
  'fm:howto':'How to Use This Handbook', 'fm:starthere':'What Are You Facing',
  'fm:pathways':'Mom had a stroke', 'fm:future':'For the Future Planners',
  'bm:author':'About the Author', 'bm:state':'Your State Guide',
  'bm:index':'Index', 'bm:numbers':'Numbers That Matter',
};

function fill(htmlStr, pageMap) {
  return htmlStr.replace(/(<span class="tocpg" data-key=")([^"]+)(">)000(<\/span>)/g,
    (mm,a,key,b,c) => a+key+b+(pageMap[key]!=null?pageMap[key]:'000')+c);
}

// iterate to convergence (numbers filled don't change layout, but verify)
let prev = null, filled = newHtml, pass = 0, pmap = null;
while (pass < 3) {
  pass++;
  const src = pass === 1 ? newHtml : filled; // render the filled version from pass 2 on
  const { numPages, pageByKey, txt } = await renderPages(src);
  pmap = { ...pageByKey };
  const key = JSON.stringify(pmap);
  console.log(`pass ${pass}: numPages=${numPages}`);
  filled = fill(newHtml, pmap);
  if (key === prev) { console.log('converged'); break; }
  prev = key;
}
fs.writeFileSync(`${SCR}/book-final.html`, filled);
fs.writeFileSync(`${SCR}/pagemap.json`, JSON.stringify(pmap,null,2));
console.log('wrote book-final.html');
// sanity print chapter pages
for (const c of chapters) console.log('  Ch'+c.num, '->', pmap['c'+c.num], '('+c.secs.length+' secs)');
