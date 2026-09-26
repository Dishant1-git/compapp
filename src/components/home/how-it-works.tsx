import { Container } from "@/components/ui/container";
import { SectionHeading } from "./section-heading";

const steps = [
  {
    title: "Create one account",
    description: "Sign up once and choose Stranger Trips, Companion, or both.",
  },
  {
    title: "Build your profile",
    description: "Add interests, travel style and verification to build trust.",
  },
  {
    title: "Connect and go",
    description: "Join a trip or match with a companion, then plan everything in-app.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 border-t bg-muted/40 py-16 sm:py-24">
      <Container>
        <SectionHeading eyebrow="How it works" title="Up and running in minutes" />

        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="rounded-xl border bg-card p-6 text-card-foreground sm:last:col-span-2 lg:last:col-span-1"
            >
              <span className="grid size-10 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
