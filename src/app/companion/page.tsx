import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileCard } from "@/components/companion/profile-card";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/dal";
import { getCompanionDraft } from "@/lib/companion/queries";

export const metadata: Metadata = {
  title: "Your profile",
};

export default async function CompanionHomePage() {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/companion/join");
  const state = await getCompanionDraft(viewer.id);
  // Only verified profiles are shown; otherwise finish (or wait for) verification first.
  if (!state?.active || state.draft.selfie?.status !== "verified") redirect("/companion/join");

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">You&apos;re all set!</h1>
      <p className="mt-2 text-muted-foreground">
        Your Companion profile is live. We&apos;ll let you know as soon as matching opens.
      </p>
      <div className="mt-8">
        <ProfileCard profile={state.draft} />
      </div>
      <ButtonLink href="/companion/join?edit=1" variant="outline" size="lg" fullWidth className="mt-6">
        Edit profile
      </ButtonLink>
    </div>
  );
}
