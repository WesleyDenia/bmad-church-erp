# Story 1.1: Inicializar a fundacao do projeto com backend e frontend desacoplados

Status: review

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
- [x] Preparar o fluxo minimo de desenvolvimento e qualidade (AC: 1)
  - [x] Confirmar arquivos base de configuracao em cada app (`README`, `.env.example`, configs de lint/teste).
  - [x] Criar `.github/workflows/api-ci.yml` e `.github/workflows/web-ci.yml` ou stubs equivalentes, se ainda nao existirem.
  - [x] Garantir que cada app consiga instalar dependencias e subir localmente de forma independente.
- [x] Registrar guardrails para as proximas historias (AC: 2)
  - [x] Documentar que o browser autentica contra `church-erp-web` e que o `church-erp-web` usa JWT interno de curta duracao para falar com `church-erp-api`.
  - [x] Explicitar que toda regra de validacao principal, autorizacao e escopo por tenant permanecem no Laravel.
  - [x] Deixar claro que consultas futuras em entidades de dominio relevantes deverao considerar `church_id`.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story nao entrega valor funcional visivel ao usuario final. Ela existe para eliminar retrabalho estrutural nas historias de onboarding, autenticacao, perfis e operacao financeira.
- O foco e preparar as duas aplicacoes na estrutura exata decidida na arquitetura aprovada, preservando a independencia entre camadas.
- Como esta e a primeira story do Epic 1, qualquer desvio aqui tende a contaminar todas as historias seguintes.

### Requisitos tecnicos obrigatorios

- O backend deve nascer em `church-erp-api` com Laravel 12.
- O frontend deve nascer em `church-erp-web` com Next.js App Router, TypeScript, Tailwind e ESLint.
- O banco alvo do backend e MySQL 8.4 LTS.
- Multi-tenancy deve ser tratado desde a fundacao via `church_id`; nao deixar isso como refactor futuro.
- O frontend deve ser preparado como BFF. O browser nao deve consumir endpoints autenticados do Laravel diretamente.
- O backend Laravel continua sendo a fonte de verdade para autenticacao, autorizacao, validacao e regras de dominio.
- Contratos HTTP entre frontend e backend devem usar `snake_case`.

### Compliance de arquitetura

- Manter fronteiras explicitas:
  - `church-erp-web` cuida de UI, navegacao, sessao e BFF.
  - `church-erp-api` cuida de dominio, autorizacao, persistencia e auditoria.
- Nao usar starter acoplado de Laravel com Blade/Inertia/Livewire para substituir o frontend separado.
- Nao mover regra de negocio sensivel para componentes React.
- Nao deixar controllers Laravel concentrarem regra de negocio pesada.
- Nao criar wrappers de resposta HTTP customizados sem necessidade. Preferir `JsonResource` / `ResourceCollection`.
- Nao criar queries ou repositorios futuros que ignorem `church_id`.

### Requisitos atuais de bibliotecas e framework

- Laravel 12 e a versao-alvo aprovada na arquitetura. A documentacao oficial atual de instalacao recomenda `laravel new`, mas esta story deve seguir o comando arquitetural aprovado para manter consistencia do projeto, a menos que o ambiente exija ajuste operacional.
- Next.js continua com `create-next-app@latest` como caminho oficial de bootstrap do App Router. Segundo a documentacao oficial atualizada em 16 de marco de 2026, o setup padrao habilita TypeScript, Tailwind, ESLint, App Router, Turbopack e alias `@/*`.
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
  - `church-erp-web/src/features`
  - `church-erp-web/src/lib/api`
  - `church-erp-web/src/lib/env`
  - `church-erp-web/src/hooks`
  - `church-erp-web/src/types`
  - `church-erp-web/src/middleware.ts`

### Requisitos de teste e validacao

- Esta story deve terminar com bootstrap executavel, nao apenas com diretorios vazios desconexos.
- Validar que `composer install` e os comandos basicos do Laravel funcionam em `church-erp-api`.
- Validar que `npm install` ou equivalente e `npm run lint`/`npm run build` funcionam em `church-erp-web`.
- Se houver criacao de CI nesta story, manter pipelines separadas para API e web.
- Evitar testes e scaffolding desnecessariamente avancados nesta etapa; o objetivo e fundacao estavel, nao cobertura completa do produto.

