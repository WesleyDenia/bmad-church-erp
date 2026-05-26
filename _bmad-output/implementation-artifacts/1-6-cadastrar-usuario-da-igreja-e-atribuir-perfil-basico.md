# Story 1.6: Cadastrar usuario da igreja e atribuir perfil basico

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a administradora da igreja,
I want cadastrar usuarios da minha igreja e definir seu perfil basico de acesso,
so that cada area operacional possa ser usada pela pessoa certa desde o inicio.

## Acceptance Criteria

1. Dado que a administradora autenticada possui acesso ao contexto da sua igreja, quando informa os dados minimos de um novo usuario e seleciona um perfil basico valido, entao o sistema cria o usuario e o vinculo com o tenant correto, registra o perfil atribuido no contexto da igreja e apresenta confirmacao clara de sucesso.
2. Dado que o email informado ja pertence a um usuario existente no mesmo tenant, quando a administradora tenta concluir o cadastro, entao o sistema impede duplicidade operacional e explica de forma compreensivel que aquele usuario ja esta associado a igreja.
3. Dado que o email informado pertence a um usuario existente em outro tenant, quando a administradora conclui a acao, entao o sistema bloqueia o cadastro nesta story com mensagem funcional clara informando que o reaproveitamento cross-tenant ainda nao esta disponivel no MVP e nao gera side effects em `users` ou `church_user`.
4. Dado que algum campo obrigatorio nao foi preenchido ou o perfil selecionado e invalido para o MVP, quando a administradora tenta salvar, entao o sistema bloqueia a conclusao e informa quais ajustes precisam ser feitos em linguagem simples.
5. Dado que um usuario foi criado com perfil de tesoureiro, secretaria ou lideranca, quando ele autentica no sistema, entao o contexto retornado pela sessao reflete o perfil atribuido para aquela igreja e, nas areas operacionais ja implementadas para esse perfil no MVP, o acesso passa a respeitar esse papel desde o primeiro acesso.

## Tasks / Subtasks

- [x] Implementar o fluxo backend de cadastro administrativo de usuario da igreja, reaproveitando `users` e `church_user` como fonte de verdade e mantendo Laravel como autoridade final (AC: 1, 2, 3, 4, 5)
  - [x] Criar um entrypoint versionado `POST /api/v1/church-users` em `church-erp-api/app/Http/Controllers/Api/V1`, com `FormRequest` dedicado, response em `JsonResource` e payload `snake_case`.
  - [x] Centralizar a orquestracao em um service de `app/Domain/Identity/Services`, por exemplo `CreateChurchUserService`, sem mover regra para controller.
  - [x] Reutilizar `App\Models\User`, `App\Domain\Identity\Models\ChurchUser`, a unique key existente `church_user(church_id, user_id)` e os campos `role` / `status`, sem criar tabela nova de memberships, RBAC ou convites.
  - [x] Limitar os perfis validos desta story ao conjunto minimo do MVP para usuarios operacionais criados pela administradora: `treasurer`, `secretary` e `leadership`. Nao ampliar para governanca avancada nem criar matriz dinamica de permissoes.
  - [x] Garantir `status = active` no cadastro inicial do vinculo. Nao introduzir exclusao fisica, soft delete custom ou fluxo de desativacao nesta story.

- [x] Endurecer autorizacao administrativa do fluxo sem depender apenas da area `secretaria` generica (AC: 1, 2, 4)
  - [x] Adicionar uma regra explicita de backend para gestao de usuarios da igreja, preferencialmente via `Policy` ou `Gate` dedicado, exigindo role `administrator` no `church_user` do tenant atual.
  - [x] Nao considerar `AreaGuard` ou `access-backoffice-area` suficientes para este fluxo por si so, porque hoje `secretary` tambem acessa a area `secretaria`.
  - [x] Preservar o padrao atual de sessao interna via `resolve.internal.session`, `church_id` ativo, mensagens funcionais simples e `403` quando a administradora nao estiver autorizada.

