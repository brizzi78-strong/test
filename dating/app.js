/* Cardinal — a client-side dating-app demo.
   Everything lives in localStorage; there is no server. */
(function () {
  "use strict";

  const STORE_KEY = "cardinal.v1";
  const COLORS = ["#D7263D", "#8E1B2C", "#E4572E", "#C2185B", "#7B1FA2",
                  "#3949AB", "#1565C0", "#00897B", "#2E7D32", "#F9A825"];

  /* ---- Sample flock: the people you can discover ---- */
  // The flock: women, ages college-age to 45.
  const FLOCK = [
    { id: "c1", name: "Wren", age: 28, city: "Asheville, NC", color: "#E4572E", avatar: "🎨",
      gender: "Woman", intent: "Long-term", verified: true,
      bio: "Muralist who paints birds on old brick. I make a mean chili and I'll lose every board game gracefully.",
      tags: ["art", "hiking", "board games", "cooking"],
      prompt: "The way to my heart is…", promptAnswer: "showing up with coffee and no agenda." },
    { id: "c2", name: "Selah", age: 33, city: "Durham, NC", color: "#1565C0", avatar: "🎸",
      gender: "Woman", intent: "Long-term", verified: true,
      bio: "Sing in a jazz trio on weekends, write boring code on weekdays. Looking for my duet.",
      tags: ["jazz", "vinyl", "coffee", "slow mornings"],
      prompt: "We'll get along if…", promptAnswer: "you don't mind detours to record shops." },
    { id: "c3", name: "Junia", age: 30, city: "Raleigh, NC", color: "#00897B", avatar: "📚",
      gender: "Woman", intent: "Friendship first", verified: true,
      bio: "Librarian, trail runner, terrible at texting back but great in person. I keep a life list of birds I've seen.",
      tags: ["books", "running", "birding", "tea"],
      prompt: "My idea of a perfect winter Sunday…", promptAnswer: "cinnamon rolls, a long walk, then absolutely nothing." },
    { id: "c4", name: "Marisol", age: 35, city: "Charlotte, NC", color: "#7B1FA2", avatar: "🍜",
      gender: "Woman", intent: "Marriage-minded", verified: true,
      bio: "Chef by trade, homebody by choice. I'll cook you the best meal of your week if you do the dishes.",
      tags: ["food", "gardening", "dogs", "old films"],
      prompt: "I'm looking for someone who…", promptAnswer: "texts back and means what they say." },
    { id: "c5", name: "Priya", age: 27, city: "Chapel Hill, NC", color: "#F9A825", avatar: "🔭",
      gender: "Woman", intent: "Still figuring it out", verified: false,
      bio: "Grad student in astronomy. I stay up too late looking at the sky and I want someone to look up with.",
      tags: ["stars", "camping", "documentaries", "chai"],
      prompt: "The most spontaneous thing I've done…", promptAnswer: "drove six hours to catch a meteor shower on a Tuesday." },
    { id: "c6", name: "Dominique", age: 31, city: "Greensboro, NC", color: "#2E7D32", avatar: "🌱",
      gender: "Woman", intent: "Long-term", verified: true,
      bio: "I run a small plant nursery. Patient, a little quiet, and genuinely happy. Winter people welcome.",
      tags: ["plants", "woodworking", "cycling", "farmers markets"],
      prompt: "We'll get along if…", promptAnswer: "you're kind to waiters and okay with silence." },
    { id: "c7", name: "Nadia", age: 34, city: "Wilmington, NC", color: "#C2185B", avatar: "🏄",
      gender: "Woman", intent: "Long-term", verified: false,
      bio: "Ocean rescue in summer, ceramics in winter. I feel most myself near water and I laugh loudly.",
      tags: ["surfing", "pottery", "travel", "live music"],
      prompt: "The way to my heart is…", promptAnswer: "a handwritten note. Yes, still." },
    { id: "c8", name: "Thea", age: 29, city: "Boone, NC", color: "#3949AB", avatar: "⛰️",
      gender: "Woman", intent: "Marriage-minded", verified: true,
      bio: "Park ranger who knows every trail in the county. Ask me about the cardinals that overwinter here.",
      tags: ["mountains", "photography", "campfires", "poetry"],
      prompt: "I'm looking for someone who…", promptAnswer: "wants a partner for the long trail, not just the trailhead." }
  ];

  /* ---- State ---- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  let state = load();

  function defaults() {
    return {
      profile: null, seen: [], liked: [], matches: [], messages: {}, blocked: [],
      privacy: { incognito: false, hideAge: false, discoverable: true },
      activity: { month: "", seconds: 0 },
      likesToday: { date: "", count: 0 },
      nudgeDismissed: "", rsvps: []
    };
  }
  const ACTIVITY_GOAL_MIN = 30;

  // Men's pricing. Women join free (their commitment is the activity pledge).
  const MEN_PLANS = {
    free: { plan: "Free", price: "$0", likeLimit: 10,
      perks: ["Browse the whole flock", "10 likes a day", "Match & message"] },
    plus: { plan: "Cardinal+", price: "$19.99/mo", likeLimit: null,
      perks: ["Unlimited likes", "See who already liked you", "One free “take-back” a day"] }
  };
  function load() {
    const base = defaults();
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // Merge so older saved state gains new fields.
        return Object.assign(base, saved, {
          privacy: Object.assign(base.privacy, saved.privacy || {}),
          activity: Object.assign(base.activity, saved.activity || {}),
          likesToday: Object.assign(base.likesToday, saved.likesToday || {})
        });
      }
    } catch (e) { /* ignore */ }
    return base;
  }
  function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

  /* ---- Navigation ---- */
  const VIEWS = ["landing", "onboard", "join", "discover", "matches", "events", "profile"];
  function show(view) {
    VIEWS.forEach(v => { const el = $("#view-" + v); if (el) el.hidden = (v !== view); });
    // Hide the app nav during the join gate — you're not a member yet.
    $("#appNav").hidden = !state.profile || view === "join";
    $$(".nav-tab").forEach(t => t.classList.toggle("active", t.dataset.nav === view));
    window.scrollTo(0, 0);
    if (view === "join") renderJoin();
    if (view === "discover") renderDeck();
    if (view === "matches") renderMatches();
    if (view === "events") renderEvents();
    if (view === "profile") renderProfilePreview();
    updateBadge();
  }

  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-nav]");
    if (nav) { e.preventDefault(); show(nav.dataset.nav); }
  });

  $("#getStarted").addEventListener("click", () => openOnboard());
  $("#haveAccount").addEventListener("click", () => {
    show(state.profile ? "discover" : "onboard");
  });
  $("#signOut").addEventListener("click", () => {
    if (confirm("Sign out and clear this demo profile from your browser?")) {
      state = defaults();
      save(); show("landing");
    }
  });
  $("#editProfile").addEventListener("click", () => openOnboard(true));

  /* ---- Onboarding ---- */
  const form = $("#profileForm");
  let tags = [];

  function buildSwatches() {
    const wrap = $("#swatches");
    wrap.innerHTML = "";
    COLORS.forEach(c => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "swatch"; b.style.background = c;
      b.setAttribute("aria-label", "Pick color " + c);
      b.addEventListener("click", () => {
        $$(".swatch").forEach(s => s.classList.remove("selected"));
        b.classList.add("selected");
        form.color.value = c;
      });
      wrap.appendChild(b);
    });
  }
  buildSwatches();

  function renderTags() {
    const wrap = $("#tagInput");
    $$(".tag", wrap).forEach(t => t.remove());
    const field = $("#tagField");
    tags.forEach((t, i) => {
      const el = document.createElement("span");
      el.className = "tag";
      el.innerHTML = `${escapeHtml(t)} <button type="button" aria-label="Remove ${escapeHtml(t)}">×</button>`;
      el.querySelector("button").addEventListener("click", () => { tags.splice(i, 1); renderTags(); });
      wrap.insertBefore(el, field);
    });
    field.style.display = tags.length >= 6 ? "none" : "";
  }
  $("#tagField").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const v = e.target.value.trim().replace(/,$/, "");
      if (v && tags.length < 6 && !tags.includes(v)) { tags.push(v); e.target.value = ""; renderTags(); }
    } else if (e.key === "Backspace" && !e.target.value && tags.length) {
      tags.pop(); renderTags();
    }
  });

  const bio = form.bio, bioCount = $('[data-count-for="bio"]');
  bio.addEventListener("input", () => { bioCount.textContent = `${bio.value.length} / 280`; });

  function openOnboard(edit) {
    if (edit && state.profile) {
      const p = state.profile;
      form.name.value = p.name; form.age.value = p.age; form.seeking.value = p.seeking;
      if (p.gender) form.gender.value = p.gender;
      if (p.intent) form.intent.value = p.intent;
      form.city.value = p.city; form.color.value = p.color; form.bio.value = p.bio;
      form.prompt.value = p.prompt; form.promptAnswer.value = p.promptAnswer;
      tags = p.tags.slice();
      bioCount.textContent = `${p.bio.length} / 280`;
      $$(".swatch").forEach(s => s.classList.toggle("selected", s.style.background === hexToRgb(p.color)));
    } else if (!edit) {
      form.reset(); tags = []; form.color.value = COLORS[0];
      bioCount.textContent = "0 / 280";
    }
    renderTags();
    if (!$(".swatch.selected")) { const first = $(".swatch"); if (first) first.classList.add("selected"); }
    show("onboard");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const prev = state.profile || {};
    state.profile = {
      name: (data.get("name") || "").trim(),
      age: data.get("age"),
      gender: data.get("gender"),
      seeking: data.get("seeking"),
      intent: data.get("intent"),
      city: (data.get("city") || "").trim() || "Somewhere warm",
      color: data.get("color") || COLORS[0],
      avatar: "🐦",
      bio: (data.get("bio") || "").trim() || "Here for the real thing.",
      tags: tags.slice(),
      prompt: data.get("prompt"),
      promptAnswer: (data.get("promptAnswer") || "").trim() || "…ask me and find out.",
      // Carry membership/verification/background across an edit.
      verified: prev.verified || false,
      background: prev.background || null,
      membership: prev.membership || null
    };
    save();
    // New members clear the join gate (background check + membership) first.
    show(state.profile.background && state.profile.background.status === "cleared" ? "discover" : "join");
  });

  /* ---- Join gate: background check + membership ---- */
  function isWoman() { return state.profile && state.profile.gender === "Woman"; }

  function renderJoin() {
    const woman = isWoman();
    $("#membershipTitle").textContent = woman ? "Membership — free for women" : "Choose your membership";
    $("#membershipCopy").textContent = woman
      ? "Cardinal is free for women. In return, we ask one thing: stay active."
      : "Women join free. Here's how it works for everyone else:";
    $("#activityConsentWrap").hidden = !woman;

    const opts = $("#planOptions");
    if (woman) {
      opts.innerHTML = "";
    } else {
      opts.innerHTML = ["free", "plus"].map((key, i) => planOptionHtml(key, i === 0)).join("");
    }

    const bg = $("#bgConsent"), act = $("#activityConsent"), run = $("#runJoin");
    bg.checked = false; act.checked = false;
    $("#joinStatus").hidden = true; $("#joinStatus").innerHTML = "";
    run.disabled = true; run.textContent = "Run check & join →";

    const refresh = () => { run.disabled = !(bg.checked && (!woman || act.checked)); };
    bg.onchange = refresh;
    act.onchange = refresh;
    run.onclick = runJoin;
  }

  function planOptionHtml(key, checked) {
    const p = MEN_PLANS[key];
    return `
      <label class="plan-option">
        <input type="radio" name="plan" value="${key}" ${checked ? "checked" : ""}>
        <div class="plan-body">
          <div class="plan-head"><strong>${p.plan}</strong><span class="plan-price">${p.price}</span></div>
          <ul class="plan-perks">${p.perks.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
        </div>
      </label>`;
  }

  function runJoin() {
    const run = $("#runJoin"), status = $("#joinStatus");
    run.disabled = true;
    status.hidden = false;
    status.className = "join-status working";
    status.innerHTML = `<span class="spinner"></span> Running your background check…`;
    // Simulated check.
    setTimeout(() => {
      const woman = isWoman();
      state.profile.background = { status: "cleared", ref: bgRef(), date: today() };
      if (woman) {
        state.profile.membership = { plan: "Free (women)", free: true, activityGoalMin: ACTIVITY_GOAL_MIN };
      } else {
        const sel = document.querySelector('input[name="plan"]:checked');
        const key = sel ? sel.value : "free";
        const plan = MEN_PLANS[key];
        state.profile.membership = { plan: plan.plan, free: key === "free", price: plan.price, likeLimit: plan.likeLimit, activityGoalMin: 0 };
      }
      ensureActivityMonth();
      save();
      status.className = "join-status ok";
      status.innerHTML = `<strong>✓ You're cleared.</strong> Welcome to the flock.`;
      run.textContent = "Enter Cardinal →";
      run.disabled = false;
      run.onclick = () => show("discover");
    }, 1500);
  }

  function bgRef() {
    // Stable-ish reference from the name; no randomness needed.
    let h = 0; const s = (state.profile.name || "") + (state.activity.seconds || 0);
    for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) & 0xffffff;
    return "BGC-" + h.toString(36).toUpperCase().padStart(5, "0").slice(0, 6);
  }
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function monthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  function ensureActivityMonth() {
    const m = monthKey();
    if (state.activity.month !== m) { state.activity.month = m; state.activity.seconds = 0; }
  }

  /* ---- Activity pace + nudge (women's 30 min/month pledge) ---- */
  function daysInMonth() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }
  function computePace(goal) {
    ensureActivityMonth();
    const expected = goal * (new Date().getDate() / daysInMonth());
    const mins = Math.floor((state.activity.seconds || 0) / 60);
    return { goal, mins, expected, behind: mins < expected - 1, remaining: Math.max(0, goal - mins) };
  }
  function renderNudge() {
    const el = $("#activityNudge");
    if (!el) return;
    const p = state.profile;
    const goal = p && p.membership && p.membership.activityGoalMin;
    if (!goal || state.nudgeDismissed === monthKey()) { el.hidden = true; return; }
    const pace = computePace(goal);
    if (!pace.behind) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `<span>🪶 You're a little behind your ${goal}-min pledge this month — about ${pace.remaining} min to go to keep the flock warm.</span>
      <button class="nudge-x" id="nudgeDismiss" aria-label="Dismiss">×</button>`;
    $("#nudgeDismiss").addEventListener("click", () => { state.nudgeDismissed = monthKey(); save(); el.hidden = true; });
  }

  /* ---- Activity tracking (for the free-for-women 30 min/month pledge) ---- */
  function tickActivity() {
    if (!state.profile) return;
    if (typeof document !== "undefined" && document.hidden) return;
    ensureActivityMonth();
    state.activity.seconds += 15;
    save();
    if (!$("#view-profile").hidden) renderActivityMeter();
  }
  setInterval(tickActivity, 15000);

  /* ---- Discover deck ---- */
  function remaining() {
    return FLOCK.filter(p => !state.seen.includes(p.id) && !state.blocked.includes(p.id));
  }

  function renderDeck() {
    renderNudge();
    const deck = $("#deck");
    const empty = $("#deckEmpty");
    const controls = $("#deckControls");
    deck.innerHTML = "";
    const pool = remaining();
    if (!pool.length) {
      empty.hidden = false; controls.style.visibility = "hidden";
      return;
    }
    empty.hidden = true; controls.style.visibility = "visible";
    // Render up to 3 cards, top card last so it's on top.
    const visible = pool.slice(0, 3).reverse();
    visible.forEach((p, idx) => {
      const isTop = idx === visible.length - 1;
      const depth = visible.length - 1 - idx;
      const card = document.createElement("div");
      card.className = "swipe-card";
      card.dataset.id = p.id;
      card.style.transform = `scale(${1 - depth * 0.04}) translateY(${depth * 10}px)`;
      card.style.zIndex = idx;
      card.innerHTML = cardHtml(p);
      deck.appendChild(card);
      if (isTop) attachDrag(card, p);
    });
  }

  function verifiedBadge(p) {
    return p.verified ? `<span class="verified" title="Photo-verified">✓</span>` : "";
  }

  function cardHtml(p) {
    return `
      <div class="stamp like">LIKE</div>
      <div class="stamp nope">NOPE</div>
      <button class="card-report" data-report="${p.id}" title="Report or block" aria-label="Report or block ${escapeHtml(p.name)}">⋯</button>
      <div class="card-photo" style="background:linear-gradient(160deg, ${p.color}, ${shade(p.color, -25)})">
        <div class="card-avatar">${p.avatar}</div>
        <div class="card-name">
          <h3>${escapeHtml(p.name)}, ${escapeHtml(String(p.age))} ${verifiedBadge(p)}</h3>
          <div class="loc">${escapeHtml(p.city)}</div>
        </div>
      </div>
      ${p.intent ? `<div class="card-intent">${escapeHtml(p.intent)}</div>` : ""}
      <div class="card-body">
        <p class="card-bio">${escapeHtml(p.bio)}</p>
        <div class="card-prompt"><b>${escapeHtml(p.prompt)}</b>${escapeHtml(p.promptAnswer)}</div>
        <div class="card-tags">${p.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
      </div>`;
  }

  function attachDrag(card, person) {
    let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false;
    const like = $(".stamp.like", card), nope = $(".stamp.nope", card);

    const down = (x, y) => { startX = x; startY = y; dragging = true; card.classList.add("dragging"); };
    const move = (x, y) => {
      if (!dragging) return;
      dx = x - startX; dy = y - startY;
      const rot = dx / 18;
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
      like.style.opacity = Math.max(0, Math.min(1, dx / 100));
      nope.style.opacity = Math.max(0, Math.min(1, -dx / 100));
    };
    const up = () => {
      if (!dragging) return;
      dragging = false; card.classList.remove("dragging");
      if (dx > 110) return attemptLike(card, person);
      if (dx < -110) return fly(card, person, -1);
      card.style.transform = ""; like.style.opacity = 0; nope.style.opacity = 0;
    };

    card.addEventListener("mousedown", e => down(e.clientX, e.clientY));
    window.addEventListener("mousemove", e => move(e.clientX, e.clientY));
    window.addEventListener("mouseup", up);
    card.addEventListener("touchstart", e => down(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    card.addEventListener("touchmove", e => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    card.addEventListener("touchend", up);

    card._act = (dir) => (dir > 0 ? attemptLike(card, person) : fly(card, person, -1));
  }

  function fly(card, person, dir) {
    card.style.transition = "transform .4s ease, opacity .4s ease";
    card.style.transform = `translate(${dir * 600}px, -40px) rotate(${dir * 30}deg)`;
    card.style.opacity = "0";
    decide(person, dir > 0);
    setTimeout(renderDeck, 260);
  }

  /* ---- Daily like limit (men's free tier) ---- */
  function attemptLike(card, person) {
    if (canLike()) { noteLike(); fly(card, person, 1); }
    else { resetCard(card); showUpsell(); }
  }
  function resetCard(card) {
    card.style.transition = "transform .25s ease";
    card.style.transform = "";
    const l = card.querySelector(".stamp.like"), n = card.querySelector(".stamp.nope");
    if (l) l.style.opacity = 0; if (n) n.style.opacity = 0;
  }
  function likeLimit() {
    const m = state.profile && state.profile.membership;
    return m && m.likeLimit ? m.likeLimit : null; // null = unlimited
  }
  function ensureLikesDay() {
    const d = today();
    if (state.likesToday.date !== d) { state.likesToday.date = d; state.likesToday.count = 0; }
  }
  function canLike() {
    const lim = likeLimit();
    if (!lim) return true;
    ensureLikesDay();
    return state.likesToday.count < lim;
  }
  function noteLike() {
    if (!likeLimit()) return;
    ensureLikesDay();
    state.likesToday.count++;
    save();
  }
  function showUpsell() {
    const plus = MEN_PLANS.plus;
    $("#modalCard").innerHTML = `
      <div class="m-hero"><div class="m-avatar" style="background:var(--red)">♥</div></div>
      <h2 style="color:var(--fg)">Out of likes for today</h2>
      <p>Free members get ${MEN_PLANS.free.likeLimit} likes a day. Upgrade to ${plus.plan} for unlimited — and see who already liked you.</p>
      <div class="modal-quote"><b>${plus.plan} · ${plus.price}</b>${plus.perks.join(" · ")}</div>
      <div class="modal-actions" style="margin-top:1rem">
        <button class="btn btn-ghost" id="laterUpsell">Maybe tomorrow</button>
        <button class="btn btn-primary" id="doUpgrade">Upgrade to ${plus.plan}</button>
      </div>`;
    modal.hidden = false;
    $("#laterUpsell").addEventListener("click", closeModal);
    $("#doUpgrade").addEventListener("click", () => {
      upgradeTo("plus"); closeModal(); renderDeck();
    });
  }
  function upgradeTo(key) {
    const plan = MEN_PLANS[key];
    state.profile.membership = { plan: plan.plan, free: key === "free", price: plan.price, likeLimit: plan.likeLimit, activityGoalMin: 0 };
    save();
  }

  function decide(person, liked) {
    if (!state.seen.includes(person.id)) state.seen.push(person.id);
    if (liked) {
      state.liked.push(person.id);
      // A cardinal calls back most of the time.
      if (mutual(person)) {
        state.matches.push(person.id);
        save();
        showMatchModal(person);
        return;
      }
    }
    save();
    updateBadge();
  }

  // Deterministic "do they like you back?" — feels random but is stable per person.
  function mutual(person) {
    let h = 0;
    for (const ch of person.id + person.name) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
    return (h % 10) < 7; // ~70% call back
  }

  // Top control buttons
  $("#likeBtn").addEventListener("click", () => triggerTop(1));
  $("#passBtn").addEventListener("click", () => triggerTop(-1));
  $("#infoBtn").addEventListener("click", () => {
    const pool = remaining();
    if (pool.length) alert(`${pool.length} more ${pool.length === 1 ? "cardinal" : "cardinals"} in your area.`);
  });
  $("#reshuffle").addEventListener("click", () => {
    state.seen = []; state.liked = []; save(); renderDeck();
  });

  function triggerTop(dir) {
    const cards = $$(".swipe-card");
    const top = cards[cards.length - 1];
    if (top && top._act) top._act(dir);
  }

  document.addEventListener("keydown", (e) => {
    if ($("#view-discover").hidden) return;
    if (e.key === "ArrowRight") triggerTop(1);
    if (e.key === "ArrowLeft") triggerTop(-1);
  });

  /* ---- Match modal ---- */
  const modal = $("#modal");
  function showMatchModal(person) {
    const me = state.profile;
    $("#modalCard").innerHTML = `
      <div class="m-hero">
        <div class="m-avatar" style="background:${me.color}">${me.avatar}</div>
        <div class="m-avatar" style="background:${person.color}">${person.avatar}</div>
      </div>
      <h2>It's a match!</h2>
      <p>You and ${escapeHtml(person.name)} both leaned in.</p>
      <div class="modal-quote"><b>${escapeHtml(person.prompt)}</b>${escapeHtml(person.promptAnswer)}</div>
      <div class="modal-msg">
        <input type="text" id="firstMsg" placeholder="Say something real…" maxlength="140">
        <button class="btn btn-primary" id="sendMsg">Send</button>
      </div>
      <div id="sentNote"></div>
      <div class="modal-actions" style="margin-top:1rem">
        <button class="btn btn-ghost" id="keepSwiping">Keep going</button>
      </div>`;
    modal.hidden = false;
    $("#keepSwiping").addEventListener("click", closeModal);
    $("#sendMsg").addEventListener("click", () => sendFirst(person));
    $("#firstMsg").addEventListener("keydown", (e) => { if (e.key === "Enter") sendFirst(person); });
    $("#firstMsg").focus();
  }
  function sendFirst(person) {
    const val = $("#firstMsg").value.trim();
    if (!val) return;
    state.messages[person.id] = val;
    save();
    $("#sentNote").innerHTML = `<div class="sent-note">Sent to ${escapeHtml(person.name)} ✓</div>`;
    $("#firstMsg").value = ""; $("#firstMsg").disabled = true; $("#sendMsg").disabled = true;
  }
  function closeModal() { modal.hidden = true; updateBadge(); }
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  /* ---- Matches view ---- */
  function renderMatches() {
    const list = $("#matchList"), empty = $("#matchEmpty");
    const ppl = state.matches.map(id => FLOCK.find(p => p.id === id)).filter(Boolean);
    empty.hidden = ppl.length > 0;
    list.hidden = ppl.length === 0;
    list.innerHTML = ppl.map(p => `
      <div class="match-tile" data-match="${p.id}">
        <div class="m-avatar" style="background:${p.color}">${p.avatar}</div>
        <div class="m-name">${escapeHtml(p.name)} ${verifiedBadge(p)}</div>
        <div class="m-loc">${escapeHtml(p.city)}</div>
      </div>`).join("");
    $$("[data-match]", list).forEach(t => {
      t.addEventListener("click", () => {
        const p = FLOCK.find(x => x.id === t.dataset.match);
        if (p) openMatchDetail(p);
      });
    });
  }

  function openMatchDetail(person) {
    const sent = state.messages[person.id];
    $("#modalCard").innerHTML = `
      <div class="m-hero">
        <div class="m-avatar" style="background:${person.color}">${person.avatar}</div>
      </div>
      <h2 style="color:var(--fg)">${escapeHtml(person.name)}, ${escapeHtml(String(person.age))} ${verifiedBadge(person)}</h2>
      <p>${escapeHtml(person.city)}</p>
      <div class="modal-quote"><b>About</b>${escapeHtml(person.bio)}</div>
      <div class="modal-quote"><b>${escapeHtml(person.prompt)}</b>${escapeHtml(person.promptAnswer)}</div>
      <div class="modal-msg">
        <input type="text" id="firstMsg" placeholder="${sent ? "Send another…" : "Say something real…"}" maxlength="140">
        <button class="btn btn-primary" id="sendMsg">Send</button>
      </div>
      <div id="sentNote">${sent ? `<div class="sent-note">You said: “${escapeHtml(sent)}” ✓</div>` : ""}</div>
      <div class="modal-actions" style="margin-top:1rem">
        <button class="btn btn-ghost" id="keepSwiping">Close</button>
        <button class="btn btn-danger" data-report="${person.id}">Report / block</button>
      </div>`;
    modal.hidden = false;
    $("#keepSwiping").addEventListener("click", closeModal);
    $("#sendMsg").addEventListener("click", () => { sendFirst(person); });
    $("#firstMsg").addEventListener("keydown", (e) => { if (e.key === "Enter") sendFirst(person); });
  }

  /* ---- Report / block ---- */
  const REPORT_REASONS = ["Fake or scam profile", "Inappropriate photos or messages",
    "Harassment or hate", "Underage", "Someone I know / just not interested"];

  function openReport(person) {
    $("#modalCard").innerHTML = `
      <h2 style="color:var(--fg)">Report or block ${escapeHtml(person.name)}</h2>
      <p>Blocking removes them from your deck and matches — they can't see you and you won't see them. Reports are confidential.</p>
      <div class="report-reasons">
        ${REPORT_REASONS.map((r, i) => `
          <label class="report-reason">
            <input type="radio" name="reason" value="${escapeHtml(r)}" ${i === 0 ? "checked" : ""}>
            <span>${escapeHtml(r)}</span>
          </label>`).join("")}
      </div>
      <div class="modal-actions" style="margin-top:1rem">
        <button class="btn btn-ghost" id="cancelReport">Cancel</button>
        <button class="btn btn-danger" id="confirmBlock">Block ${escapeHtml(person.name)}</button>
      </div>`;
    modal.hidden = false;
    $("#cancelReport").addEventListener("click", closeModal);
    $("#confirmBlock").addEventListener("click", () => blockPerson(person));
  }

  function blockPerson(person) {
    if (!state.blocked.includes(person.id)) state.blocked.push(person.id);
    if (!state.seen.includes(person.id)) state.seen.push(person.id);
    state.matches = state.matches.filter(id => id !== person.id);
    state.liked = state.liked.filter(id => id !== person.id);
    delete state.messages[person.id];
    save();
    closeModal();
    // Refresh whatever view we're on.
    if (!$("#view-discover").hidden) renderDeck();
    if (!$("#view-matches").hidden) renderMatches();
    if (!$("#view-profile").hidden) renderProfilePreview();
    updateBadge();
  }

  // Delegated: report buttons live on rebuilt cards and modal.
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-report]");
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    const p = FLOCK.find(x => x.id === btn.dataset.report);
    if (p) openReport(p);
  });

  /* ---- Monthly events ---- */
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const EVENT_THEMES = [
    { key: "speed", emoji: "⏱️", title: "Cardinal Speed Dating", type: "Speed dating",
      desc: "Ten five-minute conversations, one relaxed evening. We run the rotation; you just show up." },
    { key: "hike", emoji: "🥾", title: "Sunrise Flock Hike", type: "Outdoors",
      desc: "An easy group hike with coffee after. Meet people shoulder-to-shoulder, not screen-to-screen." },
    { key: "mixer", emoji: "🍷", title: "Winter Warmers Mixer", type: "Mixer",
      desc: "Low-key drinks at a cozy spot. Name tags optional, conversation prompts provided." },
    { key: "brunch", emoji: "🥞", title: "Slow Sunday Brunch", type: "Brunch",
      desc: "A long table, good pancakes, and no rush. Bring your appetite and an open mind." }
  ];
  const EVENT_CITIES = ["Raleigh, NC", "Asheville, NC", "Charlotte, NC", "Durham, NC"];

  function thirdSaturday(year, monthIndex) {
    const firstDow = new Date(year, monthIndex, 1).getDay();
    const firstSat = 1 + ((6 - firstDow + 7) % 7);
    return new Date(year, monthIndex, firstSat + 14);
  }
  function generateEvents() {
    const now = new Date();
    const out = [];
    for (let n = 0; n < 4; n++) {
      const m = now.getMonth() + n;
      const year = now.getFullYear() + Math.floor(m / 12);
      const monthIndex = ((m % 12) + 12) % 12;
      const date = thirdSaturday(year, monthIndex);
      const theme = EVENT_THEMES[n % EVENT_THEMES.length];
      out.push(Object.assign({
        id: `${year}-${monthIndex + 1}-${theme.key}`,
        date,
        city: EVENT_CITIES[n % EVENT_CITIES.length]
      }, theme));
    }
    return out;
  }
  function attendeeBase(ev) {
    let h = 0;
    for (const ch of ev.id) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
    return 24 + (h % 40); // 24–63
  }
  function renderEvents() {
    const events = generateEvents();
    $("#eventList").innerHTML = events.map(ev => {
      const going = state.rsvps.includes(ev.id);
      const count = attendeeBase(ev) + (going ? 1 : 0);
      const label = `${DAYS[ev.date.getDay()]}, ${MONTHS[ev.date.getMonth()]} ${ev.date.getDate()}`;
      return `
        <div class="event-card">
          <div class="event-date">
            <span class="ed-mon">${MONTHS[ev.date.getMonth()]}</span>
            <span class="ed-day">${ev.date.getDate()}</span>
          </div>
          <div class="event-body">
            <div class="event-top"><span class="event-emoji">${ev.emoji}</span><h3>${escapeHtml(ev.title)}</h3></div>
            <div class="event-meta"><span class="type-pill">${escapeHtml(ev.type)}</span> · ${escapeHtml(label)} · ${escapeHtml(ev.city)}</div>
            <p class="muted-p">${escapeHtml(ev.desc)}</p>
            <div class="event-foot">
              <span class="going-count">${count} going</span>
              <button class="btn ${going ? "btn-ghost" : "btn-primary"}" data-rsvp="${ev.id}">${going ? "Going ✓" : "RSVP"}</button>
            </div>
          </div>
        </div>`;
    }).join("");
    $$("[data-rsvp]").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.rsvp;
      if (state.rsvps.includes(id)) state.rsvps = state.rsvps.filter(x => x !== id);
      else state.rsvps.push(id);
      save(); renderEvents();
    }));
  }

  /* ---- Profile preview ---- */
  function renderProfilePreview() {
    const p = state.profile;
    if (!p) return;
    const pv = state.privacy;
    const blocked = state.blocked.map(id => FLOCK.find(x => x.id === id)).filter(Boolean);
    $("#profilePreview").innerHTML = `
      <div class="profile-card">
        <div class="p-avatar" style="background:${p.color}">${p.avatar}</div>
        <div>
          <h3>${escapeHtml(p.name)}${pv.hideAge ? "" : ", " + escapeHtml(String(p.age))} ${p.verified ? `<span class="verified" title="Photo-verified">✓</span>` : ""}</h3>
          <div class="p-meta">${escapeHtml(p.city)} · seeking ${escapeHtml(p.seeking.toLowerCase())}</div>
          ${p.intent ? `<div class="p-meta">Here for a ${escapeHtml(p.intent.toLowerCase())}</div>` : ""}
        </div>
      </div>
      <div class="profile-block">
        <div class="lbl">About</div>
        <p>${escapeHtml(p.bio)}</p>
      </div>
      <div class="profile-block">
        <div class="lbl">${escapeHtml(p.prompt)}</div>
        <p>${escapeHtml(p.promptAnswer)}</p>
      </div>
      ${p.tags.length ? `<div class="profile-block">
        <div class="lbl">Interests</div>
        <div class="chip-row">${p.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
      </div>` : ""}

      <div class="profile-block safety">
        <div class="lbl">Verification</div>
        ${p.verified
          ? `<div class="verified-row"><span class="verified">✓</span> You're photo-verified. Others see the badge on your profile.</div>`
          : `<p class="muted-p">A quick photo check tells your matches you're real. Verified profiles get more and better matches.</p>
             <button class="btn btn-primary" id="verifyBtn">Get verified</button>`}
      </div>

      <div class="profile-block safety">
        <div class="lbl">Background check</div>
        ${p.background && p.background.status === "cleared"
          ? `<div class="verified-row"><span class="verified ok-green">✓</span> Cleared · ${escapeHtml(p.background.ref)} · ${escapeHtml(p.background.date)}</div>`
          : `<p class="muted-p">Not on file. Every member clears a confidential background check.</p>
             <button class="btn btn-primary" id="bgCheckBtn">Run background check</button>`}
      </div>

      <div class="profile-block safety">
        <div class="lbl">Membership</div>
        ${membershipHtml(p)}
      </div>

      <div class="profile-block safety">
        <div class="lbl">Privacy</div>
        ${toggleRow("incognito", "Incognito mode", "Only people you like can see your profile.", pv.incognito)}
        ${toggleRow("discoverable", "Show me in Discover", "Turn off to take a break without deleting anything.", pv.discoverable)}
        ${toggleRow("hideAge", "Hide my age", "Your age won't show on your card.", pv.hideAge)}
      </div>

      <div class="profile-block safety">
        <div class="lbl">Blocked ${blocked.length ? `(${blocked.length})` : ""}</div>
        ${blocked.length
          ? `<div class="blocked-list">${blocked.map(b => `
              <div class="blocked-row">
                <span>${escapeHtml(b.name)} · ${escapeHtml(b.city)}</span>
                <button class="linklike" data-unblock="${b.id}">Unblock</button>
              </div>`).join("")}</div>`
          : `<p class="muted-p">You haven't blocked anyone. Use the ⋯ on a card or "Report / block" in a match to block someone.</p>`}
      </div>`;

    const vb = $("#verifyBtn");
    if (vb) vb.addEventListener("click", openVerify);
    const bb = $("#bgCheckBtn");
    if (bb) bb.addEventListener("click", () => {
      const woman = isWoman();
      state.profile.background = { status: "cleared", ref: bgRef(), date: today() };
      if (!state.profile.membership) {
        state.profile.membership = woman
          ? { plan: "Free (women)", free: true, activityGoalMin: ACTIVITY_GOAL_MIN }
          : { plan: "Free (demo)", free: true, activityGoalMin: 0 };
      }
      save(); renderProfilePreview();
    });
    $$("[data-plan]").forEach(b => b.addEventListener("click", () => {
      upgradeTo(b.dataset.plan); renderProfilePreview();
    }));
    $$("[data-toggle]").forEach(t => t.addEventListener("click", () => {
      const key = t.dataset.toggle;
      state.privacy[key] = !state.privacy[key];
      save(); renderProfilePreview();
    }));
    $$("[data-unblock]").forEach(b => b.addEventListener("click", () => {
      state.blocked = state.blocked.filter(id => id !== b.dataset.unblock);
      // Let them reappear in Discover.
      state.seen = state.seen.filter(id => id !== b.dataset.unblock);
      save(); renderProfilePreview();
    }));
  }

  function membershipHtml(p) {
    const m = p.membership;
    const woman = p.gender === "Woman";
    if (!m) {
      return `<p class="muted-p">${woman ? "Cardinal is free for women." : "Free while we're getting off the ground."}</p>`;
    }
    const badge = m.free ? `<span class="pill-free">FREE</span>` : `<span class="pill-plus">PLUS</span>`;
    let html = `<div class="verified-row">${badge} ${escapeHtml(m.plan)}${m.price && !m.free ? ` · ${escapeHtml(m.price)}` : ""}</div>`;

    // Women: activity pledge meter + pace status.
    if (m.activityGoalMin) {
      const pace = computePace(m.activityGoalMin);
      const pct = Math.min(100, Math.round((pace.mins / m.activityGoalMin) * 100));
      const met = pace.mins >= m.activityGoalMin;
      const status = met ? `<span class="pace ok">✓ Pledge met</span>`
        : pace.behind ? `<span class="pace behind">Behind pace</span>`
        : `<span class="pace ontrack">On track</span>`;
      html += `
        <p class="muted-p" style="margin-top:0.6rem">Your pledge: <strong>${m.activityGoalMin} min of activity a month</strong> so the flock stays warm. ${status}</p>
        <div class="meter" id="activityMeter">
          <div class="meter-bar"><span style="width:${pct}%"></span></div>
          <div class="meter-label">${met ? "✓ " : ""}${pace.mins} / ${m.activityGoalMin} min this month</div>
        </div>`;
    }

    // Men: show perks + upgrade/downgrade.
    if (!woman) {
      const key = m.free ? "free" : "plus";
      const plan = MEN_PLANS[key];
      html += `<ul class="plan-perks tight">${plan.perks.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
      if (m.free) {
        const lim = MEN_PLANS.free.likeLimit;
        ensureLikesDay();
        html += `<div class="meter-label" style="margin:0.25rem 0 0.75rem">${Math.max(0, lim - state.likesToday.count)} of ${lim} likes left today</div>
          <button class="btn btn-primary" data-plan="plus">Upgrade to ${MEN_PLANS.plus.plan} · ${MEN_PLANS.plus.price}</button>`;
      } else {
        html += `<button class="btn btn-ghost" data-plan="free">Switch to Free</button>`;
      }
    }
    return html;
  }

  function renderActivityMeter() {
    const p = state.profile;
    if (!p || !p.membership || !p.membership.activityGoalMin) return;
    const meter = $("#activityMeter");
    if (!meter) return;
    ensureActivityMonth();
    const goal = p.membership.activityGoalMin;
    const mins = Math.floor((state.activity.seconds || 0) / 60);
    const pct = Math.min(100, Math.round((mins / goal) * 100));
    const met = mins >= goal;
    meter.querySelector(".meter-bar span").style.width = pct + "%";
    meter.querySelector(".meter-label").textContent = `${met ? "✓ " : ""}${mins} / ${goal} min this month`;
  }

  function toggleRow(key, label, help, on) {
    return `
      <div class="toggle-row">
        <div>
          <div class="toggle-label">${escapeHtml(label)}</div>
          <div class="toggle-help">${escapeHtml(help)}</div>
        </div>
        <button class="switch ${on ? "on" : ""}" data-toggle="${key}" role="switch" aria-checked="${on}" aria-label="${escapeHtml(label)}"><span></span></button>
      </div>`;
  }

  /* ---- Verification (demo) ---- */
  function openVerify() {
    $("#modalCard").innerHTML = `
      <div class="m-hero"><div class="m-avatar" style="background:${state.profile.color}">${state.profile.avatar}</div></div>
      <h2 style="color:var(--fg)">Verify your profile</h2>
      <p>In the real app you'd snap a selfie matching a random pose, and we'd match it to your photos — no one else sees it. This demo just flips the badge on.</p>
      <div class="modal-actions" style="margin-top:1rem">
        <button class="btn btn-ghost" id="cancelVerify">Not now</button>
        <button class="btn btn-primary" id="doVerify">Verify me</button>
      </div>`;
    modal.hidden = false;
    $("#cancelVerify").addEventListener("click", closeModal);
    $("#doVerify").addEventListener("click", () => {
      state.profile.verified = true; save(); closeModal(); renderProfilePreview();
    });
  }

  /* ---- Badge ---- */
  function updateBadge() {
    const b = $("#matchBadge");
    const n = state.matches.length;
    b.hidden = n === 0; b.textContent = n;
  }

  /* ---- Helpers ---- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function shade(hex, pct) {
    const { r, g, b } = parseHex(hex);
    const t = pct < 0 ? 0 : 255, p = Math.abs(pct) / 100;
    const mix = v => Math.round((t - v) * p + v);
    return `#${[mix(r), mix(g), mix(b)].map(v => v.toString(16).padStart(2, "0")).join("")}`;
  }
  function parseHex(hex) {
    const h = hex.replace("#", "");
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  function hexToRgb(hex) {
    const { r, g, b } = parseHex(hex);
    return `rgb(${r}, ${g}, ${b})`;
  }

  /* ---- Boot ---- */
  updateBadge();
  show(state.profile ? "discover" : "landing");
})();
