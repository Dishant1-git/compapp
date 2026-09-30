import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/trips/page-header";
import { PlanCard } from "@/components/trips/plan-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth/dal";
import { listPlans } from "@/lib/trips/queries";

export const metadata: Metadata = {
  title: "Travel buddies",
};

export default async function BuddiesPage({ searchParams }: PageProps<"/trips/buddies">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const user = await requireUser(typeof q === "string" && q ? `/trips/buddies?q=${encodeURIComponent(q)}` : "/trips/buddies");
  const plans = await listPlans({ q: query || undefined }, user);

  return (
    <Container>
      <PageHeader
        title="People going where you're going"
        description="Find solo travellers with the same destination and dates, and plan together."
        actions={<ButtonLink href="/trips/buddies/new">Post your plan</ButtonLink>}
      />

      <form role="search" className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Destination</span>
          <Input name="q" type="search" placeholder="Search destination" defaultValue={query} />
        </label>
        <Button type="submit" className="shrink-0">
          Search
        </Button>
      </form>
      {query && (
        <Link href="/trips/buddies" className="mt-2 inline-block text-sm text-muted-foreground hover:text-foreground">
          Clear search
        </Link>
      )}

      <div className="mt-6">
        {plans.length ? (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                signedIn={!!user}
                myPersonality={user?.personality ?? []}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={query ? `No one is heading to “${query}” yet` : "No travel plans yet"}
            description="Post your plan and people going the same way can ask to join you."
            action={<ButtonLink href="/trips/buddies/new">Post your plan</ButtonLink>}
          />
        )}
      </div>
    </Container>
  );
}
