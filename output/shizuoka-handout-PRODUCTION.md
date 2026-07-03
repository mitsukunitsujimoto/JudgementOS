# 配布資料 — 制作・出力ガイド（v11）

**版**：v11 · 講演同期型 · **6枚**（2026-06-27）  
**方針**：めくる順＝講演の順。ページ指定の口頭案内はしない。

**6月30日送付** → [`shizuoka-handout-DELIVERY-2026-06-30.md`](./shizuoka-handout-DELIVERY-2026-06-30.md)

**正本（編集用）**
- Markdown: [`shizuoka-handout-2026-07-10.md`](./shizuoka-handout-2026-07-10.md)
- HTML（印刷用）: [`shizuoka-handout-2026-07-10.html`](./shizuoka-handout-2026-07-10.html)

**出力物**
- PDF: [`shizuoka-handout-2026-07-10.pdf`](./shizuoka-handout-2026-07-10.pdf) — 生成後
- PPTX: [`shizuoka-handout-2026-07-10.pptx`](./shizuoka-handout-2026-07-10.pptx) — 生成後

---

## 1. PDF を作る（推奨）

### 方法A — ブラウザ（最も確実）

1. [`shizuoka-handout-2026-07-10.html`](./shizuoka-handout-2026-07-10.html) を Chrome または Edge で開く
2. 画面上部の **「PDF / 印刷」** ボタン、または `Ctrl+P`
3. 送信先: **PDF に保存**
4. 用紙: **A4**、余白: **デフォルト**（または「なし」）
5. 背景のグラフィック: **オン**
6. 保存: `shizuoka-handout-2026-07-10.pdf`

### 方法B — スクリプト（Edge / Chrome headless）

```bash
cd c:\Users\mitsu\src\creating-visual-explainers
npm install pptxgenjs
node scripts/generate-shizuoka-handout.mjs --pdf
```

---

## 2. PPTX を作る

講義スライドではなく、**配布9ページの編集用下書き**です。PowerPoint で文言を直して PDF 再出力する用途。

```bash
npm install pptxgenjs
node scripts/generate-shizuoka-handout.mjs --pptx
```

出力: `output/shizuoka-handout-2026-07-10.pptx`（9スライド・16:9）

---

## 3. InDesign で仕上げる

1. **PDF を配置** — 方法A/B で PDF を生成
2. InDesign 新規 → ドキュメント設定 **A4**、ページ数 9
3. `ファイル` → `配置` → `shizuoka-handout-2026-07-10.pdf`
   - または HTML を PDF 化したものを1ページずつ配置
4. フォント・行間の微調整、ロゴ追加、記入欄の罫線調整
5. `書き出し` → `Adobe PDF（印刷）`

**編集の起点として HTML が便利な場合**
- ブラウザで HTML を開き、開発者ツールで文言確認
- Markdown を直接編集 → HTML を手で同期（または再生成依頼）

---

## 4. 印刷

| 項目 | 推奨 |
|------|------|
| 用紙 | A4 |
| 部数 | **25部**（20名＋予備5） |
| 両面 | **不要**（記入欄あり・片面） |
| カラー | 推奨（P9 最終問い） |
| 対象 | **50代以上** — 本文11pt・記入欄14mm以上（v4） |

---

## 5. ファイル一覧

| ファイル | 用途 |
|----------|------|
| `shizuoka-handout-2026-07-10.md` | 原稿・テキスト正本 |
| `shizuoka-handout-2026-07-10.html` | 印刷・PDF 用レイアウト |
| `shizuoka-handout-2026-07-10.pdf` | 配布・InDesign 配置用 |
| `shizuoka-handout-2026-07-10.pptx` | PowerPoint 編集用 |
| `scripts/generate-shizuoka-handout.mjs` | PDF/PPTX 自動生成 |

---

*2026-06-21*
