/**
 * The HR admin single-page app, served as one self-contained document (no
 * external CSS/JS/fonts). It talks only to this server's `/api/*` endpoints,
 * which proxy to the orchestrator. Design tokens mirror the Cardinal HR site.
 */

export const PAGE: string = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Cardinal HR — Admin Console</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23A31B33'/%3E%3Ctext x='16' y='23' font-family='system-ui,sans-serif' font-size='20' font-weight='900' text-anchor='middle' fill='white'%3EC%3C/text%3E%3C/svg%3E">
<style>
  :root {
    --paper:#F7F2E6; --surface:#FFFDF7; --surface-2:#EFE7D3; --ink:#17233F; --muted:#6B6350;
    --line:#E2D9C3; --brand:#A31B33; --brand-strong:#7E1226; --good:#2E7D4F; --warn:#B0771C; --crit:#B23A3A;
    --shadow:0 1px 2px rgba(23,35,63,.07), 0 10px 26px -14px rgba(23,35,63,.24);
    --font:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
    --maxw:1000px; --radius:14px;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --paper:#101627; --surface:#172033; --surface-2:#1F2A42; --ink:#F3EEE1; --muted:#A9A28F;
      --line:#2B3855; --brand:#E2586B; --brand-strong:#F27A8B; --good:#4FBE86; --warn:#D6A24A; --crit:#E07B6E;
      --shadow:0 1px 2px rgba(0,0,0,.45), 0 12px 32px -14px rgba(0,0,0,.65);
    }
  }
  :root[data-theme="light"] {
    --paper:#F7F2E6; --surface:#FFFDF7; --surface-2:#EFE7D3; --ink:#17233F; --muted:#6B6350;
    --line:#E2D9C3; --brand:#A31B33; --brand-strong:#7E1226; --good:#2E7D4F; --warn:#B0771C; --crit:#B23A3A;
    --shadow:0 1px 2px rgba(23,35,63,.07), 0 10px 26px -14px rgba(23,35,63,.24);
  }
  :root[data-theme="dark"] {
    --paper:#101627; --surface:#172033; --surface-2:#1F2A42; --ink:#F3EEE1; --muted:#A9A28F;
    --line:#2B3855; --brand:#E2586B; --brand-strong:#F27A8B; --good:#4FBE86; --warn:#D6A24A; --crit:#E07B6E;
    --shadow:0 1px 2px rgba(0,0,0,.45), 0 12px 32px -14px rgba(0,0,0,.65);
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--paper); color:var(--ink); font-family:var(--font); line-height:1.5; }
  .wrap { max-width:var(--maxw); margin-inline:auto; padding:clamp(1rem,4vw,2rem); }
  header.top { display:flex; align-items:center; gap:.7rem; border-bottom:1px solid var(--line); }
  .logo { width:34px; height:34px; border-radius:9px; background:var(--brand); color:#fff; font-weight:900;
          display:grid; place-items:center; font-size:1.2rem; }
  header.top h1 { font-size:1.15rem; margin:0; }
  header.top .sub { color:var(--muted); font-size:.82rem; }
  .spacer { flex:1; }
  button, input, select { font:inherit; }
  .card { background:var(--surface); border:1px solid var(--line); border-radius:var(--radius);
          box-shadow:var(--shadow); padding:1.2rem 1.3rem; margin-top:1.2rem; }
  .card h2 { margin:.1rem 0 .2rem; font-size:1.05rem; }
  .card p.hint { margin:.1rem 0 1rem; color:var(--muted); font-size:.85rem; }
  label { display:block; font-size:.78rem; font-weight:600; color:var(--muted); margin:.6rem 0 .2rem; }
  input, select { width:100%; padding:.55rem .65rem; border:1px solid var(--line); border-radius:9px;
          background:var(--paper); color:var(--ink); }
  input:focus, select:focus { outline:2px solid var(--brand); outline-offset:1px; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:.4rem 1rem; }
  @media (max-width:560px) { .grid2 { grid-template-columns:1fr; } }
  .btn { background:var(--brand); color:#fff; border:0; border-radius:10px; padding:.6rem 1rem;
         font-weight:700; cursor:pointer; margin-top:1rem; }
  .btn:hover { background:var(--brand-strong); }
  .btn.ghost { background:transparent; color:var(--brand); border:1px solid var(--line); }
  .btn.small { padding:.35rem .7rem; font-size:.8rem; margin:0; }
  .btn:disabled { opacity:.55; cursor:progress; }
  table { width:100%; border-collapse:collapse; margin-top:.4rem; }
  th, td { text-align:left; padding:.55rem .5rem; border-bottom:1px solid var(--line); font-size:.9rem; }
  th { color:var(--muted); font-size:.72rem; text-transform:uppercase; letter-spacing:.04em; }
  tbody tr { cursor:pointer; }
  tbody tr:hover { background:var(--surface-2); }
  .chips { display:flex; flex-wrap:wrap; gap:.4rem; margin-top:.5rem; }
  .chip { background:var(--surface-2); border:1px solid var(--line); border-radius:999px;
          padding:.2rem .6rem; font-size:.76rem; }
  .chip b { color:var(--brand); }
  .kv { font-family:var(--mono); font-size:.8rem; }
  .muted { color:var(--muted); }
  .banner { padding:.7rem .9rem; border-radius:10px; font-size:.86rem; margin-top:1rem; display:none; }
  .banner.err { display:block; background:color-mix(in srgb, var(--crit) 14%, var(--surface)); border:1px solid var(--crit); }
  .banner.ok { display:block; background:color-mix(in srgb, var(--good) 14%, var(--surface)); border:1px solid var(--good); }
  dialog { border:1px solid var(--line); border-radius:var(--radius); background:var(--surface); color:var(--ink);
           max-width:520px; width:92%; box-shadow:var(--shadow); }
  dialog::backdrop { background:rgba(0,0,0,.45); }
  dialog h3 { margin:.2rem 0; }
  .linkrow { display:flex; justify-content:space-between; gap:1rem; padding:.5rem 0; border-bottom:1px solid var(--line); }
  .linkrow:last-child { border-bottom:0; }
  .theme { background:transparent; border:1px solid var(--line); border-radius:8px; color:var(--ink);
           padding:.3rem .5rem; cursor:pointer; font-size:.85rem; }
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <div class="logo">C</div>
    <div>
      <h1>Cardinal HR — Admin Console</h1>
      <div class="sub">One record, every service.</div>
    </div>
    <div class="spacer"></div>
    <button class="theme" id="themeBtn" title="Toggle theme">◐</button>
  </header>

  <div id="banner" class="banner"></div>

  <section class="card" id="companyCard">
    <h2>Company</h2>
    <div id="companyBody"></div>
  </section>

  <section class="card" id="hireCard" hidden>
    <h2>Hire an employee</h2>
    <p class="hint">Creates one canonical record and provisions it into every wired HR service.</p>
    <form id="hireForm">
      <div class="grid2">
        <div><label for="firstName">First name</label><input id="firstName" required></div>
        <div><label for="lastName">Last name</label><input id="lastName" required></div>
        <div><label for="email">Work email</label><input id="email" type="email" required></div>
        <div><label for="jobTitle">Job title</label><input id="jobTitle" required></div>
        <div><label for="hireDate">Hire date</label><input id="hireDate" type="date" required></div>
        <div>
          <label for="employmentType">Employment type</label>
          <select id="employmentType">
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contractor">Contractor</option>
          </select>
        </div>
      </div>
      <button class="btn" type="submit" id="hireBtn">Hire &amp; provision</button>
    </form>
  </section>

  <section class="card" id="peopleCard" hidden>
    <h2>Employees</h2>
    <p class="hint">Click a row to see the single record resolve into each service.</p>
    <table>
      <thead><tr><th>Name</th><th>Title</th><th>Email</th><th>Hired</th></tr></thead>
      <tbody id="peopleBody"></tbody>
    </table>
  </section>
