/**
 * The Cardinal Scout single-page app, served whole (no external assets). Its
 * JavaScript talks only to same-origin `/api/*`. Four views: Dashboard (the
 * numbers + the hot list), Scout (appraise a copy, get buy/pass), Inventory
 * (owned -> listed -> sold), and Catalog (the demand signals behind it all).
 */

export const PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Cardinal Scout</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23A31B33'/%3E%3Ctext x='16' y='23' font-family='system-ui' font-size='19' font-weight='800' text-anchor='middle' fill='white'%3E%E2%8C%95%3C/text%3E%3C/svg%3E">
<style>
  :root{
    --paper:#F7F2E6;--surface:#FFFDF7;--surface-2:#F1EAD8;--ink:#17233F;--muted:#6B6350;
    --line:#E2D9C3;--brand:#A31B33;--brand-strong:#7E1226;
    --good:#2E7D4F;--good-bg:#E4F0E8;--warn:#B0771C;--warn-bg:#F6ECD8;--crit:#B23A3A;--crit-bg:#F6E1DE;
    --shadow:0 1px 2px rgba(23,35,63,.07), 0 10px 26px -14px rgba(23,35,63,.24);
    --font:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;--radius:14px;
  }
  @media (prefers-color-scheme:dark){:root{
    --paper:#101627;--surface:#172033;--surface-2:#1E293C;--ink:#F3EEE1;--muted:#A9A28F;
    --line:#2B3855;--brand:#E2586B;--brand-strong:#F27A8B;
    --good:#4FBE86;--good-bg:#123020;--warn:#D6A24A;--warn-bg:#33280F;--crit:#E07B6E;--crit-bg:#3A1D1A;
    --shadow:0 1px 2px rgba(0,0,0,.45), 0 12px 32px -14px rgba(0,0,0,.65);}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--font);line-height:1.5;-webkit-font-smoothing:antialiased}
  .num{font-variant-numeric:tabular-nums;font-family:var(--mono)}
  button{font-family:inherit}
  .app{display:grid;grid-template-columns:236px 1fr;min-height:100vh}
  .rail{background:var(--surface);border-right:1px solid var(--line);padding:20px 16px;display:flex;flex-direction:column;gap:6px;position:sticky;top:0;height:100vh}
  .brand{display:flex;align-items:center;gap:10px;padding:4px 6px 18px}
  .glyph{width:34px;height:34px;border-radius:9px;background:var(--brand);color:#fff;display:grid;place-items:center;font-weight:800;font-size:1.1rem;box-shadow:var(--shadow)}
  .brand b{font-size:1.02rem;letter-spacing:-.01em;display:block}
  .brand span{font-size:.72rem;color:var(--muted)}
  .nav{display:flex;flex-direction:column;gap:2px}
  .nav button{display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:transparent;border:0;color:var(--muted);padding:.62rem .7rem;border-radius:10px;font-size:.9rem;font-weight:600;cursor:pointer}
  .nav button svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.7;flex:none}
  .nav button:hover{background:var(--surface-2);color:var(--ink)}
  .nav button[aria-current="true"]{background:color-mix(in srgb,var(--brand) 12%,transparent);color:var(--brand)}
  .rail .foot{margin-top:auto;font-size:.72rem;color:var(--muted);padding:6px;line-height:1.5}
  .main{padding:26px clamp(18px,3vw,40px) 60px;max-width:1120px}
  .top{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:24px;flex-wrap:wrap}
  h1{font-size:clamp(1.4rem,1.1rem+1vw,1.8rem);margin:0;letter-spacing:-.02em}
  .sub{color:var(--muted);font-size:.86rem;margin-top:3px}
  .btn{background:var(--brand);color:#fff;border:0;border-radius:10px;padding:.6rem .95rem;font-weight:700;font-size:.86rem;cursor:pointer;display:inline-flex;align-items:center;gap:7px;box-shadow:var(--shadow)}
  .btn:hover{background:var(--brand-strong)}
  .btn:disabled{opacity:.5;cursor:not-allowed}
  .btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line);box-shadow:none}
  .btn.ghost:hover{border-color:var(--brand);color:var(--brand)}
  .btn.sm{padding:.4rem .62rem;font-size:.78rem;border-radius:8px}
  .btn:focus-visible,.nav button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
  .tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}
  .tile{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:16px 17px;box-shadow:var(--shadow)}
  .tile .k{font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:700}
  .tile .v{font-size:1.5rem;font-weight:800;margin-top:8px;letter-spacing:-.02em}
  .tile .m{font-size:.75rem;color:var(--muted);margin-top:3px}
  .tile.accent{border-left:3px solid var(--brand)}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden}
  .card + .card{margin-top:18px}
  .card .hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--line)}
  .card .hd h2{font-size:.98rem;margin:0}
  .card .hd .note{font-size:.76rem;color:var(--muted)}
  table{width:100%;border-collapse:collapse;font-size:.86rem}
  thead th{text-align:left;font-size:.68rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);font-weight:700;padding:11px 18px;border-bottom:1px solid var(--line)}
  tbody td{padding:12px 18px;border-bottom:1px solid var(--line)}
  tbody tr:last-child td{border-bottom:0}
  tbody tr:hover{background:var(--surface-2)}
  td.r,th.r{text-align:right}
  .who{font-weight:600}.dim{color:var(--muted);font-size:.8rem}
  .pill{display:inline-flex;align-items:center;gap:6px;padding:.2rem .55rem;border-radius:999px;font-size:.72rem;font-weight:700;white-space:nowrap}
  .pill::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
  .pill.buy,.pill.sold,.pill.hot{color:var(--good);background:var(--good-bg)}
  .pill.listed,.pill.strong,.pill.steady{color:var(--warn);background:var(--warn-bg)}
  .pill.pass,.pill.dead{color:var(--crit);background:var(--crit-bg)}
  .pill.owned,.pill.slow{color:var(--muted);background:var(--surface-2)}
  .rowacts{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}
  .empty{padding:34px 18px;text-align:center;color:var(--muted);font-size:.88rem}
  label{display:block;font-size:.72rem;font-weight:700;color:var(--muted);margin:0 0 5px;text-transform:uppercase;letter-spacing:.05em}
  .field{margin-bottom:14px}
  input,select{width:100%;padding:.56rem .6rem;border:1px solid var(--line);border-radius:9px;background:var(--paper);color:var(--ink);font:inherit}
  .row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
  .grid2{display:grid;grid-template-columns:5fr 6fr;gap:18px;align-items:start}
  .verdict{padding:18px;text-align:center}
  .verdict .word{font-size:2rem;font-weight:900;letter-spacing:-.02em}
  .verdict .word.buy{color:var(--good)}
  .verdict .word.pass{color:var(--crit)}
  .verdict .why{color:var(--muted);font-size:.84rem;margin-top:4px}
  .math{border-top:1px solid var(--line)}
  .math .ln{display:flex;justify-content:space-between;padding:8px 18px;border-bottom:1px dashed var(--line);font-size:.87rem}
  .math .ln:last-child{border-bottom:0}
  .math .ln.t{font-weight:800;border-top:1px solid var(--line);border-bottom:0}
  .pos{color:var(--good)}.neg{color:var(--crit)}
  .score{display:inline-flex;align-items:center;gap:8px}
  .bar{width:70px;height:7px;border-radius:4px;background:var(--surface-2);overflow:hidden;display:inline-block}
  .bar i{display:block;height:100%;background:var(--brand)}
  .scrim{position:fixed;inset:0;background:rgba(10,14,26,.5);opacity:0;pointer-events:none;transition:opacity .22s}
  .scrim.on{opacity:1;pointer-events:auto}
  .drawer{position:fixed;top:0;right:0;height:100vh;width:min(520px,94vw);background:var(--surface);border-left:1px solid var(--line);box-shadow:-16px 0 40px -20px rgba(0,0,0,.5);transform:translateX(100%);transition:transform .26s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;z-index:5}
  .drawer.on{transform:none}
  .drawer .dh{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--line)}
  .drawer .dh h2{margin:0;font-size:1.05rem}
  .drawer .body{padding:18px 20px;overflow:auto;flex:1}
  .drawer .df{padding:16px 20px;border-top:1px solid var(--line);display:flex;gap:10px;justify-content:flex-end;align-items:center}
  .x{background:transparent;border:0;color:var(--muted);font-size:1.4rem;cursor:pointer;line-height:1;padding:2px 6px;border-radius:8px}
  .x:hover{background:var(--surface-2);color:var(--ink)}
  .toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--ink);color:var(--paper);padding:.6rem 1rem;border-radius:10px;font-size:.85rem;font-weight:600;opacity:0;pointer-events:none;transition:.25s;z-index:9;box-shadow:var(--shadow)}
  .toast.on{opacity:1;transform:translateX(-50%)}
  .toast.err{background:var(--crit)}
  @media (max-width:900px){.app{grid-template-columns:1fr}.rail{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center;gap:8px}.rail .foot{display:none}.brand{padding-bottom:0}.nav{flex-direction:row;flex-wrap:wrap;margin-left:auto}.tiles{grid-template-columns:1fr 1fr}.grid2{grid-template-columns:1fr}}
  @media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head>
