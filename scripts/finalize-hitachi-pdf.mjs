import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const output = path.join(root, "output");

const mainPdf = path.join(output, "hitachi-kokubunji-pre-distribute-2026-06-11.pdf");
const sendCopies = [
  path.join(output, "6月11日_ディスカッション事前共有.pdf"),
  path.join(output, "2026-06-11_事前共有.pdf"),
];

if (!fs.existsSync(mainPdf)) {
  console.error("Main PDF not found:", mainPdf);
  process.exit(1);
}

const data = fs.readFileSync(mainPdf);
if (data.slice(0, 4).toString() !== "%PDF") {
  console.error("Invalid PDF:", mainPdf);
  process.exit(1);
}

for (const dest of sendCopies) {
  fs.copyFileSync(mainPdf, dest);
  console.log("OK:", dest);
}
