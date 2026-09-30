export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="reveal flex flex-col gap-4 py-8 sm:flex-row sm:items-end sm:justify-between sm:py-12">
      <div>
        {eyebrow && <p className="eyebrow mb-3 text-highlight-ink">{eyebrow}</p>}
        <h1 className="text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed px-6 py-14 text-center">
      <p className="font-display text-2xl">{title}</p>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
