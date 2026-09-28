"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import { Agency } from "@/lib/db/models/agency";
import { User } from "@/lib/db/models/user";
import { notify } from "@/lib/notifications";
import type { PlatformId } from "@/lib/site-config";
import { homeFor, safeNext, type Role } from "./dal";
import { createSession, deleteSession } from "./session";

export type FormState = {
  errors?: Record<string, string[]>;
  message?: string;
  /** Echoed back so fields keep their values after React resets the form. Never includes passwords. */
  values?: { name?: string; email?: string; platforms?: PlatformId[]; [key: string]: unknown };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLATFORMS: PlatformId[] = ["trips", "companion"];

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const errors: Record<string, string[]> = {};
  if (!EMAIL_RE.test(email)) errors.email = ["Enter a valid email address."];
  if (!password) errors.password = ["Enter your password."];
  const values = { email };
  if (Object.keys(errors).length) return { errors, values };

  await connectDB();
  const user = await User.findOne({ email }).select("+passwordHash role status");
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return { message: "Incorrect email or password.", values };
  }
  if (user.status === "suspended") {
    return { message: "This account has been suspended. Contact support for help.", values };
  }

  await createSession({ userId: String(user._id), role: user.role });
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
  // New Stranger Trips users go straight to setting up their travel profile.
  redirect(platforms.includes("trips") ? "/trips/profile?welcome=1" : "/");
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
  redirect("/agency");
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
