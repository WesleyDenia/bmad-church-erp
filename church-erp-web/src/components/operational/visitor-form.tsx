"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Surface } from "@/components/design-system/surface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type {
  Visitor,
  VisitorErrorResponse,
  VisitorFieldErrors,
  VisitorResponse,
  VisitorStatus,
} from "@/features/people/visitor";
import {
  VISITOR_FORM_STATUS_OPTIONS,
  extractVisitorValidationErrors,
  readVisitor,
} from "@/features/people/visitor";
import type {
  VisitorFormState,
  VisitorFormValues,
} from "@/features/people/visitor-form-state";
import {
  EMPTY_VISITOR_FORM_VALUES,
  buildVisitorPayload,
  firstVisitorErrorField,
  shouldRenderVisitorForm,
  visitorValuesFromVisitor,
} from "@/features/people/visitor-form-state";

type VisitorFormProps =
  | {
      mode: "create";
      visitorId?: never;
    }
  | {
      mode: "edit";
      visitorId: string;
    };

function extractMessage(body: VisitorResponse | VisitorErrorResponse): string {
  return "message" in body && typeof body.message === "string"
    ? body.message
    : "Nao foi possivel concluir agora.";
}

export function VisitorForm({ mode, visitorId }: VisitorFormProps) {
  const [state, setState] = useState<VisitorFormState>(
    mode === "create" ? "creating_ready" : "loading_visitor_form",
  );
  const [values, setValues] = useState<VisitorFormValues>(EMPTY_VISITOR_FORM_VALUES);
  const [errors, setErrors] = useState<VisitorFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [savedVisitor, setSavedVisitor] = useState<Visitor | null>(null);
  const [hasLoadedInitialVisitor, setHasLoadedInitialVisitor] = useState(mode === "create");
  const displayNameRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLSelectElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const fieldRefs = useMemo(() => ({
    display_name: displayNameRef,
    status: statusRef,
    phone: phoneRef,
    email: emailRef,
  }), []);

  const endpoint = mode === "create"
    ? "/api/secretary/visitors"
    : `/api/secretary/visitors/${visitorId}`;

  const clearPii = useCallback(() => {
    setValues(EMPTY_VISITOR_FORM_VALUES);
    setSavedVisitor(null);
    setHasLoadedInitialVisitor(false);
  }, []);

  const loadVisitor = useCallback(async (signal?: AbortSignal): Promise<void> => {
    if (mode !== "edit") {
      return;
    }

    setState("loading_visitor_form");
    setMessage(null);
    setErrors({});
    setValues(EMPTY_VISITOR_FORM_VALUES);
    setSavedVisitor(null);
    setHasLoadedInitialVisitor(false);

    try {
      const response = await fetch(`/api/secretary/visitors/${visitorId}`, {
        method: "GET",
        cache: "no-store",
        signal,
      });
      const body = (await response.json()) as VisitorResponse | VisitorErrorResponse;

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          clearPii();
          setState("denied_or_session_invalid");
          setMessage(extractMessage(body));
          return;
        }

        if (response.status === 404) {
          clearPii();
          setState("not_found");
          setMessage(extractMessage(body));
          return;
        }

        clearPii();
        setState("server_error");
        setMessage(extractMessage(body));
        return;
      }

      const visitor = readVisitor(body);

      if (!visitor) {
        clearPii();
        setState("server_error");
        setMessage("Nao foi possivel carregar o visitante agora.");
        return;
      }

      setValues(visitorValuesFromVisitor(visitor));
      setSavedVisitor(visitor);
      setHasLoadedInitialVisitor(true);
      setState("editing_loaded");
    } catch {
      if (signal?.aborted) {
        return;
      }

      clearPii();
      setState("server_error");
      setMessage("Nao foi possivel carregar o visitante agora.");
    }
  }, [clearPii, mode, visitorId]);

  useEffect(() => {
    if (mode === "edit") {
      const controller = new AbortController();

      queueMicrotask(() => {
        void loadVisitor(controller.signal);
      });

      return () => {
        controller.abort();
      };
    }

    return undefined;
  }, [loadVisitor, mode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setState("saving_visitor");
    setMessage(null);
    setErrors({});
    setSavedVisitor(null);

    const payload = buildVisitorPayload(values);

    try {
      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as VisitorResponse | VisitorErrorResponse;

      if (!response.ok) {
        if (response.status === 422) {
          const nextErrors = extractVisitorValidationErrors(body);

          setErrors(nextErrors);
          setState("validation_error");
          setMessage(extractMessage(body));

          const errorField = firstVisitorErrorField(nextErrors);

          if (errorField) {
            queueMicrotask(() => fieldRefs[errorField].current?.focus());
          }

          return;
        }

        if (response.status === 401 || response.status === 403) {
          clearPii();
          setState("denied_or_session_invalid");
          setMessage(extractMessage(body));
          return;
        }

        if (response.status === 404) {
          clearPii();
          setState("not_found");
          setMessage(extractMessage(body));
          return;
        }

        setState("server_error");
        setMessage(extractMessage(body));
        return;
      }

      const visitor = readVisitor(body);

      if (visitor) {
        setSavedVisitor(visitor);
        setValues(visitorValuesFromVisitor(visitor));
      }

      setState("visitor_saved");
      setMessage(extractMessage(body));
    } catch {
      setState("server_error");
      setMessage("Nao foi possivel salvar o visitante agora.");
    }
  }

  const isBusy = state === "loading_visitor_form" || state === "saving_visitor";
  const canShowForm = shouldRenderVisitorForm(mode, state, hasLoadedInitialVisitor);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-10 sm:px-10 lg:px-12">
      <Surface className="rounded-md p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-accent)]">
              Secretaria
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)] sm:text-3xl">
              {mode === "create" ? "Cadastrar visitante" : "Editar visitante"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--color-muted)]" aria-live="polite">
              {state === "loading_visitor_form" && "Carregando cadastro do visitante."}
              {state === "creating_ready" && "Preencha os dados essenciais para acompanhar este visitante."}
              {state === "editing_loaded" && "Atualize somente os dados essenciais deste visitante."}
              {state === "saving_visitor" && "Salvando visitante."}
              {state === "visitor_saved" && (message ?? "Visitante salvo com sucesso.")}
              {state === "validation_error" && (message ?? "Revise os campos do visitante.")}
              {state === "denied_or_session_invalid" && (message ?? "Sessao invalida ou perfil sem acesso.")}
              {state === "not_found" && (message ?? "Visitante nao encontrado.")}
              {state === "server_error" && (message ?? "Falha tecnica ao salvar o visitante.")}
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/secretaria">Voltar</Link>
          </Button>
        </div>

        {canShowForm ? (
          <form className="mt-8 grid gap-5" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-2">
              <Label htmlFor="display_name">Nome do visitante</Label>
              <Input
                ref={displayNameRef}
                id="display_name"
                name="display_name"
                value={values.display_name}
                maxLength={160}
                disabled={isBusy}
                aria-invalid={Boolean(errors.display_name)}
                aria-describedby={errors.display_name ? "display_name-error" : undefined}
                onChange={(event) => setValues((current) => ({
                  ...current,
                  display_name: event.target.value,
                }))}
              />
              {errors.display_name ? (
                <p id="display_name-error" className="text-sm text-red-700">
                  {errors.display_name}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Situacao</Label>
              <Select
                ref={statusRef}
                id="status"
                name="status"
                value={values.status}
                disabled={isBusy}
                aria-invalid={Boolean(errors.status)}
                aria-describedby={errors.status ? "status-error" : undefined}
                onChange={(event) => setValues((current) => ({
                  ...current,
                  status: event.target.value as VisitorStatus,
                }))}
              >
                {VISITOR_FORM_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {errors.status ? (
                <p id="status-error" className="text-sm text-red-700">
                  {errors.status}
                </p>
              ) : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  ref={phoneRef}
                  id="phone"
                  name="phone"
                  value={values.phone}
                  maxLength={40}
                  disabled={isBusy}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                  onChange={(event) => setValues((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))}
                />
                {errors.phone ? (
                  <p id="phone-error" className="text-sm text-red-700">
                    {errors.phone}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  value={values.email}
                  maxLength={160}
                  disabled={isBusy}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  onChange={(event) => setValues((current) => ({
                    ...current,
                    email: event.target.value,
                  }))}
                />
                {errors.email ? (
                  <p id="email-error" className="text-sm text-red-700">
                    {errors.email}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[color:var(--color-border)] pt-5 sm:flex-row sm:items-center">
              <Button type="submit" disabled={isBusy}>
                {state === "saving_visitor" ? "Salvando" : "Salvar visitante"}
              </Button>
              {mode === "create" && state === "visitor_saved" ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setValues(EMPTY_VISITOR_FORM_VALUES);
                    setSavedVisitor(null);
                    setState("creating_ready");
                    setMessage(null);
                    setErrors({});
                    queueMicrotask(() => displayNameRef.current?.focus());
                  }}
                >
                  Cadastrar outro visitante
                </Button>
              ) : null}
              <Button asChild variant="ghost">
                <Link href="/secretaria">Voltar para secretaria</Link>
              </Button>
            </div>

            {savedVisitor ? (
              <p className="text-sm text-[color:var(--color-muted)]">
                Cadastro salvo para {savedVisitor.display_name}.
              </p>
            ) : null}
          </form>
        ) : (
          <div className="mt-8 rounded-md border border-[color:var(--color-border)] bg-[#f7f4ed] p-5">
            <p className="text-sm leading-7 text-[color:var(--color-muted)]">
              {message ?? "Nao foi possivel exibir este cadastro."}
            </p>
          </div>
        )}
      </Surface>
    </main>
  );
}
