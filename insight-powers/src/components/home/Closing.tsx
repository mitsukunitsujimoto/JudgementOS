import Link from "next/link";
import { homeContent } from "@/lib/content/home";

export function Profile() {
  const { profile } = homeContent;

  return (
    <section
      aria-labelledby="profile-heading"
      className="border-b border-border"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
        <div className="grid gap-16 md:grid-cols-[1fr_2fr] md:gap-20">
          <div>
            <p className="mb-4 text-[11px] tracking-[0.2em] text-subtle">
              REPRESENTATIVE
            </p>
            <h2
              id="profile-heading"
              className="font-serif text-2xl tracking-[0.08em] text-foreground md:text-3xl"
            >
              {profile.name}
            </h2>
          </div>

          <div className="space-y-8">
            <div className="text-[15px] leading-[2.2] tracking-[0.02em] text-foreground/90 md:text-base">
              {profile.career.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </div>

            <p className="text-[15px] leading-[2.2] tracking-[0.02em] text-foreground/90 md:text-base">
              {profile.experience}
            </p>

            <div className="space-y-8">
              {profile.reflection.map((paragraph) => {
                const isEmphasis =
                  paragraph === "何を問うのかである。" ||
                  paragraph === "私たちは、その問いを顧客とともに創造する。";

                return (
                  <p
                    key={paragraph.slice(0, 24)}
                    className={
                      isEmphasis
                        ? "font-serif text-lg tracking-[0.04em] text-foreground md:text-xl"
                        : "text-[15px] leading-[2.2] tracking-[0.02em] text-foreground/90 md:text-base"
                    }
                  >
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Closing() {
  const { closing } = homeContent;

  return (
    <section
      aria-labelledby="closing-heading"
      className="border-b border-border"
    >
      <div className="mx-auto max-w-2xl px-6 py-24 text-center md:px-10 md:py-36">
        <h2
          id="closing-heading"
          className="font-serif text-[clamp(1.5rem,4vw,2.5rem)] font-medium leading-[1.75] tracking-[0.06em] text-foreground"
        >
          {closing.lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h2>

        <div className="mx-auto my-12 h-px w-12 bg-border" />

        <div className="space-y-6">
          {closing.paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="text-[15px] leading-[2.2] tracking-[0.04em] text-muted md:text-base"
            >
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-16">
          <Link
            href="/contact"
            className="inline-block border border-foreground/20 px-10 py-4 text-[11px] tracking-[0.2em] text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
          >
            CONTACT
          </Link>
        </div>
      </div>
    </section>
  );
}
