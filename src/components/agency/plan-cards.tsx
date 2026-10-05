"use client";

import { useCheckout } from "@/components/payments/use-checkout";
import { Button } from "@/components/ui/button";
import { startPlanPurchase } from "@/lib/payments/actions";
import { AGENCY_PLANS } from "@/lib/payments/pricing";
import { formatPrice } from "@/lib/trips/format";

/** The three plans an agency can buy, each with a pay button. */
export function PlanCards({ disabled }: { disabled?: boolean }) {
  const { pay, pending, error } = useCheckout();

  return (
    <>
      <ul className="grid gap-4 md:grid-cols-3">
        {AGENCY_PLANS.map((plan) => (
          <li key={plan.id} className="flex flex-col rounded-xl border bg-card p-5">
            <p className="text-sm font-medium text-muted-foreground">{plan.name}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{formatPrice(plan.price)}</p>
            <p className="mt-1 text-sm">
              {plan.trips} trip{plan.trips === 1 ? "" : "s"}
              {plan.trips > 1 && (
                <span className="text-muted-foreground">
                  {" "}
                  · {formatPrice(Math.round(plan.price / plan.trips))} per trip
                </span>
              )}
            </p>
            <p className="mt-3 flex-1 text-sm text-muted-foreground">{plan.blurb}</p>
            <Button
              type="button"
              className="mt-5"
              fullWidth
              disabled={disabled || pending}
              onClick={() => pay(() => startPlanPurchase(plan.id))}
            >
              {pending ? "Working…" : `Buy ${plan.name.toLowerCase()}`}
            </Button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-destructive/40 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
