/**
 * The public, client-facing booking page, served as one self-contained document
 * (no external assets). It calls only this server's `/api/services` and
 * `/api/book`. `renderPage` injects the business name.
 */

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!));
}

export function renderPage(businessName: string): string {
  const name = esc(businessName);
  return /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Book with ${name}</title>
<meta name="description" content="Request an appointment with ${name}.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23A31B33'/%3E%3Ctext x='16' y='23' font-family='system-ui' font-size='20' font-weight='900' text-anchor='middle' fill='white'%3E%E2%9C%A6%3C/text%3E%3C/svg%3E">
<style>
  :root{--paper:#F7F2E6;--surface:#FFFDF7;--surface-2:#EFE7D3;--ink:#17233F;--muted:#6B6350;--line:#E2D9C3;
    --brand:#A31B33;--brand-strong:#7E1226;--good:#2E7D4F;--good-bg:#E4F0E8;--crit:#B23A3A;--crit-bg:#F6E1DE;
    --shadow:0 1px 2px rgba(23,35,63,.07),0 14px 34px -18px rgba(23,35,63,.3);
    --font:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;--mono:ui-monospace,Menlo,Consolas,monospace;}
  @media (prefers-color-scheme:dark){:root{--paper:#101627;--surface:#172033;--surface-2:#1F2A42;--ink:#F3EEE1;--muted:#A9A28F;--line:#2B3855;--brand:#E2586B;--brand-strong:#F27A8B;--good:#4FBE86;--good-bg:#12321f;--crit:#E07B6E;--crit-bg:#3a1d1a;--shadow:0 1px 2px rgba(0,0,0,.45),0 16px 40px -18px rgba(0,0,0,.7);}}
  :root[data-theme="light"]{--paper:#F7F2E6;--surface:#FFFDF7;--surface-2:#EFE7D3;--ink:#17233F;--muted:#6B6350;--line:#E2D9C3;--brand:#A31B33;--brand-strong:#7E1226;--good:#2E7D4F;--good-bg:#E4F0E8;--crit:#B23A3A;--crit-bg:#F6E1DE;}
  :root[data-theme="dark"]{--paper:#101627;--surface:#172033;--surface-2:#1F2A42;--ink:#F3EEE1;--muted:#A9A28F;--line:#2B3855;--brand:#E2586B;--brand-strong:#F27A8B;--good:#4FBE86;--good-bg:#12321f;--crit:#E07B6E;--crit-bg:#3a1d1a;}
  *{box-sizing:border-box;} body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--font);line-height:1.5;}
  .wrap{max-width:560px;margin-inline:auto;padding:clamp(1.2rem,5vw,2.4rem) clamp(1rem,5vw,1.4rem) 3rem;}
  .head{display:flex;align-items:center;gap:.7rem;margin-bottom:.4rem;}
  .glyph{width:38px;height:38px;border-radius:11px;background:var(--brand);color:#fff;display:grid;place-items:center;font-size:1.3rem;font-weight:900;}
  h1{font-size:clamp(1.5rem,1.2rem+1.6vw,2.1rem);margin:.6rem 0 .1rem;letter-spacing:-.02em;line-height:1.1;}
  .lede{color:var(--muted);margin:.1rem 0 1.4rem;}
  .theme{margin-left:auto;background:transparent;border:1px solid var(--line);border-radius:8px;color:var(--ink);padding:.3rem .5rem;cursor:pointer;}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:1.3rem 1.4rem;}
  .step{font-family:var(--mono);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--brand);font-weight:700;}
  h2{font-size:1.05rem;margin:.2rem 0 .8rem;}
  label{display:block;font-size:.76rem;font-weight:700;color:var(--muted);margin:.7rem 0 .25rem;}
  input,select,textarea{width:100%;padding:.65rem .7rem;border:1px solid var(--line);border-radius:11px;background:var(--paper);color:var(--ink);font:inherit;}
  input:focus,select:focus,textarea:focus{outline:2px solid var(--brand);outline-offset:1px;}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:.3rem .8rem;} @media(max-width:440px){.row{grid-template-columns:1fr;}}
  .services{display:flex;flex-direction:column;gap:.5rem;margin-top:.3rem;}
  .svc{display:flex;align-items:center;gap:.7rem;border:1px solid var(--line);border-radius:12px;padding:.7rem .85rem;cursor:pointer;background:var(--paper);text-align:left;font:inherit;color:inherit;width:100%;}
  .svc:hover{border-color:color-mix(in srgb,var(--brand) 40%,var(--line));}
  .svc[aria-pressed="true"]{border-color:var(--brand);background:color-mix(in srgb,var(--brand) 8%,var(--surface));box-shadow:0 0 0 1px var(--brand) inset;}
  .svc .nm{font-weight:700;} .svc .meta{color:var(--muted);font-size:.82rem;} .svc .price{margin-left:auto;font-weight:800;font-variant-numeric:tabular-nums;}
  .btn{background:var(--brand);color:#fff;border:0;border-radius:12px;padding:.8rem 1rem;font:inherit;font-weight:700;cursor:pointer;width:100%;margin-top:1.2rem;font-size:1rem;}
  .btn:hover{background:var(--brand-strong);} .btn:disabled{opacity:.55;cursor:progress;}
  .banner{display:none;padding:.7rem .9rem;border-radius:11px;margin-top:.9rem;font-size:.88rem;}
  .banner.show{display:block;} .banner.err{background:var(--crit-bg);border:1px solid var(--crit);}
  .done{text-align:center;padding:1rem .5rem;}
  .done .big{font-size:2.4rem;} .done h2{font-size:1.3rem;margin:.5rem 0 .3rem;}
  .done p{color:var(--muted);} .confirm{background:var(--good-bg);border:1px solid var(--good);border-radius:12px;padding:.8rem;margin:1rem 0;font-weight:600;}
  footer{color:var(--muted);font-size:.76rem;text-align:center;margin-top:1.6rem;}
</style>
</head>
<body>
<div class="wrap">
  <div class="head">
    <span class="glyph" aria-hidden="true">✦</span>
    <button class="theme" id="themeBtn" title="Theme" aria-label="Toggle theme">◐</button>
  </div>
  <h1>Book with ${name}</h1>
  <p class="lede">Request an appointment below — we'll confirm the time with you.</p>

  <div class="card" id="formCard">
    <form id="bookForm">
      <div class="step">Step 1 — pick a time</div>
      <div class="row">
        <div><label for="date">Date</label><input id="date" type="date" required></div>
        <div><label for="time">Time</label><input id="time" type="time" required></div>
      </div>

      <div class="step" style="margin-top:1.2rem">Step 2 — your details</div>
      <div class="row">
        <div><label for="cname">Your name</label><input id="cname" required autocomplete="name"></div>
        <div><label for="cphone">Phone</label><input id="cphone" type="tel" autocomplete="tel"></div>
      </div>
      <label for="notes">Anything we should know? (optional)</label>
      <textarea id="notes" rows="2"></textarea>

      <button class="btn" type="submit" id="submitBtn">Request appointment</button>
      <div class="banner" id="banner"></div>
    </form>
  </div>

  <div class="card done" id="doneCard" hidden>
    <div class="big" aria-hidden="true">✅</div>
    <h2>Request received</h2>
    <div class="confirm" id="confirmText"></div>
    <p>We'll reach out to confirm. Thanks for booking with ${name}!</p>
    <button class="btn" id="againBtn" style="max-width:220px;margin-inline:auto">Book another</button>
  </div>

  <footer>Powered by Cardinal HR · Booking</footer>
</div>

<script>
const $=(id)=>document.getElementById(id);
function esc(s){ return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }
function banner(msg){ const b=$("banner"); b.textContent=msg; b.className="banner show err"; }

$("bookForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const date=$("date").value, time=$("time").value;
  if(!date||!time){ banner("Please pick a date and time."); return; }
  if(!$("cname").value.trim()){ banner("Please enter your name."); return; }
  const start=new Date(date+"T"+time).toISOString();
  $("submitBtn").disabled=true; $("banner").className="banner";
  try{
    const res=await fetch("/api/book",{method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({clientName:$("cname").value.trim(),clientPhone:$("cphone").value.trim()||undefined,notes:$("notes").value.trim()||undefined,start})});
    const j=await res.json();
    if(!res.ok) throw new Error((j.error&&j.error.message)||"Could not book");
    const when=new Date(j.start).toLocaleString([], {weekday:"long",month:"long",day:"numeric",hour:"numeric",minute:"2-digit"});
    $("confirmText").textContent="Appointment — "+when;
    $("formCard").hidden=true; $("doneCard").hidden=false; window.scrollTo(0,0);
  }catch(err){ banner(err.message); }
  finally{ $("submitBtn").disabled=false; }
});
$("againBtn").onclick=()=>{ $("bookForm").reset(); $("doneCard").hidden=true; $("formCard").hidden=false; };
$("themeBtn").onclick=()=>{ const c=document.documentElement.getAttribute("data-theme"); const n=c==="dark"?"light":c==="light"?"":"dark"; if(n)document.documentElement.setAttribute("data-theme",n); else document.documentElement.removeAttribute("data-theme"); };

$("date").min=new Date().toISOString().slice(0,10);
</script>
</body>
</html>`;
}
