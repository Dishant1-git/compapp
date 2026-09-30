import type { Metadata } from "next";
import Link from "next/link";
import { TripsBottomNav, TripsDesktopNav } from "@/components/trips/trips-nav";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { Theme } from "@/components/layout/theme";
import { logout } from "@/lib/auth/actions";
import { homeFor, requireUser } from "@/lib/auth/dal";
import { NotificationBell } from "@/components/layout/notification-bell";

export const metadata: Metadata = {
  title: { default: "Stranger Trips", template: "%s | Stranger Trips" },
};

export default async function TripsLayout({ children }: LayoutProps<"/trips">) {
  // Stranger Trips needs an account. Pages check too, with their exact URL for
  // the return trip; the proxy usually redirects before either runs.
  const user = await requireUser("/trips");

  return (
    <Theme world="trips">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <Container className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <span className="eyebrow hidden border-l pl-3 text-highlight-ink sm:inline">Stranger Trips</span>
          </div>

          <TripsDesktopNav />

          <div className="flex items-center gap-2">
            <NotificationBell userId={user.id} />
            {user.role === "user" ? (
              <Link
                href="/trips/profile"
                aria-label="Your profile"
                className="grid size-10 place-items-center rounded-full bg-muted text-sm font-semibold"
              >
                {user.name.charAt(0).toUpperCase()}
              </Link>
            ) : (
              <ButtonLink href={homeFor(user.role)} size="sm" variant="outline">
                {user.role === "admin" ? "Admin" : "Agency"}
              </ButtonLink>
            )}
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                Log out
              </Button>
            </form>
          </div>
        </Container>
      </header>

      {/* Bottom padding clears the mobile tab bar. */}
      <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-16">{children}</main>

      <TripsBottomNav />
    </Theme>
  );
}
