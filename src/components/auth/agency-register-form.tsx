"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { registerAgency, type FormState } from "@/lib/auth/actions";
import { FormMessage } from "./form-message";
import { PasswordInput } from "./password-input";

export function AgencyRegisterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(registerAgency, {});
  const v = (key: string) => (state.values?.[key] as string | undefined) ?? undefined;
  const e = state.errors ?? {};

  function field({
    name,
    label,
    hint,
    ...input
  }: { name: string; label: string; hint?: string } & React.ComponentProps<"input">) {
    return (
      <div>
        <Label htmlFor={name}>{label}</Label>
        <Input id={name} name={name} defaultValue={v(name)} aria-invalid={!!e[name]} {...input} />
        {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
        <FieldError id={`${name}-error`} messages={e[name]} />
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage message={state.message} />

      <fieldset className="space-y-5">
        <legend className="mb-3 text-sm font-semibold">Your agency</legend>
        {field({ name: "agencyName", label: "Agency name", required: true, placeholder: "Wanderlust Collective" })}
        <div className="grid gap-5 sm:grid-cols-2">
          {field({ name: "city", label: "City", required: true, placeholder: "Delhi" })}
          {field({ name: "phone", label: "Business phone", type: "tel", required: true, placeholder: "+91 …" })}
        </div>
        {field({
          name: "registrationNumber",
          label: "Tourism registration no. or GSTIN",
          required: true,
          hint: "An admin checks this before approving your agency.",
        })}
        {field({ name: "website", label: "Website (optional)", type: "url", placeholder: "https://" })}
        <div>
          <Label htmlFor="description">About your agency (optional)</Label>
          <Textarea id="description" name="description" rows={3} maxLength={1000} defaultValue={v("description")} />
          <FieldError id="description-error" messages={e.description} />
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t pt-5">
        <legend className="mb-3 text-sm font-semibold">Your login</legend>
        {field({ name: "name", label: "Your full name", autoComplete: "name", required: true })}
        {field({ name: "email", label: "Email", type: "email", autoComplete: "email", required: true })}
        <div>
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" name="password" autoComplete="new-password" minLength={8} required />
          <FieldError id="password-error" messages={e.password} />
        </div>
      </fieldset>

      <div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="terms" required className="mt-0.5 size-4 shrink-0 accent-primary" />
          <span className="text-muted-foreground">
            I confirm the details are accurate and agree to the{" "}
            <Link href="/terms" prefetch={false} className="font-medium text-foreground underline underline-offset-4">
              Terms
            </Link>
            .
          </span>
        </label>
        <FieldError id="terms-error" messages={e.terms} />
      </div>

      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? "Submitting…" : "Register agency"}
      </Button>
    </form>
  );
}
