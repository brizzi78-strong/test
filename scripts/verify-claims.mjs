#!/usr/bin/env node
/**
 * Claims verifier: proves that every security claim in verification/claims.json
 * is backed by executable evidence, and that the evidence currently passes.
 *
 * Evidence types:
 *   - abi-absent        No function in the compiled ABI matches any of the
 *                       given name patterns (case-insensitive substring).
 *                       Structural proof that a capability does not exist.
 *   - abi-write-surface The complete set of state-changing (non-view/pure)
 *                       functions in the ABI is exactly the allowed list.
 *                       Anything added to the contract's write surface breaks
 *                       this until the claim is consciously re-reviewed.
 *   - solidity-test     The named Foundry-style test exists in the given file
 *                       and passed in this run.
 *   - invariant         Same as solidity-test; named separately so the report
 *                       distinguishes stateful-fuzz evidence from example tests.
 *   - node-test         The node:test case with the given title exists in the
 *                       given file and passed in this run.
 *
 * Exit code is nonzero if any claim has missing, stale, or failing evidence.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const claimsPath = path.join(root, "verification", "claims.json");
const { artifact: artifactRel, claims } = JSON.parse(readFileSync(claimsPath, "utf8"));

const GREEN = "\x1b[32m", RED = "\x1b[31m", DIM = "\x1b[2m", BOLD = "\x1b[1m", RESET = "\x1b[0m";
const ok = (s) => `${GREEN}✔${RESET} ${s}`;
const bad = (s) => `${RED}✘ ${s}${RESET}`;

function run(cmd, args) {
  const res = spawnSync(cmd, args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { status: res.status ?? 1, output: (res.stdout ?? "") + (res.stderr ?? "") };
}

// --- 1. Fresh build, then load the compiled ABI ---------------------------
console.log(`${DIM}Building contracts...${RESET}`);
const build = run("npx", ["hardhat", "build"]);
if (build.status !== 0) {
  console.error(build.output);
  console.error(bad("build failed — cannot verify claims against stale artifacts"));
  process.exit(1);
}

const artifactPath = path.join(root, artifactRel);
if (!existsSync(artifactPath)) {
  console.error(bad(`artifact not found: ${artifactRel}`));
  process.exit(1);
}
const abi = JSON.parse(readFileSync(artifactPath, "utf8")).abi;
const abiFunctions = abi.filter((e) => e.type === "function");

// --- 2. Run the full test suite once, capture per-test results ------------
console.log(`${DIM}Running test suite...${RESET}`);
const tests = run("npx", ["hardhat", "test"]);
const suiteGreen = tests.status === 0;
const testOutput = tests.output;

// --- 3. Evidence checkers -------------------------------------------------
function checkAbiAbsent({ patterns }) {
  const hits = abiFunctions.filter((f) =>
    patterns.some((p) => f.name.toLowerCase().includes(p.toLowerCase()))
  );
  return hits.length === 0
    ? { pass: true, detail: `no ABI function matches [${patterns.join(", ")}]` }
    : { pass: false, detail: `forbidden function(s) in ABI: ${hits.map((f) => f.name).join(", ")}` };
}

function checkAbiWriteSurface({ allowed }) {
  const writes = abiFunctions
    .filter((f) => f.stateMutability !== "view" && f.stateMutability !== "pure")
    .map((f) => f.name)
    .sort();
  const expected = [...allowed].sort();
  const extra = writes.filter((n) => !expected.includes(n));
  const missing = expected.filter((n) => !writes.includes(n));
  if (extra.length === 0 && missing.length === 0) {
    return { pass: true, detail: `write surface is exactly [${expected.join(", ")}]` };
  }
  const parts = [];
  if (extra.length) parts.push(`unexpected: ${extra.join(", ")}`);
  if (missing.length) parts.push(`missing: ${missing.join(", ")}`);
  return { pass: false, detail: `write surface drifted — ${parts.join("; ")}` };
}

function checkSolidityTest({ file, name }) {
  const filePath = path.join(root, file);
  if (!existsSync(filePath)) return { pass: false, detail: `file not found: ${file}` };
  const src = readFileSync(filePath, "utf8");
  if (!new RegExp(`function\\s+${name}\\s*\\(`).test(src)) {
    return { pass: false, detail: `test ${name} not defined in ${file}` };
  }
  // Solidity runner reports "✔ name(" (with arg types for fuzz/invariant runs).
  if (!testOutput.includes(`✔ ${name}(`)) {
    return { pass: false, detail: `${name} did not pass in this run` };
  }
  return { pass: true, detail: `${name} passed (${file})` };
}

function checkNodeTest({ file, title }) {
  const filePath = path.join(root, file);
  if (!existsSync(filePath)) return { pass: false, detail: `file not found: ${file}` };
  const src = readFileSync(filePath, "utf8");
  if (!src.includes(`"${title}"`) && !src.includes(`'${title}'`)) {
    return { pass: false, detail: `test "${title}" not defined in ${file}` };
  }
  if (!testOutput.includes(`✔ ${title}`)) {
    return { pass: false, detail: `"${title}" did not pass in this run` };
  }
  return { pass: true, detail: `"${title}" passed (${file})` };
}

const checkers = {
  "abi-absent": checkAbiAbsent,
  "abi-write-surface": checkAbiWriteSurface,
  "solidity-test": checkSolidityTest,
  "invariant": checkSolidityTest,
  "node-test": checkNodeTest,
};

// --- 4. Verify every claim, print the ledger ------------------------------
console.log(`\n${BOLD}Claim verification ledger${RESET} ${DIM}(${claimsPath.replace(root + "/", "")})${RESET}\n`);

let failures = 0;
for (const claim of claims) {
  const results = claim.evidence.map((ev) => {
    const checker = checkers[ev.type];
    const res = checker ? checker(ev) : { pass: false, detail: `unknown evidence type: ${ev.type}` };
    return { ev, ...res };
  });
  const pass = results.every((r) => r.pass);
  if (!pass) failures++;

  console.log(`${pass ? ok(BOLD + claim.id + RESET) : bad(claim.id)}  ${DIM}${claim.source}${RESET}`);
  console.log(`  ${DIM}"${claim.statement}"${RESET}`);
  for (const r of results) {
    console.log(`    ${r.pass ? ok(`[${r.ev.type}] ${r.detail}`) : bad(`[${r.ev.type}] ${r.detail}`)}`);
  }
  console.log();
}

if (!suiteGreen) {
  failures++;
  console.log(bad("test suite exited nonzero — evidence above may be incomplete"));
  console.log(DIM + testOutput.split("\n").slice(-30).join("\n") + RESET);
}

const total = claims.length;
if (failures === 0) {
  console.log(ok(`${BOLD}${total}/${total} claims verified${RESET} — every launch claim is backed by passing, executable evidence`));
} else {
  console.log(bad(`${failures} claim(s) NOT verified — do not ship, and do not repeat these claims in launch material`));
  process.exit(1);
}
