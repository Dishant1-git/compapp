import type { TrustScore } from "@/lib/trips/trust";
import { cn } from "@/lib/utils";

export function TrustScoreCard({
  trust,
  verification,
}: {
  trust: TrustScore;
  verification: { email: boolean; phone: boolean; identity: boolean };
}) {
  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Trust score</h2>
        <p className="text-3xl font-bold">
          {trust.score}
          <span className="text-base font-medium text-muted-foreground">/100</span>
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-primary" style={{ width: `${trust.score}%` }} />
      </div>

      <ul className="mt-5 space-y-2 text-sm">
        {trust.items.map((item) => (
          <li key={item.label} className="flex justify-between gap-3">
            <span className={cn(item.points === 0 && "text-muted-foreground")}>{item.label}</span>
            <span className="font-medium tabular-nums">
              {item.points > 0 ? `+${item.points}` : item.points}
              {item.max > 0 && <span className="text-muted-foreground"> / {item.max}</span>}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap gap-2">
        {(
          [
            ["Email", verification.email],
            ["Phone", verification.phone],
            ["Identity", verification.identity],
          ] as const
        ).map(([label, ok]) => (
          <span
            key={label}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium",
              ok ? "border-primary" : "text-muted-foreground",
            )}
          >
            {label} {ok ? "verified" : "not verified"}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Verifying your email and phone raises your score.
      </p>
    </section>
  );
}
