# 記事の追加方法

`content/articles/` に Markdown ファイルを1本追加し、デプロイしてください。

## ファイル名

`{slug}.md`（例: `ai-question-design.md`）

URL は `/articles/{slug}` になります。

## frontmatter（必須項目）

```yaml
---
title: "記事タイトル"
description: "SEO用の説明文（120字程度）"
date: "2026-06-18"
excerpt: "一覧ページに表示する抜粋（2〜3行）"
relatedSlugs:
  - 関連記事slug-1
  - 関連記事slug-2
  - 関連記事slug-3
series: "AI時代の意思決定"   # 任意
seriesNumber: 4              # 任意
pillarId: premise              # THINKINGの思想セクションと紐づける場合（任意）
---
```

## 本文

frontmatter の下に Markdown で本文を書きます。

## 公開

```bash
npm run build
npx vercel --prod
```
