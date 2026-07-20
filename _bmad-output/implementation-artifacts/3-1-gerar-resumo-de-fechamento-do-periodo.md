# Story 3.1: Gerar resumo de fechamento do periodo

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a tesoureiro,
I want gerar um resumo de fechamento com um clique a partir dos dados reais persistidos do periodo,
so that eu conclua a prestacao de contas sem montar relatorios manualmente nem depender de blocos mockados ou reconciliacao tardia.

## Acceptance Criteria

1. Dado que existem lancamentos validos do tenant atual no periodo solicitado, quando o tesoureiro solicita o fechamento ou a home da `treasury` carrega o periodo padrao, entao o sistema gera um resumo real a partir dos `financial_entries` persistidos e retorna o payload `data.closing_summary` com pelo menos `state`, `period_kind`, `period_start`, `period_end`, `total_income`, `total_expense`, `net_result` e `entry_count`, todos em `snake_case`.
2. Dado que backend, BFF e UI participam da leitura de fechamento, quando a Story 3.1 for implementada, entao o contrato de leitura deve ser fechado cedo entre as tres camadas e a regra de agregacao do consolidado deve ficar encapsulada em uma seam unica reutilizavel pela Story 3.2, sem recalculo paralelo no frontend e sem acoplamento ao `JsonResource` como unica forma de reutilizacao.
3. Dado que o modelo atual ainda nao possui campo financeiro dedicado de competencia ou `occurred_on`, quando o fechamento do MVP for calculado, entao o periodo deve ser filtrado explicitamente sobre `created_at` dos `financial_entries` persistidos, com semantica inclusiva `created_at >= period_start` e `created_at <= period_end`, e esse criterio deve ficar escrito no contrato e coberto por teste.
4. Dado que a UI da tesouraria precisa manter a promessa de "um clique", quando o usuario abre a area `treasury`, entao o bloco de fechamento dispara uma leitura automatica do periodo padrao sem exigir input manual, e o contrato tambem suporta `period_start` e `period_end` explicitos para reutilizacao futura por detalhamento e compartilhamento.
5. Dado que nenhum periodo explicito foi enviado, quando API e BFF resolvem o fechamento inicial da home, entao o periodo padrao do MVP e a semana operacional corrente, definida deterministicamente como segunda-feira `00:00:00` ate domingo `23:59:59.999999` no timezone atual da aplicacao (`UTC` enquanto nao existir timezone por igreja), e o response deve marcar `period_kind` como `current_operational_week`.
6. Dado que nao existam lancamentos validos no periodo solicitado, quando o tesoureiro tenta gerar o fechamento, entao o sistema responde `200` com `data.closing_summary.state = empty_closing_summary`, preserva `period_start` e `period_end`, zera `total_income`, `total_expense`, `net_result` e `entry_count`, e a UI orienta o proximo passo sem erro tecnico nem resumo fabricado.
7. Dado que o usuario nao possui acesso valido a `treasury` ou tenta ler dados de outro tenant, quando API ou BFF processam o fechamento, entao o sistema bloqueia o acesso antes de qualquer vazamento sensivel, preserva o isolamento por `church_id` e nao devolve detalhes de validacao ou dados financeiros de outro contexto.
8. Dado que o consumidor envia `period_start` e `period_end` explicitos, quando o contrato recebe datas invalidas, um range invertido ou apenas um dos limites, entao a API responde com erro de validacao consistente em `snake_case`, o BFF preserva esse retorno de `422` sem mascarar como `5xx`, e a UI nao substitui a falha por um resumo default silencioso.
9. Dado que a home da tesouraria hoje exibe um `ClosingStatusBlock` estatico, quando a Story 3.1 for entregue, entao esse bloco passa a refletir dados reais de fechamento do periodo em vez de view-model estatico, sem criar pagina paralela nem dashboard generico, e a apresentacao textual do bloco pode derivar apenas labels operacionais e copy a partir do payload real e de `pending_items_count`, nunca os totais financeiros.

