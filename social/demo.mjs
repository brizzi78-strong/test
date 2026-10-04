// Populate The Cardinal with a small, living demo community so a fresh install
// feels alive: real-feeling people, friendships, posts with likes and comments,
// a group with its own thread, and one care signal raised.
//
//   node social/demo.mjs
//
// Idempotent: if the demo community already exists it does nothing. Every demo
// account uses the password "cardinal1". Optional env: NEST_DB.
//
// The people here are fictional sample data — a demo, not real members.

import { DatabaseSync } from "node:sqlite";
import { scryptSync, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.NEST_DB || join(__dirname, "nest.db");
const PASSWORD = "cardinal1";

const db = new DatabaseSync(DB_PATH);

// Ensure the full schema exists (harmless if the server already created it).
db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, pass_hash TEXT NOT NULL, created INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS profiles (user_id INTEGER PRIMARY KEY, name TEXT NOT NULL DEFAULT '', bio TEXT DEFAULT '', photo BLOB, photo_mime TEXT);
  CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, author_id INTEGER NOT NULL, body TEXT DEFAULT '', photo BLOB, photo_mime TEXT, created INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS likes (post_id INTEGER NOT NULL, user_id INTEGER NOT NULL, created INTEGER NOT NULL, PRIMARY KEY (post_id, user_id));
  CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL, user_id INTEGER NOT NULL, body TEXT NOT NULL, created INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS friendships (requester_id INTEGER NOT NULL, addressee_id INTEGER NOT NULL, status TEXT NOT NULL, created INTEGER NOT NULL, PRIMARY KEY (requester_id, addressee_id));
  CREATE TABLE IF NOT EXISTS dms (id INTEGER PRIMARY KEY AUTOINCREMENT, from_id INTEGER NOT NULL, to_id INTEGER NOT NULL, body TEXT NOT NULL, created INTEGER NOT NULL, read INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS groups (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, about TEXT DEFAULT '', owner_id INTEGER NOT NULL, created INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS group_members (group_id INTEGER NOT NULL, user_id INTEGER NOT NULL, role TEXT NOT NULL DEFAULT 'member', created INTEGER NOT NULL, PRIMARY KEY (group_id, user_id));
`);
// Defensive migrations (in case the server hasn't added these yet).
const ensure = (table, col, ddl) => {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(col)) { try { db.exec(ddl); } catch {} }
};
ensure("profiles", "need_support", "ALTER TABLE profiles ADD COLUMN need_support INTEGER NOT NULL DEFAULT 0");
ensure("profiles", "support_note", "ALTER TABLE profiles ADD COLUMN support_note TEXT DEFAULT ''");
ensure("profiles", "support_since", "ALTER TABLE profiles ADD COLUMN support_since INTEGER");
ensure("posts", "group_id", "ALTER TABLE posts ADD COLUMN group_id INTEGER");

const SENTINEL = "maya@demo.thecardinal.com";
if (db.prepare("SELECT 1 FROM users WHERE email=?").get(SENTINEL)) {
  console.log("Demo community already present — nothing to do.");
  process.exit(0);
}

const hash = (p) => { const s = randomBytes(16); return `${s.toString("hex")}:${scryptSync(p, s, 64).toString("hex")}`; };
const now = Date.now();
const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;

// Find an existing user by email, or create the account + profile. Returns the id.
function upsertPerson(email, name, bio, photoFile) {
  email = email.toLowerCase();
  const found = db.prepare("SELECT id FROM users WHERE email=?").get(email);
  if (found) return found.id;
  const id = db.prepare("INSERT INTO users (email, pass_hash, created) VALUES (?,?,?)").run(email, hash(PASSWORD), now).lastInsertRowid;
  let photo = null;
  if (photoFile) { try { photo = readFileSync(join(__dirname, "assets", photoFile)); } catch {} }
  db.prepare("INSERT INTO profiles (user_id, name, bio, photo, photo_mime) VALUES (?,?,?,?,?)")
    .run(id, name, bio, photo, photo ? "image/jpeg" : null);
  return id;
}
function befriend(a, b) {
  db.prepare("INSERT OR IGNORE INTO friendships (requester_id, addressee_id, status, created) VALUES (?,?,'accepted',?)").run(a, b, now - DAY);
}
function post(authorId, body, ago, groupId = null) {
  return db.prepare("INSERT INTO posts (author_id, body, created, group_id) VALUES (?,?,?,?)").run(authorId, body, now - ago, groupId).lastInsertRowid;
}
const like = (postId, userId) => db.prepare("INSERT OR IGNORE INTO likes (post_id, user_id, created) VALUES (?,?,?)").run(postId, userId, now);
const comment = (postId, userId, body, ago) => db.prepare("INSERT INTO comments (post_id, user_id, body, created) VALUES (?,?,?,?)").run(postId, userId, body, now - ago);

// --- People ------------------------------------------------------------------
const rob = upsertPerson("rob@thecardinal.com", "Rob Brizzi", "Founder & Owner of The Cardinal. I believe technology should bring people together — safely.", "rob.jpg");
const maya = upsertPerson(SENTINEL, "Maya Chen", "Potter, plant over-waterer, decent at trivia.");
const james = upsertPerson("james@demo.thecardinal.com", "James Okafor", "Dad of two. Runs on coffee and long trail miles.");
const sofia = upsertPerson("sofia@demo.thecardinal.com", "Sofia Ramirez", "Nurse. Collector of other people's dogs.");
const ava = upsertPerson("ava@demo.thecardinal.com", "Ava Stone", "New in town, still learning the bus routes.");
const daniel = upsertPerson("daniel@demo.thecardinal.com", "Daniel Kim", "Jazz on vinyl, tacos on Tuesdays.");

// --- Friendships (a real little web) -----------------------------------------
[[rob, maya], [rob, james], [rob, sofia], [rob, ava], [rob, daniel],
 [maya, james], [maya, sofia], [james, daniel], [sofia, ava]].forEach(([a, b]) => befriend(a, b));

// --- Posts, with a little life around them -----------------------------------
const p1 = post(maya, "Pulled a whole set of mugs out of the kiln this morning and only cracked one. Growth. ☕", 3 * HOUR);
like(p1, rob); like(p1, sofia); like(p1, james);
comment(p1, sofia, "I call dibs on the blue one.", 2 * HOUR);
comment(p1, maya, "It has your name on it already 💙", 90 * MIN);

const p2 = post(james, "5am trail run done. The fog sitting on the ridge was worth every yawn.", 6 * HOUR);
like(p2, rob); like(p2, daniel);
comment(p2, daniel, "Next time text me, I'll suffer with you.", 5 * HOUR);

const p3 = post(sofia, "Long shift, but a patient's grandkid drew me a picture. Keeping it on my fridge forever.", 9 * HOUR);
like(p3, rob); like(p3, maya); like(p3, ava); like(p3, james);

const p4 = post(daniel, "Found a first-press Mingus at the flea market for three dollars. Sunday sorted.", 22 * HOUR);
like(p4, james);
comment(p4, james, "Criminal. Bring it over.", 20 * HOUR);

const p5 = post(ava, "Officially unpacked the last box. This city is starting to feel like mine.", 26 * HOUR);
like(p5, rob); like(p5, sofia);
comment(p5, sofia, "It gets better every week. Coffee soon?", 25 * HOUR);

const p6 = post(rob, "Coffee with three of you this week. This is exactly what I hoped The Cardinal would feel like.", 1 * HOUR);
like(p6, maya); like(p6, sofia); like(p6, ava); like(p6, daniel); like(p6, james);

// --- A care signal (the signature feature) -----------------------------------
db.prepare("UPDATE profiles SET need_support=1, support_note=?, support_since=? WHERE user_id=?")
  .run("New city, haven't met many people yet — today got a little lonely.", now - 4 * HOUR, ava);

// --- A group with its own thread ---------------------------------------------
const gid = db.prepare("INSERT INTO groups (name, about, owner_id, created) VALUES (?,?,?,?)")
  .run("Blue Ridge Hikers", "Trails, trilliums, and cardinals in the pines. All paces welcome.", james, now - 2 * DAY).lastInsertRowid;
[[james, "owner"], [rob, "member"], [maya, "member"], [daniel, "member"]].forEach(([uid, role]) =>
  db.prepare("INSERT OR IGNORE INTO group_members (group_id, user_id, role, created) VALUES (?,?,?,?)").run(gid, uid, role, now - 2 * DAY));
post(james, "Humpback Rocks this Saturday, 6am at the overlook lot. Who's in?", 5 * HOUR, gid);
post(maya, "In! I'll bring coffee for the summit. ☕", 4 * HOUR, gid);

// --- One warm DM -------------------------------------------------------------
db.prepare("INSERT INTO dms (from_id, to_id, body, created) VALUES (?,?,?,?)")
  .run(maya, rob, "Thank you for building this. It already feels different from everywhere else.", now - 30 * MIN);

console.log("Demo community seeded:");
console.log("  6 people, 9 friendships, 6 posts (with likes & comments),");
console.log("  1 care signal, 1 group (Blue Ridge Hikers) with a thread, 1 message.");
console.log("  Log in as anyone — password for all demo accounts: " + PASSWORD);
console.log("    rob@thecardinal.com · maya@demo.thecardinal.com · james@demo.thecardinal.com");
console.log("    sofia@demo.thecardinal.com · ava@demo.thecardinal.com · daniel@demo.thecardinal.com");
