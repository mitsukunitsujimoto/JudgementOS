import fs from "fs";

const [src, dest] = process.argv.slice(2);
if (!src || !dest) {
  console.error("Usage: node copy-pdf-send.mjs <src> <dest>");
  process.exit(1);
}

fs.copyFileSync(src, dest);
const header = fs.readFileSync(dest).slice(0, 4).toString();
if (header !== "%PDF") {
  console.error("Invalid PDF:", dest);
  process.exit(1);
}
console.log("OK:", dest);
