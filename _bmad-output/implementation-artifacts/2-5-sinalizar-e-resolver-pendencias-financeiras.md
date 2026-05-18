# Story 2.5: Sinalizar e resolver pendencias financeiras

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a tesoureiro,
I want visualizar pendencias financeiras reais na home da tesouraria e abrir diretamente o fluxo de revisao ou correcao de cada item,
so that eu resolva excecoes operacionais antes de gerar o fechamento da semana.

## Acceptance Criteria

1. Dado que existem lancamentos do tenant atual com inconsistencias operacionais definidas pelo MVP, quando a home da tesouraria e carregada, entao o sistema gera pendencias financeiras acionaveis a partir de dados reais e nao de mock estatico, e diferencia claramente cada item por tipo de revisao necessaria.
2. Dado que existe um lancamento com alteracao auditada recente, quando ele entra na lista de pendencias financeiras, entao o card da pendencia exibe contagem, contexto suficiente para triagem e CTA que leva o tesoureiro diretamente ao fluxo ja existente de revisao ou correcao.
3. Dado que o tesoureiro aciona uma pendencia financeira, quando o sistema abre o item correspondente, entao a interface reaproveita o fluxo operacional atual da tesouraria para editar ou inspecionar o historico do lancamento, sem criar modulo paralelo de revisao.
4. Dado que uma pendencia foi resolvida com sucesso, quando o tesoureiro conclui a correcao ou confirma a revisao aplicavel, entao a home pode ser atualizada sem recarregar estado incorreto, a pendencia deixa de aparecer quando nao se aplica mais, e o usuario consegue retornar ao contexto principal da tesouraria.
5. Dado que o usuario nao possui acesso valido a tesouraria ou tenta acessar dados de outro tenant, quando a API ou o BFF processam listagem e resolucao de pendencias, entao o sistema bloqueia o acesso antes de qualquer vazamento de detalhes sensiveis e preserva o isolamento por `church_id`.

## Tasks / Subtasks

- [x] Implementar a derivacao backend das pendencias financeiras do MVP (AC: 1, 2, 5)
  - [x] Definir explicitamente quais regras de pendencia entram no MVP desta story e codifica-las de forma deterministica. Minimo obrigatorio: itens com `latest_audit` recente que exigem revisao operacional; incluir outras inconsistencias somente se puderem ser derivadas de dados reais ja existentes no modelo atual, sem campos especulativos.
  - [x] Criar service dedicado no backend financeiro para listar pendencias financeiras do tenant autenticado, mantendo isolamento por `church_id` e sem misturar essa regra no controller.
  - [x] Expor endpoint versionado em `/api/v1/finance/pending-items` ou nome equivalente aderente ao padrao atual da API, retornando dados suficientes para renderizar cards acionaveis e para abrir o fluxo de correcao sem heuristica fraca no frontend.
  - [x] Proteger a listagem com `Gate`/`Policy` de tesouraria antes de qualquer validacao ou retorno de detalhes do payload.

- [x] Estender o BFF e os contratos frontend para pendencias financeiras reais (AC: 1, 2, 5)
  - [x] Criar handler BFF correspondente em `church-erp-web/src/app/api/finance/...` seguindo o padrao atual de leitura de sessao, `callLaravel`, sanitizacao de `401`, `403` e `5xx`, e `cache: "no-store"`.
  - [x] Criar ou atualizar tipos em `church-erp-web/src/features/finance` ou `church-erp-web/src/features/treasury` para o contrato de pendencias, preservando `snake_case` na fronteira HTTP.
  - [x] Garantir que o browser continue consumindo apenas o BFF do Next.js, sem qualquer chamada direta autenticada ao Laravel.

