/**
 * The Cardinal Trading single-page app, served whole (no external assets) by the BFF.
 * Its JavaScript talks only to same-origin `/api/*`, which the server proxies
 * to the Trading service — so every quote, order, and position is real
 * (within the mock market) and persisted upstream. The account id and name
 * come from `GET /api/app`.
 */

export const PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Cardinal Trading</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%23A31B33'/%3E%3Cg fill='%23fff'%3E%3Cpolygon%20points=%2238,30%2044,4%2052,30%22%2F%3E%3Ccircle%20cx=%2244%22%20cy=%2240%22%20r=%2215%22%2F%3E%3Cpolygon%20points=%2230,39%2012,47%2030,53%22%2F%3E%3Cellipse%20cx=%2258%22%20cy=%2264%22%20rx=%2224%22%20ry=%2221%22%2F%3E%3Cpolygon%20points=%2272,72%2098,92%2086,96%2066,82%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E">
<style>
  :root{
    --bg:#000;--surface:#0E0E0E;--surface-2:#1A1A1A;--ink:#fff;--muted:#8A8D91;
    --line:#222;--brand:#00C805;--brand-ink:#00220A;--cardinal:#C31F3C;
    --good:#00C805;--good-bg:#0B2311;--crit:#FF5000;--crit-bg:#2B1206;
    --shadow:0 1px 2px rgba(0,0,0,.35);
    --font:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;--radius:14px;
  }
  @media (prefers-color-scheme:light){:root{
    --bg:#fff;--surface:#FAFAFA;--surface-2:#F0F0F0;--ink:#000;--muted:#6B6F76;
    --line:#E6E6E6;--brand:#00A305;--brand-ink:#fff;--cardinal:#A31B33;
    --good:#00A305;--good-bg:#E4F9E6;--crit:#E04A00;--crit-bg:#FFE9E0;
    --shadow:0 1px 2px rgba(0,0,0,.05);}}
  :root[data-theme="light"]{--bg:#fff;--surface:#FAFAFA;--surface-2:#F0F0F0;--ink:#000;--muted:#6B6F76;--line:#E6E6E6;--brand:#00A305;--brand-ink:#fff;--cardinal:#A31B33;--good:#00A305;--good-bg:#E4F9E6;--crit:#E04A00;--crit-bg:#FFE9E0;--shadow:0 1px 2px rgba(0,0,0,.05);}
  :root[data-theme="dark"]{--bg:#000;--surface:#0E0E0E;--surface-2:#1A1A1A;--ink:#fff;--muted:#8A8D91;--line:#222;--brand:#00C805;--brand-ink:#00220A;--cardinal:#C31F3C;--good:#00C805;--good-bg:#0B2311;--crit:#FF5000;--crit-bg:#2B1206;--shadow:0 1px 2px rgba(0,0,0,.35);}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font);line-height:1.5;-webkit-font-smoothing:antialiased}
  .num{font-variant-numeric:tabular-nums;font-family:var(--mono)}
  button{font-family:inherit}
  .app{display:grid;grid-template-columns:224px 1fr;min-height:100vh}
  .rail{background:var(--surface);border-right:1px solid var(--line);padding:20px 16px;display:flex;flex-direction:column;gap:6px;position:sticky;top:0;height:100vh}
  .brand{display:flex;align-items:center;gap:10px;padding:4px 6px 18px}
  .glyph{width:34px;height:34px;border-radius:9px;background:var(--cardinal);display:grid;place-items:center;box-shadow:var(--shadow);flex:none}
  .glyph svg{width:21px;height:21px;fill:#fff;display:block}
  .brand b{font-size:.95rem;letter-spacing:-.02em;display:block;white-space:nowrap}
  .brand span{font-size:.72rem;color:var(--muted)}
  .nav{display:flex;flex-direction:column;gap:2px}
  .nav button{display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:transparent;border:0;color:var(--muted);padding:.62rem .7rem;border-radius:10px;font-size:.9rem;font-weight:600;cursor:pointer}
  .nav button svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.7;flex:none}
  .nav button:hover{background:var(--surface-2);color:var(--ink)}
  .nav button[aria-current="true"]{background:color-mix(in srgb,var(--brand) 14%,transparent);color:var(--brand)}
  .rail .foot{margin-top:auto;font-size:.72rem;color:var(--muted);padding:6px;line-height:1.5}
  .main{padding:26px clamp(18px,3vw,40px) 60px;max-width:1100px}
  .top{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:20px;flex-wrap:wrap}
  h1{font-size:clamp(1.4rem,1.1rem+1vw,1.8rem);margin:0;letter-spacing:-.02em}
  .sub{color:var(--muted);font-size:.86rem;margin-top:3px}
  .btn{background:var(--brand);color:var(--brand-ink);border:0;border-radius:10px;padding:.6rem .95rem;font-weight:700;font-size:.86rem;cursor:pointer;display:inline-flex;align-items:center;gap:7px;box-shadow:var(--shadow)}
  .btn:hover{filter:brightness(1.08)}
  a.btn{text-decoration:none;justify-content:center}
  .btn:disabled{opacity:.5;cursor:not-allowed}
  .btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line);box-shadow:none}
  .btn.ghost:hover{border-color:var(--brand);color:var(--brand)}
  .btn.crit{background:var(--crit);color:#fff}
  .btn.sm{padding:.4rem .62rem;font-size:.78rem;border-radius:8px}
  .btn:focus-visible,.nav button:focus-visible,select:focus-visible,input:focus-visible,.seg button:focus-visible,.row:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
  .hero{margin-bottom:24px}
  .hero .equity{font-size:clamp(2rem,1.4rem+2.2vw,2.9rem);font-weight:800;letter-spacing:-.02em}
  .hero .chg{font-size:1rem;font-weight:700;margin-top:6px;display:flex;align-items:center;gap:6px}
  .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:22px}
  .tile{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:16px 17px;box-shadow:var(--shadow)}
  .tile .k{font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:700}
  .tile .v{font-size:1.4rem;font-weight:800;margin-top:8px;letter-spacing:-.02em}
  .tile .m{font-size:.75rem;color:var(--muted);margin-top:3px}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden}
  .card + .card{margin-top:18px}
  .card .hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--line)}
  .card .hd h2{font-size:.98rem;margin:0}
  .card .hd .note{font-size:.76rem;color:var(--muted)}
  table{width:100%;border-collapse:collapse;font-size:.86rem}
  thead th{text-align:left;font-size:.68rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);font-weight:700;padding:11px 18px;border-bottom:1px solid var(--line)}
  tbody td{padding:12px 18px;border-bottom:1px solid var(--line)}
  tbody tr:last-child td{border-bottom:0}
  tbody tr.row{cursor:pointer}
  tbody tr.row:hover{background:var(--surface-2)}
  td.r,th.r{text-align:right}
  .who{font-weight:700}.dim{color:var(--muted);font-size:.8rem}
  .sym{display:flex;align-items:center;gap:10px}
  .avatar{width:32px;height:32px;border-radius:8px;background:var(--surface-2);display:grid;place-items:center;font-size:.68rem;font-weight:800;color:var(--muted);flex:none}
  .pos{color:var(--good)}.neg{color:var(--crit)}.flat{color:var(--muted)}
  .pill{display:inline-flex;align-items:center;gap:6px;padding:.2rem .55rem;border-radius:999px;font-size:.72rem;font-weight:700;white-space:nowrap}
  .pill::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
  .pill.filled{color:var(--good);background:var(--good-bg)}
  .pill.open{color:var(--muted);background:var(--surface-2)}
  .pill.cancelled{color:var(--crit);background:var(--crit-bg)}
  .star{background:transparent;border:0;color:var(--muted);cursor:pointer;font-size:1.1rem;line-height:1;padding:4px}
  .star.on{color:var(--brand)}
  .seg{display:inline-flex;background:var(--surface-2);border-radius:9px;padding:3px}
  .seg button{border:0;background:transparent;color:var(--muted);font-weight:700;font-size:.82rem;padding:.45rem .9rem;border-radius:7px;cursor:pointer;flex:1}
  .seg button[aria-pressed="true"]{background:var(--surface);color:var(--ink);box-shadow:var(--shadow)}
  .seg.buy button[aria-pressed="true"]{color:var(--good)}
  .seg.buy button[data-side="sell"][aria-pressed="true"]{color:var(--crit)}
  .empty{padding:34px 18px;text-align:center;color:var(--muted);font-size:.88rem}
  .scrim{position:fixed;inset:0;background:rgba(0,0,0,.6);opacity:0;pointer-events:none;transition:opacity .22s}
  .scrim.on{opacity:1;pointer-events:auto}
  .drawer{position:fixed;top:0;right:0;height:100vh;width:min(480px,94vw);background:var(--surface);border-left:1px solid var(--line);box-shadow:-16px 0 40px -20px rgba(0,0,0,.7);transform:translateX(100%);transition:transform .26s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;z-index:5}
  .drawer.on{transform:none}
  .drawer .dh{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--line)}
  .drawer .dh h2{margin:0;font-size:1.05rem}
  .drawer .body{padding:18px 20px;overflow:auto;flex:1}
  .drawer .df{padding:16px 20px;border-top:1px solid var(--line);display:flex;gap:10px;justify-content:flex-end;align-items:center}
  .x{background:transparent;border:0;color:var(--muted);font-size:1.4rem;cursor:pointer;line-height:1;padding:2px 6px;border-radius:8px}
  .x:hover{background:var(--surface-2);color:var(--ink)}
  label{display:block;font-size:.72rem;font-weight:700;color:var(--muted);margin:0 0 5px;text-transform:uppercase;letter-spacing:.05em}
  .field{margin-bottom:14px}
  input,select{width:100%;padding:.56rem .6rem;border:1px solid var(--line);border-radius:9px;background:var(--bg);color:var(--ink);font:inherit}
  .row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .sumbox{margin-top:12px;background:var(--surface-2);border-radius:11px;padding:12px 14px}
  .sumbox .sl{display:flex;justify-content:space-between;font-size:.86rem;padding:3px 0}
  .sumbox .sl.t{font-weight:800;font-size:1rem;border-top:1px solid var(--line);margin-top:6px;padding-top:8px}
  .quotebox{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:16px}
  .quotebox .p{font-size:2rem;font-weight:800;letter-spacing:-.02em}
  .quotebox .c{font-size:.92rem;font-weight:700;margin-top:4px}
  .chartbox{position:relative;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:10px 10px 6px;margin-bottom:10px}
  .xhair{position:absolute;top:26px;bottom:28px;width:1px;background:var(--muted);opacity:.7;display:none;pointer-events:none}
  .xlabel{position:absolute;top:4px;transform:translateX(-50%);background:var(--surface-2);border:1px solid var(--line);border-radius:6px;padding:1px 7px;font-size:.68rem;font-family:var(--mono);color:var(--muted);display:none;pointer-events:none;white-space:nowrap;z-index:2}
  .spark{width:100%;display:block}
  .poscard{background:var(--surface-2);border-radius:11px;padding:12px 14px;margin-bottom:14px}
  .poscard .ph{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}
  .poscard .ph b{font-size:.82rem}
  .poscard .pg{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;font-size:.82rem}
  .poscard .pg div{display:flex;justify-content:space-between;gap:10px}
  .poscard .pg span:first-child{color:var(--muted)}
  .stats{margin-top:16px;border-top:1px solid var(--line);padding-top:12px}
  .stats h3{font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:0 0 8px}
  .stats .sg{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;font-size:.82rem}
  .stats .sg div{display:flex;justify-content:space-between;gap:10px}
  .stats .sg span:first-child{color:var(--muted)}
  .movers{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px}
  .mover{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 14px;cursor:pointer;box-shadow:var(--shadow)}
  .mover:hover{border-color:var(--muted)}
  .mover .ms{font-weight:800;font-size:.9rem}
  .mover .mp{font-size:.82rem;margin-top:5px}
  .movehd{font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:700;margin:0 0 10px}
  .chartmeta{display:flex;justify-content:space-between;font-size:.7rem;color:var(--muted);font-family:var(--mono);margin-top:6px}
  .ranges{display:flex;justify-content:center;margin:0 0 16px}
  .seg.chips button{padding:.3rem .6rem;font-size:.72rem;flex:none}
  .auth{position:fixed;inset:0;background:var(--bg);display:none;align-items:center;justify-content:center;z-index:8;padding:20px}
  .auth.on{display:flex}
  .authcard{width:min(400px,94vw);background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:28px}
  .authcard .logo{display:flex;align-items:center;gap:10px;margin-bottom:18px}
  .authcard h1{font-size:1.3rem;margin:0}
  .authtabs{display:grid;grid-template-columns:1fr 1fr;background:var(--surface-2);border-radius:10px;padding:3px;margin-bottom:18px}
  .authtabs button{border:0;background:transparent;color:var(--muted);font-weight:700;font-size:.86rem;padding:.5rem;border-radius:8px;cursor:pointer}
  .authtabs button[aria-pressed="true"]{background:var(--surface);color:var(--ink);box-shadow:var(--shadow)}
  .tagline{font-size:.88rem;font-weight:600;color:var(--muted);margin:-8px 0 16px}
  .autherr{color:var(--crit);font-size:.82rem;font-weight:600;min-height:1.2em;margin:6px 0 10px}
  .authnote{color:var(--muted);font-size:.74rem;margin-top:14px;text-align:center}
  .alink{background:transparent;border:0;color:var(--muted);cursor:pointer;font-size:.78rem;text-decoration:underline;padding:0;display:block;margin:10px auto 0}
  .alink:hover{color:var(--brand)}
  .vbanner{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--brand);border-radius:11px;padding:10px 14px;margin-bottom:18px;font-size:.84rem;color:var(--muted)}
  .vbanner b{color:var(--ink)}
  .auth .btn{width:100%;justify-content:center;padding:.7rem}
  .foot .logout{background:transparent;border:0;color:var(--muted);cursor:pointer;padding:0;font-size:.72rem;text-decoration:underline}
  .foot .logout:hover{color:var(--crit)}
  .legallink{color:var(--muted);text-decoration:underline}
  .legallink:hover{color:var(--ink)}
  .authnote .legallink{font-size:inherit}
  .toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--ink);color:var(--bg);padding:.6rem 1rem;border-radius:10px;font-size:.85rem;font-weight:600;opacity:0;pointer-events:none;transition:.25s;z-index:9;box-shadow:var(--shadow)}
  .toast.on{opacity:1;transform:translateX(-50%)}
  .toast.err{background:var(--crit);color:#fff}
  .toast.good{background:var(--good);color:#00220A}
  @media (max-width:860px){.app{grid-template-columns:1fr}.rail{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center;gap:8px}.rail .foot{display:none}.brand{padding-bottom:0}.nav{flex-direction:row;flex-wrap:wrap;margin-left:auto}.tiles{grid-template-columns:1fr}}
  @media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head>
<body>
<div class="app">
  <aside class="rail">
    <div class="brand"><span class="glyph"><svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="38,30 44,4 52,30"/><circle cx="44" cy="40" r="15"/><polygon points="30,39 12,47 30,53"/><ellipse cx="58" cy="64" rx="24" ry="21"/><polygon points="72,72 98,92 86,96 66,82"/></svg></span><span><b>Cardinal Trading</b><span id="acctname">Loading&hellip;</span></span></div>
    <nav class="nav" id="nav">
      <button data-view="home" aria-current="true"><svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>Home</button>
      <button data-view="browse"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>Browse</button>
      <button data-view="watchlist"><svg viewBox="0 0 24 24"><path d="M12 17.3l-6.2 3.6 1.6-7-5.4-4.7 7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7z"/></svg>Watchlist</button>
      <button data-view="orders"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>Orders</button>
      <button data-view="recurring"><svg viewBox="0 0 24 24"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>Recurring</button>
    </nav>
    <div class="foot" id="foot"></div>
  </aside>
  <main class="main" id="main"><div class="empty">Loading your account&hellip;</div></main>
</div>
<div class="scrim" id="scrim"></div>
<div class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="dtitle">
  <div class="dh"><h2 id="dtitle"></h2><button class="x" id="dclose" aria-label="Close">&times;</button></div>
  <div class="body" id="dbody"></div>
  <div class="df" id="dfoot"></div>
</div>
<div class="auth" id="auth" role="dialog" aria-labelledby="authtitle">
  <div class="authcard">
    <div class="logo"><span class="glyph"><svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="38,30 44,4 52,30"/><circle cx="44" cy="40" r="15"/><polygon points="30,39 12,47 30,53"/><ellipse cx="58" cy="64" rx="24" ry="21"/><polygon points="72,72 98,92 86,96 66,82"/></svg></span><h1 id="authtitle">Cardinal Trading</h1></div>
    <div class="tagline">Don't ever trade alone again.</div>
    <div class="authtabs" id="authtabs">
      <button data-mode="login" aria-pressed="true">Log in</button>
      <button data-mode="signup" aria-pressed="false">Sign up</button>
    </div>
    <div class="field" id="a_namewrap" style="display:none"><label>Name</label><input id="a_name" autocomplete="name" placeholder="Rob"></div>
    <div class="field"><label>Email</label><input id="a_email" type="email" autocomplete="email" placeholder="you@example.com"></div>
    <div class="field"><label>Password</label><input id="a_password" type="password" autocomplete="current-password" placeholder="At least 8 characters"></div>
    <div class="autherr" id="a_err"></div>
    <button class="btn" id="a_submit">Log in</button>
    <button class="alink" id="a_forgot" type="button">Forgot password?</button>
    <button class="alink" id="a_back" type="button" style="display:none">&larr; Back to log in</button>
    <div class="authnote">Paper trading demo &mdash; you start with play money, and no real money ever moves.</div>
    <div class="authnote">By continuing you agree to the <a class="legallink" href="/legal/terms" target="_blank" rel="noopener">Terms</a>, <a class="legallink" href="/legal/privacy" target="_blank" rel="noopener">Privacy Policy</a>, and <a class="legallink" href="/legal/disclosures" target="_blank" rel="noopener">Risk Disclosures</a>.</div>
  </div>
</div>
<div class="toast" id="toast"></div>

<script>
"use strict";
var $=function(s,r){return (r||document).querySelector(s);};
var ACCT=null, ACCTNAME="", EMAIL="", EMAILVERIFIED=true, CARDADDR=null, view="home";
var instruments=[], quotes={}, watchlistSymbols={}, orders=[], plans=[], portfolio=null;

// ---- helpers ----
function usd(c){c=c||0;var a=Math.abs(c),sign=c<0?"-":"";
  if(a>0&&a<1)return sign+"$"+(a/100).toFixed(8).replace(/0+$/,"");
  return sign+"$"+(a/100).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtQty(n){return (Math.round((n||0)*1e6)/1e6).toString();}
function pct(bps){bps=bps||0;return (bps>=0?"+":"")+(bps/100).toFixed(2)+"%";}
// Percent signed by its own dollar figure — independent rounding must never
// print a red "-$0.11" next to a "+0.00%".
function pctOf(bps,cents){var neg=cents<0||(cents===0&&bps<0);return (neg?"-":"+")+(Math.abs(bps||0)/100).toFixed(2)+"%";}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m];});}
function cls(n){return n>0?"pos":n<0?"neg":"flat";}
function fmtDT(iso){return iso?new Date(iso).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"\\u2014";}

