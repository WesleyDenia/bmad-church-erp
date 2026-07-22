import { Button } from "@/components/ui/button";
import { formatDecimalAmountForDisplay } from "@/features/finance/amount";
import type {
  ClosingDetailsLoadState,
  ClosingSummaryCostCenterBreakdownRow,
  ClosingSummarySubtypeBreakdownRow,
  FinancialClosingSummary,
} from "@/features/finance/closing-summary";

type ClosingDetailBreakdownProps = {
  state: ClosingDetailsLoadState;
  closing_summary: FinancialClosingSummary | null;
  error_message?: string;
  onRetry: () => void;
};

function formatMovement(row: {
  total_income: string;
  total_expense: string;
  net_result: string;
  entry_count: number;
  percentage_of_total_movement?: string;
}) {
  return [
    `Receitas ${formatDecimalAmountForDisplay(row.total_income)}`,
    `despesas ${formatDecimalAmountForDisplay(row.total_expense)}`,
    `saldo ${formatDecimalAmountForDisplay(row.net_result)}`,
    `${row.entry_count} lancamento${row.entry_count === 1 ? "" : "s"}`,
    row.percentage_of_total_movement
      ? `${row.percentage_of_total_movement}% do movimento`
      : null,
  ].filter(Boolean).join(" - ");
}

function CostCenterRows({ rows }: { rows: ClosingSummaryCostCenterBreakdownRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-3 text-sm leading-6 text-[color:var(--color-muted)]">
        Sem centros de custo com movimento real neste periodo.
      </p>
    );
  }

  return (
    <div className="mt-3 divide-y divide-[rgba(15,118,110,0.12)]">
      {rows.map((row) => (
        <div key={row.cost_center_key} className="grid gap-2 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
              {row.cost_center_name}
            </p>
            <p className="text-sm font-semibold text-[color:var(--color-accent)]">
              {formatDecimalAmountForDisplay(row.net_result)}
            </p>
          </div>
          <p className="text-xs leading-5 text-[color:var(--color-muted)]">
            {formatMovement(row)}
          </p>
        </div>
      ))}
    </div>
  );
}

function SubtypeRows({ rows }: { rows: ClosingSummarySubtypeBreakdownRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-3 text-sm leading-6 text-[color:var(--color-muted)]">
        Sem subtipos com movimento real neste periodo.
      </p>
    );
  }

  return (
    <div className="mt-3 divide-y divide-[rgba(15,118,110,0.12)]">
      {rows.map((row) => (
        <div key={row.financial_category_id} className="grid gap-2 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
              {row.financial_category_name}
            </p>
            <p className="text-xs font-semibold uppercase text-[color:var(--color-accent)]">
              {row.financial_category_kind === "income" ? "receita" : "despesa"}
            </p>
          </div>
          <p className="text-xs leading-5 text-[color:var(--color-muted)]">
            {formatMovement(row)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ClosingDetailBreakdown({
  state,
  closing_summary,
  error_message,
  onRetry,
}: ClosingDetailBreakdownProps) {
  if (state === "details_collapsed") {
    return null;
  }

  if (state === "loading_closing_details") {
    return (
      <div className="mt-5 border-t border-[rgba(15,118,110,0.12)] pt-5">
        <p className="text-sm leading-6 text-[color:var(--color-muted)]">
          Carregando a quebra reconciliada do fechamento.
        </p>
      </div>
    );
  }

  if (state === "details_stale_after_mutation") {
    return (
      <div className="mt-5 border-t border-[rgba(15,118,110,0.12)] pt-5">
        <p className="text-sm leading-6 text-[color:var(--color-muted)]">
          O fechamento mudou depois do ultimo lancamento. Recarregando os detalhes antes da revisao.
        </p>
      </div>
    );
  }

  if (state === "consistency_error") {
    return (
      <div className="mt-5 border-t border-[rgba(153,27,27,0.16)] pt-5">
        <p className="text-sm font-semibold text-red-800">
          Fechamento indisponivel para revisao confiavel.
        </p>
        <p className="mt-2 text-sm leading-6 text-red-800">
          {error_message ?? "Nao foi possivel confirmar a consistencia do fechamento."}
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4 rounded-[1.25rem]"
          onClick={onRetry}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (state === "denied_or_session_invalid" || state === "server_error") {
    return (
      <div className="mt-5 border-t border-[rgba(153,27,27,0.16)] pt-5">
        <p className="text-sm leading-6 text-red-800">
          {error_message ?? "Nao foi possivel carregar o detalhamento agora."}
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4 rounded-[1.25rem]"
          onClick={onRetry}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  const details = closing_summary?.details;

  if (!details || closing_summary.state === "empty_closing_summary") {
    return null;
  }

  return (
    <div className="mt-5 border-t border-[rgba(15,118,110,0.12)] pt-5">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
          Por centro de custo
        </p>
        <CostCenterRows rows={details.by_cost_center} />
      </section>

      <section className="mt-5 border-t border-[rgba(15,118,110,0.12)] pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
          Por subtipo
        </p>
        <SubtypeRows rows={details.by_subtype} />
      </section>
    </div>
  );
}
