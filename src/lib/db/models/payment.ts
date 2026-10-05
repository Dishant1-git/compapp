import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * One attempt to pay through the gateway: an agency buying a plan, or a
 * traveller paying the seat fee. Created with the gateway order, then settled
 * exactly once when the payment is confirmed (see src/lib/payments/settle.ts).
 * Amounts are in whole rupees.
 */
const paymentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    purpose: { type: String, enum: ["agency_plan", "seat_fee"], required: true },
    amount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["created", "paid", "refunded"], default: "created" },
    // "dev" payments are simulated: no Razorpay keys were set (development only).
    gateway: { type: String, enum: ["razorpay", "dev"], required: true },
    orderId: { type: String, required: true, unique: true },
    paymentId: { type: String },
    paidAt: { type: Date },
    /** Where to send the payer once it's settled. */
    returnTo: { type: String, required: true },

    // agency_plan
    agency: { type: Schema.Types.ObjectId, ref: "Agency" },
    plan: { type: String },

    // seat_fee: what to book once paid.
    trip: { type: Schema.Types.ObjectId, ref: "Trip" },
    draft: {
      seats: { type: Number },
      travellers: { type: [{ _id: false, name: String, birthDate: Date }], default: undefined },
      proofFor: { type: [Number], default: undefined },
      consentVersion: { type: String },
    },
    booking: { type: Schema.Types.ObjectId, ref: "Booking" },

    refundedAmount: { type: Number, default: 0 },
    refunds: {
      type: [
        {
          _id: false,
          amount: Number,
          reason: String,
          refundId: String,
          // "failed" means the gateway call errored and an admin must refund by hand.
          status: { type: String, enum: ["processed", "failed"] },
          at: Date,
        },
      ],
      default: [],
    },
    /** Set when a paid payment could not be turned into a plan or booking. */
    problem: { type: String },
  },
  { timestamps: true },
);

paymentSchema.index({ createdAt: -1 });

export type PaymentDoc = InferSchemaType<typeof paymentSchema>;

export const Payment: Model<PaymentDoc> = models.Payment || model("Payment", paymentSchema);