## Tasks / Subtasks

- [x] Implementar a seam backend do fechamento consolidado no dominio `Finance` (AC: 1, 2, 3, 4, 5, 6)
  - [x] Criar um service dedicado em `church-erp-api/app/Domain/Finance/Services/`, como `BuildFinancialClosingSummaryService`, para centralizar a regra unica de agregacao do periodo.
  - [x] Definir explicitamente o contrato de entrada do service com `church_id`, `period_start` e `period_end`, aplicando filtro por `created_at` enquanto o dominio ainda nao possuir data financeira dedicada.
  - [x] Extrair a regra de resolucao do periodo padrao para uma seam reaproveitavel pelo controller e por testes, fechando a semana operacional como segunda `00:00:00` ate domingo `23:59:59.999999` em `UTC` enquanto o dominio ainda nao possuir timezone por igreja.
  - [x] Validar `period_start` e `period_end` no Laravel como par opcional e coerente: ambos ausentes para usar default, ou ambos presentes em formato timestamp ISO 8601 compativel com `UTC`, com `period_start <= period_end`.
  - [x] Expor endpoint versionado em `/api/v1/finance/closing-summary` dentro do grupo `resolve.internal.session`, com controller fino em `app/Http/Controllers/Api/V1`.
  - [x] Retornar a resposta com `JsonResource` dedicado, preservando `snake_case`, `data.closing_summary`, `state` e `period_kind`, com shape consistente tanto para sucesso quanto para estado vazio.
  - [x] Proteger a leitura com a mesma regra de acesso da area `treasury`, reaproveitando o padrao atual de `Gate::authorize('access-backoffice-area', 'treasury')` antes de qualquer leitura sensivel.

- [x] Fechar o contrato BFF do fechamento sem chamar o Laravel autenticado diretamente do browser (AC: 1, 2, 4, 5, 6, 8)
  - [x] Criar `church-erp-web/src/app/api/finance/closing-summary/route.ts` seguindo o padrao atual de `callLaravel`, leitura de cookie de sessao, `cache: "no-store"` e sanitizacao de `401`, `403` e `5xx`.
  - [x] Fazer o BFF aceitar `GET` com query params opcionais `period_start` e `period_end`, repassa-los sem renomear campos e preservar respostas `422` de validacao do Laravel.
  - [x] Criar contratos TypeScript em `church-erp-web/src/features/finance/closing-summary.ts` com request e response em `snake_case`, incluindo `state`, `period_kind`, `period_start`, `period_end`, `total_income`, `total_expense`, `net_result` e `entry_count`.
  - [x] Garantir que a UI use o mesmo contrato de periodo no BFF e nao derive o resumo a partir da lista de lancamentos recentes ja carregada por outro fluxo.

- [x] Substituir o fechamento estatico da home da tesouraria por leitura real do periodo (AC: 1, 4, 5, 6, 9)
  - [x] Evoluir `church-erp-web/src/components/operational/closing-status-block.tsx` para receber dados reais do fechamento, preservando o papel do bloco na home e sem introduzir pagina paralela nesta story.
  - [x] Ajustar `church-erp-web/src/components/operational/treasury-home-shell.tsx` para carregar o fechamento real via BFF ao abrir a home sem query params, com estados claros de `loading_closing_summary`, `empty_closing_summary`, `closing_summary_loaded`, `denied_or_session_invalid` e `server_error`.
  - [x] Fechar explicitamente o mapeamento dos estados operacionais do bloco a partir do payload real e de `pending_items_count`: `em_andamento` quando ha pendencias operacionais abertas, `pronto_para_revisar` quando ha resumo real e nenhuma pendencia, `atencao` reservado para falha de consistencia ou degradacao futura, e `concluido` fora do escopo desta story.
  - [x] Reduzir a dependencia do `treasury_home_view_model.closing_status_block` para a parte que hoje simula resumo e status do fechamento.
  - [x] Manter a CTA de fechamento dentro da experiencia da `treasury`, apontando para o proprio bloco e proximos passos operacionais na home nesta entrega, sem antecipar exportacao, home da lideranca, rota paralela ou detalhamento completo.

