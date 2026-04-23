"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type {
  InitialSetupErrorResponse,
  InitialSetupErrors,
  InitialSetupPayload,
  InitialSetupSuccess,
} from "@/features/auth/initial-setup";

const initialForm: InitialSetupPayload = {
  church_name: "",
  admin_name: "",
  admin_email: "",
  password: "",
  password_confirmation: "",
};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) {
    return null;
  }

  return <p className="mt-2 text-sm font-medium text-red-700">{messages[0]}</p>;
}

export default function OnboardingPage() {
  const [form, setForm] = useState<InitialSetupPayload>(initialForm);
  const [errors, setErrors] = useState<InitialSetupErrors>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [success, setSuccess] = useState<InitialSetupSuccess["data"] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof InitialSetupPayload, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    setErrors({});

    try {
      const response = await fetch("/api/onboarding/initial-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const body = (await response.json()) as
        | InitialSetupSuccess
        | InitialSetupErrorResponse;

      if (!response.ok) {
        const errorBody = body as InitialSetupErrorResponse;
        setFeedback(errorBody.message);
        setErrors(errorBody.errors ?? {});

        return;
      }

      setSuccess((body as InitialSetupSuccess).data);
      setForm(initialForm);
    } catch {
      setFeedback("Nao foi possivel concluir agora. Tente novamente em instantes.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-10 sm:px-10">
      <section className="grid w-full gap-8 rounded-[2rem] border border-[color:var(--color-border)] bg-white/88 p-6 shadow-[0_24px_80px_rgba(30,41,59,0.10)] sm:p-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-between rounded-[1.5rem] bg-[#0f766e] p-6 text-white">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-100">
              Primeira configuracao
            </p>
            <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
              Cadastre a igreja e a conta administradora.
            </h1>
            <p className="mt-5 text-base leading-8 text-teal-50">
              Use apenas os dados minimos para iniciar. O acesso operacional sera
              finalizado no login da proxima etapa.
            </p>
          </div>

          <div className="mt-8 rounded-2xl bg-white/12 p-4 text-sm leading-7 text-teal-50">
            O browser envia estes dados ao BFF do Next.js, e o Laravel cria o
            tenant com seguranca no backend.
          </div>
        </div>

        <div>
          {success ? (
            <div className="flex h-full flex-col justify-center">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
                Configuracao concluida
              </p>
              <h2 className="mt-4 text-3xl font-semibold text-[color:var(--color-foreground)]">
                {success.church.name} esta pronta para o primeiro acesso.
              </h2>
              <p className="mt-4 text-base leading-8 text-[color:var(--color-muted)]">
                {success.message}
              </p>
              <Link
                href="/login"
                className="mt-8 inline-flex w-fit rounded-full bg-[color:var(--color-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#115e59]"
              >
                Seguir para login
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm font-semibold" htmlFor="church_name">
                  Nome da igreja
                </label>
                <input
                  id="church_name"
                  name="church_name"
                  value={form.church_name}
                  onChange={(event) => updateField("church_name", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-base outline-none transition focus:border-[color:var(--color-accent)] focus:ring-4 focus:ring-teal-700/10"
                  autoComplete="organization"
                />
                <FieldError messages={errors.church_name} />
              </div>

              <div>
                <label className="text-sm font-semibold" htmlFor="admin_name">
                  Nome da pessoa administradora
                </label>
                <input
                  id="admin_name"
                  name="admin_name"
                  value={form.admin_name}
                  onChange={(event) => updateField("admin_name", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-base outline-none transition focus:border-[color:var(--color-accent)] focus:ring-4 focus:ring-teal-700/10"
                  autoComplete="name"
                />
                <FieldError messages={errors.admin_name} />
              </div>

              <div>
                <label className="text-sm font-semibold" htmlFor="admin_email">
                  Email da pessoa administradora
                </label>
                <input
                  id="admin_email"
                  name="admin_email"
                  type="email"
                  value={form.admin_email}
                  onChange={(event) => updateField("admin_email", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-base outline-none transition focus:border-[color:var(--color-accent)] focus:ring-4 focus:ring-teal-700/10"
                  autoComplete="email"
                />
                <FieldError messages={errors.admin_email} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold" htmlFor="password">
                    Senha
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-base outline-none transition focus:border-[color:var(--color-accent)] focus:ring-4 focus:ring-teal-700/10"
                    autoComplete="new-password"
                  />
                  <FieldError messages={errors.password} />
                </div>

                <div>
                  <label
                    className="text-sm font-semibold"
                    htmlFor="password_confirmation"
                  >
                    Confirmar senha
                  </label>
                  <input
                    id="password_confirmation"
                    name="password_confirmation"
                    type="password"
                    value={form.password_confirmation}
                    onChange={(event) =>
                      updateField("password_confirmation", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-base outline-none transition focus:border-[color:var(--color-accent)] focus:ring-4 focus:ring-teal-700/10"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {feedback ? (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                  {feedback}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-[color:var(--color-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Criando configuracao..." : "Concluir configuracao"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
