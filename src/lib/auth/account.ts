import "server-only";
import { connectDB } from "@/lib/db/mongoose";
import { Agency, type AgencyStatus } from "@/lib/db/models/agency";
import { User } from "@/lib/db/models/user";
import { isFrontend, remoteCall } from "@/lib/remote";

// Account lookups behind the helpers in dal.ts. They're separate so the
// frontend deployment can ask the backend for them (see src/lib/remote.ts).

export type Role = "user" | "agency" | "admin";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  personality: string[];
};

/** The account for a login token's user id. Suspended accounts count as signed out. */
export async function loadUser(userId: string): Promise<CurrentUser | null> {
  if (isFrontend()) return remoteCall("auth/account.loadUser", [userId]);
  await connectDB();
  const user = await User.findById(userId).select("name email role status personality").lean();
  if (!user || user.status === "suspended") return null;

  return {
    id: String(user._id),
    name: user.name,
    email: user.email ?? "",
    role: user.role as Role,
    personality: user.personality ?? [],
  };
}

/** A verified phone number, or a verified email address. */
export async function loadVerified(userId: string): Promise<boolean> {
  if (isFrontend()) return remoteCall("auth/account.loadVerified", [userId]);
  await connectDB();
  const user = await User.findById(userId).select("email verification").lean();
  return !!user && (!!user.verification?.phone || (!!user.email && !!user.verification?.email));
}

export type CurrentAgency = {
  id: string;
  name: string;
  status: AgencyStatus;
  reviewNote?: string;
};

export async function loadAgency(userId: string): Promise<CurrentAgency | null> {
  if (isFrontend()) return remoteCall("auth/account.loadAgency", [userId]);
  await connectDB();
  const agency = await Agency.findOne({ owner: userId }).select("name status reviewNote").lean();
  if (!agency) return null;
  return {
    id: String(agency._id),
    name: agency.name,
    status: agency.status as AgencyStatus,
    reviewNote: agency.reviewNote ?? undefined,
  };
}
