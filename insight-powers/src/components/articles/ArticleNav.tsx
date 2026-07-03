import Link from "next/link";
import {
  formatArticleDate,
  type ArticleListItem,
} from "@/lib/articles";

type ArticleNavProps = {
  prev: ArticleListItem | null;
  next: ArticleListItem | null;
};

export function ArticleNav({ prev, next }: ArticleNavProps) {
  if (!prev && !next) return null;

  return (
    <nav
      aria-label="前後の記事"
      className="grid gap-8 border-t border-border pt-12 md:grid-cols-2 md:pt-16"
    >
      <div>
        {prev ? (
          <>
            <p className="mb-3 text-[11px] tracking-[0.2em] text-subtle">
              PREVIOUS
            </p>
            <Link
              href={`/articles/${prev.slug}`}
              className="block transition-opacity hover:opacity-70"
            >
              <p className="mb-2 text-[11px] tracking-[0.12em] text-subtle">
                {formatArticleDate(prev.date)}
              </p>
              <p className="font-serif text-lg tracking-[0.04em] text-foreground md:text-xl">
                {prev.title}
              </p>
            </Link>
          </>
        ) : (
          <span className="sr-only">前の記事はありません</span>
        )}
      </div>

      <div className="md:text-right">
        {next ? (
          <>
            <p className="mb-3 text-[11px] tracking-[0.2em] text-subtle">
              NEXT
            </p>
            <Link
              href={`/articles/${next.slug}`}
              className="block transition-opacity hover:opacity-70"
            >
              <p className="mb-2 text-[11px] tracking-[0.12em] text-subtle md:ml-auto">
                {formatArticleDate(next.date)}
              </p>
              <p className="font-serif text-lg tracking-[0.04em] text-foreground md:text-xl">
                {next.title}
              </p>
            </Link>
          </>
        ) : (
          <span className="sr-only">次の記事はありません</span>
        )}
      </div>
    </nav>
  );
}
