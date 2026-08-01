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
  el("logout").onclick = async () => { closeStream(); await api("/api/logout", { method: "POST" }); me = null; el("topbar").hidden = true; show("auth"); };
  el("brandHome").onclick = (e) => { e.preventDefault(); go("feed"); };
  document.querySelectorAll(".top-tab").forEach((t) => (t.onclick = () => go(t.dataset.view)));
  el("meAvatar").onclick = () => openUser(me.user.id);

  function go(view) {
    if (view === "feed") loadFeed();
    if (view === "profile") loadProfile();
    if (view === "friends") loadFriends(el("peopleSearch").value);
    if (view === "groups") loadGroups();
    if (view === "messages") { showThreadList(); loadThreads(); }
    show(view);
  }

  /* ---------- Public profile ---------- */
  async function openUser(id) {
    let d; try { d = await api("/api/users/" + id); } catch (e) { toast(e.message); return; }
    const u = d.user;
    const cover = document.querySelector("#view-person .pv-cover");
    if (cover) cover.style.backgroundImage = u.cover ? `url('/api/photo/cover/${u.id}?t=${Date.now()}')` : "";
    paintAvatar(el("pvAvatar"), u);
    el("pvName").textContent = u.name || "Someone";
    el("pvBio").textContent = u.bio || ""; el("pvBio").hidden = !u.bio;
    el("pvPostCount").textContent = u.postCount;
    el("pvFriends").textContent = u.friendCount;
    const sup = el("pvSupport");
    if (u.support && u.support.on) {
      sup.hidden = false;
      const first = (u.name || "They").split(" ")[0];
      sup.textContent = u.support.note ? `💛 “${u.support.note}”` : `💛 ${first} could use some support right now.`;
    } else sup.hidden = true;
    const acts = el("pvActions"); acts.innerHTML = "";
    const btn = (label, cls, fn) => { const b = document.createElement("button"); b.className = "btn " + cls; b.textContent = label; b.onclick = fn; return b; };
    if (u.isMe) {
      acts.appendChild(btn("Edit profile", "ghost", () => go("profile")));
    } else if (u.rel === "friends") {
      acts.appendChild(btn("Message", "primary", () => openThread(u.id, u.name)));
      const t = document.createElement("span"); t.className = "tag"; t.textContent = "✓ Friends"; acts.appendChild(t);
    } else if (u.rel === "outgoing") {
      acts.appendChild(btn("Requested", "ghost", async () => { await api("/api/friends/remove", { method: "POST", body: { userId: u.id } }); openUser(id); }));
    } else if (u.rel === "incoming") {
      acts.appendChild(btn("Accept friend", "primary", async () => { await api("/api/friends/request", { method: "POST", body: { toId: u.id } }); toast("You're now friends with " + (u.name || "").split(" ")[0]); openUser(id); }));
    } else {
      acts.appendChild(btn("Add friend", "primary", async () => { await api("/api/friends/request", { method: "POST", body: { toId: u.id } }); openUser(id); }));
    }
    const list = el("pvPostList"); list.innerHTML = "";
    el("pvEmpty").hidden = d.posts.length > 0;
    for (const p of d.posts) list.appendChild(renderPost(p));
    show("person");
  }

  /* ---------- Friends ---------- */
  let searchTimer = null;
  el("peopleSearch").oninput = (e) => { clearTimeout(searchTimer); const v = e.target.value; searchTimer = setTimeout(() => loadFriends(v), 220); };

  async function loadFriends(term) {
    let people = [], requests = [];
    try {
      [people, requests] = await Promise.all([
        api("/api/people" + (term && term.trim() ? "?q=" + encodeURIComponent(term.trim()) : "")).then((d) => d.people),
        api("/api/friends/requests").then((d) => d.requests),
      ]);
    } catch { return; }
    const searching = !!(term && term.trim());
    const showRequests = requests.length > 0 && !searching;
    const reqBlock = el("requestsBlock"), reqList = el("requestsList");
    reqBlock.hidden = !showRequests;
    reqList.innerHTML = "";
    requests.forEach((p) => reqList.appendChild(renderPerson(p, true)));
    setReqBadge(requests.length);
    // When the requests block is shown, don't repeat those people in the main list.
    const reqIds = new Set(requests.map((r) => r.id));
    const listPeople = showRequests ? people.filter((p) => !reqIds.has(p.id)) : people;
    el("peopleHeading").textContent = searching ? "Results" : "People on The Cardinal";
    const list = el("peopleList"); list.innerHTML = "";
    el("peopleEmpty").hidden = listPeople.length > 0;
    listPeople.forEach((p) => list.appendChild(renderPerson(p, false)));
  }

  function renderPerson(p, isRequest) {
    const row = document.createElement("div");
    row.className = "person";
    const av = avatarInner(p);
    row.innerHTML = `
      <div class="avatar" ${av.style ? `style="${av.style}"` : ""}>${av.text}</div>
      <div class="who"><div class="p-name">${esc(p.name)}</div>${p.bio ? `<div class="p-bio">${esc(p.bio)}</div>` : ""}</div>
      <div class="person-actions"></div>`;
    const actions = row.querySelector(".person-actions");
    const btn = (label, cls, fn) => { const b = document.createElement("button"); b.className = "btn " + cls; b.textContent = label; b.onclick = fn; return b; };
    const rel = p.rel;
    const reload = () => loadFriends(el("peopleSearch").value);
    if (rel === "friends") {
      const t = document.createElement("span"); t.className = "tag"; t.textContent = "✓ Friends"; actions.appendChild(t);
      actions.appendChild(btn("Message", "ghost", () => openThread(p.id, p.name)));
    }
    else if (rel === "outgoing") actions.appendChild(btn("Requested", "ghost", async () => { await api("/api/friends/remove", { method: "POST", body: { userId: p.id } }); reload(); }));
    else if (rel === "incoming") {
      actions.appendChild(btn("Accept", "primary", async () => { await api("/api/friends/request", { method: "POST", body: { toId: p.id } }); toast("You're now friends with " + p.name.split(" ")[0]); reload(); }));
      actions.appendChild(btn("Decline", "ghost", async () => { await api("/api/friends/remove", { method: "POST", body: { userId: p.id } }); reload(); }));
    } else actions.appendChild(btn("Add friend", "primary", async () => { await api("/api/friends/request", { method: "POST", body: { toId: p.id } }); reload(); }));
    row.querySelectorAll(".avatar, .p-name").forEach((n) => { n.classList.add("clickable"); n.onclick = () => openUser(p.id); });
    return row;
  }

  function setReqBadge(n) { const b = el("reqBadge"); if (n > 0) { b.textContent = n; b.hidden = false; } else b.hidden = true; }
  async function refreshReqBadge() { try { setReqBadge((await api("/api/friends/requests")).requests.length); } catch {} }

  /* ---------- Groups ---------- */
  let currentGroup = null;

  async function loadGroups() {
    let d; try { d = await api("/api/groups"); } catch { return; }
    const list = el("groupsList"); list.innerHTML = "";
    el("groupsEmpty").hidden = d.groups.length > 0;
    d.groups.forEach((g) => list.appendChild(renderGroupCard(g)));
  }
  function renderGroupCard(g) {
    const row = document.createElement("div");
    row.className = "person";
    row.innerHTML = `
      <div class="group-badge">${esc(initials(g.name))}</div>
      <div class="who">
        <div class="p-name">${esc(g.name)}</div>
        <div class="p-bio">${g.members} member${g.members === 1 ? "" : "s"}${g.about ? " · " + esc(g.about) : ""}</div>
      </div>
      <div class="person-actions"></div>`;
    row.querySelector(".who").style.cursor = "pointer";
    row.querySelector(".who").onclick = () => openGroup(g.id);
    const actions = row.querySelector(".person-actions");
    if (g.joined) {
      const tag = document.createElement("span"); tag.className = "tag";
      tag.textContent = g.mine ? "★ Owner" : "✓ Member"; actions.appendChild(tag);
    }
    const open = document.createElement("button");
    open.className = "btn " + (g.joined ? "ghost" : "primary");
    open.textContent = g.joined ? "Open" : "View";
    open.onclick = () => openGroup(g.id);
    actions.appendChild(open);
    return row;
  }
  el("groupForm").onsubmit = async (e) => {
    e.preventDefault();
    const name = el("groupName").value.trim();
    if (!name) return;
    try {
      const r = await api("/api/groups", { method: "POST", body: { name, about: el("groupAbout").value.trim() } });
      el("groupName").value = ""; el("groupAbout").value = "";
      toast("Group created."); openGroup(r.id);
    } catch (err) { toast(err.message); }
  };

  async function openGroup(id) {
    currentGroup = id;
    show("group");
    document.querySelectorAll(".top-tab").forEach((t) => t.classList.toggle("active", t.dataset.view === "groups"));
    let d; try { d = await api("/api/groups/" + id); } catch (e) { toast(e.message); return go("groups"); }
    const g = d.group;
    el("groupBadge").textContent = initials(g.name);
    el("groupTitle").textContent = g.name;
    el("groupMembersCount").textContent = g.members + " member" + (g.members === 1 ? "" : "s");
    el("groupAboutText").textContent = g.about || "";
    el("groupAboutText").hidden = !g.about;

    const mem = el("groupMembers"); mem.innerHTML = "";
    g.memberList.forEach((a) => {
      const av = avatarInner(a);
      const chip = document.createElement("div");
      chip.className = "avatar mini"; chip.title = a.name;
      if (av.style) chip.style.cssText = av.style;
      chip.textContent = av.text;
      mem.appendChild(chip);
    });

    const jb = el("groupJoinBtn");
    if (g.mine) { jb.hidden = true; }
    else {
      jb.hidden = false;
      jb.className = "btn sm " + (g.joined ? "ghost" : "primary");
      jb.textContent = g.joined ? "Leave" : "Join group";
      jb.onclick = async () => {
        try {
          await api(`/api/groups/${id}/${g.joined ? "leave" : "join"}`, { method: "POST" });
          toast(g.joined ? "Left " + g.name : "Joined " + g.name);
          openGroup(id);
        } catch (e) { toast(e.message); }
      };
    }

    el("groupComposerCard").hidden = !g.joined;
    el("groupLockedMsg").hidden = g.joined;
    if (g.joined) await loadGroupFeed(id);
    else { el("groupPosts").innerHTML = ""; el("groupFeedEmpty").hidden = true; }
  }
  async function loadGroupFeed(id) {
    let d; try { d = await api(`/api/groups/${id}/feed`); } catch { return; }
    const wrap = el("groupPosts"); wrap.innerHTML = "";
    el("groupFeedEmpty").hidden = d.posts.length > 0;
    d.posts.forEach((p) => wrap.appendChild(renderPost(p)));
  }
  el("groupBack").onclick = () => go("groups");
  el("groupComposerForm").onsubmit = async (e) => {
    e.preventDefault();
    const body = el("groupPostBody").value.trim();
    if (!body || !currentGroup) return;
    el("groupPostSubmit").disabled = true;
    try { await api("/api/posts", { method: "POST", body: { body, groupId: currentGroup } }); el("groupPostBody").value = ""; await loadGroupFeed(currentGroup); }
    catch (err) { toast(err.message); }
    finally { el("groupPostSubmit").disabled = false; }
  };

  /* ---------- Profile ---------- */
  let pendingProfilePhoto = null;
  let pendingProfileCover = null;
  function loadProfile() {
    const p = me.profile || {};
    el("profileForm").name.value = p.name || "";
    el("profileForm").bio.value = p.bio || "";
    pendingProfilePhoto = null; pendingProfileCover = null;
    paintAvatar(el("profileAvatar"), { id: me.user.id, name: p.name, photo: p.photo });
    el("profileCoverPreview").style.backgroundImage = p.cover ? `url('/api/photo/cover/${me.user.id}?t=${Date.now()}')` : "";
  }
  el("profilePhotoInput").onchange = (e) => uploadPreview(e, (url) => { pendingProfilePhoto = url; el("profileAvatar").style.backgroundImage = `url('${url}')`; el("profileAvatar").textContent = ""; });
  el("profileCoverInput").onchange = (e) => uploadPreview(e, (url) => { pendingProfileCover = url; el("profileCoverPreview").style.backgroundImage = `url('${url}')`; });
  el("profileForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const r = await api("/api/profile", { method: "PUT", body: { name: f.get("name"), bio: f.get("bio") } });
      me.profile = r.profile;
      if (pendingProfilePhoto) { await api("/api/profile/photo", { method: "PUT", body: { dataUrl: pendingProfilePhoto } }); me.profile.photo = true; pendingProfilePhoto = null; }
      if (pendingProfileCover) { await api("/api/profile/cover", { method: "PUT", body: { dataUrl: pendingProfileCover } }); me.profile.cover = true; pendingProfileCover = null; }
      paintMe(); toast("Profile saved."); openUser(me.user.id);
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
    av.style.background = i.style ? `center/cover url('/api/photo/user/${me.user.id}')` : "linear-gradient(135deg,#b8434f,#8a1220)";
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
    renderCare();
    loadCheckin();
    let data; try { data = await api("/api/feed"); } catch { return; }
    const wrap = el("posts"); wrap.innerHTML = "";
    el("feedEmpty").hidden = data.posts.length > 0;
    for (const p of data.posts) wrap.appendChild(renderPost(p));
  }
  const heart = (f) => `<svg viewBox="0 0 24 24" fill="${f ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.35-9.5-8.5C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 7C19 16.65 12 21 12 21z"/></svg>`;
  const bubble = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"/></svg>`;
  const REACT = { like: { e: "❤️", label: "Like" }, care: { e: "💛", label: "Care" }, celebrate: { e: "🎉", label: "Celebrate" }, strength: { e: "💪", label: "Strength" } };
  function reactSummaryRaw(total, by) {
    if (!total) return "";
    const types = Object.keys(by || {}).sort((a, b) => by[b] - by[a]);
    const emojis = types.slice(0, 3).map((t) => (REACT[t] ? REACT[t].e : "")).join("");
    return `${emojis} ${total}`.trim();
  }
  const reactSummary = (p) => reactSummaryRaw(p.likes, p.reactBy);
  const reactBtnLabel = (mine) => (mine && REACT[mine]) ? `<span class="r-emoji">${REACT[mine].e}</span> ${REACT[mine].label}` : `${heart(false)} React`;

  function renderPost(p) {
    const card = document.createElement("article");
    card.className = "post card";
    card.dataset.postId = p.id;
    const av = avatarInner(p.author);
    card.innerHTML = `
      <div class="post-head">
        <div class="avatar" ${av.style ? `style="${av.style}"` : ""}>${av.text}</div>
        <div><div class="post-who">${esc(p.author.name)}</div><div class="post-time">${timeago(p.created)}</div></div>
      </div>
      ${p.body ? `<div class="post-body">${esc(p.body)}</div>` : ""}
      ${p.photo ? `<div class="post-photo"><img src="/api/photo/post/${p.id}" alt=""></div>` : ""}
      <div class="post-stats"><span class="s-likes">${reactSummary(p)}</span><span class="s-comments">${p.comments ? p.comments + (p.comments === 1 ? " comment" : " comments") : ""}</span></div>
      <div class="post-actions">
        <div class="react-wrap">
          <button class="act like ${p.myReaction ? "reacted" : ""}">${reactBtnLabel(p.myReaction)}</button>
          <div class="react-bar" hidden>
            <button type="button" data-r="like" title="Like">❤️</button>
            <button type="button" data-r="care" title="Care">💛</button>
            <button type="button" data-r="celebrate" title="Celebrate">🎉</button>
            <button type="button" data-r="strength" title="Strength">💪</button>
          </div>
        </div>
        <button class="act comment">${bubble} Comment</button>
      </div>
      <div class="comments" hidden></div>`;
    card.querySelectorAll(".post-head .avatar, .post-head .post-who").forEach((n) => { n.classList.add("clickable"); n.onclick = () => openUser(p.author.id); });
    const likeBtn = card.querySelector(".like");
    const bar = card.querySelector(".react-bar");
    likeBtn.onclick = (e) => { e.stopPropagation(); const open = bar.hidden; document.querySelectorAll(".react-bar").forEach((b) => (b.hidden = true)); bar.hidden = !open; };
    async function applyReact(type) {
      bar.hidden = true;
      try {
        const r = await api(`/api/posts/${p.id}/like`, { method: "POST", body: { type } });
        p.myReaction = r.myReaction; p.likes = r.likes; p.reactBy = r.reactBy;
        likeBtn.classList.toggle("reacted", !!r.myReaction);
        likeBtn.innerHTML = reactBtnLabel(r.myReaction);
        card.querySelector(".s-likes").textContent = reactSummary(p);
      } catch (e) { toast(e.message); }
    }
    bar.querySelectorAll("button[data-r]").forEach((b) => { b.onclick = (e) => { e.stopPropagation(); applyReact(b.dataset.r); }; });
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
    if (c.author && c.author.id) row.querySelectorAll(".avatar, .c-who").forEach((n) => { n.classList.add("clickable"); n.onclick = () => openUser(c.author.id); });
    return row;
  }

  /* ---------- Notifications ---------- */
  el("bell").onclick = (e) => { e.stopPropagation(); toggleNotifs(); };
  document.addEventListener("click", (e) => { const p = el("notifPanel"); if (!p.hidden && !p.contains(e.target) && !el("bell").contains(e.target)) p.hidden = true; });
  document.addEventListener("click", (e) => { if (!e.target.closest(".react-wrap")) document.querySelectorAll(".react-bar").forEach((b) => (b.hidden = true)); });
  async function toggleNotifs() {
    const panel = el("notifPanel");
    if (panel.hidden) { await loadNotifs(); panel.hidden = false; try { await api("/api/notifications/read", { method: "POST" }); } catch {} setNotifBadge(0); }
    else panel.hidden = true;
  }
  function notifText(n) {
    const name = esc(n.actor.name || "Someone");
    return ({
      like: `<b>${name}</b> liked your post`,
      comment: `<b>${name}</b> commented on your post`,
      friend_request: `<b>${name}</b> sent you a friend request`,
      friend_accept: `<b>${name}</b> accepted your friend request`,
      reach_out: `<b>${name}</b> reached out to check in on you 💛`,
    })[n.type] || `<b>${name}</b> did something`;
  }
  function renderNotif(n) {
    const row = document.createElement("div");
    row.className = "notif" + (n.read ? "" : " unread") + (n.type === "reach_out" ? " reach" : "");
    const av = avatarInner(n.actor);
    row.innerHTML = `<div class="avatar" ${av.style ? `style="${av.style}"` : ""}>${av.text}</div>
      <div><div class="notif-body">${notifText(n)}</div><div class="notif-time">${timeago(n.created)}</div></div>`;
    return row;
  }
  async function loadNotifs() {
    let d; try { d = await api("/api/notifications"); } catch { return; }
    const list = el("notifList"); list.innerHTML = "";
    el("notifEmpty").hidden = d.notifications.length > 0;
    d.notifications.forEach((n) => list.appendChild(renderNotif(n)));
  }
  function setNotifBadge(n) { const b = el("notifBadge"); if (n > 0) { b.textContent = n > 9 ? "9+" : n; b.hidden = false; } else b.hidden = true; }
  async function refreshNotifBadge() { try { setNotifBadge((await api("/api/notifications")).unread); } catch {} }

  /* ---------- Care signal ---------- */
  function openSupport() {
    el("supportNote").value = "";
    el("supportChips").querySelectorAll(".s-chip").forEach((c) => c.classList.remove("on"));
    el("supportModal").hidden = false;
    setTimeout(() => el("supportNote").focus(), 60);
  }
  function closeSupport() { el("supportModal").hidden = true; }
  el("careRaise").onclick = openSupport;
  el("supportClose").onclick = closeSupport;
  el("supportCancel").onclick = closeSupport;
  el("supportModal").addEventListener("click", (e) => { if (e.target === el("supportModal")) closeSupport(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !el("supportModal").hidden) closeSupport(); });
  el("supportChips").querySelectorAll(".s-chip").forEach((chip) => {
    chip.onclick = () => {
      const wasOn = chip.classList.contains("on");
      el("supportChips").querySelectorAll(".s-chip").forEach((c) => c.classList.remove("on"));
      if (!wasOn) { chip.classList.add("on"); el("supportNote").value = chip.dataset.note; }
      else { el("supportNote").value = ""; }
    };
  });
  el("supportSubmit").onclick = async () => {
    const note = el("supportNote").value.trim();
    el("supportSubmit").disabled = true;
    try {
      await api("/api/support", { method: "PUT", body: { on: true, note } });
      me.profile.support = { on: true, note }; renderCare(); closeSupport();
      toast("Your circle knows. You're not alone in this. 💛");
    } catch (e) { toast(e.message); }
    finally { el("supportSubmit").disabled = false; }
  };
  el("careClear").onclick = async () => {
    try { await api("/api/support", { method: "PUT", body: { on: false } }); me.profile.support = { on: false, note: "" }; renderCare(); toast("Turned off. Glad you're okay. 💛"); }
    catch (e) { toast(e.message); }
  };
  function renderCare() {
    const on = !!(me.profile.support && me.profile.support.on);
    el("careOff").hidden = on; el("careOn").hidden = !on;
  }

  /* ---------- Check-in strip ---------- */
  async function loadCheckin() {
    let d; try { d = await api("/api/support/circle"); } catch { return; }
    const strip = el("checkinStrip"), list = el("checkinList"); list.innerHTML = "";
    strip.hidden = d.circle.length === 0;
    d.circle.forEach((p) => {
      const av = avatarInner(p);
      const row = document.createElement("div"); row.className = "checkin-person";
      row.innerHTML = `<div class="avatar" ${av.style ? `style="${av.style}"` : ""}>${av.text}</div>
        <div class="who"><div class="p-name">${esc(p.name)}</div>${p.note ? `<div class="p-note">${esc(p.note)}</div>` : ""}</div>
        <button class="reach-btn">Reach out 💛</button>`;
      row.querySelector(".reach-btn").onclick = async (ev) => {
        ev.target.disabled = true;
        try { await api("/api/support/reach", { method: "POST", body: { userId: p.id } }); ev.target.textContent = "Sent 💛"; }
        catch (e) { toast(e.message); ev.target.disabled = false; }
      };
      list.appendChild(row);
    });
  }

  /* ---------- Live stream ---------- */
  let es = null;
  function openStream() {
    if (es) return;
    es = new EventSource("/api/stream");
    es.addEventListener("notif", (ev) => {
      let n; try { n = JSON.parse(ev.data); } catch { return; }
      setNotifBadge((parseInt(el("notifBadge").textContent) || 0) + 1);
      if (!el("notifPanel").hidden) { el("notifEmpty").hidden = true; el("notifList").prepend(renderNotif({ ...n, read: false })); }
      if (n.type === "friend_request") refreshReqBadge();
      if (n.type === "reach_out") toast(`${(n.actor.name || "Someone").split(" ")[0]} reached out to you 💛`);
    });
    es.addEventListener("dm", (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (currentDm === m.from.id && !el("chatCard").hidden) {
        const log = el("chatLog"); const empty = log.querySelector(".chat-empty"); if (empty) empty.remove();
        const b = document.createElement("div"); b.className = "msg them"; b.textContent = m.body; log.appendChild(b); log.scrollTop = log.scrollHeight;
      } else {
        setDmBadge((parseInt(el("dmBadge").textContent) || 0) + 1);
        if (!el("view-messages").hidden) loadThreads();
        toast(`${(m.from.name || "Someone").split(" ")[0]}: ${m.body.slice(0, 40)}`);
      }
    });
    es.addEventListener("post_stat", (ev) => {
      let d; try { d = JSON.parse(ev.data); } catch { return; }
      const comTxt = d.comments ? d.comments + (d.comments === 1 ? " comment" : " comments") : "";
      document.querySelectorAll(`[data-post-id="${d.postId}"]`).forEach((card) => {
        const sl = card.querySelector(".s-likes"); if (sl && d.reactBy !== undefined) sl.textContent = reactSummaryRaw(d.likes, d.reactBy);
        const sc = card.querySelector(".s-comments"); if (sc) sc.textContent = comTxt;
        if (d.comment) {
          const box = card.querySelector(".comments");
          if (box && !box.hidden) { const form = box.querySelector(".c-form"); const node = renderComment(d.comment); form ? form.before(node) : box.appendChild(node); }
        }
      });
    });
    es.addEventListener("new_post", (ev) => {
      let p; try { p = JSON.parse(ev.data); } catch { return; }
      if (el("view-feed").hidden) return;
      el("feedEmpty").hidden = true;
      el("posts").prepend(renderPost(p));
    });
    es.onerror = () => {};
  }
  function closeStream() { if (es) { es.close(); es = null; } }

  /* ---------- Messages ---------- */
  let currentDm = null;
  function showThreadList() { el("threadListCard").hidden = false; el("chatCard").hidden = true; currentDm = null; }
  async function loadThreads() {
    let d; try { d = await api("/api/dm/threads"); } catch { return; }
    const list = el("threadList"); list.innerHTML = "";
    el("threadEmpty").hidden = d.threads.length > 0;
    d.threads.forEach((t) => {
      const av = avatarInner(t.with);
      const row = document.createElement("button"); row.className = "thread";
      const preview = t.last ? (t.last.mine ? "You: " : "") + t.last.body : "Say hi";
      row.innerHTML = `<div class="avatar" ${av.style ? `style="${av.style}"` : ""}>${av.text}</div>
        <div class="who"><div class="t-name">${esc(t.with.name)}</div><div class="t-last ${t.unread ? "unread" : ""}">${esc(preview)}</div></div>
        ${t.unread ? '<span class="dot"></span>' : ""}`;
      row.onclick = () => openThread(t.with.id, t.with.name);
      list.appendChild(row);
    });
  }
  async function openThread(id, name) {
    currentDm = id; el("chatWith").textContent = name;
    el("threadListCard").hidden = true; el("chatCard").hidden = false;
    show("messages");
    await renderThread(); refreshDmBadge();
  }
  async function renderThread() {
    const log = el("chatLog");
    let d; try { d = await api("/api/dm?with=" + currentDm); } catch { return; }
    el("chatWith").textContent = d.with.name;
    log.innerHTML = "";
    if (!d.messages.length) log.innerHTML = '<p class="chat-empty">No messages yet. Send the first one.</p>';
    d.messages.forEach((m) => { const b = document.createElement("div"); b.className = "msg " + (m.mine ? "me" : "them"); b.textContent = m.body; log.appendChild(b); });
    log.scrollTop = log.scrollHeight;
  }
  el("chatBack").onclick = () => { showThreadList(); loadThreads(); };
  el("chatForm").onsubmit = async (e) => {
    e.preventDefault();
    const input = el("chatInput"); const body = input.value.trim(); if (!body || !currentDm) return; input.value = "";
    const log = el("chatLog"); const empty = log.querySelector(".chat-empty"); if (empty) empty.remove();
    const b = document.createElement("div"); b.className = "msg me"; b.textContent = body; log.appendChild(b); log.scrollTop = log.scrollHeight;
    try { await api("/api/dm", { method: "POST", body: { toId: currentDm, body } }); } catch (err) { toast(err.message); }
  };
  function setDmBadge(n) { const b = el("dmBadge"); if (n > 0) { b.textContent = n; b.hidden = false; } else b.hidden = true; }
  async function refreshDmBadge() { try { setDmBadge((await api("/api/dm/unread")).unread); } catch {} }

  /* ---------- Boot ---------- */
  async function boot() {
    try {
      me = await api("/api/me");
      el("topbar").hidden = false;
      paintMe();
      if (!me.profile.name) { show("profile"); loadProfile(); return; }
      refreshReqBadge();
      refreshNotifBadge();
      refreshDmBadge();
      openStream();
      go("feed");
    } catch { me = null; el("topbar").hidden = true; setMode("signup"); show("auth"); }
  }
  boot();
})();
