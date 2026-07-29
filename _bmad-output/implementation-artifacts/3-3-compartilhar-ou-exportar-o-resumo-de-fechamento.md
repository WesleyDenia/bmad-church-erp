# Story 3.3: Compartilhar ou exportar o resumo de fechamento

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a tesoureiro,
I want exportar ou compartilhar o resumo de fechamento,
so that eu entregue a visibilidade necessaria para a lideranca no mesmo fluxo.

## Acceptance Criteria

1. Dado que o fechamento do periodo esta carregado com `state = closing_summary_loaded`, sem `consistency_error` e com `operational_status = status_pronto_para_revisar`, quando o tesoureiro escolhe copiar, compartilhar ou imprimir o resumo, entao o sistema prepara uma saida simples do MVP a partir do mesmo `data.closing_summary` recebido pelo BFF, preservando `period_start`, `period_end`, `total_income`, `total_expense`, `net_result`, `entry_count` e `calculation_basis`.
2. Dado que o resumo sera preparado para a lideranca antes da Story 3.4 existir, quando o texto ou a visualizacao imprimivel forem gerados, entao a saida deve conter apenas periodo, totais consolidados, quantidade de lancamentos, status de reconciliacao e quebras agregadas por centro de custo/subtipo quando consistentes, sem nomes de contrapartes, usuarios, trilhas de auditoria, motivos de edicao, detalhes de lancamentos individuais ou qualquer dado pessoal/financeiro granular.
3. Dado que o detalhamento da Story 3.2 ja foi carregado com `include_details=true`, quando o tesoureiro prepara a saida, entao o conteudo deve incluir `by_cost_center`, `by_subtype` e `reconciliation` ja recebidos do contrato existente, sem recalcular totais, percentuais ou agrupamentos no frontend.
4. Dado que o detalhamento ainda nao foi carregado, quando o tesoureiro aciona a preparacao do resumo compartilhavel, entao o sistema deve buscar o fechamento pelo BFF com `include_details=true&period_start=...&period_end=...` antes de montar a saida, usando o mesmo periodo do resumo carregado e sem chamar Laravel diretamente do browser.
5. Dado que a busca de detalhes feita durante o handoff retorna `409` ou `state = consistency_error`, quando a UI recebe essa resposta, entao o sistema deve promover o fechamento principal para `consistency_error`, bloquear copia/partilha/impressao e nao usar o consolidado anteriormente visivel como fonte compartilhavel.
6. Dado que o fechamento esta vazio, inconsistente, negado, com erro tecnico, em estado recuperado ou com pendencias operacionais abertas, quando o usuario tenta compartilhar/exportar, entao a UI bloqueia a acao sensivel e mostra mensagem operacional clara; nao deve gerar texto, impressao ou compartilhamento com dados fabricados, parciais ou nao confiaveis.
7. Dado que o usuario escolhe copiar, quando `navigator.clipboard.writeText` estiver disponivel em contexto seguro, entao o sistema copia o texto final e confirma que o resumo foi preparado; quando a API de clipboard falhar ou estiver indisponivel, a UI apresenta fallback manual acessivel com foco gerenciado, texto selecionavel, label claro e orientacao curta.
8. Dado que o usuario escolhe compartilhar, quando `navigator.share` estiver disponivel e `navigator.canShare` nao existir ou permitir o payload textual, entao o sistema abre o handoff nativo com titulo e texto do resumo; quando `navigator.share` nao existir, `navigator.canShare` rejeitar o payload ou a chamada falhar por suporte/permissao, a UI preserva o texto e orienta copiar sem tratar cancelamento do usuario como erro tecnico.
9. Dado que o usuario escolhe imprimir, quando a acao for acionada, entao o sistema renderiza primeiro uma visualizacao imprimivel do resumo atual, confirma que ela esta montada no DOM, chama `window.print()` apenas a partir da acao explicita do usuario, e limpa o modo de impressao por `afterprint` ou fallback controlado, com layout legivel, sem menus de operacao, sem controles interativos e sem depender de pop-up externo.
10. Dado que o usuario conclui copia, compartilhamento ou impressao e retorna ao sistema, quando a home da tesouraria continua aberta, entao o fechamento, o detalhamento e a selecao de periodo permanecem no contexto atual; o usuario nao precisa reencontrar ou recompor o resumo.
11. Dado que o resumo e preparado para a lideranca, quando o texto/print for gerado, entao a linguagem deve ser clara, pastoral e operacional, com periodo exibido em formato legivel e explicito, aviso de base de calculo, sem jargao tecnico, sem JSON bruto, sem dashboard generico e sem expor dados alem do fechamento aprovado para a tesouraria.

