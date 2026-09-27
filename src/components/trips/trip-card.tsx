import Link from "next/link";
import { durationLabel, formatDateRange, formatPrice } from "@/lib/trips/format";
import type { TripSummary } from "@/lib/trips/types";
import { CompatibilityBadge } from "./compatibility-badge";
import { TagList } from "./tag-list";

export function TripCard({ trip }: { trip: TripSummary }) {
  const seatsLeft = Math.max(0, trip.maxGroupSize - trip.bookedCount);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground transition-shadow hover:shadow-md">
      {/* Placeholder cover until trips get photos. */}
      <div aria-hidden className="relative aspect-[16/9] bg-muted">
        <span className="absolute bottom-3 left-4 text-2xl font-bold tracking-tight text-muted-foreground/60">
          {trip.destination}
        </span>
        <CompatibilityBadge value={trip.compatibility} className="absolute top-3 right-3" />
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-sm text-muted-foreground">
          {trip.origin} → {trip.destination}
        </p>
        <h3 className="mt-1 text-lg font-semibold leading-snug">
          <Link href={`/trips/${trip.slug}`} className="after:absolute after:inset-0">
            {trip.title}
          </Link>
        </h3>
        <p className="mt-2 text-sm">
          {formatDateRange(trip.startDate, trip.endDate)}
          <span className="text-muted-foreground"> · {durationLabel(trip.startDate, trip.endDate)}</span>
        </p>

        <TagList tags={trip.vibes.slice(0, 4)} className="mt-3" />

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="text-xl font-bold">{formatPrice(trip.price)}</p>
            <p className="text-xs text-muted-foreground">per person</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">{trip.bookedCount} going</p>
            <p className="text-xs text-muted-foreground">
              {seatsLeft === 0 ? "Full" : `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left`}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
