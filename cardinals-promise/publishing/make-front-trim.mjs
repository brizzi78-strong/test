import { chromium } from 'playwright-core';
import fs from 'fs';
const EXE = '/opt/pw-browsers/chromium';
const SCR = '/tmp/claude-0/-home-user-test/f033ae22-6343-5f45-bb02-1ac0346c5634/scratchpad';
const BOOK = '/home/user/test/cardinals-promise/book/cardinals-toolkit-book.html';
const art = fs.readFileSync(`${SCR}/cardinal-art.png`).toString('base64');

// Trim-size front cover (8.5x11, NO bleed) at 300 DPI -> 2550 x 3300, for the
// book's cover PAGE (shown title-page style). Same design as the print cover.
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{ box-sizing:border-box; margin:0; padding:0; }
  :root{ --cream:#faf1e4; --navy:#16233f; --red:#b02417; --maroon:#7d1f17; --blue:#1e57a8; }
  html,body{ width:850px; height:1100px; }
  body{ background:var(--cream); font-family:Georgia,"Times New Roman",serif; position:relative; overflow:hidden; }
  .frame{ position:absolute; inset:24px; border:2px solid var(--red); }
  .frame::after{ content:""; position:absolute; inset:5px; border:1px solid var(--red); }
  .inner{ position:absolute; inset:70px 66px 84px; text-align:center; display:flex; flex-direction:column; align-items:center; }
  .art{ width:80%; margin:10px auto 0; }
  .title{ margin-top:78px; position:relative; }
  .l1{ display:flex; align-items:flex-end; justify-content:center; gap:20px; }
  .its{ font-size:90px; font-weight:bold; color:var(--navy); letter-spacing:.01em; line-height:.95; }
  .corr{ position:relative; display:inline-block; }
  .all{ font-size:90px; font-weight:bold; color:var(--navy); line-height:.95; position:relative; }
  .all .x{ position:absolute; left:-8%; top:46%; width:116%; height:8px; background:var(--red); border-radius:6px; }
  .all .x.a{ transform:rotate(16deg); } .all .x.b{ transform:rotate(-16deg); }
  .notword{ position:absolute; left:52%; top:-52px; transform:translateX(-50%) rotate(-8deg);
    font-family:"Brush Script MT","Segoe Script",cursive; font-weight:bold; font-size:66px; color:var(--red); white-space:nowrap; }
  .l2{ font-size:90px; font-weight:bold; color:var(--navy); line-height:1.02; margin-top:6px; white-space:nowrap; }
  .orn{ color:var(--red); font-size:20px; letter-spacing:.5em; margin:40px 0 24px; }
  .orn::before{ content:"—  ◆  —"; }
  .sub{ font-size:31px; color:var(--maroon); font-style:italic; }
  .author{ font-size:46px; font-weight:bold; letter-spacing:.22em; color:var(--navy); margin-top:16px; }
  .fromline{ font-size:24px; color:var(--blue); font-style:italic; margin-top:16px; }
</style></head><body>
  <div class="frame"></div>
  <div class="inner">
    <img class="art" src="data:image/png;base64,${art}">
    <div class="title">
      <div class="l1"><span class="its">IT&rsquo;S</span>
        <span class="corr"><span class="notword">Not</span>
          <span class="all">ALL<span class="x a"></span><span class="x b"></span></span></span></div>
      <div class="l2">YOUR FAULT</div>
    </div>
    <div class="orn"></div>
    <div class="sub">For Families Caring for an Aging Parent</div>
    <div class="orn"></div>
    <div class="author">ROB BRIZZI</div>
    <div class="fromline">From the Author of <b>The Cardinal&rsquo;s Promise</b></div>
  </div>
</body></html>`;

const b = await chromium.launch({ executablePath: EXE });
const p = await b.newPage({ viewport:{ width:850, height:1100 }, deviceScaleFactor:3 });
await p.setContent(html, { waitUntil:'networkidle' });
await p.screenshot({ path:`${SCR}/front-trim.png` });   // 2550 x 3300
await b.close();

// Swap the cover-page image in the master book HTML with this crisp front.
const trim = fs.readFileSync(`${SCR}/front-trim.png`).toString('base64');
let src = fs.readFileSync(BOOK, 'utf8');
const marker = '<div class="coverpage">';
const i = src.indexOf(marker);
const imgStart = src.indexOf('<img', i);
const dataStart = src.indexOf('src="', imgStart) + 5;
const dataEnd = src.indexOf('"', dataStart);
const before = src.slice(0, dataStart), after = src.slice(dataEnd);
src = before + 'data:image/png;base64,' + trim + after;
fs.writeFileSync(BOOK, src);
console.log('front-trim rendered (2550x3300) and swapped into book cover page');
