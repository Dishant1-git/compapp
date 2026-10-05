import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav, ICONS, type NavLink } from "@/components/layout/app-nav";
import { Container } from "@/components/ui/container";
import { getMyAgency, requireRole } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: { default: "Agency dashboard", template: "%s | Agency" },
};

const links: NavLink[] = [
  { href: "/agency", label: "Dashboard", icon: ICONS.dashboard, exact: true },
  { href: "/agency/trips/new", label: "New trip", icon: ICONS.plus },
  { href: "/agency/billing", label: "Billing", icon: ICONS.payments },
  { href: "/agency/profile", label: "Profile", icon: ICONS.profile },
  { href: "/trips", label: "Browse", icon: ICONS.explore },
];

const STATUS_COPY = {
  pending: "Your agency is waiting for admin approval. You can complete your profile, but you can't publish trips yet.",
  rejected: "Your agency application was not approved. Update your details in Profile to request another review.",
  suspended: "Your agency is suspended. Your trips are hidden from travellers. Contact support for help.",
} as const;

export default async function AgencyLayout({ children }: LayoutProps<"/agency">) {
  const user = await requireRole(["agency"], "/agency");
  const agency = await getMyAgency(user.id);

  return (
    <>
      <AppHeader section="Agency" links={links} userId={user.id} />
      {agency && agency.status !== "approved" && (
        <div role="status" className="border-b bg-muted">
          <Container className="py-3 text-sm">
            <span className="font-semibold capitalize">{agency.status}: </span>
            {STATUS_COPY[agency.status]}
            {agency.reviewNote && <span className="text-muted-foreground"> Note from admin: “{agency.reviewNote}”</span>}
          </Container>
        </div>
      )}
      <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-16">{children}</main>
      <BottomNav links={links} label="Agency" />
    </>
  );
}
