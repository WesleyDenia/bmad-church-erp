---
title: 'Aceite de termos no onboarding'
slug: 'aceite-de-termos-no-onboarding'
created: '2026-11-02'
status: 'Completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 16 App Router', 'React 19', 'TypeScript strict', 'Tailwind CSS 4', 'Radix Dialog', 'Laravel 12', 'PHP 8.3', 'Eloquent/MySQL', 'PHPUnit', 'Node test']
files_to_modify: ['church-erp-api/database/migrations/*_create_terms_table.php', 'church-erp-api/database/migrations/*_migrate_terms_acceptances_to_terms.php', 'church-erp-api/app/Domain/Settings/Models/Term.php', 'church-erp-api/app/Domain/Settings/Models/TermsAcceptance.php', 'church-erp-api/app/Domain/Settings/Services/ResolveOnboardingTermsService.php', 'church-erp-api/app/Domain/Settings/Services/RecordTermsAcceptanceService.php', 'church-erp-api/app/Http/Resources/OnboardingTermsResource.php', 'church-erp-api/tests/Feature/Identity/InitialChurchSetupTest.php', 'church-erp-web/src/features/auth/initial-setup.ts', 'church-erp-web/src/app/(auth)/onboarding/page.tsx', 'church-erp-web/tests/bff-smoke.test.mjs']
code_patterns: ['controlled React form with local state', 'Next.js BFF boundary via callLaravel', 'Radix Dialog wrapper in components/ui', 'Laravel FormRequest + service + JsonResource', 'transactional onboarding service', 'audit record with content hash']
test_patterns: ['Laravel Feature tests with RefreshDatabase and database assertions', 'Node built-in test source/contract smoke tests', 'BFF mock tests that assert internal headers']
---

# Tech-Spec: Aceite de termos no onboarding

**Created:** 2026-11-02

## Overview

### Problem Statement

O onboarding hoje apresenta os termos de uso diretamente no formulario. A experiencia nao destaca a leitura do documento nem oferece um meio claro de reabri-lo a partir do aceite. Alem disso, o documento legal e resolvido de `settings`, estrutura mutavel que nao preserva versoes. O consentimento precisa ser obrigatorio e apontar para uma versao imutavel do termo aceita pela conta administradora criada.

### Solution

Introduzir uma entidade `terms` somente de insercao, na qual cada revisao e uma nova versao persistente; `settings` permanece para configuracoes gerais. Resolver o termo publicado mais recente pela nova tabela, apresenta-lo em modal ao entrar no onboarding e pelo link `termos` junto ao checkbox “Li e aceito os termos”. Exigir o checkbox e registrar o aceite contra o `term_id` imutavel na mesma transacao que cria o usuario.

### Scope

**In Scope:**

- Modal de termos aberto no carregamento do onboarding e reaberto pelo acionador `termos` junto ao checkbox.
- Checkbox obrigatorio “Li e aceito os termos”.
- Tabela `terms` versionada e imutavel como fonte dos termos legais; `settings` continua sem responsabilidade por documentos legais.
- Migracao segura dos aceites existentes de `setting_id` para `term_id`, sem apagar evidencia anterior.
- Modal acessivel, com foco gerenciado e retorno ao acionador que o abriu.
- Tratamento de indisponibilidade do termo: mensagem clara, nova tentativa e bloqueio da conclusao enquanto nao houver termo carregado.
- Validacao server-side do aceite e persistencia auditavel ligada ao usuario criado, incluindo o conteudo ou identificador de versao aceito.
- Cobertura de testes para interface/contrato e persistencia.

**Out of Scope:**

- Interface administrativa para editar o termo.
- Reaceite em massa de usuarios ja cadastrados quando uma versao nova for publicada.
- Interface administrativa ou API publica para publicar um novo termo; a primeira versao e provisionada pela migration.
- Alteracao dos fluxos de login, usuarios da igreja ou permissao.

## Context for Development

### Codebase Patterns

