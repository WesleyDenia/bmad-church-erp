"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { CommunicationMessageDraftMissingField } from "@/features/communications/message-draft";
import {
  beginCommunicationHandoffOperation,
  beginCommunicationShareOperation,
  createCommunicationHandoffState,
  getCommunicationHandoffEligibility,
  reconcileCommunicationDraftWarnings,
  resolveCommunicationHandoffOperation,
  writeCommunicationMessageToClipboard,
  type CommunicationHandoffAction,
  type CommunicationHandoffOperationResult,
  type CommunicationHandoffOperationSnapshot,
  type CommunicationHandoffState,
} from "@/features/communications/message-handoff";

type CommunicationMessageHandoffActionsProps = {
  draftText: string;
  draftRevision: number;
  missingFields: CommunicationMessageDraftMissingField[];
};

function statusMessage(status: CommunicationHandoffState["status"]): string | null {
  switch (status) {
    case "handoff_blocked_empty_message":
      return "Escreva uma mensagem antes de copiar ou partilhar.";
    case "handoff_blocked_too_long":
      return "A mensagem ultrapassa 5000 caracteres. Reduza o texto para continuar.";
    case "handoff_review_required":
      return "Revise os campos destacados antes de continuar.";
    case "copy_in_progress":
      return "Copiando mensagem.";
    case "copy_success":
      return "Mensagem copiada. Agora cole no WhatsApp ou no canal que preferir.";
    case "copy_fallback_required":
      return "Nao foi possivel copiar automaticamente. Selecione o texto e copie para continuar.";
    case "share_in_progress":
      return "Abrindo as opcoes de partilha.";
    case "share_success_or_returned":
      return "A mensagem foi aberta para partilha. Conclua o envio no canal escolhido.";
    case "share_cancelled_or_unavailable":
      return "Partilha cancelada ou indisponivel. A mensagem continua disponivel; use Copiar mensagem para continuar.";
    case "share_fallback_required":
      return "Nao foi possivel abrir a partilha. A mensagem continua disponivel para copiar manualmente.";
    default:
      return null;
  }
}

function isFailureStatus(status: CommunicationHandoffState["status"]): boolean {
  return status === "handoff_blocked_empty_message"
    || status === "handoff_blocked_too_long"
    || status === "copy_fallback_required"
    || status === "share_fallback_required";
}