function api(method,path,body){
  return fetch("/api"+path,{method:method,headers:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)})
    .then(function(r){return r.text().then(function(t){
      var j=t?JSON.parse(t):null;
      if(!r.ok){
        if(r.status===401&&ACCT)showAuth(); // session expired mid-use
        var e=new Error((j&&j.error&&j.error.message)||("HTTP "+r.status)); e.status=r.status; throw e;
      }
      return j;});});
}
function toast(msg,kind){var t=$("#toast");t.textContent=msg;t.className="toast on"+(kind?" "+kind:"");clearTimeout(t._t);t._t=setTimeout(function(){t.className="toast";},2600);}

function loadAll(){
  return Promise.all([
    api("GET","/instruments"),
    api("GET","/quotes"),
    api("GET","/portfolio/"+ACCT),
    api("GET","/watchlist/"+ACCT),
    api("GET","/orders?accountId="+ACCT),
    api("GET","/plans?accountId="+ACCT),
  ]).then(function(r){
    instruments=r[0]||[];
    quotes={}; (r[1]||[]).forEach(function(q){quotes[q.symbol]=q;});
    portfolio=r[2];
    watchlistSymbols={}; (r[3]||[]).forEach(function(w){watchlistSymbols[w.symbol]=true;});
    orders=r[4]||[];
    plans=r[5]||[];
  });
}
function refresh(){return loadAll().then(render);}

