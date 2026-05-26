# Story 1.7: Listar usuarios da igreja e ajustar perfil ou status

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a administradora da igreja,
I want visualizar os usuarios da minha igreja e ajustar seu perfil ou status de acesso,
so that eu mantenha a operacao alinhada com as responsabilidades reais de cada pessoa.

## Acceptance Criteria

1. Dado que a administradora acessa a area de usuarios da igreja, quando a tela e carregada, entao o sistema lista apenas os usuarios vinculados ao tenant atual e exibe pelo menos nome, email, perfil e status de acesso de cada usuario.
2. Dado que a administradora altera o perfil de um usuario entre os perfis permitidos no MVP, quando confirma a mudanca, entao o sistema persiste o novo perfil no vinculo da igreja e a nova matriz de acesso passa a valer ja na proxima requisicao autenticada do usuario-alvo ao BFF ou ao backend, sem exigir invalidacao em tempo real da aba ja aberta.
3. Dado que a administradora desativa um usuario da igreja, quando confirma a alteracao de status, entao o sistema impede novos logins e faz com que a proxima requisicao autenticada do usuario-alvo no tenant correspondente passe a falhar por sessao invalida ou membership inativo, preservando a rastreabilidade minima definida para o MVP.
4. Dado que a administradora reativa um usuario anteriormente desativado, quando confirma a reativacao, entao o sistema volta a permitir autenticacao e acesso conforme o perfil vigente e mantem o mesmo vinculo com a igreja sem recriacao manual.
5. Dado que a administradora tenta editar um vinculo cujo papel atual e `administrator`, quando confirma uma mudanca de perfil ou status, entao o sistema bloqueia a operacao porque memberships administrativos sao somente leitura nesta story e explica a restricao de maneira compreensivel.
6. Dado que um usuario autenticado perde permissao por troca de perfil ou desativacao, quando faz a proxima requisicao autenticada a uma area que deixou de ser permitida, entao o sistema bloqueia o acesso conforme a matriz atualizada e apresenta mensagem coerente com a politica de permissao do MVP.

## Tasks / Subtasks

- [ ] Expor a listagem administrativa de usuarios do tenant atual no backend e no BFF, reaproveitando a fundacao criada na Story 1.6 e mantendo Laravel como autoridade final (AC: 1, 6)
  - [ ] Adicionar `GET /api/v1/church-users` em `church-erp-api/routes/api.php`, protegido por `resolve.internal.session`, com controller fino em `app/Http/Controllers/Api/V1` e resposta padronizada `200` no shape `{ "data": [...] }` usando resource collection do Laravel.
  - [ ] Criar uma consulta tenant-scoped em `app/Domain/Identity/Services`, por exemplo `ListChurchUsersService`, carregando `church_user` + `users` apenas do `church_id` autenticado e usando `church_user.id` como identificador canonicamente editavel.
  - [ ] Garantir que a listagem inclua memberships `active` e `inactive`, mostrando pelo menos `membership_id`, `user.id`, `user.name`, `user.email`, `membership.role`, `membership.status` e um flag util para a UI como `is_current_user` quando o alvo for a propria sessao administradora.
  - [ ] Expor `GET /api/admin/users` no `church-erp-web` via route handler App Router, usando `callLaravel(...)` e preservando a boundary browser -> BFF -> Laravel.

- [ ] Implementar a manutencao de perfil e status no mesmo vinculo `church_user`, sem delete fisico nem recriacao de membership (AC: 2, 3, 4, 5, 6)
  - [ ] Adicionar `PATCH /api/v1/church-users/{churchUser}` orientado ao `church_user.id`, com `FormRequest` dedicado e service de dominio, por exemplo `UpdateChurchUserMembershipService`.
  - [ ] Restringir as alteracoes de perfil ao allowlist operacional do MVP para memberships geridos pela administradora: `treasurer`, `secretary` e `leadership`. Nao ampliar esta story para criar/promover `administrator`, ACL ou RBAC avancado.
  - [ ] Restringir as alteracoes de status ao conjunto minimo `active` e `inactive`. Nao introduzir `suspended`, soft delete custom, convite pendente ou exclusao fisica.
  - [ ] Tratar o payload de update como parcial: `role` e `status` sao opcionais independentemente, mas a requisicao deve conter pelo menos um dos dois; qualquer campo omitido permanece inalterado.
  - [ ] Atualizar o mesmo registro em `church_user`, preservando `user_id`, `church_id`, `created_at` e `updated_at`, sem apagar e recriar o vinculo para reativacao.
  - [ ] Bloquear toda tentativa de alterar um membership cujo papel atual seja `administrator`. Nesta story, o membership administrativo e somente leitura para evitar perda da administracao minima viavel.
  - [ ] Garantir que o `PATCH` sempre responda `200` com body JSON contendo o estado atualizado do membership; erros de validacao/autorizacao devem usar mensagens operacionais simples.

