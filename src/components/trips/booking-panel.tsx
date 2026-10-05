"use client";

import { Button, ButtonLink } from "@/components/ui/button";
import { AGE_CHECK_LABELS, GROUP_MIN_SIZE, GROUP_SEAT_FEE, SEAT_FEE, type AgeCheckStatus } from "@/lib/payments/pricing";
import { cancelBooking } from "@/lib/trips/actions";
import { formatPrice } from "@/lib/trips/format";

type Props = {
  slug: string;
  price: number;
  maxGroupSize: number;
  bookedCount: number;
  minAge: number;
  myBookingId: string | null;
  /** The viewer's booking, if any. */
  myBooking: { seats: number; ageCheck: AgeCheckStatus | null } | null;
  /** Seat fee they'd get back by cancelling now (0 if none is due). */
  cancelRefund: number;
  bookable: boolean;
  closedReason?: string;
  signedIn: boolean;
  /** Only travellers can book; agencies and admins see an explanation instead. */
  canBook: boolean;
  /** Rendered under the booking button (e.g. the interest toggle). */
  children?: React.ReactNode;
};

export function BookingPanel(props: Props) {
  const seatsLeft = Math.max(0, props.maxGroupSize - props.bookedCount);
  const filled = Math.min(100, Math.round((props.bookedCount / props.maxGroupSize) * 100));
  const here = `/trips/${props.slug}`;
  const ageCheck = props.myBooking?.ageCheck;

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
              You&apos;re going on this trip
              {props.myBooking && props.myBooking.seats > 1 ? ` (${props.myBooking.seats} seats).` : "."}
            </p>
            {ageCheck && ageCheck !== "verified" && (
              <ButtonLink
                href={`${here}/verify-age`}
                size="lg"
                variant={ageCheck === "required" ? "primary" : "outline"}
                fullWidth
                className="mt-3"
              >
                {ageCheck === "required" ? "Upload ID to verify age" : AGE_CHECK_LABELS[ageCheck]}
              </ButtonLink>
            )}
            <ButtonLink
              href={`${here}/group`}
              size="lg"
              variant={ageCheck === "required" ? "outline" : "primary"}
              fullWidth
              className="mt-3"
            >
              Open group chat
            </ButtonLink>
            {props.bookable && (
              <form
                action={cancelBooking.bind(null, props.myBookingId)}
                onSubmit={(e) => {
                  const refund = props.cancelRefund
                    ? `${formatPrice(props.cancelRefund)} of your seat fee will be refunded.`
                    : "Your seat fee won't be refunded this close to departure.";
                  if (!confirm(`Cancel your booking on this trip? ${refund}`)) e.preventDefault();
                }}
                className="mt-3"
              >
                <Button type="submit" variant="outline" fullWidth>
                  Cancel my booking
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
          <ButtonLink href={`${here}/book`} size="lg" fullWidth>
            Reserve my seat · {formatPrice(SEAT_FEE)}
          </ButtonLink>
        )}

        {props.children && <div className="mt-3">{props.children}</div>}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        A {formatPrice(SEAT_FEE)} seat fee reserves your place ({formatPrice(GROUP_SEAT_FEE)} each for groups of{" "}
        {GROUP_MIN_SIZE} or more). The trip price is paid to the agency directly. After paying you upload a photo
        ID so we can check your age. When you book, your name, phone and emergency contact are shared with the
        agency running the trip.
      </p>
    </div>
  );
}
