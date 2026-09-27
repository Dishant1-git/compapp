import type { Metadata } from "next";
import { PageHeader } from "@/components/trips/page-header";
import { PlanForm } from "@/components/trips/plan-form";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/lib/auth/dal";
import { getProfile } from "@/lib/trips/queries";

export const metadata: Metadata = {
  title: "Post a travel plan",
};

export default async function NewPlanPage() {
  const user = await requireUser("/trips/buddies/new");
  const profile = await getProfile(user.id);

  return (
    <Container className="max-w-3xl">
      <PageHeader
        title="Post your travel plan"
        description="Solo travellers heading the same way can ask to join. Your contact details are only shared with people you accept."
      />
      <PlanForm defaultOrigin={profile?.city || undefined} today={new Date().toISOString().slice(0, 10)} />
    </Container>
  );
}
