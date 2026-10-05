import "server-only";
import { revalidatePath as nextRevalidatePath } from "next/cache";
import { rpcContext } from "./rpc-context";

/**
 * revalidatePath that also works across the frontend/backend split: when the
 * backend runs an action for the frontend, the call is passed back so the
 * frontend (where the pages are rendered) refreshes too.
 */
export function revalidatePath(path: string, type?: "layout" | "page") {
  rpcContext.getStore()?.revalidate.push([path, type]);
  nextRevalidatePath(path, type);
}