- [x] Preparar a fundacao para a Story 3.2 sem antecipar seu escopo de interface (AC: 2)
  - [x] Garantir que a agregacao do consolidado nao fique embutida no controller, BFF ou React, para que o detalhamento futuro reutilize a mesma regra.
  - [x] Registrar no contrato ou no resource metadados minimos do periodo suficientes para permitir extensao futura para detalhamento e compartilhamento, sem recalculo paralelo.
  - [x] Separar explicitamente a camada de agregacao de dominio da camada de serializacao HTTP para que a Story 3.2 possa reutilizar o resultado consolidado sem depender do resource como API interna informal.

- [x] Cobrir os riscos principais com testes backend e web (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9)
  - [x] Backend: testar resumo com `income` e `expense`, resultado liquido, filtro por `created_at`, tenant isolation, estado vazio e bloqueio para usuario sem acesso a `treasury`.
  - [x] Backend: testar resolucao do periodo padrao da semana operacional corrente, range customizado valido, erro `422` para range invertido, erro `422` para limite isolado e serializacao `UTC` consistente.
  - [x] BFF/Web: testar sanitizacao de `401`, `403` e `5xx`, preservacao de `422`, manutencao de `snake_case`, forwarding de query params e uso exclusivo do BFF local.
  - [x] UI/comportamento: testar que o bloco de fechamento deixa de depender de resumo mockado, renderiza estado vazio coerente, usa carregamento automatico da home para o periodo default e nao tenta fechar a conta com dados fabricados.
  - [x] Executar `php artisan test` e `./vendor/bin/pint --test` em `church-erp-api`, alem de `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke` em `church-erp-web`.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story e a fundacao real da Epic 3. O objetivo nao e apenas desenhar um card de resumo, e sim criar a primeira leitura confiavel de fechamento financeiro.
- A story precisa corrigir explicitamente o tipo de ambiguidade que a retro da Epic 2 revelou: consolidado nao pode nascer de uma logica, enquanto detalhamento e lideranca nascem de outra.
- O fluxo habilitado aqui e: tesouraria abre a home -> BFF solicita o fechamento sem input manual -> backend resolve deterministicamente a semana operacional corrente -> backend agrega `financial_entries` reais -> BFF repassa contrato fechado -> UI exibe um consolidado confiavel e os proximos passos operacionais.
- Esta entrega nao inclui exportacao, detalhamento analitico completo nem home da lideranca. Ela prepara a base correta para que 3.2, 3.3 e 3.4 nao nascam sobre premissas erradas.

### Guardrails de implementacao obrigatorios

- O browser so pode consumir `church-erp-web/src/app/api/finance/closing-summary/route.ts`; nao chamar o Laravel autenticado diretamente.
- O consolidado deve nascer de um service unico no backend `Finance`; nao recalcular totais no BFF nem no React.
- O modelo atual de `financial_entries` nao possui data financeira dedicada alem de `created_at`; nesta story o periodo do MVP deve ser explicitamente baseado em `created_at`, e nao em heuristica solta de frontend.
- O contrato deve aceitar `period_start` e `period_end` explicitos, mesmo que a UX inicial use um padrao automatico de periodo.
- O default de "um clique" deve ser resolvido no backend, nao no browser: semana operacional corrente de segunda `00:00:00` a domingo `23:59:59.999999` em `UTC` enquanto nao houver timezone por igreja.
- `period_start` e `period_end` devem ser tratados como timestamps explicitos e inclusivos; o contrato nao pode depender de parsing implicito do locale do browser.
- A home da tesouraria deve continuar sendo o entrypoint do fluxo. Nao criar rota paralela como `/treasury/closing`, `/finance/summary` ou dashboard separado para concluir esta story.
- O bloco de fechamento deve refletir dados reais. O `treasury_home_view_model` nao pode continuar sendo a fonte autoritativa do resumo financeiro depois desta entrega.
- O frontend pode derivar apenas copy operacional, labels visiveis e CTA do bloco a partir do payload real e de `pending_items_count`; nunca os totais financeiros nem o periodo.
- Nenhuma logica da Story 3.4 deve ser antecipada aqui. Nada de home da lideranca, visao executiva separada ou composicao paralela de resumo.

