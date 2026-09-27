// Client-safe formatting helpers.

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number) {
  return inr.format(amount);
}

const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const dayMonthYear = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "12 Oct – 15 Oct 2026" */
export function formatDateRange(start: string | Date, end: string | Date) {
  return `${dayMonth.format(new Date(start))} – ${dayMonthYear.format(new Date(end))}`;
}

export function formatDate(date: string | Date) {
  return dayMonthYear.format(new Date(date));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "3 days / 2 nights" */
export function durationLabel(start: string | Date, end: string | Date) {
  const nights = Math.max(0, Math.round((+new Date(end) - +new Date(start)) / DAY_MS));
  const days = nights + 1;
  return `${days} day${days === 1 ? "" : "s"} / ${nights} night${nights === 1 ? "" : "s"}`;
}

/** yyyy-mm-dd for <input type="date">. */
export function toDateInput(date: string | Date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function ageFromBirthYear(birthYear?: number | null) {
  return birthYear ? new Date().getFullYear() - birthYear : null;
}

/** Only first names are shown to other travellers. */
export function firstName(name: string) {
  return name.trim().split(/\s+/)[0];
}
