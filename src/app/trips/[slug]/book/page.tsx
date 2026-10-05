import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingForm } from "@/components/trips/booking-form";
import { PageHeader } from "@/components/trips/page-header";
import { Container } from "@/components/ui/container";
import { requireUser, requireVerified } from "@/lib/auth/dal";
import { formatDateRange, formatPrice } from "@/lib/trips/format";
import { getTrip } from "@/lib/trips/queries";

export const metadata: Metadata = {
  title: "Reserve your seat",
};

export default async function BookTripPage({ params }: PageProps<"/trips/[slug]/book">) {
  const { slug } = await params;
  const user = await requireUser(`/trips/${slug}/book`);
  const trip = await getTrip(slug, user);
  if (!trip) notFound();

  if (trip.myBookingId) redirect(`/trips/${slug}/verify-age`);
  const seatsLeft = trip.maxGroupSize - trip.bookedCount;
  const open = trip.status === "open" && trip.agency.approved && new Date(trip.startDate) > new Date();
  if (!open || seatsLeft < 1 || user.role !== "user") redirect(`/trips/${slug}`);
  // Only verified accounts can book: verify first, then come straight back here.
  await requireVerified(`/trips/${slug}/book`);

  return (
    <Container className="max-w-3xl pb-10">
      <Link href={`/trips/${slug}`} className="mt-6 inline-block text-sm font-medium text-muted-foreground hover:text-foreground">
        ← {trip.title}
      </Link>
      <PageHeader
        title="Reserve your seat"
        description={`${trip.title} · ${formatDateRange(trip.startDate, trip.endDate)} · ${formatPrice(trip.price)} per person`}
      />
      <BookingForm
        tripId={trip.id}
        slug={trip.slug}
        price={trip.price}
        minAge={trip.minAge}
        seatsLeft={seatsLeft}
        myName={user.name}
        today={new Date().toISOString().slice(0, 10)}
      />
    </Container>
  );
}
