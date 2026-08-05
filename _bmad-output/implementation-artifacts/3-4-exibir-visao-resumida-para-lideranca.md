# Story 3.4: Exibir visao resumida para lideranca

Status: done

<!-- Security gate required: this story touches authorization, tenant isolation, BFF session handling and financial data. Run /bmad-review-security before dev-story or any ready-for-dev promotion. -->

## Story

As a lider da igreja,
I want acessar uma home da lideranca com resumo executivo em blocos derivado do fechamento consolidado ja confiavel,
so that eu entenda a situacao atual sem entrar em detalhe operacional nem depender de leitura paralela ou dashboard generico.

## Acceptance Criteria

1. Dado que as Stories 3.1, 3.2 e 3.3 ja entregaram fechamento consolidado, detalhamento reconciliado e handoff seguro, quando um usuario com perfil `leadership` abre `/leadership`, entao a home da lideranca carrega uma leitura executiva a partir da mesma regra de agregacao de `BuildFinancialClosingSummaryService`, sem query financeira paralela, sem mock e sem recalculo no frontend.
2. Dado que o fechamento do periodo retorna `state = closing_summary_loaded`, sem `consistency_error`, quando a home da lideranca e exibida, entao ela mostra blocos resumidos com periodo, receitas, despesas, resultado liquido, quantidade de lancamentos, base de calculo e status de confianca do fechamento em linguagem clara e nao corporativa.
3. Dado que o lider precisa de profundidade opcional, quando aciona aprofundamento previsto na home, entao o sistema carrega `include_details=true` pelo BFF usando o periodo do resumo atual ou do modo de conferencia validado, e exibe apenas agregados reconciliados por centro de custo/subtipo, sem contrapartes, usuarios, auditoria, motivos de edicao, IDs sensiveis ou lancamentos individuais.
4. Dado que ainda nao existe fechamento consolidado confiavel para o periodo, quando a home da lideranca abre, entao o sistema apresenta estado contextual para `empty_closing_summary`, `consistency_error`, erro tecnico, sessao invalida ou leitura recuperada, sem inventar resumo executivo generico e sem usar totais antigos como se fossem atuais.
5. Dado que um usuario tenta acessar `/leadership` ou a leitura executiva de fechamento, quando a verificacao de area e executada, entao `leadership` e `administrator` conseguem carregar a home e o endpoint de leitura executiva; `treasurer`, `secretary` e usuario sem sessao recebem negacao apropriada.
6. Dado que o perfil `leadership` deve ter leitura resumida e nao operacao diaria, quando a home e renderizada, entao ela nao exibe formulario de lancamento, edicao financeira, resolucao de pendencias, historico de auditoria, botoes de tesouraria ou handoff como acao principal.
7. Dado que a rota de leitura da lideranca depende do fechamento financeiro, quando o BFF chama Laravel, entao o browser continua chamando apenas Next.js, o token interno nao e exposto ao JavaScript, contratos permanecem em `snake_case`, `cache: "no-store"` e respostas `401`, `403`, `409`, `422` e `5xx` sao tratadas sem vazar stack trace; em `401` do Laravel ou sessao local invalida, o cookie de sessao do BFF deve ser limpo.
8. Dado que o detalhamento carregado para lideranca retorna `409` ou `state = consistency_error`, quando a UI recebe a resposta, entao ela promove a leitura principal para estado inconsistente e bloqueia aprofundamento executivo confiavel ate recarregar ou corrigir a origem.
9. Dado que os dados operacionais de pessoas, secretaria e comunicacao ainda nao foram entregues nesta etapa do backlog, quando a home representar estado operacional alem de financas, entao ela deve renderizar um bloco `operational_signals_unavailable` com titulo, resumo curto e proximo passo textual informando que a leitura operacional sera completada apos as entregas de pessoas/comunicacao, sem criar dados, endpoints ou componentes ficticios.
10. Dado que a home deve ser responsiva e acessivel, quando usada em desktop, tablet ou mobile, entao os blocos mantem hierarquia clara, foco visivel, navegacao por teclado, contraste adequado, labels explicitos e estados de loading/empty/error sem depender apenas de cor.
11. Dado que o resumo consolidado inicial carrega sem detalhe, quando a home e aberta, entao o status de confianca inicial deve ser `consolidado_carregado` para `closing_summary_loaded`; somente apos detalhe reconciliado carregado sob demanda o status pode mudar para `detalhe_reconciliado`.
12. Dado que a home precisa ter conteudo executivo real, quando renderizada com resumo carregado, entao ela deve exibir pelo menos os blocos "Fechamento do periodo", "Confianca da leitura" e "Sinais operacionais", com conteudo derivado do estado atual e sem permanecer como placeholder textual.
13. Dado que a lideranca precisa conferir um periodo especifico, quando seleciona o modo de conferencia, entao o BFF e o Laravel aceitam `period_start` e `period_end` somente em par, em UTC, sem datas futuras, com janela maxima de 31 dias corridos e retroatividade maxima de 12 meses; parametros `church_id`, `user_id` ou qualquer escopo sensivel vindo do browser sao rejeitados com `422`.

## Tasks / Subtasks

