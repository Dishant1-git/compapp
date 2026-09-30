import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function CtaSection() {
  return (
    <section className="border-t py-24 sm:py-32 lg:py-40">
      <Container>
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="eyebrow text-highlight">Free to join</p>
          <h2 className="mt-6 text-4xl leading-[1.05] font-medium tracking-tight text-balance sm:text-6xl">
            Your next story starts with a <em className="text-highlight-ink">stranger.</em>
          </h2>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <ButtonLink href="/register" size="lg">
              Create your account
            </ButtonLink>
            <ButtonLink href="/login" variant="outline" size="lg">
              I already have one
            </ButtonLink>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
