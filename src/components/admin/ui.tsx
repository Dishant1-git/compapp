import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AdminHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-6 sm:flex-row sm:items-end sm:justify-between lg:pt-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

/** Pill links that set one query param, e.g. ?status=pending. */
export function FilterTabs({
  base,
  param,
  current,
  options,
  keep = {},
}: {
  base: string;
  param: string;
  current?: string;
  options: { value: string; label: string; count?: number }[];
  /** Other params to preserve (e.g. the search query). */
  keep?: Record<string, string | undefined>;
}) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {options.map((o) => {
        const params = new URLSearchParams(
          Object.entries(keep).filter((e): e is [string, string] => !!e[1]),
        );
        if (o.value) params.set(param, o.value);
        const qs = params.toString();
        const active = (current ?? "") === o.value;
        return (
          <Link
            key={o.value}
            href={qs ? `${base}?${qs}` : base}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium",
              active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {o.label}
            {o.count !== undefined && <span className="opacity-70">{o.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}

/** GET search box that preserves other filters as hidden inputs. */
export function SearchBox({
  placeholder,
  defaultValue,
  keep = {},
}: {
  placeholder: string;
  defaultValue?: string;
  keep?: Record<string, string | undefined>;
}) {
  return (
    <form role="search" className="flex gap-2">
      {Object.entries(keep).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <label className="flex-1">
        <span className="sr-only">Search</span>
        <Input name="q" type="search" placeholder={placeholder} defaultValue={defaultValue} className="h-11" />
      </label>
      <Button type="submit" variant="outline" className="shrink-0">
        Search
      </Button>
    </form>
  );
}

/** Scrolls horizontally inside its box on small screens, so the page itself never does. */
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("border-b bg-muted/50 px-4 py-2.5 text-xs font-medium text-muted-foreground", className)}>
      {children}
    </th>
  );
}

export function Td({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("border-b px-4 py-3 align-top", className)} {...props} />;
}

export function one(value: string | string[] | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() || undefined;
}
