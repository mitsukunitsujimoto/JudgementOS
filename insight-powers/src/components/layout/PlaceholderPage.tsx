import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";

type PlaceholderPageProps = {
  title: string;
  description: string;
  metadata: Metadata;
};

export function createPlaceholderPage({
  title,
  description,
  metadata,
}: PlaceholderPageProps) {
  return {
    metadata,
    Page: function PlaceholderPage() {
      return (
        <PageShell>
          <section className="flex min-h-[60vh] items-center border-b border-border">
            <div className="mx-auto w-full max-w-2xl px-6 py-32 md:px-10">
              <p className="mb-6 text-[11px] tracking-[0.24em] text-subtle">
                COMING SOON
              </p>
              <h1 className="mb-8 font-serif text-3xl tracking-[0.06em] text-foreground md:text-4xl">
                {title}
              </h1>
              <p className="mb-12 text-[15px] leading-[2.2] tracking-[0.02em] text-muted md:text-base">
                {description}
              </p>
              <Link
                href="/"
                className="text-[11px] tracking-[0.18em] text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
              >
                HOME に戻る
              </Link>
            </div>
          </section>
        </PageShell>
      );
    },
  };
}
