"use server";

import type { UpdateQuery } from "mongoose";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/dal";
import { confirmEmailCode, sendEmailCode } from "@/lib/auth/email-verification";
import { sendOtp } from "@/lib/auth/otp";
import { linkPhone, phoneOwner } from "@/lib/auth/phone";
import { CompanionImage } from "@/lib/db/models/companion-image";
import { CompanionProfile, type CompanionProfileDoc } from "@/lib/db/models/companion-profile";
import { User, type UserDoc } from "@/lib/db/models/user";
import { dateInput } from "@/lib/form-utils";
import { normalizePhone } from "@/lib/phone";
import {
  BODY_TYPES,
  COMPANION_GENDERS,
  DEFAULT_DISTANCE_KM,
  DISTANCES,
  DRINKING,
  HOBBIES,
  MAX_AGE,
  MAX_HEIGHT_CM,
  MAX_HOBBIES,
  MAX_IMAGE_BYTES,
  MAX_PHOTOS,
  MAX_SEXUALITIES,
  MIN_AGE,
  MIN_HEIGHT_CM,
  MIN_HOBBIES,
  SELFIE_POSES,
  SEXUALITIES,
  SMOKING,
  ageFrom,
  isOption,
} from "./constants";
import { moderatePhoto } from "./moderation";
import { getCompanionAccount, getCompanionDraft } from "./queries";
import { imageUrl, resumeStep, type ActionResult, type CompanionDraft, type SelfieStatus } from "./types";
import { emailReviewRequest } from "./review-request";
import { isFrontend, remoteAction } from "@/lib/remote";

const fail = (error: string) => ({ ok: false as const, error });
const SIGNED_OUT = "Your session ended. Refresh the page and log in again.";

// ─── Phone: Companion needs a verified number on the signed-in account ───────

export async function sendCode(input: {
  countryCode: string;
  number: string;
}): Promise<{ ok: true; phone: string; devCode?: string } | { ok: false; error: string; retryAfter?: number }> {
  if (isFrontend()) return remoteAction("companion/actions.sendCode", [input]);
  const viewer = await getCurrentUser();
  if (!viewer) return fail(SIGNED_OUT);
  const phone = normalizePhone(String(input.countryCode), String(input.number));
  if (!phone) return fail("Enter a valid mobile number.");

  const owner = await phoneOwner(phone);
  if (owner && String(owner._id) !== viewer.id) {
    return fail("This number is linked to another account. Log out and log in with it instead.");
  }
  const sent = await sendOtp(phone);
  return sent.ok ? { ok: true, phone, devCode: sent.devCode } : sent;
}

export type VerifyResult =
  | { ok: true; draft: CompanionDraft; finished: boolean }
  | { ok: false; error: string };

/** Check the code and attach the number to the signed-in account. */
export async function verifyCode(input: { phone: string; code: string }): Promise<VerifyResult> {
  if (isFrontend()) return remoteAction("companion/actions.verifyCode", [input]);
  const viewer = await getCurrentUser();
  if (!viewer) return fail(SIGNED_OUT);
  const phone = String(input.phone ?? "");
  const code = String(input.code ?? "").trim();
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return fail("Start again with a valid mobile number.");
  if (!/^\d{6}$/.test(code)) return fail("Enter the 6-digit code.");

  const linked = await linkPhone(viewer.id, phone, code);
  if (!linked.ok) return linked;
  await User.updateOne({ _id: viewer.id }, { $addToSet: { platforms: "companion" } });

  const state = await getCompanionDraft(viewer.id);
  if (!state) return fail("Something went wrong. Please try again.");
  return { ok: true, draft: state.draft, finished: state.active && state.draft.selfie?.status === "verified" };
}

// ─── Email: the same check, with a code emailed to the account's address ─────

/** Email a 6-digit code to the signed-in account's address, instead of texting one. */
export async function sendEmailVerificationCode(): Promise<
  { ok: true; email: string; devCode?: string } | { ok: false; error: string; retryAfter?: number }
> {
  if (isFrontend()) return remoteAction("companion/actions.sendEmailVerificationCode", []);
  const viewer = await getCurrentUser();
  if (!viewer) return fail(SIGNED_OUT);
  return sendEmailCode(viewer.id);
}

