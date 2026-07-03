import { contactContent } from "@/lib/content/contact";
import { ContactForm } from "./ContactForm";
import { WhyDialogueSection } from "./WhyDialogueSection";

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] leading-[1.9] tracking-[0.02em] text-foreground/90 md:text-base md:leading-[2.2]">
      {children}
    </p>
  );
}

export function ContactContent() {
  const {
    label,
    title,
    paragraphs,
    clientsLabel,
    clientsText,
    themesLabel,
    themes,
    email,
    companyInfo,
  } = contactContent;

  return (
    <div className="max-w-2xl">
      <header className="mb-12 border-b border-border pb-12 md:mb-16 md:pb-16">
        <p className="mb-6 text-[11px] tracking-[0.24em] text-subtle">{label}</p>
        <h1 className="font-serif text-3xl tracking-[0.06em] text-foreground md:text-4xl">
          {title}
        </h1>
      </header>

      <div className="space-y-6 md:space-y-8">
        {paragraphs.map((paragraph) => (
          <Prose key={paragraph}>{paragraph}</Prose>
        ))}
      </div>

      <section className="mt-12 border-t border-border pt-12 md:mt-16 md:pt-16">
        <p className="mb-6 text-[11px] tracking-[0.2em] text-subtle md:mb-8">
          {clientsLabel}
        </p>
        <Prose>{clientsText}</Prose>

        <p className="mb-6 mt-12 text-[11px] tracking-[0.2em] text-subtle md:mb-8 md:mt-16">
          {themesLabel}
        </p>
        <ul className="space-y-2.5 md:space-y-3">
          {themes.map((theme) => (
            <li
              key={theme}
              className="flex gap-4 text-[15px] leading-[1.9] tracking-[0.02em] text-muted md:text-base md:leading-[2]"
            >
              <span className="shrink-0 text-subtle" aria-hidden="true">
                ・
              </span>
              <span>{theme}</span>
            </li>
          ))}
        </ul>
      </section>

      <WhyDialogueSection />
      <ContactForm />

      <footer className="mt-12 border-t border-border pt-10 md:mt-16 md:pt-12">
        <div className="space-y-8 text-[15px] leading-[1.9] tracking-[0.02em] text-muted md:text-base md:leading-[2.2]">
          <p>{companyInfo.name}</p>

          <address className="not-italic">
            <p>{companyInfo.postalCode}</p>
            {companyInfo.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </address>

          <div>
            <p>{companyInfo.representative.role}</p>
            <p>{companyInfo.representative.name}</p>
          </div>

          <div>
            <p>{companyInfo.contactLabel}</p>
            <p>
              <a
                href={`mailto:${email}`}
                className="transition-opacity hover:opacity-70"
              >
                {email}
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
