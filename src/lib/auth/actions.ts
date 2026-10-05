"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import { Agency } from "@/lib/db/models/agency";
import { User } from "@/lib/db/models/user";
import { notify } from "@/lib/notifications";
import { normalizePhone } from "@/lib/phone";
import type { PlatformId } from "@/lib/site-config";
import { checkPassword, EMAIL_RE } from "./credentials";
import { afterSignUp, getCurrentUser, homeFor, productOf, safeNext, type Role } from "./dal";
import { emailProblem } from "./email-policy";
import { confirmEmailCode, sendEmailCode, sendVerificationEmail } from "./email-verification";
import { sendOtp } from "./otp";
import { phoneOwner, signInWithPhone, SUSPENDED } from "./phone";
import { createSession, deleteSession } from "./session";

export type FormState = {
  errors?: Record<string, string[]>;
  message?: string;
  /** Echoed back so fields keep their values after React resets the form. Never includes passwords. */
  values?: { name?: string; email?: string; platforms?: PlatformId[]; [key: string]: unknown };
};

const PLATFORMS: PlatformId[] = ["trips", "companion"];

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const errors: Record<string, string[]> = {};
  if (!EMAIL_RE.test(email)) errors.email = ["Enter a valid email address."];
  if (!password) errors.password = ["Enter your password."];
  const values = { email };
  if (Object.keys(errors).length) return { errors, values };

  const checked = await checkPassword(email, password);
  if (!checked.ok) return { message: checked.error, values };
  const { user } = checked;

  await createSession({ userId: user.id, role: user.role });
  redirect(safeNext(formData.get("next"), homeFor(user.role as Role)));
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const platforms = formData
    .getAll("platforms")
    .map(String)
    .filter((p): p is PlatformId => PLATFORMS.includes(p as PlatformId));

  const errors: Record<string, string[]> = {};
  if (name.length < 2) errors.name = ["Enter your full name."];
  if (!EMAIL_RE.test(email)) errors.email = ["Enter a valid email address."];
  if (password.length < 8) errors.password = ["Password must be at least 8 characters."];
  if (!platforms.length) errors.platforms = ["Choose at least one platform."];
  if (formData.get("terms") !== "on") errors.terms = ["You must accept the terms."];
  const values = { name, email, platforms };
  if (Object.keys(errors).length) return { errors, values };

  const problem = await emailProblem(email);
  if (problem) return { errors: { email: [problem] }, values };

  await connectDB();
  if (await User.exists({ email })) {
    return { errors: { email: ["An account with this email already exists."] }, values };
  }

  const user = await User.create({
    name,
    email,
    platforms,
    passwordHash: await bcrypt.hash(password, 10),
  });

  await createSession({ userId: String(user._id), role: user.role });
  await emailVerificationLink(String(user._id));
  // Onboarding for the product they came for, then back to where they were going.
  redirect(afterSignUp(formData.get("next"), platforms));
}

// ─── Phone number + one-time code ────────────────────────────────────────────

type PhoneMode = "login" | "signup";

/** Text a sign-in code. Logging in needs an existing account, so no text is wasted on a typo. */
export async function sendPhoneCode(input: {
  countryCode: string;
  number: string;
  mode: PhoneMode;
}): Promise<{ ok: true; phone: string; devCode?: string } | { ok: false; error: string; retryAfter?: number }> {
  const phone = normalizePhone(String(input.countryCode), String(input.number));
  if (!phone) return { ok: false, error: "Enter a valid mobile number." };

  if (input.mode === "login") {
    const owner = await phoneOwner(phone);
    if (!owner) return { ok: false, error: "No account uses this number yet. Create one instead." };
    if (owner.status === "suspended") return { ok: false, error: SUSPENDED };
  }

  const sent = await sendOtp(phone);
  return sent.ok ? { ok: true, phone, devCode: sent.devCode } : sent;
}

/**
 * Check the code and sign in, then go where they were headed. Signing up with a
 * number that already has an account just signs in to it: the code proves it's theirs.
 */
