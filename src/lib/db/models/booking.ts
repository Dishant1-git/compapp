import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const bookingSchema = new Schema(
  {
    trip: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" },
    // Trip price for every seat, paid to the agency directly; the agency marks it paid.
    amount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ["unpaid", "paid", "refunded"], default: "unpaid" },
    paidAt: { type: Date },
    cancelledAt: { type: Date },
    cancelledBy: { type: String, enum: ["traveller", "agency", "admin"] },

    // More than one seat when the account holder books for a group.
    seats: { type: Number, default: 1, min: 1 },
    // Everyone travelling on this booking; the account holder is first.
    travellers: { type: [{ _id: false, name: String, birthDate: Date }], default: [] },
    consent: { version: { type: String }, acceptedAt: { type: Date } },
    // Platform seat fee, paid online before the seat is confirmed.
    fee: {
      amount: { type: Number },
      payment: { type: Schema.Types.ObjectId, ref: "Payment" },
      refunded: { type: Number },
    },
    // Age proof, checked by an admin after payment. Missing on bookings made before fees existed.
    ageCheck: {
      status: { type: String, enum: ["required", "pending", "verified", "rejected"] },
      // Indexes into `travellers` whose ID must be uploaded.
      proofFor: { type: [Number], default: undefined },
      documents: {
        type: [
          {
            _id: false,
            traveller: Number,
            docType: String,
            image: { type: Schema.Types.ObjectId, ref: "IdDocument" },
          },
        ],
        default: undefined,
      },
      note: { type: String },
      submittedAt: { type: Date },
      reviewedAt: { type: Date },
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
  },
  { timestamps: true },
);

// A user can hold at most one active booking per trip.
bookingSchema.index(
  { trip: 1, user: 1 },
  { unique: true, partialFilterExpression: { status: "confirmed" } },
);
bookingSchema.index({ "ageCheck.status": 1 });

export type BookingDoc = InferSchemaType<typeof bookingSchema>;

export const Booking: Model<BookingDoc> = models.Booking || model("Booking", bookingSchema);
