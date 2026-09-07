import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { AUTH_SESSION_COOKIE_NAME } from "../src/features/auth/session-constants.ts";
import {
  PERSON_SEARCH_ALLOWED_QUERY_PARAMS,
  extractPersonSearchValidationErrors,
  normalizePersonSearchResponse,
} from "../src/features/people/person-search.ts";
import {
  appendPersonResolutionReturn,
  personResolutionReturnLabel,
  sanitizePersonResolutionReturn,
} from "../src/features/people/person-resolution-return.ts";
import {
  DEFAULT_PERSON_SEARCH_FILTERS,
  buildPersonSearchQuery,
  parsePersonSearchFilters,
  shouldKeepPersonSearchCriteria,
} from "../src/features/people/person-search-state.ts";

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

test("people search source keeps browser behind the BFF and covers required UI states", () => {
  const paths = [
    "../src/app/api/secretary/people/route.ts",
    "../src/app/secretaria/pessoas/page.tsx",
    "../src/components/operational/person-search-list.tsx",
    "../src/features/people/person-resolution-return.ts",
    "../src/features/people/person-search.ts",
    "../src/features/people/person-search-state.ts",
  ];

  for (const path of paths) {
    assert.equal(existsSync(new URL(path, import.meta.url)), true, `${path} should exist`);
  }

  const page = readSource("../src/app/secretaria/pessoas/page.tsx");
  const component = readSource("../src/components/operational/person-search-list.tsx");
  const returnHelper = readSource("../src/features/people/person-resolution-return.ts");
  const route = readSource("../src/app/api/secretary/people/route.ts");
  const state = readSource("../src/features/people/person-search-state.ts");
  const homeService = readSource("../../church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php");

  assert.match(page, /AreaGuard[\s\S]*area="secretaria"/);
  assert.match(component, /fetch\("\/api\/secretary\/people/);
  assert.match(component, /cache: "no-store"/);
  assert.match(component, /AbortController/);
  assert.match(component, /loading_people_search/);
  assert.match(component, /people_search_ready/);
  assert.match(component, /people_search_loaded/);
  assert.match(component, /empty_people_search/);
  assert.match(component, /validation_error/);
  assert.match(component, /denied_or_session_invalid/);
  assert.match(component, /server_error/);
  assert.match(component, /Membro/);
  assert.match(component, /Visitante/);
  assert.match(component, /URLSearchParams/);
  assert.match(component, /router\.replace/);
  assert.match(component, /appendPersonResolutionReturn/);
  assert.match(component, /sanitizePersonResolutionReturn/);
  assert.match(returnHelper, /PERSON_RESOLUTION_ALLOWED_RETURN_PATHS/);
  assert.match(returnHelper, /return_to/);
  assert.match(component, /rawQueryString !== "" \? rawQueryString : buildPersonSearchQuery\(filters\)\.toString\(\)/);
  assert.match(state, /DEFAULT_PERSON_SEARCH_FILTERS/);
  assert.doesNotMatch(component, /\/api\/v1\/people|API_BASE_URL|last_contacted_at|email|phone/);
  assert.match(route, /callLaravel\(`\/api\/v1\/people\$\{queryString\}`/);
  assert.match(route, /AUTH_SESSION_COOKIE_NAME/);
  assert.match(route, /readSessionTokenFromCookieValue/);
  assert.match(route, /normalizeAuthResponse/);
  assert.match(route, /cache: "no-store"/);
  assert.match(route, /validatePeopleSearchQuery/);
  assert.doesNotMatch(route, /Access-Control-Allow-Origin/);
  assert.match(homeService, /\/secretaria\/pessoas\?person_type=all&status=all&contact=all/);
  assert.match(homeService, /\/secretaria\/pessoas\?person_type=visitor&status=new%2Cfollow_up_needed&contact=all/);
  assert.match(homeService, /\/secretaria\/pessoas\?person_type=all&status=all&contact=missing_contact/);
  assert.match(homeService, /\/secretaria\/pessoas\?person_type=member&status=needs_update&contact=all/);

  const visibleSource = `${page}\n${component}`;

  assert.doesNotMatch(visibleSource, /\b(dashboard|widget|KPI|performance|BI)\b/i);
});

test("person resolution return helper accepts only safe secretary paths and labels pending queues", () => {
  assert.equal(
    sanitizePersonResolutionReturn("/secretaria/pessoas?q=%20Ana%20&person_type=visitor&status=new%2Cfollow_up_needed&contact=all&page=2"),
    "/secretaria/pessoas?q=Ana&person_type=visitor&status=new%2Cfollow_up_needed&contact=all&page=2",
  );
  assert.equal(sanitizePersonResolutionReturn("/secretaria"), "/secretaria");
  assert.equal(sanitizePersonResolutionReturn("https://evil.test/secretaria/pessoas"), "/secretaria");
  assert.equal(sanitizePersonResolutionReturn("//evil.test/secretaria/pessoas"), "/secretaria");
  assert.equal(sanitizePersonResolutionReturn("/\\evil.test/secretaria/pessoas"), "/secretaria");
  assert.equal(sanitizePersonResolutionReturn("/secretaria/../admin"), "/secretaria");
  assert.equal(sanitizePersonResolutionReturn("/secretaria/pessoas?tenant=other"), "/secretaria");
  assert.equal(sanitizePersonResolutionReturn("/secretaria/pessoas?status=active&status=inactive"), "/secretaria");
  assert.equal(sanitizePersonResolutionReturn("/secretaria/pessoas?status[]=active"), "/secretaria");
  assert.equal(sanitizePersonResolutionReturn("/secretaria/pessoas?per_page=51"), "/secretaria");
  assert.equal(sanitizePersonResolutionReturn(`/secretaria/pessoas?q=${"a".repeat(81)}`), "/secretaria");

  assert.equal(
    appendPersonResolutionReturn(
      "/secretaria/visitantes/7/editar",
      "/secretaria/pessoas?person_type=visitor&status=new%2Cfollow_up_needed&contact=all",
    ),
    "/secretaria/visitantes/7/editar?return_to=%2Fsecretaria%2Fpessoas%3Fperson_type%3Dvisitor%26status%3Dnew%252Cfollow_up_needed%26contact%3Dall",
  );
  assert.equal(
    personResolutionReturnLabel("/secretaria/pessoas?person_type=all&status=all&contact=missing_contact"),
    "Voltar para pendencias de contato",
  );
  assert.equal(
    personResolutionReturnLabel("/secretaria/pessoas?person_type=visitor&status=new%2Cfollow_up_needed&contact=all"),
    "Voltar para visitantes em acompanhamento",
  );
  assert.equal(
    personResolutionReturnLabel("/secretaria/pessoas?person_type=member&status=needs_update&contact=all"),
    "Voltar para cadastros para conferir",
  );
});

test("people search contract helpers minimize paginated upstream responses", () => {
  assert.deepEqual([...PERSON_SEARCH_ALLOWED_QUERY_PARAMS], [
    "q",
    "person_type",
    "status",
    "contact",
    "page",
    "per_page",
  ]);

  const normalized = normalizePersonSearchResponse({
    data: [
      {
        id: 7,
        person_type: "visitor",
        person_type_label: "Visitante",
        display_name: "Ana Visitante",
        status: "follow_up_needed",
        status_label: "Precisa de acompanhamento",
        contact_summary: "Email informado",
        primary_action_href: "/secretaria/visitantes/7/editar",
        primary_action_label: "Abrir cadastro",
        church_id: 99,
        email: "ana@example.com",
        phone: "11999990000",
      },
    ],
    links: {
      first: "http://api.test/api/v1/people?page=1",
      last: "http://api.test/api/v1/people?page=3",
      prev: null,
      next: "http://api.test/api/v1/people?page=2",
      debug: "SQLSTATE leaked",
    },
    meta: {
      current_page: 1,
      last_page: 3,
      per_page: 15,
      total: 31,
      from: 1,
      to: 15,
      path: "http://api.test/api/v1/people",
      links: [{ url: "http://api.test/api/v1/people?page=2" }],
      trace: "stack",
    },
  });

  assert.deepEqual(normalized, {
    data: [
      {
        id: 7,
        person_type: "visitor",
        person_type_label: "Visitante",
        display_name: "Ana Visitante",
        status: "follow_up_needed",
        status_label: "Precisa de acompanhamento",
        contact_summary: "Email informado",
        primary_action_href: "/secretaria/visitantes/7/editar",
        primary_action_label: "Abrir cadastro",
      },
    ],
    links: {
      first: "/api/secretary/people?page=1",
      last: "/api/secretary/people?page=3",
      prev: null,
      next: "/api/secretary/people?page=2",
    },
    meta: { current_page: 1, last_page: 3, per_page: 15, total: 31, from: 1, to: 15 },
  });

  assert.deepEqual(extractPersonSearchValidationErrors({
    errors: {
      q: ["Use ate 80 caracteres para a busca."],
      tenant: ["blocked"],
    },
  }), {
    q: "Use ate 80 caracteres para a busca.",
  });
});

test("people search state helpers parse filters, serialize URL and preserve criteria on validation error", () => {
  assert.deepEqual(DEFAULT_PERSON_SEARCH_FILTERS, {
    q: "",
    person_type: "all",
    status: "all",
    contact: "all",
    page: 1,
    per_page: 15,
  });

  assert.deepEqual(parsePersonSearchFilters(new URLSearchParams("q=%20Ana%20&person_type=visitor&status=new%2Cfollow_up_needed&contact=missing_contact&page=2&per_page=50")), {
    q: "Ana",
    person_type: "visitor",
    status: "new,follow_up_needed",
    contact: "missing_contact",
    page: 2,
    per_page: 50,
  });

  assert.equal(
    buildPersonSearchQuery({
      q: "Ana",
      person_type: "visitor",
      status: "new,follow_up_needed",
      contact: "all",
      page: 1,
      per_page: 15,
    }).toString(),
    "q=Ana&person_type=visitor&status=new%2Cfollow_up_needed&contact=all",
  );

  assert.equal(shouldKeepPersonSearchCriteria(422), true);
  assert.equal(shouldKeepPersonSearchCriteria(500), false);
});

test("people search BFF validates queries and sanitizes upstream responses", async () => {
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

    if (url === "http://api.test/api/v1/people?person_type=visitor&status=new%2Cfollow_up_needed&contact=all") {
      assert.equal(init?.headers instanceof Headers, true);
      assert.equal(init?.headers.get("Authorization"), "Bearer runtime-token");
      assert.equal(init?.cache, "no-store");

      return new Response(
        JSON.stringify({
          data: [
            {
              id: 4,
              person_type: "visitor",
              person_type_label: "Visitante",
              display_name: "Ana Visitante",
              status: "new",
              status_label: "Novo",
              contact_summary: "Contato pendente",
              primary_action_href: "/secretaria/visitantes/4/editar",
              primary_action_label: "Abrir cadastro",
              email: "ana@example.com",
              church_id: 1,
            },
          ],
          links: {},
          meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
          trace: "stack",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }

    if (url === "http://api.test/api/v1/people?contact=missing_contact") {
      return new Response(
        JSON.stringify({
          message: "SQLSTATE leaked Pessoa Sensivel",
          trace: "stack",
          token: "internal-token",
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        },
      );
    }

    if (url === "http://api.test/api/v1/people") {
      return new Response(
        JSON.stringify({
          message: "SQLSTATE leaked Pessoa Sensivel token=internal",
          trace: "stack",
        }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        },
      );
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const { GET } = await import("../src/app/api/secretary/people/route.ts");
    const extraParam = await GET(new Request("http://web.test/api/secretary/people?tenant=other", {
      headers: { cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token` },
    }));
    const repeatedParam = await GET(new Request("http://web.test/api/secretary/people?status=new&status=contacted", {
      headers: { cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token` },
    }));
    const longTerm = await GET(new Request(`http://web.test/api/secretary/people?q=${"a".repeat(81)}`, {
      headers: { cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token` },
    }));
    const success = await GET(new Request("http://web.test/api/secretary/people?person_type=visitor&status=new%2Cfollow_up_needed&contact=all", {
      headers: { cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token` },
    }));
    const upstreamFailure = await GET(new Request("http://web.test/api/secretary/people?contact=missing_contact", {
      headers: { cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token` },
    }));
    const upstreamUnauthorized = await GET(new Request("http://web.test/api/secretary/people", {
      headers: { cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token` },
    }));

    assert.equal(extraParam.status, 422);
    assert.deepEqual(await extraParam.json(), {
      message: "Revise os filtros de pessoas e tente novamente.",
    });
    assert.equal(repeatedParam.status, 422);
    assert.equal(longTerm.status, 422);
    assert.equal(success.status, 200);
    assert.deepEqual(await success.json(), {
      data: [
        {
          id: 4,
          person_type: "visitor",
          person_type_label: "Visitante",
          display_name: "Ana Visitante",
          status: "new",
          status_label: "Novo",
          contact_summary: "Contato pendente",
          primary_action_href: "/secretaria/visitantes/4/editar",
          primary_action_label: "Abrir cadastro",
        },
      ],
      links: {},
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
    });
    assert.equal(upstreamFailure.status, 500);
    assert.deepEqual(await upstreamFailure.json(), {
      message: "Nao foi possivel carregar as pessoas agora.",
    });
    assert.equal(upstreamUnauthorized.status, 401);
    assert.deepEqual(await upstreamUnauthorized.json(), {
      message: "Sessao invalida. Entre novamente.",
    });
    assert.equal(calls.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});
