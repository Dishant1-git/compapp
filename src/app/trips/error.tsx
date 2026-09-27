"use client";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function TripsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="py-16 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {process.env.NODE_ENV === "development"
          ? error.message
          : "We couldn't load this page. Please try again."}
      </p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </Container>
  );
}
