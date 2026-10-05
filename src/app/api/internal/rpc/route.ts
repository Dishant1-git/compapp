import { timingSafeEqual } from "node:crypto";
import { type NextRequest } from "next/server";
import * as adminActions from "@/lib/admin/actions";
import * as adminQueries from "@/lib/admin/queries";
import * as agencyActions from "@/lib/agency/actions";
import * as agencyQueries from "@/lib/agency/queries";
import * as account from "@/lib/auth/account";
import * as authActions from "@/lib/auth/actions";
import * as companionActions from "@/lib/companion/actions";
import * as companionQueries from "@/lib/companion/queries";
import * as notificationActions from "@/lib/notification-actions";
import * as notifications from "@/lib/notifications";
import * as paymentActions from "@/lib/payments/actions";
import * as credits from "@/lib/payments/credits";
import { decodeArgs, encodeReply } from "@/lib/remote";
import { rpcContext, type RpcContext } from "@/lib/rpc-context";
import * as tripActions from "@/lib/trips/actions";
import * as chat from "@/lib/trips/chat";
import * as tripQueries from "@/lib/trips/queries";

/**
 * The backend half of the frontend/backend split (see src/lib/remote.ts): the
 * frontend deployment calls this to run a data function or Server Action here,
 * next to the database. Only the frontend can call it: it must send
 * BACKEND_SECRET. The signed-in user arrives as a Bearer token, so each
 * function checks permissions exactly as it does in a single deployment.
 */
const modules: Record<string, Record<string, unknown>> = {
  "auth/account": account,
  "auth/actions": authActions,
  "trips/queries": tripQueries,
  "trips/chat": chat,
  "trips/actions": tripActions,
  "agency/queries": agencyQueries,
  "agency/actions": agencyActions,
  "admin/queries": adminQueries,
  "admin/actions": adminActions,
  "companion/queries": companionQueries,
  "companion/actions": companionActions,
  "payments/credits": credits,
  "payments/actions": paymentActions,
  notifications,
  "notification-actions": notificationActions,
};

function authorised(request: NextRequest) {
  const secret = process.env.BACKEND_SECRET;
  const given = request.headers.get("x-backend-secret");
  if (!secret || !given) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

const reply = (body: Parameters<typeof encodeReply>[0], status = 200) =>
  new Response(encodeReply(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

/** redirect() and notFound() work by throwing: turn those into instructions for the frontend. */
function navigation(error: unknown) {
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : "";
  if (digest.startsWith("NEXT_REDIRECT;")) {
    // "NEXT_REDIRECT;<type>;<url>;<status>;"
    return { redirect: digest.split(";").slice(2, -2).join(";") };
  }
  if (digest === "NEXT_HTTP_ERROR_FALLBACK;404" || digest === "NEXT_NOT_FOUND") return { notFound: true };
  return null;
}

export async function POST(request: NextRequest) {
  // Without the secret this endpoint doesn't exist.
  if (!authorised(request)) return new Response("Not found", { status: 404 });

  const name = request.nextUrl.searchParams.get("fn") ?? "";
  const dot = name.lastIndexOf(".");
  const exports = modules[name.slice(0, dot)];
  const fn = exports && Object.hasOwn(exports, name.slice(dot + 1)) ? exports[name.slice(dot + 1)] : undefined;
  if (typeof fn !== "function") return reply({ error: `Unknown function ${name}` }, 404);

  const origin = request.headers.get("x-site-origin") ?? undefined;
  const context: RpcContext = { revalidate: [], origin: origin && /^https?:\/\/[^/\s]+$/.test(origin) ? origin : undefined };
  const done = { session: undefined as string | null | undefined, revalidate: context.revalidate };
  try {
    const args = decodeArgs(await request.formData());
    const value = await rpcContext.run(context, () => fn(...args));
    return reply({ value, ...done, session: context.session });
  } catch (error) {
    const nav = navigation(error);
    if (nav) return reply({ ...nav, ...done, session: context.session });
    console.error(`Backend call ${name} failed`, error);
    return reply({ error: "Server error" }, 500);
  }
}
