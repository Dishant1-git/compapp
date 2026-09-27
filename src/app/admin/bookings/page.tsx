import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, FilterTabs, Table, Td, Th, one } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { listBookings } from "@/lib/admin/queries";
import { formatDate, formatPrice } from "@/lib/trips/format";

export const metadata: Metadata = { title: "Bookings" };

export default async function AdminBookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const params = await searchParams;
  const status = one(params.status);
  const payment = one(params.payment);
  const bookings = await listBookings({
    status: status === "confirmed" || status === "cancelled" ? status : undefined,
    payment: payment === "paid" || payment === "unpaid" ? payment : undefined,
  });
  const total = bookings.filter((b) => b.status === "confirmed").reduce((sum, b) => sum + b.amount, 0);

  return (
    <>
      <AdminHeader title="Bookings" description="Every seat booked across all trips (newest first)." />
      <div className="space-y-3">
        <FilterTabs
          base="/admin/bookings"
          param="status"
          current={status}
          keep={{ payment }}
          options={[
            { value: "", label: "All" },
            { value: "confirmed", label: "Confirmed" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
        <FilterTabs
          base="/admin/bookings"
          param="payment"
          current={payment}
          keep={{ status }}
          options={[
            { value: "", label: "Any payment" },
            { value: "paid", label: "Paid" },
            { value: "unpaid", label: "Unpaid" },
          ]}
        />
      </div>

      <p className="mt-4 mb-2 text-sm text-muted-foreground">
        {bookings.length} bookings · {formatPrice(total)} confirmed value
      </p>
      <Table>
        <thead>
          <tr>
            <Th>Traveller</Th>
            <Th>Trip</Th>
            <Th className="text-right">Amount</Th>
            <Th>Status</Th>
            <Th>Payment</Th>
            <Th>Booked</Th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <Td>
                {b.traveller ? (
                  <>
                    <Link href={`/admin/users/${b.traveller.id}`} className="font-medium hover:underline">
                      {b.traveller.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{b.traveller.email}</p>
                  </>
                ) : (
                  "—"
                )}
              </Td>
              <Td>
                {b.trip ? (
                  <>
                    <Link href={`/trips/${b.trip.slug}`} className="hover:underline">
                      {b.trip.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">Starts {formatDate(b.trip.startDate)}</p>
                  </>
                ) : (
                  "—"
                )}
              </Td>
              <Td className="text-right tabular-nums">{formatPrice(b.amount)}</Td>
              <Td>
                <Badge status={b.status} />
                {b.cancelledBy && <p className="mt-1 text-xs text-muted-foreground">by {b.cancelledBy}</p>}
              </Td>
              <Td>
                <Badge status={b.paymentStatus} />
              </Td>
              <Td className="whitespace-nowrap text-muted-foreground">{formatDate(b.createdAt)}</Td>
            </tr>
          ))}
          {!bookings.length && (
            <tr>
              <Td colSpan={6} className="py-8 text-center text-muted-foreground">
                No bookings found.
              </Td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
}
