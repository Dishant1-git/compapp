import "server-only";

/**
 * Send a transactional email through Brevo (https://app.brevo.com > SMTP & API > API keys).
 *
 *  - BREVO_API_KEY       an API key (starts with "xkeysib-"), not the SMTP password
 *  - BREVO_SENDER_EMAIL  an address verified as a sender in Brevo
 *                        (BREVO_EMAIL_ADDRESS is accepted too)
 *  - BREVO_SENDER_NAME   optional, defaults to the site name
 *
 * With no key set, development prints the message to the terminal instead;
 * production refuses to pretend it sent one.
 */
export type EmailResult = { ok: true; dev?: boolean } | { ok: false; error: string };

const env = (key: string) => process.env[key]?.trim() || undefined;

const UNAVAILABLE = "We can't send emails right now. Please try again later.";

const senderAddress = () => env("BREVO_SENDER_EMAIL") ?? env("BREVO_EMAIL_ADDRESS");

export async function sendEmail(message: {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
  senderName: string;
}): Promise<EmailResult> {
  const apiKey = env("BREVO_API_KEY");
  const sender = senderAddress();

  if (!apiKey || !sender) {
    if (process.env.NODE_ENV === "production") {
      console.error("Email not sent: BREVO_API_KEY and BREVO_SENDER_EMAIL are not set. See src/lib/auth/email.ts.");
      return { ok: false, error: UNAVAILABLE };
    }
    console.info(`[dev] Email to ${message.to.email}: ${message.subject}\n${message.text}`);
    return { ok: true, dev: true };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: { email: sender, name: env("BREVO_SENDER_NAME") ?? message.senderName },
        to: [message.to],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
      }),
      cache: "no-store",
    });
    if (res.ok) return { ok: true };
    console.error("Brevo send failed", res.status, await res.text().catch(() => ""));
  } catch (error) {
    console.error("Brevo send failed", error);
  }
  return { ok: false, error: "We couldn't send the email. Please try again in a minute." };
}
