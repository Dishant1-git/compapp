import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { PERSONALITIES } from "@/lib/trips/constants";
import type { TripFilters as Filters } from "@/lib/trips/queries";

const BUDGETS = [5000, 8000, 10000, 15000, 25000];

function upcomingMonths(count = 6) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    return {
      value: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }),
    };
  });
}

/** Plain GET form: filters live in the URL, so results are shareable and work without JS. */
export function TripFilters({ filters, origins }: { filters: Filters; origins: string[] }) {
  const active = Object.values(filters).some(Boolean);

  return (
    <form role="search" className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-6">
      <label className="sm:col-span-2 lg:col-span-2">
        <span className="sr-only">Destination</span>
        <Input name="q" type="search" placeholder="Where to? e.g. Manali, Goa" defaultValue={filters.q} />
      </label>

      <label>
        <span className="sr-only">Leaving from</span>
        <Select name="from" defaultValue={filters.from ?? ""}>
          <option value="">Any departure city</option>
          {origins.map((o) => (
            <option key={o} value={o}>
              From {o}
            </option>
          ))}
        </Select>
      </label>

      <label>
        <span className="sr-only">Month</span>
        <Select name="month" defaultValue={filters.month ?? ""}>
          <option value="">Any month</option>
          {upcomingMonths().map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </label>

      <label>
        <span className="sr-only">Budget</span>
        <Select name="maxPrice" defaultValue={filters.maxPrice ? String(filters.maxPrice) : ""}>
          <option value="">Any budget</option>
          {BUDGETS.map((b) => (
            <option key={b} value={b}>
              Up to ₹{b.toLocaleString("en-IN")}
            </option>
          ))}
        </Select>
      </label>

      <label>
        <span className="sr-only">Vibe</span>
        <Select name="vibe" defaultValue={filters.vibe ?? ""}>
          <option value="">Any vibe</option>
          {PERSONALITIES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
      </label>

      <div className="flex gap-2 sm:col-span-2 lg:col-span-6 lg:justify-end">
        {active && (
          <Link
            href="/trips"
            className="inline-flex h-11 items-center px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Clear
          </Link>
        )}
        <Button type="submit" className="flex-1 sm:flex-none">
          Search trips
        </Button>
      </div>
    </form>
  );
}
