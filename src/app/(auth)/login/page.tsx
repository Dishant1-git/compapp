import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthMethods } from "@/components/auth/auth-methods";
import { LoginForm } from "@/components/auth/login-form";
import { PhoneForm } from "@/components/auth/phone-form";
import { getCurrentUser, homeFor, productOf, safeNext } from "@/lib/auth/dal";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Log in",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next, "") || undefined;

  // Already signed in: go straight to where they were headed.
  const viewer = await getCurrentUser();
  if (viewer) redirect(next ?? homeFor(viewer.role));

  const product = next ? siteConfig.platforms.find((p) => p.id === productOf(next)) : undefined;
  const signUpHref = next ? `/register?next=${encodeURIComponent(next)}` : "/register";

  return (
    <>
      <AuthHeader
        title="Welcome back"
        description={
          product
            ? `Log in or create an account to continue to ${product.name}.`
            : "Log in to continue to your trips and companions."
        }
      />
      <AuthMethods
        initial={product?.id === "companion" ? "phone" : "email"}
        phone={<PhoneForm mode="login" next={next} />}
        email={<LoginForm next={next} />}
      />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href={signUpHref} className="font-medium text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </>
  );
}
