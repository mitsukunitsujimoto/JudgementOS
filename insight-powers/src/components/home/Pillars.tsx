import { homeContent } from "@/lib/content/home";

export function Pillars() {
  const { pillars } = homeContent;

  return (
    <section aria-labelledby="pillars-heading" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
        <h2 id="pillars-heading" className="sr-only">
          私たちの役割
        </h2>

        <div className="grid gap-px bg-border md:grid-cols-2">
          {pillars.map((pillar, index) => (
            <article
              key={pillar.id}
              className="bg-background px-8 py-12 md:px-12 md:py-16"
            >
              <p className="mb-6 text-[11px] tracking-[0.2em] text-subtle">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mb-8 font-serif text-xl tracking-[0.06em] text-foreground md:text-2xl">
                {pillar.title}
              </h3>
              <div className="space-y-6">
                {pillar.body.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 20)}
                    className="text-[15px] leading-[2.1] tracking-[0.02em] text-muted md:text-base"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
