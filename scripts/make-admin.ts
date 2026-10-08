/**
 * Promote an existing account to admin.
 *   npm run make-admin -- someone@example.com
 *
 * Register the account normally first (/register), then run this once.
 * After that, admins can promote others from /admin/users.
 */
import mongoose from "mongoose";
import { withSrvDnsFallback } from "@/lib/db/dns";
import { User } from "@/lib/db/models/user";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Usage: npm run make-admin -- someone@example.com");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (see .env.example)");

  await withSrvDnsFallback(uri, (address) => mongoose.connect(address));
  const user = await User.findOne({ email });
  if (!user) throw new Error(`No account with email ${email}. Register it first.`);
  if (user.role === "agency") throw new Error("That account owns an agency. Use a separate account for admin.");

  user.role = "admin";
  user.status = "active";
  await user.save();
  console.log(`${user.name} <${email}> is now an admin. Sign in and go to /admin.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
