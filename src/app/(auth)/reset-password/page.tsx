import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { ButtonLink } from "@/components/ui/button";
import { checkResetLink } from "@/lib/auth/account";

export const metadata: Metadata = {
  title: "Choose a new password",
  // The address contains the reset link's token: keep it out of other sites' logs.
  referrer: "no-referrer",
  robots: { index: false },
};

/** Where the link in the "forgot password" email lands. */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const valid = typeof token === "string" && token.length < 2000 && (await checkResetLink(token));

  if (!valid) {
    return (
      <>
        <AuthHeader
          title="This link didn't work"
          description="Reset links work for 30 minutes and only once. Ask for a new one."
        />
        <ButtonLink href="/forgot-password" size="lg" fullWidth>
          Send a new link
        </ButtonLink>
      </>
    );
  }

  return (
    <>
      <AuthHeader title="Choose a new password" description="You'll use it the next time you log in." />
      <ResetPasswordForm token={token} />
    </>
  );
}
