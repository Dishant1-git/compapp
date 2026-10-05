import "server-only";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { connectDB } from "@/lib/db/mongoose";
import { LoginAttempt } from "@/lib/db/models/login-attempt";
import { User } from "@/lib/db/models/user";
import { siteConfig } from "@/lib/site-config";
import { sendEmail } from "./email";
import { isDisposableEmail } from "./email-policy";
import { siteOrigin } from "./email-verification";

// Forgot password: we email a signed link; opening it lets the owner of the
// inbox choose a new password. The link carries a fingerprint of the current
// password, so it works once: after the password changes, the fingerprint
// no longer matches.

const LINK_MINUTES = 30;
const RESEND_AFTER_MS = 60 * 1000;
const PURPOSE = "reset-password";

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set. Copy .env.example to .env.local.");
  return new TextEncoder().encode(secret);
}

const fingerprint = (passwordHash: string) => createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Email a reset link if this address has an account with a password. Says
 * nothing about whether it does, so the form can't be used to find out who has
 * an account. `devLink` is only returned without an email provider, in development.
 */
export async function sendPasswordReset(email: string): Promise<{ devLink?: string }> {
  await connectDB();
  const user = await User.findOne({ email }).select("+passwordHash name email status passwordResetSentAt");
  if (!user?.passwordHash || !user.email || user.status === "suspended") return {};
  if (+(user.passwordResetSentAt ?? 0) + RESEND_AFTER_MS > Date.now()) return {};

  const token = await new SignJWT({ userId: String(user._id), purpose: PURPOSE, v: fingerprint(user.passwordHash) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${LINK_MINUTES}m`)
    .sign(key());
  const link = `${await siteOrigin()}/reset-password?token=${token}`;
  const first = user.name.split(/\s+/)[0];

  const sent = await sendEmail({
    to: { email: user.email, name: user.name },
    senderName: siteConfig.name,
    subject: `Reset your ${siteConfig.name} password`,
    text: `Hi ${first},\n\nOpen this link to choose a new password for ${siteConfig.name}:\n${link}\n\nThe link works for ${LINK_MINUTES} minutes and only once. If you didn't ask for it, ignore this email: your password stays the same.`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a;max-width:480px">
<p>Hi ${escapeHtml(first)},</p>
<p>We got a request to reset your ${escapeHtml(siteConfig.name)} password.</p>
<p><a href="${link}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px">Choose a new password</a></p>
<p style="font-size:14px;color:#555555">Or paste this link into your browser:<br><a href="${link}">${link}</a></p>
<p style="font-size:14px;color:#555555">The link works for ${LINK_MINUTES} minutes and only once. If you didn't ask for it, ignore this email: your password stays the same.</p>
</div>`,
  });
  if (!sent.ok) return {};

  await User.updateOne({ _id: user._id }, { passwordResetSentAt: new Date() });
  return { devLink: sent.dev ? link : undefined };
}

/** The account a reset link is for, if the link is genuine, unexpired and unused. */
async function accountFor(token: string) {
  let claims;
  try {
    ({ payload: claims } = await jwtVerify<{ userId?: string; purpose?: string; v?: string }>(token, key(), {
      algorithms: ["HS256"],
    }));
  } catch {
    return null;
  }
  if (claims.purpose !== PURPOSE || !claims.userId || !claims.v) return null;

  await connectDB();
  const user = await User.findById(claims.userId).select("+passwordHash email status");
  if (!user?.passwordHash || user.status === "suspended") return null;
  return fingerprint(user.passwordHash) === claims.v ? user : null;
}

export async function resetLinkValid(token: string) {
  return !!(await accountFor(token));
}

/** Set a new password from a reset link. Opening the link also proves the email address is theirs. */
export async function resetPasswordWithLink(token: string, password: string) {
  const user = await accountFor(token);
  if (!user) return false;

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash: await bcrypt.hash(password, 10),
        // Temporary inboxes never count as verified.
        ...(user.email && !isDisposableEmail(user.email) ? { "verification.email": true } : {}),
      },
      $unset: { passwordResetSentAt: 1 },
    },
  );
  // Forget earlier wrong guesses so they can log in straight away.
  if (user.email) await LoginAttempt.deleteMany({ email: user.email });
  return true;
}