### Abordagens proibidas

- Nao derivar o resumo a partir da lista de `financial_entries` recentes carregada para o formulario da tesouraria. Essa lista e incompleta e limitada a outro objetivo operacional.
- Nao implementar o fechamento como mock visual com TODO para "ligar depois".
- Nao recalcular consolidado no frontend a partir de arrays locais.
- Nao resolver o periodo padrao no React com `new Date()` como fonte autoritativa, porque isso reabre divergencia entre browser, BFF e backend.
- Nao esconder a definicao de periodo dentro da UI sem refletir isso no contrato backend/BFF.
- Nao degradar erro de validacao de periodo para fallback silencioso do periodo default.
- Nao introduzir biblioteca paralela de charts, BI ou dashboard para resolver uma leitura consolidada do MVP.
- Nao antecipar detalhamento por centro de custo/subtipo dentro da UI da 3.1, salvo o necessario para deixar a seam reutilizavel para a 3.2.
- Nao assumir outro tenant, role ou autorizacao fora do Laravel.

### Arquivos provaveis a alterar ou criar

- `church-erp-api/routes/api.php`
- `church-erp-api/app/Domain/Finance/Services/BuildFinancialClosingSummaryService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ShowFinancialClosingSummaryController.php`
- `church-erp-api/app/Http/Requests/ShowFinancialClosingSummaryRequest.php`
- `church-erp-api/app/Http/Resources/FinancialClosingSummaryResource.php`
- `church-erp-api/app/Domain/Finance/Support/ResolveClosingSummaryPeriod.php` ou helper equivalente restrito ao dominio, se a regra de default exigir seam propria
- `church-erp-api/tests/Feature/Finance/FinancialClosingSummaryTest.php`
- `church-erp-web/src/app/api/finance/closing-summary/route.ts`
- `church-erp-web/src/features/finance/closing-summary.ts`
- `church-erp-web/src/components/operational/closing-status-block.tsx`
- `church-erp-web/src/components/operational/treasury-home-shell.tsx`
- `church-erp-web/src/features/treasury/home-view-model.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`
- `church-erp-web/tests/financial-closing-summary.test.mjs`

### Estados obrigatorios da UI ou do fluxo

- `loading_closing_summary`: leitura do fechamento em andamento.
- `closing_summary_loaded`: resumo real do periodo disponivel.
- `empty_closing_summary`: nao ha lancamentos validos no periodo.
- `denied_or_session_invalid`: sessao invalida ou acesso negado a `treasury`.
- `server_error`: falha tecnica sanitizada na leitura.
- `stale_home_state_recovered`: reconciliacao da home apos retry, sem reintroduzir resumo estatico como fallback enganoso.
- `status_em_andamento`: resumo carregado e ainda existem pendencias operacionais abertas para concluir antes da prestacao de contas.
- `status_pronto_para_revisar`: resumo carregado, ha lancamentos no periodo e nao existem pendencias operacionais abertas.
- `status_atencao`: reservado para inconsistencia ou degradacao funcional futura; nao usar como substituto generico de erro de fetch nesta story.
- `status_concluido`: reservado para etapa posterior de compartilhamento ou conclusao formal fora do escopo da 3.1.

### Requisitos tecnicos obrigatorios

