import {
  FIRST_PROFILE_STEP,
  MIN_HOBBIES,
  MIN_PHOTOS,
  ageFrom,
  type JoinStep,
} from "./constants";

export type SelfieStatus = "pending" | "verified" | "rejected";

/** Everything the join flow has collected so far, in a client-safe shape. */
export type CompanionDraft = {
  name: string;
  birthDate: string | null; // yyyy-mm-dd
  heightCm: number | null;
  bodyType: string | null;
  city: string;
  sharedLocation: boolean;
  maxDistanceKm: number;
  gender: string | null;
  sexuality: string[];
  showSexuality: boolean;
  hobbies: string[];
  drinking: string | null;
  smoking: string | null;
  photos: { id: string; url: string }[];
  /** `note` is the reviewer's reason when a selfie is rejected. */
  selfie: { status: SelfieStatus; url: string; note?: string } | null;
};

/** What other people see of a profile: an age, never the date of birth. */
export type PublicProfile = Pick<
  CompanionDraft,
  | "name"
  | "heightCm"
  | "bodyType"
  | "city"
  | "gender"
  | "sexuality"
  | "showSexuality"
  | "hobbies"
  | "drinking"
  | "smoking"
  | "photos"
> & { age: number | null; verified: boolean };

export function publicProfile(d: CompanionDraft): PublicProfile {
  return { ...d, age: d.birthDate ? ageFrom(d.birthDate) : null, verified: d.selfie?.status === "verified" };
}

/** Someone else's profile on the discover page. `distanceKm` is null when either side hasn't shared a location. */
export type NearbyProfile = PublicProfile & { id: string; distanceKm: number | null };

export type ActionResult ={ ok: true } | { ok: false; error: string };

/**
 * The first profile slide that still needs an answer. The preview only unlocks
 * once the selfie is verified; until then they stay on the selfie slide.
 */
export function resumeStep(d: CompanionDraft): JoinStep {
  if (!d.birthDate) return FIRST_PROFILE_STEP;
  if (!d.heightCm) return "look";
  if (!d.city) return "location";
  if (!d.gender) return "gender";
  if (!d.sexuality.length) return "sexuality";
  if (d.hobbies.length < MIN_HOBBIES) return "interests";
  if (!d.drinking || !d.smoking) return "lifestyle";
  if (d.photos.length < MIN_PHOTOS) return "photos";
  if (d.selfie?.status !== "verified") return "selfie";
  return "preview";
}

export function imageUrl(id: string) {
  return `/api/companion/images/${id}`;
}
