# 対話取り込みパイプライン — 設計書

> **目的**：経営者・事業責任者・研究開発責任者・現場マネージャーとの対話内容を、  
> **録音（任意）→ 文字起こし → 構造化 → sessions.json → PANE 4 表示** まで半自動でつなぐ。  
> **正本**：[`sessions.json`](./sessions.json) · **作業台**：[`decision-knowledge-panels.html`](../decision-knowledge-panels.html)

---

## 1. 設計の原則

| 原則 | 内容 |
|------|------|
| **人が引き受ける** | 自動要約は「下書き」。最終的な insight はファシリテーターが確認する |
| **正解を売らない** | 支持・反証どちらも `insights` として残す。削除より追記 |
| **ブラウザは表示・入力** | `sessions.json` への書き込みは Node スクリプト経由（セキュリティ・再現性） |
| **引き算** | 録音・文字起こし・要約・蓄積の各段を**差し替え可能**にする（ベンダーロックイン回避） |
| **APCD に接続** | 取り込み時のタグは `前提` `判断` `発言` `次の問い`（PANE 2・3 と同型） |

---

## 2. 全体アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────────┐
│  対話中（ファシリテーター）                                                │
│  4ペイン投影 · PANE 3 問いセット · メモは任意（録音ON/OFF）                  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
  [録音ファイル]           [手書きメモ]            [Zoom文字起こし]
  recordings/              その場メモ               外部エクスポート
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                ▼
                    ┌───────────────────────┐
                    │  L1 文字起こし         │  transcribe.mjs（Phase 2）
                    │  → transcripts/       │
                    └───────────┬───────────┘
                                ▼
                    ┌───────────────────────┐
                    │  L2 構造化・要約       │  summarize-dialogue.mjs（Phase 2）
                    │  → inbox/*.md         │  （session-log 形式）
                    └───────────┬───────────┘
                                ▼
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
  [PANE 4 貼り付け]                              import-dialogue.mjs
  即時表示（localStorage）                        → sessions.json（Phase 1 ✓）
        │                                               │
        └───────────────────────┬───────────────────────┘
                                ▼
                    ┌───────────────────────┐
                    │  L3 蓄積・表示         │  PANE 4 fetch + local merge
                    │  sessions.json        │
                    └───────────────────────┘
```

---

## 3. ユーザージャーニー（実運用）

### 対話前（5分）

1. `npx serve output -l 8787` で 4ペイン起動
2. PANE 3 で領域タブ・問いセットを確認
3. （任意）録音開始 — スマホ / Zoom / OBS

### 対話中

- 4ペインを投影。PANE 1〜3 のみ使用（入力しない）
- ファシリテーターが PANE 3 の問いに沿って対話

### 対話後（目標：10分以内）

| 段 | 操作 | 所要時間 |
|----|------|----------|
| **即時** | PANE 4 に文字起こし or メモを貼り付け → 取り込む | 2分 |
| **確認** | 自動分解された insight を読み、違えば手修正 | 3分 |
| **永続化** | `inbox MD` 保存 → `inbox/` に置く → `import-dialogue.mjs --inbox` | 2分 |
| **次回** | ブラウザ再読込 → PANE 4 に前回の洞察 | 10秒 |

### 対話後（Phase 2 以降・録音あり）

```bash
# 1. 文字起こし（ローカル Whisper 等）
node scripts/transcribe.mjs --file output/data/recordings/2026-06-11-採用.m4a

# 2. APCD 向けに要約・構造化（Cursor / API）
node scripts/summarize-dialogue.mjs --file output/data/transcripts/2026-06-11-採用.txt --theme 採用

# 3. 既存パイプラインへ合流
node scripts/import-dialogue.mjs --inbox
```

---

## 4. フォルダ構成（目標）

```
output/data/
├── sessions.json              # 正本（insights / quotes / メタ）
├── session-log-template.md    # ログの型
├── session-logs/              # 確定版の詳細ログ（人間が保管）
├── inbox/                     # 取り込み待ち .md
│   ├── processed/             # import 済み
│   └── README.md
├── recordings/                # Phase 2：生音声（gitignore 推奨）
├── transcripts/               # Phase 2：文字起こし生テキスト
└── dialogue-pipeline-design.md  # 本設計書

scripts/
├── import-dialogue.mjs        # Phase 1 ✓ inbox → sessions.json
├── transcribe.mjs             # Phase 2（未実装）
├── summarize-dialogue.mjs     # Phase 2（未実装）
└── pipeline.mjs               # Phase 3：一括実行（未実装）
```

---

## 5. データモデル

### 5.1 sessions.json（現行 + 拡張案）

**現行（維持）**

```json
{
  "date": "2026-06-11",
  "theme": "採用",
  "text": "AIスクリーニング後も採用基準の前提は変わらなかった"
}
```

**Phase 2 で追加する任意フィールド**

```json
{
  "date": "2026-06-11",
  "theme": "前提",
  "text": "即戦力採用を優先している",
  "source": {
    "sessionLog": "session-logs/2026-06-11-採用.md",
    "transcript": "transcripts/2026-06-11-採用.txt",
    "recording": "recordings/2026-06-11-採用.m4a"
  },
  "apcd": "A",
  "hypothesis": "supports | refutes | neutral",
  "reviewed": true
}
```

- `apcd`：前提(A) / 目的(P) / 基準(C) / 判断(D) へのマッピング（要約時に付与）
- `hypothesis`：仮説探索サイクル用（未検証のまま残してよい）
- `reviewed`：ファシリテーターが確認済みか

### 5.2 セッションログ Markdown（標準形）

`session-log-template.md` を正とする。パーサー（`import-dialogue.mjs`）はこの見出しを認識する。

| 見出し | APCD | insight の theme |
|--------|------|------------------|
| `### 前提・守りたいもの` | A | 前提 |
| `### 判断は変わったか` | — | 判断 |
| `### 印象に残った発言` | — | 発言 + quotes |
| `## 継続議論用の問い` | 問いの更新 | 次の問い |

---

## 6. コンポーネント設計

### 6.1 4ペイン UI（Phase 1 ✓ / Phase 2 拡張）

| 機能 | 状態 | Phase 2 拡張 |
|------|------|--------------|
| PANE 4 貼り付け・即表示 | ✓ | 要約プレビュー（API呼び出し前の下書き欄） |
| localStorage 未同期表示 | ✓ | 「同期済み」バッジ |
| inbox MD ダウンロード | ✓ | メタデータ（録音パス）を frontmatter に |
| JSON コピー | ✓ | 維持 |
| ファイル読込 .md/.txt | ✓ | `.vtt`（Zoom字幕）対応 |

**意図的に作らないもの（4ペイン内）**

- sessions.json への直接 POST（バックエンド不要のため）
- 録音ボタン（ブラウザ録音は品質・権限・長時間の課題）

### 6.2 import-dialogue.mjs（Phase 1 ✓）

**責務**：Markdown / テキスト → `sessions.json` の `insights` / `quotes` に追記

**拡張予定（Phase 2）**

- `--dry-run`：追記せずプレビュー
- `--review`：inbox を `session-logs/` にもコピーしてから import
- frontmatter（YAML）から `sessionId` / `theme` / `date` を読む

### 6.3 transcribe.mjs（Phase 2・新規）

**責務**：`recordings/*` → `transcripts/*.txt`

**推奨方式（優先順）**

| 方式 | メリット | デメリット |
|------|----------|------------|
| **① ローカル whisper.cpp / faster-whisper** | 無料・オフライン・機密保持 | 初回セットアップ |
| **② OpenAI Whisper API** | 精度・実装が早い | コスト・音声が外部へ |
| **③ Zoom / Teams 組み込み文字起こし** | 追加実装ほぼ不要 | エクスポート手順が必要 |

**初期推奨**：③（Zoom 文字起こし VTT を `transcripts/` に保存）+ ①を並行検証

```bash
# インターフェース（案）
node scripts/transcribe.mjs --file output/data/recordings/xxx.m4a
node scripts/transcribe.mjs --inbox   # recordings/ 内の未処理を一括
```

### 6.4 summarize-dialogue.mjs（Phase 2・新規）

**責務**：生文字起こし → `session-log-template.md` 形式の下書き

**入力**：`transcripts/*.txt` + メタ（日付・テーマ・相手・sessionId）

**出力**：`inbox/YYYY-MM-DD-テーマ.md`（人間レビュー前提）

**要約プロンプトの芯（固定）**

1. PANE 3 の問いセット（目的·内容·方法、納得、違和感、拡張、修正）に沿って抽出
2. APCD のどれに触れているかタグ付け
3. 仮説「AIは既存合理性を強化しやすい」に関係する記述があれば `hypothesis` 候補を付ける
4. **推測で補完しない**。対話にないことは書かない

**実装オプション**

| 方式 | 用途 |
|------|------|
| Cursor で手動（プロンプトテンプレ） | 今月すぐ開始 |
| `summarize-dialogue.mjs` + OpenAI API | 来月の半自動化 |
| Cursor CLI / SDK | 将来 |

### 6.5 pipeline.mjs（Phase 3・新規）

**責務**：一括実行

```bash
node scripts/pipeline.mjs \
  --recording output/data/recordings/2026-06-11.m4a \
  --theme 採用 \
  --session decision-domains
```

内部：`transcribe` → `summarize` → （人間確認待ちオプション）→ `import-dialogue`

---

## 7. フェーズ計画

### Phase 1 — 今週（✓ 完了）

- [x] PANE 4 取り込み UI
- [x] `import-dialogue.mjs`
- [x] `inbox/` 運用
- [ ] `session-logs/` フォルダ作成とテンプレ運用開始

### Phase 2 — 今月（6月）

| タスク | 成果物 |
|--------|--------|
| Zoom VTT → transcript 変換 | `scripts/vtt-to-txt.mjs` |
| 要約プロンプトテンプレ | `output/data/prompts/summarize-dialogue.md` |
| Cursor 手動要約 → inbox 運用を2回実施 | 実データ2件 |
| `summarize-dialogue.mjs` 試作（API任意） | 下書き MD 生成 |
| sessions.json に `source` / `reviewed` 追加 | スキーマ拡張 |

### Phase 3 — 来月（7月）

| タスク | 成果物 |
|--------|--------|
| ローカル Whisper または API 文字起こし | `transcribe.mjs` |
| `pipeline.mjs` 一括実行 | 対話後10分フロー確立 |
| PANE 4「未レビュー」フィルタ | UI |
| hub-ui（shadcn）への移植検討 | 操作感向上 |

### Phase 4 — 将来（やりすぎ注意）

- リアルタイム文字起こし + 対話中の PANE 4 更新
- 仮説ダッシュボード（支持/反証の時系列）
- クライアント別ポータル

**Phase 4 は「対話の質を上げる」か確認してから**。記録自動化に寄りすぎない。

---

## 8. 要約プロンプト設計（Cursor 用テンプレ案）

`summarize-dialogue.mjs` / Cursor 共通で使う。

```
あなたは「AI時代の意思決定」のファシリテーターアシスタントです。
以下の文字起こしから、session-log-template.md と同じ見出しで Markdown を出力してください。

## 抽出ルール
- ### 前提・守りたいもの：守りたいもの・棄損したくないもの（APCDのA）
- ### 判断は変わったか：合理性の強化だけだったか、問いは更新されたか
- ### 印象に残った発言：>  blockquote 1つ
- ## 継続議論用の問い：次回に持ち越す問いを箇条書き

## PANE 3 問いセット（参照）
- 目的·内容·方法（判断とAIの接続）
- AIへの問い、納得度、違和感、思考の拡張、問いの修正

## 禁止
- 文字起こしにない推測の追加
- 「正しい判断」「べき」論
- 組織名・個人名（匿名化）

## メタ
- 日付: {date}
- テーマ: {theme}
- セッションID: {sessionId}

## 文字起こし
{transcript}
```

---

## 9. 録音運用の現実的な選択

| シーン | 推奨 |
|--------|------|
| 対面1on1 | iPhoneボイスメモ → `recordings/` に手動コピー |
| Zoom | クラウド録画 + 文字起こしVTTをダウンロード |
| 会議室 | 承諾を得た上でスマホ録音 |

**必須**：録音・文字起こしの**同意**を対話前に取る（設計外だが運用必須）。

---

## 10. 失敗しないためのチェックリスト

対話後、ファシリテーターが確認：

- [ ] insight は「前提・判断」など**タグが付いているか**
- [ ] 文字起こしに**ない推測**が入っていないか
- [ ] `hypothesis` は未検証のまま残っているか（断定していないか）
- [ ] 次の問いが1つ以上更新されているか
- [ ] `sessions.json` 反映後、PANE 4 で見えるか

---

## 11. 関連ファイル

| ファイル | 役割 |
|----------|------|
| [`decision-knowledge-panels.html`](../decision-knowledge-panels.html) | 4ペイン作業台 |
| [`import-dialogue.mjs`](../../scripts/import-dialogue.mjs) | inbox → JSON |
| [`session-log-template.md`](./session-log-template.md) | ログの型 |
| [`inbox/README.md`](./inbox/README.md) | inbox 手順 |
| [`AI時代の意思決定.md`](../AI時代の意思決定.md) | プログラム思想 |

---

## 12. 次のアクション（辻本さん向け）

1. **次の対話1回**で Phase 1 フローを通す（PANE 4 → inbox → `--inbox`）
2. Zoom 等の文字起こしがあれば `transcripts/` に保存し、Cursor で要約テンプレを試す
3. 2回分の実データが溜まったら Phase 2 の `summarize-dialogue.mjs` 実装を判断

---

*設計書 v1 · 2026-06-05 · AI時代の意思決定*
