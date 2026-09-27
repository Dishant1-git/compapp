import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, FilterTabs, SearchBox, Table, Td, Th, one } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { listAgencies } from "@/lib/admin/queries";
import { AGENCY_STATUSES } from "@/lib/db/models/agency";
import { formatDate } from "@/lib/trips/format";

export const metadata: Metadata = { title: "Agencies" };

export default async function AdminAgenciesPage({ searchParams }: PageProps<"/admin/agencies">) {
  const params = await searchParams;
  const q = one(params.q);
  const status = one(params.status);
  const agencies = await listAgencies({
    q,
    status: status && (AGENCY_STATUSES as readonly string[]).includes(status) ? status : undefined,
  });

  return (
    <>
      <AdminHeader title="Agencies" description="Review applications and manage agencies." />
      <div className="space-y-3">
        <FilterTabs
          base="/admin/agencies"
          param="status"
          current={status}
          keep={{ q }}
          options={[{ value: "", label: "All" }, ...AGENCY_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))]}
        />
        <SearchBox placeholder="Search name, city or email" defaultValue={q} keep={{ status }} />
      </div>

      <div className="mt-4">
        <Table>
          <thead>
            <tr>
              <Th>Agency</Th>
              <Th>Owner</Th>
              <Th>Status</Th>
              <Th className="text-right">Trips</Th>
              <Th className="text-right">Travellers</Th>
              <Th>Joined</Th>
            </tr>
          </thead>
          <tbody>
            {agencies.map((a) => (
              <tr key={a.id}>
                <Td>
                  <Link href={`/admin/agencies/${a.id}`} className="font-medium hover:underline">
                    {a.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{a.city}</p>
                </Td>
                <Td>
                  {a.ownerName}
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                </Td>
                <Td>
                  <Badge status={a.status} />
                </Td>
                <Td className="text-right tabular-nums">{a.trips}</Td>
                <Td className="text-right tabular-nums">{a.travellers}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">{formatDate(a.createdAt)}</Td>
              </tr>
            ))}
            {!agencies.length && (
              <tr>
                <Td colSpan={6} className="py-8 text-center text-muted-foreground">No agencies found.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </>
  );
}