- O formulario controlado em `onboarding/page.tsx` ja busca `GET /api/onboarding/terms`, envia `terms_accepted` e desabilita o submit sem termo. O delta e substituir a pre-visualizacao inline por `Dialog` controlado, aberto uma vez apos a primeira resposta valida e reaberto por acionador separado do label do checkbox.
- Reutilizar `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` e `DialogDescription` de `src/components/ui/dialog.tsx`. Para abertura automatica, mover foco para o titulo do dialog e, ao fechar, devolver foco ao checkbox (nao existe trigger). Para abertura manual, usar acionador `button type="button"` com texto `termos` e devolver foco a ele. O texto precisa ter `max-h` e `overflow-y-auto`.
- Next.js App Router chama Laravel somente pelo BFF em `src/app/api`; contratos HTTP permanecem em `snake_case`. `GET /api/onboarding/terms` ja delega a `callLaravel('/api/v1/onboarding/terms')` e nao requer novo endpoint.
- No Laravel, `StoreInitialChurchSetupRequest` continua a exigir `terms_accepted` com `accepted`; `CreateInitialChurchSetupService` deve resolver o termo publicado atual dentro da transacao e registrá-lo com `RecordTermsAcceptanceService`.
- `terms` deve possuir `version` inteiro unico, `content` (`longText`), `content_hash` SHA-256 unico, `published_at` e `created_at`, sem `updated_at`. O modelo deve bloquear eventos `updating` e `deleting`; nao pode haver endpoint de update/delete. Uma alteracao sempre insere nova linha com versao maior.
- `terms_acceptances` deve preservar `user_id`, `term_id`, `terms_content_hash` e `accepted_at`; a restricao unica `(user_id, term_id)` preserva idempotencia por versao, sem impedir aceite de uma versao futura.
- A funcao de carga deve usar contador/`AbortController` para descartar respostas ultrapassadas. Uma resposta somente e valida se o JSON tiver `data.id` numerico, `data.version` numerico, `data.content` string nao vazia e `data.content_hash` string; caso contrario deve seguir o mesmo estado de erro recuperavel.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `church-erp-web/src/app/(auth)/onboarding/page.tsx` | Formulario, busca dos termos e ponto de integracao do modal/checkbox. |
| `church-erp-web/src/components/ui/dialog.tsx` | Primitive Radix a reutilizar para foco, portal e semantica acessivel do modal. |
| `church-erp-web/src/app/api/onboarding/terms/route.ts` | BFF para consultar o termo atual. |
| `church-erp-web/src/features/auth/initial-setup.ts` | Contrato TypeScript do termo, a atualizar de `key`/`value` para id, versao, conteudo e hash. |
| `church-erp-web/tests/bff-smoke.test.mjs` | Padrao Node test para contrato BFF e assercoes textuais da pagina. |
| `church-erp-api/database/migrations/*_create_terms_table.php` | Nova fonte versionada e imutavel de termos legais. |
| `church-erp-api/database/migrations/*_migrate_terms_acceptances_to_terms.php` | Backfill de dados e troca de FK de settings para terms. |
| `church-erp-api/app/Domain/Settings/Models/Term.php` | Modelo imutavel de termo, incluindo bloqueio de update/delete. |
| `church-erp-api/app/Domain/Settings/Services/ResolveOnboardingTermsService.php` | Resolucao do termo publicado mais recente em `terms`. |
| `church-erp-api/app/Domain/Settings/Services/RecordTermsAcceptanceService.php` | Registro do aceite por `term_id`. |
| `church-erp-api/app/Http/Requests/StoreInitialChurchSetupRequest.php` | Validacao server-side obrigatoria de `terms_accepted`. |
| `church-erp-api/app/Domain/Identity/Services/CreateInitialChurchSetupService.php` | Transacao que cria igreja, admin, vinculo, defaults e aceite. |
| `church-erp-api/tests/Feature/Identity/InitialChurchSetupTest.php` | Cobertura API para leitura do setting, validacao, aceite e rollback. |

### Technical Decisions

- O aceite sera modelado como registro auditavel associado ao usuario e a uma versao imutavel de `terms`, e nao como booleano em `users` ou referencia a `settings`.
- O termo deve continuar a ser carregado pelo endpoint BFF ja existente; o browser nao acessara Laravel diretamente.
- O aceite somente sera persistido quando a criacao da igreja e da conta administradora for bem-sucedida; qualquer falha revertira todas as gravacoes relacionadas.
- O checkbox inicia desmarcado e fechar o modal nao altera seu estado; o fluxo nao presume aceite pelo simples acesso ao documento.
- Criar migrations aditivas; nunca editar migration ja aplicada. Se `settings.legal.terms_of_use.v1` e `terms_acceptances.setting_id` existirem, migrar o valor para `terms` versao 1, mapear os aceites pelo hash e somente depois tornar `term_id` obrigatorio e remover a dependencia de `setting_id`.
- Ao falhar a leitura, limpar qualquer termo anterior, manter submit desabilitado, anunciar o erro por `aria-live` e expor `Tentar novamente`; sucesso posterior abre o modal inicial uma unica vez. Fechar por Escape, overlay ou botao e permitido, mas nao equivale a aceite.

## Implementation Plan

### Tasks

