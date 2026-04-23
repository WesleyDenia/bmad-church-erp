# Story 1.2: Criar igreja e conta administradora inicial

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a responsavel pela implantacao da igreja,
I want criar o perfil inicial da igreja junto com a conta administradora,
so that eu possa iniciar o uso do sistema sem depender de configuracao externa.

## Acceptance Criteria

1. Dado que ainda nao existe uma igreja cadastrada para aquele contexto de onboarding, quando o usuario informa os dados minimos da igreja e da conta inicial, entao o sistema cria a igreja e associa a conta administradora ao tenant correto, e apresenta confirmacao clara de sucesso.
2. Dado que campos obrigatorios nao foram preenchidos, quando o usuario tenta concluir o onboarding, entao o sistema impede a finalizacao, e explica os erros em linguagem simples.

## Tasks / Subtasks

- [ ] Modelar a fundacao de onboarding e tenancy inicial no backend (AC: 1)
  - [ ] Criar migration para `churches` com dados minimos da igreja necessarios para o onboarding inicial.
  - [ ] Criar migration para `church_user` como vinculo usuario x igreja x papel, com `church_id`, `user_id`, `role`, `status` e timestamps.
  - [ ] Ajustar o modelo `User` e criar os modelos de dominio necessarios em `app/Domain/Identity/Models` para refletir a relacao com tenant.
  - [ ] Garantir foreign keys e indices coerentes com MySQL 8.4 e com a regra fundacional de isolamento por `church_id`.

- [ ] Implementar o caso de uso transacional de criacao da igreja com conta inicial (AC: 1, 2)
  - [ ] Criar request object para validar payload minimo do onboarding em `app/Http/Requests`.
  - [ ] Criar service em `app/Domain/Identity/Services` que execute a criacao da igreja, da usuaria inicial e do vinculo `church_user` dentro de `DB::transaction(...)`.
  - [ ] Persistir a senha usando hashing idiomatico do Laravel, sem logar senha nem trafegar segredo de volta na resposta.
  - [ ] Definir o papel inicial como `administrator` apenas para bootstrap da igreja; nao implementar ainda a matriz completa de permissoes dos perfis operacionais da story 1.4.
  - [ ] Garantir idempotencia funcional minima para o onboarding, bloqueando duplicacao indevida por email da conta inicial e por contexto basico da igreja.

- [ ] Expor o endpoint publico de onboarding no Laravel com contrato consistente (AC: 1, 2)
  - [ ] Criar controller em `app/Http/Controllers/Api/V1` para receber o onboarding inicial.
  - [ ] Registrar rota versionada publica dedicada ao onboarding, sem misturar este fluxo com o login da story 1.3.
  - [ ] Retornar sucesso via `JsonResource` com payload minimo para a confirmacao do frontend.
  - [ ] Padronizar erros de validacao em linguagem simples e previsivel para o BFF.

- [ ] Implementar o fluxo BFF de onboarding no Next.js sem autenticacao final ainda (AC: 1, 2)
  - [ ] Criar `src/app/(auth)/onboarding/page.tsx` com formulario curto orientado a primeira configuracao.
  - [ ] Criar route handler em `src/app/api/onboarding/initial-setup/route.ts` para o browser falar apenas com o `church-erp-web`.
  - [ ] Reutilizar `src/lib/api/client.ts` para encaminhar a chamada ao Laravel sem expor a API diretamente ao browser.
  - [ ] Implementar a UI do onboarding sobre a foundation aprovada do frontend, usando tokens/temas compartilhados e preparando extracao para `src/components/ui`, `src/components/design-system` e `src/components/operational` quando surgirem blocos reutilizaveis.
  - [ ] Exibir confirmacao clara de sucesso ao concluir o onboarding, com CTA explicita para seguir ao login.
  - [ ] Nao criar sessao autenticada nesta story; login, cookie `HttpOnly`, `/auth/me` e JWT interno autenticado continuam na story 1.3.

