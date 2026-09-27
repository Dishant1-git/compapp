import { EmptyState } from "@/components/trips/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function TripNotFound() {
  return (
    <Container className="py-16">
      <EmptyState
        title="Trip not found"
        description="It may have been removed, or the link is wrong."
        action={<ButtonLink href="/trips">Explore trips</ButtonLink>}
      />
    </Container>
  );
}
