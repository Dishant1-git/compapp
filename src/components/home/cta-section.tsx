import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export function CtaSection() {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="rounded-xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12 sm:py-16">
          <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Ready for your next adventure?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty opacity-80 sm:text-lg">
            Join free today and start connecting with people who want to go
            where you&apos;re going.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <ButtonLink href="/register" variant="secondary" size="lg">
              Create free account
            </ButtonLink>
            <ButtonLink
              href="/login"
              size="lg"
              className="border border-primary-foreground/30 hover:bg-primary-foreground/10"
            >
              I already have an account
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
