import "server-only";
import { Types } from "mongoose";
import type { CurrentUser } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/mongoose";
import { Agency } from "@/lib/db/models/agency";
import { Booking } from "@/lib/db/models/booking";
import { BuddyRequest } from "@/lib/db/models/buddy-request";
import { Report } from "@/lib/db/models/report";
import { TravelPlan } from "@/lib/db/models/travel-plan";
import { Trip, type TripDoc } from "@/lib/db/models/trip";
import { TripInterest } from "@/lib/db/models/trip-interest";
import { User, type UserDoc } from "@/lib/db/models/user";
import { ageFromBirthYear, firstName } from "./format";
import { compatibility, tripCompatibility } from "./matching";
import { computeTrust, type TrustScore } from "./trust";
import type {
  BuddyRequestView,
  GroupMember,
  MyBooking,
  TravelPlanSummary,
  TripDetail,
  TripSummary,
} from "./types";

type WithId<T> = T & { _id: Types.ObjectId };
export type LeanTrip = WithId<TripDoc>;
export type LeanUser = WithId<UserDoc>;

function startOfToday() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** "2026-10" → [1 Oct, 1 Nov) in UTC, or null if malformed. */
function monthRange(month?: string) {
  const match = month?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const start = new Date(Date.UTC(+match[1], +match[2] - 1, 1));
  const end = new Date(Date.UTC(+match[1], +match[2], 1));
  return { start, end };
}

// ---------------------------------------------------------------------------
// Trips
// ---------------------------------------------------------------------------

/** Trips are only public while their agency is approved. */
async function approvedAgencyIds() {
  const agencies = await Agency.find({ status: "approved" }).select("_id").lean();
  return agencies.map((a) => a._id);
}

type Member = { userId: string; personality: string[] };

/** Personalities of everyone holding a confirmed seat, per trip. */
export async function groupsFor(tripIds: Types.ObjectId[]) {
  const bookings = await Booking.find({ trip: { $in: tripIds }, status: "confirmed" })
    .select("trip user")
    .populate<{ user: LeanUser | null }>("user", "personality")
    .lean();

  const groups = new Map<string, Member[]>();
  for (const b of bookings) {
    if (!b.user) continue;
    const key = String(b.trip);
    const list = groups.get(key) ?? [];
    list.push({ userId: String(b.user._id), personality: b.user.personality ?? [] });
    groups.set(key, list);
  }
  return groups;
}

export function toSummary(trip: LeanTrip, group: Member[], viewer: CurrentUser | null): TripSummary {
  const others = group.filter((m) => m.userId !== viewer?.id).map((m) => m.personality);
  return {
    id: String(trip._id),
    slug: trip.slug,
    title: trip.title,
    origin: trip.origin,
    destination: trip.destination,
    region: trip.region ?? undefined,
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
    price: trip.price,
    maxGroupSize: trip.maxGroupSize,
    bookedCount: group.length,
    vibes: trip.vibes ?? [],
    compatibility: viewer ? tripCompatibility(viewer.personality, trip.vibes ?? [], others) : null,
  };
}

export type TripFilters = {
  q?: string;
  from?: string;
  month?: string;
  maxPrice?: number;
  vibe?: string;
};

export async function listTrips(
  filters: TripFilters,
  viewer: CurrentUser | null,
): Promise<TripSummary[]> {
  await connectDB();

  const today = startOfToday();
  const query: Record<string, unknown> = {
    status: "open",
    startDate: { $gte: today },
    agency: { $in: await approvedAgencyIds() },
  };

  if (filters.q) {
    const re = new RegExp(escapeRegex(filters.q), "i");
    query.$or = [{ destination: re }, { region: re }, { title: re }];
  }
  if (filters.from) query.origin = new RegExp(`^${escapeRegex(filters.from)}$`, "i");
  const month = monthRange(filters.month);
  if (month) query.startDate = { $gte: month.start > today ? month.start : today, $lt: month.end };
  if (filters.maxPrice) query.price = { $lte: filters.maxPrice };
  if (filters.vibe) query.vibes = filters.vibe;

  const trips = await Trip.find(query).sort({ startDate: 1 }).limit(60).lean<LeanTrip[]>();
  const groups = await groupsFor(trips.map((t) => t._id));
  const summaries = trips.map((t) => toSummary(t, groups.get(String(t._id)) ?? [], viewer));

  // Best matches first when the viewer has a travel personality.
  if (viewer?.personality.length) {
    summaries.sort((a, b) => (b.compatibility ?? 0) - (a.compatibility ?? 0));
  }
  return summaries;
}

