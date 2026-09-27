import Link from "next/link";
import { AdminHeader, Table, Td, Th } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { getAdminStats } from "@/lib/admin/queries";
import { formatDate, formatPrice } from "@/lib/trips/format";

export default async function AdminOverviewPage() {
  const s = await getAdminStats();

  return (
    <>
      <AdminHeader title="Overview" description="Everything happening on the platform." />

      <StatGrid>
        <StatCard label="Users" value={s.users.total} hint={`+${s.users.newThisWeek} this week`} href="/admin/users" />
        <StatCard
          label="Approved agencies"
          value={s.agencies.approved}
          hint={`${s.agencies.pending} pending review`}
          href="/admin/agencies"
        />
        <StatCard label="Upcoming trips" value={s.trips.upcoming} hint={`${s.trips.cancelled} cancelled`} href="/admin/trips" />
        <StatCard
          label="Confirmed bookings"
          value={s.bookings.confirmed}
          hint={`${s.bookings.cancelled} cancelled`}
          href="/admin/bookings"
        />
        <StatCard
          label="Booked value"
          value={formatPrice(s.bookings.bookedValue)}
          hint={`${formatPrice(s.bookings.paidValue)} marked paid`}
        />
        <StatCard label="Travellers" value={s.users.travellers} hint={`${s.users.suspended} suspended users`} />
        <StatCard label="Open reports" value={s.openReports} href="/admin/reports" />
        <StatCard label="Active buddy plans" value={s.activePlans} />
      </StatGrid>

      <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Latest bookings</h2>
            <Link href="/admin/bookings" className="text-sm text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Traveller</Th>
                <Th>Trip</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody>
              {s.recentBookings.map((b) => (
                <tr key={b.id}>
                  <Td>
                    {b.traveller ? (
                      <Link href={`/admin/users/${b.traveller.id}`} className="font-medium hover:underline">
                        {b.traveller.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>{b.trip ? <Link href={`/trips/${b.trip.slug}`} className="hover:underline">{b.trip.title}</Link> : "—"}</Td>
                  <Td className="tabular-nums">{formatPrice(b.amount)}</Td>
                  <Td>
                    <Badge status={b.status} />
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{formatDate(b.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Agencies awaiting approval</h2>
          {s.pendingAgencies.length ? (
            <ul className="divide-y rounded-xl border bg-card">
              {s.pendingAgencies.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.city} · applied {formatDate(a.createdAt)}
                    </p>
                  </div>
                  <ButtonLink href={`/admin/agencies/${a.id}`} size="sm">
                    Review
                  </ButtonLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nothing to review.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
