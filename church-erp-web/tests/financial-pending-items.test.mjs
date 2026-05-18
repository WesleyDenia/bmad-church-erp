import assert from "node:assert/strict";
import test from "node:test";
import {
  activatePendingItemSelection,
  buildPendingItemsPresentation,
  clearPendingItemSelection,
  initialFinancialPendingSelectionState,
  resolvePendingItemSelection,
} from "../src/features/finance/financial-pending-item.ts";

test("pending items presentation keeps the empty state honest when there are no real pendencias", () => {
  const presentation = buildPendingItemsPresentation([]);

  assert.equal(presentation.pending_items_count, 0);
  assert.deepEqual(presentation.items, []);
});

test("pending items presentation exposes useful CTA context for real financial reviews", () => {
  const presentation = buildPendingItemsPresentation([
    {
      id: "recent-audit-review-15",
      entry_id: 15,
      pending_type: "recent_audit_review",
      pending_type_label: "Revisao de alteracao recente",
      count: 2,
      label: "Familia Lima",
      context: "2 campos alterados em Oferta especial. Motivo: Corrigir subtipo e contraparte apos conferencia.",
      cta_label: "Revisar lancamento",
      resolution_action: "edit_entry",
      financial_entry: {
        id: 15,
        entry_type: "income",
        amount: "250.75",
        financial_category_id: 7,
        financial_category_name: "Oferta especial",
        counterparty_id: 11,
        counterparty_name: "Familia Lima",
        cost_center_name: "Missoes",
        created_at: "2026-05-13T10:00:00.000Z",
        updated_at: "2026-05-13T11:00:00.000Z",
        latest_audit: {
          id: 91,
          reason: "Corrigir subtipo e contraparte apos conferencia.",
          user_name: "Maria Silva",
          created_at: "2026-05-13T11:00:00.000Z",
        },
      },
      latest_audit: {
        id: 91,
        reason: "Corrigir subtipo e contraparte apos conferencia.",
        user_name: "Maria Silva",
        created_at: "2026-05-13T11:00:00.000Z",
        changed_fields: [
          { field: "financial_category_name", old_value: "Dizimos", new_value: "Oferta especial" },
          { field: "counterparty_name", old_value: "Maria Souza", new_value: "Familia Lima" },
        ],
      },
    },
  ]);

  assert.equal(presentation.pending_items_count, 1);
  assert.deepEqual(presentation.items[0], {
    id: "recent-audit-review-15",
    entry_id: 15,
    pending_type_label: "Revisao de alteracao recente",
    count: 2,
    label: "Familia Lima",
    context: "2 campos alterados em Oferta especial. Motivo: Corrigir subtipo e contraparte apos conferencia.",
    cta_label: "Revisar lancamento",
    resolution_action: "edit_entry",
  });
});

test("pending item selection resolves directly to the financial entry already returned by the API", () => {
  const selected = resolvePendingItemSelection({
    id: "recent-audit-review-15",
    entry_id: 15,
    pending_type: "recent_audit_review",
    pending_type_label: "Revisao de alteracao recente",
    count: 1,
    label: "Maria Souza",
    context: "1 campo alterado em Dizimos. Motivo: Ajuste de centro de custo.",
    cta_label: "Revisar lancamento",
    resolution_action: "edit_entry",
    financial_entry: {
      id: 15,
      entry_type: "income",
      amount: "125.40",
      financial_category_id: 7,
      financial_category_name: "Dizimos",
      counterparty_id: 9,
      counterparty_name: "Maria Souza",
      cost_center_name: "Missoes",
      created_at: "2026-05-13T10:00:00.000Z",
      updated_at: "2026-05-13T11:00:00.000Z",
      latest_audit: {
        id: 91,
        reason: "Ajuste de centro de custo.",
        user_name: "Maria Silva",
        created_at: "2026-05-13T11:00:00.000Z",
      },
    },
    latest_audit: {
      id: 91,
      reason: "Ajuste de centro de custo.",
      user_name: "Maria Silva",
      created_at: "2026-05-13T11:00:00.000Z",
      changed_fields: [
        { field: "cost_center_name", old_value: "Cultos de domingo", new_value: "Missoes" },
      ],
    },
  }, 3);

  assert.equal(selected?.action, "edit_entry");
  assert.equal(selected?.activationKey, 3);
  assert.equal(selected?.entry.id, 15);
  assert.equal(selected?.entry.latest_audit?.reason, "Ajuste de centro de custo.");
});

test("pending item selection state allows reopening the same pendencia after a cancel", () => {
  const firstSelection = activatePendingItemSelection(
    initialFinancialPendingSelectionState,
    "recent-audit-review-15",
  );

  assert.deepEqual(firstSelection, {
    selectedItemId: "recent-audit-review-15",
    activationKey: 1,
  });

  const clearedSelection = clearPendingItemSelection(firstSelection);

  assert.deepEqual(clearedSelection, {
    selectedItemId: null,
    activationKey: 1,
  });

  const reopenedSelection = activatePendingItemSelection(
    clearedSelection,
    "recent-audit-review-15",
  );

  assert.deepEqual(reopenedSelection, {
    selectedItemId: "recent-audit-review-15",
    activationKey: 2,
  });
});
