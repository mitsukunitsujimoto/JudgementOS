import fs from "fs";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const [file] = process.argv.slice(2);
if (!file) {
  console.error("Usage: node stamp-page-numbers.mjs <pdf>");
  process.exit(1);
}

const bytes = fs.readFileSync(file);
const doc = await PDFDocument.load(bytes);
const font = await doc.embedFont(StandardFonts.Helvetica);
const pages = doc.getPages();
const color = rgb(0.39, 0.45, 0.55);

for (let i = 0; i < pages.length; i++) {
  const page = pages[i];
  const { width } = page.getSize();
  const text = `${i + 1}/${pages.length}`;
  const size = 9;
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (width - textWidth) / 2,
    y: 24,
    size,
    font,
    color,
  });
}

const tmp = `${file}.tmp`;
const out = await doc.save({ useObjectStreams: false });
fs.writeFileSync(tmp, out);
const header = fs.readFileSync(tmp).slice(0, 4).toString();
if (header !== "%PDF") {
  fs.unlinkSync(tmp);
  console.error("Invalid PDF after stamp:", file);
  process.exit(1);
}
fs.renameSync(tmp, file);
console.log(`Stamped ${pages.length} page(s): ${file}`);
