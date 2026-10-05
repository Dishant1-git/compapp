"use server";

import { randomBytes } from "node:crypto";
import type { Types } from "mongoose";
import { revalidatePath } from "@/lib/revalidate";
import { getCurrentUser, getMyAgency, isVerified } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/mongoose";
import { Agency } from "@/lib/db/models/agency";
import { Booking } from "@/lib/db/models/booking";
import { Payment, type PaymentDoc } from "@/lib/db/models/payment";
import { Trip } from "@/lib/db/models/trip";
import { User } from "@/lib/db/models/user";
import { ID_RE, dateInput } from "@/lib/form-utils";
import { seatsTaken } from "@/lib/trips/seats";
import {
  ADULT_AGE,
  CONSENT_VERSION,
  GROUP_MAX_SIZE,
  GROUP_MIN_ADULTS,
  GROUP_MIN_SIZE,
  ageOn,
  agencyPlan,
  seatFee,
} from "./pricing";
import { createOrder, gatewayMode, publicKeyId, validCheckoutSignature } from "./razorpay";
import { settlePayment, type Settled } from "./settle";
import { isFrontend, remoteAction } from "@/lib/remote";

/** What the browser needs to collect a payment. Amount is in rupees. */
export type Checkout =
  | {
      ok: true;
      mode: "razorpay";
      keyId: string;
      orderId: string;
      amount: number;
      description: string;
      prefill: { name: string; email: string; contact: string };
    }
  | { ok: true; mode: "dev"; orderId: string; amount: number; description: string }
  | { ok: false; error: string; profile?: boolean };

const fail = (error: string) => ({ ok: false as const, error });
const SIGNED_OUT = "Your session ended. Refresh the page and log in again.";
const UNAVAILABLE = "Online payments aren't set up yet. Please try again later.";

type NewPayment = Pick<PaymentDoc, "purpose" | "amount" | "returnTo"> & {
  agency?: string;
  plan?: string;
  trip?: Types.ObjectId;
  draft?: { seats: number; travellers: { name: string; birthDate: Date }[]; proofFor: number[]; consentVersion: string };
};

/** Create the gateway order and remember what it's for. */
async function openCheckout(
  payer: { id: string; name: string; email: string; phone?: string },
  payment: NewPayment,
  description: string,
): Promise<Checkout> {
  const mode = gatewayMode();
  if (mode === "off") return fail(UNAVAILABLE);

  let orderId: string;
  if (mode === "dev") {
    orderId = `dev_${randomBytes(9).toString("hex")}`;
  } else {
    try {
      orderId = await createOrder({
        amount: payment.amount,
        receipt: `${payment.purpose}_${randomBytes(8).toString("hex")}`,
        notes: { purpose: payment.purpose, user: payer.id },
      });
    } catch (error) {
      console.error("Could not create Razorpay order", error);
      return fail("We couldn't start the payment. Please try again in a minute.");
    }
  }
  await Payment.create({ ...payment, user: payer.id, gateway: mode, orderId });

  return mode === "dev"
    ? { ok: true, mode, orderId, amount: payment.amount, description }
    : {
        ok: true,
        mode,
        keyId: publicKeyId(),
        orderId,
        amount: payment.amount,
        description,
        prefill: { name: payer.name, email: payer.email, contact: payer.phone ?? "" },
      };
}

// ─── Agencies: buy a plan ────────────────────────────────────────────────────

export async function startPlanPurchase(planId: string): Promise<Checkout> {
  if (isFrontend()) return remoteAction("payments/actions.startPlanPurchase", [planId]);
  const viewer = await getCurrentUser();
  if (!viewer) return fail(SIGNED_OUT);
  const agency = viewer.role === "agency" ? await getMyAgency(viewer.id) : null;
  if (!agency) return fail("Only agency accounts can buy a plan.");
  if (agency.status !== "approved") return fail("Your agency must be approved before you can buy a plan.");
  const plan = agencyPlan(String(planId));
  if (!plan) return fail("Choose a plan.");

  await connectDB();
  const owner = await User.findById(viewer.id).select("phone").lean();
  return openCheckout(
    { ...viewer, phone: owner?.phone ?? undefined },
    { purpose: "agency_plan", amount: plan.price, returnTo: "/agency/billing?paid=1", agency: agency.id, plan: plan.id },
    `${plan.name} plan for ${agency.name}`,
  );
}

// ─── Travellers: pay the seat fee ────────────────────────────────────────────

export type SeatBookingInput = {
  /** 1, or a group of GROUP_MIN_SIZE or more. */
  seats: number;
  /** One per seat, the account holder first. Dates are yyyy-mm-dd. */
  travellers: { name: string; birthDate: string }[];
  /** For groups: which other traveller's ID proves the second adult. */
  secondAdult?: number;
  consent: boolean;
};

