export function AuthHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-10">
      <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