<body>
<div class="app">
  <aside class="rail">
    <div class="brand"><span class="glyph">&#8981;</span><span><b>Cardinal Scout</b><span>Books the world wants</span></span></div>
    <nav class="nav" id="nav">
      <button data-view="dashboard" aria-current="true"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>Dashboard</button>
      <button data-view="scout"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>Scout</button>
      <button data-view="inventory"><svg viewBox="0 0 24 24"><path d="M4 4h16v4H4z"/><path d="M4 8v12h16V8"/><path d="M10 12h4"/></svg>Inventory</button>
      <button data-view="catalog"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M20 17v4H6.5a2.5 2.5 0 0 1 0-5"/></svg>Catalog</button>
    </nav>
    <div class="foot">Constantly finding the books<br>the world wants to buy.</div>
  </aside>
  <main class="main" id="main"><div class="empty">Loading&hellip;</div></main>
</div>
<div class="scrim" id="scrim"></div>
<div class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="dtitle">
  <div class="dh"><h2 id="dtitle"></h2><button class="x" id="dclose" aria-label="Close">&times;</button></div>
  <div class="body" id="dbody"></div>
  <div class="df" id="dfoot"></div>
</div>
<div class="toast" id="toast"></div>

<script>
"use strict";
var $=function(s,r){return (r||document).querySelector(s);};
var view="dashboard";
var catalog=[], scans=[], inventory=[], stats=null, lastScan=null;
var CONDITIONS=[["very-good","Very good"],["new","New"],["like-new","Like new"],["good","Good"],["acceptable","Acceptable"]];

