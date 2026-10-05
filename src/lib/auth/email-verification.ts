import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { headers } from "next/headers";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/user";
import { siteConfig } from "@/lib/site-config";
import { sendEmail } from "./email";
import { isDisposableEmail, TEMP_EMAIL } from "./email-policy";
import { checkOtp, sendOtp } from "./otp";

// Email verification: we email a signed link; opening it marks the address as
// verified. The link names the account and the address, so it stops working if
// the email on the account changes.

const LINK_HOURS = 24;
const RESEND_AFTER_MS = 60 * 1000;
const PURPOSE = "verify-email";

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set. Copy .env.example to .env.local.");
  return new TextEncoder().encode(secret);
}

/** Public address of the site, for links in emails. Set APP_URL in production. */
async function siteOrigin() {
  const fixed = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (fixed) return fixed;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type VerificationSent =
  | { ok: true; message: string; devLink?: string }
  | { ok: false; error: string };

/** Email the account's address a link to verify it. One email a minute at most. */
export async function sendVerificationEmail(userId: string): Promise<VerificationSent> {
  await connectDB();
  const user = await User.findById(userId).select("name email verification emailVerificationSentAt");
  if (!user?.email) return { ok: false, error: "Add an email address to your account first." };
  if (user.verification?.email) return { ok: true, message: "Your email is already verified." };
  if (isDisposableEmail(user.email)) return { ok: false, error: TEMP_EMAIL };

  const wait = +(user.emailVerificationSentAt ?? 0) + RESEND_AFTER_MS - Date.now();
  if (wait > 0) return { ok: false, error: `Please wait ${Math.ceil(wait / 1000)}s before asking for another email.` };

  const token = await new SignJWT({ userId: String(user._id), email: user.email, purpose: PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${LINK_HOURS}h`)
    .sign(key());
  const link = `${await siteOrigin()}/api/auth/verify-email?token=${token}`;
  const name = escapeHtml(user.name.split(/\s+/)[0]);

  const sent = await sendEmail({
    to: { email: user.email, name: user.name },
    senderName: siteConfig.name,
    subject: `Verify your email for ${siteConfig.name}`,
    text: `Hi ${user.name.split(/\s+/)[0]},\n\nOpen this link to verify your email address for ${siteConfig.name}:\n${link}\n\nThe link works for ${LINK_HOURS} hours. If you didn't create this account, you can ignore this email.`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a;max-width:480px">
<p>Hi ${name},</p>
<p>Confirm this is your email address for ${escapeHtml(siteConfig.name)}.</p>
<p><a href="${link}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px">Verify my email</a></p>
<p style="font-size:14px;color:#555555">Or paste this link into your browser:<br><a href="${link}">${link}</a></p>
<p style="font-size:14px;color:#555555">The link works for ${LINK_HOURS} hours. If you didn't create this account, you can ignore this email.</p>
</div>`,
  });
  if (!sent.ok) return sent;

  await User.updateOne({ _id: user._id }, { emailVerificationSentAt: new Date() });
  return {
    ok: true,
    message: `We sent a link to ${user.email}. Open it to verify your email.`,
    // Without a Brevo key (development only) the link is shown instead of emailed.
    devLink: sent.dev ? link : undefined,
  };
}

// ─── Verifying with a 6-digit code instead of a link (Companion sign-up) ─────

const codeKey = (email: string) => `email:${email}`;

/** Email the account's address a 6-digit code. Same limits as phone codes. */
export async function sendEmailCode(
  userId: string,
): Promise<{ ok: true; email: string; devCode?: string } | { ok: false; error: string; retryAfter?: number }> {
  await connectDB();
  const user = await User.findById(userId).select("name email").lean();
  if (!user?.email) return { ok: false, error: "This account has no email address. Use your mobile number instead." };
  const { email } = user;
  // Accounts made before temporary addresses were refused can't verify with one.
  if (isDisposableEmail(email)) return { ok: false, error: TEMP_EMAIL };
  const name = user.name.split(/\s+/)[0];

  const sent = await sendOtp(codeKey(email), async (code) => {
    const mail = await sendEmail({
      to: { email, name: user.name },
      senderName: siteConfig.name,
      subject: `${code} is your ${siteConfig.name} code`,
      text: `Hi ${name},\n\n${code} is your ${siteConfig.name} verification code. It expires in 5 minutes. Don't share it with anyone.`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a;max-width:480px">
<p>Hi ${escapeHtml(name)},</p>
<p>Your ${escapeHtml(siteConfig.name)} verification code is:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:16px 0">${code}</p>
<p style="font-size:14px;color:#555555">It expires in 5 minutes. Don't share it with anyone. If you didn't ask for it, you can ignore this email.</p>
</div>`,
    });
    // Without a Brevo key (development only) the code is shown on screen instead.
    return mail.ok ? { ok: true, devCode: mail.dev ? code : undefined } : mail;
  });
  return sent.ok ? { ok: true, email, devCode: sent.devCode } : sent;
}

/** Check an emailed code and mark the account's email as verified. */
export async function confirmEmailCode(userId: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await connectDB();
  const user = await User.findById(userId).select("email").lean();
  if (!user?.email) return { ok: false, error: "This account has no email address." };

  const checked = await checkOtp(codeKey(user.email), code);
  if (!checked.ok) return checked;
  // Only if the address is still the one the code was sent to.
  await User.updateOne({ _id: userId, email: user.email }, { $set: { "verification.email": true } });
  return { ok: true };
}

/** Mark the email as verified if the link is genuine, unexpired and still matches the account. */
export async function confirmEmail(token: string) {
  let claims;
  try {
    ({ payload: claims } = await jwtVerify<{ userId?: string; email?: string; purpose?: string }>(token, key(), {
      algorithms: ["HS256"],
    }));
  } catch {
    return false;
  }
  if (claims.purpose !== PURPOSE || !claims.userId || !claims.email) return false;
  if (isDisposableEmail(claims.email)) return false;

  await connectDB();
  const updated = await User.updateOne(
    { _id: claims.userId, email: claims.email },
    { $set: { "verification.email": true } },
  );
  return updated.matchedCount === 1;
}
