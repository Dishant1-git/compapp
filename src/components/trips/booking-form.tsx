"use client";

import Link from "next/link";
import { useState } from "react";
import { useCheckout } from "@/components/payments/use-checkout";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { startSeatBooking } from "@/lib/payments/actions";
import {
  ADULT_AGE,
  CONSENT_RULES,
  GROUP_MAX_SIZE,
  GROUP_MIN_ADULTS,
  GROUP_MIN_SIZE,
  GROUP_SEAT_FEE,
  REFUND_SCHEDULE,
  SEAT_FEE,
  ageOn,
  seatFee,
} from "@/lib/payments/pricing";
import { formatPrice } from "@/lib/trips/format";
import { cn } from "@/lib/utils";

type Traveller = { name: string; birthDate: string };

type Props = {
  tripId: string;
  slug: string;
  /** Trip price per person, paid to the agency. */
  price: number;
  minAge: number;
  seatsLeft: number;
  myName: string;
  today: string;
};

const isAdult = (t: Traveller) => !!t.birthDate && ageOn(t.birthDate) >= ADULT_AGE;

export function BookingForm({ tripId, slug, price, minAge, seatsLeft, myName, today }: Props) {
  const { pay, pending, error, needsProfile } = useCheckout();
  const canGroup = seatsLeft >= GROUP_MIN_SIZE;
  const maxGroup = Math.min(GROUP_MAX_SIZE, seatsLeft);

  const [group, setGroup] = useState(false);
  const [travellers, setTravellers] = useState<Traveller[]>([{ name: myName, birthDate: "" }]);
  const [secondAdult, setSecondAdult] = useState<number | null>(null);
  const [consent, setConsent] = useState(false);

  const seats = travellers.length;
  const total = seatFee(seats) * seats;
  const here = `/trips/${slug}/book`;
  // Other adults in the group, one of whom also proves their age.
  const otherAdults = travellers.map((t, i) => ({ t, i })).filter(({ t, i }) => i > 0 && isAdult(t));
  const second = otherAdults.some((a) => a.i === secondAdult) ? secondAdult : (otherAdults[0]?.i ?? null);

  function resize(count: number) {
    setTravellers((list) =>
      Array.from({ length: count }, (_, i) => list[i] ?? { name: "", birthDate: "" }),
    );
  }

  function update(index: number, patch: Partial<Traveller>) {
    setTravellers((list) => list.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        pay(() => startSeatBooking(tripId, { seats, travellers, secondAdult: second ?? undefined, consent }));
      }}
    >
      <Card title="Who's travelling?">
        <div className="grid gap-3 sm:grid-cols-2">
          <Choice
            checked={!group}
            onChange={() => {
              setGroup(false);
              resize(1);
            }}
            title="Just me"
            detail={`${formatPrice(SEAT_FEE)} seat fee · ${minAge}+ only`}
          />
          <Choice
            checked={group}
            disabled={!canGroup}
            onChange={() => {
              setGroup(true);
              resize(Math.max(GROUP_MIN_SIZE, seats));
            }}
            title={`A group of ${GROUP_MIN_SIZE} or more`}
            detail={
              canGroup
                ? `${formatPrice(GROUP_SEAT_FEE)} each · at least ${GROUP_MIN_ADULTS} must be ${ADULT_AGE}+`
                : `Fewer than ${GROUP_MIN_SIZE} seats are left`
            }
          />
        </div>

        {group && (
          <div className="mt-5 max-w-40">
            <Label htmlFor="seats">Number of people</Label>
            <Input
              id="seats"
              type="number"
              inputMode="numeric"
              min={GROUP_MIN_SIZE}
              max={maxGroup}
              value={seats}
              onChange={(e) => {
                const n = Math.round(Number(e.target.value));
                if (n >= GROUP_MIN_SIZE && n <= maxGroup) resize(n);
              }}
            />
          </div>
        )}

        <ul className="mt-5 space-y-4">
          {travellers.map((t, i) => (
            <li key={i} className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`name-${i}`}>{i === 0 ? "You" : `Traveller ${i + 1}: full name`}</Label>
                <Input
                  id={`name-${i}`}
                  value={t.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  disabled={i === 0}
                  maxLength={80}
                  required
                />
              </div>
              <div>
                <Label htmlFor={`dob-${i}`}>Date of birth</Label>
                <Input
                  id={`dob-${i}`}
                  type="date"
                  max={today}
                  value={t.birthDate}
                  onChange={(e) => update(i, { birthDate: e.target.value })}
                  required
                />
              </div>
            </li>
          ))}
        </ul>

        {group && (
          <div className="mt-5">
            <Label htmlFor="secondAdult">Second adult whose ID you&apos;ll upload</Label>
            <Select
              id="secondAdult"
              value={second ?? ""}
              onChange={(e) => setSecondAdult(Number(e.target.value))}
              required
            >
              {!otherAdults.length && <option value="">Enter dates of birth first</option>}
              {otherAdults.map(({ t, i }) => (
                <option key={i} value={i}>
                  {t.name || `Traveller ${i + 1}`}
                </option>
              ))}
            </Select>
            <p className="mt-1.5 text-sm text-muted-foreground">
              After paying, you upload your own ID and this person&apos;s, to show {GROUP_MIN_ADULTS} of you are{" "}
              {ADULT_AGE} or older.
            </p>
          </div>
        )}
      </Card>

      <Card title="Trip rules and consent">
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          {CONSENT_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
        <div className="mt-5 rounded-lg bg-muted p-4 text-sm">
          <p className="font-medium">Seat fee refunds</p>
          <ul className="mt-2 space-y-1">
            {REFUND_SCHEDULE.map((row) => (
              <li key={row.minDays} className="flex justify-between gap-4">
                <span>{row.label}</span>
                <span className="font-medium tabular-nums">{row.percent}%</span>
              </li>
            ))}
            <li className="flex justify-between gap-4">
              <span>Trip cancelled by the agency</span>
              <span className="font-medium tabular-nums">100%</span>
            </li>
          </ul>
        </div>
        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm font-medium">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
          />
          <span>
            I have read these rules and agree to them
            {group ? ", for myself and on behalf of everyone in my group." : "."}
          </span>
        </label>
      </Card>

      <Card title="Pay the seat fee">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt>
              Seat fee · {seats} × {formatPrice(seatFee(seats))}
            </dt>
            <dd className="text-lg font-bold tabular-nums">{formatPrice(total)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-muted-foreground">
            <dt>Trip price, paid to the agency later</dt>
            <dd className="tabular-nums">{formatPrice(price * seats)}</dd>
          </div>
        </dl>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-destructive/40 px-4 py-3 text-sm text-destructive">
            {error}
            {needsProfile && (
              <>
                {" "}
                <Link
                  href={`/trips/profile?next=${encodeURIComponent(here)}`}
                  className="font-medium underline underline-offset-4"
                >
                  Complete profile
                </Link>
              </>
            )}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth disabled={pending} className="mt-5">
          {pending ? "Working…" : `Pay ${formatPrice(total)} and reserve`}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Your seat is reserved as soon as the payment goes through. Next you upload a photo ID so we can check
          ages.
        </p>
      </Card>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <h2 className="mb-4 text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Choice({
  checked,
  disabled,
  onChange,
  title,
  detail,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  title: string;
  detail: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-4",
        checked && "border-primary bg-muted",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="radio"
        name="party"
        className="mt-1 size-4 shrink-0"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{detail}</span>
      </span>
    </label>
  );
}
