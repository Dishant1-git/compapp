"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { sendPhoneCode, verifyPhoneCode } from "@/lib/auth/actions";
import { COUNTRY_CODES, maskPhone } from "@/lib/phone";
import { FormMessage } from "./form-message";

type Sent = { phone: string; devCode?: string };

/**
 * Log in or sign up with a mobile number: number (and name, to sign up) → code.
 * On success the server redirects to `next`, or to onboarding for a new account.
 */
export function PhoneForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState<string>(COUNTRY_CODES[0].code);
  const [number, setNumber] = useState("");
  const [sent, setSent] = useState<Sent | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function send() {
    setError(undefined);
    startTransition(async () => {
      const result = await sendPhoneCode({ countryCode, number, mode });
      if (!result.ok) return setError(result.error);
      setCode("");
      setSent({ phone: result.phone, devCode: result.devCode });
    });
  }

  function verify() {
    if (!sent) return;
    setError(undefined);
    startTransition(async () => {
      // Redirects on success, so only failures come back.
      const result = await verifyPhoneCode({ phone: sent.phone, code, mode, name, next });
      if (result && !result.ok) setError(result.error);
    });
  }

  if (sent) {
    return (
      <form
        noValidate
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          verify();
        }}
      >
        <FormMessage message={error} />
        <p className="text-sm text-muted-foreground">
          We texted a 6-digit code to <span className="font-medium text-foreground">{maskPhone(sent.phone)}</span>.{" "}
          <button
            type="button"
            onClick={() => setSent(null)}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Change number
          </button>
        </p>
        {sent.devCode && (
          <p className="rounded-lg border border-dashed px-4 py-3 text-sm">
            <span className="font-medium">Development mode:</span> no SMS provider is set up, so
            here&apos;s your code: <span className="font-mono font-semibold tracking-widest">{sent.devCode}</span>
          </p>
        )}
        <div>
          <Label htmlFor="otp">6-digit code</Label>
          <Input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="text-center font-mono text-2xl tracking-[0.5em]"
            autoFocus
          />
        </div>
        <Button type="submit" size="lg" fullWidth disabled={pending || code.length !== 6}>
          {pending ? "Checking…" : mode === "login" ? "Log in" : "Create account"}
        </Button>
        <button
          type="button"
          onClick={send}
          disabled={pending}
          className="block w-full text-center text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
        >
          Send a new code
        </button>
      </form>
    );
  }

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <FormMessage message={error} />
      {mode === "signup" && (
        <div>
          <Label htmlFor="phone-name">Full name</Label>
          <Input
            id="phone-name"
            autoComplete="name"
            placeholder="Alex Doe"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      )}
      <div>
        <Label htmlFor="phone-number">Mobile number</Label>
        {/* Widths live on wrappers: Select and Input are always w-full. */}
        <div className="flex gap-2">
          <div className="w-28 shrink-0">
            <Select
              aria-label="Country code"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
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
              id="phone-number"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </div>
        </div>
      </div>
      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={pending || number.replace(/\D/g, "").length < 7 || (mode === "signup" && name.trim().length < 2)}
      >
        {pending ? "Sending code…" : "Send code"}
      </Button>
      {mode === "signup" && (
        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link href="/terms" prefetch={false} className="underline underline-offset-4">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" prefetch={false} className="underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      )}
    </form>
  );
}
