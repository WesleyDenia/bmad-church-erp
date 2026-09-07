import { PERSON_SEARCH_ALLOWED_QUERY_PARAMS } from "@/features/people/person-search";

export const PERSON_RESOLUTION_FALLBACK_RETURN = "/secretaria";

export const PERSON_RESOLUTION_ALLOWED_RETURN_PATHS = [
  "/secretaria",
  "/secretaria/pessoas",
] as const;

const PERSON_TYPES = ["all", "member", "visitor"] as const;
const CONTACT_FILTERS = ["all", "with_contact", "missing_contact", "phone_only", "email_only"] as const;
const PERSON_RESOLUTION_BASE_ORIGIN = "http://church-erp.local";
const CONCRETE_STATUSES = [
  "active",
  "needs_update",
  "inactive",
  "new",
  "follow_up_needed",
  "contacted",
] as const;

function isAllowedParameter(key: string): key is (typeof PERSON_SEARCH_ALLOWED_QUERY_PARAMS)[number] {
  return PERSON_SEARCH_ALLOWED_QUERY_PARAMS.includes(key as (typeof PERSON_SEARCH_ALLOWED_QUERY_PARAMS)[number]);
}

function isSafePositiveInteger(value: string, max?: number): boolean {
  if (!/^[1-9]\d*$/.test(value)) {
    return false;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && (max === undefined || parsed <= max);
}

function isSafePersonType(value: string): boolean {
  return PERSON_TYPES.includes(value as (typeof PERSON_TYPES)[number]);
}

function isSafeContact(value: string): boolean {
  return CONTACT_FILTERS.includes(value as (typeof CONTACT_FILTERS)[number]);
}

function isSafeStatus(value: string): boolean {
  if (value === "all") {
    return true;
  }

  if (value.includes(" ")) {
    return false;
  }

  const statuses = value.split(",");

  return statuses.length > 0
    && !statuses.includes("")
    && !statuses.includes("all")
    && statuses.every((status) => CONCRETE_STATUSES.includes(status as (typeof CONCRETE_STATUSES)[number]));
}

function safeUrl(value: string): URL | null {
  const raw = value.trim();

  if (
    raw === ""
    || raw.startsWith("//")
    || !raw.startsWith("/")
    || raw.includes("://")
    || raw.includes("\\")
  ) {
    return null;
  }

  try {
    const url = new URL(raw, PERSON_RESOLUTION_BASE_ORIGIN);

    return url.origin === PERSON_RESOLUTION_BASE_ORIGIN ? url : null;
  } catch {
    return null;
  }
}

function validateSearchParams(searchParams: URLSearchParams): URLSearchParams | null {
  const nextParams = new URLSearchParams();

  for (const key of searchParams.keys()) {
    if (!isAllowedParameter(key) || key.endsWith("[]") || searchParams.getAll(key).length !== 1) {
      return null;
    }
  }

  for (const key of PERSON_SEARCH_ALLOWED_QUERY_PARAMS) {
    const value = searchParams.get(key);

    if (value === null) {
      continue;
    }

    if (key === "q") {
      const q = value.trim();

      if (q.length > 80) {
        return null;
      }

      if (q !== "") {
        nextParams.set("q", q);
      }

      continue;
    }

    if (key === "person_type" && !isSafePersonType(value)) {
      return null;
    }

    if (key === "status" && !isSafeStatus(value)) {
      return null;
    }

    if (key === "contact" && !isSafeContact(value)) {
      return null;
    }

    if (key === "page" && !isSafePositiveInteger(value)) {
      return null;
    }

    if (key === "per_page" && !isSafePositiveInteger(value, 50)) {
      return null;
    }

    nextParams.set(key, value);
  }

  return nextParams;
}

export function sanitizePersonResolutionReturn(value: unknown): string {
  if (typeof value !== "string") {
    return PERSON_RESOLUTION_FALLBACK_RETURN;
  }

  const url = safeUrl(value);

  if (url === null || !PERSON_RESOLUTION_ALLOWED_RETURN_PATHS.includes(url.pathname as (typeof PERSON_RESOLUTION_ALLOWED_RETURN_PATHS)[number])) {
    return PERSON_RESOLUTION_FALLBACK_RETURN;
  }

  if (url.pathname === "/secretaria") {
    return url.search === "" && url.hash === "" ? "/secretaria" : PERSON_RESOLUTION_FALLBACK_RETURN;
  }

  if (url.hash !== "") {
    return PERSON_RESOLUTION_FALLBACK_RETURN;
  }

  const searchParams = validateSearchParams(url.searchParams);

  if (searchParams === null) {
    return PERSON_RESOLUTION_FALLBACK_RETURN;
  }

  const query = searchParams.toString();

  return query === "" ? "/secretaria/pessoas" : `/secretaria/pessoas?${query}`;
}

export function appendPersonResolutionReturn(baseHref: string, returnHref: string): string {
  const sanitizedReturn = sanitizePersonResolutionReturn(returnHref);
  const separator = baseHref.includes("?") ? "&" : "?";

  return `${baseHref}${separator}return_to=${encodeURIComponent(sanitizedReturn)}`;
}

export function personResolutionReturnLabel(returnHref: string): string {
  const sanitizedReturn = sanitizePersonResolutionReturn(returnHref);

  if (!sanitizedReturn.startsWith("/secretaria/pessoas")) {
    return "Voltar para secretaria";
  }

  const url = new URL(sanitizedReturn, "http://church-erp.local");
  const personType = url.searchParams.get("person_type");
  const status = url.searchParams.get("status");
  const contact = url.searchParams.get("contact");

  if (contact === "missing_contact") {
    return "Voltar para pendencias de contato";
  }

  if (personType === "visitor" && status === "new,follow_up_needed") {
    return "Voltar para visitantes em acompanhamento";
  }

  if (personType === "member" && status === "needs_update") {
    return "Voltar para cadastros para conferir";
  }

  return "Voltar para pendencias";
}
