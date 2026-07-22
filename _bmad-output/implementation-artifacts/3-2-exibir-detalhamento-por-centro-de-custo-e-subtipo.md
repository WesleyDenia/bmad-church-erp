# Story 3.2: Exibir detalhamento por centro de custo e subtipo

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a tesoureiro,
I want ver a quebra do fechamento por centro de custo e subtipo,
so that eu consiga explicar os totais com clareza para a lideranca.

## Acceptance Criteria

1. Dado que o resumo de fechamento foi gerado pela Story 3.1, quando o tesoureiro solicita o fechamento com detalhamento, entao o sistema retorna `data.closing_summary` com os campos consolidados ja existentes e inclui `data.closing_summary.details` com `by_cost_center`, `by_subtype` e `reconciliation`, todos em `snake_case`.
2. Dado que existem lancamentos validos do tenant atual no periodo solicitado, quando o detalhamento e calculado, entao `by_cost_center` agrupa por `financial_entries.cost_center_name` e `by_subtype` agrupa pela categoria financeira relacionada, usando `financial_categories.id`, `financial_categories.name`, `financial_categories.slug` e `financial_categories.kind` como representacao do subtipo atual do MVP.
3. Dado que o fechamento possui consolidado e detalhamento, quando qualquer dimensao de detalhe e somada isoladamente, entao os totais de `income`, `expense`, `net_result` e `entry_count` devem bater exatamente com `total_income`, `total_expense`, `net_result` e `entry_count` do consolidado.
4. Dado que backend, BFF e UI participam da leitura, quando o detalhamento for implementado, entao ele deve reutilizar a mesma resolucao de periodo, o mesmo filtro por `church_id`, o mesmo criterio `financial_entries.created_at` e o mesmo endpoint BFF da Story 3.1, sem recalculo independente no frontend.
5. Dado que uma divergencia entre consolidado e detalhamento seja detectada, quando a API processar o fechamento com `include_details=true`, entao o Laravel deve responder `409` com `data.closing_summary.state = consistency_error`, `message = "Nao foi possivel confirmar a consistencia do fechamento."`, metadados do periodo, `calculation_basis`, `details.by_cost_center = []`, `details.by_subtype = []` e `details.reconciliation` com a dimensao inconsistente marcada; o BFF deve preservar `409` e a UI deve exibir `consistency_error` sem apresentar totais ou linhas como confiaveis.
6. Dado que uma categoria ou centro de custo nao possui movimentacao no periodo, quando o detalhamento e exibido, entao o sistema nao deve criar linhas zeradas para ela; apenas grupos com pelo menos um lancamento real entram em `by_cost_center` ou `by_subtype`.
7. Dado que nao existem lancamentos validos no periodo, quando o detalhamento e solicitado, entao o sistema preserva `state = empty_closing_summary`, retorna arrays vazios para as dimensoes de detalhe e mostra estado vazio com proximo passo claro, sem erro tecnico e sem dados fabricados.
8. Dado que o usuario nao possui acesso valido a `treasury` ou tenta ler dados de outro tenant, quando o detalhamento e solicitado, entao o sistema bloqueia antes de qualquer dado financeiro, preserva o isolamento por `church_id` e nao devolve linhas, nomes de categorias, centros de custo ou mensagens que revelem dados sensiveis.
9. Dado que a home da tesouraria ja carrega o fechamento real, quando a Story 3.2 for entregue, entao o usuario consegue abrir o detalhamento a partir do bloco `ClosingStatusBlock` ou de um bloco operacional adjacente na propria home, sem criar dashboard generico, rota paralela desconectada ou tela de lideranca antecipada.

## Tasks / Subtasks

