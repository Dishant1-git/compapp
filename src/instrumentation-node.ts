/**
 * Start-up work that needs Node (the database, TensorFlow), kept out of instrumentation.ts
 * so none of it is pulled into the Edge build. See register() there.
 */
export function start() {
  if (process.env.NODE_ENV === "production") checkSettings();
  // The frontend half of a split deployment has no database: the backend seeds it.
  if (!process.env.BACKEND_URL?.trim() && process.env.MONGODB_URI?.trim()) void seedAdmin();
}

/** Create the admin account if it isn't there yet. Never stops the server from starting. */
async function seedAdmin() {
  try {
    const [{ connectDB }, { ensureAdmin, describeAdminSeed }] = await Promise.all([
      import("@/lib/db/mongoose"),
      import("@/lib/db/admin-seed"),
    ]);
    await connectDB();
    const seed = await ensureAdmin();
    // Nothing to say on the usual start, when the admin is already there.
    if (seed.status !== "exists" || seed.role !== "admin") console.info(`[admin] ${describeAdminSeed(seed)}`);
  } catch (error) {
    console.error("[admin] Could not check for the admin account:", error instanceof Error ? error.message : error);
  }
}

function checkSettings() {
  const env = (...keys: string[]) => keys.map((k) => process.env[k]?.trim()).find(Boolean);

  // The frontend half of a split deployment only needs to know where the backend is.
  const frontend = !!env("BACKEND_URL");

  const fatal: string[] = [];
  if (!frontend && !env("MONGODB_URI")) fatal.push("MONGODB_URI is not set.");
  const secret = env("SESSION_SECRET");
  if (!secret) fatal.push("SESSION_SECRET is not set.");
  else if (secret.length < 32) fatal.push("SESSION_SECRET is too short: use 32 random bytes, base64-encoded.");
  if (frontend && !env("BACKEND_SECRET")) fatal.push("BACKEND_SECRET is not set (it must match the backend's).");
  if (fatal.length) {
    throw new Error(`Cannot start:\n- ${fatal.join("\n- ")}\nSee .env.example.`);
  }
  if (frontend) {
    console.info(`[config] Frontend mode: data and actions are served by ${env("BACKEND_URL")}.`);
    return;
  }

  const warnings: string[] = [];
  if (/127\.0\.0\.1|localhost/.test(env("MONGODB_URI") ?? "")) {
    warnings.push("MONGODB_URI points at this machine. Use a hosted database unless MongoDB runs on this server.");
  }
  const razorpayKey = env("RAZORPAY_KEY_ID", "RAZOR_PAY_API_KEY", "RAZOR_PAY_APi_KEY");
  if (!razorpayKey || !env("RAZORPAY_KEY_SECRET", "RAZOR_PAY_API_SECRET")) {
    warnings.push("Razorpay keys are not set: agencies can't buy plans and travellers can't book.");
  } else {
    if (razorpayKey.startsWith("rzp_test_")) warnings.push("Razorpay is using TEST keys: no real money is collected.");
    if (!env("RAZORPAY_WEBHOOK_SECRET")) {
      warnings.push("RAZORPAY_WEBHOOK_SECRET is not set: people who pay and close the tab early won't be confirmed.");
    }
  }
  const smtp = env("SMTP_USER") && env("SMTP_PASS");
  if (!smtp && (!env("BREVO_API_KEY") || !env("BREVO_SENDER_EMAIL", "BREVO_EMAIL_ADDRESS"))) {
    warnings.push("No email service is set up (SMTP_USER + SMTP_PASS, or Brevo): verification emails won't be sent, and admins won't be emailed about profiles to verify.");
  }
  if (!env("TWILIO_ACCOUNT_SID", "MSG91_AUTH_KEY", "FAST2SMS_API_KEY")) {
    warnings.push("No SMS provider is set: phone sign-in and Companion sign-up won't work.");
  }
  if (!env("APP_URL")) warnings.push("APP_URL is not set: links in emails use the address each request arrives on.");

  for (const warning of warnings) console.warn(`[config] ${warning}`);

  // Load the Companion photo-check models in the background now, so the first
  // person to upload a photo after a deploy or restart doesn't wait for them.
  void import("@/lib/companion/moderation")
    .then((moderation) => moderation.warmUp())
    .catch((error) => console.error("[config] Could not preload the photo-check models", error));
}
