import type { Metadata } from "next";
import { TripForm } from "@/components/agency/trip-form";
import { EmptyState, PageHeader } from "@/components/trips/page-header";
import { Container } from "@/components/ui/container";
import { createTrip } from "@/lib/agency/actions";
import { getMyAgency, requireRole } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Create a trip",
};

export default async function NewTripPage() {
  const user = await requireRole(["agency"], "/agency/trips/new");
  const agency = await getMyAgency(user.id);

  return (
    <Container className="max-w-3xl">
      <PageHeader title="Create a trip" description="Publish a group trip for solo travellers to join." />
      {agency?.status === "approved" ? (
        <TripForm action={createTrip} today={new Date().toISOString().slice(0, 10)} />
      ) : (
        <EmptyState
          title="Approval required"
          description="An admin needs to approve your agency before you can publish trips. You'll get a notification when that happens."
        />
      )}
    </Container>
  );
}
