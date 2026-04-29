import { AreaGuard } from "@/components/operational/area-guard";

export default function SecretariaPage() {
  return (
    <AreaGuard
      area="secretaria"
      title="Secretaria"
      deniedMessage="Seu perfil atual nao permite acessar a secretaria."
    >
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-4xl font-semibold">Secretaria</h1>
        <p className="mt-4 text-base leading-8 text-[color:var(--color-muted)]">
          Base para cadastro, busca e acompanhamento operacional de pessoas.
        </p>
      </section>
    </AreaGuard>
  );
}
