import Link from "next/link";
import { Surface } from "@/components/design-system/surface";
import { Button } from "@/components/ui/button";

type PayablesReceivablesBlockProps = {
  payables_summary?: string;
  receivables_summary?: string;
  highlight?: string;
  cta_label: string;
  href: string;
  empty_state?: {
    summary: string;
  };
};

export function PayablesReceivablesBlock({
  payables_summary,
  receivables_summary,
  highlight,
  cta_label,
  href,
  empty_state,
}: PayablesReceivablesBlockProps) {
  if (empty_state) {
    return (
      <Surface className="p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
          Contas a pagar e a receber
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
          Fluxo financeiro imediato
        </h2>
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-[color:var(--color-border)] bg-[rgba(255,255,255,0.72)] p-5">
          <p className="text-sm leading-7 text-[color:var(--color-muted)]">
            {empty_state.summary}
          </p>
        </div>

        <Button asChild variant="secondary" className="mt-5 w-full rounded-[1.25rem]">
          <Link href={href}>{cta_label}</Link>
        </Button>
      </Surface>
    );
  }

  return (
    <Surface className="p-6 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
        Contas a pagar e a receber
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
        Fluxo financeiro imediato
      </h2>

      <div className="mt-5 grid gap-4">
        <div className="rounded-[1.5rem] border border-[color:var(--color-border)] bg-[rgba(255,255,255,0.72)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
            A pagar
          </p>
          <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
            {payables_summary}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--color-border)] bg-[rgba(255,255,255,0.72)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
            A receber
          </p>
          <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
            {receivables_summary}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] bg-[rgba(15,118,110,0.12)] p-4 text-sm leading-7 text-[color:var(--color-foreground)]">
        {highlight}
      </div>

      <Button asChild variant="ghost" className="mt-4 px-0">
        <Link href={href}>{cta_label}</Link>
      </Button>
    </Surface>
  );
}
