"use client";

import { useState } from "react";
import { newsletterContent } from "@/lib/content/newsletter";
import { submitNewsletterForm } from "@/lib/newsletter/submit-client";

const inputClass =
  "mt-2 w-full min-w-0 border-b border-border bg-transparent py-3 text-[15px] tracking-[0.02em] text-foreground outline-none transition-colors placeholder:text-subtle focus:border-foreground/30";

const labelClass = "block text-[11px] tracking-[0.18em] text-subtle";

const proseClass =
  "text-[15px] leading-[2.2] tracking-[0.04em] text-muted md:text-base";

export function ReaderSignup() {
  const { title, body, pdf, form } = newsletterContent;
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const pdfUrl = `/downloads/${pdf.filename}`;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const website = formData.get("website");

    try {
      const result = await submitNewsletterForm(
        email,
        typeof website === "string" ? website : "",
      );

      if (!result.ok) {
        setStatus("error");
        setErrorMessage(result.error);
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage(form.errorMessage);
    }
  };

  return (
    <section
      aria-labelledby="reader-signup-heading"
      className="border-b border-border"
    >
      <div className="mx-auto max-w-2xl px-6 py-24 text-center md:px-10 md:py-36">
        <h2
          id="reader-signup-heading"
          className="font-serif text-[clamp(1.5rem,4vw,2.25rem)] font-medium leading-[1.75] tracking-[0.06em] text-foreground"
        >
          {title}
        </h2>

        <div className="mx-auto my-10 h-px w-12 bg-border" />

        <div className="space-y-8">
          <div className="space-y-2">
            {body.opening.map((line) => (
              <p key={line} className={proseClass}>
                {line}
              </p>
            ))}
          </div>

          <p className={`${proseClass} pt-2`}>{body.transition}</p>

          <div className="space-y-2">
            {body.questions.map((line) => (
              <p key={line} className={proseClass}>
                {line}
              </p>
            ))}
          </div>

          <p className={`${proseClass} pt-2`}>{body.closing}</p>

          <div className="space-y-2 pt-4">
            {body.experience.map((line) => (
              <p key={line} className={proseClass}>
                {line}
              </p>
            ))}
          </div>

          <div className={`${proseClass} space-y-4 pt-4`}>
            <p>{body.letterIntro}</p>
            <ul className="space-y-2 text-left md:mx-auto md:max-w-xs">
              {body.themes.map((theme) => (
                <li key={theme} className="flex gap-3">
                  <span className="shrink-0" aria-hidden="true">
                    ・
                  </span>
                  <span>{theme}</span>
                </li>
              ))}
            </ul>
            <p>{body.letterClosing}</p>
          </div>

          <div className={`${proseClass} space-y-2 pt-4`}>
            <p>{body.pdfOffer.lead}</p>
            <p className="font-serif text-lg tracking-[0.04em] text-foreground md:text-xl">
              {body.pdfOffer.titleLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
            <p>{body.pdfOffer.suffix}</p>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-md border border-border px-8 py-8 text-left md:px-10 md:py-10">
          {status === "success" ? (
            <div>
              <p className="text-[15px] leading-[1.9] tracking-[0.02em] text-foreground/90 md:text-base md:leading-[2.2]">
                {form.successMessage}
              </p>
              <div className="mt-8">
                <a
                  href={pdfUrl}
                  download={pdf.filename}
                  className="inline-block border border-foreground/20 px-10 py-4 text-[11px] tracking-[0.2em] text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
                >
                  {pdf.downloadLabel}
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="reader-signup-email" className={labelClass}>
                  {form.emailLabel}
                </label>
                <input
                  id="reader-signup-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass}
                />
              </div>

              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
              />

              {status === "error" && errorMessage && (
                <p className="mt-8 text-sm tracking-[0.02em] text-muted" role="alert">
                  {errorMessage}
                </p>
              )}

              <div className="mt-10">
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="border border-foreground/20 px-10 py-4 text-[11px] tracking-[0.2em] text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "submitting" ? form.submittingLabel : form.submitLabel}
                </button>
                <p className="mt-4 text-[12px] leading-[1.9] tracking-[0.02em] text-subtle md:text-[13px]">
                  {form.frequencyNote}
                  <br />
                  {form.unsubscribeNote}
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