</div>

<dialog id="personDialog">
  <h3 id="dlgName"></h3>
  <div class="muted kv" id="dlgSub"></div>
  <p class="hint" style="margin-top:1rem">This one canonical record maps to:</p>
  <div id="dlgLinks"></div>
  <button class="btn ghost" id="dlgClose" style="margin-top:1.2rem">Close</button>
</dialog>

<script>
const $ = (id) => document.getElementById(id);
let companyId = localStorage.getItem("cardinalhr.companyId") || null;

function banner(msg, kind) {
  const b = $("banner");
  b.textContent = msg;
  b.className = "banner " + (kind || "");
  if (kind) setTimeout(() => { if (b.textContent === msg) b.className = "banner"; }, kind === "ok" ? 4000 : 8000);
}

async function api(method, path, body) {
  const res = await fetch("/api" + path, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json.error && json.error.message) || ("HTTP " + res.status));
  return json;
}

function linkChips(links) {
  return Object.entries(links || {})
    .map(([svc, id]) => '<span class="chip"><b>' + svc + '</b> ' + id + "</span>")
    .join("");
}

function renderCompanyForm() {
  $("companyBody").innerHTML =
    '<p class="hint">Register your company to provision it into every service, then start hiring.</p>' +
    '<form id="coForm"><label for="coName">Company name</label>' +
    '<input id="coName" required placeholder="Acme, Inc.">' +
    '<button class="btn" type="submit" id="coBtn">Register company</button></form>';
  $("coForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("coName").value.trim();
    if (!name) return;
    $("coBtn").disabled = true;
    try {
      const co = await api("POST", "/companies", { name });
      companyId = co.id;
      localStorage.setItem("cardinalhr.companyId", companyId);
      banner("Registered " + co.name + " across " + Object.keys(co.links).length + " services.", "ok");
      await load();
    } catch (err) {
      banner(err.message, "err");
      $("coBtn").disabled = false;
    }
  });
}

