/**
 * Cardinal Verify — three self-contained pages (no external assets), each a
 * small SPA that talks to the same-origin JSON API. Tokens are read from the
 * URL path so the consent and verifier pages are static shells.
 *
 * - APP_PAGE       the business console (/), password-gated in production
 * - CONSENT_PAGE   the candidate's disclosure + e-sign page (/c/:token)
 * - VERIFIER_PAGE  a source's attestation form (/v/:token)
 */

function head(title: string): string {
  return (
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark">' +
    '<title>' + title + '</title>' +
    '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'%3E%3Crect width=\'32\' height=\'32\' rx=\'7\' fill=\'%23A31B33\'/%3E%3Cpath d=\'M9 16l5 5 9-10\' stroke=\'white\' stroke-width=\'3\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E">' +
    '<style>' + CSS + '</style></head><body>'
  );
}
const foot = '</body></html>';

const CSS =
  ":root{--paper:#F7F2E6;--surface:#FFFDF7;--surface-2:#F1EAD8;--ink:#17233F;--muted:#6B6350;--line:#E2D9C3;--brand:#A31B33;--brand-strong:#7E1226;--good:#2E7D4F;--good-bg:#E4F0E8;--warn:#B0771C;--warn-bg:#F6ECD8;--crit:#B23A3A;--crit-bg:#F6E1DE;--shadow:0 1px 2px rgba(23,35,63,.07),0 10px 26px -14px rgba(23,35,63,.24);--font:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;--mono:ui-monospace,Menlo,Consolas,monospace;--radius:14px}" +
  "@media(prefers-color-scheme:dark){:root{--paper:#101627;--surface:#172033;--surface-2:#1E293C;--ink:#F3EEE1;--muted:#A9A28F;--line:#2B3855;--brand:#E2586B;--brand-strong:#F27A8B;--good:#4FBE86;--good-bg:#123020;--warn:#D6A24A;--warn-bg:#33280F;--crit:#E07B6E;--crit-bg:#3A1D1A;--shadow:0 1px 2px rgba(0,0,0,.45),0 12px 32px -14px rgba(0,0,0,.65)}}" +
  "*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--font);line-height:1.55}" +
  ".wrap{max-width:920px;margin-inline:auto;padding:28px clamp(16px,4vw,32px) 64px}" +
  ".narrow{max-width:600px}" +
  ".head{display:flex;align-items:center;gap:11px;margin-bottom:20px}" +
  ".glyph{width:36px;height:36px;border-radius:9px;background:var(--brand);color:#fff;display:grid;place-items:center;font-weight:800;box-shadow:var(--shadow)}" +
  "h1{font-size:clamp(1.35rem,1.1rem+1vw,1.7rem);margin:0;letter-spacing:-.02em}.hsub{color:var(--muted);font-size:.82rem}" +
  "h2{font-size:1.02rem;margin:0}.lead{color:var(--muted);font-size:.92rem;margin:.2rem 0 1.2rem}" +
  ".card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:18px 20px;margin-bottom:16px}" +
  ".card .ch{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}" +
  "label{display:block;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:0 0 5px}" +
  ".field{margin-bottom:12px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:520px){.row{grid-template-columns:1fr}}" +
  "input,select,textarea{width:100%;padding:.58rem .62rem;border:1px solid var(--line);border-radius:9px;background:var(--paper);color:var(--ink);font:inherit}" +
  "textarea{min-height:70px;resize:vertical}" +
  "input:focus,select:focus,textarea:focus,button:focus-visible{outline:2px solid var(--brand);outline-offset:1px}" +
  ".btn{background:var(--brand);color:#fff;border:0;border-radius:10px;padding:.62rem 1rem;font-weight:700;font-size:.88rem;cursor:pointer;box-shadow:var(--shadow)}" +
  ".btn:hover{background:var(--brand-strong)}.btn:disabled{opacity:.55;cursor:progress}" +
  ".btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line);box-shadow:none}.btn.ghost:hover{border-color:var(--brand);color:var(--brand)}" +
  ".btn.sm{padding:.34rem .58rem;font-size:.76rem;border-radius:8px}" +
  ".items{display:flex;flex-direction:column;gap:10px;margin:6px 0 10px}" +
  ".irow{display:grid;grid-template-columns:130px 1fr 1fr 28px;gap:8px;align-items:center}@media(max-width:640px){.irow{grid-template-columns:1fr 1fr}}" +
  ".irow .del{background:transparent;border:0;color:var(--muted);cursor:pointer;font-size:1.05rem}.irow .del:hover{color:var(--crit)}" +
  "table{width:100%;border-collapse:collapse;font-size:.86rem}th{text-align:left;font-size:.66rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding:9px 6px;border-bottom:1px solid var(--line)}td{padding:10px 6px;border-bottom:1px solid var(--line);vertical-align:top}" +
  ".pill{display:inline-flex;align-items:center;gap:5px;padding:.16rem .5rem;border-radius:999px;font-size:.7rem;font-weight:700}.pill::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor}" +
  ".s-awaiting_consent{color:var(--warn);background:var(--warn-bg)}.s-in_progress{color:var(--warn);background:var(--warn-bg)}.s-completed{color:var(--good);background:var(--good-bg)}.s-canceled,.s-declined{color:var(--muted);background:var(--surface-2)}.s-pending{color:var(--warn);background:var(--warn-bg)}" +
  ".mono{font-family:var(--mono);font-size:.78rem}.dim{color:var(--muted)}.link{display:flex;gap:6px;align-items:center;margin-top:4px}.link input{font-family:var(--mono);font-size:.72rem;padding:.3rem .4rem}" +
  ".banner{padding:.6rem .8rem;border-radius:10px;font-size:.86rem;margin:10px 0}.banner.err{background:var(--crit-bg);border:1px solid var(--crit)}.banner.ok{background:var(--good-bg);border:1px solid var(--good)}" +
  ".discl{background:var(--surface-2);border:1px solid var(--line);border-radius:11px;padding:14px 16px;font-size:.86rem;color:var(--muted);margin:10px 0}" +
  ".big{text-align:center;padding:22px 8px}.big .em{font-size:2.4rem}.toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%) translateY(18px);background:var(--ink);color:var(--paper);padding:.55rem 1rem;border-radius:10px;font-size:.84rem;font-weight:600;opacity:0;pointer-events:none;transition:.25s;box-shadow:var(--shadow)}.toast.on{opacity:1;transform:translateX(-50%)}" +
  "footer{color:var(--muted);font-size:.74rem;text-align:center;margin-top:18px}";

