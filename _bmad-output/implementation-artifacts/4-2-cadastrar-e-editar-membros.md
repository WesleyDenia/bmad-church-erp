# Story 4.2: Cadastrar e editar membros

Status: done

<!-- Security gate required: esta story manipula dados pessoais, autorizacao por perfil, tenant isolation e sessao BFF. Antes de iniciar dev-story, execute /bmad-review-security e incorpore findings validos. -->

## Story

As a secretaria da igreja,
I want criar e atualizar registos de membros com os dados essenciais,
so that a base da igreja permaneca util para a rotina semanal.

## Acceptance Criteria

1. Dado que um usuario com perfil `secretary` ou `administrator` acessa o fluxo de novo membro, quando a verificacao de area e executada, entao o formulario real de membro e exibido; `treasurer`, `leadership`, usuario sem sessao e membership inativa recebem negacao apropriada sem renderizar dados pessoais.
2. Dado que a secretaria informa dados essenciais validos, quando salva um novo membro, entao o browser chama somente o BFF Next.js `POST /api/secretary/members`; o BFF segue o padrao autenticado ja usado no sistema, lendo `AUTH_SESSION_COOKIE_NAME` via `readSessionTokenFromCookieValue`, chamando Laravel server-side por `callLaravel`, preservando contratos em `snake_case`, limpando cookie em `401` e sanitizando `403`, `404`, `422` e `5xx`.
3. Dado que o Laravel recebe o cadastro de membro, quando persiste o registro, entao cria um registro em `people` com `person_type = member`, `church_id` resolvido exclusivamente da sessao autenticada e nunca vindo do browser.
4. Dado que campos obrigatorios ou formatos invalidos sao enviados, quando a validacao roda, entao o sistema retorna `422` com mensagens simples por campo e nao cria nem altera registros parciais.
5. Dado que o payload contem `church_id`, `user_id`, `role`, `tenant`, `permission`, `person_type` ou outro campo fora da allowlist, quando chega ao BFF ou Laravel, entao a requisicao e rejeitada com `422` sem persistir nada e sem expor dados existentes.
6. Dado que o membro foi criado com sucesso, quando a resposta retorna ao frontend, entao a UI mostra confirmacao clara, preserva o contexto da secretaria e oferece proximo passo real para cadastrar outro membro ou voltar a home.
7. Dado que um membro existente do tenant atual e aberto para edicao por rota direta, quando a tela carrega, entao o browser chama somente o BFF `GET /api/secretary/members/{member_id}`; o BFF chama server-side o Laravel `GET /api/v1/people/members/{person}` e retorna somente dados minimizados necessarios ao formulario.
8. Dado que a secretaria atualiza dados essenciais de um membro existente, quando salva, entao o browser chama somente o BFF `PATCH /api/secretary/members/{member_id}`; o Laravel atualiza somente registro `people` com `person_type = member` e `church_id` do tenant atual.
9. Dado que o ID informado pertence a outro tenant, a visitante ou a registro inexistente, quando a tela ou salvamento tenta carregar/alterar, entao o sistema retorna `404` indistinguivel; dado que o usuario autenticado nao possui perfil permitido, entao retorna `403` sem indicar se o registro existe.
10. Dado que email ou telefone sao informados, quando o backend valida e normaliza o payload, entao `display_name` e aparado, email fica em lowercase, strings vazias viram `null` para contato opcional e telefone e armazenado em formato simples aceito pelo MVP sem mascaras obrigatorias de pais.
11. Dado que um membro ativo ou marcado como `needs_update` e salvo sem telefone e sem email, quando a home da secretaria for recarregada, entao o registro aparece nas regras existentes de pendencia por contato ausente; membros `inactive` nunca entram em pendencias operacionais.
12. Dado que um membro e criado ou atualizado, quando futuras buscas da Story 4.4 consultarem `people`, entao o registro ja fica persistido de forma pesquisavel por `person_type = member`, `display_name`, `status`, telefone e email, sem depender de tabela paralela.
13. Dado que um membro e salvo com email, quando ja existe outro membro do mesmo tenant com o mesmo email normalizado, entao o backend retorna `422` com mensagem simples e nao cria nem altera o registro; a unicidade de email e por tenant e por `person_type = member`.
14. Dado que a UI e usada em desktop, tablet ou mobile, quando o formulario renderiza ou valida, entao os estados `loading`, `editing_loaded`, `creating_ready`, `saving`, `saved`, `validation_error`, `denied_or_session_invalid`, `not_found` e `server_error` sao tratados sem sobrepor controles, sem perder dados digitados em `422` e com navegacao por teclado.
15. Dado que a story entra em review, quando os testes forem executados, entao backend, BFF e frontend provam autorizacao por perfil, tenant isolation, ausencia de chamadas Laravel pelo browser, rejeicao de campos de escopo, contratos `snake_case`, sanitizacao de erros, ausencia de logs com PII/token, audit log sanitizado de criacao/edicao, atualizacao imediata da fonte `people`, unicidade de email por tenant por constraint de banco, inativos fora de pendencias e ausencia de termos genericos como "dashboard", "widget" ou "KPI" na UI da secretaria.

## Tasks / Subtasks

