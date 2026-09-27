"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/mongoose";
import { Agency, AGENCY_STATUSES, type AgencyStatus } from "@/lib/db/models/agency";
import { Report } from "@/lib/db/models/report";
import { Trip } from "@/lib/db/models/trip";
import { User } from "@/lib/db/models/user";
import { ID_RE, text } from "@/lib/form-utils";
import { notify } from "@/lib/notifications";
import { cancelTripAndBookings } from "@/lib/trips/cancel";
import type { ActionState } from "@/lib/trips/types";

const requireAdmin = () => requireRole(["admin"], "/admin");

const AGENCY_MESSAGES: Record<AgencyStatus, string> = {
  approved: "Your agency is approved — you can now publish trips.",
  rejected: "Your agency application was not approved.",
  suspended: "Your agency has been suspended. Your trips are hidden from travellers.",
  pending: "Your agency is back under review.",
};

export async function setAgencyStatus(
  agencyId: string,
  status: AgencyStatus,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!ID_RE.test(agencyId) || !AGENCY_STATUSES.includes(status)) return { message: "Invalid request." };

  const note = text(formData, "note");
  if ((status === "rejected" || status === "suspended") && note.length < 5) {
    return { errors: { note: ["Add a short reason the agency will see."] } };
  }

  await connectDB();
  const agency = await Agency.findByIdAndUpdate(agencyId, {
    status,
    reviewNote: note || undefined,
    reviewedAt: new Date(),
    reviewedBy: admin.id,
  });
  if (!agency) return { message: "Agency not found." };

  await notify(agency.owner, {
    title: AGENCY_MESSAGES[status],
    body: note || undefined,
    href: "/agency",
  });

  revalidatePath("/", "layout");
  return { success: true, message: `Agency marked as ${status}.` };
}

export async function setUserStatus(userId: string, status: "active" | "suspended") {
  const admin = await requireAdmin();
  if (!ID_RE.test(userId) || userId === admin.id) return;
  if (status !== "active" && status !== "suspended") return;

  await connectDB();
  await User.updateOne({ _id: userId }, { status });
  revalidatePath("/admin", "layout");
}

/** Promote a traveller to admin or demote an admin. Agency owners keep their role. */
export async function setUserRole(userId: string, role: "user" | "admin") {
  const admin = await requireAdmin();
  if (!ID_RE.test(userId) || userId === admin.id) return;
  if (role !== "user" && role !== "admin") return;

  await connectDB();
  await User.updateOne({ _id: userId, role: { $ne: "agency" } }, { role });
  revalidatePath("/admin", "layout");
}

export async function cancelTripAsAdmin(
  tripId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const reason = text(formData, "reason");
  if (reason.length < 5) return { errors: { reason: ["Add a reason (5+ characters)."] } };
  if (!ID_RE.test(tripId)) return { message: "Trip not found." };

  await connectDB();
  const trip = await Trip.findOne({ _id: tripId, status: "open" }).select("agency title");
  if (!trip) return { message: "Trip not found or already cancelled." };

  await cancelTripAndBookings(trip._id, reason, "admin");
  const agency = await Agency.findById(trip.agency).select("owner").lean();
  if (agency) {
    await notify(agency.owner, {
      title: `An admin cancelled ${trip.title}`,
      body: reason,
      href: `/agency/trips/${trip._id}`,
    });
  }

  revalidatePath("/", "layout");
  return { success: true, message: "Trip cancelled and travellers notified." };
}

/** "reviewed" means the report was upheld — it then lowers the reported user's trust score. */
export async function resolveReport(reportId: string, status: "reviewed" | "dismissed") {
  await requireAdmin();
  if (!ID_RE.test(reportId) || (status !== "reviewed" && status !== "dismissed")) return;

  await connectDB();
  const report = await Report.findOneAndUpdate({ _id: reportId, status: "open" }, { status });
  if (report && status === "reviewed") {
    await notify(report.reported, {
      title: "A report against your account was upheld",
      body: "Please follow the community guidelines. Repeated reports can lead to suspension.",
    });
  }
  revalidatePath("/admin", "layout");
}
