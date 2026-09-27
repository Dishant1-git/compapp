import "server-only";
import { Types } from "mongoose";
import { getAgencyDashboard, getAgencyProfile } from "@/lib/agency/queries";
import { connectDB } from "@/lib/db/mongoose";
import { Agency, type AgencyStatus } from "@/lib/db/models/agency";
import { Booking } from "@/lib/db/models/booking";
import { Report } from "@/lib/db/models/report";
import { TravelPlan } from "@/lib/db/models/travel-plan";
import { Trip } from "@/lib/db/models/trip";
import { User } from "@/lib/db/models/user";
import { getProfile, type LeanTrip, type LeanUser } from "@/lib/trips/queries";

const PAGE = 100;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function iso(date?: Date | null) {
  return date ? date.toISOString() : undefined;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getAdminStats() {
  await connectDB();
  const now = new Date();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    usersByRole,
    newUsers,
    suspendedUsers,
    agenciesByStatus,
    upcomingTrips,
    cancelledTrips,
    bookingsAgg,
    cancelledBookings,
    openReports,
    activePlans,
    recentBookings,
    pendingAgencies,
  ] = await Promise.all([
    User.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    User.countDocuments({ createdAt: { $gte: weekAgo } }),
    User.countDocuments({ status: "suspended" }),
    Agency.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Trip.countDocuments({ status: "open", startDate: { $gte: now } }),
    Trip.countDocuments({ status: "cancelled" }),
    Booking.aggregate<{ _id: string; count: number; value: number }>([
      { $match: { status: "confirmed" } },
      { $group: { _id: "$paymentStatus", count: { $sum: 1 }, value: { $sum: "$amount" } } },
    ]),
    Booking.countDocuments({ status: "cancelled" }),
    Report.countDocuments({ status: "open" }),
    TravelPlan.countDocuments({ status: "active", endDate: { $gte: now } }),
    listBookings({ limit: 8 }),
    Agency.find({ status: "pending" }).sort({ createdAt: 1 }).limit(5).select("name city createdAt").lean(),
  ]);

  const byRole = (role: string) => usersByRole.find((r) => r._id === role)?.count ?? 0;
  const byAgency = (status: string) => agenciesByStatus.find((a) => a._id === status)?.count ?? 0;
  const confirmed = bookingsAgg.reduce((sum, b) => sum + b.count, 0);

  return {
    users: {
      total: usersByRole.reduce((sum, r) => sum + r.count, 0),
      travellers: byRole("user"),
      agencies: byRole("agency"),
      admins: byRole("admin"),
      newThisWeek: newUsers,
      suspended: suspendedUsers,
    },
    agencies: {
      approved: byAgency("approved"),
      pending: byAgency("pending"),
      rejected: byAgency("rejected"),
      suspended: byAgency("suspended"),
    },
    trips: { upcoming: upcomingTrips, cancelled: cancelledTrips },
    bookings: {
      confirmed,
      cancelled: cancelledBookings,
      bookedValue: bookingsAgg.reduce((sum, b) => sum + b.value, 0),
      paidValue: bookingsAgg.find((b) => b._id === "paid")?.value ?? 0,
    },
    openReports,
    activePlans,
    recentBookings,
    pendingAgencies: pendingAgencies.map((a) => ({
      id: String(a._id),
      name: a.name,
      city: a.city,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

// ---------------------------------------------------------------------------
// Agencies
// ---------------------------------------------------------------------------

export type AdminAgencyRow = {
  id: string;
  name: string;
  city: string;
  email: string;
  status: AgencyStatus;
  ownerName: string;
  trips: number;
  travellers: number;
  createdAt: string;
};

export async function listAgencies(filters: { status?: string; q?: string }): Promise<AdminAgencyRow[]> {
  await connectDB();
  const query: Record<string, unknown> = {};
  if (filters.status) query.status = filters.status;
  if (filters.q) {
    const re = new RegExp(escapeRegex(filters.q), "i");
    query.$or = [{ name: re }, { city: re }, { email: re }];
  }

  const agencies = await Agency.find(query)
    .sort({ createdAt: -1 })
    .limit(PAGE)
    .populate<{ owner: LeanUser | null }>("owner", "name")
    .lean();
  const ids = agencies.map((a) => a._id);

  const [tripCounts, travellerCounts] = await Promise.all([
    Trip.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { agency: { $in: ids } } },
      { $group: { _id: "$agency", count: { $sum: 1 } } },
    ]),
    Booking.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { status: "confirmed" } },
      { $lookup: { from: "trips", localField: "trip", foreignField: "_id", as: "t" } },
      { $unwind: "$t" },
      { $match: { "t.agency": { $in: ids } } },
      { $group: { _id: "$t.agency", count: { $sum: 1 } } },
    ]),
  ]);

  return agencies.map((a) => ({
    id: String(a._id),
    name: a.name,
    city: a.city,
    email: a.email,
    status: a.status as AgencyStatus,
    ownerName: a.owner?.name ?? "—",
    trips: tripCounts.find((t) => String(t._id) === String(a._id))?.count ?? 0,
    travellers: travellerCounts.find((t) => String(t._id) === String(a._id))?.count ?? 0,
    createdAt: a.createdAt.toISOString(),
  }));
}

