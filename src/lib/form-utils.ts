import { isPersonality } from "@/lib/trips/constants";

// Shared parsing/validation helpers for Server Actions.

export const PHONE_RE = /^\+?[0-9][0-9\s-]{7,15}$/;
export const ID_RE = /^[a-f\d]{24}$/i;

export function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function personalities(formData: FormData, key: string) {
  return [...new Set(formData.getAll(key).map(String).filter(isPersonality))];
}

export function lines(value: string) {
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Parse yyyy-mm-dd as a UTC date, or null. */
export function dateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(+date) ? null : date;
}

export function todayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Echo every non-file field back to the form (passwords never pass through here). */
export function echo(formData: FormData) {
  const values: Record<string, string | string[]> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const all = formData.getAll(key).filter((v): v is string => typeof v === "string");
    values[key] = all.length > 1 ? all : (all[0] ?? "");
  }
  return values;
}

export function hasErrors(errors: Record<string, string[]>) {
  return Object.keys(errors).length > 0;
}