// ---- auth ----
var authMode="login", resetToken=null;
function showAuth(){ACCT=null;$("#auth").classList.add("on");}
function hideAuth(){$("#auth").classList.remove("on");}
function setAuthMode(mode){
  authMode=mode;
  var tabbed=mode==="login"||mode==="signup";
  $("#authtabs").style.display=tabbed?"grid":"none";
  var tabs=$("#authtabs").querySelectorAll("button");
  for(var i=0;i<tabs.length;i++)tabs[i].setAttribute("aria-pressed",tabs[i].dataset.mode===mode?"true":"false");
  $("#a_namewrap").style.display=mode==="signup"?"block":"none";
  $("#a_email").parentNode.style.display=mode==="reset"?"none":"block";
  $("#a_password").parentNode.style.display=mode==="forgot"?"none":"block";
  $("#a_password").setAttribute("autocomplete",mode==="login"?"current-password":"new-password");
  $("#a_password").setAttribute("placeholder",mode==="reset"?"New password (8+ characters)":"At least 8 characters");
  $("#a_submit").textContent={login:"Log in",signup:"Create account",forgot:"Send reset link",reset:"Set new password"}[mode];
  $("#a_forgot").style.display=mode==="login"?"block":"none";
  $("#a_back").style.display=tabbed?"none":"block";
  $("#a_err").textContent="";
}
$("#authtabs").addEventListener("click",function(e){var b=e.target.closest("button");if(b)setAuthMode(b.dataset.mode);});
$("#a_forgot").onclick=function(){setAuthMode("forgot");};
$("#a_back").onclick=function(){setAuthMode("login");};
function authPost(path,body){
  return fetch(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)})
    .then(function(r){return r.text().then(function(t){var j=t?JSON.parse(t):null;if(!r.ok)throw new Error((j&&j.error&&j.error.message)||("HTTP "+r.status));});});
}
function submitAuth(){
  $("#a_err").textContent="";$("#a_submit").disabled=true;
  var done=function(){$("#a_submit").disabled=false;};
  var fail=function(e){$("#a_err").textContent=e.message;};
  if(authMode==="forgot"){
    authPost("/auth/forgot",{email:$("#a_email").value.trim()})
      .then(function(){toast("If that email exists, a reset link is on its way","good");setAuthMode("login");})
      .catch(fail).then(done);
    return;
  }
  if(authMode==="reset"){
    authPost("/auth/reset",{token:resetToken,password:$("#a_password").value})
      .then(function(){toast("Password updated \\u2014 log in with it","good");$("#a_password").value="";resetToken=null;setAuthMode("login");})
      .catch(fail).then(done);
    return;
  }
  var body={email:$("#a_email").value.trim(),password:$("#a_password").value};
  if(authMode==="signup")body.name=$("#a_name").value.trim();
  authPost("/auth/"+authMode,body)
    .then(function(){$("#a_password").value="";hideAuth();return boot();})
    .catch(fail).then(done);
}
$("#a_submit").onclick=submitAuth;
$("#auth").addEventListener("keydown",function(e){if(e.key==="Enter")submitAuth();});
function logout(){fetch("/auth/logout",{method:"POST"}).then(function(){location.reload();});}

