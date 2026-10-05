import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/layout/legal-page";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `What ${siteConfig.name} collects, why, and who sees it.`,
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="5 October 2026">
      <LegalSection title="What we collect">
        <ul>
          <li><strong>Account details:</strong> your name, email address or phone number, and a password, which is stored only as a one-way hash.</li>
          <li><strong>Profile:</strong> city, year or date of birth, gender, bio, travel interests and an emergency contact.</li>
          <li><strong>Companion profile:</strong> photos, a verification selfie, height, lifestyle answers and, if you allow it, your location rounded to about 1 km.</li>
          <li><strong>Bookings:</strong> the trips you book, the names and dates of birth of people travelling with you, and the rules you accepted.</li>
          <li><strong>Proof of age:</strong> a photo of a government ID, uploaded after you pay a seat fee.</li>
          <li><strong>Payments:</strong> the amount, status and reference of each payment. Card and UPI details are entered with Razorpay and never reach our servers.</li>
          <li><strong>Messages and reports:</strong> what you post in trip group chats and any report you send about another person.</li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use it">
        <ul>
          <li>To run your account, show you trips and people that match, and process bookings and payments.</li>
          <li>To keep the community safe: checking ages, verifying that Companion photos show the person who uploaded them, screening photos for nudity, and reviewing reports. The photo checks are automated.</li>
          <li>To contact you about your account, bookings and refunds, by notification, email or text message.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Who sees your information">
        <ul>
          <li><strong>Other travellers</strong> see your first name, age, city and interests. Your contact details are shared with another traveller only after you accept their buddy request.</li>
          <li><strong>The agency running a trip you book</strong> sees your name, phone number, email, age and emergency contact, and the names and ages of people on your booking.</li>
          <li><strong>Our verification team</strong> sees ID photos and selfies. Agencies and other travellers never do.</li>
          <li><strong>Service providers</strong> that work for us: Razorpay for payments, Brevo for email, and an SMS provider for one-time codes. They receive only what they need to do that job.</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          ID photos are deleted as soon as the age check is decided, or when the booking is cancelled. One-time
          codes are deleted within a day. Other information is kept while your account is open, and payment
          records for as long as the law requires.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          We use one cookie, which keeps you signed in for up to 7 days. We do not use advertising or tracking
          cookies. The Razorpay payment window may set its own cookies when you pay.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <p>
          You can correct your profile at any time from your account. To get a copy of your information, or to
          have your account and its data deleted, write to us using the contact below.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
