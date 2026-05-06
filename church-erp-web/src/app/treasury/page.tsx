import { AreaGuard } from "@/components/operational/area-guard";
import { TreasuryHomeShell } from "@/components/operational/treasury-home-shell";

export default function TreasuryPage() {
  return (
    <AreaGuard
      area="treasury"
      title="Tesouraria"
      deniedMessage="Seu perfil atual nao permite acessar a tesouraria."
    >
      <TreasuryHomeShell />
    </AreaGuard>
  );
}
