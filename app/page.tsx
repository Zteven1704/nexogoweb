import { Features } from "@/components/Features";
import { FinalCta } from "@/components/FinalCta";
import { Hero } from "@/components/Hero";
import { PlatformConcept } from "@/components/PlatformConcept";
import { Security } from "@/components/Security";
import { Sectors } from "@/components/Sectors";
import { SiteShell } from "@/components/SiteShell";
import { Vision } from "@/components/Vision";

export default function HomePage() {
  return (
    <SiteShell>
      <Hero />
      <PlatformConcept />
      <Features />
      <Sectors />
      <Security />
      <Vision />
      <FinalCta />
    </SiteShell>
  );
}
