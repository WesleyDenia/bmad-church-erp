import { AreaGuard } from "@/components/operational/area-guard";

export default function CommunicationsPage() {
  return (
    <AreaGuard
      area="communications"
      title="Comunicacao"
      deniedMessage="Seu perfil atual nao permite acessar a comunicacao."
    >
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-4xl font-semibold">Comunicacao</h1>
        <p className="mt-4 text-base leading-8 text-[color:var(--color-muted)]">
          Base para modelos, handoff externo e mensagens preparadas.
        </p>
      </section>
    </AreaGuard>
  );
}
