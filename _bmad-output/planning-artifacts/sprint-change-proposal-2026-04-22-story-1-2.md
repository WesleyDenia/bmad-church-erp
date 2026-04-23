# Sprint Change Proposal

**Date:** 2026-04-22
**Project:** curso-bmad
**Mode:** Batch
**Trigger Story:** 1.2 - Criar igreja e conta administradora inicial
**Approval Status:** Applied
**Scope Classification:** Minor

## 1. Issue Summary

O `project-context.md` foi criado depois da Story 1.2 ja ter sido criada e iniciada. A story ainda preservava notas dizendo que nenhum `project-context.md` existia, o que poderia fazer agentes futuros continuarem usando apenas os artefatos de planejamento como fonte de contexto.

A verificacao comparou a story e a implementacao parcial contra `_bmad-output/project-context.md`. A conclusao e que nao ha mudanca de escopo nem necessidade de reabrir, porque a story ja esta `in-progress`. O ponto necessario e atualizar a documentacao da story para tornar o novo contexto obrigatorio na continuidade do trabalho.

## 2. Impact Analysis

### Epic Impact

- **Epic 1:** permanece `in-progress`. A Story 1.2 continua sendo a primeira entrega funcional real do dominio Identity.
- **Epics 2 a 5:** sem impacto direto.

### Story Impact

- **Story 1.2:** permanece `in-progress`.
- A implementacao parcial ja segue os guardrails centrais do `project-context.md`: Laravel como API/domain backend, Next.js como BFF/UI, contratos `snake_case`, endpoint Laravel versionado, `JsonResource`, service transacional, route handler BFF e separacao da autenticacao completa para a Story 1.3.
- A story ainda nao deve ir para `review`, porque o gate Laravel continua bloqueado pelo ambiente local sem `pdo_sqlite`.

### Artifact Conflicts

- **PRD:** sem conflito.
- **Architecture:** sem conflito.
- **UX:** sem conflito.
- **Sprint status:** sem alteracao necessaria; `1-2-criar-igreja-e-conta-administradora-inicial` permanece `in-progress`.
- **Story 1.2:** tinha notas obsoletas sobre ausencia de `project-context.md` e precisava de atualizacao.

### Technical Impact

Nao foi identificada necessidade imediata de alterar codigo por causa do `project-context.md`. O principal bloqueio tecnico permanece externo ao codigo da story: `php artisan test --filter=InitialChurchSetupTest` falha antes das assertions porque o PHP local nao possui driver SQLite.

## 3. Recommended Approach

### Selected Path

**Direct Adjustment**

### Rationale

A story ja esta no status correto para trabalho incompleto. Reabrir nao se aplica, e promover para review seria incorreto enquanto o gate Laravel nao passa. O melhor caminho e atualizar as notas e referencias da story, mantendo o status atual.

### Option Evaluation

- **Option 1: Direct Adjustment**
  - Viavel
  - Effort: Low
  - Risk: Low
  - Mantem rastreabilidade e evita ruido de status

- **Option 2: Potential Rollback**
  - Nao viavel
  - Effort: High
  - Risk: High
  - Nao ha incompatibilidade identificada entre implementacao parcial e `project-context.md`

- **Option 3: PRD MVP Review**
  - Nao necessaria
  - Effort: High
  - Risk: Medium
  - O escopo de onboarding continua coerente com MVP e Epic 1

## 4. Detailed Change Proposals

### 4.1 Story 1.2 Project Context Update

**Story:** `1.2 - Criar igreja e conta administradora inicial`  
**Section:** Project Structure Notes

**OLD**

- Nenhum `project-context.md` foi encontrado no repositorio durante a criacao desta story.

**NEW**

- Durante a criacao original desta story, nenhum `project-context.md` existia. Apos a geracao de `_bmad-output/project-context.md` em 2026-04-22, qualquer continuidade da Story 1.2 deve usar esse arquivo como fonte obrigatoria de guardrails de implementacao, junto com PRD, arquitetura, UX, Story 1.1 e sprint status.

**Rationale**

Preserva o historico da criacao da story sem contrariar o novo fluxo obrigatorio de contexto.

### 4.2 References Update

**Story:** `1.2 - Criar igreja e conta administradora inicial`  
**Section:** References

**NEW**

- Adicionar `_bmad-output/project-context.md` como referencia de regras duraveis para agentes sobre stack, fronteiras Laravel/Next.js, contratos `snake_case`, BFF, tenancy, testes, qualidade e fluxo BMAD.

**Rationale**

Agentes futuros precisam encontrar o contexto diretamente a partir da story antes de continuar implementacao ou review.

### 4.3 Status Decision

**Story:** `1.2 - Criar igreja e conta administradora inicial`  
**Section:** Dev Agent Record

**Decision**

- Manter `Status: in-progress`.
- Nao marcar tarefas como concluidas enquanto o gate Laravel nao passa.
- Nao mover para `review` enquanto `InitialChurchSetupTest` estiver bloqueado.

**Evidence**

- `npm run test`: passou em 2026-04-22.
- `npm run typecheck`: passou em 2026-04-22.
- `php artisan test --filter=InitialChurchSetupTest`: falhou antes das assertions por `could not find driver (Connection: sqlite, Database: :memory:)`.

## 5. Implementation Handoff

### Scope Classification

**Minor**

### Handoff Recipients

- **Development team:** continuar Story 1.2 lendo `_bmad-output/project-context.md`; fechar o gate Laravel em ambiente com driver de banco disponivel; completar marcacoes de tasks apenas apos validacao.
- **Scrum Master / PO:** manter Story 1.2 em `in-progress`; nao ha reorganizacao de backlog.

### Success Criteria

- Story 1.2 referencia explicitamente `_bmad-output/project-context.md`.
- Nota obsoleta sobre ausencia de `project-context.md` foi atualizada sem apagar o historico.
- `sprint-status.yaml` permanece coerente com Story 1.2 em `in-progress`.
- O bloqueio de teste Laravel continua documentado como impedimento para review.

