"use client";

import { useState } from "react";
import { trackContactFormSuccess } from "@/lib/analytics/events";
import { submitContactForm } from "@/lib/contact/submit-client";
import { contactContent } from "@/lib/content/contact";

const inputClass =
  "mt-2 w-full min-w-0 border-b border-border bg-transparent py-3 text-[15px] tracking-[0.02em] text-foreground outline-none transition-colors placeholder:text-subtle focus:border-foreground/30";

const labelClass = "block text-[11px] tracking-[0.18em] text-subtle";

type FormState = {
  name: string;
  company: string;
  email: string;
  theme: string;
  message: string;
};

const initialState: FormState = {
  name: "",
  company: "",
  email: "",
  theme: "",
  message: "",
};

export function ContactForm() {
  const { themes, form } = contactContent;
  const [values, setValues] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const website = formData.get("website");

    try {
      const result = await submitContactForm(
        values,
        typeof website === "string" ? website : "",
      );

      if (!result.ok) {
        setStatus("error");
        setErrorMessage(result.error);
        return;
      }

      setStatus("success");
      trackContactFormSuccess();
      setValues(initialState);
    } catch {
      setStatus("error");
      setErrorMessage("送信に失敗しました。時間をおいて再度お試しください。");
    }
  };

  if (status === "success") {
    return (
      <div className="border-t border-border pt-10 md:pt-12">
        <p className="text-[15px] leading-[1.9] tracking-[0.02em] text-foreground/90 md:text-base md:leading-[2.2]">
          {form.successMessage}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border pt-10 md:pt-12"
      noValidate
    >
      <div className="space-y-8 md:space-y-10">
        <div>
          <label htmlFor="name" className={labelClass}>
            お名前
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            value={values.name}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="company" className={labelClass}>
            会社名
          </label>
          <input
            id="company"
            name="company"
            type="text"
            required
            autoComplete="organization"
            value={values.company}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            メールアドレス
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={values.email}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="theme" className={labelClass}>
            ご相談テーマ
          </label>
          <select
            id="theme"
            name="theme"
            required
            value={values.theme}
            onChange={handleChange}
            className={`${inputClass} cursor-pointer appearance-none`}
          >
            <option value="">選択してください</option>
            {themes.map((theme) => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
            <option value={form.otherThemeLabel}>{form.otherThemeLabel}</option>
          </select>
        </div>

        <div>
          <label htmlFor="message" className={labelClass}>
            お問い合わせ内容
          </label>
          <div className="mt-4 space-y-4">
            <div className="space-y-1 text-[13px] leading-[1.9] tracking-[0.02em] text-muted md:text-sm">
              {form.messageIntro.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div className="text-[13px] leading-[1.9] tracking-[0.02em] text-subtle md:text-sm">
              <p className="mb-2">例：</p>
              <ul className="space-y-1">
                {form.messageExamples.map((example) => (
                  <li key={example} className="flex gap-2">
                    <span aria-hidden="true">・</span>
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <textarea
            id="message"
            name="message"
            required
            rows={2}
            value={values.message}
            onChange={handleChange}
            className={`${inputClass} mt-4 resize-y leading-[2]`}
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
      </div>

      {status === "error" && errorMessage && (
        <p className="mt-8 text-sm tracking-[0.02em] text-muted" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="mt-10 md:mt-12">
        <p className="mb-6 text-[13px] leading-[1.9] tracking-[0.02em] text-muted md:mb-8 md:text-sm">
          {form.replyNote}
        </p>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="border border-foreground/20 px-10 py-4 text-[11px] tracking-[0.2em] text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "submitting" ? "送信中..." : form.submitLabel}
        </button>
      </div>
    </form>
  );
}
