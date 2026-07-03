# 対話ログ inbox — 半自動取り込み

対話後のメモ・文字起こしをここに置き、スクリプトで `sessions.json` に反映します。

## 手順

1. **4ペイン PANE 4** で「対話を取り込む」→ 貼り付け → **inbox用MDを保存**（または `session-log-template.md` を手で保存）
2. ファイルをこのフォルダ（`output/data/inbox/`）に置く
3. ターミナルで実行:

```bash
node scripts/import-dialogue.mjs --inbox
```

処理済みファイルは `inbox/processed/` に移動します。

## 1ファイルだけ取り込む

```bash
node scripts/import-dialogue.mjs --file output/data/inbox/2026-06-11-採用対話.md --session decision-domains --theme 採用
```

## テキストを直接追記

```bash
node scripts/import-dialogue.mjs --text "採用基準の前提が言語化されていなかった" --theme 採用
```

## セッションID

| ID | 用途 |
|----|------|
| `hypothesis-exploration` | 仮説探索サイクル（デフォルト） |
| `hitachi-rd-2026-06-11` | 日立 R&D 6/11 ディスカッション |
| `program-core` | プログラム全体 |

## Markdown の書き方

`session-log-template.md` と同じ見出しがあると、自動で insights に分解されます。

- `### 前提・守りたいもの`
- `### 判断は変わったか / 合理性の強化`
- `### 印象に残った発言`
- `## 継続議論用の問い（更新）`

見出しがなくても、本文から1件の insight として取り込みます。
