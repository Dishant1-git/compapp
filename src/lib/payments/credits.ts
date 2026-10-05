import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { AgencyPlan } from "@/lib/db/models/agency-plan";
import { agencyPlan } from "./pricing";

export type PlanRow = {
  id: string;
  name: string;
  tripsTotal: number;
  tripsUsed: number;
  price: number;
  boughtAt: string;
  expiresAt: string;
  active: boolean;
};

/** Plans still usable: not expired and with trips left. */
function usable(agencyId: string, now = new Date()) {
  return {
    agency: new Types.ObjectId(agencyId),
    expiresAt: { $gt: now },
    $expr: { $lt: ["$tripsUsed", "$tripsTotal"] },
  };
}

export async function getTripCredits(agencyId: string): Promise<{ available: number; plans: PlanRow[] }> {
  await connectDB();
  const plans = await AgencyPlan.find({ agency: agencyId }).sort({ createdAt: -1 }).limit(50).lean();
  const now = new Date();
  const rows = plans.map((p) => ({
    id: String(p._id),
    name: agencyPlan(p.plan)?.name ?? p.plan,
    tripsTotal: p.tripsTotal,
    tripsUsed: p.tripsUsed,
    price: p.price,
    boughtAt: p.createdAt.toISOString(),
    expiresAt: p.expiresAt.toISOString(),
    active: p.expiresAt > now && p.tripsUsed < p.tripsTotal,
  }));
  return {
    available: rows.filter((r) => r.active).reduce((sum, r) => sum + r.tripsTotal - r.tripsUsed, 0),
    plans: rows,
  };
}

/** Take one trip from the plan that expires soonest. Returns that plan's id, or null if none is left. */
export async function takeTripCredit(agencyId: string) {
  const plan = await AgencyPlan.findOneAndUpdate(
    usable(agencyId),
    { $inc: { tripsUsed: 1 } },
    { sort: { expiresAt: 1 } },
  );
  return plan ? String(plan._id) : null;
}

/** Give a trip back, when publishing failed after the credit was taken. */
export async function returnTripCredit(planId: string) {
  await AgencyPlan.updateOne({ _id: planId, tripsUsed: { $gt: 0 } }, { $inc: { tripsUsed: -1 } });
}
