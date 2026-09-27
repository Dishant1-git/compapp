"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { bookTrip, cancelBooking } from "@/lib/trips/actions";
import { formatPrice } from "@/lib/trips/format";
import type { ActionState } from "@/lib/trips/types";
import { cn } from "@/lib/utils";

type Props = {
  tripId: string;
  slug: string;
  price: number;
  maxGroupSize: number;
  bookedCount: number;
  minAge: number;
  myBookingId: string | null;
  bookable: boolean;
  closedReason?: string;
  signedIn: boolean;
  /** Only travellers can book; agencies and admins see an explanation instead. */
  canBook: boolean;
  /** Rendered under the booking button (e.g. the interest toggle). */
  children?: React.ReactNode;
};

export function BookingPanel(props: Props) {
  const [state, action, pending] = useActionState<ActionState>(bookTrip.bind(null, props.tripId), {});
  const seatsLeft = Math.max(0, props.maxGroupSize - props.bookedCount);
  const filled = Math.min(100, Math.round((props.bookedCount / props.maxGroupSize) * 100));
  const here = `/trips/${props.slug}`;

  return (
    <div id="book" className="scroll-mt-20 rounded-xl border bg-card p-5 text-card-foreground sm:p-6">
      <p className="text-3xl font-bold">{formatPrice(props.price)}</p>
      <p className="text-sm text-muted-foreground">per person · ages {props.minAge}+</p>

      <div className="mt-5">
        <div className="flex justify-between text-sm">
          <span className="font-medium">{props.bookedCount} going</span>
          <span className="text-muted-foreground">
            {seatsLeft === 0 ? "Full" : `${seatsLeft} of ${props.maxGroupSize} seats left`}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary" style={{ width: `${filled}%` }} />
        </div>
      </div>

      <div className="mt-6">
        {props.myBookingId ? (
          <>
            <p className="rounded-lg bg-muted px-4 py-3 text-sm font-medium">
              You&apos;re going on this trip.
            </p>
            <ButtonLink href={`${here}/group`} size="lg" fullWidth className="mt-3">
              Open group chat
            </ButtonLink>
            {props.bookable && (
              <form
                action={cancelBooking.bind(null, props.myBookingId)}
                onSubmit={(e) => {
                  if (!confirm("Cancel your seat on this trip?")) e.preventDefault();
                }}
                className="mt-3"
              >
                <Button type="submit" variant="outline" fullWidth>
                  Cancel my seat
                </Button>
              </form>
            )}
          </>
        ) : !props.signedIn ? (
          <ButtonLink href={`/login?next=${encodeURIComponent(here)}`} size="lg" fullWidth>
            Log in to book
          </ButtonLink>
        ) : !props.canBook ? (
          <p className="rounded-lg bg-muted px-4 py-3 text-sm">
            Agency and admin accounts can&apos;t book seats. Use a traveller account to join trips.
          </p>
        ) : !props.bookable || seatsLeft === 0 ? (
          <Button size="lg" fullWidth disabled>
            {props.closedReason ?? "Trip is full"}
          </Button>
        ) : (
          <form action={action}>
            <Button type="submit" size="lg" fullWidth disabled={pending}>
              {pending ? "Reserving…" : "Reserve my seat"}
            </Button>
          </form>
        )}

        {state.message && (
          <p
            role="status"
            className={cn(
              "mt-3 rounded-lg px-4 py-3 text-sm",
              state.success ? "bg-muted" : "border border-destructive/40 text-destructive",
            )}
          >
            {state.message}
            {state.errors?.profile && (
              <>
                {" "}
                <Link
                  href={`/trips/profile?next=${encodeURIComponent(here)}`}
                  className="font-medium underline underline-offset-4"
                >
                  Complete profile
                </Link>
              </>
            )}
          </p>
        )}
        {props.children && <div className="mt-3">{props.children}</div>}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        No online payment yet — pay the agency directly. Free cancellation until departure. When you
        book, your name, phone and emergency contact are shared with the agency running the trip.
      </p>
    </div>
  );
}
