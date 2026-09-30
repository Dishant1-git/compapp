import {
  BODY_TYPES,
  COMPANION_GENDERS,
  DRINKING,
  HOBBIES,
  SEXUALITIES,
  SMOKING,
  ageFrom,
  feetAndInches,
  optionLabel,
} from "@/lib/companion/constants";
import type { CompanionDraft } from "@/lib/companion/types";

/**
 * How a Companion profile looks to other people: an editorial portrait with the
 * name set over the photo, then the details in layers. Swipe (or scroll) the photos.
 */
export function ProfileCard({ profile }: { profile: CompanionDraft }) {
  const firstName = profile.name.split(" ")[0];
  const age = profile.birthDate ? ageFrom(profile.birthDate) : null;
  const verified = profile.selfie?.status === "verified";

  const basics = [
    profile.heightCm && `${profile.heightCm} cm (${feetAndInches(profile.heightCm)})`,
    profile.bodyType && optionLabel(BODY_TYPES, profile.bodyType),
    profile.gender && profile.gender !== "unspecified" && optionLabel(COMPANION_GENDERS, profile.gender),
    profile.showSexuality && profile.sexuality.map((s) => optionLabel(SEXUALITIES, s)).join(", "),
    profile.drinking && `Drinks: ${optionLabel(DRINKING, profile.drinking).toLowerCase()}`,
    profile.smoking && `Smokes: ${optionLabel(SMOKING, profile.smoking).toLowerCase()}`,
  ].filter((b): b is string => !!b);

  return (
    <article className="reveal overflow-hidden rounded-xl border bg-card text-card-foreground">
      <div className="relative">
        <div className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]" tabIndex={0} aria-label="Photos">
          {profile.photos.map((photo, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- private, auth-gated image
            <img
              key={photo.id}
              src={photo.url}
              alt={`${firstName}, photo ${i + 1} of ${profile.photos.length}`}
              className="aspect-[4/5] w-full shrink-0 snap-center object-cover"
            />
          ))}
          {!profile.photos.length && <div className="aspect-[4/5] w-full bg-muted" />}
        </div>

        {/* Plum, not black, so the photo melts into the card. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-card via-card/60 to-transparent px-6 pt-28 pb-6">
          <p className="flex items-baseline gap-3 font-display text-5xl leading-none font-medium">
            {firstName}
            {age !== null && <span className="text-3xl text-muted-foreground italic">{age}</span>}
            {verified && (
              <svg viewBox="0 0 24 24" className="size-6 self-center text-primary" aria-label="Verified">
                <circle cx="12" cy="12" r="10" fill="currentColor" />
                <path
                  d="M7.5 12.5l3 3 6-6.5"
                  fill="none"
                  stroke="var(--companion-bg)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </p>
          {profile.city && <p className="eyebrow mt-3 text-highlight">{profile.city}</p>}
        </div>

        {profile.photos.length > 1 && (
          <div aria-hidden className="absolute inset-x-0 top-3 flex justify-center gap-1 px-5">
            {profile.photos.map((p) => (
              <span key={p.id} className="h-0.5 flex-1 rounded-full bg-white/50" />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 px-6 pb-7">
        {profile.hobbies.length > 0 && (
          <section>
            <h2 className="eyebrow font-sans text-muted-foreground">Into</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {profile.hobbies.map((h) => (
                <li key={h} className="rounded-full border border-highlight/30 bg-highlight/10 px-3.5 py-1.5 text-sm text-highlight-ink">
                  {optionLabel(HOBBIES, h)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {basics.length > 0 && (
          <section>
            <h2 className="eyebrow font-sans text-muted-foreground">Basics</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {basics.map((b) => (
                <li key={b} className="rounded-full border px-3.5 py-1.5 text-sm text-muted-foreground">
                  {b}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
