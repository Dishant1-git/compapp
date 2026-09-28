import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/trips/page-header";
import { TagList } from "@/components/trips/tag-list";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ReasonForm } from "@/components/ui/reason-form";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { cancelTripAsAgency, setBookingPaid } from "@/lib/agency/actions";
import { getAgencyTrip } from "@/lib/agency/queries";
import { getMyAgency, requireRole } from "@/lib/auth/dal";
import { durationLabel, formatDate, formatDateRange, formatPrice } from "@/lib/trips/format";

export const metadata: Metadata = {
  title: "Manage trip",
};

export default async function AgencyTripPage({ params }: PageProps<"/agency/trips/[id]">) {
  const { id } = await params;
  const user = await requireRole(["agency"], `/agency/trips/${id}`);
  const agency = await getMyAgency(user.id);
  const data = agency ? await getAgencyTrip(agency.id, id) : null;
  if (!data) notFound();

  const { trip, travellers, cancelled, interested } = data;
  const started = new Date(trip.startDate) <= new Date();
  const paid = travellers.filter((t) => t.paymentStatus === "paid").length;

  return (
    <Container className="py-6 sm:py-10">
      <Link href="/agency" className="text-sm font-medium text-muted-foreground hover:text-foreground">
        ← Dashboard
      </Link>

      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{trip.title}</h1>
            <Badge status={trip.status} />
          </div>
          <p className="mt-1 text-muted-foreground">
            {trip.origin} → {trip.destination} · {formatDateRange(trip.startDate, trip.endDate)} ·{" "}
            {durationLabel(trip.startDate, trip.endDate)} · {formatPrice(trip.price)}
          </p>
          {trip.cancelReason && (
            <p className="mt-2 text-sm text-destructive">Cancelled: {trip.cancelReason}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/trips/${trip.slug}`} variant="outline" size="sm">
            Public page
          </ButtonLink>
          <ButtonLink href={`/trips/${trip.slug}/group`} variant="outline" size="sm">
            Group chat
          </ButtonLink>
          {trip.status === "open" && (
            <ButtonLink href={`/agency/trips/${trip.id}/edit`} size="sm">
              Edit trip
            </ButtonLink>
          )}
        </div>
      </div>

      <div className="mt-6">
        <StatGrid>
          <StatCard label="Booked" value={`${trip.bookedCount}/${trip.maxGroupSize}`} />
          <StatCard label="Interested" value={trip.interestedCount} />
          <StatCard label="Paid" value={`${paid}/${travellers.length}`} />
          <StatCard label="Booked value" value={formatPrice(trip.revenue)} />
        </StatGrid>
      </div>

      <Section
        title={`Travellers (${travellers.length})`}
        description="Contact and emergency details are shared with you because these travellers booked your trip. Keep them private."
      >
        {travellers.length ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {travellers.map((t) => (
              <li key={t.bookingId} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {t.name}
                      {t.age !== null && <span className="font-normal text-muted-foreground">, {t.age}</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[t.city, t.gender !== "unspecified" ? t.gender : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Badge status={t.paymentStatus} />
                </div>
                <dl className="mt-3 grid gap-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-muted-foreground">Phone</dt>
                    <dd>{t.phone ? <a className="underline underline-offset-4" href={`tel:${t.phone}`}>{t.phone}</a> : "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-muted-foreground">Email</dt>
                    <dd className="min-w-0 truncate">
                      {t.email ? <a className="underline underline-offset-4" href={`mailto:${t.email}`}>{t.email}</a> : "—"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-muted-foreground">Emergency</dt>
                    <dd>
                      {t.emergencyContact ? `${t.emergencyContact.name} · ${t.emergencyContact.phone}` : "—"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-muted-foreground">Booked</dt>
                    <dd>
                      {formatDate(t.bookedAt)} · {formatPrice(t.amount)}
                    </dd>
                  </div>
                </dl>
                {trip.status === "open" && (
                  <form action={setBookingPaid.bind(null, t.bookingId, t.paymentStatus !== "paid")} className="mt-3">
                    <Button type="submit" size="sm" variant="outline">
                      {t.paymentStatus === "paid" ? "Mark as unpaid" : "Mark as paid"}
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No bookings yet" description="Travellers who book will appear here and join the group chat." />
        )}
      </Section>

      <Section
        title={`Interested (${interested.length})`}
        description="Travellers who saved this trip but haven't booked. Contact details stay private until they book."
      >
        {interested.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {interested.map((p) => (
              <li key={p.userId} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">
                    {p.firstName}
                    {p.age !== null && <span className="text-muted-foreground">, {p.age}</span>}
                  </p>
                  {p.booked && <Badge tone="positive">Booked</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.city ? `${p.city} · ` : ""}since {formatDate(p.since)}
                </p>
                <TagList tags={p.personality} className="mt-2" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No one has marked this trip as interesting yet.</p>
        )}
      </Section>

      {cancelled.length > 0 && (
        <Section title={`Cancelled bookings (${cancelled.length})`}>
          <ul className="divide-y rounded-xl border bg-card text-sm">
            {cancelled.map((c, i) => (
              <li key={i} className="flex justify-between gap-3 px-4 py-3">
                <span>{c.name}</span>
                <span className="text-muted-foreground">
                  {c.cancelledBy ? `by ${c.cancelledBy}` : ""} {c.cancelledAt ? `· ${formatDate(c.cancelledAt)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {trip.status === "open" && !started && (
        <Section title="Danger zone">
          <div className="max-w-md">
            <ReasonForm
              action={cancelTripAsAgency.bind(null, trip.id)}
              trigger="Cancel this trip"
              label="Reason (shown to travellers)"
              placeholder="e.g. Heavy snowfall has closed the pass."
              submitLabel="Cancel trip and notify travellers"
              confirmText="Cancel this trip? All bookings will be cancelled and travellers notified."
            />
          </div>
        </Section>
      )}
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
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
