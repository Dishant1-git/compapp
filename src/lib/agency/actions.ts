"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMyAgency, requireRole, type CurrentAgency } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/mongoose";
import { Agency } from "@/lib/db/models/agency";
import { Booking } from "@/lib/db/models/booking";
import { Trip } from "@/lib/db/models/trip";
import { User } from "@/lib/db/models/user";
import {
  ID_RE,
  PHONE_RE,
  dateInput,
  echo,
  hasErrors,
  lines,
  personalities,
  text,
  todayUTC,
} from "@/lib/form-utils";
import { notify } from "@/lib/notifications";
import { cancelTripAndBookings } from "@/lib/trips/cancel";
import { postSystemMessage } from "@/lib/trips/chat";
import type { ActionState } from "@/lib/trips/types";

async function requireAgency(): Promise<CurrentAgency> {
  const user = await requireRole(["agency"], "/agency");
  const agency = await getMyAgency(user.id);
  if (!agency) redirect("/agency");
  return agency;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Itinerary lines look like "Arrive in Manali: check in and explore Old Manali". */
function parseItinerary(value: string) {
  return lines(value).map((line, i) => {
    const [title, ...rest] = line.split(":");
    return { day: i + 1, title: title.trim(), description: rest.join(":").trim() };
  });
}

/** Validate the shared create/edit trip form. */
function parseTripForm(formData: FormData, { allowPastStart = false } = {}) {
  const title = text(formData, "title");
  const origin = text(formData, "origin");
  const destination = text(formData, "destination");
  const summary = text(formData, "summary");
  const startDate = dateInput(text(formData, "startDate"));
  const endDate = dateInput(text(formData, "endDate"));
  const price = Number(text(formData, "price"));
  const maxGroupSize = Number(text(formData, "maxGroupSize"));
  const minAge = Number(text(formData, "minAge") || 18);
  const vibes = personalities(formData, "vibes");
  const captainName = text(formData, "captainName");
  const captainPhone = text(formData, "captainPhone");

  const errors: Record<string, string[]> = {};
  if (title.length < 3) errors.title = ["Give the trip a title."];
  if (origin.length < 2) errors.origin = ["Enter a departure city."];
  if (destination.length < 2) errors.destination = ["Enter a destination."];
  if (summary.length < 20) errors.summary = ["Write at least a short summary (20+ characters)."];
  if (!startDate || (!allowPastStart && startDate <= todayUTC())) {
    errors.startDate = ["Start date must be in the future."];
  }
  if (!endDate || (startDate && endDate < startDate)) errors.endDate = ["End date must be after the start date."];
  if (!Number.isFinite(price) || price <= 0) errors.price = ["Enter a price per person."];
  if (!Number.isInteger(maxGroupSize) || maxGroupSize < 2 || maxGroupSize > 60) {
    errors.maxGroupSize = ["Group size must be between 2 and 60."];
  }
  if (!Number.isInteger(minAge) || minAge < 18) errors.minAge = ["Minimum age is 18."];
  if (!vibes.length) errors.vibes = ["Pick at least one vibe."];
  if (captainName.length < 2) errors.captainName = ["Every trip needs a trip captain."];
  if (captainPhone && !PHONE_RE.test(captainPhone)) errors.captainPhone = ["Enter a valid phone number."];

  return {
    errors,
    data: {
      title,
      origin,
      destination,
      region: text(formData, "region") || undefined,
      summary,
      startDate: startDate!,
      endDate: endDate!,
      price: Math.round(price),
      maxGroupSize,
      minAge,
      vibes,
      highlights: lines(text(formData, "highlights")),
      itinerary: parseItinerary(text(formData, "itinerary")),
      inclusions: lines(text(formData, "inclusions")),
      exclusions: lines(text(formData, "exclusions")),
      captain: {
        name: captainName,
        phone: captainPhone || undefined,
        bio: text(formData, "captainBio") || undefined,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Trips
// ---------------------------------------------------------------------------

export async function createTrip(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const agency = await requireAgency();
  if (agency.status !== "approved") {
    return { message: "Your agency must be approved by an admin before you can publish trips." };
  }

  const { errors, data } = parseTripForm(formData);
  if (hasErrors(errors)) return { errors, values: echo(formData) };

  await connectDB();
  const slug = `${slugify(`${data.destination} ${data.title}`)}-${Math.random().toString(36).slice(2, 6)}`;
  const trip = await Trip.create({ ...data, slug, agency: agency.id });

  revalidatePath("/", "layout");
  redirect(`/agency/trips/${trip._id}`);
}

export async function updateTrip(tripId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const agency = await requireAgency();
  if (!ID_RE.test(tripId)) return { message: "Trip not found." };

  await connectDB();
  const trip = await Trip.findOne({ _id: tripId, agency: agency.id });
  if (!trip) return { message: "Trip not found." };
  if (trip.status === "cancelled") return { message: "Cancelled trips can't be edited." };

  // A trip that has already started can still be edited, but not moved back in time.
  const { errors, data } = parseTripForm(formData, { allowPastStart: trip.startDate <= new Date() });
  const booked = await Booking.countDocuments({ trip: trip._id, status: "confirmed" });
  if (data.maxGroupSize < booked) {
    errors.maxGroupSize = [`${booked} travellers are already booked.`];
  }
  if (hasErrors(errors)) return { errors, values: echo(formData) };

  const datesChanged = +trip.startDate !== +data.startDate || +trip.endDate !== +data.endDate;
  Object.assign(trip, data);
  await trip.save();

  if (datesChanged) {
    const travellers = await Booking.find({ trip: trip._id, status: "confirmed" }).select("user").lean();
    await Promise.all([
      postSystemMessage(trip._id, "The agency changed the trip dates. Check the trip page for details."),
      notify(
        travellers.map((b) => b.user),
        { title: `Dates changed: ${trip.title}`, href: `/trips/${trip.slug}` },
      ),
    ]);
  }

  revalidatePath("/", "layout");
  redirect(`/agency/trips/${trip._id}`);
}

/** Cancel a trip: every confirmed booking is cancelled and travellers are notified. */
export async function cancelTripAsAgency(
  tripId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const agency = await requireAgency();
  const reason = text(formData, "reason");
  if (reason.length < 5) return { errors: { reason: ["Tell travellers why (5+ characters)."] } };
  if (!ID_RE.test(tripId)) return { message: "Trip not found." };

  await connectDB();
  const trip = await Trip.findOne({ _id: tripId, agency: agency.id, status: "open" });
  if (!trip) return { message: "Trip not found or already cancelled." };

  await cancelTripAndBookings(trip._id, reason, "agency");
  revalidatePath("/", "layout");
  return { success: true, message: "Trip cancelled. Travellers have been notified." };
}

export async function setBookingPaid(bookingId: string, paid: boolean) {
  const agency = await requireAgency();
  if (!ID_RE.test(bookingId)) return;

  await connectDB();
  const booking = await Booking.findById(bookingId).populate<{ trip: { agency: unknown } | null }>(
    "trip",
    "agency",
  );
  if (!booking?.trip || String(booking.trip.agency) !== agency.id || booking.status !== "confirmed") return;

  booking.paymentStatus = paid ? "paid" : "unpaid";
  booking.paidAt = paid ? new Date() : undefined;
  await booking.save();
  revalidatePath("/agency", "layout");
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function updateAgencyProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await requireAgency();

  const name = text(formData, "name");
  const city = text(formData, "city");
  const phone = text(formData, "phone");
  const website = text(formData, "website");
  const registrationNumber = text(formData, "registrationNumber");
  const description = text(formData, "description");

  const errors: Record<string, string[]> = {};
  if (name.length < 2) errors.name = ["Enter your agency's name."];
  if (city.length < 2) errors.city = ["Enter the city you operate from."];
  if (!PHONE_RE.test(phone)) errors.phone = ["Enter a valid phone number."];
  if (website && !/^https?:\/\/\S+\.\S+/.test(website)) errors.website = ["Enter a full URL (https://…)."];
  if (registrationNumber.length < 4) errors.registrationNumber = ["Enter your registration number or GSTIN."];
  if (description.length > 1000) errors.description = ["Keep it under 1000 characters."];
  if (hasErrors(errors)) return { errors, values: echo(formData) };

  await connectDB();
  const agency = await Agency.findById(current.id);
  if (!agency) return { message: "Agency not found." };

  // Changing legal details sends an approved agency back for review.
  const needsReview =
    agency.status === "approved" && agency.registrationNumber !== registrationNumber;
  const wasRejected = agency.status === "rejected";

  Object.assign(agency, {
    name,
    city,
    phone,
    website: website || undefined,
    registrationNumber,
    description: description || undefined,
  });
  if (needsReview || wasRejected) agency.status = "pending";
  await agency.save();

  if (needsReview || wasRejected) {
    const admins = await User.find({ role: "admin", status: "active" }).select("_id").lean();
    await notify(
      admins.map((a) => a._id),
      { title: `Agency to review: ${name}`, href: `/admin/agencies/${agency._id}` },
    );
  }

  revalidatePath("/", "layout");
  return {
    success: true,
    message:
      needsReview || wasRejected
        ? "Saved. Your details were sent to an admin for review."
        : "Agency profile saved.",
  };
}
