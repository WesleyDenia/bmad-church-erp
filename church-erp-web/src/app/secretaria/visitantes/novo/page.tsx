import { AreaGuard } from "@/components/operational/area-guard";
import { VisitorForm } from "@/components/operational/visitor-form";

export default function NovoVisitantePage() {
  return (
    <AreaGuard
      area="secretaria"
      title="Secretaria"
      deniedMessage="Seu perfil atual nao permite cadastrar visitantes."
    >
      <VisitorForm mode="create" />
    </AreaGuard>
  );
}
