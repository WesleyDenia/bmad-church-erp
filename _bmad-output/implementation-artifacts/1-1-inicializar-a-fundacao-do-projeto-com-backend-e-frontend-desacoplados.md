# Story 1.1: Inicializar a fundacao do projeto com backend e frontend desacoplados

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a equipe de produto,
I want inicializar `church-erp-api` em Laravel e `church-erp-web` em Next.js com a configuracao base do projeto,
so that as proximas stories sejam implementadas sobre a arquitetura aprovada e sem retrabalho estrutural.

## Acceptance Criteria

1. Dado que o projeto ainda nao foi inicializado, quando a equipe executa o bootstrap definido na arquitetura, entao o repositorio passa a conter `church-erp-api` criado com Laravel 12 e `church-erp-web` criado com Next.js App Router, e a estrutura base de pastas, configuracoes e ferramentas acordadas fica pronta para evolucao.
2. Dado que a fundacao tecnica foi criada, quando a equipe conclui a configuracao inicial, entao o backend fica preparado para usar MySQL 8.4, organizacao por dominio e escopo por `church_id`, e o frontend fica preparado para atuar como BFF autenticado entre browser e API.

## Tasks / Subtasks

- [x] Inicializar a base do workspace conforme a arquitetura aprovada (AC: 1)
  - [x] Criar `church-erp-api` com Laravel 12 dentro da raiz do projeto.
  - [x] Criar `church-erp-web` com Next.js App Router, TypeScript, Tailwind, ESLint e `src/`.
  - [x] Garantir que a raiz continue sendo o mono-workspace documental do projeto, sem colapsar backend e frontend numa unica app.
- [x] Estruturar o backend para crescimento por dominio desde o primeiro commit util (AC: 1, 2)
  - [x] Criar os diretorios base em `church-erp-api/app/Domain`: `Identity`, `Finance`, `People`, `Operations`, `Communications`.
  - [x] Em cada dominio, preparar as subpastas `Models`, `Services`, `Resources` e `Repositories`.
  - [x] Garantir a existencia e o uso pretendido de `app/Http/Controllers/Api/V1`, `app/Http/Requests` e `app/Policies`.
- [x] Configurar o backend para o baseline tecnico do MVP (AC: 2)
  - [x] Ajustar `.env.example` para MySQL 8.4 com variaveis claras e sem credenciais reais.
  - [x] Registrar convencoes de tenancy via `church_id` no README tecnico ou documentacao local do backend.
  - [x] Confirmar que respostas bem-sucedidas da API sigam o padrao idiomatico de `JsonResource` e `ResourceCollection`, mesmo que as primeiras resources sejam adicionadas em historias seguintes.
- [x] Estruturar o frontend como BFF e interface operacional (AC: 1, 2)
  - [x] Preparar `src/app`, `src/components`, `src/features`, `src/lib`, `src/hooks` e `src/types` conforme a arquitetura.
  - [x] Criar a base para rotas `src/app/(auth)`, `src/app/treasury`, `src/app/secretaria`, `src/app/leadership` e `src/app/communications`.
  - [x] Preparar uma camada em `src/lib/api` para concentrar chamadas do BFF ao Laravel, sem consumo autenticado direto do browser para a API.
  - [x] Deixar a fundacao visual alinhada ao UX aprovado: `shadcn/ui` como camada base prevista, tokens/temas semanticos do produto, tipografia propria e separacao futura entre primitives, design system compartilhado e componentes operacionais.
- [x] Preparar o fluxo minimo de desenvolvimento e qualidade (AC: 1)
  - [x] Confirmar arquivos base de configuracao em cada app (`README`, `.env.example`, configs de lint/teste).
  - [x] Criar `.github/workflows/api-ci.yml` e `.github/workflows/web-ci.yml` ou stubs equivalentes, se ainda nao existirem.
  - [x] Garantir que cada app consiga instalar dependencias e subir localmente de forma independente.
- [x] Registrar guardrails para as proximas historias (AC: 2)
  - [x] Documentar que o browser autentica contra `church-erp-web` e que o `church-erp-web` usa JWT interno de curta duracao para falar com `church-erp-api`.
  - [x] Explicitar que toda regra de validacao principal, autorizacao e escopo por tenant permanecem no Laravel.
  - [x] Deixar claro que consultas futuras em entidades de dominio relevantes deverao considerar `church_id`.

