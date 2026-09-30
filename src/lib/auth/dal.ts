import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { connectDB } from "@/lib/db/mongoose";
import { Agency, type AgencyStatus } from "@/lib/db/models/agency";
import { User } from "@/lib/db/models/user";
import { decrypt, SESSION_COOKIE } from "./session";

export type Role = "user" | "agency" | "admin";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  personality: string[];
};

/** The signed-in user, or null. Suspended accounts count as signed out. Memoized per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await decrypt((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session?.userId) return null;

  await connectDB();
  const user = await User.findById(session.userId)
    .select("name email role status personality")
    .lean();
  if (!user || user.status === "suspended") return null;

  return {
    id: String(user._id),
    name: user.name,
    email: user.email ?? "",
    role: user.role as Role,
    personality: user.personality ?? [],
  };
});

/** Like getCurrentUser, but redirects to /login when signed out. */
export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/** Requires one of the given roles. Other signed-in users get a 404 so the area isn't advertised. */
export async function requireRole(roles: Role[], next?: string): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (!roles.includes(user.role)) notFound();
  return user;
}

export type CurrentAgency = {
  id: string;
  name: string;
  status: AgencyStatus;
  reviewNote?: string;
};

/** The agency owned by the signed-in user, if any. */
export const getMyAgency = cache(async (userId: string): Promise<CurrentAgency | null> => {
  await connectDB();
  const agency = await Agency.findOne({ owner: userId }).select("name status reviewNote").lean();
  if (!agency) return null;
  return {
    id: String(agency._id),
    name: agency.name,
    status: agency.status as AgencyStatus,
    reviewNote: agency.reviewNote ?? undefined,
  };
});

/** Where each role lands after signing in. */
export function homeFor(role: Role) {
  return role === "admin" ? "/admin" : role === "agency" ? "/agency" : "/trips";
}

/**
 * The return URL (`?next=`) if it's safe to send someone to, else `fallback`.
 * Only same-site paths: blocks "//evil.com", "/\evil.com" and absolute URLs, and
 * any whitespace or control characters (browsers strip tabs and newlines, which
 * would turn "/\t/evil.com" into "//evil.com"). The sign-in pages themselves are
 * refused too, so signing in can never loop back to them.
 */
export function safeNext(value: unknown, fallback = "/trips") {
  if (typeof value !== "string" || value.length > 2000) return fallback;
  if (!/^\/(?![/\\])/.test(value) || /[\s\\\x00-\x1f\x7f]/.test(value)) return fallback;
  if (/^\/(login|register)(?:[/?#]|$)/.test(value)) return fallback;
  return value;
}

/** Which product a same-site path belongs to, if any. */
export function productOf(path: string): "trips" | "companion" | null {
  if (/^\/trips(?:[/?#]|$)/.test(path)) return "trips";
  if (/^\/companion(?:[/?#]|$)/.test(path)) return "companion";
  return null;
}

/**
 * Where a brand-new account goes: the product's onboarding first, then back to
 * what they asked for. Companion's pages send unfinished profiles to its own
 * onboarding (/companion/join) themselves, so its URLs are returned as they are.
 */
export function afterSignUp(next: unknown, platforms: readonly string[] = []) {
  const target = safeNext(next, "");
  const product = target
    ? productOf(target)
    : platforms.includes("trips")
      ? "trips"
      : platforms.includes("companion")
        ? "companion"
        : null;
  if (product === "trips") return `/trips/profile?welcome=1&next=${encodeURIComponent(target || "/trips")}`;
  if (product === "companion") return target || "/companion";
  return target || homeFor("user");
}