- [x] Substituir o bloco estatico de pendencias da home por dados reais (AC: 1, 2, 4)
  - [x] Remover a dependencia do mock estatico atual de `treasury_home_view_model.operational_pending_block.items` para a parte de pendencias financeiras desta story.
  - [x] Manter o componente `OperationalPendingBlock` como container visual principal, ajustando props apenas o necessario para suportar tipo da pendencia, contexto de revisao, estado vazio e CTA contextual.
  - [x] Carregar as pendencias reais na home da tesouraria com estados claros de loading, empty, success e erro de acesso ou servidor.

- [x] Conectar cada pendencia ao fluxo real de resolucao na tesouraria (AC: 2, 3, 4)
  - [x] Fazer o CTA da pendencia abrir diretamente o fluxo ja existente de revisao financeira na home, reaproveitando `TreasuryEntryForm`, a lista de lancamentos recentes e o historico auditado, em vez de criar tela paralela.
  - [x] Se necessario, adicionar mecanismo explicito de foco/selecionar item pendente na area de rastreabilidade recente para que o lancamento correto seja aberto em modo de edicao ou historico.
  - [x] Garantir retorno claro ao contexto principal da home apos resolver o item, sem perder orientacao operacional.

- [x] Cobrir os riscos principais com testes backend e web (AC: 1, 2, 3, 4, 5)
  - [x] Backend: testar derivacao das pendencias, filtragem por tenant, bloqueio para usuario sem acesso a `treasury` e contrato do resource retornado.
  - [x] Web/BFF: testar sanitizacao de erros, leitura do endpoint de pendencias, e que o frontend usa o BFF para carregar dados reais.
  - [x] Web/UI: testar que o estado vazio nao exibe contagens falsas, que pendencias reais aparecem com CTA util e que a interacao leva ao fluxo correto de revisao.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story fecha o ciclo operacional da Epic 2: depois de registrar lancamentos e permitir edicao auditada, a home do tesoureiro passa a sinalizar excecoes financeiras que merecem revisao antes do fechamento.
- O objetivo nao e criar um modulo generico de workflow, tarefas ou inbox universal. O objetivo e transformar dados financeiros reais ja existentes em pendencias acionaveis dentro da home da tesouraria.
- O fluxo principal habilitado e: home da tesouraria carrega -> bloco de pendencias mostra excecoes reais -> tesoureiro entra direto no item -> revisa ou corrige no fluxo operacional atual -> retorna ao contexto da home com a pendencia resolvida ou atualizada.
- Esta story nao deve ampliar o modelo financeiro com novos conceitos especulativos so para sustentar a inbox. Tudo precisa partir de dados, auditorias e estruturas ja disponiveis no repositorio, salvo ajuste pequeno e justificavel estritamente necessario para cumprir os ACs.

### Guardrails de implementacao obrigatorios

- Preservar a home da tesouraria existente em `church-erp-web/src/components/operational/treasury-home-shell.tsx` como entrypoint principal.
- Preservar `OperationalPendingBlock` como bloco visual de pendencias; evoluir props e integracao, nao substituir por outro componente de inbox paralelo sem necessidade tecnica forte.
- Preservar o fluxo operacional ja existente em `church-erp-web/src/components/operational/treasury-entry-form.tsx` como lugar principal para revisar/corrigir lancamentos.
- Reaproveitar a listagem recente de lancamentos e `latest_audit` como base concreta para navegacao de resolucao.
- No backend, manter controller fino, service por caso de uso, resposta com `JsonResource` e autorizacao tenant-scoped por `Gate`/`Policy`.
- Toda consulta e toda derivacao de pendencia devem respeitar `church_id`. Nenhuma pendencia pode ser montada a partir de dados de outro tenant.

### Abordagens proibidas

- Nao manter a implementacao final baseada no mock estatico atual do `treasury_home_view_model` para pendencias financeiras.
- Nao criar uma nova tela completa de revisao financeira se o fluxo puder ser resolvido reaproveitando a home e o formulario existentes.
- Nao fazer o browser chamar endpoints autenticados do Laravel diretamente.
- Nao converter contratos HTTP oficiais para `camelCase` na fronteira entre BFF e frontend.
- Nao inferir tenant, role, autorizacao ou ownership no React. Isso pertence ao Laravel.
- Nao inventar novos campos persistidos, tabelas ou subsistemas de workflow apenas para representar pendencias, salvo se surgir bloqueio real e o ajuste estiver explicitamente justificado pela implementacao.
- Nao exibir contagem ou contexto de pendencias sem lastro em dados reais do tenant atual.

