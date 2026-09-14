import fs from "fs";
const { PDFDocument, PDFName, PDFDict } = await import("/tmp/claude-0/-home-user-test/f033ae22-6343-5f45-bb02-1ac0346c5634/scratchpad/node_modules/pdf-lib/cjs/index.js");
for (const f of process.argv.slice(2)) {
  const doc = await PDFDocument.load(fs.readFileSync(f), { updateMetadata: false, ignoreEncryption: true });
  const names = new Map();
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFDict && obj.get(PDFName.of("BaseFont"))) {
      const bf = obj.get(PDFName.of("BaseFont")).toString();
      let fd = obj.get(PDFName.of("FontDescriptor"));
      const desc = obj.get(PDFName.of("DescendantFonts"));
      if (!fd && desc) { const d0 = doc.context.lookup(doc.context.lookup(desc).get(0)); fd = d0 && d0.get(PDFName.of("FontDescriptor")); }
      fd = fd && doc.context.lookup(fd);
      const emb = fd && ["FontFile","FontFile2","FontFile3"].some(k => fd.get(PDFName.of(k)));
      names.set(bf, emb ? "embedded" : "NOT EMBEDDED");
    }
  }
  console.log(f.split("/").pop(), [...names].map(([k,v]) => `${k} ${v}`).join(" | "));
}
