"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { confirmDevPayment, confirmPayment, type Checkout } from "@/lib/payments/actions";
import { formatPrice } from "@/lib/trips/format";
import { siteConfig } from "@/lib/site-config";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open(): void; on(event: string, handler: () => void): void };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.onload = () => resolve(!!window.Razorpay);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/** Open Razorpay Checkout. Resolves with the payment, or null if they closed it. */
async function collect(order: Extract<Checkout, { mode: "razorpay" }>) {
  if (!(await loadRazorpay())) throw new Error("Could not load Razorpay");
  return new Promise<RazorpayResponse | null>((resolve) => {
    const checkout = new window.Razorpay!({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount * 100,
      currency: "INR",
      name: siteConfig.name,
      description: order.description,
      prefill: order.prefill,
      handler: (response: RazorpayResponse) => resolve(response),
      modal: { ondismiss: () => resolve(null) },
    });
    checkout.open();
  });
}

/**
 * Take a payment: `start` creates the order on the server, then the gateway
 * collects the money and the server confirms it. On success the browser moves
 * to the page the server names.
 */
export function useCheckout() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  /** Set when the server says the profile must be completed first. */
  const [needsProfile, setNeedsProfile] = useState(false);

  async function pay(start: () => Promise<Checkout>) {
    setPending(true);
    setError(undefined);
    setNeedsProfile(false);
    try {
      const order = await start();
      if (!order.ok) {
        setError(order.error);
        setNeedsProfile(!!order.profile);
        return;
      }

      let result;
      if (order.mode === "dev") {
        // No Razorpay keys in development: nothing is charged.
        const go = confirm(
          `Test mode: Razorpay keys aren't set, so no money moves.\n\nSimulate paying ${formatPrice(order.amount)} for "${order.description}"?`,
        );
        if (!go) return;
        result = await confirmDevPayment(order.orderId);
      } else {
        const paid = await collect(order);
        if (!paid) return;
        result = await confirmPayment({
          orderId: paid.razorpay_order_id,
          paymentId: paid.razorpay_payment_id,
          signature: paid.razorpay_signature,
        });
      }

      if (result.ok) router.push(result.href);
      else setError(result.error);
    } catch {
      setError("Something went wrong with the payment. If money was taken, it will be confirmed or refunded shortly.");
    } finally {
      setPending(false);
    }
  }

  return { pay, pending, error, needsProfile };
}
