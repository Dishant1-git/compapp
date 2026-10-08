import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { User } from "@/lib/db/models/user";

/** The first admin account, unless ADMIN_EMAIL says otherwise. */
export const DEFAULT_ADMIN_EMAIL = "codebynidhi1007@gmail.com";

const MIN_PASSWORD = 8;

export type AdminSeed =
  | { status: "exists"; email: string; role: string }
  /** `password` is only set when one was made up here, so it can be shown once. */
  | { status: "created"; email: string; password?: string }
  | { status: "skipped"; reason: string };

/**
 * Make sure the admin account exists. Does nothing if an account with that email
 * is already there (whatever its role or password), so it's safe to run on every start.
 * Needs an open database connection.
 *
 *  - ADMIN_EMAIL     defaults to DEFAULT_ADMIN_EMAIL
 *  - ADMIN_PASSWORD  the password to give it. Without one, development makes up a
 *                    random password and reports it once; production creates nothing,
 *                    so a live site never gets an admin with a password nobody chose.
 */
export async function ensureAdmin(): Promise<AdminSeed> {
  const email = (process.env.ADMIN_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL).toLowerCase();

  const existing = await User.findOne({ email }).select("role").lean();
  if (existing) return { status: "exists", email, role: existing.role };

  const chosen = process.env.ADMIN_PASSWORD?.trim();
  if (chosen && chosen.length < MIN_PASSWORD) {
    return { status: "skipped", reason: `ADMIN_PASSWORD must be at least ${MIN_PASSWORD} characters.` };
  }
  if (!chosen && process.env.NODE_ENV === "production") {
    return { status: "skipped", reason: `Set ADMIN_PASSWORD to create the admin account ${email}.` };
  }
  const password = chosen ?? randomBytes(9).toString("base64url");

  try {
    await User.create({
      name: "Site Admin",
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "admin",
      verification: { email: true },
    });
  } catch (error) {
    // Two servers starting at once: the other one got there first.
    if ((error as { code?: number }).code === 11000) return { status: "exists", email, role: "admin" };
    throw error;
  }
  return { status: "created", email, password: chosen ? undefined : password };
}

/** One line for the terminal about what ensureAdmin() did. */
export function describeAdminSeed(seed: AdminSeed) {
  if (seed.status === "skipped") return `Admin account not created. ${seed.reason}`;
  if (seed.status === "created") {
    return seed.password
      ? `Admin account created. Log in at /login with ${seed.email} and password ${seed.password} (shown only this once: save it, or set ADMIN_PASSWORD before the first start to choose your own).`
      : `Admin account created: ${seed.email}, with the password from ADMIN_PASSWORD.`;
  }
  return seed.role === "admin"
    ? `Admin account ${seed.email} already exists.`
    : `${seed.email} already has an account, but it is not an admin. Run: npm run make-admin -- ${seed.email}`;
}