- [ ] Fazer a area `/admin/users` evoluir de formulario isolado para superficie administrativa completa, com listagem e acoes coerentes com o UX aprovado (AC: 1, 2, 3, 4, 5)
  - [ ] Manter `church-erp-web/src/app/admin/users/page.tsx` como entrypoint server-side da area e carregar a lista administrativa a partir do BFF, sem chamadas autenticadas diretas do browser ao Laravel.
  - [ ] Preservar o formulario de cadastro da Story 1.6 e adicionar uma composicao operacional dedicada para gestao da lista, por exemplo `church-user-management-panel.tsx`, em `src/components/operational` ou `src/features/church-users`.
  - [ ] Expor um route handler para alteracoes administrativas em `church-erp-web/src/app/api/admin/users/[id]/route.ts`, traduzindo `PATCH` do browser para `PATCH /api/v1/church-users/{churchUser}`.
  - [ ] Usar primitives de `src/components/ui` para lista/tabela, badges de status, dialogs de confirmacao, selects de perfil e feedback contextual, verificando primeiro o que ja existe antes de criar novos wrappers.
  - [ ] Exibir memberships cujo papel atual e `administrator` de forma legivel e previsivel, deixando claro que sao itens somente leitura nesta story.
  - [ ] Cobrir os estados obrigatorios da tela: `loading`, `ready`, `empty`, `saving`, `success_updated`, `validation_error`, `denied`, `session_invalid`, `server_error` e bloqueio explicito de membership administrativo somente leitura.

- [ ] Garantir que mudancas de perfil/status tenham efeito nas proximas verificacoes de sessao e acesso, sem hacks paralelos de autorizacao (AC: 2, 3, 4, 6)
  - [ ] Reutilizar `ResolveAuthenticatedSessionService`, `CurrentSessionController`, `proxy.ts` e o endpoint BFF `/api/auth/me`, que ja revalidam o membership em banco a cada checagem relevante.
  - [ ] Fazer da mudanca de `status` para `inactive` o mecanismo oficial para bloquear novo login e fazer a proxima chamada autenticada do usuario-alvo falhar por sessao invalida ou membership inativo, sem depender de limpar cookie remotamente no browser dele.
  - [ ] Validar que mudanca de `role` altera a decisao de `backoffice/access/{area}` e de `/api/auth/me` ja na proxima requisicao autenticada, porque a autorizacao efetiva continua no backend e le o membership atual do banco.
  - [ ] Nao confiar no array `roles` antigo do JWT interno como fonte de verdade para permissao. A story deve reforcar a revalidacao por `auth/me`, middleware e policies existentes.

