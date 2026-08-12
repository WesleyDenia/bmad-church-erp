import { Surface } from "@/components/design-system/surface";
import type { WeeklyChecklistBlock } from "@/features/secretaria/secretary-home";

type WeeklyChecklistBlockProps = {
  checklist: WeeklyChecklistBlock | null;
};

export function WeeklyChecklistBlock({ checklist }: WeeklyChecklistBlockProps) {
  const items = checklist?.items ?? [];

  return (
    <Surface className="p-6 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-accent)]">
        Semana
      </p>
      <h2 className="mt-3 text-xl font-semibold text-[color:var(--color-foreground)]">
        Checklist da secretaria
      </h2>
      <ul className="mt-5 grid gap-3">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex items-start gap-3 rounded-md border border-[color:var(--color-border)] p-3"
          >
            <span
              aria-hidden="true"
              className="mt-1 size-4 rounded border border-[color:var(--color-accent)]"
            />
            <div>
              <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                {item.label}
              </p>
              <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                Ainda nao iniciado
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
