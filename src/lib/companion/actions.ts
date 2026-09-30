"use server";

import type { UpdateQuery } from "mongoose";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/dal";
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
import { verifySelfie } from "./verification";

const fail = (error: string) => ({ ok: false as const, error });
const SIGNED_OUT = "Your session ended. Refresh the page and log in again.";

// ─── Phone: Companion needs a verified number on the signed-in account ───────

export async function sendCode(input: {
  countryCode: string;
  number: string;
}): Promise<{ ok: true; phone: string; devCode?: string } | { ok: false; error: string; retryAfter?: number }> {
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

// ─── Profile slides ──────────────────────────────────────────────────────────

/** The signed-in user, only once their phone is verified. */
async function companionUser(): Promise<CurrentUser | null> {
  const viewer = await getCurrentUser();
  if (!viewer) return null;
  const account = await getCompanionAccount(viewer.id);
  return account?.phoneVerified ? viewer : null;
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
}): Promise<ActionResult> {
  const city = String(input.city ?? "").trim().slice(0, 80);
  if (city.length < 2) return fail("Enter the city you live in.");

  const lat = Number(input.lat);
  const lng = Number(input.lng);
  const hasPoint =
    input.lat != null && input.lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  // Rounded to ~1 km so an exact address is never stored.
  const round = (n: number) => Math.round(n * 100) / 100;

  return saveProfile(
    hasPoint
      ? { $set: { "location.city": city, "location.point": { type: "Point", coordinates: [round(lng), round(lat)] } } }
      : { $set: { "location.city": city }, $unset: { "location.point": 1 } },
    // Fill in the Stranger Trips city too, but don't overwrite one they already set.
    { filter: { city: { $in: [null, ""] } }, update: { $set: { city } } },
  );
}

export async function saveGender(gender: string): Promise<ActionResult> {
  if (!isOption(COMPANION_GENDERS, gender)) return fail("Choose an option.");
  return saveProfile({ $set: { gender } }, { update: { $set: { gender } } });
}

export async function saveSexuality(input: {
  sexuality: string[];
  showSexuality: boolean;
}): Promise<ActionResult> {
  const sexuality = [...new Set(input.sexuality)].filter((s) => isOption(SEXUALITIES, s));
  if (!sexuality.length) return fail("Choose at least one option.");
  if (sexuality.length > MAX_SEXUALITIES) return fail(`Choose up to ${MAX_SEXUALITIES}.`);
  return saveProfile({ $set: { sexuality, showSexuality: !!input.showSexuality } });
}

export async function saveInterests(hobbies: string[]): Promise<ActionResult> {
  const picked = [...new Set(hobbies)].filter((h) => isOption(HOBBIES, h));
  if (picked.length < MIN_HOBBIES) return fail(`Choose at least ${MIN_HOBBIES}.`);
  if (picked.length > MAX_HOBBIES) return fail(`Choose up to ${MAX_HOBBIES}.`);
  return saveProfile({ $set: { hobbies: picked } });
}

export async function saveLifestyle(input: { drinking: string; smoking: string }): Promise<ActionResult> {
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
  const viewer = await companionUser();
  if (!viewer) return fail(SIGNED_OUT);

  const pose = String(formData.get("pose") ?? "");
  if (!(SELFIE_POSES as readonly string[]).includes(pose)) return fail("Take the selfie again.");
  const image = await readImage(formData.get("selfie"));
  if (!image.ok) return image;

  const profile = await CompanionProfile.findOne({ user: viewer.id }).select("photos selfie").lean();
  if (!profile?.photos.length) return fail("Add a profile photo first.");

  let decision;
  try {
    decision = await verifySelfie({ selfie: image.data, photos: await photoData(viewer.id, profile.photos) });
  } catch (error) {
    console.error("Automatic selfie check failed", error);
    return fail("We couldn't check your selfie just now. Try again in a minute.");
  }
  const { status, note, distance } = decision;

  const doc = await CompanionImage.create({
    owner: viewer.id,
    kind: "selfie",
    contentType: image.contentType,
    bytes: image.data.length,
    data: image.data,
  });
  await CompanionProfile.updateOne(
    { user: viewer.id },
    {
      $set: {
        selfie: {
          image: doc._id,
          pose,
          status,
          note,
          matchDistance: distance,
          submittedAt: new Date(),
          reviewedAt: new Date(), // decided automatically
        },
      },
    },
  );
  if (profile.selfie?.image) {
    await CompanionImage.deleteOne({ _id: profile.selfie.image, owner: viewer.id, kind: "selfie" });
  }
  await User.updateOne({ _id: viewer.id }, { $set: { "verification.identity": status === "verified" } });

  return { ok: true, selfie: { status, url: imageUrl(String(doc._id)), note } };
}

/**
 * Current review state of the latest selfie; polled while it's pending.
 * Pending selfies are left over from when unsure checks waited for an admin,
 * so they're decided automatically here.
 */
export async function getSelfieStatus(): Promise<{ status: SelfieStatus; note?: string } | null> {
  const viewer = await companionUser();
  if (!viewer) return null;
  const profile = await CompanionProfile.findOne({ user: viewer.id }).select("photos selfie").lean();
  const selfie = profile?.selfie;
  if (!profile || !selfie?.status) return null;
  if (selfie.status !== "pending" || !selfie.image) {
    return { status: selfie.status as SelfieStatus, note: selfie.note ?? undefined };
  }

  const shot = await CompanionImage.findOne({ _id: selfie.image, owner: viewer.id, kind: "selfie" }).select("+data");
  if (!shot) return { status: "pending" };
  let decision;
  try {
    decision = await verifySelfie({ selfie: shot.data, photos: await photoData(viewer.id, profile.photos) });
  } catch (error) {
    console.error("Automatic selfie re-check failed", error);
    return { status: "pending" }; // tried again on the next poll
  }
  const { status, note, distance } = decision;
  // Only if it's still the same selfie, so a retake taken meanwhile wins.
  const updated = await CompanionProfile.updateOne(
    { user: viewer.id, "selfie.image": selfie.image, "selfie.status": "pending" },
    { $set: { "selfie.status": status, "selfie.note": note, "selfie.matchDistance": distance, "selfie.reviewedAt": new Date() } },
  );
  if (updated.modifiedCount) {
    await User.updateOne({ _id: viewer.id }, { $set: { "verification.identity": status === "verified" } });
  }
  return { status, note };
}

/** Image data of the profile photos, main photo first, for the face match. */
async function photoData(userId: string, ids: unknown[]) {
  const found = await CompanionImage.find({ _id: { $in: ids }, owner: userId }).select("+data");
  const order = ids.map(String);
  return found.sort((a, b) => order.indexOf(String(a._id)) - order.indexOf(String(b._id))).map((p) => p.data);
}

// ─── Done ────────────────────────────────────────────────────────────────────

export async function finishProfile(): Promise<ActionResult> {
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