- Backend alvo: PHP `^8.3`, Laravel `^12.0`, MySQL `8.4 LTS`. Frontend alvo: Next.js `16.2.3`, React `19.2.4`, TypeScript estrito e Tailwind CSS `^4`. [Source: `church-erp-api/composer.json`, `church-erp-web/package.json`]
- Endpoints de produto devem permanecer em `/api/v1`.
- Respostas de sucesso no Laravel devem usar `JsonResource`.
- O BFF deve continuar usando `callLaravel` e `cache: "no-store"`.
- Contratos HTTP oficiais e tipos espelhados no frontend devem permanecer em `snake_case`.
- O resumo consolidado deve usar `created_at` como base do periodo no estado atual do modelo, porque `financial_entries` ainda nao possuem `occurred_on` ou campo equivalente.
- O filtro de periodo deve ser deterministicamente testavel e nao depender de interpretacao implicita do browser.
- O contrato HTTP desta story deve usar `GET /api/v1/finance/closing-summary` com `period_start` e `period_end` opcionais como query params em `snake_case`.
- Quando presentes, `period_start` e `period_end` devem ser serializados como timestamps ISO 8601 em `UTC` com sufixo `Z`.
- Quando ausentes, a resposta deve marcar `period_kind = current_operational_week`; quando presentes, `period_kind = custom_period`.
- A API deve preservar shape consistente para `closing_summary_loaded` e `empty_closing_summary`.
- O BFF deve preservar `422` do Laravel para ranges invalidos e continuar sanitizando `401`, `403` e `5xx`.
- O bloco de fechamento na home deve manter linguagem operacional clara e nao corporativa.

### Compliance de arquitetura

- Backend:
  - controllers em `app/Http/Controllers/Api/V1`
  - services em `app/Domain/Finance/Services`
  - resources em `app/Http/Resources`
  - autorizacao real no Laravel
  - requests de validacao em `app/Http/Requests`
  - reaproveitar o padrao atual de `Gate::authorize('access-backoffice-area', 'treasury')` para leitura de fechamento
- Frontend:
  - route handlers BFF em `src/app/api`
  - contratos e helpers em `src/features/finance`
  - bloco operacional em `src/components/operational`
  - primitives permanecem em `src/components/ui`
- Produto:
  - o fechamento consolidado deve ser leitura confiavel, nao ornamento visual
  - a home da tesouraria continua sendo ambiente de trabalho real
  - a home da lideranca permanece fora do escopo desta story, mas sua dependencia desta seam precisa ser preservada

### Requisitos de teste

- Backend:
  - resumo soma corretamente `income` e `expense`
  - `net_result` reflete `total_income - total_expense`
  - filtro por `period_start` e `period_end` aplica-se sobre `created_at`
  - periodo default da semana operacional corrente e resolvido de forma deterministica em `UTC`
  - range invertido, limite ausente e formato invalido retornam `422`
  - usuario sem acesso a `treasury` recebe `403`
  - outro tenant nao entra no consolidado
  - estado vazio retorna shape consistente sem dados fabricados
- Web/BFF:
  - `401`, `403` e `5xx` continuam sanitizados
  - `422` de validacao e preservado
  - handler de fechamento usa `callLaravel`
  - handler encaminha `period_start` e `period_end` sem renomear os campos
  - contratos `snake_case` sao preservados
  - browser nao depende de fetch direto ao Laravel
- UI/comportamento:
  - `ClosingStatusBlock` deixa de depender do resumo estatico do view-model
  - estado vazio e coerente
  - abertura da home dispara leitura automatica do periodo default, sem exigir clique adicional
  - copy e status operacional do bloco derivam do payload real sem recalculo de totais
  - retry nao reintroduz resumo mockado
  - leitura real convive corretamente com `pending_items_count` da home

### Licoes de stories ou reviews anteriores

