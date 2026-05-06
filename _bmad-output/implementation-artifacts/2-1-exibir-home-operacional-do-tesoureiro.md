# Story 2.1: Exibir home da tesouraria com blocos operacionais

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a tesoureiro,
I want abrir uma home da tesouraria com blocos de prioridade, acoes principais e pendencias financeiras abertas,
so that eu saiba imediatamente por onde comecar a rotina financeira semanal.

## Acceptance Criteria

1. Dado que um usuario autenticado com perfil de tesoureiro acessa a tela inicial da tesouraria, quando a rota e carregada com acesso permitido, entao o sistema exibe uma home operacional com blocos de prioridade da semana, lancamento rapido, pendencias de revisao e fechamento atual, mostrando apenas contexto do tenant ativo.
2. Dado que existem pendencias financeiras abertas para o tenant atual, quando a home e exibida, entao o sistema apresenta cartoes de pendencia com contagem, rotulo e contexto suficiente para orientar a proxima acao, em hierarquia simples de blocos e sem recorrer a dashboards genericos.
3. Dado que ainda nao existem dados operacionais suficientes para algum bloco, quando a home e renderizada, entao o sistema mostra estado vazio orientado a acao, preservando a estrutura da home e a clareza da proxima tarefa.
4. Dado que o acesso a area for negado ou o contexto autenticado estiver invalido, quando a verificacao de acesso falhar, entao a experiencia preserva o fluxo atual de `AreaGuard` com mensagem funcional clara, sem expor dados financeiros fora do escopo autorizado.

## Tasks / Subtasks

- [x] Estruturar a home operacional do tesoureiro sobre a rota existente `church-erp-web/src/app/treasury/page.tsx`, reaproveitando `AreaGuard` como boundary de autorizacao e mantendo a rota `treasury` como entrada oficial da area (AC: 1, 4)
  - [x] Substituir o placeholder atual por uma composicao de home orientada a blocos, sem criar uma arquitetura paralela de pagina ou desviar da App Router structure ja estabelecida.
  - [x] Preservar o comportamento de loading, allowed e denied do `AreaGuard`, adicionando a home apenas dentro do estado autorizado.
- [x] Implementar os blocos operacionais prioritarios da tesouraria usando primitives existentes e novos componentes operacionais em locais corretos (`src/components/ui`, `src/components/design-system`, `src/components/operational`) (AC: 1, 2, 3)
  - [x] Introduzir composicoes para `WeeklyPriorityBlock`, `QuickActionRail`, `OperationalPendingBlock`, `ClosingStatusBlock` e `PayablesReceivablesBlock` seguindo a gramatica visual aprovada no UX.
  - [x] Manter `shadcn/ui` como base tecnica e os tokens atuais de `globals.css` como fundacao visual, evitando biblioteca paralela de componentes ou widgets genericos de dashboard.
- [x] Definir uma camada inicial de dados mockados ou view-model local para a home, sem mover regra de dominio financeiro para o frontend e sem chamar o Laravel autenticado diretamente do browser (AC: 1, 2, 3, 4)
  - [x] Organizar os dados da home em `src/features` ou modulo proximo da feature para permitir evolucao futura para consumo via BFF.
  - [x] Garantir que qualquer contrato futuro continue em `snake_case` e que o browser continue consumindo apenas o `church-erp-web`.
- [x] Cobrir a story com validacoes de frontend focadas em boundary BFF, estrutura operacional da home e protecao contra regressao de acesso (AC: 1, 4)
  - [x] Atualizar ou ampliar os testes web existentes para assegurar que a rota da tesouraria continua protegida pela boundary correta e que a implementacao nao introduz chamadas diretas do browser ao Laravel.
  - [x] Executar pelo menos `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke` em `church-erp-web`.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story entrega a primeira home operacional real do MVP e define a gramatica base para as homes por perfil.
