import type {
  CommunicationMessageDraftMissingField,
  CommunicationMessageDraftState,
} from "@/features/communications/message-draft";

export const COMMUNICATION_HANDOFF_MAX_CODE_POINTS = 5_000;

export type CommunicationHandoffEligibilityState =
  | "handoff_ready"
  | "handoff_blocked_empty_message"
  | "handoff_blocked_too_long"
  | "handoff_review_required";

export type CommunicationHandoffStatus =
  | "handoff_idle"
  | CommunicationHandoffEligibilityState
  | "copy_in_progress"
  | "copy_success"
  | "copy_fallback_required"
  | "share_in_progress"
  | "share_success_or_returned"
  | "share_cancelled_or_unavailable"
  | "share_fallback_required";

export type CommunicationHandoffAction = "copy" | "share";

export type CommunicationHandoffOperationSnapshot = {
  action: CommunicationHandoffAction;
  revision: number;
  text: string;
};

export type CommunicationHandoffState = {
  status: CommunicationHandoffStatus;
  draft_revision: number;
  active_operation: CommunicationHandoffOperationSnapshot | null;
};

export type CommunicationHandoffOperationResult =
  | "copy_success"
  | "copy_fallback_required"
  | "share_success_or_returned"
  | "share_cancelled_or_unavailable"
  | "share_fallback_required";

export type CommunicationSharePayload = {
  title: "Mensagem preparada";
  text: string;
};

export type CommunicationShareNavigator = {
  share?: (payload: CommunicationSharePayload) => Promise<void> | void;
  canShare?: (payload: CommunicationSharePayload) => boolean;
};

export type CommunicationClipboardEnvironment = {
  is_secure_context: boolean;
  clipboard?: {
    writeText?: (text: string) => Promise<void> | void;
  } | null;
};

export type CommunicationHandoffEligibility = {
  state: CommunicationHandoffEligibilityState;
  code_point_count: number;
  has_review_markers: boolean;
};

export type CommunicationShareOperation = {
  state: CommunicationHandoffState;
  snapshot: CommunicationHandoffOperationSnapshot;
  result: Promise<"native_share_completed" | "native_share_cancelled_or_unavailable" | "native_share_unavailable">;
};

const CURRENT_PLACEHOLDER_PATTERN = /\{\{\s*[^{}]+?\s*\}\}/u;

export function countCommunicationMessageCodePoints(text: string): number {
  return Array.from(text).length;
}

export function hasCurrentCommunicationReviewMarkers(text: string): boolean {
  return text.includes("[contato pendente]") || CURRENT_PLACEHOLDER_PATTERN.test(text);
}

export function getCommunicationHandoffEligibility(text: string): CommunicationHandoffEligibility {
  const codePointCount = countCommunicationMessageCodePoints(text);
  const hasReviewMarkers = hasCurrentCommunicationReviewMarkers(text);

  if (text.trim() === "") {
    return {
      state: "handoff_blocked_empty_message",
      code_point_count: codePointCount,
      has_review_markers: false,
    };
  }

  if (codePointCount > COMMUNICATION_HANDOFF_MAX_CODE_POINTS) {
    return {
      state: "handoff_blocked_too_long",
      code_point_count: codePointCount,
      has_review_markers: hasReviewMarkers,
    };
  }

  return {
    state: hasReviewMarkers ? "handoff_review_required" : "handoff_ready",
    code_point_count: codePointCount,
    has_review_markers: hasReviewMarkers,
  };
}

export function canPresentCommunicationHandoff(
  draftState: CommunicationMessageDraftState,
  hasDraft: boolean,
): boolean {
  return hasDraft && (
    draftState === "message_draft_ready"
    || draftState === "draft_has_missing_contact"
  );
}

export function isCurrentCommunicationDraftRequest(
  requestId: number,
  currentRequestId: number,
  requestedPersonKey: string,
  currentPersonKey: string,
): boolean {
  return requestId === currentRequestId && requestedPersonKey === currentPersonKey;
}

export function shouldPreserveCommunicationDraftForPerson(
  currentPersonKey: string,
  nextPersonKey: string,
  hasDraft: boolean,
): boolean {
  return hasDraft && nextPersonKey !== "" && currentPersonKey === nextPersonKey;
}

export function reconcileCommunicationDraftWarnings(
  text: string,
  warnings: CommunicationMessageDraftMissingField[],
): CommunicationMessageDraftMissingField[] {
  const hasContactMarker = text.includes("[contato pendente]");
  const hasPlaceholderMarker = CURRENT_PLACEHOLDER_PATTERN.test(text);

  return warnings.filter((warning) => {
    if (warning.field === "profile_needs_update") {
      return true;
    }

    if (warning.field === "contact") {
      return hasContactMarker;
    }

    if (warning.placeholder) {
      return text.includes(warning.placeholder);
    }

    if (warning.field === "unknown_placeholder") {
      return hasPlaceholderMarker;
    }

    return true;
  });
}