- [x] Implementar o fluxo BFF e a tela operacional de cadastro usando a estrutura existente do Next.js App Router (AC: 1, 2, 4)
  - [x] Criar o route handler `church-erp-web/src/app/api/admin/users/route.ts` como unico ponto de entrada do browser para este caso de uso, usando `callLaravel(...)` e o cookie `church-erp-bff-session`.
  - [x] Materializar a area de usuarios do sistema em uma rota administrativa exclusiva, preferencialmente `church-erp-web/src/app/admin/users/page.tsx`, sem reaproveitar a area `secretaria`, pois `secretary` deve gerir membros da igreja, nao usuarios do sistema.
  - [x] Criar uma composicao operacional dedicada, por exemplo `church-erp-web/src/components/operational/church-user-create-form.tsx`, reutilizando `Button`, `Input`, `Label` e `Select` em `src/components/ui`.
  - [x] Proteger `/admin/users` no frontend com guard server-side coerente com o projeto, aceitando apenas `administrator` e tratando acesso direto por URL de `secretary` ou outro perfil como `denied`, sem transformar React em autoridade final de autorizacao.
  - [x] Expor navegacao ou CTA para `/admin/users` apenas quando o contexto autenticado for de administradora, sem acoplar esse fluxo a `src/app/secretaria/page.tsx`.
  - [x] Manter loading, erro, sucesso e acesso negado com linguagem simples e coerente com os fluxos ja entregues em login, onboarding e access denied.

- [x] Cobrir o comportamento com testes de backend, BFF e regressao de autenticacao por perfil (AC: 1, 2, 3, 4, 5)
  - [x] Adicionar Feature tests no Laravel para: cadastro bem-sucedido de novo usuario, bloqueio de duplicidade no mesmo tenant, role invalido, `403` para nao-administradora e contrato de erro simples.
  - [x] Adicionar teste do service para garantir que falha ao criar o usuario ou o vinculo nao deixa `users` ou `church_user` em estado parcial.
  - [x] Validar explicitamente o objetivo operacional desta story: apos cadastrar um usuario `treasurer`, autenticar com o fluxo existente e confirmar acesso permitido a `/api/v1/backoffice/access/treasury` ou a um endpoint financeiro ja protegido.
  - [x] Validar para `secretary` e `leadership` o contrato minimo do AC 5 que ja cabe no estado atual do produto: autenticacao bem-sucedida e propagacao correta de `data.role` / `data.roles` na sessao, sem exigir smoke funcional de areas ainda nao entregues no Epic 2.
  - [x] Atualizar os testes do web para proteger a boundary BFF, a existencia da rota `/admin/users`, a presenca do route handler `POST /api/admin/users`, a protecao de acesso exclusivo para `administrator` e a ausencia de chamada autenticada direta do browser ao Laravel.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story fecha a lacuna operacional aberta pelo change proposal de 2026-05-25: hoje o sistema autentica e aplica perfis, mas nao oferece um caminho de produto para criar um usuario real de tesouraria dentro da igreja.
- O objetivo principal e destravar a validacao funcional do Epic 2 com um usuario de tesouraria real, criado por uma administradora autenticada no tenant correto.
- O escopo deliberadamente permanece minimo: cadastrar usuario, vincular ao `church_id` atual e atribuir um perfil basico do MVP.
- A story nao tenta resolver governanca avancada, convite por email, reset de senha, troca de igreja ativa, administracao completa de usuarios ou exclusao fisica.

### Guardrails de implementacao obrigatorios

