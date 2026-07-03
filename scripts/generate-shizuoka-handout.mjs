#!/usr/bin/env node
/**
 * 静岡講演 配布資料 — PDF / PPTX 生成
 *
 * Usage:
 *   node scripts/generate-shizuoka-handout.mjs           # PDF + PPTX
 *   node scripts/generate-shizuoka-handout.mjs --pdf     # PDF only
 *   node scripts/generate-shizuoka-handout.mjs --pptx    # PPTX only
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = join(ROOT, "output");
const HTML = join(OUT, "shizuoka-handout-2026-07-10.html");
const PDF = join(OUT, "shizuoka-handout-2026-07-10.pdf");
const PPTX = join(OUT, "shizuoka-handout-2026-07-10.pptx");

const args = process.argv.slice(2);
const wantPdf = args.length === 0 || args.includes("--pdf");
const wantPptx = args.length === 0 || args.includes("--pptx");

function log(msg) {
  console.log(msg);
}

function findBrowser() {
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

async function generatePdf() {
  if (!existsSync(HTML)) {
    throw new Error(`HTML not found: ${HTML}`);
  }
  const browser = findBrowser();
  const fileUrl = "file:///" + HTML.replace(/\\/g, "/");

  if (browser) {
    log(`PDF生成中…`);
    const result = spawnSync(
      browser,
      [
        "--headless=new",
        "--disable-gpu",
        `--print-to-pdf=${PDF}`,
        "--no-pdf-header-footer",
        fileUrl,
      ],
      { encoding: "utf8", timeout: 60000 }
    );
    if (result.status === 0 && existsSync(PDF)) {
      log(`OK PDF: ${PDF}`);
      return;
    }
    log("Headless PDF failed:", result.stderr || result.stdout);
  }

  log("");
  log("自動PDF生成に失敗。手動:");
  log(`  1. ${HTML} をブラウザで開く`);
  log("  2. Ctrl+P → PDFに保存 → A4");
  log(`  3. ${PDF}`);
}

async function generatePptx() {
  let PptxGenJS;
  try {
    PptxGenJS = (await import("pptxgenjs")).default;
  } catch {
    log("pptxgenjs 未インストール: npm install pptxgenjs");
    return;
  }

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "辻本 光邦";
  pptx.title = "配布資料 — AI時代の意思決定";

  const navy = "1E3A5F";
  const dark = "1E293B";
  const gray = "64748B";

  function addTitleSlide(title, sub, extra) {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addText(title, { x: 0.5, y: 0.8, w: 9, h: 1.2, fontSize: 22, bold: true, color: dark });
    if (sub) s.addText(sub, { x: 0.5, y: 2.0, w: 9, h: 0.6, fontSize: 14, color: gray });
    if (extra) s.addText(extra, { x: 0.5, y: 2.8, w: 9, h: 2.5, fontSize: 12, color: dark, valign: "top" });
  }

  function addContentSlide(pageLabel, title, bullets, note) {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addText(pageLabel, { x: 8.5, y: 0.2, w: 1, h: 0.3, fontSize: 9, color: gray, align: "right" });
    s.addText(title, { x: 0.5, y: 0.4, w: 9, h: 0.5, fontSize: 16, bold: true, color: navy });
    if (bullets?.length) {
      s.addText(
        bullets.map((t) => ({ text: t, options: { bullet: true, breakLine: true } })),
        { x: 0.5, y: 1.0, w: 9, h: 4.5, fontSize: 11, color: dark, valign: "top" }
      );
    }
    if (note) {
      s.addText(note, { x: 0.5, y: 5.0, w: 9, h: 0.8, fontSize: 10, italic: true, color: gray });
    }
  }

  addTitleSlide(
    "AI時代の意思決定をどう変えるか",
    "〜前提を照らし、判断を引き受ける〜",
    "2026年7月10日 ／ 内外情勢調査会 静岡・志太支部\n辻本 光邦 ／ 株式会社インサイトパワーズ\n\n本当のテーマ：\n見えなくなった「守ろうとしているもの」と向き合う。"
  );

  addContentSlide("P2", "経営者の仕事", [
    "正しい答えを出す人ではない",
    "正しいこと同士の優先順位を決める人",
    "自分の名前で引き受ける人",
    "",
    "Q1 あなただけが決めなければならない判断",
    "Q2 誰の名前で引き受けているか",
  ], "配布資料の記入欄にメモ");

  addContentSlide("P3", "なぜ、いま判断が重いのか", [
    "改善は速い。新しいことは難しい",
    "業務は速くなった。判断の根っこは変わったか",
    "AIは合理性を強化しうる。責任は軽くならない",
    "問題は能力不足ではない → 見えなくなったもの",
  ]);

  addContentSlide("P4", "前提とは何か", [
    "組織を守ってきたから、残る",
    "守ろうとしているものから生まれる",
    "無意識 / 成功体験×防衛本能 / 本人には見えない",
    "見えているかどうかが問題",
  ]);

  addContentSlide("P5", "前提が見えなくなると", [
    "守るもの → 前提 → 空気 → 未来の選択肢",
    "組織を制約しているのは、多くの場合能力不足ではない。見えなくなった前提である",
    "Q-A 何を守ろうとしているか",
    "Q-B 意識しなくなった守るもの",
    "Q-C 選択肢を狭めていないか",
  ]);

  addContentSlide("P6", "APCD（補助線）", [
    "覚える必要はない",
    "A 前提 → P 目的 → C 基準 → D 判断",
    "照らす → 引き受ける",
  ]);

  addContentSlide("P7", "自己診断", [
    "5項目チェック",
    "守ろうとしているもの — 3行",
    "過去の方程式 — 一言",
  ]);

  addContentSlide("P8", "明日15分", [
    "5分：守るもの3行",
    "5分：方程式1行",
    "5分：今も有効か — 問いだけ",
  ]);

  const s9 = pptx.addSlide();
  s9.background = { color: dark };
  s9.addText("最後の問い", { x: 0.5, y: 0.4, w: 9, h: 0.5, fontSize: 14, color: "94A3B8" });
  s9.addText(
    "あなたの会社を最も強く形づけている前提は、何ですか。\n\nその前提は、あなたが決めたものですか。\n\nそれとも — 過去が、決めたものですか。",
    { x: 0.5, y: 1.2, w: 9, h: 3.5, fontSize: 16, bold: true, color: "F8FAFC", valign: "top" }
  );

  await pptx.writeFile({ fileName: PPTX });
  log(`OK PPTX: ${PPTX}`);
}

async function main() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  if (wantPdf) await generatePdf();
  if (wantPptx) await generatePptx();
  log("");
  log("InDesign: output/shizuoka-handout-PRODUCTION.md 参照");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
