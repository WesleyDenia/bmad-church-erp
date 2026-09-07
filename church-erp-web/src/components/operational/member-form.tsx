"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Surface } from "@/components/design-system/surface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type {
  Member,
  MemberErrorResponse,
  MemberFieldErrors,
  MemberPayload,
  MemberResponse,
  MemberStatus,
} from "@/features/people/member";
import {
  MEMBER_FORM_STATUS_OPTIONS,
  extractMemberValidationErrors,
  readMember,
} from "@/features/people/member";
import {
  personResolutionReturnLabel,
  sanitizePersonResolutionReturn,
} from "@/features/people/person-resolution-return";

type MemberFormState =
  | "loading_member_form"
  | "creating_ready"
  | "editing_loaded"
  | "saving_member"
  | "member_saved"
  | "validation_error"
  | "denied_or_session_invalid"
  | "not_found"
  | "server_error";

type MemberFormValues = {
  display_name: string;
  status: MemberStatus;
  phone: string;
  email: string;
};

type MemberFormProps =
  | {
      mode: "create";
      memberId?: never;
      returnHref?: string;
    }
  | {
      mode: "edit";
      memberId: string;
      returnHref?: string;
    };

const EMPTY_VALUES: MemberFormValues = {
  display_name: "",
  status: "active",
  phone: "",
  email: "",
};

function valuesFromMember(member: Member): MemberFormValues {
  return {
    display_name: member.display_name,
    status: member.status,
    phone: member.phone ?? "",
    email: member.email ?? "",
  };
}

function extractMessage(body: MemberResponse | MemberErrorResponse): string {
  return "message" in body && typeof body.message === "string"
    ? body.message
    : "Nao foi possivel concluir agora.";
}

function firstErrorField(errors: MemberFieldErrors): keyof MemberPayload | null {
  for (const field of ["display_name", "status", "phone", "email"] as const) {
    if (errors[field]) {
      return field;
    }
  }

  return null;
}

export function MemberForm({ mode, memberId, returnHref }: MemberFormProps) {
  const [state, setState] = useState<MemberFormState>(
    mode === "create" ? "creating_ready" : "loading_member_form",
  );
  const [values, setValues] = useState<MemberFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<MemberFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [savedMember, setSavedMember] = useState<Member | null>(null);
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
    ? "/api/secretary/members"
    : `/api/secretary/members/${memberId}`;

  const clearPii = useCallback(() => {
    setValues(EMPTY_VALUES);
    setSavedMember(null);
  }, []);

  const loadMember = useCallback(async (signal?: AbortSignal): Promise<void> => {
    if (mode !== "edit") {
      return;
    }

    setState("loading_member_form");
    setMessage(null);
    setErrors({});

    try {
      const response = await fetch(`/api/secretary/members/${memberId}`, {
        method: "GET",
        cache: "no-store",
        signal,
      });
      const body = (await response.json()) as MemberResponse | MemberErrorResponse;

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

      const member = readMember(body);

      if (!member) {
        clearPii();
        setState("server_error");
        setMessage("Nao foi possivel carregar o membro agora.");
        return;
      }

      setValues(valuesFromMember(member));
      setSavedMember(member);
      setState("editing_loaded");
    } catch {
      if (signal?.aborted) {
        return;
      }

      clearPii();
      setState("server_error");
      setMessage("Nao foi possivel carregar o membro agora.");
    }
  }, [clearPii, memberId, mode]);

  useEffect(() => {
    if (mode === "edit") {
      const controller = new AbortController();

      queueMicrotask(() => {
        void loadMember(controller.signal);
      });

      return () => {
        controller.abort();
      };
    }

    return undefined;
  }, [loadMember, mode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setState("saving_member");
    setMessage(null);
    setErrors({});
    setSavedMember(null);

    const payload: MemberPayload = {
      display_name: values.display_name,
      status: values.status,
      phone: values.phone,
      email: values.email,
    };

    try {
      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as MemberResponse | MemberErrorResponse;

      if (!response.ok) {
        if (response.status === 422) {
          const nextErrors = extractMemberValidationErrors(body);

          setErrors(nextErrors);
          setState("validation_error");
          setMessage(extractMessage(body));

          const errorField = firstErrorField(nextErrors);

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

      const member = readMember(body);

      if (member) {
        setSavedMember(member);
        setValues(valuesFromMember(member));
      }

      setState("member_saved");
      setMessage(extractMessage(body));
    } catch {
      setState("server_error");
      setMessage("Nao foi possivel salvar o membro agora.");
    }
  }

  const isBusy = state === "loading_member_form" || state === "saving_member";
  const canShowForm = !["denied_or_session_invalid", "not_found"].includes(state);
  const safeReturnHref = sanitizePersonResolutionReturn(returnHref);
  const returnToPendingLabel = personResolutionReturnLabel(safeReturnHref);
  const showPendingReturn = mode === "edit"
    && state === "member_saved"
    && safeReturnHref.startsWith("/secretaria/pessoas");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-10 sm:px-10 lg:px-12">
      <Surface className="rounded-md p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-accent)]">
              Secretaria
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)] sm:text-3xl">
              {mode === "create" ? "Cadastrar membro" : "Editar membro"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--color-muted)]" aria-live="polite">
              {state === "loading_member_form" && "Carregando cadastro do membro."}
              {state === "creating_ready" && "Preencha os dados essenciais para manter a base da igreja atualizada."}
              {state === "editing_loaded" && "Atualize somente os dados essenciais deste membro."}
              {state === "saving_member" && "Salvando membro."}
              {state === "member_saved" && (message ?? "Membro salvo com sucesso.")}
              {state === "validation_error" && (message ?? "Revise os campos do membro.")}
              {state === "denied_or_session_invalid" && (message ?? "Sessao invalida ou perfil sem acesso.")}
              {state === "not_found" && (message ?? "Membro nao encontrado.")}
              {state === "server_error" && (message ?? "Falha tecnica ao salvar o membro.")}
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/secretaria">Voltar</Link>
          </Button>
        </div>

        {canShowForm ? (
          <form className="mt-8 grid gap-5" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-2">
              <Label htmlFor="display_name">Nome do membro</Label>
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
                  status: event.target.value as MemberStatus,
                }))}
              >
                {MEMBER_FORM_STATUS_OPTIONS.map((option) => (
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
                {state === "saving_member" ? "Salvando" : "Salvar membro"}
              </Button>
              {mode === "create" && state === "member_saved" ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setValues(EMPTY_VALUES);
                    setSavedMember(null);
                    setState("creating_ready");
                    setMessage(null);
                    setErrors({});
                    queueMicrotask(() => displayNameRef.current?.focus());
                  }}
                >
                  Cadastrar outro membro
                </Button>
              ) : null}
              {mode === "edit" && state === "member_saved" && showPendingReturn ? (
                <Button asChild variant="secondary">
                  <Link href={safeReturnHref}>{returnToPendingLabel}</Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost">
                <Link href="/secretaria">Voltar para secretaria</Link>
              </Button>
            </div>

            {savedMember ? (
              <p className="text-sm text-[color:var(--color-muted)]">
                Cadastro salvo para {savedMember.display_name}.
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