- Laravel continua como fonte de verdade para validacao, autorizacao, tenancy e decisao final sobre bloqueio do cadastro.
- A modelagem obrigatoria continua sendo `users` + `church_user` com `church_id`, `user_id`, `role`, `status` e timestamps. Nao criar tabela nova de perfis, permissoes ou memberships.
- O browser deve continuar chamando apenas o `church-erp-web`; qualquer POST ou GET autenticado relacionado a usuarios da igreja precisa passar pelo BFF em `src/app/api`.
- Contratos HTTP de request e response devem permanecer em `snake_case`.
- `status` do vinculo nasce como `active` nesta story. Fluxos de ativacao/desativacao ficam para a Story 1.7.
- Esta story deve preparar uma area administrativa de usuarios do sistema reutilizavel pela 1.7, nao um formulario descartavel sem ponto de evolucao.

### Abordagens proibidas

- Nao criar RBAC avancado, ACL, tabela de permissoes, permission slugs, scopes dinamicos ou subsistema novo de autorizacao.
- Nao permitir que o browser chame endpoints autenticados do Laravel diretamente para cadastrar usuario.
- Nao sobrescrever `users.password` ou `users.name` de uma conta global existente so porque uma administradora informou o mesmo email em outro tenant.
- Nao usar apenas o acesso a `secretaria` como autorizacao suficiente para gestao de usuarios da igreja.
- Nao encaixar este fluxo em `/secretaria` ou em qualquer area voltada ao cadastro de membros; usuarios do sistema pertencem a uma area administrativa exclusiva.
- Nao introduzir exclusao fisica de usuario, remoção de membership por delete destrutivo ou fluxo de desativacao nesta story.
- Nao ampliar o escopo para convites por email, email verification, switch de igreja ou multitenancy completo de login se isso nao for necessario para cumprir os ACs do MVP.

### Arquivos provaveis a alterar ou criar

- Backend provavel:
  - `church-erp-api/app/Http/Controllers/Api/V1/StoreChurchUserController.php`
  - `church-erp-api/app/Http/Requests/StoreChurchUserRequest.php`
  - `church-erp-api/app/Http/Resources/ChurchUserResource.php`
  - `church-erp-api/app/Domain/Identity/Services/CreateChurchUserService.php`
  - `church-erp-api/app/Policies/ChurchUserPolicy.php` ou regra equivalente registrada em `church-erp-api/app/Providers/AppServiceProvider.php`
  - `church-erp-api/routes/api.php`
  - `church-erp-api/tests/Feature/Identity/StoreChurchUserTest.php`
  - `church-erp-api/tests/Unit/Identity/CreateChurchUserServiceTest.php`
  - possivelmente `church-erp-api/tests/Feature/Identity/AuthSessionTest.php`
- Frontend/BFF provavel:
  - `church-erp-web/src/app/api/admin/users/route.ts`
  - `church-erp-web/src/app/admin/users/page.tsx`
  - `church-erp-web/src/components/operational/church-user-create-form.tsx`
  - `church-erp-web/src/features/church-users/`
  - `church-erp-web/src/features/app-shell/navigation-policy.js`
  - `church-erp-web/src/hooks/use-session-context.ts` apenas se algum helper adicional de role for realmente necessario
  - `church-erp-web/src/proxy.ts`
  - `church-erp-web/tests/bff-smoke.test.mjs`

### Estados obrigatorios da UI ou do fluxo

- `loading`: validacao do contexto autenticado e carregamento inicial da area administrativa exclusiva.
- `ready`: formulario pronto para cadastro com campos minimos e select de perfil.
- `validation_error`: mensagens por campo e resumo funcional simples, sem texto tecnico.
- `duplicate_same_tenant`: feedback claro de que o email ja esta associado a esta igreja.
- `success_created`: confirmacao clara de que o usuario foi criado e vinculado ao tenant.
- `cross_tenant_blocked`: feedback claro de que um email ja existente em outro tenant nao pode ser reaproveitado nesta story.
- `denied`: acesso negado para `secretary` ou outro perfil nao administrador que alcance a rota administrativa direta.
- `server_error`: falha operacional genrica sem vazar detalhes internos.

### Contrato funcional minimo recomendado

- Request BFF/API:
  - `name`
  - `email`
  - `role`
  - `password`
  - `password_confirmation`