// Shared client helpers injected into each page's script.
const HELPERS =
  "function esc(s){return String(s==null?'':s).replace(/[&<>\"]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m];});}" +
  "function api(m,p,b){return fetch(p,{method:m,headers:{'content-type':'application/json'},body:b===undefined?undefined:JSON.stringify(b)}).then(function(r){return r.text().then(function(t){var j=t?JSON.parse(t):null;if(!r.ok)throw new Error((j&&j.error&&j.error.message)||('HTTP '+r.status));return j;});});}" +
  "function tokenFromPath(){var p=location.pathname.split('/').filter(Boolean);return p[p.length-1];}" +
  "function toast(m){var t=document.getElementById('toast');t.textContent=m;t.className='toast on';clearTimeout(t._t);t._t=setTimeout(function(){t.className='toast';},2200);}";

// ============================ BUSINESS CONSOLE ============================
const APP_BODY =
  '<div class="wrap">' +
  '<div class="head"><span class="glyph">&#10003;</span><div><h1>Cardinal Verify</h1><div class="hsub" id="biz">Consent-based reference &amp; employment checks</div></div></div>' +
  '<div class="card"><h2>New verification request</h2><p class="lead">Add the candidate, then who should confirm their references, past employers, or schools. The candidate consents before anyone is contacted.</p>' +
  '<div class="row"><div class="field"><label>Candidate first name</label><input id="fn"></div><div class="field"><label>Candidate last name</label><input id="ln"></div></div>' +
  '<div class="field"><label>Candidate email</label><input id="em" type="email" placeholder="candidate@email.com"></div>' +
  '<label>Who to verify</label><div class="items" id="items"></div><button class="btn ghost sm" id="add" type="button">+ Add reference / employer / school</button>' +
  '<div id="rqbanner"></div><div style="margin-top:14px"><button class="btn" id="create">Create request</button></div></div>' +
  '<div class="card"><h2>Requests</h2><div id="list"><p class="dim">Loading…</p></div></div>' +
  '<footer>Consent-based verification only \u00b7 no criminal or credit data. For those, connect a CRA.</footer></div><div class="toast" id="toast"></div>';