- [x] Criar o caminho de leitura segura para a home da lideranca sem duplicar a regra financeira (AC: 1, 3, 5, 7, 8)
  - [x] Criar obrigatoriamente o BFF dedicado `church-erp-web/src/app/api/leadership/closing-summary/route.ts` chamando obrigatoriamente o endpoint Laravel dedicado `GET /api/v1/leadership/closing-summary`.
  - [x] O BFF de lideranca deve aceitar somente `include_details=true|false|1|0`, `period_start` e `period_end`; `period_start` e `period_end` devem vir sempre em par, como timestamps UTC validos, sem datas futuras, com janela maxima de 31 dias corridos e retroatividade maxima de 12 meses.
  - [x] O BFF de lideranca deve rejeitar com `422` qualquer query `church_id`, `user_id`, role, permissao, tenant ou outro parametro de escopo recebido do browser; o tenant permanece exclusivamente na sessao autenticada.
  - [x] O endpoint Laravel dedicado deve retornar o mesmo shape de sucesso de fechamento: `200 { data: { closing_summary: FinancialClosingSummary } }`, resolver o periodo operacional atual quando datas nao forem informadas, validar o mesmo limite de conferencia quando `period_start`/`period_end` forem informados, preservar `422` de periodo invalido, preservar `409` com `data.closing_summary` sanitizado quando houver `consistency_error`, retornar `401` para sessao invalida, `403` para papel nao permitido e sanitizar `5xx` no BFF.
  - [x] Reutilizar `BuildFinancialClosingSummaryService`, `ResolveClosingSummaryPeriod` e `FinancialClosingSummaryResource`; nao criar servico de agregacao paralelo para lideranca.
  - [x] Se um novo `FormRequest` Laravel for necessario, extrair/reaproveitar validacao de periodo e `include_details`, adicionando regras especificas de conferencia da lideranca: par obrigatorio de datas, UTC estrito, maximo de 31 dias, retroatividade maxima de 12 meses, sem datas futuras e rejeicao de parametros de escopo.
  - [x] Autorizar a leitura apenas para papeis `leadership` e `administrator`, mantendo `treasury` separado de `leadership` em `ResolveBackofficeAreaAccessService`; `administrator` acessa esta leitura para verificacao operacional, mas nao ganha permissao de tesouraria.
  - [x] Autorizar o modo de conferencia com capability/Gate explicito `view-leadership-period-summary`, sem reutilizar permissao de tesouraria e sem liberar endpoints operacionais de financas.
  - [x] Preservar `church_id` da sessao autenticada em toda consulta e nunca aceitar `church_id` vindo do browser.
  - [x] Manter `cache: "no-store"`, sanitizacao de erros, limpeza do cookie de sessao em `401` e preservacao de `409 consistency_error` no BFF.
  - [x] Registrar log tecnico de acesso ao modo de conferencia com `user_id`, `church_id`, `period_start`, `period_end`, resultado e motivo de negacao quando houver, sem gravar payload financeiro detalhado, token, headers de auth ou stack trace.
  - [x] Aplicar limite anti-abuso na leitura de lideranca: modo padrao no periodo operacional atual, modo de conferencia limitado a 31 dias e 12 meses de retroatividade, sem janela historica arbitraria, e middleware/rate limit coerente com as demais rotas autenticadas de leitura sensivel.

- [x] Implementar a camada de apresentacao executiva da lideranca no frontend (AC: 1, 2, 3, 4, 6, 9, 10)
  - [x] Criar `church-erp-web/src/features/leadership/leadership-summary.ts` ou equivalente para tipos e helpers de apresentacao, usando `FinancialClosingSummary` como entrada.
  - [x] Criar `church-erp-web/src/components/operational/leadership-home-shell.tsx` para carregar estado inicial, detalhes opcionais e erros.
  - [x] Criar `church-erp-web/src/components/operational/leadership-summary-block.tsx` como composicao operacional sobre `Surface`, `Button` e primitives existentes.
  - [x] Atualizar `church-erp-web/src/app/leadership/page.tsx` para manter `AreaGuard area="leadership"` e renderizar a shell real.
  - [x] Mostrar periodo, totais, resultado liquido, quantidade de lancamentos, base de calculo e confianca/reconciliacao sem usar termos como dashboard, KPI ou performance.
  - [x] Representar estado operacional disponivel de forma honesta: usar o estado do fechamento e renderizar o bloco `operational_signals_unavailable` quando nao houver fonte real de People/Operations/Communications.
  - [x] A home carregada deve conter pelo menos tres blocos executivos: "Fechamento do periodo", "Confianca da leitura" e "Sinais operacionais"; nao basta trocar o texto do placeholder atual.
  - [x] Nao usar `closing-summary-handoff.ts`, `ClosingSummaryHandoffActions` ou formatter de handoff como conteudo principal da home; a lideranca precisa de apresentacao propria, nao do texto de envio da tesouraria.

- [x] Implementar profundidade opcional controlada (AC: 3, 6, 8)
  - [x] Expor acao secundaria clara para carregar detalhes agregados, sem parecer fluxo de edicao ou revisao da tesouraria.
  - [x] Buscar detalhes com `include_details=true` usando o mesmo periodo do resumo carregado; se houver periodo de conferencia, reenviar `period_start`/`period_end` apenas dentro dos limites validados pelo BFF e Laravel.
  - [x] Exibir somente `details.by_cost_center`, `details.by_subtype` e `details.reconciliation` quando ambos os status de reconciliacao forem `consistent`.
  - [x] Bloquear ou esconder detalhes quando estado for `empty_closing_summary`, `consistency_error`, `denied_or_session_invalid`, `server_error` ou leitura recuperada.
  - [x] Criar somente modo de conferencia por periodo limitado, sem filtros historicos livres ou comparativo entre periodos; a UI deve tratar divergencia de periodo retornado no detalhe como leitura indisponivel.
  - [x] Definir status de confianca: `consolidado_carregado` quando apenas `closing_summary_loaded` esta disponivel; `detalhe_reconciliado` apenas quando `details.reconciliation.cost_center_status` e `subtype_status` forem `consistent`; `leitura_indisponivel` para vazio, erro, negado, inconsistente ou leitura recuperada.
  - [x] Nao reutilizar `ClosingSummaryHandoffActions` como acao primaria da lideranca; copiar/compartilhar/imprimir continuam sendo fluxo do tesoureiro da Story 3.3.

