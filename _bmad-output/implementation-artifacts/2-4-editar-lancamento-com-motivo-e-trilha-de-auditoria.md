# Story 2.4: Editar lancamento com motivo e trilha de auditoria

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a tesoureiro,
I want corrigir um lancamento salvo informando o motivo da alteracao,
so that eu mantenha seguranca e prestacao de contas confiavel.

## Acceptance Criteria

1. Dado que existe um lancamento financeiro salvo, quando o tesoureiro altera qualquer dado relevante e informa o motivo, entao o sistema salva a nova versao do lancamento e registra o motivo, usuario (via `auth()->id()`), horario e snapshots `old_values` / `new_values` em formato JSON na trilha de auditoria.
2. Dado que o tesoureiro tenta salvar uma alteracao sem motivo, quando confirma a edicao, entao o sistema bloqueia a atualizacao e informa que o motivo e obrigatorio para alteracoes financeiras.
3. Dado que a API recebe a requisicao de edicao, quando a autorizacao ou o tenant sao validados, entao o sistema deve usar uma **Laravel Policy ou Gate** (ex: `FinancialEntryPolicy`) para validar a posse do registro pelo `church_id` e a permissao do perfil, impedindo edicao em lancamentos de outro tenant ou por usuarios sem permissao na tesouraria.
4. Dado que a interface de edicao ou a lista de lancamentos e aberta, quando o usuario aciona a visualizacao do historico, entao o sistema mostra de forma amigavel (via **Dialog, Drawer ou componente expansivel** na home) a trilha de auditoria do lancamento, evidenciando o que mudou.

## Tasks / Subtasks

- [x] Criar infraestrutura de auditoria financeira no backend (AC: 1)
  - [x] Criar migration `financial_entry_audits` associada a `financial_entries` contendo: `user_id` (FK), `church_id` (index), `old_values` (json), `new_values` (json), `reason` (text), `ip_address` (string, nullable) e timestamps.
  - [x] Criar model `FinancialEntryAudit` garantindo tenant isolation (`church_id`).
- [x] Implementar logica de autorizacao e auditoria na API (AC: 1, 2, 3)
  - [x] Criar/Atualizar `FinancialEntryPolicy` para autorizar a acao `update`.
  - [x] Criar `UpdateFinancialEntryRequest` exigindo `reason` (string, max 255).
  - [x] Criar service `UpdateFinancialEntryService` encapsulando em uma `DB::transaction()`: a captura dos valores antigos, a atualizacao do entry, e a persistencia do `FinancialEntryAudit` com os snapshots JSON.
  - [x] Expor o endpoint `PUT/PATCH /api/v1/finance/entries/{entry}` na area `treasury`.
  - [x] Garantir que o endpoint retorna erro 403 (via Policy) antes de qualquer validacao de payload 422.
- [x] Estender contratos BFF e web app (AC: 1, 2)
  - [x] Criar handler BFF em `church-erp-web/src/app/api/finance/entries/[id]/route.ts` para mediar o PUT/PATCH.
  - [x] Atualizar tipos em `church-erp-web/src/features/finance/financial-entry.ts`.
- [x] Implementar UI de edicao e visualizacao da auditoria (AC: 1, 2, 4)
  - [x] Adicionar fluxo de edicao reutilizando os componentes visuais do `TreasuryEntryForm`.
  - [x] Criar um componente (ex: `FinancialEntryHistory`) em Dialog ou Drawer para exibir a trilha de auditoria.
  - [x] Garantir que o campo `reason` seja solicitado no ato de salvar a edicao.
- [x] Adicionar testes obrigatorios (AC: 1, 2, 3)
  - [x] Teste backend: Edicao bem sucedida gera registro de auditoria com snapshots JSON corretos. Edicao sem motivo retorna 422. Leak de autorizacao (outro tenant) retorna 403 via Policy.
  - [x] Teste frontend: Erros 500 do BFF sao sanitizados; o fluxo de edicao bloqueia submissao sem motivo.

## Dev Notes

### Contexto funcional e objetivo desta story

- O objetivo desta story e permitir a edicao segura de lancamentos, introduzindo auditoria explicita.
- O foco e transparência: salvar o estado anterior e o novo (`old_values`/`new_values`) para permitir auditoria posterior.
- Continua focado na home operacional da tesouraria, evitando criar modulos isolados de auditoria.

### Guardrails de implementacao obrigatorios

- O log de auditoria deve ser persistido em sua propria tabela e incluir o `church_id` para respeitar o tenant isolation.
- O `user_id` na auditoria deve ser capturado obrigatoriamente do `auth()->id()`.
- O campo `reason` e de preenchimento obrigatorio no frontend e backend ao editar.
- Manter o uso do BFF; navegadores nao chamam a API Laravel diretamente.
- Reutilizar fundacao `shadcn/ui` para os overlays de edicao e historico.