- Success response sugerido:
  - `data.user.id`
  - `data.user.name`
  - `data.user.email`
  - `data.membership.church_id`
  - `data.membership.role`
  - `data.membership.status`
  - `data.action` com valor fixo `created`
  - `data.message`
- Error response:
  - `message` funcional simples
  - `errors` por campo quando houver `422`

### Requisitos tecnicos obrigatorios

- Backend alvo: Laravel 12 com PHP 8.3 e MySQL 8.4 como baseline do projeto.
- `App\Models\User` ja possui cast `password => hashed`; reutilize esse comportamento em vez de espalhar hashing manual em controller.
- O `church_user` ja tem unique key em `church_id + user_id`; ela deve continuar sendo a protecao principal contra duplicidade de membership no mesmo tenant.
- `FormRequest` deve concentrar validacao e mensagens de usuario. O controller deve continuar fino e apenas delegar ao service.
- A regra de perfil valido para esta story deve ser explicita no backend, nao apenas refletida em um `select` do frontend.
- Se houver multiplas escritas relacionadas no cadastro, encapsular em transacao explicita para nao deixar `users` criado sem `church_user`, ou vice-versa.

### Compliance de arquitetura

- Backend:
  - manter `app/Http/Controllers/Api/V1` como entrypoint HTTP versionado;
  - manter logica em `app/Domain/Identity/Services`;
  - usar `JsonResource` para sucesso e JSON simples para `401`, `403`, `422` e `500`;
  - considerar `church_id` em toda verificacao sensivel.
- Frontend:
  - manter route handlers em `src/app/api`;
  - usar `callLaravel(...)` para trafego autenticado BFF -> Laravel;
  - manter a page administrativa exclusiva em `src/app/admin`, com composicao em `src/components/operational` e tipos/helpers em `src/features/church-users`;
  - tratar `/admin/**` como boundary propria de administracao no frontend, sem depender semanticamente da area `secretaria`;
  - nao colocar regra de autorizacao definitiva em React.
- UX:
  - manter linguagem pastoral-operacional e orientada a tarefa;
  - evitar reaproveitar a area de secretaria para um caso de uso que pertence a administracao do sistema;
  - preparar um ponto de continuidade natural para a Story 1.7.

### Requisitos de teste

- Backend obrigatorio:
  - `201` para cadastro novo com `church_user.role` correto e `status = active`;
  - `422` para email ja vinculado ao mesmo tenant;
  - `422` para email pertencente a outro tenant, com mensagem funcional clara e sem side effects;
  - `422` para role fora do allowlist do MVP;
  - `403` para usuaria autenticada sem role `administrator`;
  - rollback completo quando uma etapa de persistencia falhar;
  - validar explicitamente que o bloqueio cross-tenant nao altera password nem dados globais de uma conta existente.
- Regressao funcional obrigatoria:
  - apos cadastrar um `treasurer`, autenticar com o fluxo existente e verificar `data.role = treasurer` em `/api/v1/auth/login` ou `/api/v1/auth/me`;
  - validar acesso permitido do novo usuario a `treasury` e bloqueio coerente para area nao correspondente;
  - para `secretary` e `leadership`, validar nesta story apenas autenticacao e propagacao correta do papel na sessao, porque suas areas operacionais ainda nao foram entregues no Epic 2.
- Frontend/BFF obrigatorio:
  - confirmar que a submissao do formulario vai para `/api/admin/users`, nao para `apiBaseUrl` do Laravel no browser;
  - confirmar existencia da page administrativa exclusiva `/admin/users`, seus componentes/arquivos esperados e o bloqueio de acesso para perfis nao administradores;
  - manter `npm test`, `npm run lint`, `npm run typecheck` e `npm run build` no `church-erp-web`.
- Backend validation commands:
  - `php artisan test`
  - `./vendor/bin/pint --test`

### Licoes de stories ou reviews anteriores

