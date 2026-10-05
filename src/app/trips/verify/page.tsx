import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmailVerification } from "@/components/auth/email-verification";
import { PageHeader } from "@/components/trips/page-header";
import { Container } from "@/components/ui/container";
import { isVerified, requireUser, safeNext } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Verify your account",
};

/** Where unverified accounts land when they try to book, post a plan or ask to join one. */
export default async function VerifyAccountPage({ searchParams }: PageProps<"/trips/verify">) {
  const next = safeNext((await searchParams).next, "/trips");
  const user = await requireUser(`/trips/verify?next=${encodeURIComponent(next)}`);
  if (await isVerified(user.id)) redirect(next);

  return (
    <Container className="max-w-xl pb-10">
      <PageHeader
        title="Verify your account"
        description="Before you book a seat or team up with other travellers, we check there's a real person behind every account. It takes a minute."
      />
      {user.email ? (
        <EmailVerification email={user.email} verified={false} next={next} />
      ) : (
        <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          This account has no email address or verified phone number. Log out and sign in with your mobile
          number to verify it.
        </p>
      )}
    </Container>
  );
}
