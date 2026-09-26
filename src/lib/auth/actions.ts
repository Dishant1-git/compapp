"use server";

import type { PlatformId } from "@/lib/site-config";

export type FormState = {
  errors?: Record<string, string[]>;
  message?: string;
  /** Echoed back so fields keep their values after React resets the form. Never includes passwords. */
  values?: { name?: string; email?: string; platforms?: PlatformId[] };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLATFORMS: PlatformId[] = ["trips", "companion"];

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const errors: Record<string, string[]> = {};
  if (!EMAIL_RE.test(email)) errors.email = ["Enter a valid email address."];
  if (!password) errors.password = ["Enter your password."];
  const values = { email };
  if (Object.keys(errors).length) return { errors, values };

  // TODO: look up the user in the shared database, verify the password,
  // create a session, then redirect("/dashboard").
  return { message: "Login is not connected to the database yet.", values };
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
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

  // TODO: hash the password, create the user in the shared database with
  // the selected platforms, create a session, then redirect.
  return { message: "Registration is not connected to the database yet.", values };
}
