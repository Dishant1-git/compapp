import { NextResponse, type NextRequest } from "next/server";
import { checkPassword, EMAIL_RE } from "@/lib/auth/credentials";
import { encrypt, SESSION_DAYS } from "@/lib/auth/token";

/**
 * Token login for API clients (a mobile app, scripts): POST { email, password }
 * and get back a token to send as `Authorization: Bearer <token>` on later
 * requests. It is the same signed token the website keeps in its cookie, and
 * lasts just as long. There is nothing to revoke on logout: the client simply
 * discards it.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!EMAIL_RE.test(email) || !password) {
    return NextResponse.json({ error: "Send an email and a password." }, { status: 400 });
  }

  const checked = await checkPassword(email, password);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 401 });

  const { user } = checked;
  return NextResponse.json(
    {
      token: await encrypt({ userId: user.id, role: user.role }),
      tokenType: "Bearer",
      expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      user,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
