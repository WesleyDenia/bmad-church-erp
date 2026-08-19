import { AreaGuard } from "@/components/operational/area-guard";
import { MemberForm } from "@/components/operational/member-form";

type EditarMembroPageProps = {
  params: Promise<{
    memberId: string;
  }>;
};

export default async function EditarMembroPage({ params }: EditarMembroPageProps) {
  const { memberId } = await params;

  return (
    <AreaGuard
      area="secretaria"
      title="Secretaria"
      deniedMessage="Seu perfil atual nao permite editar membros."
    >
      <MemberForm mode="edit" memberId={memberId} />
    </AreaGuard>
  );
}
