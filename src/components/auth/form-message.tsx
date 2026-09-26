export function FormMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="status" className="rounded-lg border bg-muted px-4 py-3 text-sm">
      {message}
    </p>
  );
}