### Arquivos provaveis a alterar ou criar

- `church-erp-api/routes/api.php`
- `church-erp-api/app/Domain/Finance/Services/ListFinancialPendingItemsService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ListFinancialPendingItemsController.php`
- `church-erp-api/app/Http/Resources/FinancialPendingItemListResource.php`
- `church-erp-api/app/Policies/FinancialEntryPolicy.php` ou policy correlata, se precisar de extensao de regra
- `church-erp-api/tests/Feature/Finance/FinancialPendingItemsTest.php`
- `church-erp-web/src/app/api/finance/pending-items/route.ts` ou path equivalente coerente com a API
- `church-erp-web/src/features/finance/financial-pending-item.ts` ou arquivo equivalente em `src/features/treasury`
- `church-erp-web/src/components/operational/operational-pending-block.tsx`
- `church-erp-web/src/components/operational/treasury-home-shell.tsx`
- `church-erp-web/src/components/operational/treasury-entry-form.tsx`
- `church-erp-web/src/features/treasury/home-view-model.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`
- arquivo de teste web especifico para pendencias financeiras

### Estados obrigatorios da UI ou do fluxo

- `loading_pending_items`: home carregando as pendencias reais.
- `empty_pending_items`: nenhuma pendencia financeira aplicavel para o tenant atual.
- `pending_items_loaded`: bloco com itens reais e CTAs acionaveis.
- `pending_item_selected`: usuario entrou no fluxo de revisao/correcao do item escolhido.
- `editing_or_reviewing`: formulario ou historico aberto para o item pendente.
- `pending_item_resolved`: item corrigido ou revisado deixa de exigir pendencia.
- `denied_or_session_invalid`: sessao invalida ou acesso negado a tesouraria.
- `server_error`: falha de BFF/API ao carregar ou resolver pendencias.
- `stale_refresh_recovered`: resolucao concluida, mas a home precisou reconciliar estado apos refresh best-effort.

### Requisitos tecnicos obrigatorios

- Backend em Laravel 12 / PHP 8.3; frontend em Next.js App Router 16.2.x / React 19 / TypeScript strict / Tailwind CSS 4.
- Endpoints de produto devem permanecer em `/api/v1`.
- Respostas de sucesso no Laravel devem usar `JsonResource` / resource dedicado.
- O BFF deve continuar usando `callLaravel` e `cache: "no-store"` para leituras operacionais.
- Contratos HTTP e tipos espelhados no frontend devem permanecer em `snake_case`.
- Se a pendencia se apoiar em trilha de auditoria, reaproveitar `latestAudit` e/ou `FinancialEntryAudit` em vez de duplicar sem necessidade a mesma informacao em outro modelo.
- Se houver regra temporal para "edicao recente", ela deve ser explicita no service e coberta por teste, nunca embutida implicitamente na UI.

### Compliance de arquitetura

- Backend:
  - controllers em `app/Http/Controllers/Api/V1`
  - services em `app/Domain/Finance/Services`
  - resources em `app/Http/Resources`
  - policies/gates para autorizacao real
- Frontend:
  - route handlers BFF em `src/app/api`
  - regra/normalizacao em `src/features`
  - bloco operacional em `src/components/operational`
  - primitives continuam em `src/components/ui`
- Seguir naming de dominio real. Evitar nomes genericos como `DashboardPendingWidget`.
- Toda decisao de acesso, consulta e resolucao deve ser tenant-scoped por `church_id`.
- Nao criar wrapper global customizado de resposta se um resource dedicado resolver.