- [x] Estender a seam backend do fechamento para detalhe reconciliado (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] Reutilizar `church-erp-api/app/Domain/Finance/Services/BuildFinancialClosingSummaryService.php` como ponto autoritativo do fechamento ou extrair uma seam compartilhada restrita ao dominio `Finance` para montar a query base do periodo.
  - [x] Reutilizar `church-erp-api/app/Domain/Finance/Support/ClosingSummaryPeriod.php` e `ResolveClosingSummaryPeriod.php`; nao criar outro resolvedor de periodo.
  - [x] Adicionar suporte a `include_details=true` em `church-erp-api/app/Http/Requests/ShowFinancialClosingSummaryRequest.php`, mantendo `period_start` e `period_end` opcionais como par UTC completo.
  - [x] Calcular `by_cost_center` a partir dos mesmos `financial_entries` filtrados por `church_id` e `created_at`, agrupando por `cost_center_name`.
  - [x] Calcular `by_subtype` com join ou eager loading seguro de `financial_categories` do mesmo tenant, tratando categoria financeira como o subtipo do MVP.
  - [x] Incluir em cada linha de `by_cost_center`: `cost_center_key`, `cost_center_name`, `total_income`, `total_expense`, `net_result`, `entry_count` e `percentage_of_total_movement`.
  - [x] Incluir em cada linha de `by_subtype`: `financial_category_id`, `financial_category_name`, `financial_category_slug`, `financial_category_kind`, `total_income`, `total_expense`, `net_result`, `entry_count` e `percentage_of_total_movement`.
  - [x] Implementar reconciliacao por dimensao: soma de `by_cost_center` contra consolidado e soma de `by_subtype` contra consolidado.
  - [x] Retornar exatamente HTTP `409` com `state = consistency_error` quando a reconciliacao falhar, sem expor detalhes internos ou apresentar totais/linhas como confiaveis.
  - [x] Garantir que consolidado sem detalhe e consolidado com detalhe usem o mesmo aggregate/value object de dominio no request atual; `include_details=true` apenas adiciona dimensoes ao mesmo resultado, nao dispara uma segunda regra de fechamento concorrente.
  - [x] Atualizar `church-erp-api/app/Http/Resources/FinancialClosingSummaryResource.php` para serializar `details` apenas quando solicitado, preservando o contrato existente da Story 3.1 para consumidores sem detalhamento.
  - [x] Manter o endpoint Laravel versionado em `GET /api/v1/finance/closing-summary`; nao criar `/reports`, `/dashboard`, endpoint nao versionado ou rota que duplique a fonte de verdade.

- [x] Estender o BFF do fechamento sem expor Laravel ao browser (AC: 1, 4, 5, 7, 8)
  - [x] Atualizar `church-erp-web/src/app/api/finance/closing-summary/route.ts` para encaminhar `include_details=true` alem de `period_start` e `period_end`.
  - [x] Preservar `cache: "no-store"`, `callLaravel`, cookie de sessao `HttpOnly` e sanitizacao atual de `401`, `403` e `5xx`.
  - [x] Preservar respostas `422` de periodo invalido e preservar `409` com `state = consistency_error` sem sanitizar como `5xx`.
  - [x] Atualizar `church-erp-web/src/features/finance/closing-summary.ts` com tipos `ClosingSummaryDetails`, `ClosingSummaryBreakdownRow` e estado UI `consistency_error`.
  - [x] Garantir que contratos TypeScript continuem espelhando o payload Laravel em `snake_case`.

- [x] Exibir o detalhamento na experiencia atual da tesouraria (AC: 1, 3, 5, 6, 7, 9)
  - [x] Evoluir `church-erp-web/src/components/operational/closing-status-block.tsx` e criar `church-erp-web/src/components/operational/closing-detail-breakdown.tsx` para mostrar a quebra em um estado expandido dentro da home, sem deslocar o usuario para uma pagina paralela.
  - [x] Reaproveitar primitives existentes em `church-erp-web/src/components/ui`; se tabela, accordion ou tabs forem necessarios, adicionar primitives compatíveis com `shadcn/ui` em `src/components/ui` antes de compor a experiencia operacional.
  - [x] Mostrar duas dimensoes claras: "Por centro de custo" e "Por subtipo", com totais formatados por `formatDecimalAmountForDisplay`; carregar detalhes de forma lazy quando o usuario acionar a CTA `Revisar fechamento` em estado `status_pronto_para_revisar`, reutilizando `period_start` e `period_end` do resumo ja carregado.
  - [x] Omitir grupos zerados e manter foco nos grupos com movimentacao real.
  - [x] Exibir estado `empty_closing_summary` com orientacao para registrar lancamento, sem bloco analitico vazio e sem linhas fake.
  - [x] Exibir estado `consistency_error` com mensagem clara de indisponibilidade do fechamento confiavel e acao de tentar novamente; nao mostrar os detalhes como se estivessem aprovados.
  - [x] Preservar linguagem operacional, nao corporativa, e a gramatica visual Teal Operacional ja usada nos blocos da home.
  - [x] Recarregar consolidado apos criar ou editar lancamento financeiro e invalidar detalhe aberto; se o detalhe estiver expandido, recarregar `/api/finance/closing-summary?include_details=true&period_start=...&period_end=...` depois do novo consolidado, usando o mesmo callback que a Story 3.1 ja ajustou em `TreasuryHomeShell`.