- [ ] Cobrir a story com testes de backend, BFF e regressao de acesso por perfil/status (AC: 1, 2, 3, 4, 5, 6)
  - [ ] Backend Feature tests para: listar apenas usuarios do tenant atual; listar memberships `active` e `inactive`; atualizar apenas `role`; atualizar apenas `status`; atualizar `role` e `status` juntos; desativar e reativar o mesmo membership; bloquear alteracao de membership com papel atual `administrator`; retornar `403` para nao-administrador; retornar `404` para membership fora do tenant atual.
  - [ ] Backend tests de regressao para: usuario desativado falha em `/api/v1/auth/login`; usuario com role alterada perde acesso a `backoffice/access/treasury` e passa a responder conforme a nova role na proxima request autenticada; usuario reativado volta a autenticar com o mesmo email/senha e o mesmo membership.
  - [ ] Validar rastreabilidade minima da alteracao administrativa definida para esta story: manter o mesmo `church_user`, preservar `created_at`, atualizar `updated_at` e emitir log estruturado backend com `actor_user_id`, `target_membership_id`, `target_user_id`, `church_id` e diff de `role/status`, sem criar tabela nova.
  - [ ] Frontend/BFF tests para confirmar a existencia de `GET /api/admin/users` e `PATCH /api/admin/users/[id]`, o uso de `callLaravel(...)`, a permanencia da pagina `/admin/users` como area exclusiva de administracao e a ausencia de chamadas autenticadas diretas do browser ao Laravel.
  - [ ] Rodar `php artisan test`, `./vendor/bin/pint --test`, `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke` antes de mover a story para review.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story completa a lacuna deixada intencionalmente pela 1.6: o tenant ja consegue cadastrar um usuario operacional, mas ainda nao consegue manter a lista de acessos alinhada com a realidade da igreja.
- O objetivo e transformar `/admin/users` em uma superficie administrativa minima, suficiente para dar visibilidade dos usuarios do tenant e permitir ajustar papel ou ativacao de acesso sem sair do MVP.
- O valor funcional direto desta entrega e destravar UAT real dos perfis operacionais, especialmente o ciclo do Epic 2, sem depender de fixtures manuais ou ajustes em banco.
- O escopo continua enxuto: listar memberships do tenant, editar role basica, ativar/desativar e preservar a administracao minima viavel.
- O papel `administrator` atual fica fora do fluxo de manutencao desta story: memberships administrativos aparecem na lista, mas sao somente leitura.
- Esta story nao tenta resolver exclusao fisica de usuario, promocao generica para `administrator`, convites por email, multi-tenant sharing de contas, reset de senha, troca de igreja ativa ou governanca avancada de permissoes.

### Guardrails de implementacao obrigatorios

- O objeto editavel desta story e o vinculo `church_user`, nao a conta global em `users`. Use `church_user.id` como identificador de manutencao para evitar ambiguidade entre tenants.
- Toda listagem, consulta, policy e update deve considerar explicitamente o `church_id` autenticado. Membership de outra igreja nao pode vazar nem por enumeracao de IDs.
- A area administrativa continua exclusiva do papel `administrator`. `treasurer`, `secretary` e `leadership` nunca devem conseguir listar ou alterar usuarios do sistema.
- A listagem deve incluir o membership administrativo atual para visibilidade, mas qualquer membership cujo papel atual seja `administrator` deve ser tratado como somente leitura nesta story.
- Desativacao e reativacao devem acontecer no mesmo registro `church_user`, usando `status = inactive` e `status = active`. Nao apagar e recriar membership, e nao remover `users`.
- O efeito esperado e sincrono na proxima request autenticada: a story nao exige WebSocket, push invalidation nem refresh forcado de abas abertas.
- A story deve ampliar a superficie existente de `/admin/users`, `POST /api/admin/users` e `contracts.ts`; nao crie uma segunda area administrativa paralela.
- O browser continua chamando apenas o `church-erp-web`. Toda leitura ou escrita autenticada sobre usuarios da igreja precisa atravessar o BFF.

### Abordagens proibidas

- Nao criar tabela nova de roles, ACL, permission slugs, convites, auditoria identitaria completa ou qualquer subsistema paralelo so para cumprir esta story.
- Nao editar usuarios por `users.id` sem revalidar o membership correspondente ao tenant atual.
- Nao hard-delete em `church_user`, nao remover `users` e nao implementar “reativacao” recriando o vinculo com outro ID.
- Nao usar a area `secretaria`, home financeira ou layout global como ponto alternativo de administracao de usuarios. O entrypoint continua sendo `/admin/users`.
- Nao permitir alteracao de membership cujo papel atual seja `administrator`, nem pela UI nem por request forjada.
- Nao assumir que o JWT interno antigo basta para refletir mudanca de permissao. A autorizacao efetiva deve continuar sendo revalidada contra o banco nas proximas checagens.
- Nao ampliar o scope para invite flow, troca de senha, troca de tenant, multiples igrejas por login ou exclusao de administrador sem uma historia propria.

### Arquivos provaveis a alterar ou criar