export async function getAdminAgency(agencyId: string) {
  if (!Types.ObjectId.isValid(agencyId)) return null;
  const profile = await getAgencyProfile(agencyId);
  if (!profile) return null;
  const agency = await Agency.findById(agencyId)
    .populate<{ owner: LeanUser | null }>("owner", "name email phone status createdAt")
    .populate<{ reviewedBy: LeanUser | null }>("reviewedBy", "name")
    .lean();
  const dashboard = await getAgencyDashboard(agencyId);
  return {
    profile,
    owner: agency?.owner
      ? {
          id: String(agency.owner._id),
          name: agency.owner.name,
          email: agency.owner.email,
          phone: agency.owner.phone ?? undefined,
          status: agency.owner.status,
        }
      : null,
    reviewedBy: agency?.reviewedBy?.name,
    reviewedAt: iso(agency?.reviewedAt),
    ...dashboard,
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  city?: string;
  bookings: number;
  reportsAgainst: number;
  createdAt: string;
};

export async function listUsers(filters: { q?: string; role?: string; status?: string }): Promise<AdminUserRow[]> {
  await connectDB();
  const query: Record<string, unknown> = {};
  if (filters.role) query.role = filters.role;
  if (filters.status) query.status = filters.status;
  if (filters.q) {
    const re = new RegExp(escapeRegex(filters.q), "i");
    query.$or = [{ name: re }, { email: re }, { city: re }, { phone: re }];
  }

  const users = await User.find(query).sort({ createdAt: -1 }).limit(PAGE).lean<LeanUser[]>();
  const ids = users.map((u) => u._id);
  const [bookings, reports] = await Promise.all([
    Booking.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { user: { $in: ids }, status: "confirmed" } },
      { $group: { _id: "$user", count: { $sum: 1 } } },
    ]),
    Report.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { reported: { $in: ids } } },
      { $group: { _id: "$reported", count: { $sum: 1 } } },
    ]),
  ]);

  return users.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    city: u.city ?? undefined,
    bookings: bookings.find((b) => String(b._id) === String(u._id))?.count ?? 0,
    reportsAgainst: reports.find((r) => String(r._id) === String(u._id))?.count ?? 0,
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function getAdminUser(userId: string) {
  if (!Types.ObjectId.isValid(userId)) return null;
  await connectDB();
  const user = await User.findById(userId).lean<LeanUser>();
  if (!user) return null;

  const [profile, bookings, reportsAgainst, reportsBy, plans, agency] = await Promise.all([
    getProfile(userId),
    listBookings({ userId, limit: 50 }),
    listReports({ reportedId: userId }),
    listReports({ reporterId: userId }),
    TravelPlan.find({ user: userId }).sort({ startDate: -1 }).limit(20).lean(),
    Agency.findOne({ owner: userId }).select("name status").lean(),
  ]);

  return {
    id: String(user._id),
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    platforms: user.platforms ?? [],
    profile: profile!,
    bookings,
    reportsAgainst,
    reportsBy,
    plans: plans.map((p) => ({
      id: String(p._id),
      destination: p.destination,
      origin: p.origin,
      startDate: p.startDate.toISOString(),
      endDate: p.endDate.toISOString(),
      status: p.status,
    })),
    agency: agency ? { id: String(agency._id), name: agency.name, status: agency.status } : null,
  };
}

// ---------------------------------------------------------------------------
// Trips & bookings
// ---------------------------------------------------------------------------

export type AdminTripRow = {
  id: string;
  slug: string;
  title: string;
  route: string;
  startDate: string;
  endDate: string;
  price: number;
  status: string;
  agency: { id: string; name: string; status: string } | null;
  booked: number;
  maxGroupSize: number;
};

