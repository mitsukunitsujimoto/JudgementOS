/**
 * Markdown → print-friendly HTML → .docx (via Microsoft Word COM on Windows)
 * Usage: node scripts/md-to-word.mjs <input.md> [output.docx]
 */
import { readFileSync, writeFileSync } from "fs";
import { basename, dirname, join, resolve } from "path";
import { spawnSync } from "child_process";

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineFormat(text) {
  let s = escapeHtml(text);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/→/g, "→");
  return s;
}

function isStageDirection(line) {
  const t = line.trim();
  return t.startsWith("【") && t.endsWith("】");
}

function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function isTableSeparator(line) {
  return /^\|?[\s\-:|]+\|?$/.test(line.trim());
}

function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      i++;
      continue;
    }

    if (trimmed === "---") {
      out.push("<hr />");
      i++;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      out.push(`<h1>${inlineFormat(trimmed.slice(2))}</h1>`);
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      out.push(`<h2>${inlineFormat(trimmed.slice(3))}</h2>`);
      i++;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quoteLines.push(lines[i].trim().slice(2));
        i++;
      }
      out.push(
        `<blockquote><p>${quoteLines.map(inlineFormat).join("<br />")}</p></blockquote>`
      );
      continue;
    }

    if (trimmed.startsWith("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = parseTableRow(lines[i]);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      let table =
        "<table><thead><tr>" +
        header.map((c) => `<th>${inlineFormat(c)}</th>`).join("") +
        "</tr></thead><tbody>";
      for (const row of rows) {
        table +=
          "<tr>" + row.map((c) => `<td>${inlineFormat(c)}</td>`).join("") + "</tr>";
      }
      table += "</tbody></table>";
      out.push(table);
      continue;
    }

    if (trimmed.startsWith("- [ ]")) {
      const items = [];
      while (i < lines.length && lines[i].trim().startsWith("- [ ]")) {
        items.push(lines[i].trim().slice(5).trim());
        i++;
      }
      out.push(
        "<ul class=\"checklist\">" +
          items.map((item) => `<li>☐ ${inlineFormat(item)}</li>`).join("") +
          "</ul>"
      );
      continue;
    }

    if (trimmed.startsWith("- ") || /^\d+\.\s/.test(trimmed)) {
      const ordered = /^\d+\.\s/.test(trimmed);
      const items = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (ordered && /^\d+\.\s/.test(t)) {
          items.push(t.replace(/^\d+\.\s/, ""));
          i++;
        } else if (!ordered && t.startsWith("- ")) {
          items.push(t.slice(2));
          i++;
        } else {
          break;
        }
      }
      const tag = ordered ? "ol" : "ul";
      out.push(
        `<${tag}>` + items.map((item) => `<li>${inlineFormat(item)}</li>`).join("") + `</${tag}>`
      );
      continue;
    }

    if (isStageDirection(trimmed)) {
      out.push(`<p class="stage">${inlineFormat(trimmed)}</p>`);
      i++;
      continue;
    }

    if (trimmed.startsWith("*") && trimmed.endsWith("*") && !trimmed.startsWith("**")) {
      out.push(`<p class="meta">${inlineFormat(trimmed.slice(1, -1))}</p>`);
      i++;
      continue;
    }

    const paraLines = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (
        t === "" ||
        t === "---" ||
        t.startsWith("# ") ||
        t.startsWith("## ") ||
        t.startsWith("> ") ||
        t.startsWith("|") ||
        t.startsWith("- ") ||
        /^\d+\.\s/.test(t) ||
        t.startsWith("- [ ]") ||
        isStageDirection(t)
      ) {
        break;
      }
      paraLines.push(lines[i].trimEnd());
      i++;
    }
    out.push(`<p>${inlineFormat(paraLines.join("<br />"))}</p>`);
  }

  return out.join("\n");
}

function buildHtml(body, title) {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      lang="ja">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<!--[if gte mso 9]><xml>
<w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
</w:WordDocument>
</xml><![endif]-->
<style>
  @page { size: A4; margin: 2.5cm 2.2cm 2.5cm 2.2cm; }
  body {
    font-family: "Yu Mincho", "游明朝", "MS Mincho", "MS PMincho", serif;
    font-size: 11pt;
    line-height: 1.75;
    color: #1a1a1a;
    max-width: 16cm;
    margin: 0 auto;
  }
  h1 {
    font-size: 18pt;
    font-weight: bold;
    border-bottom: 2px solid #333;
    padding-bottom: 0.4em;
    margin: 1.2em 0 0.8em;
    page-break-after: avoid;
  }
  h2 {
    font-size: 13pt;
    font-weight: bold;
    color: #222;
    margin: 1.4em 0 0.6em;
    page-break-after: avoid;
  }
  p { margin: 0.5em 0; }
  hr {
    border: none;
    border-top: 1px solid #ccc;
    margin: 1.2em 0;
  }
  strong { font-weight: bold; }
  blockquote {
    margin: 1em 0 1em 1.5em;
    padding: 0.6em 1em;
    border-left: 4px solid #555;
    background: #f7f7f7;
    font-size: 12pt;
  }
  blockquote p { margin: 0; }
  .stage {
    color: #555;
    font-style: italic;
    font-size: 10pt;
    margin: 0.4em 0;
  }
  .meta {
    color: #666;
    font-size: 9.5pt;
    text-align: right;
    margin-top: 2em;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
    font-size: 10pt;
  }
  th, td {
    border: 1px solid #999;
    padding: 0.35em 0.6em;
    text-align: left;
    vertical-align: top;
  }
  th { background: #eee; font-weight: bold; }
  ul, ol { margin: 0.5em 0 0.5em 1.5em; }
  li { margin: 0.25em 0; }
  .checklist { list-style: none; margin-left: 0; padding-left: 0; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function convertWithWord(htmlPath, docxPath) {
  const ps = `
$ErrorActionPreference = 'Stop'
$htmlPath = '${htmlPath.replace(/'/g, "''")}'
$docxPath = '${docxPath.replace(/'/g, "''")}'
if (Test-Path -LiteralPath $docxPath) { Remove-Item -LiteralPath $docxPath -Force }
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($htmlPath)
  $format = 16
  $doc.SaveAs2([ref]$docxPath, [ref]$format)
  $doc.Close($false)
  Write-Output "OK: $docxPath"
} finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
  [GC]::Collect()
}
`;
  const result = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
    { encoding: "utf8", timeout: 120000 }
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Word conversion failed");
  }
  return result.stdout.trim();
}

const inputArg = process.argv[2];
if (!inputArg) {
  console.error("Usage: node scripts/md-to-word.mjs <input.md> [output.docx]");
  process.exit(1);
}

const inputPath = resolve(inputArg);
const base = basename(inputPath, ".md");
const outDir = dirname(inputPath);
const docxPath = resolve(process.argv[3] || join(outDir, `${base}.docx`));
const htmlPath = join(outDir, `${base}-word-temp.html`);

const md = readFileSync(inputPath, "utf8");
const body = mdToHtml(md);
const title = base.replace(/-/g, " ");
const html = buildHtml(body, title);
writeFileSync(htmlPath, html, "utf8");

console.log(`HTML: ${htmlPath}`);
const msg = convertWithWord(htmlPath, docxPath);
console.log(msg);
