import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { JoinFlow } from "@/components/companion/join-flow";
import { getCurrentUser } from "@/lib/auth/dal";
import { FIRST_PROFILE_STEP } from "@/lib/companion/constants";
import { getCompanionAccount, getCompanionDraft } from "@/lib/companion/queries";
import { resumeStep } from "@/lib/companion/types";

export const metadata: Metadata = {
  title: "Join Companion",
};

export default async function JoinCompanionPage({ searchParams }: PageProps<"/companion/join">) {
  const { edit } = await searchParams;
  const viewer = await getCurrentUser();
  const account = viewer ? await getCompanionAccount(viewer.id) : null;

  let flow: React.ReactNode;
  if (viewer && account?.phoneVerified) {
    const state = await getCompanionDraft(viewer.id);
    if (!state) redirect("/login");
    const verified = state.draft.selfie?.status === "verified";
    if (state.active && verified && !edit) redirect("/companion");
    flow = (
      <JoinFlow
        initialStep={edit ? FIRST_PROFILE_STEP : resumeStep(state.draft)}
        initialDraft={state.draft}
      />
    );
  } else {
    // New here, or signed in with email but no verified phone yet.
    flow = <JoinFlow initialStep="name" initialName={account?.name} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-6 pb-6 sm:pt-10">
      {flow}
      {!viewer && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link href="/terms" prefetch={false} className="underline underline-offset-4">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" prefetch={false} className="underline underline-offset-4">
            Privacy Policy
          </Link>
          . Already joined? Enter the same number to sign back in.
        </p>
      )}
    </div>
  );
}