- [x] Cobrir riscos principais com testes backend e web (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9)
  - [x] Backend: ampliar `church-erp-api/tests/Feature/Finance/FinancialClosingSummaryTest.php` para validar `include_details=true`, agrupamento por `cost_center_name`, agrupamento por categoria/subtipo, arrays vazios no estado vazio e omissao de grupos sem movimento.
  - [x] Backend: testar que cada dimensao reconciliada soma exatamente os mesmos `total_income`, `total_expense`, `net_result` e `entry_count` do consolidado, sem usar `float` para comparacao monetaria.
  - [x] Backend: testar tenant isolation com lancamentos, categorias e centros de custo de outra igreja.
  - [x] Backend: testar bloqueio para perfil sem acesso a `treasury`, garantindo que nomes de categorias e centros de custo nao vazem.
  - [x] Backend: manter cobertura de periodo default UTC, periodo customizado, range invertido, limite isolado e data invalida da Story 3.1.
  - [x] Web/BFF: ampliar `church-erp-web/tests/financial-closing-summary.test.mjs` para validar forwarding exato de `/api/finance/closing-summary?include_details=true`, preservacao de `snake_case`, sanitizacao de erros e preservacao de `409` com estado `consistency_error`.
  - [x] UI/comportamento: testar que a home solicita detalhamento pelo BFF apenas apos acao do usuario, nao recalcula grupos em React, invalida detalhe apos salvamento/edicao de lancamento e recarrega detalhe se ele continuar aberto.
  - [x] Executar `php artisan test` e `./vendor/bin/pint --test` em `church-erp-api`, alem de `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke` em `church-erp-web`.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story e a segunda parte da fundacao real da Epic 3. A Story 3.1 criou o consolidado confiavel; a Story 3.2 precisa explicar os totais sem abrir uma segunda logica de fechamento.
- O fluxo habilitado aqui e: tesouraria abre a home -> fechamento real e carregado pelo BFF -> usuario abre o detalhamento -> backend entrega consolidado e quebras reconciliadas -> UI mostra somente informacao confiavel do periodo.
- "Subtipo" no vocabulario do produto corresponde, no modelo atual, a `financial_categories` vinculada ao lancamento por `financial_category_id`. Nao criar uma tabela nova de subtipo nesta story.
- Esta entrega nao inclui exportacao, compartilhamento, home da lideranca, aprovacoes, graficos de BI ou uma area de relatorios separada.

### Guardrails de implementacao obrigatorios

