import type { AppAreaLink } from "@/types/navigation";

export const appAreaLinks: AppAreaLink[] = [
  {
    href: "/treasury",
    label: "Tesouraria",
    description: "Fluxo operacional para lancamentos, pendencias e fechamento.",
  },
  {
    href: "/secretaria",
    label: "Secretaria",
    description: "Base para cadastro, busca e acompanhamento de pessoas.",
  },
  {
    href: "/leadership",
    label: "Lideranca",
    description: "Visao resumida para acompanhamento e alinhamento ministerial.",
  },
  {
    href: "/communications",
    label: "Comunicacao",
    description: "Camada futura para modelos, handoff e mensagens preparadas.",
  },
];
