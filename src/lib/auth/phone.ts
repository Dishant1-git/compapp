import "server-only";
import { connectDB } from "@/lib/db/mongoose";
import { User, ensureUserEmailIndex } from "@/lib/db/models/user";
import type { PlatformId } from "@/lib/site-config";
import { checkOtp } from "./otp";

// Phone number + one-time code, shared by sign-in (lib/auth/actions.ts) and by
// products that need a verified number on an existing account (Companion).

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });

export const SUSPENDED = "This account has been suspended. Contact support for help.";

/** The account whose verified number this is, if any. */
export async function phoneOwner(phone: string) {
  await connectDB();
  return User.findOne({ phone, "verification.phone": true }).select("_id name status role").lean();
}

/**
 * Check a code and return the account that owns the number. With `create`, a
 * number without an account gets a new one; without it, that's an error.
 */
export async function signInWithPhone(
  phone: string,
  code: string,
  create?: { name: string; platforms: PlatformId[] },
): Promise<{ ok: true; userId: string; role: string; created: boolean } | Fail> {
  const checked = await checkOtp(phone, code);
  if (!checked.ok) return checked;

  const owner = await phoneOwner(phone);
  if (owner) {
    if (owner.status === "suspended") return fail(SUSPENDED);
    return { ok: true, userId: String(owner._id), role: owner.role, created: false };
  }
  if (!create) return fail("No account uses this number yet. Create one instead.");

  await ensureUserEmailIndex();
  const user = await User.create({
    name: create.name,
    phone,
    platforms: create.platforms,
    verification: { phone: true },
  });
  return { ok: true, userId: String(user._id), role: user.role, created: true };
}

/** Check a code and attach the number to a signed-in account. */
export async function linkPhone(userId: string, phone: string, code: string): Promise<{ ok: true } | Fail> {
  const checked = await checkOtp(phone, code);
  if (!checked.ok) return checked;

  const owner = await phoneOwner(phone);
  if (owner && String(owner._id) !== userId) return fail("This number is linked to another account.");
  await User.updateOne({ _id: userId }, { $set: { phone, "verification.phone": true } });
  return { ok: true };
}