- [x] Criar contrato backend de membros sobre a tabela `people` existente (AC: 2-5, 7-12)
  - [x] Criar `POST /api/v1/people/members`, `GET /api/v1/people/members/{person}` e `PATCH /api/v1/people/members/{person}` dentro de `resolve.internal.session`.
  - [x] Criar controllers finos em `app/Http/Controllers/Api/V1`, por exemplo `StoreMemberController`, `ShowMemberController` e `UpdateMemberController`.
  - [x] Criar `StoreMemberRequest` e `UpdateMemberRequest` com allowlist estrita: `display_name`, `status`, `phone`, `email`.
  - [x] Rejeitar explicitamente `church_id`, `user_id`, `role`, `roles`, `permission`, `permissions`, `tenant`, `tenant_id`, `scope`, `person_type`, `id`, `created_at`, `updated_at`.
  - [x] Criar service de dominio em `app/Domain/People/Services`, por exemplo `CreateMemberService` e `UpdateMemberService`, ou um unico `SaveMemberService` se permanecer pequeno e coeso.
  - [x] Criar `MemberResource` ou resource equivalente que retorne `data.member` com somente campos permitidos ao formulario.
  - [x] Resolver `church_id` exclusivamente de `authenticated_session.membership`; nunca aceitar escopo pelo payload ou query.
  - [x] Garantir que `Person::$fillable` continue sem `church_id`; usar `forceFill` somente em service controlado quando precisar definir tenant.
  - [x] Manter `person_type = member` fixo no backend; o cliente nao escolhe tipo da pessoa nesta story.
  - [x] Criar migration complementar reversivel com indice nomeado `people_church_type_display_name_index` para `['church_id', 'person_type', 'display_name']`, compativel com MySQL 8.4, e remover o indice no `down()`.
  - [x] Criar indice unico nomeado `people_church_type_email_unique` para `['church_id', 'person_type', 'email']`; MySQL permite multiplos `NULL`, entao contatos sem email continuam permitidos.
  - [x] Tratar violacao da constraint `people_church_type_email_unique` como `422` sanitizado, sem vazar SQL, nome de indice bruto, dados existentes ou stack trace.
  - [x] Garantir que email duplicado entre membros do mesmo tenant retorna `422`; email igual em tenants diferentes permanece permitido.

- [x] Implementar autorizacao e privacidade para dados pessoais (AC: 1, 3, 5, 9, 14)
  - [x] Criar Gate/Policy especifico para membro, preferencialmente `PersonPolicy` com acoes `createMember`, `viewMember`, `updateMember`, permitindo `secretary` e `administrator`.
  - [x] Registrar policy/gates em `AppServiceProvider` sem enfraquecer `view-secretary-home`.
  - [x] Em `GET/PATCH`, buscar membro por `id`, `church_id` da sessao e `person_type = member`; se nao encontrar, retornar `404` generico.
  - [x] Negar `treasurer`, `leadership`, sessao ausente e membership inativa antes de qualquer retorno com PII.
  - [x] Adicionar rate limiters nomeados e separados: `secretary-members-read` com 60/min e `secretary-members-write` com 20/min, ambos chaveados por `user_id|church_id`.
  - [x] Proibir logs com nome, telefone, email, payload completo, cookie, token, header `Authorization`, exception bruta ou stack trace enviada ao cliente.
  - [x] Registrar audit log sanitizado em create/update com `event`, `actor_user_id`, `church_id`, `person_id`, `action` e nomes dos campos alterados, sem valores de nome, email, telefone, payload bruto, token, cookie ou header de auth.

- [x] Implementar BFF Next.js de membros (AC: 2, 5, 7-10, 14)
  - [x] Criar `church-erp-web/src/app/api/secretary/members/route.ts` para `POST`.
  - [x] Criar `church-erp-web/src/app/api/secretary/members/[memberId]/route.ts` para `GET` e `PATCH`.
  - [x] Seguir o padrao autenticado ja usado no sistema para toda rota autenticada: ler cookie `HttpOnly` `AUTH_SESSION_COOKIE_NAME` com `readSessionTokenFromCookieValue`, chamar Laravel com `callLaravel`, usar `normalizeAuthResponse`, limpar cookie em `401` e nao criar mecanismo paralelo de autenticacao.
  - [x] Chamar Laravel exclusivamente via `callLaravel("/api/v1/people/members...")`.
  - [x] Usar `cache: "no-store"` em leituras e manter o mesmo padrao de chamada/sanitizacao para mutacoes; sanitizar `401`, `403`, `404`, `422` e `5xx`; em `401`, limpar cookie BFF.
  - [x] Observacao SEC-02: o Laravel permanece responsavel por CSRF/CORS no backend e o browser nunca chama Laravel diretamente; as rotas BFF desta story devem permanecer same-origin, nao devem emitir CORS permissivo e devem rejeitar mutacoes com `Origin`/`Host` incompatibilizados antes de chamar `callLaravel`.
  - [x] Rejeitar query params livres e campos fora da allowlist antes de encaminhar ao Laravel.
  - [x] Validar `memberId` no BFF antes do upstream: aceitar apenas inteiro positivo em formato decimal seguro; rejeitar zero, negativo, decimal, string, vazio ou valor exagerado com resposta sanitizada sem chamar Laravel.
  - [x] Preservar `snake_case` nos tipos TypeScript e no contrato transportado.

- [x] Implementar fluxo web de cadastro e edicao de membros (AC: 1, 6-8, 10-13)
  - [x] Criar rota visual `church-erp-web/src/app/secretaria/membros/novo/page.tsx` dentro de `AreaGuard area="secretaria"`.
  - [x] Criar rota visual `church-erp-web/src/app/secretaria/membros/[memberId]/editar/page.tsx` para edicao direta, tambem protegida por `AreaGuard`.
  - [x] Criar `church-erp-web/src/features/people/member.ts` ou `src/features/secretaria/members.ts` com tipos e normalizadores do contrato.
  - [x] Criar componente operacional de formulario, por exemplo `church-erp-web/src/components/operational/member-form.tsx`.
  - [x] Campos visiveis do formulario nesta story: `display_name` com label "Nome do membro"; `status` com opcoes "Ativo", "Precisa de atualizacao" e "Inativo"; `phone` com label "Telefone"; `email` com label "Email". Nao incluir `last_contacted_at` na UI desta story.
  - [x] Mensagens minimas: nome obrigatorio, nome com ate 160 caracteres, email invalido, email ja usado por outro membro, telefone com ate 40 caracteres, status invalido.
  - [x] Reutilizar primitives existentes em `src/components/ui`, `Surface` e padroes operacionais; nao criar biblioteca paralela de formularios.
  - [x] Atualizar `SecretaryHomeShell`/quick actions para tornar `Cadastrar membro` uma acao real para `/secretaria/membros/novo`.
  - [x] Nao implementar lista pesquisavel, filtros avancados, merge de duplicados, historico pastoral, eventos ou comunicacao nesta story.
  - [x] Garantir que erros recuperaveis preservem dados digitados; `401`, `403`, troca de contexto e `404` devem limpar dados pessoais carregados.
  - [x] Em `422`, preservar todos os campos digitados e focar/ancorar o primeiro erro de validacao sem limpar o formulario.