### Review Follow-ups (AI)

- [x] [AI-Review][Medium] Inicializar de fato a fundacao `shadcn/ui` ou ajustar a story/arquitetura para remover essa claim; hoje nao ha `components.json`, dependencias auxiliares ou primitives derivadas de shadcn, apesar da task marcada como concluida. [church-erp-web/package.json:13]
- [x] [AI-Review][Medium] Desacoplar o smoke test da Story 1.1 dos artefatos da Story 1.2; o baseline da fundacao nao deve exigir `/onboarding`, route handler de onboarding ou tipos `features/auth` para passar. [church-erp-web/tests/bff-smoke.test.mjs:14]
- [x] [AI-Review][Low] Fortalecer o primitive `Button` para padrao de design-system real, com base mais proxima de shadcn (`forwardRef`, composicao de classes e variantes), em vez de um wrapper minimo com string fixa. [church-erp-web/src/components/ui/button.tsx:7]

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story nao entrega valor funcional visivel ao usuario final. Ela existe para eliminar retrabalho estrutural nas historias de onboarding, autenticacao, perfis e operacao financeira.
- O foco e preparar as duas aplicacoes na estrutura exata decidida na arquitetura aprovada, preservando a independencia entre camadas.
- Como esta e a primeira story do Epic 1, qualquer desvio aqui tende a contaminar todas as historias seguintes.

### Requisitos tecnicos obrigatorios

- O backend deve nascer em `church-erp-api` com Laravel 12.
- O frontend deve nascer em `church-erp-web` com Next.js App Router, TypeScript, Tailwind, `shadcn/ui` e ESLint.
- O frontend deve seguir a fundacao visual aprovada no UX: `shadcn/ui` como infraestrutura tecnica de primitives, com linguagem final do produto definida por temas, tokens e componentes operacionais proprios.
- O banco alvo do backend e MySQL 8.4 LTS.
- Multi-tenancy deve ser tratado desde a fundacao via `church_id`; nao deixar isso como refactor futuro.
- O frontend deve ser preparado como BFF. O browser nao deve consumir endpoints autenticados do Laravel diretamente.
- O backend Laravel continua sendo a fonte de verdade para autenticacao, autorizacao, validacao e regras de dominio.
- Contratos HTTP entre frontend e backend devem usar `snake_case`.
- Componentes base de interface do frontend devem usar `shadcn/ui` e residir em `church-erp-web/src/components/ui`.
- Nao introduzir biblioteca paralela de componentes de interface no `church-erp-web`.
- Composicoes de negocio e componentes orientados a dominio devem residir em `church-erp-web/src/components` ou `church-erp-web/src/features`.

### Compliance de arquitetura

- Manter fronteiras explicitas:
  - `church-erp-web` cuida de UI, navegacao, sessao e BFF.
  - `church-erp-api` cuida de dominio, autorizacao, persistencia e auditoria.
- No frontend, preservar a separacao arquitetural entre:
  - primitives base derivadas de `shadcn/ui`
  - design system compartilhado com temas, tokens e variantes do produto
  - componentes operacionais compostos por dominio e perfil
- Nao usar starter acoplado de Laravel com Blade/Inertia/Livewire para substituir o frontend separado.
- Nao mover regra de negocio sensivel para componentes React.
- Nao deixar controllers Laravel concentrarem regra de negocio pesada.
- Nao criar wrappers de resposta HTTP customizados sem necessidade. Preferir `JsonResource` / `ResourceCollection`.
- Nao criar queries ou repositorios futuros que ignorem `church_id`.
- Nao criar componentes base fora de `src/components/ui` quando forem primitives reutilizaveis de interface.
- Nao quebrar consistencia visual do web app com estilos fora dos tokens e utilitarios padronizados do projeto.

### Requisitos atuais de bibliotecas e framework

