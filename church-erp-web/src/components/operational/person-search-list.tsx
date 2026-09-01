"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { Surface } from "@/components/design-system/surface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  extractPersonSearchValidationErrors,
  normalizePersonSearchResponse,
  type PersonSearchErrorResponse,
  type PersonSearchItem,
} from "@/features/people/person-search";
import {
  DEFAULT_PERSON_SEARCH_FILTERS,
  PERSON_SEARCH_CONTACT_OPTIONS,
  PERSON_SEARCH_STATUS_OPTIONS,
  PERSON_SEARCH_TYPE_OPTIONS,
  buildPersonSearchQuery,
  parsePersonSearchFilters,
  shouldKeepPersonSearchCriteria,
  validatePersonSearchFilters,
  type PersonSearchFilters,
  type PersonSearchUiState,
} from "@/features/people/person-search-state";

type PersonSearchListProps = {
  initialFilters?: PersonSearchFilters;
};

type LoadedResult = {
  items: PersonSearchItem[];
  currentPage: number;
  lastPage: number;
  total: number;
};

function normalizeLoadedResult(value: unknown): LoadedResult | null {
  const response = normalizePersonSearchResponse(value);

  if (!response) {
    return null;
  }

  return {
    items: response.data,
    currentPage: typeof response.meta.current_page === "number" ? response.meta.current_page : 1,
    lastPage: typeof response.meta.last_page === "number" ? response.meta.last_page : 1,
    total: typeof response.meta.total === "number" ? response.meta.total : response.data.length,
  };
}

function messageFromBody(body: PersonSearchErrorResponse | unknown, fallback: string): string {
  return body && typeof body === "object" && !Array.isArray(body) && typeof (body as Record<string, unknown>).message === "string"
    ? (body as Record<string, string>).message
    : fallback;
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-2 text-sm text-[#9f1239]">
      {message}
    </p>
  );
}

