import "server-only";
import { faceDistance, findFaces, type Face } from "./face-match";
import type { SelfieStatus } from "./types";

export type SelfieDecision = { status: SelfieStatus; note?: string; distance?: number };

// Tuned on face-api's sample faces: the same person (re-lit, flipped, rescaled)
// averaged 0.32 apart, clear faces of different people never came closer than 0.52.
const SAME_PERSON = 0.45;
const DIFFERENT_PERSON = 0.6;
/** Faces smaller or less certain than this are too unreliable to judge. */
const MIN_SCORE = 0.8;
const MIN_WIDTH = 60; // px, after scaling to 640

const clear = (f: Face) => f.score >= MIN_SCORE && f.width >= MIN_WIDTH;

/**
 * Decide whether a live selfie shows the same person as the profile photos.
 * Clear matches are verified and clear mismatches rejected straight away;
 * anything uncertain (or any error) goes to an admin at /admin/verifications.
 * The requested pose isn't checked automatically.
 */
export async function verifySelfie({ selfie, photos }: { selfie: Buffer; photos: Buffer[] }): Promise<SelfieDecision> {
  try {
    const inSelfie = await findFaces(selfie);
    if (!inSelfie.length || !clear(inSelfie[0])) {
      return { status: "rejected", note: "We couldn't see your face clearly. Face the camera in good light." };
    }
    if (inSelfie.filter(clear).length > 1) {
      return { status: "rejected", note: "Only you should be in the selfie." };
    }
    const me = inSelfie[0].descriptor;

    // Main photo first; stop as soon as one clearly matches.
    let best = Infinity;
    let anyFace = false;
    for (const photo of photos) {
      const faces = (await findFaces(photo)).filter(clear);
      anyFace ||= faces.length > 0;
      for (const face of faces) best = Math.min(best, faceDistance(me, face.descriptor));
      if (best <= SAME_PERSON) return { status: "verified", distance: best };
    }

    if (!anyFace) {
      return {
        status: "rejected",
        note: "None of your profile photos show your face clearly. Go back and add one, then retake the selfie.",
      };
    }
    if (best > DIFFERENT_PERSON) {
      return {
        status: "rejected",
        note: "Your selfie doesn't match your profile photos. Use photos of yourself, and take the selfie in good light.",
        distance: best,
      };
    }
    return { status: "pending", distance: best };
  } catch (error) {
    console.error("Automatic selfie check failed; leaving it for manual review", error);
    return { status: "pending" };
  }
}
