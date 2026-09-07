/**
 * The Cardinal Books single-page app, served whole (no external assets) by the
 * BFF. Its JavaScript talks only to same-origin `/api/*`, which the server
 * proxies to the Accounting service — so every invoice, payment, and expense is
 * real and persisted upstream. The business name and company id come from
 * `GET /api/app`.
 */

export const PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Cardinal Books</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23A31B33'/%3E%3Ctext x='16' y='23' font-family='system-ui' font-size='19' font-weight='800' text-anchor='middle' fill='white'%3E%E2%82%B5%3C/text%3E%3C/svg%3E">
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
  :root[data-theme="light"]{--paper:#F7F2E6;--surface:#FFFDF7;--surface-2:#F1EAD8;--ink:#17233F;--muted:#6B6350;--line:#E2D9C3;--brand:#A31B33;--brand-strong:#7E1226;--good:#2E7D4F;--good-bg:#E4F0E8;--warn:#B0771C;--warn-bg:#F6ECD8;--crit:#B23A3A;--crit-bg:#F6E1DE;--shadow:0 1px 2px rgba(23,35,63,.07), 0 10px 26px -14px rgba(23,35,63,.24);}
  :root[data-theme="dark"]{--paper:#101627;--surface:#172033;--surface-2:#1E293C;--ink:#F3EEE1;--muted:#A9A28F;--line:#2B3855;--brand:#E2586B;--brand-strong:#F27A8B;--good:#4FBE86;--good-bg:#123020;--warn:#D6A24A;--warn-bg:#33280F;--crit:#E07B6E;--crit-bg:#3A1D1A;--shadow:0 1px 2px rgba(0,0,0,.45), 0 12px 32px -14px rgba(0,0,0,.65);}
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
  .btn:focus-visible,.nav button:focus-visible,select:focus-visible,input:focus-visible,.seg button:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
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
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  table{width:100%;border-collapse:collapse;font-size:.86rem}
  thead th{text-align:left;font-size:.68rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);font-weight:700;padding:11px 18px;border-bottom:1px solid var(--line)}
  tbody td{padding:12px 18px;border-bottom:1px solid var(--line)}
  tbody tr:last-child td{border-bottom:0}
  tbody tr:hover{background:var(--surface-2)}
  td.r,th.r{text-align:right}
  .who{font-weight:600}.dim{color:var(--muted);font-size:.8rem}
  .pill{display:inline-flex;align-items:center;gap:6px;padding:.2rem .55rem;border-radius:999px;font-size:.72rem;font-weight:700;white-space:nowrap}
  .pill::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
  .pill.paid{color:var(--good);background:var(--good-bg)}
  .pill.open{color:var(--warn);background:var(--warn-bg)}
  .pill.draft{color:var(--muted);background:var(--surface-2)}
  .pill.void{color:var(--muted);background:var(--surface-2)}
  .pill.overdue{color:var(--crit);background:var(--crit-bg)}
  .tag-overdue{color:var(--crit);font-size:.72rem;font-weight:700;margin-left:8px}
  .rowacts{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}
  .aging{display:flex;flex-direction:column;gap:10px;padding:16px 18px}
  .abar{display:flex;height:14px;border-radius:7px;overflow:hidden;background:var(--surface-2)}
  .abar i{display:block;height:100%}
  .alegend{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px 14px;margin-top:4px}
  .alegend div{font-size:.76rem;color:var(--muted);display:flex;align-items:center;gap:7px}
  .alegend b{color:var(--ink);font-variant-numeric:tabular-nums;font-family:var(--mono)}
  .dot{width:9px;height:9px;border-radius:2px;flex:none}
  .seg{display:inline-flex;background:var(--surface-2);border-radius:9px;padding:3px}
  .seg button{border:0;background:transparent;color:var(--muted);font-weight:700;font-size:.78rem;padding:.35rem .7rem;border-radius:7px;cursor:pointer}
  .seg button[aria-pressed="true"]{background:var(--surface);color:var(--ink);box-shadow:var(--shadow)}
  .pl .grp{padding:14px 18px}
  .pl .grp h3{margin:0 0 8px;font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}
  .pl .ln{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed var(--line);font-size:.88rem}
  .pl .ln:last-child{border-bottom:0}
  .pl .tot{display:flex;justify-content:space-between;padding:12px 18px;font-weight:800;border-top:1px solid var(--line)}
  .pl .net{background:var(--surface-2)}
  .pos{color:var(--good)}.neg{color:var(--crit)}
  .scrim{position:fixed;inset:0;background:rgba(10,14,26,.5);opacity:0;pointer-events:none;transition:opacity .22s}
  .scrim.on{opacity:1;pointer-events:auto}
  .drawer{position:fixed;top:0;right:0;height:100vh;width:min(560px,94vw);background:var(--surface);border-left:1px solid var(--line);box-shadow:-16px 0 40px -20px rgba(0,0,0,.5);transform:translateX(100%);transition:transform .26s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;z-index:5}
  .drawer.on{transform:none}
  .drawer .dh{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--line)}
  .drawer .dh h2{margin:0;font-size:1.05rem}
  .drawer .body{padding:18px 20px;overflow:auto;flex:1}
  .drawer .df{padding:16px 20px;border-top:1px solid var(--line);display:flex;gap:10px;justify-content:flex-end;align-items:center}
  .x{background:transparent;border:0;color:var(--muted);font-size:1.4rem;cursor:pointer;line-height:1;padding:2px 6px;border-radius:8px}
  .x:hover{background:var(--surface-2);color:var(--ink)}
  label{display:block;font-size:.72rem;font-weight:700;color:var(--muted);margin:0 0 5px;text-transform:uppercase;letter-spacing:.05em}
  .field{margin-bottom:14px}
  input,select{width:100%;padding:.56rem .6rem;border:1px solid var(--line);border-radius:9px;background:var(--paper);color:var(--ink);font:inherit}
  .row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .lines{border:1px solid var(--line);border-radius:11px;overflow:hidden;margin-bottom:6px}
  .lrow{display:grid;grid-template-columns:1fr 64px 96px 30px;gap:8px;align-items:center;padding:9px 10px;border-bottom:1px solid var(--line)}
  .lrow:last-child{border-bottom:0}
  .lrow input{padding:.4rem .5rem}.lrow .num{text-align:right}
  .lrow .del{background:transparent;border:0;color:var(--muted);cursor:pointer;font-size:1rem}
  .lrow .del:hover{color:var(--crit)}
  .lhead{background:var(--surface-2);font-size:.66rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700}
  .sumbox{margin-top:12px;background:var(--surface-2);border-radius:11px;padding:12px 14px}
  .sumbox .sl{display:flex;justify-content:space-between;font-size:.86rem;padding:3px 0}
  .sumbox .sl.t{font-weight:800;font-size:1rem;border-top:1px solid var(--line);margin-top:6px;padding-top:8px}
  .empty{padding:34px 18px;text-align:center;color:var(--muted);font-size:.88rem}
  .toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--ink);color:var(--paper);padding:.6rem 1rem;border-radius:10px;font-size:.85rem;font-weight:600;opacity:0;pointer-events:none;transition:.25s;z-index:9;box-shadow:var(--shadow)}
  .toast.on{opacity:1;transform:translateX(-50%)}
  .toast.err{background:var(--crit)}
  @media (max-width:860px){.app{grid-template-columns:1fr}.rail{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center;gap:8px}.rail .foot{display:none}.brand{padding-bottom:0}.nav{flex-direction:row;flex-wrap:wrap;margin-left:auto}.tiles{grid-template-columns:1fr 1fr}.grid2{grid-template-columns:1fr}}
  @media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head>
