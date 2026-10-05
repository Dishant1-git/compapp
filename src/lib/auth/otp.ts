import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { connectDB } from "@/lib/db/mongoose";
import { OtpCode } from "@/lib/db/models/otp-code";
import { sendOtpSms } from "./sms";

const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_AFTER_MS = 30 * 1000;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_ATTEMPTS = 5;

export const RESEND_AFTER_SECONDS = RESEND_AFTER_MS / 1000;

function hash(phone: string, code: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set. Copy .env.example to .env.local.");
  return createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex");
}

export type SendResult =
  | { ok: true; devCode?: string }
  | { ok: false; error: string; retryAfter?: number };

/**
 * Create a new 6-digit code for `phone` and text it. Rate-limited per number.
 * `deliver` sends the code some other way (email): `phone` is then just the key
 * the code is stored under, e.g. "email:someone@example.com".
 */
export async function sendOtp(
  phone: string,
  deliver: (code: string) => Promise<SendResult> = (code) => sendOtpSms(phone, code),
): Promise<SendResult> {
  await connectDB();
  const now = Date.now();
  const existing = await OtpCode.findOne({ phone }).lean();

  if (existing) {
    const wait = +existing.lastSentAt + RESEND_AFTER_MS - now;
    if (wait > 0) {
      const retryAfter = Math.ceil(wait / 1000);
      return { ok: false, error: `Please wait ${retryAfter}s before asking for a new code.`, retryAfter };
    }
  }

  const windowOpen = existing && now - +existing.windowStartedAt < WINDOW_MS;
  if (windowOpen && existing.sendCount >= MAX_SENDS_PER_WINDOW) {
    return { ok: false, error: "Too many codes requested for this number. Try again in an hour." };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await OtpCode.updateOne(
    { phone },
    {
      $set: {
        codeHash: hash(phone, code),
        expiresAt: new Date(now + CODE_TTL_MS),
        attempts: 0,
        lastSentAt: new Date(now),
        windowStartedAt: windowOpen ? existing.windowStartedAt : new Date(now),
        sendCount: windowOpen ? existing.sendCount + 1 : 1,
      },
    },
    { upsert: true },
  );

  const sent = await deliver(code);
  // Don't make them wait out the resend timer for a message that never went.
  if (!sent.ok) await OtpCode.updateOne({ phone }, { $set: { lastSentAt: new Date(0) }, $inc: { sendCount: -1 } });
  return sent;
}

export type CheckResult = { ok: true } | { ok: false; error: string };

/** Check a code. Each code can be guessed a few times, then a new one is needed. */
export async function checkOtp(phone: string, code: string): Promise<CheckResult> {
  await connectDB();
  const record = await OtpCode.findOneAndUpdate(
    { phone, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { returnDocument: "after" },
  ).lean();
  if (!record) return { ok: false, error: "This code has expired. Tap Resend to get a new one." };

  const expected = Buffer.from(record.codeHash, "hex");
  const actual = Buffer.from(hash(phone, code), "hex");
  if (!timingSafeEqual(expected, actual)) {
    const left = MAX_ATTEMPTS - record.attempts;
    return {
      ok: false,
      error: left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong tries. Tap Resend to get a new code.",
    };
  }

  // One use only; keep the send counters for rate limiting.
  await OtpCode.updateOne({ phone }, { $set: { expiresAt: new Date(0) } });
  return { ok: true };
}