- A Story 2.1 consolidou a `treasury` como home operacional real; a 3.1 deve se encaixar nela, nao criar outro centro de gravidade.
- A Story 2.2 consolidou a primeira mutacao financeira real e mostrou a importancia de contratos `snake_case`, BFF e validacao no Laravel.
- As Stories 2.4 e 2.5 mostraram que a reconciliacao da home apos sucesso e fragil se a leitura depender de fallback estatico ou de recalculo local.
- A retro da Epic 2 deixou explicito que contrato integrado e regra unica de agregacao precisam nascer cedo e por escrito.

### Project Structure Notes

- `church-erp-web/src/components/operational/treasury-home-shell.tsx` ja hospeda `ClosingStatusBlock`, mas ainda o alimenta com `treasury_home_view_model`.
- `church-erp-web/src/features/treasury/home-view-model.ts` ainda contem resumo e status de fechamento estaticos; essa e uma seam real a substituir.
- `church-erp-api/app/Domain/Finance/Services/ListFinancialEntriesService.php` lista apenas os ultimos 8 lancamentos para uso operacional; essa leitura nao pode ser promovida indevidamente a base do fechamento.
- `church-erp-api/app/Http/Controllers/Api/V1/ListFinancialEntriesController.php` e `ListFinancialPendingItemsController.php` mostram o padrao real de autorizacao de leitura da tesouraria baseado em `Gate::authorize('access-backoffice-area', 'treasury')`, que esta story deve reaproveitar antes de qualquer leitura.
- O `ClosingStatusBlock` aprovado no UX ja preve `progresso`, `saldo`, `itens pendentes` e `acesso ao resumo`; a story precisa fechar esses sinais sobre dados reais sem inventar uma nova composicao paralela.
- O bloco `ClosingStatusBlock` hoje e visualmente adequado, mas ainda precisa virar leitura real.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 3, Story 3.1, 3.2 e 3.4
- `_bmad-output/planning-artifacts/prd.md` - FR-4 e requisitos de fechamento
- `_bmad-output/planning-artifacts/architecture.md` - fonte unica de verdade para fechamento e contrato integrado BFF/API/UI
- `_bmad-output/project-context.md` - regras de BFF, `snake_case`, tenancy e estrutura de componentes
- `_bmad-output/planning-artifacts/ux-design-specification.md` - definicao funcional do `ClosingStatusBlock`, seus estados e o comportamento esperado na home da tesouraria
- `_bmad-output/implementation-artifacts/epic-2-retro-2026-06-03.md` - descoberta de que a Epic 3 precisa nascer de dados reais e regra unica
- `church-erp-api/app/Domain/Finance/Models/FinancialEntry.php`
- `church-erp-api/app/Domain/Finance/Services/ListFinancialEntriesService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ListFinancialEntriesController.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ListFinancialPendingItemsController.php`
- `church-erp-api/routes/api.php`
- `church-erp-web/src/components/operational/treasury-home-shell.tsx`
- `church-erp-web/src/components/operational/closing-status-block.tsx`
- `church-erp-web/src/features/treasury/home-view-model.ts`
- `church-erp-web/src/features/finance/financial-entry.ts`
- `church-erp-web/src/app/api/finance/pending-items/route.ts`
- `church-erp-api/config/app.php`

### Checklist pre-review

- Existe endpoint versionado para fechamento em `/api/v1/finance/closing-summary`.
- O resumo nasce de `financial_entries` reais do tenant atual.
- O periodo esta explicitamente definido sobre `created_at`.
- O periodo default da home esta fechado como semana operacional corrente em `UTC`, sem depender do browser.
- O contrato aceita `period_start` e `period_end` e continua em `snake_case`.
- O contrato fecha o shape de sucesso e o shape de estado vazio em `data.closing_summary`.
- `422` de validacao de periodo nao vira fallback silencioso nem `5xx`.
- O browser consome apenas o BFF local.
- O `ClosingStatusBlock` deixa de depender do resumo mockado.
- O bloco recebe dados reais e mapeia apenas labels operacionais no frontend.
- Nao ha recalculo paralelo no frontend.
- O fechamento real nao antecipa exportacao, detalhamento completo nem home da lideranca.
- `php artisan test`, `./vendor/bin/pint --test`, `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke` passam.