function usd(c){c=c||0;return (c<0?"-":"")+"$"+(Math.abs(c)/100).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m];});}
function fmtDate(s){return s?new Date(s).toLocaleDateString("en-US",{month:"short",day:"numeric"}):"\\u2014";}
function condLabel(c){for(var i=0;i<CONDITIONS.length;i++)if(CONDITIONS[i][0]===c)return CONDITIONS[i][1];return c;}
function api(method,path,body){
  return fetch("/api"+path,{method:method,headers:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)})
    .then(function(r){return r.text().then(function(t){var j=t?JSON.parse(t):null; if(!r.ok)throw new Error((j&&j.error)||("HTTP "+r.status)); return j;});});
}
function toast(msg,err){var t=$("#toast");t.textContent=msg;t.className="toast on"+(err?" err":"");clearTimeout(t._t);t._t=setTimeout(function(){t.className="toast";},2400);}
function loadAll(){
  return Promise.all([api("GET","/catalog"),api("GET","/scans"),api("GET","/inventory"),api("GET","/stats")])
    .then(function(r){catalog=r[0]||[];scans=r[1]||[];inventory=r[2]||[];stats=r[3];});
}
loadAll().then(render).catch(function(e){$("#main").innerHTML='<div class="empty">'+esc(e.message)+'</div>';});

function setView(v){view=v;render();}
function render(){
  var b=$("#nav").querySelectorAll("button");
  for(var i=0;i<b.length;i++)b[i].setAttribute("aria-current",b[i].getAttribute("data-view")===view?"true":"false");
  ({dashboard:vDashboard,scout:vScout,inventory:vInventory,catalog:vCatalog})[view]();
}
function refresh(){return loadAll().then(render);}
function head(title,sub,right){return '<div class="top"><div><h1>'+title+'</h1><div class="sub">'+sub+'</div></div>'+(right||"")+'</div>';}
function tile(k,v,m,accent){return '<div class="tile'+(accent?" accent":"")+'"><div class="k">'+k+'</div><div class="v num">'+v+'</div><div class="m">'+m+'</div></div>';}
function tierPill(t){return '<span class="pill '+t+'">'+t.charAt(0).toUpperCase()+t.slice(1)+'</span>';}
function scoreCell(s){return '<span class="score"><span class="bar"><i style="width:'+s+'%"></i></span><b class="num">'+s+'</b></span>';}

