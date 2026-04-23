---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/planning-artifacts/prd.md
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/planning-artifacts/ux-design-specification.md
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/planning-artifacts/mvp-scope.md
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-20.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
project_name: 'curso-bmad'
user_name: 'Wesley Silva'
date: '2026-03-25'
completedAt: '2026-04-06'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
O produto precisa suportar autenticação com permissões por perfil, lançamento financeiro rápido, correção com trilha de auditoria, geração imediata de resumo de fechamento, manutenção de registos de membros e visitantes, homes operacionais por perfil e preparação de comunicação com handoff para canais externos. Arquiteturalmente, isso implica modularização clara entre identidade/acesso, finanças, pessoas, pendências operacionais e comunicação.

**Non-Functional Requirements:**
Os NFRs mais relevantes são responsividade em desktop e mobile, linguagem clara e não corporativa, segurança no tratamento de dados pessoais e financeiros, reversibilidade de ações sensíveis, auditabilidade de alterações financeiras e confiabilidade em janelas críticas de uso semanal. Estes requisitos afetam diretamente estrutura de aplicação, modelagem de permissões, estratégias de persistência, logging e padrões de feedback ao utilizador.

**Scale & Complexity:**
O projeto apresenta complexidade média. Não há sinais de real-time intenso, multi-campus inicial ou integrações profundas no MVP, mas há forte necessidade de consistência funcional, segurança de domínio e experiência previsível.Docker

- Primary domain: web full-stack administrativo
- Complexity level: medium
- Estimated architectural components: 6 a 8 blocos principais

### Technical Constraints & Dependencies

- O PRD define um MVP enxuto, com foco em valor operacional imediato
- A UX exige homes por perfil e fluxos curtos, o que favorece arquitetura orientada a módulos de domínio e casos de uso
- O sistema deve suportar dados financeiros e pessoais com controle de acesso rigoroso
- O handoff para WhatsApp deve ser tratado como capacidade de saída simples, não como integração nativa complexa
- O modelo deve prever multi-tenancy por igreja desde o início, mesmo que de forma simples
- A arquitetura deve permitir evolução progressiva do domínio sem exigir refactor estrutural precoce

### Cross-Cutting Concerns Identified

- Autenticação e autorização por perfil
- Multi-tenancy por igreja
- Auditoria e histórico de alterações
- Validação de dados com mensagens claras
- Responsividade e consistência de UX
- Segurança e privacidade de dados
- Estruturação de pendências operacionais por domínio
- Padrões comuns para feedback, erros, confirmações e estados de revisão

### Initial Domain Boundaries Suggested

- Identity & Access
- Finance
- People
- Operations
- Communications Support

### Architectural Notes from Context

- Auditabilidade deve ser parte do modelo de domínio financeiro, não apenas logging técnico
- As homes por perfil e seus blocos operacionais de pendências devem ser tratados como capability central de orientação e retenção, não só como camada visual
- Toda decisão técnica que aumente controlo deve também aumentar clareza e segurança percebida pelo utilizador

### Early Architectural Decision Signals

- ADR-01: isolamento por igreja deve ser regra fundacional do sistema
- ADR-02: a solução deve nascer organizada por domínios de negócio claros
- ADR-03: alterações financeiras exigem histórico explícito e motivo persistido
- ADR-04: validação, mensagens e feedback operacional devem seguir padrão transversal
- ADR-05: integrações externas no MVP devem privilegiar handoff simples e desacoplado

### Primary Failure Risks if Ignored

- Exposição cruzada de dados entre igrejas
- Permissões frágeis sobre dados financeiros e pessoais
- Burocratização do fluxo hero financeiro
- Inconsistência de UX entre módulos críticos
- Pendências sem acoplamento real ao trabalho semanal
- Auditoria insuficiente para gerar confiança institucional

## Starter Template Evaluation

### Primary Technology Domain

Aplicação web full-stack administrativa com frontend e backend desacoplados. O frontend será responsável pela experiência operacional e responsiva em browser, enquanto o backend concentrará regras de domínio, autenticação, autorização, persistência e auditoria.

### Starter Options Considered

**Option 1: create-next-app como base full-stack neutra**
Bom para iniciar rápido no frontend, mas insuficiente como decisão principal depois da definição explícita de backend desacoplado em Laravel.

**Option 2: Laravel starter kits com frontend acoplado**
Oferecem boa experiência para stacks Inertia ou Livewire, mas conflitam com a preferência declarada por frontend separado em Next.js.

**Option 3: Arquitetura com dual starter**
Backend iniciado com skeleton oficial do Laravel e frontend iniciado com `create-next-app`. Esta opção respeita a separação de responsabilidades decidida para o projeto.

### Selected Starter: Dual Starter Architecture (Laravel API + Next.js App Router)

**Rationale for Selection:**
O projeto exige um backend forte para autenticação, autorização por perfil, multi-tenancy por igreja, auditoria financeira e regras de domínio, sem abrir mão de um frontend moderno e responsivo para as homes operacionais. Por isso, a decisão correta não é um boilerplate full-stack único, mas duas fundações coordenadas:

- Laravel como backend principal orientado a API
- Next.js App Router como frontend web desacoplado

Essa escolha preserva liberdade arquitetural, evita acoplamento prematuro a stacks full-stack opinadas e alinha melhor a implementação com o tipo de ERP administrativo definido no PRD e nos épicos.

**Initialization Commands:**

