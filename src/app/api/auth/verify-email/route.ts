import { NextResponse, type NextRequest } from "next/server";
import { confirmEmail } from "@/lib/auth/email-verification";

/** The link in the verification email lands here; then on to a page that says how it went. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const ok = token.length < 2000 && (await confirmEmail(token));
  return NextResponse.redirect(new URL(`/verify-email?status=${ok ? "done" : "invalid"}`, request.url));
}
