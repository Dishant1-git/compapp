"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import type { ActionState } from "@/lib/trips/types";
import { TagPicker } from "@/components/trips/tag-picker";

type FieldProps = {
  state: ActionState;
  name: string;
  label: string;
  hint?: string;
  className?: string;
} & Omit<React.ComponentProps<"input">, "name">;

type TripAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** Create/edit form for a trip. Pass `initial` values when editing. */
export function TripForm({
  action: submit,
  initial,
  today,
  submitLabel = "Publish trip",
}: {
  action: TripAction;
  initial?: Record<string, string | string[]>;
  /** Earliest selectable start date, or undefined to allow any (editing a running trip). */
  today?: string;
  submitLabel?: string;
}) {
  const [result, action, pending] = useActionState<ActionState, FormData>(submit, {});
  // After a failed submit show what was typed; otherwise the saved values.
  const state: ActionState = { ...result, values: result.values ?? initial };

  return (
    <form action={action} className="space-y-8">
      <FormMessage message={state.message} />

      <Card title="Basics">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field state={state} name="title" label="Trip title" placeholder="Manali Weekend Escape" className="sm:col-span-2" required />
          <Field state={state} name="origin" label="Departure city" placeholder="Delhi" required />
          <Field state={state} name="destination" label="Destination" placeholder="Manali" required />
          <Field state={state} name="region" label="Region / state" placeholder="Himachal Pradesh" />
          <Field state={state} name="minAge" label="Minimum age" type="number" inputMode="numeric" min={18} placeholder="18" />
        </div>
        <div className="mt-5">
          <Area state={state} name="summary" label="Summary" rows={4} hint="What makes this trip special? Who is it for?" />
        </div>
      </Card>

      <Card title="Dates, price & group">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field state={state} name="startDate" label="Start date" type="date" min={today} required />
          <Field state={state} name="endDate" label="End date" type="date" min={today} required />
          <Field state={state} name="price" label="Price per person (₹)" type="number" inputMode="numeric" min={1} step={1} required />
          <Field state={state} name="maxGroupSize" label="Max group size" type="number" inputMode="numeric" min={2} max={60} required />
        </div>
      </Card>

      <Card title="Vibe">
        <TagPicker
          name="vibes"
          legend="This trip is great for people into…"
          defaultSelected={[state.values?.vibes ?? []].flat()}
          errors={state.errors?.vibes}
        />
      </Card>

      <Card title="Details">
        <div className="space-y-5">
          <Area state={state} name="highlights" label="Highlights" hint="One per line." />
          <Area
            state={state}
            name="itinerary"
            label="Itinerary"
            rows={6}
            hint="One line per day, as “Title: description”. e.g. “Solang Valley: paragliding and snow point”"
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Area state={state} name="inclusions" label="Included" hint="One per line." />
            <Area state={state} name="exclusions" label="Not included" hint="One per line." />
          </div>
        </div>
      </Card>

      <Card title="Trip captain">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field state={state} name="captainName" label="Name" required />
          <Field state={state} name="captainPhone" label="Phone" type="tel" hint="Shared only with booked travellers." />
        </div>
        <div className="mt-5">
          <Area state={state} name="captainBio" label="Short bio" rows={2} />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({ state, name, label, hint, className, ...input }: FieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={state.values?.[name] as string | undefined} {...input} />
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      <FieldError id={`${name}-error`} messages={state.errors?.[name]} />
    </div>
  );
}

function Area({
  state,
  name,
  label,
  hint,
  rows = 4,
}: {
  state: ActionState;
  name: string;
  label: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} rows={rows} defaultValue={state.values?.[name] as string | undefined} />
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      <FieldError id={`${name}-error`} messages={state.errors?.[name]} />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <h2 className="mb-5 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