- O objetivo nao e construir um dashboard generico, e sim uma tela de trabalho para o tesoureiro entender prioridade, agir rapido e retomar o fluxo semanal com confianca.
- O fluxo hero desta epic comeca aqui: a home deve orientar para lancamento, revisao de pendencias, contas e fechamento.
- Esta story pode usar dados mockados ou view-model local, mas precisa nascer pronta para evolucao posterior via BFF sem reestruturacao da pagina.

### Guardrails de implementacao obrigatorios

- `church-erp-web/src/app/treasury/page.tsx` permanece como entrypoint oficial da area `treasury`.
- `AreaGuard` deve continuar sendo a boundary de acesso; a home nova entra apenas dentro do estado autorizado.
- O browser nao pode chamar o Laravel autenticado diretamente; qualquer evolucao de dados reais deve continuar passando pelo `church-erp-web`.
- Os blocos de negocio devem nascer em `church-erp-web/src/components/operational`; nao colocar contexto financeiro em `src/components/ui`.
- Se houver view-model, mocks ou mapeamento de blocos, mantelos em `church-erp-web/src/features` ou modulo de feature proximo, nao embutidos de forma ad hoc na page.
- Contratos HTTP futuros devem continuar em `snake_case`, alinhados ao BFF e ao backend Laravel.

### Abordagens proibidas

- Nao substituir, contornar ou duplicar `AreaGuard`.
- Nao criar uma biblioteca paralela de componentes para resolver a home da tesouraria.
- Nao introduzir widgets genericos de dashboard, nomenclatura vaga como `DashboardCard` ou uma interface corporativa distante do UX aprovado.
- Nao mover regra de autorizacao, tenant, validacao de dominio ou composicao de payload financeiro para React.
- Nao adicionar global state novo, chamadas diretas ao Laravel, rotas autenticadas paralelas ou backend novo nesta story.
- Nao tratar mocks como contrato definitivo de dominio; eles servem apenas como camada inicial de apresentacao.

### Arquivos provaveis a alterar ou criar

- `church-erp-web/src/app/treasury/page.tsx`
- `church-erp-web/src/components/operational/`
- `church-erp-web/src/components/design-system/`
- `church-erp-web/src/features/`
- `church-erp-web/tests/bff-smoke.test.mjs`
- Opcionalmente `church-erp-web/src/app/globals.css`, apenas se o ajuste for tokenizado e reutilizavel, nao especifico de tela

### Estados obrigatorios da UI

- `loading`: manter o loading inicial do `AreaGuard` com hierarquia coerente com a area.
- `denied`: preservar o caminho atual de acesso negado com mensagem funcional clara.
- `populated`: exibir os blocos da home com prioridade da semana, acoes principais, pendencias e fechamento atual.
- `empty`: quando nao houver dados suficientes em um bloco, mostrar orientacao clara e CTA util sem quebrar a estrutura da home.

### Composicao obrigatoria da home

- A home desta story deve renderizar obrigatoriamente os cinco blocos previstos para a primeira versao da tesouraria: `WeeklyPriorityBlock`, `QuickActionRail`, `OperationalPendingBlock`, `ClosingStatusBlock` e `PayablesReceivablesBlock`.
- A ordem de leitura deve ser: `WeeklyPriorityBlock` primeiro, `QuickActionRail` na mesma faixa de prioridade inicial ou imediatamente abaixo, depois `OperationalPendingBlock`, depois `ClosingStatusBlock`, e por fim `PayablesReceivablesBlock`.
- `WeeklyPriorityBlock` nao pode ser omitido nem rebaixado para bloco secundario.
- `OperationalPendingBlock`, `ClosingStatusBlock` e `PayablesReceivablesBlock` podem iniciar com dados mockados ou estado vazio orientado, mas devem existir visualmente nesta entrega.
- `PayablesReceivablesBlock` nao pode ser adiado para outra story sob o argumento de falta de backend; nesta entrega ele pode operar com dados de apresentacao e CTA coerente.

### Hierarquia visual obrigatoria

