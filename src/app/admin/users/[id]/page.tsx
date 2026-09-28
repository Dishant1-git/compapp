import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, Table, Td, Th } from "@/components/admin/ui";
import { TagList } from "@/components/trips/tag-list";
import { TrustScoreCard } from "@/components/trips/trust-score-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setUserRole, setUserStatus } from "@/lib/admin/actions";
import { getAdminUser } from "@/lib/admin/queries";
import { requireRole } from "@/lib/auth/dal";
import { REPORT_REASONS } from "@/lib/trips/constants";
import { formatDate, formatDateRange, formatPrice } from "@/lib/trips/format";

export const metadata: Metadata = { title: "User" };

const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;

export default async function AdminUserPage({ params }: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  const admin = await requireRole(["admin"]);
  const u = await getAdminUser(id);
  if (!u) notFound();
  const p = u.profile;
  const isSelf = admin.id === u.id;

  return (
    <>
      <Link href="/admin/users" className="mt-6 inline-block text-sm text-muted-foreground hover:text-foreground lg:mt-0">
        ← Users
      </Link>
      <AdminHeader
        title={p.name}
        description={`${p.email || p.phone || "No email"} · joined ${formatDate(u.createdAt)}`}
        actions={
          <div className="flex gap-2">
            <Badge className="capitalize">{u.role === "user" ? "traveller" : u.role}</Badge>
            <Badge status={u.status} />
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-8">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold">Profile</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="Phone" value={p.phone || "—"} />
              <Detail label="City" value={p.city || "—"} />
              <Detail label="Birth year" value={p.birthYear ?? "—"} />
              <Detail label="Gender" value={p.gender} />
              <Detail
                label="Emergency contact"
                value={p.emergencyContact.name ? `${p.emergencyContact.name} · ${p.emergencyContact.phone}` : "—"}
              />
              <Detail label="Platforms" value={u.platforms.join(", ") || "—"} />
              {u.agency && (
                <Detail
                  label="Agency"
                  value={
                    <Link href={`/admin/agencies/${u.agency.id}`} className="underline underline-offset-4">
                      {u.agency.name} ({u.agency.status})
                    </Link>
                  }
                />
              )}
            </dl>
            {p.bio && <p className="mt-4 text-sm">{p.bio}</p>}
            {p.personality.length > 0 && <TagList tags={p.personality} className="mt-4" />}
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Bookings ({u.bookings.length})</h2>
            <Table>
              <thead>
                <tr>
                  <Th>Trip</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Payment</Th>
                  <Th>Booked</Th>
                </tr>
              </thead>
              <tbody>
                {u.bookings.map((b) => (
                  <tr key={b.id}>
                    <Td>
                      {b.trip ? (
                        <Link href={`/trips/${b.trip.slug}`} className="font-medium hover:underline">
                          {b.trip.title}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td className="tabular-nums">{formatPrice(b.amount)}</Td>
                    <Td>
                      <Badge status={b.status} />
                    </Td>
                    <Td>
                      <Badge status={b.paymentStatus} />
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{formatDate(b.createdAt)}</Td>
                  </tr>
                ))}
                {!u.bookings.length && (
                  <tr>
                    <Td colSpan={5} className="py-6 text-center text-muted-foreground">
                      No bookings.
                    </Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Reports against this user ({u.reportsAgainst.length})</h2>
            {u.reportsAgainst.length ? (
              <ul className="space-y-2">
                {u.reportsAgainst.map((r) => (
                  <li key={r.id} className="rounded-xl border bg-card p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{reasonLabel(r.reason)}</p>
                      <Badge status={r.status === "reviewed" ? "upheld" : r.status} tone={r.status === "reviewed" ? "danger" : undefined} />
                    </div>
                    {r.details && <p className="mt-1">{r.details}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      By {r.reporter?.name ?? "—"} · {formatDate(r.createdAt)}
                      {r.trip ? ` · ${r.trip.title}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">None.</p>
            )}
          </section>

          {u.plans.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold">Travel plans ({u.plans.length})</h2>
              <ul className="divide-y rounded-xl border bg-card text-sm">
                {u.plans.map((pl) => (
                  <li key={pl.id} className="flex justify-between gap-3 px-4 py-3">
                    <span>
                      {pl.origin} → {pl.destination}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDateRange(pl.startDate, pl.endDate)} · {pl.status}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <TrustScoreCard trust={p.trust} verification={p.verification} />

          {!isSelf && (
            <section className="space-y-2 rounded-xl border bg-card p-5">
              <h2 className="font-semibold">Actions</h2>
              <form action={setUserStatus.bind(null, u.id, u.status === "suspended" ? "active" : "suspended")}>
                <Button type="submit" variant="outline" fullWidth>
                  {u.status === "suspended" ? "Reactivate account" : "Suspend account"}
                </Button>
              </form>
              {u.role !== "agency" && (
                <form action={setUserRole.bind(null, u.id, u.role === "admin" ? "user" : "admin")}>
                  <Button type="submit" variant="outline" fullWidth>
                    {u.role === "admin" ? "Remove admin access" : "Make admin"}
                  </Button>
                </form>
              )}
              <p className="text-xs text-muted-foreground">Suspended users are signed out and can&apos;t log in.</p>
            </section>
          )}
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
