import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, FilterTabs, one } from "@/components/admin/ui";
import { EmptyState } from "@/components/trips/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReasonForm } from "@/components/ui/reason-form";
import { approveSelfie, rejectSelfie } from "@/lib/admin/actions";
import { listSelfieReviews, type AdminSelfieReview } from "@/lib/admin/queries";
import { formatDate } from "@/lib/trips/format";

export const metadata: Metadata = { title: "Photo verification" };

const STATUSES: AdminSelfieReview["status"][] = ["pending", "verified", "rejected"];

const matchLabel = (d: number) => (d <= 0.45 ? "strong" : d <= 0.6 ? "unsure" : "weak");

export default async function AdminVerificationsPage({ searchParams }: PageProps<"/admin/verifications">) {
  const params = await searchParams;
  const requested = one(params.status) as AdminSelfieReview["status"] | undefined;
  const status = requested && STATUSES.includes(requested) ? requested : "pending";
  const reviews = await listSelfieReviews(status);

  return (
    <>
      <AdminHeader
        title="Photo verification"
        description="Clear matches and mismatches are decided automatically. Selfies the face check wasn't sure about wait here: check it's the same person as the profile photos, doing the requested pose."
      />
      <FilterTabs
        base="/admin/verifications"
        param="status"
        current={status}
        options={[
          { value: "pending", label: "To review" },
          { value: "verified", label: "Verified" },
          { value: "rejected", label: "Rejected" },
        ]}
      />

      <div className="mt-4">
        {reviews.length ? (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.profileId} className="rounded-xl border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    {r.user.id ? (
                      <Link href={`/admin/users/${r.user.id}`} className="font-semibold hover:underline">
                        {r.user.name}
                      </Link>
                    ) : (
                      <p className="font-semibold">{r.user.name}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {[r.user.phone, r.submittedAt && `submitted ${formatDate(r.submittedAt)}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Badge status={r.status === "verified" ? "approved" : r.status}>{r.status}</Badge>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element -- private, admin-only image */}
                    <img
                      src={r.selfieUrl}
                      alt={`Live selfie of ${r.user.name}`}
                      className="aspect-[3/4] w-full rounded-lg bg-muted object-cover"
                    />
                    <figcaption className="mt-2 text-sm">
                      <span className="text-muted-foreground">Asked to:</span> {r.pose}
                    </figcaption>
                  </figure>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Profile photos</p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {r.photoUrls.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element -- private, auth-gated image
                        <img
                          key={url}
                          src={url}
                          alt={`${r.user.name}, profile photo ${i + 1}`}
                          className="aspect-[3/4] w-full rounded-lg bg-muted object-cover"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {r.matchDistance !== undefined && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Automatic face match:{" "}
                    <span className="font-medium text-foreground">{matchLabel(r.matchDistance)}</span> (distance{" "}
                    {r.matchDistance.toFixed(2)}; under 0.45 is auto-verified, over 0.60 auto-rejected)
                  </p>
                )}
                {r.note && <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm">Reason given: {r.note}</p>}

                {r.status === "pending" && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 sm:items-start">
                    <form action={approveSelfie.bind(null, r.profileId, r.selfieId)}>
                      <Button type="submit" size="md" fullWidth>
                        Approve — same person
                      </Button>
                    </form>
                    <ReasonForm
                      action={rejectSelfie.bind(null, r.profileId, r.selfieId)}
                      trigger="Reject"
                      field="note"
                      label="Reason (they'll see this)"
                      placeholder="e.g. Face not clearly visible, or pose not followed"
                      submitLabel="Reject selfie"
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={status === "pending" ? "Nothing to review" : `No ${status} selfies`}
            description="New Companion selfies appear here as soon as they're submitted."
          />
        )}
      </div>
    </>
  );
}
