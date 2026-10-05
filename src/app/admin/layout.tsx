import type { Metadata } from "next";
import { AdminSidebar, AdminTabs } from "@/components/admin/admin-nav";
import { AppHeader } from "@/components/layout/app-header";
import { Container } from "@/components/ui/container";
import { countPendingAgeChecks, countPendingSelfies } from "@/lib/admin/queries";
import { requireRole } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/mongoose";
import { Agency } from "@/lib/db/models/agency";
import { Report } from "@/lib/db/models/report";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireRole(["admin"], "/admin");
  await connectDB();
  const [pendingAgencies, openReports, pendingSelfies, pendingAgeChecks] = await Promise.all([
    Agency.countDocuments({ status: "pending" }),
    Report.countDocuments({ status: "open" }),
    countPendingSelfies(),
    countPendingAgeChecks(),
  ]);
  // Things waiting on an admin, shown as counts in the nav.
  const badges = {
    "/admin/agencies": pendingAgencies,
    "/admin/reports": openReports,
    "/admin/verifications": pendingSelfies,
    "/admin/age-checks": pendingAgeChecks,
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
