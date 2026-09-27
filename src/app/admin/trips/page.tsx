import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, FilterTabs, SearchBox, Table, Td, Th, one } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { ReasonForm } from "@/components/ui/reason-form";
import { cancelTripAsAdmin } from "@/lib/admin/actions";
import { listTrips } from "@/lib/admin/queries";
import { formatDateRange, formatPrice } from "@/lib/trips/format";

export const metadata: Metadata = { title: "Trips" };

const WHEN = ["upcoming", "past", "cancelled"];

export default async function AdminTripsPage({ searchParams }: PageProps<"/admin/trips">) {
  const params = await searchParams;
  const q = one(params.q);
  const when = one(params.when) ?? "upcoming";
  const trips = await listTrips({ q, when: WHEN.includes(when) ? when : undefined });

  return (
    <>
      <AdminHeader title="Trips" description="All trips from every agency." />
      <div className="space-y-3">
        <FilterTabs
          base="/admin/trips"
          param="when"
          current={when}
          keep={{ q }}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Past" },
            { value: "cancelled", label: "Cancelled" },
            { value: "all", label: "All" },
          ]}
        />
        <SearchBox placeholder="Search title or destination" defaultValue={q} keep={{ when }} />
      </div>

      <div className="mt-4">
        <Table>
          <thead>
            <tr>
              <Th>Trip</Th>
              <Th>Agency</Th>
              <Th>Dates</Th>
              <Th className="text-right">Seats</Th>
              <Th>Status</Th>
              <Th className="w-56">Action</Th>
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
                    {t.route} · {formatPrice(t.price)}
                  </p>
                </Td>
                <Td>
                  {t.agency ? (
                    <>
                      <Link href={`/admin/agencies/${t.agency.id}`} className="hover:underline">
                        {t.agency.name}
                      </Link>
                      {t.agency.status !== "approved" && (
                        <Badge status={t.agency.status} className="ml-2" />
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td className="whitespace-nowrap">{formatDateRange(t.startDate, t.endDate)}</Td>
                <Td className="text-right tabular-nums">
                  {t.booked}/{t.maxGroupSize}
                </Td>
                <Td>
                  <Badge status={t.status} />
                </Td>
                <Td>
                  {t.status === "open" && new Date(t.startDate) > new Date() && (
                    <ReasonForm
                      action={cancelTripAsAdmin.bind(null, t.id)}
                      trigger="Cancel trip"
                      label="Reason (shown to travellers and agency)"
                      submitLabel="Cancel trip"
                      confirmText={`Cancel "${t.title}"? All bookings will be cancelled.`}
                    />
                  )}
                </Td>
              </tr>
            ))}
            {!trips.length && (
              <tr>
                <Td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No trips found.
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </>
  );
}