function vDashboard(){
  var s=stats;
  $("#main").innerHTML=head("Dashboard","The shop at a glance",'<button class="btn" data-go="scout">&#8981; Scout a book</button>')
    +'<div class="tiles">'
    +tile("Realized profit",usd(s.realizedProfitCents),s.soldCount+" sold",true)
    +tile("Invested",usd(s.investedCents),(s.ownedCount+s.listedCount)+" copies on hand")
    +tile("Listed value",usd(s.listedValueCents),s.listedCount+" active listings")
    +tile("Scans",String(s.scanCount),s.buyCount+" buy \\u00b7 "+s.passCount+" pass")
    +'</div>'
    +'<div class="card"><div class="hd"><h2>The hot list</h2><span class="note">What the world wants right now &middot; '+catalog.length+' tracked</span></div>'+hotTable(catalog.slice(0,6))+'</div>'
    +'<div class="card"><div class="hd"><h2>Recent scans</h2><button class="btn ghost sm" data-go="scout">Scout more</button></div>'+scanTable(scans.slice(0,5))+'</div>';
}
function hotTable(list){
  if(!list.length)return '<div class="empty">Nothing tracked yet. Add demand signals in the Catalog.</div>';
  return '<div style="overflow-x:auto"><table><thead><tr><th>Book</th><th>Demand</th><th>Velocity</th><th class="r">Avg sold</th><th class="r">Rank</th></tr></thead><tbody>'
    +list.map(function(c){return '<tr><td class="who">'+esc(c.title)+'<div class="dim">'+esc(c.author)+' \\u00b7 '+c.binding+'</div></td>'
      +'<td>'+scoreCell(c.demandScore)+'</td><td>'+tierPill(c.tier)+' <span class="dim">~'+c.estDaysToSell+'d</span></td>'
      +'<td class="r num">'+usd(c.avgSoldCents)+'</td><td class="r num">'+c.salesRank.toLocaleString("en-US")+'</td></tr>';}).join("")
    +'</tbody></table></div>';
}
function scanTable(list){
  if(!list.length)return '<div class="empty">No scans yet.</div>';
  return '<div style="overflow-x:auto"><table><thead><tr><th>Book</th><th>Condition</th><th>Verdict</th><th class="r">Ask</th><th class="r">Max buy</th><th class="r">Actions</th></tr></thead><tbody>'
    +list.map(function(s){var a=s.appraisal;
      var act=a.verdict==="buy"&&!s.itemId?'<button class="btn sm" data-buy="'+s.id+'">Bought it</button>':(s.itemId?'<span class="dim">in inventory</span>':'<span class="dim">\\u2014</span>');
      return '<tr><td class="who">'+esc(a.title)+'<div class="dim">'+fmtDate(s.scannedAt)+'</div></td><td>'+condLabel(a.condition)+'</td>'
      +'<td><span class="pill '+a.verdict+'">'+(a.verdict==="buy"?"Buy":"Pass")+'</span></td>'
      +'<td class="r num">'+usd(a.askCents)+'</td><td class="r num">'+usd(a.maxBuyCents)+'</td>'
      +'<td class="r"><div class="rowacts">'+act+'</div></td></tr>';}).join("")
    +'</tbody></table></div>';
}