- O browser deve continuar consumindo apenas `/api/finance/closing-summary`; chamadas autenticadas ao Laravel passam pelo BFF.
- O endpoint Laravel continua sendo `GET /api/v1/finance/closing-summary`, agora com `include_details=true` para incluir detalhamento.
- A ausencia de `include_details=true` deve preservar o comportamento da Story 3.1 para nao quebrar consumidores existentes.
- Consolidado e detalhamento devem nascer no backend a partir do mesmo aggregate/value object de dominio e da mesma query base no request atual; o frontend nao soma arrays de lancamentos para produzir detalhes.
- O service nao pode usar `float`, cast para `float` ou `number_format((float) ...)` para calcular/reconciliar valores monetarios nesta story. Ajustar a seam da Story 3.1 para aritmetica decimal segura, preferencialmente em centavos inteiros ou helper decimal testado, antes de comparar consolidado e detalhe.
- Periodo continua baseado em `financial_entries.created_at`, com `period_start` e `period_end` inclusivos em UTC, ate existir campo financeiro dedicado de competencia.
- Semana operacional default continua sendo segunda `00:00:00` ate domingo `23:59:59.999999` em UTC enquanto nao houver timezone por igreja.
- Toda consulta deve usar `church_id` do contexto autenticado resolvido pelo middleware `resolve.internal.session`.
- A autorizacao deve continuar usando `Gate::authorize('access-backoffice-area', 'treasury')` ou FormRequest equivalente antes de qualquer leitura sensivel.
- A reconciliacao entre consolidado e cada dimensao de detalhe deve ser assertiva e testada; divergencia nao e caso visual toleravel.
- Detalhamento de centro de custo deve agrupar por `cost_center_name` existente, sem criar entidade de centro de custo nesta story.
- `cost_center_key` deve ser uma chave deterministica derivada de normalizacao ASCII/lowercase/trim de `cost_center_name` dentro do tenant e do periodo; se houver colisao de labels normalizados, manter o label original como criterio de desempate e cobrir em teste.
- Detalhamento de subtipo deve agrupar por categoria financeira existente, preservando `financial_category_id`, `name`, `slug` e `kind`.
- Lancamentos com income e expense que resultem em `net_result = 0.00` ainda devem aparecer no detalhe quando `entry_count > 0`; omitir somente grupos sem lancamento real.

### Abordagens proibidas

- Nao criar endpoint paralelo de relatorio ou dashboard para resolver a story.
- Nao recalcular detalhamento no React, no BFF ou a partir da lista limitada de lancamentos recentes.
- Nao buscar todos os lancamentos no browser para agrupar localmente.
- Nao criar tabela nova de `subtypes` ou `cost_centers` sem story propria.
- Nao introduzir biblioteca de charts, BI, data grid ou componentes visuais paralelos.
- Nao mostrar categorias ou centros de custo com zero movimentacao no periodo.
- Nao mascarar divergencia entre consolidado e detalhe com arredondamento visual, fallback estatico ou texto "em processamento".
- Nao retornar dados parciais como fechamento confiavel quando a reconciliacao falhar.
- Nao usar `percentage_of_total` sem sufixo semantico nem calcular percentual sobre `net_result`; usar somente `percentage_of_total_movement`, baseado em `(linha.total_income + linha.total_expense) / (summary.total_income + summary.total_expense)`.
- Nao ordenar por `abs(net_result)`; a ordenacao principal deve usar movimento bruto (`total_income + total_expense`) em ordem decrescente.
- Nao antecipar exportacao/compartilhamento da Story 3.3 nem leitura executiva da Story 3.4.
- Nao mudar contratos oficiais para `camelCase`.

### Arquivos provaveis a alterar ou criar

- `church-erp-api/routes/api.php`
- `church-erp-api/app/Domain/Finance/Services/BuildFinancialClosingSummaryService.php`
- `church-erp-api/app/Domain/Finance/Support/ClosingSummaryPeriod.php`
- `church-erp-api/app/Domain/Finance/Support/ResolveClosingSummaryPeriod.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ShowFinancialClosingSummaryController.php`
- `church-erp-api/app/Http/Requests/ShowFinancialClosingSummaryRequest.php`
- `church-erp-api/app/Http/Resources/FinancialClosingSummaryResource.php`
- `church-erp-api/tests/Feature/Finance/FinancialClosingSummaryTest.php`
- `church-erp-web/src/app/api/finance/closing-summary/route.ts`
- `church-erp-web/src/features/finance/closing-summary.ts`
- `church-erp-web/src/components/operational/closing-status-block.tsx`
- `church-erp-web/src/components/operational/closing-detail-breakdown.tsx`
- `church-erp-web/src/components/operational/treasury-home-shell.tsx`
- `church-erp-web/src/components/ui/table.tsx` ou `church-erp-web/src/components/ui/tabs.tsx`, somente se forem necessarios como primitives `shadcn/ui`
- `church-erp-web/tests/financial-closing-summary.test.mjs`
- `church-erp-web/tests/bff-smoke.test.mjs`