const APP_SCRIPT =
  '<script>' + HELPERS +
  'var CO=localStorage.getItem("verify.co");' +
  'var draft=[];' +
  'function bootCompany(){if(CO)return Promise.resolve();var name=localStorage.getItem("verify.bizname")||"Blue Ridge Press LLC";return api("POST","/api/companies",{name:name}).then(function(c){CO=c.id;localStorage.setItem("verify.co",CO);});}' +
  'function itemRow(it,i){var opt=function(v,l){return "<option value=\\""+v+"\\""+(it.type===v?" selected":"")+">"+l+"</option>";};' +
  'return "<div class=\\"irow\\"><select data-i=\\""+i+"\\" data-k=\\"type\\">"+opt("reference","Reference")+opt("employment","Past employer")+opt("education","School")+"</select>"' +
  '+"<input data-i=\\""+i+"\\" data-k=\\"subject\\" placeholder=\\""+(it.type==="employment"?"Employer name":it.type==="education"?"School name":"Reference name")+"\\" value=\\""+esc(it.subject)+"\\">"' +
  '+"<input data-i=\\""+i+"\\" data-k=\\"contactEmail\\" placeholder=\\"their email\\" value=\\""+esc(it.contactEmail)+"\\">"' +
  '+"<button class=\\"del\\" data-del=\\""+i+"\\" type=\\"button\\">&times;</button></div>";}' +
  'function renderItems(){var box=document.getElementById("items");box.innerHTML=draft.map(itemRow).join("");' +
  'var ins=box.querySelectorAll("select,input");for(var k=0;k<ins.length;k++)ins[k].oninput=function(){draft[+this.dataset.i][this.dataset.k]=this.value;if(this.dataset.k==="type")renderItems();};' +
  'var dels=box.querySelectorAll("[data-del]");for(var d=0;d<dels.length;d++)dels[d].onclick=function(){draft.splice(+this.dataset.del,1);if(!draft.length)draft.push({type:"reference",subject:"",contactEmail:""});renderItems();};}' +
  'document.getElementById("add").onclick=function(){draft.push({type:"reference",subject:"",contactEmail:""});renderItems();};' +
  'document.getElementById("create").onclick=function(){' +
  'var fn=document.getElementById("fn").value.trim(),ln=document.getElementById("ln").value.trim(),em=document.getElementById("em").value.trim();' +
  'var items=draft.filter(function(x){return x.subject.trim()&&x.contactEmail.trim();});' +
  'var b=document.getElementById("rqbanner");' +
  'if(!fn||!ln||!em){b.className="banner err";b.textContent="Enter the candidate\\u2019s name and email.";return;}' +
  'if(!items.length){b.className="banner err";b.textContent="Add at least one reference, employer, or school (with an email).";return;}' +
  'b.className="";b.textContent="";document.getElementById("create").disabled=true;' +
  'api("POST","/api/candidates",{companyId:CO,firstName:fn,lastName:ln,email:em}).then(function(cand){' +
  'return api("POST","/api/requests",{companyId:CO,candidateId:cand.id,items:items});}).then(function(){' +
  'document.getElementById("fn").value="";document.getElementById("ln").value="";document.getElementById("em").value="";draft=[{type:"reference",subject:"",contactEmail:""}];renderItems();toast("Request created \\u2014 consent link emailed to the candidate");return load();})' +
  '.catch(function(e){b.className="banner err";b.textContent=e.message;}).then(function(){document.getElementById("create").disabled=false;});};' +
  'function origin(){return location.origin;}' +
  'function copyLink(v){navigator.clipboard&&navigator.clipboard.writeText(v);toast("Link copied");}' +
  'function reqCard(v){var r=v.request,c=v.candidate,p=v.progress;' +
  'var consentUrl=origin()+"/c/"+r.consentToken;' +
  'var head="<div class=\\"ch\\"><div><b>"+esc(c.firstName+" "+c.lastName)+"</b> <span class=\\"dim mono\\">"+esc(c.email)+"</span></div><span class=\\"pill s-"+r.status+"\\">"+r.status.replace(/_/g," ")+"</span></div>";' +
  'var body="";' +
  'if(!r.consent){body+="<div class=\\"link\\"><input readonly value=\\""+esc(consentUrl)+"\\"><button class=\\"btn ghost sm\\" onclick=\\"copyLink(this.previousElementSibling.value)\\">Copy consent link</button></div><p class=\\"dim\\" style=\\"font-size:.8rem\\">Emailed to the candidate \\u2014 copy it here if you\\u2019d rather send it yourself. Nothing is contacted until they sign.</p>";}' +
  'else{body+="<p class=\\"dim\\" style=\\"font-size:.8rem\\">\\u2713 Consented by "+esc(r.consent.signedName)+" \\u00b7 "+new Date(r.consent.signedAt).toLocaleString()+" \\u00b7 "+p.completed+"/"+p.total+" back</p>";' +
  'body+="<table><thead><tr><th>Type</th><th>Who</th><th>Status</th><th>Result / link</th></tr></thead><tbody>";' +
  'body+=r.items.map(function(it){var verUrl=origin()+"/v/"+it.token;var res="";' +
  'if(it.status==="completed"&&it.response){res="<b>"+(it.response.confirmed?"Confirmed":"Not confirmed")+"</b> by "+esc(it.response.verifierName);var a=it.response.answers||{};res+=Object.keys(a).map(function(kk){return "<div class=\\"dim\\" style=\\"font-size:.78rem\\">"+esc(kk)+": "+esc(a[kk])+"</div>";}).join("");}' +
  'else if(it.status==="declined"){res="<span class=\\"dim\\">declined</span>";}' +
  'else{res="<div class=\\"link\\"><input readonly value=\\""+esc(verUrl)+"\\"><button class=\\"btn ghost sm\\" onclick=\\"copyLink(this.previousElementSibling.value)\\">Copy</button></div>";}' +
  'return "<tr><td>"+it.type+"</td><td>"+esc(it.subject)+(it.detail?"<div class=\\"dim\\" style=\\"font-size:.78rem\\">"+esc(it.detail)+"</div>":"")+"<div class=\\"dim mono\\" style=\\"font-size:.72rem\\">"+esc(it.contactEmail)+"</div></td><td><span class=\\"pill s-"+it.status+"\\">"+it.status+"</span></td><td>"+res+"</td></tr>";}).join("");' +
  'body+="</tbody></table>";}' +
  'if(v.certificate){var ct=v.certificate;body+="<div class=\\"discl\\" style=\\"display:flex;gap:15px;align-items:center;flex-wrap:wrap\\"><img alt=\\"Report QR code\\" width=\\"104\\" height=\\"104\\" style=\\"background:#fff;border-radius:8px;padding:5px\\" src=\\"/api/certificate/"+encodeURIComponent(r.id)+"/qr\\"><div style=\\"min-width:200px;flex:1\\"><div class=\\"dim\\" style=\\"font-size:.66rem;text-transform:uppercase;letter-spacing:.06em\\">Report authenticity \\u2014 scan to verify</div><div class=\\"mono\\" style=\\"font-size:.98rem;margin-top:2px\\"><b>"+esc(ct.trackingNumber)+"</b></div><div class=\\"mono dim\\" style=\\"font-size:.78rem\\">code "+esc(ct.verificationCode)+"</div><div class=\\"link\\"><input readonly value=\\""+esc(ct.verifyUrl)+"\\"><button class=\\"btn ghost sm\\" onclick=\\"copyLink(this.previousElementSibling.value)\\">Copy link</button></div><div style=\\"margin-top:8px\\"><a class=\\"btn sm\\" style=\\"text-decoration:none\\" href=\\"/api/requests/"+encodeURIComponent(r.id)+"/report.pdf\\" target=\\"_blank\\">Download PDF report</a></div></div></div>";}' +
  'return "<div class=\\"card\\">"+head+body+"</div>";}' +
  'function load(){return api("GET","/api/requests?companyId="+encodeURIComponent(CO)).then(function(rs){' +
  'var el=document.getElementById("list");if(!rs.length){el.innerHTML="<p class=\\"dim\\">No requests yet. Create one above.</p>";return;}' +
  'rs.sort(function(a,b){return (b.createdAt||"").localeCompare(a.createdAt||"");});' +
  'return Promise.all(rs.map(function(r){return api("GET","/api/requests/"+r.id);})).then(function(views){el.innerHTML=views.map(reqCard).join("");});});}' +
  'draft=[{type:"reference",subject:"",contactEmail:""}];renderItems();' +
  'bootCompany().then(load).catch(function(e){document.getElementById("list").innerHTML="<div class=\\"banner err\\">"+esc(e.message)+"</div>";});' +
  '</script>';

