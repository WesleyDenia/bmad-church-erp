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

  assert.match(proxyFile, /getRouteAccessDecision/);
  assert.match(proxyFile, /buildAccessDeniedPath/);
  assert.match(authMeRoute, /safeBody/);
  assert.match(backofficeAccessRoute, /safeBody/);
  assert.doesNotMatch(authMeRoute, /errors:\s*\{/);
  assert.doesNotMatch(backofficeAccessRoute, /errors:\s*\{/);
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

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const { proxy } = await import("../src/proxy.ts");
    const { GET: authMeGET } = await import("../src/app/api/auth/me/route.ts");
    const { GET: backofficeAccessGET } = await import("../src/app/api/backoffice/access/[area]/route.ts");

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
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});
