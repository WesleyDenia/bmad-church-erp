import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { AUTH_SESSION_COOKIE_NAME } from "../src/features/auth/session-constants.ts";
import {
  SECRETARY_HOME_PERSON_ALLOWLIST,
  readSecretaryHome,
} from "../src/features/secretaria/secretary-home.ts";

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

test("secretary home source keeps browser behind the BFF and avoids forbidden language", () => {
  const pageSource = readSource("../src/app/secretaria/page.tsx");
  const routeSource = readSource("../src/app/api/secretary/home/route.ts");
  const contractSource = readSource("../src/features/secretaria/secretary-home.ts");
  const homeServiceSource = readSource("../../church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php");

  assert.equal(existsSync(new URL("../src/app/api/secretary/home/route.ts", import.meta.url)), true);
  assert.match(pageSource, /AreaGuard/);
  assert.match(pageSource, /SecretaryHomeShell/);
  assert.doesNotMatch(pageSource, /api\/v1\/secretary\/home|API_BASE_URL/);
  assert.match(routeSource, /callLaravel\("\/api\/v1\/secretary\/home"/);
  assert.match(routeSource, /cache:\s*"no-store"/);
  assert.match(routeSource, /AUTH_SESSION_COOKIE_NAME/);
  assert.doesNotMatch(contractSource, /\b(id|church_id|phone|email|token|headers|Authorization)\b/);
  assert.match(homeServiceSource, /\/secretaria\/pessoas\?person_type=visitor&status=new%2Cfollow_up_needed&contact=all/);
  assert.match(homeServiceSource, /\/secretaria\/pessoas\?person_type=all&status=all&contact=missing_contact/);
  assert.match(homeServiceSource, /\/secretaria\/pessoas\?person_type=member&status=needs_update&contact=all/);

  const shellSource = readSource("../src/components/operational/secretary-home-shell.tsx");
  const peopleFollowupSource = readSource("../src/components/operational/people-followup-block.tsx");

  assert.match(shellSource, /import Link from "next\/link"/);
  assert.match(shellSource, /!\s*isDenied\s*&&\s*<QuickActions/);
  assert.match(shellSource, /!\s*isDenied\s*&&\s*\(\s*<section className="mt-6 grid gap-6/);
  assert.doesNotMatch(shellSource, /home:\s*current\.home/);
  assert.doesNotMatch(shellSource, /error instanceof Error\s*\?\s*error\.message/);
  assert.match(shellSource, /Fluxo em preparacao para uma proxima etapa/);
  assert.match(peopleFollowupSource, /<Link href=\{item\.href\}>/);

  const visibleSource = [
    pageSource,
    shellSource,
    peopleFollowupSource,
    readSource("../src/components/operational/event-schedule-block.tsx"),
    readSource("../src/components/operational/communication-pending-block.tsx"),
    readSource("../src/components/operational/weekly-checklist-block.tsx"),
  ].join("\n");

  assert.doesNotMatch(visibleSource, /\b(dashboard|widget|KPI|performance|BI)\b/i);
  assert.doesNotMatch(visibleSource, /TreasuryEntryForm|financial entries|closing-summary|fechamento/);
});

test("secretary home contract exposes only the approved person fields", () => {
  assert.deepEqual([...SECRETARY_HOME_PERSON_ALLOWLIST], [
    "display_name",
    "status",
    "contact_summary",
    "next_step_label",
    "href",
  ]);

  const home = readSecretaryHome({
    data: {
      secretary_home: {
        state: "secretary_home_loaded",
        recent_visitors: {
          state: "recent_visitors_loaded",
          window_days: 30,
          limit: 5,
          items: [
            {
              display_name: "Ana Visitante",
              status: "new",
              contact_summary: "Email informado",
              next_step_label: "Acompanhar visitante",
              href: "/secretaria",
            },
          ],
        },
      },
    },
  });

  assert.equal(home?.state, "secretary_home_loaded");
  assert.deepEqual(Object.keys(home.recent_visitors.items[0]), [
    "display_name",
    "status",
    "contact_summary",
    "next_step_label",
    "href",
  ]);
});

test("secretary BFF calls Laravel server side and sanitizes sensitive error payloads", async () => {
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

    if (url === "http://api.test/api/v1/secretary/home") {
      assert.equal(init?.headers instanceof Headers, true);
      assert.equal(init?.headers.get("Authorization"), "Bearer runtime-token");
      assert.equal(init?.cache, "no-store");

      return new Response(
        JSON.stringify({
          message: "SQLSTATE leaked",
          token: "internal-token",
          headers: { Authorization: "Bearer secret" },
          payload: { display_name: "Pessoa Sensivel" },
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
    const { GET } = await import("../src/app/api/secretary/home/route.ts");
    const response = await GET(
      new Request("http://web.test/api/secretary/home", {
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
        },
      }),
    );

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      message: "Nao foi possivel carregar a secretaria agora.",
    });
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("secretary BFF rejects scope parameters and clears the session cookie on sanitized 401", async () => {
  const restoreEnv = setEnv({
    API_BASE_URL: "http://api.test",
    INTERNAL_API_AUDIENCE: "church-erp-api",
    INTERNAL_API_ISSUER: "church-erp-web",
  });
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        message: "SQLSTATE leaked Pessoa Sensivel",
        token: "internal-token",
      }),
      {
        status: 401,
        headers: {
          "content-type": "application/json",
        },
      },
    );

  try {
    const { GET } = await import("../src/app/api/secretary/home/route.ts");
    const tamperingResponse = await GET(
      new Request("http://web.test/api/secretary/home?church_id=999", {
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
        },
      }),
    );
    const unauthorizedResponse = await GET(
      new Request("http://web.test/api/secretary/home", {
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
        },
      }),
    );

    assert.equal(tamperingResponse.status, 422);
    assert.deepEqual(await tamperingResponse.json(), {
      message: "Revise a leitura da secretaria e tente novamente.",
      errors: {
        church_id: ["Este parametro nao pode ser informado pelo navegador."],
      },
    });

    assert.equal(unauthorizedResponse.status, 401);
    assert.deepEqual(await unauthorizedResponse.json(), {
      message: "Sessao invalida. Entre novamente.",
    });
    assert.match(
      unauthorizedResponse.headers.get("set-cookie") ?? "",
      new RegExp(`${AUTH_SESSION_COOKIE_NAME}=`),
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("secretary BFF sanitizes forbidden upstream messages", async () => {
  const restoreEnv = setEnv({
    API_BASE_URL: "http://api.test",
    INTERNAL_API_AUDIENCE: "church-erp-api",
    INTERNAL_API_ISSUER: "church-erp-web",
  });
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        message: "Pessoa Sensivel existe neste tenant",
        trace: "stack trace",
      }),
      {
        status: 403,
        headers: {
          "content-type": "application/json",
        },
      },
    );

  try {
    const { GET } = await import("../src/app/api/secretary/home/route.ts");
    const response = await GET(
      new Request("http://web.test/api/secretary/home", {
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
        },
      }),
    );

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      message: "Acesso negado para esta area.",
    });
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});
