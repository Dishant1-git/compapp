import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/trips/page-header";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { homeFor, requireUser } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/mongoose";
import { markAllNotificationsRead } from "@/lib/notification-actions";
import { listNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Notifications",
};

const when = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  await connectDB();
  const items = await listNotifications(user.id);
  const unread = items.filter((n) => !n.read).length;
  const home = homeFor(user.role);

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <Container className="flex h-16 items-center justify-between">
          <Logo />
          <Link href={home} className="text-sm font-medium text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
        </Container>
      </header>

      <main className="flex-1 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <Container className="max-w-2xl py-6 sm:py-10">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notifications</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {unread ? `${unread} unread` : "You're all caught up."}
              </p>
            </div>
            {unread > 0 && (
              <form action={markAllNotificationsRead}>
                <Button type="submit" size="sm" variant="outline">
                  Mark all read
                </Button>
              </form>
            )}
          </div>

          {items.length ? (
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {items.map((n) => {
                const body = (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <p className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</p>
                      {!n.read && <span aria-label="Unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                    {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{when.format(new Date(n.createdAt))}</p>
                  </>
                );
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link href={n.href} className="block p-4 transition-colors hover:bg-muted">
                        {body}
                      </Link>
                    ) : (
                      <div className="p-4">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No notifications yet" description="Bookings, approvals and requests will show up here." />
          )}
        </Container>
      </main>
    </>
  );
}
