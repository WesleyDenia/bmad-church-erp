export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <section className="w-full rounded-[2rem] border border-[color:var(--color-border)] bg-white/85 p-8 shadow-[0_20px_60px_rgba(30,41,59,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-accent)]">
          Auth BFF
        </p>
        <h1 className="mt-4 text-4xl font-semibold">Login server-side em preparacao</h1>
        <p className="mt-4 text-base leading-8 text-[color:var(--color-muted)]">
          O browser autenticara aqui. O fluxo completo de login, logout e troca
          de tenant sera implementado na story 1.3.
        </p>
      </section>
    </main>
  );
}