/** Departure cities with upcoming trips, for the filter dropdown. */
export async function listOrigins(): Promise<string[]> {
  await connectDB();
  const origins = await Trip.distinct("origin", {
    status: "open",
    startDate: { $gte: startOfToday() },
    agency: { $in: await approvedAgencyIds() },
  });
  return (origins as string[]).sort();
}

export async function getTrip(slug: string, viewer: CurrentUser | null): Promise<TripDetail | null> {
  await connectDB();
  const trip = await Trip.findOne({ slug }).lean<LeanTrip>();
  if (!trip) return null;

  const agency = await Agency.findById(trip.agency).select("owner name city status").lean();
  if (!agency) return null;
  const approved = agency.status === "approved";
  const canManage = viewer?.role === "admin" || String(agency.owner) === viewer?.id;

  const bookings = await Booking.find({ trip: trip._id, status: "confirmed" })
    .sort({ createdAt: 1 })
    .populate<{ user: LeanUser | null }>("user", "name birthYear city gender personality")
    .lean();

  let myBookingId: string | null = null;
  const group: GroupMember[] = [];
  for (const b of bookings) {
    if (!b.user) continue;
    const userId = String(b.user._id);
    const isYou = userId === viewer?.id;
    if (isYou) myBookingId = String(b._id);
    const personality = b.user.personality ?? [];
    group.push({
      userId,
      firstName: firstName(b.user.name),
      age: ageFromBirthYear(b.user.birthYear),
      city: b.user.city ?? undefined,
      gender: b.user.gender ?? undefined,
      personality,
      compatibility: viewer && !isYou ? compatibility(viewer.personality, personality) : null,
      isYou,
    });
  }

  // Hidden trips stay reachable for their agency, admins and people already booked.
  if (!approved && !canManage && !myBookingId) return null;

  const [interestedCount, interested] = await Promise.all([
    TripInterest.countDocuments({ trip: trip._id }),
    viewer ? TripInterest.exists({ trip: trip._id, user: viewer.id }) : Promise.resolve(null),
  ]);

  const summary = toSummary(
    trip,
    group.map((m) => ({ userId: m.userId, personality: m.personality })),
    viewer,
  );

  return {
    ...summary,
    summary: trip.summary,
    minAge: trip.minAge ?? 18,
    status: trip.status as TripDetail["status"],
    highlights: trip.highlights ?? [],
    itinerary: (trip.itinerary ?? []).map((d) => ({
      day: d.day ?? 0,
      title: d.title ?? "",
      description: d.description ?? "",
    })),
    inclusions: trip.inclusions ?? [],
    exclusions: trip.exclusions ?? [],
    captain: {
      name: trip.captain?.name ?? "To be assigned",
      bio: trip.captain?.bio ?? undefined,
      // The captain's number is only for people on the trip (and the agency).
      phone: myBookingId || canManage ? (trip.captain?.phone ?? undefined) : undefined,
    },
    group,
    myBookingId,
    agency: { id: String(agency._id), name: agency.name, city: agency.city, approved },
    interested: !!interested,
    interestedCount,
    canManage,
    cancelReason: trip.cancelReason ?? undefined,
  };
}

export async function getMyBookings(userId: string): Promise<MyBooking[]> {
  await connectDB();
  const bookings = await Booking.find({ user: userId, status: "confirmed" })
    .populate<{ trip: LeanTrip | null }>("trip", "slug title origin destination startDate endDate")
    .lean();

  return bookings
    .filter((b) => b.trip)
    .map((b) => ({
      id: String(b._id),
      amount: b.amount,
      paymentStatus: b.paymentStatus,
      trip: {
        slug: b.trip!.slug,
        title: b.trip!.title,
        origin: b.trip!.origin,
        destination: b.trip!.destination,
        startDate: b.trip!.startDate.toISOString(),
        endDate: b.trip!.endDate.toISOString(),
      },
    }))
    .sort((a, b) => a.trip.startDate.localeCompare(b.trip.startDate));
}

