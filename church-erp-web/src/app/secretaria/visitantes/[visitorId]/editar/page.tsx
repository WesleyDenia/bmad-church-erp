import { AreaGuard } from "@/components/operational/area-guard";
import { VisitorForm } from "@/components/operational/visitor-form";

type EditarVisitantePageProps = {
  params: Promise<{
    visitorId: string;
  }>;
};

export default async function EditarVisitantePage({ params }: EditarVisitantePageProps) {
  const { visitorId } = await params;

  return (
    <AreaGuard
      area="secretaria"
      title="Secretaria"
      deniedMessage="Seu perfil atual nao permite editar visitantes."
    >
      <VisitorForm mode="edit" visitorId={visitorId} />
    </AreaGuard>
  );
}
