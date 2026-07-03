import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ContactContent } from "@/components/contact/ContactContent";

export const metadata: Metadata = {
  title: "CONTACT",
  description:
    "経営課題、組織課題、意思決定の悩み。前提を照らす対話を始める場所。",
};

export default function ContactPage() {
  return (
    <PageShell>
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
          <ContactContent />
        </div>
      </section>
    </PageShell>
  );
}
