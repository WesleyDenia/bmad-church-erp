import { AreaGuard } from "@/components/operational/area-guard";
import { CommunicationTemplateList } from "@/components/operational/communication-template-list";

export default function CommunicationsPage() {
  return (
    <AreaGuard
      area="communications"
      title="Comunicacao"
      deniedMessage="Seu perfil atual nao permite acessar a comunicacao."
    >
      <CommunicationTemplateList />
    </AreaGuard>
  );
}