- As stories 1.3, 1.4 e 1.5 mostraram que tenancy, sessao e BFF precisam ser tratados como boundaries reais, nao apenas como convencoes de naming.
- O projeto ja sofreu com risco de acoplamento indevido entre stories; por isso, a 1.6 deve estender estruturas existentes em `Identity`, `auth/me`, `proxy.ts` e navigation policy, sem criar fluxo paralelo descartavel.
- Review recente reforcou que a autorizacao real precisa continuar no backend mesmo quando a UI se adapta por role. Aqui isso e especialmente importante porque `administrator` e `secretary` compartilham a area `secretaria`.
- A Story 1.5 reforcou que idempotencia e rollback precisam ser reais. Se o cadastro desta story tocar `users` e `church_user`, a escrita deve ser atomica e validada com estado de banco, nao apenas resposta HTTP.

### Ponto critico de compatibilidade do codigo atual

- Hoje `ResolveActiveChurchContextService` permite login apenas quando o usuario possui exatamente um vinculo ativo em `church_user`.
- Por causa dessa restricao, o reaproveitamento cross-tenant fica explicitamente fora do escopo desta story.
- O comportamento minimo seguro e obrigatorio nesta entrega passa a ser:
  - suportar novo usuario + novo vinculo normalmente;
  - bloquear duplicidade no mesmo tenant;
  - negar o reaproveitamento cross-tenant com mensagem clara e sem side effects.
- Nao e aceitavel implementar link cross-tenant nesta story e deixar o usuario impossibilitado de autenticar depois por ambiguidade nao tratada.

### Project Structure Notes

- `church-erp-api/app/Domain/Identity/Services/AuthenticateUserSessionService.php` e `ResolveActiveChurchContextService.php` ja definem o comportamento de login e contexto ativo. Qualquer escolha de reuso precisa ser compativel com essa fundacao.
- `church-erp-api/app/Domain/Identity/Services/ResolveBackofficeAreaAccessService.php` hoje mapeia acessos por area, nao autorizacao granular de gestao de usuarios.
- A area `secretaria` continua reservada ao fluxo operacional de membros e cadastros da igreja; esta story nao deve acoplar usuarios do sistema a essa navegacao.
- `church-erp-web/src/features/app-shell/navigation-policy.js` ja reconhece `administrator`, `secretary`, `treasurer` e `leadership`; use esse contrato como referencia visual, mas mantenha a decisao final de create user no backend.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 1, Story 1.6 e Story 1.7, inclusive ACs e restricoes de frontend.
- `_bmad-output/planning-artifacts/prd.md` - NFR-5, NFR-6 e NFR-7 sobre seguranca, confiabilidade operacional e primeiro valor com configuracao minima.
- `_bmad-output/planning-artifacts/architecture.md` - ADR de BFF com JWT interno, modelo recomendado `church_user`, authorization strategy e active church switching futuro.
- `_bmad-output/planning-artifacts/mvp-scope.md` - inclusao explicita de gestao basica de usuarios da igreja com atribuicao de perfil e ativacao/desativacao.
- `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-08.md` - cobertura de FR1 e FR2 agora dependente das stories 1.6 e 1.7.
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-25.md` - motivacao da lacuna funcional e objetivo de destravar validacao do Epic 2 com usuario real de tesouraria.
- `_bmad-output/project-context.md` - regras obrigatorias de `church_id`, BFF, `snake_case`, layering e proibicao de subsistema paralelo de permissoes.
- `_bmad-output/implementation-artifacts/1-3-autenticar-usuario-via-bff-e-aplicar-contexto-da-igreja.md` - learnings sobre auth BFF, `/auth/me`, cookie `HttpOnly` e guard server-side.
- `_bmad-output/implementation-artifacts/1-4-controlar-permissao-basica-por-perfil-e-tenant.md` - learnings sobre matriz de acesso, `roles` e backend como fonte de verdade.
- `_bmad-output/implementation-artifacts/1-5-configurar-categorias-minimas-iniciais.md` - learnings sobre transacao, rollback, idempotencia e referencia de estrutura da story.
- `church-erp-api/app/Domain/Identity/Models/ChurchUser.php` - modelagem atual do vinculo com `role` e `status`.
- `church-erp-api/database/migrations/2026_04_21_000002_create_church_user_table.php` - unique constraint e indices por `church_id`, `role` e `status`.
- `church-erp-api/app/Domain/Identity/Services/ResolveActiveChurchContextService.php` - limitacao atual de um unico vinculo ativo por login.
- `church-erp-api/app/Domain/Identity/Services/ResolveAuthenticatedSessionService.php` - revalidacao da membership ativa via `church_id`.
- `church-erp-api/app/Providers/AppServiceProvider.php` - gates/policies hoje registrados.
- `church-erp-web/src/lib/api/client.ts` - boundary BFF -> Laravel com `cache: "no-store"`.
- `church-erp-web/src/app/api/auth/login/route.ts` e `church-erp-web/src/app/api/auth/me/route.ts` - padrao atual de route handler autenticado.
- `church-erp-web/src/proxy.ts` - protecao server-side das areas operacionais.
- `church-erp-web/src/features/app-shell/navigation-policy.js` - matriz atual de areas por role.
- `church-erp-web/src/components/ui/` - primitives disponiveis para formulario e feedback.
- `https://laravel.com/docs/12.x/validation` - validacao JSON e mensagens customizadas com `FormRequest`.
- `https://laravel.com/docs/12.x/authorization` - `Gate::authorize`, policies e propagacao de `403` com mensagem.
- `https://laravel.com/docs/12.x/database` - `DB::transaction(...)` e rollback em falha.
- `https://nextjs.org/docs/app/getting-started/route-handlers-and-middleware` - convencao atual de `route.ts` no App Router.

