import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { logout } from "@/lib/auth/actions";
import { DesktopNav, type NavLink } from "./app-nav";
import { NotificationBell } from "./notification-bell";

/** Header for the signed-in agency and admin areas. */
export function AppHeader({
  section,
  links,
  userId,
}: {
  section: string;
  links: NavLink[];
  userId: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Logo />
          <span className="border-l pl-3 text-sm font-medium text-muted-foreground">{section}</span>
        </div>
        <DesktopNav links={links} />
        <div className="flex items-center gap-1">
          <NotificationBell userId={userId} />
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Log out
            </Button>
          </form>
        </div>
      </Container>
    </header>
  );
}
