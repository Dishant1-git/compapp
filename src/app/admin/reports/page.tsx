import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, FilterTabs, one } from "@/components/admin/ui";
import { EmptyState } from "@/components/trips/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resolveReport } from "@/lib/admin/actions";
import { listReports } from "@/lib/admin/queries";
import { REPORT_REASONS } from "@/lib/trips/constants";
import { formatDate } from "@/lib/trips/format";

export const metadata: Metadata = { title: "Reports" };

const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  const params = await searchParams;
  const status = one(params.status) ?? "open";
  const reports = await listReports({
    status: ["open", "reviewed", "dismissed"].includes(status) ? status : undefined,
  });

  return (
    <>
      <AdminHeader
        title="Safety reports"
        description="Upholding a report lowers the user's trust score. Suspend repeat offenders from their user page."
      />
      <FilterTabs
        base="/admin/reports"
        param="status"
        current={status}
        options={[
          { value: "open", label: "Open" },
          { value: "reviewed", label: "Upheld" },
          { value: "dismissed", label: "Dismissed" },
          { value: "all", label: "All" },
        ]}
      />

      <div className="mt-4">
        {reports.length ? (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{reasonLabel(r.reason)}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.reported ? (
                        <Link href={`/admin/users/${r.reported.id}`} className="font-medium text-foreground underline underline-offset-4">
                          {r.reported.name}
                        </Link>
                      ) : (
                        "Deleted user"
                      )}{" "}
                      reported by{" "}
                      {r.reporter ? (
                        <Link href={`/admin/users/${r.reporter.id}`} className="underline underline-offset-4">
                          {r.reporter.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                      {r.trip && (
                        <>
                          {" "}on{" "}
                          <Link href={`/trips/${r.trip.slug}`} className="underline underline-offset-4">
                            {r.trip.title}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.reported?.status === "suspended" && <Badge status="suspended">User suspended</Badge>}
                    <Badge
                      status={r.status}
                      tone={r.status === "reviewed" ? "danger" : r.status === "open" ? "warning" : "neutral"}
                    >
                      {r.status === "reviewed" ? "Upheld" : r.status}
                    </Badge>
                  </div>
                </div>
                {r.details && <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">{r.details}</p>}
                <p className="mt-2 text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>

                {r.status === "open" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <form action={resolveReport.bind(null, r.id, "reviewed")}>
                      <Button type="submit" size="sm">
                        Uphold
                      </Button>
                    </form>
                    <form action={resolveReport.bind(null, r.id, "dismissed")}>
                      <Button type="submit" size="sm" variant="outline">
                        Dismiss
                      </Button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No reports here" description="Reports from travellers will appear here for review." />
        )}
      </div>
    </>
  );
}
