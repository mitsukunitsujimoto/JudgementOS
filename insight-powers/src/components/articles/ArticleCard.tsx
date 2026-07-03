import Link from "next/link";
import {
  formatArticleDate,
  type ArticleListItem,
} from "@/lib/articles";

type ArticleCardProps = {
  article: ArticleListItem;
  showExcerpt?: boolean;
};

export function ArticleCard({ article, showExcerpt = true }: ArticleCardProps) {
  return (
    <article className="border-t border-border py-10 first:border-t-0 first:pt-0 md:py-12">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-[11px] tracking-[0.12em] text-subtle">
        <time dateTime={article.date}>{formatArticleDate(article.date)}</time>
        {article.series && (
          <span>{article.series}</span>
        )}
      </div>

      <h2 className="mb-4 font-serif text-xl tracking-[0.06em] text-foreground md:text-2xl">
        <Link
          href={`/articles/${article.slug}`}
          className="transition-opacity hover:opacity-70"
        >
          {article.title}
        </Link>
      </h2>

      {showExcerpt && (
        <p className="mb-6 max-w-2xl text-[15px] leading-[2] tracking-[0.02em] text-muted md:text-base">
          {article.excerpt}
        </p>
      )}

      <Link
        href={`/articles/${article.slug}`}
        className="text-[11px] tracking-[0.18em] text-muted transition-colors hover:text-foreground"
      >
        続きを読む →
      </Link>
    </article>
  );
}
