import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { AUTH_SESSION_COOKIE_NAME } from "../src/features/auth/session-constants.ts";
import {
  MEMBER_FORM_STATUS_OPTIONS,
  MEMBER_PAYLOAD_ALLOWLIST,
  extractMemberValidationErrors,
  readMember,
} from "../src/features/people/member.ts";

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

test("member management source keeps browser behind BFF and avoids forbidden UI language", () => {
  const paths = [
    "../src/app/api/secretary/members/route.ts",
    "../src/app/api/secretary/members/[memberId]/route.ts",
    "../src/app/secretaria/membros/novo/page.tsx",
    "../src/app/secretaria/membros/[memberId]/editar/page.tsx",
    "../src/components/operational/member-form.tsx",
    "../src/features/people/member.ts",
  ];

  for (const path of paths) {
    assert.equal(existsSync(new URL(path, import.meta.url)), true, `${path} should exist`);
  }

  const createPage = readSource("../src/app/secretaria/membros/novo/page.tsx");
  const editPage = readSource("../src/app/secretaria/membros/[memberId]/editar/page.tsx");
  const form = readSource("../src/components/operational/member-form.tsx");
  const homeShell = readSource("../src/components/operational/secretary-home-shell.tsx");
  const secretaryHomeService = readSource("../../church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php");
  const createRoute = readSource("../src/app/api/secretary/members/route.ts");
  const itemRoute = readSource("../src/app/api/secretary/members/[memberId]/route.ts");

  assert.match(createPage, /AreaGuard[\s\S]*area="secretaria"/);
  assert.match(editPage, /AreaGuard[\s\S]*area="secretaria"/);
  assert.match(secretaryHomeService, /'href' => '\/secretaria\/membros\/novo'/);
  assert.equal(form.includes("\"/api/secretary/members\""), true);
  assert.match(form, /fetch\(endpoint/);
  assert.doesNotMatch(form, /\/api\/v1\/people\/members|API_BASE_URL/);
  assert.match(createRoute, /callLaravel\("\/api\/v1\/people\/members"/);
  assert.match(itemRoute, /callLaravel\(`\/api\/v1\/people\/members\/\$\{memberId\}`/);
  assert.match(createRoute, /AUTH_SESSION_COOKIE_NAME/);
  assert.match(createRoute, /readSessionTokenFromCookieValue/);
  assert.match(createRoute, /normalizeAuthResponse/);
  assert.match(itemRoute, /isSafePositiveIntegerId/);
  assert.match(createRoute, /validateSameOriginMutation/);
  assert.match(itemRoute, /validateSameOriginMutation/);
  assert.doesNotMatch(`${createRoute}\n${itemRoute}`, /Access-Control-Allow-Origin/);
  assert.match(form, /setSavedMember\(null\);[\s\S]*const payload/);
  assert.match(form, /mode === "create" && state === "member_saved"/);

  const visibleSource = `${createPage}\n${editPage}\n${form}\n${homeShell}`;

  assert.doesNotMatch(visibleSource, /\b(dashboard|widget|KPI|performance|BI)\b/i);
});

test("member contract helpers keep snake_case payloads and validation errors", () => {
  assert.deepEqual([...MEMBER_PAYLOAD_ALLOWLIST], [
    "display_name",
    "status",
    "phone",
    "email",
  ]);
  assert.deepEqual(MEMBER_FORM_STATUS_OPTIONS.map((option) => option.value), [
    "active",
    "needs_update",
    "inactive",
  ]);

  const member = readMember({
    data: {
      member: {
        id: 7,
        display_name: "Ana Membro",
        status: "active",
        phone: null,
        email: "ana@example.com",
        church_id: 99,
      },
    },
  });

  assert.deepEqual(member, {
    id: 7,
    display_name: "Ana Membro",
    status: "active",
    phone: null,
    email: "ana@example.com",
  });

  assert.deepEqual(extractMemberValidationErrors({
    message: "Revise os campos.",
    errors: {
      display_name: ["Informe o nome do membro."],
      email: ["Este email ja esta em uso por outro membro."],
      church_id: ["blocked"],
    },
  }), {
    display_name: "Informe o nome do membro.",
    email: "Este email ja esta em uso por outro membro.",
  });
});

test("member BFF POST validates same-origin, payload allowlist and sanitizes upstream failures", async () => {
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

    if (url === "http://api.test/api/v1/people/members") {
      assert.equal(init?.headers instanceof Headers, true);
      assert.equal(init?.headers.get("Authorization"), "Bearer runtime-token");
      assert.deepEqual(JSON.parse(init?.body), {
        display_name: "Ana Membro",
        status: "active",
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
    const { POST } = await import("../src/app/api/secretary/members/route.ts");
    const missingOrigin = await POST(
      new Request("http://web.test/api/secretary/members", {
        method: "POST",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          host: "web.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ display_name: "Ana", status: "active" }),
      }),
    );
    const badOrigin = await POST(
      new Request("http://web.test/api/secretary/members", {
        method: "POST",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          host: "web.test",
          origin: "http://evil.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ display_name: "Ana", status: "active" }),
      }),
    );
    const extraField = await POST(
      new Request("http://web.test/api/secretary/members", {
        method: "POST",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          host: "web.test",
          origin: "http://web.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ display_name: "Ana", status: "active", church_id: 9 }),
      }),
    );
    const upstreamFailure = await POST(
      new Request("http://web.test/api/secretary/members", {
        method: "POST",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          host: "web.test",
          origin: "http://web.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          display_name: "Ana Membro",
          status: "active",
          phone: "",
          email: "ANA@example.com",
        }),
      }),
    );

    assert.equal(missingOrigin.status, 403);
    assert.equal(badOrigin.status, 403);
    assert.equal(extraField.status, 422);
    assert.equal(upstreamFailure.status, 500);
    assert.deepEqual(await upstreamFailure.json(), { message: "Server error" });
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("member BFF GET and PATCH validate memberId and clear cookie on 401", async () => {
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
    const { GET, PATCH } = await import("../src/app/api/secretary/members/[memberId]/route.ts");
    const invalidGet = await GET(
      new Request("http://web.test/api/secretary/members/abc", {
        headers: { cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token` },
      }),
      { params: Promise.resolve({ memberId: "abc" }) },
    );
    const invalidPatch = await PATCH(
      new Request("http://web.test/api/secretary/members/0", {
        method: "PATCH",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          host: "web.test",
          origin: "http://web.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ display_name: "Ana" }),
      }),
      { params: Promise.resolve({ memberId: "0" }) },
    );
    const missingOriginPatch = await PATCH(
      new Request("http://web.test/api/secretary/members/12", {
        method: "PATCH",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          host: "web.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ display_name: "Ana" }),
      }),
      { params: Promise.resolve({ memberId: "12" }) },
    );
    const unauthorized = await GET(
      new Request("http://web.test/api/secretary/members/12", {
        headers: { cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token` },
      }),
      { params: Promise.resolve({ memberId: "12" }) },
    );
    const unauthorizedPatch = await PATCH(
      new Request("http://web.test/api/secretary/members/12", {
        method: "PATCH",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          host: "web.test",
          origin: "http://web.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ display_name: "Ana" }),
      }),
      { params: Promise.resolve({ memberId: "12" }) },
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

test("member BFF sanitizes forbidden and not found upstream messages", async () => {
  const restoreEnv = setEnv({
    API_BASE_URL: "http://api.test",
    INTERNAL_API_AUDIENCE: "church-erp-api",
    INTERNAL_API_ISSUER: "church-erp-web",
  });
  const originalFetch = globalThis.fetch;
  let nextStatus = 403;

  globalThis.fetch = async () => new Response(
    JSON.stringify({
      message: "Membro Sensivel existe no tenant interno",
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
    const { POST } = await import("../src/app/api/secretary/members/route.ts");
    const { GET } = await import("../src/app/api/secretary/members/[memberId]/route.ts");
    const forbiddenCreate = await POST(
      new Request("http://web.test/api/secretary/members", {
        method: "POST",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          host: "web.test",
          origin: "http://web.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ display_name: "Ana", status: "active" }),
      }),
    );

    nextStatus = 404;

    const missingRead = await GET(
      new Request("http://web.test/api/secretary/members/12", {
        headers: { cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token` },
      }),
      { params: Promise.resolve({ memberId: "12" }) },
    );

    assert.equal(forbiddenCreate.status, 403);
    assert.deepEqual(await forbiddenCreate.json(), {
      message: "Acesso negado para esta area.",
    });
    assert.equal(missingRead.status, 404);
    assert.deepEqual(await missingRead.json(), {
      message: "Membro nao encontrado.",
    });
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});
