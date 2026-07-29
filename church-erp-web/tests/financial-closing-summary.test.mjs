import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { AUTH_SESSION_COOKIE_NAME } from "../src/features/auth/session-constants.ts";

function setEnv(overrides) {
  const previous = new Map();

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);

    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }

  return () => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
        continue;
      }

      process.env[key] = value;
    }
  };
}

test("closing summary web contract keeps snake_case states and presentation mapping", async () => {
  const {
    buildClosingSummaryPresentation,
    buildInitialClosingSummaryState,
  } = await import("../src/features/finance/closing-summary.ts");

  assert.deepEqual(buildInitialClosingSummaryState(), {
    state: "loading_closing_summary",
    summary: null,
    message: null,
  });

  const loaded = buildClosingSummaryPresentation(
    {
      state: "closing_summary_loaded",
      period_kind: "current_operational_week",
      period_start: "2026-06-01T00:00:00.000000Z",
      period_end: "2026-06-07T23:59:59.999999Z",
      total_income: "375.50",
      total_expense: "80.25",
      net_result: "295.25",
      entry_count: 3,
      calculation_basis: "financial_entries.created_at",
    },
    0,
  );

  assert.equal(loaded.operational_status, "status_pronto_para_revisar");
  assert.equal(loaded.status_label, "pronto para revisar");
  assert.match(loaded.summary, /3 lancamentos reais/);
  assert.match(loaded.summary, /Receitas: 375,50/);
  assert.match(loaded.summary, /Despesas: 80,25/);

  const withPending = buildClosingSummaryPresentation(
    {
      ...loaded.closing_summary,
      state: "closing_summary_loaded",
    },
    2,
  );

  assert.equal(withPending.operational_status, "status_em_andamento");
  assert.equal(withPending.status_label, "em andamento");

  const withUnknownPendingState = buildClosingSummaryPresentation(
    {
      ...loaded.closing_summary,
      state: "closing_summary_loaded",
    },
    null,
  );

  assert.equal(withUnknownPendingState.operational_status, "status_em_andamento");
  assert.equal(withUnknownPendingState.status_label, "em conferencia");
  assert.match(withUnknownPendingState.summary, /pendencias operacionais ainda estao sendo conferidas/);

  const empty = buildClosingSummaryPresentation(
    {
      state: "empty_closing_summary",
      period_kind: "custom_period",
      period_start: "2026-06-01T00:00:00.000000Z",
      period_end: "2026-06-07T23:59:59.999999Z",
      total_income: "0.00",
      total_expense: "0.00",
      net_result: "0.00",
      entry_count: 0,
      calculation_basis: "financial_entries.created_at",
    },
    0,
  );

  assert.equal(empty.operational_status, "empty_closing_summary");
  assert.equal(empty.status_label, "sem movimentos");
  assert.match(empty.summary, /Registre um lancamento/);
});