- [x] Cobrir backend com testes de feature e source inspection (AC: 1-5, 7-12, 14)
  - [x] Criar `church-erp-api/tests/Feature/People/MemberManagementTest.php`.
  - [x] Testar que `secretary` e `administrator` criam, veem e atualizam membros.
  - [x] Testar que `treasurer`, `leadership`, sessao ausente e membership inativa nao acessam nem recebem PII.
  - [x] Testar que `church_id` vem da sessao e que dados de outro tenant nunca sao lidos ou alterados.
  - [x] Testar que visitante (`person_type = visitor`) nao pode ser lido/atualizado pelas rotas de membro.
  - [x] Testar rejeicao de campos extra e parametros de escopo com `422`.
  - [x] Testar normalizacao de nome, email lowercase e strings vazias para `null`.
  - [x] Testar que membro ativo ou `needs_update` sem contato e salvo e aparece na pendencia de contato ausente da home existente.
  - [x] Testar que membro `inactive` sem contato nao aparece em pendencias.
  - [x] Testar email duplicado no mesmo tenant com `person_type = member` retorna `422`, sem criar/alterar registro; email igual em outro tenant e permitido.
  - [x] Testar que route middleware inclui `resolve.internal.session`, `throttle:secretary-members-read` nas leituras e `throttle:secretary-members-write` nas mutacoes.
  - [x] Testar que `MemberResource` nao retorna `church_id`, `person_type`, `created_at`, `updated_at`, IDs de usuario, auditoria tecnica ou qualquer campo fora da allowlist.
  - [x] Testar que criacao e edicao emitem audit log sanitizado com ator, tenant, pessoa, acao e nomes de campos alterados, sem PII, token, cookie, header de auth, payload bruto ou stack trace.
  - [x] Testar ou verificar por source inspection ausencia de logs com PII/token/payload.

- [x] Cobrir BFF e frontend com testes atuais do projeto (AC: 2, 5-8, 13, 14)
  - [x] Criar `church-erp-web/tests/member-management.test.mjs` para source inspection e comportamento de contrato.
  - [x] Ampliar `church-erp-web/tests/bff-smoke.test.mjs` para exigir os novos route handlers de membros.
  - [x] Provar que browser chama somente `/api/secretary/members`, nunca `/api/v1/people/members` ou `API_BASE_URL`.
  - [x] Provar que `401` limpa cookie e que `403`/`404` nao preservam PII carregada.
  - [x] Provar que BFF de membros segue o padrao autenticado atual: `AUTH_SESSION_COOKIE_NAME`, `readSessionTokenFromCookieValue`, `callLaravel`, `normalizeAuthResponse` e limpeza de cookie em `401`.
  - [x] Provar que mutations BFF permanecem same-origin, nao retornam CORS permissivo e rejeitam `Origin`/`Host` incompatibilizados sem chamar Laravel.
  - [x] Provar que `memberId` invalido nao chama `callLaravel`.
  - [x] Provar que payloads continuam `snake_case` e rejeitam campos fora da allowlist.
  - [x] Provar que `422` preserva dados digitados e exibe mensagens por campo.
  - [x] Provar que a UI cobre estados de carregamento, pronto para criar, edicao carregada, salvando, salvo, erro de validacao, negado, nao encontrado e erro tecnico.
  - [x] Provar que textos visiveis nao usam "dashboard", "widget", "KPI", "performance" ou "BI".

## Threat Modeling - STRIDE

**Escopo:** Story 4.2 - cadastro e edicao de membros sobre `people`, com browser -> BFF Next.js -> Laravel API -> MySQL.
**Fronteiras de confianca:** browser autenticado, BFF Next.js same-origin, cookie HttpOnly `AUTH_SESSION_COOKIE_NAME`, chamada server-side `callLaravel`, middleware Laravel `resolve.internal.session`, tenant `church_id` da membership autenticada e banco MySQL.
**Entradas:** formularios de novo membro e edicao, rotas BFF `POST /api/secretary/members`, `GET/PATCH /api/secretary/members/{memberId}`, rotas Laravel `/api/v1/people/members`, headers/cookies de sessao e payload JSON allowlisted.
**Saidas:** respostas JSON minimizadas `data.member`, mensagens de validacao `422`, confirmacao visual, pendencias da home da secretaria e audit logs sanitizados.
**Dados sensiveis:** `display_name`, `phone`, `email`, `church_id`, `user_id`, membership, session cookie/JWT interno, permissao/role e identificadores de pessoa.
**Autenticacao:** cookie BFF HttpOnly convertido em JWT interno para Laravel via `callLaravel`; Laravel valida sessao interna em `resolve.internal.session`.
**Autorizacao:** Laravel e fonte final de autorizacao via Gate/Policy; somente `secretary` e `administrator` com membership ativa podem criar, ler ou editar membros do tenant atual.
**Limites de payload e abuso:** allowlist estrita no BFF e FormRequest, rejeicao de campos de escopo, `memberId` inteiro positivo seguro, rate limits `secretary-members-read` 60/min e `secretary-members-write` 20/min por `user_id|church_id`, sem uploads ou chamadas externas.