- Laravel 12 e a versao-alvo aprovada na arquitetura. A documentacao oficial atual de instalacao recomenda `laravel new`, mas esta story deve seguir o comando arquitetural aprovado para manter consistencia do projeto, a menos que o ambiente exija ajuste operacional.
- Next.js continua com `create-next-app@latest` como caminho oficial de bootstrap do App Router. Segundo a documentacao oficial atualizada em 16 de marco de 2026, o setup padrao habilita TypeScript, Tailwind, ESLint, App Router, Turbopack e alias `@/*`.
- A arquitetura e a UX aprovadas convergem para `shadcn/ui` como base tecnica de primitives no frontend, com `Tailwind CSS` como camada de tokens, composicao e personalizacao visual.
- Next.js exige Node.js 20.9 ou superior no guia oficial atual. Validar a versao local antes de inicializar o frontend.
- MySQL 8.4 permanece a linha LTS alvo do projeto; a referencia oficial atual cobre a serie 8.4.x.

### Estrutura de arquivos obrigatoria

- Estrutura alvo na raiz:
  - `church-erp-api/`
  - `church-erp-web/`
  - `.github/workflows/`
- Backend:
  - `church-erp-api/app/Domain/Identity`
  - `church-erp-api/app/Domain/Finance`
  - `church-erp-api/app/Domain/People`
  - `church-erp-api/app/Domain/Operations`
  - `church-erp-api/app/Domain/Communications`
  - `church-erp-api/app/Http/Controllers/Api/V1`
  - `church-erp-api/app/Http/Requests`
  - `church-erp-api/app/Policies`
  - `church-erp-api/database/migrations`
  - `church-erp-api/database/seeders`
- Frontend:
  - `church-erp-web/src/app`
  - `church-erp-web/src/components`
  - `church-erp-web/src/components/ui`
  - `church-erp-web/src/components/design-system`
  - `church-erp-web/src/components/operational`
  - `church-erp-web/src/features`
  - `church-erp-web/src/design-system`
  - `church-erp-web/src/lib/api`
  - `church-erp-web/src/lib/env`
  - `church-erp-web/src/hooks`
  - `church-erp-web/src/styles`
  - `church-erp-web/src/types`
  - `church-erp-web/src/middleware.ts`

### Requisitos de teste e validacao

- Esta story deve terminar com bootstrap executavel, nao apenas com diretorios vazios desconexos.
- Validar que `composer install` e os comandos basicos do Laravel funcionam em `church-erp-api`.
- Validar que `npm install` ou equivalente e `npm run lint`/`npm run build` funcionam em `church-erp-web`.
- Se houver criacao de CI nesta story, manter pipelines separadas para API e web.
- Evitar testes e scaffolding desnecessariamente avancados nesta etapa; o objetivo e fundacao estavel, nao cobertura completa do produto.

### Definition of Done adicional para frontend

- A fundacao do `church-erp-web` deve explicitar `Next.js + Tailwind CSS + shadcn/ui` como padrao oficial da interface.
- O baseline visual deve permanecer consistente com `Tailwind CSS` e com os tokens/utilitarios do projeto.
- Componentes base existentes em `src/components/ui` devem ser reaproveitados antes da criacao de novos primitives.
- Qualquer composicao de negocio criada nesta story deve residir em `src/components` ou `src/features`.

### Guardrails para o dev agent

- Priorizar consistencia estrutural sobre velocidade de scaffold.
- Se houver conflito entre defaults do starter e a arquitetura aprovada, a arquitetura vence.
- Nao introduzir autenticacao funcional completa nesta story; apenas preparar a estrutura para o BFF e para a story 1.3.
- Nao introduzir modelos de dominio completos ainda. Criar apenas o esqueleto necessario para o crescimento correto.
- Manter linguagem e documentacao do projeto claras e operacionais, evitando jargao corporativo.
- Nao tratar `shadcn/ui` como linguagem visual pronta; toda tela operacional deve passar por temas, tokens e regras de composicao do produto.
- Nao acoplar estilos diretamente por pagina quando o padrao puder ser promovido para design system compartilhado.

### Inteligencia de historico do repositorio

- Os commits recentes mostram uma sequencia coerente de maturacao dos artefatos de planejamento: `define a arquitetura de backnd e frontend`, `define estrutura tecnica`, `finaliza estrutura tecnica`, `finaliza a arquitetura`.
- Isso indica que a story deve executar a arquitetura como escrita, sem reinterpretar a fundacao do stack.
- Ainda nao existem `church-erp-api` ou `church-erp-web` no workspace atual. O bootstrap faz parte real desta story, nao e trabalho ja concluido.

