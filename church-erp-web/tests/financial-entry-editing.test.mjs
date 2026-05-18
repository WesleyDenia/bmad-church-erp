import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFinancialEntryListItemFromResponse,
  buildFinancialEntryRequestPayload,
  normalizeFinancialEntryUiMessage,
  upsertFinancialEntryListItem,
  validateFinancialEntryDraft,
} from "../src/features/finance/financial-entry.ts";

test("editing validation requires reason before submitting a financial change", () => {
  const invalid = validateFinancialEntryDraft(
    {
      entry_type: "income",
      amount_input: "125,40",
      financial_category_id: "7",
      counterparty_id: "9",
      cost_center_name: "Cultos de domingo",
      reason: "",
    },
    { mode: "edit" },
  );

  assert.deepEqual(invalid, {
    reason: ["Informe o motivo da alteracao financeira."],
  });

  const valid = validateFinancialEntryDraft(
    {
      entry_type: "income",
      amount_input: "125,40",
      financial_category_id: "7",
      counterparty_id: "9",
      cost_center_name: "Cultos de domingo",
      reason: "Corrigir categoria.",
    },
    { mode: "edit" },
  );

  assert.deepEqual(valid, {});
});

test("request payload builder includes reason only for editing mode", () => {
  assert.deepEqual(
    buildFinancialEntryRequestPayload(
      {
        entry_type: "expense",
        amount_input: "89,90",
        financial_category_id: "4",
        counterparty_id: "12",
        cost_center_name: "Acao social",
        reason: "Corrigir comprovante.",
      },
      { mode: "edit" },
    ),
    {
      entry_type: "expense",
      amount: "89.90",
      financial_category_id: 4,
      counterparty_id: 12,
      cost_center_name: "Acao social",
      reason: "Corrigir comprovante.",
    },
  );

  assert.deepEqual(
    buildFinancialEntryRequestPayload(
      {
        entry_type: "expense",
        amount_input: "89,90",
        financial_category_id: "4",
        counterparty_id: "12",
        cost_center_name: "Acao social",
        reason: "Ignorar na criacao.",
      },
      { mode: "create" },
    ),
    {
      entry_type: "expense",
      amount: "89.90",
      financial_category_id: 4,
      counterparty_id: 12,
      cost_center_name: "Acao social",
    },
  );
});

test("response mapping and upsert preserve the latest audit snippet after editing", () => {
  const updatedEntry = buildFinancialEntryListItemFromResponse({
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
    message: "Lancamento atualizado com sucesso.",
  });

  assert.deepEqual(updatedEntry.latest_audit, {
    id: 91,
    reason: "Corrigir subtipo e contraparte apos conferencia.",
    user_name: "Maria Silva",
    created_at: "2026-05-13T11:00:00.000Z",
  });

  assert.deepEqual(
    upsertFinancialEntryListItem(
      [
        {
          id: 15,
          entry_type: "income",
          amount: "125.40",
          financial_category_id: 4,
          financial_category_name: "Dizimos",
          counterparty_id: 9,
          counterparty_name: "Maria Souza",
          cost_center_name: "Cultos de domingo",
          created_at: "2026-05-13T10:00:00.000Z",
          updated_at: "2026-05-13T10:00:00.000Z",
          latest_audit: null,
        },
      ],
      updatedEntry,
    ),
    [updatedEntry],
  );
});

test("UI message normalization removes the raw upstream server error text", () => {
  assert.equal(
    normalizeFinancialEntryUiMessage("Server error"),
    "Nao foi possivel concluir a solicitacao agora.",
  );
  assert.equal(
    normalizeFinancialEntryUiMessage("Sessao invalida. Entre novamente."),
    "Sessao invalida. Entre novamente.",
  );
});
