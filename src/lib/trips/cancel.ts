import "server-only";
import { Booking } from "@/lib/db/models/booking";
import { IdDocument } from "@/lib/db/models/id-document";
import { Trip } from "@/lib/db/models/trip";
import { notify } from "@/lib/notifications";
import { refundSeatFee } from "@/lib/payments/settle";
import { postSystemMessage } from "./chat";

/** Cancel a trip and every confirmed seat on it, refund the seat fees in full, then tell the travellers. */
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
  for (const booking of bookings) await refundSeatFee(booking._id, 100, `Trip cancelled by ${by}`);
  await IdDocument.deleteMany({ booking: { $in: bookings.map((b) => b._id) } });
  await Promise.all([
    postSystemMessage(trip._id, `This trip was cancelled: ${reason}`),
    notify(
      bookings.map((b) => b.user),
      {
        title: `Trip cancelled: ${trip.title}`,
        body: `${reason} Any seat fee you paid is being refunded in full. Anything you paid the agency will be refunded by the agency.`,
        href: `/trips/${trip.slug}`,
      },
    ),
  ]);
  return trip;
}
