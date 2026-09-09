import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { AUTH_SESSION_COOKIE_NAME } from "../src/features/auth/session-constants.ts";
import {
  COMMUNICATION_TEMPLATE_ALLOWLIST,
  COMMUNICATION_TEMPLATE_STATES,
  normalizeCommunicationTemplateResponse,
} from "../src/features/communications/communication-template.ts";

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

function readSource(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("communication template contract keeps snake_case fields and strips non-allowlisted values", () => {
  assert.deepEqual([...COMMUNICATION_TEMPLATE_ALLOWLIST], [
    "template_key",
    "name",
    "short_description",
    "category",
    "suggested_channel",
    "status",
    "sort_order",
  ]);
  assert.deepEqual([...COMMUNICATION_TEMPLATE_STATES], [
    "loading_communication_templates",
    "templates_loaded",
    "base_templates_only",
    "denied_or_session_invalid",
    "server_error",
  ]);

  const normalized = normalizeCommunicationTemplateResponse({
    data: [
      {
        id: 10,
        church_id: 7,
        template_key: "visitante_primeiro_contato",
        name: "Primeiro contato com visitante",
        short_description: "Mensagem curta para acolher um visitante recente.",
        body_template: "Nao deve chegar na UI",
        category: "visitor_follow_up",
        suggested_channel: "external_handoff",
        status: "active",
        sort_order: 10,
        created_at: "2026-09-08T00:00:00Z",
      },
    ],
  });

  assert.deepEqual(normalized, {
    data: [
      {
        template_key: "visitante_primeiro_contato",
        name: "Primeiro contato com visitante",
        short_description: "Mensagem curta para acolher um visitante recente.",
        category: "visitor_follow_up",
        suggested_channel: "external_handoff",
        status: "active",
        sort_order: 10,
      },
    ],
  });
  assert.equal(normalizeCommunicationTemplateResponse({ data: {} }), null);
  assert.equal(normalizeCommunicationTemplateResponse({ templates: [] }), null);
});

test("communication templates source stays behind BFF and avoids forbidden visible language", () => {
  const pageSource = readSource("../src/app/communications/page.tsx");
  const routeSource = readSource("../src/app/api/communications/templates/route.ts");
  const contractSource = readSource("../src/features/communications/communication-template.ts");
  const componentSource = readSource("../src/components/operational/communication-template-list.tsx");
  const buttonSource = readSource("../src/components/ui/button.tsx");

  assert.equal(existsSync(new URL("../src/app/api/communications/templates/route.ts", import.meta.url)), true);
  assert.match(pageSource, /AreaGuard[\s\S]*area="communications"/);
  assert.match(pageSource, /CommunicationTemplateList/);
  assert.doesNotMatch(pageSource, /api\/v1\/communications\/templates|API_BASE_URL/);
  assert.doesNotMatch(componentSource, /api\/v1\/communications\/templates|API_BASE_URL/);
  assert.match(componentSource, /fetch\("\/api\/communications\/templates"/);
  assert.match(componentSource, /cache:\s*"no-store"/);
  assert.match(routeSource, /callLaravel\("\/api\/v1\/communications\/templates"/);
  assert.match(routeSource, /cache:\s*"no-store"/);
  assert.match(routeSource, /AUTH_SESSION_COOKIE_NAME/);
  assert.doesNotMatch(routeSource, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.doesNotMatch(contractSource, /\b(id|church_id|church_scope_id|body_template|token|headers|Authorization)\b/);

  const visibleSource = [pageSource, componentSource].join("\n");

  assert.doesNotMatch(visibleSource, /\b(dashboard|widget|KPI|performance|BI)\b/i);
  assert.doesNotMatch(visibleSource, /WhatsApp|envio automatico|enviar mensagem/i);
  assert.match(componentSource, /sm:px-10/);
  assert.match(componentSource, /lg:px-12/);
  assert.match(componentSource, /md:grid-cols-\[1fr_12rem_12rem_11rem\]/);
  assert.match(componentSource, /<ul[\s\S]*templates\.map/);
  assert.match(componentSource, /type="button"/);
  assert.match(componentSource, /aria-live="polite"/);
  assert.match(buttonSource, /focus-visible:ring-2/);
});

test("communication templates BFF rejects browser query before Laravel call", async () => {
  const restoreEnv = setEnv({
    API_BASE_URL: "http://api.test",
    INTERNAL_API_AUDIENCE: "church-erp-api",
    INTERNAL_API_ISSUER: "church-erp-web",
  });
  const originalFetch = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = async () => {
    calls += 1;
    throw new Error("Laravel should not be called for query tampering");
  };

  try {
    const { GET } = await import("../src/app/api/communications/templates/route.ts");
    const response = await GET(
      new Request("http://web.test/api/communications/templates?church_id=999", {
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
        },
      }),
    );

    assert.equal(response.status, 422);
    assert.deepEqual(await response.json(), {
      message: "Revise a leitura dos modelos de comunicacao e tente novamente.",
      errors: {
        church_id: ["Este parametro nao pode ser informado pelo navegador."],
      },
    });
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("communication templates BFF calls Laravel same-origin boundary and sanitizes upstream errors", async () => {
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

    if (url === "http://api.test/api/v1/communications/templates") {
      assert.equal(init?.headers instanceof Headers, true);
      assert.equal(init?.headers.get("Authorization"), "Bearer runtime-token");
      assert.equal(init?.cache, "no-store");

      return new Response(
        JSON.stringify({
          message: "SQLSTATE church_id=7 template=Modelo Protegido",
          token: "internal-token",
          headers: { Authorization: "Bearer secret" },
          trace: "stack trace",
        }),
        {
          status: 500,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const { GET } = await import("../src/app/api/communications/templates/route.ts");
    const response = await GET(
      new Request("http://web.test/api/communications/templates", {
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
        },
      }),
    );

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      message: "Nao foi possivel carregar os modelos de comunicacao agora.",
    });
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("communication templates BFF reads only the exact session cookie name", async () => {
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

    return new Response(
      JSON.stringify({
        data: [
          {
            template_key: "visitante_primeiro_contato",
            name: "Primeiro contato com visitante",
            short_description: "Mensagem curta para acolher um visitante recente.",
            category: "visitor_follow_up",
            suggested_channel: "external_handoff",
            status: "active",
            sort_order: 10,
          },
        ],
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
    const { GET } = await import("../src/app/api/communications/templates/route.ts");
    const response = await GET(
      new Request("http://web.test/api/communications/templates", {
        headers: {
          cookie: `x-${AUTH_SESSION_COOKIE_NAME}=attacker-token; ${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
        },
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init?.headers.get("Authorization"), "Bearer runtime-token");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("communication templates BFF sanitizes network failures without throwing", async () => {
  const restoreEnv = setEnv({
    API_BASE_URL: "http://api.test",
    INTERNAL_API_AUDIENCE: "church-erp-api",
    INTERNAL_API_ISSUER: "church-erp-web",
  });
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    throw new Error("SQLSTATE church_id=7 token internal");
  };

  try {
    const { GET } = await import("../src/app/api/communications/templates/route.ts");
    const response = await GET(
      new Request("http://web.test/api/communications/templates", {
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
        },
      }),
    );

    assert.equal(response.status, 500);
    const body = await response.json();

    assert.deepEqual(body, {
      message: "Nao foi possivel carregar os modelos de comunicacao agora.",
    });
    assert.doesNotMatch(JSON.stringify(body), /SQLSTATE|church_id|token/i);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("communication templates BFF clears cookie on sanitized 401 and sanitizes 403", async () => {
  const restoreEnv = setEnv({
    API_BASE_URL: "http://api.test",
    INTERNAL_API_AUDIENCE: "church-erp-api",
    INTERNAL_API_ISSUER: "church-erp-web",
  });
  const originalFetch = globalThis.fetch;
  const statuses = [401, 403];

  globalThis.fetch = async () => {
    const status = statuses.shift() ?? 500;

    return new Response(
      JSON.stringify({
        message: "Modelo Protegido SQLSTATE token internal",
      }),
      {
        status,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  };

  try {
    const { GET } = await import("../src/app/api/communications/templates/route.ts");
    const unauthorizedResponse = await GET(
      new Request("http://web.test/api/communications/templates", {
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
        },
      }),
    );
    const forbiddenResponse = await GET(
      new Request("http://web.test/api/communications/templates", {
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
        },
      }),
    );

    assert.equal(unauthorizedResponse.status, 401);
    assert.deepEqual(await unauthorizedResponse.json(), {
      message: "Sessao invalida. Entre novamente.",
    });
    assert.match(
      unauthorizedResponse.headers.get("set-cookie") ?? "",
      new RegExp(`${AUTH_SESSION_COOKIE_NAME}=`),
    );

    assert.equal(forbiddenResponse.status, 403);
    const forbiddenBody = await forbiddenResponse.json();

    assert.deepEqual(forbiddenBody, {
      message: "Acesso negado para esta area.",
    });
    assert.doesNotMatch(JSON.stringify(forbiddenBody), /Modelo Protegido|SQLSTATE|token/);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});
