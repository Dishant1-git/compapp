import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GroupChat } from "@/components/trips/group-chat";
import { EmptyState } from "@/components/trips/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/lib/auth/dal";
import { getGroupPage } from "@/lib/trips/chat";
import { formatDateRange } from "@/lib/trips/format";

export const metadata: Metadata = {
  title: "Group chat",
};

export default async function GroupPage({ params }: PageProps<"/trips/[slug]/group">) {
  const { slug } = await params;
  const viewer = await requireUser(`/trips/${slug}/group`);

  const group = await getGroupPage(slug, viewer);
  if (!group) notFound();
  const { trip, chat } = group;

  if (!chat) {
    return (
      <Container className="py-10">
        <EmptyState
          title="This group is for travellers on the trip"
          description="Book a seat to join the group chat and meet your fellow travellers."
          action={<ButtonLink href={`/trips/${slug}`}>View trip</ButtonLink>}
        />
      </Container>
    );
  }

  const { messages, members } = chat;

  return (
    <Container className="max-w-3xl py-4 sm:py-8">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/trips/${slug}`}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Trip details
          </Link>
          <h1 className="mt-1 truncate text-xl font-bold tracking-tight sm:text-2xl">{trip.title}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDateRange(trip.startDate, trip.endDate)} · {members} traveller
            {members === 1 ? "" : "s"} + agency
          </p>
        </div>
      </div>

      {trip.status === "cancelled" && (
        <p className="mb-3 rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive">
          This trip was cancelled.
        </p>
      )}

      <GroupChat tripId={trip.id} initial={messages} canPost={chat.canPost} />
      <p className="mt-2 text-xs text-muted-foreground">
        Be kind. Never share OTPs or send money to anyone in the chat — pay only the agency.
      </p>
    </Container>
  );
}
