import "server-only";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/user";
import { normalizePhone } from "@/lib/phone";

// One account per email, username and phone number.

export const USERNAME_RE = /^[a-z][a-z0-9_]{2,19}$/;
export const USERNAME_HINT = "3 to 20 characters: lowercase letters, numbers and underscores, starting with a letter.";

// Names that would let someone pass as staff.
const RESERVED = new Set(["admin", "administrator", "support", "help", "staff", "moderator", "root", "system", "compapp"]);

/** Why this username can't be used, or null. `exceptUserId` is the account that may already hold it. */
export async function usernameProblem(username: string, exceptUserId?: string): Promise<string | null> {
  if (!USERNAME_RE.test(username)) return `Use ${USERNAME_HINT}`;
  if (RESERVED.has(username)) return "That username isn't available.";
  await connectDB();
  const taken = await User.exists({ username, ...(exceptUserId ? { _id: { $ne: exceptUserId } } : {}) });
  return taken ? "That username is taken." : null;
}

/**
 * "+91 98765 43210", "09876543210" or "+919876543210" → "+919876543210".
 * Numbers typed without a country code are taken to be Indian.
 */
export function canonicalPhone(input: string, countryCode = "+91") {
  return normalizePhone(countryCode, input.trim());
}

/** Matches a stored number however it was spaced or punctuated when it was saved. */
function sameNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return new RegExp(`^\\+?${digits.split("").join("[\\s()-]*")}$`);
}

/** Does another account already have this number? */
export async function phoneTaken(phone: string, exceptUserId?: string) {
  await connectDB();
  return !!(await User.exists({
    phone: sameNumber(phone),
    ...(exceptUserId ? { _id: { $ne: exceptUserId } } : {}),
  }));
}

/**
 * Someone has just proved (by text-message code) that this number is theirs:
 * take it off any account that only typed it in.
 */
export async function releaseUnverifiedPhone(phone: string, ownerId?: string) {
  await User.updateMany(
    {
      phone: sameNumber(phone),
      "verification.phone": { $ne: true },
      ...(ownerId ? { _id: { $ne: ownerId } } : {}),
    },
    { $unset: { phone: 1 } },
  );
}
