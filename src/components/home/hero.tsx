import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/** Full-screen opener: night sky, slow push-in, editorial headline. */
export function Hero() {
  return (
    <section className="grain relative flex min-h-[100svh] items-end overflow-hidden">
      <Image
        src="/images/brand-night-sky.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="drift object-cover object-[50%_35%]"
      />
      {/* Keeps the headline readable and melts the photo into the page. */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/20" />

      <Container className="relative z-10 pt-32 pb-14 sm:pb-20 lg:pb-24">
        <p className="reveal eyebrow text-highlight">Places &amp; people · One account</p>
        <h1
          className="reveal mt-5 max-w-4xl text-[2.9rem] leading-[1.02] font-medium tracking-tight text-balance sm:text-7xl lg:text-[5.75rem]"
          style={{ "--delay": "150ms" } as React.CSSProperties}
        >
          Meet somewhere <em className="text-highlight-ink">unexpected.</em>
        </h1>
        <p
          className="reveal mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg"
          style={{ "--delay": "300ms" } as React.CSSProperties}
        >
          Travel with strangers. Find your people. Group trips with travellers going your way, and
          verified company for everything in between.
        </p>
        <div
          className="reveal mt-9 flex flex-col gap-3 sm:flex-row"
          style={{ "--delay": "450ms" } as React.CSSProperties}
        >
          <ButtonLink href="/trips" size="lg">
            Explore Stranger Trips
          </ButtonLink>
          <ButtonLink href="/companion" variant="outline" size="lg">
            Join Companion
          </ButtonLink>
        </div>
      </Container>

      <a
        href="#platforms"
        className="absolute right-8 bottom-10 z-10 hidden flex-col items-center gap-3 text-muted-foreground transition-colors hover:text-foreground lg:flex"
      >
        <span className="eyebrow [writing-mode:vertical-rl]">Scroll</span>
        <span aria-hidden className="h-14 w-px bg-current opacity-50" />
      </a>
    </section>
  );
}