| STRIDE | Pergunta adversarial | Mitigacao obrigatoria | Status |
| --- | --- | --- | --- |
| Spoofing | Como um atacante poderia se passar por usuario, tenant ou backend? | Ler somente `AUTH_SESSION_COOKIE_NAME`; validar JWT interno no Laravel; resolver `church_id` exclusivamente da membership autenticada; nunca aceitar tenant/role/person_type do browser; limpar cookie em `401`. | Mitigado por implementacao e testes |
| Tampering | Como dados ou escopo poderiam ser adulterados? | BFF e FormRequest rejeitam campos fora da allowlist; services fixam `person_type = member`; queries de GET/PATCH filtram `id`, `church_id` e `person_type`; mutations BFF permanecem same-origin, sem CORS permissivo, e rejeitam `Origin` ausente ou `Origin`/`Host` incompatibilizados. | Mitigado por implementacao e testes |
| Repudiation | Como provar quem criou ou alterou um membro sem vazar PII? | Emitir audit log sanitizado com evento, ator, tenant, pessoa, acao e nomes dos campos alterados; nao registrar valores de nome, telefone, email, payload bruto, cookie, token, header de auth ou stack trace. | Mitigado por implementacao e testes |
| Information Disclosure | Que PII ou detalhe interno poderia vazar? | `MemberResource` retorna somente `id`, `display_name`, `status`, `phone`, `email`; `403` nao indica existencia; `404` indistinguivel para outro tenant, visitante ou inexistente; erros `5xx` sanitizados; `401/403/404` limpam PII carregada na UI. | Mitigado por implementacao e testes |
| Denial of Service | Como chamadas repetidas ou payloads grandes podem degradar o servico? | Rate limiters nomeados por `user_id|church_id`; limites de tamanho nos campos; rejeicao de IDs invalidos antes do upstream; sem busca/lista geral nesta story; `cache: "no-store"` somente para leituras sensiveis. | Mitigado por implementacao e testes |
| Elevation of Privilege | Como usuario sem perfil poderia ganhar permissao ou atravessar tenant? | Policy `PersonPolicy` com `createMember`, `viewMember`, `updateMember`; `secretary`/`administrator` somente; negar `treasurer`, `leadership`, sessao ausente e membership inativa antes de retornar PII; `AreaGuard` nao substitui autorizacao Laravel. | Mitigado por implementacao e testes |

### Negative Constraints

- Nunca gravar chaves de API, senhas, tokens ou segredos em texto claro.
- Nunca chamar Laravel diretamente do browser; toda chamada de membro sai do browser somente para o BFF.
- Nunca aceitar `church_id`, `tenant`, `role`, `permission`, `person_type`, `id` ou timestamps vindos do browser.
- Nunca registrar PII, tokens, payloads sensiveis ou stack traces em logs expostos.
- Nunca depender apenas de validacao em service para unicidade de email; a constraint de banco e obrigatoria.

### Security Sign-off

- **Status:** Security notes incorporated - aguardando execucao do gate de segredos em `ci`/`stg`/`prod`
- **Auditor:** Vex - Security Auditor
- **Data:** 2026-08-18

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story entrega o primeiro fluxo de escrita real do dominio People apos a home operacional da secretaria.
- A base tecnica ja existe desde a Story 4.1: tabela unificada `people`, model `Person`, endpoint de home e blocos de secretaria usam essa fonte.
- O objetivo e permitir criar e editar membros com baixa friccao, mantendo dados suficientes para a rotina semanal, pendencias e futuras buscas.
- O cadastro de membro deve atualizar a mesma fonte que a home usa; apos salvar, dados de membro sem contato ou com `status = needs_update` devem aparecer naturalmente nas pendencias existentes.
- Esta story nao implementa cadastro de visitantes, busca/filtros completos, resolucao de pendencias, comunicacao, eventos, merge de duplicados, historico pastoral sensivel ou permissoes granulares avancadas.
- Email de membro e unico por tenant no MVP; duplicidade deve ser bloqueada com `422` antes de criar retrabalho operacional.
- Membros inativos continuam editaveis, mas nao geram pendencias operacionais da secretaria.

### Guardrails de implementacao obrigatorios

- Estender a tabela/model `people`; nao criar tabelas `members`, `church_members`, `member_profiles` ou estrutura paralela para membros no MVP.
- `person_type = member` e decidido exclusivamente no Laravel.
- `church_id` vem somente da sessao autenticada resolvida por `resolve.internal.session`.
- Browser chama apenas o BFF Next.js; endpoints Laravel autenticados nunca devem ser chamados direto do browser.
- Toda rota BFF autenticada desta story deve seguir o padrao ja usado no sistema: `AUTH_SESSION_COOKIE_NAME`, `readSessionTokenFromCookieValue`, `callLaravel`, `normalizeAuthResponse`, limpeza de cookie em `401`, resposta sanitizada e nenhum mecanismo paralelo de autenticacao.
- Observacao SEC-02: Laravel trata CSRF/CORS na fronteira backend; como o browser desta story conversa somente com o BFF Next.js, o BFF nao deve criar bypass de origem, nao deve responder com CORS permissivo e deve validar `Origin`/`Host` nas mutacoes antes de encaminhar ao Laravel.
- Autorizacao final fica no Laravel via Gate/Policy; `AreaGuard` e apenas camada de UX.
- Usar FormRequest para validacao e mensagens simples.
- Usar service de dominio para persistencia; controller nao deve concentrar regras de tenant, normalizacao ou update.
- Usar Resource para resposta `data.member`.
- Manter contratos HTTP em `snake_case`; tipos TypeScript devem espelhar o payload Laravel.
- Dados pessoais retornados no formulario devem ser minimizados: `id`, `display_name`, `status`, `phone`, `email`. Nao retornar `church_id`, `person_type`, timestamps internos, IDs de usuario, auditoria tecnica ou dados de outros tenants.
- Falhas `401`, `403`, `404` e troca de contexto devem limpar dados pessoais ja carregados na tela.
- Mensagens visiveis devem ser claras e pastorais, sem linguagem corporativa ou tecnica.
- `403` e reservado para usuario autenticado sem perfil permitido; `404` e usado de forma indistinguivel para membro inexistente, de outro tenant ou registro que nao seja `person_type = member`.
- `422` deve preservar dados digitados no formulario e mostrar mensagens por campo.
- `MemberResource` deve expor somente os campos do formulario e nunca retornar `church_id`, `person_type`, timestamps internos, IDs de usuario ou auditoria tecnica.

### Abordagens proibidas

