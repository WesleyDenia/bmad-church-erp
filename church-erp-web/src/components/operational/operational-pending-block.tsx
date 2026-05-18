import Link from "next/link";
import { Surface } from "@/components/design-system/surface";
import { Button } from "@/components/ui/button";

type PendingItem = {
  id: string;
  entry_id: number;
  pending_type_label: string;
  count: number;
  label: string;
  context: string;
  cta_label: string;
  resolution_action: "edit_entry";
};

type OperationalPendingBlockProps = {
  state:
    | "loading_pending_items"
    | "empty_pending_items"
    | "pending_items_loaded"
    | "denied_or_session_invalid"
    | "server_error";
  items: PendingItem[];
  empty_state?: {
    summary: string;
    cta_label: string;
    href: string;
  };
  error_message?: string;
  onRetry?: () => void;
  onSelectItem?: (itemId: string) => void;
};

export function OperationalPendingBlock({
  state,
  items,
  empty_state,
  error_message,
  onRetry,
  onSelectItem,
}: OperationalPendingBlockProps) {
  if (state === "loading_pending_items") {
    return (
      <Surface className="p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
          Pendencias de revisao
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
          O que precisa de resposta hoje
        </h2>
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-[color:var(--color-border)] bg-[rgba(255,255,255,0.72)] p-5">
          <p className="text-sm leading-7 text-[color:var(--color-muted)]">
            Carregando pendencias financeiras reais do tenant...
          </p>
        </div>
      </Surface>
    );
  }

  if (state === "denied_or_session_invalid" || state === "server_error") {
    return (
      <Surface className="p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
          Pendencias de revisao
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
          O que precisa de resposta hoje
        </h2>
        <div className="mt-5 rounded-[1.5rem] border border-[rgba(153,27,27,0.18)] bg-red-50 p-5">
          <p className="text-sm leading-7 text-red-800">
            {error_message
              ?? (state === "denied_or_session_invalid"
                ? "Acesso interrompido para carregar as pendencias."
                : "Nao foi possivel carregar as pendencias agora.")}
          </p>
        </div>

        {onRetry ? (
          <Button
            type="button"
            variant="secondary"
            className="mt-5 w-full rounded-[1.25rem]"
            onClick={onRetry}
          >
            Tentar novamente
          </Button>
        ) : null}
      </Surface>
    );
  }

  if (state === "empty_pending_items") {
    return (
      <Surface className="p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
          Pendencias de revisao
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
          O que precisa de resposta hoje
        </h2>
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-[color:var(--color-border)] bg-[rgba(255,255,255,0.72)] p-5">
          <p className="text-sm leading-7 text-[color:var(--color-muted)]">
            {empty_state?.summary}
          </p>
        </div>

        <Button asChild variant="secondary" className="mt-5 w-full rounded-[1.25rem]">
          <Link href={empty_state?.href ?? "/treasury"}>
            {empty_state?.cta_label}
          </Link>
        </Button>
      </Surface>
    );
  }

  if (items.length === 0) {
    return (
      <Surface className="p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
          Pendencias de revisao
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
          O que precisa de resposta hoje
        </h2>
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-[color:var(--color-border)] bg-[rgba(255,255,255,0.72)] p-5">
          <p className="text-sm leading-7 text-[color:var(--color-muted)]">
            {empty_state?.summary}
          </p>
        </div>

        <Button asChild variant="secondary" className="mt-5 w-full rounded-[1.25rem]">
          <Link href={empty_state?.href ?? "/treasury"}>
            {empty_state?.cta_label}
          </Link>
        </Button>
      </Surface>
    );
  }

  return (
    <Surface className="p-6 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
        Pendencias de revisao
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
        O que precisa de resposta hoje
      </h2>
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-[1.5rem] border border-[color:var(--color-border)] bg-[rgba(255,255,255,0.72)] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-[rgba(15,118,110,0.12)] px-3 py-1 text-sm font-semibold text-[color:var(--color-accent)]">
                    {item.count}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
                      {item.pending_type_label}
                    </p>
                    <h3 className="text-lg font-semibold text-[color:var(--color-foreground)]">
                      {item.label}
                    </h3>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
                  {item.context}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="mt-4 px-0"
              onClick={() => onSelectItem?.(item.id)}
            >
              {item.cta_label}
            </Button>
          </div>
        ))}
      </div>
    </Surface>
  );
}
