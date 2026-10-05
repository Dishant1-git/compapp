import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/trips/page-header";
import { RequestCard } from "@/components/trips/request-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/lib/auth/dal";
import { AGE_CHECK_LABELS } from "@/lib/payments/pricing";
import { closeTravelPlan } from "@/lib/trips/actions";
import { durationLabel, formatDateRange, formatPrice } from "@/lib/trips/format";
import { getMyBookings, getMyPlans, getSentRequests } from "@/lib/trips/queries";
import type { MyBooking } from "@/lib/trips/types";

export const metadata: Metadata = {
  title: "My trips",
};

export default async function MyTripsPage() {
  const user = await requireUser("/trips/me");
  const [bookings, plans, sent] = await Promise.all([
    getMyBookings(user.id),
    getMyPlans(user.id),
    getSentRequests(user.id),
  ]);

  const now = new Date();
  const upcoming = bookings.filter((b) => new Date(b.trip.endDate) >= now);
  const past = bookings.filter((b) => new Date(b.trip.endDate) < now).reverse();

  return (
    <Container className="max-w-5xl">
      <PageHeader title="My trips" description="Your bookings, travel plans and buddy requests." />

      <div className="space-y-12">
        <Section title="Upcoming trips">
          {upcoming.length ? (
            <ul className="space-y-3">
              {upcoming.map((b) => (
                <BookingRow key={b.id} booking={b} showChat />
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No upcoming trips"
              description="Find a group heading somewhere you love."
              action={<ButtonLink href="/trips">Explore trips</ButtonLink>}
            />
          )}
        </Section>

        <Section
          id="plans"
          title="My travel plans"
          action={
            <ButtonLink href="/trips/buddies/new" size="sm" variant="outline">
              New plan
            </ButtonLink>
          }
        >
          {plans.length ? (
            <div className="space-y-6">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-xl border p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {plan.origin} → {plan.destination}
                        {plan.status === "closed" && (
                          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">Closed</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateRange(plan.startDate, plan.endDate)} · Budget {formatPrice(plan.budget)}
                      </p>
                    </div>
                    {plan.status === "active" && (
                      <form action={closeTravelPlan.bind(null, plan.id)}>
                        <Button type="submit" size="sm" variant="ghost">
                          Close plan
                        </Button>
                      </form>
                    )}
                  </div>
                  <p className="mt-4 text-sm font-medium">
                    {plan.requests.length
                      ? `${plan.requests.length} request${plan.requests.length === 1 ? "" : "s"}`
                      : "No requests yet"}
                  </p>
                  {plan.requests.length > 0 && (
                    <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                      {plan.requests.map((r) => (
                        <RequestCard key={r.id} request={r} direction="incoming" />
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No travel plans"
              description="Post where and when you're going, and let other solo travellers find you."
            />
          )}
        </Section>

        {sent.length > 0 && (
          <Section title="Requests I've sent">
            <ul className="grid gap-3 sm:grid-cols-2">
              {sent.map((r) => (
                <RequestCard key={r.id} request={r} direction="outgoing" />
              ))}
            </ul>
          </Section>
        )}

        {past.length > 0 && (
          <Section title="Past trips">
            <ul className="space-y-3">
              {past.map((b) => (
                <BookingRow key={b.id} booking={b} />
              ))}
            </ul>
          </Section>
        )}

      </div>
    </Container>
  );
}

function BookingRow({ booking, showChat }: { booking: MyBooking; showChat?: boolean }) {
  const { trip } = booking;
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link href={`/trips/${trip.slug}`} className="font-semibold hover:underline">
          {trip.title}
        </Link>
        <p className="text-sm text-muted-foreground">
          {trip.origin} → {trip.destination} · {formatDateRange(trip.startDate, trip.endDate)} ·{" "}
          {durationLabel(trip.startDate, trip.endDate)}
        </p>
        <p className="mt-1 text-sm">
          {formatPrice(booking.amount)}
          <span className="text-muted-foreground capitalize"> · {booking.paymentStatus}</span>
          <span className="text-muted-foreground">
            {booking.seats > 1 ? ` · ${booking.seats} seats` : ""}
            {booking.feePaid ? ` · seat fee ${formatPrice(booking.feePaid)} paid` : ""}
            {booking.ageCheck ? ` · ${AGE_CHECK_LABELS[booking.ageCheck]}` : ""}
          </span>
        </p>
      </div>
      {showChat && (
        <div className="flex shrink-0 flex-wrap gap-2">
          {booking.ageCheck === "required" && (
            <ButtonLink href={`/trips/${trip.slug}/verify-age`} size="sm">
              Upload ID
            </ButtonLink>
          )}
          <ButtonLink href={`/trips/${trip.slug}/group`} size="sm" variant="outline">
            Group chat
          </ButtonLink>
        </div>
      )}
    </li>
  );
}

function Section({
  id,
  title,
  action,
  children,
}: {
  id?: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