- Nao criar modelagem paralela de membros fora de `people`.
- Nao aceitar `church_id`, `person_type`, `role`, `tenant`, `permission`, `id` ou timestamps vindos do browser.
- Nao permitir que React defina tenant, autorizacao ou `person_type`.
- Nao usar endpoint da home da secretaria para salvar membro.
- Nao criar novo padrao de autenticacao, leitura de cookie, chamada Laravel ou tratamento de `401` diferente dos BFFs autenticados atuais.
- Nao criar lista pesquisavel/filtros completos nesta story; isso pertence a Story 4.4.
- Nao criar visitante junto com membro nem fluxo de conversao visitante-para-membro nesta story.
- Nao adicionar campos pastorais sensiveis, documentos, nascimento, endereco completo, familia, tags, voluntariado ou observacoes livres sem story aprovada.
- Nao expor payload completo, token, cookie, header `Authorization`, stack trace, exception bruta, nome, telefone ou email em logs.
- Nao introduzir Zustand/Redux/global state, filas, Redis, PDF, charts, analytics, automacao de WhatsApp ou integracao externa.
- Nao usar "dashboard", "widget", "KPI", "performance" ou "BI" em UI.

### Arquivos provaveis a alterar ou criar

- `church-erp-api/routes/api.php`
- `church-erp-api/app/Providers/AppServiceProvider.php`
- `church-erp-api/app/Policies/PersonPolicy.php`
- `church-erp-api/app/Domain/People/Models/Person.php`
- `church-erp-api/app/Domain/People/Services/CreateMemberService.php`
- `church-erp-api/app/Domain/People/Services/UpdateMemberService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/StoreMemberController.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ShowMemberController.php`
- `church-erp-api/app/Http/Controllers/Api/V1/UpdateMemberController.php`
- `church-erp-api/app/Http/Requests/StoreMemberRequest.php`
- `church-erp-api/app/Http/Requests/UpdateMemberRequest.php`
- `church-erp-api/app/Http/Resources/MemberResource.php`
- `church-erp-api/tests/Feature/People/MemberManagementTest.php`
- `church-erp-api/tests/Feature/People/SecretaryHomeTest.php`
- `church-erp-web/src/app/api/secretary/members/route.ts`
- `church-erp-web/src/app/api/secretary/members/[memberId]/route.ts`
- `church-erp-web/src/app/secretaria/membros/novo/page.tsx`
- `church-erp-web/src/app/secretaria/membros/[memberId]/editar/page.tsx`
- `church-erp-web/src/components/operational/member-form.tsx`
- `church-erp-web/src/components/operational/secretary-home-shell.tsx`
- `church-erp-web/src/features/people/member.ts`
- `church-erp-web/src/features/secretaria/secretary-home.ts`
- `church-erp-web/tests/member-management.test.mjs`
- `church-erp-web/tests/bff-smoke.test.mjs`

### Estados obrigatorios da UI ou do fluxo

- `loading_member_form`: carregando sessao/area ou dados de edicao.
- `creating_ready`: formulario pronto para novo membro.
- `editing_loaded`: membro carregado do tenant atual.
- `saving_member`: salvando cadastro ou edicao.
- `member_saved`: registro persistido e confirmacao exibida.
- `validation_error`: campos invalidos sem perder dados digitados.
- `denied_or_session_invalid`: usuario sem sessao ou sem perfil permitido; limpar PII.
- `not_found`: membro inexistente, de outro tenant ou nao membro; nao indicar qual caso ocorreu.
- `server_error`: falha tecnica sem dados confiaveis.
- `technical_recovered_without_pii`: opcional apenas para erro recuperavel e sem preservar nome, telefone ou email; proibido em `401`, `403`, `404` e troca de contexto.

### Requisitos tecnicos obrigatorios

- Stack atual confirmada no workspace:
  - Next.js `^16.2.12`, React `19.2.4`, Tailwind CSS `^4`, `@radix-ui/react-dialog` `^1.1.15`.
  - Laravel framework `12.64.0`, PHP `^8.3`, PHPUnit `12.5.17`.
- API Laravel versionada sob `/api/v1`; novas rotas autenticadas devem ficar dentro do grupo `resolve.internal.session`.
- BFF Next.js deve usar Route Handlers em `src/app/api/secretary/members`.
- `callLaravel` continua sendo o caminho central para BFF -> Laravel e deve usar `cache: "no-store"`.
- Contrato minimo de cadastro:
  - Request: `{ display_name, status, phone?, email? }`
  - Response `201`: `{ data: { member: { id, display_name, status, phone, email } }, message }`
- Contrato minimo de leitura:
  - Response `200`: `{ data: { member: { id, display_name, status, phone, email } } }`
- Contrato minimo de atualizacao:
  - Request PATCH parcial, mas somente campos allowlisted.
  - Response `200`: `{ data: { member: ... }, message }`
- Status permitidos para membro nesta story: `active`, `inactive`, `needs_update`. Nao permitir `new`, `follow_up_needed` ou `contacted` para `member` salvo pelo formulario, salvo se houver justificativa explicita em teste e UX.
- `display_name` e obrigatorio, string, max 160.
- `email` e opcional, email valido, max 160, normalizado para lowercase ou `null`.
- Email normalizado deve ser unico entre membros do mesmo tenant. Email igual em outro tenant e permitido. Visitante com mesmo email nao bloqueia membro nesta story.
- `phone` e opcional, string simples, max 40, aparada ou `null`.
- `last_contacted_at` nao faz parte do formulario nem dos contratos desta story; manter o campo existente no modelo apenas para uso futuro.
- `memberId` do BFF deve ser inteiro positivo decimal antes de chamar Laravel; valores invalidos retornam erro sanitizado sem upstream.
- Membros `inactive` nao entram em pendencias da home, mesmo sem telefone e sem email.
- Rate limiting obrigatorio: `secretary-members-read` 60/min para `GET` e `secretary-members-write` 20/min para `POST/PATCH`, ambos por `user_id|church_id`.
- Erros BFF/Laravel devem retornar mensagens sanitizadas; `5xx` do BFF deve retornar `"Server error"` ou mensagem segura equivalente ja usada no projeto.
- Unicidade de email por tenant e por `person_type = member` deve ser garantida por constraint de banco nomeada `people_church_type_email_unique`; validacao em service pode melhorar mensagem, mas nao substitui a constraint.
- Audit log de criacao/edicao deve registrar somente metadados sanitizados: evento, ator, tenant, pessoa, acao e nomes de campos alterados.

