import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TripForm } from "@/components/agency/trip-form";
import { PageHeader } from "@/components/trips/page-header";
import { Container } from "@/components/ui/container";
import { updateTrip } from "@/lib/agency/actions";
import { getAgencyTrip } from "@/lib/agency/queries";
import { getMyAgency, requireRole } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Edit trip",
};

export default async function EditTripPage({ params }: PageProps<"/agency/trips/[id]/edit">) {
  const { id } = await params;
  const user = await requireRole(["agency"], `/agency/trips/${id}/edit`);
  const agency = await getMyAgency(user.id);
  const data = agency ? await getAgencyTrip(agency.id, id) : null;
  if (!data || data.trip.status !== "open") notFound();

  const started = new Date(data.trip.startDate) <= new Date();

  return (
    <Container className="max-w-3xl">
      <div className="pt-6">
        <Link href={`/agency/trips/${id}`} className="text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Back to trip
        </Link>
      </div>
      <PageHeader
        title="Edit trip"
        description="Changes go live immediately. Travellers are notified if you change the dates. Existing bookings keep the price they paid."
      />
      <TripForm
        action={updateTrip.bind(null, id)}
        initial={data.formValues}
        today={started ? undefined : new Date().toISOString().slice(0, 10)}
        submitLabel="Save changes"
      />
    </Container>
  );
}
