import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { durationLabel, formatDateRange, formatPrice } from "@/lib/trips/format";
import type { TravelPlanSummary } from "@/lib/trips/types";
import { BuddyRequestForm } from "./buddy-request-form";
import { CompatibilityBadge } from "./compatibility-badge";
import { TagList } from "./tag-list";

const STATUS_LABEL = {
  pending: "Request pending",
  accepted: "Request accepted — see My trips",
  declined: "Request declined",
};

export function PlanCard({
  plan,
  signedIn,
  myPersonality,
}: {
  plan: TravelPlanSummary;
  signedIn: boolean;
  myPersonality: string[];
}) {
  const { owner } = plan;

  return (
    <article className="flex flex-col rounded-xl border bg-card p-4 text-card-foreground sm:p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-muted font-semibold">
          {owner.firstName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {owner.firstName}
            {owner.age !== null && <span className="text-muted-foreground">, {owner.age}</span>}
            {plan.isMine && <span className="ml-2 text-xs text-muted-foreground">(your plan)</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {owner.city ? `${owner.city} · ` : ""}Trust {owner.trustScore}/100
          </p>
        </div>
        <CompatibilityBadge value={plan.compatibility} />
      </div>

      <h3 className="mt-4 text-lg font-semibold">
        {plan.origin} → {plan.destination}
      </h3>
      <p className="text-sm">
        {formatDateRange(plan.startDate, plan.endDate)}
        <span className="text-muted-foreground"> · {durationLabel(plan.startDate, plan.endDate)}</span>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Budget {formatPrice(plan.budget)}</p>

      {plan.note && <p className="mt-3 text-sm leading-relaxed">“{plan.note}”</p>}

      <p className="mt-4 text-xs font-medium text-muted-foreground uppercase">Looking for</p>
      <TagList tags={plan.lookingFor} highlight={myPersonality} className="mt-1.5" />

      <div className="mt-auto pt-5">
        {plan.isMine ? (
          <Link href="/trips/me#plans" className={buttonClasses({ variant: "outline", size: "sm" })}>
            Manage requests
          </Link>
        ) : !signedIn ? (
          <Link href="/login?next=/trips/buddies" className={buttonClasses({ variant: "outline", size: "sm" })}>
            Log in to connect
          </Link>
        ) : plan.myRequest ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">{STATUS_LABEL[plan.myRequest]}</p>
        ) : (
          <BuddyRequestForm planId={plan.id} ownerName={owner.firstName} />
        )}
      </div>
    </article>
  );
}
