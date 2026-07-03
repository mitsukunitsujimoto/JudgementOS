import { PageShell } from "@/components/layout/PageShell";
import { Hero } from "@/components/home/Hero";
import { Narrative } from "@/components/home/Narrative";
import { Pillars } from "@/components/home/Pillars";
import { Profile, Closing } from "@/components/home/Closing";
import { ReaderSignup } from "@/components/home/ReaderSignup";

export default function HomePage() {
  return (
    <PageShell>
      <Hero />
      <Narrative />
      <Pillars />
      <Profile />
      <ReaderSignup />
      <Closing />
    </PageShell>
  );
}