## Threat Modeling - STRIDE

**Escopo:** Story 3.3 - copiar, compartilhar ou imprimir resumo agregado de fechamento financeiro para lideranca.  
**Fronteiras de confianca:** browser autenticado do tesoureiro, BFF Next.js em `/api/finance/closing-summary`, API Laravel em `/api/v1/finance/closing-summary`, banco multi-tenant escopado por `church_id`, APIs nativas do browser (`Clipboard`, `Web Share`, `window.print`).  
**Entradas:** parametros `include_details`, `period_start`, `period_end`; cookie de sessao HttpOnly; payload Laravel `data.closing_summary`; labels agregadas de centro de custo e subtipo.  
**Saidas:** texto copiavel, payload textual para Web Share, visualizacao imprimivel, mensagens de erro operacionais sanitizadas.  
**Dados sensiveis:** totais financeiros agregados, quantidade de lancamentos, periodo, base de calculo, nomes agregados de centro de custo/subtipo. Dados proibidos: contrapartes, usuarios, auditoria, motivos de edicao, lancamentos individuais, tokens e stack traces.  
**Autenticacao:** somente sessao BFF valida com cookie HttpOnly; token interno nunca exposto ao JavaScript do browser.  
**Autorizacao:** Laravel continua autoridade final por `Gate::allows('access-backoffice-area', 'treasury')` e `church_id`; checks do React nao substituem autorizacao backend.  
**Limites de payload e abuso:** usar apenas o contrato de fechamento existente, sem receber lista de lancamentos no frontend, sem recalculo local, sem endpoint de arquivo/PDF, e bloquear handoff quando detalhe nao estiver carregado e reconciliado.

| STRIDE | Pergunta adversarial | Mitigacao obrigatoria | Status |
| --- | --- | --- | --- |
| Spoofing | Um atacante pode se passar por tesoureiro, outro tenant ou API confiavel? | Consumir somente BFF, exigir cookie de sessao valido, repassar bearer interno apenas server-side e manter `Gate`/tenant scope no Laravel. | Coberto |
| Tampering | Parametros de periodo, detalhe ou labels agregadas podem ser alterados para produzir resumo enganoso? | Validar periodo no `FormRequest`, montar path com `URLSearchParams`, aceitar apenas `include_details` valido, usar totais do backend e normalizar labels antes de handoff. | Coberto |
| Repudiation | O usuario pode negar que preparou ou compartilhou o resumo? | Esta story nao confirma recebimento externo nem registra envio; sucesso significa apenas resumo preparado. Auditoria formal de envio fica fora do MVP e deve ser tratada em story futura se exigida. | Aceito no escopo |
| Information Disclosure | PII, tokens, detalhes de lancamentos ou erros internos podem vazar no texto, print ou resposta BFF? | Saida limitada a agregados reconciliados; proibido incluir contrapartes, usuarios, auditoria, motivos, IDs sensiveis ou lancamentos; BFF sanitiza erros e allowlista `422`/`409`. | Coberto |
| Denial of Service | Payloads grandes, recarregamentos ou APIs nativas podem degradar o fluxo? | Nao aceitar entradas de lancamentos no frontend, buscar detalhe uma vez pelo BFF do periodo atual, manter `cache: "no-store"` e nao criar geracao de arquivo servidor nesta story. | Coberto |
| Elevation of Privilege | Um usuario sem papel de tesouraria ou de outro tenant pode obter fechamento compartilhavel? | BFF exige sessao valida; Laravel valida permissao de tesouraria e `church_id`; UI apenas oculta/desabilita acoes, sem ser autoridade final. | Coberto |

### Negative Constraints

- Nunca gravar chaves de API, senhas, tokens ou segredos em texto claro.
- Nunca chamar Laravel diretamente do browser; todo acesso financeiro passa por `/api/finance/closing-summary`.
- Nunca registrar PII, tokens, payloads sensiveis ou stack traces em logs expostos.
- Nunca concatenar input em SQL, comandos shell, HTML raw ou caminhos de arquivo.
- Nunca gerar handoff com resumo vazio, inconsistente, recuperado apos falha, com pendencias abertas ou sem detalhes reconciliados quando as quebras forem obrigatorias.

### Security Sign-off

- **Status:** Aprovado com notas apos revalidacao dos gates de seguranca.
- **Auditor:** Vex - Security Auditor
- **Data:** 2026-07-29

## Tasks / Subtasks

