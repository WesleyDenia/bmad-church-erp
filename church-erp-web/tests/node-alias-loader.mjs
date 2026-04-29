import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = new URL("../", import.meta.url);

function resolveAliasCandidate(specifier) {
  const relativePath = specifier.slice(2);
  const baseUrl = new URL(`./src/${relativePath}`, projectRoot);
  const candidates = [baseUrl.href];

  if (!relativePath.endsWith(".js") && !relativePath.endsWith(".mjs") && !relativePath.endsWith(".ts") && !relativePath.endsWith(".tsx")) {
    candidates.push(new URL(`./src/${relativePath}.js`, projectRoot).href);
    candidates.push(new URL(`./src/${relativePath}.ts`, projectRoot).href);
    candidates.push(new URL(`./src/${relativePath}.mjs`, projectRoot).href);
    candidates.push(new URL(`./src/${relativePath}.tsx`, projectRoot).href);
  }

  for (const candidate of candidates) {
    if (existsSync(fileURLToPath(candidate))) {
      return candidate;
    }
  }

  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return {
      url: "data:text/javascript,export {}",
      shortCircuit: true,
    };
  }

  if (!specifier.startsWith("@/")) {
    return nextResolve(specifier, context);
  }

  const resolved = resolveAliasCandidate(specifier);

  if (!resolved) {
    return nextResolve(specifier, context);
  }

  return {
    url: resolved,
    shortCircuit: true,
  };
}
