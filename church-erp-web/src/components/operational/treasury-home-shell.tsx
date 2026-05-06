import { ClosingStatusBlock } from "@/components/operational/closing-status-block";
import { OperationalPendingBlock } from "@/components/operational/operational-pending-block";
import { PayablesReceivablesBlock } from "@/components/operational/payables-receivables-block";
import { QuickActionRail } from "@/components/operational/quick-action-rail";
import { WeeklyPriorityBlock } from "@/components/operational/weekly-priority-block";
import { treasury_home_view_model } from "@/features/treasury/home-view-model";

export function TreasuryHomeShell() {
  const quickActionRail = treasury_home_view_model.quick_action_rail;
  const operationalPendingBlock = treasury_home_view_model.operational_pending_block;
  const quickActions = quickActionRail?.actions ?? [];
  const pendingItems = operationalPendingBlock?.items ?? [];
  const closingStatus = treasury_home_view_model.closing_status_block;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-10 lg:px-12">
      <section className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
        <WeeklyPriorityBlock
          title={treasury_home_view_model.weekly_priority_block?.title ?? "Organize a rotina e prepare o fechamento da semana."}
          summary={treasury_home_view_model.weekly_priority_block?.summary ?? "Acompanhe as acoes prioritarias para manter a saude financeira e a transparencia da igreja."}
          priority_level={
            treasury_home_view_model.weekly_priority_block?.priority_level ?? "media"
          }
          primary_action_label={
            treasury_home_view_model.weekly_priority_block?.primary_action_label ?? "Revisar movimentos"
          }
          primary_action_href={
            treasury_home_view_model.weekly_priority_block?.primary_action_href ?? "/treasury#pendencias"
          }
          secondary_action_label={
            treasury_home_view_model.weekly_priority_block?.secondary_action_label ?? "Ver fechamento"
          }
          secondary_action_href={
            treasury_home_view_model.weekly_priority_block?.secondary_action_href ?? "/treasury#fechamento"
          }
        />

        <div id="lancamento-rapido">
          <QuickActionRail
            actions={quickActions}
            empty_state={quickActionRail?.empty_state ?? {
              summary: "Ainda nao ha acoes rapidas configuradas para este periodo.",
              cta_label: "Abrir lancamento",
              href: "/treasury#lancamento-rapido"
            }}
          />
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <div id="pendencias">
          <OperationalPendingBlock
            items={pendingItems}
            empty_state={operationalPendingBlock?.empty_state ?? {
              summary: "Nao ha pendencias de revisao no momento. O fluxo operacional segue em dia.",
              cta_label: "Conferir registros",
              href: "/treasury#fluxo-financeiro"
            }}
          />
        </div>

        <div id="fechamento">
          <ClosingStatusBlock
            status_label={closingStatus?.status_label ?? "indisponivel"}
            summary={closingStatus?.summary ?? "O resumo de fechamento estara disponivel assim que houver movimentos registrados."}
            pending_items_count={closingStatus?.pending_items_count ?? 0}
            cta_label={closingStatus?.cta_label ?? "Ver detalhes"}
            href={closingStatus?.href ?? "/treasury#fechamento"}
            empty_state={closingStatus?.empty_state}
          />
        </div>

        <div id="fluxo-financeiro">
          <PayablesReceivablesBlock
            cta_label={treasury_home_view_model.payables_receivables_block?.cta_label ?? "Ver fluxo financeiro"}
            href={treasury_home_view_model.payables_receivables_block?.href ?? "/treasury#fluxo-financeiro"}
            empty_state={
              treasury_home_view_model.payables_receivables_block?.empty_state
            }
          />
        </div>
      </section>
    </main>
  );
}
