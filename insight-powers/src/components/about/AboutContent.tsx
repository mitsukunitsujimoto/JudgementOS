import Link from "next/link";
import { aboutContent, type AboutBlock } from "@/lib/content/about";

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] leading-[1.9] tracking-[0.02em] text-foreground/90 md:text-base md:leading-[2.2]">
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
    <div className="space-y-3 border-l border-foreground/15 py-1 pl-6 md:pl-8">
      {items.map((item) => (
        <Emphasis key={item}>{item}</Emphasis>
      ))}
    </div>
  );
}

function SectionBlocks({ blocks }: { blocks: readonly AboutBlock[] }) {
  return (
    <div className="space-y-6 md:space-y-8">
      {blocks.map((block, index) => {
        if (block.type === "prose") {
          return <Prose key={`${index}-${block.text.slice(0, 16)}`}>{block.text}</Prose>;
        }
        return <EmphasisList key={`${index}-emphasis`} items={block.items} />;
      })}
    </div>
  );
}

export function AboutContent() {
  const { label, name, nameReading, profile, sections } = aboutContent;

  return (
    <>
      <header className="mb-16 border-b border-border pb-16 md:mb-20 md:pb-20">
        <p className="mb-6 text-[11px] tracking-[0.24em] text-subtle">{label}</p>
        <h1 className="mb-10 font-serif text-3xl tracking-[0.08em] text-foreground md:mb-12 md:text-4xl">
          {name}
          <span className="text-[0.72em] font-normal tracking-[0.06em] text-foreground/70">
            （{nameReading}）
          </span>
        </h1>
        <div className="max-w-2xl space-y-6 md:space-y-8">
          {profile.map((paragraph) => (
            <Prose key={paragraph}>{paragraph}</Prose>
          ))}
        </div>
      </header>

      <div className="space-y-0">
        {sections.map((section, index) => (
          <article
            key={section.id}
            className="border-t border-border py-16 first:border-t-0 first:pt-0 md:py-24"
          >
            <p className="mb-6 text-[11px] tracking-[0.2em] text-subtle">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h2 className="mb-10 font-serif text-2xl tracking-[0.06em] text-foreground md:mb-14 md:text-3xl">
              {section.title}
            </h2>

            <div className="max-w-2xl">
              <SectionBlocks blocks={section.blocks} />
            </div>
          </article>
        ))}
      </div>

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
