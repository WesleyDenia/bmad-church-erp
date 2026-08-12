import { AreaGuard } from "@/components/operational/area-guard";
import { SecretaryHomeShell } from "@/components/operational/secretary-home-shell";

export default function SecretariaPage() {
  return (
    <AreaGuard
      area="secretaria"
      title="Secretaria"
      deniedMessage="Seu perfil atual nao permite acessar a secretaria."
    >
      <SecretaryHomeShell />
    </AreaGuard>
  );
}
