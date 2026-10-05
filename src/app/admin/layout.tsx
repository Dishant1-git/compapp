import type { Metadata } from "next";
import { AdminSidebar, AdminTabs } from "@/components/admin/admin-nav";
import { AppHeader } from "@/components/layout/app-header";
import { Container } from "@/components/ui/container";
import { countAdminBadges } from "@/lib/admin/queries";
import { requireRole } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireRole(["admin"], "/admin");
  const counts = await countAdminBadges();
  // Things waiting on an admin, shown as counts in the nav.
  const badges = {
    "/admin/agencies": counts.agencies,
    "/admin/reports": counts.reports,
    "/admin/verifications": counts.selfies,
    "/admin/age-checks": counts.ageChecks,
  };

  return (
    <>
      <AppHeader section="Admin" links={[]} userId={user.id} />
      <AdminTabs badges={badges} />
      <Container className="grid flex-1 gap-8 pb-16 lg:grid-cols-[200px_minmax(0,1fr)] lg:pt-8">
        <AdminSidebar badges={badges} />
        <main className="min-w-0">{children}</main>
      </Container>
    </>
  );
}