### Estados obrigatorios da UI ou do fluxo

- `loading_closing_summary`: leitura do fechamento em andamento.
- `loading_closing_details`: fechamento carregado e detalhamento sendo solicitado.
- `closing_summary_loaded`: consolidado real disponivel.
- `closing_details_loaded`: consolidado e detalhes reconciliados disponiveis.
- `empty_closing_summary`: nao ha lancamentos validos no periodo; detalhe deve ter arrays vazios.
- `consistency_error`: divergencia detectada entre consolidado e alguma dimensao de detalhe; API/BFF retornam `409`, UI nao mostra totais ou linhas como confiaveis.
- `denied_or_session_invalid`: sessao invalida ou acesso negado a `treasury`.
- `server_error`: falha tecnica sanitizada na leitura.
- `stale_home_state_recovered`: manter dados anteriores visiveis apenas como estado recuperado, com aviso claro e sem tratar como fechamento atualizado.
- `details_collapsed`: resumo carregado, detalhe ainda nao solicitado.
- `details_stale_after_mutation`: detalhe aberto foi invalidado por criacao/edicao de lancamento e precisa ser recarregado antes de exibicao confiavel.

### Requisitos tecnicos obrigatorios

- Backend alvo: PHP `^8.3`, Laravel `^12.0`, MySQL `8.4 LTS`. Frontend alvo: Next.js `16.2.3`, React `19.2.4`, TypeScript estrito e Tailwind CSS `^4`. [Source: `church-erp-api/composer.json`, `church-erp-web/package.json`]
- Laravel 12 `JsonResource` continua sendo a camada de transformacao de respostas HTTP; a Story 3.2 deve estender `FinancialClosingSummaryResource` em vez de montar JSON complexo no controller.
- `ShowFinancialClosingSummaryRequest` deve continuar concentrando validacao de periodo e autorizacao da leitura.
- Next.js App Router continua usando Route Handlers em `src/app/api/.../route.ts`; `NextResponse.json` e aceitavel para resposta JSON do BFF.
- O contrato proposto para detalhe e:
  - `GET /api/v1/finance/closing-summary?include_details=true`
  - `GET /api/finance/closing-summary?include_details=true`
  - `data.closing_summary.details.by_cost_center[]`
  - `data.closing_summary.details.by_subtype[]`
  - `data.closing_summary.details.reconciliation`
- Cada linha de `by_cost_center` deve usar pelo menos `cost_center_name`, `total_income`, `total_expense`, `net_result`, `entry_count`.
- Cada linha de `by_subtype` deve usar pelo menos `financial_category_id`, `financial_category_name`, `financial_category_slug`, `financial_category_kind`, `total_income`, `total_expense`, `net_result`, `entry_count`.
- `reconciliation` deve indicar o status por dimensao, por exemplo `cost_center_status` e `subtype_status` com `consistent` ou `inconsistent`.
- Valores monetarios devem continuar serializados como string decimal com duas casas, como na Story 3.1.
- Comparacao e soma monetaria devem ser feitas com representacao decimal segura, nao `float`; valores serializados continuam strings com duas casas.
- `percentage_of_total_movement` deve ser string decimal com duas casas, calculada sobre movimento bruto (`total_income + total_expense`) e omitida quando o movimento bruto total do fechamento for `0.00`.
- Ordenacao obrigatoria: grupos com maior movimento bruto (`total_income + total_expense`) primeiro; empates por label ascendente.
- Se uma categoria financeira estiver ausente por dado legado inconsistente, o backend deve tratar como `consistency_error` em vez de inventar subtipo "sem categoria".
- Nao depender de cache para corretude do fechamento.

### Compliance de arquitetura

- Backend:
  - controllers em `app/Http/Controllers/Api/V1`
  - services e support classes em `app/Domain/Finance`
  - resources em `app/Http/Resources`
  - requests em `app/Http/Requests`
  - autorizacao real no Laravel
  - isolamento por `church_id` em toda query sensivel