- [x] Garantir autorizacao, privacidade e isolamento por tenant (AC: 5, 6, 7)
  - [x] Adicionar ou ajustar testes backend para provar que `leadership` e `administrator` conseguem ler o resumo permitido, mas nao ganham acesso a lancamento, edicao, auditoria ou areas de tesouraria por causa desta leitura.
  - [x] Provar que `treasurer` e `secretary` recebem `403` na rota de lideranca, e usuario sem sessao recebe `401`.
  - [x] Provar que dados de outro `church_id` nao entram no resumo da lideranca.
  - [x] Provar que o modo de conferencia exige `view-leadership-period-summary` e nao concede permissao de tesouraria operacional.
  - [x] Provar que acessos e negacoes do modo de conferencia geram log tecnico sem payload financeiro detalhado, token, headers de auth ou stack trace.
  - [x] Garantir que respostas de erro nao retornam tokens, excecoes, stack traces ou payloads sensiveis.

- [x] Cobrir a experiencia com testes web e smoke (AC: 1-10)
  - [x] Criar `church-erp-web/tests/leadership-summary.test.mjs` ou ampliar os testes existentes para helper, estados e source inspection.
  - [x] Testar que a shell da lideranca busca somente `/api/leadership/closing-summary`, nunca Laravel direto.
  - [x] Testar por contrato de entrada e source inspection escopada que helpers de lideranca nao recebem `financial_entries`, nao chamam endpoints de entradas financeiras e nao calculam `total_income`, `total_expense`, `net_result` ou reconciliacao; loops sobre `details.by_cost_center`/`details.by_subtype` sao permitidos apenas para exibicao.
  - [x] Testar estados `loading`, `closing_summary_loaded`, `empty_closing_summary`, `consistency_error`, `denied_or_session_invalid`, `server_error` e leitura recuperada.
  - [x] Testar que o detalhe opcional usa `include_details=true`, preserva o periodo do resumo carregado, promove `409 consistency_error` e nao exibe agregados inconsistentes.
  - [x] Testar que o BFF de lideranca aceita `period_start`/`period_end` validos para conferencia e rejeita datas incompletas, formato invalido, datas futuras, janela acima de 31 dias, retroatividade acima de 12 meses, `church_id`, `user_id` e parametros de escopo com `422`.
  - [x] Testar que a pagina de lideranca nao importa `TreasuryEntryForm`, `ClosingSummaryHandoffActions`, `closing-summary-handoff.ts` ou componentes de operacao diaria.
  - [x] Testar renderizacao estrutural dos blocos "Fechamento do periodo", "Confianca da leitura" e "Sinais operacionais" com resumo carregado.
  - [x] Executar `cd church-erp-web && npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke`.
  - [x] Executar testes backend focados na rota de lideranca e `cd church-erp-api && php artisan test tests/Feature/Finance/FinancialClosingSummaryTest.php` se o contrato compartilhado for tocado.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story entrega a primeira home real da lideranca. Ela deve dar leitura rapida e confiavel do periodo sem transformar o lider em operador da tesouraria.
- O eixo de confianca ja foi implementado na Epic 3: consolidado real (3.1), detalhamento reconciliado (3.2) e handoff seguro para lideranca (3.3).
- A home da lideranca deve consumir a mesma fonte de verdade do fechamento, mas com linguagem, permissao e profundidade adequadas ao papel `leadership`.
- "Estado operacional" nao autoriza criar dados ficticios de secretaria, pessoas, comunicacao ou aprovacoes antes das stories desses dominios. Quando nao houver fonte real, mostrar estado contextual honesto.
- O objetivo nao e criar BI, analytics, dashboard generico, PDF, graficos, relatorio contabil, aprovacao formal, notificacao de responsavel ou nova regra financeira.

### Guardrails de implementacao obrigatorios

- Reusar `BuildFinancialClosingSummaryService`; nao copiar SQL, nao somar entradas no frontend, nao montar nova consulta agregada para lideranca.
- Nao liberar `leadership` para a area `treasury` apenas para reutilizar endpoint existente. O lider pode ter leitura financeira resumida, mas nao acesso operacional de tesouraria.
- Liberar `administrator` para a home de lideranca e para o endpoint de leitura executiva, porque o administrador do sistema precisa verificar inconsistencias; essa liberacao nao pode conceder acesso operacional de tesouraria.
- Browser chama apenas BFF Next.js. Se houver novo endpoint Laravel, ele deve ser chamado apenas server-side por route handler.
- Browser pode escolher somente periodo de conferencia limitado para a rota de lideranca. `period_start` e `period_end` devem passar pela mesma validacao no BFF e no Laravel; `church_id`, `user_id` e qualquer escopo sensivel vindo do browser devem ser rejeitados.
- Modo de conferencia exige capability/Gate explicito `view-leadership-period-summary`; nao reutilizar permissao de tesouraria para historico de lideranca.
- Acessos e negacoes no modo de conferencia devem gerar log tecnico minimo com usuario, tenant, periodo e resultado, sem payload financeiro detalhado ou segredos.
- Contratos HTTP oficiais continuam em `snake_case`; tipos TypeScript devem espelhar payload Laravel.
- Detalhes so podem aparecer quando vierem de `details` reconciliado do backend. Se `cost_center_status` ou `subtype_status` for `inconsistent`, bloquear a leitura profunda.
- A leitura de lideranca deve abrir no periodo operacional atual resolvido server-side e permitir apenas periodo de conferencia limitado. Nao criar historico livre, comparativo entre periodos ou janela customizada sem limites nesta story.
- `stale_home_state_recovered` pode preservar leitura anterior na tela com aviso, mas nao pode apresentar o estado como atual/confiavel.
- `leadership_stale_state_recovered` so existe apos uma leitura bem-sucedida anterior mantida em estado local da `LeadershipHomeShell`; nao persistir essa leitura em storage, nao reidratar de cache e nao habilitar detalhe nesse estado.
- A UI deve ter blocos executivos, nao cards decorativos. Cada bloco precisa responder: o que esta sendo lido, por que e confiavel, e o que significa para a lideranca.
- Usar componentes existentes em `src/components/ui`, `Surface` e composicoes em `src/components/operational`; adicionar primitive nova somente se realmente necessaria.

