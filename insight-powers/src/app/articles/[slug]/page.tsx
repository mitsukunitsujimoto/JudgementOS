import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { MarkdownContent } from "@/components/articles/MarkdownContent";
import { ArticleNav } from "@/components/articles/ArticleNav";
import { RelatedArticles } from "@/components/articles/RelatedArticles";
import {
  formatArticleDate,
  getAdjacentArticles,
  getArticleBySlug,
  getArticleSlugs,
  getRelatedArticles,
} from "@/lib/articles";
import { siteConfig } from "@/lib/site";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return { title: "記事が見つかりません" };
  }

  const url = `${siteConfig.url}/articles/${article.slug}`;

  return {
    title: article.title,
    description: article.description,
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      url,
      publishedTime: article.date,
      siteName: siteConfig.name,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const { prev, next } = getAdjacentArticles(slug);
  const related = getRelatedArticles(slug);

  return (
    <PageShell>
      <article className="border-b border-border">
        <div className="mx-auto max-w-2xl px-6 py-20 md:px-10 md:py-28">
          <header className="mb-16 border-b border-border pb-16 md:mb-20 md:pb-20">
            <p className="mb-6 text-[11px] tracking-[0.24em] text-subtle">
              ARTICLE
            </p>

            <div className="mb-8 flex flex-wrap items-center gap-3 text-[11px] tracking-[0.12em] text-subtle">
              <time dateTime={article.date}>
                {formatArticleDate(article.date)}
              </time>
              {article.series && <span>{article.series}</span>}
            </div>

            <h1 className="font-serif text-3xl font-medium leading-[1.65] tracking-[0.06em] text-foreground md:text-4xl">
              {article.title}
            </h1>
          </header>

          <MarkdownContent content={article.content} />

          <ArticleNav prev={prev} next={next} />
          <RelatedArticles articles={related} />

          <div className="mt-20 border-t border-border pt-16 md:mt-28 md:pt-20">
            <Link
              href="/thinking"
              className="text-[11px] tracking-[0.18em] text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
            >
              THINKING に戻る
            </Link>
          </div>
        </div>
      </article>
    </PageShell>
  );
}
