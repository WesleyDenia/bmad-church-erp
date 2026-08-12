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

function buildSummary(overrides = {}) {
  return {
    state: "closing_summary_loaded",
    period_kind: "custom_period",
    period_start: "2026-06-01T00:00:00.000000Z",
    period_end: "2026-06-07T23:59:59.000000Z",
    total_income: "375.50",
    total_expense: "80.25",
    net_result: "295.25",
    entry_count: 3,
    calculation_basis: "financial_entries.created_at",
    ...overrides,
  };
}

test("leadership helper maps closing summary into executive states without local aggregation", async () => {
  const {
    buildInitialLeadershipSummaryState,
    buildLeadershipSummaryPresentation,
    getLeadershipConfidenceStatus,
    isLeadershipDetailsReconciled,
  } = await import("../src/features/leadership/leadership-summary.ts");

  assert.deepEqual(buildInitialLeadershipSummaryState(), {
    state: "loading_leadership_summary",
    summary: null,
    message: null,
  });

  const presentation = buildLeadershipSummaryPresentation(buildSummary());

  assert.equal(presentation.confidence_status, "consolidado_carregado");
  assert.equal(presentation.period_label, "01/06/2026 00:00 UTC a 07/06/2026 23:59 UTC");
  assert.equal(presentation.total_income_label, "375,50");
  assert.equal(presentation.total_expense_label, "80,25");
  assert.equal(presentation.net_result_label, "295,25");
  assert.match(presentation.entry_count_label, /3 lancamentos/);
  assert.equal(presentation.calculation_basis_label, "Lancamentos registrados no periodo");

  assert.equal(getLeadershipConfidenceStatus("leadership_summary_loaded", buildSummary()), "consolidado_carregado");
  assert.equal(getLeadershipConfidenceStatus("loading_leadership_details", buildSummary()), "consolidado_carregado");
  assert.equal(getLeadershipConfidenceStatus("empty_leadership_summary", buildSummary({ state: "empty_closing_summary" })), "leitura_indisponivel");
  assert.equal(getLeadershipConfidenceStatus("leadership_stale_state_recovered", buildSummary()), "leitura_indisponivel");

  const detailedSummary = buildSummary({
    details: {
      by_cost_center: [],
      by_subtype: [],
      reconciliation: {
        cost_center_status: "consistent",
        subtype_status: "consistent",
      },
    },
  });

  assert.equal(isLeadershipDetailsReconciled(detailedSummary), true);
  assert.equal(getLeadershipConfidenceStatus("leadership_details_loaded", detailedSummary), "detalhe_reconciliado");
  assert.equal(
    isLeadershipDetailsReconciled(buildSummary({
      details: {
        by_cost_center: [],
        by_subtype: [],
        reconciliation: {
          cost_center_status: "consistent",
          subtype_status: "inconsistent",
        },
      },
    })),
    false,
  );
});

