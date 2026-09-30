import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingPanel } from "@/components/trips/booking-panel";
import { CompatibilityBadge } from "@/components/trips/compatibility-badge";
import { TripCover } from "@/components/trips/trip-cover";
import { GroupList } from "@/components/trips/group-list";
import { InterestButton } from "@/components/trips/interest-button";
import { SafetyPanel } from "@/components/trips/safety-panel";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { TagList } from "@/components/trips/tag-list";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/lib/auth/dal";
import { durationLabel, formatDateRange } from "@/lib/trips/format";
import { getProfile, getTrip } from "@/lib/trips/queries";

export async function generateMetadata({ params }: PageProps<"/trips/[slug]">): Promise<Metadata> {
  const trip = await getTrip((await params).slug, null);
  return trip ? { title: trip.title, description: trip.summary } : {};
}

export default async function TripPage({ params }: PageProps<"/trips/[slug]">) {
  const { slug } = await params;
  const user = await requireUser(`/trips/${slug}`);
  const trip = await getTrip(slug, user);
  if (!trip) notFound();

  const booked = trip.myBookingId !== null;
  const profile = booked && user ? await getProfile(user.id) : null;
  const started = new Date(trip.startDate) <= new Date();
  const dates = formatDateRange(trip.startDate, trip.endDate);
  const closedReason =
    trip.status === "cancelled" ? "Trip cancelled" : started ? "Trip has started" : undefined;

  return (
    <Container className="py-6 sm:py-10">
      <div className="flex items-center justify-between gap-3">
        <Link href="/trips" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          ← All trips
        </Link>
        {trip.canManage && (
          <ButtonLink
            href={user?.role === "admin" ? `/admin/trips?q=${encodeURIComponent(trip.title)}` : `/agency/trips/${trip.id}`}
            size="sm"
            variant="outline"
          >
            Manage trip
          </ButtonLink>
        )}
      </div>

      {trip.status === "cancelled" && (
        <p role="status" className="mt-4 rounded-xl border border-destructive/40 px-4 py-3 text-sm text-destructive">
          This trip was cancelled{trip.cancelReason ? `: ${trip.cancelReason}` : "."}
        </p>
      )}
      {!trip.agency.approved && (
        <p role="status" className="mt-4 rounded-xl border px-4 py-3 text-sm">
          This trip is hidden from travellers because its agency isn&apos;t currently approved.
        </p>
      )}

      <TripCover
        destination={trip.destination}
        label={`${trip.origin} → ${trip.destination}${trip.region ? `, ${trip.region}` : ""}`}
        size="hero"
        className="reveal mt-4 aspect-[4/3] rounded-xl sm:aspect-[21/9]"
      >
        <CompatibilityBadge value={trip.compatibility} />
      </TripCover>

      <header className="mt-6 sm:mt-8">
        <h1 className="text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl">{trip.title}</h1>
        <p className="mt-3 text-base">
          {dates}
          <span className="text-muted-foreground"> · {durationLabel(trip.startDate, trip.endDate)}</span>
        </p>
        <TagList tags={trip.vibes} highlight={user?.personality ?? []} className="mt-4" />
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        {/* On phones the booking panel comes right after the header; on desktop it's a sticky sidebar. */}
        <aside className="lg:col-start-2 lg:row-start-1">
          <div className="space-y-6 lg:sticky lg:top-24">
            <BookingPanel
              tripId={trip.id}
              slug={trip.slug}
              price={trip.price}
              maxGroupSize={trip.maxGroupSize}
              bookedCount={trip.bookedCount}
              minAge={trip.minAge}
              myBookingId={trip.myBookingId}
              bookable={trip.status === "open" && !started}
              closedReason={closedReason}
              signedIn={!!user}
              canBook={!user || user.role === "user"}
            >
              {user?.role === "user" && !trip.myBookingId && trip.status === "open" && (
                <InterestButton tripId={trip.id} interested={trip.interested} count={trip.interestedCount} />
              )}
            </BookingPanel>

            <div className="rounded-xl border bg-card p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase">Organised by</p>
              <p className="mt-1 font-semibold">{trip.agency.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{trip.agency.city}</span>
                {trip.agency.approved && <Badge tone="positive">Verified agency</Badge>}
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-10 lg:col-start-1 lg:row-start-1">
          {booked && (
            <SafetyPanel
              tripTitle={trip.title}
              dates={dates}
              captain={trip.captain}
              emergencyContact={
                profile?.emergencyContact.name && profile.emergencyContact.phone
                  ? profile.emergencyContact
                  : null
              }
            />
          )}

          <Section title="About this trip">
            <p className="leading-relaxed whitespace-pre-line">{trip.summary}</p>
            {trip.highlights.length > 0 && (
              <ul className="mt-4 list-disc space-y-1.5 pl-5">
                {trip.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Your potential group"
            description={
              user?.personality.length
                ? "Shared interests are highlighted."
                : "Only first names, age and city are shown."
            }
          >
            <GroupList
              members={trip.group}
              myPersonality={user?.personality ?? []}
              tripId={trip.id}
              canReport={booked}
            />
          </Section>

          {trip.itinerary.length > 0 && (
            <Section title="Itinerary">
              <ol className="relative space-y-6 border-l pl-6">
                {trip.itinerary.map((day) => (
                  <li key={day.day} className="relative">
                    <span
                      aria-hidden
                      className="absolute top-1 -left-[1.9rem] size-3 rounded-full border-2 border-background bg-primary"
                    />
                    <p className="text-sm font-medium text-muted-foreground">Day {day.day}</p>
                    <p className="font-semibold">{day.title}</p>
                    {day.description && <p className="mt-1 text-muted-foreground">{day.description}</p>}
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {(trip.inclusions.length > 0 || trip.exclusions.length > 0) && (
            <div className="grid gap-6 sm:grid-cols-2">
              {trip.inclusions.length > 0 && (
                <Section title="Included">
                  <ul className="space-y-2 text-sm">
                    {trip.inclusions.map((i) => (
                      <li key={i}>✓ {i}</li>
                    ))}
                  </ul>
                </Section>
              )}
              {trip.exclusions.length > 0 && (
                <Section title="Not included">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {trip.exclusions.map((i) => (
                      <li key={i}>– {i}</li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          )}

          <Section title="Your trip captain">
            <div className="flex items-start gap-4 rounded-xl border bg-card p-4">
              <span
                aria-hidden
                className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground"
              >
                {trip.captain.name.charAt(0)}
              </span>
              <div>
                <p className="font-semibold">{trip.captain.name}</p>
                {trip.captain.bio && <p className="mt-1 text-sm text-muted-foreground">{trip.captain.bio}</p>}
                {!booked && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Captain&apos;s contact details are shared once you book.
                  </p>
                )}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </Container>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
