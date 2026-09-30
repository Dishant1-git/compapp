import "server-only";

/**
 * Text a one-time code to a phone number (E.164, e.g. "+919876543210").
 *
 * Pick a provider with SMS_PROVIDER, or leave it empty to use whichever one has
 * keys set. With none configured, development prints the code to the terminal
 * (and the join page shows it); production refuses to pretend it sent one.
 *
 *  - twilio   Worldwide. TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 *  - msg91    India, DLT-approved. MSG91_AUTH_KEY, MSG91_OTP_TEMPLATE_ID
 *             (template text must contain ##OTP##)
 *  - fast2sms India only (+91). FAST2SMS_API_KEY — uses Fast2SMS's built-in OTP route
 */
export type SmsResult = { ok: true; devCode?: string } | { ok: false; error: string };

type Provider = "twilio" | "msg91" | "fast2sms";

const env = (key: string) => process.env[key]?.trim() || undefined;

function configuredProvider(): Provider | null {
  const chosen = env("SMS_PROVIDER")?.toLowerCase();
  if (chosen === "twilio" || chosen === "msg91" || chosen === "fast2sms") return chosen;
  if (env("TWILIO_ACCOUNT_SID")) return "twilio";
  if (env("MSG91_AUTH_KEY")) return "msg91";
  if (env("FAST2SMS_API_KEY")) return "fast2sms";
  return null;
}

const SEND_FAILED = "We couldn't text that number. Check it and try again.";

export async function sendOtpSms(to: string, code: string): Promise<SmsResult> {
  const provider = configuredProvider();

  if (!provider) {
    if (process.env.NODE_ENV === "production") {
      console.error("OTP not sent: no SMS provider configured. See src/lib/auth/sms.ts.");
      return { ok: false, error: "We can't send text messages right now. Please try again later." };
    }
    console.info(`[dev] OTP for ${to}: ${code}`);
    return { ok: true, devCode: code };
  }

  try {
    const sent =
      provider === "twilio" ? await twilio(to, code) : provider === "msg91" ? await msg91(to, code) : await fast2sms(to, code);
    return sent;
  } catch (error) {
    console.error(`SMS via ${provider} failed`, error);
    return { ok: false, error: SEND_FAILED };
  }
}

function missing(provider: Provider, keys: string[]): SmsResult {
  console.error(`SMS_PROVIDER is ${provider} but ${keys.join(", ")} ${keys.length > 1 ? "are" : "is"} not set.`);
  return { ok: false, error: "We can't send text messages right now. Please try again later." };
}

async function twilio(to: string, code: string): Promise<SmsResult> {
  const sid = env("TWILIO_ACCOUNT_SID");
  const token = env("TWILIO_AUTH_TOKEN");
  const from = env("TWILIO_FROM_NUMBER");
  if (!sid || !token || !from) return missing("twilio", ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"]);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: to,
      From: from,
      Body: `${code} is your Companion verification code. It expires in 5 minutes. Don't share it with anyone.`,
    }),
  });
  if (res.ok) return { ok: true };
  console.error("Twilio send failed", res.status, await res.text().catch(() => ""));
  return { ok: false, error: SEND_FAILED };
}

async function msg91(to: string, code: string): Promise<SmsResult> {
  const authKey = env("MSG91_AUTH_KEY");
  const templateId = env("MSG91_OTP_TEMPLATE_ID");
  if (!authKey || !templateId) return missing("msg91", ["MSG91_AUTH_KEY", "MSG91_OTP_TEMPLATE_ID"]);

  // We generate and check the code ourselves; MSG91 only delivers it.
  const params = new URLSearchParams({ template_id: templateId, mobile: to.replace("+", ""), otp: code });
  const res = await fetch(`https://control.msg91.com/api/v5/otp?${params}`, {
    method: "POST",
    headers: { authkey: authKey, "Content-Type": "application/json" },
    body: "{}",
  });
  const data: { type?: string; message?: string } = await res.json().catch(() => ({}));
  if (res.ok && data.type === "success") return { ok: true };
  console.error("MSG91 send failed", res.status, data);
  return { ok: false, error: SEND_FAILED };
}

async function fast2sms(to: string, code: string): Promise<SmsResult> {
  const apiKey = env("FAST2SMS_API_KEY");
  if (!apiKey) return missing("fast2sms", ["FAST2SMS_API_KEY"]);
  if (!to.startsWith("+91")) return { ok: false, error: "Only Indian (+91) numbers are supported right now." };

  const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: { authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ route: "otp", variables_values: code, numbers: to.slice(3) }),
  });
  const data: { return?: boolean; message?: unknown } = await res.json().catch(() => ({}));
  if (res.ok && data.return === true) return { ok: true };
  console.error("Fast2SMS send failed", res.status, data);
  return { ok: false, error: SEND_FAILED };
}
