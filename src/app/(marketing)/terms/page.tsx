import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/layout/legal-page";
import { ADULT_AGE, CONSENT_RULES, GROUP_MIN_ADULTS, GROUP_MIN_SIZE } from "@/lib/payments/pricing";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms of use",
  description: `The rules for using ${siteConfig.name}.`,
};

const link = "font-medium text-foreground underline underline-offset-4";

export default function TermsPage() {
  const name = siteConfig.name;
  return (
    <LegalPage title="Terms of use" updated="5 October 2026">
      <LegalSection title="What we are">
        <p>
          {name} is a platform where travel agencies publish group trips and travellers book seats on them, and
          where people can find companions for trips and outings. The agency named on a trip organises and runs
          it. {name} is not a travel agency or tour operator and does not run the trips.
        </p>
      </LegalSection>

      <LegalSection title="Who can use it">
        <ul>
          <li>You must be {ADULT_AGE} or older to create an account.</li>
          <li>Give accurate details and keep them up to date. One person, one account.</li>
          <li>Keep your password and login codes to yourself. You are responsible for what happens in your account.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Booking a trip">
        <ul>
          <li>You reserve a seat by paying the seat fee. The trip price is paid to the agency, which is responsible for delivering the trip.</li>
          <li>Solo travellers must meet the trip&apos;s minimum age. A group of {GROUP_MIN_SIZE} or more must include at least {GROUP_MIN_ADULTS} people aged {ADULT_AGE} or older, who are responsible for anyone younger.</li>
          <li>After paying you must upload a government photo ID so ages can be checked. If the check fails, the booking is cancelled.</li>
          <li>Cancellations and refunds follow our <Link href="/refunds" className={link}>refund policy</Link>.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Rules you accept when you book">
        <ul>
          {CONSENT_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title="Agencies">
        <ul>
          <li>Agencies are reviewed before they can publish trips, and must keep their registration details accurate.</li>
          <li>Publishing a trip uses one trip from a paid plan. Plans are described in the <Link href="/refunds" className={link}>refund policy</Link>.</li>
          <li>The agency is responsible for the trip it publishes: the itinerary, transport, stays, safety, permits and any refund of the trip price.</li>
          <li>Traveller contact and emergency details are shared only to run the trip, and must be kept private.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Behaviour">
        <ul>
          <li>Treat other people with respect. No harassment, threats, hate speech, scams or sexual content sent to people who haven&apos;t asked for it.</li>
          <li>Use your own, recent photos. Don&apos;t pretend to be someone else.</li>
          <li>Don&apos;t use the platform for anything illegal, or to advertise other services.</li>
        </ul>
        <p>You can report anyone from a trip page. We may warn, suspend or remove accounts that break these rules, and cancel their bookings.</p>
      </LegalSection>

      <LegalSection title="Safety and responsibility">
        <p>
          Travelling and meeting new people carries risk. We check agencies, ages and photos, but we cannot
          guarantee how any person or agency will behave, or that a trip will run as described. To the extent
          the law allows, {name} is not liable for loss, injury or damage arising from a trip or a meeting
          arranged through the platform. Nothing here limits rights you have by law.
        </p>
      </LegalSection>

      <LegalSection title="Your information">
        <p>
          How we handle personal information is explained in our <Link href="/privacy" className={link}>privacy policy</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update these terms. If a change is significant we will tell you in the app before it applies.
          Continuing to use {name} after that means you accept the new terms.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
