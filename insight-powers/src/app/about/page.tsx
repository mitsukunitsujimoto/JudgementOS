import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { AboutContent } from "@/components/about/AboutContent";

export const metadata: Metadata = {
  title: "ABOUT",
  description:
    "辻本光邦のプロフィールと思想。前提を照らし、問いを設計し、判断を引き受ける。AI時代に組織が向き合うべき本質的な変革について。",
};

export default function AboutPage() {
  return (
    <PageShell>
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
          <AboutContent />
        </div>
      </section>
    </PageShell>
  );
}
