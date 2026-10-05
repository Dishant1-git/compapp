"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { saveDistance } from "@/lib/companion/actions";
import { DISTANCES } from "@/lib/companion/constants";
import type { NearbyProfile } from "@/lib/companion/types";
import { cn } from "@/lib/utils";
import { ChoiceGroup } from "./choice-group";
import { ProfileCard } from "./profile-card";

/** How long each profile stays up before the carousel moves on. */
const SLIDE_MS = 5000;

/**
 * The discover page: a distance picker and a carousel of the profiles inside it.
 * `canChangeDistance` is false for people who only typed their city, since
 * distance can't be measured for them.
 */
export function Discover({
  profiles,
  maxDistanceKm,
  canChangeDistance,
}: {
  profiles: NearbyProfile[];
  maxDistanceKm: number;
  canChangeDistance: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function changeDistance(km: number) {
    setError(undefined);
    startTransition(async () => {
      const result = await saveDistance(km).catch(() => null);
      if (result?.ok) router.refresh();
      else setError(result?.error ?? "Couldn't change the distance. Try again.");
    });
  }

  return (
    <div className="space-y-6">
      {canChangeDistance && (
        <div className={cn(pending && "pointer-events-none opacity-60")}>
          <ChoiceGroup
            name="distance"
            legend="Show me people within"
            options={DISTANCES}
            value={[String(maxDistanceKm)]}
            onChange={([picked]) => changeDistance(Number(picked))}
          />
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      )}

      {profiles.length ? (
        // Keyed so a new distance starts a fresh carousel, with nobody set aside.
        <ProfileCarousel key={maxDistanceKm} profiles={profiles} />
      ) : (
        <EmptyState title="No profiles found in this distance range.">
          {canChangeDistance ? "Try a wider distance, or check back soon." : "Check back soon as more people join."}
        </EmptyState>
      )}
    </div>
  );
}

/**
 * One profile at a time, moving on by itself every few seconds. It stops while
 * the pointer or keyboard focus is on it, and for good once someone takes
 * control, so a profile never slides away under a tap. Reject only sets a
 * profile aside for this visit: nothing is saved, so it's back after a reload.
 */
function ProfileCarousel({ profiles }: { profiles: NearbyProfile[] }) {
  const [list, setList] = useState(profiles);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovering, setHovering] = useState(false);
  const count = list.length;
  const current = index < count ? index : 0;

  useEffect(() => {
    if (!playing || hovering || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => clearInterval(timer);
  }, [playing, hovering, count]);

  function show(to: number) {
    setPlaying(false);
    setIndex((to + count) % count);
  }

  if (!count) {
    return (
      <EmptyState title="That's everyone in this distance range.">
        <Button type="button" variant="outline" className="mt-4" onClick={() => setList(profiles)}>
          Show them again
        </Button>
      </EmptyState>
    );
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="People near you"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
      onTouchStart={() => setPlaying(false)}
    >
      {/* Clip, not hidden: hidden would stop the buttons sticking to the screen. */}
      <div className="overflow-x-clip">
        <ul
          className="flex items-start transition-transform duration-500 ease-(--ease-out) motion-reduce:transition-none"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {list.map((profile, i) => (
            <li
              key={profile.id}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              inert={i !== current}
              className="w-full shrink-0"
            >
              {/* Only the slide on show and its neighbours are drawn, so the photos of
                  everyone further along aren't all downloaded at once. */}
              {isNear(i, current, count) && <ProfileCard profile={profile} distanceKm={profile.distanceKm} />}
              {/* Stays at the bottom of the screen while the card is taller than it. */}
              <div className="sticky bottom-0 z-10 mt-1 grid grid-cols-2 gap-3 bg-background/95 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setList((l) => l.filter((p) => p.id !== profile.id))}
                >
                  <span aria-hidden>💔</span> Reject
                </Button>
                <ButtonLink href={`/companion/subscribe?to=${profile.id}`} size="lg">
                  <span aria-hidden>✅</span> Request
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {count > 1 && (
        <div className="mt-1 flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" size="sm" aria-label="Previous profile" onClick={() => show(current - 1)}>
            <Arrow className="rotate-180" />
          </Button>
          <div className="flex items-center gap-3 text-sm text-muted-foreground tabular-nums">
            <span aria-live={playing ? "off" : "polite"}>
              {current + 1} of {count}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPlaying((p) => !p)}>
              {playing ? "Pause" : "Play"}
            </Button>
          </div>
          <Button type="button" variant="ghost" size="sm" aria-label="Next profile" onClick={() => show(current + 1)}>
            <Arrow />
          </Button>
        </div>
      )}
    </section>
  );
}

/** Is slide `i` the current one or right beside it (the last slide is beside the first)? */
function isNear(i: number, current: number, count: number) {
  const apart = Math.abs(i - current);
  return Math.min(apart, count - apart) <= 1;
}

function Arrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      <div className="mt-2 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