// ============================ CONSENT PAGE ============================
const CONSENT_BODY =
  '<div class="wrap narrow"><div class="head"><span class="glyph">&#10003;</span><h1>Authorize verification</h1></div>' +
  '<div id="c"><p class="dim">Loading…</p></div></div><div class="toast" id="toast"></div>';

const CONSENT_SCRIPT =
  '<script>' + HELPERS +
  'var TK=tokenFromPath();' +
  'api("GET","/api/consent/"+TK).then(function(d){var el=document.getElementById("c");' +
  'if(d.alreadyConsented){el.innerHTML="<div class=\\"big\\"><div class=\\"em\\">\\u2705</div><h2>Thank you</h2><p class=\\"dim\\">You have already authorized this. Nothing further is needed.</p></div>";return;}' +
  'var list=d.items.map(function(it){return "<li>"+esc(it.type==="employment"?"Employment at ":it.type==="education"?"Education at ":"Reference: ")+"<b>"+esc(it.subject)+"</b></li>";}).join("");' +
  'el.innerHTML="<div class=\\"card\\"><p>Hi "+esc(d.candidateFirstName)+",</p><p><b>"+esc(d.companyName)+"</b> would like to verify the following as part of considering you. They will contact only the people/organizations you\\u2019ve listed, and only about this:</p>"' +
  '+"<ul>"+list+"</ul>"' +
  '+"<div class=\\"discl\\">By typing your name and clicking <b>Authorize</b>, you confirm you are "+esc(d.candidateFirstName)+" and you authorize "+esc(d.companyName)+" to contact these sources to verify the information above. This authorization is limited to reference, employment, and education verification \\u2014 it does not authorize criminal or credit checks. Disclosure version "+esc(d.disclosureVersion)+".</div>"' +
  '+"<div class=\\"field\\"><label>Type your full name to sign</label><input id=\\"sig\\" placeholder=\\"Your full name\\"></div>"' +
  '+"<div id=\\"cb\\"></div><button class=\\"btn\\" id=\\"go\\">Authorize</button></div>";' +
  'document.getElementById("go").onclick=function(){var nm=document.getElementById("sig").value.trim();var b=document.getElementById("cb");' +
  'if(!nm){b.className="banner err";b.textContent="Please type your name to sign.";return;}b.textContent="";b.className="";document.getElementById("go").disabled=true;' +
  'api("POST","/api/consent/"+TK,{signedName:nm}).then(function(){document.getElementById("c").innerHTML="<div class=\\"big\\"><div class=\\"em\\">\\u2705</div><h2>Authorized \\u2014 thank you</h2><p class=\\"dim\\">"+esc(d.companyName)+" can now verify your references. You can close this page.</p></div>";})' +
  '.catch(function(e){b.className="banner err";b.textContent=e.message;document.getElementById("go").disabled=false;});};' +
  '}).catch(function(e){document.getElementById("c").innerHTML="<div class=\\"banner err\\">This link is not valid: "+esc(e.message)+"</div>";});' +
  '</script>';

