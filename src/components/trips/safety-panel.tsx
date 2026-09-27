"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { EMERGENCY_NUMBER } from "@/lib/trips/constants";

type Props = {
  tripTitle: string;
  dates: string;
  captain: { name: string; phone?: string };
  emergencyContact: { name: string; phone: string } | null;
};

/** Shown only to travellers with a seat. */
export function SafetyPanel({ tripTitle, dates, captain, emergencyContact }: Props) {
  const [copied, setCopied] = useState(false);

  const message =
    `I'm going on "${tripTitle}" (${dates}) with Stranger Trips. ` +
    `Trip captain: ${captain.name}${captain.phone ? ` (${captain.phone})` : ""}.`;

  async function share() {
    const text = `${message} ${window.location.href}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: tripTitle, text });
      } catch {
        // Share sheet dismissed.
      }
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const waNumber = emergencyContact?.phone.replace(/[^\d]/g, "");

  return (
    <section aria-labelledby="safety-title" className="rounded-xl border bg-card p-5 sm:p-6">
      <h2 id="safety-title" className="text-lg font-semibold">
        Safety
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Keep someone you trust in the loop, and reach help fast.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <a href={`tel:${EMERGENCY_NUMBER}`} className={buttonClasses({ variant: "primary" })}>
          Call emergency ({EMERGENCY_NUMBER})
        </a>
        {captain.phone && (
          <a href={`tel:${captain.phone}`} className={buttonClasses({ variant: "outline" })}>
            Call trip captain
          </a>
        )}
        {emergencyContact && waNumber ? (
          <a
            href={`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: "outline" })}
          >
            Send trip to {emergencyContact.name}
          </a>
        ) : (
          <Link href="/trips/profile" className={buttonClasses({ variant: "outline" })}>
            Add emergency contact
          </Link>
        )}
        <button type="button" onClick={share} className={buttonClasses({ variant: "outline" })}>
          {copied ? "Copied!" : "Share trip details"}
        </button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Feel unsafe with someone in your group? Use “Report” on their card — reports go to our
        safety team.
      </p>
    </section>
  );
}