export async function startSeatBooking(tripId: string, input: SeatBookingInput): Promise<Checkout> {
  if (isFrontend()) return remoteAction("payments/actions.startSeatBooking", [tripId, input]);
  const viewer = await getCurrentUser();
  if (!viewer) return fail(SIGNED_OUT);
  if (viewer.role !== "user") return fail("Agency and admin accounts can't book trips.");
  if (!(await isVerified(viewer.id))) return fail("Verify your email before booking. Refresh this page to start.");
  if (!ID_RE.test(String(tripId))) return fail("Trip not found.");
  if (input?.consent !== true) return fail("Read and accept the trip rules to continue.");

  const seats = Number(input.seats);
  const group = seats > 1;
  if (!Number.isInteger(seats) || seats < 1 || (group && seats < GROUP_MIN_SIZE)) {
    return fail(`Book for yourself, or for a group of ${GROUP_MIN_SIZE} or more.`);
  }
  if (seats > GROUP_MAX_SIZE) return fail(`You can book up to ${GROUP_MAX_SIZE} seats at once.`);

  await connectDB();
  const [trip, user] = await Promise.all([
    Trip.findById(tripId),
    User.findById(viewer.id).select("name phone emergencyContact"),
  ]);
  if (!trip || !user) return fail("Trip not found.");
  const agency = await Agency.findById(trip.agency).select("status").lean();
  if (!agency || agency.status !== "approved") return fail("This trip is not available.");
  if (trip.status !== "open") return fail("This trip is no longer taking bookings.");
  if (trip.startDate <= new Date()) return fail("This trip has already started.");

  // Safety first: everyone on a trip must be reachable and have an emergency contact.
  if (!user.phone || !user.emergencyContact?.name || !user.emergencyContact?.phone) {
    return { ...fail("Add your phone number and an emergency contact before booking."), profile: true };
  }

  // Who is travelling. The account holder is always first, under their own name.
  const rows = Array.isArray(input.travellers) ? input.travellers : [];
  if (rows.length !== seats) return fail("Add the details of every traveller.");
  const travellers: { name: string; birthDate: Date }[] = [];
  for (const [i, row] of rows.entries()) {
    const name = i === 0 ? user.name : String(row?.name ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    const birthDate = dateInput(String(row?.birthDate ?? ""));
    const label = i === 0 ? "your" : `traveller ${i + 1}'s`;
    if (name.length < 2) return fail(`Enter traveller ${i + 1}'s full name.`);
    if (!birthDate || birthDate > new Date() || ageOn(birthDate) > 100) return fail(`Enter ${label} date of birth.`);
    travellers.push({ name, birthDate });
  }

  const minAge = Math.max(ADULT_AGE, trip.minAge ?? ADULT_AGE);
  const adult = (t: { birthDate: Date }) => ageOn(t.birthDate) >= ADULT_AGE;
  if (ageOn(travellers[0].birthDate) < (group ? ADULT_AGE : minAge)) {
    return fail(`You must be at least ${group ? ADULT_AGE : minAge} to book this trip.`);
  }
  let proofFor = [0];
  if (group) {
    if (travellers.filter(adult).length < GROUP_MIN_ADULTS) {
      return fail(`At least ${GROUP_MIN_ADULTS} people in a group must be ${ADULT_AGE} or older.`);
    }
    const second = Number(input.secondAdult);
    if (!Number.isInteger(second) || second < 1 || second >= seats || !adult(travellers[second])) {
      return fail("Choose a second adult whose ID you'll upload.");
    }
    proofFor = [0, second];
  }

  if (await Booking.exists({ trip: trip._id, user: viewer.id, status: "confirmed" })) {
    return fail("You already have a booking on this trip.");
  }
  const left = trip.maxGroupSize - (await seatsTaken(trip._id));
  if (left < seats) return fail(left > 0 ? `Only ${left} seat${left === 1 ? " is" : "s are"} left.` : "Sorry, this trip is full.");

  // Keep the profile's birth year in step with what they just declared.
  await User.updateOne({ _id: viewer.id }, { birthYear: travellers[0].birthDate.getUTCFullYear() });

  return openCheckout(
    { ...viewer, phone: user.phone },
    {
      purpose: "seat_fee",
      amount: seatFee(seats) * seats,
      returnTo: `/trips/${trip.slug}/verify-age`,
      trip: trip._id,
      draft: { seats, travellers, proofFor, consentVersion: CONSENT_VERSION },
    },
    `Seat fee: ${trip.title}`,
  );
}

// ─── Confirming a payment ────────────────────────────────────────────────────

async function finish(result: Settled) {
  revalidatePath("/", "layout");
  return result;
}

/** Called by the browser with what Razorpay Checkout returned. */
export async function confirmPayment(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<Settled> {
  if (isFrontend()) return remoteAction("payments/actions.confirmPayment", [input]);
  if (!(await getCurrentUser())) return fail(SIGNED_OUT);
  const orderId = String(input?.orderId ?? "");
  const paymentId = String(input?.paymentId ?? "");
  if (!validCheckoutSignature(orderId, paymentId, String(input?.signature ?? ""))) {
    return fail("We couldn't verify this payment. If money was taken, it will be confirmed or refunded shortly.");
  }
  return finish(await settlePayment(orderId, paymentId));
}

/** Development only, when no Razorpay keys are set: mark a simulated order as paid. */
export async function confirmDevPayment(orderId: string): Promise<Settled> {
  if (isFrontend()) return remoteAction("payments/actions.confirmDevPayment", [orderId]);
  const viewer = await getCurrentUser();
  if (!viewer) return fail(SIGNED_OUT);
  if (gatewayMode() !== "dev") return fail(UNAVAILABLE);

  await connectDB();
  const id = String(orderId);
  if (!(await Payment.exists({ orderId: id, user: viewer.id, gateway: "dev" }))) return fail("Payment not found.");
  return finish(await settlePayment(id, `devpay_${randomBytes(6).toString("hex")}`));
}