- `WeeklyPriorityBlock` deve ser o bloco dominante da tela.
- `QuickActionRail` deve dar acesso a tarefas centrais, nao apenas servir como lista decorativa.
- `OperationalPendingBlock` deve destacar contagem, contexto e proximo passo.
- `ClosingStatusBlock` e `PayablesReceivablesBlock` devem reforcar leitura operacional e prestacao de contas, nao metricas vazias.
- A home deve manter tom pastoral-operacional, leitura rapida em desktop e a direcao visual `Teal Operacional`.

### View-model minimo por bloco

- `WeeklyPriorityBlock`: `title`, `summary`, `priority_level`, `primary_action_label`, `secondary_action_label`.
- `QuickActionRail`: lista curta de acoes com `label`, `href` e `emphasis`.
- `OperationalPendingBlock`: lista ou resumo com `count`, `label`, `context`, `cta_label`.
- `ClosingStatusBlock`: `status_label`, `summary`, `pending_items_count`, `cta_label`.
- `PayablesReceivablesBlock`: `payables_summary`, `receivables_summary`, `highlight`, `cta_label`.
- Se algum bloco estiver em `empty`, o view-model ainda deve fornecer texto de orientacao e CTA util para evitar card vazio ou placeholder mudo.
- Os nomes acima sao referencia de conteudo minimo; se forem representados em TypeScript, devem continuar semanticamente equivalentes e orientados ao contexto operacional.

### Requisitos tecnicos obrigatorios

- Next.js `16.2.3`, React `19.2.4`, TypeScript estrito e Tailwind CSS `^4` continuam sendo a stack alvo do frontend. [Source: `church-erp-web/package.json`]
- O projeto usa `shadcn/ui` com `rsc: true`, `tsx: true` e CSS variables apontando para `src/app/globals.css`; novos primitives devem respeitar essa fundacao em vez de introduzir outra base visual. [Source: `church-erp-web/components.json`]
- `AreaGuard` hoje ja implementa `loading`, `allowed` e `denied` com `fetch` para `/api/backoffice/access/${area}` e `cache: "no-store"`; a home nova deve ser encaixada sobre esse comportamento em vez de reescrever a verificacao de acesso. [Source: `church-erp-web/src/components/operational/area-guard.tsx`]
- A camada BFF central continua em `church-erp-web/src/lib/api/client.ts`, que define `Accept`, `X-Internal-Audience`, `X-Internal-Issuer` e `cache: "no-store"` para chamadas ao Laravel. [Source: `church-erp-web/src/lib/api/client.ts`]
- A rota BFF atual de acesso por area ja existe em `church-erp-web/src/app/api/backoffice/access/[area]/route.ts`; esta story nao deve introduzir uma rota paralela apenas para verificar acesso da tesouraria. [Source: `church-erp-web/src/app/api/backoffice/access/[area]/route.ts`]

### Compliance de arquitetura

- O frontend deve seguir a separacao em tres camadas: primitives em `src/components/ui`, design system em `src/components/design-system` e blocos operacionais em `src/components/operational`. [Source: `_bmad-output/planning-artifacts/architecture.md`]
- Homes por perfil sao componente central da UX e nao vitrine de modulos; a composicao da tela deve priorizar blocos acionaveis, proxima acao e retorno ao contexto. [Source: `_bmad-output/planning-artifacts/ux-design-specification.md`]
- A rota tecnica permanece `treasury`, mas os labels visiveis e a nomenclatura dos componentes devem refletir linguagem operacional real. [Source: `_bmad-output/planning-artifacts/architecture.md`]

### Requisitos de teste

- Manter ou ampliar `church-erp-web/tests/bff-smoke.test.mjs` para proteger a boundary BFF e evitar regressao para chamadas diretas do browser ao Laravel.
- Executar `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke` em `church-erp-web` antes de marcar qualquer task como pronta.
- Validar pelo menos a existencia e composicao dos artefatos da home, o respeito ao `AreaGuard` e a ausencia de regressao na organizacao App Router/BFF.