// Links from emails land here with query params: ?verified=1|invalid, ?reset=TOKEN.
(function(){
  var qs=new URLSearchParams(location.search);
  if(qs.get("verified")==="1")toast("Email verified \\u2713","good");
  else if(qs.get("verified"))toast("That verification link is invalid or expired","err");
  if(qs.get("reset")){resetToken=qs.get("reset");showAuth();setAuthMode("reset");}
  if(location.search)history.replaceState(null,"",location.pathname);
})();

// ---- boot ----
function boot(){
  return api("GET","/app").then(function(app){
    ACCT=app.accountId; ACCTNAME=app.accountName||"Investor";
    EMAIL=app.email||""; EMAILVERIFIED=app.emailVerified!==false; CARDADDR=app.cardTokenAddress||null;
    $("#acctname").textContent=ACCTNAME;
    $("#foot").innerHTML="Don\u2019t ever trade alone again.<br><br>Paper account for<br><b>"+esc(ACCTNAME)+"</b><br>No real money moves.<br><a class=\\"legallink\\" href=\\"/legal/terms\\" target=\\"_blank\\" rel=\\"noopener\\">Terms</a> \u00b7 <a class=\\"legallink\\" href=\\"/legal/privacy\\" target=\\"_blank\\" rel=\\"noopener\\">Privacy</a> \u00b7 <a class=\\"legallink\\" href=\\"/legal/disclosures\\" target=\\"_blank\\" rel=\\"noopener\\">Risks</a><br><button class=\\"logout\\" id=\\"logoutbtn\\">Log out</button>";
    $("#logoutbtn").onclick=logout;
    return loadAll();
  }).then(function(){render();}).catch(function(e){
    if(e.status===401){showAuth();return;}
    $("#main").innerHTML='<div class="empty">Couldn\\'t reach the trading service.<br>'+esc(e.message)+'</div>';
  });
}
boot();
setInterval(function(){
  if(!ACCT||scrubbing)return;
  var d=$("#drawer"); if(d&&d.classList.contains("on"))return; // don't yank a trade form out from under the user
  refresh();
},6000);

// ---- nav / render ----
function setView(v){view=v;render();}
function render(){
  var b=$("#nav").querySelectorAll("button");
  for(var i=0;i<b.length;i++)b[i].setAttribute("aria-current",b[i].getAttribute("data-view")===view?"true":"false");
  ({home:vHome,browse:vBrowse,watchlist:vWatchlist,orders:vOrders,recurring:vRecurring})[view]();
}
function banner(){return EMAILVERIFIED?"":'<div class="vbanner">Verify your email \\u2014 we sent a link to <b>'+esc(EMAIL)+'</b>.<button class="btn ghost sm" data-resend>Resend email</button></div>';}
function head(title,sub,right){return banner()+'<div class="top"><div><h1>'+title+'</h1><div class="sub">'+sub+'</div></div>'+(right||"")+'</div>';}
function tile(k,v,m){return '<div class="tile"><div class="k">'+k+'</div><div class="v num">'+v+'</div><div class="m">'+m+'</div></div>';}
function avatar(sym){return '<div class="avatar">'+esc(sym.slice(0,2))+'</div>';}
function starBtn(sym){var on=!!watchlistSymbols[sym];return '<button class="star'+(on?" on":"")+'" data-star="'+sym+'" aria-label="Toggle watchlist" title="Watchlist">'+(on?"\\u2605":"\\u2606")+'</button>';}

function quoteRow(q,extra){
  var chg=q.changeBps||0;
  return '<tr class="row" data-open="'+q.symbol+'">'
    +'<td><div class="sym">'+avatar(q.symbol)+'<div><div class="who">'+esc(q.symbol)+'</div><div class="dim">'+esc(q.name)+'</div></div></div></td>'
    +(extra||"")
    +'<td class="r num">'+usd(q.priceCents)+'</td>'
    +'<td class="r num '+cls(chg)+'">'+pct(chg)+'</td>'
    +'<td style="width:40px">'+starBtn(q.symbol)+'</td></tr>';
}

