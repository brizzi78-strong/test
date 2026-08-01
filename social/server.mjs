// Nest — a social network. Phase 1: profiles, posts, feed, likes, comments.
// Zero third-party vendors: only Node.js built-ins (http, node:sqlite, crypto).
// Run: node social/server.mjs   (PORT, default 4000)

import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "public");
const DB_PATH = process.env.NEST_DB || join(__dirname, "nest.db");
const PORT = Number(process.env.PORT) || 4000;

/* ----------------------------- Database ----------------------------- */
// Make sure the database's directory exists (e.g. a mounted /data volume).
mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL, pass_hash TEXT NOT NULL, created INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    name TEXT NOT NULL DEFAULT '', bio TEXT DEFAULT '',
    photo BLOB, photo_mime TEXT
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER NOT NULL REFERENCES users(id),
    body TEXT DEFAULT '', photo BLOB, photo_mime TEXT, created INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS likes (
    post_id INTEGER NOT NULL, user_id INTEGER NOT NULL, created INTEGER NOT NULL,
    PRIMARY KEY (post_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts(id),
    user_id INTEGER NOT NULL, body TEXT NOT NULL, created INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS friendships (
    requester_id INTEGER NOT NULL, addressee_id INTEGER NOT NULL,
    status TEXT NOT NULL, created INTEGER NOT NULL,
    PRIMARY KEY (requester_id, addressee_id)
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL, type TEXT NOT NULL, actor_id INTEGER NOT NULL,
    post_id INTEGER, created INTEGER NOT NULL, read INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS dms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_id INTEGER NOT NULL, to_id INTEGER NOT NULL,
    body TEXT NOT NULL, created INTEGER NOT NULL, read INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, about TEXT DEFAULT '',
    owner_id INTEGER NOT NULL, created INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS group_members (
    group_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'member', created INTEGER NOT NULL,
    PRIMARY KEY (group_id, user_id)
  );
`);

// Migration: the "care signal" — a member can quietly tell their circle they could
// use some support. This is the network's signature, on-brand feature.
{
  const cols = db.prepare("PRAGMA table_info(profiles)").all().map((c) => c.name);
  const add = (s) => { try { db.exec(s); } catch {} };
  if (!cols.includes("need_support")) add("ALTER TABLE profiles ADD COLUMN need_support INTEGER NOT NULL DEFAULT 0");
  if (!cols.includes("support_note")) add("ALTER TABLE profiles ADD COLUMN support_note TEXT DEFAULT ''");
  if (!cols.includes("support_since")) add("ALTER TABLE profiles ADD COLUMN support_since INTEGER");
}

// Migration: posts can belong to a group (Phase 5). NULL group_id = a normal circle post.
{
  const cols = db.prepare("PRAGMA table_info(posts)").all().map((c) => c.name);
  if (!cols.includes("group_id")) { try { db.exec("ALTER TABLE posts ADD COLUMN group_id INTEGER"); } catch {} }
}

/* ----------------------------- Auth helpers ----------------------------- */
function hashPassword(password) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
}
function verifyPassword(password, stored) {
  const [saltHex, hashHex] = String(stored).split(":");
  if (!saltHex || !hashHex) return false;
  const hash = scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(hashHex, "hex");
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}
const newToken = () => randomBytes(24).toString("hex");

const q = {
  userByEmail: db.prepare("SELECT * FROM users WHERE email=?"),
  userById: db.prepare("SELECT * FROM users WHERE id=?"),
  insertUser: db.prepare("INSERT INTO users (email, pass_hash, created) VALUES (?,?,?)"),
  insertProfile: db.prepare("INSERT INTO profiles (user_id, name) VALUES (?,?)"),
  profileById: db.prepare("SELECT * FROM profiles WHERE user_id=?"),
  updateProfile: db.prepare("UPDATE profiles SET name=?, bio=? WHERE user_id=?"),
  setUserPhoto: db.prepare("UPDATE profiles SET photo=?, photo_mime=? WHERE user_id=?"),
  getUserPhoto: db.prepare("SELECT photo, photo_mime FROM profiles WHERE user_id=?"),
  insertSession: db.prepare("INSERT INTO sessions (token, user_id, created) VALUES (?,?,?)"),
  sessionByToken: db.prepare("SELECT * FROM sessions WHERE token=?"),
  deleteSession: db.prepare("DELETE FROM sessions WHERE token=?"),
  insertPost: db.prepare("INSERT INTO posts (author_id, body, photo, photo_mime, created, group_id) VALUES (?,?,?,?,?,?)"),
  postById: db.prepare("SELECT * FROM posts WHERE id=?"),
  getPostPhoto: db.prepare("SELECT photo, photo_mime FROM posts WHERE id=?"),
  feed: db.prepare("SELECT id, author_id, body, (photo IS NOT NULL) AS has_photo, created FROM posts ORDER BY created DESC LIMIT 100"),
  likeCount: db.prepare("SELECT COUNT(*) c FROM likes WHERE post_id=?"),
  likedByMe: db.prepare("SELECT 1 FROM likes WHERE post_id=? AND user_id=?"),
  insertLike: db.prepare("INSERT OR IGNORE INTO likes (post_id, user_id, created) VALUES (?,?,?)"),
  deleteLike: db.prepare("DELETE FROM likes WHERE post_id=? AND user_id=?"),
  commentCount: db.prepare("SELECT COUNT(*) c FROM comments WHERE post_id=?"),
  insertComment: db.prepare("INSERT INTO comments (post_id, user_id, body, created) VALUES (?,?,?,?)"),
  commentsFor: db.prepare("SELECT c.user_id, c.body, c.created, p.name FROM comments c JOIN profiles p ON p.user_id=c.user_id WHERE c.post_id=? ORDER BY c.created ASC"),
  edge: db.prepare("SELECT * FROM friendships WHERE (requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?)"),
  addRequest: db.prepare("INSERT OR IGNORE INTO friendships (requester_id, addressee_id, status, created) VALUES (?,?,'pending',?)"),
  acceptRequest: db.prepare("UPDATE friendships SET status='accepted' WHERE requester_id=? AND addressee_id=? AND status='pending'"),
  removeEdge: db.prepare("DELETE FROM friendships WHERE (requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?)"),
  friendIds: db.prepare(`SELECT addressee_id AS id FROM friendships WHERE requester_id=? AND status='accepted'
                         UNION SELECT requester_id AS id FROM friendships WHERE addressee_id=? AND status='accepted'`),
  incomingRequests: db.prepare("SELECT requester_id AS id, created FROM friendships WHERE addressee_id=? AND status='pending' ORDER BY created DESC"),
  searchPeople: db.prepare("SELECT user_id AS id FROM profiles WHERE user_id!=? AND name!='' AND lower(name) LIKE ? ORDER BY name LIMIT 40"),
  recentPeople: db.prepare("SELECT user_id AS id FROM profiles WHERE user_id!=? AND name!='' ORDER BY user_id DESC LIMIT 40"),
  insertNotif: db.prepare("INSERT INTO notifications (user_id, type, actor_id, post_id, created) VALUES (?,?,?,?,?)"),
  notifsFor: db.prepare("SELECT id, type, actor_id, post_id, created, read FROM notifications WHERE user_id=? ORDER BY created DESC LIMIT 40"),
  unreadCount: db.prepare("SELECT COUNT(*) c FROM notifications WHERE user_id=? AND read=0"),
  markRead: db.prepare("UPDATE notifications SET read=1 WHERE user_id=? AND read=0"),
  setSupport: db.prepare("UPDATE profiles SET need_support=?, support_note=?, support_since=? WHERE user_id=?"),
  insertDm: db.prepare("INSERT INTO dms (from_id, to_id, body, created) VALUES (?,?,?,?)"),
  dmThread: db.prepare("SELECT from_id, body, created FROM dms WHERE (from_id=? AND to_id=?) OR (from_id=? AND to_id=?) ORDER BY created ASC LIMIT 300"),
  dmMarkRead: db.prepare("UPDATE dms SET read=1 WHERE to_id=? AND from_id=? AND read=0"),
  dmUnreadTotal: db.prepare("SELECT COUNT(*) c FROM dms WHERE to_id=? AND read=0"),
  dmUnreadFrom: db.prepare("SELECT COUNT(*) c FROM dms WHERE to_id=? AND from_id=? AND read=0"),
  dmPartners: db.prepare(`SELECT other, MAX(created) last FROM (
      SELECT to_id AS other, created FROM dms WHERE from_id=?
      UNION ALL SELECT from_id AS other, created FROM dms WHERE to_id=?
    ) GROUP BY other ORDER BY last DESC LIMIT 50`),
  dmLast: db.prepare("SELECT from_id, body, created FROM dms WHERE (from_id=? AND to_id=?) OR (from_id=? AND to_id=?) ORDER BY created DESC LIMIT 1"),
  insertGroup: db.prepare("INSERT INTO groups (name, about, owner_id, created) VALUES (?,?,?,?)"),
  groupById: db.prepare("SELECT * FROM groups WHERE id=?"),
  allGroups: db.prepare("SELECT id, name, about, owner_id, created FROM groups ORDER BY created DESC LIMIT 100"),
  addMember: db.prepare("INSERT OR IGNORE INTO group_members (group_id, user_id, role, created) VALUES (?,?,?,?)"),
  removeMember: db.prepare("DELETE FROM group_members WHERE group_id=? AND user_id=?"),
  isMember: db.prepare("SELECT role FROM group_members WHERE group_id=? AND user_id=?"),
  groupMemberCount: db.prepare("SELECT COUNT(*) c FROM group_members WHERE group_id=?"),
  groupMembers: db.prepare("SELECT user_id AS id FROM group_members WHERE group_id=? ORDER BY created ASC LIMIT 100"),
  groupFeed: db.prepare("SELECT id, author_id, body, (photo IS NOT NULL) AS has_photo, created FROM posts WHERE group_id=? ORDER BY created DESC LIMIT 100"),
};

// Relationship of target user t as seen by me: none | friends | outgoing | incoming
function relationship(meId, t) {
  const e = q.edge.get(meId, t, t, meId);
  if (!e) return "none";
  if (e.status === "accepted") return "friends";
  return e.requester_id === meId ? "outgoing" : "incoming";
}
function friendIdSet(meId) {
  return new Set(q.friendIds.all(meId, meId).map((r) => r.id));
}

/* ----------------------------- Realtime (SSE) + notifications ----------------------------- */
const streams = new Map(); // userId -> Set<res>
function addStream(id, res) { if (!streams.has(id)) streams.set(id, new Set()); streams.get(id).add(res); }
function removeStream(id, res) { const s = streams.get(id); if (s) { s.delete(res); if (!s.size) streams.delete(id); } }
function pushEvent(id, event, data) {
  const s = streams.get(id); if (!s) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of s) { try { res.write(payload); } catch {} }
}
setInterval(() => { for (const s of streams.values()) for (const res of s) { try { res.write(":ping\n\n"); } catch {} } }, 25000).unref();

function notifView(row) {
  const p = q.profileById.get(row.actor_id) || {};
  return { id: row.id, type: row.type, actor: { id: row.actor_id, name: p.name, photo: !!p.photo }, postId: row.post_id, created: row.created, read: !!row.read };
}
// Create a notification for `userId` from `actorId` and push it live. No self-notify.
function notify(userId, type, actorId, postId = null) {
  if (userId === actorId) return;
  const id = q.insertNotif.run(userId, type, actorId, postId, Date.now()).lastInsertRowid;
  const row = q.notifsFor.all(userId).find((r) => r.id === id);
  if (row) pushEvent(userId, "notif", notifView(row));
}

function createSession(userId) { const t = newToken(); q.insertSession.run(t, userId, Date.now()); return t; }
function userFromReq(req) {
  const m = (req.headers.cookie || "").match(/(?:^|;\s*)nid=([a-f0-9]+)/);
  if (!m) return null;
  const s = q.sessionByToken.get(m[1]);
  return s ? q.userById.get(s.user_id) : null;
}
function author(userId) {
  const p = q.profileById.get(userId);
  return { id: userId, name: p ? p.name : "", photo: !!(p && p.photo) };
}

/* ----------------------------- HTTP helpers ----------------------------- */
function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > 6e6) req.destroy(); });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
  });
}
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
async function serveStatic(res, urlPath) {
  let rel = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  if (rel === "/" || rel === "") rel = "/index.html";
  const file = join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC)) return send(res, 403, { error: "forbidden" });
  try {
    const buf = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
    res.end(buf);
  } catch {
    try { const buf = await readFile(join(PUBLIC, "index.html")); res.writeHead(200, { "Content-Type": MIME[".html"] }); res.end(buf); }
    catch { send(res, 404, { error: "not found" }); }
  }
}
function decodeImage(dataUrl) {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
  if (!m) return null;
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 4_000_000) return null;
  return { buf, mime: m[1] };
}

/* ----------------------------- API ----------------------------- */
async function api(req, res, path) {
  const method = req.method;

  if (path === "/api/signup" && method === "POST") {
    const { email, password, name } = await readBody(req);
    if (!email || !password || password.length < 6) return send(res, 400, { error: "Enter an email and a password of at least 6 characters." });
    if (q.userByEmail.get(email.toLowerCase())) return send(res, 409, { error: "That email is already registered." });
    const uid = q.insertUser.run(email.toLowerCase(), hashPassword(password), Date.now()).lastInsertRowid;
    q.insertProfile.run(uid, name || "");
    return send(res, 200, { ok: true }, { "Set-Cookie": `nid=${createSession(uid)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000` });
  }
  if (path === "/api/login" && method === "POST") {
    const { email, password } = await readBody(req);
    const user = email ? q.userByEmail.get(email.toLowerCase()) : null;
    if (!user || !verifyPassword(password || "", user.pass_hash)) return send(res, 401, { error: "Email or password is incorrect." });
    return send(res, 200, { ok: true }, { "Set-Cookie": `nid=${createSession(user.id)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000` });
  }
  if (path === "/api/logout" && method === "POST") {
    const m = (req.headers.cookie || "").match(/(?:^|;\s*)nid=([a-f0-9]+)/);
    if (m) q.deleteSession.run(m[1]);
    return send(res, 200, { ok: true }, { "Set-Cookie": "nid=; HttpOnly; Path=/; Max-Age=0" });
  }

  // photos are public to signed-in users; check auth for everything else too
  const user = userFromReq(req);

  if (path.startsWith("/api/photo/user/") && method === "GET") {
    const row = q.getUserPhoto.get(Number(path.split("/").pop()));
    if (!row || !row.photo) return send(res, 404, { error: "none" });
    res.writeHead(200, { "Content-Type": row.photo_mime || "image/jpeg", "Cache-Control": "private, max-age=60" });
    return res.end(Buffer.from(row.photo));
  }
  if (path.startsWith("/api/photo/post/") && method === "GET") {
    const row = q.getPostPhoto.get(Number(path.split("/").pop()));
    if (!row || !row.photo) return send(res, 404, { error: "none" });
    res.writeHead(200, { "Content-Type": row.photo_mime || "image/jpeg", "Cache-Control": "private, max-age=300" });
    return res.end(Buffer.from(row.photo));
  }

  if (!user) return send(res, 401, { error: "Please sign in." });

  if (path === "/api/me" && method === "GET") {
    const p = q.profileById.get(user.id) || {};
    return send(res, 200, { user: { id: user.id, email: user.email }, profile: { name: p.name, bio: p.bio, photo: !!p.photo, support: { on: !!p.need_support, note: p.support_note || "" } } });
  }

  if (path === "/api/stream" && method === "GET") {
    res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.write("retry: 3000\n\n");
    addStream(user.id, res);
    req.on("close", () => removeStream(user.id, res));
    return;
  }
  if (path === "/api/notifications" && method === "GET") {
    return send(res, 200, { notifications: q.notifsFor.all(user.id).map(notifView), unread: q.unreadCount.get(user.id).c });
  }
  if (path === "/api/notifications/read" && method === "POST") {
    q.markRead.run(user.id);
    return send(res, 200, { ok: true });
  }
  if (path === "/api/profile" && method === "PUT") {
    const b = await readBody(req);
    if (!b.name) return send(res, 400, { error: "Name is required." });
    q.updateProfile.run(String(b.name).slice(0, 60), String(b.bio || "").slice(0, 300), user.id);
    const p = q.profileById.get(user.id);
    return send(res, 200, { ok: true, profile: { name: p.name, bio: p.bio, photo: !!p.photo } });
  }
  if (path === "/api/profile/photo" && method === "PUT") {
    const img = decodeImage((await readBody(req)).dataUrl);
    if (!img) return send(res, 400, { error: "Please choose a PNG, JPEG, or WebP image under 4MB." });
    q.setUserPhoto.run(img.buf, img.mime, user.id);
    return send(res, 200, { ok: true });
  }

  if (path === "/api/feed" && method === "GET") {
    // Feed = your posts + your friends' posts.
    const ids = [user.id, ...friendIdSet(user.id)];
    const placeholders = ids.map(() => "?").join(",");
    const rows = db.prepare(
      `SELECT id, author_id, body, (photo IS NOT NULL) AS has_photo, created
       FROM posts WHERE author_id IN (${placeholders}) AND group_id IS NULL ORDER BY created DESC LIMIT 100`
    ).all(...ids);
    const posts = rows.map((r) => ({
      id: r.id, author: author(r.author_id), body: r.body, photo: !!r.has_photo, created: r.created,
      likes: q.likeCount.get(r.id).c, liked: !!q.likedByMe.get(r.id, user.id), comments: q.commentCount.get(r.id).c,
    }));
    return send(res, 200, { posts });
  }
  if (path === "/api/posts" && method === "POST") {
    const b = await readBody(req);
    const body = String(b.body || "").trim().slice(0, 5000);
    const img = b.photo ? decodeImage(b.photo) : null;
    if (!body && !img) return send(res, 400, { error: "Write something or add a photo." });
    if (b.photo && !img) return send(res, 400, { error: "That image must be a PNG, JPEG, or WebP under 4MB." });
    let groupId = b.groupId ? Number(b.groupId) : null;
    if (groupId) {
      if (!q.groupById.get(groupId) || !q.isMember.get(groupId, user.id))
        return send(res, 403, { error: "You're not a member of that group." });
    }
    const id = q.insertPost.run(user.id, body, img ? img.buf : null, img ? img.mime : null, Date.now(), groupId).lastInsertRowid;
    return send(res, 200, { ok: true, id });
  }
  const likeM = path.match(/^\/api\/posts\/(\d+)\/like$/);
  if (likeM && method === "POST") {
    const pid = Number(likeM[1]);
    const post = q.postById.get(pid);
    if (!post) return send(res, 404, { error: "No such post." });
    if (q.likedByMe.get(pid, user.id)) q.deleteLike.run(pid, user.id);
    else { q.insertLike.run(pid, user.id, Date.now()); notify(post.author_id, "like", user.id, pid); }
    return send(res, 200, { ok: true, likes: q.likeCount.get(pid).c, liked: !!q.likedByMe.get(pid, user.id) });
  }
  const comM = path.match(/^\/api\/posts\/(\d+)\/comments$/);
  if (comM && method === "GET") {
    const rows = q.commentsFor.all(Number(comM[1]));
    return send(res, 200, { comments: rows.map((c) => ({ author: { id: c.user_id, name: c.name }, body: c.body, created: c.created })) });
  }
  if (comM && method === "POST") {
    const pid = Number(comM[1]);
    const post = q.postById.get(pid);
    if (!post) return send(res, 404, { error: "No such post." });
    const body = String((await readBody(req)).body || "").trim().slice(0, 2000);
    if (!body) return send(res, 400, { error: "Comment is empty." });
    q.insertComment.run(pid, user.id, body, Date.now());
    notify(post.author_id, "comment", user.id, pid);
    return send(res, 200, { ok: true, comments: q.commentCount.get(pid).c });
  }

  /* ---------- Friends ---------- */
  const person = (id) => {
    const p = q.profileById.get(id) || {};
    return { id, name: p.name, bio: p.bio, photo: !!p.photo, rel: relationship(user.id, id) };
  };

  if (path === "/api/people" && method === "GET") {
    const term = new URL(req.url, "http://x").searchParams.get("q");
    const rows = term && term.trim()
      ? q.searchPeople.all(user.id, "%" + term.trim().toLowerCase() + "%")
      : q.recentPeople.all(user.id);
    return send(res, 200, { people: rows.map((r) => person(r.id)) });
  }
  const userM = path.match(/^\/api\/users\/(\d+)$/);
  if (userM && method === "GET") {
    const id = Number(userM[1]);
    const p = q.profileById.get(id);
    if (!p) return send(res, 404, { error: "No such person." });
    const rel = relationship(user.id, id);
    const rows = db.prepare(
      `SELECT id, author_id, body, (photo IS NOT NULL) AS has_photo, created
       FROM posts WHERE author_id=? AND group_id IS NULL ORDER BY created DESC LIMIT 100`
    ).all(id);
    const posts = rows.map((r) => ({
      id: r.id, author: author(r.author_id), body: r.body, photo: !!r.has_photo, created: r.created,
      likes: q.likeCount.get(r.id).c, liked: !!q.likedByMe.get(r.id, user.id), comments: q.commentCount.get(r.id).c,
    }));
    const canSeeSupport = id === user.id || rel === "friends";
    return send(res, 200, {
      user: {
        id, name: p.name, bio: p.bio, photo: !!p.photo, rel, isMe: id === user.id,
        friendCount: q.friendIds.all(id, id).length, postCount: rows.length,
        support: canSeeSupport && p.need_support ? { on: true, note: p.support_note || "" } : { on: false },
      },
      posts,
    });
  }
  if (path === "/api/friends" && method === "GET") {
    const ids = [...friendIdSet(user.id)];
    return send(res, 200, { friends: ids.map(person) });
  }
  if (path === "/api/friends/requests" && method === "GET") {
    const rows = q.incomingRequests.all(user.id);
    return send(res, 200, { requests: rows.map((r) => person(r.id)) });
  }
  if (path === "/api/friends/request" && method === "POST") {
    const toId = Number((await readBody(req)).toId);
    if (!toId || toId === user.id || !q.profileById.get(toId)) return send(res, 400, { error: "Invalid person." });
    const rel = relationship(user.id, toId);
    if (rel === "friends") return send(res, 200, { ok: true, rel: "friends" });
    if (rel === "incoming") { q.acceptRequest.run(toId, user.id); notify(toId, "friend_accept", user.id); return send(res, 200, { ok: true, rel: "friends" }); }
    q.addRequest.run(user.id, toId, Date.now());
    notify(toId, "friend_request", user.id);
    return send(res, 200, { ok: true, rel: "outgoing" });
  }
  if (path === "/api/friends/accept" && method === "POST") {
    const fromId = Number((await readBody(req)).fromId);
    q.acceptRequest.run(fromId, user.id);
    notify(fromId, "friend_accept", user.id);
    return send(res, 200, { ok: true, rel: relationship(user.id, fromId) });
  }
  if (path === "/api/friends/remove" && method === "POST") {
    const other = Number((await readBody(req)).userId);
    q.removeEdge.run(user.id, other, other, user.id);
    return send(res, 200, { ok: true, rel: "none" });
  }

  /* ---------- Groups ---------- */
  const groupView = (g) => ({
    id: g.id, name: g.name, about: g.about, owner: g.owner_id,
    members: q.groupMemberCount.get(g.id).c,
    joined: !!q.isMember.get(g.id, user.id), mine: g.owner_id === user.id,
  });

  if (path === "/api/groups" && method === "GET") {
    return send(res, 200, { groups: q.allGroups.all().map(groupView) });
  }
  if (path === "/api/groups" && method === "POST") {
    const b = await readBody(req);
    const name = String(b.name || "").trim().slice(0, 60);
    if (!name) return send(res, 400, { error: "Give your group a name." });
    const about = String(b.about || "").trim().slice(0, 300);
    const gid = q.insertGroup.run(name, about, user.id, Date.now()).lastInsertRowid;
    q.addMember.run(gid, user.id, "owner", Date.now());
    return send(res, 200, { ok: true, id: gid });
  }
  const gM = path.match(/^\/api\/groups\/(\d+)$/);
  if (gM && method === "GET") {
    const g = q.groupById.get(Number(gM[1]));
    if (!g) return send(res, 404, { error: "No such group." });
    const view = groupView(g);
    view.memberList = q.groupMembers.all(g.id).map((r) => author(r.id));
    return send(res, 200, { group: view });
  }
  const joinM = path.match(/^\/api\/groups\/(\d+)\/join$/);
  if (joinM && method === "POST") {
    const gid = Number(joinM[1]);
    if (!q.groupById.get(gid)) return send(res, 404, { error: "No such group." });
    q.addMember.run(gid, user.id, "member", Date.now());
    return send(res, 200, { ok: true, joined: true });
  }
  const leaveM = path.match(/^\/api\/groups\/(\d+)\/leave$/);
  if (leaveM && method === "POST") {
    const gid = Number(leaveM[1]);
    const g = q.groupById.get(gid);
    if (!g) return send(res, 404, { error: "No such group." });
    if (g.owner_id === user.id) return send(res, 400, { error: "As the owner, you can't leave your own group." });
    q.removeMember.run(gid, user.id);
    return send(res, 200, { ok: true, joined: false });
  }
  const gfM = path.match(/^\/api\/groups\/(\d+)\/feed$/);
  if (gfM && method === "GET") {
    const gid = Number(gfM[1]);
    const g = q.groupById.get(gid);
    if (!g) return send(res, 404, { error: "No such group." });
    if (!q.isMember.get(gid, user.id)) return send(res, 403, { error: "Join the group to see its posts." });
    const posts = q.groupFeed.all(gid).map((r) => ({
      id: r.id, author: author(r.author_id), body: r.body, photo: !!r.has_photo, created: r.created,
      likes: q.likeCount.get(r.id).c, liked: !!q.likedByMe.get(r.id, user.id), comments: q.commentCount.get(r.id).c,
    }));
    return send(res, 200, { posts });
  }

  /* ---------- Care signal ("reach out / check in") ---------- */
  if (path === "/api/support" && method === "PUT") {
    const b = await readBody(req);
    const on = !!b.on;
    q.setSupport.run(on ? 1 : 0, on ? String(b.note || "").slice(0, 200) : "", on ? Date.now() : null, user.id);
    return send(res, 200, { ok: true, support: { on, note: on ? String(b.note || "").slice(0, 200) : "" } });
  }
  if (path === "/api/support/circle" && method === "GET") {
    // Friends who've raised a care signal — the people to check in on.
    const circle = [...friendIdSet(user.id)]
      .map((id) => ({ id, p: q.profileById.get(id) }))
      .filter((x) => x.p && x.p.need_support)
      .map((x) => ({ id: x.id, name: x.p.name, photo: !!x.p.photo, note: x.p.support_note || "", since: x.p.support_since }));
    return send(res, 200, { circle });
  }
  if (path === "/api/support/reach" && method === "POST") {
    const other = Number((await readBody(req)).userId);
    if (!other || relationship(user.id, other) !== "friends") return send(res, 403, { error: "You can only reach out to friends." });
    notify(other, "reach_out", user.id);
    return send(res, 200, { ok: true });
  }

  /* ---------- Direct messages ---------- */
  if (path === "/api/dm/threads" && method === "GET") {
    const threads = q.dmPartners.all(user.id, user.id).map((row) => {
      const last = q.dmLast.get(user.id, row.other, row.other, user.id);
      return {
        with: author(row.other),
        last: last ? { body: last.body, mine: last.from_id === user.id, created: last.created } : null,
        unread: q.dmUnreadFrom.get(user.id, row.other).c,
      };
    });
    return send(res, 200, { threads });
  }
  if (path === "/api/dm/unread" && method === "GET") {
    return send(res, 200, { unread: q.dmUnreadTotal.get(user.id).c });
  }
  if (path === "/api/dm" && method === "GET") {
    const other = Number(new URL(req.url, "http://x").searchParams.get("with"));
    if (!other || !q.profileById.get(other)) return send(res, 404, { error: "No such person." });
    q.dmMarkRead.run(user.id, other);
    const messages = q.dmThread.all(user.id, other, other, user.id).map((m) => ({ mine: m.from_id === user.id, body: m.body, created: m.created }));
    return send(res, 200, { with: author(other), messages });
  }
  if (path === "/api/dm" && method === "POST") {
    const b = await readBody(req);
    const toId = Number(b.toId);
    if (!toId || relationship(user.id, toId) !== "friends") return send(res, 403, { error: "You can only message friends." });
    const body = String(b.body || "").trim().slice(0, 4000);
    if (!body) return send(res, 400, { error: "Message is empty." });
    q.insertDm.run(user.id, toId, body, Date.now());
    pushEvent(toId, "dm", { from: author(user.id), body, created: Date.now() });
    return send(res, 200, { ok: true });
  }

  return send(res, 404, { error: "Unknown endpoint." });
}

const server = createServer(async (req, res) => {
  try {
    const path = req.url.split("?")[0];
    if (path.startsWith("/api/")) return await api(req, res, path);
    return await serveStatic(res, path);
  } catch { send(res, 500, { error: "Server error." }); }
});
// First run: seed the founder profile so a freshly deployed site isn't empty.
// Idempotent — seed.mjs is a no-op once the account exists.
try {
  const empty = db.prepare("SELECT COUNT(*) AS n FROM users").get().n === 0;
  if (empty) {
    const { execFileSync } = await import("node:child_process");
    execFileSync(process.execPath, [join(__dirname, "seed.mjs")], { stdio: "inherit", env: process.env });
  }
} catch (e) { console.error("Seed-on-boot skipped:", e.message); }

server.listen(PORT, () => console.log(`Nest running on http://localhost:${PORT}  (db: ${DB_PATH})`));
