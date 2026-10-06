import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  beginCommunicationHandoffOperation,
  beginCommunicationShareOperation,
  buildCommunicationSharePayload,
  canPresentCommunicationHandoff,
  completeCommunicationHandoffOperation,
  countCommunicationMessageCodePoints,
  createCommunicationHandoffState,
  getCommunicationHandoffEligibility,
  hasCurrentCommunicationReviewMarkers,
  isCurrentCommunicationDraftRequest,
  reconcileCommunicationDraftWarnings,
  resolveCommunicationHandoffOperation,
  shareCommunicationMessage,
  shouldPreserveCommunicationDraftForPerson,
  writeCommunicationMessageToClipboard,
} from "../src/features/communications/message-handoff.ts";

function readSource(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("handoff eligibility uses raw Unicode code points and trim only for empty text", () => {
  assert.equal(countCommunicationMessageCodePoints("a😀e\u0301"), 4);
  assert.deepEqual(getCommunicationHandoffEligibility(" \n\t "), {
    state: "handoff_blocked_empty_message",
    code_point_count: 4,
    has_review_markers: false,
  });
  assert.equal(getCommunicationHandoffEligibility("😀".repeat(5_000)).state, "handoff_ready");
  assert.equal(getCommunicationHandoffEligibility("😀".repeat(5_001)).state, "handoff_blocked_too_long");
  assert.deepEqual(getCommunicationHandoffEligibility("Ola\nAna"), {
    state: "handoff_ready",
    code_point_count: 7,
    has_review_markers: false,
  });
});

test("current text markers require review and disappear after the user fixes them", () => {
  assert.equal(hasCurrentCommunicationReviewMarkers("Telefone: [contato pendente]"), true);
  assert.equal(hasCurrentCommunicationReviewMarkers("Ola {{ nome }}"), true);
  assert.equal(hasCurrentCommunicationReviewMarkers("Ola {{telefone}} e {{ evento }}"), true);
  assert.equal(hasCurrentCommunicationReviewMarkers("Ola Ana, tudo bem?"), false);
  assert.equal(getCommunicationHandoffEligibility("Ola {{ nome }}").state, "handoff_review_required");

  const warnings = [
    { field: "contact", label: "Contato", message: "Revise", placeholder: "[contato pendente]" },
    { field: "unknown_placeholder", label: "Campo", message: "Revise", placeholder: "{{ evento }}" },
    { field: "profile_needs_update", label: "Cadastro", message: "Confira" },
  ];

  assert.deepEqual(
    reconcileCommunicationDraftWarnings("Ola Ana", warnings).map((warning) => warning.field),
    ["profile_needs_update"],
  );
  assert.equal(getCommunicationHandoffEligibility("Ola Ana").state, "handoff_ready");
  assert.deepEqual(
    reconcileCommunicationDraftWarnings("Ola {{ evento }}", warnings).map((warning) => warning.field),
    ["unknown_placeholder", "profile_needs_update"],
  );
});

test("share payload contains only the static title and exact current draft text", () => {
  const text = "Ola Ana\nTelefone: +351 999 999 999";
  const payload = buildCommunicationSharePayload(text);

  assert.deepEqual(payload, {
    title: "Mensagem preparada",
    text,
  });
  assert.deepEqual(Object.keys(payload), ["title", "text"]);
  assert.equal("url" in payload, false);
  assert.equal("person_id" in payload, false);
  assert.equal("church_id" in payload, false);
});

test("clipboard adapter writes exact text only in a secure supported context", async () => {
  const calls = [];
  const text = "Edicao atual\ncom quebra";

  assert.equal(await writeCommunicationMessageToClipboard({
    is_secure_context: true,
    clipboard: {
      writeText(value) {
        calls.push(value);
        return Promise.resolve();
      },
    },
  }, text), "copy_completed");
  assert.deepEqual(calls, [text]);

  assert.equal(await writeCommunicationMessageToClipboard({
    is_secure_context: false,
    clipboard: { writeText() { throw new Error("must not run"); } },
  }, text), "copy_unavailable");
  assert.equal(await writeCommunicationMessageToClipboard({
    is_secure_context: true,
    clipboard: null,
  }, text), "copy_unavailable");
  assert.equal(await writeCommunicationMessageToClipboard({
    is_secure_context: true,
    clipboard: { writeText: () => Promise.reject(Object.assign(new Error("denied"), { name: "NotAllowedError" })) },
  }, text), "copy_unavailable");
});

test("share adapter calls share synchronously and handles support variants without clipboard", async () => {
  const payload = buildCommunicationSharePayload("Texto atual");
  let called = false;
  let receivedPayload = null;
  const completedPromise = shareCommunicationMessage({
    share(value) {
      called = true;
      receivedPayload = value;
      return Promise.resolve();
    },
  }, payload);

  assert.equal(called, true);
  assert.equal(await completedPromise, "native_share_completed");
  assert.deepEqual(receivedPayload, payload);

  assert.equal(await shareCommunicationMessage({}, payload), "native_share_unavailable");

  let falseShareCalls = 0;
  assert.equal(await shareCommunicationMessage({
    canShare: () => false,
    share: () => { falseShareCalls += 1; },
  }, payload), "native_share_unavailable");
  assert.equal(falseShareCalls, 0);

  assert.equal(await shareCommunicationMessage({
    canShare: () => { throw new Error("unsupported payload"); },
    share: () => { throw new Error("must not run"); },
  }, payload), "native_share_unavailable");
});

test("production share orchestration invokes navigator.share synchronously with the exact snapshot", async () => {
  const state = createCommunicationHandoffState("Texto atual", 8);
  let receivedPayload = null;
  const started = beginCommunicationShareOperation(state, {
    canShare: () => true,
    share(payload) {
      receivedPayload = payload;
      return Promise.resolve();
    },
  }, "Texto atual");

  assert.ok(started);
  assert.deepEqual(receivedPayload, {
    title: "Mensagem preparada",
    text: "Texto atual",
  });
  assert.equal(started.state.status, "share_in_progress");
  assert.equal(await started.result, "native_share_completed");
});

test("share adapter distinguishes AbortError from other synchronous and async failures", async () => {
  const payload = buildCommunicationSharePayload("Texto");
  const abortError = Object.assign(new Error("cancelled"), { name: "AbortError" });

  assert.equal(await shareCommunicationMessage({
    canShare: () => true,
    share: () => Promise.reject(abortError),
  }, payload), "native_share_cancelled_or_unavailable");

  for (const name of ["NotAllowedError", "InvalidStateError", "TypeError", "Error"]) {
    assert.equal(await shareCommunicationMessage({
      canShare: () => true,
      share: () => Promise.reject(Object.assign(new Error("failed"), { name })),
    }, payload), "native_share_unavailable");
  }

  assert.equal(await shareCommunicationMessage({
    share: () => { throw abortError; },
  }, payload), "native_share_cancelled_or_unavailable");
});

test("state transitions discard stale async results and recalculate every edit", () => {
  const initial = createCommunicationHandoffState("Primeira versao", 4);
  assert.equal(initial.status, "handoff_ready");
  assert.equal(initial.draft_revision, 4);

  const started = beginCommunicationHandoffOperation(initial, "copy", "Primeira versao");
  assert.ok(started);
  assert.equal(started.state.status, "copy_in_progress");
  assert.equal(beginCommunicationHandoffOperation(started.state, "share", "Primeira versao"), null);

  const edited = resolveCommunicationHandoffOperation(
    started.state,
    started.snapshot,
    "copy_success",
    "   ",
    5,
  );
  assert.equal(edited.draft_revision, 5);
  assert.equal(edited.status, "handoff_blocked_empty_message");

  const tooLong = createCommunicationHandoffState("x".repeat(5_001), 6);
  assert.equal(tooLong.status, "handoff_blocked_too_long");
  const review = createCommunicationHandoffState("Ola {{ nome }}", 7);
  assert.equal(review.status, "handoff_review_required");
});

test("composer context guards reject stale people and expose handoff only for valid draft states", () => {
  assert.equal(isCurrentCommunicationDraftRequest(4, 4, "member:7", "member:7"), true);
  assert.equal(isCurrentCommunicationDraftRequest(4, 5, "member:7", "member:7"), false);
  assert.equal(isCurrentCommunicationDraftRequest(4, 4, "member:7", "visitor:9"), false);

  assert.equal(shouldPreserveCommunicationDraftForPerson("member:7", "member:7", true), true);
  assert.equal(shouldPreserveCommunicationDraftForPerson("member:7", "", true), false);
  assert.equal(shouldPreserveCommunicationDraftForPerson("member:7", "visitor:9", true), false);

  assert.equal(canPresentCommunicationHandoff("message_draft_ready", true), true);
  assert.equal(canPresentCommunicationHandoff("draft_has_missing_contact", true), true);
  assert.equal(canPresentCommunicationHandoff("validation_error", true), false);
  assert.equal(canPresentCommunicationHandoff("loading_people_for_message", true), false);
  assert.equal(canPresentCommunicationHandoff("message_draft_ready", false), false);
});

test("state transitions preserve current revision for copy share cancellation and fallback", () => {
  const initial = createCommunicationHandoffState("Mensagem", 2);

  for (const [action, result, expected] of [
    ["copy", "copy_success", "copy_success"],
    ["copy", "copy_fallback_required", "copy_fallback_required"],
    ["share", "share_success_or_returned", "share_success_or_returned"],
    ["share", "share_cancelled_or_unavailable", "share_cancelled_or_unavailable"],
    ["share", "share_fallback_required", "share_fallback_required"],
  ]) {
    const started = beginCommunicationHandoffOperation(initial, action, "Mensagem");
    assert.ok(started);
    const completed = completeCommunicationHandoffOperation(started.state, started.snapshot, result);

    assert.equal(completed.status, expected);
    assert.equal(completed.draft_revision, 2);
    assert.equal(completed.active_operation, null);
  }
});

test("handoff source keeps the external boundary frontend-only and free of prohibited side effects", () => {
  const handoffSource = readSource("../src/features/communications/message-handoff.ts");
  const actionsSource = readSource("../src/components/operational/communication-message-handoff-actions.tsx");
  const combinedSource = [
    handoffSource,
    actionsSource,
    readSource("../src/components/operational/communication-message-composer.tsx"),
  ].join("\n");

  assert.match(actionsSource, /readOnly/);
  assert.match(actionsSource, /aria-describedby="communication-manual-copy-description"/);
  assert.match(actionsSource, /onOpenAutoFocus/);
  assert.match(actionsSource, /onCloseAutoFocus/);
  assert.match(actionsSource, /function requestAction\(action: CommunicationHandoffAction\): void/);
  assert.match(actionsSource, /function continuePendingAction\(\): void/);
  assert.doesNotMatch(actionsSource, /async function (?:requestAction|continuePendingAction)/);
  assert.match(actionsSource, /if \(action === "share"\) \{\s*runShare\(\);/);
  assert.match(actionsSource, /beginCommunicationShareOperation\(currentState, navigator, draftText\)/);
  assert.match(actionsSource, /md:grid-cols-2/);
  assert.doesNotMatch(actionsSource, /sm:grid-cols-2/);
  assert.doesNotMatch(combinedSource, /wa\.me|api\.whatsapp\.com|window\.open|execCommand|localStorage|sessionStorage|indexedDB|document\.cookie|dangerouslySetInnerHTML|iframe|analytics|telemetry|console\./i);
  assert.doesNotMatch(combinedSource, /fetch\([^)]*(?:handoff|send)|api\/communications\/(?:handoff|send)/i);
  assert.doesNotMatch(combinedSource, /last_contacted_at|delivered|message_sent|mark.*resolved/i);
});
