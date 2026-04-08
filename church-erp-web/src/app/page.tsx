import { AppShellCard } from "@/components/app-shell-card";
import { appAreaLinks } from "@/features/app-shell/navigation";

export default function Home() {
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
        </div>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        {appAreaLinks.map((area) => (
          <AppShellCard
            key={area.href}
            href={area.href}
            title={area.label}
            description={area.description}
          />
        ))}
      </section>
    </main>
  );
}