// ============================ VERIFIER PAGE ============================
const VERIFIER_BODY =
  '<div class="wrap narrow"><div class="head"><span class="glyph">&#10003;</span><h1>Verification request</h1></div>' +
  '<div id="v"><p class="dim">Loading…</p></div></div><div class="toast" id="toast"></div>';

const VERIFIER_SCRIPT =
  '<script>' + HELPERS +
  'var TK=tokenFromPath();' +
  'api("GET","/api/verify/"+TK).then(function(d){var el=document.getElementById("v");var it=d.item;' +
  'if(d.alreadyResponded){el.innerHTML="<div class=\\"big\\"><div class=\\"em\\">\\u2705</div><h2>Already received</h2><p class=\\"dim\\">Thanks \\u2014 your response was recorded.</p></div>";return;}' +
  'var intro=it.type==="employment"?("confirm that <b>"+esc(d.candidateName)+"</b> worked at <b>"+esc(it.subject)+"</b>"):it.type==="education"?("confirm <b>"+esc(d.candidateName)+"</b>\\u2019s education at <b>"+esc(it.subject)+"</b>"):("give a reference for <b>"+esc(d.candidateName)+"</b>");' +
  'var qs=it.type==="employment"?[["dates","Dates of employment"],["title","Job title"],["rehire","Would you rehire? (yes/no)"]]:it.type==="education"?[["dates","Dates attended"],["credential","Degree / credential earned"]]:[["relationship","How do you know them?"],["dates","For how long?"],["rehire","Would you recommend them? (yes/no)"]];' +
  'var fields=qs.map(function(q){return "<div class=\\"field\\"><label>"+esc(q[1])+"</label><input data-q=\\""+q[0]+"\\"></div>";}).join("");' +
  'el.innerHTML="<div class=\\"card\\"><p><b>"+esc(d.companyName)+"</b> asked you to "+intro+", with the candidate\\u2019s consent.</p>"' +
  '+"<div class=\\"field\\"><label>Your name</label><input id=\\"vn\\" placeholder=\\"Your full name\\"></div>"+fields' +
  '+"<div class=\\"field\\"><label>Anything else (optional)</label><textarea data-q=\\"comments\\"></textarea></div>"' +
  '+"<div id=\\"vb\\"></div><div style=\\"display:flex;gap:10px;margin-top:6px\\"><button class=\\"btn\\" id=\\"submit\\">Submit</button><button class=\\"btn ghost\\" id=\\"decline\\">I can\\u2019t help</button></div></div>";' +
  'function collect(){var a={};var ins=document.querySelectorAll("[data-q]");for(var i=0;i<ins.length;i++){if(ins[i].value.trim())a[ins[i].dataset.q]=ins[i].value.trim();}return a;}' +
  'document.getElementById("submit").onclick=function(){var vn=document.getElementById("vn").value.trim();var b=document.getElementById("vb");if(!vn){b.className="banner err";b.textContent="Please enter your name.";return;}b.textContent="";b.className="";this.disabled=true;' +
  'var ans=collect();var confirmed=true;var rh=(ans.rehire||"").toLowerCase();if(rh==="no")confirmed=false;' +
  'api("POST","/api/verify/"+TK,{verifierName:vn,confirmed:confirmed,answers:ans}).then(function(){document.getElementById("v").innerHTML="<div class=\\"big\\"><div class=\\"em\\">\\u2705</div><h2>Thank you</h2><p class=\\"dim\\">Your response was recorded for "+esc(d.companyName)+".</p></div>";}).catch(function(e){b.className="banner err";b.textContent=e.message;document.getElementById("submit").disabled=false;});};' +
  'document.getElementById("decline").onclick=function(){var vn=document.getElementById("vn").value.trim()||"(declined)";api("POST","/api/verify/"+TK,{verifierName:vn,declined:true}).then(function(){document.getElementById("v").innerHTML="<div class=\\"big\\"><h2>Understood</h2><p class=\\"dim\\">Thanks \\u2014 no problem. You can close this page.</p></div>";}).catch(function(e){toast(e.message);});};' +
  '}).catch(function(e){document.getElementById("v").innerHTML="<div class=\\"banner err\\">This link is not active: "+esc(e.message)+"</div>";});' +
  '</script>';