- [x] Criar a camada de formato de handoff do fechamento sem nova regra financeira (AC: 1, 2, 3, 4, 5, 6, 11)
  - [x] Criar `church-erp-web/src/features/finance/closing-summary-handoff.ts` ou estender `closing-summary.ts` com tipos e helpers focados em apresentacao/exportacao.
  - [x] Definir `ClosingSummaryHandoffContent` com pelo menos `title`, `plain_text`, `print_sections`, `period_label`, `generated_at_label` e `source_summary`.
  - [x] Montar o texto a partir de `FinancialClosingSummary` e `details` existentes, mantendo os nomes de contrato em `snake_case` nos tipos de dados de entrada.
  - [x] Usar `formatDecimalAmountForDisplay` para valores monetarios; nao fazer aritmetica monetaria nova, nao somar arrays e nao recalcular `net_result`.
  - [x] Incluir no texto: periodo, receitas, despesas, resultado liquido, quantidade de lancamentos, base de calculo (`financial_entries.created_at`) e status da reconciliacao quando detalhes existirem.
  - [x] Exibir periodo como label legivel e explicito, derivado de `period_start` e `period_end`, com UTC identificado para evitar ambiguidade enquanto nao houver timezone por igreja.
  - [x] Incluir somente dados agregados seguros para lideranca: totais, quantidade de lancamentos, periodo, base de calculo, reconciliacao e quebras agregadas; excluir contrapartes, usuarios, motivos, auditoria e lancamentos individuais.
  - [x] Incluir linhas de detalhe obrigatoriamente quando vierem de `closing_summary.details` consistente; se nao houver detalhe confiavel, buscar pelo BFF antes de preparar a saida.
  - [x] Bloquear helper por meio de um input explicito de elegibilidade, como `ClosingSummaryHandoffEligibility`, contendo `summary_state`, `details_state`, `operational_status`, `pending_items_count` e `summary`; nao inferir estados de UI inexistentes apenas a partir de `FinancialClosingSummary`.
  - [x] Bloquear `empty_closing_summary`, `consistency_error`, `denied_or_session_invalid`, `server_error`, `stale_home_state_recovered`, detalhes inconsistentes, resumo sem payload completo e `pending_items_count > 0`, retornando estado de bloqueio e mensagem de proximo passo.

- [x] Integrar as acoes de copiar, compartilhar e imprimir na home da tesouraria (AC: 1, 4, 5, 6, 7, 8, 9, 10)
  - [x] Evoluir `church-erp-web/src/components/operational/closing-status-block.tsx` ou criar `church-erp-web/src/components/operational/closing-summary-handoff-actions.tsx` para expor acoes apos o fechamento estar pronto para revisar.
  - [x] Manter o fluxo dentro do bloco `ClosingStatusBlock`; nao criar rota paralela de relatorio, dashboard ou pagina de lideranca.
  - [x] Reutilizar `Button` e components existentes em `src/components/ui`; se for necessario menu/dropdown/dialog, adicionar primitive pequena e compativel com `shadcn/ui` em `src/components/ui` antes de compor o bloco operacional.
  - [x] Antes de exportar, se `details_state` nao estiver `closing_details_loaded`, solicitar `loadClosingDetails` com `include_details=true` usando `period_start` e `period_end` do resumo carregado.
  - [x] Se a busca de detalhes retornar `409` ou `consistency_error`, chamar a mesma promocao de erro usada na Story 3.2 e interromper a preparacao do handoff.
  - [x] Garantir que a acao fica desabilitada ou oculta em `loading_closing_summary`, `empty_closing_summary`, `consistency_error`, `denied_or_session_invalid`, `server_error`, `stale_home_state_recovered`, `pending_items_count > 0` e qualquer estado diferente de `status_pronto_para_revisar`.
  - [x] Manter `closingSummary`, `closingDetails` e `pendingItems` no estado atual apos retorno do handoff; nao limpar a home por sucesso de copia/partilha/impressao.

- [x] Implementar copia e fallback manual de texto (AC: 7, 10, 11)
  - [x] Criar uma acao `Copiar resumo` que use `navigator.clipboard.writeText(plain_text)` somente em evento de clique e trate Promise rejeitada.
  - [x] Em falha de clipboard ou contexto inseguro, renderizar dialog/sheet curto com `plain_text` selecionavel, foco inicial no titulo ou textarea readonly, `aria-describedby`, botao para tentar copiar novamente e orientacao objetiva.
  - [x] Exibir confirmacao especifica, por exemplo `Resumo preparado para enviar a lideranca.`, sem mensagem vaga.
  - [x] Nao usar `document.execCommand()` como caminho principal; se usado como fallback legado, deixar isolado e testado para nao quebrar navegacao.

