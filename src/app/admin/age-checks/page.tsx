import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, FilterTabs, one } from "@/components/admin/ui";
import { EmptyState } from "@/components/trips/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReasonForm } from "@/components/ui/reason-form";
import { approveAgeCheck, rejectAgeCheck, requestNewAgeDocument } from "@/lib/admin/actions";
import { listAgeChecks } from "@/lib/admin/queries";
import {
  ADULT_AGE,
  AGE_CHECK_LABELS,
  GROUP_MIN_ADULTS,
  type AgeCheckStatus,
} from "@/lib/payments/pricing";
import { formatDate, formatPrice } from "@/lib/trips/format";

export const metadata: Metadata = { title: "Age checks" };

const STATUSES: AgeCheckStatus[] = ["pending", "required", "verified", "rejected"];

export default async function AdminAgeChecksPage({ searchParams }: PageProps<"/admin/age-checks">) {
  const params = await searchParams;
  const requested = one(params.status) as AgeCheckStatus | undefined;
  const status = requested && STATUSES.includes(requested) ? requested : "pending";
  const checks = await listAgeChecks(status);

  return (
    <>
      <AdminHeader
        title="Age checks"
        description={`Travellers upload a photo ID after paying the seat fee. Check the name and date of birth against what they declared. Solo travellers must meet the trip's minimum age; a group needs ${GROUP_MIN_ADULTS} people aged ${ADULT_AGE} or older. The photos are deleted once you decide.`}
      />
      <FilterTabs
        base="/admin/age-checks"
        param="status"
        current={status}
        options={[
          { value: "pending", label: "To review" },
          { value: "required", label: "Waiting for ID" },
          { value: "verified", label: "Verified" },
          { value: "rejected", label: "Failed" },
        ]}
      />

      <div className="mt-4">
        {checks.length ? (
          <ul className="space-y-4">
            {checks.map((c) => (
              <li key={c.bookingId} className="rounded-xl border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    {c.user ? (
                      <Link href={`/admin/users/${c.user.id}`} className="font-semibold hover:underline">
                        {c.user.name}
                      </Link>
                    ) : (
                      <p className="font-semibold">Deleted user</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {[
                        c.user?.phone,
                        c.trip && `${c.trip.title} · starts ${formatDate(c.trip.startDate)} · ${c.trip.minAge}+`,
                        c.seats > 1 && `group of ${c.seats}`,
                        c.submittedAt && `sent ${formatDate(c.submittedAt)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Badge status={c.status === "verified" ? "approved" : c.status === "required" ? "pending" : c.status}>
                    {AGE_CHECK_LABELS[c.status]}
                  </Badge>
                </div>

                <table className="mt-4 w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="pb-1 font-medium">Traveller</th>
                      <th className="pb-1 font-medium">Declared date of birth</th>
                      <th className="pb-1 font-medium">Age</th>
                      <th className="pb-1 font-medium">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.travellers.map((t, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-1.5 pr-3">{t.name}</td>
                        <td className="py-1.5 pr-3">{t.birthDate ? formatDate(t.birthDate) : "—"}</td>
                        <td className="py-1.5 pr-3 tabular-nums">{t.age ?? "—"}</td>
                        <td className="py-1.5">{t.needsProof ? "Required" : "Not needed"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {c.documents.length > 0 && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {c.documents.map((d) => (
                      <figure key={d.url}>
                        <a href={d.url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element -- private, admin-only image */}
                          <img
                            src={d.url}
                            alt={`${d.docType} of ${c.travellers[d.traveller]?.name ?? "traveller"}`}
                            className="aspect-[3/2] w-full rounded-lg bg-muted object-contain"
                          />
                        </a>
                        <figcaption className="mt-2 text-sm">
                          <span className="text-muted-foreground">{d.docType}:</span>{" "}
                          {c.travellers[d.traveller]?.name ?? "Traveller"}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}
                {c.note && <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm">Note: {c.note}</p>}

                {c.status === "pending" && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-3 sm:items-start">
                    <form action={approveAgeCheck.bind(null, c.bookingId)}>
                      <Button type="submit" size="md" fullWidth>
                        Approve
                      </Button>
                    </form>
                    <ReasonForm
                      action={requestNewAgeDocument.bind(null, c.bookingId)}
                      trigger="Ask for a new photo"
                      field="note"
                      label="What to fix (they'll see this)"
                      placeholder="e.g. Date of birth is not readable"
                      submitLabel="Ask for a new photo"
                    />
                    <ReasonForm
                      action={rejectAgeCheck.bind(null, c.bookingId)}
                      trigger="Fail and cancel booking"
                      field="note"
                      label="Reason (they'll see this)"
                      placeholder="e.g. The ID shows you are under 18"
                      submitLabel="Cancel booking"
                      confirmText={`Cancel this booking? ${
                        c.refundIfRejected
                          ? `${formatPrice(c.refundIfRejected)} of the seat fee will be refunded.`
                          : "No refund is due this close to departure."
                      }`}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={status === "pending" ? "Nothing to review" : "Nothing here"}
            description="Age checks appear here as soon as travellers upload their ID."
          />
        )}
      </div>
    </>
  );
}
