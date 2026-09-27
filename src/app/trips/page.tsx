import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/trips/page-header";
import { TripCard } from "@/components/trips/trip-card";
import { TripFilters } from "@/components/trips/trip-filters";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/lib/auth/dal";
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

  const user = await getCurrentUser();
  const [trips, origins] = await Promise.all([listTrips(filters, user), listOrigins()]);

  return (
    <Container>
      <PageHeader
        title="Travel with strangers"
        description="Pick a trip, see who's going, and leave with new friends."
      />

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

      <p className="mt-6 mb-4 text-sm text-muted-foreground">
        {trips.length} upcoming trip{trips.length === 1 ? "" : "s"}
        {user?.personality.length ? " · best matches first" : ""}
      </p>

      {trips.length ? (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
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
    <div className="mb-4 flex flex-col gap-3 rounded-xl bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm">{text}</p>
      <ButtonLink href={href} size="sm" className="self-start sm:self-auto">
        {cta}
      </ButtonLink>
    </div>
  );
}