### Guardrails para o dev agent

- Priorizar consistencia estrutural sobre velocidade de scaffold.
- Se houver conflito entre defaults do starter e a arquitetura aprovada, a arquitetura vence.
- Nao introduzir autenticacao funcional completa nesta story; apenas preparar a estrutura para o BFF e para a story 1.3.
- Nao introduzir modelos de dominio completos ainda. Criar apenas o esqueleto necessario para o crescimento correto.
- Manter linguagem e documentacao do projeto claras e operacionais, evitando jargao corporativo.

### Inteligencia de historico do repositorio

- Os commits recentes mostram uma sequencia coerente de maturacao dos artefatos de planejamento: `define a arquitetura de backnd e frontend`, `define estrutura tecnica`, `finaliza estrutura tecnica`, `finaliza a arquitetura`.
- Isso indica que a story deve executar a arquitetura como escrita, sem reinterpretar a fundacao do stack.
- Ainda nao existem `church-erp-api` ou `church-erp-web` no workspace atual. O bootstrap faz parte real desta story, nao e trabalho ja concluido.

### Project Structure Notes

- O workspace atual contem artefatos BMAD e documentos de planejamento, mas ainda nao contem implementacao do produto.
- A primeira entrega de codigo deve respeitar a estrutura alvo definida em `_bmad-output/planning-artifacts/architecture.md`, em vez de improvisar uma estrutura mais simples.
- Nenhum `project-context.md` foi encontrado no repositorio durante a criacao desta story. Usar os artefatos de planejamento como fonte primaria de contexto.
- Como esta e a primeira story do epic, nao ha story anterior para reaproveitar learnings de implementacao.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 1, Story 1.1, Acceptance Criteria.
- `_bmad-output/planning-artifacts/architecture.md` - Selected Starter, Core Architectural Decisions, Implementation Patterns, Project Structure, ADR Authentication via Next.js BFF.
- `_bmad-output/planning-artifacts/prd.md` - secoes 8.1, 11 FR-1 e 12 NFR-5/NFR-7.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - principios "Valor Imediato Antes de Configuracao", "Homes por Perfil, Nao Labirintos de Modulos" e diretrizes de clareza.
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

### Completion Notes List

- Story criada automaticamente a partir de `sprint-status.yaml` como primeira story em backlog.
- Epic 1 foi identificado como epic inicial e depende desta fundacao para evitar retrabalho nas stories 1.2 a 1.5.
- Contexto de versoes atuais foi revisado em documentacao oficial para reduzir risco de bootstrap desatualizado.
- `church-erp-api` foi inicializada, corrigida para Laravel 12 e exposta com rota `GET /api/v1/health` usando `JsonResource`.
- O backend recebeu baseline de dominios (`Identity`, `Finance`, `People`, `Operations`, `Communications`), convencoes de `church_id` e documentacao de BFF/tenancy.
- `church-erp-web` foi inicializada com Next.js App Router, shell operacional inicial, rotas base por area e camada `src/lib/api` para chamadas server-side ao Laravel.
- Foram adicionados `.env.example`, READMEs operacionais, smoke test de estrutura web e workflows separados em `.github/workflows/api-ci.yml` e `.github/workflows/web-ci.yml`.
- Validacoes executadas com sucesso: `php artisan test`, `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build`.
- `next build` reportou aviso deprecando a convencao `middleware`, mas a story exige `src/middleware.ts`; o baseline foi mantido para aderencia ao artefato de planejamento.

### File List

- `_bmad-output/implementation-artifacts/1-1-inicializar-a-fundacao-do-projeto-com-backend-e-frontend-desacoplados.md`
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
- `church-erp-web/src/features/app-shell/navigation.ts`
- `church-erp-web/src/hooks/use-session-context.ts`
- `church-erp-web/src/lib/api/client.ts`
- `church-erp-web/src/lib/env/server.ts`
- `church-erp-web/src/middleware.ts`
- `church-erp-web/src/types/navigation.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`
