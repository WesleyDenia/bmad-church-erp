import type {
  PersonSearchContactFilter,
  PersonSearchPersonType,
} from "@/features/people/person-search";

export type PersonSearchFilters = {
  q: string;
  person_type: PersonSearchPersonType;
  status: string;
  contact: PersonSearchContactFilter;
  page: number;
  per_page: number;
};

export type PersonSearchUiState =
  | "loading_people_search"
  | "people_search_ready"
  | "people_search_loaded"
  | "empty_people_search"
  | "validation_error"
  | "denied_or_session_invalid"
  | "server_error";

export const DEFAULT_PERSON_SEARCH_FILTERS: PersonSearchFilters = {
  q: "",
  person_type: "all",
  status: "all",
  contact: "all",
  page: 1,
  per_page: 15,
};

export const PERSON_SEARCH_TYPE_OPTIONS: Array<{
  value: PersonSearchPersonType;
  label: string;
}> = [
  { value: "all", label: "Membros e visitantes" },
  { value: "member", label: "Membros" },
  { value: "visitor", label: "Visitantes" },
];

export const PERSON_SEARCH_STATUS_OPTIONS: Array<{
  value: string;
  label: string;
}> = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativo" },
  { value: "needs_update", label: "Precisa de atualizacao" },
  { value: "inactive", label: "Inativo" },
  { value: "new", label: "Novo" },
  { value: "follow_up_needed", label: "Precisa de acompanhamento" },
  { value: "contacted", label: "Contatado" },
  { value: "new,follow_up_needed", label: "Novos ou para acompanhamento" },
];

export const PERSON_SEARCH_CONTACT_OPTIONS: Array<{
  value: PersonSearchContactFilter;
  label: string;
}> = [
  { value: "all", label: "Todos" },
  { value: "with_contact", label: "Com contato" },
  { value: "missing_contact", label: "Contato pendente" },
  { value: "phone_only", label: "Somente telefone" },
  { value: "email_only", label: "Somente Email" },
];

const PERSON_TYPES = ["all", "member", "visitor"] as const;
const CONTACT_FILTERS = ["all", "with_contact", "missing_contact", "phone_only", "email_only"] as const;
const CONCRETE_STATUSES = [
  "active",
  "needs_update",
  "inactive",
  "new",
  "follow_up_needed",
  "contacted",
] as const;

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value || !/^[1-9]\d*$/.test(value)) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) ? parsed : fallback;
}

function parsePersonType(value: string | null): PersonSearchPersonType {
  return PERSON_TYPES.includes(value as PersonSearchPersonType)
    ? value as PersonSearchPersonType
    : DEFAULT_PERSON_SEARCH_FILTERS.person_type;
}

function parseContact(value: string | null): PersonSearchContactFilter {
  return CONTACT_FILTERS.includes(value as PersonSearchContactFilter)
    ? value as PersonSearchContactFilter
    : DEFAULT_PERSON_SEARCH_FILTERS.contact;
}

function parseStatus(value: string | null): string {
  if (!value || value === "all") {
    return "all";
  }

  if (value.includes(" ")) {
    return "all";
  }

  const statuses = value.split(",");

  if (
    statuses.length === 0
    || statuses.includes("")
    || statuses.includes("all")
    || statuses.some((status) => !CONCRETE_STATUSES.includes(status as (typeof CONCRETE_STATUSES)[number]))
  ) {
    return "all";
  }

  return Array.from(new Set(statuses)).join(",");
}

export function parsePersonSearchFilters(searchParams: URLSearchParams): PersonSearchFilters {
  return {
    q: (searchParams.get("q") ?? "").trim(),
    person_type: parsePersonType(searchParams.get("person_type")),
    status: parseStatus(searchParams.get("status")),
    contact: parseContact(searchParams.get("contact")),
    page: parsePositiveInteger(searchParams.get("page"), DEFAULT_PERSON_SEARCH_FILTERS.page),
    per_page: Math.min(
      parsePositiveInteger(searchParams.get("per_page"), DEFAULT_PERSON_SEARCH_FILTERS.per_page),
      50,
    ),
  };
}

export function buildPersonSearchQuery(filters: PersonSearchFilters): URLSearchParams {
  const searchParams = new URLSearchParams();
  const q = filters.q.trim();

  if (q !== "") {
    searchParams.set("q", q);
  }

  searchParams.set("person_type", filters.person_type);
  searchParams.set("status", filters.status);
  searchParams.set("contact", filters.contact);

  if (filters.page !== DEFAULT_PERSON_SEARCH_FILTERS.page) {
    searchParams.set("page", String(filters.page));
  }

  if (filters.per_page !== DEFAULT_PERSON_SEARCH_FILTERS.per_page) {
    searchParams.set("per_page", String(filters.per_page));
  }

  return searchParams;
}

export function validatePersonSearchFilters(filters: PersonSearchFilters): Record<string, string> {
  if (filters.q.trim().length > 80) {
    return {
      q: "Use ate 80 caracteres para a busca.",
    };
  }

  return {};
}

export function shouldKeepPersonSearchCriteria(status: number): boolean {
  return status === 422;
}
