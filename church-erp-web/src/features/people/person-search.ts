export type PersonSearchPersonType = "all" | "member" | "visitor";

export type PersonSearchConcreteStatus =
  | "active"
  | "needs_update"
  | "inactive"
  | "new"
  | "follow_up_needed"
  | "contacted";

export type PersonSearchContactFilter =
  | "all"
  | "with_contact"
  | "missing_contact"
  | "phone_only"
  | "email_only";

export type PersonSearchItem = {
  id: number;
  person_type: "member" | "visitor";
  person_type_label: string;
  display_name: string;
  status: PersonSearchConcreteStatus;
  status_label: string;
  contact_summary: string;
  primary_action_href: string;
  primary_action_label: string;
};

export type PersonSearchResponse = {
  data: PersonSearchItem[];
  links: {
    first?: string | null;
    last?: string | null;
    prev?: string | null;
    next?: string | null;
  };
  meta: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
    from?: number | null;
    to?: number | null;
  };
};

export type PersonSearchErrorResponse = {
  message: string;
  errors?: Record<string, string[]>;
};

export const PERSON_SEARCH_ALLOWED_QUERY_PARAMS = [
  "q",
  "person_type",
  "status",
  "contact",
  "page",
  "per_page",
] as const;

const CONCRETE_STATUSES = [
  "active",
  "needs_update",
  "inactive",
  "new",
  "follow_up_needed",
  "contacted",
] as const;

function isConcreteStatus(value: unknown): value is PersonSearchConcreteStatus {
  return typeof value === "string"
    && CONCRETE_STATUSES.includes(value as PersonSearchConcreteStatus);
}

function isPersonSearchItem(value: unknown): value is PersonSearchItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return typeof record.id === "number"
    && (record.person_type === "member" || record.person_type === "visitor")
    && typeof record.person_type_label === "string"
    && typeof record.display_name === "string"
    && isConcreteStatus(record.status)
    && typeof record.status_label === "string"
    && typeof record.contact_summary === "string"
    && typeof record.primary_action_href === "string"
    && typeof record.primary_action_label === "string";
}

function pickPersonSearchItem(value: PersonSearchItem): PersonSearchItem {
  return {
    id: value.id,
    person_type: value.person_type,
    person_type_label: value.person_type_label,
    display_name: value.display_name,
    status: value.status,
    status_label: value.status_label,
    contact_summary: value.contact_summary,
    primary_action_href: value.primary_action_href,
    primary_action_label: value.primary_action_label,
  };
}

function normalizePaginationLink(value: unknown): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string" || value === "") {
    return null;
  }

  try {
    const url = new URL(value, "http://internal.local");
    const query = url.searchParams.toString();

    return query === "" ? "/api/secretary/people" : `/api/secretary/people?${query}`;
  } catch {
    return null;
  }
}

function pickPaginationLinks(value: unknown): PersonSearchResponse["links"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const links: PersonSearchResponse["links"] = {};

  for (const key of ["first", "last", "prev", "next"] as const) {
    if (Object.hasOwn(record, key)) {
      links[key] = normalizePaginationLink(record[key]);
    }
  }

  return links;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function optionalNullableNumber(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }

  return optionalNumber(value);
}

function pickPaginationMeta(value: unknown): PersonSearchResponse["meta"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;

  return {
    current_page: optionalNumber(record.current_page),
    last_page: optionalNumber(record.last_page),
    per_page: optionalNumber(record.per_page),
    total: optionalNumber(record.total),
    from: optionalNullableNumber(record.from),
    to: optionalNullableNumber(record.to),
  };
}

export function normalizePersonSearchResponse(value: unknown): PersonSearchResponse | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (!Array.isArray(record.data)) {
    return null;
  }

  const items = record.data.filter(isPersonSearchItem).map(pickPersonSearchItem);

  if (items.length !== record.data.length) {
    return null;
  }

  return {
    data: items,
    links: pickPaginationLinks(record.links),
    meta: pickPaginationMeta(record.meta),
  };
}

export function extractPersonSearchValidationErrors(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const errors = (value as Record<string, unknown>).errors;

  if (!errors || typeof errors !== "object" || Array.isArray(errors)) {
    return {};
  }

  const fieldErrors: Record<string, string> = {};

  for (const field of PERSON_SEARCH_ALLOWED_QUERY_PARAMS) {
    const messages = (errors as Record<string, unknown>)[field];

    if (
      Array.isArray(messages)
      && messages.length > 0
      && typeof messages[0] === "string"
    ) {
      fieldErrors[field] = messages[0];
    }
  }

  return fieldErrors;
}
