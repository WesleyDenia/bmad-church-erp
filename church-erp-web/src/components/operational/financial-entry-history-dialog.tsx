"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  FinancialEntryAuditRecord,
  FinancialEntryListItem,
} from "@/features/finance/financial-entry";
import {
  formatDecimalAmountForDisplay,
} from "@/features/finance/amount";
import { getFinancialAuditFieldLabel } from "@/features/finance/financial-entry";

type FinancialEntryHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: FinancialEntryListItem | null;
  audits: FinancialEntryAuditRecord[];
  isLoading: boolean;
  error: string | null;
};

function formatAuditValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Nao informado";
  }

  if (field === "entry_type") {
    return value === "income" ? "Receita" : "Despesa";
  }

  if (field === "amount" && typeof value === "string") {
    return formatDecimalAmountForDisplay(value);
  }

  return String(value);
}

export function FinancialEntryHistoryDialog({
  open,
  onOpenChange,
  entry,
  audits,
  isLoading,
  error,
}: FinancialEntryHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trilha de auditoria do lancamento</DialogTitle>
          <DialogDescription>
            {entry
              ? `Veja quem alterou ${entry.counterparty_name} e o que mudou no registro.`
              : "Veja as alteracoes registradas para este lancamento."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="rounded-[1.5rem] border border-dashed border-[color:var(--color-border)] bg-white/90 px-5 py-6 text-sm text-[color:var(--color-muted)]">
            Carregando historico do lancamento...
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="rounded-[1.5rem] border border-[rgba(153,27,27,0.18)] bg-red-50 px-5 py-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {!isLoading && !error && audits.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-[color:var(--color-border)] bg-white/90 px-5 py-6 text-sm text-[color:var(--color-muted)]">
            Ainda nao houve alteracoes auditadas para este lancamento.
          </div>
        ) : null}

        {!isLoading && !error && audits.length > 0 ? (
          <div className="space-y-4">
            {audits.map((audit) => {
              const visibleChanges = audit.changed_fields.filter(
                (field) => !field.field.endsWith("_id"),
              );

              return (
                <section
                  key={audit.id}
                  className="rounded-[1.5rem] border border-[color:var(--color-border)] bg-white/92 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                        {audit.reason}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.24em] text-[color:var(--color-accent)]">
                        {audit.user_name ?? "Usuario nao identificado"} - {new Date(audit.created_at).toLocaleString("pt-PT")}
                      </p>
                    </div>
                    <div className="rounded-full border border-[rgba(15,118,110,0.16)] bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900">
                      {visibleChanges.length} mudanca{visibleChanges.length === 1 ? "" : "s"}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {visibleChanges.map((change) => (
                      <div
                        key={`${audit.id}-${change.field}`}
                        className="rounded-[1.25rem] border border-[rgba(15,118,110,0.08)] bg-[rgba(240,253,250,0.6)] px-4 py-3"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
                          {getFinancialAuditFieldLabel(change.field)}
                        </p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-xs text-[color:var(--color-muted)]">Antes</p>
                            <p className="mt-1 text-sm text-[color:var(--color-foreground)]">
                              {formatAuditValue(change.field, change.old_value)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[color:var(--color-muted)]">Depois</p>
                            <p className="mt-1 text-sm font-semibold text-[color:var(--color-foreground)]">
                              {formatAuditValue(change.field, change.new_value)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