### Project Structure Notes

- O workspace atual contem artefatos BMAD e documentos de planejamento, mas ainda nao contem implementacao do produto.
- A primeira entrega de codigo deve respeitar a estrutura alvo definida em `_bmad-output/planning-artifacts/architecture.md`, em vez de improvisar uma estrutura mais simples.
- Durante a criacao original desta story, nenhum `project-context.md` existia. Apos a geracao de `_bmad-output/project-context.md` em 2026-04-22, qualquer leitura futura da Story 1.1 deve usar esse arquivo como fonte obrigatoria de guardrails de implementacao, junto com PRD, arquitetura, UX e sprint status.
- Como esta e a primeira story do epic, nao ha story anterior para reaproveitar learnings de implementacao.
- Depois da consolidacao do UX, esta story precisa ser lida como a fundacao do frontend orientada a design system: a shell inicial, os estilos globais e a tipografia ja apontam para tokens semanticos, identidade visual propria e evolucao para `src/components/ui`, `src/components/design-system` e `src/components/operational`.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 1, Story 1.1, Acceptance Criteria.
- `_bmad-output/planning-artifacts/architecture.md` - Selected Starter, Core Architectural Decisions, Implementation Patterns, Project Structure, ADR Authentication via Next.js BFF.
- `_bmad-output/planning-artifacts/prd.md` - secoes 8.1, 11 FR-1 e 12 NFR-5/NFR-7.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - principios "Valor Imediato Antes de Configuracao", "Homes por Perfil, Nao Labirintos de Modulos" e diretrizes de clareza.
- `_bmad-output/project-context.md` - regras duraveis para agentes sobre stack, fronteiras Laravel/Next.js, contratos `snake_case`, BFF, tenancy, testes, qualidade e fluxo BMAD.
- `https://laravel.com/docs/12.x/installation` - referencia oficial atual de instalacao do Laravel 12.
- `https://nextjs.org/docs/app/getting-started/installation` - referencia oficial atual de bootstrap do Next.js App Router.
- `https://dev.mysql.com/doc/refman/8.4/en/` - referencia oficial atual do MySQL 8.4.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `composer create-project laravel/laravel church-erp-api`
- `composer update --with-all-dependencies --no-interaction`
- `php artisan test`
- `npx create-next-app@latest church-erp-web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`
- `npm install`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `php artisan test --filter=ApiBaselineTest`
- `env API_BASE_URL=http://localhost:8000 INTERNAL_API_AUDIENCE=church-erp-api INTERNAL_API_ISSUER=church-erp-web npm run build`
- `npm install class-variance-authority clsx tailwind-merge @radix-ui/react-slot`
- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `env API_BASE_URL=http://localhost:8000 INTERNAL_API_AUDIENCE=church-erp-api INTERNAL_API_ISSUER=church-erp-web npm run build`

### Completion Notes List