### Requisitos de teste

- Backend:
  - listagem retorna apenas pendencias do tenant autenticado
  - usuario sem acesso a `treasury` recebe `403`
  - contrato do endpoint inclui dados suficientes para renderizacao e CTA
  - regras do MVP para derivacao de pendencia ficam explicitamente cobertas
- Web/BFF:
  - `401`, `403` e `5xx` continuam sanitizados
  - handler de pendencias chama o Laravel via `callLaravel`
  - frontend nao depende de mock para renderizar pendencias reais
- UI/comportamento:
  - estado vazio coerente
  - clique no CTA leva ao fluxo real de revisao/correcao
  - apos resolucao, a lista reconcilia o estado corretamente
- Comandos minimos antes de review:
  - `cd church-erp-api && php artisan test`
  - `cd church-erp-api && ./vendor/bin/pint --test`
  - `cd church-erp-web && npm test`
  - `cd church-erp-web && npm run lint`
  - `cd church-erp-web && npm run typecheck`
  - `cd church-erp-web && npm run build:smoke`

### Licoes de stories ou reviews anteriores

- Story 2.2 consolidou o formulario financeiro e o BFF de entradas. Esta story deve estender esse fluxo, nao contorna-lo.
- Story 2.3 mostrou que overlays e fluxos inline precisam preservar contexto e nao podem limpar estado util do formulario.
- Story 2.4 mostrou que:
  - `latest_audit` e uma seam importante para a home da tesouraria
  - erros do BFF precisam ser sanitizados
  - refresh pos-sucesso deve ser best-effort, sem transformar mutacao concluida em falso erro
  - policy tenant-scoped deve bloquear antes de vazar detalhes de validacao
- A review da 2.4 corrigiu falso erro pos-edicao bem-sucedida. Esta story deve evitar regressao semelhante ao reconciliar a home apos resolver pendencias.

### Project Structure Notes

- Existe hoje um conflito claro entre o UX/epics, que pedem pendencias reais, e o `treasury_home_view_model`, que ainda entrega itens estaticos para esse bloco.
- A implementacao desta story deve resolver esse descompasso sem quebrar a estrutura visual da home.
- O repositorio ja possui base suficiente para isso: listagem de `financial_entries`, `latest_audit`, historico auditado, formulario operacional, policies de tesouraria e handlers BFF.
- Se surgir necessidade de separar parte do estado da home hoje concentrado em `TreasuryEntryForm`, fazer isso de forma incremental e focada, sem refactor amplo por conveniencia.

### References

- `_bmad-output/planning-artifacts/epics.md`
  - Epic 2
  - Story 2.1
  - Story 2.4
  - Story 2.5
- `_bmad-output/planning-artifacts/prd.md`
  - FR-2 Lancamento Financeiro Rapido
  - FR-3 Correções Financeiras e Auditabilidade
  - FR-6 Homes Operacionais por Perfil
- `_bmad-output/planning-artifacts/architecture.md`
  - `church_id` como isolamento obrigatorio
  - BFF Next.js -> Laravel
  - `JsonResource`
  - `app/Domain/Finance`
  - `src/components/operational`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
  - `OperationalPendingBlock`
  - jornada da tesouraria
  - principios de previsibilidade, clareza e home operacional
- `_bmad-output/project-context.md`
  - regras de BFF, tenancy, `snake_case`, arquitetura dual-app e testes obrigatorios
- `_bmad-output/implementation-artifacts/2-4-editar-lancamento-com-motivo-e-trilha-de-auditoria.md`
- `church-erp-web/src/components/operational/treasury-home-shell.tsx`
- `church-erp-web/src/components/operational/operational-pending-block.tsx`
- `church-erp-web/src/components/operational/treasury-entry-form.tsx`
- `church-erp-web/src/features/treasury/home-view-model.ts`
- `church-erp-api/app/Domain/Finance/Services/ListFinancialEntriesService.php`
- `church-erp-api/app/Http/Resources/FinancialEntryListResource.php`
- `church-erp-api/tests/Feature/Finance/FinancialEntryEditingTest.php`

