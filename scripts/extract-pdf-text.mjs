#!/usr/bin/env node
/**
 * Extract text from a PDF into a Markdown companion file.
 * Usage: node scripts/extract-pdf-text.mjs [path/to/file.pdf]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFParse } from "pdf-parse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const pdfArg = process.argv[2] ?? "AI時代の意思決定.pdf";
const pdfPath = path.isAbsolute(pdfArg) ? pdfArg : path.join(root, pdfArg);

if (!fs.existsSync(pdfPath)) {
  console.error(`PDF not found: ${pdfPath}`);
  process.exit(1);
}

const baseName = path.basename(pdfPath, path.extname(pdfPath));
const outDir = path.join(root, "output");
const outPath = path.join(outDir, `${baseName}.raw.md`);

const buffer = fs.readFileSync(pdfPath);
const parser = new PDFParse({ data: buffer });
const result = await parser.getText();
await parser.destroy();

const text = (result.text ?? "").trim();
const pageCount = result.total ?? result.pages?.length ?? "?";
const extractedAt = new Date().toISOString().slice(0, 10);

const relPdf = path.relative(root, pdfPath).replace(/\\/g, "/");

const header = `# ${baseName}（自動抽出・生データ）

> **ソースPDF**: [\`${relPdf}\`](../${relPdf})  
> **自動抽出日**: ${extractedAt}  
> **ページ数**: ${pageCount}  
>
> pdf-parse による自動抽出結果です。特殊フォントの PDF では文字化けします。  
> **参照用テキスト版**: [\`${baseName}.md\`](../output/${baseName}.md)（手動整理版）  
> PDF 更新後: \`node scripts/extract-pdf-text.mjs\` → 生データ確認 → \`.md\` を手動またはチャットで更新

---

`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, header + text + "\n", "utf8");

console.log(`Wrote raw extract: ${outPath}`);
console.log(`Update curated text manually: output/${baseName}.md`);