### Checklist pre-review

- Existe apenas um fluxo oficial do browser para cadastro: `POST /api/admin/users` no BFF.
- O backend reutiliza `users` e `church_user`; nenhuma tabela nova de permissao ou membership foi criada.
- O allowlist de roles desta story esta explicito e restrito ao MVP.
- `administrator` e a unica role autorizada a criar usuarios da igreja.
- Nenhuma tela ou rota de `secretaria` foi usada como entrypoint para usuarios do sistema.
- Duplicidade no mesmo tenant retorna `422` com mensagem clara.
- Email pertencente a outro tenant retorna bloqueio funcional claro sem side effects em vez de reaproveitamento implicito.
- A story cria um usuario real de `treasurer` que consegue autenticar e acessar a area financeira correspondente.
- Nao existe exclusao fisica nem fluxo de desativacao nesta entrega.
- `php artisan test`, `./vendor/bin/pint --test`, `npm test`, `npm run lint`, `npm run typecheck` e `npm run build` passaram.

### Git intelligence

- Os commits recentes continuam organizados por story e por escopo vertical, sem refactor amplo. A 1.6 deve seguir essa mesma disciplina.
- O trabalho recente reforcou `Identity` como dominio central para tenancy, sessao e acesso; esta entrega deve expandir esse dominio, nao desloca-lo.
- O historico recente do projeto mostra que os reviews mais custosos aconteceram quando boundary BFF, autorizacao ou tenancy ficaram implicitos demais. Nesta story, eles precisam aparecer como instrucoes explicitas.

### Latest tech information