<body>
<div class="app">
  <aside class="rail">
    <div class="brand"><span class="glyph">&#8373;</span><span><b>Cardinal Books</b><span id="bizname">Loading…</span></span></div>
    <nav class="nav" id="nav">
      <button data-view="dashboard" aria-current="true"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>Dashboard</button>
      <button data-view="invoices"><svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/><path d="M9 13h7M9 17h5"/></svg>Invoices</button>
      <button data-view="customers"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.5a3 3 0 0 1 0 5.6M18 20a5.5 5.5 0 0 0-3-4.9"/></svg>Customers</button>
      <button data-view="expenses"><svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>Expenses</button>
      <button data-view="reports"><svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>Reports</button>
    </nav>
    <div class="foot" id="foot"></div>
  </aside>
  <main class="main" id="main"><div class="empty">Loading your books…</div></main>
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
var CO=null, BIZ="", view="dashboard";
var accounts=[], customers=[], invoices=[], expenses=[];

// ---- helpers ----
function usd(c){c=c||0;return (c<0?"-":"")+"$"+(Math.abs(c)/100).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});}
function todayISO(){return new Date().toISOString().slice(0,10);}
function dayms(s){return Date.parse(String(s).slice(0,10));}
function daysBetween(a,b){return Math.floor((dayms(b)-dayms(a))/86400000);}
function fmtDate(s){return s?new Date(String(s).slice(0,10)+"T00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"\u2014";}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m];});}
function custName(id){for(var i=0;i<customers.length;i++)if(customers[i].id===id)return customers[i].name;return "\u2014";}
function acctName(id){for(var i=0;i<accounts.length;i++)if(accounts[i].id===id)return accounts[i].name;return "Unassigned";}
function isOverdue(inv){return inv.status==="open"&&inv.balanceCents>0&&inv.dueDate&&daysBetween(inv.dueDate,todayISO())>0;}

function api(method,path,body){
  return fetch("/api"+path,{method:method,headers:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)})
    .then(function(r){return r.text().then(function(t){var j=t?JSON.parse(t):null; if(!r.ok)throw new Error((j&&j.error&&j.error.message)||("HTTP "+r.status)); return j;});});
}
function toast(msg,err){var t=$("#toast");t.textContent=msg;t.className="toast on"+(err?" err":"");clearTimeout(t._t);t._t=setTimeout(function(){t.className="toast";},2400);}

function q(){return "?companyId="+encodeURIComponent(CO);}
function loadAll(){
  return Promise.all([api("GET","/accounts"+q()),api("GET","/customers"+q()),api("GET","/invoices"+q()),api("GET","/expenses"+q())])
    .then(function(r){accounts=r[0]||[];customers=r[1]||[];invoices=r[2]||[];expenses=r[3]||[];});
}

// ---- boot ----
api("GET","/app").then(function(app){
  CO=app.companyId; BIZ=app.businessName||"Your company";
  $("#bizname").textContent=BIZ;
  $("#foot").innerHTML="Live books for<br><b>"+esc(BIZ)+"</b>";
  return loadAll();
}).then(function(){render();}).catch(function(e){
  $("#main").innerHTML='<div class="empty">Couldn\\'t reach the accounting service.<br>'+esc(e.message)+'</div>';
});

// ---- nav / render ----
function setView(v){view=v;render();}
function render(){
  var b=$("#nav").querySelectorAll("button");
  for(var i=0;i<b.length;i++)b[i].setAttribute("aria-current",b[i].getAttribute("data-view")===view?"true":"false");
  ({dashboard:vDashboard,invoices:vInvoices,customers:vCustomers,expenses:vExpenses,reports:vReports})[view]();
}
function head(title,sub,right){return '<div class="top"><div><h1>'+title+'</h1><div class="sub">'+sub+'</div></div>'+(right||"")+'</div>';}
function tile(k,v,m,accent){return '<div class="tile'+(accent?" accent":"")+'"><div class="k">'+k+'</div><div class="v num">'+v+'</div><div class="m">'+m+'</div></div>';}
function pill(inv){return isOverdue(inv)?'<span class="pill overdue">Overdue</span>':'<span class="pill '+inv.status+'">'+inv.status.charAt(0).toUpperCase()+inv.status.slice(1)+'</span>';}
var BUCKETS=[["current","Current","#2E7D4F"],["d1_30","1\\u201330 days","#B0771C"],["d31_60","31\\u201360 days","#C86A1C"],["d61_90","61\\u201390 days","#B23A3A"],["d90_plus","90+ days","#7E1226"]];

function monthRange(){var t=todayISO(),ym=t.slice(0,7),y=+ym.slice(0,4),m=+ym.slice(5,7);var last=new Date(y,m,0).getDate();return {from:ym+"-01",to:ym+"-"+String(last).padStart(2,"0")};}

function vDashboard(){
  $("#main").innerHTML=head("Dashboard","Snapshot &middot; as of "+fmtDate(todayISO()),'<button class="btn" data-new>+ New invoice</button>')+'<div id="dash"><div class="empty">Loading…</div></div>';
  var mr=monthRange();
  Promise.all([api("GET","/reports/accounts-receivable"+q()),api("GET","/reports/profit-and-loss"+q()+"&from="+mr.from+"&to="+mr.to)]).then(function(r){
    var ar=r[0],pl=r[1];
    var openInv=invoices.filter(function(i){return i.status==="open";});
    var outstanding=openInv.reduce(function(s,i){return s+i.balanceCents;},0);
    var overdue=invoices.filter(isOverdue).reduce(function(s,i){return s+i.balanceCents;},0);
    var seg=BUCKETS.map(function(x){return ar.totalCents?'<i style="width:'+(ar.buckets[x[0]]/ar.totalCents*100)+'%;background:'+x[2]+'"></i>':'';}).join("");
    var recent=invoices.filter(function(i){return i.number;}).sort(function(a,b){return (b.issueDate||"").localeCompare(a.issueDate||"");}).slice(0,5);
    $("#dash").innerHTML='<div class="tiles">'
      +tile("Outstanding A/R",usd(outstanding),openInv.length+" open invoices",true)
      +tile("Overdue",usd(overdue),overdue?"needs follow-up":"all current")
      +tile("Income \\u00b7 MTD",usd(pl.income.totalCents),"issued invoices")
      +tile("Net \\u00b7 MTD",usd(pl.netCents),"income \\u2212 expenses")+'</div>'
      +'<div class="card"><div class="hd"><h2>A/R aging</h2><span class="note">'+usd(ar.totalCents)+' outstanding</span></div>'
      +'<div class="aging"><div class="abar">'+seg+'</div><div class="alegend">'
      +BUCKETS.map(function(x){return '<div><span class="dot" style="background:'+x[2]+'"></span>'+x[1]+' \\u00b7 <b>'+usd(ar.buckets[x[0]])+'</b></div>';}).join("")+'</div></div></div>'
      +'<div class="card"><div class="hd"><h2>Recent invoices</h2><button class="btn ghost sm" data-go="invoices">View all</button></div>'+invTable(recent)+'</div>';
  }).catch(function(e){$("#dash").innerHTML='<div class="empty">'+esc(e.message)+'</div>';});
}

function invTable(list){
  if(!list.length)return '<div class="empty">No invoices yet.</div>';
  return '<div style="overflow-x:auto"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Due</th><th>Status</th><th class="r">Total</th><th class="r">Balance</th><th class="r">Actions</th></tr></thead><tbody>'
    +list.map(function(i){
      var acts=[];
      if(i.status==="draft")acts.push('<button class="btn sm" data-issue="'+i.id+'">Issue</button>');
      if(i.status==="open")acts.push('<button class="btn sm" data-pay="'+i.id+'">Record payment</button>');
      if(i.status==="draft"||i.status==="open")acts.push('<button class="btn ghost sm" data-void="'+i.id+'">Void</button>');
      return '<tr><td class="who num">'+(i.number||"\\u2014")+'</td>'
        +'<td class="who">'+esc(custName(i.customerId))+'<div class="dim">'+esc(acctName(i.incomeAccountId))+'</div></td>'
        +'<td>'+fmtDate(i.dueDate)+(isOverdue(i)?'<span class="tag-overdue">'+daysBetween(i.dueDate,todayISO())+'d late</span>':'')+'</td>'
        +'<td>'+pill(i)+'</td><td class="r num">'+usd(i.totalCents)+'</td>'
        +'<td class="r num">'+(i.balanceCents>0?usd(i.balanceCents):'<span class="dim">paid</span>')+'</td>'
        +'<td class="r"><div class="rowacts">'+(acts.join("")||'<span class="dim">\\u2014</span>')+'</div></td></tr>';
    }).join("")+'</tbody></table></div>';
}

function vInvoices(){
  var list=invoices.slice().sort(function(a,b){return (b.issueDate||"9999").localeCompare(a.issueDate||"9999");});
  $("#main").innerHTML=head("Invoices",invoices.length+" total \\u00b7 "+invoices.filter(function(i){return i.status==="open";}).length+" open",'<button class="btn" data-new>+ New invoice</button>')+'<div class="card">'+invTable(list)+'</div>';
}

function vCustomers(){
  $("#main").innerHTML=head("Customers",customers.length+" total","<button class=\\"btn\\" data-newcust>+ Add customer</button>")
    +'<div class="card">'+(customers.length?'<div style="overflow-x:auto"><table><thead><tr><th>Name</th><th>Email</th><th class="r">Open balance</th></tr></thead><tbody>'
      +customers.map(function(c){var bal=invoices.filter(function(i){return i.customerId===c.id&&i.status==="open";}).reduce(function(s,i){return s+i.balanceCents;},0);
        return '<tr><td class="who">'+esc(c.name)+'</td><td class="dim">'+esc(c.email||"\\u2014")+'</td><td class="r num">'+(bal?usd(bal):'<span class="dim">\\u2014</span>')+'</td></tr>';}).join("")
      +'</tbody></table></div>':'<div class="empty">No customers yet. Add one to start invoicing.</div>')+'</div>';
}

function vExpenses(){
  var list=expenses.slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var total=list.reduce(function(s,e){return s+e.amountCents;},0);
  $("#main").innerHTML=head("Expenses",list.length+" recorded \\u00b7 "+usd(total)+" total",'<button class="btn" data-newexp>+ Add expense</button>')
    +'<div class="card">'+(list.length?'<div style="overflow-x:auto"><table><thead><tr><th>Date</th><th>Vendor</th><th>Account</th><th class="r">Amount</th></tr></thead><tbody>'
      +list.map(function(e){return '<tr><td>'+fmtDate(e.date)+'</td><td class="who">'+esc(e.vendor)+'</td><td>'+esc(acctName(e.accountId))+'</td><td class="r num">'+usd(e.amountCents)+'</td></tr>';}).join("")
      +'</tbody></table></div>':'<div class="empty">No expenses yet.</div>')+'</div>';
}

var period="month";
function vReports(){
  $("#main").innerHTML=head("Reports",period==="month"?"This month":"All time","<div class=\\"seg\\">"+["month","This month","all","All time"].reduce(function(a,_,idx,arr){return idx%2===0?a+'<button data-period="'+arr[idx]+'" aria-pressed="'+(period===arr[idx])+'">'+arr[idx+1]+'</button>':a;},"")+"</div>")
    +'<div id="rep"><div class="empty">Loading…</div></div>';
  var extra="";
  if(period==="month"){var mr=monthRange();extra="&from="+mr.from+"&to="+mr.to;}
  Promise.all([api("GET","/reports/profit-and-loss"+q()+extra),api("GET","/reports/accounts-receivable"+q())]).then(function(r){
    var p=r[0],ar=r[1];
    $("#rep").innerHTML='<div class="grid2">'
      +'<div class="card"><div class="hd"><h2>Profit &amp; Loss</h2></div><div class="pl">'+plGroup("Income",p.income)+plGroup("Expenses",p.expenses)
      +'<div class="tot net"><span>Net income</span><span class="num '+(p.netCents>=0?"pos":"neg")+'">'+usd(p.netCents)+'</span></div></div></div>'
      +'<div class="card"><div class="hd"><h2>A/R aging</h2><span class="note">'+usd(ar.totalCents)+'</span></div><div class="pl">'
      +BUCKETS.map(function(x){return '<div class="ln" style="padding:10px 18px"><span>'+x[1]+'</span><span class="num">'+usd(ar.buckets[x[0]])+'</span></div>';}).join("")
      +'<div class="tot"><span>Total outstanding</span><span class="num">'+usd(ar.totalCents)+'</span></div></div></div></div>';
  }).catch(function(e){$("#rep").innerHTML='<div class="empty">'+esc(e.message)+'</div>';});
}
function plGroup(title,g){
  return '<div class="grp"><h3>'+title+'</h3>'+(g.lines.length?g.lines.map(function(l){return '<div class="ln"><span>'+esc(l.name)+'</span><span class="num">'+usd(l.amountCents)+'</span></div>';}).join(""):'<div class="ln dim"><span>None in period</span><span class="num">'+usd(0)+'</span></div>')
    +'<div class="ln" style="font-weight:800"><span>Total '+title.toLowerCase()+'</span><span class="num">'+usd(g.totalCents)+'</span></div></div>';
}

// ---- events ----
document.addEventListener("click",function(e){
  var t=e.target.closest("button"); if(!t)return;
  if(t.dataset.view)setView(t.dataset.view);
  else if(t.dataset.go)setView(t.dataset.go);
  else if(t.dataset.new!==undefined)openInvoiceDrawer();
  else if(t.dataset.newexp!==undefined)openExpenseDrawer();
  else if(t.dataset.newcust!==undefined)openCustomerDrawer();
  else if(t.dataset.period){period=t.dataset.period;vReports();}
  else if(t.dataset.issue)doIssue(t.dataset.issue);
  else if(t.dataset.pay)openPayDrawer(t.dataset.pay);
  else if(t.dataset.void)doVoid(t.dataset.void);
});
function refresh(){return loadAll().then(render);}
function doIssue(id){api("POST","/invoices/"+id+"/issue",{}).then(function(i){toast("Issued "+i.number);return refresh();}).catch(function(e){toast(e.message,true);});}
function doVoid(id){api("POST","/invoices/"+id+"/void",{}).then(function(){toast("Invoice voided");return refresh();}).catch(function(e){toast(e.message,true);});}

// ---- drawer ----
var drawer=$("#drawer"),scrim=$("#scrim");
function openDrawer(){drawer.classList.add("on");scrim.classList.add("on");}
function closeDrawer(){drawer.classList.remove("on");scrim.classList.remove("on");}
$("#dclose").onclick=closeDrawer;scrim.onclick=closeDrawer;
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeDrawer();});