- Backend provavel:
  - `church-erp-api/routes/api.php`
  - `church-erp-api/app/Http/Controllers/Api/V1/ListChurchUsersController.php`
  - `church-erp-api/app/Http/Controllers/Api/V1/UpdateChurchUserController.php`
  - `church-erp-api/app/Http/Requests/UpdateChurchUserRequest.php`
  - `church-erp-api/app/Http/Resources/ChurchUserCollection.php`
  - `church-erp-api/app/Domain/Identity/Services/ListChurchUsersService.php`
  - `church-erp-api/app/Domain/Identity/Services/UpdateChurchUserMembershipService.php`
  - `church-erp-api/app/Policies/ChurchUserPolicy.php`
  - `church-erp-api/tests/Feature/Identity/ListChurchUsersTest.php`
  - `church-erp-api/tests/Feature/Identity/UpdateChurchUserTest.php`
  - possivelmente `church-erp-api/tests/Feature/Identity/AuthSessionTest.php`
- Frontend/BFF provavel:
  - `church-erp-web/src/app/admin/users/page.tsx`
  - `church-erp-web/src/app/api/admin/users/route.ts`
  - `church-erp-web/src/app/api/admin/users/[id]/route.ts`
  - `church-erp-web/src/components/operational/church-user-create-form.tsx`
  - `church-erp-web/src/components/operational/church-user-management-panel.tsx`
  - `church-erp-web/src/features/church-users/contracts.ts`
  - possivelmente `church-erp-web/src/features/church-users/serializers.ts` ou helper equivalente se a UI precisar normalizar estados locais
  - `church-erp-web/tests/bff-smoke.test.mjs`

### Estados obrigatorios da UI ou do fluxo

- `loading_list`: carregamento inicial da area administrativa e da lista de memberships.
- `ready`: pagina carregada com formulario de cadastro e lista administrativa utilizavel.
- `empty`: tenant sem usuarios operacionais adicionais alem da administradora, com orientacao simples para criar o primeiro acesso.
- `saving_update`: alteracao de perfil ou status em andamento.
- `success_updated`: confirmacao clara de que o perfil ou status foi atualizado.
- `validation_error`: mensagens de negocio claras, inclusive para tentativa de alterar membership administrativo somente leitura.
- `admin_membership_read_only`: bloqueio explicito para tentativa de alterar membership cujo papel atual seja `administrator`.
- `denied`: acesso negado para perfis sem papel administrativo.
- `session_invalid`: sessao expirada ou membership inativo.
- `server_error`: falha generica sem expor detalhes internos.

### Contrato funcional minimo definido

- Response de listagem obrigatorio:
  - `data[]`
  - `data[].membership_id`
  - `data[].user.id`
  - `data[].user.name`
  - `data[].user.email`
  - `data[].membership.role`
  - `data[].membership.status`
  - `data[].is_current_user`
- Request de update obrigatorio:
  - `role?`
  - `status?`
  - pelo menos um dos dois campos deve estar presente
- Success response de update obrigatoria (`200`):
  - `data.membership_id`
  - `data.user.id`
  - `data.membership.role`
  - `data.membership.status`
  - `data.action` com valor `updated`
  - `data.message`
- Error response:
  - `message` funcional simples
  - `errors` por campo quando houver `422`

### Requisitos tecnicos obrigatorios

- Backend alvo continua sendo Laravel 12 em PHP 8.3; frontend alvo continua sendo Next.js 16.2.3 App Router com React 19.2.4 e Tailwind 4, conforme `composer.json`, `package.json` e `project-context.md`.
- `ResolveActiveChurchContextService` e `ResolveAuthenticatedSessionService` hoje aceitam apenas memberships `status = active`; use essa fundacao explicitamente a favor da story. Desativar membership deve bloquear login novo e chamadas autenticadas seguintes do usuario-alvo.
- `ChurchUserPolicy` hoje protege apenas o create via role `administrator`; esta story deve expandir a policy para `viewAny` e `update`, sem espalhar autorizacao manual em controllers.
- O allowlist de roles mutaveis continua restrito ao MVP operacional: `treasurer`, `secretary`, `leadership`. `administrator` permanece fora do fluxo comum de promocao nesta story.
- Se a alteracao exigir mais de uma escrita relevante, encapsular em `DB::transaction(...)`. A rastreabilidade minima desta story significa, de forma objetiva: manter o mesmo row em `church_user`, atualizar `updated_at` e emitir log estruturado backend com diff de `role/status`; nao criar tabela nova de auditoria.
- Nao opportunisticamente atualizar o projeto para Laravel 13 so porque a documentacao 12.x ja indica versao mais nova disponivel; a story deve respeitar a baseline real do repositório.
- Se a UI precisar de overlays de confirmacao, usar `shadcn/ui` na camada `src/components/ui` e manter a composicao de negocio fora das primitives.

