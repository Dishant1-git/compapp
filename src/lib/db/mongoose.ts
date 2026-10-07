import "server-only";
import mongoose from "mongoose";
import { ensureSrvDns } from "@/lib/db/dns";

// Single shared database for Stranger Trips and Companion.
// Cache the connection on globalThis so dev hot-reloads don't open new ones.
const globalForMongoose = globalThis as unknown as {
  mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};

const cached = (globalForMongoose.mongoose ??= { conn: null, promise: null });

export async function connectDB() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local.");

  ensureSrvDns();
  cached.promise ??= mongoose.connect(uri, { bufferCommands: false });
  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
  return cached.conn;
}
