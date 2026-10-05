import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Set while the backend runs a function on behalf of the frontend deployment
 * (see src/lib/remote.ts). Things that normally act on the browser's response,
 * such as setting the login cookie, are recorded here instead and replayed by
 * the frontend, which is the one actually talking to the browser.
 */
export type RpcContext = {
  /** The public address of the frontend that made the call, for links in emails. */
  origin?: string;
  /** A new login token to store, or null to log out. Unset = no change. */
  session?: string | null;
  /** revalidatePath() calls to repeat on the frontend. */
  revalidate: [path: string, type?: "layout" | "page"][];
};

export const rpcContext = new AsyncLocalStorage<RpcContext>();
