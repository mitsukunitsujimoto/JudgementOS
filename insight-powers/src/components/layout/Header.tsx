import Link from "next/link";
import { navItems, siteConfig } from "@/lib/site";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";

const navLinkClass =
  "text-[11px] tracking-[0.18em] text-muted transition-colors hover:text-foreground";

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:h-20 md:px-10">
        <Link
          href="/"
          className="group flex shrink-0 flex-col gap-0.5 transition-opacity hover:opacity-70"
        >
          <span className="font-serif text-sm tracking-[0.2em] text-foreground md:text-base">
            {siteConfig.nameEn}
          </span>
          <span className="text-[10px] tracking-[0.12em] text-muted md:text-[11px]">
            {siteConfig.name}
          </span>
        </Link>

        <div className="hidden items-center gap-10 md:flex">
          <nav aria-label="メインナビゲーション">
            <ul className="flex items-center gap-8">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={navLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <LanguageSwitcher className="text-[11px] tracking-[0.18em]" />
        </div>

        <MobileMenu />
      </div>
    </header>
  );
}