### Abordagens proibidas

- Nao criar `DashboardCard`, `LeadershipDashboard`, `KpiWidget`, grafico ou biblioteca de charts.
- Nao buscar `financial_entries`, auditorias ou listas de contrapartes para montar a home.
- Nao chamar Laravel diretamente do browser.
- Nao calcular `total_income`, `total_expense`, `net_result`, percentuais ou reconciliacao no React.
- Nao expor nomes de contrapartes, usuarios, motivos de edicao, auditoria, IDs internos sensiveis ou lancamentos individuais.
- Nao incluir formulario de lancamento, edicao financeira, resolucao de pendencia ou botoes de operacao diaria.
- Nao reutilizar texto, helpers ou formato de handoff da Story 3.3 como apresentacao principal da home da lideranca.
- Nao introduzir Zustand/Redux/global state, PDF, analytics, cache distribuido, fila ou integracao externa.
- Nao criar filtros historicos livres ou comparativo entre periodos nesta story.
- Nao aceitar `period_start`/`period_end` fora do modo de conferencia validado; ausencia de seletor visual nao substitui validacao server-side.
- Nao usar linguagem corporativa como "dashboard executivo", "KPI", "performance financeira" ou "business intelligence" na UI.

### Arquivos provaveis a alterar ou criar

- `church-erp-web/src/app/leadership/page.tsx`
- `church-erp-web/src/app/api/leadership/closing-summary/route.ts`
- `church-erp-web/src/features/leadership/leadership-summary.ts`
- `church-erp-web/src/components/operational/leadership-home-shell.tsx`
- `church-erp-web/src/components/operational/leadership-summary-block.tsx`
- `church-erp-web/src/components/operational/closing-detail-breakdown.tsx` apenas se for extraida uma versao segura/reutilizavel para agregados
- `church-erp-web/tests/leadership-summary.test.mjs`
- `church-erp-web/tests/bff-smoke.test.mjs`
- `church-erp-api/routes/api.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ShowLeadershipClosingSummaryController.php`
- `church-erp-api/app/Http/Requests/ShowLeadershipClosingSummaryRequest.php`
- `church-erp-api/app/Domain/Finance/Support/*` se for extraida validacao/periodo compartilhada
- `church-erp-api/tests/Feature/Finance/LeadershipClosingSummaryTest.php`

### Estados obrigatorios da UI ou do fluxo

- `loading_leadership_summary`: carregando leitura executiva pelo BFF.
- `leadership_summary_loaded`: resumo confiavel carregado sem detalhe profundo.
- `loading_leadership_details`: buscando detalhe agregado com `include_details=true`.
- `leadership_details_loaded`: detalhe agregado reconciliado disponivel.
- `empty_leadership_summary`: nao ha movimentos reais para o periodo.
- `leadership_consistency_error`: backend retornou `409` ou `state = consistency_error`; bloquear leitura confiavel.
- `leadership_denied_or_session_invalid`: sessao invalida ou papel sem acesso.
- `leadership_server_error`: erro tecnico sanitizado.
- `leadership_stale_state_recovered`: leitura anterior preservada apos falha, com aviso de que nao esta atualizada.
- `operational_signals_unavailable`: blocos operacionais alem de financas ainda nao possuem fonte real no MVP atual.
- `consolidado_carregado`: status de confianca exibido quando `closing_summary_loaded` foi carregado sem detalhe reconciliado.
- `detalhe_reconciliado`: status de confianca exibido somente apos detalhe carregado com reconciliacao consistente.
- `leitura_indisponivel`: status de confianca para vazio, negado, erro, inconsistencia ou leitura recuperada.

### Requisitos tecnicos obrigatorios

- Backend alvo: PHP `^8.3`, Laravel `^12.0`, MySQL `8.4 LTS`. Frontend alvo atual do repo: Next.js `^16.2.12`, React `19.2.4`, TypeScript estrito e Tailwind CSS `^4`. [Source: `church-erp-api/composer.json`, `church-erp-web/package.json`]
- Next.js App Router Route Handlers continuam sendo o padrao para BFF em `src/app/api`; usar `NextResponse` e `callLaravel`.
- Manter `cache: "no-store"` nas chamadas de leitura sensivel, mesmo que Route Handlers atuais nao sejam cacheados por padrao, porque o projeto usa esse guardrail de forma consistente.
- Laravel 12 suporta Gates e Policies; usar o padrao existente de `Gate`/`Response` para autorizacao backend, nao checks manuais espalhados no controller.
- Se criar endpoint Laravel novo, manter `/api/v1`, controller fino, `FormRequest`, `JsonResource`, middleware `resolve.internal.session` e leitura de `church_id` somente da sessao autenticada.
- O endpoint Laravel novo e obrigatorio nesta story: `GET /api/v1/leadership/closing-summary`. Ele deve compartilhar recurso/servico com financas, mas nao compartilhar a autorizacao de tesouraria.
- O modo de conferencia deve ser protegido por capability/Gate `view-leadership-period-summary`; a leitura padrao da home continua coberta pela autorizacao de acesso a area `leadership`.
- O endpoint Laravel de lideranca deve usar `ResolveClosingSummaryPeriod::currentOperationalWeek()` quando nenhum periodo for informado e `ResolveClosingSummaryPeriod::custom()` somente apos validar regras de conferencia: par de datas, UTC estrito, maximo de 31 dias, retroatividade maxima de 12 meses e ausencia de datas futuras.
- O BFF de lideranca deve sanitizar e negar parametros de escopo antes de chamar Laravel. Se `church_id`, `user_id`, role, permissao ou tenant forem recebidos do browser, responder `422` sem repassar a chamada.
- A rota de lideranca deve ter protecao anti-abuso compativel com leitura financeira sensivel: janela limitada no backend, retroatividade limitada e rate limit/middleware documentado em teste ou configuracao.
- `FinancialClosingSummaryResource` continua o shape oficial do resumo: `data.closing_summary` com `period_start`, `period_end`, `total_income`, `total_expense`, `net_result`, `entry_count`, `calculation_basis` e `details` opcional.
- Periodo deve permanecer baseado em `financial_entries.created_at` inclusivo em UTC enquanto nao existir competencia financeira dedicada.
- Toda exibicao monetaria deve usar helper existente como `formatDecimalAmountForDisplay`.