- Frontend:
  - route handlers BFF em `src/app/api`
  - contratos e builders em `src/features/finance`
  - composicoes operacionais em `src/components/operational`
  - primitives de UI em `src/components/ui`
- Produto:
  - detalhamento e explicacao do consolidado confiavel, nao modulo analitico novo
  - home da tesouraria continua sendo o centro operacional
  - home da lideranca fica bloqueada para Story 3.4 e deve consumir esta mesma base depois

### Requisitos de teste

- Backend:
  - `include_details=true` adiciona `details`; sem esse parametro o contrato da 3.1 permanece compativel.
  - `by_cost_center` agrupa receitas e despesas por `cost_center_name`.
  - `by_subtype` agrupa receitas e despesas por `financial_categories`.
  - cada dimensao reconcilia com consolidado em `income`, `expense`, `net_result` e `entry_count`.
  - grupos sem movimento no periodo nao aparecem.
  - estado vazio retorna arrays vazios e totais zerados.
  - outro tenant nao entra em consolidado nem detalhe.
  - perfil sem acesso a `treasury` recebe `403` sem nomes de categorias ou centros de custo.
  - periodos invalidos continuam retornando `422` como na 3.1.
  - inconsistencia de reconciliacao retorna `409` com `state = consistency_error`, arrays de detalhe vazios e sem totais apresentados como confiaveis.
  - grupos com `net_result = 0.00` e `entry_count > 0` aparecem no detalhe.
  - `percentage_of_total_movement` usa movimento bruto, nao `net_result`.
- Web/BFF:
  - BFF encaminha `/api/finance/closing-summary?include_details=true` sem renomear campo.
  - BFF preserva `422` e sanitiza `401`, `403` e `5xx`.
  - BFF preserva `409` funcional de `consistency_error`.
  - tipos TS mantem `snake_case`.
  - UI nao contem agregacao local de arrays de lancamentos.
  - home carrega detalhe de forma lazy apos acao do usuario e usa `period_start`/`period_end` do resumo carregado.
  - home invalida ou recarrega detalhe apos criar ou editar lancamento.
  - estado `consistency_error` nao renderiza detalhe como confiavel.

### Licoes de stories ou reviews anteriores

- A Epic 2 mostrou que contrato integrado precisa nascer cedo; esta story ja define backend, BFF, UI e testes antes da implementacao.
- A Story 3.1 fechou a fonte confiavel inicial do fechamento em `BuildFinancialClosingSummaryService`; a 3.2 deve evoluir essa seam, nao criar outra.
- O review da Story 3.1 encontrou bugs reais em validacao de data, refresh apos mutacao e estado visual otimista; a 3.2 deve cobrir esses tres pontos desde o primeiro teste.
- A lista de lancamentos recentes e limitada a uso operacional; ela nunca deve virar fonte de fechamento.
- Estado recuperado apos falha deve ser honesto: pode preservar leitura anterior, mas precisa avisar que ela nao e atualizada.

### Git Intelligence Summary

- `3417713 implementacao da story 3.1` adicionou o endpoint de fechamento, service de agregacao, period resolver, resource, BFF route, tipos TS, atualizacao da home e testes dedicados. Essa e a base direta a estender.
- `61ac565 Merge pull request #14 from WesleyDenia/story_3_1` confirma que a Story 3.1 foi integrada antes desta story.
- `e3b4e98 escrita da historia 3.1` mostra que o planejamento recente da Epic 3 ja foi ajustado para evitar fechamento mockado.
- `ff82017 implementa 1.7` reforca padroes ja usados para policies, resources, BFF routes e testes de gestao operacional.

### Informacoes tecnicas atuais

- Manter o BFF em `src/app/api/finance/closing-summary/route.ts`, usando `NextResponse.json`, `callLaravel`, `cache: "no-store"` e os headers internos ja existentes.
- Manter `JsonResource` para transformar o payload HTTP e `FormRequest` para validacao/autorizacao da leitura.
- Manter `Gate::authorize('access-backoffice-area', 'treasury')` ou equivalente no FormRequest antes de qualquer consulta.
- Usar `after()` no FormRequest para validar `include_details` como booleano estrito (`true`, `false`, `1`, `0` se aceito pelo padrao Laravel escolhido) sem transformar valor invalido em default silencioso.

