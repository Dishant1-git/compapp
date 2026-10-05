"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { COMPANION_PLANS } from "@/lib/payments/pricing";
import { formatPrice } from "@/lib/trips/format";
import { cn } from "@/lib/utils";

/**
 * The three Companion subscriptions. Choosing one doesn't take a payment yet:
 * there is nothing for a subscription to unlock until requests can be sent.
 */
export function SubscriptionCards() {
  const [chosen, setChosen] = useState<string>();

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-3">
        {COMPANION_PLANS.map((plan) => (
          <li
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-xl border bg-card p-5",
              (chosen ? chosen === plan.id : plan.popular) && "border-primary",
            )}
          >
            {plan.popular && (
              <span className="eyebrow absolute -top-2.5 left-5 rounded-full bg-primary px-2.5 py-1 text-primary-foreground">
                Most popular
              </span>
            )}
            <p className="text-sm font-medium text-muted-foreground">{plan.months} months</p>
            <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{formatPrice(plan.price)}</p>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">
              {formatPrice(Math.round(plan.price / plan.months))} per month
            </p>
            <Button
              type="button"
              variant={chosen === plan.id ? "primary" : "outline"}
              className="mt-5"
              fullWidth
              aria-pressed={chosen === plan.id}
              onClick={() => setChosen(plan.id)}
            >
              {chosen === plan.id ? "Selected" : "Choose"}
            </Button>
          </li>
        ))}
      </ul>
      {chosen && (
        <p role="status" className="mt-4 rounded-lg border px-4 py-3 text-sm text-muted-foreground">
          Payments for Companion subscriptions aren&apos;t open yet. Nothing has been charged.
        </p>
      )}
    </>
  );
}