function vScout(){
  var opts=catalog.map(function(c){return '<option value="'+c.isbn13+'">'+esc(c.title)+' \\u00b7 '+esc(c.author)+'</option>';}).join("");
  var conds=CONDITIONS.map(function(c){return '<option value="'+c[0]+'">'+c[1]+'</option>';}).join("");
  $("#main").innerHTML=head("Scout","Appraise the copy in your hand","")
    +'<div class="grid2"><div class="card"><div class="hd"><h2>The copy in hand</h2></div><div style="padding:18px">'
    +'<div class="field"><label>Book</label><select id="s_isbn">'+(opts||'<option value="">Catalog is empty</option>')+'</select></div>'
    +'<div class="row2"><div class="field"><label>Condition</label><select id="s_cond">'+conds+'</select></div>'
    +'<div class="field"><label>Asking price $</label><input id="s_ask" type="number" min="0" step="0.01" placeholder="2.00"></div></div>'
    +'<button class="btn" id="s_go" style="width:100%">Appraise</button>'
    +'<div class="dim" style="margin-top:10px">Book not listed? Add its demand signal in the <b>Catalog</b> first.</div>'
    +'</div></div><div id="s_result">'+(lastScan?verdictCard(lastScan):'<div class="card"><div class="empty">The verdict lands here.</div></div>')+'</div></div>'
    +'<div class="card" style="margin-top:18px"><div class="hd"><h2>Recent scans</h2><span class="note">'+scans.length+' total</span></div>'+scanTable(scans.slice(0,10))+'</div>';
  $("#s_go").onclick=function(){
    var isbn=$("#s_isbn").value; if(!isbn){toast("Add a book to the catalog first",true);return;}
    var ask=Math.round(parseFloat($("#s_ask").value||0)*100);
    if(!(ask>=0)){toast("Enter an asking price",true);return;}
    $("#s_go").disabled=true;
    api("POST","/scans",{isbn13:isbn,condition:$("#s_cond").value,askCents:ask})
      .then(function(s){lastScan=s;return loadAll();}).then(function(){render();})
      .catch(function(e){toast(e.message,true);$("#s_go").disabled=false;});
  };
}
function verdictCard(s){
  var a=s.appraisal;
  var buyBtn=a.verdict==="buy"&&!s.itemId?'<div style="padding:0 18px 18px"><button class="btn" data-buy="'+s.id+'" style="width:100%">Bought it for '+usd(a.askCents)+'</button></div>':"";
  var roi=a.roiBps===null?"\\u2014":(a.roiBps/100).toFixed(0)+"%";
  return '<div class="card"><div class="verdict"><div class="word '+a.verdict+'">'+(a.verdict==="buy"?"BUY":"PASS")+'</div>'
    +'<div class="who">'+esc(a.title)+' \\u00b7 '+condLabel(a.condition)+'</div>'
    +'<div class="why">'+(a.verdict==="buy"?("Clears "+usd(a.projectedProfitCents)+" profit \\u00b7 "+roi+" ROI \\u00b7 ~"+a.estDaysToSell+" days to sell"):esc(a.reasons.join("; ")))+'</div></div>'
    +'<div class="math">'
    +'<div class="ln"><span>Demand</span><span>'+scoreCell(a.demandScore)+' '+tierPill(a.tier)+'</span></div>'
    +'<div class="ln"><span>Expected sale ('+condLabel(a.condition).toLowerCase()+')</span><span class="num">'+usd(a.expectedSaleCents)+'</span></div>'
    +'<div class="ln"><span>Marketplace fee</span><span class="num">\\u2212'+usd(a.feeCents).slice(0)+'</span></div>'
    +'<div class="ln"><span>Shipping</span><span class="num">\\u2212'+usd(a.shippingCents)+'</span></div>'
    +'<div class="ln"><span>Net proceeds</span><span class="num">'+usd(a.netProceedsCents)+'</span></div>'
    +'<div class="ln"><span>Max buy price</span><span class="num"><b>'+usd(a.maxBuyCents)+'</b></span></div>'
    +'<div class="ln t"><span>Ask '+usd(a.askCents)+' \\u2192 projected profit</span><span class="num '+(a.projectedProfitCents>=0?"pos":"neg")+'">'+usd(a.projectedProfitCents)+'</span></div>'
    +'</div>'+buyBtn+'</div>';
}

