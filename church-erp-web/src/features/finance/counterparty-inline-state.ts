export type TreasuryEntryFormStatus =
  | "loading_categories"
  | "loading_counterparties"
  | "ready"
  | "counterparty_dialog_open"
  | "counterparty_dialog_cancelled"
  | "inline_success_selected"
  | "entry_submitting"
  | "entry_validation_error"
  | "blocked_categories_missing"
  | "denied_or_session_invalid"
  | "server_error";

export type InlineDialogStatus =
  | "idle"
  | "creating_counterparty"
  | "inline_validation_error"
  | "denied_or_session_invalid"
  | "server_error";

export type CounterpartyDialogCloseReason = "created" | "access_failure" | null;

export function getTreasuryEntryReadyStatus(
  categoriesCount: number,
): "ready" | "blocked_categories_missing" {
  return categoriesCount === 0 ? "blocked_categories_missing" : "ready";
}

export function resolveCounterpartyDialogCloseStatus(params: {
  closeReason: CounterpartyDialogCloseReason;
  previousStatus: TreasuryEntryFormStatus;
  readyStatus: "ready" | "blocked_categories_missing";
}): TreasuryEntryFormStatus {
  const { closeReason, previousStatus, readyStatus } = params;

  if (closeReason === "created") {
    return "inline_success_selected";
  }

  if (closeReason === "access_failure") {
    return "denied_or_session_invalid";
  }

  if (previousStatus === "counterparty_dialog_open") {
    return "counterparty_dialog_cancelled";
  }

  return readyStatus;
}

export function classifyInlineCounterpartyFailureStatus(
  status: number,
): InlineDialogStatus {
  if (status === 422) {
    return "inline_validation_error";
  }

  if (status === 401 || status === 403) {
    return "denied_or_session_invalid";
  }

  return "server_error";
}
