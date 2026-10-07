"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  saveBirthday,
  saveGender,
  saveInterests,
  saveLifestyle,
  saveLocation,
  saveLook,
  saveSexuality,
} from "@/lib/companion/actions";
import {
  BODY_TYPES,
  COMPANION_GENDERS,
  DISTANCES,
  DRINKING,
  HOBBIES,
  MAX_HEIGHT_CM,
  MAX_HOBBIES,
  MAX_SEXUALITIES,
  MIN_AGE,
  MIN_HEIGHT_CM,
  MIN_HOBBIES,
  SEXUALITIES,
  SMOKING,
  ageFrom,
  feetAndInches,
} from "@/lib/companion/constants";
import type { CompanionDraft } from "@/lib/companion/types";
import { ChoiceGroup } from "./choice-group";
import { StepForm } from "./step-form";

export type StepProps = {
  draft: CompanionDraft;
  update: (patch: Partial<CompanionDraft> | ((draft: CompanionDraft) => Partial<CompanionDraft>)) => void;
  onDone: () => void;
};

export function BirthdayStep({ draft, update, onDone }: StepProps) {
  const [value, setValue] = useState(draft.birthDate ?? "");
  const age = /^\d{4}-\d{2}-\d{2}$/.test(value) ? ageFrom(value) : null;
  const latest = new Date();
  latest.setFullYear(latest.getFullYear() - MIN_AGE);

  return (
    <StepForm
      title="When's your birthday?"
      description="Your age is shown on your profile. Your full date of birth isn't."
      canSubmit={!!value}
      onSubmit={async () => {
        const result = await saveBirthday(value);
        if (result.ok) update({ birthDate: value });
        return result;
      }}
      onDone={onDone}
    >
      <div>
        <Label htmlFor="companion-birthday">Date of birth</Label>
        <Input
          id="companion-birthday"
          type="date"
          autoComplete="bday"
          min="1920-01-01"
          max={latest.toISOString().slice(0, 10)}
          suppressHydrationWarning
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {age !== null && age >= 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;re <span className="font-medium text-foreground">{age}</span>
            {age < MIN_AGE && ` — you need to be ${MIN_AGE} or older to join.`}
          </p>
        )}
      </div>
    </StepForm>
  );
}

export function LookStep({ draft, update, onDone }: StepProps) {
  const [height, setHeight] = useState(draft.heightCm ?? 165);
  const [bodyType, setBodyType] = useState(draft.bodyType);

  return (
    <StepForm
      title="What's your look?"
      description="A couple of basics people like to know."
      onSubmit={async () => {
        const result = await saveLook({ heightCm: height, bodyType });
        if (result.ok) update({ heightCm: height, bodyType });
        return result;
      }}
      onDone={onDone}
    >
      <div>
        <div className="flex items-baseline justify-between">
          <Label htmlFor="companion-height">Height</Label>
          <p className="text-sm">
            <span className="text-lg font-semibold">{height} cm</span>{" "}
            <span className="text-muted-foreground">· {feetAndInches(height)}</span>
          </p>
        </div>
        <input
          id="companion-height"
          type="range"
          min={MIN_HEIGHT_CM}
          max={MAX_HEIGHT_CM}
          value={height}
          onChange={(e) => setHeight(Number(e.target.value))}
          aria-valuetext={`${height} centimetres, ${feetAndInches(height)}`}
          className="mt-3 h-2 w-full cursor-pointer accent-primary"
        />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{MIN_HEIGHT_CM} cm</span>
          <span>{MAX_HEIGHT_CM} cm</span>
        </div>
      </div>

      <ChoiceGroup
        name="bodyType"
        legend="Body type"
        hint="Optional. Tap again to clear."
        options={BODY_TYPES}
        // Checkboxes so a second tap clears it; keep only the latest pick.
        multiple
        value={bodyType ? [bodyType] : []}
        onChange={(picked) => setBodyType(picked.at(-1) ?? null)}
      />
    </StepForm>
  );
}

type Coords = { lat: number; lng: number };

