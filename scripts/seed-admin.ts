/**
 * Create the admin account if it isn't there yet.
 *   npm run seed:admin
 *
 * The server does the same thing by itself every time it starts, so this is only
 * for creating the admin without starting the site. Safe to re-run: an account
 * that already exists is left exactly as it is. See src/lib/db/admin-seed.ts.
 */
import mongoose from "mongoose";
import { describeAdminSeed, ensureAdmin } from "@/lib/db/admin-seed";
import { withSrvDnsFallback } from "@/lib/db/dns";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (see .env.example)");

  await withSrvDnsFallback(uri, (address) => mongoose.connect(address));
  console.log(describeAdminSeed(await ensureAdmin()));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
