// Client-safe phone number helpers, shared by sign-in and Companion.

export const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)" },
  { code: "+1", label: "US / Canada (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+65", label: "Singapore (+65)" },
] as const;

/** "+91" + "98765 43210" → "+919876543210", or null if it doesn't look like a mobile number. */
export function normalizePhone(countryCode: string, number: string) {
  const digits = number.replace(/[\s()-]/g, "").replace(/^0+/, "");
  const full = digits.startsWith("+") ? digits : `${countryCode}${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(full) ? full : null;
}

/** "+919876543210" → "•••••••••3210", for showing which number a code was sent to. */
export function maskPhone(phone: string) {
  return `${"•".repeat(Math.max(phone.length - 5, 0))}${phone.slice(-4)}`;
}