### Compliance de arquitetura

- Backend:
  - regra financeira em `app/Domain/Finance/Services/BuildFinancialClosingSummaryService.php`;
  - controllers em `app/Http/Controllers/Api/V1`;
  - requests em `app/Http/Requests`;
  - recursos em `app/Http/Resources`;
  - tenant sempre por `church_id` da sessao.
- Frontend:
  - BFF em `src/app/api`;
  - pagina em `src/app/leadership/page.tsx`;
  - helpers por feature em `src/features/leadership` ou `src/features/finance`;
  - blocos de produto em `src/components/operational`;
  - primitives continuam domain-agnostic em `src/components/ui`.
- UX:
  - home por perfil e blocos operacionais como objeto dominante;
  - Teal Operacional e tokens existentes;
  - linguagem pastoral, direta e nao corporativa;
  - profundidade opcional sem sobrecarregar a primeira leitura.

### Requisitos de teste

- Backend:
  - `leadership` e `administrator` conseguem carregar resumo permitido com `church_id` correto.
  - Usuario sem sessao recebe `401`; papel sem acesso recebe `403`.
  - `leadership` e `administrator` nao ganham permissao de tesouraria operacional nem acesso a endpoints de criacao/edicao/auditoria por causa desta leitura.
  - `include_details=true` retorna detalhes apenas agregados e reconciliados; divergencia retorna `409 consistency_error`.
  - Outro tenant nao aparece no resultado.
- BFF:
  - route handler de lideranca chama Laravel server-side via `callLaravel`.
  - `include_details`, `period_start` e `period_end` validos sao encaminhados por `URLSearchParams`; `church_id`, `user_id` e escopos sensiveis vindos do browser sao negados com `422`.
  - `401`, `403`, `422`, `409` e `5xx` sao tratados/sanitizados de forma consistente.
  - cookie de sessao e limpo quando o BFF nao encontra token local valido ou quando o Laravel retorna `401`.
- Frontend:
  - helper de apresentacao usa `FinancialClosingSummary`; nao aceita lista de entradas.
  - source inspection e testes de contrato bloqueiam agregacao financeira local, mas permitem iteracao sobre agregados ja reconciliados para renderizacao.
  - shell busca BFF, renderiza todos os estados obrigatorios e preserva leitura anterior somente com aviso.
  - detalhe opcional preserva o periodo do resumo carregado; se o detalhe retornar periodo diferente, a UI bloqueia a leitura profunda e apresenta leitura indisponivel.
  - pagina de lideranca nao importa componentes de operacao da tesouraria nem handoff.
  - resumo carregado renderiza os blocos executivos minimos, com labels e conteudo verificaveis por teste.
- Comandos minimos:
  - `cd church-erp-web && npm test`
  - `cd church-erp-web && npm run lint`
  - `cd church-erp-web && npm run typecheck`
  - `cd church-erp-web && npm run build:smoke`
  - `cd church-erp-api && php artisan test tests/Feature/Finance/LeadershipClosingSummaryTest.php`
  - `cd church-erp-api && php artisan test tests/Feature/Finance/FinancialClosingSummaryTest.php` se contrato compartilhado for alterado

### Licoes de stories ou reviews anteriores

- A Story 3.1 eliminou resumo mockado e estabeleceu o BFF/servico backend como fonte autoritativa do fechamento.
- A Story 3.2 estabeleceu que divergencia entre consolidado e detalhe e falha grave, nao problema visual; a lideranca nao pode ver uma leitura confiavel quando o backend retornou inconsistencia.
- A Story 3.3 reforcou que dados para lideranca devem ser agregados e seguros, sem contrapartes, auditoria, motivos, usuarios ou lancamentos individuais.
- Reviews anteriores apontaram riscos em validacao de periodo, refresh apos mutacao e estados otimistas; esta story deve manter estados honestos e nao apresentar leitura recuperada como atual.
- O historico recente usa testes de source inspection para impedir agregacao local no frontend; repetir esse padrao para a home da lideranca.

### Git Intelligence Summary

- `3862715 implementa a story 3.3` adicionou `closing-summary-handoff.ts`, `ClosingSummaryHandoffActions`, print view e ampliou testes de BFF/finance; a home da lideranca deve consumir o mesmo contrato, mas nao reutilizar handoff como fluxo principal.
- `b62facc implementa a story 3.2` adicionou detalhes reconciliados, `include_details=true`, promocao de `409 consistency_error` e `ClosingDetailBreakdown`; esta story deve reaproveitar a regra de consistencia.
- `61ac565 Merge pull request #14 from WesleyDenia/story_3_1` introduziu `BuildFinancialClosingSummaryService`, `FinancialClosingSummaryResource` e `/api/finance/closing-summary`; esta story deve estender essa fonte de verdade, nao substitui-la.
- O repo esta limpo antes da criacao desta story; preservar alteracoes futuras nao relacionadas.

### Informacoes tecnicas atuais

- A documentacao atual do Next.js App Router registra Route Handlers em `app` como o mecanismo de BFF/API do App Router e indica que GET Route Handlers atuais nao sao cacheados por padrao, embora possam optar por cache; o projeto deve manter `cache: "no-store"` por consistencia defensiva.
- A documentacao do Laravel 12 descreve Gates e Policies como os mecanismos oficiais de autorizacao; Gates se aplicam bem a acoes que nao sao um recurso Eloquent especifico, como acesso a uma area ou leitura executiva por perfil.

