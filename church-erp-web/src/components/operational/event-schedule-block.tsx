import { Surface } from "@/components/design-system/surface";
import type { UnavailableSecretaryBlock } from "@/features/secretaria/secretary-home";

type EventScheduleBlockProps = {
  block: UnavailableSecretaryBlock | null;
};

export function EventScheduleBlock({ block }: EventScheduleBlockProps) {
  return (
    <Surface className="p-6 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-accent)]">
        Programacao
      </p>
      <h2 className="mt-3 text-xl font-semibold text-[color:var(--color-foreground)]">
        Agenda operacional
      </h2>
      <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
        {block?.summary ?? "A programacao sera exibida quando houver uma fonte real de eventos."}
      </p>
    </Surface>
  );
}
