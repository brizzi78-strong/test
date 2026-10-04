// Seed Nest with the founder's profile so it's always there on a fresh database.
// Idempotent: does nothing if the account already exists.
//   node social/seed.mjs
// Optional env: NEST_DB, SEED_EMAIL, SEED_PASSWORD, SEED_NAME.

import { DatabaseSync } from "node:sqlite";
import { scryptSync, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.NEST_DB || join(__dirname, "nest.db");
const EMAIL = (process.env.SEED_EMAIL || "rob@thecardinal.com").toLowerCase();
const PASSWORD = process.env.SEED_PASSWORD || "cardinal1";
const NAME = process.env.SEED_NAME || "Rob Brizzi";
const BIO = "Founder & Owner of The Cardinal. I believe technology should bring people together — safely.";

function hashPassword(password) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
}

const db = new DatabaseSync(DB_PATH);
// Make sure the schema exists (harmless if the server already created it).
db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, pass_hash TEXT NOT NULL, created INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS profiles (user_id INTEGER PRIMARY KEY, name TEXT NOT NULL DEFAULT '', bio TEXT DEFAULT '', photo BLOB, photo_mime TEXT);
  CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, author_id INTEGER NOT NULL, body TEXT DEFAULT '', photo BLOB, photo_mime TEXT, created INTEGER NOT NULL);
`);

const existing = db.prepare("SELECT id FROM users WHERE email=?").get(EMAIL);
if (existing) {
  console.log(`Seed skipped — ${EMAIL} already exists (user #${existing.id}).`);
  process.exit(0);
}

const now = Date.now();
const uid = db.prepare("INSERT INTO users (email, pass_hash, created) VALUES (?,?,?)").run(EMAIL, hashPassword(PASSWORD), now).lastInsertRowid;
const photo = readFileSync(join(__dirname, "assets", "rob.jpg"));
db.prepare("INSERT INTO profiles (user_id, name, bio, photo, photo_mime) VALUES (?,?,?,?,?)").run(uid, NAME, BIO, photo, "image/jpeg");
db.prepare("INSERT INTO posts (author_id, body, created) VALUES (?,?,?)").run(uid, "Welcome to The Cardinal. Building a place where your people are — and where you actually feel at home. More soon.", now);

console.log(`Seeded ${NAME} <${EMAIL}> as user #${uid}.  Log in with password: ${PASSWORD}`);