### Compliance de arquitetura

- Backend:
  - manter entrypoints versionados em `app/Http/Controllers/Api/V1`;
  - manter orquestracao em `app/Domain/Identity/Services`;
  - usar resource collection para o `GET` de listagem, `JsonResource` ou response JSON estruturada para o `PATCH`, e JSON simples para `401`, `403`, `404`, `422` e `500`;
  - scoping e autorizacao sempre pelo `church_id` autenticado;
  - operar updates sobre `church_user.id`, nunca sobre um membership inferido apenas por email.
- Frontend:
  - manter route handlers em `src/app/api`;
  - usar `callLaravel(...)` como unico caminho BFF -> Laravel;
  - manter `/admin/users` como pagina server-side exclusiva de administracao;
  - preservar o padrao de `proxy.ts` e `/api/auth/me` como fonte de revalidacao de sessao nas rotas protegidas;
  - nao mover a regra de permissao definitiva para React.
- UX:
  - manter linguagem pastoral-operacional, com feedback claro e sem tom corporativo;
  - evitar grid administrativo frio ou SaaS generico; a tela deve continuar parecer uma area operacional simples e confiavel;
  - tornar listagem, badges, confirmacoes e bloqueios compreensiveis para usuarios pouco tecnicos.

### Requisitos de teste

- Backend obrigatorio:
  - `200` para listagem do tenant atual sem vazamento de memberships de outra igreja;
  - `200` para update valido de role/status com body consistente;
  - bloqueio explicito de qualquer tentativa de alterar membership cujo papel atual seja `administrator`;
  - `403` para nao-administradora;
  - `404` para `church_user.id` fora do tenant;
  - usuario `inactive` nao autentica em `/api/v1/auth/login`;
  - usuario com role alterada perde acesso a area antiga e passa a responder conforme a nova matriz em `backoffice/access/{area}` e `/api/auth/me` na proxima request autenticada;
  - reativacao restaura login/acesso sem recriar membership.
- Frontend/BFF obrigatorio:
  - `GET /api/admin/users` usa `callLaravel("/api/v1/church-users", ...)`;
  - `PATCH /api/admin/users/[id]` usa `callLaravel("/api/v1/church-users/{id}", ...)`;
  - a pagina `/admin/users` continua protegida por sessao valida e papel `administrator`;
  - a UI nao tenta chamar `apiBaseUrl` diretamente do browser;
  - a tela trata `401`, `403`, `422` e `500` com mensagens coerentes.