- [ ] Refinar a UX de validacao e mensagens do onboarding (AC: 2)
  - [ ] Exibir erros por campo em linguagem simples, sem jargao tecnico.
  - [ ] Preservar os dados digitados quando houver erro de validacao retornado pelo BFF.
  - [ ] Manter o formulario curto, com foco nos campos minimos realmente necessarios para primeiro valor.
  - [ ] Seguir a direcao visual "Teal Operacional", evitando layout generico de SaaS ou pagina isolada fora do design system.

- [ ] Cobrir o fluxo com testes e atualizacoes minimas de documentacao (AC: 1, 2)
  - [ ] Adicionar testes de feature no Laravel cobrindo sucesso transacional e falhas de validacao.
  - [ ] Adicionar teste do route handler BFF e/ou smoke test web cobrindo encaminhamento do onboarding.
  - [ ] Atualizar os READMEs apenas no necessario para documentar endpoint, variaveis e fluxo local de validacao.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story e o primeiro valor funcional real do Epic 1. Ela deve permitir a configuracao inicial da igreja sem depender ainda do fluxo completo de autenticacao operacional.
- O onboarding precisa criar tenant e conta inicial de forma atomica e confiavel, preparando o terreno para a story 1.3 autenticar essa conta via BFF.
- O produto precisa entregar valor rapido com configuracao minima. Evite transformar o onboarding em cadastro administrativo longo.

### Requisitos tecnicos obrigatorios

- O browser continua falando apenas com o `church-erp-web`; nao implementar chamada direta autenticada do browser para o Laravel.
- O backend Laravel continua sendo a fonte de verdade para validacao, persistencia, tenancy e regras do onboarding.
- Toda entidade nova relevante desta story deve respeitar a fundacao multi-tenant por `church_id`.
- O fluxo de criacao de igreja + usuaria inicial + vinculo de tenant precisa ser transacional.
- O contrato HTTP deve permanecer em `snake_case`.
- Respostas de sucesso da API devem continuar usando `JsonResource`.
- Nao introduzir autenticacao completa nesta story. A conta inicial deve ser criada, mas a sessao autenticada fica para a story 1.3.
- A interface de onboarding deve nascer sobre a foundation visual aprovada: `shadcn/ui` como base tecnica prevista, tokens e temas do produto como linguagem final, e componentes organizados para evoluir sem retrabalho.

### Compliance de arquitetura

- Manter o backend organizado em `app/Domain/Identity` para os artefatos de dominio desta story.
- Nao colocar regra de criacao de tenant em controller; o controller deve delegar para um service.
- Nao usar Blade, Livewire, Inertia ou starter acoplado para resolver onboarding.
- Nao mover validacao principal para React; validacao de frontend aqui e complementar e orientada a UX.
- Nao inferir que `middleware.ts` atual resolve autenticacao. O proprio repo ja marca esse arquivo apenas como placeholder.
- Se houver necessidade de tocar guarda server-side no Next.js, limitar o escopo ao necessario para o onboarding e nao misturar com a migracao de `middleware` para `proxy` do Next.js 16.
- Nao estilizar onboarding como pagina avulsa sem relacao com o design system. Reaproveitar tokens semanticos, tipografia, densidade e hierarquia visual ja estabelecidos no frontend.
- Se a story introduzir novos componentes de interface, respeitar a separacao entre primitives base, design system compartilhado e componentes operacionais/contextuais.

### Requisitos atuais de bibliotecas e framework

- O backend atual usa Laravel 12 com PHP `^8.3` em `church-erp-api/composer.json`.
- O frontend atual usa Next.js `16.2.3`, React `19.2.4` e route handlers no App Router em `church-erp-web/package.json`.
- A documentacao oficial mais recente do Next.js App Router continua recomendando `route.ts` dentro de `app/` para handlers HTTP.
- A documentacao oficial do Next.js em fevereiro e marco de 2026 renomeia `middleware` para `proxy`; como o repositorio ainda contem `src/middleware.ts` por decisao da story 1.1, nao fazer migracao ampla nesta story sem necessidade funcional.
- A documentacao oficial do Laravel 12 continua recomendando hashing via `Hash` facade e operacoes atomicas com `DB::transaction(...)`.
- O MySQL 8.4 continua suportando foreign keys com `RESTRICT`, `CASCADE`, `SET NULL` e `NO ACTION`; escolher a acao de delecao/atualizacao de forma coerente com o bootstrap do tenant.
- A arquitetura e o UX aprovados fixam `shadcn/ui` como infraestrutura de primitives e `Tailwind CSS` como camada de tokens, composicao e customizacao visual do produto.
- A direcao visual base do frontend apos o UX e "Teal Operacional", com tokens semanticos, tipografia propria e foco em clareza operacional.