### Threat Modeling - STRIDE

**Escopo:** Story 3.4 - home da lideranca com leitura resumida de fechamento financeiro por BFF dedicado.
**Fronteiras de confianca:** browser do usuario, BFF Next.js, API Laravel, sessao interna autenticada, banco MySQL multi-tenant.
**Entradas:** acesso a `/leadership`, chamada browser -> `/api/leadership/closing-summary`, query `include_details`, par opcional `period_start`/`period_end` para modo de conferencia, cookie de sessao HttpOnly.
**Saidas:** blocos executivos de resumo financeiro, agregados reconciliados por centro de custo/subtipo, estados `401`, `403`, `409`, `422` e `5xx` sanitizados.
**Dados sensiveis:** totais financeiros, periodo de fechamento, quantidade de lancamentos, status de reconciliacao, `church_id`, identidade/papel do usuario e token interno server-side.
**Autenticacao:** sessao BFF em cookie HttpOnly; token interno curto usado apenas de Next.js para Laravel; token interno nunca exposto ao JavaScript.
**Autorizacao:** Laravel como autoridade final via Gate/Policy; apenas `leadership` e `administrator` acessam leitura executiva; modo de conferencia exige capability/Gate `view-leadership-period-summary`; `treasurer`, `secretary` e usuario sem sessao recebem negacao.
**Limites de payload e abuso:** rota aceita somente `include_details` e par opcional `period_start`/`period_end`; periodo padrao e tenant sao resolvidos server-side; periodo de conferencia tem janela maxima de 31 dias, retroatividade maxima de 12 meses e proibicao de datas futuras; parametros `church_id`, `user_id` ou escopo sensivel vindos do browser retornam `422`; aplicar rate limit/middleware em leitura financeira sensivel.

| STRIDE | Pergunta adversarial | Mitigacao obrigatoria | Status |
| --- | --- | --- | --- |
| Spoofing | Como um atacante poderia se passar por lider, administrador, servico interno ou outro tenant? | Validar cookie HttpOnly no BFF, usar token interno apenas server-side, resolver sessao no middleware `resolve.internal.session`, revalidar usuario/vinculo/papel no Laravel e nunca confiar apenas em visibilidade de UI. | Mitigado na especificacao |
| Tampering | Como dados ou parametros poderiam ser alterados para escolher periodo, tenant ou usuario diferente? | BFF e Laravel validam `period_start`/`period_end` em par com UTC estrito, limite de 31 dias, retroatividade maxima de 12 meses e sem datas futuras; `church_id` vem somente da sessao autenticada; `church_id`, `user_id` e escopos sensiveis vindos do browser sao rejeitados. | Mitigado na especificacao |
| Repudiation | Como provar quem acessou ou teve acesso negado a leitura financeira executiva? | Registrar acessos e negacoes do modo de conferencia no backend com `user_id`, `church_id`, acao, `period_start`, `period_end`, resultado e motivo quando houver, sem payload sensivel, token, headers de auth, stack trace ou dados financeiros detalhados. | Mitigado na especificacao |
| Information Disclosure | Que dado financeiro, PII, segredo ou detalhe interno poderia vazar? | Exibir apenas agregados reconciliados; remover contrapartes, usuarios, auditoria, motivos, IDs sensiveis e lancamentos individuais; sanitizar `5xx`; limpar cookie em `401`; nunca expor token interno ao JavaScript. | Mitigado na especificacao |
| Denial of Service | Como chamadas repetidas ou janelas amplas poderiam degradar API/banco? | Nao aceitar janela historica arbitraria; limitar conferencia a 31 dias e 12 meses de retroatividade; usar `cache: "no-store"` por sensibilidade, mas aplicar rate limit/middleware compativel com rota autenticada de leitura financeira; testar rejeicao de parametros amplos. | Mitigado na especificacao |
| Elevation of Privilege | Como um usuario poderia ganhar permissao de tesouraria ou atravessar role/tenant? | Endpoint dedicado de lideranca com autorizacao propria; `leadership` nao acessa `/treasury`; `administrator` acessa leitura de lideranca sem ganhar permissao operacional de tesouraria; testes provam `403` para `treasurer`/`secretary` e isolamento por `church_id`. | Mitigado na especificacao |

### Security Sign-off

- **Status:** Aprovado com notas para implementacao, condicionado a manter as mitigacoes e testes acima.
- **Auditor:** Vex - Security Auditor
- **Data:** 2026-08-05

### Politica de Seguranca da IDE e Sandbox

- **Artifact Review Policy:** `Asks for Review`; pausar e pedir aprovacao humana antes de modificar arquitetura, `implementation_plan.md`, workflows BMAD, permissoes, secrets, CI ou scripts de deploy.
- **Terminal Command Auto Execution Policy:** bloquear `sudo`, `rm -rf`, `chmod 777`, `chown -R /`, destruicao de banco, rotacao de credenciais reais, deploy ou migrations destrutivas; permitir leitura, testes locais, lint, typecheck, SAST/SCA local e comandos sem efeito destrutivo.
- **Browser URL Allowlist:** permitir documentacao oficial do framework/projeto, OWASP, repositorios oficiais, registry oficial de pacotes e docs internas aprovadas; bloquear fontes anonimas, pastebins, encurtadores e conteudo de terceiros nao confiavel.
- **Banco de Dados para Agentes:** usar apenas credenciais de teste com privilegio minimo; proibir `DBA`, `SYSTEM`, superuser, alteracao global e acesso a dados reais.

### Project Structure Notes

