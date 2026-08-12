import { Surface } from "@/components/design-system/surface";
import type { UnavailableSecretaryBlock } from "@/features/secretaria/secretary-home";

type CommunicationPendingBlockProps = {
  block: UnavailableSecretaryBlock | null;
};

export function CommunicationPendingBlock({ block }: CommunicationPendingBlockProps) {
  return (
    <Surface className="p-6 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-accent)]">
        Comunicacao
      </p>
      <h2 className="mt-3 text-xl font-semibold text-[color:var(--color-foreground)]">
        Preparos futuros
      </h2>
      <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
        {block?.summary ?? "As comunicacoes pendentes serao preparadas na etapa de comunicacao."}
      </p>
    </Surface>
  );
}
