export default function LoadingAdminUsersPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-12">
      <section className="rounded-[2rem] border border-[color:var(--color-border)] bg-white/90 p-8 shadow-[0_20px_60px_rgba(30,41,59,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-accent)]">
          Administracao de usuarios
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[color:var(--color-foreground)]">
          Validando seu acesso administrativo
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-[color:var(--color-muted)]">
          Estamos confirmando sua sessao e o perfil ativo da igreja antes de
          liberar o cadastro de usuarios do sistema.
        </p>
      </section>
    </main>
  );
}
