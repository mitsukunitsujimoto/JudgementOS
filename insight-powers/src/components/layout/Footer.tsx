import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16 md:flex-row md:items-end md:justify-between md:px-10 md:py-20">
        <div className="space-y-3">
          <p className="font-serif text-sm tracking-[0.2em] text-foreground">
            {siteConfig.nameEn}
          </p>
          <p className="text-xs tracking-wide text-muted">{siteConfig.name}</p>
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            {siteConfig.tagline}
          </p>
        </div>

        <div className="flex flex-col gap-4 md:items-end">
          <Link
            href="/contact"
            className="text-xs tracking-[0.16em] text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
          >
            お問い合わせ
          </Link>
          <p className="text-[11px] text-subtle">
            © {new Date().getFullYear()} Insight Powers. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