// ---------------------------------------------------------------------------
// Profiles & trust
// ---------------------------------------------------------------------------

export async function trustScoresFor(userIds: string[]): Promise<Map<string, TrustScore>> {
  await connectDB();
  const ids = [...new Set(userIds)].map((id) => new Types.ObjectId(id));

  const [users, bookings, reports] = await Promise.all([
    User.find({ _id: { $in: ids } }).lean<LeanUser[]>(),
    Booking.find({ user: { $in: ids } })
      .select("user status trip")
      .populate<{ trip: LeanTrip | null }>("trip", "endDate")
      .lean(),
    Report.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { reported: { $in: ids }, status: "reviewed" } },
      { $group: { _id: "$reported", count: { $sum: 1 } } },
    ]),
  ]);

  const now = new Date();
  const scores = new Map<string, TrustScore>();
  for (const user of users) {
    const id = String(user._id);
    const mine = bookings.filter((b) => String(b.user) === id);
    scores.set(
      id,
      computeTrust({
        verification: {
          email: !!user.verification?.email,
          phone: !!user.verification?.phone,
          identity: !!user.verification?.identity,
        },
        hasBio: !!user.bio,
        hasCity: !!user.city,
        hasAge: !!user.birthYear,
        personalityCount: user.personality?.length ?? 0,
        hasEmergencyContact: !!(user.emergencyContact?.name && user.emergencyContact?.phone),
        tripsCompleted: mine.filter((b) => b.status === "confirmed" && b.trip && b.trip.endDate < now)
          .length,
        cancellations: mine.filter((b) => b.status === "cancelled").length,
        upheldReports: reports.find((r) => String(r._id) === id)?.count ?? 0,
      }),
    );
  }
  return scores;
}

export type Profile = {
  name: string;
  email: string;
  phone: string;
  city: string;
  birthYear: number | null;
  gender: string;
  bio: string;
  personality: string[];
  emergencyContact: { name: string; phone: string };
  verification: { email: boolean; phone: boolean; identity: boolean };
  trust: TrustScore;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  await connectDB();
  const user = await User.findById(userId).lean<LeanUser>();
  if (!user) return null;
  const trust = (await trustScoresFor([userId])).get(userId)!;

  return {
    name: user.name,
    email: user.email ?? "",
    phone: user.phone ?? "",
    city: user.city ?? "",
    birthYear: user.birthYear ?? null,
    gender: user.gender ?? "unspecified",
    bio: user.bio ?? "",
    personality: user.personality ?? [],
    emergencyContact: {
      name: user.emergencyContact?.name ?? "",
      phone: user.emergencyContact?.phone ?? "",
    },
    verification: {
      email: !!user.verification?.email,
      phone: !!user.verification?.phone,
      identity: !!user.verification?.identity,
    },
    trust,
  };
}

// ---------------------------------------------------------------------------
// Travel buddies
// ---------------------------------------------------------------------------

