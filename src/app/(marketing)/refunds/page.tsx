import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/layout/legal-page";
import { AGENCY_PLANS, GROUP_MIN_SIZE, GROUP_SEAT_FEE, REFUND_SCHEDULE, SEAT_FEE } from "@/lib/payments/pricing";
import { siteConfig } from "@/lib/site-config";
import { formatPrice } from "@/lib/trips/format";

export const metadata: Metadata = {
  title: "Refunds and cancellations",
  description: `How cancellations and refunds work on ${siteConfig.name}.`,
};

export default function RefundsPage() {
  return (
    <LegalPage title="Refunds and cancellations" updated="5 October 2026">
      <LegalSection title="What you pay us">
        <p>
          Travellers pay a <strong>seat fee</strong> to reserve a place on a trip: {formatPrice(SEAT_FEE)} per
          person, or {formatPrice(GROUP_SEAT_FEE)} per person for a group of {GROUP_MIN_SIZE} or more. The seat
          fee is paid to {siteConfig.name}.
        </p>
        <p>
          The <strong>trip price</strong> is separate. You pay it to the travel agency running the trip, and the
          agency is responsible for refunding it under its own terms.
        </p>
      </LegalSection>

      <LegalSection title="If you cancel your booking">
        <p>You can cancel from the trip page any time before the trip starts. The seat fee comes back depending on how long is left before departure:</p>
        <ul>
          {REFUND_SCHEDULE.map((row) => (
            <li key={row.minDays}>
              {row.label}: <strong>{row.percent === 0 ? "no refund" : `${row.percent}% refund`}</strong>
            </li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title="If your age check fails">
        <p>
          After paying, you upload a government photo ID so we can check ages. If the ID shows the age rules
          for the trip are not met, the booking is cancelled and the seat fee is refunded on the same schedule
          as above. If a photo is only unclear, we ask for a new one and your seat is kept.
        </p>
      </LegalSection>

      <LegalSection title="If the trip is cancelled">
        <p>
          When the agency or {siteConfig.name} cancels a trip, every seat fee for it is refunded{" "}
          <strong>in full</strong>, whatever the date.
        </p>
      </LegalSection>

      <LegalSection title="How refunds are paid">
        <p>
          Refunds go back to the card, UPI ID or account you paid with, through Razorpay. They usually arrive
          in 5 to 7 working days, depending on your bank.
        </p>
      </LegalSection>

      <LegalSection title="Agency plans">
        <p>
          Agencies pay to publish trips: {AGENCY_PLANS.map((p) => `${formatPrice(p.price)} for ${p.trips} trip${p.trips === 1 ? "" : "s"}`).join(", ")}.
          These are one-time payments and do not renew by themselves. Trips not used before a plan ends expire
          with it, and cancelling a published trip does not return it to the plan.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