- Commands obrigatorios:
  - `php artisan test`
  - `./vendor/bin/pint --test`
  - `npm test`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build:smoke`

### Licoes de stories ou reviews anteriores

- A Story 1.6 ja abriu a area `/admin/users`, o route handler `POST /api/admin/users` e o service `CreateChurchUserService`. A 1.7 deve estender essa slice existente, nao abrir uma segunda experiencia administrativa.
- A revisao recente da 1.6 reforcou que o boundary BFF precisa continuar explicito e que `401` e `403` devem ser distinguidos na UI. Reaproveite essa mesma disciplina nas alteracoes de role/status.
- O login atual depende de exatamente um membership ativo por usuario em `ResolveActiveChurchContextService`. Isso torna ainda mais importante reativar/desativar o mesmo `church_user` em vez de criar duplicatas ou tentar sharing cross-tenant.
- O proxy do Next.js hoje chama `/api/auth/me` em vez de confiar cegamente na role do cookie. Essa fundacao deve ser preservada, porque ela e justamente o caminho para refletir mudancas de perfil/status nas proximas checagens.
- A primeira versao desta story deixava aberta a leitura sobre “administracao minima viavel”. Para execucao do agente `dev`, a regra final desta revisao passa a ser objetiva: membership com papel atual `administrator` e somente leitura nesta story.
- O historico recente do repositorio mostra implementacoes verticais e story-scoped. Esta entrega deve seguir o mesmo padrao, sem refatorar autenticacao, navegacao ou dominio de Identity alem do necessario para cumprir os ACs.

### Ponto critico de compatibilidade do codigo atual

- O modelo `ChurchUser` ja tem `id` proprio e `status` default `active`; isso favorece updates sobre o vinculo e elimina qualquer justificativa para delete/recreate.
- `CurrentSessionController` e `ResolveInternalSession` retornam `401` quando o membership nao esta mais valido; esse comportamento deve ser preservado e usado para o caso de desativacao.
- O route handler `/api/auth/me` limpa o cookie quando o backend devolve sessao invalida, e `proxy.ts` redireciona para login em rotas protegidas. A story deve se apoiar nisso para o efeito de desativacao, nao duplicar invalidacao no frontend.
- `navigation-policy.js` e `BackofficeAreaPolicy` seguem matriz por role. Mudar `church_user.role` precisa continuar sendo a unica alteracao necessaria para que a matriz refletida na navegacao/proxy/backend mude nas proximas checagens.
- A propagacao esperada nesta story e a seguinte: sem invalidacao em tempo real da aba aberta, mas com efeito obrigatorio na proxima request autenticada que passar por `/api/auth/me`, `resolve.internal.session` ou `backoffice/access/{area}`.

### Project Structure Notes

- `church-erp-api/app/Policies/ChurchUserPolicy.php` hoje conhece apenas a permissao de criar usuarios. Esta story deve consolidar a policy como ponto unico para ver e alterar memberships administrativas do tenant.
- `church-erp-api/app/Domain/Identity/Services/CreateChurchUserService.php` ja assume `users` + `church_user` como modelagem canonical. A nova manutencao deve permanecer nesse mesmo dominio `Identity`.
- `church-erp-web/src/app/admin/users/page.tsx` hoje renderiza apenas `ChurchUserCreateForm`. O ponto natural de evolucao e enriquecer essa mesma pagina com listagem e acoes, sem migrar a administracao para outra rota.
- `church-erp-web/src/features/church-users/contracts.ts` hoje modela apenas create. Este arquivo deve ser expandido para contratos de listagem e update, mantendo `snake_case` nas bordas da API.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 1, Story 1.7 acceptance criteria e constraints de frontend.
- `_bmad-output/planning-artifacts/prd.md` - FR1, FR2, NFR5, NFR6, NFR7 e NFR8 sobre acesso, seguranca, confiabilidade e clareza operacional.
- `_bmad-output/planning-artifacts/mvp-scope.md` - explicita gestao basica de usuarios da igreja com ativacao/desativacao no MVP.
- `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-08.md` - reforca que a operacao administrativa minima precisa incluir ativar/desativar acesso antes dos fluxos dependentes de papel.
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-25.md` - introduz formalmente a Story 1.7, a regra de desativacao em vez de delete e a dependencia operacional do Epic 2.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - padroes de feedback, listagem, estados visuais e linguagem para usuarios pouco tecnicos.
- `_bmad-output/project-context.md` - regras obrigatorias de tenancy, BFF, `snake_case`, layering e testes do projeto.
- `_bmad-output/implementation-artifacts/1-6-cadastrar-usuario-da-igreja-e-atribuir-perfil-basico.md` - base funcional e learnings imediatos da area administrativa criada na story anterior.
- `church-erp-api/app/Domain/Identity/Models/ChurchUser.php` - modelagem atual do vinculo editavel.
- `church-erp-api/database/migrations/2026_04_21_000002_create_church_user_table.php` - `church_user.id`, unique key `church_id + user_id` e indices por `role`/`status`.
- `church-erp-api/app/Domain/Identity/Services/ResolveActiveChurchContextService.php` - login aceita apenas memberships `active`.
- `church-erp-api/app/Domain/Identity/Services/ResolveAuthenticatedSessionService.php` - revalidacao de membership e sessao em chamadas autenticadas.
- `church-erp-api/app/Policies/ChurchUserPolicy.php` - regra administrativa atual, hoje limitada ao create.
- `church-erp-api/routes/api.php` - entrypoints atuais de auth, create church user e access matrix.
- `church-erp-web/src/app/admin/users/page.tsx` - superficie administrativa existente.
- `church-erp-web/src/app/api/admin/users/route.ts` - boundary BFF atual do fluxo administrativo.
- `church-erp-web/src/app/api/auth/me/route.ts` - revalidacao de sessao usada pelo proxy.
- `church-erp-web/src/proxy.ts` - protecao server-side das areas por sessao e role.
- `church-erp-web/src/features/church-users/contracts.ts` - contratos atuais de create para evolucao.
- `church-erp-web/src/lib/api/client.ts` - cliente BFF -> Laravel com `cache: "no-store"`.
- `church-erp-web/tests/bff-smoke.test.mjs` - smoke tests existentes da boundary BFF e da area `/admin/users`.
- `https://laravel.com/docs/12.x/validation` - validacao via `FormRequest` e respostas JSON `422`.
- `https://laravel.com/docs/12.x/authorization` - policies, `Gate` e respostas `403`.
- `https://laravel.com/docs/12.x/database#database-transactions` - `DB::transaction(...)` para updates multi-etapa seguros.
- `https://nextjs.org/docs/app/building-your-application/routing/route-handlers` - `route.ts` no App Router para GET/PATCH do BFF.

