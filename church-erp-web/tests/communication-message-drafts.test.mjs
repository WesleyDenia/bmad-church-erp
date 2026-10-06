import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { AUTH_SESSION_COOKIE_NAME } from "../src/features/auth/session-constants.ts";
import {
  COMMUNICATION_MESSAGE_DRAFT_PAYLOAD_ALLOWLIST,
  COMMUNICATION_MESSAGE_DRAFT_RESPONSE_ALLOWLIST,
  COMMUNICATION_MESSAGE_DRAFT_STATES,
  parseSecretaryHomeCommunicationContext,
  normalizeCommunicationMessageDraftResponse,
} from "../src/features/communications/message-draft.ts";

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

test("message draft contract keeps snake_case payload response and UI states", () => {
  assert.deepEqual([...COMMUNICATION_MESSAGE_DRAFT_PAYLOAD_ALLOWLIST], [
    "template_key",
    "person_type",
    "person_id",
  ]);
  assert.deepEqual([...COMMUNICATION_MESSAGE_DRAFT_RESPONSE_ALLOWLIST], [
    "template",
    "person",
    "draft",
  ]);
  assert.deepEqual([...COMMUNICATION_MESSAGE_DRAFT_STATES], [
    "loading_people_for_message",
    "ready_to_prepare_message",
    "communication_context_loaded",
    "communication_context_invalid",
    "generating_message_draft",
    "message_draft_ready",
    "draft_has_missing_contact",
    "validation_error",
    "denied_or_session_invalid",
    "server_error",
  ]);

  const normalized = normalizeCommunicationMessageDraftResponse({
    data: {
      template: {
        id: 10,
        church_id: 7,
        template_key: "visitante_primeiro_contato",
        name: "Primeiro contato",
        category: "visitor_follow_up",
        suggested_channel: "external_handoff",
        body_template: "Nao deve chegar",
      },
      person: {
        id: 7,
        church_id: 9,
        person_type: "visitor",
        display_name: "Ana Visitante",
        status: "follow_up_needed",
        status_label: "Precisa de acompanhamento",
        contact_summary: "Contato pendente",
        phone: "+351999999999",
      },
      draft: {
        message_body: "Ola Ana",
        missing_fields: [
          {
            field: "contact",
            label: "Contato",
            message: "Telefone ou email ainda nao foi informado.",
          },
        ],
        used_fields: ["nome"],
        editable: true,
      },
    },
  });

  assert.deepEqual(normalized, {
    data: {
      template: {
        template_key: "visitante_primeiro_contato",
        name: "Primeiro contato",
        category: "visitor_follow_up",
        suggested_channel: "external_handoff",
      },
      person: {
        id: 7,
        person_type: "visitor",
        display_name: "Ana Visitante",
        status: "follow_up_needed",
        status_label: "Precisa de acompanhamento",
        contact_summary: "Contato pendente",
      },
      draft: {
        message_body: "Ola Ana",
        missing_fields: [
          {
            field: "contact",
            label: "Contato",
            message: "Telefone ou email ainda nao foi informado.",
          },
        ],
        used_fields: ["nome"],
        editable: true,
      },
    },
  });
  assert.equal(normalizeCommunicationMessageDraftResponse({ data: [] }), null);
  assert.equal(normalizeCommunicationMessageDraftResponse({ data: { draft: {} } }), null);
});

test("message draft context parser accepts only minimized secretary-home deep links", () => {
  assert.deepEqual(
    parseSecretaryHomeCommunicationContext(
      new URLSearchParams("template_key=visitante_primeiro_contato&person_type=visitor&person_id=7&source=secretary_home"),
    ),
    {
      state: "communication_context_loaded",
      context: {
        template_key: "visitante_primeiro_contato",
        person_type: "visitor",
        person_id: 7,
        source: "secretary_home",
      },
    },
  );

  for (const query of [
    "template_key=visitante_primeiro_contato&person_type=visitor&person_id=7&source=secretary_home&church_id=9",
    "template_key=visitante_primeiro_contato&person_type=visitor&person_id=7&source=secretary_home&phone=123",
    "template_key=visitante_primeiro_contato&person_type=visitor&person_id=bad&source=secretary_home",
    "template_key=visitante_primeiro_contato&person_type=visitor&source=secretary_home",
    "source=manual",
  ]) {
    assert.deepEqual(parseSecretaryHomeCommunicationContext(new URLSearchParams(query)), {
      state: "communication_context_invalid",
      context: null,
    });
  }

  assert.deepEqual(parseSecretaryHomeCommunicationContext(new URLSearchParams("")), {
    state: null,
    context: null,
  });
});

