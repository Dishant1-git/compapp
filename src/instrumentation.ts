/**
 * Runs once when the server starts. In production it checks the settings the
 * site can't run without (and refuses to start if they're missing), then warns
 * about optional ones that switch a feature off. See .env.example for all of them.
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;

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
  if (!env("BREVO_API_KEY") || !env("BREVO_SENDER_EMAIL", "BREVO_EMAIL_ADDRESS")) {
    warnings.push("Brevo is not set up: verification emails won't be sent.");
  }
  if (!env("TWILIO_ACCOUNT_SID", "MSG91_AUTH_KEY", "FAST2SMS_API_KEY")) {
    warnings.push("No SMS provider is set: phone sign-in and Companion sign-up won't work.");
  }
  if (!env("APP_URL")) warnings.push("APP_URL is not set: links in emails use the address each request arrives on.");

  for (const warning of warnings) console.warn(`[config] ${warning}`);
}
