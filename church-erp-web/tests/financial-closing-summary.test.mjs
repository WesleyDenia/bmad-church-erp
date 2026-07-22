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
  assert.equal(shouldPromoteDetailsErrorToClosingSummary(500, consistencyError), false);
  assert.equal(shouldPromoteDetailsErrorToClosingSummary(409, detailedSummary), false);

  const promotedSummary = buildClosingSummaryStateFromDetailsConsistencyError(
    consistencyError,
    "Nao foi possivel confirmar a consistencia do fechamento.",
  );

  assert.equal(promotedSummary.state, "consistency_error");
  assert.equal(promotedSummary.summary, consistencyError);

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
