import type { Metadata } from "next";
import { EmailVerification } from "@/components/auth/email-verification";
import { PageHeader } from "@/components/trips/page-header";
import { ProfileForm } from "@/components/trips/profile-form";
import { TrustScoreCard } from "@/components/trips/trust-score-card";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/lib/auth/dal";
import { getProfile } from "@/lib/trips/queries";

export const metadata: Metadata = {
  title: "Your travel profile",
};

export default async function ProfilePage({ searchParams }: PageProps<"/trips/profile">) {
  const user = await requireUser("/trips/profile");
  const { welcome, next } = await searchParams;
  const profile = await getProfile(user.id);
  if (!profile) return null;

  const { trust, verification, email, username, ...initial } = profile;

  return (
    <Container className="max-w-5xl">
      <PageHeader
        title={welcome ? `Welcome, ${profile.name.split(" ")[0]}!` : "Your travel profile"}
        description={
          welcome
            ? "Tell us how you like to travel so we can match you with the right group."
            : `Signed in as ${[username && `@${username}`, email].filter(Boolean).join(" · ")}`
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ProfileForm profile={initial} next={typeof next === "string" ? next : undefined} />
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <TrustScoreCard trust={trust} verification={verification} />
          <EmailVerification email={email} verified={verification.email} />
        </aside>
      </div>
    </Container>
  );
}
