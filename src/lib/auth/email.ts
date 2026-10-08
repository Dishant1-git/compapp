import "server-only";
import nodemailer from "nodemailer";

/**
 * Send a transactional email. Two ways to send, whichever has its settings filled in:
 *
 * 1. SMTP through nodemailer (used first if set). For a Gmail account:
 *  - SMTP_USER  the Gmail address
 *  - SMTP_PASS  an app password (myaccount.google.com/apppasswords; needs 2-step
 *               verification on the account), not the normal Gmail password
 *  - SMTP_HOST, SMTP_PORT  optional, default smtp.gmail.com and 465
 *  - SMTP_FROM  optional address to send from, defaults to SMTP_USER
 *
 * 2. Brevo's API (https://app.brevo.com > SMTP & API > API keys):
 *  - BREVO_API_KEY       an API key (starts with "xkeysib-"), not the SMTP password
 *  - BREVO_SENDER_EMAIL  an address verified as a sender in Brevo
 *                        (BREVO_EMAIL_ADDRESS is accepted too)
 *
 * BREVO_SENDER_NAME (optional, for either) is the name shown as the sender; it
 * defaults to the site name.
 *
 * With neither set, development prints the message to the terminal instead;
 * production refuses to pretend it sent one.
 */
export type EmailResult = { ok: true; dev?: boolean } | { ok: false; error: string };

type Message = {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
  senderName: string;
};

const env = (key: string) => process.env[key]?.trim() || undefined;

const UNAVAILABLE = "We can't send emails right now. Please try again later.";
const FAILED = "We couldn't send the email. Please try again in a minute.";

const senderAddress = () => env("BREVO_SENDER_EMAIL") ?? env("BREVO_EMAIL_ADDRESS");

export async function sendEmail(message: Message): Promise<EmailResult> {
  const smtpUser = env("SMTP_USER");
  // Google shows app passwords in groups of four; the spaces aren't part of it.
  const smtpPass = env("SMTP_PASS")?.replace(/\s+/g, "");
  if (smtpUser && smtpPass) return sendWithSmtp(message, smtpUser, smtpPass);

  const apiKey = env("BREVO_API_KEY");
  const sender = senderAddress();

  if (!apiKey || !sender) {
    if (process.env.NODE_ENV === "production") {
      console.error("Email not sent: neither SMTP_USER/SMTP_PASS nor BREVO_API_KEY/BREVO_SENDER_EMAIL are set. See src/lib/auth/email.ts.");
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
  return { ok: false, error: FAILED };
}

async function sendWithSmtp(message: Message, user: string, pass: string): Promise<EmailResult> {
  const port = Number(env("SMTP_PORT")) || 465;
  try {
    const transport = nodemailer.createTransport({
      host: env("SMTP_HOST") ?? "smtp.gmail.com",
      port,
      secure: port === 465, // other ports (587) upgrade with STARTTLS
      auth: { user, pass },
    });
    await transport.sendMail({
      from: { name: env("BREVO_SENDER_NAME") ?? message.senderName, address: env("SMTP_FROM") ?? user },
      to: message.to.name ? { name: message.to.name, address: message.to.email } : message.to.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    return { ok: true };
  } catch (error) {
    console.error("SMTP send failed:", error instanceof Error ? error.message : error);
    return { ok: false, error: FAILED };
  }
}
