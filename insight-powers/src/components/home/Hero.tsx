import { homeContent } from "@/lib/content/home";

export function Hero() {
  const { lines, subtitle } = homeContent.hero;

  return (
    <section
      aria-labelledby="hero-heading"
      className="flex items-start border-b border-border md:min-h-[85vh] md:items-end"
    >
      <div className="mx-auto w-full max-w-6xl px-6 pb-14 pt-2 md:px-10 md:pb-32 md:pt-40">
        <p className="mb-8 hidden text-[11px] tracking-[0.24em] text-subtle animate-fade-up md:block">
          INSIGHT POWERS
        </p>
        <h1
          id="hero-heading"
          className="font-serif text-[clamp(1.75rem,5vw,3.25rem)] font-medium leading-[1.65] tracking-[0.04em] text-foreground"
        >
          {lines.map((line, index) => (
            <span
              key={line}
              className={`block animate-fade-up ${index === 1 ? "animate-delay-1" : ""}`}
            >
              {line}
            </span>
          ))}
        </h1>
        <p className="mt-10 max-w-xl text-[15px] leading-[2] tracking-[0.04em] text-muted animate-fade-up animate-delay-2 md:mt-12 md:text-base">
          {subtitle}
        </p>
        <div className="mt-11 h-px w-12 bg-border animate-fade-up animate-delay-3 md:mt-16" />
      </div>
    </section>
  );
}