function ResultsList({ items }: { items: PersonSearchItem[] }) {
  return (
    <ul className="divide-y divide-[color:var(--color-border)]">
      {items.map((person) => (
        <li key={`${person.person_type}-${person.id}`} className="grid gap-4 py-4 md:grid-cols-[1fr_11rem_11rem_10rem] md:items-center">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-[color:var(--color-foreground)]">
              {person.display_name}
            </p>
            <p className="mt-1 text-sm text-[color:var(--color-muted)]">
              {person.contact_summary}
            </p>
          </div>
          <span
            aria-label={`Tipo: ${person.person_type === "member" ? "Membro" : "Visitante"}`}
            className="w-fit rounded-md border border-[color:var(--color-border)] px-3 py-1 text-sm font-semibold text-[color:var(--color-foreground)]"
          >
            {person.person_type_label}
          </span>
          <span className="text-sm font-medium text-[color:var(--color-foreground)]">
            {person.status_label}
          </span>
          <Button asChild variant="secondary" size="sm">
            <Link href={person.primary_action_href}>{person.primary_action_label}</Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function PersonSearchList({
  initialFilters = DEFAULT_PERSON_SEARCH_FILTERS,
}: PersonSearchListProps) {
  const currentSearch = useSearchParams();
  const serializedCurrentSearch = currentSearch.toString();
  const filters = useMemo(
    () => parsePersonSearchFilters(new URLSearchParams(serializedCurrentSearch)),
    [serializedCurrentSearch],
  );

  return (
    <PersonSearchContent
      key={serializedCurrentSearch || "default-search"}
      filters={serializedCurrentSearch === "" ? initialFilters : filters}
      rawQueryString={serializedCurrentSearch}
    />
  );
}

function PersonSearchContent({
  filters,
  rawQueryString,
}: {
  filters: PersonSearchFilters;
  rawQueryString: string;
}) {
  const router = useRouter();
  const [draftFilters, setDraftFilters] = useState<PersonSearchFilters>(filters);
  const [state, setState] = useState<PersonSearchUiState>("people_search_ready");
  const [result, setResult] = useState<LoadedResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const localErrors = validatePersonSearchFilters(filters);

    if (Object.keys(localErrors).length > 0) {
      const guard = { cancelled: false };

      queueMicrotask(() => {
        if (guard.cancelled) {
          return;
        }

        setState("validation_error");
        setFieldErrors(localErrors);
        setMessage("Revise os filtros de pessoas e tente novamente.");
      });

      return () => {
        guard.cancelled = true;
      };
    }

    const controller = new AbortController();
    const query = rawQueryString !== "" ? rawQueryString : buildPersonSearchQuery(filters).toString();
    const querySuffix = query === "" ? "" : `?${query}`;

    queueMicrotask(() => {
      if (controller.signal.aborted) {
        return;
      }

      setState("loading_people_search");
      setFieldErrors({});
      setMessage(null);
    });

    void fetch("/api/secretary/people" + querySuffix, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setResult(null);
            setState("denied_or_session_invalid");
            setMessage(messageFromBody(body, "Sessao invalida ou perfil sem acesso."));
            return;
          }

          if (response.status === 422) {
            setState("validation_error");
            setFieldErrors(extractPersonSearchValidationErrors(body));
            setMessage(messageFromBody(body, "Revise os filtros de pessoas e tente novamente."));
            return;
          }

          if (!shouldKeepPersonSearchCriteria(response.status)) {
            setResult(null);
          }

          setState("server_error");
          setMessage(messageFromBody(body, "Nao foi possivel carregar as pessoas agora."));
          return;
        }

        const nextResult = normalizeLoadedResult(body);

        if (!nextResult) {
          setResult(null);
          setState("server_error");
          setMessage("Nao foi possivel carregar as pessoas agora.");
          return;
        }

        setResult(nextResult);
        setState(nextResult.items.length === 0 ? "empty_people_search" : "people_search_loaded");
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }

        setResult(null);
        setState("server_error");
        setMessage("Nao foi possivel carregar as pessoas agora.");
      });

    return () => {
      controller.abort();
    };
  }, [filters, rawQueryString]);

  const totalLabel = useMemo(() => {
    if (!result) {
      return "Nenhum resultado carregado";
    }

    return `${result.total} pessoa${result.total === 1 ? "" : "s"} encontrada${result.total === 1 ? "" : "s"}`;
  }, [result]);

  function updateDraft(field: keyof PersonSearchFilters, value: string | number): void {
    setDraftFilters((current) => ({
      ...current,
      [field]: value,
      page: field === "page" ? Number(value) : 1,
    }));
  }

  function submitFilters(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const query = buildPersonSearchQuery(draftFilters).toString();

    router.replace(query === "" ? "/secretaria/pessoas" : `/secretaria/pessoas?${query}`);
  }

  function clearFilters(): void {
    setDraftFilters(DEFAULT_PERSON_SEARCH_FILTERS);
    router.replace("/secretaria/pessoas?person_type=all&status=all&contact=all");
  }

  function goToPage(page: number): void {
    const nextFilters = {
      ...filters,
      page,
    };
    const query = buildPersonSearchQuery(nextFilters).toString();

    router.replace(query === "" ? "/secretaria/pessoas" : `/secretaria/pessoas?${query}`);
  }

  const isLoading = state === "loading_people_search";
  const canGoPrevious = !!result && result.currentPage > 1 && !isLoading;
  const canGoNext = !!result && result.currentPage < result.lastPage && !isLoading;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-10 lg:px-12">
      <section className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-accent)]">
          Secretaria
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[color:var(--color-foreground)] sm:text-4xl">
          Pessoas
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--color-muted)]" aria-live="polite">
          {state === "people_search_ready"
            ? "Informe os filtros para localizar membros e visitantes."
            : state === "denied_or_session_invalid"
              ? message ?? "Sessao invalida ou perfil sem acesso."
              : state === "server_error"
                ? message ?? "Nao foi possivel carregar as pessoas agora."
                : totalLabel}
        </p>
      </section>

      <Surface className="p-5 sm:p-6">
        <form className="grid gap-4 lg:grid-cols-[1.2fr_0.75fr_0.9fr_0.75fr_auto]" onSubmit={submitFilters}>
          <div>
            <Label htmlFor="person-search-q">Nome</Label>
            <Input
              id="person-search-q"
              value={draftFilters.q}
              maxLength={80}
              onChange={(event: ChangeEvent<HTMLInputElement>) => updateDraft("q", event.target.value)}
              placeholder="Buscar por nome"
            />
            <FieldError message={fieldErrors.q} />
          </div>
          <div>
            <Label htmlFor="person-search-type">Tipo</Label>
            <Select
              id="person-search-type"
              value={draftFilters.person_type}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => updateDraft("person_type", event.target.value)}
            >
              {PERSON_SEARCH_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
            <FieldError message={fieldErrors.person_type} />
          </div>
          <div>
            <Label htmlFor="person-search-status">Situacao</Label>
            <Select
              id="person-search-status"
              value={draftFilters.status}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => updateDraft("status", event.target.value)}
            >
              {PERSON_SEARCH_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
            <FieldError message={fieldErrors.status} />
          </div>
          <div>
            <Label htmlFor="person-search-contact">Contato</Label>
            <Select
              id="person-search-contact"
              value={draftFilters.contact}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => updateDraft("contact", event.target.value)}
            >
              {PERSON_SEARCH_CONTACT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
            <FieldError message={fieldErrors.contact} />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={isLoading}>
              Buscar
            </Button>
            <Button type="button" variant="secondary" onClick={clearFilters} disabled={isLoading}>
              Limpar
            </Button>
          </div>
        </form>
      </Surface>

      <Surface className="mt-6 p-5 sm:p-6">
        {isLoading ? (
          <div className="grid gap-3" aria-live="polite">
            {["linha-1", "linha-2", "linha-3"].map((item) => (
              <div key={item} className="h-16 rounded-md border border-[color:var(--color-border)] bg-[#f8fafc]" />
            ))}
          </div>
        ) : state === "validation_error" ? (
          <div className="rounded-md border border-[#fecdd3] bg-[#fff1f2] p-4">
            <p className="text-sm font-semibold text-[#9f1239]">
              {message ?? "Revise os filtros de pessoas e tente novamente."}
            </p>
          </div>
        ) : state === "denied_or_session_invalid" ? (
          <div className="rounded-md border border-[#fed7aa] bg-[#fff7ed] p-4">
            <p className="text-sm font-semibold text-[#9a3412]">
              {message ?? "Sessao invalida ou perfil sem acesso."}
            </p>
          </div>
        ) : state === "server_error" ? (
          <div className="rounded-md border border-[#fed7aa] bg-[#fff7ed] p-4">
            <p className="text-sm font-semibold text-[#9a3412]">
              {message ?? "Nao foi possivel carregar as pessoas agora."}
            </p>
          </div>
        ) : state === "empty_people_search" ? (
          <div className="rounded-md border border-dashed border-[color:var(--color-border)] p-5">
            <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
              Nenhuma pessoa encontrada.
            </p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--color-muted)]">
              Ajuste os filtros ou limpe a busca para tentar novamente.
            </p>
          </div>
        ) : result ? (
          <>
            <ResultsList items={result.items} />
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[color:var(--color-muted)]">
                Pagina {result.currentPage} de {result.lastPage}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!canGoPrevious}
                  onClick={() => goToPage(Math.max(1, result.currentPage - 1))}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!canGoNext}
                  onClick={() => goToPage(result.currentPage + 1)}
                >
                  Proxima
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-md border border-dashed border-[color:var(--color-border)] p-5">
            <p className="text-sm text-[color:var(--color-muted)]">
              Use os filtros acima para carregar a lista de pessoas.
            </p>
          </div>
        )}
      </Surface>
    </main>
  );
}
