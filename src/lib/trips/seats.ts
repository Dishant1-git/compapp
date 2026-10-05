import "server-only";
import { Types } from "mongoose";
import { Booking } from "@/lib/db/models/booking";

/** Seats held on a trip. A group booking holds several, so bookings can't just be counted. */
export async function seatsTaken(tripId: string | Types.ObjectId) {
  const [row] = await Booking.aggregate<{ seats: number }>([
    { $match: { trip: new Types.ObjectId(String(tripId)), status: "confirmed" } },
    { $group: { _id: null, seats: { $sum: { $ifNull: ["$seats", 1] } } } },
  ]);
  return row?.seats ?? 0;
}
