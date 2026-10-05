import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser, homeFor } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Verify your email",
};

/** Where the link in the verification email ends up (via /api/auth/verify-email). */
export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const done = (await searchParams).status === "done";
  const viewer = await getCurrentUser();

  return (
    <>
      <AuthHeader
        title={done ? "Email verified" : "This link didn't work"}
        description={
          done
            ? "Thanks. Your email address is confirmed."
            : "The link has expired or was already replaced. Log in and ask for a new one from your profile."
        }
      />
      <ButtonLink href={viewer ? homeFor(viewer.role) : "/login"} size="lg" fullWidth>
        {viewer ? "Continue" : "Log in"}
      </ButtonLink>
    </>
  );
}
