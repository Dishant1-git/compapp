import "server-only";
import { sendEmail } from "@/lib/auth/email";
import { escapeHtml, siteOrigin } from "@/lib/auth/email-verification";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/db/admin-seed";
import { siteConfig } from "@/lib/site-config";

/**
 * Who is emailed when a Companion selfie is waiting for review. Set
 * VERIFICATION_ADMIN_EMAIL to change it; several addresses can be separated by commas.
 * They need an admin account to open the review page. The default is the admin
 * account the server creates on start (see src/lib/db/admin-seed.ts).
 */
const DEFAULT_REVIEWER = DEFAULT_ADMIN_EMAIL;

function reviewers() {
  const list = (process.env.VERIFICATION_ADMIN_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
  return list.length ? list : [DEFAULT_REVIEWER];
}

/**
 * Tell the reviewers a selfie is waiting. The photos themselves are not in the
 * email: they're private, so it links to the admin page instead. Never throws,
 * so a failed email can't lose the selfie that was just submitted.
 */
export async function emailReviewRequest(person: { name: string; phone?: string | null; email?: string | null }) {
  try {
    const link = `${await siteOrigin()}/admin/verifications`;
    const contact = [person.phone, person.email].filter(Boolean).join(" · ");
    const who = contact ? `${person.name} (${contact})` : person.name;

    const results = await Promise.all(
      reviewers().map((email) =>
        sendEmail({
          to: { email },
          senderName: siteConfig.name,
          subject: `Profile verification request: ${person.name}`,
          text: `${who} has submitted a Companion profile for verification.\n\nCompare their live selfie with their profile photos, then approve or reject:\n${link}`,
          html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a;max-width:480px">
<p><strong>${escapeHtml(who)}</strong> has submitted a Companion profile for verification.</p>
<p>Compare their live selfie with their profile photos, then approve or reject.</p>
<p><a href="${link}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px">Review the request</a></p>
<p style="font-size:14px;color:#555555">Or paste this link into your browser:<br><a href="${link}">${link}</a></p>
</div>`,
        }),
      ),
    );
    const failed = results.find((r) => !r.ok);
    if (failed && !failed.ok) console.error("Verification request email not sent:", failed.error);
  } catch (error) {
    console.error("Verification request email not sent", error);
  }
}
