# Sprint Change Proposal

**Date:** 2026-04-20
**Project:** curso-bmad
**Mode:** Batch
**Trigger Story:** 1.1 - Inicializar a fundacao do projeto com backend e frontend desacoplados
**Approval Status:** Approved
**Approved On:** 2026-04-20
**Scope Classification:** Moderate

## 1. Issue Summary

O projeto definiu a arquitetura antes de executar o workflow de UX. Depois, o UX foi produzido e consolidou decisoes novas para o frontend, especialmente o uso de `shadcn/ui` como motor de componentes, alem de diretrizes mais especificas para temas, nomenclaturas, blocos operacionais, hierarquia de acoes e estrategia de design system.

Com isso, os artefatos existentes deixaram de estar totalmente alinhados entre si. O problema nao esta no objetivo do MVP, mas na ordem em que os artefatos foram gerados. A arquitetura e os epicos passaram a refletir uma base anterior ao UX, enquanto o UX se tornou a fonte mais atual para a fundacao da experiencia e do frontend.

Essa divergencia ja alcanca a implementacao em andamento, porque a story `1.1` foi iniciada com base no baseline anterior e hoje tende a estar parcialmente desatualizada no que diz respeito a foundation do frontend.

## 2. Impact Analysis

### Epic Impact

- **Epic 1** foi diretamente afetado porque concentra a fundacao tecnica. Ele continua valido funcionalmente, mas precisa atualizar sua base tecnica e sua linguagem de frontend.
- **Epics 2 a 5** continuam validos em nivel de negocio, mas suas stories precisam ser revisadas para refletir os blocos operacionais, componentes, nomenclaturas e padroes de UX agora definidos.

### Story Impact

- **Story 1.1** e a principal story impactada no que ja teve inicio.
- **Stories futuras do Epic 1** tambem precisam de revisao para evitar propagacao de premissas antigas.
- **Stories dos Epics 2 a 5** precisam de revisao de alinhamento, principalmente onde descrevem homes por perfil, componentes operacionais, navegacao, feedback e linguagem de interface.

### Artifact Conflicts

- **PRD:** permanece essencialmente valido; nao ha indicio de ruptura do MVP ou de conflito forte de produto.
- **Architecture:** desatualizada em relacao ao UX para a fundacao do frontend e o design system.
- **Epics:** desatualizados em relacao ao UX e a nomenclatura operacional mais recente.
- **Story 1.1:** desatualizada no baseline tecnico do frontend.
- **Sprint status / implementation artifacts:** podem precisar refletir reabertura ou ajuste formal da story `1.1`.

### Technical Impact

- A fundacao do frontend precisa refletir explicitamente:
  - `Next.js + Tailwind CSS + shadcn/ui`
  - estrategia de customizacao do design system
  - temas/tokens proprios
  - nomenclaturas consistentes entre UX, arquitetura e stories
- O codigo atual em `church-erp-web` precisa ser auditado para verificar se a implementacao real acompanha a nova fundacao documental.

## 3. Recommended Approach

### Selected Path

**Hybrid, com predominancia de Direct Adjustment**

### Rationale

O problema atual e de desalinhamento entre fontes de verdade, e nao de falha do MVP. Por isso, a melhor abordagem e corrigir os artefatos-fonte e revalidar a implementacao iniciada, em vez de replanejar o produto ou fazer rollback amplo.

### Option Evaluation

- **Option 1: Direct Adjustment**
  - Viavel
  - Effort: Medium
  - Risk: Medium
  - Melhor equilibrio entre retrabalho, coerencia e continuidade

- **Option 2: Potential Rollback**
  - Nao recomendada neste momento
  - Effort: High
  - Risk: High
  - So faria sentido se a auditoria tecnica mostrar que a base implementada esta incompatível com a nova fundacao

- **Option 3: PRD MVP Review**
  - Nao necessaria agora
  - Effort: High
  - Risk: Medium
  - O escopo funcional principal continua valido

### Timeline and Risk Impact

- **Short-term impact:** pequeno atraso controlado para corrigir as fontes de verdade
- **Medium-term impact:** reducao significativa de retrabalho
- **Main risk if not corrected now:** continuar implementando sobre premissas inconsistentes entre UX, arquitetura e epicos

## 4. Detailed Change Proposals

### 4.1 Architecture Updates

#### Proposal A1

**Artifact:** `architecture.md`  
**Section:** Starter / Frontend foundation / Design system

**OLD**

- Frontend definido genericamente como `Next.js App Router` com `Tailwind CSS`
- Estrutura frontend focada em `src/app`, `src/components`, `src/features`, `src/lib`
- Nao formaliza `shadcn/ui` como base tecnica do design system

**NEW**

- Formalizar `shadcn/ui` como camada base de componentes do frontend
- Explicitar que `Tailwind CSS` + tokens proprios + customizacao sobre `shadcn/ui` compoem a fundacao visual
- Registrar que a identidade visual final nao deve seguir o visual padrao do ecossistema `shadcn`
- Incluir a estrategia de componentes operacionais compostos sobre primitives base

**Rationale**

O UX agora define a fundacao do design system com muito mais precisao do que a arquitetura original. A arquitetura precisa absorver essa decisao para voltar a ser fonte confiavel para implementacao.