// ============================ CERTIFICATE PAGE ============================
// Public authenticity lookup — the target of a report's tracking number / QR.
// Reads ?ref=<tracking>&code=<code> and renders a privacy-preserving certificate.
const CERT_BODY =
  '<div class="wrap narrow"><div class="head"><span class="glyph">&#10003;</span><div><h1>Verify a report</h1>' +
  '<div class="hsub">Confirm a Blue Ridge Press LLC verification report is authentic</div></div></div>' +
  '<div class="card"><p class="lead">Enter the tracking number and verification code printed on the report. We\u2019ll confirm it\u2019s genuine \u2014 without exposing the candidate\u2019s private details.</p>' +
  '<div class="row"><div class="field"><label>Tracking number</label><input id="ref" placeholder="BRP-2026-XXXXXX" autocapitalize="characters"></div>' +
  '<div class="field"><label>Verification code</label><input id="code" placeholder="XXXX-XXXX" autocapitalize="characters"></div></div>' +
  '<div id="cb"></div><button class="btn" id="go">Verify report</button></div>' +
  '<div id="result"></div>' +
  '<footer>Blue Ridge Press LLC \u00b7 Consent-based verification of references, employment &amp; education. Not a consumer-reporting agency.</footer>' +
  '</div><div class="toast" id="toast"></div>';

