# Story 1.5: Configurar categorias minimas iniciais

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a administradora da igreja,
I want iniciar a operacao com categorias financeiras e de pessoas predefinidas,
so that eu consiga gerar valor rapido sem configuracao extensa.

## Acceptance Criteria

1. Dado que uma nova igreja foi criada e a configuracao inicial e executada, quando o bootstrap terminar, entao o sistema registra as categorias minimas necessarias para financas e pessoas, todas associadas ao `church_id` da nova igreja.
2. Dado que a igreja abre um fluxo que depende dessas categorias, quando o fluxo consulta os defaults, entao o sistema oferece os valores iniciais sem exigir cadastro manual previo e sem expor categorias de outro tenant.
3. Dado que a rotina de configuracao inicial roda novamente ou e reprocessada apos uma falha, quando o bootstrap e executado, entao a criacao continua idempotente e nao gera duplicatas.
4. Dado que a provisao das categorias falha no meio do processo, quando a transacao e revertida, entao nao sobra setup parcial e o sistema retorna uma mensagem funcional e clara.

## Tasks / Subtasks

- [x] Definir a taxonomia minima de categorias para financas e pessoas no backend, mantendo os defaults explicitamente ligados ao tenant da igreja (AC: 1, 2)
  - [x] Reaproveitar o fluxo de `CreateInitialChurchSetupService` como ponto de orquestracao do bootstrap inicial, sem criar um fluxo paralelo de setup.
  - [x] Colocar a regra de dominio reutilizavel no dominio apropriado em `app/Domain/Finance` e `app/Domain/People`, mantendo a orquestracao em `Identity`.

- [x] Implementar a provisao transacional e idempotente das categorias iniciais com protecao contra duplicidade e fuga de tenant (AC: 1, 3, 4)
  - [x] Garantir que as categorias sejam criadas dentro da transacao ja usada pelo setup inicial.
  - [x] Adicionar constraints ou indices unicos nativos do Laravel para impedir duplicatas por `church_id`.
  - [x] Preservar o contrato HTTP atual do onboarding inicial e evitar wrappers novos desnecessarios.

- [x] Cobrir o comportamento com testes de backend e documentar o contrato de bootstrap (AC: 1, 2, 3, 4)
  - [x] Atualizar os testes de `InitialChurchSetup` e os testes unitarios do service para validar criacao, isolamento por tenant, idempotencia e rollback.
  - [x] Asserir estado de banco e contrato de resposta, nao apenas texto de mensagem.
  - [x] Se algum fluxo web precisar consumir os defaults, usar componentes base existentes em `src/components/ui` e composicoes em `src/features`, sem introduzir biblioteca paralela.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story fecha a lacuna entre o onboarding inicial da igreja e os primeiros fluxos operacionais.
- O objetivo e reduzir configuracao manual antes do primeiro uso real, especialmente para financas e pessoas.
- O MVP nao precisa de uma tela separada de administracao de categorias; a prioridade e provisionar defaults uteis desde a fundacao da igreja.
- A provisionacao deve permanecer simples, previsivel e tenant-scoped.

### Requisitos tecnicos obrigatorios

- O `church_id` continua sendo o eixo obrigatorio de isolamento em qualquer registro ou consulta relacionada a essas categorias.
- A criacao inicial precisa ser atomica com o setup da igreja; nao pode deixar tenant parcialmente provisionado.
- Nao criar um subsistema separado de permissao, configuracao ou taxonomy admin para resolver este caso.
- O backend Laravel segue como fonte de verdade; o frontend apenas consome o resultado quando necessario.

### Compliance de arquitetura

- Backend:
  - manter controllers finos e delegar para services;
  - usar `app/Domain/Identity` para orquestrar o onboarding inicial;
  - manter regras de negocio em dominios proprios de `Finance` e `People` quando a categoria precisar existir como entidade de dominio;
  - preservar respostas bem formadas com `JsonResource` ou JSON idiomatico do Laravel.
- Frontend:
  - nao mover regra de categoria para React;
  - se houver alguma UI de consumo, manter `src/components/ui` como primitives e `src/components` / `src/features` como composicoes de dominio;
  - nao introduzir nova biblioteca de componentes.

### Requisitos atuais de bibliotecas e framework

