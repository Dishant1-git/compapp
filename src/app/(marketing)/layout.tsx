import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Theme } from "@/components/layout/theme";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Theme world="brand">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </Theme>
  );
}
