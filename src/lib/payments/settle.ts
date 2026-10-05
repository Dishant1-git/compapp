import "server-only";
import type { HydratedDocument, Types } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { Agency } from "@/lib/db/models/agency";
import { AgencyPlan } from "@/lib/db/models/agency-plan";
import { Booking } from "@/lib/db/models/booking";
import { Payment, type PaymentDoc } from "@/lib/db/models/payment";
import { Trip } from "@/lib/db/models/trip";
import { User } from "@/lib/db/models/user";
import { notify } from "@/lib/notifications";
import { postSystemMessage } from "@/lib/trips/chat";
import { firstName, formatPrice } from "@/lib/trips/format";
import { seatsTaken } from "@/lib/trips/seats";
import { agencyPlan } from "./pricing";
import { refundPayment } from "./razorpay";

type PaymentRecord = HydratedDocument<PaymentDoc>;

const DAY_MS = 24 * 60 * 60 * 1000;

export type Settled = { ok: true; href: string } | { ok: false; error: string };

/**
 * Turn a confirmed gateway payment into what was bought. Safe to call more than
 * once for the same order (the browser callback and the webhook both do): only
 * the first call does the work.
 */
export async function settlePayment(orderId: string, paymentId: string): Promise<Settled> {
  await connectDB();
  const payment = await Payment.findOneAndUpdate(
    { orderId, status: "created" },
    { status: "paid", paymentId, paidAt: new Date() },
    { returnDocument: "after" },
  );
  if (!payment) {
    const existing = await Payment.findOne({ orderId }).select("status returnTo problem").lean();
    if (!existing) return { ok: false, error: "Payment not found." };
    return existing.problem
      ? { ok: false, error: existing.problem }
      : { ok: true, href: existing.returnTo };
  }

  try {
    const problem = payment.purpose === "agency_plan" ? await grantPlan(payment) : await bookSeats(payment);
    if (!problem) return { ok: true, href: payment.returnTo };

    // Paid, but there was nothing left to sell: give the money straight back.
    await refund(payment, payment.amount, problem);
    const message = `${problem} Your payment of ${formatPrice(payment.amount)} is being refunded.`;
    await Payment.updateOne({ _id: payment._id }, { problem: message });
    await notify(payment.user, { title: "Payment refunded", body: message });
    return { ok: false, error: message };
  } catch (error) {
    console.error(`Could not settle payment ${orderId}`, error);
    const message = "We received your payment but couldn't finish the order. Our team will sort it out or refund you.";
    await Payment.updateOne({ _id: payment._id }, { problem: message });
    return { ok: false, error: message };
  }
}

/** Returns a reason if the plan can't be granted. */
async function grantPlan(payment: PaymentRecord) {
  const plan = agencyPlan(payment.plan ?? "");
  const agency = payment.agency && (await Agency.findById(payment.agency).select("owner name").lean());
  if (!plan || !agency) return "This plan is no longer available.";

  await AgencyPlan.create({
    agency: agency._id,
    plan: plan.id,
    tripsTotal: plan.trips,
    expiresAt: new Date(Date.now() + plan.validDays * DAY_MS),
    price: payment.amount,
    payment: payment._id,
  });
  await notify(agency.owner, {
    title: `${plan.name} plan active`,
    body: `You can publish ${plan.trips} trip${plan.trips === 1 ? "" : "s"}.`,
    href: "/agency/billing",
  });
  return null;
}

/** Returns a reason if the seats can't be booked any more. */
async function bookSeats(payment: PaymentRecord) {
  const draft = payment.draft;
  const seats = draft?.seats ?? 0;
  const [trip, user] = await Promise.all([
    Trip.findById(payment.trip),
    User.findById(payment.user).select("name"),
  ]);
  if (!trip || !user || !draft?.travellers?.length || seats < 1) return "This trip is no longer available.";
  const agency = await Agency.findById(trip.agency).select("owner status").lean();
  if (!agency || agency.status !== "approved" || trip.status !== "open" || trip.startDate <= new Date()) {
    return "This trip is no longer taking bookings.";
  }
  if (await Booking.exists({ trip: trip._id, user: user._id, status: "confirmed" })) {
    return "You already have a booking on this trip.";
  }
  if ((await seatsTaken(trip._id)) + seats > trip.maxGroupSize) return "The seats were taken while you were paying.";

  const booking = await Booking.create({
    trip: trip._id,
    user: user._id,
    amount: trip.price * seats,
    seats,
    travellers: draft.travellers,
    consent: { version: draft.consentVersion, acceptedAt: payment.createdAt },
    fee: { amount: payment.amount, payment: payment._id, refunded: 0 },
    ageCheck: { status: "required", proofFor: draft.proofFor },
  });

  // Guard against two people taking the last seats at the same time.
  const taken = await seatsTaken(trip._id);
  if (taken > trip.maxGroupSize) {
    await Booking.deleteOne({ _id: booking._id });
    return "The seats were taken while you were paying.";
  }

  await Payment.updateOne({ _id: payment._id }, { booking: booking._id });
  const who = seats > 1 ? `${firstName(user.name)} and ${seats - 1} more` : firstName(user.name);
  await Promise.all([
    postSystemMessage(trip._id, `${who} joined the group.`),
    notify(agency.owner, {
      title: `New booking: ${trip.title}`,
      body: `${user.name} booked ${seats} seat${seats === 1 ? "" : "s"} (${taken}/${trip.maxGroupSize}).`,
      href: `/agency/trips/${trip._id}`,
    }),
  ]);
  return null;
}

/**
 * Send money back through the gateway and record it. Never throws: a failed
 * refund is recorded as "failed" so an admin can do it by hand. Returns the
 * rupees owed back.
 */
async function refund(payment: PaymentRecord, amount: number, reason: string) {
  const left = payment.amount - (payment.refundedAmount ?? 0);
  const value = Math.min(Math.round(amount), left);
  if (value <= 0) return 0;

  let refundId: string | undefined;
  let status: "processed" | "failed" = "processed";
  if (payment.gateway === "razorpay") {
    try {
      refundId = await refundPayment(payment.paymentId ?? "", value, { reason: reason.slice(0, 200) });
    } catch (error) {
      console.error(`Refund of ${value} for payment ${payment.orderId} failed`, error);
      status = "failed";
    }
  }

  const done = status === "processed" ? value : 0;
  await Payment.updateOne(
    { _id: payment._id },
    {
      $inc: { refundedAmount: done },
      $push: { refunds: { amount: value, reason, refundId, status, at: new Date() } },
      ...(done && done === left ? { $set: { status: "refunded" } } : {}),
    },
  );
  // The amount owed either way: a failed one is refunded by hand from the admin Payments page.
  return value;
}

/**
 * Refund part of a booking's seat fee (`percent` of what was paid). Returns the
 * rupees going back to the traveller, which is 0 for bookings that never paid a fee.
 */
export async function refundSeatFee(bookingId: string | Types.ObjectId, percent: number, reason: string) {
  const booking = await Booking.findById(bookingId).select("fee");
  if (!booking?.fee?.payment || !booking.fee.amount) return 0;
  const payment = await Payment.findById(booking.fee.payment);
  if (!payment || payment.status === "created") return 0;

  const refunded = await refund(payment, (booking.fee.amount * percent) / 100, reason);
  if (refunded) await Booking.updateOne({ _id: booking._id }, { $inc: { "fee.refunded": refunded } });
  return refunded;
}
