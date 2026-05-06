import Link from "next/link";
import { Surface } from "@/components/design-system/surface";
import { Button } from "@/components/ui/button";

type QuickAction = {
  label: string;
  href: string;
  emphasis: "primary" | "secondary";
};

type QuickActionRailProps = {
  actions: QuickAction[];
  empty_state?: {
    summary: string;
    cta_label: string;
    href: string;
  };
};

export function QuickActionRail({
  actions,
  empty_state,
}: QuickActionRailProps) {
  if (actions.length === 0) {
    return (
      <Surface className="p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
          Lancamento rapido
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
          Acoes centrais da rotina
        </h2>
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-[color:var(--color-border)] bg-[rgba(255,255,255,0.72)] p-5">
          <p className="text-sm leading-7 text-[color:var(--color-muted)]">
            {empty_state?.summary ??
              "Ainda nao ha atalhos suficientes para esta faixa. Use a entrada principal da tesouraria para retomar a rotina."}
          </p>
        </div>

        <Button asChild variant="secondary" className="mt-5 w-full rounded-[1.25rem]">
          <Link href={empty_state?.href ?? "/treasury"}>
            {empty_state?.cta_label ?? "Abrir tesouraria"}
          </Link>
        </Button>
      </Surface>
    );
  }

  return (
    <Surface className="p-6 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
        Lancamento rapido
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
        Acoes centrais da rotina
      </h2>
      <p className="mt-4 text-sm leading-7 text-[color:var(--color-muted)]">
        A faixa lateral concentra tarefas recorrentes para o tesoureiro agir
        sem abrir uma navegacao paralela fora da rota oficial da area.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            asChild
            variant={action.emphasis === "primary" ? "default" : "secondary"}
            className="w-full justify-between rounded-[1.25rem] px-4"
          >
            <Link href={action.href}>
              <span>{action.label}</span>
              <span aria-hidden="true">Ir</span>
            </Link>
          </Button>
        ))}
      </div>
    </Surface>
  );
}
