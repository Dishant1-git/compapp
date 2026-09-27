import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const bookingSchema = new Schema(
  {
    trip: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" },
    amount: { type: Number, required: true },
    // Stays "unpaid" until a payment gateway (e.g. Razorpay) is integrated.
    paymentStatus: { type: String, enum: ["unpaid", "paid", "refunded"], default: "unpaid" },
    paidAt: { type: Date },
    cancelledAt: { type: Date },
    cancelledBy: { type: String, enum: ["traveller", "agency", "admin"] },
  },
  { timestamps: true },
);

// A user can hold at most one active seat per trip.
bookingSchema.index(
  { trip: 1, user: 1 },
  { unique: true, partialFilterExpression: { status: "confirmed" } },
);

export type BookingDoc = InferSchemaType<typeof bookingSchema>;

export const Booking: Model<BookingDoc> = models.Booking || model("Booking", bookingSchema);