- `church-erp-web/src/app/leadership/page.tsx` ja existe, mas e placeholder dentro de `AreaGuard`.
- `church-erp-web/src/components/operational/area-guard.tsx` ja verifica `/api/backoffice/access/{area}` antes de renderizar a area.
- `church-erp-api/app/Domain/Identity/Services/ResolveBackofficeAreaAccessService.php` ja permite `leadership -> leadership` e nao permite `leadership -> treasury`; esta story deve ajustar a matriz para tambem permitir `administrator -> leadership`, sem liberar `administrator -> treasury` por causa desta leitura.
- `church-erp-api/app/Http/Requests/ShowFinancialClosingSummaryRequest.php` hoje autoriza apenas `access-backoffice-area`, `treasury`; isso bloqueia reutilizacao direta por lideranca sem decisao explicita.
- A decisao desta story e criar endpoint/request dedicado de lideranca; nao alterar `ShowFinancialClosingSummaryRequest` para aceitar `leadership`.
- `church-erp-web/src/app/api/finance/closing-summary/route.ts` ja tem sanitizacao e encaminhamento de query params que podem servir como base para o BFF da lideranca.
- A rota de financas aceita periodo customizado para tesouraria; a rota de lideranca deve aceitar somente modo de conferencia limitado e auditavel. Usar a sanitizacao, tratamento de erros e limpeza de cookie da rota de financas como referencia, mas manter limites proprios de lideranca.
- `church-erp-web/src/features/finance/closing-summary.ts` contem tipos e estados do contrato de fechamento.
- `church-erp-web/src/components/operational/closing-detail-breakdown.tsx` renderiza agregados reconciliados e pode ser referencia, desde que a experiencia final nao pareca tesouraria operacional.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 3, Story 3.4 e restricoes frontend.
- `_bmad-output/planning-artifacts/prd.md` - FR-4, FR-6, jornada C e home da lideranca.
- `_bmad-output/planning-artifacts/architecture.md` - Financial Closing Read Model, BFF, autorizacao e fonte unica.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - LeadershipSummaryBlock, leitura resumida da lideranca e padroes de feedback/navegacao.
- `_bmad-output/project-context.md` - stack, BFF, componentes, testes e regras criticas.
- `_bmad-output/implementation-artifacts/3-1-gerar-resumo-de-fechamento-do-periodo.md`
- `_bmad-output/implementation-artifacts/3-2-exibir-detalhamento-por-centro-de-custo-e-subtipo.md`
- `_bmad-output/implementation-artifacts/3-3-compartilhar-ou-exportar-o-resumo-de-fechamento.md`
- `church-erp-web/src/app/leadership/page.tsx`
- `church-erp-web/src/app/api/finance/closing-summary/route.ts`
- `church-erp-web/src/features/finance/closing-summary.ts`
- `church-erp-api/app/Domain/Finance/Services/BuildFinancialClosingSummaryService.php`
- `church-erp-api/app/Http/Requests/ShowFinancialClosingSummaryRequest.php`
- `church-erp-api/app/Http/Resources/FinancialClosingSummaryResource.php`
- `church-erp-api/app/Domain/Identity/Services/ResolveBackofficeAreaAccessService.php`
- Web: https://nextjs.org/docs/app/getting-started/route-handlers
- Web: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Web: https://laravel.com/docs/12.x/authorization

### Checklist pre-review

- Home da lideranca usa a mesma regra de fechamento de `BuildFinancialClosingSummaryService`.
- Nenhum total ou percentual e recalculado no frontend.
- Browser chama somente BFF Next.js.
- BFF de lideranca aceita `period_start`/`period_end` somente no modo de conferencia limitado e rejeita `church_id`, `user_id` e qualquer escopo sensivel vindo do browser.
- Lideranca nao recebe acesso operacional a `/treasury` nem a criacao/edicao/auditoria financeira.
- `administrator` acessa a rota de lideranca para verificacao; `treasurer` e `secretary` nao acessam a rota de lideranca nesta story.
- Modo de conferencia usa capability/Gate `view-leadership-period-summary` e registra acesso/negacao sem payload financeiro detalhado.
- `church_id` vem apenas da sessao autenticada.
- Endpoint dedicado `GET /api/v1/leadership/closing-summary` existe e retorna o mesmo shape de `FinancialClosingSummaryResource`.
- Endpoint de lideranca abre no periodo operacional atual server-side e aceita somente periodo de conferencia com janela maxima de 31 dias, retroatividade maxima de 12 meses e sem datas futuras.
- Detalhes so aparecem quando backend retorna agregados reconciliados.
- Status de confianca distingue `consolidado_carregado`, `detalhe_reconciliado` e `leitura_indisponivel`.
- `409 consistency_error` bloqueia leitura confiavel e profundidade.
- Estado vazio ou erro nao gera resumo fabricado.
- Leitura recuperada apos falha aparece com aviso e nao como estado atual.
- Dados proibidos para lideranca nao aparecem: contrapartes, usuarios, auditoria, motivos, IDs sensiveis e lancamentos individuais.
- UI nao usa termos "dashboard", "KPI", "performance" ou "BI".
- Home renderiza os blocos minimos "Fechamento do periodo", "Confianca da leitura" e "Sinais operacionais".
- Estados de loading, empty, denied, error e success existem e sao acessiveis.
- Componentes novos ficam em `src/components/operational` ou `src/features`, nao em `src/components/ui` com dominio.
- Testes web e backend indicados passam antes de pedir review.
- `/bmad-review-security` foi executado e seus findings foram incorporados antes de dev-story.

### Story Completion Status

