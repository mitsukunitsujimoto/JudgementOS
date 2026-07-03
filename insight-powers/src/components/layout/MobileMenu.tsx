"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { navItems } from "@/lib/site";
import { LanguageSwitcher } from "./LanguageSwitcher";

const navLinkClass =
  "block py-3 font-serif text-lg tracking-[0.08em] text-foreground transition-colors hover:text-muted";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        aria-label={open ? "メニューを閉じる" : "メニューを開く"}
        className="flex h-10 w-10 items-center justify-center text-foreground transition-opacity hover:opacity-70"
      >
        <span className="relative block h-3 w-5">
          <span
            className={`absolute left-0 block h-px w-full bg-foreground transition-all duration-300 ${
              open ? "top-[5px] rotate-45" : "top-0"
            }`}
          />
          <span
            className={`absolute left-0 top-[5px] block h-px w-full bg-foreground transition-all duration-300 ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute left-0 block h-px w-full bg-foreground transition-all duration-300 ${
              open ? "top-[5px] -rotate-45" : "top-[10px]"
            }`}
          />
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 top-16 z-40 bg-background/95 backdrop-blur-md"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      <nav
        id="mobile-navigation"
        aria-label="モバイルナビゲーション"
        className={`fixed inset-x-0 top-16 z-50 border-b border-border bg-background/95 backdrop-blur-md transition-all duration-300 ${
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-2 opacity-0 pointer-events-none"
        }`}
      >
        <ul className="mx-auto max-w-6xl px-6 py-6">
          {navItems.map((item) => (
            <li key={item.href} className="border-b border-border last:border-b-0">
              <Link
                href={item.href}
                className={navLinkClass}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-6 py-5">
          <LanguageSwitcher className="text-[11px] tracking-[0.18em]" />
        </div>
      </nav>
    </div>
  );
}
