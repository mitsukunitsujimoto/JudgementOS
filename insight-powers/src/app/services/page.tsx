import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ServicesContact, ServicesList } from "@/components/services/ServicesList";

export const metadata: Metadata = {
  title: "SERVICES",
  description:
    "意思決定変革プログラム、エグゼクティブ意思決定支援、講演・研修。",
};

export default function ServicesPage() {
  return (
    <PageShell>
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
          <p className="mb-6 text-[11px] tracking-[0.24em] text-subtle">
            SERVICES
          </p>
          <h1 className="mb-16 font-serif text-3xl tracking-[0.06em] text-foreground md:mb-20 md:text-4xl">
            サービス
          </h1>

          <ServicesList />
          <ServicesContact />
        </div>
      </section>
    </PageShell>
  );
}
