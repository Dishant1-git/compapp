import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeader } from "@/components/auth/auth-header";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <>
      <AuthHeader
        title="Welcome back"
        description="Log in to continue to your trips and companions."
      />
      <LoginForm next={typeof next === "string" ? next : undefined} />
      <p className="mt-6 rounded-lg border px-4 py-3 text-center text-sm">
        Joined Companion with your phone?{" "}
        <Link href="/companion/join" className="font-medium underline underline-offset-4">
          Continue with your number
        </Link>
      </p>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </>
  );
}