### Cobertura minima de teste desta story

- Verificar que a rota `/treasury` continua implementada em `church-erp-web/src/app/treasury/page.tsx`.
- Verificar que a pagina da tesouraria continua usando `AreaGuard` como boundary de acesso.
- Verificar que a implementacao da home nao introduz chamada direta do browser ao Laravel autenticado.
- Verificar que a composicao da home contempla os cinco blocos obrigatorios desta story.
- Verificar que a base de validacao do frontend continua passando com `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke`.

### Licoes do Epic 1 que nao podem se repetir

- Nao deixar a story depender de interpretacao sobre onde implementar; paths esperados precisam ser citados explicitamente.
- Nao deixar aberto se a solucao deve estender comportamento existente ou criar fluxo novo; aqui a regra e estender `AreaGuard`, a rota `treasury` e os tokens atuais.
- Nao permitir criterios de aceite que validem apenas “a tela aparece”; a story precisa exigir estados, boundaries e comandos de verificacao.
- Nao deixar review descobrir restricoes fundamentais que ja eram previsiveis na escrita; tudo que for proibido de forma recorrente deve entrar na story.

### Project Structure Notes

- `church-erp-web/src/app/treasury/page.tsx` hoje e apenas placeholder guardado por `AreaGuard`; esta story deve transformar esse ponto em home real, sem mover a responsabilidade de autorizacao.
- `church-erp-web/src/app/secretaria/page.tsx` mostra o mesmo padrao placeholder para outra area; a tesouraria deve estabelecer o modelo que depois podera ser replicado com adaptacoes, e nao um one-off.
- `church-erp-web/src/app/page.tsx` ja usa cards de acesso e linguagem coerente com a fundacao visual atual; a home da tesouraria deve conversar com essa base sem repetir o hero da landing.
- `church-erp-web/src/components/design-system/surface.tsx` e `church-erp-web/src/app/globals.css` ja fornecem base visual, bordas, superfices e tokens que devem ser reaproveitados antes de criar variacoes novas.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 2, Story 2.1, ACs e restricoes de frontend da home da tesouraria.
- `_bmad-output/planning-artifacts/architecture.md` - regras de `church_id`, App Router, BFF, `shadcn/ui`, camadas de componentes e naming operacional.
- `_bmad-output/planning-artifacts/prd.md` - FR21, FR29 e escopo do MVP para homes operacionais por perfil.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - fluxo hero da tesouraria, `Teal Operacional`, blocos obrigatorios e hierarquia da home.
- `_bmad-output/project-context.md` - stack atual, regras de boundary BFF, `snake_case`, layering de componentes e proibicoes criticas.
- `church-erp-web/src/app/treasury/page.tsx` - entrypoint atual da area.
- `church-erp-web/src/components/operational/area-guard.tsx` - boundary de acesso existente que precisa ser preservada.
- `church-erp-web/src/components/design-system/surface.tsx` - padrao atual de superficie reutilizavel.
- `church-erp-web/src/app/globals.css` - tokens e direcao visual atual do frontend.
- `church-erp-web/src/lib/api/client.ts` - boundary de comunicacao BFF->Laravel.
- `church-erp-web/src/app/api/backoffice/access/[area]/route.ts` - verificacao de acesso por area no BFF.
- `church-erp-web/package.json` - versoes e scripts obrigatorios de verificacao.
- `church-erp-web/components.json` - configuracao do `shadcn/ui` na base atual.
- `https://nextjs.org/docs/app` - App Router oficial do Next.js, confirmado como base atual da estrutura de rotas.
- `https://nextjs.org/docs/app/guides/upgrading/version-16` - referencia oficial para comportamento do App Router no Next.js 16.
- `https://tailwindcss.com/docs/theme` - documentacao oficial de theme variables no Tailwind CSS v4.
- `https://ui.shadcn.com/docs/components` - catalogo oficial de componentes `shadcn/ui`.

### Checklist pre-review

