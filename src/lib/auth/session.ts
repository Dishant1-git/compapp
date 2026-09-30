import "server-only";
import { cookies } from "next/headers";
import { encrypt, SESSION_COOKIE, SESSION_DAYS, type SessionPayload } from "./token";

export { decrypt, SESSION_COOKIE, type SessionPayload } from "./token";

export async function createSession(payload: SessionPayload) {
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  (await cookies()).set(SESSION_COOKIE, await encrypt(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
