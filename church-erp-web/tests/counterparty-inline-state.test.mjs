import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyInlineCounterpartyFailureStatus,
  getTreasuryEntryReadyStatus,
  resolveCounterpartyDialogCloseStatus,
} from "../src/features/finance/counterparty-inline-state.ts";

test("treasury entry ready status reflects category availability", () => {
  assert.equal(getTreasuryEntryReadyStatus(0), "blocked_categories_missing");
  assert.equal(getTreasuryEntryReadyStatus(2), "ready");
});

test("counterparty dialog close status preserves success, access failure, and explicit cancel", () => {
  assert.equal(
    resolveCounterpartyDialogCloseStatus({
      closeReason: "created",
      previousStatus: "counterparty_dialog_open",
      readyStatus: "ready",
    }),
    "inline_success_selected",
  );

  assert.equal(
    resolveCounterpartyDialogCloseStatus({
      closeReason: "access_failure",
      previousStatus: "counterparty_dialog_open",
      readyStatus: "ready",
    }),
    "denied_or_session_invalid",
  );

  assert.equal(
    resolveCounterpartyDialogCloseStatus({
      closeReason: null,
      previousStatus: "counterparty_dialog_open",
      readyStatus: "ready",
    }),
    "counterparty_dialog_cancelled",
  );

  assert.equal(
    resolveCounterpartyDialogCloseStatus({
      closeReason: null,
      previousStatus: "entry_validation_error",
      readyStatus: "blocked_categories_missing",
    }),
    "blocked_categories_missing",
  );
});

test("counterparty dialog failure status distinguishes validation, auth, and server failures", () => {
  assert.equal(classifyInlineCounterpartyFailureStatus(422), "inline_validation_error");
  assert.equal(classifyInlineCounterpartyFailureStatus(401), "denied_or_session_invalid");
  assert.equal(classifyInlineCounterpartyFailureStatus(403), "denied_or_session_invalid");
  assert.equal(classifyInlineCounterpartyFailureStatus(500), "server_error");
});
