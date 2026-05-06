export type TreasuryHomeViewModel = {
  weekly_priority_block: {
    title: string;
    summary: string;
    priority_level: "alta" | "media" | "baixa";
    primary_action_label: string;
    primary_action_href: string;
    secondary_action_label: string;
    secondary_action_href: string;
  };
  quick_action_rail: {
    actions: Array<{
      label: string;
      href: string;
      emphasis: "primary" | "secondary";
    }>;
    empty_state?: {
      summary: string;
      cta_label: string;
      href: string;
    };
  };
  operational_pending_block: {
    items: Array<{
      count: number;
      label: string;
      context: string;
      cta_label: string;
      href: string;
    }>;
    empty_state?: {
      summary: string;
      cta_label: string;
      href: string;
    };
  };
  closing_status_block: {
    status_label: string;
    summary: string;
    pending_items_count: number;
    cta_label: string;
    href: string;
    empty_state?: {
      summary: string;
      cta_label: string;
      href: string;
    };
  };
  payables_receivables_block: {
    cta_label: string;
    href: string;
    payables_summary?: string;
    receivables_summary?: string;
    highlight?: string;
    empty_state?: {
      summary: string;
    };
  };
};

export const treasury_home_view_model: TreasuryHomeViewModel = {
  weekly_priority_block: {
    title:
      "Organize o fechamento e deixe o caixa da semana pronto para prestar contas.",
    summary:
      "A home entra pela prioridade que move a rotina: revisar lancamentos pendentes, conferir o que falta para fechar o periodo e preparar as proximas acoes sem sair da area da tesouraria.",
    priority_level: "alta",
    primary_action_label: "Revisar pendencias",
    primary_action_href: "/treasury#pendencias",
    secondary_action_label: "Ver fechamento atual",
    secondary_action_href: "/treasury#fechamento",
  },
  quick_action_rail: {
    actions: [
      {
        label: "Abrir lancamento rapido",
        href: "/treasury#lancamento-rapido",
        emphasis: "primary",
      },
      {
        label: "Acompanhar contas do periodo",
        href: "/treasury#fluxo-financeiro",
        emphasis: "secondary",
      },
      {
        label: "Preparar envio de fechamento",
        href: "/treasury#fechamento",
        emphasis: "secondary",
      },
    ],
    empty_state: {
      summary:
        "Ainda nao ha acoes rapidas suficientes para esta lateral. Abra a tesouraria e escolha o primeiro movimento da semana.",
      cta_label: "Abrir tesouraria",
      href: "/treasury",
    },
  },
  operational_pending_block: {
    items: [
      {
        count: 3,
        label: "Lancamentos aguardando revisao",
        context:
          "Inclui receitas registradas sem confirmacao final e despesas que ainda precisam de ultima conferencia antes do fechamento.",
        cta_label: "Abrir fila de revisao",
        href: "/treasury#pendencias",
      },
      {
        count: 1,
        label: "Comprovante faltando anexar",
        context:
          "Uma despesa da semana passada ainda depende do comprovante para manter a trilha de prestacao de contas completa.",
        cta_label: "Cobrar comprovante",
        href: "/treasury#fluxo-financeiro",
      },
    ],
    empty_state: {
      summary:
        "Nao ha pendencias abertas agora. Aproveite para revisar os registros da semana e confirmar se o fechamento segue limpo.",
      cta_label: "Conferir rotina da semana",
      href: "/treasury#fechamento",
    },
  },
  closing_status_block: {
    status_label: "em andamento",
    summary:
      "O fechamento da semana ainda depende de revisar pendencias abertas e confirmar se o resumo financeiro pode seguir para compartilhamento.",
    pending_items_count: 2,
    cta_label: "Retomar fechamento",
    href: "/treasury#fechamento",
    empty_state: {
      summary:
        "Ainda nao ha dados suficientes para resumir o fechamento atual. Registre os primeiros movimentos para abrir esta leitura operacional.",
      cta_label: "Abrir lancamento rapido",
      href: "/treasury#lancamento-rapido",
    },
  },
  payables_receivables_block: {
    cta_label: "Preparar primeiros compromissos",
    href: "/treasury#lancamento-rapido",
    empty_state: {
      summary:
        "Ainda nao existem dados suficientes para resumir contas a pagar e a receber. A estrutura do bloco permanece visivel para orientar o proximo registro financeiro.",
    },
  },
};
