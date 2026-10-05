"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/input";
import { register, type FormState } from "@/lib/auth/actions";
import { COUNTRY_CODES } from "@/lib/phone";
import { siteConfig, type PlatformId } from "@/lib/site-config";
import { FormMessage } from "./form-message";
import { PasswordInput } from "./password-input";

export function RegisterForm({ defaultPlatform, next }: { defaultPlatform?: PlatformId; next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(register, {});
  const selected: PlatformId[] =
    state.values?.platforms ??
    (defaultPlatform ? [defaultPlatform] : siteConfig.platforms.map((p) => p.id));

  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage message={state.message} />
      {next && <input type="hidden" name="next" value={next} />}

      <div>
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Alex Doe"
          defaultValue={state.values?.name}
          required
          aria-invalid={!!state.errors?.name}
          aria-describedby="name-error"
        />
        <FieldError id="name-error" messages={state.errors?.name} />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          defaultValue={state.values?.email}
          required
          aria-invalid={!!state.errors?.email}
          aria-describedby="email-error"
        />
        <FieldError id="email-error" messages={state.errors?.email} />
      </div>

      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          placeholder="alex_doe"
          defaultValue={state.values?.username as string | undefined}
          required
          aria-invalid={!!state.errors?.username}
          aria-describedby="username-error username-hint"
        />
        <p id="username-hint" className="mt-1.5 text-xs text-muted-foreground">
          3 to 20 characters: lowercase letters, numbers and underscores. You can log in with it.
        </p>
        <FieldError id="username-error" messages={state.errors?.username} />
      </div>

      <div>
        <Label htmlFor="phone">Mobile number</Label>
        {/* Widths live on wrappers: Select and Input are always w-full. */}
        <div className="flex gap-2">
          <div className="w-28 shrink-0">
            <Select
              name="countryCode"
              aria-label="Country code"
              defaultValue={(state.values?.countryCode as string | undefined) ?? COUNTRY_CODES[0].code}
              className="px-3"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-0 flex-1">
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="98765 43210"
              defaultValue={state.values?.phone as string | undefined}
              required
              aria-invalid={!!state.errors?.phone}
              aria-describedby="phone-error"
            />
          </div>
        </div>
        <FieldError id="phone-error" messages={state.errors?.phone} />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={!!state.errors?.password}
          aria-describedby="password-error password-hint"
        />
        <p id="password-hint" className="mt-1.5 text-xs text-muted-foreground">
          At least 8 characters.
        </p>
        <FieldError id="password-error" messages={state.errors?.password} />
      </div>

      <fieldset aria-describedby="platforms-error">
        <legend className="mb-1.5 text-sm font-medium">I want to use</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {siteConfig.platforms.map((platform) => (
            <label
              key={platform.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-input p-4 transition-colors hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-muted"
            >
              <input
                type="checkbox"
                name="platforms"
                value={platform.id}
                defaultChecked={selected.includes(platform.id)}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium">{platform.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {platform.tagline}
                </span>
              </span>
            </label>
          ))}
        </div>
        <FieldError id="platforms-error" messages={state.errors?.platforms} />
      </fieldset>

      <div>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="terms"
            required
            className="mt-0.5 size-4 shrink-0 accent-primary"
            aria-describedby="terms-error"
          />
          <span className="text-muted-foreground">
            I agree to the{" "}
            <Link href="/terms" prefetch={false} className="font-medium text-foreground underline underline-offset-4">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" prefetch={false} className="font-medium text-foreground underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        <FieldError id="terms-error" messages={state.errors?.terms} />
      </div>

      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
