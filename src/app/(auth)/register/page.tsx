import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeader } from "@/components/auth/auth-header";
import { RegisterForm } from "@/components/auth/register-form";
import { siteConfig, type PlatformId } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const { platform } = await searchParams;
  const defaultPlatform = siteConfig.platforms.find((p) => p.id === platform)?.id as
    | PlatformId
    | undefined;

  return (
    <>
      <AuthHeader
        title="Create your account"
        description="One account works across Stranger Trips and Companion."
      />
      <RegisterForm defaultPlatform={defaultPlatform} />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Log in
        </Link>
      </p>
    </>
  );
}