### Checklist pre-review

- A listagem administrativa usa apenas memberships do `church_id` autenticado.
- O identificador usado para editar e reativar usuarios e `church_user.id`, nao `users.id`.
- A alteracao de role/status acontece no mesmo registro `church_user`, sem delete ou recriacao.
- Memberships com papel atual `administrator` sao somente leitura nesta story.
- O MVP nao ganhou fluxo paralelo de promocao para `administrator`.
- `GET /api/admin/users` e `PATCH /api/admin/users/[id]` continuam atravessando o BFF com `callLaravel(...)`.
- `ResolveAuthenticatedSessionService`, `/api/auth/me` e `proxy.ts` continuam sendo o mecanismo oficial para refletir mudancas de acesso.
- O `PATCH` aceita `role`, `status` ou ambos, exige pelo menos um campo e sempre responde `200` com body.
- O browser nunca chama endpoint autenticado do Laravel diretamente.
- A UI cobre loading, empty, confirmacao, erro, sessao invalida e acesso negado com linguagem simples.
- `php artisan test`, `./vendor/bin/pint --test`, `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke` passaram.

### Git intelligence

- Os commits recentes `35e5775` e `91ba1b8` consolidaram `/admin/users` como slice administrativa da Story 1.6. A 1.7 deve continuar nesse mesmo trilho, evitando espalhar a manutencao de usuarios por rotas de secretaria ou tesouraria.
- O historico imediato mostra reviews sensiveis em auth/BFF e superfícies administrativas. Nesta story, qualquer shortcut que contorne `auth/me`, middleware ou policy provavelmente vai reabrir o mesmo tipo de regressao.
- O padrao recente do repositorio e implementar historias verticalmente com testes dedicados por dominio. A manutencao de usuarios deve seguir esse recorte enxuto em `Identity`.

### Latest tech information

- A documentacao oficial do Laravel 12 continua orientando `FormRequest` como caminho padrao para validacao de payload e mensagens customizadas em respostas JSON `422`. Isso sustenta manter a validacao de role/status no backend e nao apenas no form React. Fonte: `https://laravel.com/docs/12.x/validation`.
- A documentacao oficial do Laravel 12 continua usando policies e `Gate` como mecanismo idiomatico para autorizacao contextual e respostas `403`. Isso reforca que `ChurchUserPolicy` deve ser expandida para list/update em vez de espalhar checks por controller. Fonte: `https://laravel.com/docs/12.x/authorization`.
- A documentacao oficial do Laravel 12 continua recomendando `DB::transaction(...)` para operacoes com multiplas escritas dependentes. Se a story combinar update de membership com rastreabilidade adicional, essa fronteira transacional precisa permanecer atomica. Fonte: `https://laravel.com/docs/12.x/database#database-transactions`.
- A documentacao oficial atual do Next.js App Router continua posicionando `route.ts` como o lugar correto para GET/PATCH do BFF. Isso valida manter `src/app/api/admin/users` e adicionar `[id]/route.ts` se necessario, sem introduzir API client no browser para falar direto com Laravel. Fonte: `https://nextjs.org/docs/app/building-your-application/routing/route-handlers`.
- O repositório local esta pinado em `next@16.2.3`, `react@19.2.4` e `laravel/framework:^12.0`. A story deve respeitar essa baseline real; nao cabe upgrade opportunista de stack como parte desta entrega.

