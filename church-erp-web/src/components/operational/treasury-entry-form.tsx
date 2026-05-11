"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Surface } from "@/components/design-system/surface";
import { CounterpartyInlineDialog } from "@/components/operational/counterparty-inline-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  formatDecimalAmountForDisplay,
  normalizeLocalizedAmountInput,
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
  FinancialEntryErrorResponse,
  FinancialEntryPayload,
  FinancialEntryResponse,
} from "@/features/finance/financial-entry";

type TreasuryEntryFormData = {
  entry_type: FinancialEntryPayload["entry_type"];
  amount_input: string;
  financial_category_id: string;
  counterparty_id: string;
  cost_center_name: string;
};

const initialForm: TreasuryEntryFormData = {
  entry_type: "income",
  amount_input: "",
  financial_category_id: "",
  counterparty_id: "",
  cost_center_name: "",
};

function getDefaultCategoryId(
  categories: FinancialCategoryOption[],
  entryType: FinancialEntryPayload["entry_type"],
): string {
  const category = categories.find((item) => item.kind === entryType);

  return category ? String(category.id) : "";
}

function sortCounterparties(
  counterparties: FinancialCounterpartyOption[],
): FinancialCounterpartyOption[] {
  return [...counterparties].sort((left, right) => left.name.localeCompare(right.name));
}

type FieldErrors = Partial<
  Record<
    | keyof TreasuryEntryFormData
    | keyof FinancialEntryPayload
    | "amount"
    | "payload",
    string[]
  >
>;

