# 意思決定ナレッジ — データの貯め方

## 目的

経営者講演・研究ディスカッション（日立国分寺など）・プログラム概要を**同じフレーム**でつなぎ、対話のたびにデータを足していくための置き場です。

## ファイル

| ファイル | 役割 |
|----------|------|
| [`sessions.json`](./sessions.json) | 全セッションの索引・問い・洞察（機械可読） |
| [`session-log-template.md`](./session-log-template.md) | 1回分の対話メモ用テンプレート |
| [`dialogue-pipeline-design.md`](./dialogue-pipeline-design.md) | **対話取り込みパイプライン設計書**（録音→蓄積） |
| `session-logs/YYYY-MM-DD-*.md` | 各回の詳細ログ（任意・増やしていく） |

## 使い方

### A. 4ペインから即時取り込み（ブラウザ）

1. **4ペインを開く** — [`../decision-knowledge-panels.html`](../decision-knowledge-panels.html)
2. **PANE 4** の「＋ 取り込み」→ 文字起こし・メモを貼り付け → **取り込む**
3. すぐに PANE 4 に表示（ブラウザ内の一時保存）
4. 永続化するには **inbox MD** をダウンロード → `inbox/` に置く → 下記 B を実行

### B. inbox から sessions.json へ半自動反映（推奨）

1. 対話ログ `.md` を [`inbox/`](./inbox/) に置く（PANE 4 の「inbox MD」でも可）
2. ターミナルで実行:

```bash
node scripts/import-dialogue.mjs --inbox
```

3. ブラウザを再読込 → PANE 4 に反映

### C. 手動（従来）

1. **ハブを開く** — [`../decision-knowledge-hub.html`](../decision-knowledge-hub.html) または発表用 [`../decision-knowledge-panels.html`](../decision-knowledge-panels.html)
2. **研究ディスカッション投影** — [`../research-ai-utilization-discussion.html`](../research-ai-utilization-discussion.html)
3. **対話のあと** — `session-log-template.md` をコピーし、`session-logs/` に保存
4. **索引を更新** — `sessions.json` の該当セッションに `insights` / `quotes` を追記（または B を使用）

### sessions.json に insight を足す例

```json
"insights": [
  {
    "date": "2026-06-11",
    "theme": "テーマ選定",
    "text": "文献調査は速くなったが、採用基準の前提は言語化されていなかった"
  }
]
```

## ローカルで JSON を読み込むには

`decision-knowledge-hub.html` は `sessions.json` を fetch します。  
`file://` では読めないことがあるため、次のいずれかを使ってください。

```bash
npx --yes serve output -l 8787
```

ブラウザで `http://127.0.0.1:8787/decision-knowledge-hub.html` を開く。

## 横並び参照（Markdown）

- [`AI時代の意思決定.md`](../AI時代の意思決定.md)
- [`hitachi-kokubunji-pre-agenda-2026-06-11.md`](../hitachi-kokubunji-pre-agenda-2026-06-11.md)
- [`shizuoka-executive-lecture-outline.md`](../shizuoka-executive-lecture-outline.md)
