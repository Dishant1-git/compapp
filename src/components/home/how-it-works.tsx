import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "./section-heading";

const steps = [
  {
    title: "One account",
    description: "Sign up once with your number or email. It opens Stranger Trips and Companion alike.",
  },
  {
    title: "A profile people trust",
    description: "Your interests and travel style, plus phone and live-selfie verification.",
  },
  {
    title: "Somewhere, with someone",
    description: "Join a group trip, find a travel buddy, or meet verified company near you.",
  },
];

export function HowItWorks() {
  return (
    <>
      {/* Manifesto band. */}
      <section className="grain relative isolate overflow-hidden">
        <Image
          src="/images/brand-friends-sunset.webp"
          alt="Four friends watching the sunset together"
          fill
          sizes="100vw"
          className="object-cover object-[50%_40%]"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-background via-background/40 to-background" />
        <Container className="relative z-10 py-32 sm:py-44 lg:py-56">
          <Reveal>
            <p className="max-w-4xl font-display text-4xl leading-[1.08] tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Travel with strangers.
              <br />
              <em className="text-highlight-ink">Find your people.</em>
            </p>
          </Reveal>
        </Container>
      </section>

      <section id="how-it-works" className="scroll-mt-16 py-20 sm:py-28 lg:py-36">
        <Container className="grid gap-14 lg:grid-cols-[5fr_7fr] lg:gap-24">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading eyebrow="How it works" title="Three steps, then the door." />
            <Reveal delay={150} className="relative mt-10 hidden aspect-[4/5] overflow-hidden rounded-xl lg:block">
              <Image
                src="/images/brand-solo-street.webp"
                alt="A traveller with a backpack walking down an old stone street"
                fill
                sizes="40vw"
                className="object-cover"
              />
            </Reveal>
          </div>

          <ol className="border-t">
            {steps.map((step, i) => (
              <Reveal key={step.title} as="li" delay={i * 120} className="grid grid-cols-[3.5rem_1fr] gap-4 border-b py-10 sm:grid-cols-[6rem_1fr] sm:py-14">
                <span className="font-display text-3xl text-highlight tabular-nums sm:text-5xl">0{i + 1}</span>
                <div>
                  <h3 className="font-display text-2xl tracking-tight sm:text-4xl">{step.title}</h3>
                  <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>
    </>
  );
}