export function CommunicationMessageHandoffActions({
  draftText,
  draftRevision,
  missingFields,
}: CommunicationMessageHandoffActionsProps) {
  const [handoffState, setHandoffState] = useState<CommunicationHandoffState>(() => (
    createCommunicationHandoffState(draftText, draftRevision)
  ));
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<CommunicationHandoffAction | null>(null);
  const [operationInFlight, setOperationInFlight] = useState(false);
  const handoffStateRef = useRef(handoffState);
  const latestTextRef = useRef(draftText);
  const latestRevisionRef = useRef(draftRevision);
  const operationInFlightRef = useRef(false);
  const fallbackOriginRef = useRef<CommunicationHandoffAction>("copy");
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const manualTextRef = useRef<HTMLTextAreaElement>(null);

  const eligibility = useMemo(
    () => getCommunicationHandoffEligibility(draftText),
    [draftText],
  );
  const currentWarnings = useMemo(
    () => reconcileCommunicationDraftWarnings(draftText, missingFields),
    [draftText, missingFields],
  );
  const effectiveStatus = handoffState.draft_revision === draftRevision
    ? handoffState.status
    : eligibility.state;
  const isBusy = operationInFlight
    || effectiveStatus === "copy_in_progress"
    || effectiveStatus === "share_in_progress";
  const isBlocked = eligibility.state === "handoff_blocked_empty_message"
    || eligibility.state === "handoff_blocked_too_long";
  const message = statusMessage(effectiveStatus);

  function commitState(nextState: CommunicationHandoffState): void {
    handoffStateRef.current = nextState;
    setHandoffState(nextState);
  }

  function focusAction(action: CommunicationHandoffAction): void {
    queueMicrotask(() => {
      (action === "copy" ? copyButtonRef.current : shareButtonRef.current)?.focus();
    });
  }

  function closeManualDialog(): void {
    setManualDialogOpen(false);
  }

  useLayoutEffect(() => {
    latestTextRef.current = draftText;
    latestRevisionRef.current = draftRevision;
  }, [draftRevision, draftText]);

  useEffect(() => {
    if (!manualDialogOpen) {
      return;
    }

    queueMicrotask(() => {
      manualTextRef.current?.focus();
      manualTextRef.current?.select();
    });
  }, [draftText, manualDialogOpen]);

  function beginOperation(action: CommunicationHandoffAction): CommunicationHandoffOperationSnapshot | null {
    if (operationInFlightRef.current) {
      return null;
    }

    const currentState = handoffStateRef.current.draft_revision === draftRevision
      ? handoffStateRef.current
      : createCommunicationHandoffState(draftText, draftRevision);
    const started = beginCommunicationHandoffOperation(currentState, action, draftText);

    if (!started) {
      return null;
    }

    operationInFlightRef.current = true;
    setOperationInFlight(true);
    commitState(started.state);
    return started.snapshot;
  }

  function finishOperation(
    snapshot: CommunicationHandoffOperationSnapshot,
    result: CommunicationHandoffOperationResult,
  ): void {
    operationInFlightRef.current = false;
    setOperationInFlight(false);

    const completed = resolveCommunicationHandoffOperation(
      handoffStateRef.current,
      snapshot,
      result,
      latestTextRef.current,
      latestRevisionRef.current,
    );
    commitState(completed);

    if (completed.status === "copy_fallback_required" || completed.status === "share_fallback_required") {
      fallbackOriginRef.current = snapshot.action;
      setManualDialogOpen(true);
      return;
    }

    if (completed.status === "copy_success" && manualDialogOpen) {
      closeManualDialog();
    }
  }

  function runCopy(): void {
    const snapshot = beginOperation("copy");

    if (!snapshot) {
      return;
    }

    void writeCommunicationMessageToClipboard({
      is_secure_context: window.isSecureContext,
      clipboard: navigator.clipboard,
    }, snapshot.text).then((result) => {
      finishOperation(
        snapshot,
        result === "copy_completed" ? "copy_success" : "copy_fallback_required",
      );
    });
  }

  function runShare(): void {
    if (operationInFlightRef.current) {
      return;
    }

    const currentState = handoffStateRef.current.draft_revision === draftRevision
      ? handoffStateRef.current
      : createCommunicationHandoffState(draftText, draftRevision);
    operationInFlightRef.current = true;
    const started = beginCommunicationShareOperation(currentState, navigator, draftText);

    if (!started) {
      operationInFlightRef.current = false;
      return;
    }

    setOperationInFlight(true);
    commitState(started.state);

    void started.result.then((result) => {
      finishOperation(
        started.snapshot,
        result === "native_share_completed"
          ? "share_success_or_returned"
          : result === "native_share_cancelled_or_unavailable"
            ? "share_cancelled_or_unavailable"
            : "share_fallback_required",
      );
    });
  }

  function requestAction(action: CommunicationHandoffAction): void {
    if (isBlocked || isBusy) {
      return;
    }

    if (eligibility.state === "handoff_review_required") {
      setPendingAction(action);
      setConfirmationOpen(true);
      return;
    }

    if (action === "copy") {
      runCopy();
      return;
    }

    runShare();
  }

  function continuePendingAction(): void {
    const action = pendingAction;
    setPendingAction(null);

    if (action === "share") {
      runShare();
      setConfirmationOpen(false);
      return;
    }

    if (action === "copy") {
      runCopy();
    }

    setConfirmationOpen(false);
  }

  function returnToReview(): void {
    const action = pendingAction ?? "copy";
    setPendingAction(null);
    setConfirmationOpen(false);
    focusAction(action);
  }

  return (
    <div className="grid gap-4 border-t border-[rgba(15,118,110,0.12)] pt-4">
      {currentWarnings.length > 0 ? (
        <div className="grid gap-2 rounded-md border border-[#fbbf24] bg-[#fffbeb] p-4">
          {currentWarnings.map((warning) => (
            <p key={`${warning.field}-${warning.placeholder ?? warning.label}`} className="text-sm leading-6 text-[#92400e]">
              <span className="font-semibold">{warning.label}:</span> {warning.message}
              {warning.placeholder ? ` ${warning.placeholder}` : ""}
            </p>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Button
          ref={copyButtonRef}
          type="button"
          className="min-h-11 w-full"
          onClick={() => requestAction("copy")}
          disabled={isBlocked || isBusy}
        >
          Copiar mensagem
        </Button>
        <Button
          ref={shareButtonRef}
          type="button"
          variant="secondary"
          className="min-h-11 w-full"
          onClick={() => requestAction("share")}
          disabled={isBlocked || isBusy}
        >
          Partilhar mensagem
        </Button>
      </div>

      {message ? (
        <p
          className={isFailureStatus(effectiveStatus)
            ? "text-sm leading-6 text-[#9f1239]"
            : "text-sm leading-6 text-[color:var(--color-muted)]"}
          role={isFailureStatus(effectiveStatus) ? "alert" : "status"}
          aria-live={isFailureStatus(effectiveStatus) ? undefined : "polite"}
        >
          {message}
        </p>
      ) : null}

      <Dialog
        open={confirmationOpen}
        onOpenChange={(open) => {
          if (!open) {
            returnToReview();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisar mensagem</DialogTitle>
            <DialogDescription>
              Revise os campos destacados antes de continuar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 grid gap-3 md:grid-cols-2">
            <Button type="button" variant="secondary" onClick={returnToReview}>
              Voltar e revisar
            </Button>
            <Button type="button" onClick={continuePendingAction}>
              Continuar mesmo assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={manualDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeManualDialog();
          }
        }}
      >
        <DialogContent
          aria-describedby="communication-manual-copy-description"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            manualTextRef.current?.focus();
            manualTextRef.current?.select();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            focusAction(fallbackOriginRef.current);
          }}
        >
          <DialogHeader>
            <DialogTitle>Copiar mensagem manualmente</DialogTitle>
            <DialogDescription id="communication-manual-copy-description">
              {effectiveStatus === "share_fallback_required"
                ? "Nao foi possivel abrir a partilha. Selecione o texto ou escolha copiar para continuar."
                : "Nao foi possivel copiar automaticamente. Selecione o texto e copie para continuar."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            ref={manualTextRef}
            className="mt-5 min-h-56 resize-y text-base leading-7"
            value={draftText}
            readOnly
            aria-label="Mensagem preparada para copia manual"
          />
          <DialogFooter className="mt-6 grid gap-3 md:grid-cols-2">
            <Button type="button" variant="secondary" onClick={() => closeManualDialog()}>
              Fechar
            </Button>
            <Button type="button" onClick={runCopy} disabled={isBusy || isBlocked}>
              {effectiveStatus === "copy_fallback_required" ? "Tentar copiar novamente" : "Copiar mensagem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