#### Proposal A2

**Artifact:** `architecture.md`  
**Section:** Implementation Patterns & Consistency Rules

**OLD**

- Padrões de naming e estrutura existem, mas nao incorporam tokens, temas, componentes operacionais e nomenclaturas de UX

**NEW**

- Adicionar regras para:
  - tokens/temas de interface
  - naming de componentes operacionais
  - composicao entre `components/ui` e componentes de dominio
  - alinhamento entre nomenclatura de UX e nomes tecnicos no frontend

**Rationale**

Sem esse ajuste, a arquitetura continua deixando uma lacuna exatamente onde o UX ficou mais especifico.

#### Proposal A3

**Artifact:** `architecture.md`  
**Section:** Project Structure & Boundaries

**OLD**

- Estrutura de frontend apresentada sem referencia clara ao uso de `shadcn/ui` e sem amarrar o design system a uma organizacao de codigo concreta

**NEW**

- Atualizar a estrutura frontend para refletir:
  - `src/components/ui` como primitives/base
  - componentes operacionais do produto em camadas superiores
  - estrategia de temas/tokens compartilhados

**Rationale**

A estrutura precisa expressar o modo real como o frontend sera construído.

### 4.2 Epic Updates

#### Proposal E1

**Artifact:** `epics.md`  
**Section:** Epic 1 / Story 1.1

**OLD**

- Story 1.1 define a fundacao do frontend sem mencionar explicitamente `shadcn/ui`, temas, tokens e design system

**NEW**

- Atualizar a story para explicitar que a fundacao do frontend inclui:
  - `Next.js App Router`
  - `Tailwind CSS`
  - `shadcn/ui` como base tecnica de componentes
  - estrutura inicial para temas, nomenclaturas e design system operacional

**Rationale**

A story precisa refletir a foundation real esperada hoje, nao apenas a versao anterior da arquitetura.

#### Proposal E2

**Artifact:** `epics.md`  
**Section:** Stories com homes por perfil e componentes operacionais

**OLD**

- Stories futuras descrevem o valor funcional, mas ainda sem incorporar claramente a linguagem de blocos operacionais e a estrategia de UX consolidada

**NEW**

- Revisar stories dos Epics 2, 3, 4 e 5 para alinhar:
  - homes por perfil
  - blocos operacionais
  - pendencias acionaveis
  - feedback, hierarquia de acoes e componentes compostos

**Rationale**

Os epicos continuam corretos no plano de negocio, mas sua traducao para implementacao precisa seguir o UX atual.

### 4.3 Story 1.1 Update

#### Proposal S1

**Story:** `1.1 - Inicializar a fundacao do projeto com backend e frontend desacoplados`  
**Section:** Tasks / Technical Notes / Acceptance alignment

**OLD**

- Frontend preparado com estrutura base e camada BFF
- Foundation descrita sem compromisso formal com o design system definido depois

**NEW**

- Acrescentar ou revisar itens para incluir:
  - instalacao/configuracao inicial do `shadcn/ui`
  - fundacao de temas/tokens
  - convencoes de nomenclatura alinhadas ao UX
  - separacao clara entre primitives e componentes operacionais

**Rationale**

Como a story `1.1` ja foi iniciada, ela precisa ser atualizada formalmente para nao parecer concluida/revisada com uma fundacao incompleta segundo a direcao mais atual.

### 4.4 Sprint / Implementation Status Update

#### Proposal P1

**Artifact:** `sprint-status.yaml`

**OLD**

- Story `1.1` esta em `review`

**NEW**

- Reavaliar formalmente se a story deve:
  - permanecer em `review` com solicitacao de ajustes
  - ou voltar para `in-progress` caso as mudancas sejam substanciais na implementacao

**Rationale**

O estado do sprint precisa refletir a realidade: houve descoberta posterior que altera a definicao de pronto da fundacao.

## 5. Implementation Handoff

### Scope Classification

**Moderate**

O problema nao exige redefinicao do produto, mas exige reorganizacao do backlog tecnico imediato e alinhamento entre documentos e implementacao.

### Handoff Recipients

- **Product Owner / Scrum Master**
  - revisar backlog e status da story `1.1`
  - reorganizar a sequencia imediata de trabalho
- **Product Manager / Architect**
  - atualizar `architecture.md`
  - garantir alinhamento entre arquitetura e UX
- **Development team**
  - auditar `church-erp-web`
  - implementar ajustes necessarios apos a revisao dos artefatos

### Recommended Action Plan

1. Atualizar `architecture.md` com base no UX aprovado
2. Atualizar `epics.md` e revisar stories afetadas
3. Atualizar formalmente a story `1.1`
4. Auditar a implementacao atual do frontend
5. Reclassificar o status da `1.1`, se necessario
6. Retomar o fluxo normal de implementacao somente apos esse realinhamento

### Success Criteria

- Arquitetura e UX deixam de divergir na fundacao do frontend
- Epicos e stories refletem a direcao atual de UX
- Story `1.1` passa a representar corretamente o baseline tecnico esperado
- Codigo em andamento e validado contra a fundacao revisada
- O time volta a implementar sobre uma fonte de verdade consistente