### Abordagens proibidas

- Nao confiar no `user_id` ou `church_id` vindo do payload do frontend.
- Nao realizar mutacao sem transacao e sem registrar o diff no audit log.
- Nao criar visualizacoes de auditoria genericas; use componentes que reflitam o dominio financeiro.

### Arquivos provaveis a alterar ou criar

- `church-erp-api/routes/api.php`
- `church-erp-api/app/Policies/FinancialEntryPolicy.php`
- `church-erp-api/app/Domain/Finance/Models/FinancialEntryAudit.php`
- `church-erp-api/app/Domain/Finance/Services/UpdateFinancialEntryService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/UpdateFinancialEntryController.php`
- `church-erp-api/app/Http/Requests/UpdateFinancialEntryRequest.php`
- `church-erp-api/database/migrations/...create_financial_entry_audits_table.php`
- `church-erp-web/src/app/api/finance/entries/[id]/route.ts`
- `church-erp-web/src/features/finance/financial-entry.ts`
- `church-erp-web/src/components/operational/financial-entry-history-dialog.tsx`

### Estados obrigatorios da UI ou do fluxo

- `loading`: ao buscar dados do lancamento e seu historico.
- `editing`: formulario aberto preenchido.
- `submitting`: request sendo enviada.
- `reason_required_error`: se o usuario tentar submeter sem preencher o motivo.
- `success`: modal/drawer se fecha e a lista principal atualiza ou exibe toast.

### Requisitos tecnicos obrigatorios

- Backend: PHP 8.3, Laravel 12. Transaction no service de edicao. Snapshots JSON.
- Frontend: Next.js App Router, endpoints BFF (`route.ts`), React hooks locais, Tailwind, componentes base `shadcn/ui`.

### Compliance de arquitetura

- Manter boundary BFF; rotas snake_case na API; isolamento tenant-scoped obrigadorio via Policies.

### Requisitos de teste

- Backend: Edicao bem sucedida, fallback 422 sem motivo, falha tenant/autenticacao (403 via Policy).
- Web: Testes de renderizacao/smoke verificando fluxo de erro quando falta motivo, sucesso na comunicacao BFF.

### Licoes de stories ou reviews anteriores

- A story 2.3 ressaltou a importancia de sanitizar erros e bloquear acessos (403) antes da validacao de request (422).
- Garanta que a mudanca do endpoint de `entries` para `entries/[id]` no frontend seja tratada com clareza nos handlers do BFF.

### Project Structure Notes

- A nova UI deve co-existir de forma harmoniosa o `TreasuryEntryForm` existente na home de tesouraria.

### References

- Epic 2, Story 2.4. `_bmad-output/planning-artifacts/prd.md`.

### Checklist pre-review

- Validadas regras de tenant via `FinancialEntryPolicy`.
- Snapshots `old_values` e `new_values` persistidos como JSON.
- O BFF possui endpoint `PUT/PATCH` intermediando a requisicao.
- O usuario recebe feedback claro se o motivo for ignorado.
- Os testes rodam no backend (`php artisan test`) e frontend (`npm test`, `npm run lint`).

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Criar a trilha persistida `financial_entry_audits` e a policy de edicao tenant-scoped no backend financeiro.
- Expor as seams necessarias para a home operacional: listagem de lancamentos recentes, historico de auditoria e edicao via BFF.
- Reutilizar `TreasuryEntryForm` como host da edicao, com motivo obrigatorio e um dialog dedicado para a trilha de auditoria.
- Fechar a story com testes backend/web e com validacoes completas do repo.

### Debug Log References

- Workflow carregado a partir de `_bmad/core/tasks/workflow.xml` e `_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`.
- Contexto lido de `_bmad-output/project-context.md`, `sprint-status.yaml`, story 2.3 e artefatos de planejamento relevantes da Epic 2.
- Teste vermelho inicial executado com `php artisan test tests/Feature/Finance/FinancialEntryEditingTest.php` e `npm test`, falhando por ausencia de model/rotas de auditoria e pelos novos handlers BFF.
- Validacoes finais executadas com `./vendor/bin/pint --test`, `php artisan test`, `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke`.

### Completion Notes