### Estrutura de arquivos obrigatoria

- Backend provavel desta story:
  - `church-erp-api/app/Domain/Identity/Models/Church.php`
  - `church-erp-api/app/Domain/Identity/Models/ChurchUser.php`
  - `church-erp-api/app/Domain/Identity/Services/CreateInitialChurchSetupService.php`
  - `church-erp-api/app/Http/Controllers/Api/V1/InitialChurchSetupController.php`
  - `church-erp-api/app/Http/Requests/StoreInitialChurchSetupRequest.php`
  - `church-erp-api/app/Http/Resources/InitialChurchSetupResource.php`
  - `church-erp-api/database/migrations/*_create_churches_table.php`
  - `church-erp-api/database/migrations/*_create_church_user_table.php`
  - `church-erp-api/routes/api.php`
- Frontend provavel desta story:
  - `church-erp-web/src/app/(auth)/onboarding/page.tsx`
  - `church-erp-web/src/app/api/onboarding/initial-setup/route.ts`
  - `church-erp-web/src/features/auth/` para helpers e tipos especificos do onboarding, se a implementacao precisar extrair logica da pagina
  - `church-erp-web/src/components/ui/` para primitives base, se a story introduzir campos ou acoes reutilizaveis
  - `church-erp-web/src/components/design-system/` para wrappers, variantes e abstracoes visuais compartilhadas do onboarding
  - `church-erp-web/src/components/operational/` apenas se o fluxo exigir bloco contextual reutilizavel de confirmacao ou orientacao operacional
  - `church-erp-web/src/design-system/` e/ou `church-erp-web/src/styles/` para evoluir tokens/temas quando a implementacao precisar sair de estilos inline/pagina
  - `church-erp-web/src/lib/api/client.ts` para reutilizar a chamada BFF -> Laravel sem duplicar infraestrutura

### Detalhamento funcional minimo sugerido

- Dados minimos da igreja:
  - nome da igreja
  - identificador curto opcional ou slug gerado no backend, se isso ajudar unicidade sem expor complexidade ao usuario
- Dados minimos da conta inicial:
  - nome completo
  - email
  - senha
  - confirmacao de senha
- Resultado esperado de sucesso:
  - igreja criada
  - usuaria inicial criada
  - vinculo `church_user` criado com tenant correto
  - mensagem clara informando que a configuracao inicial foi concluida e que o proximo passo e entrar no sistema

### Guardrails de modelagem e dominio

- Nao prender o papel operacional definitivo desta usuaria ao escopo de autenticacao futura; esta story cria a conta bootstrap, e a formalizacao completa das permissoes fica para a story 1.4.
- Evitar adicionar campos especulativos de perfil da igreja que nao sejam necessarios para o MVP imediato.
- Evitar criar uma tabela de roles separada nesta story se o objetivo puder ser atendido com `church_user.role` simples e bem documentado.
- Garantir que o email da conta inicial continue unico no nivel adequado da aplicacao.
- Se o onboarding precisar impedir segunda configuracao inicial no mesmo contexto, fazer isso explicitamente no service e nos testes.

### Inteligencia da story anterior

- A story 1.1 ja deixou o repositorio com `church-erp-api` e `church-erp-web` separados, com `app/Domain`, `src/lib/api/client.ts`, `src/middleware.ts` e shell inicial das rotas.
- O hook `useSessionContext()` ainda retorna `null`, e a pagina de login explicita que o fluxo completo de autenticacao fica para a story 1.3.
- Isso significa que a story atual deve preparar onboarding e persistencia, mas nao deve fingir que sessao, guards e `/auth/me` ja existem.

### Git intelligence