var homeRange="1D";
function loadHomeChart(){
  var cfg=RANGES[homeRange];
  api("GET","/portfolio/"+ACCT+"/history?points="+cfg.points+"&intervalMinutes="+cfg.im).then(function(hist){
    var el=$("#h_chart"); if(!el)return;
    var pts=(hist||[]).map(function(p){return {atMs:p.atMs,priceCents:p.equityCents};});
    el.innerHTML=chartHtml(pts,homeRange,150);
    attachScrub("h_chart",pts,function(pt,first){
      var eqEl=$(".hero .equity"),chEl=$(".hero .chg"); if(!eqEl||!chEl)return;
      eqEl.textContent=usd(pt.priceCents);
      var d=pt.priceCents-first.priceCents;
      var bps=first.priceCents>0?Math.round(d/first.priceCents*10000):0;
      chEl.className="chg "+cls(d);
      chEl.textContent=(d>=0?"\u25B2 ":"\u25BC ")+usd(Math.abs(d))+" ("+pct(bps)+") "+homeRange;
    },function(){
      var eqEl=$(".hero .equity"),chEl=$(".hero .chg"); if(!eqEl||!chEl||!portfolio)return;
      var eq=portfolio.equityCents,dayChg=portfolio.dayChangeCents;
      var dayBps=(eq-dayChg)>0?Math.round(dayChg/(eq-dayChg)*10000):0;
      eqEl.textContent=usd(eq);
      chEl.className="chg "+cls(dayChg);
      chEl.textContent=(dayChg>=0?"\u25B2 ":"\u25BC ")+usd(Math.abs(dayChg))+" ("+pct(dayBps)+") today";
    });
  }).catch(function(){var el=$("#h_chart");if(el)el.innerHTML="";});
}
function vHome(){
  var eq=portfolio?portfolio.equityCents:0;
  var dayChg=portfolio?portfolio.dayChangeCents:0;
  var dayBps=(eq-dayChg)>0?Math.round(dayChg/(eq-dayChg)*10000):0;
  var html=head("Home","Welcome back, "+esc(ACCTNAME))
    +'<div class="hero"><div class="equity num">'+usd(eq)+'</div>'
    +'<div class="chg '+cls(dayChg)+'">'+(dayChg>=0?"\\u25B2":"\\u25BC")+' '+usd(Math.abs(dayChg))+' ('+pct(dayBps)+') today</div></div>'
    +'<div class="chartbox" id="h_chart"><div class="dim" style="padding:8px 0">Loading your chart&hellip;</div></div>'
    +'<div class="ranges" style="justify-content:flex-start;margin-bottom:22px"><div class="seg chips" id="h_ranges">'
    +Object.keys(RANGES).map(function(r){return '<button data-hrange="'+r+'" aria-pressed="'+(r===homeRange)+'">'+r+'</button>';}).join("")+'</div></div>'
    +'<div class="tiles">'
    +tile("Buying power",usd(portfolio?portfolio.cashCents:0),"Available cash")
    +tile("Market value",usd(portfolio?portfolio.marketValueCents:0),(portfolio?portfolio.positions.length:0)+" holdings")
    +tile("Unrealized P&amp;L",usd(portfolio?portfolio.unrealizedPnlCents:0),"Since purchase")
    +'</div>';
  var positions=portfolio?portfolio.positions:[];
  html+='<div class="card"><div class="hd"><h2>Your positions</h2><span class="note">'+positions.length+'</span></div>'
    +(positions.length?'<div style="overflow-x:auto"><table><thead><tr><th>Stock</th><th class="r">Shares</th><th class="r">Avg cost</th><th class="r">Price</th><th class="r">Value</th><th class="r">Gain/loss</th></tr></thead><tbody>'
      +positions.map(function(p){
        return '<tr class="row" data-open="'+p.symbol+'">'
          +'<td><div class="sym">'+avatar(p.symbol)+'<div><div class="who">'+esc(p.symbol)+'</div><div class="dim">'+esc(p.name)+'</div></div></div></td>'
          +'<td class="r num">'+fmtQty(p.quantity)+'</td>'
          +'<td class="r num">'+usd(p.avgCostCents)+'</td>'
          +'<td class="r num">'+usd(p.priceCents)+'</td>'
          +'<td class="r num">'+usd(p.marketValueCents)+'</td>'
          +'<td class="r num '+cls(p.unrealizedPnlCents)+'">'+usd(p.unrealizedPnlCents)+' ('+pctOf(p.unrealizedPnlBps,p.unrealizedPnlCents)+')</td></tr>';
      }).join("")+'</tbody></table></div>':'<div class="empty">No positions yet &mdash; browse stocks and place your first trade.</div>')
    +'</div>';
  $("#main").innerHTML=html;
  loadHomeChart();
}

function moverCard(q){
  return '<div class="mover" data-open="'+q.symbol+'"><div class="ms">'+esc(q.symbol)+'</div>'
    +'<div class="mp num">'+usd(q.priceCents)+'</div>'
    +'<div class="mp num '+cls(q.changeBps)+'">'+pctOf(q.changeBps,q.changeCents)+'</div></div>';
}
function vBrowse(){
  var list=instruments.map(function(i){return quotes[i.symbol]||{symbol:i.symbol,name:i.name,priceCents:0,changeBps:0};});
  var ranked=list.slice().sort(function(a,b){return (b.changeBps||0)-(a.changeBps||0);});
  var gainers=ranked.filter(function(q){return (q.changeBps||0)>0;}).slice(0,4);
  var losers=ranked.filter(function(q){return (q.changeBps||0)<0;}).slice(-4).reverse();
  var movers="";
  if(gainers.length)movers+='<div class="movehd">Today\u2019s gainers</div><div class="movers">'+gainers.map(moverCard).join("")+'</div>';
  if(losers.length)movers+='<div class="movehd">Today\u2019s losers</div><div class="movers">'+losers.map(moverCard).join("")+'</div>';
  function section(title,note,rows){
    return '<div class="card"><div class="hd"><h2>'+title+'</h2><span class="note">'+note+'</span></div>'
      +(rows.length?'<div style="overflow-x:auto"><table><thead><tr><th>Name</th><th class="r">Price</th><th class="r">Today</th><th></th></tr></thead><tbody>'
      +rows.map(function(q){return quoteRow(q);}).join("")+'</tbody></table></div>':'<div class="empty">Nothing here.</div>')+'</div>';
  }
  var isCrypto=function(q){var i=instFor(q.symbol);return i&&i.kind==="crypto";};
  var equities=list.filter(function(q){return !isCrypto(q);});
  var crypto=list.filter(isCrypto);
  $("#main").innerHTML=head("Browse",list.length+" assets in the mock market")+movers
    +section("Stocks &amp; ETFs",equities.length+" listed",equities)
    +section("Crypto","trades 24/7",crypto);
}

function vWatchlist(){
  var list=Object.keys(watchlistSymbols).map(function(s){return quotes[s];}).filter(Boolean);
  $("#main").innerHTML=head("Watchlist",list.length+" stocks you're tracking")
    +'<div class="card">'+(list.length?'<div style="overflow-x:auto"><table><thead><tr><th>Stock</th><th class="r">Price</th><th class="r">Today</th><th></th></tr></thead><tbody>'
      +list.map(function(q){return quoteRow(q);}).join("")+'</tbody></table></div>':'<div class="empty">Nothing here yet. Tap the star on any stock to add it.</div>')+'</div>';
}

function vOrders(){
  var list=orders.slice();
  $("#main").innerHTML=head("Orders",list.length+" total")
    +'<div class="card">'+(list.length?'<div style="overflow-x:auto"><table><thead><tr><th>Stock</th><th>Side</th><th>Type</th><th class="r">Qty</th><th class="r">Price</th><th>Status</th><th class="r">Placed</th><th class="r">Actions</th></tr></thead><tbody>'
      +list.map(function(o){
        var price=o.status==="filled"?usd(o.filledPriceCents):o.type==="limit"?usd(o.limitPriceCents)+" limit":"market";
        var acts=o.status==="open"?'<button class="btn ghost sm" data-cancel="'+o.id+'">Cancel</button>':'<span class="dim">\\u2014</span>';
        return '<tr><td class="who">'+esc(o.symbol)+'</td>'
          +'<td class="'+(o.side==="buy"?"pos":"neg")+'">'+esc(o.side)+'</td>'
          +'<td class="dim">'+esc(o.type)+'</td>'
          +'<td class="r num">'+fmtQty(o.quantity)+'</td>'
          +'<td class="r num">'+price+'</td>'
          +'<td><span class="pill '+o.status+'">'+esc(o.status)+'</span></td>'
          +'<td class="r dim">'+fmtDT(o.createdAt)+'</td>'
          +'<td class="r">'+acts+'</td></tr>';
      }).join("")+'</tbody></table></div>':'<div class="empty">No orders yet.</div>')+'</div>';
}

