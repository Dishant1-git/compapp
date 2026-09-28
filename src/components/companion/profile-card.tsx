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

/** How a Companion profile looks to other people. Swipe (or scroll) through the photos. */
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
    <article className="overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
      <div className="relative">
        <div className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]" tabIndex={0} aria-label="Photos">
          {profile.photos.map((photo, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- private, auth-gated image
            <img
              key={photo.id}
              src={photo.url}
              alt={`${firstName}, photo ${i + 1} of ${profile.photos.length}`}
              className="aspect-[3/4] w-full shrink-0 snap-center object-cover"
            />
          ))}
          {!profile.photos.length && <div className="aspect-[3/4] w-full bg-muted" />}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 pt-16 pb-5 text-white">
          <p className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            {firstName}
            {age !== null && <span className="font-normal">{age}</span>}
            {verified && (
              <svg viewBox="0 0 24 24" className="size-6" aria-label="Verified">
                <circle cx="12" cy="12" r="10" fill="currentColor" />
                <path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="black" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </p>
          {profile.city && <p className="mt-1 text-sm text-white/90">Lives in {profile.city}</p>}
        </div>

        {profile.photos.length > 1 && (
          <div aria-hidden className="absolute inset-x-0 top-2 flex justify-center gap-1 px-4">
            {profile.photos.map((p) => (
              <span key={p.id} className="h-1 flex-1 rounded-full bg-white/60" />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-5 p-5">
        {basics.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground">Basics</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {basics.map((b) => (
                <li key={b} className="rounded-full border px-3 py-1 text-sm">
                  {b}
                </li>
              ))}
            </ul>
          </section>
        )}

        {profile.hobbies.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground">Interests</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {profile.hobbies.map((h) => (
                <li key={h} className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
                  {optionLabel(HOBBIES, h)}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
