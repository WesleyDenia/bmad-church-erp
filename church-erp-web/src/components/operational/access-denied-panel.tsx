import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/design-system/surface";

type AccessDeniedPanelProps = {
  title: string;
  message: string;
  backHref?: string;
  backLabel?: string;
};

export function AccessDeniedPanel({
  title,
  message,
  backHref = "/",
  backLabel = "Voltar para a pagina inicial",
}: AccessDeniedPanelProps) {
  return (
    <Surface className="mx-auto max-w-3xl p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-accent)]">
        Acesso restrito
      </p>
      <h1 className="mt-4 text-3xl font-semibold text-[color:var(--color-foreground)]">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[color:var(--color-muted)]">
        {message}
      </p>

      <Button asChild variant="secondary" className="mt-8">
        <Link href={backHref}>{backLabel}</Link>
      </Button>
    </Surface>
  );
}