test("closing summary detail contract keeps snake_case fields and consistency_error state", async () => {
  const {
    buildClosingSummaryPresentation,
    buildClosingSummaryStateFromDetailsConsistencyError,
    shouldPromoteDetailsErrorToClosingSummary,
    shouldReloadClosingDetailsAfterEntryMutation,
  } = await import("../src/features/finance/closing-summary.ts");

  const detailedSummary = {
    state: "closing_summary_loaded",
    period_kind: "custom_period",
    period_start: "2026-06-01T00:00:00.000000Z",
    period_end: "2026-06-07T23:59:59.000000Z",
    total_income: "375.50",
    total_expense: "80.25",
    net_result: "295.25",
    entry_count: 3,
    calculation_basis: "financial_entries.created_at",
    details: {
      by_cost_center: [
        {
          cost_center_key: "cultos-de-domingo",
          cost_center_name: "Cultos de domingo",
          total_income: "200.00",
          total_expense: "80.25",
          net_result: "119.75",
          entry_count: 2,
          percentage_of_total_movement: "61.50",
        },
      ],
      by_subtype: [
        {
          financial_category_id: 10,
          financial_category_name: "Dizimos",
          financial_category_slug: "dizimos",
          financial_category_kind: "income",
          total_income: "200.00",
          total_expense: "0.00",
          net_result: "200.00",
          entry_count: 1,
          percentage_of_total_movement: "43.91",
        },
      ],
      reconciliation: {
        cost_center_status: "consistent",
        subtype_status: "consistent",
      },
    },
  };

  assert.equal(
    detailedSummary.details.by_cost_center[0].percentage_of_total_movement,
    "61.50",
  );
  assert.equal(detailedSummary.details.by_subtype[0].financial_category_slug, "dizimos");

  const presentation = buildClosingSummaryPresentation(detailedSummary, 0);
  assert.equal(presentation.operational_status, "status_pronto_para_revisar");

  const consistencyError = {
    ...detailedSummary,
    state: "consistency_error",
    details: {
      by_cost_center: [],
      by_subtype: [],
      reconciliation: {
        cost_center_status: "consistent",
        subtype_status: "inconsistent",
      },
    },
  };

  assert.equal(consistencyError.state, "consistency_error");
  assert.deepEqual(consistencyError.details.by_subtype, []);

  assert.equal(shouldPromoteDetailsErrorToClosingSummary(409, consistencyError), true);
  assert.equal(shouldPromoteDetailsErrorToClosingSummary(500, consistencyError), true);
  assert.equal(shouldPromoteDetailsErrorToClosingSummary(409, detailedSummary), true);
  assert.equal(shouldPromoteDetailsErrorToClosingSummary(409, null), true);
  assert.equal(shouldPromoteDetailsErrorToClosingSummary(500, detailedSummary), false);

  const promotedSummary = buildClosingSummaryStateFromDetailsConsistencyError(
    consistencyError,
    "Nao foi possivel confirmar a consistencia do fechamento.",
  );

  assert.equal(promotedSummary.state, "consistency_error");
  assert.equal(promotedSummary.summary, consistencyError);

  const promotedWithoutPayload = buildClosingSummaryStateFromDetailsConsistencyError(
    null,
    "Nao foi possivel confirmar a consistencia do fechamento.",
  );

  assert.equal(promotedWithoutPayload.state, "consistency_error");
  assert.equal(promotedWithoutPayload.summary, null);

  const blockedPresentation = buildClosingSummaryPresentation(
    promotedSummary.summary,
    0,
  );

  assert.equal(blockedPresentation.operational_status, "consistency_error");
  assert.equal(blockedPresentation.cta_label, "Tentar novamente");
  assert.doesNotMatch(blockedPresentation.summary, /Receitas:/);
  assert.doesNotMatch(blockedPresentation.summary, /Despesas:/);

  assert.equal(shouldReloadClosingDetailsAfterEntryMutation("closing_details_loaded"), true);
  assert.equal(shouldReloadClosingDetailsAfterEntryMutation("consistency_error"), true);
  assert.equal(shouldReloadClosingDetailsAfterEntryMutation("details_stale_after_mutation"), true);
  assert.equal(shouldReloadClosingDetailsAfterEntryMutation("details_collapsed"), false);
});

function buildDetailedClosingSummary(overrides = {}) {
  return {
    state: "closing_summary_loaded",
    period_kind: "custom_period",
    period_start: "2026-06-01T00:00:00.000000Z",
    period_end: "2026-06-07T23:59:59.999999Z",
    total_income: "375.50",
    total_expense: "80.25",
    net_result: "295.25",
    entry_count: 3,
    calculation_basis: "financial_entries.created_at",
    details: {
      by_cost_center: [
        {
          cost_center_key: "cultos-de-domingo",
          cost_center_name: "Cultos de domingo",
          total_income: "200.00",
          total_expense: "80.25",
          net_result: "119.75",
          entry_count: 2,
          percentage_of_total_movement: "61.50",
        },
      ],
      by_subtype: [
        {
          financial_category_id: 10,
          financial_category_name: "Dizimos",
          financial_category_slug: "dizimos",
          financial_category_kind: "income",
          total_income: "200.00",
          total_expense: "0.00",
          net_result: "200.00",
          entry_count: 1,
          percentage_of_total_movement: "43.91",
        },
      ],
      reconciliation: {
        cost_center_status: "consistent",
        subtype_status: "consistent",
      },
    },
    ...overrides,
  };
}

