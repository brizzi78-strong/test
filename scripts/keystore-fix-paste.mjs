// Works around a paste bug in the interactive `hardhat keystore set` prompt:
// on some terminals, pasting a long value into its masked "Enter secret"
// prompt silently truncates to a handful of characters instead of the full
// value. This script writes the same MAINNET_PRIVATE_KEY value straight into
// the keystore file, reading it from your clipboard directly (via `pbpaste`)
// instead of through that prompt — so nothing is lost in a paste.
//
// It touches the exact same file `npx hardhat keystore path` points at, using
// Hardhat's own keystore file format and encryption, so every other
// `hardhat keystore` command keeps working normally afterward.
//
//   pbpaste | node scripts/keystore-fix-paste.mjs MAINNET_PRIVATE_KEY
//
// Reads the value from stdin (so it never touches this script's argument
// list or process list) and asks for your keystore password normally.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const key = process.argv[2];
if (!key) {
  console.error("Usage: pbpaste | node scripts/keystore-fix-paste.mjs <KEY_NAME>");
  process.exit(1);
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data.replace(/\r?\n+$/, "")));
    process.stdin.on("error", reject);
  });
}

const value = await readStdin();
if (!value) {
  console.error("Nothing came in on stdin — did you forget to pipe `pbpaste |` in front?");
  process.exit(1);
}

// A real private key is 32 bytes of hex, 0x-prefixed. Catching a bad
// clipboard value here beats saving it and finding out later.
if (key === "MAINNET_PRIVATE_KEY" && !/^0x[0-9a-fA-F]{64}$/.test(value)) {
  console.error(
    `That doesn't look like a private key (got ${value.length} characters, expected 66 starting with 0x).`,
  );
  console.error("Copy the key again (run node scripts/new-deployer.mjs, or re-copy from wherever it's saved) and try again.");
  process.exit(1);
}

// macOS's global config dir for Hardhat, matching `npx hardhat keystore path`.
const keystoreFilePath = path.join(
  os.homedir(),
  "Library",
  "Preferences",
  "hardhat-nodejs",
  "keystore.json",
);

if (!existsSync(keystoreFilePath)) {
  console.error(`No keystore file found at ${keystoreFilePath}`);
  console.error('Run `npx hardhat keystore set MAINNET_RPC_URL` first to create one.');
  process.exit(1);
}

const encryptionModuleUrl = new URL(
  "../node_modules/@nomicfoundation/hardhat-keystore/dist/src/internal/keystores/encryption.js",
  import.meta.url,
);
const { addSecretToKeystore, deriveMasterKeyFromKeystore, validateHmac } =
  await import(encryptionModuleUrl);

// stdin is already consumed for the pasted value above, so the password has
// to be read from the controlling terminal directly instead. Print the
// prompt ourselves first — `execSync` below captures the subshell's own
// stdout instead of showing it live, so a prompt printed only inside that
// subshell would never actually appear on screen.
process.stdout.write("Type your keystore password, then press Enter (nothing will show as you type): ");
const { execSync } = await import("node:child_process");
const password = execSync(
  `stty -f /dev/tty -echo; read -r pw < /dev/tty; stty -f /dev/tty echo; echo "$pw"`,
  { shell: "/bin/bash" },
)
  .toString()
  .trim();
process.stdout.write("\n");

const encryptedKeystore = JSON.parse(readFileSync(keystoreFilePath, "utf8"));

let masterKey;
try {
  masterKey = deriveMasterKeyFromKeystore({ password, encryptedKeystore });
  validateHmac({ masterKey, encryptedKeystore });
} catch (error) {
  console.error("Wrong password, or the keystore file is corrupted:", error.message);
  process.exit(1);
}

const updated = addSecretToKeystore({ masterKey, encryptedKeystore, key, value });
writeFileSync(keystoreFilePath, JSON.stringify(updated, null, 2));

console.log(`✔ ${key} saved (${value.length} characters) — the paste bug is bypassed.`);