### Compliance de arquitetura

- Manter Laravel como fonte de verdade para autorizacao, validacao, tenant scope e persistencia.
- Usar `Person` em `app/Domain/People/Models` e services em `app/Domain/People/Services`.
- Controller fino: Request -> service -> Resource.
- Policy/Gate decide permissao; service decide persistencia; Resource decide exposicao.
- Queries de edicao devem filtrar por `id`, `church_id` e `person_type = member` antes de retornar dados.
- `administrator` e `secretary` podem criar/editar membros; isso nao concede acesso financeiro nem administracao irrestrita.
- Preservar `ResolveBackofficeAreaAccessService` e `AreaGuard area="secretaria"` sem enfraquecer outras areas.
- Componentes de formulario e fluxo ficam em `src/components/operational` ou `src/features/people`; `src/components/ui` permanece reservado a primitives sem dominio.
- UI deve reaproveitar `shadcn/ui` primitives existentes, `Surface` e padroes operacionais antes de criar novos primitives.
- Rota visual deve usar linguagem do produto (`/secretaria/membros/...`); rotas BFF/API podem usar ingles tecnico (`/api/secretary/members`, `/api/v1/people/members`).

### Politica de seguranca da IDE e sandbox

- `Artifact Review Policy` exigida: `Asks for Review`.
- `Terminal Command Auto Execution Policy` deve bloquear elevacao/destruicao: `sudo`, `rm -rf`, `chmod 777`, `chown -R /`, alteracoes de SO, destruicao de banco, rotacao de credenciais reais, deploy e migrations destrutivas sem aprovacao humana.
- `Browser URL Allowlist` deve ficar restrita a documentacao oficial do framework/projeto, OWASP, repositorios oficiais, registries oficiais e docs internas aprovadas.
- Credenciais de banco usadas por agentes devem ter privilegio minimo e dados de teste; proibir DBA, SYSTEM, superuser e acesso a dados reais.

### Requisitos de teste

- Backend minimo:
  - `cd church-erp-api && php artisan test tests/Feature/People/MemberManagementTest.php`
  - `cd church-erp-api && php artisan test tests/Feature/People/SecretaryHomeTest.php`
  - `cd church-erp-api && php artisan test`
- Frontend minimo:
  - `cd church-erp-web && npm test -- tests/member-management.test.mjs`
  - `cd church-erp-web && npm test -- tests/bff-smoke.test.mjs`
  - `cd church-erp-web && npm test`
  - `cd church-erp-web && npm run lint`
  - `cd church-erp-web && npm run typecheck`
  - `cd church-erp-web && npm run build:smoke`
- Seguranca/tooling antes de review:
  - `cd church-erp-api && composer audit`
  - `cd church-erp-api && npm audit --omit=dev`
  - `cd church-erp-web && npm audit --omit=dev`
- `bash deploy/security-gate.sh dev|ci|stg|prod`; em `dev`/`local` o gate registra skip explicito e nao exige `detect-secrets` instalado. Em `ci`, `stg` e `prod`, o gate exige `pre-commit` ou `detect-secrets-hook` instalado e bloqueia a promocao quando a varredura falha ou quando o scanner esta ausente.

### Licoes de stories ou reviews anteriores

- Story 4.1 criou a base unificada `people`; esta story deve escrever nessa base, nao remodelar membros.
- Story 4.1 removeu `church_id` de `$fillable`; preservar essa protecao contra mass assignment.
- Story 4.1 consolidou que usuarios negados nao podem ver blocos operacionais nem PII; repetir esse padrao nos formularios.
- Story 4.1 mostrou que dados pessoais exigem rate limit, allowlist de payload, sanitizacao de erros e testes de logs.
- Story 4.1 ja estabeleceu que pendencias de pessoas precisam de regras deterministicas; ao ajustar para excluir `inactive`, atualizar `BuildSecretaryHomeService` e testes juntos.
- Epic 3 e Story 4.1 reforcaram que estados vazios/indisponiveis devem ser honestos; nao preencher formulario ou cards com dados ficticios.
- Reviews anteriores encontraram riscos em parametros de escopo, estados otimistas, logs e linguagem tecnica visivel. Converter cada risco em teste.
- `detect-secrets` ja existe no repositorio com baseline; usar o fluxo atual em vez de ignorar a verificacao.
- Reviews de seguranca da Story 4.2 exigiram STRIDE, observacao SEC-02 sobre Laravel CSRF/CORS versus BFF same-origin, constraint de banco para email, audit log sanitizado, gate bloqueante de segredos e politica IDE/sandbox registrada.

### Git Intelligence Summary

- `3b21760 implementa a story 4.1` adicionou `Person`, tabela `people`, `BuildSecretaryHomeService`, `ShowSecretaryHomeController`, `ShowSecretaryHomeRequest`, `SecretaryHomeResource`, BFF `/api/secretary/home`, `SecretaryHomeShell` e testes `SecretaryHomeTest`/`secretary-home.test.mjs`.
- `68753bd Merge pull request #18 from WesleyDenia/story_4_1` incorporou a story 4.1 no branch atual.
- `c8620ab implementa a story 3.4` e `3b21760` sao bons exemplos recentes de endpoint dedicado, BFF dedicado, autorizacao por area, rate limiter nomeado, UI operacional propria e testes extensos.
- O codigo atual ja possui `PersonCategory` e `ProvisionInitialPersonCategoriesService`; nao duplicar defaults de pessoas.
- O codigo atual ja possui `/secretaria` com `AreaGuard` e `SecretaryHomeShell`; atualizar quick action de membro para rota real sem quebrar os blocos existentes.

### Informacoes tecnicas atuais

- A documentacao atual do Next.js App Router descreve Route Handlers em `app` para criar handlers HTTP com Web Request/Response APIs; manter os BFFs em `src/app/api/...`.
- A documentacao atual de Next.js descreve `cookies` como API para ler cookies de entrada e escrever cookies de resposta em Route Handlers/Server Actions; o projeto ja usa leitura pelo header da `Request`, que pode continuar se testada.
- A documentacao oficial do Laravel 12 recomenda Gates e Policies para autorizacao; Policies sao adequadas para regras em torno de recursos Eloquent como `Person`.
- A documentacao oficial do Laravel 12 suporta FormRequest/validation rules e rate limiters nomeados aplicados por middleware `throttle:nome`; usar isso para payloads e mutacoes de membros.