export function buildCommunicationSharePayload(text: string): CommunicationSharePayload {
  return {
    title: "Mensagem preparada",
    text,
  };
}

export async function writeCommunicationMessageToClipboard(
  environment: CommunicationClipboardEnvironment,
  text: string,
): Promise<"copy_completed" | "copy_unavailable"> {
  if (
    !environment.is_secure_context
    || typeof environment.clipboard?.writeText !== "function"
  ) {
    return "copy_unavailable";
  }

  try {
    await environment.clipboard.writeText(text);
    return "copy_completed";
  } catch {
    return "copy_unavailable";
  }
}

export function isCommunicationShareAbort(error: unknown): boolean {
  return Boolean(
    error
      && typeof error === "object"
      && "name" in error
      && error.name === "AbortError",
  );
}

function shareFailureResult(error: unknown): "native_share_cancelled_or_unavailable" | "native_share_unavailable" {
  return isCommunicationShareAbort(error)
    ? "native_share_cancelled_or_unavailable"
    : "native_share_unavailable";
}

export function shareCommunicationMessage(
  navigatorLike: CommunicationShareNavigator,
  payload: CommunicationSharePayload,
): Promise<"native_share_completed" | "native_share_cancelled_or_unavailable" | "native_share_unavailable"> {
  if (typeof navigatorLike.share !== "function") {
    return Promise.resolve("native_share_unavailable");
  }

  if (typeof navigatorLike.canShare === "function") {
    try {
      if (!navigatorLike.canShare(payload)) {
        return Promise.resolve("native_share_unavailable");
      }
    } catch {
      return Promise.resolve("native_share_unavailable");
    }
  }

  try {
    const result = navigatorLike.share(payload);

    return Promise.resolve(result)
      .then(() => "native_share_completed" as const)
      .catch((error: unknown) => shareFailureResult(error));
  } catch (error) {
    return Promise.resolve(shareFailureResult(error));
  }
}

export function beginCommunicationShareOperation(
  state: CommunicationHandoffState,
  navigatorLike: CommunicationShareNavigator,
  text: string,
): CommunicationShareOperation | null {
  const started = beginCommunicationHandoffOperation(state, "share", text);

  if (!started) {
    return null;
  }

  const result = shareCommunicationMessage(
    navigatorLike,
    buildCommunicationSharePayload(started.snapshot.text),
  );

  return {
    ...started,
    result,
  };
}

export function createCommunicationHandoffState(
  text: string,
  draftRevision = 0,
): CommunicationHandoffState {
  return {
    status: getCommunicationHandoffEligibility(text).state,
    draft_revision: draftRevision,
    active_operation: null,
  };
}

export function beginCommunicationHandoffOperation(
  state: CommunicationHandoffState,
  action: CommunicationHandoffAction,
  text: string,
): { state: CommunicationHandoffState; snapshot: CommunicationHandoffOperationSnapshot } | null {
  const eligibility = getCommunicationHandoffEligibility(text);

  if (
    state.active_operation
    || eligibility.state === "handoff_blocked_empty_message"
    || eligibility.state === "handoff_blocked_too_long"
  ) {
    return null;
  }

  const snapshot = {
    action,
    revision: state.draft_revision,
    text,
  } satisfies CommunicationHandoffOperationSnapshot;

  return {
    state: {
      ...state,
      status: action === "copy" ? "copy_in_progress" : "share_in_progress",
      active_operation: snapshot,
    },
    snapshot,
  };
}

export function completeCommunicationHandoffOperation(
  state: CommunicationHandoffState,
  snapshot: CommunicationHandoffOperationSnapshot,
  result: CommunicationHandoffOperationResult,
): CommunicationHandoffState {
  if (
    snapshot.revision !== state.draft_revision
    || state.active_operation?.revision !== snapshot.revision
    || state.active_operation.action !== snapshot.action
    || state.active_operation.text !== snapshot.text
  ) {
    return state;
  }

  return {
    ...state,
    status: result,
    active_operation: null,
  };
}

export function resolveCommunicationHandoffOperation(
  state: CommunicationHandoffState,
  snapshot: CommunicationHandoffOperationSnapshot,
  result: CommunicationHandoffOperationResult,
  currentText: string,
  currentRevision: number,
): CommunicationHandoffState {
  if (snapshot.revision !== currentRevision || snapshot.text !== currentText) {
    return createCommunicationHandoffState(currentText, currentRevision);
  }

  return completeCommunicationHandoffOperation(state, snapshot, result);
}
