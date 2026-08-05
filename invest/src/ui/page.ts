/**
 * The Invest single-page app, served whole (no external assets) by the BFF.
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
<title>Invest</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%2300C805'/%3E%3Cpath d='M8 20l6-8 4 5 6-9' stroke='%23000' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
<style>
  :root{
    --bg:#000;--surface:#151515;--surface-2:#1f1f1f;--ink:#fff;--muted:#8a8d91;
    --line:#262626;--brand:#00C805;--brand-ink:#000;
    --good:#00C805;--good-bg:#0c2410;--crit:#FF5000;--crit-bg:#2b1206;
    --shadow:0 1px 2px rgba(0,0,0,.4), 0 10px 26px -14px rgba(0,0,0,.6);
    --font:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;--radius:14px;
  }
  @media (prefers-color-scheme:light){:root{
    --bg:#fff;--surface:#f7f7f8;--surface-2:#eee;--ink:#000;--muted:#6b6f76;
    --line:#e3e3e5;--good-bg:#e4f9e6;--crit-bg:#ffe9e0;
    --shadow:0 1px 2px rgba(0,0,0,.06), 0 10px 26px -14px rgba(0,0,0,.18);}}
  :root[data-theme="light"]{--bg:#fff;--surface:#f7f7f8;--surface-2:#eee;--ink:#000;--muted:#6b6f76;--line:#e3e3e5;--good-bg:#e4f9e6;--crit-bg:#ffe9e0;--shadow:0 1px 2px rgba(0,0,0,.06), 0 10px 26px -14px rgba(0,0,0,.18);}
  :root[data-theme="dark"]{--bg:#000;--surface:#151515;--surface-2:#1f1f1f;--ink:#fff;--muted:#8a8d91;--line:#262626;--good-bg:#0c2410;--crit-bg:#2b1206;--shadow:0 1px 2px rgba(0,0,0,.4), 0 10px 26px -14px rgba(0,0,0,.6);}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font);line-height:1.5;-webkit-font-smoothing:antialiased}
  .num{font-variant-numeric:tabular-nums;font-family:var(--mono)}
  button{font-family:inherit}
  .app{display:grid;grid-template-columns:224px 1fr;min-height:100vh}
  .rail{background:var(--surface);border-right:1px solid var(--line);padding:20px 16px;display:flex;flex-direction:column;gap:6px;position:sticky;top:0;height:100vh}
  .brand{display:flex;align-items:center;gap:10px;padding:4px 6px 18px}
  .glyph{width:34px;height:34px;border-radius:9px;background:var(--brand);color:#000;display:grid;place-items:center;font-weight:800;font-size:1.1rem;box-shadow:var(--shadow)}
  .brand b{font-size:1.02rem;letter-spacing:-.01em;display:block}
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
  .spark{width:100%;height:64px;display:block;margin-bottom:16px}
  .auth{position:fixed;inset:0;background:var(--bg);display:none;align-items:center;justify-content:center;z-index:8;padding:20px}
  .auth.on{display:flex}
  .authcard{width:min(400px,94vw);background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:28px}
  .authcard .logo{display:flex;align-items:center;gap:10px;margin-bottom:18px}
  .authcard h1{font-size:1.3rem;margin:0}
  .authtabs{display:grid;grid-template-columns:1fr 1fr;background:var(--surface-2);border-radius:10px;padding:3px;margin-bottom:18px}
  .authtabs button{border:0;background:transparent;color:var(--muted);font-weight:700;font-size:.86rem;padding:.5rem;border-radius:8px;cursor:pointer}
  .authtabs button[aria-pressed="true"]{background:var(--surface);color:var(--ink);box-shadow:var(--shadow)}
  .autherr{color:var(--crit);font-size:.82rem;font-weight:600;min-height:1.2em;margin:6px 0 10px}
  .authnote{color:var(--muted);font-size:.74rem;margin-top:14px;text-align:center}
  .auth .btn{width:100%;justify-content:center;padding:.7rem}
  .foot .logout{background:transparent;border:0;color:var(--muted);cursor:pointer;padding:0;font-size:.72rem;text-decoration:underline}
  .foot .logout:hover{color:var(--crit)}
  .toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--ink);color:var(--bg);padding:.6rem 1rem;border-radius:10px;font-size:.85rem;font-weight:600;opacity:0;pointer-events:none;transition:.25s;z-index:9;box-shadow:var(--shadow)}
  .toast.on{opacity:1;transform:translateX(-50%)}
  .toast.err{background:var(--crit);color:#fff}
  .toast.good{background:var(--good);color:#000}
  @media (max-width:860px){.app{grid-template-columns:1fr}.rail{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center;gap:8px}.rail .foot{display:none}.brand{padding-bottom:0}.nav{flex-direction:row;flex-wrap:wrap;margin-left:auto}.tiles{grid-template-columns:1fr}}
  @media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head>
<body>
<div class="app">
  <aside class="rail">
    <div class="brand"><span class="glyph">&#8599;</span><span><b>Invest</b><span id="acctname">Loading&hellip;</span></span></div>
    <nav class="nav" id="nav">
      <button data-view="home" aria-current="true"><svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>Home</button>
      <button data-view="browse"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>Browse</button>
      <button data-view="watchlist"><svg viewBox="0 0 24 24"><path d="M12 17.3l-6.2 3.6 1.6-7-5.4-4.7 7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7z"/></svg>Watchlist</button>
      <button data-view="orders"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>Orders</button>
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
    <div class="logo"><span class="glyph">&#8599;</span><h1 id="authtitle">Invest</h1></div>
    <div class="authtabs" id="authtabs">
      <button data-mode="login" aria-pressed="true">Log in</button>
      <button data-mode="signup" aria-pressed="false">Sign up</button>
    </div>
    <div class="field" id="a_namewrap" style="display:none"><label>Name</label><input id="a_name" autocomplete="name" placeholder="Rob"></div>
    <div class="field"><label>Email</label><input id="a_email" type="email" autocomplete="email" placeholder="you@example.com"></div>
    <div class="field"><label>Password</label><input id="a_password" type="password" autocomplete="current-password" placeholder="At least 8 characters"></div>
    <div class="autherr" id="a_err"></div>
    <button class="btn" id="a_submit">Log in</button>
    <div class="authnote">Paper trading demo &mdash; you start with play money, and no real money ever moves.</div>
  </div>
</div>
<div class="toast" id="toast"></div>

<script>
"use strict";
var $=function(s,r){return (r||document).querySelector(s);};
var ACCT=null, ACCTNAME="", view="home";
var instruments=[], quotes={}, watchlistSymbols={}, orders=[], portfolio=null;

// ---- helpers ----
function usd(c){c=c||0;return (c<0?"-":"")+"$"+(Math.abs(c)/100).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});}
function pct(bps){bps=bps||0;return (bps>=0?"+":"")+(bps/100).toFixed(2)+"%";}
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
  ]).then(function(r){
    instruments=r[0]||[];
    quotes={}; (r[1]||[]).forEach(function(q){quotes[q.symbol]=q;});
    portfolio=r[2];
    watchlistSymbols={}; (r[3]||[]).forEach(function(w){watchlistSymbols[w.symbol]=true;});
    orders=r[4]||[];
  });
}
function refresh(){return loadAll().then(render);}

// ---- auth ----
var authMode="login";
function showAuth(){ACCT=null;$("#auth").classList.add("on");}
function hideAuth(){$("#auth").classList.remove("on");}
function setAuthMode(mode){
  authMode=mode;
  var tabs=$("#authtabs").querySelectorAll("button");
  for(var i=0;i<tabs.length;i++)tabs[i].setAttribute("aria-pressed",tabs[i].dataset.mode===mode?"true":"false");
  $("#a_namewrap").style.display=mode==="signup"?"block":"none";
  $("#a_password").setAttribute("autocomplete",mode==="signup"?"new-password":"current-password");
  $("#a_submit").textContent=mode==="signup"?"Create account":"Log in";
  $("#a_err").textContent="";
}
$("#authtabs").addEventListener("click",function(e){var b=e.target.closest("button");if(b)setAuthMode(b.dataset.mode);});
function submitAuth(){
  var body={email:$("#a_email").value.trim(),password:$("#a_password").value};
  if(authMode==="signup")body.name=$("#a_name").value.trim();
  $("#a_err").textContent="";$("#a_submit").disabled=true;
  fetch("/auth/"+authMode,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)})
    .then(function(r){return r.text().then(function(t){var j=t?JSON.parse(t):null;if(!r.ok)throw new Error((j&&j.error&&j.error.message)||("HTTP "+r.status));});})
    .then(function(){$("#a_password").value="";hideAuth();return boot();})
    .catch(function(e){$("#a_err").textContent=e.message;})
    .then(function(){$("#a_submit").disabled=false;});
}
$("#a_submit").onclick=submitAuth;
$("#auth").addEventListener("keydown",function(e){if(e.key==="Enter")submitAuth();});
function logout(){fetch("/auth/logout",{method:"POST"}).then(function(){location.reload();});}

// ---- boot ----
function boot(){
  return api("GET","/app").then(function(app){
    ACCT=app.accountId; ACCTNAME=app.accountName||"Investor";
    $("#acctname").textContent=ACCTNAME;
    $("#foot").innerHTML="Paper trading for<br><b>"+esc(ACCTNAME)+"</b><br>No real money moves.<br><button class=\\"logout\\" id=\\"logoutbtn\\">Log out</button>";
    $("#logoutbtn").onclick=logout;
    return loadAll();
  }).then(function(){render();}).catch(function(e){
    if(e.status===401){showAuth();return;}
    $("#main").innerHTML='<div class="empty">Couldn\\'t reach the trading service.<br>'+esc(e.message)+'</div>';
  });
}
boot();
setInterval(function(){ if(ACCT) refresh(); },15000);

// ---- nav / render ----
function setView(v){view=v;render();}
function render(){
  var b=$("#nav").querySelectorAll("button");
  for(var i=0;i<b.length;i++)b[i].setAttribute("aria-current",b[i].getAttribute("data-view")===view?"true":"false");
  ({home:vHome,browse:vBrowse,watchlist:vWatchlist,orders:vOrders})[view]();
}
function head(title,sub,right){return '<div class="top"><div><h1>'+title+'</h1><div class="sub">'+sub+'</div></div>'+(right||"")+'</div>';}
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

function vHome(){
  var eq=portfolio?portfolio.equityCents:0;
  var dayChg=portfolio?portfolio.dayChangeCents:0;
  var dayBps=(eq-dayChg)>0?Math.round(dayChg/(eq-dayChg)*10000):0;
  var html=head("Home","Welcome back, "+esc(ACCTNAME))
    +'<div class="hero"><div class="equity num">'+usd(eq)+'</div>'
    +'<div class="chg '+cls(dayChg)+'">'+(dayChg>=0?"\\u25B2":"\\u25BC")+' '+usd(Math.abs(dayChg))+' ('+pct(dayBps)+') today</div></div>'
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
          +'<td class="r num">'+p.quantity+'</td>'
          +'<td class="r num">'+usd(p.avgCostCents)+'</td>'
          +'<td class="r num">'+usd(p.priceCents)+'</td>'
          +'<td class="r num">'+usd(p.marketValueCents)+'</td>'
          +'<td class="r num '+cls(p.unrealizedPnlCents)+'">'+usd(p.unrealizedPnlCents)+' ('+pct(p.unrealizedPnlBps)+')</td></tr>';
      }).join("")+'</tbody></table></div>':'<div class="empty">No positions yet &mdash; browse stocks and place your first trade.</div>')
    +'</div>';
  $("#main").innerHTML=html;
}

function vBrowse(){
  var list=instruments.map(function(i){return quotes[i.symbol]||{symbol:i.symbol,name:i.name,priceCents:0,changeBps:0};});
  $("#main").innerHTML=head("Browse",list.length+" stocks in the mock market")
    +'<div class="card">'+(list.length?'<div style="overflow-x:auto"><table><thead><tr><th>Stock</th><th class="r">Price</th><th class="r">Today</th><th></th></tr></thead><tbody>'
      +list.map(function(q){return quoteRow(q);}).join("")+'</tbody></table></div>':'<div class="empty">No instruments.</div>')+'</div>';
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
          +'<td class="r num">'+o.quantity+'</td>'
          +'<td class="r num">'+price+'</td>'
          +'<td><span class="pill '+o.status+'">'+esc(o.status)+'</span></td>'
          +'<td class="r dim">'+fmtDT(o.createdAt)+'</td>'
          +'<td class="r">'+acts+'</td></tr>';
      }).join("")+'</tbody></table></div>':'<div class="empty">No orders yet.</div>')+'</div>';
}

// ---- events ----
document.addEventListener("click",function(e){
  var star=e.target.closest("[data-star]");
  if(star){toggleWatch(star.getAttribute("data-star"));return;}
  var openRow=e.target.closest("[data-open]");
  if(openRow){openStockDrawer(openRow.getAttribute("data-open"));return;}
  var t=e.target.closest("button"); if(!t)return;
  if(t.dataset.view)setView(t.dataset.view);
  else if(t.dataset.cancel)doCancel(t.dataset.cancel);
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

function sparkSvg(points){
  if(!points||points.length<2)return "";
  var vals=points.map(function(p){return p.priceCents;});
  var min=Math.min.apply(null,vals),max=Math.max.apply(null,vals);
  var range=(max-min)||1, w=400, h=64;
  var step=w/(points.length-1);
  var pts=points.map(function(p,i){var x=i*step,y=h-((p.priceCents-min)/range)*h;return x.toFixed(1)+","+y.toFixed(1);}).join(" ");
  var color=points[points.length-1].priceCents>=points[0].priceCents?"var(--good)":"var(--crit)";
  return '<svg class="spark" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>';
}

var tradeSide="buy", tradeType="market", currentSymbol=null;
function openStockDrawer(sym){
  currentSymbol=sym; tradeSide="buy"; tradeType="market";
  var q=quotes[sym]||{};
  $("#dtitle").textContent=sym;
  $("#dbody").innerHTML='<div class="quotebox"><div><div class="p num">'+usd(q.priceCents)+'</div>'
    +'<div class="c num '+cls(q.changeBps)+'">'+(q.changeCents>=0?"+":"")+usd(q.changeCents)+' ('+pct(q.changeBps)+') today</div></div>'
    +starBtn(sym)+'</div>'
    +'<div id="d_chart"><div class="dim" style="padding:8px 0">Loading chart&hellip;</div></div>'
    +'<div class="field"><label>Action</label><div class="seg buy" id="d_side"><button data-side="buy" aria-pressed="true">Buy</button><button data-side="sell" aria-pressed="false">Sell</button></div></div>'
    +'<div class="field"><label>Order type</label><div class="seg" id="d_type"><button data-type="market" aria-pressed="true">Market</button><button data-type="limit" aria-pressed="false">Limit</button></div></div>'
    +'<div class="row2"><div class="field"><label>Shares</label><input id="d_qty" type="number" min="1" step="1" value="1"></div>'
    +'<div class="field" id="d_limitwrap" style="display:none"><label>Limit price $</label><input id="d_limit" type="number" min="0.01" step="0.01"></div></div>'
    +'<div class="sumbox" id="d_sum"></div>';
  $("#dfoot").innerHTML='<button class="btn ghost" id="d_cancel">Cancel</button><button class="btn" id="d_submit">Review order</button>';
  $("#d_cancel").onclick=closeDrawer;
  $("#d_side").onclick=function(e){var b=e.target.closest("button");if(!b)return;tradeSide=b.dataset.side;
    var btns=$("#d_side").querySelectorAll("button");for(var i=0;i<btns.length;i++)btns[i].setAttribute("aria-pressed",btns[i].dataset.side===tradeSide?"true":"false");
    $("#d_submit").className="btn"+(tradeSide==="sell"?" crit":"");$("#d_submit").textContent=tradeSide==="buy"?"Review order":"Review order";
    updateTradeSum();};
  $("#d_type").onclick=function(e){var b=e.target.closest("button");if(!b)return;tradeType=b.dataset.type;
    var btns=$("#d_type").querySelectorAll("button");for(var i=0;i<btns.length;i++)btns[i].setAttribute("aria-pressed",btns[i].dataset.type===tradeType?"true":"false");
    $("#d_limitwrap").style.display=tradeType==="limit"?"block":"none";
    updateTradeSum();};
  $("#d_qty").oninput=updateTradeSum;
  $("#d_submit").onclick=submitTrade;
  updateTradeSum();
  openDrawer();
  api("GET","/quotes/"+sym+"/history?points=48&intervalMinutes=15").then(function(hist){
    $("#d_chart").innerHTML=sparkSvg(hist)||'<div class="dim">No chart data.</div>';
  }).catch(function(){$("#d_chart").innerHTML="";});
  $("#dbody").querySelector("[data-star]").onclick=function(e){e.stopPropagation();toggleWatch(sym);this.classList.toggle("on");this.textContent=this.classList.contains("on")?"\\u2605":"\\u2606";};
}
function updateTradeSum(){
  var q=quotes[currentSymbol]||{};
  var qty=Math.max(0,parseInt($("#d_qty").value||"0",10));
  var limit=$("#d_limit")?Math.round(parseFloat($("#d_limit").value||"0")*100):0;
  var price=tradeType==="market"?(q.priceCents||0):(limit||q.priceCents||0);
  var est=qty*price;
  $("#d_sum").innerHTML='<div class="sl"><span>Market price</span><span class="num">'+usd(q.priceCents)+'</span></div>'
    +'<div class="sl t"><span>Estimated '+(tradeType==="market"?"cost":"limit total")+'</span><span class="num">'+usd(est)+'</span></div>'
    +'<div class="sl"><span>Buying power</span><span class="num">'+usd(portfolio?portfolio.cashCents:0)+'</span></div>';
}
function submitTrade(){
  var qty=Math.max(0,parseInt($("#d_qty").value||"0",10));
  if(!qty){toast("Enter a number of shares","err");return;}
  var body={accountId:ACCT,symbol:currentSymbol,side:tradeSide,type:tradeType,quantity:qty};
  if(tradeType==="limit"){
    var limit=Math.round(parseFloat($("#d_limit").value||"0")*100);
    if(!limit){toast("Enter a limit price","err");return;}
    body.limitPriceCents=limit;
  }
  $("#d_submit").disabled=true;
  api("POST","/orders",body).then(function(o){
    if(o.status==="filled"){toast((tradeSide==="buy"?"Bought ":"Sold ")+o.quantity+" "+o.symbol+" @ "+usd(o.filledPriceCents),"good");}
    else{toast("Limit order placed \\u2014 waiting to fill","good");}
    closeDrawer();
    return refresh();
  }).catch(function(e){toast(e.message,"err");$("#d_submit").disabled=false;});
}
</script>
</body>
</html>`;
