import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileCard } from "@/components/companion/profile-card";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { getCompanionDraft } from "@/lib/companion/queries";

export const metadata: Metadata = {
  title: "Your profile",
};

export default async function CompanionHomePage() {
  const viewer = await requireUser("/companion");
  const state = await getCompanionDraft(viewer.id);
  // Only verified profiles are shown; otherwise finish (or wait for) verification first.
  if (!state?.active || state.draft.selfie?.status !== "verified") redirect("/companion/join");

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-12">
      <p className="reveal eyebrow text-highlight">Your profile is live</p>
      <h1 className="reveal mt-3 text-5xl leading-none font-medium tracking-tight">
        You&apos;re <em>all set.</em>
      </h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">
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