test("leadership source files use BFF summary contracts and avoid treasury operation surfaces", () => {
  const routePath = new URL("../src/app/api/leadership/closing-summary/route.ts", import.meta.url);
  const helperPath = new URL("../src/features/leadership/leadership-summary.ts", import.meta.url);
  const shellPath = new URL("../src/components/operational/leadership-home-shell.tsx", import.meta.url);
  const blockPath = new URL("../src/components/operational/leadership-summary-block.tsx", import.meta.url);

  assert.equal(existsSync(routePath), true);
  assert.equal(existsSync(helperPath), true);
  assert.equal(existsSync(shellPath), true);
  assert.equal(existsSync(blockPath), true);

  const routeSource = readFileSync(routePath, "utf8");
  const helperSource = readFileSync(helperPath, "utf8");
  const shellSource = readFileSync(shellPath, "utf8");
  const pageSource = readFileSync(new URL("../src/app/leadership/page.tsx", import.meta.url), "utf8");

  assert.match(routeSource, /callLaravel/);
  assert.match(routeSource, /\/api\/v1\/leadership\/closing-summary/);
  assert.match(routeSource, /cache:\s*"no-store"/);
  assert.match(routeSource, /SCOPE_QUERY_PARAMETERS/);
  assert.match(routeSource, /church_id/);
  assert.match(routeSource, /user_id/);
  assert.match(routeSource, /period_start/);
  assert.match(routeSource, /period_end/);
  assert.doesNotMatch(routeSource, /\/api\/v1\/finance\/closing-summary/);

  assert.match(helperSource, /FinancialClosingSummary/);
  assert.match(helperSource, /consolidado_carregado/);
  assert.match(helperSource, /detalhe_reconciliado/);
  assert.match(helperSource, /leitura_indisponivel/);
  assert.doesNotMatch(helperSource, /financial_entries\s*:/);
  assert.doesNotMatch(helperSource, /\.reduce\s*\(/);
  assert.doesNotMatch(helperSource, /total_income\s*[+\-*/]=/);
  assert.doesNotMatch(helperSource, /total_expense\s*[+\-*/]=/);
  assert.doesNotMatch(helperSource, /net_result\s*[+\-*/]=/);

  assert.match(shellSource, /fetch\("\/api\/leadership\/closing-summary"/);
  assert.match(shellSource, /include_details/);
  assert.match(shellSource, /period_start/);
  assert.match(shellSource, /period_end/);
  assert.match(shellSource, /loading_leadership_summary/);
  assert.match(shellSource, /leadership_summary_loaded/);
  assert.match(shellSource, /empty_leadership_summary/);
  assert.match(shellSource, /leadership_consistency_error/);
  assert.match(shellSource, /leadership_denied_or_session_invalid/);
  assert.match(shellSource, /leadership_server_error/);
  assert.match(shellSource, /leadership_stale_state_recovered/);
  assert.match(shellSource, /operational_signals_unavailable/);
  assert.doesNotMatch(shellSource, /\/api\/v1\//);
  assert.doesNotMatch(shellSource, /financial_entries/);
  assert.doesNotMatch(shellSource, /ClosingSummaryHandoffActions/);
  assert.doesNotMatch(shellSource, /TreasuryEntryForm/);

  assert.match(pageSource, /<AreaGuard[\s\S]*area="leadership"/);
  assert.match(pageSource, /<LeadershipHomeShell\s*\/>/);
  assert.doesNotMatch(pageSource, /ClosingSummaryHandoffActions/);
  assert.doesNotMatch(pageSource, /closing-summary-handoff/);
  assert.doesNotMatch(pageSource, /TreasuryEntryForm/);
});

test("leadership home renders the required structural blocks with loaded summary copy", () => {
  const shellSource = readFileSync(
    new URL("../src/components/operational/leadership-home-shell.tsx", import.meta.url),
    "utf8",
  );
  const blockSource = readFileSync(
    new URL("../src/components/operational/leadership-summary-block.tsx", import.meta.url),
    "utf8",
  );

  assert.match(shellSource, /Fechamento do periodo/);
  assert.match(shellSource, /Confianca da leitura/);
  assert.match(shellSource, /Sinais operacionais/);
  assert.match(shellSource, /A leitura operacional sera completada apos as entregas de pessoas e comunicacao/);
  assert.match(shellSource, /Leitura operacional ainda indisponivel/);
  assert.match(shellSource, /Proximo passo: completar as entregas de pessoas e comunicacao/);
  assert.match(shellSource, /data-state=\{operationalSignalsState\}/);
  assert.match(blockSource, /Surface/);
  assert.match(blockSource, /Button/);
  assert.doesNotMatch(shellSource, /dashboard|KPI|performance|business intelligence/i);
});

test("leadership BFF validates browser query and forwards only allowed params", async () => {
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
        data: {
          closing_summary: buildSummary(),
        },
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  };

  try {
    const { GET } = await import("../src/app/api/leadership/closing-summary/route.ts");

    const response = await GET(
      new Request(
        "http://web.test/api/leadership/closing-summary?include_details=true&period_start=2026-06-01T00:00:00Z&period_end=2026-06-07T23:59:59Z",
        {
          headers: {
            cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          },
        },
      ),
    );

    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "http://api.test/api/v1/leadership/closing-summary?include_details=true&period_start=2026-06-01T00%3A00%3A00Z&period_end=2026-06-07T23%3A59%3A59Z",
    );

    const invalidQueries = [
      "period_start=2026-06-01T00:00:00Z",
      "period_start=not-date&period_end=2026-06-07T23:59:59Z",
      "period_start=2026-02-31T00:00:00Z&period_end=2026-03-02T23:59:59Z",
      "period_start=2026-06-01T00:00:00Z&period_end=2026-07-03T00:00:00Z",
      "period_start=1999-01-01T00:00:00Z&period_end=1999-01-02T00:00:00Z",
      "period_start=2999-01-01T00:00:00Z&period_end=2999-01-02T00:00:00Z",
      "include_details=yes",
      "church_id=1",
      "user_id=1",
      "role=administrator",
      "permission=treasury",
      "tenant=other",
      "permissao=treasury",
      "scope=treasury",
      "foo=bar",
    ];

    for (const query of invalidQueries) {
      const invalidResponse = await GET(
        new Request(`http://web.test/api/leadership/closing-summary?${query}`, {
          headers: {
            cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          },
        }),
      );

      assert.equal(invalidResponse.status, 422, query);
    }

    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("leadership BFF preserves consistency_error and sanitizes denied or server responses", async () => {
  const restoreEnv = setEnv({
    API_BASE_URL: "http://api.test",
    INTERNAL_API_AUDIENCE: "church-erp-api",
    INTERNAL_API_ISSUER: "church-erp-web",
  });
  const originalFetch = globalThis.fetch;
  const upstreamResponses = [
    new Response(JSON.stringify({
      message: "Nao foi possivel confirmar a consistencia do fechamento.",
      data: {
        closing_summary: buildSummary({
          state: "consistency_error",
          debug: "stack trace",
          details: {
            by_cost_center: [{ cost_center_name: "Nao deve vazar" }],
            by_subtype: [{ financial_category_name: "Nao deve vazar" }],
            reconciliation: {
              cost_center_status: "consistent",
              subtype_status: "inconsistent",
              debug: "diff",
            },
          },
        }),
      },
    }), {
      status: 409,
      headers: { "content-type": "application/json" },
    }),
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
    const { GET } = await import("../src/app/api/leadership/closing-summary/route.ts");
    const request = () =>
      new Request("http://web.test/api/leadership/closing-summary", {
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
        },
      });

    const consistency = await GET(request());
    const unauthorized = await GET(request());
    const forbidden = await GET(request());
    const serverError = await GET(request());

    assert.equal(consistency.status, 409);
    assert.deepEqual(await consistency.json(), {
      message: "Nao foi possivel confirmar a consistencia do fechamento.",
      data: {
        closing_summary: {
          ...buildSummary({
            state: "consistency_error",
          }),
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
    assert.equal(unauthorized.status, 401);
    assert.deepEqual(await unauthorized.json(), {
      message: "Sessao invalida. Entre novamente.",
    });
    assert.match(
      unauthorized.headers.get("set-cookie") ?? "",
      new RegExp(`${AUTH_SESSION_COOKIE_NAME}=`),
    );
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
