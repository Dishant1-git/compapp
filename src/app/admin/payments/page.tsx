import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, FilterTabs, Table, Td, Th, one } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { listPayments } from "@/lib/admin/queries";
import { formatDate, formatPrice } from "@/lib/trips/format";

export const metadata: Metadata = { title: "Payments" };

export default async function AdminPaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  const params = await searchParams;
  const requested = one(params.purpose);
  const purpose = requested === "agency_plan" || requested === "seat_fee" ? requested : undefined;
  const { rows, paid, refunded } = await listPayments({ purpose });

  return (
    <>
      <AdminHeader
        title="Payments"
        description="Money taken online: agency plans and traveller seat fees (newest first)."
      />
      <FilterTabs
        base="/admin/payments"
        param="purpose"
        current={purpose}
        options={[
          { value: "", label: "All" },
          { value: "agency_plan", label: "Agency plans" },
          { value: "seat_fee", label: "Seat fees" },
        ]}
      />

      <p className="mt-4 mb-2 text-sm text-muted-foreground">
        {formatPrice(paid)} received · {formatPrice(refunded)} refunded · {formatPrice(paid - refunded)} net
      </p>
      <Table>
        <thead>
          <tr>
            <Th>Paid by</Th>
            <Th>For</Th>
            <Th className="text-right">Amount</Th>
            <Th className="text-right">Refunded</Th>
            <Th>Status</Th>
            <Th>Date</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <Td>
                {p.payer ? (
                  <>
                    <Link href={`/admin/users/${p.payer.id}`} className="font-medium hover:underline">
                      {p.payer.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{p.payer.email}</p>
                  </>
                ) : (
                  "—"
                )}
              </Td>
              <Td>
                {p.what}
                <p className="text-xs text-muted-foreground">
                  {p.gateway === "dev" ? "Simulated (test mode)" : (p.paymentId ?? p.orderId)}
                </p>
                {p.problem && <p className="mt-1 text-xs text-destructive">{p.problem}</p>}
              </Td>
              <Td className="text-right tabular-nums">{formatPrice(p.amount)}</Td>
              <Td className="text-right tabular-nums">
                {p.refundedAmount ? formatPrice(p.refundedAmount) : "—"}
                {p.failedRefund > 0 && (
                  <p className="text-xs text-destructive">
                    {formatPrice(p.failedRefund)} refund failed: refund it in the Razorpay dashboard
                  </p>
                )}
              </Td>
              <Td>
                <Badge status={p.status} />
              </Td>
              <Td className="whitespace-nowrap text-muted-foreground">{formatDate(p.createdAt)}</Td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <Td colSpan={6} className="py-8 text-center text-muted-foreground">
                No payments yet.
              </Td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
}
