import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { logout } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: { default: "Companion", template: "%s | Companion" },
};

export default async function CompanionLayout({ children }: LayoutProps<"/companion">) {
  const user = await getCurrentUser();

  return (
    <>
      <header className="border-b pt-[env(safe-area-inset-top)]">
        <Container className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <span className="border-l pl-3 text-sm font-medium text-muted-foreground">Companion</span>
          </div>
          {user && (
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                Log out
              </Button>
            </form>
          )}
        </Container>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
