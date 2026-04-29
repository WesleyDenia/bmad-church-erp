import { AreaGuard } from "@/components/operational/area-guard";

export default function TreasuryPage() {
  return (
    <AreaGuard
      area="treasury"
      title="Tesouraria"
      deniedMessage="Seu perfil atual nao permite acessar a tesouraria."
    >
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-4xl font-semibold">Tesouraria</h1>
        <p className="mt-4 text-base leading-8 text-[color:var(--color-muted)]">
          Base para home operacional, lancamentos, pendencias e fechamento.
        </p>
      </section>
    </AreaGuard>
  );
}