```bash
composer create-project laravel/laravel church-erp-api
npx create-next-app@latest church-erp-web --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Architectural Decisions Provided by Starter:**

**Backend Foundation:**
Laravel 12 como base oficial da API, com estrutura madura para rotas, middleware, validação, policies, jobs, migrations e organização por domínio.

**Frontend Foundation:**
Next.js App Router com TypeScript, Tailwind CSS, `shadcn/ui`, ESLint e estrutura moderna para interfaces web responsivas. O `shadcn/ui` será tratado como infraestrutura de primitives e acessibilidade, enquanto o design system visual do produto será definido por temas e tokens próprios.

**Database Direction:**
O backend Laravel será configurado para MySQL como banco transacional do sistema, alinhado à preferência técnica explicitada para o projeto.

**Code Organization:**
Separação explícita entre aplicação cliente e aplicação servidora, permitindo fronteiras claras entre UI, API, domínio, autenticação e persistência. No frontend, essa separação também distingue primitives base em `src/components/ui`, design system compartilhado e componentes operacionais compostos por domínio/perfil.

**Development Experience:**
Excelente DX em ambos os lados: convenções fortes no Laravel para backend administrativo e convenções atuais do ecossistema Next.js para frontend. A adoção de `shadcn/ui` reduz custo de fundação sem abrir mão de identidade própria, porque a camada visual final ficará nos tokens, temas e componentes operacionais do produto.

**Trade-off Accepted:**
A arquitetura desacoplada introduz coordenação extra entre frontend e backend, mas isso é aceitável porque melhora clareza de responsabilidades e evita comprometer a preferência tecnológica principal do projeto.

**Note:** Project initialization using these commands should be the first implementation story, with backend and frontend repositories or workspaces initialized em conjunto.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Backend desacoplado em Laravel 12 API
- Frontend desacoplado em Next.js App Router
- `shadcn/ui` como base técnica de componentes do frontend
- Design system próprio baseado em `Tailwind CSS` + temas + tokens do produto
- Banco transacional em MySQL 8.4 LTS
- Multi-tenancy lógico por `church_id`
- Migrations e seeders nativos do Laravel
- Validação de domínio centralizada no backend Laravel

**Important Decisions (Shape Architecture):**
- Validação complementar no frontend para UX, sem substituir regras do backend
- Home por perfil e blocos operacionais como eixo estrutural da UI
- Componentes operacionais compostos sobre primitives base, sem alterar o MVP funcional
- Estratégia de cache inicialmente não crítica ao funcionamento do MVP
- Possibilidade de introduzir Redis depois, sem acoplá-lo como pré-requisito inicial

**Deferred Decisions (Post-MVP):**
- Estratégias avançadas de particionamento ou isolamento físico por tenant
- Caching distribuído sofisticado
- Read replicas, tuning avançado e otimizações prematuras de banco

### Data Architecture

**Database Engine:**
MySQL 8.4 LTS como banco relacional principal do sistema.

**Rationale:**
A stack escolhida privilegia Laravel + MySQL, e o domínio do produto é fortemente transacional, com necessidade de consistência em autenticação, permissões, pessoas, finanças, auditoria e pendências operacionais.

**Tenancy Model:**
Multi-tenancy lógico por `church_id` nas entidades de domínio relevantes.

**Rationale:**
Esse modelo é o mais adequado para o MVP porque reduz complexidade operacional, mantém baixo custo de manutenção e atende ao requisito fundamental de isolamento por igreja desde o início.

**Data Modeling Approach:**
Modelagem relacional normalizada para os domínios principais:
- igrejas
- usuários
- perfis e permissões
- membros
- visitantes
- lançamentos financeiros
- categorias
- contrapartes
- trilhas de auditoria
- pendências operacionais
- modelos de comunicação

**Migration Strategy:**
Uso de migrations nativas do Laravel como mecanismo oficial de evolução do schema.

**Seeder Strategy:**
Uso de seeders nativos do Laravel para categorias mínimas, perfis base e dados operacionais iniciais do MVP.

**Validation Strategy:**
Laravel será a fonte principal de verdade para validação de entrada, regras de negócio e integridade de domínio.
O frontend Next.js aplicará apenas validações complementares para melhorar a experiência do usuário.

**Caching Strategy:**
O MVP não dependerá de cache para funcionamento correto.
A arquitetura deve permitir introduzir Redis posteriormente para cache e rate limiting, mas a primeira implementação não deve exigir cache distribuído como componente crítico.

### Decision Impact Analysis

**Implementation Sequence:**
1. Inicializar backend Laravel e frontend Next.js
2. Inicializar `shadcn/ui` no frontend e estabelecer a estrutura base de design system
3. Definir temas e tokens iniciais de cor, tipografia, espaçamento, raio, sombra e estados semânticos
4. Configurar conexão MySQL 8.4 no backend
5. Definir schema inicial com migrations por domínio
6. Introduzir `church_id` como eixo de isolamento lógico
7. Implementar seeders para dados mínimos do MVP
8. Padronizar validação de requests e regras de domínio no backend
9. Implementar componentes operacionais compostos sobre primitives base sem expandir escopo funcional
10. Manter frontend desacoplado consumindo contratos da API

**Cross-Component Dependencies:**
- A decisão de tenancy por `church_id` impacta autenticação, autorização, consultas, policies e auditoria.
- A escolha de Laravel como fonte principal de validação impacta o desenho dos contratos da API e o tratamento de erros no frontend.
- A decisão de `shadcn/ui` + tokens próprios impacta naming de componentes, organização de código e consistência entre UX, frontend e stories.
- A ausência de cache crítico no MVP simplifica deploy inicial, mas exige consultas e índices bem pensados no schema principal.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
7 áreas críticas onde agentes diferentes poderiam tomar decisões incompatíveis:
- convenções de nomenclatura
- organização estrutural
- fundação do design system
- composição entre primitives e componentes operacionais
- formatos de API e dados
- comunicação entre frontend e backend
- tratamento de erro, loading e validação

### Naming Patterns

**Database Naming Conventions:**
- Tabelas em `snake_case` plural: `users`, `churches`, `financial_entries`
- Colunas em `snake_case`: `church_id`, `created_at`, `updated_at`
- Foreign keys em `snake_case` com sufixo `_id`: `user_id`, `church_id`
- Índices e constraints seguindo convenções padrão do Laravel sempre que possível

**API Naming Conventions:**
- Endpoints REST em plural: `/api/v1/churches`, `/api/v1/members`, `/api/v1/financial-entries`
- Route params com identificadores simples: `/api/v1/members/{id}`
- Query params em `snake_case`: `church_id`, `date_from`, `date_to`

**Code Naming Conventions:**
- PHP classes em `PascalCase`: `MemberService`, `FinancialEntryRepository`, `VisitorResource`
- Métodos e variáveis PHP em `camelCase`
- Arquivos React/Next.js em `PascalCase` para componentes: `TreasurerHomePage.tsx`
- Hooks em `camelCase` com prefixo `use`
- Utilitários TS em `camelCase`

**Frontend Naming Conventions:**
- Primitives derivadas de `shadcn/ui` permanecem em `src/components/ui` com naming idiomático da biblioteca: `Button`, `Card`, `Dialog`, `Sheet`
- Componentes de produto e componentes operacionais usam `PascalCase` orientado ao contexto real da UX: `OperationalHomeShell`, `PendingActionCard`, `ClosingSummaryBlock`, `LeadershipSnapshotPanel`
- Nomes técnicos devem refletir a nomenclatura operacional aprovada no UX; evitar nomes genéricos como `DashboardCard`, `InfoWidget` ou `GenericPanel`
- Segmentos de rota continuam estáveis e técnicos (`treasury`, `secretaria`, `leadership`), enquanto labels visíveis ao usuário seguem a linguagem funcional e pastoral definida pela UX

**Theme and Token Naming Conventions:**
- Tokens globais devem ser semânticos e estáveis, não acoplados a cor crua: `color-surface-primary`, `color-action-primary`, `color-feedback-success`, `space-block-md`, `radius-card`
- Temas e aliases visuais devem refletir intenção de uso e não aparência isolada
- Não introduzir tokens por tela específica quando o padrão puder ser promovido ao design system

### Structure Patterns

**Project Organization:**
- Backend organizado por domínio de negócio
- Cada domínio do backend terá subestrutura técnica interna
- Frontend organizado por áreas funcionais e rotas do App Router
- Frontend com três camadas explícitas: primitives base, design system compartilhado e componentes operacionais do produto
- Testes do backend em `tests/Feature` e `tests/Unit`

**Backend Domain Structure Pattern:**
Cada domínio relevante em `app/Domain` deve seguir, quando aplicável, uma subestrutura técnica consistente como:

- `Models`
- `Services`
- `Resources`
- `Repositories`

Exemplo:
- `app/Domain/Finance/Models`
- `app/Domain/Finance/Services`
- `app/Domain/Finance/Resources`
- `app/Domain/Finance/Repositories`

Regras:
- `Models`: entidades Eloquent e comportamento próximo ao dado
- `Services`: regras de aplicação e orquestração de casos de uso
- `Resources`: `JsonResource` e transformações de saída da API
- `Repositories`: consultas e acesso estruturado a dados quando a complexidade justificar

**File Structure Patterns:**
- Backend:
  - `app/Domain` para módulos por domínio
  - `app/Http/Controllers/Api/V1` para controllers da API
  - `app/Http/Requests` para validação de entrada
  - `app/Policies` para autorização
- Frontend:
  - `src/app` para rotas
  - `src/components/ui` para primitives base e componentes diretamente derivados de `shadcn/ui`
  - `src/components/design-system` para tokens, temas, variantes visuais e wrappers compartilhados
  - `src/components/operational` para blocos compostos da experiência operacional
  - `src/components` para composição compartilhada não específica de domínio
  - `src/features` para lógica por domínio
  - `src/lib` para clients, helpers e utilidades de infraestrutura

**Operational Component Composition Pattern:**
- Primitives de `src/components/ui` não carregam contexto de domínio
- Componentes de `src/components/design-system` aplicam tokens, variantes, densidade e identidade visual do produto
- Componentes de `src/components/operational` compõem primitives e blocos visuais em objetos acionáveis da UX, como pendências, resumos e painéis por perfil
- Features consomem componentes operacionais e coordenam dados da API sem mover regra crítica de domínio para o frontend

### Format Patterns

**API Response Formats:**
- Respostas de sucesso devem seguir o padrão idiomático do Laravel usando `JsonResource` e `ResourceCollection`
- Não criar wrapper global customizado desnecessário se o recurso puder responder diretamente no padrão Laravel
- Paginação deve seguir o formato padrão gerado pelo Laravel para recursos paginados
- Erros de validação, autorização e exceção devem ser padronizados no backend de forma consistente, preservando compatibilidade com o ecossistema Laravel

**Data Exchange Formats:**
- Contratos HTTP oficiais em `snake_case`
- Datas em ISO 8601
- Booleanos em `true/false`
- `null` explícito quando aplicável

### Communication Patterns

**Event System Patterns:**
- Eventos internos do backend em nomes descritivos de domínio: `FinancialEntryUpdated`, `VisitorFollowUpCreated`
- Sem dependência de event bus distribuído no MVP
- Eventos usados para auditoria e efeitos secundários internos

**State Management Patterns:**
- Frontend prioriza estado local e por feature
- Evitar global state excessivo no MVP
- Estado de servidor tratado por camada de client/API bem definida
- Estado visual de blocos operacionais deve permanecer próximo da feature e não em stores globais genéricas

### Frontend UI System Pattern

**UI Stack Decision:**
- O frontend web padroniza `Next.js App Router` + `Tailwind CSS` + `shadcn/ui`
- `shadcn/ui` será a base dos componentes reutilizáveis de interface
- Tailwind permanece como fundação de tokens utilitários, layout, spacing e responsividade

**Rationale:**
- reduz tempo de implementação de telas administrativas
- melhora consistência entre módulos e histórias implementadas por agentes diferentes
- mantém liberdade de composição sem introduzir um design system fechado demais
- encaixa naturalmente na estrutura já prevista de `src/components/ui`

**Implementation Rules:**
- componentes derivados de `shadcn/ui` devem residir em `src/components/ui`
- composições de negócio devem ficar em `src/components`, `src/features` ou rotas, não dentro da camada base de UI
- tokens visuais compartilhados devem ser centralizados em `globals.css` e no tema do projeto
- evitar bibliotecas paralelas de componentes para não fragmentar padrões visuais e acessibilidade

### Process Patterns

**Error Handling Patterns:**
- Backend concentra validação, autorização e erros de domínio
- Frontend distingue erro de validação, autorização e erro inesperado
- Mensagens ao usuário devem ser claras e operacionais
- Logs técnicos ficam no backend

**Loading State Patterns:**
- Cada tela principal define loading inicial explícito
- Ações críticas usam estados distintos de submissão
- Estados vazios, loading e erro devem existir nas homes e listagens principais
- Homes por perfil devem preservar hierarquia de blocos, prioridade e próxima ação mesmo durante loading e empty state

### Enforcement Guidelines

**All AI Agents MUST:**
- respeitar `church_id` como eixo obrigatório de isolamento
- manter contratos HTTP em `snake_case`
- usar `JsonResource` / `ResourceCollection` para respostas de sucesso da API Laravel
- tratar o backend Laravel como fonte principal de verdade para validação e autorização
- seguir organização por domínio com subestrutura técnica interna consistente
- usar `shadcn/ui` como base técnica de primitives, nunca como linguagem visual final do produto
- aplicar tokens e temas compartilhados antes de criar variantes visuais ad hoc
- nomear componentes de frontend pela função operacional real aprovada no UX

### Pattern Examples

**Good Examples:**
- `app/Domain/Finance/Models/FinancialEntry.php`
- `app/Domain/Finance/Services/CreateFinancialEntryService.php`
- `app/Domain/Finance/Resources/FinancialEntryResource.php`
- `app/Domain/Finance/Repositories/FinancialEntryRepository.php`

**Anti-Patterns:**
- controllers com regra de negócio pesada
- respostas HTTP com formatos diferentes em módulos diferentes
- queries sem escopo de tenant
- mistura de convenções de naming no mesmo contrato
- uso direto de componentes `shadcn/ui` em telas operacionais sem passar pelos tokens e padrões visuais do produto
- componentes genéricos de dashboard que não expressem prioridade, contexto e próxima ação

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
church-erp/
├── README.md
├── docs/
├── .github/
│   └── workflows/
│       ├── api-ci.yml
│       └── web-ci.yml
├── church-erp-api/
│   ├── README.md
│   ├── artisan
│   ├── composer.json
│   ├── phpunit.xml
│   ├── .env.example
│   ├── app/
│   │   ├── Domain/
│   │   │   ├── Identity/
│   │   │   │   ├── Models/
│   │   │   │   ├── Services/
│   │   │   │   ├── Resources/
│   │   │   │   └── Repositories/
│   │   │   ├── Finance/
│   │   │   │   ├── Models/
│   │   │   │   ├── Services/
│   │   │   │   ├── Resources/
│   │   │   │   └── Repositories/
│   │   │   ├── People/
│   │   │   │   ├── Models/
│   │   │   │   ├── Services/
│   │   │   │   ├── Resources/
│   │   │   │   └── Repositories/
│   │   │   ├── Operations/
│   │   │   │   ├── Models/
│   │   │   │   ├── Services/
│   │   │   │   ├── Resources/
│   │   │   │   └── Repositories/
│   │   │   └── Communications/
│   │   │       ├── Models/
│   │   │       ├── Services/
│   │   │       ├── Resources/
│   │   │       └── Repositories/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   └── Api/
│   │   │   │       └── V1/
│   │   │   ├── Middleware/
│   │   │   └── Requests/
│   │   ├── Policies/
│   │   ├── Providers/
│   │   └── Exceptions/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   │   ├── factories/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/
│   │   ├── api.php
│   │   └── console.php
│   ├── storage/
│   └── tests/
│       ├── Feature/
│       └── Unit/
├── church-erp-web/
│   ├── README.md
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── .env.example
│   ├── public/
│   └── src/
│       ├── app/
│       │   ├── (auth)/
│       │   ├── treasury/
│       │   ├── secretaria/
│       │   ├── leadership/
│       │   ├── communications/
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/
│       │   ├── ui/
│       │   ├── design-system/
│       │   ├── operational/
│       │   ├── forms/
│       │   ├── layout/
│       │   └── feedback/
│       ├── design-system/
│       │   ├── themes/
│       │   ├── tokens/
│       │   └── recipes/
│       ├── features/
│       │   ├── auth/
│       │   ├── finance/
│       │   ├── people/
│       │   ├── operations/
│       │   ├── home/
│       │   └── communications/
│       ├── lib/
│       │   ├── api/
│       │   ├── env/
│       │   ├── formatters/
│       │   └── utils/
│       ├── styles/
│       ├── hooks/
│       ├── types/
│       └── middleware.ts
└── e2e/
    ├── api/
    └── web/
```

