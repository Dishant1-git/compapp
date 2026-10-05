import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Discover } from "@/components/companion/discover";
import { requireUser } from "@/lib/auth/dal";
import { getNearbyProfiles } from "@/lib/companion/queries";

export const metadata: Metadata = {
  title: "People near you",
};

export default async function DiscoverPage() {
  const viewer = await requireUser("/companion/discover");
  const nearby = await getNearbyProfiles(viewer.id);
  // Only people with a live, verified profile can look at others.
  if (!nearby) redirect("/companion/join");

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-12">
      <p className="reveal eyebrow text-highlight">Near {nearby.city}</p>
      <h1 className="reveal mt-3 text-5xl leading-none font-medium tracking-tight">
        People <em>near you.</em>
      </h1>
      {!nearby.sharedLocation && (
        <p className="mt-4 leading-relaxed text-muted-foreground">
          You haven&apos;t shared your location, so these are people in {nearby.city} only.{" "}
          <Link href="/companion/join?edit=1" className="text-foreground underline underline-offset-4">
            Share it in your profile
          </Link>{" "}
          to see nearby cities too.
        </p>
      )}
      <div className="mt-8">
        <Discover
          profiles={nearby.profiles}
          maxDistanceKm={nearby.maxDistanceKm}
          canChangeDistance={nearby.sharedLocation}
        />
      </div>
      <p className="mt-8 text-center text-sm">
        <Link href="/companion" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
          Your profile
        </Link>
      </p>
    </div>
  );
}
