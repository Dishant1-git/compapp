import { CtaSection } from "@/components/home/cta-section";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { PlatformsSection } from "@/components/home/platforms-section";

export default function HomePage() {
  return (
    <>
      <Hero />
      <PlatformsSection />
      <HowItWorks />
      <CtaSection />
    </>
  );
}