- A pagina continua entrando por `church-erp-web/src/app/treasury/page.tsx`.
- `AreaGuard` foi preservado e nao duplicado.
- Nao existe chamada direta do browser ao Laravel.
- Os blocos operacionais estao em componentes com nomes orientados ao contexto real.
- Existe estado `empty` claro para blocos sem dados.
- A hierarquia visual da home nao parece dashboard generico.
- `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke` passaram.

### Git intelligence

- Os commits recentes mostram um padrao consistente de implementacao incremental por story (`1.3`, `1.4`, `1.5`) sem refactor amplo do frontend; esta story deve seguir o mesmo principio de mudanca focada.
- O historico recente reforca que as revisoes mais sensiveis do projeto ocorreram em boundaries de autenticacao, BFF e tenancy; por isso a home da tesouraria nao deve introduzir atalhos fora de `AreaGuard` nem comunicacao paralela com o Laravel.
- O commit `c255133` consolidou a autenticacao e o BFF; a story 2.1 deve consumir essa fundacao, nao redesenhar sessao, acesso ou fetch autenticado.
- Os commits `87dd9ed`, `3500ae1` e `77cf776` indicam um fluxo de entrega por stories bem delimitadas; a 2.1 deve manter esse nivel de escopo e nao antecipar lancamentos financeiros reais, auditoria ou estados de dominio de stories futuras.

### Latest tech information

