import Link from "next/link";
import { Surface } from "@/components/design-system/surface";
import { Button } from "@/components/ui/button";
import type {
  ClosingSummaryLoadState,
  FinancialClosingSummary,
} from "@/features/finance/closing-summary";

type ClosingStatusBlockProps = {
  state: ClosingSummaryLoadState;
  closing_summary?: FinancialClosingSummary | null;
  status_label: string;
  summary: string;
  pending_items_count: number;
  cta_label: string;
  href: string;
  error_message?: string;
  onRetry?: () => void;
};

export function ClosingStatusBlock({
  state,
  closing_summary,
  status_label,
  summary,
  pending_items_count,
  cta_label,
  href,
  error_message,
  onRetry,
}: ClosingStatusBlockProps) {
  if (state === "loading_closing_summary") {
    return (
      <Surface className="p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
          Fechamento atual
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
          Prestacao de contas da semana
        </h2>
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-[color:var(--color-border)] bg-[rgba(255,255,255,0.72)] p-5">
          <p className="text-sm leading-7 text-[color:var(--color-muted)]">
            Carregando o fechamento real do periodo atual.
          </p>
        </div>
      </Surface>
    );
  }

  if (
    state === "denied_or_session_invalid"
    || state === "server_error"
    || state === "stale_home_state_recovered"
  ) {
    return (
      <Surface className="p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
          Fechamento atual
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
          Prestacao de contas da semana
        </h2>
        <div className="mt-5 rounded-[1.5rem] border border-[color:var(--color-border)] bg-[rgba(255,255,255,0.72)] p-5">
          <span className="rounded-full bg-[rgba(190,18,60,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
            atencao
          </span>
          <p className="mt-4 text-sm leading-7 text-[color:var(--color-muted)]">
            {error_message ?? "Nao foi possivel carregar o fechamento agora."}
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

  return (
    <Surface className="p-6 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
        Fechamento atual
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
        Prestacao de contas da semana
      </h2>
      <div className="mt-5 rounded-[1.5rem] border border-[color:var(--color-border)] bg-[rgba(255,255,255,0.72)] p-5">
        <span className="rounded-full bg-[rgba(15,118,110,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
          {status_label}
        </span>
        <p className="mt-4 text-sm leading-7 text-[color:var(--color-muted)]">
          {summary}
        </p>
        {closing_summary ? (
          <p className="mt-5 text-sm font-semibold text-[color:var(--color-foreground)]">
            {pending_items_count} pontos para concluir antes do proximo envio.
          </p>
        ) : null}
      </div>

      <Button asChild variant="secondary" className="mt-5 w-full rounded-[1.25rem]">
        <Link href={href}>{cta_label}</Link>
      </Button>
    </Surface>
  );
}
