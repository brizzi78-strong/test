/**
 * The live schedule single-page app, served as one self-contained document.
 * It talks only to this server's `/api/*` (proxied to Booking). Design tokens
 * mirror the Cardinal HR palette.
 */

export const PAGE: string = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Cardinal HR — Live Schedule</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23A31B33'/%3E%3Ctext x='16' y='23' font-family='system-ui' font-size='20' font-weight='900' text-anchor='middle' fill='white'%3EC%3C/text%3E%3C/svg%3E">
<style>
  :root{--paper:#F7F2E6;--surface:#FFFDF7;--surface-2:#EFE7D3;--ink:#17233F;--muted:#6B6350;--line:#E2D9C3;
    --brand:#A31B33;--brand-strong:#7E1226;--good:#2E7D4F;--good-bg:#E4F0E8;--warn:#9A6410;--warn-bg:#F6ECD6;
    --crit:#B23A3A;--crit-bg:#F6E1DE;--shadow:0 1px 2px rgba(23,35,63,.07),0 10px 26px -14px rgba(23,35,63,.24);
    --font:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;--maxw:960px;--r:13px;}
  @media (prefers-color-scheme:dark){:root{--paper:#101627;--surface:#172033;--surface-2:#1F2A42;--ink:#F3EEE1;
    --muted:#A9A28F;--line:#2B3855;--brand:#E2586B;--brand-strong:#F27A8B;--good:#4FBE86;--good-bg:#12321f;
    --warn:#D6A24A;--warn-bg:#33280f;--crit:#E07B6E;--crit-bg:#3a1d1a;--shadow:0 1px 2px rgba(0,0,0,.45),0 12px 32px -14px rgba(0,0,0,.65);}}
  :root[data-theme="light"]{--paper:#F7F2E6;--surface:#FFFDF7;--surface-2:#EFE7D3;--ink:#17233F;--muted:#6B6350;--line:#E2D9C3;--brand:#A31B33;--brand-strong:#7E1226;--good:#2E7D4F;--good-bg:#E4F0E8;--warn:#9A6410;--warn-bg:#F6ECD6;--crit:#B23A3A;--crit-bg:#F6E1DE;}
  :root[data-theme="dark"]{--paper:#101627;--surface:#172033;--surface-2:#1F2A42;--ink:#F3EEE1;--muted:#A9A28F;--line:#2B3855;--brand:#E2586B;--brand-strong:#F27A8B;--good:#4FBE86;--good-bg:#12321f;--warn:#D6A24A;--warn-bg:#33280f;--crit:#E07B6E;--crit-bg:#3a1d1a;}
  *{box-sizing:border-box;} body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--font);line-height:1.45;}
  .wrap{max-width:var(--maxw);margin-inline:auto;padding:0 clamp(.8rem,3vw,1.4rem) 3rem;}
  header.top{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--paper) 88%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);}
  .top-in{max-width:var(--maxw);margin-inline:auto;padding:.7rem clamp(.8rem,3vw,1.4rem);display:flex;align-items:center;gap:.6rem;}
  .logo{width:30px;height:30px;border-radius:8px;background:var(--brand);color:#fff;font-weight:900;display:grid;place-items:center;}
  h1{font-size:1.05rem;margin:0;font-weight:800;} h1 small{display:block;font-weight:600;font-size:.7rem;color:var(--muted);}
  .theme{margin-left:auto;background:transparent;border:1px solid var(--line);border-radius:8px;color:var(--ink);padding:.35rem .55rem;cursor:pointer;}
  .banner{display:none;padding:.6rem .8rem;border-radius:10px;margin:.7rem 0;font-size:.86rem;}
  .banner.show{display:block;} .banner.err{background:var(--crit-bg);border:1px solid var(--crit);} .banner.ok{background:var(--good-bg);border:1px solid var(--good);}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--shadow);padding:1rem 1.1rem;margin:.85rem 0;}
  h2{font-size:1rem;margin:.1rem 0 .5rem;} .hint{color:var(--muted);font-size:.82rem;margin:.1rem 0 .7rem;}
  label{display:block;font-size:.72rem;font-weight:700;color:var(--muted);margin:.5rem 0 .18rem;}
  input,select{width:100%;padding:.5rem .55rem;border:1px solid var(--line);border-radius:9px;background:var(--paper);color:var(--ink);font:inherit;}
  input:focus,select:focus{outline:2px solid var(--brand);outline-offset:1px;}
  .grid{display:grid;gap:.3rem .7rem;} .g3{grid-template-columns:1fr 1fr 1fr;} .g2{grid-template-columns:1fr 1fr;}
  @media(max-width:560px){.g3,.g2{grid-template-columns:1fr;}}
  .btn{background:var(--brand);color:#fff;border:0;border-radius:9px;padding:.55rem .9rem;font:inherit;font-weight:700;cursor:pointer;}
  .btn:hover{background:var(--brand-strong);} .btn.ghost{background:transparent;color:var(--brand);border:1px solid var(--line);}
  .btn.small{padding:.3rem .6rem;font-size:.78rem;} .btn.good{background:var(--good);} .btn.mut{background:transparent;color:var(--muted);border:1px solid var(--line);}
  .datebar{display:flex;align-items:center;gap:.5rem;margin:.4rem 0 .2rem;}
  .datebar .day{font-weight:800;font-size:1.05rem;flex:1;text-align:center;}
  .worker-col{margin:.7rem 0;} .worker-col h3{margin:0 0 .3rem;font-size:.92rem;display:flex;align-items:center;gap:.5rem;}
  .worker-col .count{font-size:.7rem;color:var(--muted);font-weight:600;}
  .appt{border:1px solid var(--line);border-left:4px solid var(--muted);border-radius:10px;padding:.55rem .7rem;margin:.35rem 0;background:var(--surface);}
  .appt.requested{border-left-color:var(--warn);} .appt.confirmed{border-left-color:var(--good);}
  .appt.cancelled,.appt.no_show{border-left-color:var(--crit);opacity:.7;} .appt.completed{border-left-color:var(--muted);opacity:.75;}
  .appt .t{font-family:var(--mono);font-weight:700;font-size:.86rem;} .appt .c{font-weight:700;} .appt .s{color:var(--muted);font-size:.8rem;}
  .pill{display:inline-block;font-size:.64rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;padding:.12rem .45rem;border-radius:999px;}
  .pill.requested{background:var(--warn-bg);color:var(--warn);} .pill.confirmed{background:var(--good-bg);color:var(--good);}
  .pill.completed{background:var(--surface-2);color:var(--muted);} .pill.cancelled,.pill.no_show{background:var(--crit-bg);color:var(--crit);}
  .appt .actions{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.45rem;align-items:center;}
  .appt .actions select{width:auto;padding:.25rem .4rem;font-size:.78rem;}
  .empty{color:var(--muted);font-size:.85rem;padding:.5rem 0;} .muted{color:var(--muted);}
  details.manage summary{cursor:pointer;font-weight:700;} .chips{display:flex;flex-wrap:wrap;gap:.35rem;margin:.5rem 0;}
  .chip{background:var(--surface-2);border:1px solid var(--line);border-radius:999px;padding:.15rem .55rem;font-size:.76rem;}
</style>
</head>
<body>
<header class="top"><div class="top-in">
  <span class="logo" aria-hidden="true">C</span>
  <h1>Live Schedule<small id="coName">— set up your business below</small></h1>
  <button class="theme" id="themeBtn" title="Theme">◐</button>
</div></header>

<div class="wrap">
  <div id="banner" class="banner"></div>

  <section class="card" id="setupCard">
    <h2>Your business</h2>
    <div id="setupBody"></div>
  </section>

  <section class="card" id="bookCard" hidden>
    <h2>Book an appointment</h2>
    <form id="bookForm">
      <div class="grid g2">
        <div><label for="bService">Service</label><select id="bService"></select></div>
        <div><label for="bWorker">Therapist (optional — assigns &amp; confirms)</label><select id="bWorker"></select></div>
        <div><label for="bClient">Client name</label><input id="bClient" required></div>
        <div><label for="bPhone">Client phone</label><input id="bPhone" type="tel"></div>
        <div><label for="bDate">Date</label><input id="bDate" type="date"></div>
        <div><label for="bTime">Start time</label><input id="bTime" type="time"></div>
      </div>
      <div><label for="bAddr">Address (optional)</label><input id="bAddr"></div>
      <button class="btn" type="submit" style="margin-top:.8rem">Book</button>
    </form>
  </section>

  <section class="card" id="scheduleCard" hidden>
    <div class="datebar">
      <button class="btn mut small" id="prevDay">◀</button>
      <span class="day" id="dayLabel"></span>
      <button class="btn mut small" id="nextDay">▶</button>
      <button class="btn ghost small" id="todayBtn">Today</button>
    </div>
    <div id="schedule"></div>
  </section>

  <details class="card manage" id="manageCard" hidden>
    <summary>Manage services &amp; therapists</summary>
    <div style="margin-top:.7rem">
      <h2 style="font-size:.9rem">Services</h2>
      <div class="chips" id="svcChips"></div>
      <div class="grid g3">
        <div><label for="sName">Service name</label><input id="sName" placeholder="60-min massage"></div>
        <div><label for="sDur">Duration (min)</label><input id="sDur" type="number" value="60" min="5"></div>
        <div style="display:flex;align-items:end"><button class="btn ghost small" id="addSvc">Add service</button></div>
      </div>
      <h2 style="font-size:.9rem;margin-top:1rem">Therapists</h2>
      <div class="chips" id="wkChips"></div>
      <div class="grid g3">
        <div><label for="wName">Name</label><input id="wName"></div>
        <div><label for="wLicense">License #</label><input id="wLicense"></div>
        <div><label for="wLinked">LinkedIn URL</label><input id="wLinked" type="url"></div>
      </div>
      <button class="btn ghost small" id="addWk" style="margin-top:.5rem">Add therapist</button>
    </div>
  </details>
</div>

<script>
const $=(id)=>document.getElementById(id);
let companyId=localStorage.getItem("sched.companyId")||null;
const _q=new URLSearchParams(location.search);
if(_q.get("companyId")){companyId=_q.get("companyId");localStorage.setItem("sched.companyId",companyId);}
let day=new Date(); day.setHours(0,0,0,0);
let services=[],workers=[],appts=[];

function banner(msg,kind){const b=$("banner");b.textContent=msg;b.className="banner show "+(kind||"");if(kind==="ok")setTimeout(()=>{if(b.textContent===msg)b.className="banner";},3500);}
async function api(method,path,body){
  const res=await fetch("/api"+path,{method,headers:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
  const j=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error((j.error&&j.error.message)||("HTTP "+res.status));
  return j;
}
const esc=(s)=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const iso=(d)=>d.toISOString();
const dayStart=()=>{const d=new Date(day);return iso(d);};
const dayEnd=()=>{const d=new Date(day);d.setDate(d.getDate()+1);return iso(d);};
const fmtTime=(s)=>new Date(s).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
const fmtDay=(d)=>d.toLocaleDateString([], {weekday:"long",month:"short",day:"numeric"});

function renderSetup(){
  if(!companyId){
    $("setupBody").innerHTML='<p class="hint">Name your business to start scheduling.</p>'+
      '<form id="coForm"><label for="coInput">Business name</label><input id="coInput" required placeholder="Serenity Massage">'+
      '<button class="btn" style="margin-top:.6rem">Create</button></form>';
    $("coForm").onsubmit=async(e)=>{e.preventDefault();const name=$("coInput").value.trim();if(!name)return;
      try{const co=await api("POST","/companies",{name});companyId=co.id;localStorage.setItem("sched.companyId",companyId);banner("Created "+co.name,"ok");boot();}catch(err){banner(err.message,"err");}};
  }else{
    $("setupBody").innerHTML='<p class="hint">Scheduling for <strong id="cn"></strong>. <button class="btn mut small" id="switchCo">Switch business</button></p>';
    $("cn").textContent=localStorage.getItem("sched.coName")||companyId;
    $("switchCo").onclick=()=>{localStorage.removeItem("sched.companyId");localStorage.removeItem("sched.coName");companyId=null;boot();};
  }
}

async function loadRefs(){
  [services,workers]=await Promise.all([
    api("GET","/services?companyId="+encodeURIComponent(companyId)),
    api("GET","/workers?companyId="+encodeURIComponent(companyId)),
  ]);
  $("bService").innerHTML=services.map(s=>'<option value="'+s.id+'">'+esc(s.name)+" ("+s.durationMinutes+"m)</option>").join("")||'<option value="">— add a service first —</option>';
  $("bWorker").innerHTML='<option value="">Unassigned</option>'+workers.map(w=>'<option value="'+w.id+'">'+esc(w.name)+"</option>").join("");
  $("svcChips").innerHTML=services.map(s=>'<span class="chip">'+esc(s.name)+" · "+s.durationMinutes+"m</span>").join("")||'<span class="muted">none yet</span>';
  $("wkChips").innerHTML=workers.map(w=>'<span class="chip">'+esc(w.name)+(w.licenseNumber?" · "+esc(w.licenseNumber):"")+"</span>").join("")||'<span class="muted">none yet</span>';
}

async function loadSchedule(){
  $("dayLabel").textContent=fmtDay(day);
  appts=await api("GET","/appointments?companyId="+encodeURIComponent(companyId)+"&from="+encodeURIComponent(dayStart())+"&to="+encodeURIComponent(dayEnd()));
  const wrap=$("schedule"); wrap.innerHTML="";
  const groups=[...workers.map(w=>({id:w.id,name:w.name})),{id:null,name:"Unassigned"}];
  let any=false;
  for(const g of groups){
    const list=appts.filter(a=>(a.workerId||null)===g.id).sort((a,b)=>a.start.localeCompare(b.start));
    if(g.id===null&&!list.length)continue;
    const col=document.createElement("div");col.className="worker-col";
    col.innerHTML='<h3>'+esc(g.name)+' <span class="count">'+list.length+" appt"+(list.length===1?"":"s")+"</span></h3>";
    if(!list.length)col.innerHTML+='<div class="empty">No appointments.</div>';
    list.forEach(a=>{any=true;col.appendChild(apptEl(a));});
    wrap.appendChild(col);
  }
  if(!any)wrap.innerHTML='<div class="empty">Nothing booked for this day. Use “Book an appointment” above.</div>';
}

function apptEl(a){
  const el=document.createElement("div");el.className="appt "+a.status;
  el.innerHTML='<div class="t">'+fmtTime(a.start)+"–"+fmtTime(a.end)+' <span class="pill '+a.status+'">'+a.status.replace("_"," ")+"</span></div>"+
    '<div class="c">'+esc(a.clientName)+'</div><div class="s">'+esc(a.serviceName)+(a.clientPhone?" · "+esc(a.clientPhone):"")+(a.address?" · "+esc(a.address):"")+"</div>";
  const acts=document.createElement("div");acts.className="actions";
  const act=async(fn)=>{try{await fn();await loadSchedule();}catch(err){banner(err.message,"err");}};
  const mk=(txt,cls,fn)=>{const b=document.createElement("button");b.className="btn small "+cls;b.textContent=txt;b.onclick=()=>act(fn);acts.appendChild(b);};
  if(a.status==="requested"){
    if(a.workerId){mk("Confirm","good",()=>api("POST","/appointments/"+a.id+"/confirm",{}));}
    else{
      const sel=document.createElement("select");sel.innerHTML='<option value="">pick therapist…</option>'+workers.map(w=>'<option value="'+w.id+'">'+esc(w.name)+"</option>").join("");
      acts.appendChild(sel);
      mk("Confirm","good",()=>{if(!sel.value)throw new Error("pick a therapist to confirm");return api("POST","/appointments/"+a.id+"/confirm",{workerId:sel.value});});
    }
    mk("Cancel","mut",()=>api("POST","/appointments/"+a.id+"/cancel",{}));
  }else if(a.status==="confirmed"){
    mk("Complete","good",()=>api("POST","/appointments/"+a.id+"/complete",{}));
    mk("No-show","mut",()=>api("POST","/appointments/"+a.id+"/no-show",{}));
    mk("Cancel","mut",()=>api("POST","/appointments/"+a.id+"/cancel",{}));
  }
  el.appendChild(acts);
  return el;
}

// events
$("bookForm").onsubmit=async(e)=>{
  e.preventDefault();
  const serviceId=$("bService").value; if(!serviceId){banner("Add a service first (Manage section).","err");return;}
  const date=$("bDate").value||new Date(day).toISOString().slice(0,10);
  const time=$("bTime").value||"09:00";
  const start=new Date(date+"T"+time).toISOString();
  try{
    const appt=await api("POST","/appointments",{companyId,serviceId,clientName:$("bClient").value.trim(),clientPhone:$("bPhone").value.trim()||undefined,address:$("bAddr").value.trim()||undefined,start});
    const wid=$("bWorker").value;
    if(wid){await api("POST","/appointments/"+appt.id+"/confirm",{workerId:wid});}
    banner("Booked "+$("bClient").value.trim(),"ok");
    $("bookForm").reset();
    day=new Date(date);day.setHours(0,0,0,0);
    await loadSchedule();
  }catch(err){banner(err.message,"err");}
};
$("addSvc").onclick=async()=>{const name=$("sName").value.trim();const durationMinutes=parseInt($("sDur").value,10);
  if(!name||!(durationMinutes>0)){banner("Service needs a name and duration.","err");return;}
  try{await api("POST","/services",{companyId,name,durationMinutes});$("sName").value="";await loadRefs();banner("Service added","ok");}catch(err){banner(err.message,"err");}};
$("addWk").onclick=async()=>{const name=$("wName").value.trim();if(!name){banner("Therapist needs a name.","err");return;}
  const body={companyId,name};const lic=$("wLicense").value.trim();const li=$("wLinked").value.trim();
  if(lic)body.licenseNumber=lic; if(li)body.linkedinUrl=li;
  try{await api("POST","/workers",body);$("wName").value="";$("wLicense").value="";$("wLinked").value="";await loadRefs();await loadSchedule();banner("Therapist added","ok");}catch(err){banner(err.message,"err");}};
$("prevDay").onclick=()=>{day.setDate(day.getDate()-1);loadSchedule();};
$("nextDay").onclick=()=>{day.setDate(day.getDate()+1);loadSchedule();};
$("todayBtn").onclick=()=>{day=new Date();day.setHours(0,0,0,0);loadSchedule();};
$("themeBtn").onclick=()=>{const c=document.documentElement.getAttribute("data-theme");const n=c==="dark"?"light":c==="light"?"":"dark";if(n)document.documentElement.setAttribute("data-theme",n);else document.documentElement.removeAttribute("data-theme");};

async function boot(){
  renderSetup();
  const on=!!companyId;
  ["bookCard","scheduleCard","manageCard"].forEach(id=>$(id).hidden=!on);
  $("coName").textContent = on ? "" : "— set up your business below";
  if(!on)return;
  $("bDate").value=new Date(day).toISOString().slice(0,10);
  try{ await loadRefs(); await loadSchedule(); }
  catch(err){ banner(err.message,"err"); }
}
boot();
</script>
</body>
</html>`;
