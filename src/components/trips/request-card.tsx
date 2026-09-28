import { Button } from "@/components/ui/button";
import { respondToBuddyRequest } from "@/lib/trips/actions";
import { formatDateRange } from "@/lib/trips/format";
import type { BuddyRequestView } from "@/lib/trips/types";
import { TagList } from "./tag-list";

export function RequestCard({
  request,
  direction,
}: {
  request: BuddyRequestView;
  /** "incoming": someone asked to join my plan. "outgoing": I asked to join theirs. */
  direction: "incoming" | "outgoing";
}) {
  const { person, contact } = request;

  return (
    <li className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {person.firstName}
            {person.city && <span className="text-muted-foreground"> · {person.city}</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {direction === "outgoing" && `${request.plan.destination} · ${formatDateRange(request.plan.startDate, request.plan.endDate)} · `}
            Trust {person.trustScore}/100
          </p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize">{request.status}</span>
      </div>

      <TagList tags={person.personality} className="mt-3" />
      {request.message && <p className="mt-3 text-sm">“{request.message}”</p>}

      {contact && (
        <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
          <p className="font-medium">{contact.name}</p>
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="block underline underline-offset-4">
              {contact.email}
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="block underline underline-offset-4">
              {contact.phone}
            </a>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Meet in a public place first and share your plans with someone you trust.
          </p>
        </div>
      )}

      {direction === "incoming" && request.status === "pending" && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
          <form action={respondToBuddyRequest.bind(null, request.id, "accepted")}>
            <Button type="submit" size="sm" fullWidth>
              Accept
            </Button>
          </form>
          <form action={respondToBuddyRequest.bind(null, request.id, "declined")}>
            <Button type="submit" size="sm" variant="outline" fullWidth>
              Decline
            </Button>
          </form>
        </div>
      )}
    </li>
  );
}
