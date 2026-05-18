"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Surface } from "@/components/design-system/surface";
import { CounterpartyInlineDialog } from "@/components/operational/counterparty-inline-dialog";
import { FinancialEntryHistoryDialog } from "@/components/operational/financial-entry-history-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatDecimalAmountForDisplay,
} from "@/features/finance/amount";
import {
  getTreasuryEntryReadyStatus,
  resolveCounterpartyDialogCloseStatus,
  type CounterpartyDialogCloseReason,
  type TreasuryEntryFormStatus,
} from "@/features/finance/counterparty-inline-state";
import type {
  FinancialCounterpartiesResponse,
  FinancialCounterpartyErrorResponse,
  FinancialCounterpartyOption,
} from "@/features/finance/counterparty";
import type {
  FinancialCategoriesResponse,
  FinancialCategoryOption,
  FinancialEntryAuditErrorResponse,
  FinancialEntryAuditRecord,
  FinancialEntryAuditsResponse,
  FinancialEntriesErrorResponse,
  FinancialEntriesResponse,
  FinancialEntryErrorResponse,
  FinancialEntryListItem,
  FinancialEntryMode,
  FinancialEntryPayload,
  FinancialEntryResponse,
  UpdateFinancialEntryPayload,
} from "@/features/finance/financial-entry";
import {
  buildFinancialEntryListItemFromResponse,
  buildFinancialEntryRequestPayload,
  normalizeFinancialEntryUiMessage,
  upsertFinancialEntryListItem,
  validateFinancialEntryDraft,
} from "@/features/finance/financial-entry";
import {
  getDefaultCategoryId,
  initialTreasuryEntryFormData,
  preserveTreasuryEntryFormData,
  resetTreasuryEntryFormData,
  selectCreatedCounterparty,
  type TreasuryEntryFormData,
} from "@/features/finance/treasury-entry-form-state";

function sortCounterparties(
  counterparties: FinancialCounterpartyOption[],
): FinancialCounterpartyOption[] {
  return [...counterparties].sort((left, right) => left.name.localeCompare(right.name));
}

type FieldErrors = Partial<
  Record<
    | keyof TreasuryEntryFormData
    | keyof FinancialEntryPayload
    | keyof UpdateFinancialEntryPayload
    | "amount"
    | "payload",
    string[]
  >
>;

type LoadResult = {
  categories: FinancialCategoryOption[];
  counterparties: FinancialCounterpartyOption[];
  entries: FinancialEntryListItem[];
};

function getNextReadyStatus(
  categoriesCount: number,
  mode: FinancialEntryMode,
): TreasuryEntryFormStatus {
  if (categoriesCount === 0) {
    return "blocked_categories_missing";
  }

  return mode === "edit" ? "editing" : "ready";
}

