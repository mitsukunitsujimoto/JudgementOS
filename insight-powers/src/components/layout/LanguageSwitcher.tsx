"use client";

import { useState } from "react";

export type Locale = "ja" | "en";

const locales: { code: Locale; label: string }[] = [
  { code: "ja", label: "JPN" },
  { code: "en", label: "EN" },
];

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const [locale, setLocale] = useState<Locale>("ja");

  return (
    <div
      role="group"
      aria-label="言語切り替え"
      className={`flex items-center gap-2 ${className}`}
    >
      {locales.map((item, index) => (
        <span key={item.code} className="flex items-center gap-2">
          {index > 0 && (
            <span className="text-subtle" aria-hidden="true">
              /
            </span>
          )}
          <button
            type="button"
            onClick={() => setLocale(item.code)}
            disabled={item.code === "en"}
            aria-current={locale === item.code ? "true" : undefined}
            aria-disabled={item.code === "en" ? true : undefined}
            title={item.code === "en" ? "English version coming soon" : undefined}
            className={
              locale === item.code
                ? "text-foreground transition-colors"
                : item.code === "en"
                  ? "cursor-not-allowed text-subtle"
                  : "text-muted transition-colors hover:text-foreground"
            }
          >
            {item.label}
          </button>
        </span>
      ))}
    </div>
  );
}
