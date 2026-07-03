# 意思決定ツール — Vercel + Neon Postgres セットアップ

経営者の**意思決定文脈**を Neon Postgres に蓄積するための手順です。  
会話ログではなく、判断構造と文脈を保存します。

## 前提

- デプロイ先: [Vercel](https://vercel.com)
- DB: [Neon Postgres](https://neon.tech)（Vercel Marketplace から追加）
- 環境変数: `DATABASE_URL`（ブラウザからは参照しない）
- MVP: `localStorage` がバックアップ。DB 未設定時は API が `saved: false` を返す

## 1. Vercel アカウント・プロジェクト

1. [Vercel](https://vercel.com) でアカウントを作成
2. このリポジトリを Import してプロジェクトを作成
3. **Root Directory**: リポジトリルート（`vercel.json` と `api/` がある場所）
4. **Output Directory**: `output`（`vercel.json` で指定済み）

## 2. Neon を Marketplace から追加

1. Vercel ダッシュボード → プロジェクト → **Storage** / **Marketplace**
2. **Neon** を追加して Postgres インスタンスを作成
3. 接続後、環境変数 **`DATABASE_URL`** が自動でプロジェクトに入る

## 3. スキーマ適用

Neon SQL Editor で `db/schema.sql` を実行するか、ローカルで:

```bash
vercel env pull .env.development.local
npm install
npm run db:schema
```

## 4. ローカル開発

```bash
# 環境変数を取得（初回・更新時）
vercel env pull .env.development.local

npm install
npm run dev
```

`npm run dev` は `vercel dev` を起動します。

- デモ: https://your-project.vercel.app/ （`output/index.html`）
- 旧URL: `/judgment-structure-demo.html` も同内容
- API: POST http://localhost:3000/api/decision-session

`serve` だけでは API は動きません。DB 保存を試すときは **必ず `vercel dev`** を使ってください。

## 5. API

### `POST /api/decision-session`

**リクエスト例:**

```json
{
  "raw_input": "判断の原文",
  "premise": "前提（仮説）",
  "visible": ["見えているもの"],
  "invisible": ["見えにくいもの"],
  "tensions": [{ "a": "...", "b": "..." }],
  "key_questions": ["問い1", "問い2"],
  "decision_context": {
    "achieve": "...",
    "protect": "...",
    "constraints": "...",
    "uncertain": "...",
    "criteria": "..."
  },
  "context_prompt": "AIへ渡す文脈文",
  "ai_version": "constitution-v2-context",
  "user_premise": "経営者が書いた前提（任意）"
}
```

**成功時 (201):**

```json
{
  "saved": true,
  "decision_session_id": "uuid"
}
```

**DATABASE_URL 未設定時 (200):**

```json
{
  "saved": false,
  "reason": "DATABASE_URL is not configured"
}
```

## 6. テーブル一覧

| テーブル | 内容 |
|---------|------|
| `persons` | 経営者・利用者 |
| `decision_sessions` | 一回ごとの判断 |
| `premises` | 前提 |
| `tensions` | 矛盾・緊張 |
| `key_questions` | 本当に判断すべき問い |
| `decision_contexts` | 意思決定文脈（5要素） |
| `context_prompts` | 文脈化された文章 |
| `ai_conversations` | 文脈後の AI 対話（将来） |
| `decision_results` | 最終判断（将来） |
| `reflections` | 振り返り（将来） |

`decision_contexts.accepted_constraints` は SQL 予約語回避のため API の `constraints` をマッピングします。

## 7. セキュリティ

- `DATABASE_URL` はサーバー環境変数のみ
- フロントから DB 直結しない
- `.env.development.local` は git 管理しない（`.gitignore` 済み）
- 接続文字列を `console.log` しない

## 8. フロントの挙動

`judgment-structure-demo.html` は保存時に:

1. **localStorage**（MVP バックアップ）
2. **POST /api/decision-session**（DB があれば Neon へ）

DB 保存に失敗しても画面は壊れません。

## 9. 本番デプロイ

```bash
vercel --prod
```

Vercel 上で `DATABASE_URL` が Production に設定されていることを確認してください。

---

*思想: データベースは判断を保存するためではなく、経営者の意思決定文脈が時間とともにどう変化していくかを映すためにある。*
