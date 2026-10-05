import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/trips/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { getAgencyDashboard } from "@/lib/agency/queries";
import { getMyAgency, requireRole } from "@/lib/auth/dal";
import { getTripCredits } from "@/lib/payments/credits";
import { formatDateRange, formatPrice } from "@/lib/trips/format";

export default async function AgencyDashboardPage() {
  const user = await requireRole(["agency"], "/agency");
  const agency = await getMyAgency(user.id);
  if (!agency) {
    return (
      <Container className="py-10">
        <EmptyState title="No agency found for this account" description="Contact support to link your agency." />
      </Container>
    );
  }

  const [{ stats, trips }, { available: credits }] = await Promise.all([
    getAgencyDashboard(agency.id),
    getTripCredits(agency.id),
  ]);
  const now = new Date();
  const upcoming = trips.filter((t) => new Date(t.endDate) >= now && t.status === "open");
  const other = trips.filter((t) => !upcoming.includes(t));
  const approved = agency.status === "approved";

  return (
    <Container>
      <PageHeader
        title={agency.name}
        description={`Your trips, travellers and bookings at a glance. ${credits} trip${credits === 1 ? "" : "s"} left on your plan.`}
        actions={
          approved ? (
            <>
              <ButtonLink href="/agency/billing" variant="outline">
                Billing
              </ButtonLink>
              <ButtonLink href="/agency/trips/new">New trip</ButtonLink>
            </>
          ) : (
            <Badge status={agency.status} />
          )
        }
      />

      <StatGrid>
        <StatCard label="Upcoming trips" value={stats.upcomingTrips} />
        <StatCard label="Travellers booked" value={stats.travellers} />
        <StatCard label="Interested" value={stats.interested} hint="People who saved your trips" />
        <StatCard
          label="Booked value"
          value={formatPrice(stats.bookedValue)}
          hint={`${formatPrice(stats.paidValue)} marked paid`}
        />
      </StatGrid>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Upcoming trips</h2>
        {upcoming.length ? (
          <TripRows trips={upcoming} />
        ) : (
          <EmptyState
            title="No upcoming trips"
            description={
              approved
                ? "Publish a trip and travellers can start booking right away."
                : "Once an admin approves your agency you can publish trips."
            }
            action={approved ? <ButtonLink href="/agency/trips/new">Create a trip</ButtonLink> : undefined}
          />
        )}
      </section>

      {other.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold tracking-tight">Past &amp; cancelled</h2>
          <TripRows trips={other} />
        </section>
      )}
    </Container>
  );
}

function TripRows({ trips }: { trips: Awaited<ReturnType<typeof getAgencyDashboard>>["trips"] }) {
  return (
    <ul className="space-y-3">
      {trips.map((t) => (
        <li key={t.id}>
          <Link
            href={`/agency/trips/${t.id}`}
            className="grid gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{t.title}</p>
                {t.status === "cancelled" && <Badge status="cancelled" />}
              </div>
              <p className="text-sm text-muted-foreground">
                {t.origin} → {t.destination} · {formatDateRange(t.startDate, t.endDate)} · {formatPrice(t.price)}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-4 text-sm sm:text-right">
              <div>
                <dt className="text-xs text-muted-foreground">Booked</dt>
                <dd className="font-semibold tabular-nums">
                  {t.bookedCount}/{t.maxGroupSize}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Interested</dt>
                <dd className="font-semibold tabular-nums">{t.interestedCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Value</dt>
                <dd className="font-semibold tabular-nums">{formatPrice(t.revenue)}</dd>
              </div>
            </dl>
          </Link>
        </li>
      ))}
    </ul>
  );
}
