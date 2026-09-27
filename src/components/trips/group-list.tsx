import type { GroupMember } from "@/lib/trips/types";
import { CompatibilityBadge } from "./compatibility-badge";
import { ReportForm } from "./report-form";
import { TagList } from "./tag-list";

export function GroupList({
  members,
  myPersonality,
  tripId,
  canReport,
}: {
  members: GroupMember[];
  myPersonality: string[];
  tripId: string;
  /** Only travellers on the trip can report other members. */
  canReport: boolean;
}) {
  if (!members.length) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No one has booked yet — be the first and set the vibe.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {members.map((m) => (
        <li key={m.userId} className="rounded-xl border bg-card p-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-full bg-muted font-semibold"
            >
              {m.firstName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {m.firstName}
                {m.age !== null && <span className="text-muted-foreground">, {m.age}</span>}
                {m.isYou && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
              </p>
              {m.city && <p className="text-sm text-muted-foreground">{m.city}</p>}
            </div>
            <CompatibilityBadge value={m.compatibility} />
          </div>
          <TagList tags={m.personality} highlight={m.isYou ? [] : myPersonality} className="mt-3" />
          {canReport && !m.isYou && (
            <div className="mt-3">
              <ReportForm reportedId={m.userId} reportedName={m.firstName} tripId={tripId} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
