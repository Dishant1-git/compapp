import "server-only";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import { LoginAttempt } from "@/lib/db/models/login-attempt";
import { User } from "@/lib/db/models/user";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// After this many wrong passwords for one email, logins for it wait out the window.
const MAX_FAILURES = 10;
const LOCK_MINUTES = 15;

export type PasswordCheck =
  | { ok: true; user: { id: string; name: string; email: string; role: string } }
  | { ok: false; error: string };

/** Check an email and password. Shared by the login form and the token login API. */
export async function checkPassword(email: string, password: string): Promise<PasswordCheck> {
  await connectDB();
  const now = new Date();
  const attempts = await LoginAttempt.findOne({ email, expiresAt: { $gt: now } }).lean();
  if (attempts && attempts.failures >= MAX_FAILURES) {
    const minutes = Math.max(1, Math.ceil((+attempts.expiresAt - +now) / 60000));
    return { ok: false, error: `Too many wrong passwords. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` };
  }

  const user = await User.findOne({ email }).select("+passwordHash name email role status");
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    // Counted for unknown emails too, so the reply never reveals which emails have accounts.
    if (attempts) await LoginAttempt.updateOne({ _id: attempts._id }, { $inc: { failures: 1 } });
    else {
      await LoginAttempt.updateOne(
        { email },
        { failures: 1, expiresAt: new Date(+now + LOCK_MINUTES * 60000) },
        { upsert: true },
      );
    }
    return { ok: false, error: "Incorrect email or password." };
  }
  if (user.status === "suspended") {
    return { ok: false, error: "This account has been suspended. Contact support for help." };
  }

  if (attempts) await LoginAttempt.deleteOne({ _id: attempts._id });
  return { ok: true, user: { id: String(user._id), name: user.name, email: user.email ?? email, role: user.role } };
}
