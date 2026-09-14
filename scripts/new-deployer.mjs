// Generates the mainnet deployer wallet on this machine and puts the private
// key straight onto the clipboard — it is never printed, so it never lands in
// terminal scrollback, a screenshot, or a chat window. Only the public address
// is displayed.
//
//   node scripts/new-deployer.mjs
//   npx hardhat keystore set MAINNET_PRIVATE_KEY     # then paste (Cmd+V)
//
// Then put the printed address in launch.json as "deployer", and send that
// address a little ETH for gas. Clear the clipboard afterwards by copying
// anything else.
//
// Why this exists rather than exporting a key out of a phone wallet: a key
// that is generated here and pasted once into the keystore has never been
// displayed, transmitted, or stored anywhere else. The trade-off is that this
// machine is now the only place it exists — see the backup note printed below.

import { spawnSync } from "node:child_process";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

// macOS pbcopy, X11 xclip, Wayland wl-copy — whichever the machine has.
const CLIPBOARD_COMMANDS = [
  ["pbcopy", []],
  ["wl-copy", []],
  ["xclip", ["-selection", "clipboard"]],
  ["xsel", ["--clipboard", "--input"]],
];

function copyToClipboard(text) {
  for (const [command, args] of CLIPBOARD_COMMANDS) {
    const result = spawnSync(command, args, { input: text });
    if (!result.error && result.status === 0) return command;
  }
  return null;
}

const privateKey = generatePrivateKey();
const { address } = privateKeyToAccount(privateKey);
const clipboardCommand = copyToClipboard(privateKey);

console.log("");
console.log("Deployer wallet created on this machine.");
console.log("");
console.log(`  address: ${address}`);
console.log("");

if (clipboardCommand === null) {
  console.error("✘ Could not reach the clipboard on this machine.");
  console.error("");
  console.error(
    "  The private key was NOT printed and is now gone. Nothing was saved,",
  );
  console.error("  so no wallet was lost — just run this script again on a");
  console.error("  machine with a clipboard, or use a hardware wallet.");
  process.exitCode = 1;
} else {
  console.log("The private key is on your clipboard. It was never printed.");
  console.log("");
  console.log("Next, in this same terminal:");
  console.log("");
  console.log("  npx hardhat keystore set MAINNET_PRIVATE_KEY");
  console.log("");
  console.log(
    "Paste with Cmd+V (or Ctrl+V) when it asks for the value. The screen stays",
  );
  console.log("blank while you paste — that is the prompt hiding it, not a");
  console.log("failure. Press Enter.");
  console.log("");
  console.log("Then, in order:");
  console.log(
    "  1. Copy anything else (a word in a document) to clear the clipboard.",
  );
  console.log(`  2. Put ${address} in launch.json as "deployer".`);
  console.log("  3. Send that address a little ETH for gas — roughly $30.");
  console.log("");
  console.log(
    "⚠️  This keystore is now the only copy of that key. If this machine is",
  );
  console.log(
    "    lost, so is the wallet and everything in it. Before the wallet holds",
  );
  console.log(
    "    anything you care about, import the key into a phone wallet as a",
  );
  console.log("    second copy, or move the holding to a hardware wallet.");
}
console.log("");