- Status alvo desta story para entrada em implementacao: `ready-for-dev`
- Nota de conclusao do contexto: `Ultimate context engine analysis completed - comprehensive developer guide created`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cd church-erp-api && php artisan test tests/Feature/Finance/LeadershipClosingSummaryTest.php`
- `cd church-erp-web && npm test -- tests/leadership-summary.test.mjs`
- `cd church-erp-web && npm test`
- `cd church-erp-web && npm run typecheck`
- `cd church-erp-web && npm run lint`
- `cd church-erp-api && php artisan test tests/Feature/Finance/LeadershipClosingSummaryTest.php tests/Feature/Finance/FinancialClosingSummaryTest.php tests/Feature/Identity/BackofficeAreaAccessTest.php`
- `cd church-erp-web && npm run build:smoke`
- `cd church-erp-api && php artisan test`
- `cd church-erp-api && php artisan test tests/Feature/Finance/LeadershipClosingSummaryTest.php tests/Feature/Identity/BackofficeAreaAccessTest.php`
- `cd church-erp-api && php artisan test tests/Feature/Finance/LeadershipClosingSummaryTest.php tests/Feature/Finance/FinancialClosingSummaryTest.php tests/Feature/Identity/BackofficeAreaAccessTest.php`
- `cd church-erp-web && npm test -- tests/leadership-summary.test.mjs`
- `cd church-erp-web && npm run lint`
- `cd church-erp-web && npm run typecheck`

### Implementation Plan

- Criar uma rota Laravel dedicada para lideranca que reutiliza `BuildFinancialClosingSummaryService`, `ResolveClosingSummaryPeriod` e `FinancialClosingSummaryResource`, com request proprio para autorizacao, validacao de periodo e rejeicao de escopo vindo do browser.
- Criar uma BFF Next.js dedicada para `/api/leadership/closing-summary`, mantendo chamada server-side para Laravel, `cache: "no-store"`, limpeza de cookie em `401`, sanitizacao de erros e preservacao segura de `409 consistency_error`.
- Renderizar `/leadership` com shell propria da lideranca, sem formularios de tesouraria, sem handoff como fluxo principal e sem recalculo financeiro no frontend.
- Cobrir autorizacao, tenant isolation, validacao de periodo, BFF boundary, estados da UI, detalhe reconciliado e source inspection por testes focados.

### Completion Notes List

- Implementado endpoint Laravel `GET /api/v1/leadership/closing-summary` com `FormRequest` dedicado, Gate `view-leadership-period-summary`, rate limit nomeado, log tecnico de modo de conferencia e acesso restrito a `leadership`/`administrator`.
- Implementado BFF `src/app/api/leadership/closing-summary/route.ts` aceitando apenas `include_details`, `period_start` e `period_end`, rejeitando parametros de escopo, limpando cookie em `401` e preservando payload sanitizado de inconsistencia.
- Implementada home real da lideranca com blocos "Fechamento do periodo", "Confianca da leitura" e "Sinais operacionais", modo de conferencia limitado, detalhe agregado sob demanda e estados de leitura indisponivel/recuperada.
- Alinhado acesso de `administrator` a `leadership` no backend e no proxy/menu do frontend, sem liberar tesouraria operacional.
- Testes backend e web obrigatorios passaram, incluindo `npm test`, `npm run lint`, `npm run typecheck`, `npm run build:smoke`, testes focados de fechamento e `php artisan test` completo.
- Corrigidos os achados de code review: confianca preservada durante carregamento de detalhe, whitelist estrita de query params, parsing UTC estrito no BFF, log de negacao de conferencia para papel sem acesso e textos visiveis sem nomes tecnicos de contrato.

### File List

- `_bmad-output/implementation-artifacts/3-4-exibir-visao-resumida-para-lideranca.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `church-erp-api/app/Domain/Identity/Services/ResolveBackofficeAreaAccessService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ShowLeadershipClosingSummaryController.php`
- `church-erp-api/app/Http/Requests/ShowLeadershipClosingSummaryRequest.php`
- `church-erp-api/app/Providers/AppServiceProvider.php`
- `church-erp-api/routes/api.php`
- `church-erp-api/tests/Feature/Finance/LeadershipClosingSummaryTest.php`
- `church-erp-api/tests/Feature/Identity/BackofficeAreaAccessTest.php`
- `church-erp-web/src/app/api/leadership/closing-summary/route.ts`
- `church-erp-web/src/app/leadership/page.tsx`
- `church-erp-web/src/components/operational/leadership-home-shell.tsx`
- `church-erp-web/src/components/operational/leadership-summary-block.tsx`
- `church-erp-web/src/features/app-shell/navigation-policy.js`
- `church-erp-web/src/features/leadership/leadership-summary.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`
- `church-erp-web/tests/leadership-summary.test.mjs`

### Change Log

- 2026-08-05: Implementada a leitura resumida da lideranca com BFF/endpoint dedicados, UI executiva, autorizacao propria, validacao de conferencia e cobertura de testes.
- 2026-08-05: Corrigidos os achados de code review e promovida a story para done.

## Senior Developer Review (AI)

### Resultado

Approved apos correcoes. Todos os achados HIGH e MEDIUM identificados na revisao foram corrigidos.

### Correcoes Aplicadas

- Corrigido o status de confianca durante `loading_leadership_details`, mantendo `consolidado_carregado` enquanto o detalhe agregado esta sendo buscado.
- Fechada a whitelist da rota de lideranca para aceitar somente `include_details`, `period_start` e `period_end`, no BFF e no Laravel.
- Tornado o parsing de timestamp UTC do BFF estrito para calendario real, rejeitando datas impossiveis antes da chamada ao Laravel.
- Registrado log tecnico de negacao do modo de conferencia tambem quando o papel nao possui acesso a area `leadership`.
- Substituidos textos visiveis tecnicos por linguagem de lideranca para base de calculo e sinais operacionais indisponiveis.

### Testes de Revisao

- `cd church-erp-api && php artisan test tests/Feature/Finance/LeadershipClosingSummaryTest.php tests/Feature/Identity/BackofficeAreaAccessTest.php`
- `cd church-erp-api && php artisan test tests/Feature/Finance/LeadershipClosingSummaryTest.php tests/Feature/Finance/FinancialClosingSummaryTest.php tests/Feature/Identity/BackofficeAreaAccessTest.php`
- `cd church-erp-web && npm test -- tests/leadership-summary.test.mjs`
- `cd church-erp-web && npm run lint`
- `cd church-erp-web && npm run typecheck`
