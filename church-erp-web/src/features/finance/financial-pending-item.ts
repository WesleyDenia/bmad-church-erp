import type { FinancialEntryListItem } from "@/features/finance/financial-entry";

export type FinancialPendingItemResolutionAction = "edit_entry";

export type FinancialPendingItemAuditChangedField = {
  field: string;
  old_value: unknown;
  new_value: unknown;
};

export type FinancialPendingItemLatestAudit = {
  id: number;
  reason: string;
  user_name: string | null;
  created_at: string;
  changed_fields: FinancialPendingItemAuditChangedField[];
};

export type FinancialPendingItemRecord = {
  id: string;
  entry_id: number;
  pending_type: "recent_audit_review";
  pending_type_label: string;
  count: number;
  label: string;
  context: string;
  cta_label: string;
  resolution_action: FinancialPendingItemResolutionAction;
  financial_entry: FinancialEntryListItem;
  latest_audit: FinancialPendingItemLatestAudit | null;
};

export type FinancialPendingItemsResponse = {
  data: {
    financial_pending_items: FinancialPendingItemRecord[];
  };
};

export type FinancialPendingItemsErrorResponse = {
  message: string;
};

export type FinancialPendingItemCard = {
  id: string;
  entry_id: number;
  pending_type_label: string;
  count: number;
  label: string;
  context: string;
  cta_label: string;
  resolution_action: FinancialPendingItemResolutionAction;
};

export type FinancialPendingItemSelection = {
  action: FinancialPendingItemResolutionAction;
  activationKey: number;
  entry: FinancialEntryListItem;
};

export type FinancialPendingSelectionState = {
  activationKey: number;
  selectedItemId: string | null;
};

export const initialFinancialPendingSelectionState: FinancialPendingSelectionState = {
  activationKey: 0,
  selectedItemId: null,
};

export function activatePendingItemSelection(
  state: FinancialPendingSelectionState,
  itemId: string,
): FinancialPendingSelectionState {
  return {
    selectedItemId: itemId,
    activationKey: state.activationKey + 1,
  };
}

export function clearPendingItemSelection(
  state: FinancialPendingSelectionState,
): FinancialPendingSelectionState {
  if (state.selectedItemId === null) {
    return state;
  }

  return {
    ...state,
    selectedItemId: null,
  };
}

export function buildPendingItemsPresentation(
  items: FinancialPendingItemRecord[],
): {
  pending_items_count: number;
  items: FinancialPendingItemCard[];
} {
  return {
    pending_items_count: items.length,
    items: items.map((item) => ({
      id: item.id,
      entry_id: item.entry_id,
      pending_type_label: item.pending_type_label,
      count: item.count,
      label: item.label,
      context: item.context,
      cta_label: item.cta_label,
      resolution_action: item.resolution_action,
    })),
  };
}

export function resolvePendingItemSelection(
  item: FinancialPendingItemRecord | null,
  activationKey: number,
): FinancialPendingItemSelection | null {
  if (item === null) {
    return null;
  }

  return {
    action: item.resolution_action,
    activationKey,
    entry: item.financial_entry,
  };
}