- A documentacao atual do Laravel 12 continua orientando `FormRequest` e `ValidationException` como caminho padrao para respostas `422` JSON consistentes. Isso reforca a necessidade de nao fazer validacao de negocio sensivel so em React. Fonte oficial: `https://laravel.com/docs/12.x/validation`.
- O Laravel 12 continua suportando `Gate::authorize(...)` e policies com mensagens propagadas para `403`, o que encaixa com o requisito desta story de diferenciar acesso negado administrativo de erro tecnico. Fonte oficial: `https://laravel.com/docs/12.x/authorization`.
- A documentacao atual do Laravel 12 continua recomendando `DB::transaction(...)` para operacoes multietapa que nao podem deixar persistencia parcial, exatamente o caso de `users` + `church_user`. Fonte oficial: `https://laravel.com/docs/12.x/database`.
- A documentacao atual do Next.js App Router continua posicionando `route.ts` em `app/**` como o lugar correto para Route Handlers do BFF, mantendo o browser fora do backend Laravel autenticado. Fonte oficial: `https://nextjs.org/docs/app/getting-started/route-handlers-and-middleware`.

### Project context reference

- Esta story deve ser implementada em conformidade com `_bmad-output/project-context.md`, especialmente nas regras de:
  - browser consumir apenas o `church-erp-web`;
  - contratos HTTP em `snake_case`;
  - backend Laravel como fonte de verdade para tenant, validacao e autorizacao;
  - separacao entre `src/components/ui`, `src/components/design-system` e `src/components/operational`;
  - proibicao de criar subsistema novo de roles/permissoes sem necessidade da story.

### Story completion status

- Status da story neste momento: `done`
- Nota de conclusao: implementacao revisada com correcoes na area administrativa web. O risco concorrente remanescente no cadastro administrativo foi aceito explicitamente como tradeoff adequado para o MVP.
- Proximo passo esperado: seguir para a Story 1.7 mantendo esta mesma area administrativa como ponto de evolucao natural.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Implementar primeiro o endpoint Laravel e o service de dominio, porque os contratos e guardrails de tenancy/autorizacao precisam nascer no backend.
- Fechar em seguida o route handler BFF e a page administrativa em `/admin/users`, preservando a boundary do browser.
- Validar o unblock real do Epic 2 criando um tesoureiro, autenticando com o fluxo existente e confirmando acesso coerente a `treasury`.

### Debug Log References

- Story gerada a partir do backlog `1-6-cadastrar-usuario-da-igreja-e-atribuir-perfil-basico` em `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- O escopo foi ancorado em `epics.md`, `prd.md`, `architecture.md`, `mvp-scope.md`, `implementation-readiness-report-2026-04-08.md`, `sprint-change-proposal-2026-05-25.md`, `project-context.md` e no estado real do codigo em `church-erp-api` e `church-erp-web`.
- A principal restricao tecnica identificada para esta story e a resolucao atual de igreja ativa, que hoje aceita apenas um vinculo `church_user` ativo por usuario no login.
- A principal restricao de UX/autorizacao identificada e que a area `secretaria` hoje e compartilhada entre `administrator` e `secretary`, exigindo autorizacao administrativa dedicada para gestao de usuarios.
- Red phase concluida com novos testes falhando em `StoreChurchUserTest`, `CreateChurchUserServiceTest` e `church-erp-web/tests/bff-smoke.test.mjs` antes da implementacao do endpoint, do service e da superficie web administrativa.
- Validacoes executadas nesta entrega: `php artisan test`, `./vendor/bin/pint --test`, `npm test`, `npm run lint`, `npm run typecheck` e `API_BASE_URL=http://api.test INTERNAL_API_AUDIENCE=church-erp-api INTERNAL_API_ISSUER=church-erp-web npm run build`.
- Review AI de 2026-05-26: corrigidos loading da rota administrativa, remocao da dupla validacao de sessao na page `/admin/users`, alinhamento tipado de `AppArea` para a area administrativa e separacao funcional entre `401` e `403` no formulario web.
- Risco conhecido mantido por decisao explicita durante a revisao: concorrencia no cadastro administrativo ainda pode devolver `500` generico em vez de `422` funcional quando duas requisicoes disputarem o mesmo email ao mesmo tempo.

### Completion Notes List