/** Check the emailed code and mark the account's email as verified. */
export async function verifyEmailCode(input: { code: string }): Promise<VerifyResult> {
  if (isFrontend()) return remoteAction("companion/actions.verifyEmailCode", [input]);
  const viewer = await getCurrentUser();
  if (!viewer) return fail(SIGNED_OUT);
  const code = String(input?.code ?? "").trim();
  if (!/^\d{6}$/.test(code)) return fail("Enter the 6-digit code.");

  const confirmed = await confirmEmailCode(viewer.id, code);
  if (!confirmed.ok) return confirmed;
  await User.updateOne({ _id: viewer.id }, { $addToSet: { platforms: "companion" } });

  const state = await getCompanionDraft(viewer.id);
  if (!state) return fail("Something went wrong. Please try again.");
  return { ok: true, draft: state.draft, finished: state.active && state.draft.selfie?.status === "verified" };
}

// ─── Profile slides ──────────────────────────────────────────────────────────

/** The signed-in user, only once their phone or email is verified. */
async function companionUser(): Promise<CurrentUser | null> {
  const viewer = await getCurrentUser();
  if (!viewer) return null;
  const account = await getCompanionAccount(viewer.id);
  return account?.verified ? viewer : null;
}


/** Save profile fields, and optionally mirror some onto the shared account (see User). */
async function saveProfile(
  update: UpdateQuery<CompanionProfileDoc>,
  account?: { filter?: object; update: UpdateQuery<UserDoc> },
): Promise<ActionResult> {
  const viewer = await companionUser();
  if (!viewer) return fail(SIGNED_OUT);
  await CompanionProfile.updateOne({ user: viewer.id }, update, { upsert: true, runValidators: true });
  if (account) await User.updateOne({ ...account.filter, _id: viewer.id }, account.update);
  return { ok: true };
}

export async function saveBirthday(birthDate: string): Promise<ActionResult> {
  if (isFrontend()) return remoteAction("companion/actions.saveBirthday", [birthDate]);
  const date = dateInput(String(birthDate));
  if (!date || date > new Date()) return fail("Enter your date of birth.");
  const age = ageFrom(date);
  if (age < MIN_AGE) return fail(`You need to be ${MIN_AGE} or older to use Companion.`);
  if (age > MAX_AGE) return fail("Check the year of your date of birth.");

  return saveProfile(
    { $set: { birthDate: date } },
    { update: { $set: { birthYear: date.getUTCFullYear() } } },
  );
}

export async function saveLook(input: { heightCm: number; bodyType: string | null }): Promise<ActionResult> {
  if (isFrontend()) return remoteAction("companion/actions.saveLook", [input]);
  const heightCm = Math.round(Number(input.heightCm));
  if (!(heightCm >= MIN_HEIGHT_CM && heightCm <= MAX_HEIGHT_CM)) return fail("Choose your height.");
  const bodyType = input.bodyType && isOption(BODY_TYPES, input.bodyType) ? input.bodyType : undefined;
  return saveProfile(
    bodyType ? { $set: { heightCm, bodyType } } : { $set: { heightCm }, $unset: { bodyType: 1 } },
  );
}

export async function saveLocation(input: {
  city: string;
  lat?: number | null;
  lng?: number | null;
  maxDistanceKm?: number;
}): Promise<ActionResult> {
  if (isFrontend()) return remoteAction("companion/actions.saveLocation", [input]);
  const city = String(input.city ?? "").trim().slice(0, 80);
  if (city.length < 2) return fail("Enter the city you live in.");
  const maxDistanceKm = isOption(DISTANCES, String(input.maxDistanceKm))
    ? Number(input.maxDistanceKm)
    : DEFAULT_DISTANCE_KM;

  const lat = Number(input.lat);
  const lng = Number(input.lng);
  const hasPoint =
    input.lat != null && input.lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  // Rounded to ~1 km so an exact address is never stored.
  const round = (n: number) => Math.round(n * 100) / 100;

  if (!hasPoint) {
    // A point shared earlier stays (it's what distance matching uses), unless they've
    // typed a different city: then it no longer says where they are.
    const viewer = await companionUser();
    if (!viewer) return fail(SIGNED_OUT);
    await CompanionProfile.updateOne(
      { user: viewer.id, "location.city": { $ne: city } },
      { $unset: { "location.point": 1 } },
    );
  }
  return saveProfile(
    {
      $set: {
        "location.city": city,
        maxDistanceKm,
        ...(hasPoint && { "location.point": { type: "Point", coordinates: [round(lng), round(lat)] } }),
      },
    },
    // Fill in the Stranger Trips city too, but don't overwrite one they already set.
    { filter: { city: { $in: [null, ""] } }, update: { $set: { city } } },
  );
}

