"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  type AuthErrorResponse,
  type AuthenticatedSessionResponse,
  type LoginPayload,
} from "@/features/auth/session-types";
import { getSafeNextPath } from "@/features/auth/navigation";
import { useSessionContext } from "@/hooks/use-session-context";

const initialForm: LoginPayload = {
  email: "",
  password: "",
};

type LoginPageContentProps = {
  allowAuthenticatedRedirect?: boolean;
  nextPath: string;
};

function LoginPageContent({
  allowAuthenticatedRedirect = true,
  nextPath,
}: LoginPageContentProps) {
  const router = useRouter();
  const session = useSessionContext();
  const [form, setForm] = useState<LoginPayload>(initialForm);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginPayload, string[]>>>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (
      allowAuthenticatedRedirect &&
      session.status === "authenticated" &&
      session.context
    ) {
      router.replace(nextPath);
    }
  }, [
    allowAuthenticatedRedirect,
    nextPath,
    router,
    session.context,
    session.status,
  ]);

  function updateField(field: keyof LoginPayload, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    setFieldErrors({});

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const body = (await response.json()) as
        | AuthenticatedSessionResponse
        | AuthErrorResponse;

      if (!response.ok) {
        const errorBody = body as AuthErrorResponse;
        setFeedback(errorBody.message);
        setFieldErrors((errorBody.errors ?? {}) as Partial<
          Record<keyof LoginPayload, string[]>
        >);
        return;
      }

      const successBody = body as AuthenticatedSessionResponse;
      setFeedback(
        `${successBody.data.user.name} entrou com ${successBody.data.church.name}.`,
      );
      setForm(initialForm);
      router.replace(nextPath);
    } catch {
      setFeedback("Nao foi possivel autenticar agora. Tente novamente em instantes.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10 sm:px-10">
      <section className="grid w-full gap-8 rounded-[2rem] border border-[color:var(--color-border)] bg-white/88 p-6 shadow-[0_24px_80px_rgba(30,41,59,0.10)] sm:p-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col justify-between rounded-[1.5rem] bg-[linear-gradient(160deg,_#0f766e,_#134e4a_60%,_#042f2e)] p-6 text-white">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-100">
              Acesso protegido
            </p>
            <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
              Entre com o contexto certo da sua igreja.
            </h1>
            <p className="mt-5 text-base leading-8 text-teal-50">
              O browser conversa apenas com o BFF. A API Laravel recebe um token
              interno curto, assinado no servidor, sem expor credenciais ao JavaScript.
            </p>
          </div>

          <div className="mt-8 rounded-2xl bg-white/12 p-4 text-sm leading-7 text-teal-50">
            Se sua igreja nao aparecer depois do login, o acesso sera bloqueado para
            evitar contexto incorreto.
          </div>
        </div>

        <div>
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-accent)]">
              BFF auth
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-[color:var(--color-foreground)]">
              Login operacional
            </h2>
            <p className="mt-4 text-base leading-8 text-[color:var(--color-muted)]">
              Use as credenciais da conta administradora e o sistema carregara o
              contexto ativo da igreja automaticamente.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-semibold" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-base outline-none transition focus:border-[color:var(--color-accent)] focus:ring-4 focus:ring-teal-700/10"
                autoComplete="email"
              />
              {fieldErrors.email?.length ? (
                <p className="mt-2 text-sm font-medium text-red-700">{fieldErrors.email[0]}</p>
              ) : null}
            </div>

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
                autoComplete="current-password"
              />
              {fieldErrors.password?.length ? (
                <p className="mt-2 text-sm font-medium text-red-700">
                  {fieldErrors.password[0]}
                </p>
              ) : null}
            </div>

            {feedback ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {feedback}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Autenticando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}

function LoginPageContentWithSearchParams() {
  const searchParams = useSearchParams();

  return <LoginPageContent nextPath={getSafeNextPath(searchParams.get("next"))} />;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <LoginPageContent
          allowAuthenticatedRedirect={false}
          nextPath="/"
        />
      }
    >
      <LoginPageContentWithSearchParams />
    </Suspense>
  );
}