function renderCompany(co) {
  $("companyBody").innerHTML =
    "<p><strong>" + co.name + "</strong> " +
    '<span class="muted kv">(' + co.id + ")</span></p>" +
    '<div class="chips">' + linkChips(co.links) + "</div>" +
    '<button class="btn ghost small" id="switchCo" style="margin-top:1rem">Switch company</button>';
  $("switchCo").addEventListener("click", () => {
    localStorage.removeItem("cardinalhr.companyId");
    companyId = null;
    $("hireCard").hidden = true;
    $("peopleCard").hidden = true;
    renderCompanyForm();
  });
  $("hireCard").hidden = false;
  $("peopleCard").hidden = false;
}

function renderPeople(people) {
  const body = $("peopleBody");
  if (!people.length) {
    body.innerHTML = '<tr><td colspan="4" class="muted">No employees yet — hire your first above.</td></tr>';
    return;
  }
  body.innerHTML = people
    .map(
      (p) =>
        '<tr data-id="' + p.id + '"><td>' + p.firstName + " " + p.lastName +
        "</td><td>" + p.jobTitle + "</td><td>" + p.email + "</td><td>" + p.hireDate + "</td></tr>"
    )
    .join("");
  for (const tr of body.querySelectorAll("tr[data-id]")) {
    tr.addEventListener("click", () => openPerson(tr.getAttribute("data-id")));
  }
}

async function openPerson(id) {
  try {
    const p = await api("GET", "/people/" + encodeURIComponent(id));
    $("dlgName").textContent = p.firstName + " " + p.lastName;
    $("dlgSub").textContent = p.jobTitle + " · " + p.email + " · " + p.id;
    $("dlgLinks").innerHTML = Object.entries(p.links || {})
      .map(([svc, x]) => '<div class="linkrow"><span><b>' + svc + '</b></span><span class="kv">' + x + "</span></div>")
      .join("");
    $("personDialog").showModal();
  } catch (err) {
    banner(err.message, "err");
  }
}

async function load() {
  if (!companyId) { renderCompanyForm(); return; }
  try {
    const co = await api("GET", "/companies/" + encodeURIComponent(companyId));
    renderCompany(co);
    const people = await api("GET", "/people?companyId=" + encodeURIComponent(companyId));
    renderPeople(people);
  } catch (err) {
    // Stored company no longer exists (e.g. store reset) — start fresh.
    localStorage.removeItem("cardinalhr.companyId");
    companyId = null;
    renderCompanyForm();
    banner("Previous company not found — register again. (" + err.message + ")", "err");
  }
}

$("hireForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("hireBtn").disabled = true;
  const input = {
    firstName: $("firstName").value.trim(),
    lastName: $("lastName").value.trim(),
    email: $("email").value.trim(),
    jobTitle: $("jobTitle").value.trim(),
    hireDate: $("hireDate").value,
    employmentType: $("employmentType").value,
  };
  try {
    const p = await api("POST", "/companies/" + encodeURIComponent(companyId) + "/hire", input);
    banner("Hired " + p.firstName + " " + p.lastName + " — provisioned into " +
      Object.keys(p.links).length + " services.", "ok");
    $("hireForm").reset();
    const people = await api("GET", "/people?companyId=" + encodeURIComponent(companyId));
    renderPeople(people);
  } catch (err) {
    banner(err.message, "err");
  } finally {
    $("hireBtn").disabled = false;
  }
});

$("dlgClose").addEventListener("click", () => $("personDialog").close());
$("themeBtn").addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme");
  const next = cur === "dark" ? "light" : cur === "light" ? "" : "dark";
  if (next) document.documentElement.setAttribute("data-theme", next);
  else document.documentElement.removeAttribute("data-theme");
});

load();
</script>
</body>
</html>`;