/** Change how far away the profiles on the discover page may be. */
export async function saveDistance(km: number): Promise<ActionResult> {
  if (isFrontend()) return remoteAction("companion/actions.saveDistance", [km]);
  if (!isOption(DISTANCES, String(km))) return fail("Choose a distance.");
  return saveProfile({ $set: { maxDistanceKm: Number(km) } });
}

export async function saveGender(gender: string): Promise<ActionResult> {
  if (isFrontend()) return remoteAction("companion/actions.saveGender", [gender]);
  if (!isOption(COMPANION_GENDERS, gender)) return fail("Choose an option.");
  return saveProfile({ $set: { gender } }, { update: { $set: { gender } } });
}

export async function saveSexuality(input: {
  sexuality: string[];
  showSexuality: boolean;
}): Promise<ActionResult> {
  if (isFrontend()) return remoteAction("companion/actions.saveSexuality", [input]);
  const sexuality = [...new Set(input.sexuality)].filter((s) => isOption(SEXUALITIES, s));
  if (!sexuality.length) return fail("Choose at least one option.");
  if (sexuality.length > MAX_SEXUALITIES) return fail(`Choose up to ${MAX_SEXUALITIES}.`);
  return saveProfile({ $set: { sexuality, showSexuality: !!input.showSexuality } });
}

export async function saveInterests(hobbies: string[]): Promise<ActionResult> {
  if (isFrontend()) return remoteAction("companion/actions.saveInterests", [hobbies]);
  const picked = [...new Set(hobbies)].filter((h) => isOption(HOBBIES, h));
  if (picked.length < MIN_HOBBIES) return fail(`Choose at least ${MIN_HOBBIES}.`);
  if (picked.length > MAX_HOBBIES) return fail(`Choose up to ${MAX_HOBBIES}.`);
  return saveProfile({ $set: { hobbies: picked } });
}

export async function saveLifestyle(input: { drinking: string; smoking: string }): Promise<ActionResult> {
  if (isFrontend()) return remoteAction("companion/actions.saveLifestyle", [input]);
  if (!isOption(DRINKING, input.drinking)) return fail("Tell us if you drink.");
  if (!isOption(SMOKING, input.smoking)) return fail("Tell us if you smoke.");
  return saveProfile({ $set: { drinking: input.drinking, smoking: input.smoking } });
}

// ─── Photos and selfie ───────────────────────────────────────────────────────

/** Read an uploaded image and check its bytes really are a JPEG, PNG or WebP. */
async function readImage(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return fail("Choose a photo.");
  if (file.size > MAX_IMAGE_BYTES) return fail("That photo is too large. Try a smaller one.");

  const data = Buffer.from(await file.arrayBuffer());
  const head = data.subarray(0, 12);
  const contentType =
    head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
      ? "image/jpeg"
      : head.subarray(0, 4).toString("hex") === "89504e47"
        ? "image/png"
        : head.subarray(0, 4).toString() === "RIFF" && head.subarray(8, 12).toString() === "WEBP"
          ? "image/webp"
          : null;
  if (!contentType) return fail("Use a JPEG, PNG or WebP photo.");
  return { ok: true as const, data, contentType };
}

export async function uploadPhoto(
  formData: FormData,
): Promise<{ ok: true; photo: { id: string; url: string } } | { ok: false; error: string }> {
  if (isFrontend()) return remoteAction("companion/actions.uploadPhoto", [formData]);
  const viewer = await companionUser();
  if (!viewer) return fail(SIGNED_OUT);

  const image = await readImage(formData.get("photo"));
  if (!image.ok) return image;

  const profile = await CompanionProfile.findOne({ user: viewer.id }).select("photos").lean();
  if ((profile?.photos.length ?? 0) >= MAX_PHOTOS) return fail(`You can add up to ${MAX_PHOTOS} photos.`);

  let verdict;
  try {
    verdict = await moderatePhoto(image.data);
  } catch (error) {
    console.error("Automatic photo check failed", error);
    return fail("We couldn't check your photo just now. Try again in a minute.");
  }
  if (!verdict.ok) return fail(verdict.reason);

  const doc = await CompanionImage.create({
    owner: viewer.id,
    kind: "photo",
    contentType: image.contentType,
    bytes: image.data.length,
    data: image.data,
  });
  await CompanionProfile.updateOne(
    { user: viewer.id },
    { $push: { photos: doc._id } },
    { upsert: true },
  );
  const id = String(doc._id);
  return { ok: true, photo: { id, url: imageUrl(id) } };
}