var draftLines;
function openInvoiceDrawer(){
  var incomeAccts=accounts.filter(function(a){return a.type==="income";});
  draftLines=[{description:"",qty:1,unit:0}];
  $("#dtitle").textContent="New invoice";
  var custOpts=customers.map(function(c){return '<option value="'+c.id+'">'+esc(c.name)+'</option>';}).join("")+'<option value="__new">+ New customer\\u2026</option>';
  $("#dbody").innerHTML='<div class="row2">'
    +'<div class="field"><label>Customer</label><select id="f_cust">'+custOpts+'</select><input id="f_custnew" placeholder="New customer name" style="margin-top:8px;display:none"></div>'
    +'<div class="field"><label>Income account</label><select id="f_acct">'+incomeAccts.map(function(a){return '<option value="'+a.id+'">'+esc(a.name)+'</option>';}).join("")+'</select></div></div>'
    +'<div class="row2"><div class="field"><label>Due date</label><input id="f_due" type="date"></div><div class="field"><label>Tax rate %</label><input id="f_tax" type="number" min="0" step="0.01" value="0"></div></div>'
    +'<label>Line items</label><div class="lines" id="f_lines"></div><button class="btn ghost sm" id="f_add" type="button">+ Add line</button><div class="sumbox" id="f_sum"></div>';
  $("#dfoot").innerHTML='<button class="btn ghost" id="f_cancel">Cancel</button><button class="btn" id="f_save">Save as draft</button>';
  var due=new Date(Date.now()+30*86400000).toISOString().slice(0,10); $("#f_due").value=due;
  $("#f_cust").onchange=function(){$("#f_custnew").style.display=this.value==="__new"?"block":"none";};
  renderLines();
  $("#f_add").onclick=function(){draftLines.push({description:"",qty:1,unit:0});renderLines();};
  $("#f_tax").oninput=updateSum;$("#f_cancel").onclick=closeDrawer;$("#f_save").onclick=saveInvoice;
  openDrawer();
}
function renderLines(){
  var box=$("#f_lines");
  box.innerHTML='<div class="lrow lhead"><span>Description</span><span class="num">Qty</span><span class="num">Unit $</span><span></span></div>'
    +draftLines.map(function(l,idx){return '<div class="lrow"><input data-i="'+idx+'" data-k="description" placeholder="Consulting\\u2026" value="'+esc(l.description)+'"><input class="num" data-i="'+idx+'" data-k="qty" type="number" min="0" step="0.5" value="'+l.qty+'"><input class="num" data-i="'+idx+'" data-k="unit" type="number" min="0" step="0.01" value="'+(l.unit/100)+'"><button class="del" data-del="'+idx+'" type="button" aria-label="Remove">&times;</button></div>';}).join("");
  var ins=box.querySelectorAll("input");
  for(var i=0;i<ins.length;i++)ins[i].oninput=function(){var l=draftLines[+this.dataset.i],k=this.dataset.k;l[k]=k==="description"?this.value:k==="unit"?Math.round(parseFloat(this.value||0)*100):parseFloat(this.value||0);updateSum();};
  var dels=box.querySelectorAll("[data-del]");
  for(var j=0;j<dels.length;j++)dels[j].onclick=function(){draftLines.splice(+this.dataset.del,1);if(!draftLines.length)draftLines.push({description:"",qty:1,unit:0});renderLines();};
  updateSum();
}
function updateSum(){
  var bps=Math.round(parseFloat(($("#f_tax")||{}).value||0)*100);
  var sub=draftLines.reduce(function(s,l){return s+Math.round(l.qty*l.unit);},0),tax=Math.round(sub*bps/10000);
  $("#f_sum").innerHTML='<div class="sl"><span>Subtotal</span><span class="num">'+usd(sub)+'</span></div><div class="sl"><span>Tax</span><span class="num">'+usd(tax)+'</span></div><div class="sl t"><span>Total</span><span class="num">'+usd(sub+tax)+'</span></div>';
}
function saveInvoice(){
  var lines=draftLines.filter(function(l){return l.description.trim()&&l.qty>0;}).map(function(l){return {description:l.description.trim(),quantity:l.qty,unitPriceCents:l.unit};});
  if(!lines.length){toast("Add at least one line item",true);return;}
  var bps=Math.round(parseFloat($("#f_tax").value||0)*100);
  var custSel=$("#f_cust").value;
  var mkInvoice=function(customerId){
    return api("POST","/invoices",{companyId:CO,customerId:customerId,incomeAccountId:$("#f_acct").value,taxRateBps:bps,dueDate:$("#f_due").value||undefined,lines:lines});
  };
  var chain;
  if(custSel==="__new"){var nm=$("#f_custnew").value.trim();if(!nm){toast("Enter the new customer name",true);return;}
    chain=api("POST","/customers",{companyId:CO,name:nm}).then(function(c){return mkInvoice(c.id);});
  }else if(!custSel){toast("Pick a customer",true);return;}else{chain=mkInvoice(custSel);}
  $("#f_save").disabled=true;
  chain.then(function(){closeDrawer();toast("Draft saved");return refresh();}).then(function(){setView("invoices");}).catch(function(e){toast(e.message,true);$("#f_save").disabled=false;});
}

