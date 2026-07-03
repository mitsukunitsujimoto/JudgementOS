import { ArticleCard } from "./ArticleCard";
import { getAllArticles } from "@/lib/articles";

export function ArticleList() {
  const articles = getAllArticles();

  return (
    <section aria-labelledby="articles-heading" className="border-t border-border pt-16 md:pt-20">
      <p className="mb-6 text-[11px] tracking-[0.24em] text-subtle">ARTICLES</p>
      <h2
        id="articles-heading"
        className="mb-12 font-serif text-2xl tracking-[0.06em] text-foreground md:mb-16 md:text-3xl"
      >
        記事
      </h2>

      <div>
        {articles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  );
}