### Architectural Boundaries

**API Boundaries:**
- Toda regra de negócio, validação principal, autorização e persistência vivem no `church-erp-api`
- O frontend nunca acessa banco diretamente
- A API expõe contratos REST versionados em `/api/v1`

**Component Boundaries:**
- `church-erp-web` é responsável por UI, navegação, estado de tela e consumo da API
- Componentes de UI não devem conter regra de negócio sensível
- `src/components/ui` concentra primitives acessíveis e reutilizáveis
- `src/components/design-system` concentra a aplicação consistente de temas, tokens e variantes
- `src/components/operational` concentra blocos compostos da experiência, especialmente homes por perfil, pendências, resumos e painéis acionáveis
- Regras críticas de domínio permanecem no backend

**Service Boundaries:**
- Cada domínio Laravel encapsula seus próprios serviços e repositórios
- Controllers apenas recebem requests, delegam e retornam resources
- Frontend consome clients de API em `src/lib/api`

**Data Boundaries:**
- MySQL é acessado apenas pelo backend Laravel
- `church_id` delimita o escopo lógico de tenant nas entidades relevantes
- Auditoria e histórico financeiro permanecem no domínio de backend

### Requirements to Structure Mapping

**Feature/Epic Mapping:**
- Epic 1 Fundacao e Acesso Seguro
  - API: `app/Domain/Identity`
  - Web: `src/features/auth`, `src/app/(auth)`, `src/design-system`, `src/components/ui`
