import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/mongoose";
import { CompanionImage } from "@/lib/db/models/companion-image";
import { ID_RE } from "@/lib/form-utils";

/**
 * Serve a Companion photo or selfie. Profile photos are visible to anyone signed
 * in; verification selfies only to their owner and admins.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/companion/images/[id]">) {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!ID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await connectDB();
  const image = await CompanionImage.findById(id).select("+data");
  const allowed =
    image && (image.kind === "photo" || String(image.owner) === viewer.id || viewer.role === "admin");
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.contentType,
      // Images never change once uploaded (a new upload gets a new id).
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
