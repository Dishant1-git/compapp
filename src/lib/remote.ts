import "server-only";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";
import { SESSION_COOKIE, bearerToken } from "@/lib/auth/token";

/**
 * The frontend/backend split.
 *
 * The same code is deployed twice. The BACKEND (Render) has the database and
 * all the keys and does the real work. The FRONTEND (Vercel) has BACKEND_URL
 * set: it renders the pages, and every data function it calls starts with
 *
 *     if (isFrontend()) return remoteCall("trips/queries.getTrip", [slug, viewer]);
 *
 * which runs that same function on the backend (POST /api/internal/rpc) and
 * returns its result. With BACKEND_URL unset the app is a normal single
 * deployment and none of this runs.
 *
 * The two servers trust each other through BACKEND_SECRET, and both need the
 * same SESSION_SECRET so a login cookie means the same thing on each.
 */
export function isFrontend() {
  return !!process.env.BACKEND_URL;
}

// Extended JSON keeps dates and database ids intact across the wire.
const { EJSON } = mongoose.mongo.BSON;

type Reply = {
  value?: unknown;
  redirect?: string;
  notFound?: boolean;
  session?: string | null;
  revalidate?: [string, ("layout" | "page")?][];
  error?: string;
};

/**
 * Drop `undefined` properties, as JSON does. Extended JSON would turn them into
 * null, and code on the other side tells the two apart (`value !== undefined`).
 */
function withoutUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => (item === undefined ? null : withoutUndefined(item)));
  if (value === null || typeof value !== "object") return value;
  const proto = Object.getPrototypeOf(value);
  // Dates, database ids and other class instances are left for Extended JSON.
  if (proto !== Object.prototype && proto !== null) return value;
  const copy: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) if (item !== undefined) copy[key] = withoutUndefined(item);
  return copy;
}

const stringify = (value: unknown) => EJSON.stringify(withoutUndefined(value) as object, { relaxed: true });

/** Arguments as a multipart body: forms (and their files) travel as real form fields. */
export function encodeArgs(args: unknown[]) {
  const body = new FormData();
  const plain = args.map((arg, i) => {
    if (arg === undefined) return { $undefined: true };
    if (!(arg instanceof FormData)) return arg;
    for (const [key, value] of arg) body.append(`form${i}:${key}`, value);
    return { $form: i };
  });
  body.set("args", stringify(plain));
  return body;
}

export function decodeArgs(body: FormData): unknown[] {
  const plain = EJSON.parse(String(body.get("args") ?? "[]"), { relaxed: true }) as unknown[];
  return plain.map((arg) => {
    if (!arg || typeof arg !== "object") return arg;
    if ("$undefined" in arg) return undefined;
    if (!("$form" in arg)) return arg;
    const prefix = `form${arg.$form}:`;
    const form = new FormData();
    for (const [key, value] of body) if (key.startsWith(prefix)) form.append(key.slice(prefix.length), value);
    return form;
  });
}

export function encodeReply(reply: Reply) {
  return stringify(reply);
}

async function send(name: string, args: unknown[]): Promise<Reply> {
  const base = process.env.BACKEND_URL!.replace(/\/+$/, "");
  const secret = process.env.BACKEND_SECRET;
  if (!secret) throw new Error("BACKEND_SECRET is not set on the frontend.");

  // Whoever is signed in here is who the backend acts for.
  const h = await headers();
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? bearerToken(h.get("authorization"));
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.)/.test(host) ? "http" : "https");
  const response = await fetch(`${base}/api/internal/rpc?fn=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: {
      "x-backend-secret": secret,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(host ? { "x-site-origin": `${proto}://${host}` } : {}),
    },
    body: encodeArgs(args),
    cache: "no-store",
  });
  const text = await response.text();
  let reply: Reply;
  try {
    reply = EJSON.parse(text, { relaxed: true }) as Reply;
  } catch {
    throw new Error(`Backend call ${name} failed (${response.status}).`);
  }
  if (!response.ok || reply.error) throw new Error(`Backend call ${name} failed: ${reply.error ?? response.status}`);
  return reply;
}

/** Run a data function on the backend and return what it returned. For reads, during rendering. */
export async function remoteCall(name: string, args: unknown[]): Promise<never> {
  const reply = await send(name, args);
  if (reply.notFound) notFound();
  if (reply.redirect) redirect(reply.redirect);
  return reply.value as never;
}

/**
 * Run a Server Action on the backend. Whatever it did to the browser there
 * (log in or out, refresh pages, redirect) is repeated here.
 */
export async function remoteAction(name: string, args: unknown[]): Promise<never> {
  const reply = await send(name, args);
  if (typeof reply.session === "string") await setSessionCookie(reply.session);
  else if (reply.session === null) await clearSessionCookie();
  for (const [path, type] of reply.revalidate ?? []) revalidatePath(path, type);
  if (reply.notFound) notFound();
  if (reply.redirect) redirect(reply.redirect);
  return reply.value as never;
}
