import Link from "next/link";
import { thinkingContent } from "@/lib/content/thinking";
import { SeriesList } from "./SeriesList";

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

export function ThinkingContent() {
  const { pillars, closingHeading, series } = thinkingContent;

  return (
    <>
      <header className="mb-16 border-b border-border pb-16 md:mb-20 md:pb-20">
        <p className="mb-6 text-[11px] tracking-[0.24em] text-subtle">
          THINKING
        </p>
        <h1 className="font-serif text-3xl tracking-[0.06em] text-foreground md:text-4xl">
          思想
        </h1>
      </header>

      <div className="space-y-0">
        {pillars.map((pillar, index) => (
          <article
            key={pillar.id}
            className="border-t border-border py-16 first:border-t-0 first:pt-0 md:py-24"
          >
            <p className="mb-6 text-[11px] tracking-[0.2em] text-subtle">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h2 className="mb-12 font-serif text-2xl tracking-[0.06em] text-foreground md:mb-16 md:text-3xl">
              {pillar.title}
            </h2>

            <div className="max-w-2xl space-y-8">
              {"paragraphs" in pillar &&
                pillar.paragraphs?.map((paragraph) => (
                  <Prose key={paragraph.slice(0, 24)}>{paragraph}</Prose>
                ))}

              {"opening" in pillar && pillar.opening && (
                <div className="space-y-2">
                  {pillar.opening.map((line) => (
                    <Emphasis key={line}>{line}</Emphasis>
                  ))}
                </div>
              )}

              {"emphasis" in pillar && pillar.emphasis && (
                <EmphasisList items={pillar.emphasis} />
              )}

              {"closing" in pillar &&
                pillar.closing?.map((paragraph) => (
                  <Prose key={paragraph.slice(0, 24)}>{paragraph}</Prose>
                ))}
            </div>
          </article>
        ))}
      </div>

      <div className="border-t border-border py-16 md:py-24">
        <h2 className="max-w-2xl font-serif text-2xl tracking-[0.06em] text-foreground md:text-3xl">
          {closingHeading}
        </h2>
      </div>

      {series.map((item) => (
        <SeriesList key={item.id} series={item} />
      ))}

      <div className="mt-20 border-t border-border pt-16 md:mt-28 md:pt-20">
        <Link
          href="/contact"
          className="text-[11px] tracking-[0.18em] text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
        >
          CONTACT
        </Link>
      </div>
    </>
  );
}