export async function verifyPhoneCode(input: {
  phone: string;
  code: string;
  mode: PhoneMode;
  name?: string;
  next?: string;
}): Promise<{ ok: false; error: string }> {
  const phone = String(input.phone ?? "");
  const code = String(input.code ?? "").trim();
  const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return { ok: false, error: "Start again with a valid mobile number." };
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "Enter the 6-digit code." };
  if (input.mode === "signup" && name.length < 2) return { ok: false, error: "Go back and enter your name." };

  const product = productOf(safeNext(input.next, ""));
  const platforms = product ? [product] : [];
  const result = await signInWithPhone(
    phone,
    code,
    input.mode === "signup" ? { name: name.slice(0, 80), platforms } : undefined,
  );
  if (!result.ok) return result;

  await createSession({ userId: result.userId, role: result.role });
  redirect(result.created ? afterSignUp(input.next, platforms) : safeNext(input.next, homeFor(result.role as Role)));
}

const PHONE_RE = /^\+?[0-9][0-9\s-]{7,15}$/;

/** Sign up a travel agency: creates the owner account and a pending agency for admin review. */
export async function registerAgency(_prev: FormState, formData: FormData): Promise<FormState> {
  const field = (key: string) => String(formData.get(key) ?? "").trim();
  const name = field("name");
  const email = field("email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const agencyName = field("agencyName");
  const city = field("city");
  const phone = field("phone");
  const registrationNumber = field("registrationNumber");
  const website = field("website");
  const description = field("description");

  const errors: Record<string, string[]> = {};
  if (name.length < 2) errors.name = ["Enter your full name."];
  if (!EMAIL_RE.test(email)) errors.email = ["Enter a valid email address."];
  if (password.length < 8) errors.password = ["Password must be at least 8 characters."];
  if (agencyName.length < 2) errors.agencyName = ["Enter your agency's name."];
  if (city.length < 2) errors.city = ["Enter the city you operate from."];
  if (!PHONE_RE.test(phone)) errors.phone = ["Enter a valid phone number."];
  if (registrationNumber.length < 4) {
    errors.registrationNumber = ["Enter your tourism registration number or GSTIN."];
  }
  if (website && !/^https?:\/\/\S+\.\S+/.test(website)) errors.website = ["Enter a full URL (https://…)."];
  if (description.length > 1000) errors.description = ["Keep it under 1000 characters."];
  if (formData.get("terms") !== "on") errors.terms = ["You must accept the terms."];
  const values = { name, email, agencyName, city, phone, registrationNumber, website, description };
  if (Object.keys(errors).length) return { errors, values };

  const problem = await emailProblem(email);
  if (problem) return { errors: { email: [problem] }, values };

  await connectDB();
  if (await User.exists({ email })) {
    return { errors: { email: ["An account with this email already exists."] }, values };
  }

  const user = await User.create({
    name,
    email,
    phone,
    city,
    role: "agency",
    platforms: ["trips"],
    passwordHash: await bcrypt.hash(password, 10),
  });
  try {
    await Agency.create({
      owner: user._id,
      name: agencyName,
      city,
      phone,
      email,
      registrationNumber,
      website: website || undefined,
      description: description || undefined,
    });
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    throw error;
  }

  const admins = await User.find({ role: "admin", status: "active" }).select("_id").lean();
  await notify(
    admins.map((a) => a._id),
    { title: `New agency to review: ${agencyName}`, href: "/admin/agencies?status=pending" },
  );

  await createSession({ userId: String(user._id), role: "agency" });
  await emailVerificationLink(String(user._id));
  redirect("/agency");
}

// ─── Email verification ──────────────────────────────────────────────────────

/** Send the link on sign-up. Best-effort: a failed email never blocks creating the account. */
async function emailVerificationLink(userId: string) {
  try {
    const sent = await sendVerificationEmail(userId);
    if (!sent.ok) console.error("Verification email not sent:", sent.error);
  } catch (error) {
    console.error("Verification email not sent", error);
  }
}

const SIGNED_OUT = "Your session ended. Refresh the page and log in again.";

/** Email the signed-in account a 6-digit code to verify its address. */
export async function sendMyEmailCode(): Promise<
  { ok: true; email: string; devCode?: string } | { ok: false; error: string; retryAfter?: number }
> {
  const viewer = await getCurrentUser();
  if (!viewer) return { ok: false, error: SIGNED_OUT };
  return sendEmailCode(viewer.id);
}

/** Check that code and mark the email as verified. */
export async function verifyMyEmailCode(code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const viewer = await getCurrentUser();
  if (!viewer) return { ok: false, error: SIGNED_OUT };
  const digits = String(code ?? "").trim();
  if (!/^\d{6}$/.test(digits)) return { ok: false, error: "Enter the 6-digit code." };

  const confirmed = await confirmEmailCode(viewer.id, digits);
  if (confirmed.ok) revalidatePath("/", "layout");
  return confirmed;
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
