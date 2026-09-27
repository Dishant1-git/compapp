import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { Agency, type AgencyStatus } from "@/lib/db/models/agency";
import { Booking } from "@/lib/db/models/booking";
import { Trip } from "@/lib/db/models/trip";
import { TripInterest } from "@/lib/db/models/trip-interest";
import { ageFromBirthYear, firstName, toDateInput } from "@/lib/trips/format";
import { groupsFor, toSummary, type LeanTrip, type LeanUser } from "@/lib/trips/queries";
import type { TripSummary } from "@/lib/trips/types";

export type AgencyTripRow = TripSummary & {
  status: "open" | "cancelled";
  interestedCount: number;
  revenue: number;
};

export type AgencyDashboard = {
  stats: {
    upcomingTrips: number;
    travellers: number;
    interested: number;
    bookedValue: number;
    paidValue: number;
  };
  trips: AgencyTripRow[];
};

export async function getAgencyDashboard(agencyId: string): Promise<AgencyDashboard> {
  await connectDB();
  const trips = await Trip.find({ agency: agencyId }).sort({ startDate: 1 }).lean<LeanTrip[]>();
  const ids = trips.map((t) => t._id);

  const [groups, interests, bookings] = await Promise.all([
    groupsFor(ids),
    TripInterest.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { trip: { $in: ids } } },
      { $group: { _id: "$trip", count: { $sum: 1 } } },
    ]),
    Booking.find({ trip: { $in: ids }, status: "confirmed" }).select("trip amount paymentStatus").lean(),
  ]);

  const now = new Date();
  const rows: AgencyTripRow[] = trips.map((t) => {
    const tripBookings = bookings.filter((b) => String(b.trip) === String(t._id));
    return {
      ...toSummary(t, groups.get(String(t._id)) ?? [], null),
      status: t.status as AgencyTripRow["status"],
      interestedCount: interests.find((i) => String(i._id) === String(t._id))?.count ?? 0,
      revenue: tripBookings.reduce((sum, b) => sum + b.amount, 0),
    };
  });

  return {
    stats: {
      upcomingTrips: trips.filter((t) => t.status === "open" && t.endDate >= now).length,
      travellers: bookings.length,
      interested: interests.reduce((sum, i) => sum + i.count, 0),
      bookedValue: bookings.reduce((sum, b) => sum + b.amount, 0),
      paidValue: bookings.filter((b) => b.paymentStatus === "paid").reduce((sum, b) => sum + b.amount, 0),
    },
    trips: rows,
  };
}

export type Traveller = {
  bookingId: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  age: number | null;
  gender?: string;
  city?: string;
  emergencyContact?: { name: string; phone: string };
  paymentStatus: string;
  amount: number;
  bookedAt: string;
};

export type InterestedPerson = {
  userId: string;
  firstName: string;
  age: number | null;
  city?: string;
  personality: string[];
  since: string;
  booked: boolean;
};

export type TripFormValues = Record<string, string | string[]>;

export type AgencyTripDetail = {
  trip: AgencyTripRow & { cancelReason?: string };
  travellers: Traveller[];
  cancelled: { name: string; cancelledAt?: string; cancelledBy?: string }[];
  interested: InterestedPerson[];
  formValues: TripFormValues;
};