### Project context reference

- Esta story deve ser implementada em conformidade com `_bmad-output/project-context.md`, especialmente nas regras de:
  - browser consumir apenas o `church-erp-web`;
  - backend Laravel como fonte de verdade para tenancy, validacao e autorizacao;
  - contratos HTTP em `snake_case`;
  - separacao entre `src/components/ui`, `src/components/design-system` e `src/components/operational`;
  - testes focados em tenancy, autorizacao, transactionality e boundary BFF.

### Story completion status

- Status da story neste momento: `ready-for-dev`.
- Nota de conclusao: story context criada com foco em tenancy, administracao minima viavel e propagacao correta de role/status nas proximas checagens de sessao e acesso.
- Observacao de workflow: o arquivo `_bmad/core/tasks/validate-workflow.xml` referido pelo fluxo nao foi encontrado neste repositório; a verificacao final foi feita manualmente contra o `checklist.md` do workflow e contra os artefatos reais do projeto.
- Proximo passo esperado: executar `dev-story` nesta story e validar a superficie administrativa completa antes de retomar UAT do Epic 2.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

- Story gerada a partir do backlog `1-7-listar-usuarios-da-igreja-e-ajustar-perfil-ou-status` em `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- Fontes analisadas integralmente para esta story: `epics.md`, `prd.md`, `architecture.md`, `ux-design-specification.md`, `mvp-scope.md`, `project-context.md`, `sprint-change-proposal-2026-05-25.md` e a story anterior `1-6`.
- O estado real do codigo foi cruzado com `church-erp-api` e `church-erp-web`, incluindo `ChurchUser`, `ResolveAuthenticatedSessionService`, `proxy.ts`, `/api/auth/me`, `/admin/users` e os contratos atuais de `church-users`.
- O task de validacao automatica referenciado pelo workflow (`_bmad/core/tasks/validate-workflow.xml`) nao existe neste checkout; checklist validado manualmente.

### Completion Notes List

- Pendente implementacao.
- Ponto de continuidade natural: evoluir a area `/admin/users` ja criada na 1.6, preservando o boundary BFF e a modelagem `users` + `church_user`.

### File List

- `_bmad-output/implementation-artifacts/1-7-listar-usuarios-da-igreja-e-ajustar-perfil-ou-status.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `church-erp-api/routes/api.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ListChurchUsersController.php`
- `church-erp-api/app/Http/Controllers/Api/V1/UpdateChurchUserController.php`
- `church-erp-api/app/Http/Requests/UpdateChurchUserRequest.php`
- `church-erp-api/app/Http/Resources/ChurchUserCollection.php`
- `church-erp-api/app/Domain/Identity/Services/ListChurchUsersService.php`
- `church-erp-api/app/Domain/Identity/Services/UpdateChurchUserMembershipService.php`
- `church-erp-api/app/Policies/ChurchUserPolicy.php`
- `church-erp-api/tests/Feature/Identity/ListChurchUsersTest.php`
- `church-erp-api/tests/Feature/Identity/UpdateChurchUserTest.php`
- `church-erp-api/tests/Feature/Identity/AuthSessionTest.php`
- `church-erp-web/src/app/admin/users/page.tsx`
- `church-erp-web/src/app/api/admin/users/route.ts`
- `church-erp-web/src/app/api/admin/users/[id]/route.ts`
- `church-erp-web/src/components/operational/church-user-create-form.tsx`
- `church-erp-web/src/components/operational/church-user-management-panel.tsx`
- `church-erp-web/src/features/church-users/contracts.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`