var CADENCE_LABEL={daily:"Daily",weekly:"Weekly",biweekly:"Every 2 weeks",monthly:"Monthly"};
function vRecurring(){
  var list=plans.slice();
  $("#main").innerHTML=head("Recurring",list.length+" plans \\u00b7 automatic dollar-based buys")
    +'<div class="card">'+(list.length?'<div style="overflow-x:auto"><table><thead><tr><th>Stock</th><th class="r">Amount</th><th>Cadence</th><th class="r">Next run</th><th class="r">Last run</th><th>Status</th><th class="r">Actions</th></tr></thead><tbody>'
      +list.map(function(p){
        var status=p.active?'<span class="pill filled">active</span>':'<span class="pill open">paused</span>';
        var lastRun=p.lastRunAt?fmtDT(p.lastRunAt)+(p.lastRunStatus==="skipped_insufficient_funds"?' <span class="neg">skipped</span>':''):"\\u2014";
        var acts='<button class="btn ghost sm" data-plantoggle="'+p.id+'" data-active="'+p.active+'">'+(p.active?"Pause":"Resume")+'</button>'
          +'<button class="btn ghost sm" data-plandelete="'+p.id+'">Delete</button>';
        return '<tr><td><div class="sym"><div class="avatar">'+esc(p.symbol.slice(0,2))+'</div><div class="who">'+esc(p.symbol)+'</div></div></td>'
          +'<td class="r num">'+usd(p.amountCents)+'</td>'
          +'<td>'+esc(CADENCE_LABEL[p.cadence]||p.cadence)+'</td>'
          +'<td class="r dim">'+(p.active?fmtDT(p.nextRunAt):"\\u2014")+'</td>'
          +'<td class="r dim">'+lastRun+'</td>'
          +'<td>'+status+'</td>'
          +'<td class="r"><div class="rowacts" style="display:flex;gap:6px;justify-content:flex-end">'+acts+'</div></td></tr>';
      }).join("")+'</tbody></table></div>'
      :'<div class="empty">No recurring investments yet. Open any stock, choose Dollars, and pick a repeat cadence.</div>')+'</div>';
}

// ---- events ----
document.addEventListener("click",function(e){
  var star=e.target.closest("[data-star]");
  if(star){toggleWatch(star.getAttribute("data-star"));return;}
  var openRow=e.target.closest("[data-open]");
  if(openRow){openStockDrawer(openRow.getAttribute("data-open"));return;}
  var t=e.target.closest("button"); if(!t)return;
  if(t.dataset.view)setView(t.dataset.view);
  else if(t.dataset.hrange){
    homeRange=t.dataset.hrange;
    var hb=$("#h_ranges").querySelectorAll("button");
    for(var hi=0;hi<hb.length;hi++)hb[hi].setAttribute("aria-pressed",hb[hi].dataset.hrange===homeRange?"true":"false");
    loadHomeChart();
  }
  else if(t.dataset.cancel)doCancel(t.dataset.cancel);
  else if(t.dataset.plantoggle){
    var action=t.dataset.active==="true"?"pause":"resume";
    api("POST","/plans/"+t.dataset.plantoggle+"/"+action,{}).then(function(){toast(action==="pause"?"Plan paused":"Plan resumed \\u2014 investing on schedule");return refresh();}).catch(function(e){toast(e.message,"err");});
  }
  else if(t.dataset.plandelete){
    fetch("/api/plans/"+t.dataset.plandelete,{method:"DELETE"}).then(function(r){
      if(!r.ok)throw new Error("HTTP "+r.status);
      toast("Recurring plan deleted");return refresh();
    }).catch(function(e){toast(e.message,"err");});
  }
  else if(t.dataset.resend!==undefined){
    t.disabled=true;
    fetch("/auth/resend-verification",{method:"POST"}).then(function(r){
      toast(r.ok?"Verification email sent":"Couldn\\u2019t send \\u2014 try again later",r.ok?"good":"err");t.disabled=false;
    });
  }
});
function toggleWatch(sym){
  var on=!!watchlistSymbols[sym];
  var call=on?fetch("/api/watchlist/"+ACCT+"/"+encodeURIComponent(sym),{method:"DELETE"}):api("POST","/watchlist/"+ACCT,{symbol:sym});
  Promise.resolve(call).then(function(){watchlistSymbols[sym]=!on;render();}).catch(function(e){toast(e.message,"err");});
}
function doCancel(id){api("POST","/orders/"+id+"/cancel",{}).then(function(){toast("Order cancelled");return refresh();}).catch(function(e){toast(e.message,"err");});}

// ---- stock detail / trade drawer ----
var drawer=$("#drawer"),scrim=$("#scrim");
function openDrawer(){drawer.classList.add("on");scrim.classList.add("on");}
function closeDrawer(){drawer.classList.remove("on");scrim.classList.remove("on");}
$("#dclose").onclick=closeDrawer;scrim.onclick=closeDrawer;
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeDrawer();});

var RANGES={"1D":{points:96,im:15},"1W":{points:84,im:120},"1M":{points:90,im:480},"3M":{points:90,im:1440}};
function chartHtml(points,range,h){
  h=h||96;
  if(!points||points.length<2)return '<div class="dim">No chart data.</div>';
  var vals=points.map(function(p){return p.priceCents;});
  var min=Math.min.apply(null,vals),max=Math.max.apply(null,vals);
  var span=(max-min)||1, w=400;
  var step=w/(points.length-1);
  var line=points.map(function(p,i){var x=i*step,y=(h-6)-((p.priceCents-min)/span)*(h-12);return x.toFixed(1)+","+y.toFixed(1);}).join(" ");
  var up=vals[vals.length-1]>=vals[0];
  var color=up?"var(--good)":"var(--crit)";
  var chgBps=vals[0]>0?Math.round((vals[vals.length-1]-vals[0])/vals[0]*10000):0;
  return '<svg class="spark" style="height:'+h+'px" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none">'
    +'<polygon points="'+line+' '+w+','+h+' 0,'+h+'" fill="'+color+'" opacity="0.08"/>'
    +'<polyline points="'+line+'" fill="none" stroke="'+color+'" stroke-width="2.2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>'
    +'<circle cx="'+w+'" cy="'+((h-6)-((vals[vals.length-1]-min)/span)*(h-12)).toFixed(1)+'" r="3.5" fill="'+color+'"/></svg>'
    +'<div class="chartmeta"><span>low '+usd(min)+'</span><span class="'+(up?"pos":"neg")+'">'+range+' \\u00b7 '+pct(chgBps)+'</span><span>high '+usd(max)+'</span></div>';
}

var scrubbing=false;
// Hover scrubbing: a crosshair + time label track the cursor, and the caller
// gets the point under it (Robinhood-style "rewind the number" behavior).
function attachScrub(boxId,points,onPoint,onLeave){
  var box=$("#"+boxId); if(!box||!points||points.length<2)return;
  var svg=box.querySelector("svg"); if(!svg)return;
  var xh=document.createElement("div");xh.className="xhair";box.appendChild(xh);
  var xl=document.createElement("div");xl.className="xlabel";box.appendChild(xl);
  function at(clientX){
    var r=svg.getBoundingClientRect(); if(!r.width)return;
    var f=Math.min(1,Math.max(0,(clientX-r.left)/r.width));
    var i=Math.round(f*(points.length-1));
    var x=(r.left-box.getBoundingClientRect().left)+f*r.width;
    scrubbing=true;
    xh.style.display="block";xh.style.left=x+"px";
    xl.style.display="block";xl.style.left=Math.min(Math.max(x,44),box.clientWidth-44)+"px";
    xl.textContent=fmtDT(new Date(points[i].atMs).toISOString());
    onPoint(points[i],points[0]);
  }
  function end(){
    scrubbing=false;
    xh.style.display="none";xl.style.display="none";
    if(onLeave)onLeave();
  }
  box.addEventListener("mousemove",function(e){at(e.clientX);});
  box.addEventListener("mouseleave",end);
  // Touch: scrub with a finger, and swallow the scroll while doing it.
  box.addEventListener("touchstart",function(e){if(e.touches[0])at(e.touches[0].clientX);},{passive:true});
  box.addEventListener("touchmove",function(e){if(e.touches[0]){at(e.touches[0].clientX);e.preventDefault();}},{passive:false});
  box.addEventListener("touchend",end);
  box.addEventListener("touchcancel",end);
}

