import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("BFF env example exposes internal API variables", () => {
  const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");

  assert.match(envExample, /API_BASE_URL=/);
  assert.match(envExample, /INTERNAL_API_AUDIENCE=/);
  assert.match(envExample, /INTERNAL_API_ISSUER=/);
});

test("web baseline contains route shells and api client", () => {
  const requiredPaths = [
    "../src/app/(auth)/login/page.tsx",
    "../src/app/treasury/page.tsx",
    "../src/app/secretaria/page.tsx",
    "../src/app/leadership/page.tsx",
    "../src/app/communications/page.tsx",
    "../src/lib/api/client.ts",
    "../src/lib/env/server.ts",
    "../src/middleware.ts",
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
