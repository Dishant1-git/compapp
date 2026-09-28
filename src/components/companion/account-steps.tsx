"use client";

import { useEffect, useRef, useState } from "react";
import { FieldError, Input, Label, Select } from "@/components/ui/input";
import { sendCode, verifyCode, type VerifyResult } from "@/lib/companion/actions";
import { COUNTRY_CODES, maskPhone } from "@/lib/companion/constants";
import { StepForm } from "./step-form";

export type SentCode = { phone: string; devCode?: string; sentAt: number };

const RESEND_SECONDS = 30;

export function NameStep({
  name,
  onChange,
  onDone,
}: {
  name: string;
  onChange: (name: string) => void;
  onDone: () => void;
}) {
  return (
    <StepForm
      title="What's your name?"
      description="This is how you'll appear on Companion. You can use just your first name."
      onSubmit={async () =>
        name.trim().length >= 2 ? { ok: true } : { ok: false, error: "Enter your name." }
      }
      onDone={onDone}
      canSubmit={name.trim().length > 0}
    >
      <div>
        <Label htmlFor="companion-name">First name</Label>
        <Input
          id="companion-name"
          autoComplete="given-name"
          autoCapitalize="words"
          placeholder="Your name"
          maxLength={50}
          value={name}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      </div>
    </StepForm>
  );
}

export function PhoneStep({ onSent }: { onSent: (sent: SentCode) => void }) {
  const [countryCode, setCountryCode] = useState<string>(COUNTRY_CODES[0].code);
  const [number, setNumber] = useState("");
  const sent = useRef<SentCode>(null);

  return (
    <StepForm
      title="What's your mobile number?"
      description="We'll text you a 6-digit code to check it's really you. Your number is never shown on your profile."
      pendingLabel="Sending code…"
      submitLabel="Send code"
      canSubmit={number.replace(/\D/g, "").length >= 7}
      onSubmit={async () => {
        const result = await sendCode({ countryCode, number });
        if (result.ok) sent.current = { phone: result.phone, devCode: result.devCode, sentAt: Date.now() };
        return result.ok ? { ok: true } : result;
      }}
      onDone={() => sent.current && onSent(sent.current)}
    >
      <div>
        <Label htmlFor="companion-phone">Mobile number</Label>
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
              id="companion-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      </div>
    </StepForm>
  );
}

export function OtpStep({
  name,
  sent,
  onResent,
  onChangeNumber,
  onVerified,
}: {
  name: string;
  sent: SentCode;
  onResent: (sent: SentCode) => void;
  onChangeNumber: () => void;
  onVerified: (result: Extract<VerifyResult, { ok: true }>) => void;
}) {
  const [code, setCode] = useState("");
  const verified = useRef<Extract<VerifyResult, { ok: true }>>(null);
  const [resendError, setResendError] = useState<string>();
  const [resending, setResending] = useState(false);
  const secondsLeft = useCountdown(sent.sentAt + RESEND_SECONDS * 1000);

  async function resend() {
    setResending(true);
    setResendError(undefined);
    const result = await sendCode({ countryCode: "", number: sent.phone }).catch(() => null);
    setResending(false);
    if (result?.ok) {
      setCode("");
      onResent({ phone: result.phone, devCode: result.devCode, sentAt: Date.now() });
    } else {
      setResendError(result?.error ?? "Couldn't send a new code. Try again.");
    }
  }

  return (
    <StepForm
      title="Enter your code"
      description={
        <>
          Sent to <span className="font-medium text-foreground">{maskPhone(sent.phone)}</span>.{" "}
          <button type="button" onClick={onChangeNumber} className="font-medium text-foreground underline underline-offset-4">
            Change number
          </button>
        </>
      }
      submitLabel="Verify"
      pendingLabel="Verifying…"
      canSubmit={code.length === 6}
      onSubmit={async () => {
        const result = await verifyCode({ name, phone: sent.phone, code });
        if (result.ok) verified.current = result;
        return result.ok ? { ok: true } : result;
      }}
      onDone={() => verified.current && onVerified(verified.current)}
      footer={
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {secondsLeft > 0 ? (
            <p>Resend code in {secondsLeft}s</p>
          ) : (
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="font-medium text-foreground underline underline-offset-4 disabled:opacity-50"
            >
              {resending ? "Sending…" : "Resend code"}
            </button>
          )}
          <FieldError id="resend-error" messages={resendError ? [resendError] : undefined} />
        </div>
      }
    >
      {sent.devCode && (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm">
          <span className="font-medium">Development mode:</span> no SMS provider is set up, so
          here&apos;s your code: <span className="font-mono font-semibold tracking-widest">{sent.devCode}</span>
        </p>
      )}
      <div>
        <Label htmlFor="companion-otp">6-digit code</Label>
        <Input
          id="companion-otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="••••••"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="text-center font-mono text-2xl tracking-[0.5em]"
          autoFocus
        />
      </div>
    </StepForm>
  );
}

/** Whole seconds until `until` (a timestamp), ticking down to 0. */
function useCountdown(until: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  return Math.min(RESEND_SECONDS, Math.max(0, Math.ceil((until - now) / 1000)));
}
