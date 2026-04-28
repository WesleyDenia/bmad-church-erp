import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { normalizeInitialSetupResponse } from "../src/features/auth/initial-setup-response.js";

test("BFF env example exposes internal API variables", () => {
  const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");

  assert.match(envExample, /API_BASE_URL=/);
  assert.match(envExample, /INTERNAL_API_AUDIENCE=/);
  assert.match(envExample, /INTERNAL_API_ISSUER=/);
});

test("web baseline contains route shells and api client", () => {
  const requiredPaths = [
    "../src/app/(auth)/login/page.tsx",
    "../src/app/api/auth/login/route.ts",
    "../src/app/api/auth/me/route.ts",
    "../src/app/api/auth/logout/route.ts",
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
    "../src/features/auth/navigation.ts",
    "../components.json",
    "../src/lib/utils.ts",
    "../src/components/ui/button.tsx",
    "../src/components/design-system/surface.tsx",
    "../src/components/operational/area-card.tsx",
    "../src/design-system/tokens.ts",
    "../src/styles/README.md",
  ];

  for (const path of requiredPaths) {
    assert.equal(existsSync(new URL(path, import.meta.url)), true, `${path} should exist`);
  }
});

test("api client keeps authenticated Laravel calls server-side", () => {
  const apiClient = readFileSync(
    new URL("../src/lib/api/client.ts", import.meta.url),
    "utf8",
  );
  const loginPage = readFileSync(
    new URL("../src/app/(auth)/login/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(apiClient, /server-only/);
  assert.match(apiClient, /serverEnv\.apiBaseUrl/);
  assert.doesNotMatch(loginPage, /API_BASE_URL/);
});

test("auth BFF routes keep the browser on the web layer", () => {
  const loginRoute = readFileSync(
    new URL("../src/app/api/auth/login/route.ts", import.meta.url),
    "utf8",
  );
  const meRoute = readFileSync(
    new URL("../src/app/api/auth/me/route.ts", import.meta.url),
    "utf8",
  );
  const logoutRoute = readFileSync(
    new URL("../src/app/api/auth/logout/route.ts", import.meta.url),
    "utf8",
  );
  const sessionFile = readFileSync(
    new URL("../src/features/auth/session.ts", import.meta.url),
    "utf8",
  );
  const sessionConstantsFile = readFileSync(
    new URL("../src/features/auth/session-constants.ts", import.meta.url),
    "utf8",
  );
  const navigationFile = readFileSync(
    new URL("../src/features/auth/navigation.ts", import.meta.url),
    "utf8",
  );
  const sessionTypesFile = readFileSync(
    new URL("../src/features/auth/session-types.ts", import.meta.url),
    "utf8",
  );
  const authResponseFile = readFileSync(
    new URL("../src/features/auth/auth-response.ts", import.meta.url),
    "utf8",
  );
  const proxyFile = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");

  assert.match(loginRoute, /\/api\/v1\/auth\/login/);
  assert.match(loginRoute, /createInternalJwt/);
  assert.match(loginRoute, /AUTH_SESSION_COOKIE_NAME/);
  assert.match(meRoute, /\/api\/v1\/auth\/me/);
  assert.match(meRoute, /AUTH_SESSION_COOKIE_NAME/);
  assert.match(logoutRoute, /\/api\/v1\/auth\/logout/);
  assert.match(logoutRoute, /AUTH_SESSION_COOKIE_NAME/);
  assert.match(sessionFile, /RS256/);
  assert.match(sessionFile, /httpOnly:\s*true/);
  assert.match(sessionFile, /sameSite:\s*"lax"/);
  assert.match(sessionFile, /path:\s*"\/"/);
  assert.match(sessionFile, /maxAge:\s*AUTH_SESSION_TTL_SECONDS/);
  assert.match(sessionConstantsFile, /AUTH_SESSION_COOKIE_NAME/);
  assert.match(navigationFile, /startsWith\("\/"/);
  assert.match(navigationFile, /startsWith\("\/\/"/);
  assert.match(sessionTypesFile, /LoginPayload/);
  assert.match(authResponseFile, /GENERIC_AUTH_ERROR_MESSAGE/);
  assert.doesNotMatch(sessionFile, /DEV_INTERNAL_JWT_PRIVATE_KEY/);
  assert.match(proxyFile, /\/login/);
  assert.match(proxyFile, /AUTH_SESSION_COOKIE_NAME/);
  assert.match(proxyFile, /\/api\/auth\/me/);
  assert.match(proxyFile, /isSessionValid/);
});

test("onboarding route handler normalizes upstream responses", async () => {
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

test("onboarding route still forwards to the Laravel onboarding endpoint", () => {
  const routeFile = readFileSync(
    new URL("../src/app/api/onboarding/initial-setup/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(routeFile, /\/api\/v1\/onboarding\/initial-setup/);
  assert.match(routeFile, /normalizeInitialSetupResponse/);
  assert.match(routeFile, /callLaravel/);
});

test("login page now speaks to the BFF auth routes", () => {
  const loginPage = readFileSync(
    new URL("../src/app/(auth)/login/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(loginPage, /\/api\/auth\/login/);
  assert.match(loginPage, /useSessionContext/);
  assert.match(loginPage, /getSafeNextPath/);
  assert.match(loginPage, /Entrar/);
});

test("shadcn primitive foundation is materialized", () => {
  const componentsConfig = readFileSync(
    new URL("../components.json", import.meta.url),
    "utf8",
  );
  const button = readFileSync(
    new URL("../src/components/ui/button.tsx", import.meta.url),
    "utf8",
  );

  assert.match(componentsConfig, /"ui": "@\/components\/ui"/);
  assert.match(button, /React\.forwardRef/);
  assert.match(button, /buttonVariants/);
  assert.match(button, /class-variance-authority/);
});
