import Link from "next/link";

type AppShellCardProps = {
  href: string;
  title: string;
  description: string;
};

export function AppShellCard({
  href,
  title,
  description,
}: AppShellCardProps) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-[color:var(--color-border)] bg-white/80 p-6 shadow-[0_20px_60px_rgba(30,41,59,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(30,41,59,0.12)]"
    >
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
  );
}