export async function removePhoto(photoId: string): Promise<ActionResult> {
  if (isFrontend()) return remoteAction("companion/actions.removePhoto", [photoId]);
  const viewer = await companionUser();
  if (!viewer) return fail(SIGNED_OUT);
  if (!/^[a-f\d]{24}$/i.test(String(photoId))) return fail("Photo not found.");

  await CompanionProfile.updateOne({ user: viewer.id }, { $pull: { photos: photoId } });
  await CompanionImage.deleteOne({ _id: photoId, owner: viewer.id, kind: "photo" });
  return { ok: true };
}

export async function submitSelfie(
  formData: FormData,
): Promise<
  { ok: true; selfie: { status: SelfieStatus; url: string; note?: string } } | { ok: false; error: string }
> {
  if (isFrontend()) return remoteAction("companion/actions.submitSelfie", [formData]);
  const viewer = await companionUser();
  if (!viewer) return fail(SIGNED_OUT);

  const pose = String(formData.get("pose") ?? "");
  if (!(SELFIE_POSES as readonly string[]).includes(pose)) return fail("Take the selfie again.");
  const image = await readImage(formData.get("selfie"));
  if (!image.ok) return image;

  const profile = await CompanionProfile.findOne({ user: viewer.id }).select("photos selfie").lean();
  if (!profile?.photos.length) return fail("Add a profile photo first.");

  const doc = await CompanionImage.create({
    owner: viewer.id,
    kind: "selfie",
    contentType: image.contentType,
    bytes: image.data.length,
    data: image.data,
  });
  // An admin compares it with the profile photos and decides (see /admin/verifications).
  await CompanionProfile.updateOne(
    { user: viewer.id },
    { $set: { selfie: { image: doc._id, pose, status: "pending", submittedAt: new Date() } } },
  );
  if (profile.selfie?.image) {
    await CompanionImage.deleteOne({ _id: profile.selfie.image, owner: viewer.id, kind: "selfie" });
  }
  await User.updateOne({ _id: viewer.id }, { $set: { "verification.identity": false } });

  // Every submission emails the admin, retakes included.
  const account = await User.findById(viewer.id).select("name phone email").lean();
  await emailReviewRequest({ name: account?.name ?? "Someone", phone: account?.phone, email: account?.email });

  return { ok: true, selfie: { status: "pending", url: imageUrl(String(doc._id)) } };
}

/** Current review state of the latest selfie; polled while it waits for an admin. */
export async function getSelfieStatus(): Promise<{ status: SelfieStatus; note?: string } | null> {
  if (isFrontend()) return remoteAction("companion/actions.getSelfieStatus", []);
  const viewer = await companionUser();
  if (!viewer) return null;
  const profile = await CompanionProfile.findOne({ user: viewer.id }).select("selfie").lean();
  const selfie = profile?.selfie;
  if (!selfie?.status) return null;
  return { status: selfie.status as SelfieStatus, note: selfie.note ?? undefined };
}

// ─── Done ────────────────────────────────────────────────────────────────────

export async function finishProfile(): Promise<ActionResult> {
  if (isFrontend()) return remoteAction("companion/actions.finishProfile", []);
  const viewer = await companionUser();
  if (!viewer) return fail(SIGNED_OUT);

  const state = await getCompanionDraft(viewer.id);
  if (!state || resumeStep(state.draft) !== "preview") {
    return fail("A few details are still missing. Go back and fill them in.");
  }

  await CompanionProfile.updateOne(
    { user: viewer.id, status: "draft" },
    { $set: { status: "active", completedAt: new Date() } },
  );
  return { ok: true };
}
