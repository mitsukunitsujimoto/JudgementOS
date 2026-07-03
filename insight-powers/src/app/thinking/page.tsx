import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ThinkingContent } from "@/components/thinking/ThinkingContent";

export const metadata: Metadata = {
  title: "THINKING",
  description:
    "前提を照らす、問いを創造する、判断を引き受ける、組織知へ昇華する——思想と連載一覧。",
};

export default function ThinkingPage() {
  return (
    <PageShell>
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
          <ThinkingContent />
        </div>
      </section>
    </PageShell>
  );
}
