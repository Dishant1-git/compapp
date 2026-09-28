import {
  FIRST_PROFILE_STEP,
  MIN_HOBBIES,
  MIN_PHOTOS,
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

export type ActionResult = { ok: true } | { ok: false; error: string };

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