function buildHandoffEligibility(overrides = {}) {
  const summary = buildDetailedClosingSummary();

  return {
    summary_state: "closing_summary_loaded",
    details_state: "closing_details_loaded",
    operational_status: "status_pronto_para_revisar",
    pending_items_count: 0,
    summary,
    ...overrides,
  };
}

test("closing summary handoff content uses the loaded summary and consistent details without recalculating finance", async () => {
  const {
    buildClosingSummaryHandoffContent,
  } = await import("../src/features/finance/closing-summary-handoff.ts");

  const result = buildClosingSummaryHandoffContent({
    eligibility: buildHandoffEligibility(),
    generated_at: "2026-06-08T10:30:00.000Z",
  });

  assert.equal(result.state, "handoff_ready");
  assert.equal(result.content.title, "Resumo de fechamento para a lideranca");
  assert.equal(
    result.content.period_label,
    "Periodo: 01/06/2026 00:00 UTC a 07/06/2026 23:59 UTC",
  );
  assert.equal(result.content.generated_at_label, "Preparado em 08/06/2026 10:30 UTC");
  assert.equal(result.content.source_summary.total_income, "375.50");
  assert.equal(result.content.source_summary.net_result, "295.25");

  assert.match(result.content.plain_text, /Receitas: 375,50/);
  assert.match(result.content.plain_text, /Despesas: 80,25/);
  assert.match(result.content.plain_text, /Resultado liquido: 295,25/);
  assert.match(result.content.plain_text, /3 lancamentos/);
  assert.match(result.content.plain_text, /financial_entries\.created_at/);
  assert.match(result.content.plain_text, /Reconciliacao: centros de custo e subtipos consistentes/);
  assert.match(result.content.plain_text, /Cultos de domingo/);
  assert.match(result.content.plain_text, /Dizimos/);
  assert.doesNotMatch(result.content.plain_text, /counterparty|usuario|audit|motivo|financial_entry_id/i);

  const normalizedLabelsResult = buildClosingSummaryHandoffContent({
    eligibility: buildHandoffEligibility({
      summary: buildDetailedClosingSummary({
        details: {
          ...buildDetailedClosingSummary().details,
          by_cost_center: [
            {
              ...buildDetailedClosingSummary().details.by_cost_center[0],
              cost_center_name: "Cultos\nPIX atacante",
            },
          ],
          by_subtype: [
            {
              ...buildDetailedClosingSummary().details.by_subtype[0],
              financial_category_name: "Dizimos\r\nConta externa",
            },
          ],
        },
      }),
    }),
    generated_at: "2026-06-08T10:30:00.000Z",
  });

  assert.equal(normalizedLabelsResult.state, "handoff_ready");
  assert.match(normalizedLabelsResult.content.plain_text, /Cultos PIX atacante:/);
  assert.match(normalizedLabelsResult.content.plain_text, /Dizimos Conta externa:/);
  assert.doesNotMatch(normalizedLabelsResult.content.plain_text, /Cultos\nPIX atacante/);
  assert.doesNotMatch(normalizedLabelsResult.content.plain_text, /Dizimos\r\nConta externa/);

  assert.deepEqual(result.content.print_sections.map((section) => section.heading), [
    "Periodo",
    "Totais consolidados",
    "Reconciliacao",
    "Por centro de custo",
    "Por subtipo",
    "Base do fechamento",
  ]);
});