test("message draft source stays behind BFF and renders editable text only", () => {
  const pageSource = readSource("../src/app/communications/page.tsx");
  const listSource = readSource("../src/components/operational/communication-template-list.tsx");
  const composerSource = readSource("../src/components/operational/communication-message-composer.tsx");
  const handoffSource = readSource("../src/components/operational/communication-message-handoff-actions.tsx");
  const handoffContractSource = readSource("../src/features/communications/message-handoff.ts");
  const routeSource = readSource("../src/app/api/communications/message-drafts/route.ts");
  const contractSource = readSource("../src/features/communications/message-draft.ts");

  assert.equal(existsSync(new URL("../src/app/api/communications/message-drafts/route.ts", import.meta.url)), true);
  assert.match(pageSource, /AreaGuard[\s\S]*area="communications"/);
  assert.match(listSource, /onSelectTemplate/);
  assert.match(listSource, /useSearchParams/);
  assert.match(listSource, /parseSecretaryHomeCommunicationContext/);
  assert.doesNotMatch([pageSource, listSource, composerSource].join("\n"), /api\/v1|API_BASE_URL|Authorization|Bearer/);
  assert.match(composerSource, /fetch\("\/api\/secretary\/people/);
  assert.match(composerSource, /fetch\("\/api\/communications\/message-drafts"/);
  assert.match(composerSource, /communication_context_loaded/);
  assert.match(composerSource, /communication_context_invalid/);
  assert.doesNotMatch(composerSource, /localStorage|sessionStorage|console\./);
  assert.match(composerSource, /<Textarea/);
  assert.match(composerSource, /CommunicationMessageHandoffActions/);
  assert.match(composerSource, /draftText=\{composer\.draftText\}/);
  assert.match(composerSource, /draftRevision=\{composer\.draftRevision\}/);
  assert.match(composerSource, /countCommunicationMessageCodePoints/);
  assert.doesNotMatch(composerSource, /maxLength=/);
  assert.doesNotMatch([composerSource, handoffSource, handoffContractSource].join("\n"), /dangerouslySetInnerHTML|markdown|rich text|webhook|scheduler|fila/i);
  assert.doesNotMatch(handoffSource, /fetch\(/);
  assert.doesNotMatch(handoffSource, /useEffect\(\(\) => \{\s*(?:void\s+)?(?:shareCommunicationMessage|writeCommunicationMessageToClipboard)/);
  assert.doesNotMatch([pageSource, listSource, composerSource].join("\n"), /\b(dashboard|widget|KPI|performance|BI)\b/i);
  assert.doesNotMatch(contractSource, /\b(church_id|phone|email|body_template|message_body inicial|token|headers|Authorization)\b/);
  assert.match(routeSource, /callLaravel\("\/api\/v1\/communications\/message-drafts"/);
  assert.match(routeSource, /cache:\s*"no-store"/);
  assert.match(routeSource, /AUTH_SESSION_COOKIE_NAME/);
  assert.doesNotMatch(routeSource, /export async function (GET|PUT|PATCH|DELETE)/);
});

test("message draft BFF rejects query and non-json payload before Laravel call", async () => {
  const restoreEnv = setEnv({
    API_BASE_URL: "http://api.test",
    INTERNAL_API_AUDIENCE: "church-erp-api",
    INTERNAL_API_ISSUER: "church-erp-web",
  });
  const originalFetch = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = async () => {
    calls += 1;
    throw new Error("Laravel should not be called");
  };

  try {
    const { POST } = await import("../src/app/api/communications/message-drafts/route.ts");
    const queryResponse = await POST(
      new Request("http://web.test/api/communications/message-drafts?person_id=7", {
        method: "POST",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          template_key: "visitante_primeiro_contato",
          person_type: "visitor",
          person_id: 7,
        }),
      }),
    );
    const contentTypeResponse = await POST(
      new Request("http://web.test/api/communications/message-drafts", {
        method: "POST",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
        },
        body: JSON.stringify({
          template_key: "visitante_primeiro_contato",
          person_type: "visitor",
          person_id: 7,
        }),
      }),
    );

    assert.equal(queryResponse.status, 422);
    assert.equal(contentTypeResponse.status, 422);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("message draft BFF rejects extra fields before Laravel call", async () => {
  const restoreEnv = setEnv({
    API_BASE_URL: "http://api.test",
    INTERNAL_API_AUDIENCE: "church-erp-api",
    INTERNAL_API_ISSUER: "church-erp-web",
  });
  const originalFetch = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = async () => {
    calls += 1;
    throw new Error("Laravel should not be called");
  };

  try {
    const { POST } = await import("../src/app/api/communications/message-drafts/route.ts");

    for (const extra of [
      { church_id: 7 },
      { phone: "+351999999999" },
      { email: "ana@example.com" },
      { status: "active" },
      { body_template: "{{nome}}" },
      { message_body: "Ola" },
      { person: { id: 7 } },
      { person_id: { id: 7 } },
    ]) {
      const response = await POST(
        new Request("http://web.test/api/communications/message-drafts", {
          method: "POST",
          headers: {
            cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            template_key: "visitante_primeiro_contato",
            person_type: "visitor",
            person_id: 7,
            ...extra,
          }),
        }),
      );

      assert.equal(response.status, 422);
      assert.doesNotMatch(JSON.stringify(await response.json()), /ana@example.com|\+351999999999|body_template/i);
    }

    const invalidTemplateKeyResponse = await POST(
      new Request("http://web.test/api/communications/message-drafts", {
        method: "POST",
        headers: {
          cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          template_key: "Visitante Primeiro Contato",
          person_type: "visitor",
          person_id: 7,
        }),
      }),
    );

    assert.equal(invalidTemplateKeyResponse.status, 422);
    assert.doesNotMatch(JSON.stringify(await invalidTemplateKeyResponse.json()), /Visitante Primeiro Contato/);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("message draft BFF calls Laravel with sanitized response handling and exact cookie", async () => {
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

    assert.equal(url, "http://api.test/api/v1/communications/message-drafts");
    assert.equal(init?.method, "POST");
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.headers.get("Authorization"), "Bearer runtime-token");
    assert.deepEqual(JSON.parse(init?.body), {
      template_key: "visitante_primeiro_contato",
      person_type: "visitor",
      person_id: 7,
    });

    return new Response(
      JSON.stringify({
        data: {
          template: {
            template_key: "visitante_primeiro_contato",
            name: "Primeiro contato",
            category: "visitor_follow_up",
            suggested_channel: "external_handoff",
          },
          person: {
            id: 7,
            person_type: "visitor",
            display_name: "Ana Visitante",
            status: "follow_up_needed",
            status_label: "Precisa de acompanhamento",
            contact_summary: "Telefone: +351999999999",
          },
          draft: {
            message_body: "Ola Ana",
            missing_fields: [],
            used_fields: ["nome"],
            editable: true,
          },
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
    const { POST } = await import("../src/app/api/communications/message-drafts/route.ts");
    const response = await POST(
      new Request("http://web.test/api/communications/message-drafts", {
        method: "POST",
        headers: {
          cookie: `x-${AUTH_SESSION_COOKIE_NAME}=attacker-token; ${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          template_key: "visitante_primeiro_contato",
          person_type: "visitor",
          person_id: 7,
        }),
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.equal((await response.json()).data.draft.message_body, "Ola Ana");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("message draft BFF clears cookie on 401 and sanitizes upstream failures", async () => {
  const restoreEnv = setEnv({
    API_BASE_URL: "http://api.test",
    INTERNAL_API_AUDIENCE: "church-erp-api",
    INTERNAL_API_ISSUER: "church-erp-web",
  });
  const originalFetch = globalThis.fetch;
  const statuses = [401, 403, 404, 422, 500];

  globalThis.fetch = async () => {
    const status = statuses.shift() ?? 500;

    return new Response(
      JSON.stringify({
        message: "SQLSTATE church_id=7 Ana Visitante +351999999999 token internal",
        trace: "stack trace",
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
    const { POST } = await import("../src/app/api/communications/message-drafts/route.ts");
    const bodies = [];
    const responses = [];

    for (let index = 0; index < 5; index += 1) {
      const response = await POST(
        new Request("http://web.test/api/communications/message-drafts", {
          method: "POST",
          headers: {
            cookie: `${AUTH_SESSION_COOKIE_NAME}=runtime-token`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            template_key: "visitante_primeiro_contato",
            person_type: "visitor",
            person_id: 7,
          }),
        }),
      );
      responses.push(response);
      bodies.push(await response.json());
    }

    assert.deepEqual(responses.map((response) => response.status), [401, 403, 404, 422, 500]);
    assert.match(responses[0].headers.get("set-cookie") ?? "", new RegExp(`${AUTH_SESSION_COOKIE_NAME}=`));

    for (const body of bodies) {
      assert.doesNotMatch(JSON.stringify(body), /SQLSTATE|church_id|Ana Visitante|\+351999999999|token|trace/i);
    }
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});