export async function listTrips(filters: { q?: string; when?: string }): Promise<AdminTripRow[]> {
  await connectDB();
  const now = new Date();
  const query: Record<string, unknown> = {};
  if (filters.when === "upcoming") Object.assign(query, { status: "open", startDate: { $gte: now } });
  if (filters.when === "past") Object.assign(query, { status: "open", startDate: { $lt: now } });
  if (filters.when === "cancelled") query.status = "cancelled";
  if (filters.q) {
    const re = new RegExp(escapeRegex(filters.q), "i");
    query.$or = [{ title: re }, { destination: re }, { origin: re }];
  }

  const trips = await Trip.find(query)
    .sort({ startDate: filters.when === "past" ? -1 : 1 })
    .limit(PAGE)
    .populate<{ agency: { _id: Types.ObjectId; name: string; status: string } | null }>(
      "agency",
      "name status",
    )
    .lean();
  const counts = await Booking.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { trip: { $in: trips.map((t) => t._id) }, status: "confirmed" } },
    { $group: { _id: "$trip", count: { $sum: 1 } } },
  ]);

  return trips.map((t) => ({
    id: String(t._id),
    slug: t.slug,
    title: t.title,
    route: `${t.origin} → ${t.destination}`,
    startDate: t.startDate.toISOString(),
    endDate: t.endDate.toISOString(),
    price: t.price,
    status: t.status,
    agency: t.agency ? { id: String(t.agency._id), name: t.agency.name, status: t.agency.status } : null,
    booked: counts.find((c) => String(c._id) === String(t._id))?.count ?? 0,
    maxGroupSize: t.maxGroupSize,
  }));
}

export type AdminBookingRow = {
  id: string;
  status: string;
  paymentStatus: string;
  amount: number;
  createdAt: string;
  cancelledBy?: string;
  traveller: { id: string; name: string; email: string } | null;
  trip: { id: string; slug: string; title: string; startDate: string } | null;
};

export async function listBookings(filters: {
  status?: string;
  payment?: string;
  userId?: string;
  limit?: number;
}): Promise<AdminBookingRow[]> {
  await connectDB();
  const query: Record<string, unknown> = {};
  if (filters.status) query.status = filters.status;
  if (filters.payment) query.paymentStatus = filters.payment;
  if (filters.userId) query.user = filters.userId;

  const bookings = await Booking.find(query)
    .sort({ createdAt: -1 })
    .limit(filters.limit ?? PAGE)
    .populate<{ user: LeanUser | null }>("user", "name email")
    .populate<{ trip: LeanTrip | null }>("trip", "slug title startDate")
    .lean();

  return bookings.map((b) => ({
    id: String(b._id),
    status: b.status,
    paymentStatus: b.paymentStatus,
    amount: b.amount,
    createdAt: b.createdAt.toISOString(),
    cancelledBy: b.cancelledBy ?? undefined,
    traveller: b.user ? { id: String(b.user._id), name: b.user.name, email: b.user.email } : null,
    trip: b.trip
      ? {
          id: String(b.trip._id),
          slug: b.trip.slug,
          title: b.trip.title,
          startDate: b.trip.startDate.toISOString(),
        }
      : null,
  }));
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export type AdminReportRow = {
  id: string;
  reason: string;
  details?: string;
  status: string;
  createdAt: string;
  reporter: { id: string; name: string } | null;
  reported: { id: string; name: string; status: string } | null;
  trip: { slug: string; title: string } | null;
};

export async function listReports(filters: {
  status?: string;
  reportedId?: string;
  reporterId?: string;
}): Promise<AdminReportRow[]> {
  await connectDB();
  const query: Record<string, unknown> = {};
  if (filters.status) query.status = filters.status;
  if (filters.reportedId) query.reported = filters.reportedId;
  if (filters.reporterId) query.reporter = filters.reporterId;

  const reports = await Report.find(query)
    .sort({ createdAt: -1 })
    .limit(PAGE)
    .populate<{ reporter: LeanUser | null }>("reporter", "name")
    .populate<{ reported: LeanUser | null }>("reported", "name status")
    .populate<{ trip: LeanTrip | null }>("trip", "slug title")
    .lean();

  return reports.map((r) => ({
    id: String(r._id),
    reason: r.reason,
    details: r.details ?? undefined,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    reporter: r.reporter ? { id: String(r.reporter._id), name: r.reporter.name } : null,
    reported: r.reported
      ? { id: String(r.reported._id), name: r.reported.name, status: r.reported.status }
      : null,
    trip: r.trip ? { slug: r.trip.slug, title: r.trip.title } : null,
  }));
}
