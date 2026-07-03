import Link from "next/link";
import {
  formatArticleDateShort,
  getArticlesBySeries,
} from "@/lib/articles";
import type { ThinkingSeries } from "@/lib/content/thinking";

type SeriesListProps = {
  series: ThinkingSeries;
};

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] leading-[2.2] tracking-[0.02em] text-foreground/90 md:text-base">
      {children}
    </p>
  );
}

function Emphasis({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-serif text-lg leading-relaxed tracking-[0.04em] text-foreground md:text-xl">
      {children}
    </p>
  );
}

function EmphasisList({ items }: { items: readonly string[] }) {
  return (
    <div className="space-y-3 border-l border-foreground/15 py-1 pl-8">
      {items.map((item) => (
        <Emphasis key={item}>{item}</Emphasis>
      ))}
    </div>
  );
}

export function SeriesList({ series }: SeriesListProps) {
  const articles = getArticlesBySeries(series.matchSeries);

  if (articles.length === 0) return null;

  return (
    <section
      aria-labelledby={`series-${series.id}-heading`}
      className="border-t border-border py-16 md:py-24"
    >
      <h2
        id={`series-${series.id}-heading`}
        className="mb-8 font-serif text-2xl tracking-[0.06em] text-foreground md:mb-10 md:text-3xl"
      >
        {series.title}
      </h2>

      <div className="max-w-2xl space-y-8">
        {series.paragraphs?.map((paragraph) => (
          <Prose key={paragraph}>{paragraph}</Prose>
        ))}

        {series.emphasis && <EmphasisList items={series.emphasis} />}

        {series.closing?.map((paragraph) => (
          <Prose key={paragraph}>{paragraph}</Prose>
        ))}

        {series.closingEmphasis && (
          <EmphasisList items={series.closingEmphasis} />
        )}

        {series.closingEnd?.map((paragraph) => (
          <Prose key={paragraph}>{paragraph}</Prose>
        ))}
      </div>

      <div className="mt-16 max-w-2xl border-t border-border pt-12 md:mt-20 md:pt-16">
        <p className="mb-8 text-[11px] tracking-[0.2em] text-subtle md:mb-10">
          連載一覧
        </p>

        <ol className="space-y-0">
          {articles.map((article) => (
            <li
              key={article.slug}
              className="border-t border-border py-6 first:border-t-0 first:pt-0 md:py-8"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
                <h3 className="font-serif text-lg leading-relaxed tracking-[0.04em] text-foreground md:text-xl">
                  <Link
                    href={`/articles/${article.slug}`}
                    className="transition-opacity hover:opacity-70"
                  >
                    {article.seriesNumber !== undefined && (
                      <span className="mr-3 text-[11px] tracking-[0.12em] text-subtle">
                        #{article.seriesNumber}
                      </span>
                    )}
                    {article.title}
                  </Link>
                </h3>
                <time
                  dateTime={article.date}
                  className="shrink-0 text-[11px] tracking-[0.12em] text-subtle"
                >
                  {formatArticleDateShort(article.date)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
