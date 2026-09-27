import { FieldError } from "@/components/ui/input";
import { PERSONALITIES } from "@/lib/trips/constants";

/** Multi-select chips built on plain checkboxes, so it works without JavaScript. */
export function TagPicker({
  name,
  legend,
  hint,
  defaultSelected = [],
  errors,
}: {
  name: string;
  legend: string;
  hint?: string;
  defaultSelected?: readonly string[];
  errors?: string[];
}) {
  return (
    <fieldset aria-describedby={`${name}-error`}>
      <legend className="text-sm font-medium">{legend}</legend>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {PERSONALITIES.map((p) => (
          <label
            key={p.id}
            className="cursor-pointer rounded-full border border-input px-4 py-2 text-sm font-medium transition-colors select-none hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
          >
            <input
              type="checkbox"
              name={name}
              value={p.id}
              defaultChecked={defaultSelected.includes(p.id)}
              className="sr-only"
            />
            {p.label}
          </label>
        ))}
      </div>
      <FieldError id={`${name}-error`} messages={errors} />
    </fieldset>
  );
}
