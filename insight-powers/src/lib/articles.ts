import fs from "fs";
import path from "path";
import matter from "gray-matter";

const articlesDirectory = path.join(process.cwd(), "content", "articles");

export type ArticleFrontmatter = {
  title: string;
  description: string;
  date: string;
  excerpt: string;
  relatedSlugs?: string[];
  series?: string;
  seriesNumber?: number;
  pillarId?: string;
};

export type ArticleListItem = ArticleFrontmatter & {
  slug: string;
};

export type Article = ArticleListItem & {
  content: string;
};

function parseArticleFile(filename: string): Article {
  const slug = filename.replace(/\.md$/, "");
  const filePath = path.join(articlesDirectory, filename);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  const frontmatter = data as ArticleFrontmatter;

  return {
    slug,
    ...frontmatter,
    relatedSlugs: frontmatter.relatedSlugs ?? [],
    content: content.trim(),
  };
}

export function getArticleSlugs(): string[] {
  return fs
    .readdirSync(articlesDirectory)
    .filter((file) => file.endsWith(".md") && file !== "README.md")
    .map((file) => file.replace(/\.md$/, ""));
}

export function getAllArticles(): ArticleListItem[] {
  return getArticleSlugs()
    .map((slug) => {
      const article = parseArticleFile(`${slug}.md`);
      const { content: _content, ...meta } = article;
      return meta;
    })
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
}

export function getArticleBySlug(slug: string): Article | null {
  const filePath = path.join(articlesDirectory, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  return parseArticleFile(`${slug}.md`);
}

export function getArticleByPillarId(pillarId: string): ArticleListItem | null {
  return getAllArticles().find((article) => article.pillarId === pillarId) ?? null;
}

export function getAdjacentArticles(slug: string): {
  prev: ArticleListItem | null;
  next: ArticleListItem | null;
} {
  const articles = getAllArticles();
  const index = articles.findIndex((article) => article.slug === slug);

  if (index === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: articles[index + 1] ?? null,
    next: articles[index - 1] ?? null,
  };
}

export function getRelatedArticles(slug: string): ArticleListItem[] {
  const article = getArticleBySlug(slug);
  if (!article) return [];

  const articlesBySlug = new Map(
    getAllArticles().map((item) => [item.slug, item]),
  );

  const related = (article.relatedSlugs ?? [])
    .map((relatedSlug) => articlesBySlug.get(relatedSlug))
    .filter((item): item is ArticleListItem => item !== undefined)
    .slice(0, 3);

  if (related.length >= 3) return related;

  const fallback = getAllArticles()
    .filter(
      (item) =>
        item.slug !== slug &&
        !related.some((relatedItem) => relatedItem.slug === item.slug),
    )
    .slice(0, 3 - related.length);

  return [...related, ...fallback];
}

export function getArticlesBySeries(seriesName: string): ArticleListItem[] {
  return getAllArticles()
    .filter((article) => article.series === seriesName)
    .sort((a, b) => (a.seriesNumber ?? 0) - (b.seriesNumber ?? 0));
}

export function formatArticleDateShort(date: string): string {
  const parsed = new Date(date);
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  });
  return formatter.format(parsed);
}

export function formatArticleDate(date: string): string {
  const parsed = new Date(date);
  return parsed.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  });
}
