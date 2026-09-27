import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, Table, Td, Th } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { ReasonForm } from "@/components/ui/reason-form";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { setAgencyStatus } from "@/lib/admin/actions";
import { getAdminAgency } from "@/lib/admin/queries";
import { formatDate, formatDateRange, formatPrice } from "@/lib/trips/format";

export const metadata: Metadata = { title: "Agency" };

export default async function AdminAgencyPage({ params }: PageProps<"/admin/agencies/[id]">) {
  const { id } = await params;
  const data = await getAdminAgency(id);
  if (!data) notFound();
  const { profile, owner, stats, trips } = data;

  return (
    <>
      <Link href="/admin/agencies" className="mt-6 inline-block text-sm text-muted-foreground hover:text-foreground lg:mt-0">
        ← Agencies
      </Link>
      <AdminHeader
        title={profile.name}
        description={`${profile.city} · applied ${formatDate(profile.createdAt)}`}
        actions={<Badge status={profile.status} className="self-start text-sm" />}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold">Details</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="Registration no. / GSTIN" value={profile.registrationNumber || "—"} />
              <Detail label="Phone" value={profile.phone} />
              <Detail label="Email" value={profile.email} />
              <Detail
                label="Website"
                value={
                  profile.website ? (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                      {profile.website}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <Detail
                label="Owner"
                value={
                  owner ? (
                    <Link href={`/admin/users/${owner.id}`} className="underline underline-offset-4">
                      {owner.name} ({owner.email})
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <Detail
                label="Last review"
                value={data.reviewedAt ? `${formatDate(data.reviewedAt)}${data.reviewedBy ? ` by ${data.reviewedBy}` : ""}` : "Never"}
              />
            </dl>
            {profile.description && <p className="mt-4 text-sm leading-relaxed">{profile.description}</p>}
            {profile.reviewNote && (
              <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm">Review note: {profile.reviewNote}</p>
            )}
          </section>

          <StatGrid>
            <StatCard label="Upcoming trips" value={stats.upcomingTrips} />
            <StatCard label="Travellers" value={stats.travellers} />
            <StatCard label="Interested" value={stats.interested} />
            <StatCard label="Booked value" value={formatPrice(stats.bookedValue)} />
          </StatGrid>

          <section>
            <h2 className="mb-3 font-semibold">Trips ({trips.length})</h2>
            <Table>
              <thead>
                <tr>
                  <Th>Trip</Th>
                  <Th>Dates</Th>
                  <Th className="text-right">Booked</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t.id}>
                    <Td>
                      <Link href={`/trips/${t.slug}`} className="font-medium hover:underline">
                        {t.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {t.origin} → {t.destination} · {formatPrice(t.price)}
                      </p>
                    </Td>
                    <Td className="whitespace-nowrap">{formatDateRange(t.startDate, t.endDate)}</Td>
                    <Td className="text-right tabular-nums">
                      {t.bookedCount}/{t.maxGroupSize}
                    </Td>
                    <Td>
                      <Badge status={t.status} />
                    </Td>
                  </tr>
                ))}
                {!trips.length && (
                  <tr>
                    <Td colSpan={4} className="py-8 text-center text-muted-foreground">
                      No trips yet.
                    </Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </section>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
          <h2 className="font-semibold">Actions</h2>
          {profile.status !== "approved" && (
            <ReasonForm
              action={setAgencyStatus.bind(null, profile.id, "approved")}
              trigger="Approve agency"
              label="Note to the agency (optional)"
              field="note"
              required={false}
              submitLabel="Approve"
              variant="primary"
            />
          )}
          {profile.status === "pending" && (
            <ReasonForm
              action={setAgencyStatus.bind(null, profile.id, "rejected")}
              trigger="Reject application"
              label="Reason (shown to the agency)"
              field="note"
              placeholder="e.g. Registration number couldn't be verified."
              submitLabel="Reject"
            />
          )}
          {profile.status === "approved" && (
            <ReasonForm
              action={setAgencyStatus.bind(null, profile.id, "suspended")}
              trigger="Suspend agency"
              label="Reason (shown to the agency)"
              field="note"
              submitLabel="Suspend"
              confirmText="Suspend this agency? Its trips will be hidden from travellers."
            />
          )}
          <p className="text-xs text-muted-foreground">
            Suspending hides all of the agency&apos;s trips. Existing bookings are kept so travellers can still reach the group chat.
          </p>
        </aside>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">{value}</dd>
    </div>
  );
}
