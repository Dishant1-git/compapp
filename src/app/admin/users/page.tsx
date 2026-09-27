import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, FilterTabs, SearchBox, Table, Td, Th, one } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { listUsers } from "@/lib/admin/queries";
import { formatDate } from "@/lib/trips/format";

export const metadata: Metadata = { title: "Users" };

const ROLES = ["user", "agency", "admin"];
const ROLE_LABEL: Record<string, string> = { user: "Traveller", agency: "Agency", admin: "Admin" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const params = await searchParams;
  const q = one(params.q);
  const role = one(params.role);
  const status = one(params.status);
  const users = await listUsers({
    q,
    role: role && ROLES.includes(role) ? role : undefined,
    status: status === "suspended" || status === "active" ? status : undefined,
  });

  return (
    <>
      <AdminHeader title="Users" description="Every account: travellers, agency owners and admins." />
      <div className="space-y-3">
        <FilterTabs
          base="/admin/users"
          param="role"
          current={role}
          keep={{ q, status }}
          options={[{ value: "", label: "All roles" }, ...ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))]}
        />
        <FilterTabs
          base="/admin/users"
          param="status"
          current={status}
          keep={{ q, role }}
          options={[
            { value: "", label: "Any status" },
            { value: "active", label: "Active" },
            { value: "suspended", label: "Suspended" },
          ]}
        />
        <SearchBox placeholder="Search name, email, phone or city" defaultValue={q} keep={{ role, status }} />
      </div>

      <p className="mt-4 mb-2 text-sm text-muted-foreground">
        {users.length === 100 ? "Showing the 100 newest matches" : `${users.length} users`}
      </p>
      <Table>
        <thead>
          <tr>
            <Th>User</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th className="text-right">Bookings</Th>
            <Th className="text-right">Reports</Th>
            <Th>Joined</Th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <Td>
                <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">
                  {u.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {u.email}
                  {u.city ? ` · ${u.city}` : ""}
                </p>
              </Td>
              <Td>{ROLE_LABEL[u.role] ?? u.role}</Td>
              <Td>
                <Badge status={u.status} />
              </Td>
              <Td className="text-right tabular-nums">{u.bookings}</Td>
              <Td className="text-right tabular-nums">{u.reportsAgainst || "—"}</Td>
              <Td className="whitespace-nowrap text-muted-foreground">{formatDate(u.createdAt)}</Td>
            </tr>
          ))}
          {!users.length && (
            <tr>
              <Td colSpan={6} className="py-8 text-center text-muted-foreground">
                No users found.
              </Td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
}
