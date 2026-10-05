"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/mongoose";
import { Agency, AGENCY_STATUSES, type AgencyStatus } from "@/lib/db/models/agency";
import { Booking } from "@/lib/db/models/booking";
import { CompanionProfile } from "@/lib/db/models/companion-profile";
import { IdDocument } from "@/lib/db/models/id-document";
import { Report } from "@/lib/db/models/report";
import { Trip } from "@/lib/db/models/trip";
import { User } from "@/lib/db/models/user";
import { ID_RE, text } from "@/lib/form-utils";
import { notify } from "@/lib/notifications";
import { refundPercent } from "@/lib/payments/pricing";
import { refundSeatFee } from "@/lib/payments/settle";
import { cancelTripAndBookings } from "@/lib/trips/cancel";
import { postSystemMessage } from "@/lib/trips/chat";
import { firstName, formatPrice } from "@/lib/trips/format";
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

// ---------------------------------------------------------------------------
// Age checks (ID uploaded after paying the seat fee)
// ---------------------------------------------------------------------------

/** Decide a pending age check. The uploaded IDs are deleted once it's decided. */
async function decideAgeCheck(bookingId: string, adminId: string, status: "verified" | "required" | "rejected", note?: string) {
  await connectDB();
  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, status: "confirmed", "ageCheck.status": "pending" },
    {
      $set: {
        "ageCheck.status": status,
        "ageCheck.reviewedAt": new Date(),
        "ageCheck.reviewedBy": adminId,
        ...(note ? { "ageCheck.note": note } : {}),
        ...(status === "rejected" ? { status: "cancelled", cancelledAt: new Date(), cancelledBy: "admin" } : {}),
      },
      $unset: { "ageCheck.documents": 1, ...(note ? {} : { "ageCheck.note": 1 }) },
    },
  ).populate<{ trip: { _id: unknown; slug: string; title: string; startDate: Date; agency: unknown } | null }>(
    "trip",
    "slug title startDate agency",
  );
  if (!booking) return null;
  await IdDocument.deleteMany({ booking: booking._id });
  revalidatePath("/", "layout");
  return booking;
}

export async function approveAgeCheck(bookingId: string) {
  const admin = await requireAdmin();
  if (!ID_RE.test(bookingId)) return;
  const booking = await decideAgeCheck(bookingId, admin.id, "verified");
  if (booking?.trip) {
    await notify(booking.user, {
      title: "Your age is verified",
      body: `You're all set for ${booking.trip.title}.`,
      href: `/trips/${booking.trip.slug}`,
    });
  }
}

/** The photo was unreadable or the wrong document: ask for another one, keeping the seat. */
export async function requestNewAgeDocument(
  bookingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!ID_RE.test(bookingId)) return { message: "Invalid request." };
  const note = text(formData, "note").slice(0, 300);
  if (note.length < 5) return { errors: { note: ["Tell them what to fix, e.g. \"Date of birth is not readable\"."] } };

  const booking = await decideAgeCheck(bookingId, admin.id, "required", note);
  if (!booking?.trip) return { message: "This age check was already reviewed." };
  await notify(booking.user, {
    title: "Please upload your ID again",
    body: note,
    href: `/trips/${booking.trip.slug}/verify-age`,
  });
  return { success: true, message: "They've been asked to upload a new document." };
}

/** The ID shows the age rule isn't met: cancel the booking and refund by time left before departure. */
export async function rejectAgeCheck(
  bookingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!ID_RE.test(bookingId)) return { message: "Invalid request." };
  const note = text(formData, "note").slice(0, 300);
  if (note.length < 5) return { errors: { note: ["Add the reason they'll see."] } };

  const booking = await decideAgeCheck(bookingId, admin.id, "rejected", note);
  if (!booking?.trip) return { message: "This age check was already reviewed." };
  const trip = booking.trip;

  const refunded = await refundSeatFee(booking._id, refundPercent(trip.startDate), "Age check failed");
  const [agency, user] = await Promise.all([
    Agency.findById(trip.agency).select("owner").lean(),
    User.findById(booking.user).select("name").lean(),
  ]);
  await Promise.all([
    postSystemMessage(String(trip._id), `${firstName(user?.name ?? "A traveller")} left the group.`),
    notify(booking.user, {
      title: `Booking cancelled: ${trip.title}`,
      body: `Your age check failed: ${note} ${
        refunded ? `${formatPrice(refunded)} of your seat fee is being refunded.` : "The seat fee is not refundable this close to departure."
      }`,
      href: `/trips/${trip.slug}`,
    }),
    agency &&
      notify(agency.owner, {
        title: `Booking cancelled: ${trip.title}`,
        body: `${user?.name ?? "A traveller"} did not pass the age check.`,
        href: `/agency/trips/${trip._id}`,
      }),
  ]);
  return {
    success: true,
    message: `Booking cancelled. ${refunded ? `${formatPrice(refunded)} refunded.` : "No refund was due."}`,
  };
}

/**
 * Approve or reject a Companion selfie. Tied to the exact selfie the admin
 * looked at, so a retake submitted meanwhile isn't approved unseen.
 */
async function reviewSelfie(profileId: string, selfieId: string, status: "verified" | "rejected", note?: string) {
  await connectDB();
  const profile = await CompanionProfile.findOneAndUpdate(
    { _id: profileId, "selfie.image": selfieId, "selfie.status": "pending" },
    { $set: { "selfie.status": status, "selfie.reviewedAt": new Date(), "selfie.note": note || undefined } },
  );
  if (!profile) return false;

  await User.updateOne({ _id: profile.user }, { $set: { "verification.identity": status === "verified" } });
  await notify(profile.user, {
    title:
      status === "verified"
        ? "Your photo is verified — your Companion profile is ready!"
        : "We couldn't verify your selfie. Please take a new one.",
    body: note || undefined,
    href: "/companion/join",
  });
  revalidatePath("/admin", "layout");
  return true;
}

export async function approveSelfie(profileId: string, selfieId: string) {
  await requireAdmin();
  if (!ID_RE.test(profileId) || !ID_RE.test(selfieId)) return;
  await reviewSelfie(profileId, selfieId, "verified");
}

export async function rejectSelfie(
  profileId: string,
  selfieId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  if (!ID_RE.test(profileId) || !ID_RE.test(selfieId)) return { message: "Invalid request." };
  const note = text(formData, "note");
  if (note.length < 5) return { errors: { note: ["Tell them what to fix, e.g. \"Face not clearly visible\"."] } };
  const done = await reviewSelfie(profileId, selfieId, "rejected", note.slice(0, 300));
  return done
    ? { success: true, message: "Selfie rejected. They've been asked to retake it." }
    : { message: "This selfie was already reviewed or replaced." };
}