test("closing summary handoff blocks unreliable or operationally pending states before producing text", async () => {
  const {
    buildClosingSummaryHandoffContent,
  } = await import("../src/features/finance/closing-summary-handoff.ts");

  const blockedStates = [
    "empty_closing_summary",
    "consistency_error",
    "denied_or_session_invalid",
    "server_error",
    "stale_home_state_recovered",
  ];

  for (const summaryState of blockedStates) {
    const result = buildClosingSummaryHandoffContent({
      eligibility: buildHandoffEligibility({
        summary_state: summaryState,
        summary: summaryState === "denied_or_session_invalid"
          ? null
          : buildDetailedClosingSummary({ state: summaryState }),
      }),
      generated_at: "2026-06-08T10:30:00.000Z",
    });

    assert.notEqual(result.state, "handoff_ready", summaryState);
    assert.match(result.message, /Nao foi possivel preparar|confer/i);
  }

  const pendingResult = buildClosingSummaryHandoffContent({
    eligibility: buildHandoffEligibility({
      pending_items_count: 1,
      operational_status: "status_em_andamento",
    }),
    generated_at: "2026-06-08T10:30:00.000Z",
  });

  assert.equal(pendingResult.state, "handoff_blocked_pending_items");
  assert.match(pendingResult.message, /pendencias/);

  const inconsistentDetails = buildClosingSummaryHandoffContent({
    eligibility: buildHandoffEligibility({
      summary: buildDetailedClosingSummary({
        details: {
          ...buildDetailedClosingSummary().details,
          reconciliation: {
            cost_center_status: "consistent",
            subtype_status: "inconsistent",
          },
        },
      }),
    }),
    generated_at: "2026-06-08T10:30:00.000Z",
  });

  assert.equal(inconsistentDetails.state, "handoff_blocked_unreliable_summary");
  assert.match(inconsistentDetails.message, /consistencia/);

  const incompletePayloads = [
    { period_start: "" },
    { period_end: "" },
    { total_income: "" },
    { total_expense: "valor" },
    { net_result: "" },
    { entry_count: -1 },
    { calculation_basis: "financial_entries.updated_at" },
  ];

  for (const incompletePayload of incompletePayloads) {
    const result = buildClosingSummaryHandoffContent({
      eligibility: buildHandoffEligibility({
        summary: buildDetailedClosingSummary(incompletePayload),
      }),
      generated_at: "2026-06-08T10:30:00.000Z",
    });

    assert.equal(
      result.state,
      "handoff_blocked_unreliable_summary",
      JSON.stringify(incompletePayload),
    );
  }
});

test("closing summary handoff requests BFF-loaded details before preparing output", async () => {
  const {
    buildClosingSummaryHandoffContent,
  } = await import("../src/features/finance/closing-summary-handoff.ts");

  const result = buildClosingSummaryHandoffContent({
    eligibility: buildHandoffEligibility({
      details_state: "details_collapsed",
      summary: buildDetailedClosingSummary({ details: undefined }),
    }),
    generated_at: "2026-06-08T10:30:00.000Z",
  });

  assert.equal(result.state, "handoff_needs_details");
  assert.match(result.message, /detalhamento reconciliado/);
});