// What the person reads under the "Use my current location" button. Edit the wording here.
const LOCATION_MESSAGES = {
  unsupported: "Your browser can't share location. Type your city instead.",
  notSecure: "Location only works on a secure (https) page. Type your city instead.",
  blocked:
    "Location is blocked. Allow it for this site in your browser, and check location is on for your device. Or type your city.",
  noCityName: "Got your location, but couldn't find the city name. Type it below.",
  guessedCity: "Couldn't get your exact location, so we guessed your city. Check it below.",
  notFound: "Couldn't find your location. Type your city instead.",
};

// How long to wait for the device, and how old a remembered position may be.
const LOCATE_TIMEOUT_MS = 10_000;
const LOCATE_MAX_AGE_MS = 5 * 60_000;
const CITY_LOOKUP_TIMEOUT_MS = 8_000;

export function LocationStep({ draft, update, onDone }: StepProps) {
  const [city, setCity] = useState(draft.city);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [distance, setDistance] = useState(draft.maxDistanceKm);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string>();

  /** The device told us where it is: keep the point and fill in the city name. */
  async function onPositionFound(position: GeolocationPosition) {
    const found = { lat: position.coords.latitude, lng: position.coords.longitude };
    setCoords(found);
    const name = await cityAt(found);
    if (name) setCity(name);
    else setLocateError(LOCATION_MESSAGES.noCityName);
    setLocating(false);
  }

  /** The device couldn't or wouldn't tell us: explain why, and guess the city if we may. */
  async function onPositionFailed(error: GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) {
      setLocateError(LOCATION_MESSAGES.blocked);
    } else {
      // No fix (common on desktops with no GPS or Wi-Fi positioning): guess the city
      // from the network instead. Too rough to store as a point, so no coords.
      const name = await cityAt();
      if (name) setCity(name);
      setLocateError(name ? LOCATION_MESSAGES.guessedCity : LOCATION_MESSAGES.notFound);
    }
    setLocating(false);
  }

  function locate() {
    if (!("geolocation" in navigator)) {
      setLocateError(LOCATION_MESSAGES.unsupported);
      return;
    }
    // Browsers refuse location on plain http (anything but localhost) without ever asking.
    if (!window.isSecureContext) {
      setLocateError(LOCATION_MESSAGES.notSecure);
      return;
    }
    setLocating(true);
    setLocateError(undefined);
    navigator.geolocation.getCurrentPosition(onPositionFound, onPositionFailed, {
      enableHighAccuracy: false,
      timeout: LOCATE_TIMEOUT_MS,
      maximumAge: LOCATE_MAX_AGE_MS,
    });
  }

  return (
    <StepForm
      title="Where do you live?"
      description="We use this to find companions near you. Only your city is shown."
      canSubmit={city.trim().length > 0}
      onSubmit={async () => {
        const result = await saveLocation({ city, lat: coords?.lat, lng: coords?.lng, maxDistanceKm: distance });
        if (result.ok) {
          update({ city: city.trim(), sharedLocation: !!coords || draft.sharedLocation, maxDistanceKm: distance });
        }
        return result;
      }}
      onDone={onDone}
    >
      <Button type="button" variant="outline" size="lg" fullWidth onClick={locate} disabled={locating}>
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11Z" strokeLinejoin="round" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        {locating ? "Finding you…" : coords ? "Location found" : "Use my current location"}
      </Button>
      {locateError && <p className="text-sm text-muted-foreground">{locateError}</p>}

      <div>
        <Label htmlFor="companion-city">City</Label>
        <Input
          id="companion-city"
          autoComplete="address-level2"
          placeholder="e.g. Chandigarh"
          maxLength={80}
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>

      <ChoiceGroup
        name="distance"
        legend="Show me people within"
        hint="Distance works best when you share your location above."
        options={DISTANCES}
        value={[String(distance)]}
        onChange={([picked]) => setDistance(Number(picked))}
      />
    </StepForm>
  );
}

/**
 * City name for a point, using BigDataCloud's free, key-less browser endpoint.
 * With no point it answers for the caller's IP address instead.
 */
