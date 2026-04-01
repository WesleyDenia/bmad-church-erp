---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/planning-artifacts/prd.md
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/planning-artifacts/ux-design-specification.md
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/planning-artifacts/mvp-scope.md
workflowType: 'architecture'
project_name: 'curso-bmad'
user_name: 'Wesley Silva'
date: '2026-03-25'
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
- Operational Inbox / Pending Work
- Communications Support

### Architectural Notes from Context

- Auditabilidade deve ser parte do modelo de domínio financeiro, não apenas logging técnico
- O dashboard de pendências deve ser tratado como capability central de retenção, não só como camada visual
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
Next.js App Router com TypeScript, Tailwind CSS, ESLint e estrutura moderna para interfaces web responsivas.

**Database Direction:**
O backend Laravel será configurado para MySQL como banco transacional do sistema, alinhado à preferência técnica explicitada para o projeto.

**Code Organization:**
Separação explícita entre aplicação cliente e aplicação servidora, permitindo fronteiras claras entre UI, API, domínio, autenticação e persistência.

**Development Experience:**
Excelente DX em ambos os lados: convenções fortes no Laravel para backend administrativo e convenções atuais do ecossistema Next.js para frontend.

**Trade-off Accepted:**
A arquitetura desacoplada introduz coordenação extra entre frontend e backend, mas isso é aceitável porque melhora clareza de responsabilidades e evita comprometer a preferência tecnológica principal do projeto.

**Note:** Project initialization using these commands should be the first implementation story, with backend and frontend repositories or workspaces initialized em conjunto.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Backend desacoplado em Laravel 12 API
- Frontend desacoplado em Next.js App Router
- Banco transacional em MySQL 8.4 LTS
- Multi-tenancy lógico por `church_id`
- Migrations e seeders nativos do Laravel
- Validação de domínio centralizada no backend Laravel

**Important Decisions (Shape Architecture):**
- Validação complementar no frontend para UX, sem substituir regras do backend
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
2. Configurar conexão MySQL 8.4 no backend
3. Definir schema inicial com migrations por domínio
4. Introduzir `church_id` como eixo de isolamento lógico
5. Implementar seeders para dados mínimos do MVP
6. Padronizar validação de requests e regras de domínio no backend
7. Manter frontend desacoplado consumindo contratos da API

**Cross-Component Dependencies:**
- A decisão de tenancy por `church_id` impacta autenticação, autorização, consultas, policies e auditoria.
- A escolha de Laravel como fonte principal de validação impacta o desenho dos contratos da API e o tratamento de erros no frontend.
- A ausência de cache crítico no MVP simplifica deploy inicial, mas exige consultas e índices bem pensados no schema principal.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
5 áreas críticas onde agentes diferentes poderiam tomar decisões incompatíveis:
- convenções de nomenclatura
- organização estrutural
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

### Structure Patterns

**Project Organization:**
- Backend organizado por domínio de negócio
- Cada domínio do backend terá subestrutura técnica interna
- Frontend organizado por áreas funcionais e rotas do App Router
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
  - `src/components` para componentes reutilizáveis
  - `src/features` para lógica por domínio
  - `src/lib` para clients, helpers e utilidades de infraestrutura

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

### Enforcement Guidelines

**All AI Agents MUST:**
- respeitar `church_id` como eixo obrigatório de isolamento
- manter contratos HTTP em `snake_case`
- usar `JsonResource` / `ResourceCollection` para respostas de sucesso da API Laravel
- tratar o backend Laravel como fonte principal de verdade para validação e autorização
- seguir organização por domínio com subestrutura técnica interna consistente

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