- Epic 2 Operacao Financeira
  - API: `app/Domain/Finance`
  - Web: `src/features/finance`, `src/features/home`, `src/app/treasury`, `src/components/operational`
- Epic 3 Fechamento e Visibilidade
  - API: `app/Domain/Finance`, `app/Domain/Operations`
  - Web: `src/app/leadership`, `src/features/finance`, `src/components/operational`
- Epic 4 Base de Pessoas e Rotina da Secretaria
  - API: `app/Domain/People`, `app/Domain/Operations`
  - Web: `src/features/people`, `src/features/home`, `src/app/secretaria`, `src/components/operational`
- Epic 5 Comunicacao Operacional
  - API: `app/Domain/Communications`
  - Web: `src/features/communications`, `src/app/communications`, `src/components/operational`

**Cross-Cutting Concerns:**
- Auth e policies: `app/Domain/Identity`, `app/Policies`, `src/features/auth`
- Tenancy: middleware, policies, repositories e queries no backend
- Feedback e estados de tela: `src/components/feedback`
- API clients e contratos: `src/lib/api`
- Temas, tokens e identidade visual: `src/design-system`, `src/components/design-system`, `src/styles`
- Blocos operacionais compartilhados: `src/components/operational`, `src/features/home`

### Integration Points

**Internal Communication:**
- Frontend comunica apenas via HTTP com a API Laravel
- Backend usa services, repositories e resources dentro de fronteiras de domínio

