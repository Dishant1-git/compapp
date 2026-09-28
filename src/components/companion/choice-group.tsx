"use client";

import { cn } from "@/lib/utils";

type Option = { readonly id: string; readonly label: string };

/**
 * Pick one or several options, shown as chips (compact, wraps) or cards (one per
 * row, big tap targets). Built on real radios/checkboxes for keyboard and
 * screen reader support.
 */
export function ChoiceGroup({
  name,
  legend,
  hint,
  options,
  value,
  onChange,
  multiple = false,
  max,
  variant = "chips",
  hideLegend = false,
}: {
  name: string;
  legend: string;
  hint?: string;
  options: readonly Option[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
  /** For multiple: stop further picks once this many are chosen. */
  max?: number;
  variant?: "chips" | "cards";
  hideLegend?: boolean;
}) {
  const full = multiple && max !== undefined && value.length >= max;

  function toggle(id: string) {
    if (!multiple) return onChange([id]);
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <fieldset>
      <legend className={cn("text-sm font-medium", hideLegend && "sr-only")}>{legend}</legend>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      <div
        className={cn(
          variant === "chips" ? "flex flex-wrap gap-2" : "grid gap-3",
          !hideLegend || hint ? "mt-3" : undefined,
        )}
      >
        {options.map((o) => {
          const checked = value.includes(o.id);
          const disabled = full && !checked;
          return (
            <label
              key={o.id}
              className={cn(
                "cursor-pointer border border-input font-medium transition-colors select-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                variant === "chips"
                  ? "rounded-full px-4 py-2 text-sm"
                  : "flex min-h-14 items-center justify-between rounded-xl px-5 py-4 text-base",
                checked
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted",
                disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
              )}
            >
              <input
                type={multiple ? "checkbox" : "radio"}
                name={name}
                value={o.id}
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(o.id)}
                className="sr-only"
              />
              {o.label}
              {variant === "cards" && (
                <span
                  aria-hidden
                  className={cn(
                    "grid size-5 place-items-center rounded-full border-2",
                    checked ? "border-primary-foreground" : "border-input",
                  )}
                >
                  {checked && <span className="size-2.5 rounded-full bg-primary-foreground" />}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