const CERT_SCRIPT =
  '<script>' + HELPERS +
  'var Q=new URLSearchParams(location.search);' +
  'function label(r){return r==="all_confirmed"?"All sources confirmed":r==="partial"?"Partly confirmed":"Not yet complete";}' +
  'function cls(r){return r==="all_confirmed"?"completed":r==="partial"?"in_progress":"pending";}' +
  'function render(d){var el=document.getElementById("result");' +
  'var rows=[["Issued by",esc(d.issuer)],["Report",esc(d.trackingNumber)],["Requested by",esc(d.requestedBy)],["Candidate",esc(d.candidateInitials)+" (initials)"],["Scope",esc(d.scope.join(", "))],["Sources",d.sources.confirmed+" confirmed \\u00b7 "+d.sources.declined+" declined \\u00b7 "+d.sources.pending+" pending of "+d.sources.total],["Issued",d.issuedAt?new Date(d.issuedAt).toLocaleString():"\\u2014"]];' +
  'var body=rows.map(function(r){return "<tr><td class=\\"dim\\" style=\\"width:38%\\">"+r[0]+"</td><td><b>"+r[1]+"</b></td></tr>";}).join("");' +
  'el.innerHTML="<div class=\\"card\\"><div class=\\"big\\" style=\\"padding:14px 8px 8px\\"><div class=\\"em\\">\\u2705</div><h2>Authentic report</h2>"' +
  '+"<p style=\\"margin:.4rem 0 0\\"><span class=\\"pill s-"+cls(d.result)+"\\">"+esc(label(d.result))+"</span></p></div>"' +
  '+"<table><tbody>"+body+"</tbody></table>"' +
  '+"<div class=\\"discl\\"><b>Integrity seal ("+esc(d.integrity.algorithm)+"):</b><div class=\\"mono\\" style=\\"word-break:break-all;margin-top:4px\\">"+esc(d.integrity.hash)+"</div>This seal is computed from the report\\u2019s exact findings. If any finding were altered, it would no longer match \\u2014 proving the report you\\u2019re holding is unchanged.</div></div>";}' +
  'function lookup(ref,code){var b=document.getElementById("cb");b.textContent="";b.className="";var btn=document.getElementById("go");btn.disabled=true;' +
  'document.getElementById("result").innerHTML="";' +
  'api("GET","/api/certificate/"+encodeURIComponent(ref)+"?code="+encodeURIComponent(code)).then(function(d){render(d);}).catch(function(e){' +
  'document.getElementById("result").innerHTML="<div class=\\"card\\"><div class=\\"big\\"><div class=\\"em\\">\\u26A0\\uFE0F</div><h2>We couldn\\u2019t verify that</h2><p class=\\"dim\\">No report matches that tracking number and code. Check both are typed exactly as printed on the report.</p></div></div>";}).then(function(){btn.disabled=false;});}' +
  'document.getElementById("go").onclick=function(){var ref=document.getElementById("ref").value.trim();var code=document.getElementById("code").value.trim();var b=document.getElementById("cb");if(!ref||!code){b.className="banner err";b.textContent="Enter both the tracking number and the code.";return;}lookup(ref,code);};' +
  'var pref=Q.get("ref"),pcode=Q.get("code");if(pref)document.getElementById("ref").value=pref;if(pcode)document.getElementById("code").value=pcode;if(pref&&pcode)lookup(pref,pcode);' +
  '</script>';

export const APP_PAGE = head('Cardinal Verify') + APP_BODY + APP_SCRIPT + foot;
export const CONSENT_PAGE = head('Authorize verification') + CONSENT_BODY + CONSENT_SCRIPT + foot;
export const VERIFIER_PAGE = head('Verification request') + VERIFIER_BODY + VERIFIER_SCRIPT + foot;
export const CERTIFICATE_PAGE = head('Verify a report \u00b7 Blue Ridge Press LLC') + CERT_BODY + CERT_SCRIPT + foot;
