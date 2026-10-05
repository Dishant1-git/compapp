import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/mongoose";
import { IdDocument } from "@/lib/db/models/id-document";
import { ID_RE } from "@/lib/form-utils";

/** Serve an uploaded ID document. Only its owner and admins can see it. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/trips/documents/[id]">) {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!ID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await connectDB();
  const doc = await IdDocument.findById(id).select("+data");
  if (!doc || (String(doc.owner) !== viewer.id && viewer.role !== "admin")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(new Uint8Array(doc.data), {
    headers: {
      "Content-Type": doc.contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // Uploaded files never get to run scripts on this origin.
      "Content-Security-Policy": "sandbox",
    },
  });
}