export async function listPlans(
  filters: { q?: string; month?: string },
  viewer: CurrentUser | null,
): Promise<TravelPlanSummary[]> {
  await connectDB();

  const query: Record<string, unknown> = { status: "active", endDate: { $gte: startOfToday() } };
  if (filters.q) query.destination = new RegExp(escapeRegex(filters.q), "i");
  const month = monthRange(filters.month);
  if (month) query.startDate = { $lt: month.end };
  if (month) query.endDate = { $gte: month.start > startOfToday() ? month.start : startOfToday() };

  const plans = await TravelPlan.find(query)
    .sort({ startDate: 1 })
    .limit(60)
    .populate<{ user: LeanUser | null }>("user", "name birthYear city personality")
    .lean();

  const withOwner = plans.filter((p) => p.user);
  const [trust, myRequests] = await Promise.all([
    trustScoresFor(withOwner.map((p) => String(p.user!._id))),
    viewer
      ? BuddyRequest.find({ from: viewer.id, plan: { $in: withOwner.map((p) => p._id) } })
          .select("plan status")
          .lean()
      : Promise.resolve([]),
  ]);

  const summaries: TravelPlanSummary[] = withOwner.map((p) => {
    const owner = p.user!;
    const ownerId = String(owner._id);
    const ownerTags = [...new Set([...(owner.personality ?? []), ...(p.lookingFor ?? [])])];
    return {
      id: String(p._id),
      origin: p.origin,
      destination: p.destination,
      startDate: p.startDate.toISOString(),
      endDate: p.endDate.toISOString(),
      budget: p.budget,
      lookingFor: p.lookingFor ?? [],
      note: p.note ?? undefined,
      owner: {
        id: ownerId,
        firstName: firstName(owner.name),
        age: ageFromBirthYear(owner.birthYear),
        city: owner.city ?? undefined,
        personality: owner.personality ?? [],
        trustScore: trust.get(ownerId)?.score ?? 0,
      },
      compatibility:
        viewer && viewer.id !== ownerId ? compatibility(viewer.personality, ownerTags) : null,
      myRequest:
        (myRequests.find((r) => String(r.plan) === String(p._id))
          ?.status as TravelPlanSummary["myRequest"]) ?? null,
      isMine: viewer?.id === ownerId,
    };
  });

  if (viewer?.personality.length) {
    summaries.sort((a, b) => (b.compatibility ?? -1) - (a.compatibility ?? -1));
  }
  return summaries;
}

type MyPlan = {
  id: string;
  destination: string;
  origin: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: string;
  requests: BuddyRequestView[];
};

export async function getMyPlans(userId: string): Promise<MyPlan[]> {
  await connectDB();
  const plans = await TravelPlan.find({ user: userId }).sort({ startDate: 1 }).lean();
  const requests = await BuddyRequest.find({ plan: { $in: plans.map((p) => p._id) } })
    .sort({ createdAt: -1 })
    .populate<{ from: LeanUser | null }>("from", "name email phone city personality")
    .lean();
  const trust = await trustScoresFor(requests.filter((r) => r.from).map((r) => String(r.from!._id)));

  return plans.map((p) => ({
    id: String(p._id),
    destination: p.destination,
    origin: p.origin,
    startDate: p.startDate.toISOString(),
    endDate: p.endDate.toISOString(),
    budget: p.budget,
    status: p.status,
    requests: requests
      .filter((r) => r.from && String(r.plan) === String(p._id))
      .map((r) => toRequestView(r, r.from!, p, trust)),
  }));
}

export async function getSentRequests(userId: string): Promise<BuddyRequestView[]> {
  await connectDB();
  const requests = await BuddyRequest.find({ from: userId })
    .sort({ createdAt: -1 })
    .populate<{ to: LeanUser | null }>("to", "name email phone city personality")
    .populate<{ plan: WithId<{ destination: string; startDate: Date; endDate: Date }> | null }>(
      "plan",
      "destination startDate endDate",
    )
    .lean();
  const valid = requests.filter((r) => r.to && r.plan);
  const trust = await trustScoresFor(valid.map((r) => String(r.to!._id)));
  return valid.map((r) => toRequestView(r, r.to!, r.plan!, trust));
}

function toRequestView(
  request: { _id: Types.ObjectId; status: string; message?: string | null },
  person: LeanUser,
  plan: { _id: Types.ObjectId; destination: string; startDate: Date; endDate: Date },
  trust: Map<string, TrustScore>,
): BuddyRequestView {
  const status = request.status as BuddyRequestView["status"];
  return {
    id: String(request._id),
    status,
    message: request.message ?? undefined,
    plan: {
      id: String(plan._id),
      destination: plan.destination,
      startDate: plan.startDate.toISOString(),
      endDate: plan.endDate.toISOString(),
    },
    person: {
      firstName: firstName(person.name),
      city: person.city ?? undefined,
      personality: person.personality ?? [],
      trustScore: trust.get(String(person._id))?.score ?? 0,
    },
    contact:
      status === "accepted"
        ? { name: person.name, email: person.email ?? "", phone: person.phone ?? undefined }
        : undefined,
  };
}
