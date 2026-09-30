import { NextResponse, type NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/auth/token";

/**
 * Sends signed-out visitors of private areas to /login, remembering the exact
 * URL (`?next=`) so they come straight back after logging in or signing up.
 *
 * This is only a fast first check of the session cookie's signature. The real
 * checks (account still exists, not suspended, right role) are in the DAL
 * (src/lib/auth/dal.ts), which every page, layout and action calls, because
 * Next.js doesn't treat the proxy as a security boundary.
 */
export async function proxy(request: NextRequest) {
  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);
  if (session?.userId) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything under these needs an account. Server Action POSTs are skipped:
  // actions check the session themselves and answer with their own error.
  matcher: [
    {
      source: "/(trips|companion|notifications|agency|admin)/:path*",
      missing: [{ type: "header", key: "next-action" }],
    },
    {
      source: "/(trips|companion|notifications|agency|admin)",
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};
