import Link from "next/link";
import { Surface } from "@/components/design-system/surface";
import { Button } from "@/components/ui/button";

type WeeklyPriorityBlockProps = {
  title: string;
  summary: string;
  priority_level: "alta" | "media" | "baixa";
  primary_action_label: string;
  primary_action_href: string;
  secondary_action_label: string;
  secondary_action_href: string;
};

export function WeeklyPriorityBlock({
  title,
  summary,
  priority_level,
  primary_action_label,
  primary_action_href,
  secondary_action_label,
  secondary_action_href,
}: WeeklyPriorityBlockProps) {
  return (
    <Surface className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.2),_transparent_24rem),linear-gradient(135deg,_rgba(255,255,255,0.97),_rgba(240,253,250,0.94))] p-8 sm:p-10">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
          Prioridade da semana
        </p>
        <span className="rounded-full bg-[rgba(15,118,110,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
          {priority_level}
        </span>
      </div>

      <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-[color:var(--color-foreground)] sm:text-5xl">
        {title}
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-8 text-[color:var(--color-muted)]">
        {summary}
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href={primary_action_href}>{primary_action_label}</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href={secondary_action_href}>{secondary_action_label}</Link>
        </Button>
      </div>
    </Surface>
  );
}