### Project Structure Notes

- `church-erp-api/app/Domain/People/Models/Person.php` existe com `person_type`, `status`, `display_name`, `phone`, `email`, `last_contacted_at`; `church_id` nao esta em `$fillable`.
- `church-erp-api/database/migrations/2026_08_12_000001_create_people_table.php` ja criou `people` com indices por `church_id`, `person_type`, `status` e `created_at`.
- A tabela `people` ainda nao possui indice dedicado para busca por `display_name`; esta story deve adicionar um indice complementar para preparar a Story 4.4 sem implementar a lista pesquisavel agora.
- A tabela `people` ainda nao possui indice/unicidade para email de membro; esta story deve impedir duplicidade de email por tenant sem criar tabela paralela.
- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php` ja deriva pendencias por `status in (new, follow_up_needed, needs_update)` ou contato ausente.
- `church-erp-api/routes/api.php` ja possui `/api/v1/secretary/home` sob `resolve.internal.session` e `throttle:secretary-home`; novas rotas de membros devem seguir o mesmo grupo.
- `church-erp-web/src/app/secretaria/page.tsx` ja usa `AreaGuard area="secretaria"` e `SecretaryHomeShell`.
- `church-erp-web/src/app/api/secretary/home/route.ts` e o padrao BFF mais relevante para leitura de cookie, `callLaravel`, sanitizacao e limpeza de cookie em `401`.
- `church-erp-web/tests/bff-smoke.test.mjs` ja cobre boundaries BFF e deve ser ampliado.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 4, Story 4.2 e padrao frontend.
- `_bmad-output/planning-artifacts/prd.md` - FR-5, Jornada B, NFR-5 e NFR-8.
- `_bmad-output/planning-artifacts/architecture.md` - dominios People/Operations, BFF, tenancy, autorizacao, estrutura e contracts.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - jornada da secretaria, PeopleFollowupBlock, padroes de feedback, navegacao e cadastro de pessoas.
- `_bmad-output/project-context.md` - stack, BFF, componentes, testes e regras criticas.
- `_bmad-output/implementation-artifacts/4-1-exibir-home-operacional-da-secretaria.md` - fonte de People criada, security review, licoes e guardrails.
- `church-erp-api/app/Domain/People/Models/Person.php`
- `church-erp-api/database/migrations/2026_08_12_000001_create_people_table.php`
- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php`
- `church-erp-api/routes/api.php`
- `church-erp-web/src/app/api/secretary/home/route.ts`
- `church-erp-web/src/components/operational/secretary-home-shell.tsx`
- Web: https://nextjs.org/docs/app/getting-started/route-handlers
- Web: https://nextjs.org/docs/app/api-reference/functions/cookies
- Web: https://laravel.com/docs/12.x/authorization
- Web: https://laravel.com/docs/12.x/validation
- Web: https://laravel.com/docs/12.x/routing#rate-limiting

### Checklist pre-review

- `/secretaria/membros/novo` renderiza formulario real protegido por `AreaGuard`.
- `/secretaria/membros/[memberId]/editar` carrega somente membro do tenant atual e `person_type = member`.
- Browser chama somente `/api/secretary/members` e `/api/secretary/members/{memberId}`.
- BFF chama Laravel somente server-side por `callLaravel`.
- Rotas Laravel existem sob `/api/v1`, `resolve.internal.session` e rate limiter nomeado.
- `secretary` e `administrator` criam/editam; `treasurer`, `leadership`, sessao ausente e membership inativa nao acessam.
- `church_id` e `person_type` nao sao aceitos do browser.
- Payloads com campos extras ou parametros de escopo retornam `422`.
- Dados de outro tenant nao sao lidos nem alterados.
- Visitantes nao sao lidos/alterados por rotas de membro.
- Membro sem contato pode ser salvo e entra na pendencia de contato ausente.
- Membro inativo sem contato nao entra em pendencias.
- Email duplicado entre membros do mesmo tenant retorna `422`; email igual em outro tenant permanece permitido.
- Email e normalizado para lowercase; strings vazias de contato viram `null`.
- Tabela `people` possui indice tenant-scoped para busca futura por nome de membro.
- Indices novos possuem nomes explicitos e rollback no `down()`.
- Constraint `people_church_type_email_unique` existe no banco e violacoes retornam `422` sanitizado.
- `GET/PATCH` para outro tenant, visitante ou inexistente retornam `404` indistinguivel; perfil sem permissao retorna `403`.
- `MemberResource` nao retorna `church_id`, `person_type`, timestamps internos, IDs de usuario ou auditoria tecnica.
- BFF rejeita `memberId` invalido sem chamar Laravel.
- Mutations BFF nao emitem CORS permissivo, validam `Origin`/`Host` e rejeitam `Origin` ausente ou origem incompatibilizada sem chamar Laravel.
- Rotas BFF autenticadas seguem o padrao atual do sistema para cookie, `callLaravel`, `normalizeAuthResponse` e limpeza de cookie em `401`.
- Respostas e logs nao vazam PII, token, cookie, payload completo, header de auth, exception bruta ou stack trace.
- Audit logs de membro existem e contem somente metadados sanitizados.
- `401`, `403`, `404` e troca de contexto limpam dados pessoais carregados.
- `422` preserva os dados digitados e mostra mensagens por campo.
- UI cobre loading, criar pronto, edicao carregada, salvando, salvo, erro de validacao, negado, nao encontrado e erro tecnico.
- UI nao implementa busca/filtros completos nem lista geral de pessoas nesta story.
- UI nao usa "dashboard", "widget", "KPI", "performance" ou "BI".
- Testes backend, web, lint, typecheck, smoke build e audits passam; o gate `deploy/security-gate.sh` fica configurado para bloquear CI/promocao `stg`/`prod` se `detect-secrets`/`pre-commit` estiver ausente ou se a varredura falhar, enquanto `dev`/`local` permanece com skip explicito.
- `/bmad-review-security` foi executado e findings validos foram incorporados antes de iniciar dev-story.