- O historico recente depois da fundacao do codigo foi dominado por artefatos de UX e arquitetura; nao ha sinal de que o onboarding ja tenha sido implementado parcialmente em codigo.
- O dev agent deve tratar esta story como a primeira implementacao real do dominio `Identity`, e nao como ajuste incremental sobre um fluxo existente.

### Projeto e UX relevantes para esta story

- O PRD exige primeiro valor com configuracao minima no mesmo dia da entrada da igreja.
- A UX pede linguagem acolhedora, orientacao clara e baixa carga cognitiva para usuarios nao tecnicos.
- O onboarding deve ser curto, guiado e sem tom burocratico. Erros devem dizer o que falta e como corrigir.
- O fluxo deve terminar com confirmacao clara, nao com ambiguidade sobre o que aconteceu.
- O UX tambem exige que o onboarding preserve a identidade visual do produto: `shadcn/ui` apenas como infraestrutura, temas/tokens proprios e composicao coerente com o design system da aplicacao.

### Project Structure Notes

- Durante a criacao original desta story, nenhum `project-context.md` existia. Apos a geracao de `_bmad-output/project-context.md` em 2026-04-22, qualquer continuidade da Story 1.2 deve usar esse arquivo como fonte obrigatoria de guardrails de implementacao, junto com PRD, arquitetura, UX, Story 1.1 e sprint status.
- O backend atual ainda usa `App\Models\User` padrao e migration default de `users`, portanto esta story provavelmente precisara adaptar esse baseline para tenancy inicial.
- O frontend atual ainda nao contem `src/features/auth` nem route handlers de onboarding; a story pode introduzir esses pontos respeitando a estrutura da arquitetura.
- Embora o repositorio ainda nao tenha expandido todas as pastas finais do design system, `src/app/globals.css` e `src/app/layout.tsx` ja estabelecem tokens semanticos iniciais, tipografia propria e direcao visual que o onboarding deve reaproveitar.
- `src/components/app-shell-card.tsx` mostra o inicio da linguagem de componentes compartilhados; o onboarding nao deve regredir para uma UI desconectada dessa base.
- O repositorio ja contem `church-erp-api/vendor` e `church-erp-web/node_modules`, entao a story deve trabalhar em cima do baseline existente, sem recriar scaffolds.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 1, Story 1.2, Acceptance Criteria.
- `_bmad-output/planning-artifacts/prd.md` - secoes 8.1, 11 FR-1 e 12 NFR-2, NFR-5, NFR-7.
- `_bmad-output/planning-artifacts/architecture.md` - Data Architecture, Implementation Patterns, Project Structure, ADR Authentication via Next.js BFF with Internal JWT Context, Authorization Strategy by Role in Laravel.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - principios de clareza, familiaridade, formularios curtos, feedback claro e primeiro valor com baixa friccao.
- `_bmad-output/implementation-artifacts/1-1-inicializar-a-fundacao-do-projeto-com-backend-e-frontend-desacoplados.md` - learnings sobre fundacao BFF, placeholders de auth e estrutura real do repositorio.
- `_bmad-output/project-context.md` - regras duraveis para agentes sobre stack, fronteiras Laravel/Next.js, contratos `snake_case`, BFF, tenancy, testes, qualidade e fluxo BMAD.
- `https://laravel.com/docs/12.x/validation` - validacao oficial do Laravel 12.
- `https://laravel.com/docs/12.x/database` - transacoes e operacoes atomicas no Laravel 12.
- `https://laravel.com/docs/12.x/hashing` - hashing oficial de senhas no Laravel 12.
- `https://nextjs.org/docs/app/api-reference/file-conventions/route` - route handlers do App Router.
- `https://nextjs.org/docs/app/getting-started/proxy` - renomeacao de middleware para proxy no Next.js 16.
- `https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html` - foreign keys no MySQL 8.4.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `php artisan test`
- `php artisan test --filter=InitialChurchSetupTest`
- `vendor/bin/pint --dirty`
- `find app routes database tests -name '*.php' -print0 | xargs -0 -n1 php -l`
- `php artisan route:list --path=api/v1`
- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `php artisan test --filter=InitialChurchSetupTest` (2026-04-22: bloqueado por ausencia de `pdo_sqlite`)
- `npm run test` (2026-04-22: passou)
- `npm run typecheck` (2026-04-22: passou)

