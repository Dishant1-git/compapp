import { NextResponse, type NextRequest } from "next/server";
import { validWebhookSignature } from "@/lib/payments/razorpay";
import { settlePayment } from "@/lib/payments/settle";

type PaymentEvent = {
  event?: string;
  payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
};

/**
 * Razorpay calls this when a payment is captured. It covers people who paid but
 * closed the tab before the browser could confirm; settling twice is harmless.
 * Set the URL and RAZORPAY_WEBHOOK_SECRET in the Razorpay dashboard (event: payment.captured).
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  if (!validWebhookSignature(body, request.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: PaymentEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  if (event.event === "payment.captured" && payment?.id && payment.order_id) {
    await settlePayment(payment.order_id, payment.id);
  }
  return NextResponse.json({ ok: true });
}
