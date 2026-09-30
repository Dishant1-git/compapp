import type { Metadata } from "next";
import Image from "next/image";
import { EmptyState } from "@/components/trips/page-header";
import { TripCard } from "@/components/trips/trip-card";
import { TripFilters } from "@/components/trips/trip-filters";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { requireUser } from "@/lib/auth/dal";
import { isPersonality } from "@/lib/trips/constants";
import { listOrigins, listTrips, type TripFilters as Filters } from "@/lib/trips/queries";

export const metadata: Metadata = {
  title: "Explore trips",
};

function param(value: string | string[] | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() || undefined;
}

export default async function TripsPage({ searchParams }: PageProps<"/trips">) {
  const params = await searchParams;
  const vibe = param(params.vibe);
  const maxPrice = Number(param(params.maxPrice));
  const filters: Filters = {
    q: param(params.q),
    from: param(params.from),
    month: param(params.month),
    maxPrice: Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : undefined,
    vibe: vibe && isPersonality(vibe) ? vibe : undefined,
  };

  const query = new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
  ).toString();
  const user = await requireUser(query ? `/trips?${query}` : "/trips");
  const [trips, origins] = await Promise.all([listTrips(filters, user), listOrigins()]);

  return (
    <Container>
      {/* Editorial opener: the one big photo in Trips. */}
      <header className="relative mt-4 overflow-hidden rounded-xl sm:mt-6">
        <Image
          src="/images/trips-hikers.webp"
          alt="Friends laughing on a mountain trail"
          fill
          priority
          sizes="(min-width: 1280px) 1216px, 100vw"
          className="object-cover object-[50%_30%]"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#17251f]/90 via-[#17251f]/55 to-[#17251f]/10 sm:bg-gradient-to-r sm:from-[#17251f]/85 sm:via-[#17251f]/45 sm:to-transparent" />
        <div className="relative px-6 py-14 text-[#fffdf7] sm:px-12 sm:py-20 lg:py-24">
          <p className="reveal eyebrow text-trips-accent-2">Stranger Trips · Group travel</p>
          <h1
            className="reveal mt-4 max-w-xl text-5xl leading-[0.95] tracking-tight sm:text-7xl"
            style={{ "--delay": "120ms" } as React.CSSProperties}
          >
            Let&apos;s go <em>somewhere.</em>
          </h1>
          <p
            className="reveal mt-5 max-w-md leading-relaxed text-[#fffdf7]/80"
            style={{ "--delay": "240ms" } as React.CSSProperties}
          >
            Pick a trip, see who&apos;s going, and leave with new friends.
          </p>
        </div>
      </header>

      <div className="mt-8" />

      {!user ? (
        <MatchPrompt
          text="Log in and set your travel personality to see how well you match each group."
          href="/login?next=/trips"
          cta="Log in"
        />
      ) : !user.personality.length ? (
        <MatchPrompt
          text="Pick your travel personality to see your match % for every trip."
          href="/trips/profile"
          cta="Set personality"
        />
      ) : null}

      <TripFilters filters={filters} origins={origins} />

      <p className="eyebrow mt-8 mb-5 text-muted-foreground">
        {trips.length} upcoming trip{trips.length === 1 ? "" : "s"}
        {user?.personality.length ? " · best matches first" : ""}
      </p>

      {trips.length ? (
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {trips.map((trip, i) => (
            <Reveal key={trip.id} delay={(i % 3) * 90}>
              <TripCard trip={trip} />
            </Reveal>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No trips match those filters"
          description="Try a different month or budget — or post your own plan and find travel buddies going the same way."
          action={<ButtonLink href="/trips/buddies/new">Post a travel plan</ButtonLink>}
        />
      )}
    </Container>
  );
}

function MatchPrompt({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-highlight/40 bg-highlight/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm">{text}</p>
      <ButtonLink href={href} size="sm" className="self-start sm:self-auto">
        {cta}
      </ButtonLink>
    </div>
  );
}
