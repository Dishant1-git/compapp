import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site-config";

export function Hero() {
  return (
    <section className="py-16 sm:py-20 lg:py-28">
      <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="text-center lg:text-left">
          <p className="inline-flex rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground sm:text-sm">
            One account · Two platforms
          </p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Travel with new people. Never go alone.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg lg:mx-0">
            {siteConfig.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <ButtonLink href="/register" size="lg">
              Get started — it&apos;s free
            </ButtonLink>
            <ButtonLink href="/#platforms" variant="outline" size="lg">
              Explore platforms
            </ButtonLink>
          </div>
        </div>

        <HeroVisual />
      </Container>
    </section>
  );
}

/** Placeholder illustration: swap for real imagery once branding is decided. */
function HeroVisual() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="aspect-[4/3] rounded-xl border bg-muted" />
      <div className="absolute -bottom-6 left-4 w-52 rounded-lg border bg-card p-4 shadow-lg sm:left-8 sm:w-60">
        <div className="h-3 w-24 rounded bg-accent" />
        <div className="mt-3 h-2 w-full rounded bg-muted" />
        <div className="mt-2 h-2 w-2/3 rounded bg-muted" />
      </div>
      <div className="absolute -top-6 right-4 w-44 rounded-lg border bg-card p-4 shadow-lg sm:right-8 sm:w-52">
        <div className="flex items-center gap-3">
          <div className="size-9 shrink-0 rounded-full bg-accent" />
          <div className="flex-1 space-y-2">
            <div className="h-2 w-full rounded bg-muted" />
            <div className="h-2 w-1/2 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
