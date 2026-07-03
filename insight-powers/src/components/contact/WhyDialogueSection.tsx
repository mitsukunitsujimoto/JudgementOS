import { contactContent } from "@/lib/content/contact";

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] leading-[1.9] tracking-[0.02em] text-foreground/90 md:text-base md:leading-[2.2]">
      {children}
    </p>
  );
}

function OpeningLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-serif text-[1.25rem] font-medium leading-[1.7] tracking-[0.04em] text-foreground md:text-[1.375rem] md:leading-[1.75]">
      {children}
    </p>
  );
}

export function WhyDialogueSection() {
  const { whyDialogue } = contactContent;
  const {
    title,
    opening,
    lead,
    question,
    leadAfter,
    body,
    closingLead,
    closing,
  } = whyDialogue;

  return (
    <section
      aria-labelledby="why-dialogue-heading"
      className="border-t border-border pt-12 md:pt-16"
    >
      <h2
        id="why-dialogue-heading"
        className="mb-8 font-serif text-xl tracking-[0.06em] text-foreground md:mb-10 md:text-2xl"
      >
        {title}
      </h2>

      <div className="space-y-6 md:space-y-8">
        <div className="space-y-3">
          {opening.map((line) => (
            <OpeningLine key={line}>{line}</OpeningLine>
          ))}
        </div>

        <div className="space-y-6">
          <div>
            {lead.map((line) => (
              <Prose key={line}>{line}</Prose>
            ))}
          </div>
          <p className="border-l border-foreground/15 pl-6 font-serif text-lg tracking-[0.06em] text-foreground md:text-xl">
            {question}
          </p>
          <Prose>{leadAfter}</Prose>
        </div>

        <div className="space-y-4">
          {body.map((paragraph) => (
            <Prose key={paragraph}>{paragraph}</Prose>
          ))}
        </div>

        <div className="space-y-4">
          <Prose>{closingLead}</Prose>
          <Prose>{closing}</Prose>
        </div>
      </div>
    </section>
  );
}
