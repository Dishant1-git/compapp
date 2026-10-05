"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, requireUser, requireVerified, safeNext } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/mongoose";
import { Booking } from "@/lib/db/models/booking";
import { BuddyRequest } from "@/lib/db/models/buddy-request";
import { Report } from "@/lib/db/models/report";
import { TravelPlan } from "@/lib/db/models/travel-plan";
import { Trip } from "@/lib/db/models/trip";
import { User } from "@/lib/db/models/user";
import { Agency } from "@/lib/db/models/agency";
import { Message } from "@/lib/db/models/message";
import { TripInterest } from "@/lib/db/models/trip-interest";
import { IdDocument } from "@/lib/db/models/id-document";
import { ID_RE, PHONE_RE, dateInput, echo, hasErrors, personalities, text, todayUTC } from "@/lib/form-utils";
import { notify } from "@/lib/notifications";
import { ID_DOC_TYPES, MAX_ID_DOC_BYTES, refundPercent } from "@/lib/payments/pricing";
import { refundSeatFee } from "@/lib/payments/settle";
import { groupAccess, postSystemMessage } from "./chat";
import { GENDERS, REPORT_REASONS, type ReportReason } from "./constants";
import { firstName, formatDateRange, formatPrice } from "./format";
import type { ActionState } from "./types";

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

// Seats are booked by paying the seat fee: see startSeatBooking in src/lib/payments/actions.ts.

/** Read an uploaded ID photo and check its bytes really are a JPEG, PNG or WebP. */
async function readIdImage(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_ID_DOC_BYTES) return null;
  const data = Buffer.from(await file.arrayBuffer());
  const head = data.subarray(0, 12);
  const contentType =
    head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
      ? "image/jpeg"
      : head.subarray(0, 4).toString("hex") === "89504e47"
        ? "image/png"
        : head.subarray(0, 4).toString() === "RIFF" && head.subarray(8, 12).toString() === "WEBP"
          ? "image/webp"
          : null;
  return contentType ? { data, contentType } : null;
}

/**
 * Upload the IDs that prove the travellers' ages, after paying. The form sends
 * `doc-<n>` (a photo) and `type-<n>` for each traveller whose ID is needed.
 */
export async function submitAgeDocuments(bookingId: string, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser();
  if (!ID_RE.test(bookingId)) return { message: "Booking not found." };

  await connectDB();
  const booking = await Booking.findOne({ _id: bookingId, user: viewer.id, status: "confirmed" })
    .select("trip ageCheck travellers")
    .populate<{ trip: { title: string } | null }>("trip", "title");
  if (!booking?.ageCheck?.status) return { message: "Booking not found." };
  if (booking.ageCheck.status !== "required") return { message: "Your ID has already been sent." };

  const uploads = [];
  for (const traveller of booking.ageCheck.proofFor ?? [0]) {
    const docType = text(formData, `type-${traveller}`);
    if (!ID_DOC_TYPES.some((t) => t.id === docType)) return { message: "Choose the type of each document." };
    const image = await readIdImage(formData.get(`doc-${traveller}`));
    if (!image) return { message: "Add a clear JPEG, PNG or WebP photo of each ID (under 2 MB)." };
    uploads.push({ traveller, docType, image });
  }

  const saved = await IdDocument.insertMany(
    uploads.map((u) => ({
      owner: viewer.id,
      booking: booking._id,
      contentType: u.image.contentType,
      bytes: u.image.data.length,
      data: u.image.data,
    })),
  );
  const updated = await Booking.updateOne(
    { _id: booking._id, "ageCheck.status": "required" },
    {
      $set: {
        "ageCheck.status": "pending",
        "ageCheck.documents": uploads.map((u, i) => ({ traveller: u.traveller, docType: u.docType, image: saved[i]._id })),
        "ageCheck.submittedAt": new Date(),
      },
      $unset: { "ageCheck.note": 1 },
    },
  );
  if (!updated.modifiedCount) {
    await IdDocument.deleteMany({ _id: { $in: saved.map((d) => d._id) } });
    return { message: "Your ID has already been sent." };
  }

  const admins = await User.find({ role: "admin", status: "active" }).select("_id").lean();
  await notify(
    admins.map((a) => a._id),
    { title: "Age check to review", body: `${viewer.name} · ${booking.trip?.title ?? "trip"}`, href: "/admin/age-checks" },
  );
  revalidatePath("/", "layout");
  return { success: true, message: "Thanks. We'll check your ID and let you know, usually within a day." };
}