test("closing summary handoff browser helpers execute clipboard share and print fallback decisions", async () => {
  const {
    canUseNativeTextShare,
    hasClosingSummaryPrintViewReady,
    isUserCancelledShare,
    shareClosingSummaryText,
    writeClosingSummaryTextToClipboard,
  } = await import("../src/features/finance/closing-summary-handoff.ts");

  const copiedTexts = [];
  assert.equal(
    await writeClosingSummaryTextToClipboard({
      is_secure_context: true,
      clipboard: {
        writeText(text) {
          copiedTexts.push(text);
        },
      },
    }, "Resumo pronto"),
    true,
  );
  assert.deepEqual(copiedTexts, ["Resumo pronto"]);
  assert.equal(
    await writeClosingSummaryTextToClipboard({
      is_secure_context: false,
      clipboard: {
        writeText() {
          throw new Error("should not be called");
        },
      },
    }, "Resumo pronto"),
    false,
  );
  assert.equal(
    await writeClosingSummaryTextToClipboard({
      is_secure_context: true,
      clipboard: {
        writeText() {
          throw new Error("permission denied");
        },
      },
    }, "Resumo pronto"),
    false,
  );

  assert.equal(
    canUseNativeTextShare({ share() {} }, { title: "Resumo", text: "Conteudo" }),
    true,
  );
  assert.equal(
    canUseNativeTextShare(
      { share() {}, canShare: () => true },
      { title: "Resumo", text: "Conteudo" },
    ),
    true,
  );
  assert.equal(
    canUseNativeTextShare(
      { share() {}, canShare: () => false },
      { title: "Resumo", text: "Conteudo" },
    ),
    false,
  );
  assert.equal(
    canUseNativeTextShare({}, { title: "Resumo", text: "Conteudo" }),
    false,
  );
  assert.equal(isUserCancelledShare({ name: "AbortError" }), true);
  assert.equal(isUserCancelledShare(new Error("Permission denied")), false);

  assert.equal(
    await shareClosingSummaryText(
      { share() {} },
      { title: "Resumo", text: "Conteudo" },
    ),
    "native_share_completed",
  );
  assert.equal(
    await shareClosingSummaryText(
      {
        share() {
          const error = new Error("cancelled");
          error.name = "AbortError";
          throw error;
        },
      },
      { title: "Resumo", text: "Conteudo" },
    ),
    "native_share_cancelled",
  );
  assert.equal(
    await shareClosingSummaryText(
      { share() { throw new Error("not allowed"); } },
      { title: "Resumo", text: "Conteudo" },
    ),
    "native_share_unavailable",
  );
  assert.equal(
    await shareClosingSummaryText(
      { canShare: () => false, share() {} },
      { title: "Resumo", text: "Conteudo" },
    ),
    "native_share_unavailable",
  );
  assert.equal(
    hasClosingSummaryPrintViewReady({
      querySelector(selector) {
        return selector === "[data-closing-summary-print-view='ready']"
          ? {}
          : null;
      },
    }),
    true,
  );
  assert.equal(
    hasClosingSummaryPrintViewReady({ querySelector: () => null }),
    false,
  );
});