function openPayDrawer(id){
  var i=invoices.filter(function(x){return x.id===id;})[0];
  $("#dtitle").textContent="Record payment";
  $("#dbody").innerHTML='<div class="field"><label>Invoice</label><input value="'+esc(i.number+" \\u00b7 "+custName(i.customerId))+'" disabled></div>'
    +'<div class="sumbox"><div class="sl"><span>Total</span><span class="num">'+usd(i.totalCents)+'</span></div><div class="sl"><span>Paid to date</span><span class="num">'+usd(i.amountPaidCents)+'</span></div><div class="sl t"><span>Balance due</span><span class="num">'+usd(i.balanceCents)+'</span></div></div>'
    +'<div class="field" style="margin-top:14px"><label>Payment amount $</label><input id="p_amt" type="number" min="0.01" step="0.01" value="'+(i.balanceCents/100)+'"></div>'
    +'<div class="row2"><div class="field"><label>Method</label><select id="p_method"><option>ACH</option><option>Card</option><option>Check</option><option>Cash</option></select></div><div class="field"><label>Date</label><input id="p_date" type="date" value="'+todayISO()+'"></div></div>';
  $("#dfoot").innerHTML='<button class="btn ghost" id="p_cancel">Cancel</button><button class="btn" id="p_save">Record payment</button>';
  $("#p_cancel").onclick=closeDrawer;
  $("#p_save").onclick=function(){
    var amt=Math.round(parseFloat($("#p_amt").value||0)*100);
    if(amt<=0){toast("Enter a positive amount",true);return;}
    if(amt>i.balanceCents){toast("Payment can\\u2019t exceed the "+usd(i.balanceCents)+" balance",true);return;}
    $("#p_save").disabled=true;
    api("POST","/invoices/"+id+"/payments",{amountCents:amt,method:$("#p_method").value,receivedAt:$("#p_date").value||todayISO()})
      .then(function(inv){toast(inv.status==="paid"?inv.number+" fully paid":"Payment recorded");closeDrawer();return refresh();})
      .catch(function(e){toast(e.message,true);$("#p_save").disabled=false;});
  };
  openDrawer();
}

