"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type {
  InitialSetupErrorResponse,
  InitialSetupErrors,
  InitialSetupPayload,
  InitialSetupSuccess,
  OnboardingTerms,
} from "@/features/auth/initial-setup";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  isLatestTermsRequest,
  parseOnboardingTerms,
} from "@/features/auth/onboarding-terms";

const initialForm: InitialSetupPayload = {
  church_name: "",
  admin_name: "",
  admin_email: "",
  password: "",
  password_confirmation: "",
  terms_accepted: false,
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
  const [terms, setTerms] = useState<OnboardingTerms | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [isTermsLoading, setIsTermsLoading] = useState(true);
  const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false);
  const latestTermsRequestRef = useRef(0);
  const activeTermsRequestRef = useRef<AbortController | null>(null);
  const focusReturnTargetRef = useRef<"checkbox" | "trigger">("checkbox");
  const checkboxRef = useRef<HTMLInputElement>(null);
  const termsTriggerRef = useRef<HTMLButtonElement>(null);

  const loadTerms = useCallback(() => {
    activeTermsRequestRef.current?.abort();

    const controller = new AbortController();
    const requestId = latestTermsRequestRef.current + 1;
    latestTermsRequestRef.current = requestId;
    activeTermsRequestRef.current = controller;
    setTerms(null);
    setTermsError(null);
    setIsTermsLoading(true);

    void (async () => {
      try {
        const response = await fetch("/api/onboarding/terms", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Terms request failed");
        }

        const termsResponse = parseOnboardingTerms(await response.json());

        if (!termsResponse) {
          throw new Error("Invalid terms response");
        }

        if (!isLatestTermsRequest(requestId, latestTermsRequestRef.current)) {
          return;
        }

        setTerms(termsResponse);
      } catch {
        if (controller.signal.aborted || !isLatestTermsRequest(requestId, latestTermsRequestRef.current)) {
          return;
        }

        setTerms(null);
        setTermsError("Nao foi possivel carregar os termos agora. Tente novamente em instantes.");
      } finally {
        if (isLatestTermsRequest(requestId, latestTermsRequestRef.current)) {
          setIsTermsLoading(false);
        }
      }
    })();

    return controller;
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (!cancelled) {
        loadTerms();
      }
    });

    return () => {
      cancelled = true;
      activeTermsRequestRef.current?.abort();
    };
  }, [loadTerms]);

  function openTermsFromTrigger() {
    focusReturnTargetRef.current = "trigger";
    setIsTermsDialogOpen(true);
  }

  function returnFocusAfterTermsDialogClose() {
    window.requestAnimationFrame(() => {
      if (focusReturnTargetRef.current === "trigger") {
        termsTriggerRef.current?.focus();
        return;
      }

      checkboxRef.current?.focus();
    });
  }

  function updateField(
    field: Exclude<keyof InitialSetupPayload, "terms_accepted">,
    value: string,
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateTermsAcceptance(termsAccepted: boolean) {
    setForm((current) => ({ ...current, terms_accepted: termsAccepted }));
    setErrors((current) => ({ ...current, terms_accepted: undefined }));
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
            Depois da confirmacao, a conta administradora podera acessar a
            proxima etapa do sistema com os dados criados aqui.
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
              <Button asChild className="mt-8 w-fit">
                <Link href="/login">Seguir para login</Link>
              </Button>
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

              <fieldset className="rounded-2xl border border-[color:var(--color-border)] bg-[#f7f4ed] p-4">
                <legend className="px-1 text-sm font-semibold">Termos de uso</legend>
                {terms ? (
                  <>
                    <div className="mt-2 flex items-start gap-3 text-sm font-medium leading-6" role="group" aria-labelledby="terms-acceptance-label">
                      <input
                        ref={checkboxRef}
                        id="terms_accepted"
                        name="terms_accepted"
                        type="checkbox"
                        checked={form.terms_accepted}
                        onChange={(event) => updateTermsAcceptance(event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-[color:var(--color-border)] text-[color:var(--color-accent)] focus:ring-[color:var(--color-accent)]"
                      />
                      <label id="terms-acceptance-label" htmlFor="terms_accepted">
                        Li e aceito os termos de uso.
                      </label>
                      <button
                      ref={termsTriggerRef}
                      type="button"
                      onClick={openTermsFromTrigger}
                      className="mt-0.5 text-sm font-semibold text-[color:var(--color-accent)] underline underline-offset-4 focus:outline-none focus:ring-4 focus:ring-teal-700/10"
                    >
                      termos
                    </button>
                    </div>
                    
                    <FieldError messages={errors.terms_accepted} />
                  </>
                ) : (
                  <div className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]" aria-live="polite">
                    <p>{termsError ?? "Carregando termos..."}</p>
                    {termsError ? (
                      <button
                        type="button"
                        onClick={loadTerms}
                        className="mt-3 font-semibold text-[color:var(--color-accent)] underline underline-offset-4 focus:outline-none focus:ring-4 focus:ring-teal-700/10"
                      >
                        Tentar novamente
                      </button>
                    ) : null}
                  </div>
                )}
              </fieldset>

              {feedback ? (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                  {feedback}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="submit" className="w-full" disabled={isSubmitting || isTermsLoading || !terms}>
                  {isSubmitting ? "Criando configuracao..." : "Salvar"}
                </Button>
                <Button asChild variant="secondary" className="w-full">
                  <Link href="/login">Já é registrado?</Link>
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>
      <Dialog open={isTermsDialogOpen} onOpenChange={setIsTermsDialogOpen}>
        <DialogContent
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            document.getElementById("onboarding-terms-dialog-title")?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusAfterTermsDialogClose();
          }}
        >
          <DialogHeader>
            <DialogTitle id="onboarding-terms-dialog-title" tabIndex={-1}>
              Termos de uso
            </DialogTitle>
            <DialogDescription>
              Leia o documento antes de confirmar o aceite.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 max-h-[min(50vh,28rem)] overflow-y-auto whitespace-pre-line pr-3 text-sm leading-7 text-[color:var(--color-foreground)]">
            {terms?.content}
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" onClick={() => setIsTermsDialogOpen(false)}>
              Fechar termos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
