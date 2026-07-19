import { chromium } from 'playwright-core';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

const EXE = '/opt/pw-browsers/chromium';
const SCR = '/tmp/claude-0/-home-user-test/f033ae22-6343-5f45-bb02-1ac0346c5634/scratchpad';
const PUB = '/home/user/test/cardinals-promise/publishing';
const DPI = 300;

const browser = await chromium.launch({ executablePath: EXE });

// ---- Helper: wrap a full-bleed raster into a PDF of an EXACT physical size ----
async function rasterToPdf(pngPath, wIn, hIn, outPath) {
  const png = fs.readFileSync(pngPath);
  const doc = await PDFDocument.create();
  const img = await doc.embedPng(png);
  const wPt = wIn * 72, hPt = hIn * 72;
  const page = doc.addPage([wPt, hPt]);
  page.drawImage(img, { x: 0, y: 0, width: wPt, height: hPt });
  fs.writeFileSync(outPath, await doc.save());
}

// =====================================================================
// 1) FULL WRAP — flatten kdp-cover-wrap.html to an exact-size PDF
//    Target: 17.8532 x 11.25 in @ 300 DPI  ->  5334 x 3375 px
// =====================================================================
{
  const W = Math.round(17.8532 * DPI); // 5334
  const H = Math.round(11.25 * DPI);   // 3375
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  // Force the CSS-in body to fill our pixel viewport exactly regardless of @page.
  await page.goto(`file://${PUB}/kdp-cover-wrap.html`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: `
    html,body{ margin:0!important; padding:0!important;
      width:${W}px!important; height:${H}px!important; overflow:hidden!important; }
  `});
  await page.screenshot({ path: `${SCR}/wrap-flat.png`, clip: { x:0, y:0, width:W, height:H } });
  await page.close();
  await rasterToPdf(`${SCR}/wrap-flat.png`, 17.8532, 11.25, `${PUB}/kdp-cover-wrap-print.pdf`);
  console.log(`WRAP  -> ${W}x${H}px  =>  kdp-cover-wrap-print.pdf (17.8532 x 11.25 in)`);
}

// =====================================================================
// 2) FRONT COVER W/ BLEED — for KDP Cover Creator "upload own front"
//    Trim 8.5x11 + 0.125 bleed all sides = 8.75 x 11.25 in
//    @ 300 DPI -> 2625 x 3375 px.  Content stays inside the trim.
// =====================================================================
{
  const art = fs.readFileSync(`${SCR}/cardinal-art.png`).toString('base64');
  const B = 0.125 * 100; // bleed in the design's 100px/in units = 12.5px
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{ box-sizing:border-box; margin:0; padding:0; }
    :root{ --cream:#faf1e4; --navy:#16233f; --red:#b02417; --maroon:#7d1f17; --blue:#1e57a8; }
    html,body{ width:875px; height:1125px; }
    body{ background:var(--cream); font-family:Georgia,"Times New Roman",serif;
      position:relative; overflow:hidden; }
    /* frame + content inset by trim(24/70/84) + bleed(12.5) so trim geometry is unchanged */
    .frame{ position:absolute; inset:${24+B}px; border:2px solid var(--red); }
    .frame::after{ content:""; position:absolute; inset:5px; border:1px solid var(--red); }
    .inner{ position:absolute; inset:${70+B}px ${66+B}px ${84+B}px; text-align:center;
      display:flex; flex-direction:column; align-items:center; }
    .art{ width:80%; margin:10px auto 0; }
    .title{ margin-top:78px; position:relative; }
    .l1{ display:flex; align-items:flex-end; justify-content:center; gap:20px; }
    .its{ font-size:90px; font-weight:bold; color:var(--navy); letter-spacing:.01em; line-height:.95; }
    .corr{ position:relative; display:inline-block; }
    .all{ font-size:90px; font-weight:bold; color:var(--navy); line-height:.95; position:relative; }
    .all .x{ position:absolute; left:-8%; top:46%; width:116%; height:8px; background:var(--red); border-radius:6px; }
    .all .x.a{ transform:rotate(16deg); } .all .x.b{ transform:rotate(-16deg); }
    .notword{ position:absolute; left:52%; top:-52px; transform:translateX(-50%) rotate(-8deg);
      font-family:"Segoe Script","Brush Script MT","Comic Sans MS",cursive; font-weight:bold;
      font-size:66px; color:var(--red); white-space:nowrap; }
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
  fs.writeFileSync(`${SCR}/front-bleed.html`, html);
  const p = await browser.newPage({ viewport: { width: 875, height: 1125 }, deviceScaleFactor: 3 });
  await p.setContent(html, { waitUntil: 'networkidle' });
  await p.screenshot({ path: `${SCR}/front-bleed.png` });                       // 2625 x 3375 (PDF embed)
  await p.screenshot({ path: `${PUB}/front-cover-print.jpeg`, type: 'jpeg', quality: 92 }); // Cover Creator
  await p.close();
  await rasterToPdf(`${SCR}/front-bleed.png`, 8.75, 11.25, `${PUB}/front-cover-print.pdf`);
  console.log('FRONT -> 2625x3375px  =>  front-cover-print.jpeg + front-cover-print.pdf (8.75 x 11.25 in)');
}

await browser.close();
console.log('done rendering');