/** Everything an agency needs to run one of its trips. Returns null if it's not theirs. */
export async function getAgencyTrip(agencyId: string, tripId: string): Promise<AgencyTripDetail | null> {
  if (!Types.ObjectId.isValid(tripId)) return null;
  await connectDB();
  const trip = await Trip.findOne({ _id: tripId, agency: agencyId }).lean<LeanTrip>();
  if (!trip) return null;

  const [bookings, interests] = await Promise.all([
    Booking.find({ trip: trip._id })
      .sort({ createdAt: 1 })
      .populate<{ user: LeanUser | null }>(
        "user",
        "name email phone birthYear gender city emergencyContact personality",
      )
      .lean(),
    TripInterest.find({ trip: trip._id })
      .sort({ createdAt: -1 })
      .populate<{ user: LeanUser | null }>("user", "name birthYear city personality")
      .lean(),
  ]);

  const confirmed = bookings.filter((b) => b.status === "confirmed" && b.user);
  const bookedIds = new Set(confirmed.map((b) => String(b.user!._id)));
  const group = confirmed.map((b) => ({
    userId: String(b.user!._id),
    personality: b.user!.personality ?? [],
  }));

  return {
    trip: {
      ...toSummary(trip, group, null),
      status: trip.status as AgencyTripRow["status"],
      interestedCount: interests.length,
      revenue: confirmed.reduce((sum, b) => sum + b.amount, 0),
      cancelReason: trip.cancelReason ?? undefined,
    },
    travellers: confirmed.map((b) => {
      const u = b.user!;
      return {
        bookingId: String(b._id),
        userId: String(u._id),
        name: u.name,
        email: u.email,
        phone: u.phone ?? undefined,
        age: ageFromBirthYear(u.birthYear),
        gender: u.gender ?? undefined,
        city: u.city ?? undefined,
        emergencyContact:
          u.emergencyContact?.name && u.emergencyContact?.phone
            ? { name: u.emergencyContact.name, phone: u.emergencyContact.phone }
            : undefined,
        paymentStatus: b.paymentStatus,
        amount: b.amount,
        bookedAt: b.createdAt.toISOString(),
      };
    }),
    cancelled: bookings
      .filter((b) => b.status === "cancelled" && b.user)
      .map((b) => ({
        name: b.user!.name,
        cancelledAt: b.cancelledAt?.toISOString(),
        cancelledBy: b.cancelledBy ?? undefined,
      })),
    interested: interests
      .filter((i) => i.user)
      .map((i) => ({
        userId: String(i.user!._id),
        firstName: firstName(i.user!.name),
        age: ageFromBirthYear(i.user!.birthYear),
        city: i.user!.city ?? undefined,
        personality: i.user!.personality ?? [],
        since: i.createdAt.toISOString(),
        booked: bookedIds.has(String(i.user!._id)),
      })),
    formValues: {
      title: trip.title,
      origin: trip.origin,
      destination: trip.destination,
      region: trip.region ?? "",
      summary: trip.summary,
      startDate: toDateInput(trip.startDate),
      endDate: toDateInput(trip.endDate),
      price: String(trip.price),
      maxGroupSize: String(trip.maxGroupSize),
      minAge: String(trip.minAge ?? 18),
      vibes: trip.vibes ?? [],
      highlights: (trip.highlights ?? []).join("\n"),
      itinerary: (trip.itinerary ?? [])
        .map((d) => (d.description ? `${d.title}: ${d.description}` : (d.title ?? "")))
        .join("\n"),
      inclusions: (trip.inclusions ?? []).join("\n"),
      exclusions: (trip.exclusions ?? []).join("\n"),
      captainName: trip.captain?.name ?? "",
      captainPhone: trip.captain?.phone ?? "",
      captainBio: trip.captain?.bio ?? "",
    },
  };
}

export type AgencyProfile = {
  id: string;
  name: string;
  description: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  registrationNumber: string;
  status: AgencyStatus;
  reviewNote?: string;
  createdAt: string;
};

export async function getAgencyProfile(agencyId: string): Promise<AgencyProfile | null> {
  await connectDB();
  const a = await Agency.findById(agencyId).lean();
  if (!a) return null;
  return {
    id: String(a._id),
    name: a.name,
    description: a.description ?? "",
    city: a.city,
    phone: a.phone,
    email: a.email,
    website: a.website ?? "",
    registrationNumber: a.registrationNumber ?? "",
    status: a.status as AgencyStatus,
    reviewNote: a.reviewNote ?? undefined,
    createdAt: a.createdAt.toISOString(),
  };
}
