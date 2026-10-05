import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgencyProfileForm } from "@/components/agency/agency-profile-form";
import { EmailVerification } from "@/components/auth/email-verification";
import { PageHeader } from "@/components/trips/page-header";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { getAgencyProfile } from "@/lib/agency/queries";
import { getMyAgency, requireRole } from "@/lib/auth/dal";
import { formatDate } from "@/lib/trips/format";
import { getProfile } from "@/lib/trips/queries";

export const metadata: Metadata = {
  title: "Agency profile",
};

export default async function AgencyProfilePage() {
  const user = await requireRole(["agency"], "/agency/profile");
  const agency = await getMyAgency(user.id);
  const profile = agency ? await getAgencyProfile(agency.id) : null;
  if (!profile) notFound();

  return (
    <Container className="max-w-3xl">
      <PageHeader
        title="Agency profile"
        description={`Travellers see your name and city on every trip. Registered ${formatDate(profile.createdAt)}.`}
        actions={<Badge status={profile.status} />}
      />
      <AgencyProfileForm profile={profile} />
      <div className="mt-8">
        <EmailVerification email={user.email} verified={(await getProfile(user.id))?.verification.email ?? false} />
      </div>
    </Container>
  );
}