**External Integrations:**
- Handoff para WhatsApp ocorre via frontend, usando conteúdo preparado pela aplicação
- Sem integração nativa profunda de mensageria no MVP

**Data Flow:**
- usuário interage com Next.js
- Next.js envia request à API Laravel
- Laravel valida, autoriza, aplica regra de domínio e persiste no MySQL
- Laravel responde usando `JsonResource`
- Next.js renderiza estado, erro ou sucesso

### File Organization Patterns

**Configuration Files:**
- Configurações do backend em `church-erp-api/config`
- Configurações do frontend em raiz de `church-erp-web`
- Variáveis de ambiente separadas por aplicação

**Source Organization:**
- Backend por domínio com subestrutura técnica
- Frontend por rotas + features + componentes compartilhados + design system explícito

**Test Organization:**
- Backend: `tests/Feature` e `tests/Unit`
- Frontend: testes por feature ou componente
- E2E em pasta de topo `e2e/` para fluxos integrados

**Asset Organization:**
- Assets públicos do frontend em `church-erp-web/public`
- Tokens, temas e receitas visuais compartilhadas vivem versionados no código-fonte do frontend, não dispersos em páginas isoladas
- Artefatos internos do backend em `storage`

### Development Workflow Integration

**Development Server Structure:**
- API e frontend sobem separadamente em desenvolvimento
- Cada aplicação mantém seu `.env` e ciclo de build próprios

**Build Process Structure:**
- Backend e frontend possuem pipelines independentes
- Contratos de API são o ponto de acoplamento entre os dois

**Deployment Structure:**
- Backend Laravel pode ser implantado separadamente do frontend Next.js
- A separação favorece evolução e troubleshooting por camada

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
A combinação de Laravel 12 API, MySQL 8.4 LTS e Next.js App Router é coerente com os requisitos do produto e com a preferência técnica declarada. As decisões de tenancy lógica por `church_id`, validação central no backend e frontend desacoplado não entram em conflito e se reforçam mutuamente.

**Pattern Consistency:**
Os padrões definidos são compatíveis com a stack escolhida. As convenções de naming, organização por domínio com subestrutura técnica, contratos HTTP em `snake_case`, uso de `JsonResource` e a distinção entre primitives, design system e componentes operacionais alinham backend, frontend e UX aprovado.

**Structure Alignment:**
A estrutura proposta suporta os domínios do produto, separa responsabilidades com clareza e respeita as fronteiras entre UI, API, domínio, autorização, persistência e auditoria. A camada de frontend agora explicita a fundação em `shadcn/ui`, os temas/tokens e a estratégia de blocos operacionais aprovada no UX.

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**
Todos os épicos do MVP possuem suporte arquitetural explícito:
- fundação e acesso: `Identity`
- operação financeira e fechamento: `Finance`
- rotina operacional: `Operations`
- pessoas: `People`
- comunicação: `Communications`

**Functional Requirements Coverage:**
Os requisitos funcionais de autenticação, permissões, multi-tenancy, lançamentos financeiros, auditoria, base de pessoas, pendências operacionais, relatórios e comunicação têm suporte claro na arquitetura definida.

**Non-Functional Requirements Coverage:**
A arquitetura responde aos NFRs principais:
- segurança: backend como fonte de verdade para auth, validação e autorização
- responsividade: frontend em Next.js com estrutura adequada para interfaces operacionais
- auditabilidade: domínio financeiro com trilha explícita
- clareza e consistência: padrões de API, naming, design system e estrutura definidos
- evolutividade: separação entre frontend e backend favorece crescimento controlado

### Implementation Readiness Validation ✅

**Decision Completeness:**
As decisões críticas de stack, banco, tenancy, organização de código, contratos HTTP e estrutura de projeto estão suficientemente definidas para orientar implementação consistente.