function vInventory(){
  var list=inventory;
  $("#main").innerHTML=head("Inventory",list.length+" copies \\u00b7 "+usd(stats.investedCents)+" invested \\u00b7 "+usd(stats.realizedProfitCents)+" realized",'<button class="btn" data-go="scout">&#8981; Scout a book</button>')
    +'<div class="card">'+(list.length?'<div style="overflow-x:auto"><table><thead><tr><th>Book</th><th>Condition</th><th>Status</th><th class="r">Cost</th><th class="r">Listed at</th><th class="r">Profit</th><th class="r">Actions</th></tr></thead><tbody>'
      +list.map(function(i){
        var acts=[];
        if(i.status==="owned")acts.push('<button class="btn sm" data-list="'+i.id+'">List it</button>');
        if(i.status==="listed")acts.push('<button class="btn sm" data-sold="'+i.id+'">Sold</button>');
        return '<tr><td class="who">'+esc(i.title)+'<div class="dim">bought '+fmtDate(i.boughtAt)+'</div></td>'
          +'<td>'+condLabel(i.condition)+'</td><td><span class="pill '+i.status+'">'+i.status.charAt(0).toUpperCase()+i.status.slice(1)+'</span></td>'
          +'<td class="r num">'+usd(i.costCents)+'</td>'
          +'<td class="r num">'+(i.listPriceCents?usd(i.listPriceCents):'<span class="dim">\\u2014</span>')+'</td>'
          +'<td class="r num">'+(i.status==="sold"?'<span class="'+(i.profitCents>=0?"pos":"neg")+'">'+usd(i.profitCents)+'</span>':'<span class="dim">\\u2014</span>')+'</td>'
          +'<td class="r"><div class="rowacts">'+(acts.join("")||'<span class="dim">\\u2014</span>')+'</div></td></tr>';
      }).join("")+'</tbody></table></div>':'<div class="empty">Nothing on the shelf. Scout a book and buy it.</div>')+'</div>';
}

function vCatalog(){
  $("#main").innerHTML=head("Catalog",catalog.length+" demand signals \\u00b7 most-wanted first",'<button class="btn" data-newsignal>+ Track a book</button>')
    +'<div class="card">'+(catalog.length?'<div style="overflow-x:auto"><table><thead><tr><th>Book</th><th>ISBN-13</th><th>Demand</th><th>Velocity</th><th class="r">Avg sold</th><th class="r">Low offer</th><th class="r">Rank</th><th class="r"></th></tr></thead><tbody>'
      +catalog.map(function(c){return '<tr><td class="who">'+esc(c.title)+'<div class="dim">'+esc(c.author)+' \\u00b7 '+c.binding+'</div></td>'
        +'<td class="num dim">'+c.isbn13+'</td><td>'+scoreCell(c.demandScore)+'</td><td>'+tierPill(c.tier)+'</td>'
        +'<td class="r num">'+usd(c.avgSoldCents)+'</td><td class="r num">'+(c.activeOfferCents?usd(c.activeOfferCents):'<span class="dim">\\u2014</span>')+'</td>'
        +'<td class="r num">'+c.salesRank.toLocaleString("en-US")+'</td>'
        +'<td class="r"><button class="btn ghost sm" data-edit="'+c.isbn13+'">Update</button></td></tr>';}).join("")
      +'</tbody></table></div>':'<div class="empty">No demand signals yet. Track the first book.</div>')+'</div>';
}

document.addEventListener("click",function(e){
  var t=e.target.closest("button"); if(!t)return;
  if(t.dataset.view)setView(t.dataset.view);
  else if(t.dataset.go)setView(t.dataset.go);
  else if(t.dataset.buy)doBuy(t.dataset.buy);
  else if(t.dataset.list)openListDrawer(t.dataset.list);
  else if(t.dataset.sold)doSold(t.dataset.sold);
  else if(t.dataset.newsignal!==undefined)openSignalDrawer(null);
  else if(t.dataset.edit)openSignalDrawer(t.dataset.edit);
});
function doBuy(scanId){
  api("POST","/scans/"+scanId+"/buy").then(function(i){toast("On the shelf: "+i.title);if(lastScan&&lastScan.id===scanId)lastScan.itemId=i.id;return refresh();}).catch(function(e){toast(e.message,true);});
}
function doSold(id){
  api("POST","/inventory/"+id+"/sold",{}).then(function(i){toast("Sold \\u00b7 "+usd(i.profitCents)+" profit");return refresh();}).catch(function(e){toast(e.message,true);});
}

var drawer=$("#drawer"),scrim=$("#scrim");
function openDrawer(){drawer.classList.add("on");scrim.classList.add("on");}
function closeDrawer(){drawer.classList.remove("on");scrim.classList.remove("on");}
$("#dclose").onclick=closeDrawer;scrim.onclick=closeDrawer;
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeDrawer();});

