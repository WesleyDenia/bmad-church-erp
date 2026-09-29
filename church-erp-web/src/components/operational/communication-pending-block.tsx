import Link from "next/link";
import { Surface } from "@/components/design-system/surface";
import { Button } from "@/components/ui/button";
import type {
  CommunicationPendingBlock as CommunicationPendingBlockContract,
  CommunicationPendingItem,
} from "@/features/secretaria/secretary-home";

type CommunicationPendingBlockProps = {
  block: CommunicationPendingBlockContract | null;
};

function statusText(item: CommunicationPendingItem): string {
  if (item.category === "missing_template_for_communication") {
    return "Modelo indisponivel";
  }

  if (item.category === "missing_contact_for_communication") {
    return "Contato pendente";
  }

  return "Pronto para preparar";
}

export function CommunicationPendingBlock({ block }: CommunicationPendingBlockProps) {
  const items = block?.items ?? [];
  const isLoaded = block?.state === "communication_pending_loaded";
  const isBlocked = block?.state === "blocked_missing_contact";
  const isEmpty = !block || block.state === "empty_communication_pending" || items.length === 0;

  return (
    <Surface className="p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-accent)]">
            Comunicacao
          </p>
          <h2 className="mt-3 text-xl font-semibold text-[color:var(--color-foreground)]">
            Preparos de mensagem
          </h2>
        </div>
        <span className="rounded-md border border-[color:var(--color-border)] px-3 py-1 text-sm font-semibold text-[color:var(--color-foreground)]">
          {block?.total_count ?? 0}
        </span>
      </div>

      <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]" aria-live="polite">
        {block?.summary ?? "Nao ha comunicacao pendente agora."}
      </p>

      {isEmpty ? (
        <div className="mt-5 rounded-md border border-dashed border-[color:var(--color-border)] p-4">
          <p className="text-sm leading-7 text-[color:var(--color-muted)]">
            Nenhuma pendencia pronta para preparar mensagem neste momento.
          </p>
        </div>
      ) : isLoaded || isBlocked ? (
        <div className="mt-5 grid gap-3">
          {items.map((item) => (
            <section
              key={`${item.category}-${item.template_key ?? "missing-contact"}`}
              className="rounded-md border border-[rgba(15,118,110,0.18)] bg-[rgba(240,253,250,0.45)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[color:var(--color-foreground)]">
                    {item.label}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-[color:var(--color-muted)]">
                    {statusText(item)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-[color:var(--color-accent)]">
                  {item.count}
                </span>
              </div>

              {item.people_preview.length > 0 ? (
                <ul className="mt-3 divide-y divide-[rgba(15,118,110,0.14)]">
                  {item.people_preview.map((person) => (
                    <li key={`${item.category}-${person.person_type}-${person.person_id}`} className="py-2">
                      <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                        {person.display_name}
                      </p>
                      <p className="text-xs text-[color:var(--color-muted)]">
                        {person.status_label} - {person.contact_summary}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[color:var(--color-muted)]">
                  Revise os modelos antes de preparar esta fila.
                </p>
              )}

              <Button asChild variant={item.category === "missing_contact_for_communication" ? "secondary" : "default"} className="mt-4 h-10 w-full">
                <Link href={item.href}>{item.next_step_label}</Link>
              </Button>
            </section>
          ))}
        </div>
      ) : null}
    </Surface>
  );
}
