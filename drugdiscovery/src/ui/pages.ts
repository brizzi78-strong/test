/**
 * The Drug Discovery workbench, served as one self-contained document. Talks
 * only to this server's `/api/*`. Design tokens mirror the Cardinal palette
 * used across the other apps in this repo.
 */

export const APP_PAGE: string = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Drug Discovery — a cheminformatics workbench</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23A31B33'/%3E%3Ctext x='16' y='23' font-family='system-ui' font-size='19' font-weight='900' text-anchor='middle' fill='white'%3E%E2%9A%97%3C/text%3E%3C/svg%3E">
<style>
  :root{--paper:#F7F2E6;--surface:#FFFDF7;--surface-2:#EFE7D3;--ink:#17233F;--muted:#6B6350;--line:#E2D9C3;
    --brand:#A31B33;--brand-strong:#7E1226;--good:#2E7D4F;--good-bg:#E4F0E8;--warn:#9A6410;--warn-bg:#F6ECD6;
    --crit:#B23A3A;--crit-bg:#F6E1DE;--shadow:0 1px 2px rgba(23,35,63,.07),0 10px 26px -14px rgba(23,35,63,.24);
    --font:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;--maxw:980px;--r:13px;}
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
  input,select,textarea{width:100%;padding:.5rem .55rem;border:1px solid var(--line);border-radius:9px;background:var(--paper);color:var(--ink);font:inherit;}
  textarea{resize:vertical;min-height:4rem;}
  input:focus,select:focus,textarea:focus{outline:2px solid var(--brand);outline-offset:1px;}
  .grid{display:grid;gap:.3rem .7rem;} .g4{grid-template-columns:1fr 1fr 1fr 1fr;} .g3{grid-template-columns:1fr 1fr 1fr;} .g2{grid-template-columns:1fr 1fr;}
  @media(max-width:640px){.g4,.g3,.g2{grid-template-columns:1fr 1fr;}}
  @media(max-width:420px){.g4,.g3,.g2{grid-template-columns:1fr;}}
  .btn{background:var(--brand);color:#fff;border:0;border-radius:9px;padding:.55rem .9rem;font:inherit;font-weight:700;cursor:pointer;}
  .btn:hover{background:var(--brand-strong);} .btn.ghost{background:transparent;color:var(--brand);border:1px solid var(--line);}
  .btn.small{padding:.3rem .6rem;font-size:.78rem;} .btn.good{background:var(--good);} .btn.mut{background:transparent;color:var(--muted);border:1px solid var(--line);}
  .btn.warn{background:var(--warn);} .btn.crit{background:var(--crit);} .btn[disabled]{opacity:.5;cursor:not-allowed;}
  .tabs{display:flex;gap:.35rem;flex-wrap:wrap;margin:.6rem 0;}
  .tab{background:transparent;border:1px solid var(--line);border-radius:999px;padding:.35rem .8rem;font:inherit;font-weight:700;font-size:.82rem;color:var(--muted);cursor:pointer;}
  .tab.active{background:var(--brand);color:#fff;border-color:var(--brand);}
  .row{border:1px solid var(--line);border-radius:10px;padding:.55rem .7rem;margin:.35rem 0;background:var(--surface);}
  .row .t{font-weight:700;} .row .s{color:var(--muted);font-size:.82rem;}
  .row-head{display:flex;justify-content:space-between;align-items:flex-start;gap:.6rem;}
  .pill{display:inline-block;font-size:.64rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;padding:.12rem .45rem;border-radius:999px;margin:0 .2rem .2rem 0;}
  .pill.excellent,.pill.good{background:var(--good-bg);color:var(--good);}
  .pill.marginal{background:var(--warn-bg);color:var(--warn);}
  .pill.poor{background:var(--crit-bg);color:var(--crit);}
  .pill.stage{background:var(--surface-2);color:var(--ink);}
  .chips{display:flex;flex-wrap:wrap;gap:.3rem;margin:.3rem 0;}
  .chip{background:var(--surface-2);border:1px solid var(--line);border-radius:999px;padding:.12rem .5rem;font-size:.74rem;}
  .empty{color:var(--muted);font-size:.85rem;padding:.5rem 0;} .muted{color:var(--muted);}
  select.inline{width:auto;display:inline-block;padding:.3rem .4rem;font-size:.8rem;}
  .score{font-family:var(--mono);font-weight:800;}
  .scorebig{font-size:1.7rem;font-family:var(--mono);font-weight:800;}
  .meter{height:8px;border-radius:999px;background:var(--surface-2);overflow:hidden;margin:.3rem 0;}
  .meter > span{display:block;height:100%;background:var(--good);}
  .rulebox{display:flex;flex-wrap:wrap;gap:.35rem;margin:.4rem 0;}
  .ruletag{font-size:.72rem;border:1px solid var(--line);border-radius:8px;padding:.2rem .5rem;}
  .ruletag.pass{background:var(--good-bg);color:var(--good);border-color:transparent;}
  .ruletag.fail{background:var(--crit-bg);color:var(--crit);border-color:transparent;}
  .desc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.35rem;margin:.4rem 0;}
  @media(max-width:640px){.desc-grid{grid-template-columns:repeat(2,1fr);}}
  .desc{background:var(--surface-2);border-radius:8px;padding:.35rem .5rem;font-size:.76rem;}
  .desc b{display:block;font-family:var(--mono);font-size:.95rem;}
  .rankn{width:1.7rem;height:1.7rem;border-radius:8px;background:var(--brand);color:#fff;font-weight:800;display:grid;place-items:center;font-size:.85rem;}
</style>
</head>
<body>
<header class="top"><div class="top-in">
  <span class="logo" aria-hidden="true">⚗</span>
  <h1>Drug Discovery<small id="progName">— cheminformatics workbench</small></h1>
  <button class="theme" id="themeBtn" title="Theme">◐</button>
</div></header>

<div class="wrap">
  <div id="banner" class="banner"></div>

  <section class="card" id="setupCard">
    <h2>Discovery program</h2>
    <div id="setupBody"></div>
  </section>

  <div id="mainArea" hidden>
    <div class="tabs" id="tabs">
      <button class="tab" data-tab="targets">Targets</button>
      <button class="tab" data-tab="design">Design a candidate</button>
      <button class="tab" data-tab="compounds">Compounds</button>
      <button class="tab" data-tab="screening">Screening</button>
      <button class="tab" data-tab="ranking">Ranking</button>
    </div>

    <section class="card tabpanel" id="panel-targets">
      <h2>Biological targets</h2>
      <p class="hint">The protein, receptor, or other biomolecule this program is trying to modulate. Candidates are screened and ranked against a target.</p>
      <form id="targetForm">
        <div class="grid g3">
          <div><label for="tName">Name</label><input id="tName" required placeholder="BTK kinase"></div>
          <div><label for="tKind">Kind</label><select id="tKind">
            <option value="enzyme">Enzyme</option><option value="receptor">Receptor</option><option value="ion_channel">Ion channel</option>
            <option value="transporter">Transporter</option><option value="nucleic_acid">Nucleic acid</option><option value="protein_protein">Protein–protein</option><option value="other">Other</option>
          </select></div>
          <div><label for="tOrganism">Organism</label><input id="tOrganism" placeholder="Homo sapiens"></div>
        </div>
        <label for="tNotes">Mechanism note</label>
        <textarea id="tNotes" placeholder="Inhibit the ATP-binding site"></textarea>
        <button class="btn" type="submit" style="margin-top:.6rem">Add target</button>
      </form>
      <div id="targetList" style="margin-top:1rem"></div>
    </section>

    <section class="card tabpanel" id="panel-design" hidden>
      <h2>Design a candidate</h2>
      <p class="hint">Enter a molecule as its physicochemical descriptor profile. The workbench scores drug-likeness live against the published Lipinski, Veber, and lead-likeness rules — tweak the numbers to see how a design moves. This is molecular design as data; it holds no synthesis routes.</p>
      <form id="designForm">
        <div class="grid g3">
          <div><label for="cName">Candidate name / code</label><input id="cName" required placeholder="CPD-001"></div>
          <div><label for="cSmiles">SMILES (optional, stored as a label)</label><input id="cSmiles" placeholder="CC(=O)Oc1ccccc1C(=O)O"></div>
          <div><label for="cSource">Source</label><select id="cSource">
            <option value="designed">Designed</option><option value="library">Library</option><option value="natural_product">Natural product</option><option value="known_drug">Known drug</option>
          </select></div>
        </div>
        <div class="desc-grid" style="margin-top:.6rem">
          <div><label for="dMW">Mol. weight</label><input id="dMW" type="number" step="any" value="300"></div>
          <div><label for="dLogP">logP</label><input id="dLogP" type="number" step="any" value="2.5"></div>
          <div><label for="dHBD">H-bond donors</label><input id="dHBD" type="number" step="1" value="1"></div>
          <div><label for="dHBA">H-bond acceptors</label><input id="dHBA" type="number" step="1" value="4"></div>
          <div><label for="dRot">Rotatable bonds</label><input id="dRot" type="number" step="1" value="4"></div>
          <div><label for="dTPSA">TPSA (Å²)</label><input id="dTPSA" type="number" step="any" value="60"></div>
          <div><label for="dArom">Aromatic rings</label><input id="dArom" type="number" step="1" value="2"></div>
          <div><label for="cTarget">Primary target</label><select id="cTarget"></select></div>
        </div>
        <div id="liveEval" style="margin-top:.4rem"></div>
        <button class="btn" type="submit" style="margin-top:.6rem">Register candidate</button>
      </form>
    </section>

    <section class="card tabpanel" id="panel-compounds" hidden>
      <h2>Compounds</h2>
      <p class="hint">Every registered candidate with its live drug-likeness verdict and pipeline stage. Advance a candidate one stage down the funnel as evidence accrues.</p>
      <div id="compoundList"></div>
    </section>

    <section class="card tabpanel" id="panel-screening" hidden>
      <h2>Record a screen</h2>
      <p class="hint">Log how potent a compound was against a target (lower nM = more potent). Screening data is fused with drug-likeness in the ranking.</p>
      <form id="screenForm">
        <div class="grid g4">
          <div><label for="scCompound">Compound</label><select id="scCompound"></select></div>
          <div><label for="scTarget">Target</label><select id="scTarget"></select></div>
          <div><label for="scMetric">Metric</label><select id="scMetric"><option>IC50</option><option>EC50</option><option>Ki</option><option>Kd</option></select></div>
          <div><label for="scValue">Value (nM)</label><input id="scValue" type="number" step="any" placeholder="25"></div>
        </div>
        <button class="btn" type="submit" style="margin-top:.6rem">Record screen</button>
      </form>
      <div id="screenList" style="margin-top:1rem"></div>
    </section>

    <section class="card tabpanel" id="panel-ranking" hidden>
      <h2>Candidate ranking</h2>
      <p class="hint">Rank the program's candidates against one target, fusing measured potency with drug-likeness — "advance these first".</p>
      <label for="rkTarget">Target</label>
      <select id="rkTarget"></select>
      <div id="rankList" style="margin-top:.8rem"></div>
    </section>
  </div>
</div>

<script>
const $=(id)=>document.getElementById(id);
let programId=localStorage.getItem("dd.programId")||null;
let targets=[],compounds=[];

function banner(msg,kind){const b=$("banner");b.textContent=msg;b.className="banner show "+(kind||"");if(kind==="ok")setTimeout(()=>{if(b.textContent===msg)b.className="banner";},3500);}
async function api(method,path,body){
  const res=await fetch("/api"+path,{method,headers:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
  const j=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error((j.error&&j.error.message)||("HTTP "+res.status));
  return j;
}
const esc=(s)=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const num=(id)=>Number($(id).value);

function descFromForm(){
  return {molecularWeight:num("dMW"),logP:num("dLogP"),hBondDonors:num("dHBD"),hBondAcceptors:num("dHBA"),rotatableBonds:num("dRot"),tpsa:num("dTPSA"),aromaticRings:num("dArom")};
}

function renderSetup(){
  if(!programId){
    $("setupBody").innerHTML='<p class="hint">Name a discovery program to start registering targets and candidate molecules — or load the Parkinson’s disease worked example to see the whole loop with real molecules.</p>'+
      '<form id="progForm"><div class="grid g2"><div><label for="pInput">Program name</label><input id="pInput" required placeholder="BTK inhibitors"></div>'+
      '<div><label for="pIndication">Indication</label><input id="pIndication" placeholder="Rheumatoid arthritis"></div></div>'+
      '<button class="btn" style="margin-top:.6rem">Create program</button></form>'+
      '<div style="margin-top:.8rem;border-top:1px solid var(--line);padding-top:.8rem">'+
      '<button class="btn ghost small" id="loadDemo">⚗ Load the Parkinson’s disease demo (MAO-B inhibitors)</button>'+
      '<p class="hint" style="margin-top:.4rem">Seeds a program targeting MAO-B with rasagiline, selegiline, safinamide, and levodopa, each with published descriptors — the MAO-B inhibitors carry an illustrative potency, and levodopa is a reminder that the rules don’t catch everything.</p></div>';
    $("progForm").onsubmit=async(e)=>{e.preventDefault();const name=$("pInput").value.trim();if(!name)return;
      try{const p=await api("POST","/programs",{name,indication:$("pIndication").value.trim()||undefined});programId=p.id;localStorage.setItem("dd.programId",programId);localStorage.setItem("dd.progName",p.name);banner("Created "+p.name,"ok");boot();}catch(err){banner(err.message,"err");}};
    $("loadDemo").onclick=async()=>{
      try{const r=await api("POST","/demo/parkinsons");programId=r.program.id;localStorage.setItem("dd.programId",programId);localStorage.setItem("dd.progName",r.program.name);banner("Loaded the Parkinson’s disease demo — "+r.compoundIds.length+" molecules","ok");boot();}catch(err){banner(err.message,"err");}};
  }else{
    $("setupBody").innerHTML='<p class="hint">Working in <strong id="pn"></strong>. <button class="btn mut small" id="switchProg">Switch program</button></p>';
    $("pn").textContent=localStorage.getItem("dd.progName")||programId;
    $("switchProg").onclick=()=>{localStorage.removeItem("dd.programId");localStorage.removeItem("dd.progName");programId=null;boot();};
  }
}

async function loadAll(){
  [targets,compounds]=await Promise.all([
    api("GET","/targets?programId="+encodeURIComponent(programId)),
    api("GET","/compounds?programId="+encodeURIComponent(programId)),
  ]);
  renderTargets(); renderCompounds(); refreshTargetSelects(); refreshCompoundSelects();
}

// --- Targets ---
function renderTargets(){
  $("targetList").innerHTML=targets.length?targets.map(t=>
    '<div class="row"><div class="t">'+esc(t.name)+' <span class="pill stage">'+esc(t.kind.replace("_"," "))+'</span></div>'+
    (t.organism?'<div class="s">'+esc(t.organism)+'</div>':'')+
    (t.notes?'<div class="s">'+esc(t.notes)+'</div>':'')+
    '</div>').join(""):'<div class="empty">No targets yet.</div>';
}
$("targetForm").onsubmit=async(e)=>{
  e.preventDefault();
  const name=$("tName").value.trim(); if(!name){banner("Name is required.","err");return;}
  try{
    await api("POST","/targets",{programId,name,kind:$("tKind").value,organism:$("tOrganism").value.trim()||undefined,notes:$("tNotes").value.trim()||undefined});
    $("targetForm").reset(); await loadAll(); banner("Target added","ok");
  }catch(err){banner(err.message,"err");}
};

// --- Live evaluation + design ---
function evalHtml(dl){
  const rules=dl.rules.map(r=>'<span class="ruletag '+(r.pass?"pass":"fail")+'">'+esc(r.rule)+': '+(r.pass?"pass":esc(r.violations.join("; ")))+'</span>').join("");
  return '<div class="row"><div class="row-head"><div><div class="muted" style="font-size:.72rem;font-weight:700">DRUG-LIKENESS</div>'+
    '<span class="scorebig">'+dl.score+'</span><span class="muted">/100</span> <span class="pill '+dl.verdict+'">'+dl.verdict+'</span></div></div>'+
    '<div class="meter"><span style="width:'+dl.score+'%"></span></div>'+
    '<div class="rulebox">'+rules+'</div></div>';
}
async function liveEval(){
  try{const dl=await api("POST","/evaluate",{descriptors:descFromForm()});$("liveEval").innerHTML=evalHtml(dl);}
  catch(err){$("liveEval").innerHTML='<div class="hint">'+esc(err.message)+'</div>';}
}
["dMW","dLogP","dHBD","dHBA","dRot","dTPSA","dArom"].forEach(id=>{const el=$(id);if(el)el.addEventListener("input",()=>{clearTimeout(window._le);window._le=setTimeout(liveEval,200);});});

$("designForm").onsubmit=async(e)=>{
  e.preventDefault();
  const name=$("cName").value.trim(); if(!name){banner("Candidate name is required.","err");return;}
  try{
    await api("POST","/compounds",{programId,name,smiles:$("cSmiles").value.trim()||undefined,source:$("cSource").value,
      targetId:$("cTarget").value||undefined,descriptors:descFromForm()});
    $("cName").value=""; $("cSmiles").value="";
    await loadAll(); banner("Candidate registered","ok");
  }catch(err){banner(err.message,"err");}
};

// --- Compounds ---
const STAGE_LABEL=(s)=>s.replace("_"," ");
function renderCompounds(){
  $("compoundList").innerHTML=compounds.length?compounds.map(c=>{
    const d=c.descriptors,dl=c.drugLikeness;
    const tgt=c.targetId?(targets.find(t=>t.id===c.targetId)||{}).name:null;
    const advance=(c.nextStages||[]).map(s=>'<button class="btn small '+(s==="discontinued"?"crit":"good")+'" data-adv="'+c.id+'" data-to="'+s+'">'+(s==="discontinued"?"Discontinue":"→ "+STAGE_LABEL(s))+'</button>').join(" ");
    return '<div class="row"><div class="row-head">'+
      '<div><div class="t">'+esc(c.name)+' <span class="pill stage">'+esc(STAGE_LABEL(c.stage))+'</span> <span class="pill '+dl.verdict+'">'+dl.verdict+' '+dl.score+'</span></div>'+
      (c.smiles?'<div class="s" style="font-family:var(--mono)">'+esc(c.smiles)+'</div>':'')+
      (tgt?'<div class="s">target: '+esc(tgt)+'</div>':'')+'</div></div>'+
      '<div class="desc-grid">'+
        '<div class="desc">MW<b>'+d.molecularWeight+'</b></div><div class="desc">logP<b>'+d.logP+'</b></div>'+
        '<div class="desc">HBD<b>'+d.hBondDonors+'</b></div><div class="desc">HBA<b>'+d.hBondAcceptors+'</b></div>'+
        '<div class="desc">Rot. bonds<b>'+d.rotatableBonds+'</b></div><div class="desc">TPSA<b>'+d.tpsa+'</b></div>'+
        '<div class="desc">Arom. rings<b>'+d.aromaticRings+'</b></div>'+
      '</div>'+
      (advance?'<div style="margin-top:.4rem">'+advance+'</div>':'')+
      '</div>';
  }).join(""):'<div class="empty">No candidates yet — design one on the "Design a candidate" tab.</div>';
  document.querySelectorAll("button[data-adv]").forEach(b=>{
    b.onclick=async()=>{try{await api("POST","/compounds/"+b.dataset.adv+"/advance",{stage:b.dataset.to});await loadAll();banner("Moved to "+STAGE_LABEL(b.dataset.to),"ok");}catch(err){banner(err.message,"err");}};
  });
}

// --- Shared selects ---
function refreshTargetSelects(){
  const opts=targets.map(t=>'<option value="'+t.id+'">'+esc(t.name)+'</option>').join("");
  const withBlank='<option value="">— none —</option>'+opts;
  $("cTarget").innerHTML=withBlank;
  ["scTarget","rkTarget"].forEach(id=>{const sel=$(id);const prev=sel.value;sel.innerHTML=opts||'<option value="">— add a target first —</option>';if(prev)sel.value=prev;});
}
function refreshCompoundSelects(){
  $("scCompound").innerHTML=compounds.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join("")||'<option value="">— register a candidate first —</option>';
}

// --- Screening ---
$("screenForm").onsubmit=async(e)=>{
  e.preventDefault();
  const compoundId=$("scCompound").value,targetId=$("scTarget").value;
  if(!compoundId){banner("Register a candidate first.","err");return;}
  if(!targetId){banner("Add a target first.","err");return;}
  const valueNanomolar=Number($("scValue").value);
  if(!(valueNanomolar>0)){banner("Enter a positive nM value.","err");return;}
  try{
    await api("POST","/screens",{compoundId,targetId,metric:$("scMetric").value,valueNanomolar});
    $("scValue").value=""; await renderScreens(); banner("Screen recorded","ok");
  }catch(err){banner(err.message,"err");}
};
async function renderScreens(){
  try{
    const screens=await api("GET","/screens?targetId="+encodeURIComponent($("scTarget").value||""));
    $("screenList").innerHTML=screens.length?screens.map(s=>{
      const c=compounds.find(x=>x.id===s.compoundId),t=targets.find(x=>x.id===s.targetId);
      return '<div class="row"><div class="t">'+esc(c?c.name:s.compoundId)+' <span class="muted">vs</span> '+esc(t?t.name:s.targetId)+'</div>'+
        '<div class="s">'+esc(s.metric)+' = <span class="score">'+s.valueNanomolar+'</span> nM</div></div>';
    }).join(""):'<div class="empty">No screens for this target yet.</div>';
  }catch(err){banner(err.message,"err");}
}
$("scTarget").onchange=renderScreens;

// --- Ranking ---
$("rkTarget").onchange=renderRanking;
async function renderRanking(){
  const tid=$("rkTarget").value;
  if(!tid){$("rankList").innerHTML='<div class="empty">Add a target to rank against.</div>';return;}
  try{
    const ranked=await api("GET","/targets/"+tid+"/ranking?limit=20");
    $("rankList").innerHTML=ranked.length?ranked.map((r,i)=>{
      const c=r.compound;
      const pot=r.bestPotencyNanomolar!==undefined?('best potency '+r.bestPotencyNanomolar+' nM · score '+r.potencyScore):'not yet screened';
      return '<div class="row"><div class="row-head"><div style="display:flex;gap:.6rem;align-items:center">'+
        '<span class="rankn">'+(i+1)+'</span><div><div class="t">'+esc(c.name)+' <span class="pill stage">'+esc(STAGE_LABEL(c.stage))+'</span></div>'+
        '<div class="s">drug-likeness '+r.drugLikenessScore+' · '+pot+'</div></div></div>'+
        '<div class="scorebig">'+r.overall+'</div></div></div>';
    }).join(""):'<div class="empty">No candidates to rank yet.</div>';
  }catch(err){banner(err.message,"err");}
}

// --- Tabs ---
document.querySelectorAll(".tab").forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".tabpanel").forEach(p=>p.hidden=true);
    btn.classList.add("active");
    $("panel-"+btn.dataset.tab).hidden=false;
    if(btn.dataset.tab==="design")liveEval();
    if(btn.dataset.tab==="screening")renderScreens();
    if(btn.dataset.tab==="ranking")renderRanking();
  };
});

$("themeBtn").onclick=()=>{const c=document.documentElement.getAttribute("data-theme");const n=c==="dark"?"light":c==="light"?"":"dark";if(n)document.documentElement.setAttribute("data-theme",n);else document.documentElement.removeAttribute("data-theme");};

async function boot(){
  renderSetup();
  const on=!!programId;
  $("mainArea").hidden=!on;
  $("progName").textContent = on ? "" : "— cheminformatics workbench";
  if(!on)return;
  try{
    await loadAll();
    document.querySelector('.tab[data-tab="targets"]').classList.add("active");
    $("panel-targets").hidden=false;
  }catch(err){ banner(err.message,"err"); }
}
boot();
</script>
</body>
</html>`;
