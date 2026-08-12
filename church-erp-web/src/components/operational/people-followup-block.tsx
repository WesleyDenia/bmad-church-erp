import Link from "next/link";
import { Surface } from "@/components/design-system/surface";
import { Button } from "@/components/ui/button";
import type {
  PeoplePendingItemsBlock,
  RecentVisitorsBlock,
} from "@/features/secretaria/secretary-home";

type PeopleFollowupBlockProps = {
  pending: PeoplePendingItemsBlock | null;
  visitors: RecentVisitorsBlock | null;
  recovered_counts?: {
    pending_total: number;
    recent_visitors_total: number;
  } | null;
};

function ContactSummary({ value }: { value: string | null }) {
  return (
    <span className="text-xs text-[color:var(--color-muted)]">
      {value ?? "Contato pendente"}
    </span>
  );
}

export function PeopleFollowupBlock({
  pending,
  visitors,
  recovered_counts,
}: PeopleFollowupBlockProps) {
  if (recovered_counts) {
    return (
      <Surface className="p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-accent)]">
          Pessoas
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
          Leitura tecnica limitada
        </h2>
        <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
          A ultima leitura confiavel preservou {recovered_counts.pending_total} pendencia{recovered_counts.pending_total === 1 ? "" : "s"} e {recovered_counts.recent_visitors_total} visitante{recovered_counts.recent_visitors_total === 1 ? "" : "s"} recente{recovered_counts.recent_visitors_total === 1 ? "" : "s"}, sem nomes ou contatos.
        </p>
      </Surface>
    );
  }

  const pendingItems = pending?.items ?? [];
  const visitorItems = visitors?.items ?? [];

  return (
    <Surface className="p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-accent)]">
            Pessoas
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
            Pendencias e visitantes
          </h2>
        </div>
        <span className="rounded-md border border-[color:var(--color-border)] px-3 py-1 text-sm font-semibold text-[color:var(--color-foreground)]">
          {pending?.total_count ?? 0} pendente{pending?.total_count === 1 ? "" : "s"}
        </span>
      </div>

      {pendingItems.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-[color:var(--color-border)] p-4">
          <p className="text-sm leading-7 text-[color:var(--color-muted)]">
            Sem pendencias reais de pessoas nesta igreja. O proximo passo e cadastrar membro ou visitante quando o fluxo ficar disponivel.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {pendingItems.map((item) => (
            <section
              key={item.category}
              className="rounded-md border border-[rgba(15,118,110,0.18)] bg-[rgba(240,253,250,0.45)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[color:var(--color-foreground)]">
                  {item.label}
                </h3>
                <span className="text-sm font-semibold text-[color:var(--color-accent)]">
                  {item.count}
                </span>
              </div>
              <ul className="mt-3 divide-y divide-[rgba(15,118,110,0.14)]">
                {item.people_preview.map((person) => (
                  <li key={`${item.category}-${person.display_name}`} className="py-2">
                    <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                      {person.display_name}
                    </p>
                    <ContactSummary value={person.contact_summary} />
                  </li>
                ))}
              </ul>
              {item.href ? (
                <Button asChild variant="secondary" className="mt-4 h-10 w-full">
                  <Link href={item.href}>{item.next_step_label}</Link>
                </Button>
              ) : (
                <>
                  <Button disabled variant="secondary" className="mt-4 h-10 w-full">
                    {item.next_step_label}
                  </Button>
                  <p className="mt-2 text-xs text-[color:var(--color-muted)]">
                    Fluxo em preparacao para uma proxima etapa.
                  </p>
                </>
              )}
            </section>
          ))}
        </div>
      )}

      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[color:var(--color-foreground)]">
            Visitantes recentes
          </h3>
          <span className="text-xs text-[color:var(--color-muted)]">
            {visitors?.window_days ?? 30} dias
          </span>
        </div>

        {visitorItems.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-[color:var(--color-border)] p-4 text-sm leading-7 text-[color:var(--color-muted)]">
            Sem visitantes recentes cadastrados. Assim que houver fonte real, os ultimos registros aparecerao aqui.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[color:var(--color-border)]">
            {visitorItems.map((visitor) => (
              <li key={visitor.display_name} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                    {visitor.display_name}
                  </p>
                  <ContactSummary value={visitor.contact_summary} />
                </div>
                <span className="text-xs font-semibold text-[color:var(--color-accent)]">
                  {visitor.next_step_label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Surface>
  );
}