### Story Completion Status

- Status alvo desta story para entrada em implementacao: `ready-for-dev`
- Nota de conclusao do contexto: `story 3.1 reescrita para nascer de dados reais, contrato integrado e regra unica de agregacao`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Introduzir a leitura consolidada real do fechamento no backend `Finance`, com filtro de periodo explicito e contrato reutilizavel.
- Adicionar o BFF `finance/closing-summary` e os contratos TS dedicados, sem reutilizar leituras operacionais incompletas.
- Conectar a home da tesouraria ao resumo real do periodo, substituindo o fechamento estatico do view-model.
- Fechar a story com testes de agregacao, periodo, tenancy, BFF boundary e comportamento da home.

### Debug Log References

- Epic 3 foi corrigida em `epics.md`, `prd.md` e `architecture.md` para explicitar regra unica de agregacao, fonte unica de verdade e dependencia da visao da lideranca.
- Foi confirmado que ainda nao existe story file da `3.1` em `_bmad-output/implementation-artifacts`.
- Foi confirmado que `financial_entries` hoje possuem `entry_type`, `amount`, `financial_category_id`, `counterparty_id`, `counterparty_name`, `cost_center_name` e timestamps, sem campo financeiro dedicado de competencia.
- Foi confirmado que `ListFinancialEntriesService` lista apenas os oito registros mais recentes para uso operacional da tesouraria e nao pode servir como base de fechamento.
- Foi confirmado que `TreasuryHomeShell` ainda alimenta `ClosingStatusBlock` a partir de `treasury_home_view_model`.
- Revisao adversarial posterior fechou ambiguidades sobre periodo default, shape de `empty_closing_summary`, contrato `422`, origem dos status do bloco e referencias de UX.
- RED executado: `php artisan test tests/Feature/Finance/FinancialClosingSummaryTest.php` falhou com `404` para `/api/v1/finance/closing-summary`; `npm test -- tests/financial-closing-summary.test.mjs` falhou por contrato/handler web inexistentes.
- GREEN executado: `php artisan test tests/Feature/Finance/FinancialClosingSummaryTest.php` passou com 5 testes e 39 assertions; `npm test -- tests/financial-closing-summary.test.mjs` passou junto da suite web carregada pelo glob do script.
- Validacao completa executada: `php artisan test` passou com 94 testes e 501 assertions; `./vendor/bin/pint --test` passou; `npm test` passou com 46 testes; `npm run lint`, `npm run typecheck` e `npm run build:smoke` passaram.
- Code review executado em 2026-07-20 encontrou 3 issues High e 1 Medium; todos foram corrigidos automaticamente.
- Pos-review: `php artisan test tests/Feature/Finance/FinancialClosingSummaryTest.php` passou com 5 testes e 42 assertions; `npm test -- tests/financial-closing-summary.test.mjs` passou dentro da suite web.
- Pos-review validacao completa executada: `php artisan test` passou com 94 testes e 504 assertions; `./vendor/bin/pint --test` passou; `npm test` passou com 46 testes; `npm run lint`, `npm run typecheck` e `npm run build:smoke` passaram.

### Completion Notes List

