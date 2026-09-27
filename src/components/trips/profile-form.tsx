"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/input";
import { updateProfile } from "@/lib/trips/actions";
import { GENDERS } from "@/lib/trips/constants";
import type { Profile } from "@/lib/trips/queries";
import type { ActionState } from "@/lib/trips/types";
import { TagPicker } from "./tag-picker";

type Initial = Omit<Profile, "trust" | "verification" | "email">;

export function ProfileForm({ profile, next }: { profile: Initial; next?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateProfile, {});
  // After a failed submit, show what the user typed rather than the saved profile.
  const v = state.values;
  const val = (key: string, fallback: string) => (v ? String(v[key] ?? "") : fallback);
  const selected = v ? [v.personality ?? []].flat() : profile.personality;
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-8">
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage message={state.message} />

      <Card title="Travel personality" description="Used to match you with trips and people. Pick 3 or more.">
        <TagPicker name="personality" legend="I'm into…" defaultSelected={selected} errors={e.personality} />
      </Card>

      <Card title="About you" description="Other travellers see your first name, age, city and bio.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="name" label="Full name" errors={e.name}>
            <Input id="name" name="name" autoComplete="name" defaultValue={val("name", profile.name)} required />
          </Field>
          <Field id="city" label="Home city" errors={e.city}>
            <Input id="city" name="city" autoComplete="address-level2" placeholder="e.g. Chandigarh" defaultValue={val("city", profile.city)} />
          </Field>
          <Field id="birthYear" label="Birth year" errors={e.birthYear}>
            <Input
              id="birthYear"
              name="birthYear"
              type="number"
              inputMode="numeric"
              placeholder="e.g. 1999"
              defaultValue={val("birthYear", profile.birthYear ? String(profile.birthYear) : "")}
            />
          </Field>
          <Field id="gender" label="Gender" errors={e.gender}>
            <Select id="gender" name="gender" defaultValue={val("gender", profile.gender)}>
              {GENDERS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="bio" label="Bio" errors={e.bio} className="sm:col-span-2">
            <Textarea
              id="bio"
              name="bio"
              rows={3}
              maxLength={500}
              placeholder="What kind of traveller are you?"
              defaultValue={val("bio", profile.bio)}
            />
          </Field>
        </div>
      </Card>

      <Card
        title="Safety details"
        description="Required before booking. Your phone is shared only with your trip captain; your emergency contact is never shown to others."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="phone" label="Your phone" errors={e.phone} className="sm:col-span-2">
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              defaultValue={val("phone", profile.phone)}
            />
          </Field>
          <Field id="emergencyName" label="Emergency contact name" errors={e.emergencyName}>
            <Input id="emergencyName" name="emergencyName" defaultValue={val("emergencyName", profile.emergencyContact.name)} />
          </Field>
          <Field id="emergencyPhone" label="Emergency contact phone" errors={e.emergencyPhone}>
            <Input
              id="emergencyPhone"
              name="emergencyPhone"
              type="tel"
              placeholder="+91 …"
              defaultValue={val("emergencyPhone", profile.emergencyContact.phone)}
            />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  errors,
  className,
  children,
}: {
  id: string;
  label: string;
  errors?: string[];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      <FieldError id={`${id}-error`} messages={errors} />
    </div>
  );
}