/** Cancel your own booking. The seat fee is refunded by how long is left before departure. */
export async function cancelBooking(bookingId: string) {
  const viewer = await requireUser();
  if (!ID_RE.test(bookingId)) return;

  await connectDB();
  const booking = await Booking.findOne({ _id: bookingId, user: viewer.id, status: "confirmed" })
    .populate<{ trip: { _id: string; title: string; startDate: Date; agency: string } | null }>(
      "trip",
      "title startDate agency",
    );
  if (!booking?.trip || booking.trip.startDate <= new Date()) return;

  await Booking.updateOne(
    { _id: booking._id },
    { status: "cancelled", cancelledAt: new Date(), cancelledBy: "traveller" },
  );
  const refunded = await refundSeatFee(
    booking._id,
    refundPercent(booking.trip.startDate),
    "Cancelled by traveller",
  );
  await IdDocument.deleteMany({ booking: booking._id });
  if (refunded) {
    await notify(viewer.id, {
      title: `Refund on its way: ${formatPrice(refunded)}`,
      body: `For your cancelled booking on ${booking.trip.title}. It can take 5 to 7 working days to reach you.`,
      href: "/trips/me",
    });
  }
  const agency = await Agency.findById(booking.trip.agency).select("owner").lean();
  await postSystemMessage(booking.trip._id, `${firstName(viewer.name)} left the group.`);
  if (agency) {
    await notify(agency.owner, {
      title: `Booking cancelled: ${booking.trip.title}`,
      body: `${viewer.name} cancelled their seat.`,
      href: `/agency/trips/${booking.trip._id}`,
    });
  }
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser("/trips/profile");

  const name = text(formData, "name");
  const phone = text(formData, "phone");
  const city = text(formData, "city");
  const birthYearRaw = text(formData, "birthYear");
  const gender = text(formData, "gender");
  const bio = text(formData, "bio");
  const personality = personalities(formData, "personality");
  const ecName = text(formData, "emergencyName");
  const ecPhone = text(formData, "emergencyPhone");

  const errors: Record<string, string[]> = {};
  const year = new Date().getFullYear();
  const birthYear = birthYearRaw ? Number(birthYearRaw) : null;

  if (name.length < 2) errors.name = ["Enter your full name."];
  if (phone && !PHONE_RE.test(phone)) errors.phone = ["Enter a valid phone number."];
  if (birthYear !== null && (!Number.isInteger(birthYear) || birthYear > year - 18 || birthYear < year - 100)) {
    errors.birthYear = ["You must be 18 or older."];
  }
  if (!GENDERS.some((g) => g.id === gender)) errors.gender = ["Choose an option."];
  if (bio.length > 500) errors.bio = ["Keep your bio under 500 characters."];
  if (ecPhone && !PHONE_RE.test(ecPhone)) errors.emergencyPhone = ["Enter a valid phone number."];
  if (!!ecName !== !!ecPhone) errors.emergencyName = ["Add both a name and a phone number."];
  if (ecPhone && ecPhone === phone) errors.emergencyPhone = ["Use someone else's number."];
  if (hasErrors(errors)) return { errors, values: echo(formData) };

  await connectDB();
  await User.updateOne(
    { _id: viewer.id },
    {
      name,
      phone: phone || undefined,
      city: city || undefined,
      birthYear: birthYear ?? undefined,
      gender,
      bio: bio || undefined,
      personality,
      emergencyContact: { name: ecName || undefined, phone: ecPhone || undefined },
    },
  );

  revalidatePath("/trips", "layout");
  const next = formData.get("next");
  if (next) redirect(safeNext(next));
  return { success: true, message: "Profile saved." };
}

// ---------------------------------------------------------------------------
// Travel buddies
// ---------------------------------------------------------------------------

export async function createTravelPlan(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireVerified("/trips/buddies/new");

  const origin = text(formData, "origin");
  const destination = text(formData, "destination");
  const startDate = dateInput(text(formData, "startDate"));
  const endDate = dateInput(text(formData, "endDate"));
  const budget = Number(text(formData, "budget"));
  const lookingFor = personalities(formData, "lookingFor");
  const note = text(formData, "note");

  const errors: Record<string, string[]> = {};
  if (origin.length < 2) errors.origin = ["Where are you starting from?"];
  if (destination.length < 2) errors.destination = ["Where are you going?"];
  if (!startDate || startDate < todayUTC()) errors.startDate = ["Choose a start date from today onwards."];
  if (!endDate || (startDate && endDate < startDate)) errors.endDate = ["End date must be after the start date."];
  if (!Number.isFinite(budget) || budget <= 0) errors.budget = ["Enter your budget in rupees."];
  if (!lookingFor.length) errors.lookingFor = ["Pick at least one."];
  if (note.length > 500) errors.note = ["Keep it under 500 characters."];
  if (hasErrors(errors)) return { errors, values: echo(formData) };

  await connectDB();
  await TravelPlan.create({
    user: viewer.id,
    origin,
    destination,
    startDate: startDate!,
    endDate: endDate!,
    budget: Math.round(budget),
    lookingFor,
    note: note || undefined,
  });

  revalidatePath("/trips", "layout");
  redirect("/trips/me#plans");
}