export function TreasuryEntryForm() {
  const [status, setStatus] = useState<TreasuryEntryFormStatus>("loading_categories");
  const [categories, setCategories] = useState<FinancialCategoryOption[]>([]);
  const [counterparties, setCounterparties] = useState<FinancialCounterpartyOption[]>([]);
  const [form, setForm] = useState<TreasuryEntryFormData>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastSavedSummary, setLastSavedSummary] = useState<string | null>(null);
  const [isCounterpartyDialogOpen, setIsCounterpartyDialogOpen] = useState(false);
  const counterpartyDialogCloseReasonRef =
    useRef<CounterpartyDialogCloseReason>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFormOptions() {
      setStatus("loading_categories");
      setFeedback(null);

      try {
        const categoriesResponse = await fetch("/api/finance/categories", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const categoriesBody = (await categoriesResponse.json()) as
          | FinancialCategoriesResponse
          | FinancialEntryErrorResponse;

        if (!categoriesResponse.ok) {
          if (controller.signal.aborted) {
            return;
          }

          setStatus(
            categoriesResponse.status === 401 || categoriesResponse.status === 403
              ? "denied_or_session_invalid"
              : "server_error",
          );
          setFeedback(
            "message" in categoriesBody && typeof categoriesBody.message === "string"
              ? categoriesBody.message
              : "Server error",
          );
          return;
        }

        const nextCategories = (categoriesBody as FinancialCategoriesResponse).data.financial_categories;
        setCategories(nextCategories);
        setForm((current) => ({
          ...current,
          financial_category_id: getDefaultCategoryId(nextCategories, current.entry_type),
        }));

        setStatus("loading_counterparties");

        const counterpartiesResponse = await fetch("/api/finance/counterparties", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const counterpartiesBody = (await counterpartiesResponse.json()) as
          | FinancialCounterpartiesResponse
          | FinancialCounterpartyErrorResponse;

        if (!counterpartiesResponse.ok) {
          if (controller.signal.aborted) {
            return;
          }

          setStatus(
            counterpartiesResponse.status === 401 || counterpartiesResponse.status === 403
              ? "denied_or_session_invalid"
              : "server_error",
          );
          setFeedback(
            "message" in counterpartiesBody && typeof counterpartiesBody.message === "string"
              ? counterpartiesBody.message
              : "Server error",
          );
          return;
        }

        setCounterparties(
          sortCounterparties(
            (counterpartiesBody as FinancialCounterpartiesResponse).data.financial_counterparties,
          ),
        );
        setStatus(getTreasuryEntryReadyStatus(nextCategories.length));
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setStatus("server_error");
        setFeedback("Server error");
      }
    }

    void loadFormOptions();

    return () => {
      controller.abort();
    };
  }, []);

  const filteredCategories = categories.filter(
    (category) => category.kind === form.entry_type,
  );

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
      payload: undefined,
    }));

    if (
      status === "entry_validation_error"
      || status === "inline_success_selected"
      || status === "counterparty_dialog_cancelled"
      || status === "server_error"
    ) {
      setStatus(getTreasuryEntryReadyStatus(categories.length));
    }

    if (feedback) {
      setFeedback(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedAmount = normalizeLocalizedAmountInput(form.amount_input);
    const nextErrors: FieldErrors = {};

    if (!normalizedAmount) {
      nextErrors.amount = ["Informe um valor valido, como 125,40."];
      nextErrors.amount_input = ["Informe um valor valido, como 125,40."];
    }

    if (!form.financial_category_id) {
      nextErrors.financial_category_id = ["Escolha o subtipo deste lancamento."];
    }

    if (!form.counterparty_id) {
      nextErrors.counterparty_id = ["Escolha a contraparte deste lancamento."];
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFeedback("Revise os campos destacados e tente novamente.");
      setStatus("entry_validation_error");
      return;
    }

    setStatus("entry_submitting");
    setFieldErrors({});
    setFeedback(null);

    const amount = normalizedAmount ?? "";
    const payload: FinancialEntryPayload = {
      entry_type: form.entry_type,
      amount,
      financial_category_id: Number(form.financial_category_id),
      counterparty_id: Number(form.counterparty_id),
      cost_center_name: form.cost_center_name.trim(),
    };

    try {
      const response = await fetch("/api/finance/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as
        | FinancialEntryResponse
        | FinancialEntryErrorResponse;

      if (!response.ok) {
        const errorBody = body as FinancialEntryErrorResponse;

        setFieldErrors((errorBody.errors ?? {}) as FieldErrors);
        setFeedback(errorBody.message);
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

      setLastSavedSummary(
        `${successBody.data.message} ${payload.entry_type === "income" ? "Receita" : "Despesa"} de ${formatDecimalAmountForDisplay(payload.amount)} para ${successBody.data.counterparty_name}.`,
      );
      setForm({
        ...initialForm,
        financial_category_id: getDefaultCategoryId(categories, initialForm.entry_type),
      });
      setFeedback(successBody.data.message);
      setStatus(getTreasuryEntryReadyStatus(categories.length));
    } catch {
      setFeedback("Server error");
      setStatus("server_error");
    }
  }

  function handleCounterpartyCreated(counterparty: FinancialCounterpartyOption) {
    counterpartyDialogCloseReasonRef.current = "created";
    setCounterparties((current) => sortCounterparties([...current, counterparty]));
    setForm((current) => ({
      ...current,
      counterparty_id: String(counterparty.id),
    }));
    setFieldErrors((current) => ({
      ...current,
      counterparty_id: undefined,
    }));
    setFeedback("Contraparte cadastrada e selecionada no lancamento.");
  }

  function handleCounterpartyAuthorizationFailure(message: string) {
    counterpartyDialogCloseReasonRef.current = "access_failure";
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
    status === "loading_categories" || status === "loading_counterparties";
  const isSubmitting = status === "entry_submitting";

  return (
    <Surface className="overflow-hidden bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(240,253,250,0.9))] p-6 sm:p-7">
      <CounterpartyInlineDialog
        open={isCounterpartyDialogOpen}
        onOpenChange={handleCounterpartyDialogOpenChange}
        onCreated={handleCounterpartyCreated}
        onAuthorizationFailure={handleCounterpartyAuthorizationFailure}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
            Lancamento rapido
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
            Registre a receita ou despesa sem sair da home.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--color-muted)]">
            O fluxo fica curto de proposito: escolha o tipo, informe o valor,
            selecione o subtipo real da igreja e conclua o registro com
            contraparte e centro de custo.
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-[rgba(15,118,110,0.18)] bg-white/80 px-4 py-3 text-sm text-[color:var(--color-muted)]">
          {status === "loading_categories" && "Carregando subtipos do tenant..."}
          {status === "loading_counterparties" && "Carregando contrapartes do tenant..."}
          {status === "counterparty_dialog_open" && "Cadastro inline de contraparte em andamento."}
          {status === "counterparty_dialog_cancelled" && "Cadastro inline fechado sem alterar o formulario."}
          {status === "inline_success_selected" && "Nova contraparte pronta e selecionada."}
          {status === "entry_submitting" && "Salvando lancamento..."}
          {status === "ready" && "Formulario pronto para uso."}
          {status === "entry_validation_error" && "Revise os campos destacados."}
          {status === "blocked_categories_missing" && "Sem categorias financeiras disponiveis."}
          {status === "denied_or_session_invalid" && "Acesso interrompido para este fluxo."}
          {status === "server_error" && "Server error"}
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
          {feedback ?? "Server error"}
        </div>
      ) : null}

      {feedback
      && status !== "denied_or_session_invalid"
      && status !== "server_error" ? (
        <div
          className={`mt-6 rounded-[1.5rem] px-5 py-4 text-sm ${
            status === "inline_success_selected" || lastSavedSummary
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
            {filteredCategories.length === 0 ? (
              <p className="mt-2 text-xs text-[color:var(--color-muted)]">
                Nenhuma categoria {form.entry_type === "income" ? "de receita" : "de despesa"} esta disponivel agora.
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
            {status === "entry_submitting" ? "Salvando..." : "Salvar lancamento"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="rounded-[1.25rem]"
            disabled={isSubmitting}
            onClick={() => {
              setForm({
                ...initialForm,
                financial_category_id: getDefaultCategoryId(
                  categories,
                  initialForm.entry_type,
                ),
              });
              setFieldErrors({});
              setFeedback(null);
              setLastSavedSummary(null);
              setStatus(getTreasuryEntryReadyStatus(categories.length));
            }}
          >
            Limpar formulario
          </Button>
        </div>
      </form>
    </Surface>
  );
}
