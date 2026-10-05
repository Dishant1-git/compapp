import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SubscriptionCards } from "@/components/companion/subscription-cards";
import { requireUser } from "@/lib/auth/dal";
import { getRequestTarget } from "@/lib/companion/queries";

export const metadata: Metadata = {
  title: "Subscribe",
};

/** Where Request leads: `?to=` is the profile the request is for. */
export default async function SubscribePage({ searchParams }: PageProps<"/companion/subscribe">) {
  const { to } = await searchParams;
  const profileId = typeof to === "string" ? to : "";
  const viewer = await requireUser(`/companion/subscribe${profileId ? `?to=${encodeURIComponent(profileId)}` : ""}`);
  const target = await getRequestTarget(viewer.id, profileId);
  if (!target) redirect("/companion/discover");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="reveal eyebrow text-highlight">Subscription</p>
      <h1 className="reveal mt-3 text-5xl leading-none font-medium tracking-tight">
        Send your request to <em>{target.name}.</em>
      </h1>
      <div className="mt-5 flex items-center gap-4">
        {target.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- private, auth-gated image
          <img src={target.photoUrl} alt="" className="size-14 shrink-0 rounded-full object-cover" />
        )}
        <p className="leading-relaxed text-muted-foreground">
          Pick a subscription to send your request.
        </p>
      </div>
      <div className="mt-10">
        <SubscriptionCards />
      </div>
      <p className="mt-8 text-sm">
        <Link href="/companion/discover" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
          Back to profiles
        </Link>
      </p>
    </div>
  );
}
