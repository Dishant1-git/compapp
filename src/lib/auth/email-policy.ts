import "server-only";
import { resolveMx } from "node:dns/promises";
import domains from "disposable-email-domains";
import wildcards from "disposable-email-domains/wildcard.json";

// Which email addresses can be used for an account. Temporary ("disposable")
// inboxes are refused, so one person can't make endless throwaway accounts, and
// so can domains that can't receive email at all.
//
// The list comes from the disposable-email-domains package (about 120,000
// domains). New services appear all the time: run `npm update disposable-email-domains`
// now and then to pick them up.

const blocked = new Set(domains);
// Services that hand out any subdomain, e.g. anything.33mail.com.
const blockedParents = new Set(wildcards);

export const TEMP_EMAIL = "Temporary email addresses aren't allowed. Use your regular email.";
const NO_MAIL = "That email address can't receive mail. Check the part after the @.";

export function isDisposableEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@").pop() ?? "";
  if (blocked.has(domain)) return true;
  // mail.example.co.uk → also check example.co.uk and co.uk against both lists.
  const labels = domain.split(".");
  for (let i = 1; i < labels.length - 1; i++) {
    const parent = labels.slice(i).join(".");
    if (blocked.has(parent) || blockedParents.has(parent)) return true;
  }
  return blockedParents.has(domain);
}

/** Can the domain receive email? Unknown (DNS slow or down) counts as yes. */
async function acceptsMail(domain: string) {
  try {
    const lookup = resolveMx(domain);
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    const records = await Promise.race([lookup, timeout]);
    // "." as the only exchange is how a domain says it accepts no mail (RFC 7505).
    return records === null || records.some((r) => r.exchange && r.exchange !== ".");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code !== "ENOTFOUND" && code !== "ENODATA";
  }
}

/** Why this address can't be used, or null if it's fine. */
export async function emailProblem(email: string): Promise<string | null> {
  if (isDisposableEmail(email)) return TEMP_EMAIL;
  const domain = email.trim().toLowerCase().split("@").pop() ?? "";
  return (await acceptsMail(domain)) ? null : NO_MAIL;
}
