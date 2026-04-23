import Link from "next/link";
import { Surface } from "@/components/design-system/surface";

type AreaCardProps = {
  href: string;
  title: string;
  description: string;
};

export function AreaCard({ href, title, description }: AreaCardProps) {
  return (
    <Surface className="transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(30,41,59,0.12)]">
      <Link href={href} className="block p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-accent)]">
          Area operacional
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-foreground)]">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
          {description}
        </p>
      </Link>
    </Surface>
  );
}