### Project Structure Notes

- `church-erp-api/app/Domain/Finance/Models/FinancialEntry.php` ja possui `entry_type`, `amount`, `financial_category_id`, `counterparty_id`, `counterparty_name`, `cost_center_name` e relacao `financialCategory`.
- `church-erp-api/app/Domain/Finance/Services/BuildFinancialClosingSummaryService.php` hoje calcula `net_result` com cast para `float`; esta story deve corrigir essa fragilidade ao adicionar reconciliacao.
- `church-erp-api/database/migrations/2026_05_06_000001_create_financial_entries_table.php` mostra que `cost_center_name` e string simples no MVP; nao ha entidade de centro de custo.
- `church-erp-api/database/migrations/2026_05_04_000001_create_financial_categories_table.php` mostra `financial_categories` com `church_id`, `name`, `slug`, `kind` e `is_default`.
- `church-erp-web/src/components/operational/treasury-home-shell.tsx` ja carrega fechamento e pendencias via BFF e recarrega apos resolucao de pendencia; a 3.2 deve preservar esse padrao.
- `church-erp-web/src/components/ui` ainda tem poucos primitives (`button`, `dialog`, `input`, `label`, `select`, `textarea`); se precisar de tabela/tabs, adicionar primitives pequenos e consistentes.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 3, Story 3.2 e dependencia da Story 3.4.
- `_bmad-output/planning-artifacts/prd.md` - FR-4, consolidado e detalhamento pela mesma regra.
- `_bmad-output/planning-artifacts/architecture.md` - Financial Closing Read Model e regra unica de agregacao.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - `ClosingStatusBlock`, blocos operacionais, empty/loading/error states e direcao Teal Operacional.
- `_bmad-output/project-context.md` - stack, BFF, `snake_case`, tenancy, estrutura e testes.
- `_bmad-output/implementation-artifacts/3-1-gerar-resumo-de-fechamento-do-periodo.md` - seam consolidada, contrato, review e licoes.
- `_bmad-output/implementation-artifacts/epic-2-retro-2026-06-03.md` - fonte unica, reconciliacao e evitar fechamento mockado.
- `church-erp-api/app/Domain/Finance/Services/BuildFinancialClosingSummaryService.php`
- `church-erp-api/app/Http/Resources/FinancialClosingSummaryResource.php`
- `church-erp-web/src/features/finance/closing-summary.ts`
- `church-erp-web/src/components/operational/treasury-home-shell.tsx`
- `church-erp-web/src/components/operational/closing-status-block.tsx`

### Checklist pre-review

- `include_details=true` no BFF e no Laravel esta implementado e testado.
- O contrato sem `include_details` continua compativel com a Story 3.1.
- Detalhe por centro de custo usa os mesmos filtros do consolidado.
- Detalhe por subtipo usa `financial_categories` do tenant atual.
- Cada dimensao reconcilia exatamente com o consolidado.
- Estado `consistency_error` retorna `409`, preservado pelo BFF, e bloqueia apresentacao confiavel do fechamento.
- Grupos zerados nao aparecem.
- Grupos com `net_result = 0.00` e `entry_count > 0` aparecem.
- Nenhuma soma/reconciliacao monetaria usa `float`.
- Percentual usa `percentage_of_total_movement` sobre movimento bruto.
- Ordenacao usa movimento bruto decrescente e label ascendente como desempate.
- Estado vazio nao fabrica detalhe.
- Browser nao chama Laravel diretamente.
- UI nao recalcula totais nem detalhes a partir de lancamentos recentes.
- Detalhe carrega lazy pela CTA da home usando `/api/finance/closing-summary?include_details=true`.
- Home invalida/recarrega consolidado e detalhe apos criar/editar lancamento.
- `403` nao vaza nomes financeiros.
- `php artisan test`, `./vendor/bin/pint --test`, `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke` passam.

