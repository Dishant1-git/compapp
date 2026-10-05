import type { Metadata } from "next";
import { PlanCards } from "@/components/agency/plan-cards";
import { EmptyState, PageHeader } from "@/components/trips/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getMyAgency, requireRole } from "@/lib/auth/dal";
import { getTripCredits } from "@/lib/payments/credits";
import { formatDate, formatPrice } from "@/lib/trips/format";

export const metadata: Metadata = {
  title: "Billing",
};

export default async function AgencyBillingPage({ searchParams }: PageProps<"/agency/billing">) {
  const user = await requireRole(["agency"], "/agency/billing");
  const agency = await getMyAgency(user.id);
  if (!agency) {
    return (
      <Container className="py-10">
        <EmptyState title="No agency found for this account" description="Contact support to link your agency." />
      </Container>
    );
  }

  const [{ paid }, credits] = await Promise.all([searchParams, getTripCredits(agency.id)]);
  const approved = agency.status === "approved";

  return (
    <Container>
      <PageHeader
        title="Billing"
        description="Each trip you publish uses one trip from your plan. Buy a single trip, or a plan if you run trips often."
        actions={credits.available > 0 && approved ? <ButtonLink href="/agency/trips/new">New trip</ButtonLink> : undefined}
      />

      {paid && (
        <p role="status" className="mb-6 rounded-xl bg-muted px-4 py-3 text-sm font-medium">
          Payment received. Your plan is active.
        </p>
      )}

      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">Trips you can publish now</p>
        <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{credits.available}</p>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Buy trips</h2>
        {!approved && (
          <p className="mb-4 text-sm text-muted-foreground">
            You can buy a plan once an admin has approved your agency.
          </p>
        )}
        <PlanCards disabled={!approved} />
        <p className="mt-3 text-xs text-muted-foreground">
          One-time payments: plans don&apos;t renew by themselves. Unused trips expire with the plan, and a
          cancelled trip doesn&apos;t return its trip to the plan.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Your plans</h2>
        {credits.plans.length ? (
          <ul className="divide-y rounded-xl border bg-card text-sm">
            {credits.plans.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">
                    {p.name} · {formatPrice(p.price)}
                  </p>
                  <p className="text-muted-foreground">
                    Bought {formatDate(p.boughtAt)} · {p.active ? "valid until" : "ended"} {formatDate(p.expiresAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">
                    {p.tripsUsed}/{p.tripsTotal} used
                  </span>
                  <Badge tone={p.active ? "positive" : "neutral"}>{p.active ? "Active" : "Ended"}</Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">You haven&apos;t bought a plan yet.</p>
        )}
      </section>
    </Container>
  );
}
