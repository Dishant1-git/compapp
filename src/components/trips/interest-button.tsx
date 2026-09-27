"use client";

import { useFormStatus } from "react-dom";
import { toggleInterest } from "@/lib/trips/actions";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";

function Submit({ interested, count }: { interested: boolean; count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={interested}
      className={cn(buttonClasses({ variant: interested ? "secondary" : "outline", fullWidth: true }))}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill={interested ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
      {interested ? "Interested" : "I'm interested"}
      {count > 0 && <span className="text-muted-foreground">· {count}</span>}
    </button>
  );
}

/** Lets travellers signal interest; the agency sees who's interested. */
export function InterestButton({
  tripId,
  interested,
  count,
}: {
  tripId: string;
  interested: boolean;
  count: number;
}) {
  return (
    <form action={toggleInterest.bind(null, tripId)}>
      <Submit interested={interested} count={count} />
    </form>
  );
}
