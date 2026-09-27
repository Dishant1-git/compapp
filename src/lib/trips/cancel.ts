import "server-only";
import { Booking } from "@/lib/db/models/booking";
import { Trip } from "@/lib/db/models/trip";
import { notify } from "@/lib/notifications";
import { postSystemMessage } from "./chat";

/** Cancel a trip and every confirmed seat on it, then tell the travellers. */
export async function cancelTripAndBookings(
  tripId: unknown,
  reason: string,
  by: "agency" | "admin",
) {
  const trip = await Trip.findByIdAndUpdate(tripId, { status: "cancelled", cancelReason: reason });
  if (!trip) return;
  const bookings = await Booking.find({ trip: trip._id, status: "confirmed" }).select("user").lean();
  await Booking.updateMany(
    { trip: trip._id, status: "confirmed" },
    { status: "cancelled", cancelledAt: new Date(), cancelledBy: by },
  );
  await Promise.all([
    postSystemMessage(trip._id, `This trip was cancelled: ${reason}`),
    notify(
      bookings.map((b) => b.user),
      {
        title: `Trip cancelled: ${trip.title}`,
        body: `${reason} Any payment you made will be refunded by the agency.`,
        href: `/trips/${trip.slug}`,
      },
    ),
  ]);
  return trip;
}
