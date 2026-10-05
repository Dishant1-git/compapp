// Prices, plans and booking rules. Client-safe: plain values only.
// All amounts are in whole rupees.

export type AgencyPlanId = "single" | "monthly" | "annual";

/** What an agency buys to publish trips. Each published trip uses one credit. */
export const AGENCY_PLANS = [
  {
    id: "single",
    name: "Single trip",
    trips: 1,
    price: 1500,
    validDays: 365,
    blurb: "Publish one trip. Use it any time in the next 12 months.",
  },
  {
    id: "monthly",
    name: "Monthly",
    trips: 10,
    price: 12500,
    validDays: 30,
    blurb: "Publish up to 10 trips in the next 30 days.",
  },
  {
    id: "annual",
    name: "Annual",
    trips: 150,
    price: 142500,
    validDays: 365,
    blurb: "Publish up to 150 trips in the next 12 months.",
  },
] as const satisfies readonly {
  id: AgencyPlanId;
  name: string;
  trips: number;
  price: number;
  validDays: number;
  blurb: string;
}[];

export function agencyPlan(id: string) {
  return AGENCY_PLANS.find((p) => p.id === id);
}

// ─── Traveller seat fee ──────────────────────────────────────────────────────

/** Platform fee to reserve one seat. The trip price itself is paid to the agency. */
export const SEAT_FEE = 299;
/** Per-person fee when booking as a group. */
export const GROUP_SEAT_FEE = 249;
export const GROUP_MIN_SIZE = 3;
export const GROUP_MAX_SIZE = 12;
/** A group may include under-18s as long as this many adults travel with them. */
export const GROUP_MIN_ADULTS = 2;
export const ADULT_AGE = 18;

export function seatFee(seats: number) {
  return seats >= GROUP_MIN_SIZE ? GROUP_SEAT_FEE : SEAT_FEE;
}

/** Age in full years on `now` (UTC). */
export function ageOn(birthDate: Date | string, now = new Date()) {
  const b = new Date(birthDate);
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

// ─── Refunds ─────────────────────────────────────────────────────────────────

/**
 * How much of the seat fee comes back when a traveller cancels, or fails the
 * age check, depending on how long is left before the trip starts. First
 * matching row wins. A trip cancelled by the agency or an admin is always
 * refunded in full.
 */
export const REFUND_SCHEDULE = [
  { minDays: 7, percent: 100, label: "7 or more days before departure" },
  { minDays: 3, percent: 50, label: "3 to 6 days before departure" },
  { minDays: 0, percent: 0, label: "Less than 3 days before departure" },
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export function refundPercent(startDate: Date | string, now = new Date()) {
  const days = (+new Date(startDate) - +now) / DAY_MS;
  return REFUND_SCHEDULE.find((row) => days >= row.minDays)?.percent ?? 0;
}

// ─── Consent and age proof ───────────────────────────────────────────────────

/** Bump when the rules change, so each booking records which text was accepted. */
export const CONSENT_VERSION = "2026-10";

export const CONSENT_RULES = [
  "I am joining a group trip with people I may not know, and I take part at my own risk.",
  `I am ${ADULT_AGE} or older. If I book for a group, at least ${GROUP_MIN_ADULTS} travellers are ${ADULT_AGE} or older and they are responsible for anyone younger.`,
  "I will upload a valid government ID (Aadhaar or another accepted document) after paying, so my age can be checked. If the check fails, my booking is cancelled.",
  "I will carry the original of that ID on the trip and show it to the trip captain when asked.",
  "I will follow the trip captain's safety instructions and the agency's itinerary.",
  "I will treat fellow travellers with respect. Harassment, violence or discrimination means removal from the trip without a refund.",
  "I will not carry or use illegal drugs or weapons, and I will follow local laws.",
  "I am medically fit to travel and have told the agency about any condition that could affect the trip.",
  "The seat fee is paid to the platform to reserve my seat. The trip price is paid to the agency, which is responsible for running the trip.",
  "If I cancel, or my age check fails, the seat fee is refunded according to how long is left before departure, as shown below.",
  "My name, phone number and emergency contact are shared with the agency running the trip.",
] as const;

export const ID_DOC_TYPES = [
  { id: "aadhaar", label: "Aadhaar card" },
  { id: "passport", label: "Passport" },
  { id: "driving_licence", label: "Driving licence" },
  { id: "voter_id", label: "Voter ID" },
  { id: "pan", label: "PAN card" },
] as const;

export type IdDocType = (typeof ID_DOC_TYPES)[number]["id"];

export const MAX_ID_DOC_BYTES = 2 * 1024 * 1024;

export type AgeCheckStatus = "required" | "pending" | "verified" | "rejected";

export const AGE_CHECK_LABELS: Record<AgeCheckStatus, string> = {
  required: "ID needed",
  pending: "ID under review",
  verified: "Age verified",
  rejected: "Age check failed",
};
