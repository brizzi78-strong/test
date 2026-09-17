// Cardinal — verification admin.
//
// This is the seam where the background-check decision is applied. In production,
// the operator's own background-check company returns a PASS/FAIL for an applicant,
// and that result drives `verify` / `reject` here (via this CLI, a webhook, or an
// internal dashboard). Nothing is auto-approved: a human or the check must decide.
//
// Usage:
//   node app/admin.mjs list                 # show applicants and their status
//   node app/admin.mjs verify <email>       # mark an applicant verified (check passed)
//   node app/admin.mjs reject <email>       # mark an applicant rejected (check failed)

import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.CARDINAL_DB || join(__dirname, "cardinal.db");
const db = new DatabaseSync(DB_PATH);

const [cmd, email] = process.argv.slice(2);

function list() {
  const rows = db.prepare(
    "SELECT id, email, verif, legal_name, dob, consent_at FROM users ORDER BY id"
  ).all();
  if (!rows.length) return console.log("No accounts yet.");
  for (const r of rows) {
    const consent = r.consent_at ? new Date(r.consent_at).toISOString().slice(0, 10) : "—";
    console.log(
      `#${r.id}  ${r.email.padEnd(28)}  ${String(r.verif).padEnd(11)}  ` +
      `${(r.legal_name || "—").padEnd(20)}  dob:${r.dob || "—"}  consent:${consent}`
    );
  }
}

function setStatus(status) {
  if (!email) return console.error(`Usage: node app/admin.mjs ${cmd} <email>`);
  const u = db.prepare("SELECT id, verif FROM users WHERE email = ?").get(email.toLowerCase());
  if (!u) return console.error(`No account with email: ${email}`);
  db.prepare("UPDATE users SET verif = ? WHERE id = ?").run(status, u.id);
  console.log(`${email} → ${status}`);
}

switch (cmd) {
  case "list": list(); break;
  case "verify": setStatus("verified"); break;
  case "reject": setStatus("rejected"); break;
  default:
    console.log("Commands: list | verify <email> | reject <email>");
}
