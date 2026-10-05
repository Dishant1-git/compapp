import "server-only";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { loadAgency, loadUser, loadVerified, type CurrentAgency, type CurrentUser, type Role } from "./account";
import { decrypt, SESSION_COOKIE } from "./session";
import { bearerToken } from "./token";

export type { CurrentAgency, CurrentUser, Role };

/**
 * The signed-in user, or null. Suspended accounts count as signed out. Memoized per request.
 * Browsers send the session cookie; API clients send the same token as
 * `Authorization: Bearer <token>` (see /api/auth/login).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token =
    (await cookies()).get(SESSION_COOKIE)?.value ?? bearerToken((await headers()).get("authorization"));
  const session = await decrypt(token);
  return session?.userId ? loadUser(session.userId) : null;
});

/** Like getCurrentUser, but redirects to /login when signed out. */
export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/**
 * Has this account proved it's a real person: a verified phone number or a
 * verified email address? Needed to book trips and to use Companion.
 */
export const isVerified = cache((userId: string) => loadVerified(userId));

/** For pages only verified accounts can use: sends the others to verify, then back to `next`. */
export async function requireVerified(next: string): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (!(await isVerified(user.id))) redirect(`/trips/verify?next=${encodeURIComponent(next)}`);
  return user;
}

/** Requires one of the given roles. Other signed-in users get a 404 so the area isn't advertised. */
export async function requireRole(roles: Role[], next?: string): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (!roles.includes(user.role)) notFound();
  return user;
}

/** The agency owned by the signed-in user, if any. */
export const getMyAgency = cache((userId: string) => loadAgency(userId));

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
