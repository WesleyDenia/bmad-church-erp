# Sprint Change Proposal

**Date:** 2026-05-25
**Project:** curso-bmad
**Mode:** Batch
**Trigger Story:** Epic 2 functional validation dependency review
**Approval Status:** Applied
**Scope Classification:** Moderate

## 1. Issue Summary

Durante a revisao arquitetural dos epicos, foi identificado que o plano do produto previa autenticacao e controle basico por perfil, mas nao previa uma capacidade operacional para cadastrar usuarios da igreja e atribuir ou ajustar seus papeis no tenant.

Essa omissao nao bloqueou os testes tecnicos de backend, porque as suites automatizadas usam fixtures e helpers de membership. No entanto, ela fragiliza o teste funcional real do fluxo financeiro do Epic 2, pois nao existe caminho de produto para disponibilizar um usuario de tesouraria com role apropriado dentro da igreja.

## 2. Impact Analysis

### Epic Impact

- **Epic 1:** expandido com duas stories novas para cobrir administracao minima de usuarios no MVP.
- **Epic 2:** mantem escopo funcional, mas sua validacao funcional completa passa a depender da capacidade de criar e ajustar usuarios com papel de tesouraria.
- **Epics 3 a 5:** sem mudanca direta de escopo, mas passam a se beneficiar da mesma fundacao para perfis de lideranca e secretaria.

### Story Impact

- **Nova Story 1.6:** cadastrar usuario da igreja e atribuir perfil basico.
- **Nova Story 1.7:** listar usuarios da igreja e ajustar perfil ou status.
- **Stories 2.1 a 2.5:** sem alteracao de acceptance criteria, mas com dependencia operacional explicita para UAT e demonstracoes.

### Artifact Conflicts

- **PRD:** precisava explicitar gestao basica de usuarios no escopo do MVP.
- **Epic breakdown:** precisava mover a administracao minima de usuarios para dentro da fundacao de acesso.
- **Sprint status:** precisava deixar de marcar o Epic 1 como concluido.
- **Architecture:** sem conflito; a mudanca reforca o uso de `church_user.role`, `church_id` e o backend como autoridade final.

### Technical Impact

Nao foi identificada necessidade imediata de refatoracao arquitetural. A solucao proposta continua coerente com a arquitetura aprovada:

- vinculo por tenant via `church_user`
- perfis basicos no MVP
- autenticacao via BFF
- autorizacao revalidada no backend
- desativacao no lugar de exclusao fisica no MVP

## 3. Recommended Approach

### Selected Path

**Backlog Re-sequencing with Scope Clarification**

### Rationale

O problema nao esta no dominio financeiro em si, mas na fundacao operacional de acesso. Por isso, a melhor correcao e inserir a capacidade de administracao minima de usuarios no Epic 1, em vez de contaminar o Epic 2 com responsabilidade transversal.

### Option Evaluation

- **Option 1: Adicionar stories ao Epic 2**
  - Nao recomendado
  - Effort: Medium
  - Risk: Medium
  - Mistura gestao de identidade com dominio financeiro e piora a separacao arquitetural.

- **Option 2: Inserir stories 1.6 e 1.7 no Epic 1**
  - Recomendado
  - Effort: Medium
  - Risk: Low
  - Corrige a lacuna na fundacao e preserva independencia dos epicos operacionais.

- **Option 3: Criar apenas fixture administrativa para testes**
  - Parcial
  - Effort: Low
  - Risk: Medium
  - Destrava QA tecnico, mas nao resolve a ausencia da capability de produto.

## 4. Detailed Change Proposals

### 4.1 Epic 1 Scope Update

**OLD**

- Fundacao com isolamento por tenant, perfis basicos e configuracao inicial.

**NEW**

- Fundacao com isolamento por tenant, perfis basicos, gestao administrativa minima de usuarios e configuracao inicial.

**Rationale**

A fundacao de acesso precisa cobrir nao apenas autenticacao e bloqueio, mas tambem a criacao operacional dos atores que exercem cada papel no tenant.

### 4.2 New Stories

**Story 1.6**

- cadastrar usuario da igreja
- atribuir perfil basico
- impedir duplicidade operacional
- refletir papel no contexto de sessao

**Story 1.7**

- listar usuarios do tenant atual
- editar perfil
- ativar ou desativar acesso
- impedir auto-remocao destrutiva da administracao minima

**Rationale**

Separar cadastro inicial de manutencao reduz acoplamento e mantem as stories pequenas o suficiente para implementacao incremental.

### 4.3 Sequencing Change

**NEW RULE**

- A validacao funcional completa do Epic 2 deve ocorrer apenas depois que o tenant puder disponibilizar um usuario real de tesouraria por meio das stories 1.6 e 1.7.

**Rationale**

Sem isso, o financeiro pode estar tecnicamente correto, mas ainda nao exercitavel do ponto de vista do produto.

### 4.4 MVP Scope Clarification

**NEW**

- O MVP inclui gestao basica de usuarios da igreja com atribuicao de perfil e ativacao/desativacao.
- O MVP nao inclui exclusao fisica de usuarios nem governanca avancada de permissoes.

**Rationale**

Mantem o escopo enxuto, auditavel e consistente com o dominio financeiro.

## 5. Implementation Handoff

### Scope Classification

**Moderate**

### Handoff Recipients

- **PO / PM:** atualizar priorizacao para inserir 1.6 e 1.7 antes da validacao funcional completa do Epic 2 e antes de qualquer UAT financeiro definitivo.
- **SM:** refletir as novas stories no fluxo de preparacao de backlog e no `sprint-status.yaml`.
- **Arquitetura / Dev:** reutilizar `church_user.role`, `status`, policies, sessao BFF e invalidacao de contexto ja previstos.

### Success Criteria

- `epics.md` passa a conter as stories 1.6 e 1.7 no Epic 1.
- O PRD e o MVP scope passam a explicitar a gestao basica de usuarios.
- `sprint-status.yaml` deixa de marcar o Epic 1 como concluido e passa a registrar 1.6 e 1.7 como backlog.
- A dependencia operacional do Epic 2 para validacao funcional fica documentada.
- Nenhuma exclusao fisica de usuario e introduzida no MVP.
