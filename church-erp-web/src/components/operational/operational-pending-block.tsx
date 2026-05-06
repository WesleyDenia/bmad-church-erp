import Link from "next/link";
import { Surface } from "@/components/design-system/surface";
import { Button } from "@/components/ui/button";

type PendingItem = {
  count: number;
  label: string;
  context: string;
  cta_label: string;
  href: string;
};

type OperationalPendingBlockProps = {
  items: PendingItem[];
  empty_state?: {
    summary: string;
    cta_label: string;
    href: string;
  };
};

export function OperationalPendingBlock({
  items,
  empty_state,
}: OperationalPendingBlockProps) {
  if (items.length === 0) {
    return (
      <Surface className="p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
          Pendencias de revisao
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
          O que precisa de resposta hoje
        </h2>
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-[color:var(--color-border)] bg-[rgba(255,255,255,0.72)] p-5">
          <p className="text-sm leading-7 text-[color:var(--color-muted)]">
            {empty_state?.summary}
          </p>
        </div>

        <Button asChild variant="secondary" className="mt-5 w-full rounded-[1.25rem]">
          <Link href={empty_state?.href ?? "/treasury"}>
            {empty_state?.cta_label}
          </Link>
        </Button>
      </Surface>
    );
  }

  return (
    <Surface className="p-6 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
        Pendencias de revisao
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
        O que precisa de resposta hoje
      </h2>
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-[1.5rem] border border-[color:var(--color-border)] bg-[rgba(255,255,255,0.72)] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-[rgba(15,118,110,0.12)] px-3 py-1 text-sm font-semibold text-[color:var(--color-accent)]">
                    {item.count}
                  </span>
                  <h3 className="text-lg font-semibold text-[color:var(--color-foreground)]">
                    {item.label}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
                  {item.context}
                </p>
              </div>
            </div>

            <Button asChild variant="ghost" className="mt-4 px-0">
              <Link href={item.href}>{item.cta_label}</Link>
            </Button>
          </div>
        ))}
      </div>
    </Surface>
  );
}
