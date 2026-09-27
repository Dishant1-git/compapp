// Shared, client-safe constants for Stranger Trips.

export const PERSONALITIES = [
  { id: "party", label: "Party" },
  { id: "adventure", label: "Adventure" },
  { id: "chill", label: "Chill" },
  { id: "social", label: "Social" },
  { id: "introvert", label: "Introvert" },
  { id: "photography", label: "Photography" },
  { id: "food", label: "Food" },
  { id: "nightlife", label: "Nightlife" },
  { id: "trekking", label: "Trekking" },
  { id: "culture", label: "Culture" },
] as const;

export type Personality = (typeof PERSONALITIES)[number]["id"];

export const PERSONALITY_IDS = PERSONALITIES.map((p) => p.id) as Personality[];

export function personalityLabel(id: string) {
  return PERSONALITIES.find((p) => p.id === id)?.label ?? id;
}

export function isPersonality(value: string): value is Personality {
  return (PERSONALITY_IDS as string[]).includes(value);
}

export const GENDERS = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
  { id: "non-binary", label: "Non-binary" },
  { id: "unspecified", label: "Prefer not to say" },
] as const;

export type Gender = (typeof GENDERS)[number]["id"];

export const REPORT_REASONS = [
  { id: "harassment", label: "Harassment or abuse" },
  { id: "fake-profile", label: "Fake profile" },
  { id: "safety", label: "Safety concern" },
  { id: "scam", label: "Scam or payment request" },
  { id: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["id"];

/** National emergency number shown in the safety panel. */
export const EMERGENCY_NUMBER = "112";
