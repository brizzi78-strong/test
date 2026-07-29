"use strict";
(function () {
  const $ = (s) => document.querySelector(s);
  const el = (id) => document.getElementById(id);
  let mode = "signup"; // or "login"
  let me = null;

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      method: opts.method || "GET",
      headers: opts.body ? { "Content-Type": "application/json" } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }

  function toast(msg) {
    const t = el("toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.hidden = true), 2600);
  }
  function initials(name) {
    return (name || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  }
  function show(view) {
    document.querySelectorAll(".view").forEach((v) => (v.hidden = true));
    el("view-" + view).hidden = false;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === view));
  }
  function setAuthed(on) {
    el("tabs").hidden = !on;
  }

  /* ---------- Auth ---------- */
  function setMode(m) {
    mode = m;
    el("segSignup").classList.toggle("active", m === "signup");
    el("segLogin").classList.toggle("active", m === "login");
    el("nameField").hidden = m === "login";
    el("authSubmit").textContent = m === "signup" ? "Create account" : "Sign in";
    el("authErr").hidden = true;
  }
  el("segSignup").onclick = () => setMode("signup");
  el("segLogin").onclick = () => setMode("login");

  el("authForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = { email: f.get("email"), password: f.get("password") };
    if (mode === "signup") body.name = f.get("name");
    try {
      await api("/api/" + (mode === "signup" ? "signup" : "login"), { method: "POST", body });
      await boot();
    } catch (err) {
      const p = el("authErr"); p.textContent = err.message; p.hidden = false;
    }
  };

  el("logout").onclick = async () => {
    await api("/api/logout", { method: "POST" });
    me = null; setAuthed(false); show("auth");
  };
  el("brandHome").onclick = (e) => { e.preventDefault(); if (me) go("discover"); };

  document.querySelectorAll(".tab[data-view]").forEach((t) => (t.onclick = () => go(t.dataset.view)));

  function go(view) {
    if (view === "discover") loadDiscover();
    if (view === "matches") loadMatches();
    if (view === "profile") loadProfileForm();
    show(view);
  }

  /* ---------- Profile ---------- */
  function loadProfileForm() {
    const p = me.profile || {};
    const form = el("profileForm");
    form.name.value = p.name || "";
    form.age.value = p.age || "";
    form.gender.value = p.gender || "";
    form.seeking.value = p.seeking || "";
    form.city.value = p.city || "";
    form.bio.value = p.bio || "";
    form.prompt.value = p.prompt || "";
    el("profileNote").textContent = p.complete
      ? "One honest profile is how a cardinal calls. This is what others see."
      : "Finish your profile to start meeting people.";
  }
  el("profileForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = Object.fromEntries(f.entries());
    try {
      const r = await api("/api/profile", { method: "PUT", body });
      me.profile = r.profile;
      toast("Profile saved.");
      go("discover");
    } catch (err) {
      const p = el("profileErr"); p.textContent = err.message; p.hidden = false;
    }
  };

  /* ---------- Discover ---------- */
  async function loadDiscover() {
    const deck = el("deck");
    deck.innerHTML = "";
    el("deckEmpty").hidden = true;
    let data;
    try { data = await api("/api/discover"); } catch { return; }
    if (!data.profiles.length) { el("deckEmpty").hidden = false; return; }
    data.profiles.forEach((p) => deck.appendChild(profileCard(p)));
  }
  function profileCard(p) {
    const card = document.createElement("div");
    card.className = "pcard";
    card.innerHTML = `
      <div class="avatar">${initials(p.name)}</div>
      <h3>${escape(p.name)}${p.age ? ", " + p.age : ""}</h3>
      <div class="meta">${[p.city, p.seeking ? "seeking " + p.seeking : ""].filter(Boolean).map(escape).join(" · ")}</div>
      ${p.bio ? `<p class="bio">${escape(p.bio)}</p>` : ""}
      ${p.prompt ? `<p class="prompt">"${escape(p.prompt)}"</p>` : ""}
      <div class="actions">
        <button class="btn pass">Pass</button>
        <button class="btn primary">Like</button>
      </div>`;
    const [passBtn, likeBtn] = card.querySelectorAll("button");
    passBtn.onclick = () => act(p, "pass", card);
    likeBtn.onclick = () => act(p, "like", card);
    return card;
  }
  async function act(p, direction, card) {
    try {
      const r = await api("/api/like", { method: "POST", body: { targetId: p.id, direction } });
      card.remove();
      if (r.matched) { toast("It's a match with " + p.name + "! 🎉"); refreshBadge(); }
      if (!el("deck").children.length) el("deckEmpty").hidden = false;
    } catch (err) { toast(err.message); }
  }

  /* ---------- Matches + chat ---------- */
  async function loadMatches() {
    const list = el("matchList"); list.innerHTML = ""; el("matchEmpty").hidden = true;
    let data;
    try { data = await api("/api/matches"); } catch { return; }
    if (!data.matches.length) { el("matchEmpty").hidden = false; return; }
    data.matches.forEach((m) => {
      const row = document.createElement("button");
      row.className = "match-row";
      row.innerHTML = `
        <span class="avatar">${initials(m.with.name)}</span>
        <span>
          <div class="who">${escape(m.with.name)}${m.with.age ? ", " + m.with.age : ""}</div>
          <div class="last">${m.lastMessage ? escape(m.lastMessage) : "Say hello — you matched!"}</div>
        </span>`;
      row.onclick = () => openChat(m.matchId, m.with.name);
      list.appendChild(row);
    });
  }

  let currentMatch = null;
  async function openChat(matchId, name) {
    currentMatch = matchId;
    el("chatWith").textContent = name;
    show("chat");
    await renderChat();
  }
  async function renderChat() {
    const log = el("chatLog"); log.innerHTML = "";
    let data;
    try { data = await api("/api/messages?matchId=" + currentMatch); } catch { return; }
    if (!data.messages.length) {
      log.innerHTML = `<p class="muted" style="text-align:center;margin:auto">You matched. Send the first message.</p>`;
    }
    data.messages.forEach((m) => {
      const b = document.createElement("div");
      b.className = "msg " + (m.mine ? "me" : "them");
      b.textContent = m.body;
      log.appendChild(b);
    });
    log.scrollTop = log.scrollHeight;
  }
  el("chatBack").onclick = () => go("matches");
  el("chatForm").onsubmit = async (e) => {
    e.preventDefault();
    const input = el("chatInput");
    const body = input.value.trim();
    if (!body) return;
    input.value = "";
    try { await api("/api/messages", { method: "POST", body: { matchId: currentMatch, body } }); await renderChat(); }
    catch (err) { toast(err.message); }
  };

  async function refreshBadge() {
    try {
      const d = await api("/api/matches");
      const b = el("matchCount");
      if (d.matches.length) { b.textContent = d.matches.length; b.hidden = false; }
      else b.hidden = true;
    } catch {}
  }

  function escape(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------- Boot ---------- */
  async function boot() {
    try {
      me = await api("/api/me");
      setAuthed(true);
      refreshBadge();
      if (me.profile && me.profile.complete) go("discover");
      else go("profile");
    } catch {
      me = null; setAuthed(false); setMode("signup"); show("auth");
    }
  }
  boot();
})();
