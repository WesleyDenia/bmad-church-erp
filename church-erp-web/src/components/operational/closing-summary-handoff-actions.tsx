"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClosingSummaryPrintView } from "@/components/operational/closing-summary-print-view";
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
import type {
  ClosingDetailsLoadState,
  ClosingSummaryLoadState,
  ClosingSummaryOperationalStatus,
  FinancialClosingSummary,
} from "@/features/finance/closing-summary";
import {
  buildClosingSummaryHandoffContent,
  hasClosingSummaryPrintViewReady,
  shareClosingSummaryText,
  writeClosingSummaryTextToClipboard,
} from "@/features/finance/closing-summary-handoff";
import type {
  ClosingSummaryHandoffContent,
  ClosingSummaryHandoffResult,
} from "@/features/finance/closing-summary-handoff";

type HandoffActionStatus =
  | "handoff_idle"
  | "preparing_handoff_details"
  | "handoff_ready"
  | "copy_in_progress"
  | "copy_success"
  | "copy_fallback_required"
  | "share_in_progress"
  | "share_success_or_returned"
  | "share_fallback_required"
  | "print_view_ready"
  | "print_returned"
  | "handoff_blocked_unreliable_summary"
  | "handoff_blocked_pending_items";

type ClosingSummaryHandoffActionsProps = {
  summary_state: ClosingSummaryLoadState;
  details_state: ClosingDetailsLoadState;
  operational_status: ClosingSummaryOperationalStatus;
  pending_items_count: number | null;
  closing_summary: FinancialClosingSummary | null;
  details_summary: FinancialClosingSummary | null;
  onRequestDetails: () => Promise<FinancialClosingSummary | null>;
};

function statusMessage(status: HandoffActionStatus): string | null {
  if (status === "preparing_handoff_details") {
    return "Carregando o detalhamento reconciliado antes de preparar o resumo.";
  }

  if (status === "copy_success") {
    return "Resumo preparado para enviar a lideranca.";
  }

  if (status === "share_success_or_returned") {
    return "Resumo preparado para envio. Voce voltou para a tesouraria sem perder o fechamento.";
  }

  if (status === "print_returned") {
    return "Visualizacao de impressao preparada. O fechamento permanece aberto na tesouraria.";
  }

  return null;
}