- Story criada automaticamente a partir de `sprint-status.yaml` como primeira story em backlog.
- Epic 1 foi identificado como epic inicial e depende desta fundacao para evitar retrabalho nas stories 1.2 a 1.5.
- Contexto de versoes atuais foi revisado em documentacao oficial para reduzir risco de bootstrap desatualizado.
- `church-erp-api` foi inicializada, corrigida para Laravel 12 e exposta com rota `GET /api/v1/health` usando `JsonResource`.
- O backend recebeu baseline de dominios (`Identity`, `Finance`, `People`, `Operations`, `Communications`), convencoes de `church_id` e documentacao de BFF/tenancy.
- `church-erp-web` foi inicializada com Next.js App Router, shell operacional inicial, rotas base por area e camada `src/lib/api` para chamadas server-side ao Laravel.
- A foundation frontend passou a refletir a direcao visual aprovada no UX: `globals.css` centraliza tokens semanticos iniciais de cor e tipografia, `layout.tsx` registra a base tipografica do produto e a interface inicial evita aparencia SaaS generica.
- A story deve ser entendida como fundacao para evoluir `shadcn/ui` + design system proprio, mesmo antes da expansao completa das pastas `src/components/ui`, `src/components/design-system`, `src/components/operational`, `src/design-system` e `src/styles`.
- Foram adicionados `.env.example`, READMEs operacionais, smoke test de estrutura web e workflows separados em `.github/workflows/api-ci.yml` e `.github/workflows/web-ci.yml`.
- Validacoes executadas com sucesso: `php artisan test`, `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build`.
- `next build` reportou aviso deprecando a convencao `middleware`, mas a story exige `src/middleware.ts`; o baseline foi mantido para aderencia ao artefato de planejamento.
- Ajuste de reabertura concluido: a fundacao visual/design system agora materializa as pastas obrigatorias `src/components/ui`, `src/components/design-system`, `src/components/operational`, `src/design-system` e `src/styles` com artefatos minimos reutilizaveis.
- `AppShellCard` passou a delegar para o componente operacional `AreaCard`, que usa o wrapper compartilhado `Surface`, reduzindo acoplamento visual direto na shell inicial.
- O CI web recebeu variaveis BFF minimas no passo de build para evitar falha de coleta de dados em route handlers server-side.
- Validacoes da Story 1.1 executadas com sucesso apos o ajuste: `php artisan test --filter=ApiBaselineTest`, `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build` com variaveis BFF.
- Regressao PHP completa foi executada, mas permanece bloqueada por testes adicionados na Story 1.2 (`InitialChurchSetupTest`) porque o PHP local nao possui `pdo_sqlite`; os testes de baseline da Story 1.1 passam.
- Resolvido review finding [Medium]: fundacao `shadcn/ui` materializada com `components.json`, aliases, `cn()` e dependencias auxiliares padrao.
- Resolvido review finding [Medium]: smoke test da Story 1.1 desacoplado de `/onboarding`, route handler de onboarding e `features/auth`.
- Resolvido review finding [Low]: primitive `Button` refeito com `React.forwardRef`, `Slot`, `class-variance-authority`, variantes e composicao de classes.
- `src/lib/api/client.ts` recebeu import `server-only` para tornar explicito que chamadas autenticadas ao Laravel ficam no BFF.
- Validacoes finais da correcao de review: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build` com variaveis BFF e rede liberada para Google Fonts, e `php artisan test --filter=ApiBaselineTest` passaram.
- Regressao PHP completa permanece bloqueada por testes da Story 1.2 (`InitialChurchSetupTest`) por ausencia local de `pdo_sqlite`; a falha nao pertence ao escopo da Story 1.1.
- Alinhamento pos-`project-context.md` concluido em 2026-04-22: a story agora referencia `_bmad-output/project-context.md` como guardrail obrigatorio para futuras leituras e nao precisou ser reaberta, pois os ajustes exigidos foram documentais e a implementacao aprovada continua consistente com as regras duraveis recem-geradas.

### Change Log

- 2026-04-21: Materializada a fundacao frontend/design system e movida a Story 1.1 para review.
- 2026-04-21: Code review solicitou ajustes e retornou a Story 1.1 para in-progress.
- 2026-04-21: Resolvidos os 3 follow-ups de code review da Story 1.1 e movida novamente para review.
- 2026-04-22: Code review final aprovou a Story 1.1 e marcou como done.
- 2026-04-22: Revisada contra `_bmad-output/project-context.md` recem-criado; mantida como done por nao haver mudanca de escopo ou implementacao obrigatoria.

## Senior Developer Review (AI)

### Review Date

2026-04-21

### Reviewer

Wesley Silva / GPT-5 Codex

### Outcome

Changes Requested

### Summary

A fundacao Laravel/Next, dominios backend, BFF client, rotas base, tokens iniciais, CI separado e gates direcionados da Story 1.1 estao majoritariamente implementados. A story nao foi aprovada como `done` porque ha uma divergencia material entre a claim de fundacao `shadcn/ui` e o codigo real, alem de acoplamento indevido do smoke test da fundacao a arquivos introduzidos pela Story 1.2.

### Acceptance Criteria Validation

- AC1: Parcial. `church-erp-api` e `church-erp-web` existem com Laravel 12, Next.js App Router, TypeScript, Tailwind, ESLint e estrutura base. Pendente: a parte "shadcn/ui como base tecnica de primitives" nao esta demonstrada por artefatos reais de shadcn.
- AC2: Implementado para backend/BFF baseline. MySQL 8.4 esta configurado em `.env.example`, a organizacao por dominio existe, `church_id` esta documentado como guardrail e `src/lib/api/client.ts` prepara o BFF.

### Findings

- Medium: A fundacao `shadcn/ui` esta marcada como feita, mas nao ha evidencia de inicializacao real: nenhum `components.json`, nenhuma configuracao/utility padrao, nem dependencias auxiliares comuns. O `Button` atual e custom minimalista. Referencias: `church-erp-web/package.json:13`, `church-erp-web/src/components/ui/button.tsx:7`.
- Medium: O smoke test de baseline da Story 1.1 agora depende de arquivos da Story 1.2 (`/onboarding`, route handler e `features/auth`). Isso cria dependencia reversa entre historias e impede validar a fundacao isoladamente. Referencia: `church-erp-web/tests/bff-smoke.test.mjs:14`.
- Low: O primitive `Button` ainda nao oferece uma base robusta para evolucao do design system (`forwardRef`, composicao de classes e variantes). Isso nao bloqueia o bootstrap, mas deve ser corrigido junto da decisao sobre shadcn. Referencia: `church-erp-web/src/components/ui/button.tsx:7`.

### Validation Performed

- `php artisan test --filter=ApiBaselineTest`: passou, 2 testes / 28 assertions.
- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run test`: passou.
- `env API_BASE_URL=http://localhost:8000 INTERNAL_API_AUDIENCE=church-erp-api INTERNAL_API_ISSUER=church-erp-web npm run build`: passou com rede liberada para Google Fonts.
- `php artisan test`: falha por testes da Story 1.2 (`InitialChurchSetupTest`) antes de assertions, devido a ausencia local de `pdo_sqlite`; nao e falha especifica da Story 1.1.

