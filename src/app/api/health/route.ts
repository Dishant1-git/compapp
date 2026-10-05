import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";

/** For the host's health check and uptime monitors: 200 when the app can reach its database. */
export async function GET() {
  try {
    const db = (await connectDB()).connection.db;
    await db?.admin().ping();
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
