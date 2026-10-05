import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JoinFlow } from "@/components/companion/join-flow";
import { requireUser } from "@/lib/auth/dal";
import { FIRST_PROFILE_STEP } from "@/lib/companion/constants";
import { getCompanionAccount, getCompanionDraft } from "@/lib/companion/queries";
import { resumeStep } from "@/lib/companion/types";

export const metadata: Metadata = {
  title: "Join Companion",
};

export default async function JoinCompanionPage({ searchParams }: PageProps<"/companion/join">) {
  const { edit } = await searchParams;
  const viewer = await requireUser(edit ? "/companion/join?edit=1" : "/companion/join");
  const account = await getCompanionAccount(viewer.id);

  let flow: React.ReactNode;
  if (account?.verified) {
    const state = await getCompanionDraft(viewer.id);
    if (!state) redirect("/login?next=/companion/join");
    const verified = state.draft.selfie?.status === "verified";
    if (state.active && verified && !edit) redirect("/companion");
    flow = (
      <JoinFlow
        initialStep={edit ? FIRST_PROFILE_STEP : resumeStep(state.draft)}
        initialDraft={state.draft}
      />
    );
  } else {
    // Signed in, but Companion also needs a verified phone number or email address.
    flow = <JoinFlow initialStep="phone" initialName={account?.name} email={account?.email ?? undefined} />;
  }

  return <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-6 pb-6 sm:pt-10">{flow}</div>;
}