### Project Context Reference

- Ler `_bmad-output/project-context.md` antes de implementar para preservar:
  - browser -> BFF -> Laravel como unica fronteira valida
  - contratos HTTP em `snake_case`
  - isolamento obrigatorio por `church_id`
  - controllers finos, services por caso de uso e resources para respostas de sucesso
  - cobertura de testes backend e web antes de mover a story para review
- Esta story depende diretamente dos padroes ja estabelecidos pela home da tesouraria e pela trilha de auditoria da story 2.4; o agente DEV nao deve reinterpretar esses patterns nem substitui-los por novas abstracoes genericas.

### Checklist pre-review

- O bloco de pendencias da tesouraria usa dados reais do tenant atual.
- Nao existem mocks estaticos remanescentes representando pendencias financeiras do MVP.
- O CTA de cada pendencia leva para fluxo real de revisao/correcao ja existente.
- A resolucao da pendencia nao exige modulo ou tela paralela de revisao.
- O backend aplica isolamento por `church_id` em toda consulta de pendencias.
- `401`, `403` e `5xx` seguem sanitizados no BFF.
- O frontend continua consumindo apenas o BFF do Next.js.
- Os testes backend e web cobrindo listagem, autorizacao, tenancy e integracao do bloco foram adicionados e passam.

### Story Completion Status

- Status alvo desta story para entrada em implementacao: `ready-for-dev`
- Nota de conclusao do contexto: `Ultimate context engine analysis completed - comprehensive developer guide created`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow executado a partir de `_bmad/core/tasks/workflow.xml` com configuracao `_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`.
- Artefatos analisados integralmente: `epics.md`, `prd.md`, `architecture.md`, `ux-design-specification.md`, `project-context.md`, `sprint-status.yaml` e story anterior `2-4-editar-lancamento-com-motivo-e-trilha-de-auditoria.md`.
- Historico recente inspecionado: commits `4b62927`, `77cde77`, `6aea19d` e merge `7231d28` para capturar padroes reais de continuidade.
- Revisao adversarial em `party-mode` aplicada para remover ambiguidades de implementacao antes do fechamento da story.
- Regra MVP implementada: pendencia `recent_audit_review` para lancamentos cujo `latest_audit` esteja dentro de uma janela explicita de 7 dias e ainda tenha campos efetivamente alterados.
- Resolucao sem modulo paralelo suportada pelo proprio fluxo de edicao: salvar a conferencia com motivo, inclusive sem mudanca de valores, gera novo audit e remove a pendencia quando nao restam campos alterados.
- Validacoes executadas com sucesso: `cd church-erp-api && php artisan test`, `cd church-erp-api && ./vendor/bin/pint --test`, `cd church-erp-web && npm test`, `cd church-erp-web && npm run lint`, `cd church-erp-web && npm run typecheck`, `cd church-erp-web && npm run build:smoke`.

### Completion Notes List

- Story preparada para implementar pendencias financeiras reais na home da tesouraria sem modulo paralelo.
- ACs, tasks, guardrails, riscos de regressao e testes minimos foram explicitados para reduzir margem de interpretacao do agente DEV.
- O conflito entre UX/epics e o mock atual de pendencias em `treasury_home_view_model` foi transformado em instrucao executavel e verificavel.
- Endpoint Laravel `/api/v1/finance/pending-items` criado com controller fino, service dedicado, `JsonResource` proprio e autorizacao de tesouraria antes de qualquer vazamento de detalhes.
- BFF `church-erp-web/src/app/api/finance/pending-items/route.ts` criado com leitura de sessao, `callLaravel`, `cache: "no-store"` e sanitizacao consistente de `401`, `403` e `5xx`.
- Home da tesouraria passou a carregar pendencias financeiras reais, com estados `loading_pending_items`, `empty_pending_items`, `pending_items_loaded`, `denied_or_session_invalid` e `server_error`.
- CTA do bloco de pendencias agora abre diretamente o `TreasuryEntryForm` com o lancamento correto, preservando a home como fluxo unico de revisao e reconciliando a lista apos a resolucao.
- Cobertura adicionada para backend, BFF e UI/comportamento com os testes `FinancialPendingItemsTest.php`, `financial-pending-items.test.mjs` e expansao do `bff-smoke.test.mjs`.
- Code review adversarial corrigiu o loop de pendencia apos correcao real, reabilitou a reabertura da mesma pendencia apos cancelamento, endureceu a chave dos cards e restaurou a protecao padrao para arquivos `.env*`.

