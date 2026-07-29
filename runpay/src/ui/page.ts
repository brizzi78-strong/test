/**
 * Cardinal Payroll — a self-contained single-page app served by the BFF.
 *
 * Talks to the same-origin BFF: /api/app for the business + tax metadata,
 * /api/employees to add and list people, /api/run-batch to run a pay period
 * across everyone with company totals, and /api/payslips for pay-stub history.
 * No framework, no external assets. Cardinal palette, light/dark aware.
 */

export const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cardinal Payroll</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23A31B33'/%3E%3Cpath d='M8 22V10h4l4 6 4-6h4v12' stroke='white' stroke-width='2.5' fill='none' stroke-linejoin='round' stroke-linecap='round'/%3E%3C/svg%3E">
<style>
:root{--paper:#F7F2E6;--card:#fff;--ink:#17233F;--muted:#5b6472;--brand:#A31B33;--line:#e7e0cf;--ok:#1c7c4c;--okbg:#e7f4ec;--errbg:#fbe9ec;--shadow:0 1px 3px rgba(23,35,63,.08),0 1px 2px rgba(23,35,63,.06)}
@media (prefers-color-scheme:dark){:root{--paper:#0f1523;--card:#161f33;--ink:#e8ecf5;--muted:#93a0b8;--brand:#e0566e;--line:#243049;--ok:#54c98a;--okbg:#12301f;--errbg:#3a1620;--shadow:0 1px 3px rgba(0,0,0,.4)}}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.45}
.wrap{max-width:1040px;margin:0 auto;padding:20px 18px 64px}
header{display:flex;align-items:center;gap:12px;margin:8px 0 20px}
.logo{width:38px;height:38px;border-radius:9px;background:var(--brand);display:grid;place-items:center;color:#fff;font-weight:800;flex:0 0 auto}
h1{font-size:1.35rem;margin:0}
.sub{color:var(--muted);font-size:.85rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);padding:18px;margin-bottom:18px}
.card h2{margin:0 0 4px;font-size:1.05rem}
.lead{color:var(--muted);font-size:.87rem;margin:0 0 14px}
label{display:block;font-size:.78rem;font-weight:600;color:var(--muted);margin:10px 0 4px}
input,select{width:100%;padding:.5rem .55rem;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink);font-size:.9rem}
.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
@media(max-width:620px){.row,.row3{grid-template-columns:1fr}}
.btn{background:var(--brand);color:#fff;border:0;border-radius:8px;padding:.6rem 1rem;font-size:.9rem;font-weight:600;cursor:pointer}
.btn:disabled{opacity:.55;cursor:default}
.btn.ghost{background:transparent;color:var(--brand);border:1px solid var(--brand)}
.btn.sm{padding:.35rem .6rem;font-size:.8rem}
table{width:100%;border-collapse:collapse;font-size:.86rem}
th,td{text-align:left;padding:.5rem .5rem;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-weight:600;font-size:.74rem;text-transform:uppercase;letter-spacing:.03em}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
.pill{display:inline-block;padding:.1rem .5rem;border-radius:999px;font-size:.72rem;font-weight:600}
.pill.ok{background:var(--okbg);color:var(--ok)}
.pill.err{background:var(--errbg);color:var(--brand)}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:6px}
.tile{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:12px}
.tile .k{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.03em}
.tile .v{font-size:1.25rem;font-weight:700;font-variant-numeric:tabular-nums;margin-top:2px}
.tile.remit{border-color:var(--brand)}
.tile.remit .v{color:var(--brand)}
.muted{color:var(--muted)}.dim{color:var(--muted);font-size:.8rem}
.banner{padding:.6rem .7rem;border-radius:8px;font-size:.85rem;margin:8px 0}
.banner.err{background:var(--errbg);color:var(--brand)}
.banner.note{background:var(--okbg);color:var(--ok)}
.toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:var(--ink);color:var(--paper);padding:.6rem 1rem;border-radius:8px;font-size:.85rem;opacity:0;transition:opacity .2s;pointer-events:none}
.toast.show{opacity:1}
.foot{color:var(--muted);font-size:.75rem;text-align:center;margin-top:10px}
.hidden{display:none}
details summary{cursor:pointer;font-size:.8rem;color:var(--brand)}
.bd{font-size:.82rem;margin-top:8px}
.bd div{display:flex;justify-content:space-between;padding:.15rem 0;border-bottom:1px dotted var(--line)}
.bd .net{font-weight:700;border-bottom:0}
</style>
</head>
<body>
<div class="wrap">
<header>
  <div class="logo">CP</div>
  <div>
    <h1>Cardinal Payroll</h1>
    <div class="sub" id="bizline">Run payroll &middot; loading&hellip;</div>
  </div>
</header>

<div id="disclaimer" class="banner note">Withholding calculator — computes every paycheck and the exact tax to remit. It does not move money or file returns (see the README).</div>

<div class="card">
  <h2>Add an employee</h2>
  <p class="lead">Their pay setup drives the real gross-to-net math (federal + NC, FICA, employer taxes).</p>
  <div class="row">
    <div><label>First name</label><input id="fn"></div>
    <div><label>Last name</label><input id="ln"></div>
  </div>
  <div class="row3">
    <div><label>Pay type</label><select id="ptype"><option value="salary">Salary</option><option value="hourly">Hourly</option></select></div>
    <div id="salWrap"><label>Annual salary ($)</label><input id="salary" inputmode="decimal" placeholder="52000"></div>
    <div id="rateWrap" class="hidden"><label>Hourly rate ($)</label><input id="rate" inputmode="decimal" placeholder="24.00"></div>
    <div><label>Pay frequency</label><select id="freq"></select></div>
  </div>
  <div class="row3">
    <div><label>Filing status</label><select id="filing"></select></div>
    <div><label>NC-4 allowances</label><input id="allow" inputmode="numeric" value="0"></div>
    <div><label>Extra federal w/h per check ($)</label><input id="extra" inputmode="decimal" value="0"></div>
  </div>
  <div id="addErr"></div>
  <div style="margin-top:14px"><button class="btn" id="addBtn">Add employee</button></div>
</div>

<div class="card">
  <h2>Run payroll</h2>
  <p class="lead">Pick the check date; every employee is run through the engine and totaled. Enter hours for hourly staff.</p>
  <div class="row">
    <div><label>Check date</label><input id="payDate" type="date"></div>
    <div style="display:flex;align-items:flex-end"><button class="btn" id="runBtn">Run this pay period</button></div>
  </div>
  <div id="hoursWrap"></div>
  <div id="runErr"></div>
  <div id="runOut"></div>
</div>

<div class="card">
  <h2>Employees</h2>
  <div id="empList"><p class="dim">No employees yet.</p></div>
</div>

<div class="foot">Cardinal Payroll &middot; Blue Ridge Press LLC &middot; withholding figures must be verified for your tax year</div>
</div>
<div class="toast" id="toast"></div>

<script>
var META=null, APP=null, EMPLOYEES=[];
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fmt(c){var n=(c||0)/100;return '$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function toast(m){var t=document.getElementById('toast');t.textContent=m;t.className='toast show';setTimeout(function(){t.className='toast';},1900);}
function dollarsToCents(v){var n=parseFloat(String(v).replace(/[^0-9.]/g,''));return isNaN(n)?0:Math.round(n*100);}
function api(method,path,body){return fetch(path,{method:method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}).then(function(r){return r.text().then(function(t){var j=t?JSON.parse(t):null;if(r.status>=300){throw new Error((j&&j.error&&j.error.message)||('HTTP '+r.status));}return j;});});}

function fillSelect(el,items,labeler){el.innerHTML=items.map(function(x){return '<option value="'+esc(x)+'">'+esc(labeler?labeler(x):x)+'</option>';}).join('');}
function prettyFreq(f){return {weekly:'Weekly',biweekly:'Biweekly',semimonthly:'Semi-monthly',monthly:'Monthly'}[f]||f;}
function prettyFiling(s){return {single:'Single',married_joint:'Married filing jointly',head_of_household:'Head of household'}[s]||s;}

function boot(){
  api('GET','/api/app').then(function(app){
    APP=app; META=app.meta||{};
    document.getElementById('bizline').textContent='Run payroll for '+app.businessName;
    document.getElementById('bizline').title=app.jurisdiction||'';
    fillSelect(document.getElementById('freq'),(META.payFrequencies||['weekly','biweekly','semimonthly','monthly']),prettyFreq);
    document.getElementById('freq').value='biweekly';
    fillSelect(document.getElementById('filing'),(META.filingStatuses||['single','married_jointly','head_of_household']),prettyFiling);
    var d=document.getElementById('payDate'); if(!d.value){d.value=new Date().toISOString().slice(0,10);}
    loadEmployees();
  }).catch(function(e){document.getElementById('bizline').textContent='Payroll service unreachable: '+e.message;});
}

document.getElementById('ptype').onchange=function(){
  var salary=this.value==='salary';
  document.getElementById('salWrap').className=salary?'':'hidden';
  document.getElementById('rateWrap').className=salary?'hidden':'';
};

document.getElementById('addBtn').onclick=function(){
  var errEl=document.getElementById('addErr');errEl.innerHTML='';
  var payType=document.getElementById('ptype').value;
  var emp={companyId:APP.companyId,firstName:document.getElementById('fn').value.trim(),lastName:document.getElementById('ln').value.trim(),payType:payType,payFrequency:document.getElementById('freq').value,filingStatus:document.getElementById('filing').value,ncAllowances:parseInt(document.getElementById('allow').value||'0',10)||0,federalExtraWithholdingCents:dollarsToCents(document.getElementById('extra').value)};
  if(payType==='salary'){emp.annualSalaryCents=dollarsToCents(document.getElementById('salary').value);}else{emp.hourlyRateCents=dollarsToCents(document.getElementById('rate').value);}
  if(!emp.firstName||!emp.lastName){errEl.innerHTML='<div class="banner err">First and last name are required.</div>';return;}
  if(payType==='salary'&&!emp.annualSalaryCents){errEl.innerHTML='<div class="banner err">Enter an annual salary.</div>';return;}
  if(payType==='hourly'&&!emp.hourlyRateCents){errEl.innerHTML='<div class="banner err">Enter an hourly rate.</div>';return;}
  this.disabled=true;var btn=this;
  api('POST','/api/employees',emp).then(function(){
    document.getElementById('fn').value='';document.getElementById('ln').value='';document.getElementById('salary').value='';document.getElementById('rate').value='';document.getElementById('allow').value='0';document.getElementById('extra').value='0';
    toast('Employee added');loadEmployees();
  }).catch(function(e){errEl.innerHTML='<div class="banner err">'+esc(e.message)+'</div>';}).then(function(){btn.disabled=false;});
};

function loadEmployees(){
  return api('GET','/api/employees?companyId='+encodeURIComponent(APP.companyId)).then(function(list){
    EMPLOYEES=list||[];renderEmployees();renderHoursInputs();
  });
}

function compLine(e){
  if(e.payType==='salary'){return fmt(e.annualSalaryCents)+'/yr';}
  return fmt(e.hourlyRateCents)+'/hr';
}
function renderEmployees(){
  var box=document.getElementById('empList');
  if(!EMPLOYEES.length){box.innerHTML='<p class="dim">No employees yet.</p>';return;}
  var rows=EMPLOYEES.map(function(e){
    return '<tr><td><b>'+esc(e.firstName+' '+e.lastName)+'</b><div class="dim">'+prettyFreq(e.payFrequency)+' &middot; '+prettyFiling(e.filingStatus)+'</div></td><td>'+esc(compLine(e))+'</td><td><button class="btn ghost sm" data-stub="'+esc(e.id)+'">Pay stubs</button></td></tr>';
  }).join('');
  box.innerHTML='<table><thead><tr><th>Employee</th><th>Pay</th><th></th></tr></thead><tbody>'+rows+'</tbody></table><div id="stubs"></div>';
  var btns=box.querySelectorAll('[data-stub]');
  for(var i=0;i<btns.length;i++){btns[i].onclick=function(){showStubs(this.dataset.stub);};}
}

function renderHoursInputs(){
  var hourly=EMPLOYEES.filter(function(e){return e.payType==='hourly';});
  var wrap=document.getElementById('hoursWrap');
  if(!hourly.length){wrap.innerHTML='';return;}
  wrap.innerHTML='<label>Hours this period (hourly staff)</label><div class="row3">'+hourly.map(function(e){
    return '<div><span class="dim">'+esc(e.firstName+' '+e.lastName)+'</span><input data-hours="'+esc(e.id)+'" inputmode="decimal" placeholder="80"></div>';
  }).join('')+'</div>';
}

document.getElementById('runBtn').onclick=function(){
  var errEl=document.getElementById('runErr');errEl.innerHTML='';
  var payDate=document.getElementById('payDate').value;
  if(!payDate){errEl.innerHTML='<div class="banner err">Pick a check date.</div>';return;}
  var hours={};var hs=document.querySelectorAll('[data-hours]');
  for(var i=0;i<hs.length;i++){var v=parseFloat(hs[i].value);if(!isNaN(v))hours[hs[i].dataset.hours]=v;}
  this.disabled=true;var btn=this;document.getElementById('runOut').innerHTML='<p class="dim">Running&hellip;</p>';
  api('POST','/api/run-batch',{payDate:payDate,hours:hours}).then(function(res){renderRun(res);}).catch(function(e){document.getElementById('runOut').innerHTML='';errEl.innerHTML='<div class="banner err">'+esc(e.message)+'</div>';}).then(function(){btn.disabled=false;loadEmployees();});
};

function renderRun(res){
  var t=res.totals;
  var tiles='<div class="tiles">'
    +tile('Employees paid',t.employees,false)
    +tile('Total gross',fmt(t.grossCents),false)
    +tile('Employee withholding',fmt(t.employeeWithholdingCents),false)
    +tile('Net pay (take-home)',fmt(t.netCents),false)
    +tile('Employer taxes',fmt(t.employerTaxCents),false)
    +tile('Total to remit',fmt(t.totalRemittanceCents),true)
    +'</div>';
  var rows=res.lines.map(function(l){
    if(!l.ok){return '<tr><td>'+esc(l.name)+'</td><td colspan="4"><span class="pill err">skipped</span> <span class="dim">'+esc(l.error)+'</span></td></tr>';}
    var p=l.payslip;var wh=(p.socialSecurityCents+p.medicareCents+(p.additionalMedicareCents||0)+p.federalIncomeTaxCents+p.stateIncomeTaxCents);
    return '<tr><td>'+esc(l.name)+'</td><td class="num">'+fmt(p.grossCents)+'</td><td class="num">'+fmt(wh)+'</td><td class="num"><b>'+fmt(p.netCents)+'</b></td><td class="num">'+fmt(p.employer.socialSecurityCents+p.employer.medicareCents+p.employer.futaCents+p.employer.sutaCents)+'</td></tr>';
  }).join('');
  document.getElementById('runOut').innerHTML='<div class="banner note">Ran payroll for '+esc(res.payDate)+' &mdash; '+t.employees+' employee(s).</div>'+tiles
    +'<table style="margin-top:12px"><thead><tr><th>Employee</th><th class="num">Gross</th><th class="num">Withheld</th><th class="num">Net</th><th class="num">Employer tax</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function tile(k,v,remit){return '<div class="tile'+(remit?' remit':'')+'"><div class="k">'+esc(k)+'</div><div class="v">'+esc(v)+'</div></div>';}

function showStubs(empId){
  var host=document.getElementById('stubs');
  host.innerHTML='<p class="dim">Loading pay stubs&hellip;</p>';
  api('GET','/api/payslips?employeeId='+encodeURIComponent(empId)).then(function(slips){
    var emp=EMPLOYEES.filter(function(e){return e.id===empId;})[0]||{};
    if(!slips||!slips.length){host.innerHTML='<div class="card"><b>'+esc(emp.firstName+' '+emp.lastName)+'</b><p class="dim">No pay stubs yet — run a payroll.</p></div>';return;}
    slips.sort(function(a,b){return a.payDate<b.payDate?1:-1;});
    var ytdNet=slips.reduce(function(s,p){return s+p.netCents;},0);
    var ytdGross=slips.reduce(function(s,p){return s+p.grossCents;},0);
    var cards=slips.map(function(p){
      var wh=p.socialSecurityCents+p.medicareCents+(p.additionalMedicareCents||0)+p.federalIncomeTaxCents+p.stateIncomeTaxCents;
      return '<details><summary>'+esc(p.payDate)+' &mdash; net '+fmt(p.netCents)+'</summary><div class="bd">'
        +'<div><span>Gross</span><span>'+fmt(p.grossCents)+'</span></div>'
        +'<div><span>Social Security</span><span>-'+fmt(p.socialSecurityCents)+'</span></div>'
        +'<div><span>Medicare</span><span>-'+fmt(p.medicareCents+(p.additionalMedicareCents||0))+'</span></div>'
        +'<div><span>Federal income tax</span><span>-'+fmt(p.federalIncomeTaxCents)+'</span></div>'
        +'<div><span>NC state income tax</span><span>-'+fmt(p.stateIncomeTaxCents)+'</span></div>'
        +(p.preTaxDeductionsCents?'<div><span>Pre-tax deductions</span><span>-'+fmt(p.preTaxDeductionsCents)+'</span></div>':'')
        +(p.postTaxDeductionsCents?'<div><span>Post-tax deductions</span><span>-'+fmt(p.postTaxDeductionsCents)+'</span></div>':'')
        +'<div class="net"><span>Net pay</span><span>'+fmt(p.netCents)+'</span></div></div></details>';
    }).join('');
    host.innerHTML='<div class="card"><b>'+esc(emp.firstName+' '+emp.lastName)+'</b> <span class="dim">&middot; YTD gross '+fmt(ytdGross)+' &middot; YTD net '+fmt(ytdNet)+'</span><div style="margin-top:8px">'+cards+'</div></div>';
  }).catch(function(e){host.innerHTML='<div class="banner err">'+esc(e.message)+'</div>';});
}

boot();
</script>
</body>
</html>`;
