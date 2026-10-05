import "server-only";
import { cookies } from "next/headers";
import { rpcContext } from "@/lib/rpc-context";
import { encrypt, SESSION_COOKIE, SESSION_DAYS, type SessionPayload } from "./token";

export { decrypt, SESSION_COOKIE, type SessionPayload } from "./token";

/** Store a login token in the browser's cookie. */
export async function setSessionCookie(token: string) {
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function createSession(payload: SessionPayload) {
  const token = await encrypt(payload);
  // Running for the frontend deployment: it sets the cookie, since it faces the browser.
  const rpc = rpcContext.getStore();
  if (rpc) rpc.session = token;
  else await setSessionCookie(token);
}

export async function deleteSession() {
  const rpc = rpcContext.getStore();
  if (rpc) rpc.session = null;
  else await clearSessionCookie();
}
