"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { createTravelPlan } from "@/lib/trips/actions";
import type { ActionState } from "@/lib/trips/types";
import { TagPicker } from "./tag-picker";

export function PlanForm({ defaultOrigin, today }: { defaultOrigin?: string; today: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createTravelPlan, {});
  const v = (key: string) => (state.values?.[key] as string | undefined) ?? undefined;
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-6 rounded-xl border bg-card p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="origin">Starting from</Label>
          <Input id="origin" name="origin" placeholder="e.g. Delhi" defaultValue={v("origin") ?? defaultOrigin} required />
          <FieldError id="origin-error" messages={e.origin} />
        </div>
        <div>
          <Label htmlFor="destination">Going to</Label>
          <Input id="destination" name="destination" placeholder="e.g. Manali" defaultValue={v("destination")} required />
          <FieldError id="destination-error" messages={e.destination} />
        </div>
        <div>
          <Label htmlFor="startDate">From</Label>
          <Input id="startDate" name="startDate" type="date" min={today} defaultValue={v("startDate")} required />
          <FieldError id="startDate-error" messages={e.startDate} />
        </div>
        <div>
          <Label htmlFor="endDate">To</Label>
          <Input id="endDate" name="endDate" type="date" min={today} defaultValue={v("endDate")} required />
          <FieldError id="endDate-error" messages={e.endDate} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="budget">Budget per person (₹)</Label>
          <Input
            id="budget"
            name="budget"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="10000"
            defaultValue={v("budget")}
            required
          />
          <FieldError id="budget-error" messages={e.budget} />
        </div>
      </div>

      <TagPicker
        name="lookingFor"
        legend="Looking for someone into…"
        defaultSelected={[state.values?.lookingFor ?? []].flat()}
        errors={e.lookingFor}
      />

      <div>
        <Label htmlFor="note">Anything else? (optional)</Label>
        <Textarea
          id="note"
          name="note"
          rows={3}
          maxLength={500}
          placeholder="e.g. Planning to hike Hampta Pass, happy to split a cab from Delhi."
          defaultValue={v("note")}
        />
        <FieldError id="note-error" messages={e.note} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Posting…" : "Post plan"}
        </Button>
      </div>
    </form>
  );
}
