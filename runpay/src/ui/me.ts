/**
 * Cardinal Payroll — employee self-service page (the "MyPay" surface).
 *
 * Served at /me/:token. Read-only: the employee sees their own pay setup,
 * year-to-date gross/net, and every pay stub itemized. The token in the path is
 * verified server-side and scopes the data to just this employee — the page
 * never has admin access and can't reach anyone else's pay.
 */

export const ME_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Pay — Cardinal Payroll</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23A31B33'/%3E%3Cpath d='M8 22V10h4l4 6 4-6h4v12' stroke='white' stroke-width='2.5' fill='none' stroke-linejoin='round' stroke-linecap='round'/%3E%3C/svg%3E">
<style>
:root{--paper:#F7F2E6;--card:#fff;--ink:#17233F;--muted:#5b6472;--brand:#A31B33;--line:#e7e0cf;--ok:#1c7c4c;--okbg:#e7f4ec;--errbg:#fbe9ec;--shadow:0 1px 3px rgba(23,35,63,.08),0 1px 2px rgba(23,35,63,.06)}
@media (prefers-color-scheme:dark){:root{--paper:#0f1523;--card:#161f33;--ink:#e8ecf5;--muted:#93a0b8;--brand:#e0566e;--line:#243049;--ok:#54c98a;--okbg:#12301f;--errbg:#3a1620;--shadow:0 1px 3px rgba(0,0,0,.4)}}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.45}
.wrap{max-width:680px;margin:0 auto;padding:20px 18px 64px}
header{display:flex;align-items:center;gap:12px;margin:8px 0 18px}
.logo{width:38px;height:38px;border-radius:9px;background:var(--brand);display:grid;place-items:center;color:#fff;font-weight:800;flex:0 0 auto}
h1{font-size:1.3rem;margin:0}
.sub{color:var(--muted);font-size:.85rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);padding:18px;margin-bottom:16px}
.tiles{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tile{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:12px}
.tile .k{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.03em}
.tile .v{font-size:1.35rem;font-weight:700;font-variant-numeric:tabular-nums;margin-top:2px}
.meta{color:var(--muted);font-size:.85rem;margin-top:4px}
details{border-bottom:1px solid var(--line);padding:.35rem 0}
details summary{cursor:pointer;display:flex;justify-content:space-between;font-size:.92rem;font-weight:600;list-style:none}
details summary::-webkit-details-marker{display:none}
summary .amt{font-variant-numeric:tabular-nums}
.bd{font-size:.85rem;margin:8px 0 4px}
.bd div{display:flex;justify-content:space-between;padding:.2rem 0;border-bottom:1px dotted var(--line)}
.bd .net{font-weight:700;border-bottom:0;color:var(--ok)}
.banner.err{background:var(--errbg);color:var(--brand);padding:.7rem .8rem;border-radius:8px}
h2{font-size:1.02rem;margin:0 0 10px}
.foot{color:var(--muted);font-size:.75rem;text-align:center;margin-top:12px}
</style>
</head>
<body>
<div class="wrap">
<header>
  <div class="logo">CP</div>
  <div>
    <h1 id="who">My Pay</h1>
    <div class="sub" id="setup">loading&hellip;</div>
  </div>
</header>
<div id="main"><p class="sub">Loading your pay information&hellip;</p></div>
<div class="foot">Cardinal Payroll &middot; this is your personal pay record &middot; figures are withholding estimates</div>
</div>
<script>
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fmt(c){return '$'+((c||0)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function prettyFreq(f){return {weekly:'Weekly',biweekly:'Biweekly',semimonthly:'Semi-monthly',monthly:'Monthly'}[f]||f;}
function prettyFiling(s){return {single:'Single',married_joint:'Married filing jointly',head_of_household:'Head of household'}[s]||s;}
var parts=location.pathname.split('/').filter(Boolean);
var token=parts.length>1?parts.slice(1).join('/'):'';
fetch('/api/me/'+encodeURIComponent(token)).then(function(r){return r.text().then(function(t){var j=t?JSON.parse(t):null;if(r.status>=300)throw new Error((j&&j.error&&j.error.message)||('HTTP '+r.status));return j;});}).then(function(d){
  var e=d.employee;
  document.getElementById('who').textContent='Hi, '+e.firstName;
  var comp=e.payType==='salary'?(fmt(e.annualSalaryCents)+'/yr'):(fmt(e.hourlyRateCents)+'/hr');
  document.getElementById('setup').textContent=comp+' \\u00b7 '+prettyFreq(e.payFrequency)+' \\u00b7 '+prettyFiling(e.filingStatus);
  var html='<div class="card"><h2>This year so far</h2><div class="tiles">'
    +'<div class="tile"><div class="k">YTD gross</div><div class="v">'+fmt(d.ytd.grossCents)+'</div></div>'
    +'<div class="tile"><div class="k">YTD take-home</div><div class="v">'+fmt(d.ytd.netCents)+'</div></div></div></div>';
  if(!d.payslips.length){
    html+='<div class="card"><h2>Pay stubs</h2><p class="sub">No pay stubs yet.</p></div>';
  }else{
    var stubs=d.payslips.map(function(p){
      var addlMed=p.additionalMedicareCents||0;
      return '<details><summary><span>'+esc(p.payDate)+'</span><span class="amt">'+fmt(p.netCents)+'</span></summary><div class="bd">'
        +'<div><span>Gross'+(p.hours?(' ('+esc(p.hours)+' hrs)'):'')+'</span><span>'+fmt(p.grossCents)+'</span></div>'
        +'<div><span>Social Security</span><span>-'+fmt(p.socialSecurityCents)+'</span></div>'
        +'<div><span>Medicare</span><span>-'+fmt(p.medicareCents+addlMed)+'</span></div>'
        +'<div><span>Federal income tax</span><span>-'+fmt(p.federalIncomeTaxCents)+'</span></div>'
        +'<div><span>NC state income tax</span><span>-'+fmt(p.stateIncomeTaxCents)+'</span></div>'
        +(p.preTaxDeductionsCents?'<div><span>Pre-tax deductions</span><span>-'+fmt(p.preTaxDeductionsCents)+'</span></div>':'')
        +(p.postTaxDeductionsCents?'<div><span>Post-tax deductions</span><span>-'+fmt(p.postTaxDeductionsCents)+'</span></div>':'')
        +'<div class="net"><span>Net pay</span><span>'+fmt(p.netCents)+'</span></div></div></details>';
    }).join('');
    html+='<div class="card"><h2>Pay stubs</h2>'+stubs+'</div>';
  }
  document.getElementById('main').innerHTML=html;
}).catch(function(err){
  document.getElementById('setup').textContent='';
  document.getElementById('main').innerHTML='<div class="banner err">This pay link isn\\u2019t valid: '+esc(err.message)+'</div>';
});
</script>
</body>
</html>`;
