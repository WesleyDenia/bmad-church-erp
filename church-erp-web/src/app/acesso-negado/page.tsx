import { AccessDeniedPanel } from "@/components/operational/access-denied-panel";
import { getSafeNextPath } from "@/features/auth/navigation";
import { getAppAreaLabel } from "@/features/app-shell/navigation-policy.js";

type AccessDeniedSearchParams = {
  area?: string;
  from?: string;
};

type AccessDeniedPageProps = {
  searchParams?: AccessDeniedSearchParams | Promise<AccessDeniedSearchParams>;
};

export default async function AccessDeniedPage({ searchParams }: AccessDeniedPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const area = resolvedSearchParams?.area ?? null;
  const areaLabel = area ? getAppAreaLabel(area) : null;
  const title = areaLabel ? `Acesso restrito a ${areaLabel}` : "Acesso restrito";
  const message = areaLabel
    ? `Seu perfil atual nao permite acessar ${areaLabel.toLowerCase()}.`
    : "Seu perfil atual nao permite acessar esta area.";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-16">
      <AccessDeniedPanel
        title={title}
        message={message}
        backHref={getSafeNextPath(resolvedSearchParams?.from ?? "/")}
      />
    </main>
  );
}