export function TreasuryEntryForm() {
  const [status, setStatus] = useState<TreasuryEntryFormStatus>("loading_categories");
  const [categories, setCategories] = useState<FinancialCategoryOption[]>([]);
  const [counterparties, setCounterparties] = useState<FinancialCounterpartyOption[]>([]);
  const [entries, setEntries] = useState<FinancialEntryListItem[]>([]);
  const [form, setForm] = useState<TreasuryEntryFormData>(
    initialTreasuryEntryFormData,
  );
  const [editReason, setEditReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastSavedSummary, setLastSavedSummary] = useState<string | null>(null);
  const [isCounterpartyDialogOpen, setIsCounterpartyDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinancialEntryListItem | null>(null);
  const [historyEntry, setHistoryEntry] = useState<FinancialEntryListItem | null>(null);
  const [historyAudits, setHistoryAudits] = useState<FinancialEntryAuditRecord[]>([]);
  const [historyFeedback, setHistoryFeedback] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const counterpartyDialogCloseReasonRef =
    useRef<CounterpartyDialogCloseReason>(null);

  const mode: FinancialEntryMode = editingEntry ? "edit" : "create";

  useEffect(() => {
    const controller = new AbortController();

    async function loadWorkspace() {
      setStatus("loading_categories");
      setFeedback(null);

      try {
        const nextWorkspace = await loadWorkspaceData(controller.signal);

        setCategories(nextWorkspace.categories);
        setCounterparties(sortCounterparties(nextWorkspace.counterparties));
        setEntries(nextWorkspace.entries);
        setForm((current) => ({
          ...current,
          financial_category_id: getDefaultCategoryId(nextWorkspace.categories, current.entry_type),
        }));
        setStatus(getTreasuryEntryReadyStatus(nextWorkspace.categories.length));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Server error";
        setFeedback(normalizeFinancialEntryUiMessage(message));
        setStatus(
          message === "Sessao invalida. Entre novamente." || message === "Acesso negado para esta area."
            ? "denied_or_session_invalid"
            : "server_error",
        );
      }
    }

    void loadWorkspace();

    return () => {
      controller.abort();
    };
  }, []);

  const filteredCategories = categories.filter(
    (category) => category.kind === form.entry_type,
  );

  async function loadWorkspaceData(signal?: AbortSignal): Promise<LoadResult> {
    const categoriesResponse = await fetch("/api/finance/categories", {
      method: "GET",
      cache: "no-store",
      signal,
    });

    const categoriesBody = (await categoriesResponse.json()) as
      | FinancialCategoriesResponse
      | FinancialEntryErrorResponse;

    if (!categoriesResponse.ok) {
      throw new Error(
        "message" in categoriesBody && typeof categoriesBody.message === "string"
          ? categoriesBody.message
          : "Server error",
      );
    }

    setStatus("loading_counterparties");

    const counterpartiesResponse = await fetch("/api/finance/counterparties", {
      method: "GET",
      cache: "no-store",
      signal,
    });

    const counterpartiesBody = (await counterpartiesResponse.json()) as
      | FinancialCounterpartiesResponse
      | FinancialCounterpartyErrorResponse;

    if (!counterpartiesResponse.ok) {
      throw new Error(
        "message" in counterpartiesBody && typeof counterpartiesBody.message === "string"
          ? counterpartiesBody.message
          : "Server error",
      );
    }

    setStatus("loading_entries");

    const entriesResponse = await fetch("/api/finance/entries", {
      method: "GET",
      cache: "no-store",
      signal,
    });

    const entriesBody = (await entriesResponse.json()) as
      | FinancialEntriesResponse
      | FinancialEntriesErrorResponse;

    if (!entriesResponse.ok) {
      throw new Error(
        "message" in entriesBody && typeof entriesBody.message === "string"
          ? entriesBody.message
          : "Server error",
      );
    }

    return {
      categories: (categoriesBody as FinancialCategoriesResponse).data.financial_categories,
      counterparties: (counterpartiesBody as FinancialCounterpartiesResponse).data.financial_counterparties,
      entries: (entriesBody as FinancialEntriesResponse).data.financial_entries,
    };
  }

  async function refreshEntries(): Promise<void> {
    const response = await fetch("/api/finance/entries", {
      method: "GET",
      cache: "no-store",
    });

    const body = (await response.json()) as
      | FinancialEntriesResponse
      | FinancialEntriesErrorResponse;

    if (!response.ok) {
      throw new Error(
        "message" in body && typeof body.message === "string"
          ? body.message
          : "Server error",
      );
    }

    setEntries((body as FinancialEntriesResponse).data.financial_entries);
  }

  async function handleRefreshEntries(): Promise<void> {
    try {
      await refreshEntries();
      setFeedback("Lista de lancamentos atualizada.");
      setStatus(getNextReadyStatus(categories.length, mode));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Server error";
      setFeedback(normalizeFinancialEntryUiMessage(message));
      setStatus("server_error");
    }
  }

  function updateField(field: keyof TreasuryEntryFormData, value: string) {
    setForm((current) => {
      if (field === "entry_type") {
        return {
          ...current,
          entry_type: value as FinancialEntryPayload["entry_type"],
          financial_category_id: getDefaultCategoryId(
            categories,
            value as FinancialEntryPayload["entry_type"],
          ),
        };
      }

      return { ...current, [field]: value };
    });

    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
      amount: field === "amount_input" ? undefined : current.amount,
      financial_category_id:
        field === "financial_category_id" ? undefined : current.financial_category_id,
      counterparty_id:
        field === "counterparty_id" ? undefined : current.counterparty_id,
      cost_center_name:
        field === "cost_center_name" ? undefined : current.cost_center_name,
      payload: undefined,
      reason: editingEntry ? current.reason : undefined,
    }));

    if (
      status === "entry_validation_error"
      || status === "reason_required_error"
      || status === "inline_success_selected"
      || status === "counterparty_dialog_cancelled"
      || status === "server_error"
      || status === "success"
    ) {
      setStatus(getNextReadyStatus(categories.length, mode));
    }

    if (feedback) {
      setFeedback(null);
    }
  }

  function updateReason(value: string) {
    setEditReason(value);
    setFieldErrors((current) => ({
      ...current,
      reason: undefined,
      payload: undefined,
    }));

    if (status === "reason_required_error" || status === "entry_validation_error") {
      setStatus("editing");
    }

    if (feedback) {
      setFeedback(null);
    }
  }

  function resetToCreateMode() {
    setEditingEntry(null);
    setEditReason("");
    setForm({
      ...resetTreasuryEntryFormData(categories),
    });
    setFieldErrors({});
    setStatus(getTreasuryEntryReadyStatus(categories.length));
  }

  function startEditing(entry: FinancialEntryListItem) {
    setEditingEntry(entry);
    setEditReason("");
    setFieldErrors({});
    setFeedback(null);
    setLastSavedSummary(null);
    setForm({
      entry_type: entry.entry_type,
      amount_input: formatDecimalAmountForDisplay(entry.amount),
      financial_category_id: String(entry.financial_category_id),
      counterparty_id: entry.counterparty_id ? String(entry.counterparty_id) : "",
      cost_center_name: entry.cost_center_name,
    });
    setStatus("editing");
  }

  async function openHistory(entry: FinancialEntryListItem) {
    setHistoryEntry(entry);
    setHistoryAudits([]);
    setHistoryFeedback(null);
    setIsHistoryLoading(true);
    setIsHistoryOpen(true);

    try {
      const response = await fetch(`/api/finance/entries/${entry.id}/audits`, {
        method: "GET",
        cache: "no-store",
      });

      const body = (await response.json()) as
        | FinancialEntryAuditsResponse
        | FinancialEntryAuditErrorResponse;

      if (!response.ok) {
        const errorBody = body as FinancialEntryAuditErrorResponse;
        setHistoryFeedback(normalizeFinancialEntryUiMessage(errorBody.message));
        return;
      }

      setHistoryAudits((body as FinancialEntryAuditsResponse).data.audits);
    } catch {
      setHistoryFeedback("Nao foi possivel carregar o historico agora.");
    } finally {
      setIsHistoryLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateFinancialEntryDraft(
      {
        ...form,
        reason: editReason,
      },
      { mode },
    );

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors as FieldErrors);
      setFeedback(
        nextErrors.reason
          ? "O motivo e obrigatorio para alteracoes financeiras."
          : "Revise os campos destacados e tente novamente.",
      );
      setStatus(nextErrors.reason ? "reason_required_error" : "entry_validation_error");
      return;
    }

    setStatus("entry_submitting");
    setFieldErrors({});
    setFeedback(null);

    const payload = buildFinancialEntryRequestPayload(
      {
        ...form,
        reason: editReason,
      },
      { mode },
    );

    try {
      const response = await fetch(
        mode === "edit" && editingEntry
          ? `/api/finance/entries/${editingEntry.id}`
          : "/api/finance/entries",
        {
          method: mode === "edit" ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const body = (await response.json()) as
        | FinancialEntryResponse
        | FinancialEntryErrorResponse;

      if (!response.ok) {
        const errorBody = body as FinancialEntryErrorResponse;

        setFieldErrors((errorBody.errors ?? {}) as FieldErrors);
        setFeedback(normalizeFinancialEntryUiMessage(errorBody.message));
        setStatus(
          response.status === 422
            ? "entry_validation_error"
            : response.status === 401 || response.status === 403
              ? "denied_or_session_invalid"
              : "server_error",
        );
        return;
      }

      const successBody = body as FinancialEntryResponse;
      const humanAmount = formatDecimalAmountForDisplay(payload.amount);
      const summaryPrefix =
        mode === "edit"
          ? "Edicao concluida"
          : payload.entry_type === "income"
            ? "Receita salva"
            : "Despesa salva";
      const nextEntry = buildFinancialEntryListItemFromResponse(successBody.data);
      setEntries((current) => upsertFinancialEntryListItem(current, nextEntry));
      setLastSavedSummary(
        `${summaryPrefix}: ${humanAmount} para ${successBody.data.counterparty_name}.`,
      );
      setFeedback(successBody.data.message);
      resetToCreateMode();
      setStatus("success");

      void refreshEntries().catch(() => {
        setFeedback(
          `${successBody.data.message} A lista local foi atualizada, mas nao foi possivel recarregar todos os lancamentos agora.`,
        );
      });
    } catch {
      setFeedback("Nao foi possivel concluir a solicitacao agora.");
      setStatus("server_error");
    }
  }

  function handleCounterpartyCreated(counterparty: FinancialCounterpartyOption) {
    counterpartyDialogCloseReasonRef.current = "created";
    setCounterparties((current) => sortCounterparties([...current, counterparty]));
    setForm((current) => selectCreatedCounterparty(current, counterparty));
    setFieldErrors((current) => ({
      ...current,
      counterparty_id: undefined,
    }));
    setFeedback("Contraparte cadastrada e selecionada no lancamento.");
  }

  function handleCounterpartyAuthorizationFailure(message: string) {
    counterpartyDialogCloseReasonRef.current = "access_failure";
    setForm((current) => preserveTreasuryEntryFormData(current));
    setFeedback(message);
    setFieldErrors((current) => ({
      ...current,
      counterparty_id: undefined,
    }));
    setLastSavedSummary(null);
  }

  function handleCounterpartyDialogOpenChange(open: boolean) {
    setIsCounterpartyDialogOpen(open);

    if (open) {
      setStatus("counterparty_dialog_open");
      return;
    }

    const closeReason = counterpartyDialogCloseReasonRef.current;
    counterpartyDialogCloseReasonRef.current = null;

    setStatus(
      resolveCounterpartyDialogCloseStatus({
        closeReason,
        previousStatus: status,
        readyStatus: getTreasuryEntryReadyStatus(categories.length),
      }),
    );
  }

  const isLoading =
    status === "loading_categories"
    || status === "loading_counterparties"
    || status === "loading_entries";
  const isSubmitting = status === "entry_submitting";

  return (
    <Surface className="overflow-hidden bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(240,253,250,0.9))] p-6 sm:p-7">
      <CounterpartyInlineDialog
        open={isCounterpartyDialogOpen}
        onOpenChange={handleCounterpartyDialogOpenChange}
        onCreated={handleCounterpartyCreated}
        onAuthorizationFailure={handleCounterpartyAuthorizationFailure}
      />
      <FinancialEntryHistoryDialog
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        entry={historyEntry}
        audits={historyAudits}
        isLoading={isHistoryLoading}
        error={historyFeedback}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
            {mode === "edit" ? "Revisao financeira" : "Lancamento rapido"}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
            {mode === "edit"
              ? "Corrija o lancamento e registre o motivo da alteracao."
              : "Registre a receita ou despesa sem sair da home."}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--color-muted)]">
            {mode === "edit"
              ? "A edicao reaproveita o mesmo formulario operacional, mas exige motivo e deixa a trilha pronta para auditoria."
              : "O fluxo fica curto de proposito: escolha o tipo, informe o valor, selecione o subtipo real da igreja e conclua o registro com contraparte e centro de custo."}
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-[rgba(15,118,110,0.18)] bg-white/80 px-4 py-3 text-sm text-[color:var(--color-muted)]">
          {status === "loading_categories" && "Carregando subtipos do tenant..."}
          {status === "loading_counterparties" && "Carregando contrapartes do tenant..."}
          {status === "loading_entries" && "Carregando lancamentos recentes..."}
          {status === "counterparty_dialog_open" && "Cadastro inline de contraparte em andamento."}
          {status === "counterparty_dialog_cancelled" && "Cadastro inline fechado sem alterar o formulario."}
          {status === "inline_success_selected" && "Nova contraparte pronta e selecionada."}
          {status === "entry_submitting" && "Salvando lancamento..."}
          {status === "ready" && "Formulario pronto para uso."}
          {status === "editing" && "Modo de edicao ativo para um lancamento salvo."}
          {status === "reason_required_error" && "Informe o motivo antes de concluir a edicao."}
          {status === "entry_validation_error" && "Revise os campos destacados."}
          {status === "success" && "Alteracao registrada com trilha de auditoria."}
          {status === "blocked_categories_missing" && "Sem categorias financeiras disponiveis."}
          {status === "denied_or_session_invalid" && "Acesso interrompido para este fluxo."}
          {status === "server_error" && "Nao foi possivel concluir a solicitacao agora."}
        </div>
      </div>

      {status === "blocked_categories_missing" ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-[color:var(--color-border)] bg-white/88 p-5">
          <p className="text-base font-semibold text-[color:var(--color-foreground)]">
            Nao ha categorias financeiras disponiveis para esta igreja.
          </p>
          <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
            O lancamento rapido fica bloqueado ate que a base minima de categorias
            esteja pronta. Atualize a configuracao financeira da igreja e tente de novo.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-5 rounded-[1.25rem]"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}

      {status === "denied_or_session_invalid" ? (
        <div className="mt-6 rounded-[1.5rem] border border-[rgba(153,27,27,0.18)] bg-red-50 px-5 py-4 text-sm text-red-800">
          {feedback ?? "Sessao invalida. Entre novamente."}
        </div>
      ) : null}

      {status === "server_error" ? (
        <div className="mt-6 rounded-[1.5rem] border border-[rgba(153,27,27,0.18)] bg-red-50 px-5 py-4 text-sm text-red-800">
          {feedback ?? "Nao foi possivel concluir a solicitacao agora."}
        </div>
      ) : null}

      {feedback
      && status !== "denied_or_session_invalid"
      && status !== "server_error" ? (
        <div
          className={`mt-6 rounded-[1.5rem] px-5 py-4 text-sm ${
            status === "inline_success_selected" || status === "success" || lastSavedSummary
              ? "border border-[rgba(15,118,110,0.18)] bg-teal-50 text-teal-900"
              : "border border-[rgba(153,27,27,0.18)] bg-red-50 text-red-800"
          }`}
        >
          <p>{feedback}</p>
          {lastSavedSummary ? (
            <p className="mt-2">{lastSavedSummary}</p>
          ) : null}
        </div>
      ) : null}

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="entry_type">Tipo</Label>
            <Select
              id="entry_type"
              name="entry_type"
              value={form.entry_type}
              onChange={(event) => updateField("entry_type", event.target.value)}
              disabled={isLoading || isSubmitting}
            >
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount_input">Valor</Label>
            <Input
              id="amount_input"
              name="amount_input"
              inputMode="decimal"
              placeholder="125,40"
              value={form.amount_input}
              onChange={(event) => updateField("amount_input", event.target.value)}
              disabled={isLoading || isSubmitting}
            />
            {fieldErrors.amount?.length || fieldErrors.amount_input?.length ? (
              <p className="mt-2 text-sm font-medium text-red-700">
                {fieldErrors.amount?.[0] ?? fieldErrors.amount_input?.[0]}
              </p>
            ) : (
              <p className="mt-2 text-xs text-[color:var(--color-muted)]">
                Aceita digitacao localizada. O envio sai normalizado como decimal.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="financial_category_id">Subtipo</Label>
            <Select
              id="financial_category_id"
              name="financial_category_id"
              value={form.financial_category_id}
              onChange={(event) =>
                updateField("financial_category_id", event.target.value)}
              disabled={isLoading || isSubmitting || filteredCategories.length === 0}
            >
              <option value="">Selecione o subtipo</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </Select>
            {fieldErrors.financial_category_id?.length ? (
              <p className="mt-2 text-sm font-medium text-red-700">
                {fieldErrors.financial_category_id[0]}
              </p>
            ) : null}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="counterparty_id">Contraparte</Label>
              <Button
                type="button"
                variant="ghost"
                className="h-auto px-0 py-0 text-sm text-[color:var(--color-accent)] hover:bg-transparent"
                disabled={isLoading || isSubmitting}
                onClick={() => {
                  counterpartyDialogCloseReasonRef.current = null;
                  handleCounterpartyDialogOpenChange(true);
                }}
              >
                Nao encontrou? Cadastrar agora
              </Button>
            </div>
            <Select
              id="counterparty_id"
              name="counterparty_id"
              value={form.counterparty_id}
              onChange={(event) => updateField("counterparty_id", event.target.value)}
              disabled={isLoading || isSubmitting}
            >
              <option value="">Selecione a contraparte</option>
              {counterparties.map((counterparty) => (
                <option key={counterparty.id} value={String(counterparty.id)}>
                  {counterparty.name}
                </option>
              ))}
            </Select>
            {fieldErrors.counterparty_id?.length ? (
              <p className="mt-2 text-sm font-medium text-red-700">
                {fieldErrors.counterparty_id[0]}
              </p>
            ) : (
              <p className="mt-2 text-xs text-[color:var(--color-muted)]">
                A nova contraparte volta selecionada aqui sem limpar os outros campos.
              </p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="cost_center_name">Centro de custo</Label>
          <Input
            id="cost_center_name"
            name="cost_center_name"
            value={form.cost_center_name}
            onChange={(event) => updateField("cost_center_name", event.target.value)}
            disabled={isLoading || isSubmitting}
          />
          {fieldErrors.cost_center_name?.length ? (
            <p className="mt-2 text-sm font-medium text-red-700">
              {fieldErrors.cost_center_name[0]}
            </p>
          ) : null}
        </div>

        {mode === "edit" ? (
          <div>
            <Label htmlFor="reason">Motivo da alteracao</Label>
            <Textarea
              id="reason"
              name="reason"
              placeholder="Explique o que foi corrigido para manter a prestacao de contas clara."
              value={editReason}
              onChange={(event) => updateReason(event.target.value)}
              disabled={isSubmitting}
            />
            {fieldErrors.reason?.length ? (
              <p className="mt-2 text-sm font-medium text-red-700">
                {fieldErrors.reason[0]}
              </p>
            ) : (
              <p className="mt-2 text-xs text-[color:var(--color-muted)]">
                O motivo entra na trilha de auditoria junto com usuario, horario e snapshots da mudanca.
              </p>
            )}
          </div>
        ) : null}

        {fieldErrors.payload?.length ? (
          <p className="rounded-[1.25rem] border border-[rgba(153,27,27,0.18)] bg-red-50 px-4 py-3 text-sm text-red-800">
            {fieldErrors.payload[0]}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            size="lg"
            className="rounded-[1.25rem]"
            disabled={
              isLoading
              || isSubmitting
              || status === "blocked_categories_missing"
              || status === "denied_or_session_invalid"
              || (status === "server_error" && categories.length === 0)
            }
          >
            {status === "entry_submitting"
              ? "Salvando..."
              : mode === "edit"
                ? "Salvar edicao"
                : "Salvar lancamento"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="rounded-[1.25rem]"
            disabled={isSubmitting}
            onClick={() => {
              setFeedback(null);
              setLastSavedSummary(null);
              resetToCreateMode();
            }}
          >
            {mode === "edit" ? "Cancelar edicao" : "Limpar formulario"}
          </Button>
        </div>
      </form>

      <section className="mt-8 border-t border-[rgba(15,118,110,0.12)] pt-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
              Rastreabilidade recente
            </p>
            <h3 className="mt-3 text-xl font-semibold text-[color:var(--color-foreground)]">
              Revise os ultimos lancamentos sem sair da home.
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--color-muted)]">
              Abra a edicao quando algo precisar de correcao ou consulte o historico para entender o que mudou.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="rounded-[1.25rem]"
            onClick={() => void handleRefreshEntries()}
            disabled={isLoading || isSubmitting}
          >
            Atualizar lista
          </Button>
        </div>

        {entries.length === 0 ? (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-[color:var(--color-border)] bg-white/88 px-5 py-6 text-sm text-[color:var(--color-muted)]">
            Os lancamentos recentes aparecerao aqui assim que o primeiro registro for salvo.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {entries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-[1.5rem] border border-[color:var(--color-border)] bg-white/92 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--color-accent)]">
                      {entry.entry_type === "income" ? "Receita" : "Despesa"} - {entry.financial_category_name ?? "Sem subtipo"}
                    </p>
                    <h4 className="mt-2 text-lg font-semibold text-[color:var(--color-foreground)]">
                      {entry.counterparty_name}
                    </h4>
                    <p className="mt-2 text-sm text-[color:var(--color-muted)]">
                      {formatDecimalAmountForDisplay(entry.amount)} • {entry.cost_center_name}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-[1rem]"
                      onClick={() => startEditing(entry)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-[1rem]"
                      onClick={() => void openHistory(entry)}
                    >
                      Ver historico
                    </Button>
                  </div>
                </div>

                <div className="mt-4 rounded-[1.25rem] border border-[rgba(15,118,110,0.08)] bg-[rgba(240,253,250,0.6)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
                    Ultima rastreabilidade
                  </p>
                  <p className="mt-2 text-sm text-[color:var(--color-foreground)]">
                    {entry.latest_audit
                      ? `${entry.latest_audit.reason} - ${entry.latest_audit.user_name ?? "Usuario nao identificado"} - ${new Date(entry.latest_audit.created_at).toLocaleString("pt-PT")}`
                      : "Sem alteracoes registradas desde a criacao deste lancamento."}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </Surface>
  );
}