- [x] Task 1: Criar a fonte versionada e imutavel de termos, preservando compatibilidade com dados existentes.
  - Files: `church-erp-api/database/migrations/*_create_terms_table.php`, `church-erp-api/database/migrations/*_migrate_terms_acceptances_to_terms.php`, `church-erp-api/app/Domain/Settings/Models/Term.php`
  - Action: Criar `terms` com `version` unico, `content`, `content_hash` unico, `published_at` e `created_at`; inserir a versao 1 a partir do termo seed vigente. Criar migration aditiva para inserir/backfill de `term_id` em `terms_acceptances`, validar que nenhum aceite ficou sem termo, tornar a FK obrigatoria, aplicar `unique(user_id, term_id)` e remover a FK/indice de `setting_id` somente depois do backfill.
  - Notes: O modelo deve bloquear `updating` e `deleting` com excecao de dominio; nao criar rota de update/delete. Uma revisao futura e sempre novo `INSERT` com versao maior. `settings` permanece intacta para configuracoes nao legais.

- [x] Task 2: Migrar os servicos e o contrato API para `Term`.
  - Files: `church-erp-api/app/Domain/Settings/Services/ResolveOnboardingTermsService.php`, `church-erp-api/app/Domain/Settings/Services/RecordTermsAcceptanceService.php`, `church-erp-api/app/Domain/Settings/Models/TermsAcceptance.php`, `church-erp-api/app/Http/Resources/OnboardingTermsResource.php`, `church-erp-api/app/Domain/Identity/Services/CreateInitialChurchSetupService.php`
  - Action: Resolver o termo publicado de maior `version`, registrar aceite por `term_id` e hash do conteudo, e retornar `{id, version, content, content_hash}` no endpoint existente. Manter a resolucao e o registro dentro da transacao de onboarding.
  - Notes: `firstOrCreate` deve usar `user_id` e `term_id`. Nao aceitar `term_id`, versao ou hash do browser: o backend sempre resolve o atual no momento da escrita.

- [x] Task 3: Atualizar contratos e tornar a consulta frontend resiliente.
  - Files: `church-erp-web/src/features/auth/initial-setup.ts`, `church-erp-web/src/app/(auth)/onboarding/page.tsx`
  - Action: Atualizar `OnboardingTerms` para o novo recurso. Extrair a consulta para funcao reutilizavel que use `AbortController` ou contador de requisicao e valide a forma de `body.data`; descartar respostas obsoletas e tratar payload 200 invalido como erro.
  - Notes: Em cada tentativa, limpar erro e termo anterior; em erro, manter submit indisponivel, anunciar por `aria-live` e renderizar `Tentar novamente`. Uma primeira resposta valida abre o modal uma unica vez.

- [x] Task 4: Implementar modal e aceite sem ambiguidade de foco ou label.
  - File: `church-erp-web/src/app/(auth)/onboarding/page.tsx`
  - Action: Reutilizar os primitives de `@/components/ui/dialog`, com conteudo rolavel. Para o primeiro open automatico, focar o titulo/descricao e devolver foco ao checkbox no fechamento. Renderizar checkbox e texto em grupo ARIA; fora do `label`, usar `button type="button"` com texto `termos` que abre o modal manualmente.
  - Notes: Remover por completo o paragrafo inline que mostra `terms.content`. Escape, overlay e botao podem fechar o modal, mas nao marcam o checkbox; o checkbox inicia falso e somente sua mudanca limpa o erro de aceite.

- [x] Task 5: Cobrir migrations, imutabilidade, API e comportamento de interface.
  - Files: `church-erp-api/tests/Feature/Identity/InitialChurchSetupTest.php`, novo teste backend de `Term`/migration conforme convencao existente, `church-erp-web/tests/bff-smoke.test.mjs`
  - Action: Testar criacao e imutabilidade de `Term`, backfill de aceite, recurso API versionado, rejeicao sem aceite, registro por `term_id`, nova versao com novo aceite permitido e rollback. No frontend, manter o smoke do BFF e adicionar teste de comportamento com ferramenta existente; se a suite atual nao renderiza React, adicionar testes focados de estado puro para carga/retry/ordem de respostas e manter checklist manual para foco/modal.
  - Notes: Rodar `npm test`, `npm run lint` e `npm run typecheck` em `church-erp-web`; `php artisan test` em `church-erp-api`.

### Acceptance Criteria