### File List

- `_bmad-output/implementation-artifacts/2-5-sinalizar-e-resolver-pendencias-financeiras.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `church-erp-api/app/Domain/Finance/Services/ListFinancialPendingItemsService.php`
- `church-erp-api/app/Domain/Finance/Services/UpdateFinancialEntryService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ListFinancialPendingItemsController.php`
- `church-erp-api/app/Http/Resources/FinancialPendingItemListResource.php`
- `church-erp-api/app/Http/Requests/UpdateFinancialEntryRequest.php`
- `church-erp-api/routes/api.php`
- `church-erp-api/tests/Feature/Finance/FinancialPendingItemsTest.php`
- `church-erp-web/.env.example`
- `church-erp-web/.gitignore`
- `church-erp-web/src/app/api/finance/entries/[id]/route.ts`
- `church-erp-web/src/app/api/finance/pending-items/route.ts`
- `church-erp-web/src/components/operational/operational-pending-block.tsx`
- `church-erp-web/src/components/operational/treasury-entry-form.tsx`
- `church-erp-web/src/components/operational/treasury-home-shell.tsx`
- `church-erp-web/src/features/finance/financial-entry.ts`
- `church-erp-web/src/features/finance/financial-pending-item.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`
- `church-erp-web/tests/financial-entry-editing.test.mjs`
- `church-erp-web/tests/financial-pending-items.test.mjs`

### Change Log

- 2026-05-18: Implementadas pendencias financeiras reais via `latest_audit` recente com janela explicita de 7 dias, endpoint/BFF dedicados, integracao da home com o fluxo existente de revisao e cobertura completa de testes backend/web.
- 2026-05-19: Code review adversarial corrigiu a resolucao definitiva das pendencias apos correcao real, reabertura do mesmo CTA, documentacao do worktree e a protecao de arquivos `.env*`.

## Senior Developer Review (AI)

### Outcome

- Review result: `approve`
- Status after review: `done`
- High/medium findings resolvidos: `5`

### Review Notes

- O backend de edicao agora aceita `resolve_pending_review` e grava uma confirmacao final sem diferencas quando a correcao veio de uma pendencia, evitando que a mesma excecao reapareca logo apos o salvamento.
- A home da tesouraria passou a rastrear a selecao da pendencia com uma chave de ativacao, permitindo reabrir o mesmo item depois de cancelar sem precisar recarregar a pagina.
- O `OperationalPendingBlock` deixou de reutilizar `label` como chave React e passou a usar `id`, removendo colisao quando duas pendencias apontam para a mesma contraparte.
- O `.gitignore` do web voltou a proteger `.env*` de forma ampla, preservando apenas `!.env.example` como arquivo versionavel.
- A cobertura foi ampliada com verificacao do ciclo de resolucao da pendencia no backend, do novo campo no BFF de edicao e da reativacao da mesma pendencia no estado do frontend.

### Verification

- `cd church-erp-api && php artisan test`
- `cd church-erp-api && ./vendor/bin/pint --test`
- `cd church-erp-web && npm test`
- `cd church-erp-web && npm run lint`
- `cd church-erp-web && npm run typecheck`
- `cd church-erp-web && npm run build:smoke`
