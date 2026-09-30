import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthMethods } from "@/components/auth/auth-methods";
import { PhoneForm } from "@/components/auth/phone-form";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser, homeFor, productOf, safeNext } from "@/lib/auth/dal";
import { siteConfig, type PlatformId } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const params = await searchParams;
  const next = safeNext(params.next, "") || undefined;

  // Already signed in: go straight to where they were headed.
  const viewer = await getCurrentUser();
  if (viewer) redirect(next ?? homeFor(viewer.role));

  const product = siteConfig.platforms.find(
    (p) => p.id === (next ? productOf(next) : params.platform),
  );
  const logInHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <>
      <AuthHeader
        title="Create your account"
        description={
          product && next
            ? `One account for everything. You'll continue to ${product.name} next.`
            : "One account works across Stranger Trips and Companion."
        }
      />
      <AuthMethods
        initial={product?.id === "companion" ? "phone" : "email"}
        phone={<PhoneForm mode="signup" next={next} />}
        email={<RegisterForm defaultPlatform={product?.id as PlatformId | undefined} next={next} />}
      />
      <p className="mt-6 rounded-lg border px-4 py-3 text-center text-sm">
        Run a travel agency?{" "}
        <Link href="/register/agency" className="font-medium underline underline-offset-4">
          Register your agency
        </Link>
      </p>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={logInHref} className="font-medium text-foreground underline underline-offset-4">
          Log in
        </Link>
      </p>
    </>
  );
}