function openListDrawer(id){
  var item=null;for(var i=0;i<inventory.length;i++)if(inventory[i].id===id)item=inventory[i];
  if(!item)return;
  $("#dtitle").textContent="List for sale";
  $("#dbody").innerHTML='<div class="field"><label>Book</label><input value="'+esc(item.title+" \\u00b7 "+condLabel(item.condition))+'" disabled></div>'
    +'<div class="field"><label>List price $</label><input id="l_price" type="number" min="0.01" step="0.01"></div>'
    +'<div class="dim">Cost was '+usd(item.costCents)+'. A 15% fee + $3.50 shipping comes out at sale time.</div>';
  $("#dfoot").innerHTML='<button class="btn ghost" id="l_cancel">Cancel</button><button class="btn" id="l_save">List it</button>';
  $("#l_cancel").onclick=closeDrawer;
  $("#l_save").onclick=function(){
    var p=Math.round(parseFloat($("#l_price").value||0)*100);
    if(p<=0){toast("Enter a list price",true);return;}
    $("#l_save").disabled=true;
    api("POST","/inventory/"+id+"/list",{priceCents:p}).then(function(){toast("Listed");closeDrawer();return refresh();}).catch(function(e){toast(e.message,true);$("#l_save").disabled=false;});
  };
  openDrawer();
}

function openSignalDrawer(isbn){
  var c=null;if(isbn)for(var i=0;i<catalog.length;i++)if(catalog[i].isbn13===isbn)c=catalog[i];
  $("#dtitle").textContent=c?"Update demand signal":"Track a book";
  $("#dbody").innerHTML='<div class="field"><label>ISBN-13</label><input id="g_isbn" placeholder="9780000000000" value="'+(c?c.isbn13:"")+'"'+(c?" disabled":"")+'></div>'
    +'<div class="field"><label>Title</label><input id="g_title" value="'+esc(c?c.title:"")+'"></div>'
    +'<div class="row2"><div class="field"><label>Author</label><input id="g_author" value="'+esc(c?c.author:"")+'"></div>'
    +'<div class="field"><label>Binding</label><select id="g_binding"><option value="paperback"'+(c&&c.binding==="paperback"?" selected":"")+'>Paperback</option><option value="hardcover"'+(c&&c.binding==="hardcover"?" selected":"")+'>Hardcover</option></select></div></div>'
    +'<div class="row3"><div class="field"><label>Sales rank</label><input id="g_rank" type="number" min="1" step="1" value="'+(c?c.salesRank:"")+'"></div>'
    +'<div class="field"><label>Avg sold $</label><input id="g_avg" type="number" min="0.01" step="0.01" value="'+(c?(c.avgSoldCents/100):"")+'"></div>'
    +'<div class="field"><label>Low offer $</label><input id="g_offer" type="number" min="0.01" step="0.01" value="'+(c&&c.activeOfferCents?(c.activeOfferCents/100):"")+'"></div></div>'
    +'<div class="dim">Rank and prices come from wherever you scout \\u2014 keep them fresh and the verdicts stay honest.</div>';
  $("#dfoot").innerHTML='<button class="btn ghost" id="g_cancel">Cancel</button><button class="btn" id="g_save">'+(c?"Update":"Track it")+'</button>';
  $("#g_cancel").onclick=closeDrawer;
  $("#g_save").onclick=function(){
    var offer=parseFloat($("#g_offer").value||0);
    var body={isbn13:$("#g_isbn").value.trim(),title:$("#g_title").value.trim(),author:$("#g_author").value.trim(),
      binding:$("#g_binding").value,salesRank:parseInt($("#g_rank").value||0,10),
      avgSoldCents:Math.round(parseFloat($("#g_avg").value||0)*100),
      activeOfferCents:offer>0?Math.round(offer*100):undefined};
    $("#g_save").disabled=true;
    api("POST","/catalog",body).then(function(){toast(c?"Signal updated":"Now tracking");closeDrawer();return refresh();}).catch(function(e){toast(e.message,true);$("#g_save").disabled=false;});
  };
  openDrawer();
}
</script>
</body>
</html>`;