### Decision

Retornar para Dev Story. Nao marcar como `done` ate os follow-ups Medium serem resolvidos.

### File List

- `_bmad-output/implementation-artifacts/1-1-inicializar-a-fundacao-do-projeto-com-backend-e-frontend-desacoplados.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `.github/workflows/api-ci.yml`
- `.github/workflows/web-ci.yml`
- `church-erp-api/.env.example`
- `church-erp-api/README.md`
- `church-erp-api/app/Domain/README.md`
- `church-erp-api/app/Domain/Identity/Models/.gitkeep`
- `church-erp-api/app/Domain/Identity/Services/.gitkeep`
- `church-erp-api/app/Domain/Identity/Resources/.gitkeep`
- `church-erp-api/app/Domain/Identity/Repositories/.gitkeep`
- `church-erp-api/app/Domain/Finance/Models/.gitkeep`
- `church-erp-api/app/Domain/Finance/Services/.gitkeep`
- `church-erp-api/app/Domain/Finance/Resources/.gitkeep`
- `church-erp-api/app/Domain/Finance/Repositories/.gitkeep`
- `church-erp-api/app/Domain/People/Models/.gitkeep`
- `church-erp-api/app/Domain/People/Services/.gitkeep`
- `church-erp-api/app/Domain/People/Resources/.gitkeep`
- `church-erp-api/app/Domain/People/Repositories/.gitkeep`
- `church-erp-api/app/Domain/Operations/Models/.gitkeep`
- `church-erp-api/app/Domain/Operations/Services/.gitkeep`
- `church-erp-api/app/Domain/Operations/Resources/.gitkeep`
- `church-erp-api/app/Domain/Operations/Repositories/.gitkeep`
- `church-erp-api/app/Domain/Communications/Models/.gitkeep`
- `church-erp-api/app/Domain/Communications/Services/.gitkeep`
- `church-erp-api/app/Domain/Communications/Resources/.gitkeep`
- `church-erp-api/app/Domain/Communications/Repositories/.gitkeep`
- `church-erp-api/app/Http/Controllers/Api/V1/HealthCheckController.php`
- `church-erp-api/app/Http/Requests/README.md`
- `church-erp-api/app/Http/Resources/HealthCheckResource.php`
- `church-erp-api/app/Policies/README.md`
- `church-erp-api/bootstrap/app.php`
- `church-erp-api/composer.json`
- `church-erp-api/composer.lock`
- `church-erp-api/routes/api.php`
- `church-erp-api/routes/web.php`
- `church-erp-api/tests/Feature/Architecture/ApiBaselineTest.php`
- `church-erp-web/.env.example`
- `church-erp-web/README.md`
- `church-erp-web/components.json`
- `church-erp-web/package.json`
- `church-erp-web/package-lock.json`
- `church-erp-web/src/app/layout.tsx`
- `church-erp-web/src/app/globals.css`
- `church-erp-web/src/app/page.tsx`
- `church-erp-web/src/app/(auth)/login/page.tsx`
- `church-erp-web/src/app/treasury/page.tsx`
- `church-erp-web/src/app/secretaria/page.tsx`
- `church-erp-web/src/app/leadership/page.tsx`
- `church-erp-web/src/app/communications/page.tsx`
- `church-erp-web/src/components/app-shell-card.tsx`
- `church-erp-web/src/components/ui/button.tsx`
- `church-erp-web/src/components/design-system/surface.tsx`
- `church-erp-web/src/components/operational/area-card.tsx`
- `church-erp-web/src/design-system/tokens.ts`
- `church-erp-web/src/styles/README.md`
- `church-erp-web/src/features/app-shell/navigation.ts`
- `church-erp-web/src/hooks/use-session-context.ts`
- `church-erp-web/src/lib/api/client.ts`
- `church-erp-web/src/lib/env/server.ts`
- `church-erp-web/src/lib/utils.ts`
- `church-erp-web/src/middleware.ts`
- `church-erp-web/src/types/navigation.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`

## Senior Developer Review (AI) - Final

### Review Date

2026-04-22

### Reviewer

Wesley Silva / GPT-5 Codex

### Outcome

Approved

### Summary

A Story 1.1 atende os acceptance criteria: backend Laravel 12 e frontend Next.js App Router existem como apps desacopladas; a estrutura base de dominios, rotas, requests, policies, CI e documentacao foi criada; o backend esta preparado para MySQL 8.4 e convencoes de `church_id`; o frontend esta preparado como BFF server-side e a fundacao `shadcn/ui` foi materializada com `components.json`, `cn()` e primitive `Button` baseada em `forwardRef`, `Slot` e variantes.

### Findings

- Low: `components.json` declara `iconLibrary` como `lucide`, mas `lucide-react` ainda nao esta instalado. Nao bloqueia a Story 1.1 porque nenhum icone e usado, mas deve ser alinhado quando o primeiro componente com icone for adicionado. Referencia: `church-erp-web/components.json:20`.
- Low: `Surface` ainda compoe `className` por interpolacao manual, apesar de `cn()` ja existir. Nao quebra comportamento atual, mas reduz a capacidade futura de resolver conflitos Tailwind de forma consistente. Referencia: `church-erp-web/src/components/design-system/surface.tsx:10`.
- Low: `productTokens.radii.control` aponta para pill radius (`9999px`), enquanto o `Button` base usa `rounded-md`. Nao bloqueia o bootstrap, mas e uma pequena divergencia de token/primitive a resolver quando o design system amadurecer. Referencias: `church-erp-web/src/design-system/tokens.ts:11`, `church-erp-web/src/components/ui/button.tsx:8`.

### Acceptance Criteria Validation

- AC1: Implementado. `church-erp-api` esta em Laravel 12, `church-erp-web` esta em Next.js App Router com TypeScript, Tailwind, ESLint, `src/`, CI separado, estrutura de pastas base e fundacao `shadcn/ui`.
- AC2: Implementado. `.env.example` do backend usa MySQL, a estrutura por dominio existe, `church_id` esta documentado como guardrail, a API usa `JsonResource`, e o frontend concentra chamadas ao Laravel em camada server-side de BFF.

### Validation Performed

- `npm run test`: passou.
- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `env API_BASE_URL=http://localhost:8000 INTERNAL_API_AUDIENCE=church-erp-api INTERNAL_API_ISSUER=church-erp-web npm run build`: passou com rede liberada para Google Fonts.
- `php artisan test --filter=ApiBaselineTest`: passou, 2 testes / 28 assertions.
- `php artisan test`: falha somente nos testes da Story 1.2 (`InitialChurchSetupTest`) por ausencia local de `pdo_sqlite`; nao e falha especifica da Story 1.1.

### Decision

Marcar Story 1.1 como `done`. Os achados restantes sao baixos e nao exigem retorno para Dev Story.
