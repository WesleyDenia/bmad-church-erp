"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  classifyInlineCounterpartyFailureStatus,
  type InlineDialogStatus,
} from "@/features/finance/counterparty-inline-state";
import type {
  CreateFinancialCounterpartyPayload,
  FinancialCounterpartyErrorResponse,
  FinancialCounterpartyOption,
  FinancialCounterpartyResponse,
} from "@/features/finance/counterparty";

type CounterpartyInlineDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (counterparty: FinancialCounterpartyOption) => void;
  onAuthorizationFailure: (message: string) => void;
};

type FieldErrors = Partial<Record<keyof CreateFinancialCounterpartyPayload | "payload", string[]>>;

const initialErrors: FieldErrors = {};

export function CounterpartyInlineDialog({
  open,
  onOpenChange,
  onCreated,
  onAuthorizationFailure,
}: CounterpartyInlineDialogProps) {
  const [status, setStatus] = useState<InlineDialogStatus>("idle");
  const [name, setName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(initialErrors);
  const [feedback, setFeedback] = useState<string | null>(null);

  function resetDialogState() {
    setName("");
    setFieldErrors(initialErrors);
    setFeedback(null);
    setStatus("idle");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetDialogState();
    }

    onOpenChange(nextOpen);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus("creating_counterparty");
    setFieldErrors(initialErrors);
    setFeedback(null);

    const payload: CreateFinancialCounterpartyPayload = {
      name: name.trim(),
    };

    try {
      const response = await fetch("/api/finance/counterparties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as
        | FinancialCounterpartyResponse
        | FinancialCounterpartyErrorResponse;

      if (!response.ok) {
        const errorBody = body as FinancialCounterpartyErrorResponse;
        const nextStatus = classifyInlineCounterpartyFailureStatus(response.status);

        if (nextStatus === "denied_or_session_invalid") {
          onAuthorizationFailure(errorBody.message);
          handleOpenChange(false);
          return;
        }

        setFieldErrors((errorBody.errors ?? {}) as FieldErrors);
        setFeedback(errorBody.message);
        setStatus(nextStatus);
        return;
      }

      onCreated((body as FinancialCounterpartyResponse).data);
      handleOpenChange(false);
    } catch {
      setFeedback("Server error");
      setStatus("server_error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
            Contraparte inline
          </p>
          <DialogTitle>Cadastrar sem sair do lancamento</DialogTitle>
          <DialogDescription>
            Informe apenas o nome. Se estiver valido, a nova contraparte volta
            selecionada para o formulario principal.
          </DialogDescription>
        </DialogHeader>

        {feedback ? (
          <div
            className={`mt-5 rounded-[1.5rem] px-4 py-3 text-sm ${
              status === "server_error"
                ? "border border-[rgba(153,27,27,0.18)] bg-red-50 text-red-800"
                : "border border-[rgba(153,27,27,0.18)] bg-red-50 text-red-800"
            }`}
          >
            {feedback}
          </div>
        ) : null}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="counterparty-inline-name">Nome</Label>
            <Input
              id="counterparty-inline-name"
              name="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setFieldErrors((current) => ({
                  ...current,
                  name: undefined,
                  payload: undefined,
                }));
                if (feedback) {
                  setFeedback(null);
                }
                if (status !== "creating_counterparty") {
                  setStatus("idle");
                }
              }}
              disabled={status === "creating_counterparty"}
              placeholder="Ex.: Maria Souza"
            />
            {fieldErrors.name?.length ? (
              <p className="mt-2 text-sm font-medium text-red-700">
                {fieldErrors.name[0]}
              </p>
            ) : (
              <p className="mt-2 text-xs text-[color:var(--color-muted)]">
                Use o nome como ele deve aparecer no historico financeiro.
              </p>
            )}
          </div>

          {fieldErrors.payload?.length ? (
            <p className="rounded-[1.25rem] border border-[rgba(153,27,27,0.18)] bg-red-50 px-4 py-3 text-sm text-red-800">
              {fieldErrors.payload[0]}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              className="rounded-[1.25rem]"
              disabled={status === "creating_counterparty"}
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="rounded-[1.25rem]"
              disabled={status === "creating_counterparty"}
            >
              {status === "creating_counterparty" ? "Salvando..." : "Cadastrar contraparte"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
