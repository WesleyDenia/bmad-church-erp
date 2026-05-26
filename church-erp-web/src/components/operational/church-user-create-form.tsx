"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type {
  CreateChurchUserErrorResponse,
  CreateChurchUserPayload,
  CreateChurchUserResponse,
  ChurchUserRole,
} from "@/features/church-users/contracts";

type FormStatus =
  | "ready"
  | "saving"
  | "session_invalid"
  | "validation_error"
  | "duplicate_same_tenant"
  | "cross_tenant_blocked"
  | "success_created"
  | "denied"
  | "server_error";

type FieldErrors = Partial<Record<keyof CreateChurchUserPayload | "payload", string[]>>;

const initialErrors: FieldErrors = {};

const roleOptions: Array<{ label: string; value: ChurchUserRole }> = [
  { label: "Tesouraria", value: "treasurer" },
  { label: "Secretaria", value: "secretary" },
  { label: "Lideranca", value: "leadership" },
];

function classifyStatus(status: number, message: string): FormStatus {
  if (status === 401) {
    return "session_invalid";
  }

  if (status === 403) {
    return "denied";
  }

  if (status === 422) {
    if (message.includes("ja esta associado")) {
      return "duplicate_same_tenant";
    }

    if (message.includes("outra igreja")) {
      return "cross_tenant_blocked";
    }

    return "validation_error";
  }

  return "server_error";
}

export function ChurchUserCreateForm() {
  const [status, setStatus] = useState<FormStatus>("ready");
  const [payload, setPayload] = useState<CreateChurchUserPayload>({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    role: "treasurer",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(initialErrors);
  const [feedback, setFeedback] = useState<string | null>(null);

  function updateField<K extends keyof CreateChurchUserPayload>(
    field: K,
    value: CreateChurchUserPayload[K],
  ) {
    setPayload((current) => ({
      ...current,
      [field]: value,
    }));
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
      payload: undefined,
    }));
    if (feedback) {
      setFeedback(null);
    }
    if (status !== "saving") {
      setStatus("ready");
    }
  }

  function resetForm() {
    setPayload({
      name: "",
      email: "",
      password: "",
      password_confirmation: "",
      role: "treasurer",
    });
    setFieldErrors(initialErrors);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus("saving");
    setFieldErrors(initialErrors);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          name: payload.name.trim(),
          email: payload.email.trim().toLowerCase(),
        }),
      });

      const body = (await response.json()) as
        | CreateChurchUserResponse
        | CreateChurchUserErrorResponse;

      if (!response.ok) {
        const errorBody = body as CreateChurchUserErrorResponse;

        setFieldErrors((errorBody.errors ?? {}) as FieldErrors);
        setFeedback(errorBody.message);
        setStatus(classifyStatus(response.status, errorBody.message));
        return;
      }

      const successBody = body as CreateChurchUserResponse;

      setFeedback(successBody.data.message);
      setStatus("success_created");
      resetForm();
    } catch {
      setFeedback("Nao foi possivel cadastrar o usuario agora. Tente novamente.");
      setStatus("server_error");
    }
  }

  const isSaving = status === "saving";

  return (
    <section className="rounded-[2rem] border border-[color:var(--color-border)] bg-white/90 p-8 shadow-[0_20px_60px_rgba(30,41,59,0.08)]">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-accent)]">
          Administracao de usuarios
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[color:var(--color-foreground)]">
          Cadastrar acesso operacional da igreja
        </h1>
        <p className="mt-4 text-base leading-8 text-[color:var(--color-muted)]">
          Informe apenas os dados minimos para liberar a pessoa certa no papel
          certo desde o primeiro acesso.
        </p>
      </div>

      {feedback ? (
        <div
          className={`mt-6 rounded-[1.5rem] px-4 py-3 text-sm ${
            status === "success_created"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-[rgba(153,27,27,0.18)] bg-red-50 text-red-800"
          }`}
        >
          {feedback}
        </div>
      ) : null}

      <form className="mt-8 grid gap-6 md:grid-cols-2" onSubmit={handleSubmit}>
        <div className="md:col-span-2">
          <Label htmlFor="church-user-name">Nome</Label>
          <Input
            id="church-user-name"
            name="name"
            value={payload.name}
            onChange={(event) => updateField("name", event.target.value)}
            disabled={isSaving}
            placeholder="Ex.: Carlos Pereira"
          />
          {fieldErrors.name?.length ? (
            <p className="mt-2 text-sm font-medium text-red-700">{fieldErrors.name[0]}</p>
          ) : (
            <p className="mt-2 text-xs text-[color:var(--color-muted)]">
              Use o nome como a pessoa deve ver na sessao dela.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="church-user-email">Email</Label>
          <Input
            id="church-user-email"
            name="email"
            type="email"
            value={payload.email}
            onChange={(event) => updateField("email", event.target.value)}
            disabled={isSaving}
            placeholder="usuario@igreja.org"
          />
          {fieldErrors.email?.length ? (
            <p className="mt-2 text-sm font-medium text-red-700">{fieldErrors.email[0]}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="church-user-role">Perfil basico</Label>
          <Select
            id="church-user-role"
            name="role"
            value={payload.role}
            onChange={(event) =>
              updateField("role", event.target.value as ChurchUserRole)
            }
            disabled={isSaving}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          {fieldErrors.role?.length ? (
            <p className="mt-2 text-sm font-medium text-red-700">{fieldErrors.role[0]}</p>
          ) : (
            <p className="mt-2 text-xs text-[color:var(--color-muted)]">
              Perfis liberados neste MVP: tesouraria, secretaria e lideranca.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="church-user-password">Senha inicial</Label>
          <Input
            id="church-user-password"
            name="password"
            type="password"
            value={payload.password}
            onChange={(event) => updateField("password", event.target.value)}
            disabled={isSaving}
            placeholder="Minimo de 8 caracteres"
          />
          {fieldErrors.password?.length ? (
            <p className="mt-2 text-sm font-medium text-red-700">
              {fieldErrors.password[0]}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="church-user-password-confirmation">Confirmar senha</Label>
          <Input
            id="church-user-password-confirmation"
            name="password_confirmation"
            type="password"
            value={payload.password_confirmation}
            onChange={(event) =>
              updateField("password_confirmation", event.target.value)
            }
            disabled={isSaving}
            placeholder="Repita a senha"
          />
          {fieldErrors.password_confirmation?.length ? (
            <p className="mt-2 text-sm font-medium text-red-700">
              {fieldErrors.password_confirmation[0]}
            </p>
          ) : null}
        </div>

        {fieldErrors.payload?.length ? (
          <div className="md:col-span-2 rounded-[1.25rem] border border-[rgba(153,27,27,0.18)] bg-red-50 px-4 py-3 text-sm text-red-800">
            {fieldErrors.payload[0]}
          </div>
        ) : null}

        <div className="md:col-span-2 flex flex-wrap gap-3">
          <Button type="submit" className="rounded-[1.25rem]" disabled={isSaving}>
            {isSaving ? "Salvando..." : "Cadastrar usuario"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="rounded-[1.25rem]"
            disabled={isSaving}
            onClick={resetForm}
          >
            Limpar campos
          </Button>
        </div>
      </form>
    </section>
  );
}
