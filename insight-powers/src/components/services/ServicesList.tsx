import Link from "next/link";
import { servicesContent } from "@/lib/content/services";

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] leading-[2.2] tracking-[0.02em] text-foreground/90 md:text-base">
      {children}
    </p>
  );
}

export function ServicesList() {
  const { services } = servicesContent;

  return (
    <div className="space-y-0">
      {services.map((service, index) => (
        <article
          key={service.id}
          className="border-t border-border py-16 first:border-t-0 first:pt-0 md:py-24"
        >
          <p className="mb-6 text-[11px] tracking-[0.2em] text-subtle">
            {String(index + 1).padStart(2, "0")}
          </p>

          <h2 className="mb-4 font-serif text-2xl tracking-[0.06em] text-foreground md:text-3xl">
            {service.title}
          </h2>

          <p className="mb-12 max-w-2xl text-[15px] leading-[2] tracking-[0.02em] text-muted md:mb-16 md:text-base">
            {service.subtitle}
          </p>

          <div className="max-w-2xl space-y-8">
            {"opening" in service && service.opening && (
              <div className="space-y-2">
                {service.opening.map((line) => (
                  <p
                    key={line}
                    className="font-serif text-lg tracking-[0.04em] text-foreground md:text-xl"
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}

            {"lead" in service && service.lead && <Prose>{service.lead}</Prose>}

            {"process" in service && service.process && (
              <div className="space-y-3 border-l border-foreground/15 py-1 pl-8">
                {service.process.map((item) => (
                  <p
                    key={item}
                    className="font-serif text-lg tracking-[0.04em] text-foreground md:text-xl"
                  >
                    {item}
                  </p>
                ))}
              </div>
            )}

            {"body" in service && service.body && <Prose>{service.body}</Prose>}

            {"topics" in service && service.topics && (
              <div className="space-y-2">
                {service.topics.map((topic) => (
                  <p
                    key={topic}
                    className="font-serif text-lg tracking-[0.04em] text-foreground md:text-xl"
                  >
                    {topic}
                  </p>
                ))}
              </div>
            )}

            {"paragraphs" in service &&
              service.paragraphs?.map((paragraph) => (
                <Prose key={paragraph.slice(0, 24)}>{paragraph}</Prose>
              ))}

            {"notes" in service && service.notes && (
              <div className="space-y-2 pt-4">
                {service.notes.map((note) => (
                  <p
                    key={note}
                    className="text-sm tracking-[0.04em] text-muted md:text-[15px]"
                  >
                    {note}
                  </p>
                ))}
              </div>
            )}

            {"themes" in service && service.themes && (
              <div className="space-y-6 pt-4">
                <p className="text-[11px] tracking-[0.2em] text-subtle">
                  {service.themesLabel}
                </p>
                <ul className="space-y-3">
                  {service.themes.map((theme) => (
                    <li
                      key={theme}
                      className="flex gap-4 text-[15px] leading-[2] tracking-[0.02em] text-foreground/90 md:text-base"
                    >
                      <span className="shrink-0 text-subtle" aria-hidden="true">
                        ・
                      </span>
                      <span>{theme}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function ServicesContact() {
  return (
    <div className="mt-20 border-t border-border pt-16 md:mt-28 md:pt-20">
      <Link
        href="/contact"
        className="text-[11px] tracking-[0.18em] text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
      >
        CONTACT
      </Link>
    </div>
  );
}