- Implementado `POST /api/v1/church-users` com `StoreChurchUserRequest`, `CreateChurchUserService`, `ChurchUserResource` e regra dedicada `manage-church-users` protegida por `ChurchUserPolicy`.
- O service reutiliza `users` + `church_user`, cria memberships com `status = active`, bloqueia duplicidade no mesmo tenant e recusa reaproveitamento cross-tenant sem side effects.
- Implementado o BFF `POST /api/admin/users`, a page server-side `src/app/admin/users/page.tsx` e o formulario operacional `ChurchUserCreateForm`, mantendo o browser restrito ao `church-erp-web`.
- A navegacao e o `proxy.ts` passaram a reconhecer `/admin/users` como rota protegida exclusiva de `administrator`.
- A regressao funcional do AC 5 foi coberta para `treasurer`, `secretary` e `leadership`, incluindo autenticacao e acesso financeiro liberado para o usuario de tesouraria criado pela administradora.
- A page administrativa passou a confiar no contexto ja validado pelo proxy e no JWT interno do BFF para evitar uma segunda chamada de sessao ao Laravel no carregamento da rota.
- Foi adicionado loading explicito para `/admin/users`, alinhado com o estado `loading` exigido pela story.
- O formulario passou a distinguir expiracao de sessao (`401`) de acesso negado por perfil (`403`) na classificacao interna dos estados.

### File List

- `_bmad-output/implementation-artifacts/1-6-cadastrar-usuario-da-igreja-e-atribuir-perfil-basico.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `church-erp-api/app/Domain/Identity/Services/CreateChurchUserService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/StoreChurchUserController.php`
- `church-erp-api/app/Http/Requests/StoreChurchUserRequest.php`
- `church-erp-api/app/Http/Resources/ChurchUserResource.php`
- `church-erp-api/app/Policies/ChurchUserPolicy.php`
- `church-erp-api/app/Providers/AppServiceProvider.php`
- `church-erp-api/routes/api.php`
- `church-erp-api/tests/Feature/Identity/StoreChurchUserTest.php`
- `church-erp-api/tests/Unit/Identity/CreateChurchUserServiceTest.php`
- `church-erp-web/src/app/admin/users/page.tsx`
- `church-erp-web/src/app/admin/users/loading.tsx`
- `church-erp-web/src/app/api/admin/users/route.ts`
- `church-erp-web/src/app/api/auth/login/route.ts`
- `church-erp-web/src/components/operational/church-user-create-form.tsx`
- `church-erp-web/src/features/app-shell/navigation-policy.js`
- `church-erp-web/src/features/auth/session.ts`
- `church-erp-web/src/features/church-users/contracts.ts`
- `church-erp-web/src/proxy.ts`
- `church-erp-web/src/types/navigation.ts`
- `church-erp-web/.env.example`
- `church-erp-web/README.md`
- `church-erp-web/tests/bff-smoke.test.mjs`

## Senior Developer Review (AI)

### Outcome

- Changes applied e story promovida para `done` com um risco concorrente residual explicitamente aceito para o MVP.

### Findings Summary

- Corrigido: ausencia de loading explicito para `/admin/users`.
- Corrigido: dupla validacao de sessao no hot path da page administrativa.
- Corrigido: desalinhamento do tipo `AppArea` com a nova area administrativa.
- Corrigido: classificacao conjunta de `401` e `403` no formulario operacional.
- Risco aceito por decisao do produto: concorrencia no cadastro administrativo ainda pode transformar duplicidade simultanea em `500` generico, mas o cenario foi classificado como improvavel o bastante para nao justificar esforco adicional no MVP.

### Change Log

- 2026-05-26: implementado o cadastro administrativo de usuarios da igreja com autorizacao exclusiva de `administrator`, boundary BFF em `/api/admin/users`, page dedicada em `/admin/users` e cobertura completa de testes backend/web.
- 2026-05-26: review AI aplicou correcoes na area administrativa web, sincronizou a documentacao da story e manteve aberto por decisao explicita o risco concorrente de duplicidade simultanea no cadastro administrativo.