function instFor(sym){for(var i=0;i<instruments.length;i++)if(instruments[i].symbol===sym)return instruments[i];return null;}
function positionFor(sym){
  var list=portfolio?portfolio.positions:[];
  for(var i=0;i<list.length;i++)if(list[i].symbol===sym)return list[i];
  return null;
}
// "Your position" — only rendered when the user actually holds the stock.
function positionCard(sym){
  var p=positionFor(sym); if(!p)return "";
  return '<div class="poscard"><div class="ph"><b>Your position</b>'
    +'<span class="num '+cls(p.unrealizedPnlCents)+'">'+usd(p.unrealizedPnlCents)+' ('+pctOf(p.unrealizedPnlBps,p.unrealizedPnlCents)+')</span></div>'
    +'<div class="pg">'
    +'<div><span>Shares</span><span class="num">'+fmtQty(p.quantity)+'</span></div>'
    +'<div><span>Market value</span><span class="num">'+usd(p.marketValueCents)+'</span></div>'
    +'<div><span>Average cost</span><span class="num">'+usd(p.avgCostCents)+'</span></div>'
    +'<div><span>Total cost</span><span class="num">'+usd(p.costBasisCents)+'</span></div>'
    +'</div></div>';
}
// Key stats; day low/high come from the loaded 1D series, so they fill in
// once the chart lands (hence the id the chart loader updates).
// Real CARD, the simplest possible way: two links that open Uniswap with the
// pair pre-filled — the visitor buys or sells with ETH from their OWN wallet.
// Cardinal Trading never touches funds or keys.
function realCardBlock(sym){
  if(sym!=="CARD"||!CARDADDR)return "";
  var buy="https://app.uniswap.org/swap?outputCurrency="+encodeURIComponent(CARDADDR)+"&chain=mainnet";
  var sell="https://app.uniswap.org/swap?inputCurrency="+encodeURIComponent(CARDADDR)+"&chain=mainnet";
  return '<div class="stats"><h3>Real CARD \u00b7 on-chain</h3>'
    +'<p class="dim" style="margin:0 0 10px">Buy and sell real CARD with ETH from your own wallet, directly on Uniswap. Cardinal Trading never holds your funds or keys.</p>'
    +'<div class="row2">'
    +'<a class="btn" href="'+buy+'" target="_blank" rel="noopener">Buy CARD with ETH</a>'
    +'<a class="btn ghost" href="'+sell+'" target="_blank" rel="noopener">Sell CARD for ETH</a>'
    +'</div></div>';
}
function statsBlock(sym){
  var q=quotes[sym]||{};
  var openOrders=orders.filter(function(o){return o.symbol===sym&&o.status==="open";}).length;
  return '<div class="stats"><h3>'+esc(sym)+' stats</h3><div class="sg">'
    +'<div><span>Previous close</span><span class="num">'+usd(q.previousCloseCents)+'</span></div>'
    +'<div><span>Today</span><span class="num '+cls(q.changeBps)+'">'+pctOf(q.changeBps,q.changeCents)+'</span></div>'
    +'<div><span>Day range</span><span class="num" id="d_range">&mdash;</span></div>'
    +'<div><span>Open orders</span><span class="num">'+openOrders+'</span></div>'
    +'</div></div>';
}