- Laravel 12 continua sendo o backend alvo.
- `DB::transaction()` e a forma adequada de proteger a provisionacao inicial contra falha parcial, porque o Laravel desfaz a operacao quando uma exception escapa da closure. [Source: https://laravel.com/docs/12.x/database]
- Seeders e testes de banco continuam sendo suportados de forma direta pelo framework, incluindo execucao de seeders especificos em testes e uso de `RefreshDatabase`. [Source: https://laravel.com/docs/12.x/database-testing]
- Se a implementacao optar por `upsert`, os indices unicos continuam sendo parte importante do contrato de idempotencia no MySQL/MariaDB. [Source: https://laravel.com/docs/12.x/queries]

### Estrutura de arquivos obrigatoria

- Backend provavel desta story:
  - `church-erp-api/app/Domain/Identity/Services/CreateInitialChurchSetupService.php`
  - `church-erp-api/app/Domain/Finance/Services/`
  - `church-erp-api/app/Domain/Finance/Models/`
  - `church-erp-api/app/Domain/People/Services/`
  - `church-erp-api/app/Domain/People/Models/`
  - `church-erp-api/database/migrations/`
  - `church-erp-api/database/seeders/`
  - `church-erp-api/tests/Feature/Identity/`
  - `church-erp-api/tests/Unit/Identity/`
- Frontend provavel desta story, apenas se algum fluxo precisar consumir os defaults:
  - `church-erp-web/src/components/ui/`
  - `church-erp-web/src/components/`
  - `church-erp-web/src/features/`

### Requisitos de teste

- Testes de backend devem cobrir:
  - criacao das categorias minimas no primeiro bootstrap;
  - isolamento por `church_id`;
  - idempotencia quando a rotina roda novamente;
  - rollback completo quando alguma etapa falha;
  - resposta funcional e simples em caso de erro.
- Use `RefreshDatabase` para qualquer teste que toque persistencia.
- Asserte o estado do banco e o contrato de resposta do onboarding.
- Se houver alguma UI de consumo, mantenha a validacao de comportamento em torno do BFF e nao exponha o backend diretamente ao browser.

### Learning from Story 1.4

- A Story 1.4 ja consolidou `church_id` como fonte de verdade para escopo e autorizacao.
- Esta story deve seguir o mesmo principio: defaults precisam nascer dentro do tenant correto e nunca depender de verificacao visual no frontend.
- O onboarding inicial ja existe e deve ser estendido, nao substituido.

### Projeto e UX relevantes para esta story

- O produto foi desenhado para dar valor rapido sem configuracao excessiva.
- Categorias minimas devem reduzir atrito para os primeiros fluxos, nao abrir uma tela de administracao extra.
- A experiencia precisa continuar coerente com um ERP operacional leve, nao com uma suite corporativa de configuracao.

### Project Structure Notes

- O workspace ja tem o fluxo de initial setup, o contrato de session e o baseline de tenancy.
- Esta story deve expandir o bootstrap inicial, mantendo a arquitetura dual app e os limites de dominio.
- Se uma nova entidade de categoria for criada, ela precisa seguir o padrao de dominios e o escopo por `church_id`.
- O frontend nao deve receber regra de provisioning sensivel.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 1, Story 1.5, acceptance criteria e ordem da epic.
- `_bmad-output/planning-artifacts/architecture.md` - Seeder Strategy, Data Architecture, domain boundaries e tenant isolation.
- `_bmad-output/planning-artifacts/prd.md` - FR-1, FR-5, escopo do MVP e requisitos de configuracao minima.
- `_bmad-output/project-context.md` - regras permanentes sobre `church_id`, separacao backend/frontend, `snake_case` e responsabilidade de autorizacao.
- `_bmad-output/implementation-artifacts/1-4-controlar-permissao-basica-por-perfil-e-tenant.md` - learnings sobre tenancy, backend como fonte de verdade e limites do frontend.
- `church-erp-api/app/Domain/Identity/Services/CreateInitialChurchSetupService.php` - ponto atual de orquestracao do onboarding inicial.
- `church-erp-api/app/Http/Controllers/Api/V1/InitialChurchSetupController.php` - contrato HTTP do setup inicial.
- `church-erp-api/app/Http/Requests/StoreInitialChurchSetupRequest.php` - validacao e mensagens do onboarding.
- `church-erp-api/tests/Feature/Identity/InitialChurchSetupTest.php` - cobertura atual do onboarding inicial.
- `church-erp-api/tests/Unit/Identity/CreateInitialChurchSetupServiceTest.php` - padrao atual de testes de service.
- `church-erp-api/app/Domain/Identity/Models/Concerns/BelongsToAuthenticatedChurch.php` - escopo automatico por igreja para categorias de dominio.
- `church-erp-api/tests/Unit/Finance/ProvisionInitialFinancialCategoriesServiceTest.php` - cobertura do isolamento e escopo por tenant das categorias financeiras.
- `church-erp-api/tests/Unit/People/ProvisionInitialPersonCategoriesServiceTest.php` - cobertura do isolamento e escopo por tenant das categorias de pessoas.
- `church-erp-api/app/Domain/README.md` - estrutura obrigatoria por dominio.
- `church-erp-api/app/Policies/README.md` - principio de autorizacao por tenant.
- `https://laravel.com/docs/12.x/database` - transacoes e comportamento de rollback.
- `https://laravel.com/docs/12.x/database-testing` - seeders e `RefreshDatabase` em testes.
- `https://laravel.com/docs/12.x/queries` - `upsert` e dependencia de indices unicos para idempotencia.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story criada a partir do backlog `1-5-configurar-categorias-minimas-iniciais` em `sprint-status.yaml`.
- O fluxo atual de onboarding ja existe; esta story foi escrita para estender a provisionacao inicial, nao para introduzir uma nova area administrativa.
- A analise foi ancorada em `epics.md`, `architecture.md`, `prd.md`, `project-context.md`, `CreateInitialChurchSetupService`, `InitialChurchSetupController` e nos testes existentes do onboarding.
- Documentacao oficial do Laravel consultada para transacoes, seeders e testes de banco.
- Taxonomia minima implementada com defaults financeiros (`dizimos`, `ofertas`, `despesas-operacionais`, `acao-social`) e de pessoas (`membros`, `visitantes`, `obreiros`), sempre vinculados por `church_id`.
- `CreateInitialChurchSetupService` passou a orquestrar a provisao inicial dentro da mesma `DB::transaction()`, usando services dedicados em `Finance` e `People`.
- As categorias financeiras e de pessoas agora aplicam escopo automatico por `church_id` quando ha contexto autenticado, mantendo o provisionamento explicitamente fora desse escopo.
- `financial_categories.kind` passou a ter `CHECK constraint` em migration separada, sem enum ou validacao adicional em aplicacao.
- O controller do onboarding agora responde com mensagem funcional simples quando uma falha inesperada invalida o bootstrap e exige rollback completo.
- Validacoes executadas com `php artisan test` e `./vendor/bin/pint --test`.
- Revisao senior corrigiu o reprovisionamento para nao sobrescrever customizacoes existentes e continuar preenchendo apenas categorias ausentes.
- Revisao senior endureceu o escopo das categorias para fail-closed sem `authenticated_session` e adicionou endpoint autenticado para consulta real dos defaults provisionados.
- Code review posterior corrigiu a idempotencia do bootstrap ponta a ponta, permitindo reprocessar o onboarding inicial sem criar igreja, usuario ou vinculo duplicados.
- Code review posterior distinguiu categorias default de categorias customizadas com `is_default`, evitando que o endpoint de defaults retorne categorias extras do tenant.
- Code review posterior adicionou a rota BFF `GET /api/categories/defaults` no `church-erp-web` e cobertura de smoke test para manter a boundary correta entre browser e Laravel.
- Code review posterior substituiu `insertOrIgnore()` por `firstOrCreate()` nos provisionadores para falhar de forma explicita e preservar o rollback transacional quando houver dado default invalido.

### Completion Notes List

- Implementadas as entidades `FinancialCategory` e `PersonCategory` com indices unicos por `church_id` e `slug` para garantir idempotencia por tenant.
- Adicionados os services `ProvisionInitialFinancialCategoriesService` e `ProvisionInitialPersonCategoriesService` com insercao idempotente baseada em indices unicos para reprovisionamento seguro sem duplicatas.
- Estendido o onboarding inicial para provisionar categorias dentro da transacao ja existente e retornar erro funcional claro quando a provisao falha.
- Cobertura adicionada para criacao inicial, isolamento por tenant, idempotencia e rollback transacional completo, incluindo falha no provisionamento financeiro.
- Suite completa do backend aprovada com 16 testes e 59 assertions; estilo validado com Pint.
- Revisao senior substituiu o reprovisionamento por criacao condicional sem sobrescrever customizacoes, preservando renomeacoes futuras e recompondo apenas defaults ausentes.
- Adicionado o endpoint autenticado `GET /api/v1/categories/defaults` com resposta tenant-scoped para permitir que fluxos reais consultem os defaults.
- Cobertura ampliada para validar consulta autenticada dos defaults, comportamento fail-closed sem sessao e preservacao de customizacoes em reprovisionamento.
- O bootstrap inicial agora pode ser reexecutado com o mesmo payload sem gerar duplicatas de igreja, administradora, vinculo ou categorias.
- As tabelas de categorias agora marcam defaults com `is_default`, e a listagem de defaults ignora categorias customizadas do tenant.
- O `church-erp-web` agora expoe `GET /api/categories/defaults` via BFF, reutilizando o cookie de sessao e mantendo o browser fora do Laravel autenticado.
- Validacoes finais executadas com `php artisan test` direcionado no backend, `npm test`, `npm run lint` e `npm run typecheck` no frontend.

### File List

- _bmad-output/implementation-artifacts/1-5-configurar-categorias-minimas-iniciais.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- church-erp-api/app/Domain/Finance/Models/FinancialCategory.php
- church-erp-api/app/Domain/Finance/Services/ProvisionInitialFinancialCategoriesService.php
- church-erp-api/app/Domain/Identity/Models/Concerns/BelongsToAuthenticatedChurch.php
- church-erp-api/app/Domain/Identity/Services/CreateInitialChurchSetupService.php
- church-erp-api/app/Domain/Identity/Services/ListInitialCategoryDefaultsService.php
- church-erp-api/app/Domain/People/Models/PersonCategory.php
- church-erp-api/app/Domain/People/Services/ProvisionInitialPersonCategoriesService.php
- church-erp-api/app/Http/Controllers/Api/V1/InitialCategoryDefaultsController.php
- church-erp-api/app/Http/Controllers/Api/V1/InitialChurchSetupController.php
- church-erp-api/app/Http/Requests/StoreInitialChurchSetupRequest.php
- church-erp-api/app/Http/Resources/InitialCategoryDefaultsResource.php
- church-erp-api/database/migrations/2026_05_04_000001_create_financial_categories_table.php
- church-erp-api/database/migrations/2026_05_04_000002_create_person_categories_table.php
- church-erp-api/database/migrations/2026_05_04_000003_add_kind_check_constraint_to_financial_categories_table.php
- church-erp-api/routes/api.php
- church-erp-api/tests/Feature/Identity/InitialCategoryDefaultsTest.php
- church-erp-api/tests/Feature/Identity/InitialChurchSetupTest.php
- church-erp-api/tests/Unit/Finance/ProvisionInitialFinancialCategoriesServiceTest.php
- church-erp-api/tests/Unit/Identity/CreateInitialChurchSetupServiceTest.php
- church-erp-api/tests/Unit/People/ProvisionInitialPersonCategoriesServiceTest.php
- church-erp-web/src/app/api/categories/defaults/route.ts
- church-erp-web/src/features/categories/defaults.ts
- church-erp-web/tests/bff-smoke.test.mjs

## Senior Developer Review (AI)

### Reviewer

Wesley Silva

### Date

2026-05-05

### Outcome

Approved after fixes.

### Review Notes

- Corrigido o reprovisionamento das categorias para evitar sobrescrita silenciosa de nomes customizados em novas execucoes do bootstrap.
- Adicionado caminho autenticado de leitura dos defaults provisionados para cobrir o comportamento exigido pelo AC 2 em fluxo real de aplicacao.
- Ajustado o escopo automatico das categorias para fail-closed quando nao existe `authenticated_session`, reduzindo risco de leitura cross-tenant fora do middleware autenticado.
- Atualizada a suite de testes para cobrir consulta autenticada, ausencia de sessao, recomposicao de defaults ausentes e preservacao de customizacoes.
- Ajustado o onboarding inicial para aceitar reprocessamento idempotente do mesmo payload sem bloquear por validacao precoce de email duplicado.
- Separada a nocao de categoria default de categoria customizada com `is_default`, corrigindo a semantica do endpoint de defaults.
- Substituido `insertOrIgnore()` por criacao condicional explicita para nao mascarar falhas de provisionamento e manter o rollback atomico.
- Adicionada rota BFF `GET /api/categories/defaults` e smoke test correspondente para manter o consumo autenticado no `church-erp-web`.

## Change Log

- 2026-05-04: Provisionadas categorias minimas financeiras e de pessoas no bootstrap inicial com `upsert()` tenant-scoped, `CHECK constraint` em migration separada para `kind`, escopo automatico por `church_id` e cobertura de testes para criacao, isolamento, idempotencia e falha transacional.
- 2026-05-05: Revisao senior corrigiu o reprovisionamento para preservar customizacoes, endureceu o escopo para fail-closed sem sessao autenticada e adicionou endpoint autenticado para consulta tenant-scoped dos defaults.
- 2026-05-05: Follow-up do code review corrigiu a idempotencia ponta a ponta do bootstrap, marcou categorias default com `is_default`, adicionou rota BFF para consulta de defaults e removeu o uso de `insertOrIgnore()` para preservar rollback atomico.
