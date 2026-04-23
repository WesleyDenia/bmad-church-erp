# Sprint Change Proposal

**Date:** 2026-04-22
**Project:** curso-bmad
**Mode:** Batch
**Trigger Story:** 1.1 - Inicializar a fundacao do projeto com backend e frontend desacoplados
**Approval Status:** Applied
**Scope Classification:** Minor

## 1. Issue Summary

O `project-context.md` foi criado depois da Story 1.1 ja estar marcada como `done`. A story ainda preservava uma nota historica dizendo que nenhum `project-context.md` existia durante sua criacao, o que poderia induzir agentes futuros a ignorar o novo arquivo de regras duraveis do projeto.

O problema identificado e documental e de governanca BMAD: a implementacao aprovada da Story 1.1 continua compativel com o contexto recem-criado, mas a propria story precisava apontar para `_bmad-output/project-context.md` como fonte obrigatoria em futuras leituras.

## 2. Impact Analysis

### Epic Impact

- **Epic 1:** permanece valido e em andamento. Nao ha alteracao de escopo, sequencia ou acceptance criteria.
- **Epics 2 a 5:** sem impacto direto. O novo `project-context.md` reforca regras que ja devem orientar as stories futuras.

### Story Impact

- **Story 1.1:** impactada apenas em notas, referencias e registro historico.
- **Story 1.2 em diante:** devem continuar lendo `_bmad-output/project-context.md` antes de implementacao, conforme regra de workflow ja registrada no proprio contexto.

### Artifact Conflicts

- **PRD:** sem conflito.
- **Architecture:** sem conflito; as regras do `project-context.md` resumem e operacionalizam as decisoes arquiteturais.
- **UX:** sem conflito; o contexto reforca Teal Operacional, separacao de primitives/design-system/operational e linguagem nao corporativa.
- **Sprint status:** sem alteracao necessaria. Story 1.1 pode permanecer `done`.

### Technical Impact

Nao foi identificada necessidade de alterar codigo para a Story 1.1. O `project-context.md` confirma regras ja refletidas na implementacao aprovada: Laravel como API/domain backend, Next.js App Router como BFF/UI, contratos `snake_case`, tenant isolation via `church_id`, `JsonResource`, `src/lib/api/client.ts` server-side e separacao das camadas de frontend.

## 3. Recommended Approach

### Selected Path

**Direct Adjustment**

### Rationale

O ajuste necessario e pequeno e localizado. Reabrir a story geraria ruido no sprint sem adicionar seguranca tecnica, porque nao ha AC quebrado nem implementacao obrigatoria pendente causada pelo `project-context.md`.

### Option Evaluation

- **Option 1: Direct Adjustment**
  - Viavel
  - Effort: Low
  - Risk: Low
  - Corrige a fonte de verdade sem interromper o fluxo da Story 1.2

- **Option 2: Potential Rollback**
  - Nao viavel
  - Effort: High
  - Risk: High
  - Nao ha evidencia de regressao na Story 1.1

- **Option 3: PRD MVP Review**
  - Nao necessaria
  - Effort: High
  - Risk: Medium
  - O escopo do MVP permanece coerente

## 4. Detailed Change Proposals

### 4.1 Story 1.1 Update

**Story:** `1.1 - Inicializar a fundacao do projeto com backend e frontend desacoplados`  
**Section:** Project Structure Notes

**OLD**

- Nenhum `project-context.md` foi encontrado no repositorio durante a criacao desta story. Usar os artefatos de planejamento como fonte primaria de contexto.

**NEW**

- Durante a criacao original desta story, nenhum `project-context.md` existia. Apos a geracao de `_bmad-output/project-context.md` em 2026-04-22, qualquer leitura futura da Story 1.1 deve usar esse arquivo como fonte obrigatoria de guardrails de implementacao, junto com PRD, arquitetura, UX e sprint status.

**Rationale**

A nota antiga era verdadeira historicamente, mas ficou perigosa depois da criacao do contexto. A story precisa preservar o historico sem contrariar o novo fluxo de trabalho.

### 4.2 References Update

**Story:** `1.1 - Inicializar a fundacao do projeto com backend e frontend desacoplados`  
**Section:** References

**OLD**

- Referencias listavam epicos, arquitetura, PRD, UX e documentacao externa.

**NEW**

- Adicionar `_bmad-output/project-context.md` como referencia de regras duraveis para agentes sobre stack, fronteiras Laravel/Next.js, contratos `snake_case`, BFF, tenancy, testes, qualidade e fluxo BMAD.

**Rationale**

Agentes futuros devem encontrar o arquivo de contexto diretamente a partir da story.

### 4.3 Completion Notes and Change Log

**Story:** `1.1 - Inicializar a fundacao do projeto com backend e frontend desacoplados`  
**Section:** Dev Agent Record

**NEW**

- Registrar que a revisao contra `project-context.md` foi concluida em 2026-04-22.
- Registrar que a story foi mantida como `done` porque o ajuste foi documental e nao alterou escopo ou implementacao.

**Rationale**

Mantem rastreabilidade do correct-course sem reabrir indevidamente uma story aprovada.

## 5. Implementation Handoff

### Scope Classification

**Minor**

### Handoff Recipients

- **Development team:** usar `_bmad-output/project-context.md` em qualquer nova implementacao ou revisao.
- **Scrum Master / PO:** manter Story 1.1 como `done`; nao ha reorganizacao de backlog.

### Success Criteria

- Story 1.1 referencia explicitamente `_bmad-output/project-context.md`.
- Nota obsoleta sobre ausencia de `project-context.md` foi atualizada sem apagar o historico.
- `sprint-status.yaml` permanece coerente com Story 1.1 em `done`.
- Nenhuma mudanca de codigo foi introduzida para um problema documental.

