"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { updateAgencyProfile } from "@/lib/agency/actions";
import type { AgencyProfile } from "@/lib/agency/queries";
import type { ActionState } from "@/lib/trips/types";

export function AgencyProfileForm({ profile }: { profile: AgencyProfile }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateAgencyProfile, {});
  const v = (key: keyof AgencyProfile) =>
    state.values ? String(state.values[key] ?? "") : String(profile[key] ?? "");
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
      <FormMessage message={state.message} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Agency name</Label>
          <Input id="name" name="name" defaultValue={v("name")} required />
          <FieldError id="name-error" messages={e.name} />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={v("city")} required />
          <FieldError id="city-error" messages={e.city} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={v("phone")} required />
          <FieldError id="phone-error" messages={e.phone} />
        </div>
        <div>
          <Label htmlFor="registrationNumber">Registration no. / GSTIN</Label>
          <Input id="registrationNumber" name="registrationNumber" defaultValue={v("registrationNumber")} required />
          <p className="mt-1.5 text-xs text-muted-foreground">Changing this sends your agency back for review.</p>
          <FieldError id="registrationNumber-error" messages={e.registrationNumber} />
        </div>
        <div>
          <Label htmlFor="website">Website (optional)</Label>
          <Input id="website" name="website" type="url" placeholder="https://" defaultValue={v("website")} />
          <FieldError id="website-error" messages={e.website} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">About your agency</Label>
          <Textarea id="description" name="description" rows={4} maxLength={1000} defaultValue={v("description")} />
          <FieldError id="description-error" messages={e.description} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