- [x] Implementar compartilhamento nativo com fallback (AC: 8, 10, 11)
  - [x] Criar acao `Compartilhar` que use `navigator.share({ title, text })` quando disponivel e quando `navigator.canShare` nao existir ou nao rejeitar o payload textual.
  - [x] Tratar cancelamento do usuario (`AbortError`) como retorno normal ao fluxo, sem estado de erro vermelho.
  - [x] Quando Web Share nao existir ou falhar por suporte, direcionar para o mesmo fallback de copia manual.
  - [x] Nao integrar WhatsApp nativo, API externa, automacao de envio, deep link obrigatorio ou dependencia de aplicativo instalado nesta story.

- [x] Implementar visualizacao imprimivel do resumo (AC: 9, 10, 11)
  - [x] Criar `church-erp-web/src/components/operational/closing-summary-print-view.tsx` ou secao equivalente renderizada apenas quando o usuario escolhe imprimir.
  - [x] A visualizacao de impressao deve conter titulo, periodo, totais, quantidade de lancamentos, reconciliacao, detalhes disponiveis e rodape simples com data/hora de preparacao.
  - [x] Adicionar CSS de impressao em `church-erp-web/src/app/globals.css` ou classe especifica para esconder navegacao, botoes, formularios e blocos nao relacionados durante `@media print`.
  - [x] Chamar `window.print()` apos `print_view_ready` estar renderizado no DOM; usar ciclo controlado de React (`setState` -> render -> effect) para evitar imprimir tela incompleta.
  - [x] Retornar a UI ao estado operacional normal depois de `afterprint` quando suportado, sem perder o fechamento carregado.
  - [x] Adicionar fallback de limpeza por timeout curto e seguro para browsers que nao disparam `afterprint`, sem desmontar o resumo carregado.