- Auditoria financeira implementada em tabela propria com `church_id`, `user_id`, `reason`, `ip_address` e snapshots JSON `old_values`/`new_values`.
- `FinancialEntryPolicy` passou a bloquear edicao e leitura do historico fora do tenant correto antes da validacao de payload.
- A home da tesouraria agora lista lancamentos recentes, permite entrar em modo de edicao no proprio `TreasuryEntryForm` e abre o historico auditado em `Dialog`.
- Foram adicionadas as seams BFF `GET /api/finance/entries`, `PUT/PATCH /api/finance/entries/[id]` e `GET /api/finance/entries/[id]/audits`, todas com sanitizacao de `401`, `403` e `500`.
- O hardening pos-review corrigiu a semantica de `404` para lancamentos inexistentes, tornou a edicao resiliente a falhas no refresh da lista e ampliou a cobertura do BFF de edicao/historico com smoke tests reais.

## File List

- church-erp-api/database/migrations/2026_05_13_000001_create_financial_entry_audits_table.php
- church-erp-api/app/Domain/Finance/Models/FinancialEntry.php
- church-erp-api/app/Domain/Finance/Models/FinancialEntryAudit.php
- church-erp-api/app/Domain/Finance/Services/CreateFinancialEntryService.php
- church-erp-api/app/Domain/Finance/Services/ListFinancialEntriesService.php
- church-erp-api/app/Domain/Finance/Services/ListFinancialEntryAuditsService.php
- church-erp-api/app/Domain/Finance/Services/UpdateFinancialEntryService.php
- church-erp-api/app/Policies/FinancialEntryPolicy.php
- church-erp-api/app/Http/Controllers/Api/V1/ListFinancialEntriesController.php
- church-erp-api/app/Http/Controllers/Api/V1/ListFinancialEntryAuditsController.php
- church-erp-api/app/Http/Controllers/Api/V1/UpdateFinancialEntryController.php
- church-erp-api/app/Http/Requests/UpdateFinancialEntryRequest.php
- church-erp-api/app/Http/Resources/FinancialEntryResource.php
- church-erp-api/app/Http/Resources/FinancialEntryListResource.php
- church-erp-api/app/Http/Resources/FinancialEntryAuditListResource.php
- church-erp-api/app/Http/Resources/FinancialEntryAuditResource.php
- church-erp-api/app/Providers/AppServiceProvider.php
- church-erp-api/routes/api.php
- church-erp-api/tests/Feature/Finance/FinancialEntryEditingTest.php
- church-erp-web/src/app/api/finance/entries/route.ts
- church-erp-web/src/app/api/finance/entries/[id]/route.ts
- church-erp-web/src/app/api/finance/entries/[id]/audits/route.ts
- church-erp-web/src/components/ui/textarea.tsx
- church-erp-web/src/components/operational/treasury-entry-form.tsx
- church-erp-web/src/components/operational/financial-entry-history-dialog.tsx
- church-erp-web/src/features/finance/counterparty-inline-state.ts
- church-erp-web/src/features/finance/financial-entry.ts
- church-erp-web/src/features/finance/treasury-entry-form-state.ts
- church-erp-web/tests/bff-smoke.test.mjs
- church-erp-web/tests/financial-entry-editing.test.mjs
- church-erp-web/tests/treasury-entry-form-state.test.mjs

## Change Log

- 2026-05-13: implementada a edicao de lancamentos com motivo obrigatorio, policy tenant-scoped, trilha de auditoria persistida, BFFs de edicao/historico e bloco operacional de rastreabilidade na home da tesouraria.
- 2026-05-18: code review adversarial corrigiu o falso erro apos edicao bem-sucedida, alinhou `404` para ids inexistentes, localizou o feedback tecnico do fluxo e adicionou cobertura comportamental para os handlers BFF de edicao e historico.

## Senior Developer Review (AI)

### Outcome

- Review result: `approve`
- Status after review: `done`
- High/medium findings resolvidos: `4`

### Review Notes

- O `UpdateFinancialEntryRequest` agora devolve `404` explicito quando o recurso nao existe, evitando responder `403` para um `entry` inexistente antes do controller.
- `FinancialEntryResource` passou a expor `latest_audit`, permitindo que o frontend atualize a lista de lancamentos de forma otimista logo apos a edicao bem-sucedida.
- `TreasuryEntryForm` deixou de tratar falha no refresh da lista como falha da edicao; a mutacao concluida permanece em estado de sucesso e o recarregamento completo vira tentativa best-effort.
- As rotas BFF novas de edicao e historico receberam smoke tests de contrato e de sanitizacao, e o fluxo web passou a normalizar a mensagem tecnica `Server error` antes de exibi-la ao usuario.
- A `File List` foi sincronizada com o worktree real, incluindo os arquivos de estado/teste omitidos na primeira versao da story.

### Verification

- `php artisan test`
- `./vendor/bin/pint --test`
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build:smoke`