- Story 3.1 reescrita para impedir interpretacao `mock first`.
- Contrato de periodo do MVP ficou explicitado sobre `created_at`, evitando ambiguidade silenciosa.
- A seam de fechamento foi separada da listagem operacional de lancamentos recentes.
- O bloco de fechamento da home passou a ser tratado como leitura real a substituir, e nao como detalhe visual estatico.
- A story preserva dependencia futura de 3.2 e 3.4 sem antecipar seus escopos.
- Correcao adversarial aplicada para fechar default semanal, timezone atual, semantica inclusiva do periodo, shape de `data.closing_summary` e preservacao de `422`.
- Implementado endpoint `GET /api/v1/finance/closing-summary` com service unico de agregacao, request de validacao, period resolver e resource dedicado em `data.closing_summary`.
- Implementado BFF local `/api/finance/closing-summary`, preservando `422`, sanitizando `401`, `403` e `5xx`, e repassando `period_start`/`period_end` sem renomear.
- `TreasuryHomeShell` passou a carregar o fechamento automaticamente pelo BFF, e `ClosingStatusBlock` passou a renderizar estados reais sem depender de resumo estatico do view-model.
- Cobertura adicionada para agregacao por tenant, periodo por `created_at`, semana operacional default UTC, estado vazio, bloqueio de acesso, BFF boundary e comportamento da home.
- Review fix: validacao de `period_start` e `period_end` agora rejeita datas de calendario invalidas em vez de aceitar normalizacao permissiva do Carbon.
- Review fix: a home recarrega o resumo de fechamento depois de criar ou editar lancamento financeiro, evitando resumo vazio ou totals antigos apos salvamento.
- Review fix: o bloco de fechamento nao marca o periodo como pronto para revisar enquanto a leitura de pendencias ainda nao e confiavel.

### Senior Developer Review (AI)

Reviewer: Wesley Silva on 2026-07-20

Outcome: Approved after fixes.

Issues fixed:

- [High] Datas invalidas como `2026-02-30T00:00:00Z` eram normalizadas pelo Carbon e podiam passar como periodo valido; corrigido com parsing estrito de calendario e hora em `ShowFinancialClosingSummaryRequest`.
- [High] O resumo de fechamento nao era recarregado apos criacao/edicao de lancamento; corrigido em `TreasuryHomeShell` para recarregar pendencias e fechamento apos o callback de salvamento do formulario.
- [High] A UI podia marcar o fechamento como `pronto para revisar` enquanto as pendencias ainda estavam carregando ou indisponiveis; corrigido com estado conservador `em conferencia`.
- [Medium] Cobertura de regressao ampliada para data invalida, estado de pendencias desconhecidas e refresh do fechamento apos salvamento.

Verification:

- `php artisan test`
- `./vendor/bin/pint --test`
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build:smoke`

### Change Log

- 2026-07-20: Corrigidos apontamentos do code review, validacao completa verde e story movida para done.
- 2026-07-20: Implementada leitura real do resumo de fechamento do periodo e substituido o fechamento estatico da home da tesouraria. Story movida para review.

### File List

- `_bmad-output/implementation-artifacts/3-1-gerar-resumo-de-fechamento-do-periodo.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `church-erp-api/app/Domain/Finance/Services/BuildFinancialClosingSummaryService.php`
- `church-erp-api/app/Domain/Finance/Support/ClosingSummaryPeriod.php`
- `church-erp-api/app/Domain/Finance/Support/ResolveClosingSummaryPeriod.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ShowFinancialClosingSummaryController.php`
- `church-erp-api/app/Http/Requests/ShowFinancialClosingSummaryRequest.php`
- `church-erp-api/app/Http/Resources/FinancialClosingSummaryResource.php`
- `church-erp-api/app/Http/Resources/ChurchUserResource.php`
- `church-erp-api/routes/api.php`
- `church-erp-api/tests/Feature/Finance/FinancialClosingSummaryTest.php`
- `church-erp-web/src/app/api/finance/closing-summary/route.ts`
- `church-erp-web/src/components/operational/closing-status-block.tsx`
- `church-erp-web/src/components/operational/treasury-home-shell.tsx`
- `church-erp-web/src/features/finance/closing-summary.ts`
- `church-erp-web/src/features/treasury/home-view-model.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`
- `church-erp-web/tests/financial-closing-summary.test.mjs`
