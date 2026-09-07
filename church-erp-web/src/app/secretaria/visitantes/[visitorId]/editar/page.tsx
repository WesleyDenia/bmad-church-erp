import { AreaGuard } from "@/components/operational/area-guard";
import { VisitorForm } from "@/components/operational/visitor-form";
import { sanitizePersonResolutionReturn } from "@/features/people/person-resolution-return";

type EditarVisitantePageProps = {
  params: Promise<{
    visitorId: string;
  }>;
  searchParams: Promise<{
    return_to?: string | string[];
  }>;
};

export default async function EditarVisitantePage({ params, searchParams }: EditarVisitantePageProps) {
  const { visitorId } = await params;
  const { return_to } = await searchParams;
  const returnHref = sanitizePersonResolutionReturn(
    typeof return_to === "string" ? return_to : undefined,
  );

  return (
    <AreaGuard
      area="secretaria"
      title="Secretaria"
      deniedMessage="Seu perfil atual nao permite editar visitantes."
    >
      <VisitorForm mode="edit" visitorId={visitorId} returnHref={returnHref} />
    </AreaGuard>
  );
}
