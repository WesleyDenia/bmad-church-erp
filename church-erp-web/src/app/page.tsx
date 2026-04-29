"use client";

import { AppShellCard } from "@/components/app-shell-card";
import { Button } from "@/components/ui/button";
import {
  getAccessibleAppAreaLinks,
  getChurchRoleLabel,
} from "@/features/app-shell/navigation";
import { useSessionContext } from "@/hooks/use-session-context";
import Link from "next/link";

export default function Home() {
  const session = useSessionContext();
  const visibleAreas =
    session.context && session.status === "authenticated"
      ? getAccessibleAppAreaLinks(session.context.roles)
      : [];

  const accessMessage =
    session.status === "loading"
      ? "Confirmando contexto autenticado..."
      : session.status === "authenticated"
        ? "Seu perfil define as areas disponiveis."
        : "Entre no sistema para ver as areas disponiveis.";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12 sm:px-10 lg:px-12">
      <section className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.24),_transparent_40%),linear-gradient(135deg,_#082f49,_#164e63_55%,_#e2e8f0)] p-8 text-white shadow-[0_30px_100px_rgba(8,47,73,0.30)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-100/80">
            Church ERP Web
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            BFF pronto para autenticar o browser e intermediar acesso ao Laravel.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-100/90">
            Esta fundacao separa UI, sessao e navegacao no Next.js enquanto
            preserva identidade, autorizacao, validacao e regras de dominio no
            backend.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="rounded-[1.25rem] border border-white/20 bg-white/12 px-4 py-3 text-sm text-white shadow-none">
              {session.status === "authenticated" && session.context ? (
                <>
                  <span className="font-semibold">
                    {getChurchRoleLabel(session.context.role)}
                  </span>
                  <span className="ml-2 text-cyan-100/90">
                    {session.context.church.name}
                  </span>
                </>
              ) : (
                accessMessage
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[color:var(--color-border)] bg-white/85 p-8 shadow-[0_20px_60px_rgba(30,41,59,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-accent)]">
            Guardrails
          </p>
          <ul className="mt-5 space-y-4 text-sm leading-7 text-[color:var(--color-muted)]">
            <li>Browser autentica apenas contra o `church-erp-web`.</li>
            <li>BFF emite JWT interno curto para o `church-erp-api`.</li>
            <li>Contratos HTTP seguem `snake_case`.</li>
            <li>`church_id` permanece obrigatorio no contexto multi-tenant.</li>
          </ul>
          <Button asChild variant="secondary" className="mt-8">
            <Link href="/login">Entrar no sistema</Link>
          </Button>
        </div>
      </section>

      <section className="mt-10">
        {session.status === "loading" ? (
          <div className="rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-8 py-10 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-accent)]">
              Acessos
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
              Carregando areas disponiveis
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[color:var(--color-muted)]">
              {accessMessage}
            </p>
          </div>
        ) : visibleAreas.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {visibleAreas.map((area) => (
              <AppShellCard
                key={area.href}
                href={area.href}
                title={area.label}
                description={area.description}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-8 py-10 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-accent)]">
              Acessos
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
              Areas sob seu perfil
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[color:var(--color-muted)]">
              {accessMessage}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
