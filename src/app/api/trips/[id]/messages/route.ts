import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { groupAccess, listMessages } from "@/lib/trips/chat";

/** New group-chat messages since `?after=<ISO date>`. Polled by the chat UI. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/trips/[id]/messages">) {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await groupAccess(id, viewer);
  if (!access) return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });

  const afterParam = request.nextUrl.searchParams.get("after");
  const after = afterParam ? new Date(afterParam) : undefined;
  if (after && Number.isNaN(+after)) return NextResponse.json({ error: "Bad date" }, { status: 400 });

  const messages = await listMessages(access, viewer, after);
  return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}
