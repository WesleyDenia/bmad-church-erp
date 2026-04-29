import { AreaGuard } from "@/components/operational/area-guard";

export default function LeadershipPage() {
  return (
    <AreaGuard
      area="leadership"
      title="Lideranca"
      deniedMessage="Seu perfil atual nao permite acessar a lideranca."
    >
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-4xl font-semibold">Lideranca</h1>
        <p className="mt-4 text-base leading-8 text-[color:var(--color-muted)]">
          Base para visoes resumidas, leitura rapida de status e acompanhamento.
        </p>
      </section>
    </AreaGuard>
  );
}
