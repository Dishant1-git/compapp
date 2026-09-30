import Link from "next/link";
import { formatDateRange, formatPrice } from "@/lib/trips/format";
import type { TripSummary } from "@/lib/trips/types";
import { CompatibilityBadge } from "./compatibility-badge";
import { TagList } from "./tag-list";
import { TripCover } from "./trip-cover";

const DAY_MS = 24 * 60 * 60 * 1000;

export function TripCard({ trip }: { trip: TripSummary }) {
  const seatsLeft = Math.max(0, trip.maxGroupSize - trip.bookedCount);
  const days = Math.max(0, Math.round((+new Date(trip.endDate) - +new Date(trip.startDate)) / DAY_MS)) + 1;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground transition-[translate,box-shadow] duration-500 ease-(--ease-out) hover:-translate-y-1.5 hover:shadow-[0_24px_48px_-24px_rgb(23_37_31/0.45)]">
      <TripCover destination={trip.destination} label={`From ${trip.origin}`} className="aspect-[4/3]">
        <CompatibilityBadge value={trip.compatibility} />
      </TripCover>

      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow text-muted-foreground">
          {days} day{days === 1 ? "" : "s"} · {trip.bookedCount} of {trip.maxGroupSize} going
        </p>
        <h3 className="mt-2 font-display text-2xl leading-tight">
          <Link href={`/trips/${trip.slug}`} className="after:absolute after:inset-0">
            {trip.title}
          </Link>
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{formatDateRange(trip.startDate, trip.endDate)}</p>

        <TagList tags={trip.vibes.slice(0, 4)} className="mt-4" />

        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-3 border-t pt-4">
            <div>
              <p className="font-display text-3xl leading-none">{formatPrice(trip.price)}</p>
              <p className="mt-1 text-xs text-muted-foreground">per person</p>
            </div>
            <p className={seatsLeft === 0 ? "eyebrow text-muted-foreground" : "eyebrow text-highlight-ink"}>
              {seatsLeft === 0 ? "Full" : `${seatsLeft} spot${seatsLeft === 1 ? "" : "s"} left`}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
