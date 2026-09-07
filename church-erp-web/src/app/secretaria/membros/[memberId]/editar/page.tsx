import { AreaGuard } from "@/components/operational/area-guard";
import { MemberForm } from "@/components/operational/member-form";
import { sanitizePersonResolutionReturn } from "@/features/people/person-resolution-return";

type EditarMembroPageProps = {
  params: Promise<{
    memberId: string;
  }>;
  searchParams: Promise<{
    return_to?: string | string[];
  }>;
};

export default async function EditarMembroPage({ params, searchParams }: EditarMembroPageProps) {
  const { memberId } = await params;
  const { return_to } = await searchParams;
  const returnHref = sanitizePersonResolutionReturn(
    typeof return_to === "string" ? return_to : undefined,
  );

  return (
    <AreaGuard
      area="secretaria"
      title="Secretaria"
      deniedMessage="Seu perfil atual nao permite editar membros."
    >
      <MemberForm mode="edit" memberId={memberId} returnHref={returnHref} />
    </AreaGuard>
  );
}