export async function closeTravelPlan(planId: string) {
  const viewer = await requireUser();
  if (!ID_RE.test(planId)) return;
  await connectDB();
  await TravelPlan.updateOne({ _id: planId, user: viewer.id }, { status: "closed" });
  revalidatePath("/trips", "layout");
}

export async function sendBuddyRequest(
  planId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login?next=/trips/buddies");
  if (!ID_RE.test(planId)) return { message: "Plan not found." };
  // Sends unverified accounts to verify first, then back to the plans.
  await requireVerified("/trips/buddies");

  const message = text(formData, "message");
  if (message.length > 300) return { errors: { message: ["Keep it under 300 characters."] } };

  await connectDB();
  const plan = await TravelPlan.findById(planId).select("user status destination");
  if (!plan || plan.status !== "active") return { message: "This plan is no longer active." };
  if (String(plan.user) === viewer.id) return { message: "This is your own plan." };
  if (await BuddyRequest.exists({ plan: plan._id, from: viewer.id })) {
    return { message: "You've already sent a request." };
  }

  await BuddyRequest.create({
    plan: plan._id,
    from: viewer.id,
    to: plan.user,
    message: message || undefined,
  });
  await notify(plan.user, {
    title: `${firstName(viewer.name)} wants to join your trip to ${plan.destination}`,
    body: message || undefined,
    href: "/trips/me#plans",
  });

  revalidatePath("/trips", "layout");
  return { success: true, message: "Request sent." };
}

export async function respondToBuddyRequest(requestId: string, decision: "accepted" | "declined") {
  const viewer = await requireUser();
  if (!ID_RE.test(requestId) || !["accepted", "declined"].includes(decision)) return;

  await connectDB();
  const request = await BuddyRequest.findOneAndUpdate(
    { _id: requestId, to: viewer.id, status: "pending" },
    { status: decision },
  ).populate<{ plan: { destination: string } | null }>("plan", "destination");
  if (request) {
    const where = request.plan ? ` for ${request.plan.destination}` : "";
    await notify(request.from, {
      title:
        decision === "accepted"
          ? `${firstName(viewer.name)} accepted your request${where}`
          : `Your request${where} was declined`,
      body: decision === "accepted" ? "Contact details are now visible in My trips." : undefined,
      href: "/trips/me",
    });
  }
  revalidatePath("/trips", "layout");
}

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

export async function reportUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser();

  const reportedId = text(formData, "reportedId");
  const tripId = text(formData, "tripId");
  const reason = text(formData, "reason");
  const details = text(formData, "details");

  if (!ID_RE.test(reportedId) || reportedId === viewer.id) return { message: "Invalid report." };
  if (!REPORT_REASONS.some((r) => r.id === reason)) {
    return { errors: { reason: ["Choose a reason."] }, values: echo(formData) };
  }
  if (details.length > 1000) {
    return { errors: { details: ["Keep it under 1000 characters."] }, values: echo(formData) };
  }

  await connectDB();
  if (!(await User.exists({ _id: reportedId }))) return { message: "Invalid report." };

  await Report.create({
    reporter: viewer.id,
    reported: reportedId,
    trip: ID_RE.test(tripId) ? tripId : undefined,
    reason: reason as ReportReason,
    details: details || undefined,
  });
  const admins = await User.find({ role: "admin", status: "active" }).select("_id").lean();
  await notify(
    admins.map((a) => a._id),
    {
      title: "New safety report",
      body: REPORT_REASONS.find((r) => r.id === reason)?.label,
      href: "/admin/reports",
    },
  );
  return { success: true, message: "Thanks — our safety team will review this report." };
}

// ---------------------------------------------------------------------------
// Interest & group chat
// ---------------------------------------------------------------------------

/** Toggle "I'm interested" on a trip. Agencies see who's interested. */
export async function toggleInterest(tripId: string) {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login?next=/trips");
  if (!ID_RE.test(tripId) || viewer.role !== "user") return;

  await connectDB();
  const removed = await TripInterest.findOneAndDelete({ trip: tripId, user: viewer.id });
  if (!removed) {
    const trip = await Trip.findById(tripId).select("title agency startDate endDate").lean();
    if (!trip) return;
    await TripInterest.create({ trip: tripId, user: viewer.id });
    const agency = await Agency.findById(trip.agency).select("owner").lean();
    if (agency) {
      await notify(agency.owner, {
        title: `${firstName(viewer.name)} is interested in ${trip.title}`,
        body: formatDateRange(trip.startDate, trip.endDate),
        href: `/agency/trips/${tripId}`,
      });
    }
  }
  revalidatePath("/", "layout");
}

export async function sendMessage(
  tripId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await requireUser();
  const body = text(formData, "body");
  if (!body) return {};
  if (body.length > 1000) return { message: "Messages can be up to 1000 characters." };

  const access = await groupAccess(tripId, viewer);
  if (!access?.canPost) return { message: "Only people on this trip can post here." };

  await Message.create({ trip: access.tripId, user: viewer.id, body });
  return { success: true };
}
