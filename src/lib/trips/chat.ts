import "server-only";
import { Types } from "mongoose";
import type { CurrentUser } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/mongoose";
import { Agency } from "@/lib/db/models/agency";
import { Booking } from "@/lib/db/models/booking";
import { Message } from "@/lib/db/models/message";
import { Trip } from "@/lib/db/models/trip";
import { firstName } from "./format";

export type ChatMessage = {
  id: string;
  kind: "text" | "system";
  body: string;
  createdAt: string;
  author: { id: string; name: string; isAgency: boolean } | null;
  mine: boolean;
};

export type GroupAccess = {
  tripId: Types.ObjectId;
  agencyOwnerId: string;
  /** Can post: booked travellers and the agency. Admins can read only. */
  canPost: boolean;
};

/**
 * Who can see a trip's group: travellers with a confirmed seat, the agency
 * running it, and admins (read-only, for moderation).
 */
export async function groupAccess(tripId: string, viewer: CurrentUser): Promise<GroupAccess | null> {
  if (!Types.ObjectId.isValid(tripId)) return null;
  await connectDB();
  const trip = await Trip.findById(tripId).select("agency").lean();
  if (!trip) return null;
  const agency = await Agency.findById(trip.agency).select("owner").lean();
  const agencyOwnerId = agency ? String(agency.owner) : "";

  const isAgency = agencyOwnerId === viewer.id;
  const isMember =
    isAgency || !!(await Booking.exists({ trip: trip._id, user: viewer.id, status: "confirmed" }));
  if (!isMember && viewer.role !== "admin") return null;

  return { tripId: trip._id, agencyOwnerId, canPost: isMember };
}

export async function listMessages(
  access: GroupAccess,
  viewer: CurrentUser,
  after?: Date,
): Promise<ChatMessage[]> {
  const query: Record<string, unknown> = { trip: access.tripId };
  if (after) query.createdAt = { $gt: after };

  const messages = await Message.find(query)
    .sort({ createdAt: after ? 1 : -1 })
    .limit(200)
    .populate<{ user: { _id: Types.ObjectId; name: string } | null }>("user", "name")
    .lean();
  if (!after) messages.reverse();

  return messages.map((m) => {
    const authorId = m.user ? String(m.user._id) : null;
    return {
      id: String(m._id),
      kind: m.kind as ChatMessage["kind"],
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      author: m.user
        ? {
            id: authorId!,
            name: authorId === access.agencyOwnerId ? m.user.name : firstName(m.user.name),
            isAgency: authorId === access.agencyOwnerId,
          }
        : null,
      mine: authorId === viewer.id,
    };
  });
}

/** Record a join/leave/cancellation in the group. Best-effort. */
export async function postSystemMessage(tripId: string | Types.ObjectId, body: string) {
  try {
    await Message.create({ trip: tripId, kind: "system", body });
  } catch (error) {
    console.error("Failed to post system message", error);
  }
}