async function cityAt(point?: Coords) {
  try {
    const at = point ? `latitude=${point.lat}&longitude=${point.lng}&` : "";
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?${at}localityLanguage=en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(CITY_LOOKUP_TIMEOUT_MS) });
    if (!res.ok) return null;
    const data: { city?: string; locality?: string } = await res.json();
    return data.city || data.locality || null;
  } catch {
    return null;
  }
}

export function GenderStep({ draft, update, onDone }: StepProps) {
  const [gender, setGender] = useState(draft.gender);

  return (
    <StepForm
      title="What's your gender?"
      canSubmit={!!gender}
      onSubmit={async () => {
        const result = await saveGender(gender ?? "");
        if (result.ok) update({ gender });
        return result;
      }}
      onDone={onDone}
    >
      <ChoiceGroup
        name="gender"
        legend="Gender"
        hideLegend
        variant="cards"
        options={COMPANION_GENDERS}
        value={gender ? [gender] : []}
        onChange={([picked]) => setGender(picked)}
      />
    </StepForm>
  );
}

export function SexualityStep({ draft, update, onDone }: StepProps) {
  const [sexuality, setSexuality] = useState(draft.sexuality);
  const [show, setShow] = useState(draft.showSexuality);

  return (
    <StepForm
      title="What's your sexual orientation?"
      description={`Choose up to ${MAX_SEXUALITIES} that describe you.`}
      canSubmit={sexuality.length > 0}
      onSubmit={async () => {
        const result = await saveSexuality({ sexuality, showSexuality: show });
        if (result.ok) update({ sexuality, showSexuality: show });
        return result;
      }}
      onDone={onDone}
    >
      <ChoiceGroup
        name="sexuality"
        legend="Sexual orientation"
        hideLegend
        multiple
        max={MAX_SEXUALITIES}
        options={SEXUALITIES}
        value={sexuality}
        onChange={setSexuality}
      />
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => setShow(e.target.checked)}
          className="size-4 accent-primary"
        />
        Show my orientation on my profile
      </label>
    </StepForm>
  );
}

export function InterestsStep({ draft, update, onDone }: StepProps) {
  const [hobbies, setHobbies] = useState(draft.hobbies);

  return (
    <StepForm
      title="What are you into?"
      description={
        <>
          Pick {MIN_HOBBIES} to {MAX_HOBBIES} hobbies.{" "}
          <span className="font-medium text-foreground">
            {hobbies.length}/{MAX_HOBBIES} selected
          </span>
        </>
      }
      canSubmit={hobbies.length >= MIN_HOBBIES}
      onSubmit={async () => {
        const result = await saveInterests(hobbies);
        if (result.ok) update({ hobbies });
        return result;
      }}
      onDone={onDone}
    >
      <ChoiceGroup
        name="hobbies"
        legend="Hobbies"
        hideLegend
        multiple
        max={MAX_HOBBIES}
        options={HOBBIES}
        value={hobbies}
        onChange={setHobbies}
      />
    </StepForm>
  );
}

export function LifestyleStep({ draft, update, onDone }: StepProps) {
  const [drinking, setDrinking] = useState(draft.drinking);
  const [smoking, setSmoking] = useState(draft.smoking);

  return (
    <StepForm
      title="A bit about your habits"
      description="No judgement. It just helps you find someone who fits."
      canSubmit={!!drinking && !!smoking}
      onSubmit={async () => {
        const result = await saveLifestyle({ drinking: drinking ?? "", smoking: smoking ?? "" });
        if (result.ok) update({ drinking, smoking });
        return result;
      }}
      onDone={onDone}
    >
      <ChoiceGroup
        name="drinking"
        legend="Do you drink?"
        options={DRINKING}
        value={drinking ? [drinking] : []}
        onChange={([picked]) => setDrinking(picked)}
      />
      <ChoiceGroup
        name="smoking"
        legend="Do you smoke?"
        options={SMOKING}
        value={smoking ? [smoking] : []}
        onChange={([picked]) => setSmoking(picked)}
      />
    </StepForm>
  );
}
