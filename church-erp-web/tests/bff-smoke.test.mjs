import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  buildAccessDeniedPath,
  canAccessAppArea,
  getAccessibleAppAreaLinks,
  getAppAreaLabel,
  getRouteAccessDecision,
} from "../src/features/app-shell/navigation-policy.js";
import { getSafeNextPath } from "../src/features/auth/navigation-runtime.js";
import { AUTH_SESSION_COOKIE_NAME } from "../src/features/auth/session-constants.ts";
import {
  GENERIC_ACCESS_ERROR_MESSAGE,
  normalizeAccessResponse,
} from "../src/features/auth/access-response-runtime.js";
import { normalizeInitialSetupResponse } from "../src/features/auth/initial-setup-response.js";

function setEnv(overrides) {
  const previous = new Map();

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
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

function createNextLikeRequest(pathname, sessionToken = null) {
  const url = new URL(pathname, "http://web.test");
  const headers = new Headers();

  if (sessionToken) {
    headers.set("cookie", `${AUTH_SESSION_COOKIE_NAME}=${sessionToken}`);
  }

  return {
    url: url.toString(),
    nextUrl: url,
    headers,
    cookies: {
      get(name) {
        if (name === AUTH_SESSION_COOKIE_NAME && sessionToken) {
          return { value: sessionToken };
        }

        return undefined;
      },
    },
  };
}

test("BFF env example exposes internal API variables", () => {
  const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");

  assert.match(envExample, /API_BASE_URL=/);
  assert.match(envExample, /INTERNAL_API_AUDIENCE=/);
  assert.match(envExample, /INTERNAL_API_ISSUER=/);
});

test("web baseline contains route shells and BFF boundary files", () => {
  const requiredPaths = [
    "../src/app/(auth)/login/page.tsx",
    "../src/app/api/auth/login/route.ts",
    "../src/app/api/auth/me/route.ts",
    "../src/app/api/auth/logout/route.ts",
    "../src/app/api/backoffice/access/[area]/route.ts",
    "../src/app/api/categories/defaults/route.ts",
    "../src/app/acesso-negado/page.tsx",
    "../src/app/treasury/page.tsx",
    "../src/app/secretaria/page.tsx",
    "../src/app/leadership/page.tsx",
    "../src/app/communications/page.tsx",
    "../src/lib/api/client.ts",
    "../src/lib/env/server.ts",
    "../src/proxy.ts",
    "../src/features/auth/session.ts",
    "../src/features/auth/session-constants.ts",
    "../src/features/auth/session-types.ts",
    "../src/features/categories/defaults.ts",
    "../src/features/treasury/home-view-model.ts",
    "../src/features/auth/auth-response.ts",
    "../src/features/auth/access-response.ts",
    "../src/features/auth/access-response-runtime.js",
    "../src/features/auth/navigation-runtime.js",
    "../src/features/app-shell/navigation.ts",
    "../src/features/app-shell/navigation-policy.js",
    "../src/components/ui/button.tsx",
    "../src/components/design-system/surface.tsx",
    "../src/components/operational/area-card.tsx",
    "../src/components/operational/access-denied-panel.tsx",
    "../src/components/operational/area-guard.tsx",
    "../src/components/operational/treasury-home-shell.tsx",
    "../src/components/operational/weekly-priority-block.tsx",
    "../src/components/operational/quick-action-rail.tsx",
    "../src/components/operational/operational-pending-block.tsx",
    "../src/components/operational/closing-status-block.tsx",
    "../src/components/operational/payables-receivables-block.tsx",
    "../src/design-system/tokens.ts",
    "../src/styles/README.md",
  ];

  for (const path of requiredPaths) {
    assert.equal(existsSync(new URL(path, import.meta.url)), true, `${path} should exist`);
  }
});

test("app shell navigation is role-aware", () => {
  assert.deepEqual(getAccessibleAppAreaLinks("treasurer"), [
    {
      href: "/treasury",
      label: "Tesouraria",
      description: "Fluxo operacional para lancamentos, pendencias e fechamento.",
    },
  ]);
  assert.deepEqual(getAccessibleAppAreaLinks("secretary"), [
    {
      href: "/secretaria",
      label: "Secretaria",
      description: "Base para cadastro, busca e acompanhamento de pessoas.",
    },
    {
      href: "/communications",
      label: "Comunicacao",
      description: "Camada futura para modelos, handoff e mensagens preparadas.",
    },
  ]);
  assert.equal(canAccessAppArea("leadership", "treasury"), false);
  assert.equal(canAccessAppArea("leadership", "leadership"), true);
  assert.deepEqual(getAccessibleAppAreaLinks(["secretary", "leadership"]), [
    {
      href: "/secretaria",
      label: "Secretaria",
      description: "Base para cadastro, busca e acompanhamento de pessoas.",
    },
    {
      href: "/leadership",
      label: "Lideranca",
      description: "Visao resumida para acompanhamento e alinhamento ministerial.",
    },
    {
      href: "/communications",
      label: "Comunicacao",
      description: "Camada futura para modelos, handoff e mensagens preparadas.",
    },
  ]);
  assert.equal(canAccessAppArea(["secretary", "leadership"], "communications"), true);
  assert.equal(getAppAreaLabel("communications"), "Comunicacao");
});

test("protected routes are denied server-side before the browser renders content", () => {
  assert.deepEqual(getRouteAccessDecision(["leadership"], "/treasury"), {
    area: "treasury",
    allowed: false,
  });
  assert.deepEqual(getRouteAccessDecision(["secretary"], "/secretaria"), {
    area: "secretaria",
    allowed: true,
  });
  assert.equal(
    buildAccessDeniedPath("treasury", "/treasury"),
    "/acesso-negado?area=treasury&from=%2Ftreasury",
  );
});

test("safe next path helper rejects open redirect attempts", () => {
  assert.equal(getSafeNextPath("https://evil.com"), "/");
  assert.equal(getSafeNextPath("//evil.com"), "/");
  assert.equal(getSafeNextPath("/secretaria"), "/secretaria");
});

test("access response helper strips technical errors from browser-facing responses", async () => {
  const sanitized = await normalizeAccessResponse(
    new Response(
      JSON.stringify({
        message: "Acesso negado para esta area.",
        errors: {
          church_id: ["Nao foi possivel aplicar a igreja correta."],
        },
        debug: "internal",
      }),
      {
        status: 403,
        headers: {
          "content-type": "application/json",
        },
      },
    ),
  );

  const fallback = await normalizeAccessResponse(
    new Response("<html>upstream failure</html>", {
      status: 500,
      headers: {
        "content-type": "text/html",
      },
    }),
  );

  assert.deepEqual(sanitized, {
    body: {
      message: "Acesso negado para esta area.",
    },
    status: 403,
  });
  assert.deepEqual(fallback, {
    body: {
      message: GENERIC_ACCESS_ERROR_MESSAGE,
    },
    status: 500,
  });
});

test("backend response normalizer still forwards valid onboarding payloads", async () => {
  const htmlResult = await normalizeInitialSetupResponse(
    new Response("<html>upstream failure</html>", {
      status: 500,
      headers: {
        "content-type": "text/html",
      },
    }),
  );

  const jsonResult = await normalizeInitialSetupResponse(
    new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: {
        "content-type": "application/json",
      },
    }),
  );

  assert.deepEqual(htmlResult, {
    body: {
      message: "Nao foi possivel concluir agora. Tente novamente em instantes.",
    },
    status: 500,
  });
  assert.deepEqual(jsonResult, {
    body: {
      ok: true,
    },
    status: 201,
  });
});