- [x] Cobrir riscos principais com testes web e smoke (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
  - [x] Ampliar `church-erp-web/tests/financial-closing-summary.test.mjs` para validar que o texto de handoff usa `data.closing_summary` e `details` existentes sem depender de `financial_entries`, sem aceitar lista de lancamentos como input e sem conter padroes de agregacao local (`reduce`, `forEach`, loops sobre entries ou soma de `total_income`/`total_expense` fora do payload).
  - [x] Testar que o helper bloqueia `empty_closing_summary`, `consistency_error`, `denied_or_session_invalid`, erro tecnico, `stale_home_state_recovered` e `pending_items_count > 0`.
  - [x] Testar que a home busca `include_details=true&period_start=...&period_end=...` antes de preparar saida quando detalhes ainda nao estao carregados.
  - [x] Testar que `409 consistency_error` durante a busca de detalhes promove o fechamento principal para inconsistente e impede handoff.
  - [x] Testar fallback de clipboard indisponivel/rejeitado e tratamento de cancelamento do Web Share como fluxo nao fatal.
  - [x] Testar branching de Web Share quando `navigator.canShare` inexiste, retorna `true`, retorna `false` e quando `navigator.share` inexiste.
  - [x] Testar foco/semantica minima do fallback manual de copia.
  - [x] Testar que `window.print()` fica isolado em acao de usuario, acontece depois de `print_view_ready`, limpa modo print por `afterprint` ou fallback e que a view imprimivel nao contem controles de formulario/operacao.
  - [x] Executar `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke` em `church-erp-web`.
  - [x] Executar `php artisan test tests/Feature/Finance/FinancialClosingSummaryTest.php` em `church-erp-api` como regressao de contrato; executar suite backend completa se algum contrato Laravel for alterado.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story fecha o ciclo operacional da Epic 3 para o tesoureiro: gerar fechamento real, explicar os totais e preparar uma saida simples para a lideranca sem sair da home da tesouraria.
- A fonte confiavel ja existe nas Stories 3.1 e 3.2: `GET /api/finance/closing-summary` no BFF, encaminhando para `GET /api/v1/finance/closing-summary` no Laravel.
- O objetivo nao e criar relatorio contabilidade, PDF sofisticado, modulo BI, home da lideranca ou envio automatico. O MVP precisa de texto copiavel/partilhavel e uma versao imprimivel simples, coerente e rastreavel.
- "Preservar dados consolidados exibidos na tela" significa usar exatamente o payload carregado ou recarregado pelo BFF para o periodo atual; copy/print/share nao podem produzir outros totais.
- Como a Story 3.4 ainda nao entregou a home nem as permissoes de lideranca, a saida desta story deve ser segura por agregacao: compartilhar contexto suficiente para prestacao de contas, sem revelar detalhes operacionais sensiveis.

### Guardrails de implementacao obrigatorios

- O browser deve continuar consumindo apenas `/api/finance/closing-summary`; chamadas autenticadas ao Laravel passam pelo BFF.
- Nao criar endpoint novo para exportacao se o conteudo puder ser derivado do contrato existente de fechamento. Um endpoint novo so seria justificavel se a story pedisse persistencia formal de relatorio, arquivo servidor ou auditoria de envio, o que esta fora do escopo atual.
- Antes de preparar handoff com detalhes, garantir que `closing_summary.details.reconciliation.cost_center_status` e `subtype_status` sejam `consistent`.
- Se o fechamento retornar `409` ou `state = consistency_error`, bloquear exportacao/partilha/impressao e orientar recarregar ou corrigir a consistencia.
- Acoes de handoff so ficam disponiveis quando `buildClosingSummaryPresentation(...).operational_status` for exatamente `status_pronto_para_revisar`; pendencias abertas ou pendencias ainda nao carregadas bloqueiam o handoff.
- O texto compartilhavel deve ser deterministico para o mesmo payload, sem depender de locale do browser para escolher periodo ou recalcular datas.
- `generated_at_label` e metadado de preparacao, nao dado financeiro; testes de determinismo do conteudo financeiro devem ignorar esse campo ou recebe-lo por parametro controlado.
- O periodo exibido deve ser formatado por helper proprio em string explicita, por exemplo `Periodo: 01/06/2026 00:00 UTC a 07/06/2026 23:59 UTC`, sem depender de conversao silenciosa para timezone local.
- O periodo continua baseado em `financial_entries.created_at`, inclusivo em UTC, enquanto nao existir campo financeiro dedicado de competencia.
- A acao de handoff nao deve marcar fechamento como `done`, nem alterar `sprint-status.yaml`, nem criar estado de fechamento concluido no dominio. Isso pertence a story futura se houver fechamento formal.
- O sucesso da acao significa "resumo preparado/copiado para envio", nao confirmacao de que a lideranca recebeu ou leu.
- A UI deve preservar contexto apos copy/share/print; nao navegar para fora, nao desmontar a home e nao limpar o detalhe carregado.

### Abordagens proibidas

- Nao recalcular totais, net result, percentuais, agrupamentos ou reconciliacao no React.
- Nao buscar `financial_entries` recentes para montar exportacao.
- Nao criar `/reports`, `/dashboard`, `/export`, `/pdf` ou rota de Laravel paralela sem necessidade real desta story.
- Nao introduzir biblioteca de PDF, charts, BI, data grid, estado global ou analytics.
- Nao automatizar WhatsApp, email ou qualquer canal externo. O MVP faz handoff por copiar/partilhar/imprimir.
- Nao esconder `consistency_error` imprimindo apenas o consolidado.
- Nao compartilhar contrapartes, nomes de usuarios, motivos de auditoria, IDs internos sensiveis ou lancamentos individuais.
- Nao exibir JSON bruto para usuarios.
- Nao usar linguagem corporativa como "dashboard executivo", "performance financeira" ou "KPI" na UI final.
- Nao fazer a home da lideranca nem antecipar permissao `leadership` sobre detalhes nesta story.

### Arquivos provaveis a alterar ou criar

- `church-erp-web/src/features/finance/closing-summary.ts`
- `church-erp-web/src/features/finance/closing-summary-handoff.ts`
- `church-erp-web/src/components/operational/closing-status-block.tsx`
- `church-erp-web/src/components/operational/closing-summary-handoff-actions.tsx`
- `church-erp-web/src/components/operational/closing-summary-print-view.tsx`
- `church-erp-web/src/components/operational/treasury-home-shell.tsx`
- `church-erp-web/src/app/globals.css`
- `church-erp-web/src/components/ui/dialog.tsx`
- `church-erp-web/src/components/ui/button.tsx`
- `church-erp-web/tests/financial-closing-summary.test.mjs`
- `church-erp-web/tests/bff-smoke.test.mjs`
- `church-erp-api/tests/Feature/Finance/FinancialClosingSummaryTest.php` apenas para regressao ou se o contrato backend for tocado.

### Estados obrigatorios da UI ou do fluxo

- `handoff_idle`: fechamento confiavel disponivel, nenhuma acao de handoff em andamento.
- `preparing_handoff_details`: detalhes ainda nao carregados e a UI esta buscando `include_details=true`.
- `handoff_ready`: texto/print content gerado a partir de fechamento confiavel.
- `copy_in_progress`: `navigator.clipboard.writeText` em andamento.
- `copy_success`: texto copiado e contexto preservado.
- `copy_fallback_required`: Clipboard indisponivel ou rejeitado; mostrar texto selecionavel.
- `share_in_progress`: `navigator.share` em andamento.
- `share_success_or_returned`: handoff nativo aberto ou usuario retornou sem erro fatal.
- `share_fallback_required`: Web Share indisponivel ou nao suporta payload; usar fallback de copia.
- `print_view_ready`: visualizacao imprimivel renderizada antes de `window.print()`.
- `print_returned`: usuario voltou da impressao e a home permanece no mesmo contexto.
- `handoff_blocked_unreliable_summary`: fechamento vazio, inconsistente, negado ou com erro tecnico bloqueou a acao.
- `handoff_blocked_pending_items`: fechamento existe, mas ha pendencias operacionais abertas ou ainda nao conferidas.

### Requisitos tecnicos obrigatorios

- Backend alvo: PHP `^8.3`, Laravel `^12.0`, MySQL `8.4 LTS`. Frontend alvo: Next.js `16.2.3`, React `19.2.4`, TypeScript estrito e Tailwind CSS `^4`. [Source: `church-erp-api/composer.json`, `church-erp-web/package.json`]
- Manter Next.js App Router com Route Handlers em `src/app/api`; a story deve reutilizar `src/app/api/finance/closing-summary/route.ts` e `callLaravel` se precisar recarregar dados.
- Manter `cache: "no-store"` para leituras de fechamento pelo BFF.
- Contratos oficiais continuam em `snake_case`; tipos frontend devem espelhar payload Laravel em `snake_case`.
- O texto de handoff deve ser gerado a partir de `FinancialClosingSummary`, nao de elementos DOM renderizados nem scraping de texto da UI.
- `generated_at_label` pode ser horario da preparacao exibido apenas como metadata textual, recebido por parametro ou criado no momento da acao; ele nao participa da regra financeira, nao substitui `period_start`/`period_end` e deve ser isolado dos testes de determinismo financeiro.
- Clipboard API e Web Share API devem ser acessadas apenas em componentes client-side e dentro de handlers de acao do usuario.
- `navigator.share` exige suporte do browser e ativacao transiente do usuario; quando `navigator.canShare` estiver ausente, considerar `navigator.share` elegivel para payload textual simples e tratar rejeicao com fallback.
- `navigator.clipboard` exige contexto seguro e pode rejeitar permissao; manter fallback manual.
- `window.print()` abre dialog de impressao da pagina atual; renderizar a view imprimivel antes de chamar e testar que controles operacionais ficam escondidos em print CSS.

### Compliance de arquitetura

- Backend:
  - nao deve receber nova responsabilidade para montar arquivo ou relatorio se o contrato atual atende o MVP;
  - se qualquer alteracao backend for inevitavel, manter controller fino, `FormRequest`, `JsonResource`, `/api/v1` e escopo por `church_id`.
- Frontend:
  - BFF em `src/app/api`;
  - helpers de formato em `src/features/finance`;
  - acoes e print view em `src/components/operational`;
  - primitives em `src/components/ui`;
  - estilos globais de impressao em `src/app/globals.css` somente se forem transversais e pequenos.
- Produto:
  - manter a home da tesouraria como centro operacional;
  - handoff externo simples, sem integracao nativa;
  - linguagem clara, acolhedora e nao corporativa;
  - Teal Operacional e componentes existentes como base visual.

### Requisitos de teste

- Helper de handoff:
  - gera titulo e texto com periodo, receitas, despesas, resultado liquido, quantidade de lancamentos e base de calculo;
  - inclui detalhes obrigatoriamente quando `details` existe e reconciliacao esta consistente;
  - bloqueia estados vazios, inconsistentes, com pendencias, em recuperacao ou sem resumo confiavel;
  - nao aceita `financial_entries` como entrada e nao contem logica de agregacao local por `reduce`, `forEach`, loops sobre entries ou soma de totais financeiros fora do payload;
  - formata periodo com UTC explicito;
  - exclui dados granulares proibidos para lideranca.
- UI:
  - acoes aparecem apenas quando `operational_status = status_pronto_para_revisar` e o resumo e confiavel;
  - busca `include_details=true` antes de preparar handoff quando necessario;
  - `409 consistency_error` durante busca de detalhe promove o estado principal e bloqueia handoff;
  - copia usa `navigator.clipboard.writeText` e mostra fallback quando rejeitada;
  - compartilhar usa `navigator.share` quando suportado, trata `navigator.canShare` ausente como elegivel para texto simples e cai para copia quando nao suportado;
  - cancelamento de share nao vira erro tecnico;
  - fallback manual de copia tem foco gerenciado, label e texto selecionavel;
  - print view esconde controles e chama `window.print()` apos renderizar conteudo imprimivel, com cleanup por `afterprint` ou fallback;
  - retorno de copy/share/print preserva o resumo carregado e o detalhe.
- BFF/regressao:
  - `GET /api/finance/closing-summary?include_details=true&period_start=...&period_end=...` continua encaminhado sem renomear campos;
  - `409 consistency_error` continua preservado;
  - `401`, `403` e `5xx` continuam sanitizados;
  - `422` continua preservado para periodo invalido.
- Comandos minimos:
  - `cd church-erp-web && npm test`
  - `cd church-erp-web && npm run lint`
  - `cd church-erp-web && npm run typecheck`
  - `cd church-erp-web && npm run build:smoke`
  - `cd church-erp-api && php artisan test tests/Feature/Finance/FinancialClosingSummaryTest.php`

### Licoes de stories ou reviews anteriores

- A Story 3.1 corrigiu a tendencia a usar resumo mockado; esta story deve continuar usando somente fechamento real via BFF.
- A Story 3.2 mostrou que qualquer divergencia entre consolidado e detalhe precisa bloquear apresentacao confiavel; exportacao nao pode contornar esse bloqueio.
- Reviews anteriores encontraram bugs em validacao de data, refresh apos mutacao e estado visual otimista; por isso, esta story deve recarregar detalhe antes de exportar quando ele nao estiver confiavel e preservar estados honestos.
- A lista de lancamentos recentes e incompleta por design; nunca e fonte de exportacao.
- Estado recuperado apos falha pode preservar leitura anterior na tela, mas nao deve habilitar handoff como se estivesse atualizado.
- A Story 3.3 deve herdar a regra conservadora da Story 3.1: quando pendencias ainda nao foram carregadas, tratar o fechamento como "em conferencia" e nao compartilhar.

### Git Intelligence Summary

- `b62facc implementa a story 3.2` adicionou detalhes reconciliados, estado `consistency_error`, carregamento lazy de detalhes e testes BFF/UI. Esta story deve estender essa base, nao criar novo fluxo.
- `3417713 implementacao da story 3.1` criou a seam autoritativa `BuildFinancialClosingSummaryService`, o endpoint BFF e o contrato TypeScript de fechamento.
- `de3dd97 Merge pull request #15 from WesleyDenia/story_3_2` confirma que a Story 3.2 foi integrada antes desta story.
- O historico recente reforca o padrao de manter BMAD story file, sprint status, backend, BFF, UI e testes alinhados.

### Informacoes tecnicas atuais

- Next.js Route Handlers continuam sendo o padrao correto para BFF em `src/app/api`, usando Web Request/Response APIs e `NextResponse`.
- MDN registra Web Share API como recurso de disponibilidade limitada, seguro por HTTPS e dependente de acao de usuario; portanto, fallback de copiar e obrigatorio.
- MDN registra Clipboard API como assincrona, via `navigator.clipboard`, exigindo contexto seguro e sujeita a rejeicao de permissao; portanto, fallback manual e obrigatorio.
- MDN registra `window.print()` como amplamente disponivel e responsavel por abrir o dialog de impressao da pagina atual; o conteudo imprimivel deve estar renderizado antes da chamada.

### Project Structure Notes

- `church-erp-web/src/components/operational/treasury-home-shell.tsx` ja carrega consolidado e detalhe e possui callbacks para recarregar apos mutacao.
- `church-erp-web/src/components/operational/closing-status-block.tsx` ja centraliza o bloco de fechamento e recebe `details_state`, `details_summary` e `onRequestDetails`.
- `church-erp-web/src/components/operational/closing-detail-breakdown.tsx` ja renderiza `by_cost_center` e `by_subtype`; pode servir de referencia visual, mas nao deve ser fonte de texto por scraping.
- `church-erp-web/src/features/finance/closing-summary.ts` ja define `FinancialClosingSummary`, `ClosingSummaryDetails`, estados e helpers de apresentacao.
- `church-erp-web/src/components/ui` ainda tem primitives limitadas; adicionar apenas o necessario e manter sem dominio.
- `church-erp-api/app/Domain/Finance/Services/BuildFinancialClosingSummaryService.php` e a fonte da regra financeira; nao duplicar seu comportamento no web.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 3, Story 3.3 e restricoes frontend.
- `_bmad-output/planning-artifacts/prd.md` - FR-4 e exportacao/partilha simples do resumo.
- `_bmad-output/planning-artifacts/architecture.md` - Financial Closing Read Model, BFF, `snake_case`, fonte unica.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - `ClosingStatusBlock`, feedback, navegacao por home e linguagem operacional.
- `_bmad-output/project-context.md` - stack, BFF, componentes, testes e regras criticas.
- `_bmad-output/implementation-artifacts/3-1-gerar-resumo-de-fechamento-do-periodo.md`
- `_bmad-output/implementation-artifacts/3-2-exibir-detalhamento-por-centro-de-custo-e-subtipo.md`
- `church-erp-web/src/app/api/finance/closing-summary/route.ts`
- `church-erp-web/src/features/finance/closing-summary.ts`
- `church-erp-web/src/components/operational/treasury-home-shell.tsx`
- `church-erp-web/src/components/operational/closing-status-block.tsx`
- `church-erp-web/src/components/operational/closing-detail-breakdown.tsx`
- `church-erp-api/app/Domain/Finance/Services/BuildFinancialClosingSummaryService.php`
- Web: https://nextjs.org/docs/app/getting-started/route-handlers
- Web: https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API
- Web: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard
- Web: https://developer.mozilla.org/en-US/docs/Web/API/Window/print

### Checklist pre-review

- Handoff usa somente `FinancialClosingSummary` vindo do BFF e estado de elegibilidade explicito vindo da UI.
- Detalhes sao buscados com `include_details=true` antes da preparacao quando nao estao carregados.
- Nenhum total, percentual, agrupamento ou reconciliacao e recalculado no React.
- `consistency_error` bloqueia copiar, compartilhar e imprimir.
- `409 consistency_error` recebido durante preparacao promove o estado principal e bloqueia handoff.
- Estado vazio nao gera saida fabricada.
- Pendencias abertas ou pendencias ainda nao carregadas bloqueiam handoff.
- Saida exclui contrapartes, usuarios, auditoria, motivos, IDs sensiveis e lancamentos individuais.
- Periodo aparece com UTC explicito e formato legivel.
- `generated_at_label` nao participa da regra financeira nem dos testes de determinismo do payload.
- Clipboard tem fallback manual.
- Fallback manual tem foco gerenciado, label e texto selecionavel.
- Web Share tem fallback para copia, `canShare` ausente e tratado corretamente, e cancelamento nao vira erro tecnico.
- Print view esconde controles operacionais, chama `window.print()` apos renderizar e limpa modo print por `afterprint` ou fallback.
- Copy/share/print preservam contexto da home.
- Nenhuma rota paralela de dashboard/report/export foi criada sem necessidade.
- Contratos continuam em `snake_case`.
- Browser nao chama Laravel diretamente.
- Linguagem da saida e pastoral, clara e nao corporativa.
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run build:smoke` e regressao backend indicada passam.

### Story Completion Status

- Status alvo desta story para entrada em implementacao: `ready-for-dev`
- Nota de conclusao do contexto: `Ultimate context engine analysis completed - comprehensive developer guide created`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cd church-erp-web && npm test -- tests/financial-closing-summary.test.mjs` - RED inicial falhou por arquivos de handoff ausentes; apos implementacao passou com 53 testes.
- `cd church-erp-web && npm run typecheck` - passou.
- `cd church-erp-web && npm run lint` - passou.
- `cd church-erp-web && npm test` - passou com 53 testes.
- `cd church-erp-web && npm run build:smoke` - passou.
- `cd church-erp-api && php artisan test tests/Feature/Finance/FinancialClosingSummaryTest.php` - passou com 11 testes e 135 assertions.

### Completion Notes List

- Criada camada `closing-summary-handoff.ts` com elegibilidade explicita, periodo UTC legivel, conteudo textual/print e bloqueios conservadores sem recalcular totais, percentuais, agrupamentos ou reconciliacao.
- Integradas acoes `Copiar resumo`, `Compartilhar` e `Imprimir` dentro do `ClosingStatusBlock`, preservando a home da tesouraria e buscando detalhes pelo BFF antes do handoff quando necessario.
- Implementados fallback manual acessivel para clipboard/share, tratamento normal de cancelamento do Web Share e visualizacao imprimivel renderizada antes de `window.print()`.
- Mantida a promocao existente de `409 consistency_error` para o fechamento principal durante a busca de detalhes.
- Ampliados testes web para helper, bloqueios, Web Share branching, fallback/foco por inspecao de fonte, print flow e guardrails contra agregacao local.

### File List

- `_bmad-output/implementation-artifacts/3-3-compartilhar-ou-exportar-o-resumo-de-fechamento.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `church-erp-web/src/features/finance/closing-summary-handoff.ts`
- `church-erp-web/src/components/operational/closing-summary-handoff-actions.tsx`
- `church-erp-web/src/components/operational/closing-summary-print-view.tsx`
- `church-erp-web/src/components/operational/closing-status-block.tsx`
- `church-erp-web/src/components/operational/treasury-home-shell.tsx`
- `church-erp-web/src/app/globals.css`
- `church-erp-web/tests/financial-closing-summary.test.mjs`

### Change Log

- 2026-07-27: Implementado handoff de fechamento por copiar, compartilhar e imprimir com testes web e regressao backend.
