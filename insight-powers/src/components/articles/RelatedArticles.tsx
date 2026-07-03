import Link from "next/link";
import {
  formatArticleDate,
  type ArticleListItem,
} from "@/lib/articles";

type RelatedArticlesProps = {
  articles: ArticleListItem[];
};

export function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) return null;

  return (
    <section aria-labelledby="related-articles-heading" className="border-t border-border pt-12 md:pt-16">
      <h2
        id="related-articles-heading"
        className="mb-10 text-[11px] tracking-[0.2em] text-subtle md:mb-12"
      >
        関連記事
      </h2>

      <ul className="space-y-8">
        {articles.map((article) => (
          <li key={article.slug}>
            <Link
              href={`/articles/${article.slug}`}
              className="group block transition-opacity hover:opacity-70"
            >
              <p className="mb-2 text-[11px] tracking-[0.12em] text-subtle">
                {formatArticleDate(article.date)}
              </p>
              <p className="font-serif text-lg tracking-[0.04em] text-foreground md:text-xl">
                {article.title}
              </p>
              <p className="mt-3 text-[11px] tracking-[0.18em] text-muted transition-colors group-hover:text-foreground">
                続きを読む →
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