- [ ] AC 1: Dado que existe um termo publicado em `terms`, quando o onboarding consulta o BFF, entao recebe `id`, `version`, `content` e `content_hash` do termo de maior versao, sem consultar ou expor documento legal de `settings`.
- [ ] AC 2: Dado que o onboarding obteve termo valido pelo BFF, quando a tela e exibida pela primeira vez, entao um modal acessivel apresenta `content`, move foco ao titulo/descricao e o checkbox permanece desmarcado.
- [ ] AC 3: Dado que o modal foi fechado, quando a pessoa seleciona o botao `termos` adjacente ao texto de aceite, entao o mesmo modal e reaberto, e ao fecha-lo o foco retorna ao botao sem alterar o checkbox.
- [ ] AC 4: Dado que o modal aberto automaticamente foi fechado, quando recebe fechamento por Escape, overlay ou botao, entao o foco retorna ao checkbox e a pessoa ainda precisa marcá-lo explicitamente para concluir.
- [ ] AC 5: Dado que a pessoa seleciona o checkbox, quando envia o formulario com os demais campos validos, entao o browser envia somente `terms_accepted: true` pelo BFF existente e o onboarding e concluido normalmente.
- [ ] AC 6: Dado que a pessoa nao aceitou os termos, quando tenta concluir o onboarding, entao o backend retorna erro de validacao em `terms_accepted`, nenhuma igreja, usuario ou aceite e criado, e a interface exibe o erro nesse campo.
- [ ] AC 7: Dada falha HTTP, JSON invalido ou resposta sem `id`, `version`, `content` ou `content_hash` validos, quando a consulta do termo termina, entao a interface limpa termo anterior, anuncia erro, oferece nova tentativa e mantem a conclusao desabilitada.
- [ ] AC 8: Dadas duas tentativas concorrentes de carregamento, quando uma resposta mais antiga chega depois da mais recente, entao ela e ignorada e nao sobrescreve o estado mais novo da pagina.
- [ ] AC 9: Dado que o onboarding valido e concluido, quando a transacao e confirmada, entao existe um registro em `terms_acceptances` associado ao usuario criado, ao `term_id` atual, com hash SHA-256 e `accepted_at`; reprocessar a mesma versao nao duplica o registro.
- [ ] AC 10: Dado que uma nova versao de termo e inserida, quando o mesmo usuario aceita essa nova versao em fluxo aplicavel futuro, entao o banco permite novo registro para o novo `term_id` e preserva integralmente o aceite anterior.
- [ ] AC 11: Dado que um termo existe, quando o codigo da aplicacao tenta atualiza-lo ou exclui-lo, entao a operacao e rejeitada; uma revisao e possivel somente por insercao de nova versao.
- [ ] AC 12: Dado que qualquer etapa transacional do onboarding falha, quando a solicitacao termina com erro, entao os registros de igreja, usuario, vinculo, defaults e aceite correspondentes sao revertidos.

## Additional Context

### Dependencies

- `@radix-ui/react-dialog`, ja instalado e encapsulado por `@/components/ui/dialog`.
- Os endpoints existentes `GET /api/onboarding/terms` e `GET /api/v1/onboarding/terms`; apenas o resource e a fonte de dados mudam para `terms`.
- A migration de `terms` e a migration aditiva de backfill de `terms_acceptances`; o ambiente de teste deve aplicar ambas em banco limpo e em banco com o schema/aceites anteriores.

### Testing Strategy

- Frontend: manter smoke do BFF, mas nao tratar assercao de fonte como prova de comportamento. Extrair e testar a maquina/funcoes puras de estado da carga para sucesso, erro, retry, JSON invalido e resposta ultrapassada. Rodar `npm test`, `npm run lint` e `npm run typecheck` em `church-erp-web`.
- Backend: testar migrations/backfill, `Term` imutavel, resource do termo atual, aceite obrigatorio, `term_id`, hash, idempotencia por versao, aceite de versao nova e rollback. Rodar `php artisan test` em `church-erp-api`.
- Manual: validar com teclado a abertura automatica e manual, foco inicial e retorno correto em ambos os casos, Escape/overlay/botao, checkbox inalterado e mensagem `aria-live`; simular HTTP com falha, payload 200 malformado, retry e respostas fora de ordem.

### Notes

- A evidencia juridica passa a ser `term_id` mais `content_hash`; como `Term` e imutavel, a linha referenciada preserva o documento aceito sem duplicar o `longText` a cada aceite.
- A publicacao de versoes futuras permanece fora de escopo de interface, mas o banco e os servicos devem suportar insercao versionada. Nao reutilizar nem editar uma linha antiga.

## Implementation Notes

- Implementado em 2026-11-03: migrations aditivas para `terms` e o backfill de `terms_acceptances`; o endpoint continua o mesmo e agora expõe `id`, `version`, `content` e `content_hash`.
- Validado com `php artisan test tests/Feature/Identity/InitialChurchSetupTest.php`, `npm test`, `npm run lint` e `npm run typecheck`.
- Validacao manual pendente para o navegador: abertura automatica e manual do modal, foco inicial/retorno, Escape, clique no overlay, estado do checkbox e anuncio de falha/retry.

## Review Notes

- Adversarial review completed.
- Findings: 10 total, 10 addressed, 0 skipped.
- Resolution approach: auto-fix.
- O maior risco de UI e usar acionador interativo dentro de `label`. O botao `termos` deve ser irmao do label/texto do checkbox e ter rotulagem acessivel propria.
