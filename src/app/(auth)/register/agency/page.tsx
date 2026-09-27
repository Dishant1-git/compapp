import type { Metadata } from "next";
import Link from "next/link";
import { AgencyRegisterForm } from "@/components/auth/agency-register-form";
import { AuthHeader } from "@/components/auth/auth-header";

export const metadata: Metadata = {
  title: "Register your travel agency",
};

export default function AgencyRegisterPage() {
  return (
    <>
      <AuthHeader
        title="Register your travel agency"
        description="Publish group trips on Stranger Trips. An admin reviews every agency before its trips go live."
      />
      <AgencyRegisterForm />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Travelling instead?{" "}
        <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
          Create a traveller account
        </Link>
      </p>
    </>
  );
}