### Story Completion Status

- Status alvo desta story para entrada em implementacao: `ready-for-dev`
- Nota de conclusao do contexto: `Ultimate context engine analysis completed - comprehensive developer guide created`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- RED backend: `cd church-erp-api && php artisan test tests/Feature/People/MemberManagementTest.php` falhou inicialmente por rotas/gates ainda inexistentes.
- Backend focado: `cd church-erp-api && php artisan test tests/Feature/People/MemberManagementTest.php tests/Feature/People/SecretaryHomeTest.php` passou com 12 testes e 243 assertions.
- Backend completo: `cd church-erp-api && php artisan test` passou com 118 testes e 917 assertions.
- PHP style: `cd church-erp-api && vendor/bin/pint --test` passou apos formatar arquivos tocados.
- Frontend focado: `cd church-erp-web && npm test -- tests/member-management.test.mjs tests/bff-smoke.test.mjs` passou; o runner atual executa a suite completa e reportou 67 testes.
- Frontend completo: `cd church-erp-web && npm test` passou com 67 testes.
- Frontend lint/type/build: `cd church-erp-web && npm run lint`, `npm run typecheck` e `npm run build:smoke` passaram.
- Audits: `cd church-erp-api && composer audit`, `cd church-erp-api && npm audit --omit=dev` e `cd church-erp-web && npm audit --omit=dev` passaram sem advisories/vulnerabilidades reportadas.
- Gate de segredos revisado em 2026-08-19: ambiente `dev`/`local` nao exige `detect-secrets` instalado; `deploy/security-gate.sh` registra skip explicito em dev e bloqueia `ci`, `stg` e `prod` se `pre-commit`/`detect-secrets-hook` estiver ausente ou se a varredura falhar.
- CI de seguranca atualizado para instalar `detect-secrets==1.5.0` e executar `bash deploy/security-gate.sh ci`; deploy manual de `stg`/`prod` documentado para executar `bash deploy/security-gate.sh stg|prod` antes da promocao.

### Completion Notes List

- Implementado contrato Laravel de membros sobre `people`, com rotas autenticadas, policy/gates, rate limiters, FormRequests com allowlist, tenant scope pela sessao, resource minimizado, normalizacao, constraint de email por tenant/tipo e audit log sanitizado.
- Implementados BFFs Next.js same-origin para criar, ler e atualizar membros, usando cookie `AUTH_SESSION_COOKIE_NAME`, `readSessionTokenFromCookieValue`, `callLaravel`, `normalizeAuthResponse`, limpeza de cookie em `401`, validacao de `memberId`, rejeicao de query/campos fora da allowlist e erros sanitizados.
- Implementadas telas protegidas por `AreaGuard` para novo membro e edicao direta, com formulario operacional, estados exigidos, preservacao de dados em `422`, limpeza de PII em `401/403/404` e quick action real na home da secretaria.
- Implementados testes backend, BFF/frontend e smoke checks cobrindo autorizacao por perfil, tenant isolation, payloads `snake_case`, rejeicao de campos de escopo, ausencia de chamada Laravel pelo browser, sanitizacao, audit log sem PII, inativos fora de pendencias e contrato visual.
- Handoff mantem `detect-secrets` como gate obrigatorio de CI/promocao para `stg`/`prod`, sem exigir a ferramenta no ambiente local de desenvolvimento.
- Corrigidos achados de code review: tela de edicao nao oferece mais "Cadastrar outro membro", novo submit limpa confirmacao anterior, BFF sanitiza `403/404` sem repassar mensagem upstream e teste cobre limpeza de cookie em `PATCH 401`.

### File List

- `_bmad-output/implementation-artifacts/4-2-cadastrar-e-editar-membros.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php`
- `church-erp-api/app/Domain/People/Services/CreateMemberService.php`
- `church-erp-api/app/Domain/People/Services/UpdateMemberService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ShowMemberController.php`
- `church-erp-api/app/Http/Controllers/Api/V1/StoreMemberController.php`
- `church-erp-api/app/Http/Controllers/Api/V1/UpdateMemberController.php`
- `church-erp-api/app/Http/Requests/ShowMemberRequest.php`
- `church-erp-api/app/Http/Requests/StoreMemberRequest.php`
- `church-erp-api/app/Http/Requests/UpdateMemberRequest.php`
- `church-erp-api/app/Http/Resources/MemberResource.php`
- `church-erp-api/app/Policies/PersonPolicy.php`
- `church-erp-api/app/Providers/AppServiceProvider.php`
- `church-erp-api/database/migrations/2026_08_18_000001_add_member_indexes_to_people_table.php`
- `church-erp-api/routes/api.php`
- `church-erp-api/tests/Feature/People/MemberManagementTest.php`
- `church-erp-api/tests/Feature/People/SecretaryHomeTest.php`
- `church-erp-web/src/app/api/secretary/members/route.ts`
- `church-erp-web/src/app/api/secretary/members/[memberId]/route.ts`
- `church-erp-web/src/app/secretaria/membros/novo/page.tsx`
- `church-erp-web/src/app/secretaria/membros/[memberId]/editar/page.tsx`
- `church-erp-web/src/components/operational/member-form.tsx`
- `church-erp-web/src/features/people/member.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`
- `church-erp-web/tests/member-management.test.mjs`
- `.github/workflows/security-ci.yml`
- `deploy/README.md`
- `deploy/security-gate.sh`

## Change Log

- 2026-08-18: Implementado cadastro/edicao de membros com API Laravel, BFF Next.js, UI operacional e testes; status alterado para `review` por orientacao humana, com `detect-secrets` e `pre-commit` a serem implementados/executados apenas em `stg`/`prod`.
- 2026-08-19: Corrigidos achados do code review; gate de segredos movido para `deploy/security-gate.sh` com skip explicito em `dev` e bloqueio obrigatorio em `ci/stg/prod`.