var tradeSide="buy", tradeType="market", tradeMode="d", chartRange="1D", currentSymbol=null;
function loadChart(sym){
  var cfg=RANGES[chartRange];
  $("#d_chart").innerHTML='<div class="dim" style="padding:8px 0">Loading chart\\u2026</div>';
  api("GET","/quotes/"+sym+"/history?points="+cfg.points+"&intervalMinutes="+cfg.im).then(function(hist){
    if(currentSymbol!==sym)return;
    $("#d_chart").innerHTML=chartHtml(hist,chartRange);
    if(chartRange==="1D"&&hist&&hist.length){
      var lows=hist.map(function(h){return h.priceCents;});
      var rEl=$("#d_range");
      if(rEl)rEl.textContent=usd(Math.min.apply(null,lows))+" \u2013 "+usd(Math.max.apply(null,lows));
    }
    var mid=$("#d_chart .chartmeta") && $("#d_chart .chartmeta").children[1];
    var orig=mid?mid.textContent:"";
    attachScrub("d_chart",hist,function(pt){ if(mid)mid.textContent=usd(pt.priceCents); },function(){ if(mid)mid.textContent=orig; });
  }).catch(function(){$("#d_chart").innerHTML="";});
}
function openStockDrawer(sym){
  currentSymbol=sym; tradeSide="buy"; tradeType="market"; tradeMode="d"; chartRange="1D";
  var q=quotes[sym]||{};
  $("#dtitle").textContent=sym;
  $("#dbody").innerHTML='<div class="quotebox"><div><div class="p num">'+usd(q.priceCents)+'</div>'
    +'<div class="c num '+cls(q.changeBps)+'">'+(q.changeCents>=0?"+":"")+usd(q.changeCents)+' ('+pct(q.changeBps)+') today</div>'
    +(function(){var inst=instFor(sym);return inst?'<div class="dim" style="margin-top:3px">'+esc(inst.name)+(inst.kind==="crypto"?" \u00b7 Crypto \u00b7 trades 24/7":"")+'</div>':"";})()+'</div>'
    +starBtn(sym)+'</div>'
    +'<div class="chartbox" id="d_chart"><div class="dim" style="padding:8px 0">Loading chart&hellip;</div></div>'
    +'<div class="ranges"><div class="seg chips" id="d_ranges">'+Object.keys(RANGES).map(function(r){return '<button data-r="'+r+'" aria-pressed="'+(r===chartRange)+'">'+r+'</button>';}).join("")+'</div></div>'
    +positionCard(sym)
    +'<div class="row2"><div class="field"><label>Action</label><div class="seg buy" id="d_side"><button data-side="buy" aria-pressed="true">Buy</button><button data-side="sell" aria-pressed="false">Sell</button></div></div>'
    +'<div class="field"><label>Order type</label><div class="seg" id="d_type"><button data-type="market" aria-pressed="true">Market</button><button data-type="limit" aria-pressed="false">Limit</button></div></div></div>'
    +'<div class="field" id="d_modewrap"><label>Invest in</label><div class="seg" id="d_mode" style="width:100%"><button data-m="d" aria-pressed="true">Dollars</button><button data-m="s" aria-pressed="false">Shares</button></div></div>'
    +'<div class="row2">'
    +'<div class="field" id="d_amtwrap"><label>Amount $</label><input id="d_amt" type="number" min="0.01" step="0.01" placeholder="100.00"></div>'
    +'<div class="field" id="d_qtywrap" style="display:none"><label>Shares</label><input id="d_qty" type="number" min="0.000001" step="any" value="1"></div>'
    +'<div class="field" id="d_limitwrap" style="display:none"><label>Limit price $</label><input id="d_limit" type="number" min="0.01" step="0.01"></div>'
    +'<div class="field" id="d_repeatwrap"><label>Repeat</label><select id="d_repeat"><option value="once">One time</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="biweekly">Every 2 weeks</option><option value="monthly">Monthly</option></select></div></div>'
    +'<div class="sumbox" id="d_sum"></div>'
    +statsBlock(sym)
    +realCardBlock(sym);
  $("#dfoot").innerHTML='<button class="btn ghost" id="d_cancel">Cancel</button><button class="btn" id="d_submit">Review order</button>';
  $("#d_cancel").onclick=closeDrawer;
  $("#d_ranges").onclick=function(e){var b=e.target.closest("button");if(!b)return;chartRange=b.dataset.r;
    var btns=$("#d_ranges").querySelectorAll("button");for(var i=0;i<btns.length;i++)btns[i].setAttribute("aria-pressed",btns[i].dataset.r===chartRange?"true":"false");
    loadChart(sym);};
  $("#d_side").onclick=function(e){var b=e.target.closest("button");if(!b)return;tradeSide=b.dataset.side;
    var btns=$("#d_side").querySelectorAll("button");for(var i=0;i<btns.length;i++)btns[i].setAttribute("aria-pressed",btns[i].dataset.side===tradeSide?"true":"false");
    $("#d_submit").className="btn"+(tradeSide==="sell"?" crit":"");
    if(tradeSide==="sell")$("#d_repeat").value="once";
    syncRepeat();updateTradeSum();};
  $("#d_type").onclick=function(e){var b=e.target.closest("button");if(!b)return;tradeType=b.dataset.type;
    var btns=$("#d_type").querySelectorAll("button");for(var i=0;i<btns.length;i++)btns[i].setAttribute("aria-pressed",btns[i].dataset.type===tradeType?"true":"false");
    // Dollar-based entry is market-only; a limit order is always in shares.
    if(tradeType==="limit"&&tradeMode==="d")setTradeMode("s");
    $("#d_modewrap").style.display=tradeType==="market"?"block":"none";
    $("#d_limitwrap").style.display=tradeType==="limit"?"block":"none";
    syncRepeat();updateTradeSum();};
  $("#d_mode").onclick=function(e){var b=e.target.closest("button");if(!b)return;setTradeMode(b.dataset.m);};
  $("#d_amt").oninput=updateTradeSum;$("#d_qty").oninput=updateTradeSum;
  var limitInput=$("#d_limit"); if(limitInput)limitInput.oninput=updateTradeSum;
  $("#d_repeat").onchange=syncRepeat;
  $("#d_submit").onclick=submitTrade;
  syncRepeat();
  updateTradeSum();
  openDrawer();
  loadChart(sym);
  $("#dbody").querySelector("[data-star]").onclick=function(e){e.stopPropagation();toggleWatch(sym);this.classList.toggle("on");this.textContent=this.classList.contains("on")?"\\u2605":"\\u2606";};
}
function setTradeMode(m){
  tradeMode=m;
  var btns=$("#d_mode").querySelectorAll("button");
  for(var i=0;i<btns.length;i++)btns[i].setAttribute("aria-pressed",btns[i].dataset.m===m?"true":"false");
  $("#d_amtwrap").style.display=m==="d"?"block":"none";
  $("#d_qtywrap").style.display=m==="s"?"block":"none";
  if(m!=="d")$("#d_repeat").value="once";
  syncRepeat();updateTradeSum();
}
// Repeat is only offered for dollar-based market buys; the button says what will happen.
function syncRepeat(){
  var eligible=tradeType==="market"&&tradeMode==="d"&&tradeSide==="buy";
  $("#d_repeatwrap").style.display=eligible?"block":"none";
  var repeating=eligible&&$("#d_repeat").value!=="once";
  $("#d_submit").textContent=repeating?"Start recurring buy":"Review order";
}
function updateTradeSum(){
  var q=quotes[currentSymbol]||{};
  var price=q.priceCents||0;
  var rows='<div class="sl"><span>Market price</span><span class="num">'+usd(price)+'</span></div>';
  if(tradeType==="market"&&tradeMode==="d"){
    var amt=Math.round(parseFloat($("#d_amt").value||"0")*100);
    var estShares=price>0?Math.round(amt/price*1e6)/1e6:0;
    rows+='<div class="sl"><span>Estimated shares</span><span class="num">\\u2248 '+fmtQty(estShares)+'</span></div>'
      +'<div class="sl t"><span>Estimated cost</span><span class="num">'+usd(amt)+'</span></div>';
  }else{
    var qty=Math.max(0,parseFloat($("#d_qty").value||"0"));
    var limit=$("#d_limit")?Math.round(parseFloat($("#d_limit").value||"0")*100):0;
    var at=tradeType==="market"?price:(limit||price);
    rows+='<div class="sl t"><span>Estimated '+(tradeType==="market"?"cost":"limit total")+'</span><span class="num">'+usd(Math.round(qty*at))+'</span></div>';
  }
  rows+='<div class="sl"><span>Buying power</span><span class="num">'+usd(portfolio?portfolio.cashCents:0)+'</span></div>';
  $("#d_sum").innerHTML=rows;
}
function submitTrade(){
  // A repeat cadence turns the dollar buy into a recurring plan (its first
  // installment executes immediately server-side).
  var repeat=$("#d_repeat")?$("#d_repeat").value:"once";
  if(tradeType==="market"&&tradeMode==="d"&&tradeSide==="buy"&&repeat!=="once"){
    var planAmt=Math.round(parseFloat($("#d_amt").value||"0")*100);
    if(planAmt<=0){toast("Enter a dollar amount","err");return;}
    $("#d_submit").disabled=true;
    api("POST","/plans",{symbol:currentSymbol,amountCents:planAmt,cadence:repeat})
      .then(function(p){toast("Recurring buy started \\u2014 "+usd(p.amountCents)+" of "+p.symbol+" "+(CADENCE_LABEL[p.cadence]||p.cadence).toLowerCase(),"good");closeDrawer();return refresh();})
      .then(function(){setView("recurring");})
      .catch(function(e){toast(e.message,"err");$("#d_submit").disabled=false;});
    return;
  }
  var body={accountId:ACCT,symbol:currentSymbol,side:tradeSide,type:tradeType};
  if(tradeType==="market"&&tradeMode==="d"){
    var amt=Math.round(parseFloat($("#d_amt").value||"0")*100);
    if(amt<=0){toast("Enter a dollar amount","err");return;}
    body.amountCents=amt;
  }else{
    var qty=parseFloat($("#d_qty").value||"0");
    if(!(qty>0)){toast("Enter a number of shares","err");return;}
    body.quantity=qty;
  }
  if(tradeType==="limit"){
    var limit=parseFloat($("#d_limit").value||"0")*100;
    limit=limit>=1?Math.round(limit):Math.round(limit*1e6)/1e6;
    if(!(limit>0)){toast("Enter a limit price","err");return;}
    body.limitPriceCents=limit;
  }
  $("#d_submit").disabled=true;
  api("POST","/orders",body).then(function(o){
    if(o.status==="filled"){toast((tradeSide==="buy"?"Bought ":"Sold ")+fmtQty(o.quantity)+" "+o.symbol+" @ "+usd(o.filledPriceCents),"good");}
    else{toast("Limit order placed \\u2014 waiting to fill","good");}
    closeDrawer();
    return refresh();
  }).catch(function(e){toast(e.message,"err");$("#d_submit").disabled=false;});
}
</script>
</body>
</html>`;