### Completion Notes List

- Story criada automaticamente a partir do primeiro item em `backlog` no `sprint-status.yaml`: `1-2-criar-igreja-e-conta-administradora-inicial`.
- O escopo foi mantido separado da autenticacao completa para respeitar a divisao planejada entre as stories 1.2, 1.3 e 1.4.
- A modelagem proposta explicita `churches` e `church_user` porque o baseline atual ainda nao materializa tenancy no schema.
- Foi registrada uma decisao de guardrail para usar `administrator` apenas como papel de bootstrap desta story, deixando a matriz operacional para a story 1.4.
- Durante a criacao original da story, nenhum `project-context.md` foi encontrado; a partir de 2026-04-22, `_bmad-output/project-context.md` passa a ser fonte obrigatoria para continuidade, revisao e handoff desta story.
- Foram adicionadas referencias oficiais atuais para Laravel 12, Next.js App Router/Proxy e MySQL 8.4 para reduzir risco de implementacao desatualizada.
- A story agora explicita que o onboarding deve ser implementado sobre a foundation frontend aprovada apos o UX: tokens/temas semanticos, design system proprio e organizacao clara de componentes.
- Implementacao inicial adicionada para migrations `churches` e `church_user`, modelos de dominio, service transacional de onboarding, request/resource/controller e rota publica versionada no Laravel.
- Implementacao inicial adicionada para pagina `/onboarding`, route handler BFF `/api/onboarding/initial-setup` e tipos compartilhados de onboarding no Next.js.
- Testes Laravel de feature foram adicionados para sucesso, validacao e bloqueio de email duplicado, mas nao puderam ser executados ate o fim neste ambiente porque o PHP local nao possui `pdo_sqlite`.
- A story permanece `in-progress` porque o gate de testes Laravel nao fechou; nao marquei tarefas como concluidas nem movi para `review`.
- Verificacao pos-`project-context.md` concluida em 2026-04-22: a implementacao parcial esta alinhada aos guardrails centrais de Laravel API/domain backend, Next.js BFF, contratos `snake_case`, `JsonResource`, service transacional e separacao de autenticacao completa para a Story 1.3.
- Pontos de continuidade antes de review: fechar o gate Laravel em ambiente com driver de banco disponivel, completar/validar testes web especificos do onboarding se necessario e so entao marcar tarefas como concluidas.

### Change Log

- 2026-04-21: Implementacao inicial do fluxo de onboarding criada; validacao final bloqueada por ausencia de driver SQLite no PHP local.
- 2026-04-22: Revisada contra `_bmad-output/project-context.md` recem-criado; mantida em `in-progress` por gate Laravel bloqueado, sem necessidade de reabrir ou alterar escopo.

### File List

- `_bmad-output/implementation-artifacts/1-2-criar-igreja-e-conta-administradora-inicial.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `church-erp-api/README.md`
- `church-erp-api/app/Domain/Identity/Models/Church.php`
- `church-erp-api/app/Domain/Identity/Models/ChurchUser.php`
- `church-erp-api/app/Domain/Identity/Services/CreateInitialChurchSetupService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/InitialChurchSetupController.php`
- `church-erp-api/app/Http/Requests/StoreInitialChurchSetupRequest.php`
- `church-erp-api/app/Http/Resources/InitialChurchSetupResource.php`
- `church-erp-api/app/Models/User.php`
- `church-erp-api/database/migrations/2026_04_21_000001_create_churches_table.php`
- `church-erp-api/database/migrations/2026_04_21_000002_create_church_user_table.php`
- `church-erp-api/routes/api.php`
- `church-erp-api/tests/Feature/Identity/InitialChurchSetupTest.php`
- `church-erp-web/README.md`
- `church-erp-web/src/app/(auth)/onboarding/page.tsx`
- `church-erp-web/src/app/api/onboarding/initial-setup/route.ts`
- `church-erp-web/src/features/auth/initial-setup.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`