### Story Completion Status

- Status alvo desta story para entrada em implementacao: `ready-for-dev`
- Nota de conclusao do contexto: `Ultimate context engine analysis completed - comprehensive developer guide created`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `php artisan test tests/Feature/Finance/FinancialClosingSummaryTest.php`
- `npm test -- financial-closing-summary.test.mjs`
- `php artisan test`
- `./vendor/bin/pint`
- `./vendor/bin/pint --test`
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build:smoke`
- Code review fix: `php artisan test tests/Feature/Finance/FinancialClosingSummaryTest.php`
- Code review fix: `php artisan test`
- Code review fix: `./vendor/bin/pint --test`
- Code review fix: `npm test -- financial-closing-summary.test.mjs`
- Code review fix: `npm run lint`
- Code review fix: `npm run typecheck`
- Code review fix: `npm run build:smoke`

### Completion Notes List

- Backend estendido em `BuildFinancialClosingSummaryService` para aceitar `include_details`, reutilizar a query base por `church_id`/`created_at`, calcular valores em centavos, gerar `by_cost_center` e `by_subtype`, ordenar por movimento bruto e reconciliar cada dimensao contra o consolidado.
- `ShowFinancialClosingSummaryRequest`, controller e resource preservam o contrato sem detalhe, validam `include_details` de forma estrita e retornam `409` com `consistency_error` quando o subtipo/categoria do tenant nao pode ser confirmado.
- BFF encaminha `include_details`, preserva `409` funcional e mantem sanitizacao para `401`, `403` e `5xx`.
- Home da tesouraria carrega detalhe de forma lazy pela CTA `Revisar fechamento`, renderiza a quebra no bloco atual, bloqueia exibicao confiavel em `consistency_error` e invalida/recarrega detalhe aberto apos criar ou editar lancamento.
- Testes backend e web cobrem agrupamento, reconciliacao, estado vazio, isolamento de tenant, bloqueio sem acesso, forwarding BFF, preservacao de `snake_case`, `409` funcional e ausencia de agregacao local no React.
- Code review: `consistency_error` retornado pelo detalhamento agora tambem promove o estado principal do fechamento, impedindo que a home continue exibindo o consolidado como pronto para revisar.
- Code review: testes backend passaram a somar cada dimensao contra o consolidado e cobrir grupos com `net_result = 0.00` e colisao normalizada de `cost_center_key`.
- Code review: testes web passaram a exercer os helpers de promocao de `consistency_error` e recarga de detalhe apos mutacao, reduzindo a dependencia de verificacoes por texto.

### File List

- `_bmad-output/implementation-artifacts/3-2-exibir-detalhamento-por-centro-de-custo-e-subtipo.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `church-erp-api/app/Domain/Finance/Services/BuildFinancialClosingSummaryService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ShowFinancialClosingSummaryController.php`
- `church-erp-api/app/Http/Requests/ShowFinancialClosingSummaryRequest.php`
- `church-erp-api/app/Http/Resources/FinancialClosingSummaryResource.php`
- `church-erp-api/tests/Feature/Finance/FinancialClosingSummaryTest.php`
- `church-erp-web/src/app/api/finance/closing-summary/route.ts`
- `church-erp-web/src/components/operational/closing-detail-breakdown.tsx`
- `church-erp-web/src/components/operational/closing-status-block.tsx`
- `church-erp-web/src/components/operational/treasury-entry-form.tsx`
- `church-erp-web/src/components/operational/treasury-home-shell.tsx`
- `church-erp-web/src/features/finance/closing-summary.ts`
- `church-erp-web/tests/financial-closing-summary.test.mjs`

## Change Log

- 2026-07-22: Implementado detalhamento reconciliado do fechamento por centro de custo e subtipo, com suporte BFF/UI, estado `consistency_error` e cobertura de regressao backend/web.
- 2026-07-22: Corrigidos achados de code review: bloqueio visual do consolidado em `consistency_error`, cobertura real de reconciliacao por dimensao, colisao de `cost_center_key` e grupos com saldo liquido zero.