**Structure Completeness:**
A estrutura do projeto está completa no nível necessário para início de implementação e distribuição das primeiras histórias.

**Pattern Completeness:**
Os principais pontos de conflito entre agentes foram tratados:
- nomenclatura
- resposta da API
- subestrutura de domínio no backend
- organização do frontend
- fundação visual e design system
- componentes operacionais por perfil
- padrões de erro e loading

### Gap Analysis Results

**Critical Gaps:**
- Nenhum gap crítico identificado que bloqueie a execução do backlog.

**Important Gaps:**
- Formalizar estratégia exata de autenticação entre Next.js e Laravel
- Formalizar abordagem de autorização por perfil e tenant no fluxo HTTP
- Formalizar estratégia inicial de observabilidade e logging operacional
- Formalizar modelo de deploy entre frontend e backend

**Nice-to-Have Gaps:**
- Detalhar contratos iniciais da API por domínio
- Definir convenções de paginação e filtros com exemplos por endpoint
- Registrar guideline de testes automatizados por camada

### Validation Issues Addressed

- A ambiguidade inicial sobre stack foi resolvida com a definição explícita de arquitetura desacoplada
- O conflito potencial entre organização por domínio e estrutura técnica foi resolvido com subestrutura interna por domínio
- O formato de resposta da API foi alinhado ao padrão idiomático do Laravel
- As fronteiras entre backend e frontend ficaram definidas com clareza suficiente para implementação

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed at MVP level

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** high

**Key Strengths:**
- stack explícita e coerente com o tipo de produto
- separação saudável entre frontend e backend
- multi-tenancy tratada desde a fundação
- domínio financeiro preparado para auditabilidade
- estrutura suficientemente concreta para orientar agentes e desenvolvimento

**Areas for Future Enhancement:**
- ADR específica de autenticação e sessão
- ADR específica de deploy e infraestrutura
- guideline de testes por backend, frontend e e2e
- contratos iniciais de API por domínio

### Implementation Handoff

**AI Agent Guidelines:**
- seguir exatamente os padrões documentados
- respeitar `church_id` em consultas, policies e fluxos de domínio
- manter backend Laravel como fonte principal de validação, auth e autorização
- usar `JsonResource` / `ResourceCollection` nas respostas de sucesso da API
- respeitar a estrutura por domínio com subestrutura técnica interna
- inicializar o frontend com `shadcn/ui` e consolidar a fundação visual via tokens e temas próprios
- construir homes e fluxos do MVP com componentes operacionais compostos, e não com dashboards genéricos

**First Implementation Priority:**
Inicializar `church-erp-api` com Laravel e `church-erp-web` com Next.js, configurar comunicação entre as aplicações, preparar a base do domínio de identidade e tenancy e estabelecer a fundação do frontend com `shadcn/ui`, tokens, temas e organização de componentes operacionais.

## ADR: Authentication via Next.js BFF with Internal JWT Context

### Status

Accepted

### Context

A arquitetura do projeto foi definida como frontend desacoplado em Next.js e backend em Laravel API. O requisito adicional definido para autenticação é evitar expor autenticação diretamente ao browser e manter a sessão principal sob controle do frontend server-side.

Também foi definido que o contexto operacional do usuário deve incluir, no mínimo, identidade e tenant ativo, com `user_id` e `church_id` disponíveis no token usado entre as camadas internas da solução.

### Decision

A autenticação seguirá o padrão **BFF (Backend for Frontend)** com as seguintes regras:

- o browser autentica apenas contra o `church-erp-web`
- o `church-erp-web` atua como camada intermediária autenticada entre browser e `church-erp-api`
- a sessão do usuário no frontend será mantida em cookie `HttpOnly`
- o browser não consumirá diretamente endpoints autenticados do Laravel
- a comunicação autenticada entre `Next.js` e `Laravel` usará JWT interno com expiração curta
- o backend Laravel continua como fonte de verdade para identidade, tenant, autorização e regras de domínio

### Internal JWT Claims

O JWT interno entre `Next.js` e `Laravel` deve carregar apenas o contexto mínimo necessário para execução segura e eficiente.

**Required claims:**
- `sub`: identificador canônico do usuário autenticado
- `user_id`: identificador interno do usuário
- `church_id`: tenant ativo da sessão
- `iss`: emissor do token
- `aud`: audiência do token
- `iat`: data de emissão
- `exp`: data de expiração
- `jti`: identificador único do token

**Useful claims:**
- `roles`: papéis do usuário no tenant ativo
- `permissions_version`: versão para invalidação quando perfil/permissões mudarem
- `session_id`: vínculo com a sessão atual do BFF

### Constraints

- o JWT interno não deve ser exposto ao JavaScript do browser
- o JWT interno não deve carregar listas extensas de permissões ou dados sensíveis
- o `church_id` representa sempre o tenant ativo da sessão corrente
- troca de contexto de igreja exige reemissão de token e atualização da sessão
- mudanças relevantes de permissão exigem invalidação de sessão/token

### Request Flow

1. o usuário envia credenciais ao `church-erp-web`
2. o `church-erp-web` encaminha a autenticação ao `church-erp-api`
3. o `church-erp-api` valida identidade e contexto permitido
4. o `church-erp-web` estabelece a sessão autenticada com cookie `HttpOnly`
5. para chamadas autenticadas, o `church-erp-web` envia JWT interno ao `church-erp-api`
6. o `church-erp-api` valida o token, aplica autorização e executa a regra de negócio
7. o frontend renderiza o resultado sem expor a credencial interna ao browser

### Authorization Rules

- autorização real permanece no Laravel através de policies, guards e regras de domínio
- o frontend pode usar o contexto de sessão para adaptação de navegação e UI, mas não é autoridade final
- toda consulta sensível deve considerar `church_id` e permissões do usuário autenticado