test("BFF route handlers and proxy keep authorization logic outside the browser", () => {
  const proxyFile = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
  const authMeRoute = readFileSync(
    new URL("../src/app/api/auth/me/route.ts", import.meta.url),
    "utf8",
  );
  const backofficeAccessRoute = readFileSync(
    new URL("../src/app/api/backoffice/access/[area]/route.ts", import.meta.url),
    "utf8",
  );
  const categoryDefaultsRoute = readFileSync(
    new URL("../src/app/api/categories/defaults/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(proxyFile, /getRouteAccessDecision/);
  assert.match(proxyFile, /buildAccessDeniedPath/);
  assert.match(authMeRoute, /safeBody/);
  assert.match(backofficeAccessRoute, /safeBody/);
  assert.match(categoryDefaultsRoute, /safeBody/);
  assert.doesNotMatch(authMeRoute, /errors:\s*\{/);
  assert.doesNotMatch(backofficeAccessRoute, /errors:\s*\{/);
  assert.doesNotMatch(categoryDefaultsRoute, /errors:\s*\{/);
});

test("treasury page keeps AreaGuard as the access boundary for the operational home shell", () => {
  const treasuryPage = readFileSync(
    new URL("../src/app/treasury/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(treasuryPage, /import\s+\{\s*AreaGuard\s*\}.*area-guard/);
  assert.match(
    treasuryPage,
    /import\s+\{\s*TreasuryHomeShell\s*\}.*treasury-home-shell/,
  );
  assert.match(treasuryPage, /<AreaGuard[\s\S]*area="treasury"/);
  assert.match(treasuryPage, /<TreasuryHomeShell\s*\/>/);
  assert.doesNotMatch(treasuryPage, /api\/v1/);
  assert.doesNotMatch(treasuryPage, /API_BASE_URL/);
});

test("treasury home shell composes the five operational blocks without dashboard-generic naming", () => {
  const treasuryHomeShell = readFileSync(
    new URL("../src/components/operational/treasury-home-shell.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    treasuryHomeShell,
    /WeeklyPriorityBlock|QuickActionRail|OperationalPendingBlock|ClosingStatusBlock|PayablesReceivablesBlock/,
  );
  assert.match(treasuryHomeShell, /<WeeklyPriorityBlock/);
  assert.match(treasuryHomeShell, /<QuickActionRail/);
  assert.match(treasuryHomeShell, /<OperationalPendingBlock/);
  assert.match(treasuryHomeShell, /<ClosingStatusBlock/);
  assert.match(treasuryHomeShell, /<PayablesReceivablesBlock/);
  assert.doesNotMatch(treasuryHomeShell, /DashboardCard|GenericPanel|Widget/i);
});

test("treasury home links only to anchors that exist in the shell", () => {
  const treasuryHomeShell = readFileSync(
    new URL("../src/components/operational/treasury-home-shell.tsx", import.meta.url),
    "utf8",
  );
  const treasuryHomeViewModel = readFileSync(
    new URL("../src/features/treasury/home-view-model.ts", import.meta.url),
    "utf8",
  );

  const shellIds = new Set(
    [...treasuryHomeShell.matchAll(/id="([^"]+)"/g)].map(([, id]) => id),
  );
  const hrefAnchors = [
    ...treasuryHomeViewModel.matchAll(/href:\s*"\/treasury#([^"]+)"/g),
  ].map(([, anchor]) => anchor);

  assert.ok(hrefAnchors.length > 0, "expected treasury anchors in the view-model");

  for (const anchor of hrefAnchors) {
    assert.equal(
      shellIds.has(anchor),
      true,
      `anchor #${anchor} should exist in TreasuryHomeShell`,
    );
  }
});

test("treasury home shell reads its local mock view-model from the feature layer", () => {
  const treasuryHomeShell = readFileSync(
    new URL("../src/components/operational/treasury-home-shell.tsx", import.meta.url),
    "utf8",
  );
  const treasuryHomeViewModel = readFileSync(
    new URL("../src/features/treasury/home-view-model.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    treasuryHomeShell,
    /from\s+"@\/features\/treasury\/home-view-model"/,
  );
  assert.match(treasuryHomeShell, /treasury_home_view_model/);
  assert.match(treasuryHomeViewModel, /weekly_priority_block/);
  assert.match(treasuryHomeViewModel, /quick_action_rail/);
  assert.match(treasuryHomeViewModel, /operational_pending_block/);
  assert.match(treasuryHomeViewModel, /closing_status_block/);
  assert.match(treasuryHomeViewModel, /payables_receivables_block/);
  assert.match(treasuryHomeViewModel, /quick_action_rail:[\s\S]*empty_state/);
  assert.match(treasuryHomeViewModel, /operational_pending_block:[\s\S]*empty_state/);
  assert.match(treasuryHomeViewModel, /closing_status_block:[\s\S]*empty_state/);
});

test("treasury home keeps an action-oriented empty state when a block lacks enough data", () => {
  const quickActionRail = readFileSync(
    new URL("../src/components/operational/quick-action-rail.tsx", import.meta.url),
    "utf8",
  );
  const operationalPendingBlock = readFileSync(
    new URL("../src/components/operational/operational-pending-block.tsx", import.meta.url),
    "utf8",
  );
  const closingStatusBlock = readFileSync(
    new URL("../src/components/operational/closing-status-block.tsx", import.meta.url),
    "utf8",
  );
  const payablesReceivablesBlock = readFileSync(
    new URL("../src/components/operational/payables-receivables-block.tsx", import.meta.url),
    "utf8",
  );
  const treasuryHomeShell = readFileSync(
    new URL("../src/components/operational/treasury-home-shell.tsx", import.meta.url),
    "utf8",
  );
  const treasuryHomeViewModel = readFileSync(
    new URL("../src/features/treasury/home-view-model.ts", import.meta.url),
    "utf8",
  );

  assert.match(quickActionRail, /if\s*\(actions\.length\s*===\s*0\)/);
  assert.match(operationalPendingBlock, /if\s*\(items\.length\s*===\s*0\)/);
  assert.match(closingStatusBlock, /if\s*\(empty_state\)/);
  assert.match(payablesReceivablesBlock, /empty_state/);
  assert.match(payablesReceivablesBlock, /Ainda nao existem dados suficientes|empty_state\.summary/);
  assert.match(treasuryHomeShell, /empty_state=\{quickActionRail\?\.empty_state\s+\?\?\s+\{/);
  assert.match(treasuryHomeShell, /empty_state=\{operationalPendingBlock\?\.empty_state\s+\?\?\s+\{/);
  assert.match(treasuryHomeShell, /empty_state=\{closingStatus\?\.empty_state\}/);
  assert.match(treasuryHomeViewModel, /empty_state/);
  assert.match(treasuryHomeViewModel, /Preparar primeiros compromissos/);
});

test("proxy and BFF routes execute real runtime logic with controlled fetch responses", async () => {
  const restoreEnv = setEnv({
    API_BASE_URL: "http://api.test",
    INTERNAL_API_AUDIENCE: "church-erp-api",
    INTERNAL_API_ISSUER: "church-erp-web",
  });
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url === "http://web.test/api/auth/me") {
      return new Response(
        JSON.stringify({
          data: {
            roles: ["leadership"],
            role: "leadership",
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }

    if (url === "http://api.test/api/v1/auth/me") {
      assert.equal(init?.headers instanceof Headers, true);
      assert.equal(init?.headers.get("Authorization"), "Bearer runtime-token");

      return new Response(
        JSON.stringify({
          message: "Sessao invalida. Entre novamente.",
          errors: {
            session: ["Sessao invalida. Entre novamente."],
          },
        }),
        {
          status: 401,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }

    if (url === "http://api.test/api/v1/backoffice/access/treasury") {
      assert.equal(init?.headers instanceof Headers, true);
      assert.equal(init?.headers.get("Authorization"), "Bearer runtime-token");

      return new Response(
        JSON.stringify({
          message: "Acesso negado para esta area.",
          errors: {
            church_id: ["Nao foi possivel aplicar a igreja correta."],
          },
        }),
        {
          status: 403,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }

    if (url === "http://api.test/api/v1/categories/defaults") {
      assert.equal(init?.headers instanceof Headers, true);
      assert.equal(init?.headers.get("Authorization"), "Bearer runtime-token");

      return new Response(
        JSON.stringify({
          data: {
            financial_categories: [
              {
                id: 1,
                name: "Dizimos",
                slug: "dizimos",
                kind: "income",
              },
            ],
            person_categories: [
              {
                id: 2,
                name: "Membros",
                slug: "membros",
              },
            ],
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const { proxy } = await import("../src/proxy.ts");
    const { GET: authMeGET } = await import("../src/app/api/auth/me/route.ts");
    const { GET: backofficeAccessGET } = await import("../src/app/api/backoffice/access/[area]/route.ts");
    const { GET: categoryDefaultsGET } = await import(
      "../src/app/api/categories/defaults/route.ts"
    );

    const deniedProxyResponse = await proxy(createNextLikeRequest("/treasury", "runtime-token"));
    const authMeResponse = await authMeGET(
      new Request("http://web.test/api/auth/me", {
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
        },
      }),
    );
    const accessResponse = await backofficeAccessGET(
      new Request("http://web.test/api/backoffice/access/treasury", {
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
        },
      }),
      {
        params: {
          area: "treasury",
        },
      },
    );
    const categoryDefaultsResponse = await categoryDefaultsGET(
      new Request("http://web.test/api/categories/defaults", {
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
        },
      }),
    );

    assert.equal(deniedProxyResponse.status, 307);
    assert.equal(
      deniedProxyResponse.headers.get("location"),
      "http://web.test/acesso-negado?area=treasury&from=%2Ftreasury",
    );

    assert.equal(authMeResponse.status, 401);
    assert.deepEqual(await authMeResponse.json(), {
      message: "Sessao invalida. Entre novamente.",
    });

    assert.equal(accessResponse.status, 403);
    assert.deepEqual(await accessResponse.json(), {
      message: "Acesso negado para esta area.",
    });

    assert.equal(categoryDefaultsResponse.status, 200);
    assert.deepEqual(await categoryDefaultsResponse.json(), {
      data: {
        financial_categories: [
          {
            id: 1,
            name: "Dizimos",
            slug: "dizimos",
            kind: "income",
          },
        ],
        person_categories: [
          {
            id: 2,
            name: "Membros",
            slug: "membros",
          },
        ],
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});