export function ClosingSummaryHandoffActions({
  summary_state,
  details_state,
  operational_status,
  pending_items_count,
  closing_summary,
  details_summary,
  onRequestDetails,
}: ClosingSummaryHandoffActionsProps) {
  const [status, setStatus] = useState<HandoffActionStatus>("handoff_idle");
  const [manualText, setManualText] = useState("");
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [printContent, setPrintContent] = useState<ClosingSummaryHandoffContent | null>(null);
  const [printRequested, setPrintRequested] = useState(false);
  const manualTextRef = useRef<HTMLTextAreaElement>(null);

  const buildResult = useCallback((
    summary: FinancialClosingSummary | null,
    resolvedDetailsState: ClosingDetailsLoadState = details_state,
  ) => (
    buildClosingSummaryHandoffContent({
      eligibility: {
        summary_state,
        details_state: resolvedDetailsState,
        operational_status,
        pending_items_count,
        summary,
      },
    })
  ), [details_state, operational_status, pending_items_count, summary_state]);

  const applyBlockedResult = useCallback((result: ClosingSummaryHandoffResult) => {
    if (result.state === "handoff_blocked_pending_items") {
      setStatus("handoff_blocked_pending_items");
      setBlockedMessage(result.message);
      return;
    }

    if (result.state === "handoff_blocked_unreliable_summary") {
      setStatus("handoff_blocked_unreliable_summary");
      setBlockedMessage(result.message);
      return;
    }

    if (result.state === "handoff_needs_details") {
      setStatus("handoff_blocked_unreliable_summary");
      setBlockedMessage(result.message);
    }
  }, []);

  const prepareContent = useCallback(async (): Promise<ClosingSummaryHandoffContent | null> => {
    setBlockedMessage(null);
    const currentSummary = details_summary ?? closing_summary;
    let result = buildResult(currentSummary);

    if (result.state === "handoff_needs_details") {
      setStatus("preparing_handoff_details");
      const loadedDetailsSummary = await onRequestDetails();
      result = buildResult(
        loadedDetailsSummary ?? currentSummary,
        loadedDetailsSummary?.details ? "closing_details_loaded" : details_state,
      );
    }

    if (result.state !== "handoff_ready") {
      applyBlockedResult(result);
      return null;
    }

    setStatus("handoff_ready");
    return result.content;
  }, [
    applyBlockedResult,
    buildResult,
    closing_summary,
    details_state,
    details_summary,
    onRequestDetails,
  ]);

  useEffect(() => {
    if (!manualDialogOpen) {
      return;
    }

    queueMicrotask(() => {
      manualTextRef.current?.focus();
      manualTextRef.current?.select();
    });
  }, [manualDialogOpen, manualText]);

  useEffect(() => {
    if (!printContent || !printRequested) {
      return;
    }

    if (!hasClosingSummaryPrintViewReady(document)) {
      return;
    }

    let didCleanUp = false;
    const finishPrint = () => {
      if (didCleanUp) {
        return;
      }

      didCleanUp = true;
      setPrintRequested(false);
      setPrintContent(null);
      setStatus("print_returned");
    };
    const fallbackTimer = window.setTimeout(finishPrint, 1200);

    window.addEventListener("afterprint", finishPrint, { once: true });
    const printFrame = window.requestAnimationFrame(() => {
      setStatus("print_view_ready");
      window.print();
    });

    return () => {
      window.cancelAnimationFrame(printFrame);
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("afterprint", finishPrint);
    };
  }, [printContent, printRequested]);

  async function handleCopy() {
    const content = await prepareContent();

    if (!content) {
      return;
    }

    setStatus("copy_in_progress");

    const copied = await writeClosingSummaryTextToClipboard({
      is_secure_context: window.isSecureContext,
      clipboard: navigator.clipboard,
    }, content.plain_text);

    if (copied) {
      setStatus("copy_success");
      return;
    }

    setManualText(content.plain_text);
    setStatus("copy_fallback_required");
    setManualDialogOpen(true);
  }

  async function handleShare() {
    const content = await prepareContent();

    if (!content) {
      return;
    }

    const payload = {
      title: content.title,
      text: content.plain_text,
    };

    setStatus("share_in_progress");

    const shareResult = await shareClosingSummaryText(navigator, payload);

    if (
      shareResult === "native_share_completed"
      || shareResult === "native_share_cancelled"
    ) {
      setStatus("share_success_or_returned");
      return;
    }

    setManualText(content.plain_text);
    setStatus("share_fallback_required");
    setManualDialogOpen(true);
  }

  async function handlePrint() {
    const content = await prepareContent();

    if (!content) {
      return;
    }

    setPrintContent(content);
    setPrintRequested(true);
  }

  const isVisible =
    summary_state === "closing_summary_loaded"
    && operational_status === "status_pronto_para_revisar"
    && pending_items_count === 0
    && closing_summary?.state === "closing_summary_loaded";
  const isBusy =
    status === "preparing_handoff_details"
    || status === "copy_in_progress"
    || status === "share_in_progress"
    || status === "print_view_ready";
  const message = blockedMessage ?? statusMessage(status);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="mt-5 border-t border-[rgba(15,118,110,0.12)] pt-5">
      <div className="grid gap-2 sm:grid-cols-3">
        <Button
          type="button"
          variant="secondary"
          className="rounded-[1.25rem]"
          onClick={() => void handleCopy()}
          disabled={isBusy}
        >
          Copiar resumo
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="rounded-[1.25rem]"
          onClick={() => void handleShare()}
          disabled={isBusy}
        >
          Compartilhar
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="rounded-[1.25rem]"
          onClick={() => void handlePrint()}
          disabled={isBusy}
        >
          Imprimir
        </Button>
      </div>

      {message ? (
        <p className="mt-3 text-sm leading-6 text-[color:var(--color-muted)]">
          {message}
        </p>
      ) : null}

      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent aria-describedby="closing-summary-manual-copy-description">
          <DialogHeader>
            <DialogTitle>Copiar resumo manualmente</DialogTitle>
            <DialogDescription id="closing-summary-manual-copy-description">
              Selecione o texto abaixo e envie pelo canal combinado com a lideranca.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            ref={manualTextRef}
            readOnly
            value={manualText}
            aria-label="Texto do resumo de fechamento"
            className="mt-5 min-h-[260px] font-mono text-xs leading-5"
            onFocus={(event) => event.currentTarget.select()}
          />
          <DialogFooter className="mt-5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleCopy()}
            >
              Tentar copiar novamente
            </Button>
            <Button type="button" onClick={() => setManualDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printContent ? <ClosingSummaryPrintView content={printContent} /> : null}
    </div>
  );
}