### Consequences

**Positive:**
- reduz exposição de autenticação ao browser
- centraliza segurança e sessão no BFF
- permite propagar `user_id` e `church_id` de forma consistente entre camadas
- mantém o Laravel como autoridade de domínio e autorização

**Trade-offs:**
- aumenta complexidade em comparação com SPA auth mais simples
- exige disciplina clara na comunicação `Next.js -> Laravel`
- exige estratégia explícita de emissão, rotação e expiração de tokens internos

### Implementation Notes

- proteger rotas autenticadas no App Router via camada server-side do `church-erp-web`
- expor endpoint de contexto autenticado equivalente a `/me` através do BFF
- centralizar login, logout e troca de tenant no `church-erp-web`
- registrar erros de autenticação e autorização no backend com logs técnicos apropriados

### Authentication Operational Design

**1. Internal JWT Format**

- algoritmo de assinatura: `RS256`
- emissor (`iss`): `church-erp-web`
- audiência (`aud`): `church-erp-api`
- tempo de vida curto: entre `5` e `15` minutos

**Claims obrigatórias:**
- `sub`
- `user_id`
- `church_id`
- `roles`
- `session_id`
- `permissions_version`
- `iat`
- `exp`
- `jti`

**Regras de conteúdo:**
- não incluir dados sensíveis
- não incluir listas extensas de permissões
- não transformar o token em fonte de verdade de autorização
- usar o token apenas como contexto autenticado de curta duração entre BFF e API

**2. Login, Logout, Refresh e `/me`**

**Login flow:**
- `POST /auth/login` no `church-erp-web`
- o BFF recebe credenciais do browser
- o BFF encaminha autenticação ao `church-erp-api`
- o Laravel valida credenciais e contexto permitido
- o BFF estabelece sessão em cookie `HttpOnly`

**Logout flow:**
- `POST /auth/logout` no `church-erp-web`
- a sessão local é invalidada
- qualquer contexto interno ativo vinculado à sessão deve ser encerrado

**Refresh flow:**
- `POST /auth/refresh`
- o BFF revalida a sessão corrente
- um novo JWT interno de curta duração é emitido para comunicação com a API

**Authenticated context endpoint:**
- `GET /auth/me`
- retorna contexto autenticado mínimo para o frontend
- inclui usuário autenticado, `church_id` ativo e `roles` do contexto atual

**3. Active Church Switching**

**Endpoint:**
- `POST /auth/switch-church`

**Rules:**
- o usuário só pode alternar para igrejas às quais possui vínculo autorizado
- o Laravel valida a troca de tenant
- o BFF reemite sessão e contexto autenticado
- o novo JWT interno deve refletir o novo `church_id`

**Consequências:**
- o contexto anterior deixa de ser válido
- qualquer cache contextual por tenant deve ser descartado ou revalidado

**4. Authorization Model**

- `roles` no token servem apenas como contexto operacional rápido
- autorização definitiva continua no Laravel
- usar `Policies` para recursos e ações de domínio
- usar `Gates` para regras menores e centralizadas quando fizer sentido
- toda consulta sensível deve considerar `church_id`

**Frontend responsibility:**
- adaptar navegação, layout e visibilidade de ações com base no contexto autenticado
- nunca assumir que visibilidade de UI substitui autorização real

**Backend responsibility:**
- validar identidade
- validar tenant ativo
- validar perfil e autorização por ação
- rejeitar qualquer operação fora do escopo de `church_id` e permissões do usuário

### Authentication Implementation Sequence

1. Definir chave de assinatura e formato final do JWT interno
2. Implementar login e logout no BFF
3. Implementar `refresh` e `/auth/me`
4. Implementar troca de `church_id` ativo
5. Implementar policies e guards por domínio no Laravel
6. Integrar proteção de rotas server-side no App Router

### Authentication Detailed Sequence

**1. Exact JWT Payload**

**Header:**
- `alg: RS256`
- `typ: JWT`

**Payload:**
- `sub`: identificador canônico do usuário
- `user_id`: identificador interno do usuário
- `church_id`: tenant ativo
- `roles`: array curto de perfis ativos no tenant corrente
- `session_id`: identificador da sessão do BFF
- `permissions_version`: inteiro para invalidação de permissões
- `iss`: `church-erp-web`
- `aud`: `church-erp-api`
- `iat`
- `exp`
- `jti`

**2. BFF Endpoints**

- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET /auth/me`
- `POST /auth/switch-church`

**Responsabilidades:**
- `login`: autenticar no Laravel e criar sessão `HttpOnly`
- `logout`: destruir sessão local e invalidar contexto
- `refresh`: reemitir contexto interno de curta duração
- `me`: devolver contexto autenticado para hidratação da UI
- `switch-church`: trocar tenant ativo e reemitir sessão

**3. Authorization Strategy in Laravel**

**Perfis iniciais do MVP:**
- `treasurer`
- `secretary`
- `leadership`

**Regras:**
- todo acesso depende de `church_id`
- `Policies` por recurso de domínio
- `Gates` apenas para checks simples e transversais

**Policies candidatas:**
- `FinancialEntryPolicy`
- `MemberPolicy`
- `VisitorPolicy`
- `CommunicationTemplatePolicy`

**4. Technical Login Flow**

1. o browser envia credenciais ao `church-erp-web`
2. o BFF chama endpoint de autenticação do Laravel
3. o Laravel valida usuário e vínculo com igreja
4. o Laravel retorna identidade e contexto autorizado
5. o BFF cria sessão `HttpOnly`
6. o BFF passa a emitir JWT interno curto para chamadas autenticadas ao Laravel

**5. Technical `/auth/me` Flow**

1. o BFF lê a sessão atual
2. monta ou renova o token interno
3. consulta o Laravel se precisar reidratar contexto
4. retorna contexto autenticado mínimo para o frontend

**Resposta mínima esperada:**
- usuário autenticado
- tenant ativo
- roles
- capacidades mínimas de UI baseadas no contexto

**6. Technical Active Church Switching Flow**

1. o usuário solicita troca no frontend
2. o BFF envia a solicitação ao Laravel
3. o Laravel valida se o usuário pertence à igreja solicitada
4. o BFF atualiza a sessão autenticada
5. um novo JWT interno é emitido com o novo `church_id`
6. o frontend recarrega o contexto operacional

**7. Recommended Authentication Delivery Order**

1. fechar contrato do payload JWT
2. implementar `POST /auth/login`
3. implementar `GET /auth/me`
4. implementar `POST /auth/logout`
5. implementar `POST /auth/refresh`
6. implementar `POST /auth/switch-church`
7. implementar policies por domínio

### Authorization Strategy by Role in Laravel

**Authorization Principle:**
- autenticação identifica o usuário
- autorização decide o que ele pode fazer
- autorização real permanece sempre no Laravel
- toda decisão de autorização considera `user_id`, `church_id`, papel no tenant ativo e estado do recurso

**Initial MVP Roles:**
- `treasurer`
- `secretary`
- `leadership`

**Recommended Membership Model:**
- modelar a relação usuário ↔ igreja ↔ papel
- evitar prender o papel diretamente apenas à tabela `users`
- usar estrutura equivalente a `church_user` com:
  - `user_id`
  - `church_id`
  - `role`
  - `status`
  - timestamps

**Authorization Execution Order:**
1. resolver usuário autenticado
2. resolver `church_id` ativo
3. verificar vínculo do usuário com a igreja
4. carregar papel no tenant
5. aplicar `Policy` do recurso ou ação
6. executar regra de domínio

**Policies candidatas do MVP:**
- `FinancialEntryPolicy`
- `FinancialReportPolicy`
- `MemberPolicy`
- `VisitorPolicy`
- `OperationalPendingPolicy`
- `CommunicationTemplatePolicy`

**Role Expectations:**

**`treasurer`:**
- criar e editar lançamentos financeiros
- visualizar fechamento financeiro
- acessar trilhas de auditoria financeira
- não administrar operações de pessoas fora do escopo necessário

**`secretary`:**
- criar e editar membros e visitantes
- resolver pendências operacionais de pessoas
- preparar comunicações
- não editar dados financeiros sensíveis

**`leadership`:**
- visualizar resumos e relatórios
- acesso prioritariamente somente leitura no MVP
- sem ações operacionais destrutivas

**Gate Usage:**
- usar `Gates` apenas para checks simples e transversais
- exemplos:
  - `access-backoffice`
  - `switch-church-context`
  - `view-leadership-summary`

**Implementation Rule:**
- controllers não devem concentrar autorização manual dispersa
- usar `Policies`, `Gates`, `authorize()` e escopo por `church_id`
- nunca confiar apenas no `role` presente no token sem revalidação de contexto no backend

**Authorization Error Handling:**
- respostas de autorização negada com `403`
- mensagem funcional e clara ao usuário
- logging técnico no backend com:
  - `user_id`
  - `church_id`
  - ação
  - recurso
  - motivo da negação

## Deployment Architecture

### Deployment Topology Decision

**Target Topology:**
- um único servidor hospedará inicialmente os ambientes `dev`, `stg` e `prod`
- `nginx` funcionará como reverse proxy de entrada por host
- cada ambiente terá containers próprios de `web` e `api`
- o `MySQL` será compartilhado como infraestrutura persistente, com um database por ambiente

**External Routing:**
- `dev.teudominio.pt` -> `web-dev`
- `stg.teudominio.pt` -> `web-stg`
- `teudominio.pt` -> `web-prod`
- `dev.api.teudominio.pt` -> `api-dev`
- `stg.api.teudominio.pt` -> `api-stg`
- `api.teudominio.pt` -> `api-prod`

**Local Routing:**
- `localhost` -> `web-dev`
- `localhost/api/*` -> `api-dev`

### Isolation Rule for Shared Infrastructure

**Critical Operational Rule:**
- `nginx` e `mysql` não devem participar da mesma stack operacional de redeploy dos ambientes de aplicação no servidor
- a infraestrutura compartilhada deve subir em uma stack própria
- os ambientes `dev`, `stg` e `prod` devem subir em outra stack, conectando-se por redes Docker externas

**Rationale:**
- evita derrubar banco e proxy ao atualizar apenas `dev`, `stg` ou `prod`
- reduz risco operacional durante rollout no mesmo host
- permite recriar containers de aplicação sem impacto na camada persistente

### Containerization Strategy

**Web Container:**
- `Next.js` empacotado em modo `standalone`
- um container por ambiente
- sem exposição direta de porta pública; acesso apenas via reverse proxy

**API Container:**
- `Laravel` executado em container próprio
- um container por ambiente
- conexão privada ao `mysql` compartilhado pela rede interna Docker

**Database Strategy:**
- um único container `mysql` persistente no host
- databases independentes por ambiente:
  - `church_erp_dev`
  - `church_erp_stg`
  - `church_erp_prod`
- volumes persistentes dedicados ao banco

### Deployment Files Standard

**Required Server Files:**
- `deploy/docker-compose.infra.yml` para `nginx` + `mysql`
- `deploy/docker-compose.server.yml` para `web-dev`, `api-dev`, `web-stg`, `api-stg`, `web-prod`, `api-prod`

**Required Local File:**
- `deploy/docker-compose.local.yml` para subir `localhost` com `web-dev`, `api-dev`, `nginx` e `mysql`

### Operational Notes

- deploy parcial deve usar `docker compose up -d --build` apenas nos serviços do ambiente alterado
- migrations devem ser executadas pelo container da API do ambiente correspondente
- segredos reais de `prod` não devem permanecer hardcoded em compose; devem vir de variáveis externas ou arquivo `.env` do host
