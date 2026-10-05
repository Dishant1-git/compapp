import type { Metadata } from "next";
import { TripForm } from "@/components/agency/trip-form";
import { EmptyState, PageHeader } from "@/components/trips/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { createTrip } from "@/lib/agency/actions";
import { getMyAgency, requireRole } from "@/lib/auth/dal";
import { getTripCredits } from "@/lib/payments/credits";

export const metadata: Metadata = {
  title: "Create a trip",
};

export default async function NewTripPage() {
  const user = await requireRole(["agency"], "/agency/trips/new");
  const agency = await getMyAgency(user.id);
  const approved = agency?.status === "approved";
  const credits = approved ? (await getTripCredits(agency.id)).available : 0;

  return (
    <Container className="max-w-3xl">
      <PageHeader
        title="Create a trip"
        description={
          credits
            ? `Publish a group trip for solo travellers to join. This uses 1 of the ${credits} trip${credits === 1 ? "" : "s"} on your plan.`
            : "Publish a group trip for solo travellers to join."
        }
      />
      {!approved ? (
        <EmptyState
          title="Approval required"
          description="An admin needs to approve your agency before you can publish trips. You'll get a notification when that happens."
        />
      ) : !credits ? (
        <EmptyState
          title="No trips left on your plan"
          description="Buy a single trip, or a monthly or annual plan, to publish this trip."
          action={<ButtonLink href="/agency/billing">See plans</ButtonLink>}
        />
      ) : (
        <TripForm action={createTrip} today={new Date().toISOString().slice(0, 10)} />
      )}
    </Container>
  );
}
