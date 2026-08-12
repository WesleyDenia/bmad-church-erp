import { AreaGuard } from "@/components/operational/area-guard";
import { LeadershipHomeShell } from "@/components/operational/leadership-home-shell";

export default function LeadershipPage() {
  return (
    <AreaGuard
      area="leadership"
      title="Lideranca"
      deniedMessage="Seu perfil atual nao permite acessar a lideranca."
    >
      <LeadershipHomeShell />
    </AreaGuard>
  );
}
