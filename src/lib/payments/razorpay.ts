import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Razorpay over its REST API (no SDK needed). Amounts here are in rupees; the
// API wants paise, converted at the edge.

const API = "https://api.razorpay.com/v1";

// RAZOR_PAY_API_KEY / RAZOR_PAY_API_SECRET are also accepted, including the
// "APi" spelling: variable names are case-sensitive everywhere but Windows.
function keys() {
  const env = process.env;
  const id = env.RAZORPAY_KEY_ID || env.RAZOR_PAY_API_KEY || env.RAZOR_PAY_APi_KEY;
  const secret = env.RAZORPAY_KEY_SECRET || env.RAZOR_PAY_API_SECRET;
  return id && secret ? { id, secret } : null;
}

/**
 * "razorpay" once keys are set. Without keys, development simulates payments so
 * the flows can be tried end to end; production refuses to take payments.
 */
export function gatewayMode(): "razorpay" | "dev" | "off" {
  if (keys()) return "razorpay";
  return process.env.NODE_ENV === "production" ? "off" : "dev";
}

export function publicKeyId() {
  return keys()?.id ?? "";
}

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const k = keys();
  if (!k) throw new Error("Razorpay keys are not set.");
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${k.id}:${k.secret}`).toString("base64")}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Razorpay ${path} failed (${response.status}): ${data?.error?.description ?? "unknown error"}`);
  }
  return data as T;
}

export async function createOrder(input: { amount: number; receipt: string; notes?: Record<string, string> }) {
  const order = await call<{ id: string }>("/orders", {
    amount: input.amount * 100,
    currency: "INR",
    receipt: input.receipt,
    notes: input.notes,
  });
  return order.id;
}

export async function refundPayment(paymentId: string, amount: number, notes?: Record<string, string>) {
  const refund = await call<{ id: string }>(`/payments/${paymentId}/refund`, { amount: amount * 100, notes });
  return refund.id;
}

function matches(expected: string, given: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The signature Checkout hands the browser after a successful payment. */
export function validCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const k = keys();
  if (!k) return false;
  return matches(createHmac("sha256", k.secret).update(`${orderId}|${paymentId}`).digest("hex"), signature);
}

/** The X-Razorpay-Signature header on a webhook, over the raw request body. */
export function validWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return matches(createHmac("sha256", secret).update(rawBody).digest("hex"), signature);
}
