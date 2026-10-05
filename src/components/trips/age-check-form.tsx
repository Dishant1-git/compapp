"use client";

import { useState, useTransition } from "react";
import { resizeImage } from "@/components/companion/resize-image";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { ID_DOC_TYPES } from "@/lib/payments/pricing";
import { submitAgeDocuments } from "@/lib/trips/actions";
import type { ActionState } from "@/lib/trips/types";

/** Upload a photo ID for each traveller whose age has to be proven. */
export function AgeCheckForm({
  bookingId,
  proofs,
}: {
  bookingId: string;
  proofs: { traveller: number; name: string }[];
}) {
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  if (state.success) {
    return <p className="rounded-lg bg-muted px-4 py-3 text-sm font-medium">{state.message}</p>;
  }

  function submit(form: HTMLFormElement) {
    const raw = new FormData(form);
    startTransition(async () => {
      try {
        // Shrink phone photos before upload; this also strips location data.
        const data = new FormData();
        for (const { traveller } of proofs) {
          const file = raw.get(`doc-${traveller}`);
          data.set(`type-${traveller}`, String(raw.get(`type-${traveller}`) ?? ""));
          if (file instanceof File && file.size) data.set(`doc-${traveller}`, await resizeImage(file, 1800, 0.9), "id.jpg");
        }
        setState(await submitAgeDocuments(bookingId, data));
      } catch {
        setState({ message: "We couldn't read that photo. Use a JPEG or PNG and try again." });
      }
    });
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
    >
      {proofs.map(({ traveller, name }) => (
        <fieldset key={traveller} className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold">{name}</legend>
          <div>
            <Label htmlFor={`type-${traveller}`}>Document</Label>
            <Select id={`type-${traveller}`} name={`type-${traveller}`} defaultValue="aadhaar" required>
              {ID_DOC_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`doc-${traveller}`}>Photo of the side showing date of birth</Label>
            <input
              id={`doc-${traveller}`}
              name={`doc-${traveller}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="block w-full text-sm file:mr-3 file:h-10 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:text-sm file:font-medium"
            />
          </div>
        </fieldset>
      ))}

      {state.message && (
        <p role="alert" className="rounded-lg border border-destructive/40 px-4 py-3 text-sm text-destructive">
          {state.message}
        </p>
      )}
      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? "Uploading…" : "Send for age check"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Only our verification team sees these photos, and they are deleted as soon as the check is done. On an
        Aadhaar card you can cover the first 8 digits of the number; we only need your name, photo and date of
        birth.
      </p>
    </form>
  );
}
