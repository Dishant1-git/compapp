import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";

/** Who a token (or session cookie) belongs to. 401 if it is missing, expired or the account is suspended. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