test("closing summary handoff source avoids entry-level aggregation and keeps the BFF detail callback awaitable", () => {
  const helperSource = readFileSync(
    new URL("../src/features/finance/closing-summary-handoff.ts", import.meta.url),
    "utf8",
  );
  const actionsSource = readFileSync(
    new URL("../src/components/operational/closing-summary-handoff-actions.tsx", import.meta.url),
    "utf8",
  );
  const printSource = readFileSync(
    new URL("../src/components/operational/closing-summary-print-view.tsx", import.meta.url),
    "utf8",
  );
  const shellSource = readFileSync(
    new URL("../src/components/operational/treasury-home-shell.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(helperSource, /\.reduce\s*\(/);
  assert.doesNotMatch(helperSource, /\.forEach\s*\(/);
  assert.doesNotMatch(helperSource, /financial_entries\s*:/);
  assert.doesNotMatch(helperSource, /entry_count\s*\+/);
  assert.match(actionsSource, /writeClosingSummaryTextToClipboard/);
  assert.match(actionsSource, /shareClosingSummaryText/);
  assert.match(actionsSource, /hasClosingSummaryPrintViewReady/);
  assert.match(printSource, /data-closing-summary-print-view="ready"/);
  assert.doesNotMatch(
    shellSource,
    /onRequestDetails=\{[\s\S]*\? \(\) => void loadClosingDetails\(\)/,
  );
  assert.match(shellSource, /\(\) => loadClosingDetails\(\)/);
  assert.match(shellSource, /include_details/);
  assert.match(shellSource, /period_start/);
  assert.match(shellSource, /period_end/);
});

test("closing summary BFF route forwards optional UTC period and include_details params and preserves validation errors", async () => {
  const restoreEnv = setEnv({
    API_BASE_URL: "http://api.test",
    INTERNAL_API_AUDIENCE: "church-erp-api",
    INTERNAL_API_ISSUER: "church-erp-web",
  });
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, init });

    assert.equal(init?.method, "GET");
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.headers instanceof Headers, true);
    assert.equal(init?.headers.get("Authorization"), "Bearer runtime-token");

    return new Response(
      JSON.stringify({
        message: "Revise o periodo do fechamento e tente novamente.",
        errors: {
          period_start: ["Informe um timestamp UTC valido para o inicio do periodo."],
        },
      }),
      {
        status: 422,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  };

  try {
    const { GET } = await import("../src/app/api/finance/closing-summary/route.ts");

    const response = await GET(
      new Request(
        "http://web.test/api/finance/closing-summary?include_details=true&period_start=2026-06-01T00:00:00Z&period_end=2026-06-07T23:59:59Z",
        {
          headers: {
            cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          },
        },
      ),
    );

    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "http://api.test/api/v1/finance/closing-summary?include_details=true&period_start=2026-06-01T00%3A00%3A00Z&period_end=2026-06-07T23%3A59%3A59Z",
    );
    assert.equal(response.status, 422);
    assert.deepEqual(await response.json(), {
      message: "Revise o periodo do fechamento e tente novamente.",
      errors: {
        period_start: ["Informe um timestamp UTC valido para o inicio do periodo."],
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("closing summary BFF preserves consistency_error 409 without server sanitization", async () => {
  const restoreEnv = setEnv({
    API_BASE_URL: "http://api.test",
    INTERNAL_API_AUDIENCE: "church-erp-api",
    INTERNAL_API_ISSUER: "church-erp-web",
  });
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        message: "Nao foi possivel confirmar a consistencia do fechamento.",
        data: {
          closing_summary: {
            state: "consistency_error",
            debug: "stack trace",
            period_kind: "custom_period",
            period_start: "2026-06-01T00:00:00.000000Z",
            period_end: "2026-06-07T23:59:59.000000Z",
            total_income: "50.00",
            total_expense: "0.00",
            net_result: "50.00",
            entry_count: 1,
            calculation_basis: "financial_entries.created_at",
            details: {
              by_cost_center: [],
              by_subtype: [],
              reconciliation: {
                cost_center_status: "consistent",
                subtype_status: "inconsistent",
                debug: "internal diff",
              },
            },
          },
        },
      }),
      {
        status: 409,
        headers: {
          "content-type": "application/json",
        },
      },
    );

  try {
    const { GET } = await import("../src/app/api/finance/closing-summary/route.ts");

    const response = await GET(
      new Request("http://web.test/api/finance/closing-summary?include_details=true", {
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
        },
      }),
    );

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      message: "Nao foi possivel confirmar a consistencia do fechamento.",
      data: {
        closing_summary: {
          state: "consistency_error",
          period_kind: "custom_period",
          period_start: "2026-06-01T00:00:00.000000Z",
          period_end: "2026-06-07T23:59:59.000000Z",
          total_income: "50.00",
          total_expense: "0.00",
          net_result: "50.00",
          entry_count: 1,
          calculation_basis: "financial_entries.created_at",
          details: {
            by_cost_center: [],
            by_subtype: [],
            reconciliation: {
              cost_center_status: "consistent",
              subtype_status: "inconsistent",
            },
          },
        },
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("closing summary BFF sanitizes 401 403 and 5xx responses", async () => {
  const restoreEnv = setEnv({
    API_BASE_URL: "http://api.test",
    INTERNAL_API_AUDIENCE: "church-erp-api",
    INTERNAL_API_ISSUER: "church-erp-web",
  });
  const originalFetch = globalThis.fetch;
  const upstreamResponses = [
    new Response(JSON.stringify({ message: "Sessao invalida. Entre novamente.", debug: "jwt" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    }),
    new Response(JSON.stringify({ message: "Acesso negado para esta area.", errors: { role: ["x"] } }), {
      status: 403,
      headers: { "content-type": "application/json" },
    }),
    new Response("<html>fail</html>", {
      status: 500,
      headers: { "content-type": "text/html" },
    }),
  ];

  globalThis.fetch = async () => upstreamResponses.shift();

  try {
    const { GET } = await import("../src/app/api/finance/closing-summary/route.ts");
    const request = () =>
      new Request("http://web.test/api/finance/closing-summary", {
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
        },
      });

    const unauthorized = await GET(request());
    const forbidden = await GET(request());
    const serverError = await GET(request());

    assert.equal(unauthorized.status, 401);
    assert.deepEqual(await unauthorized.json(), {
      message: "Sessao invalida. Entre novamente.",
    });
    assert.equal(forbidden.status, 403);
    assert.deepEqual(await forbidden.json(), {
      message: "Acesso negado para esta area.",
    });
    assert.equal(serverError.status, 500);
    assert.deepEqual(await serverError.json(), {
      message: "Server error",
    });
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("closing summary BFF sanitizes unexpected 4xx response bodies", async () => {
  const restoreEnv = setEnv({
    API_BASE_URL: "http://api.test",
    INTERNAL_API_AUDIENCE: "church-erp-api",
    INTERNAL_API_ISSUER: "church-erp-web",
  });
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(JSON.stringify({
      message: "Route not found",
      exception: "Illuminate\\Routing\\Exceptions\\RouteNotFoundException",
      trace: [{ file: "/var/www/app/routes/api.php" }],
    }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });

  try {
    const { GET } = await import("../src/app/api/finance/closing-summary/route.ts");

    const response = await GET(
      new Request("http://web.test/api/finance/closing-summary", {
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
        },
      }),
    );

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      message: "Nao foi possivel carregar o fechamento agora.",
    });
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("treasury home loads closing summary from the BFF and no longer trusts static closing totals", () => {
  const routePath = new URL("../src/app/api/finance/closing-summary/route.ts", import.meta.url);
  const contractPath = new URL("../src/features/finance/closing-summary.ts", import.meta.url);
  const treasuryHomeShell = readFileSync(
    new URL("../src/components/operational/treasury-home-shell.tsx", import.meta.url),
    "utf8",
  );
  const closingStatusBlock = readFileSync(
    new URL("../src/components/operational/closing-status-block.tsx", import.meta.url),
    "utf8",
  );
  const closingDetailBreakdown = readFileSync(
    new URL("../src/components/operational/closing-detail-breakdown.tsx", import.meta.url),
    "utf8",
  );
  const treasuryHomeViewModel = readFileSync(
    new URL("../src/features/treasury/home-view-model.ts", import.meta.url),
    "utf8",
  );

  assert.equal(existsSync(routePath), true);
  assert.equal(existsSync(contractPath), true);
  assert.match(treasuryHomeShell, /fetch\("\/api\/finance\/closing-summary"/);
  assert.match(treasuryHomeShell, /buildInitialClosingSummaryState/);
  assert.match(treasuryHomeShell, /stale_home_state_recovered/);
  assert.match(treasuryHomeShell, /loadClosingSummary\(undefined,\s*\{\s*preserveLoadingState:\s*true\s*\}\)/);
  assert.match(treasuryHomeShell, /include_details:\s*"true"/);
  assert.match(treasuryHomeShell, /loadClosingDetails/);
  assert.match(treasuryHomeShell, /details_stale_after_mutation/);
  assert.match(treasuryHomeShell, /buildClosingSummaryStateFromDetailsConsistencyError/);
  assert.match(treasuryHomeShell, /shouldPromoteDetailsErrorToClosingSummary/);
  assert.match(closingStatusBlock, /closing_summary/);
  assert.match(closingStatusBlock, /ClosingDetailBreakdown/);
  assert.match(closingDetailBreakdown, /Por centro de custo/);
  assert.match(closingDetailBreakdown, /Por subtipo/);
  assert.doesNotMatch(closingDetailBreakdown, /financial_entries/);
  assert.doesNotMatch(closingDetailBreakdown, /\.reduce\(/);
  assert.doesNotMatch(treasuryHomeShell, /const closingStatus = treasury_home_view_model\.closing_status_block/);
  assert.doesNotMatch(treasuryHomeViewModel, /closing_status_block:\s*\{/);
});
