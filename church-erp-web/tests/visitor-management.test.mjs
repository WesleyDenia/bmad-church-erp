import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { AUTH_SESSION_COOKIE_NAME } from "../src/features/auth/session-constants.ts";
import {
  VISITOR_FORM_STATUS_OPTIONS,
  VISITOR_PAYLOAD_ALLOWLIST,
  extractVisitorValidationErrors,
  readVisitor,
} from "../src/features/people/visitor.ts";
import {
  EMPTY_VISITOR_FORM_VALUES,
  buildVisitorPayload,
  firstVisitorErrorField,
  shouldRenderVisitorForm,
  visitorValuesFromVisitor,
} from "../src/features/people/visitor-form-state.ts";

function readSource(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

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

test("visitor management source keeps browser behind BFF and avoids forbidden UI language", () => {
  const paths = [
    "../src/app/api/secretary/visitors/route.ts",
    "../src/app/api/secretary/visitors/[visitorId]/route.ts",
    "../src/app/secretaria/visitantes/novo/page.tsx",
    "../src/app/secretaria/visitantes/[visitorId]/editar/page.tsx",
    "../src/components/operational/visitor-form.tsx",
    "../src/features/people/visitor.ts",
    "../src/features/people/visitor-form-state.ts",
  ];

  for (const path of paths) {
    assert.equal(existsSync(new URL(path, import.meta.url)), true, `${path} should exist`);
  }

  const createPage = readSource("../src/app/secretaria/visitantes/novo/page.tsx");
  const editPage = readSource("../src/app/secretaria/visitantes/[visitorId]/editar/page.tsx");
  const form = readSource("../src/components/operational/visitor-form.tsx");
  const homeShell = readSource("../src/components/operational/secretary-home-shell.tsx");
  const secretaryHomeService = readSource("../../church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php");
  const createRoute = readSource("../src/app/api/secretary/visitors/route.ts");
  const itemRoute = readSource("../src/app/api/secretary/visitors/[visitorId]/route.ts");

  assert.match(createPage, /AreaGuard[\s\S]*area="secretaria"/);
  assert.match(editPage, /AreaGuard[\s\S]*area="secretaria"/);
  assert.match(secretaryHomeService, /'href' => '\/secretaria\/visitantes\/novo'/);
  assert.match(secretaryHomeService, /'state' => 'available'/);
  assert.equal(form.includes("\"/api/secretary/visitors\""), true);
  assert.match(form, /fetch\(endpoint/);
  assert.doesNotMatch(form, /\/api\/v1\/people\/visitors|API_BASE_URL|last_contacted_at|converter/i);
  assert.match(form, /loading_visitor_form/);
  assert.match(form, /editing_loaded/);
  assert.match(form, /creating_ready/);
  assert.match(form, /saving_visitor/);
  assert.match(form, /visitor_saved/);
  assert.match(form, /validation_error/);
  assert.match(form, /denied_or_session_invalid/);
  assert.match(form, /not_found/);
  assert.match(form, /server_error/);
  assert.match(form, /setSavedVisitor\(null\);[\s\S]*const payload/);
  assert.match(form, /shouldRenderVisitorForm\(mode, state, hasLoadedInitialVisitor\)/);
  assert.match(form, /mode === "create" && state === "visitor_saved"/);
  assert.match(createRoute, /callLaravel\("\/api\/v1\/people\/visitors"/);
  assert.match(itemRoute, /callLaravel\(`\/api\/v1\/people\/visitors\/\$\{visitorId\}`/);
  assert.match(createRoute, /AUTH_SESSION_COOKIE_NAME/);
  assert.match(createRoute, /readSessionTokenFromCookieValue/);
  assert.match(createRoute, /normalizeAuthResponse/);
  assert.match(itemRoute, /isSafePositiveIntegerId/);
  assert.match(itemRoute, /cache: "no-store"/);
  assert.match(createRoute, /validateSameOriginMutation/);
  assert.match(itemRoute, /validateSameOriginMutation/);
  assert.doesNotMatch(`${createRoute}\n${itemRoute}`, /Access-Control-Allow-Origin/);

  const visibleSource = `${createPage}\n${editPage}\n${form}\n${homeShell}`;

  assert.doesNotMatch(visibleSource, /\b(dashboard|widget|KPI|performance|BI)\b/i);
});

test("visitor form state helpers execute load, validation and submit decisions", () => {
  assert.equal(
    shouldRenderVisitorForm("edit", "server_error", false),
    false,
    "edit form must stay hidden when the initial visitor load fails",
  );
  assert.equal(
    shouldRenderVisitorForm("edit", "server_error", true),
    true,
    "edit form can remain usable when a save fails after a visitor was loaded",
  );
  assert.equal(shouldRenderVisitorForm("create", "server_error", false), true);
  assert.equal(shouldRenderVisitorForm("edit", "not_found", true), false);
  assert.equal(shouldRenderVisitorForm("edit", "denied_or_session_invalid", true), false);

  assert.equal(firstVisitorErrorField({
    email: "Informe um email valido.",
    status: "Escolha uma situacao valida para o visitante.",
  }), "status");
  assert.equal(firstVisitorErrorField({}), null);

  assert.deepEqual(buildVisitorPayload({
    display_name: "Ana Visitante",
    status: "follow_up_needed",
    phone: "11999990000",
    email: "ANA@example.com",
  }), {
    display_name: "Ana Visitante",
    status: "follow_up_needed",
    phone: "11999990000",
    email: "ANA@example.com",
  });

  assert.deepEqual(visitorValuesFromVisitor({
    id: 7,
    display_name: "Ana Visitante",
    status: "contacted",
    phone: null,
    email: null,
  }), {
    ...EMPTY_VISITOR_FORM_VALUES,
    display_name: "Ana Visitante",
    status: "contacted",
  });
});

test("visitor contract helpers keep snake_case payloads and validation errors", () => {
  assert.deepEqual([...VISITOR_PAYLOAD_ALLOWLIST], [
    "display_name",
    "status",
    "phone",
    "email",
  ]);
  assert.deepEqual(VISITOR_FORM_STATUS_OPTIONS.map((option) => option.value), [
    "new",
    "follow_up_needed",
    "contacted",
    "inactive",
  ]);

  const visitor = readVisitor({
    data: {
      visitor: {
        id: 7,
        display_name: "Ana Visitante",
        status: "follow_up_needed",
        phone: null,
        email: "ana@example.com",
        church_id: 99,
      },
    },
  });

  assert.deepEqual(visitor, {
    id: 7,
    display_name: "Ana Visitante",
    status: "follow_up_needed",
    phone: null,
    email: "ana@example.com",
  });

  assert.deepEqual(extractVisitorValidationErrors({
    message: "Revise os campos.",
    errors: {
      display_name: ["Informe o nome do visitante."],
      email: ["Este email ja esta em uso por outro visitante."],
      church_id: ["blocked"],
    },
  }), {
    display_name: "Informe o nome do visitante.",
    email: "Este email ja esta em uso por outro visitante.",
  });
});

test("visitor BFF POST validates same-origin, payload allowlist and sanitizes upstream failures", async () => {
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

    if (url === "http://api.test/api/v1/people/visitors") {
      assert.equal(init?.headers instanceof Headers, true);
      assert.equal(init?.headers.get("Authorization"), "Bearer runtime-token");
      assert.deepEqual(JSON.parse(init?.body), {
        display_name: "Ana Visitante",
        status: "new",
        phone: "",
        email: "ANA@example.com",
      });

      return new Response(
        JSON.stringify({
          message: "SQLSTATE leaked",
          payload: { display_name: "Pessoa Sensivel" },
          token: "internal-token",
          trace: "stack trace",
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        },
      );
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const { POST } = await import("../src/app/api/secretary/visitors/route.ts");
    const missingOrigin = await POST(
      new Request("http://web.test/api/secretary/visitors", {
        method: "POST",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          host: "web.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ display_name: "Ana", status: "new" }),
      }),
    );
    const badOrigin = await POST(
      new Request("http://web.test/api/secretary/visitors", {
        method: "POST",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          host: "web.test",
          origin: "http://evil.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ display_name: "Ana", status: "new" }),
      }),
    );
    const extraField = await POST(
      new Request("http://web.test/api/secretary/visitors", {
        method: "POST",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          host: "web.test",
          origin: "http://web.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ display_name: "Ana", status: "new", person_type: "member" }),
      }),
    );
    const upstreamFailure = await POST(
      new Request("http://web.test/api/secretary/visitors", {
        method: "POST",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          host: "web.test",
          origin: "http://web.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          display_name: "Ana Visitante",
          status: "new",
          phone: "",
          email: "ANA@example.com",
        }),
      }),
    );

    assert.equal(missingOrigin.status, 403);
    assert.equal(badOrigin.status, 403);
    assert.equal(extraField.status, 422);
    assert.equal(upstreamFailure.status, 500);
    assert.deepEqual(await upstreamFailure.json(), {
      message: "Nao foi possivel concluir agora. Tente novamente em instantes.",
    });
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("visitor BFF success responses are minimized before reaching the browser", async () => {
  const restoreEnv = setEnv({
    API_BASE_URL: "http://api.test",
    INTERNAL_API_AUDIENCE: "church-erp-api",
    INTERNAL_API_ISSUER: "church-erp-web",
  });
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.toString();

    if (
      url === "http://api.test/api/v1/people/visitors"
      || url === "http://api.test/api/v1/people/visitors/12"
    ) {
      return new Response(
        JSON.stringify({
          data: {
            visitor: {
              id: 12,
              display_name: "Ana Visitante",
              status: "new",
              phone: null,
              email: "ana@example.com",
              church_id: 99,
              person_type: "visitor",
              created_at: "2026-08-25T12:00:00Z",
            },
          },
          message: "Visitante salvo.",
          debug: {
            token: "internal-token",
          },
        }),
        {
          status: url.endsWith("/visitors") ? 201 : 200,
          headers: { "content-type": "application/json" },
        },
      );
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const { POST } = await import("../src/app/api/secretary/visitors/route.ts");
    const { GET, PATCH } = await import("../src/app/api/secretary/visitors/[visitorId]/route.ts");
    const postResponse = await POST(
      new Request("http://web.test/api/secretary/visitors", {
        method: "POST",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          host: "web.test",
          origin: "http://web.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ display_name: "Ana Visitante", status: "new" }),
      }),
    );
    const getResponse = await GET(
      new Request("http://web.test/api/secretary/visitors/12", {
        headers: { cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token` },
      }),
      { params: Promise.resolve({ visitorId: "12" }) },
    );
    const patchResponse = await PATCH(
      new Request("http://web.test/api/secretary/visitors/12", {
        method: "PATCH",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          host: "web.test",
          origin: "http://web.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ phone: "11999990000" }),
      }),
      { params: Promise.resolve({ visitorId: "12" }) },
    );

    for (const response of [postResponse, getResponse, patchResponse]) {
      const body = await response.json();

      assert.equal(response.status === 201 || response.status === 200, true);
      assert.deepEqual(body, {
        data: {
          visitor: {
            id: 12,
            display_name: "Ana Visitante",
            status: "new",
            phone: null,
            email: "ana@example.com",
          },
        },
        message: "Visitante salvo.",
      });
    }
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("visitor BFF GET and PATCH validate visitorId and clear cookie on 401", async () => {
  const restoreEnv = setEnv({
    API_BASE_URL: "http://api.test",
    INTERNAL_API_AUDIENCE: "church-erp-api",
    INTERNAL_API_ISSUER: "church-erp-web",
  });
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.toString();

    calls.push(url);

    return new Response(JSON.stringify({ message: "Sessao invalida. Entre novamente." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const { GET, PATCH } = await import("../src/app/api/secretary/visitors/[visitorId]/route.ts");
    const invalidGet = await GET(
      new Request("http://web.test/api/secretary/visitors/abc", {
        headers: { cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token` },
      }),
      { params: Promise.resolve({ visitorId: "abc" }) },
    );
    const invalidPatch = await PATCH(
      new Request("http://web.test/api/secretary/visitors/0", {
        method: "PATCH",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          host: "web.test",
          origin: "http://web.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ display_name: "Ana" }),
      }),
      { params: Promise.resolve({ visitorId: "0" }) },
    );
    const missingOriginPatch = await PATCH(
      new Request("http://web.test/api/secretary/visitors/12", {
        method: "PATCH",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          host: "web.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ display_name: "Ana" }),
      }),
      { params: Promise.resolve({ visitorId: "12" }) },
    );
    const unauthorized = await GET(
      new Request("http://web.test/api/secretary/visitors/12", {
        headers: { cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token` },
      }),
      { params: Promise.resolve({ visitorId: "12" }) },
    );
    const unauthorizedPatch = await PATCH(
      new Request("http://web.test/api/secretary/visitors/12", {
        method: "PATCH",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          host: "web.test",
          origin: "http://web.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ display_name: "Ana" }),
      }),
      { params: Promise.resolve({ visitorId: "12" }) },
    );

    assert.equal(invalidGet.status, 422);
    assert.equal(invalidPatch.status, 422);
    assert.equal(missingOriginPatch.status, 403);
    assert.equal(calls.length, 2);
    assert.equal(unauthorized.status, 401);
    assert.match(
      unauthorized.headers.get("set-cookie") ?? "",
      new RegExp(`${AUTH_SESSION_COOKIE_NAME}=`),
    );
    assert.equal(unauthorizedPatch.status, 401);
    assert.match(
      unauthorizedPatch.headers.get("set-cookie") ?? "",
      new RegExp(`${AUTH_SESSION_COOKIE_NAME}=`),
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("visitor BFF sanitizes forbidden and not found upstream messages", async () => {
  const restoreEnv = setEnv({
    API_BASE_URL: "http://api.test",
    INTERNAL_API_AUDIENCE: "church-erp-api",
    INTERNAL_API_ISSUER: "church-erp-web",
  });
  const originalFetch = globalThis.fetch;
  let nextStatus = 403;

  globalThis.fetch = async () => new Response(
    JSON.stringify({
      message: "Visitante Sensivel existe no tenant interno",
      errors: {
        debug: ["stack trace"],
      },
    }),
    {
      status: nextStatus,
      headers: { "content-type": "application/json" },
    },
  );

  try {
    const { POST } = await import("../src/app/api/secretary/visitors/route.ts");
    const { GET } = await import("../src/app/api/secretary/visitors/[visitorId]/route.ts");
    const forbiddenCreate = await POST(
      new Request("http://web.test/api/secretary/visitors", {
        method: "POST",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          host: "web.test",
          origin: "http://web.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ display_name: "Ana", status: "new" }),
      }),
    );

    nextStatus = 404;

    const missingRead = await GET(
      new Request("http://web.test/api/secretary/visitors/12", {
        headers: { cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token` },
      }),
      { params: Promise.resolve({ visitorId: "12" }) },
    );

    assert.equal(forbiddenCreate.status, 403);
    assert.deepEqual(await forbiddenCreate.json(), {
      message: "Acesso negado para esta area.",
    });
    assert.equal(missingRead.status, 404);
    assert.deepEqual(await missingRead.json(), {
      message: "Visitante nao encontrado.",
    });
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});
