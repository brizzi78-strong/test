"use strict";
(function () {
  const el = (id) => document.getElementById(id);
  let mode = "signup", me = null;

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      method: opts.method || "GET",
      headers: opts.body ? { "Content-Type": "application/json" } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let data = {}; try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }
  function toast(msg) { const t = el("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2600); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function initials(n) { return (n || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase(); }
  function timeago(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    const m = Math.floor(s / 60); if (m < 60) return m + "m";
    const h = Math.floor(m / 60); if (h < 24) return h + "h";
    const d = Math.floor(h / 24); if (d < 7) return d + "d";
    return new Date(ts).toLocaleDateString();
  }
  function avatarInner(a) {
    // a: {id?, name, photo}
    if (a.photo && a.id) return { style: `background-image:url('/api/photo/user/${a.id}')`, text: "" };
    return { style: "", text: initials(a.name) };
  }
  function paintAvatar(node, a) { const i = avatarInner(a); node.style.backgroundImage = i.style ? i.style.split(":").slice(1).join(":") : "none"; node.textContent = i.text; }

  function show(view) {
    document.querySelectorAll(".view").forEach((v) => (v.hidden = true));
    el("view-" + view).hidden = false;
    document.querySelectorAll(".top-tab").forEach((t) => t.classList.toggle("active", t.dataset.view === view));
    window.scrollTo(0, 0);
  }

  /* ---------- Auth ---------- */
  function setMode(m) {
    mode = m;
    el("segSignup").classList.toggle("active", m === "signup");
    el("segLogin").classList.toggle("active", m === "login");
    el("nameField").hidden = m === "login";
    el("authSubmit").textContent = m === "signup" ? "Create account" : "Log in";
    el("authErr").hidden = true;
  }
  el("segSignup").onclick = () => setMode("signup");
  el("segLogin").onclick = () => setMode("login");
  el("authForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = { email: f.get("email"), password: f.get("password") };
    if (mode === "signup") body.name = f.get("name");
    try { await api("/api/" + (mode === "signup" ? "signup" : "login"), { method: "POST", body }); await boot(); }
    catch (err) { const p = el("authErr"); p.textContent = err.message; p.hidden = false; }
  };
  el("logout").onclick = async () => { await api("/api/logout", { method: "POST" }); me = null; el("topbar").hidden = true; show("auth"); };
  el("brandHome").onclick = (e) => { e.preventDefault(); go("feed"); };
  document.querySelectorAll(".top-tab").forEach((t) => (t.onclick = () => go(t.dataset.view)));
  el("meAvatar").onclick = () => go("profile");

  function go(view) {
    if (view === "feed") loadFeed();
    if (view === "profile") loadProfile();
    show(view);
  }

  /* ---------- Profile ---------- */
  let pendingProfilePhoto = null;
  function loadProfile() {
    const p = me.profile || {};
    el("profileForm").name.value = p.name || "";
    el("profileForm").bio.value = p.bio || "";
    pendingProfilePhoto = null;
    paintAvatar(el("profileAvatar"), { id: me.user.id, name: p.name, photo: p.photo });
  }
  el("profilePhotoInput").onchange = (e) => uploadPreview(e, (url) => { pendingProfilePhoto = url; el("profileAvatar").style.backgroundImage = `url('${url}')`; el("profileAvatar").textContent = ""; });
  el("profileForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const r = await api("/api/profile", { method: "PUT", body: { name: f.get("name"), bio: f.get("bio") } });
      me.profile = r.profile;
      if (pendingProfilePhoto) { await api("/api/profile/photo", { method: "PUT", body: { dataUrl: pendingProfilePhoto } }); me.profile.photo = true; pendingProfilePhoto = null; }
      paintMe(); toast("Profile saved."); go("feed");
    } catch (err) { const p = el("profileErr"); p.textContent = err.message; p.hidden = false; }
  };

  function uploadPreview(e, cb) {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 4_000_000) return toast("Image must be under 4MB.");
    const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(file);
  }
  function paintMe() {
    const a = { id: me.user.id, name: me.profile.name, photo: me.profile.photo };
    const av = el("meAvatar"); const i = avatarInner(a);
    av.style.backgroundImage = i.style ? `url('/api/photo/user/${me.user.id}')` : "none";
    av.style.background = i.style ? `center/cover url('/api/photo/user/${me.user.id}')` : "linear-gradient(135deg,#818cf8,#6366f1)";
    paintAvatar(el("composerAvatar"), a);
    el("composerOpen").textContent = `What's on your mind, ${(me.profile.name || "").split(" ")[0] || "friend"}?`;
  }

  /* ---------- Composer ---------- */
  let pendingPostPhoto = null;
  el("composerOpen").onclick = () => { el("composerForm").hidden = false; el("composerOpen").hidden = true; el("postBody").focus(); };
  el("composerCancel").onclick = resetComposer;
  function resetComposer() {
    el("composerForm").hidden = true; el("composerOpen").hidden = false;
    el("postBody").value = ""; pendingPostPhoto = null; el("composerPhotoWrap").hidden = true; el("composerPhoto").src = "";
  }
  el("postPhotoInput").onchange = (e) => uploadPreview(e, (url) => { pendingPostPhoto = url; el("composerPhoto").src = url; el("composerPhotoWrap").hidden = false; });
  el("photoRemove").onclick = () => { pendingPostPhoto = null; el("composerPhotoWrap").hidden = true; el("postPhotoInput").value = ""; };
  el("composerForm").onsubmit = async (e) => {
    e.preventDefault();
    const body = el("postBody").value.trim();
    if (!body && !pendingPostPhoto) return;
    el("postSubmit").disabled = true;
    try { await api("/api/posts", { method: "POST", body: { body, photo: pendingPostPhoto } }); resetComposer(); await loadFeed(); }
    catch (err) { toast(err.message); }
    finally { el("postSubmit").disabled = false; }
  };

  /* ---------- Feed ---------- */
  async function loadFeed() {
    let data; try { data = await api("/api/feed"); } catch { return; }
    const wrap = el("posts"); wrap.innerHTML = "";
    el("feedEmpty").hidden = data.posts.length > 0;
    for (const p of data.posts) wrap.appendChild(renderPost(p));
  }
  const heart = (f) => `<svg viewBox="0 0 24 24" fill="${f ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.35-9.5-8.5C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 7C19 16.65 12 21 12 21z"/></svg>`;
  const bubble = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"/></svg>`;

  function renderPost(p) {
    const card = document.createElement("article");
    card.className = "post card";
    const av = avatarInner(p.author);
    card.innerHTML = `
      <div class="post-head">
        <div class="avatar" ${av.style ? `style="${av.style}"` : ""}>${av.text}</div>
        <div><div class="post-who">${esc(p.author.name)}</div><div class="post-time">${timeago(p.created)}</div></div>
      </div>
      ${p.body ? `<div class="post-body">${esc(p.body)}</div>` : ""}
      ${p.photo ? `<div class="post-photo"><img src="/api/photo/post/${p.id}" alt=""></div>` : ""}
      <div class="post-stats"><span class="s-likes">${p.likes ? p.likes + (p.likes === 1 ? " like" : " likes") : ""}</span><span class="s-comments">${p.comments ? p.comments + (p.comments === 1 ? " comment" : " comments") : ""}</span></div>
      <div class="post-actions">
        <button class="act like ${p.liked ? "liked" : ""}">${heart(p.liked)} Like</button>
        <button class="act comment">${bubble} Comment</button>
      </div>
      <div class="comments" hidden></div>`;
    const likeBtn = card.querySelector(".like");
    likeBtn.onclick = async () => {
      try {
        const r = await api(`/api/posts/${p.id}/like`, { method: "POST" });
        likeBtn.classList.toggle("liked", r.liked); likeBtn.innerHTML = `${heart(r.liked)} Like`;
        card.querySelector(".s-likes").textContent = r.likes ? r.likes + (r.likes === 1 ? " like" : " likes") : "";
      } catch (e) { toast(e.message); }
    };
    const box = card.querySelector(".comments");
    card.querySelector(".comment").onclick = () => { if (box.hidden) openComments(p, box); else box.hidden = true; };
    return card;
  }

  async function openComments(p, box) {
    box.hidden = false;
    box.innerHTML = `<p class="post-time">Loading…</p>`;
    let data; try { data = await api(`/api/posts/${p.id}/comments`); } catch { box.innerHTML = ""; return; }
    box.innerHTML = "";
    for (const c of data.comments) box.appendChild(renderComment(c));
    const form = document.createElement("form"); form.className = "c-form";
    const meAv = avatarInner({ id: me.user.id, name: me.profile.name, photo: me.profile.photo });
    form.innerHTML = `<div class="avatar" ${meAv.style ? `style="${meAv.style}"` : ""}>${meAv.text}</div><input placeholder="Write a comment…" maxlength="2000">`;
    const input = form.querySelector("input");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const body = input.value.trim(); if (!body) return; input.value = "";
      try {
        await api(`/api/posts/${p.id}/comments`, { method: "POST", body: { body } });
        form.before(renderComment({ author: { id: me.user.id, name: me.profile.name }, body, created: Date.now() }));
      } catch (err) { toast(err.message); }
    };
    box.appendChild(form);
  }
  function renderComment(c) {
    const row = document.createElement("div"); row.className = "comment";
    const av = avatarInner(c.author);
    row.innerHTML = `<div class="avatar" ${av.style ? `style="${av.style}"` : ""}>${av.text}</div>
      <div class="c-bubble"><div class="c-who">${esc(c.author.name)}</div><div class="c-body">${esc(c.body)}</div></div>`;
    return row;
  }

  /* ---------- Boot ---------- */
  async function boot() {
    try {
      me = await api("/api/me");
      el("topbar").hidden = false;
      paintMe();
      if (!me.profile.name) { show("profile"); loadProfile(); return; }
      go("feed");
    } catch { me = null; el("topbar").hidden = true; setMode("signup"); show("auth"); }
  }
  boot();
})();
