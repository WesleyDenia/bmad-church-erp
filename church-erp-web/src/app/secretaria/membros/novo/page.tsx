import { AreaGuard } from "@/components/operational/area-guard";
import { MemberForm } from "@/components/operational/member-form";

export default function NovoMembroPage() {
  return (
    <AreaGuard
      area="secretaria"
      title="Secretaria"
      deniedMessage="Seu perfil atual nao permite cadastrar membros."
    >
      <MemberForm mode="create" />
    </AreaGuard>
  );
}