- O App Router segue sendo o modelo oficial de roteamento do Next.js e usa os recursos modernos do React para estrutura de pages, layouts e componentes server/client. [Source: https://nextjs.org/docs/app]
- O guia oficial de upgrade do Next.js 16 confirma o App Router como base atual para a versao adotada no projeto. [Source: https://nextjs.org/docs/app/guides/upgrading/version-16]
- O Tailwind CSS v4 trata design tokens por `@theme` e theme variables, o que reforca a decisao de manter a evolucao visual da home dentro de `globals.css` e tokens semanticos em vez de styling ad hoc por tela. [Source: https://tailwindcss.com/docs/theme]
- O `shadcn/ui` continua adequado como infraestrutura de primitives reutilizaveis, mas nao substitui a necessidade de componentes operacionais compostos especificos do produto. [Source: https://ui.shadcn.com/docs/components]

### Project context reference

- Esta story deve ser implementada em conformidade com `_bmad-output/project-context.md`, especialmente nas regras de:
  - browser consumir apenas o `church-erp-web`
  - `snake_case` nos contratos HTTP
  - separacao entre `src/components/ui`, `src/components/design-system` e `src/components/operational`
  - proibicao de mover autorizacao, tenancy ou validacao sensivel para React
  - comandos obrigatorios de verificacao do frontend antes de review

### Story completion status

- Status da story neste momento: `done`
- Nota de conclusao: home operacional da tesouraria implementada, revisada e validada contra boundary BFF, composicao obrigatoria dos blocos e estados vazios orientados a acao
- Proximo passo esperado: seguir para a proxima story do epic 2 usando esta home como fundacao

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Validar a boundary existente com um teste de fumaça antes de mexer na rota da tesouraria.
- Trocar o placeholder de `church-erp-web/src/app/treasury/page.tsx` por um shell operacional dedicado, mantendo `AreaGuard` como unico ponto de autorizacao do browser.
- Fechar a task com teste passando e registro explicito dos arquivos alterados para a proxima etapa da story.

### Debug Log References

- Story descoberta automaticamente a partir do backlog `2-1-exibir-home-operacional-do-tesoureiro` em `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- `epic-2` foi promovido para `in-progress` no inicio da criacao desta story.
- A analise usou `epics.md`, `architecture.md`, `prd.md`, `ux-design-specification.md`, `_bmad-output/project-context.md` e o estado atual de `church-erp-web`.
- A rota atual `church-erp-web/src/app/treasury/page.tsx` foi confirmada como placeholder protegido por `AreaGuard`.
- O fluxo atual de acesso por area no BFF foi confirmado em `church-erp-web/src/app/api/backoffice/access/[area]/route.ts`.
- O cliente interno BFF->Laravel foi confirmado em `church-erp-web/src/lib/api/client.ts`.
- As versoes atuais de Next.js, React, Tailwind CSS e a configuracao do `shadcn/ui` foram confirmadas localmente em `church-erp-web/package.json` e `church-erp-web/components.json`.
- Documentacao oficial consultada para confirmar estado atual de App Router no Next.js 16, theme variables do Tailwind CSS v4 e catalogo oficial de componentes `shadcn/ui`.
- A story foi reforcada com guardrails extras para evitar repeticao do padrao de revisao da revisao observado no Epic 1.
- `npm test` falhou primeiro porque `src/components/operational/treasury-home-shell.tsx` ainda nao existia e a page da tesouraria ainda renderizava apenas o placeholder original.
- `npm test` voltou a passar apos a troca da page para `TreasuryHomeShell`, mantendo `AreaGuard` como boundary da rota `/treasury`.
- A segunda rodada de `npm test` falhou quando o shell ainda nao compunha explicitamente os cinco blocos operacionais nomeados pela story.
- A suite voltou a passar apos a criacao de `WeeklyPriorityBlock`, `QuickActionRail`, `OperationalPendingBlock`, `ClosingStatusBlock` e `PayablesReceivablesBlock` em `src/components/operational`.
- A terceira rodada de `npm test` falhou quando o shell ainda mantinha o view-model inline e `src/features/treasury/home-view-model.ts` ainda nao existia.
- A suite voltou a passar apos mover o mock local para `src/features/treasury/home-view-model.ts` e consumir `treasury_home_view_model` a partir do shell operacional.
- Validacoes finais executadas em `church-erp-web`: `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke`, todas concluidas com sucesso.

### Completion Notes List

- Story escrita para estender a fundacao existente da area `treasury`, sem criar fluxo paralelo de acesso ou nova arquitetura de pagina.
- Home da tesouraria ficou explicitamente obrigada a renderizar cinco blocos iniciais: `WeeklyPriorityBlock`, `QuickActionRail`, `OperationalPendingBlock`, `ClosingStatusBlock` e `PayablesReceivablesBlock`.
- A ordem de leitura da home, o view-model minimo por bloco, os estados obrigatorios da UI e a cobertura minima de teste foram fixados na propria story.
- As proibicoes contra dashboard generico, chamada direta ao Laravel, global state novo e duplicacao de `AreaGuard` foram registradas de forma explicita.
- O template base de `create-story` e o `instructions.xml` do workflow tambem foram endurecidos para que historias futuras nascam com a mesma blindagem.
- Placeholder de `church-erp-web/src/app/treasury/page.tsx` foi removido e substituido por `TreasuryHomeShell`, sem alterar a rota oficial nem duplicar verificacao de acesso.
- A nova composicao inicial da home ja reserva as cinco regioes operacionais da tesouraria e deixa a hierarquia dominante pronta para a implementacao dos blocos completos na proxima task.
- A suite web recebeu um teste de fumaça para garantir que a rota `/treasury` continue usando `AreaGuard` e nao acople fetch direto ao Laravel.
- Os cinco blocos operacionais agora existem como componentes dedicados, mantendo `Surface` e `Button` como fundacao tecnica e evitando nomenclatura generica de dashboard.
- `TreasuryHomeShell` passou a ordenar a leitura em `WeeklyPriorityBlock`, `QuickActionRail`, `OperationalPendingBlock`, `ClosingStatusBlock` e `PayablesReceivablesBlock`, como exigido pela story.
- O view-model local da home foi consolidado em `src/features/treasury/home-view-model.ts`, preservando chaves em `snake_case` para facilitar a futura migracao para consumo via BFF.
- O bloco `PayablesReceivablesBlock` ganhou estado vazio orientado a acao, mantendo a estrutura da home quando ainda nao ha dados operacionais suficientes.
- A cobertura de smoke tests agora protege boundary de acesso, composicao obrigatoria dos cinco blocos, view-model na feature layer e o estado vazio orientado a acao.
- A story passou em `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke` antes de ser promovida para `review`.
- O code review corrigiu os destinos quebrados de CTA na home da tesouraria, garantindo que toda ancora `#/treasury` declarada no view-model tenha secao correspondente no shell operacional.
- `QuickActionRail`, `OperationalPendingBlock` e `ClosingStatusBlock` passaram a expor estado vazio orientado a acao, evitando blocos silenciosos quando faltar dado operacional.
- Os smoke tests foram endurecidos para validar ancoras reais da home e a existencia dos branches de empty state em vez de apenas procurar nomes de componentes.

### File List

- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/2-1-exibir-home-operacional-do-tesoureiro.md
- church-erp-web/src/app/treasury/page.tsx
- church-erp-web/src/components/operational/closing-status-block.tsx
- church-erp-web/src/components/operational/operational-pending-block.tsx
- church-erp-web/src/components/operational/payables-receivables-block.tsx
- church-erp-web/src/components/operational/quick-action-rail.tsx
- church-erp-web/src/components/operational/treasury-home-shell.tsx
- church-erp-web/src/components/operational/weekly-priority-block.tsx
- church-erp-web/src/app/api/categories/defaults/route.ts
- church-erp-web/src/features/categories/defaults.ts
- church-erp-web/src/features/treasury/home-view-model.ts
- church-erp-web/tests/bff-smoke.test.mjs

## Senior Developer Review (AI)

### Reviewer

- Wesley Silva (AI) - 2026-05-06

### Outcome

- Approved after fixes

### Review Notes

- Corrigido o desvio entre CTAs do view-model e ancoras realmente expostas pela home da tesouraria.
- Corrigidos os blocos que ficavam silenciosos quando os dados vinham vazios, com CTA e texto de orientacao preservando a estrutura da tela.
- Fortalecida a suite de smoke tests para validar integridade de ancoras e branches de empty state de forma objetiva.
- O worktree continua com mudancas adjacentes fora do escopo funcional desta story, especialmente em `church-erp-web/src/app/api/categories/defaults/route.ts` e `church-erp-web/src/features/categories/defaults.ts`; elas foram mantidas intactas e registradas aqui para transparencia.

## Change Log

- 2026-05-05: iniciou a implementacao da story, atualizou o sprint status para `in-progress`, substituiu o placeholder da tesouraria por um shell operacional protegido por `AreaGuard` e adicionou teste de fumaça para a boundary da rota.
- 2026-05-05: implementou os cinco blocos operacionais da home da tesouraria com componentes dedicados em `src/components/operational`, mantendo `Surface` e `Button` como base visual e reforcando teste estrutural contra naming generico de dashboard.
- 2026-05-05: moveu o mock local da home para `src/features/treasury/home-view-model.ts`, alinhou o shell com a camada de feature e adicionou estado vazio orientado a acao para o bloco de contas a pagar e a receber.
- 2026-05-05: ampliou os smoke tests da tesouraria e validou a entrega com `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke`, concluindo a story em status `review`.
- 2026-05-06: aplicou correções de code review: introduziu `TreasuryHomeViewModel` type para maior segurança estrutural, removeu casts rígidos de `as const` e adicionou optional chaining com fallbacks no `TreasuryHomeShell` para prevenir runtime errors. Validou com `npm run verify` e moveu a story para `done`.
- 2026-05-06: concluiu o code review da story 2.1, alinhou ancoras reais da home com os CTAs do view-model, adicionou empty states explicitos aos blocos operacionais que ainda sumiam sem dados e endureceu os smoke tests para capturar esses contratos.
- 2026-05-06: moveu os contratos de empty state para o `treasury_home_view_model`, alinhou o shell a consumir esses estados a partir da feature layer e saneou a documentacao da story para refletir status e arquivos reais do worktree.
