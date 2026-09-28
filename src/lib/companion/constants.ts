// Shared, client-safe constants for Companion onboarding.

/** Slides in the join flow, in order. The first three create or sign in the account. */
export const JOIN_STEPS = [
  "name",
  "phone",
  "otp",
  "birthday",
  "look",
  "location",
  "gender",
  "sexuality",
  "interests",
  "lifestyle",
  "photos",
  "selfie",
  "preview",
] as const;

export type JoinStep = (typeof JOIN_STEPS)[number];

/** First slide after the phone number is verified; you can't go back past it. */
export const FIRST_PROFILE_STEP: JoinStep = "birthday";

export const MIN_AGE = 18;
export const MAX_AGE = 100;
export const MIN_HEIGHT_CM = 120;
export const MAX_HEIGHT_CM = 230;
export const MIN_PHOTOS = 1;
export const MAX_PHOTOS = 6;
export const MAX_SEXUALITIES = 3;
export const MIN_HOBBIES = 3;
export const MAX_HOBBIES = 10;
/** Max size of one uploaded image, after the browser has resized it. */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

type Option = { readonly id: string; readonly label: string };

export const COMPANION_GENDERS = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
  { id: "unspecified", label: "Prefer not to say" },
] as const satisfies readonly Option[];

export const SEXUALITIES = [
  { id: "straight", label: "Straight" },
  { id: "gay", label: "Gay" },
  { id: "lesbian", label: "Lesbian" },
  { id: "bisexual", label: "Bisexual" },
  { id: "pansexual", label: "Pansexual" },
  { id: "asexual", label: "Asexual" },
  { id: "demisexual", label: "Demisexual" },
  { id: "queer", label: "Queer" },
  { id: "questioning", label: "Questioning" },
  { id: "other", label: "Something else" },
] as const satisfies readonly Option[];

export const BODY_TYPES = [
  { id: "slim", label: "Slim" },
  { id: "athletic", label: "Athletic" },
  { id: "average", label: "Average" },
  { id: "curvy", label: "Curvy" },
  { id: "muscular", label: "Muscular" },
  { id: "plus-size", label: "Plus-size" },
] as const satisfies readonly Option[];

export const HOBBIES = [
  { id: "travel", label: "Travel" },
  { id: "music", label: "Music" },
  { id: "movies", label: "Movies" },
  { id: "reading", label: "Reading" },
  { id: "cooking", label: "Cooking" },
  { id: "foodie", label: "Trying new food" },
  { id: "coffee", label: "Coffee" },
  { id: "fitness", label: "Gym & fitness" },
  { id: "yoga", label: "Yoga" },
  { id: "running", label: "Running" },
  { id: "cricket", label: "Cricket" },
  { id: "football", label: "Football" },
  { id: "trekking", label: "Trekking" },
  { id: "dancing", label: "Dancing" },
  { id: "singing", label: "Singing" },
  { id: "photography", label: "Photography" },
  { id: "art", label: "Art" },
  { id: "gaming", label: "Gaming" },
  { id: "anime", label: "Anime" },
  { id: "pets", label: "Pets" },
  { id: "fashion", label: "Fashion" },
  { id: "writing", label: "Writing" },
  { id: "volunteering", label: "Volunteering" },
  { id: "meditation", label: "Meditation" },
  { id: "board-games", label: "Board games" },
  { id: "concerts", label: "Concerts" },
  { id: "startups", label: "Startups" },
  { id: "tech", label: "Tech" },
] as const satisfies readonly Option[];

export const DRINKING = [
  { id: "never", label: "Never" },
  { id: "rarely", label: "Rarely" },
  { id: "socially", label: "Socially" },
  { id: "regularly", label: "Regularly" },
] as const satisfies readonly Option[];

export const SMOKING = [
  { id: "never", label: "Never" },
  { id: "occasionally", label: "Occasionally" },
  { id: "regularly", label: "Regularly" },
  { id: "quitting", label: "Trying to quit" },
] as const satisfies readonly Option[];

/**
 * Shown during the live selfie. A random one is picked each time so an old
 * photo can't be reused; reviewers check the selfie matches the pose.
 */
export const SELFIE_POSES = [
  "Hold up two fingers next to your face",
  "Touch your nose with one finger",
  "Give a thumbs up next to your chin",
  "Cover one eye with your hand",
  "Wave with your hand open",
] as const;

export const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)" },
  { code: "+1", label: "US / Canada (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+65", label: "Singapore (+65)" },
] as const;

export function optionLabel(options: readonly Option[], id: string | undefined) {
  return options.find((o) => o.id === id)?.label ?? id ?? "";
}

export function isOption(options: readonly Option[], value: unknown): value is string {
  return typeof value === "string" && options.some((o) => o.id === value);
}

/** "+91" + "98765 43210" → "+919876543210", or null if it doesn't look like a mobile number. */
export function normalizePhone(countryCode: string, number: string) {
  const digits = number.replace(/[\s()-]/g, "").replace(/^0+/, "");
  const full = digits.startsWith("+") ? digits : `${countryCode}${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(full) ? full : null;
}

/** "+919876543210" → "•••••••••3210", for showing which number a code was sent to. */
export function maskPhone(phone: string) {
  return `${"•".repeat(Math.max(phone.length - 5, 0))}${phone.slice(-4)}`;
}

export function ageFrom(birthDate: Date | string, now = new Date()) {
  const b = new Date(birthDate);
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

/** 170 → `5′ 7″` */
export function feetAndInches(cm: number) {
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}′ ${inches % 12}″`;
}