function openExpenseDrawer(){
  var expAccts=accounts.filter(function(a){return a.type==="expense";});
  $("#dtitle").textContent="Add expense";
  $("#dbody").innerHTML='<div class="field"><label>Vendor</label><input id="x_vendor" placeholder="Amazon Web Services"></div>'
    +'<div class="row2"><div class="field"><label>Expense account</label><select id="x_acct">'+expAccts.map(function(a){return '<option value="'+a.id+'">'+esc(a.name)+'</option>';}).join("")+'</select></div><div class="field"><label>Amount $</label><input id="x_amt" type="number" min="0.01" step="0.01" placeholder="0.00"></div></div>'
    +'<div class="field"><label>Date</label><input id="x_date" type="date" value="'+todayISO()+'"></div>';
  $("#dfoot").innerHTML='<button class="btn ghost" id="x_cancel">Cancel</button><button class="btn" id="x_save">Add expense</button>';
  $("#x_cancel").onclick=closeDrawer;
  $("#x_save").onclick=function(){
    var v=$("#x_vendor").value.trim(),amt=Math.round(parseFloat($("#x_amt").value||0)*100);
    if(!v){toast("Enter a vendor",true);return;}if(amt<=0){toast("Enter a positive amount",true);return;}
    $("#x_save").disabled=true;
    api("POST","/expenses",{companyId:CO,vendor:v,accountId:$("#x_acct").value,amountCents:amt,date:$("#x_date").value||todayISO()})
      .then(function(){toast("Expense added");closeDrawer();return refresh();}).then(function(){setView("expenses");}).catch(function(e){toast(e.message,true);$("#x_save").disabled=false;});
  };
  openDrawer();
}

function openCustomerDrawer(){
  $("#dtitle").textContent="Add customer";
  $("#dbody").innerHTML='<div class="field"><label>Name</label><input id="c_name" placeholder="Acme Co"></div><div class="field"><label>Email (optional)</label><input id="c_email" type="email" placeholder="ap@acme.com"></div>';
  $("#dfoot").innerHTML='<button class="btn ghost" id="c_cancel">Cancel</button><button class="btn" id="c_save">Add customer</button>';
  $("#c_cancel").onclick=closeDrawer;
  $("#c_save").onclick=function(){
    var nm=$("#c_name").value.trim(),em=$("#c_email").value.trim();
    if(!nm){toast("Enter a name",true);return;}
    $("#c_save").disabled=true;
    api("POST","/customers",{companyId:CO,name:nm,email:em||undefined}).then(function(){toast("Customer added");closeDrawer();return refresh();}).then(function(){setView("customers");}).catch(function(e){toast(e.message,true);$("#c_save").disabled=false;});
  };
  openDrawer();
}
</script>
</body>
</html>`;
