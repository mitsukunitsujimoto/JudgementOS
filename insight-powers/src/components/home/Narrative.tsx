import { homeContent } from "@/lib/content/home";

function ProseSection({
  children,
  className = "",
  contentClassName = "",
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={`border-b border-border ${className}`}>
      <div
        className={`mx-auto max-w-2xl px-6 py-20 md:px-10 md:py-28 ${contentClassName}`}
      >
        {children}
      </div>
    </section>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] leading-[2.2] tracking-[0.02em] text-foreground/90 md:text-base">
      {children}
    </p>
  );
}

export function Narrative() {
  const { opening, middle } = homeContent;

  return (
    <>
      <ProseSection contentClassName="pt-14 pb-20 md:pt-28 md:pb-28">
        <blockquote className="mb-12 font-serif text-xl leading-relaxed tracking-[0.04em] text-foreground md:text-2xl">
          {opening.quote}
        </blockquote>

        <div className="space-y-8">
          {opening.paragraphs.map((paragraph) => (
            <Paragraph key={paragraph.slice(0, 24)}>{paragraph}</Paragraph>
          ))}
        </div>
      </ProseSection>

      <ProseSection>
        <div className="space-y-10">
          <Paragraph>{opening.thesis.intro}</Paragraph>
          <div className="space-y-2">
            <p className="font-serif text-lg tracking-[0.04em] text-subtle line-through decoration-border md:text-xl">
              {opening.thesis.wrong}
            </p>
            <p className="text-sm tracking-[0.02em] text-muted">
              {opening.thesis.wrongSuffix}
            </p>
          </div>
          <div className="space-y-2 border-l border-foreground/15 pl-8">
            <p className="font-serif text-2xl leading-relaxed tracking-[0.06em] text-foreground md:text-3xl">
              {opening.thesis.right}
            </p>
            <p className="text-sm tracking-[0.02em] text-muted">
              {opening.thesis.rightSuffix}
            </p>
          </div>
        </div>
      </ProseSection>

      <ProseSection>
        <div className="space-y-8">
          {middle.paragraphs.map((paragraph) => (
            <Paragraph key={paragraph.slice(0, 24)}>{paragraph}</Paragraph>
          ))}
        </div>
      </ProseSection>
    </>
  );
}
