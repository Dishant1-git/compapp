import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AgeCheckForm } from "@/components/trips/age-check-form";
import { PageHeader } from "@/components/trips/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/lib/auth/dal";
import { AGE_CHECK_LABELS } from "@/lib/payments/pricing";
import { formatPrice } from "@/lib/trips/format";
import { getMyAgeCheck } from "@/lib/trips/queries";

export const metadata: Metadata = {
  title: "Verify your age",
};

export default async function VerifyAgePage({ params }: PageProps<"/trips/[slug]/verify-age">) {
  const { slug } = await params;
  const user = await requireUser(`/trips/${slug}/verify-age`);
  const check = await getMyAgeCheck(slug, user.id);
  if (!check) redirect(`/trips/${slug}`);

  return (
    <Container className="max-w-2xl pb-10">
      <Link href={`/trips/${slug}`} className="mt-6 inline-block text-sm font-medium text-muted-foreground hover:text-foreground">
        ← {check.tripTitle}
      </Link>
      <PageHeader
        title={check.status === "verified" ? "You're all set" : "Verify your age"}
        description={`Seat fee of ${formatPrice(check.feePaid)} paid · ${check.seats} seat${check.seats === 1 ? "" : "s"} reserved on ${check.tripTitle}.`}
      />

      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Age check</h2>
          <Badge tone={check.status === "verified" ? "positive" : "warning"}>{AGE_CHECK_LABELS[check.status]}</Badge>
        </div>

        {check.status === "required" && (
          <>
            {check.note && (
              <p role="status" className="mb-4 rounded-lg border border-destructive/40 px-4 py-3 text-sm text-destructive">
                We need a new photo: {check.note}
              </p>
            )}
            <p className="mb-5 text-sm text-muted-foreground">
              Upload a government photo ID that shows the date of birth
              {check.proofs.length > 1 ? " for each person below." : "."} If the check fails, the booking is
              cancelled and the seat fee refunded by how long is left before departure.
            </p>
            <AgeCheckForm bookingId={check.bookingId} proofs={check.proofs} />
          </>
        )}
        {check.status === "pending" && (
          <p className="text-sm text-muted-foreground">
            We have your ID and are checking it, usually within a day. You&apos;ll get a notification when
            it&apos;s done. Your seat stays reserved in the meantime.
          </p>
        )}
        {check.status === "verified" && (
          <p className="text-sm text-muted-foreground">
            Your age is verified. Carry the same ID on the trip, and say hello to your group.
          </p>
        )}

        {check.status !== "required" && (
          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href={`/trips/${slug}/group`}>Open group chat</ButtonLink>
            <ButtonLink href={`/trips/${slug}`} variant="outline">
              Trip details
            </ButtonLink>
          </div>
        )}
      </section>
    </Container>
  );
}
