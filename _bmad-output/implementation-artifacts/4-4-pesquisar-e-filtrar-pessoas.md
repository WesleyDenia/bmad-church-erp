# Story 4.4: Pesquisar e filtrar pessoas

Status: done

<!-- Implementation gate: esta story manipula dados pessoais, autorizacao por perfil, tenant isolation e sessao BFF. O status ready-for-dev indica que o contexto da story esta pronto; o primeiro passo obrigatorio do dev-story e executar /bmad-review-security, incorporar findings validos e preencher o Security Sign-off antes de escrever codigo de produto. Varredura detect-secrets/pre-commit nao bloqueia dev/local; ela permanece gate obrigatorio apenas para promocao STG/PROD. -->

## Story

As a secretaria da igreja,
I want pesquisar membros e visitantes por nome, estado e atributos basicos,
so that eu encontre rapidamente o registo certo durante o atendimento semanal.

## Acceptance Criteria

1. Dado que um usuario com perfil `secretary` ou `administrator` acessa a busca de pessoas, quando a verificacao de area e executada, entao a lista pesquisavel real e exibida; `treasurer`, `leadership`, usuario sem sessao e membership inativa recebem negacao apropriada sem renderizar dados pessoais.
2. Dado que existem membros e visitantes no tenant atual, quando a secretaria abre `/secretaria/pessoas`, entao o browser chama somente o BFF Next.js `GET /api/secretary/people` com `cache: "no-store"`; o BFF chama server-side o Laravel `GET /api/v1/people` via `callLaravel`, usando `AUTH_SESSION_COOKIE_NAME`, `readSessionTokenFromCookieValue`, `normalizeAuthResponse`, cookie limpo em `401`, contratos `snake_case` e erros sanitizados.
3. Dado que o Laravel recebe uma busca de pessoas, quando consulta a fonte de dados, entao retorna somente registros da tabela `people` com `church_id` resolvido da sessao autenticada; `church_id`, `tenant`, `user_id`, `role`, `roles`, `permission`, `scope`, `person_type` livre ou qualquer escopo vindo do browser nunca podem alterar o tenant da consulta.
4. Dado que a secretaria pesquisa por nome, quando envia `q`, entao a busca aplica correspondencia parcial e case-insensitive sobre `display_name`, aparando espacos nas extremidades, tratando string vazia como ausencia de termo e rejeitando com `422` qualquer termo acima de 80 caracteres apos `trim`, sem consultar nem devolver dados pessoais.
5. Dado que a secretaria aplica filtros basicos, quando envia filtros permitidos, entao o sistema aceita somente `person_type`, `status`, `contact`, `q`, `page` e `per_page`; qualquer outro query param, query param repetido ou formato de array como `status[]=active` retorna `422` sem consultar nem devolver dados pessoais.
6. Dado que `person_type` e informado, quando a busca e executada, entao valores permitidos sao apenas `member`, `visitor` ou `all`; `all` e ausencia do filtro retornam membros e visitantes juntos; valor desconhecido retorna `422`.
7. Dado que `status` e informado, quando a busca e executada, entao valores permitidos sao `active`, `needs_update`, `inactive`, `new`, `follow_up_needed`, `contacted`, `all` ou uma lista unica separada por virgula contendo apenas esses status concretos, como `new,follow_up_needed`; o backend aplica o filtro sobre `people.status` sem inferir status valido por tipo de pessoa; valor desconhecido, lista vazia, espacos internos ambiguos ou `all` combinado com outro valor retornam `422`.
8. Dado que `contact` e informado, quando a busca e executada, entao valores permitidos sao `all`, `with_contact`, `missing_contact`, `phone_only`, `email_only`; `with_contact` significa `phone is not null OR email is not null`; `missing_contact` significa `phone is null AND email is null`; `phone_only` significa `phone is not null AND email is null`; `email_only` significa `email is not null AND phone is null`; valores desconhecidos retornam `422`.
9. Dado que a consulta retorna resultados, quando a resposta chega ao browser, entao cada item e minimizado com `id`, `person_type`, `display_name`, `status`, `contact_summary`, `primary_action_href` e `primary_action_label`, sem expor `church_id`, email bruto, telefone bruto, `last_contacted_at`, timestamps, IDs de usuario, payloads internos ou auditoria tecnica.
10. Dado que ha membros e visitantes na mesma resposta, quando a lista renderiza, entao a UI diferencia claramente "Membro" e "Visitante" por label/badge textual e status operacional; essa diferenciacao nao pode depender somente de cor.
11. Dado que nenhum registro corresponde aos filtros, quando a busca e executada, entao o sistema apresenta estado vazio compreensivel com sugestao simples para limpar ou ajustar filtros, sem criar dados ficticios ou sugerir que houve erro tecnico.
12. Dado que a consulta retorna muitos registros, quando a busca e executada, entao o backend usa paginacao padrao do Laravel e ordenacao deterministica por `display_name` ascendente e `id` ascendente; `per_page` deve ter minimo 1, maximo 50 e default 15; se `page` exceder `last_page`, manter o comportamento padrao do paginator Laravel com `data` vazio, `meta.current_page` igual a pagina solicitada e `meta.last_page` preservado.
13. Dado que a secretaria aciona um item da lista, quando escolhe abrir o cadastro, entao membros navegam para `/secretaria/membros/{id}/editar` e visitantes para `/secretaria/visitantes/{id}/editar`; IDs invalidos ou alterados manualmente continuam protegidos pelas rotas de edicao existentes.
14. Dado que a home da secretaria exibe atalhos e pendencias de pessoas, quando a Story 4.4 for implementada, entao o quick action "Revisar pendencias de pessoas" aponta para `/secretaria/pessoas?person_type=all&status=all&contact=all`; `visitor_follow_up` aponta para `/secretaria/pessoas?person_type=visitor&status=new%2Cfollow_up_needed&contact=all`; `missing_contact` aponta para `/secretaria/pessoas?person_type=all&status=all&contact=missing_contact`; `needs_update` aponta para `/secretaria/pessoas?person_type=all&status=needs_update&contact=all`; os blocos existentes da Story 4.1 nao podem regredir.
15. Dado que um usuario sem permissao, sem sessao, com sessao expirada ou com membership inativa tenta buscar pessoas, quando a requisicao passa pelo BFF ou Laravel, entao retorna `401` ou `403` sanitizado, limpa cookie em `401` e nao revela se existem pessoas, nomes, contatos ou contagens.
16. Dado que o BFF recebe erro upstream `403`, `404`, `422` ou `5xx`, quando responde ao browser, entao sanitiza mensagens para nao vazar PII, SQL, stack trace, token, cookie, headers ou payload bruto; `422` pode repassar apenas erros de campos allowlisted.
17. Dado que a UI e usada em desktop, tablet ou mobile, quando busca, filtra, limpa filtros ou muda pagina, entao os estados `loading_people_search`, `people_search_ready`, `people_search_loaded`, `empty_people_search`, `validation_error`, `denied_or_session_invalid` e `server_error` sao tratados sem sobrepor controles, sem perder criterios de filtro em `422`, com navegacao por teclado, filtros sincronizados na URL e protecao contra corrida entre requisicoes por `AbortController` ou request sequence guard.
18. Dado que esta story entra em review, quando os testes forem executados, entao backend, BFF e frontend provam autorizacao por perfil, tenant isolation, ausencia de chamadas Laravel pelo browser, rejeicao de parametros de escopo, filtros allowlisted, paginacao, ordenacao deterministica, minimizacao de PII, sanitizacao de erros, links corretos para edicao, atualizacao dos hrefs da home, estados de UI e ausencia de termos genericos como "dashboard", "widget", "KPI", "performance" ou "BI" nos arquivos de UI visivel da secretaria.
19. Dado que esta story esta marcada como `ready-for-dev`, quando um dev agent iniciar dev-story, entao pode executar somente o gate inicial de seguranca ate que `/bmad-review-security` tenha sido executado, findings validos tenham sido incorporados na story e o Security Sign-off esteja preenchido; codigo de produto fica bloqueado ate esse gate estar concluido.

## Tasks / Subtasks

- [x] Executar gate de seguranca antes de iniciar dev-story (AC: 19)
  - [x] Rodar `/bmad-review-security` contra esta story.
  - [x] Incorporar findings validos diretamente nesta story antes de escrever codigo.
  - [x] Preencher `Security Sign-off` com status, auditor e data.
  - [x] Interromper qualquer escrita de codigo de produto se o sign-off ainda estiver pendente; dev-story pode executar somente este gate inicial.

- [x] Criar contrato backend de busca unificada de pessoas sobre `people` (AC: 2-12, 15-16)
  - [x] Criar `GET /api/v1/people` em `church-erp-api/routes/api.php`, dentro de `resolve.internal.session`, nomeado como `people.index` e com throttle nomeado de leitura.
  - [x] Criar controller fino `ListPeopleController` em `app/Http/Controllers/Api/V1`, delegando validacao para FormRequest, consulta para service/repository e resposta por `PersonSearchResource::collection($paginator)`.
  - [x] Criar `ListPeopleRequest` em `app/Http/Requests` com allowlist estrita de query params: `q`, `person_type`, `status`, `contact`, `page`, `per_page`.
  - [x] Rejeitar explicitamente `church_id`, `user_id`, `role`, `roles`, `permission`, `permissions`, `tenant`, `tenant_id`, `scope`, `id`, `email`, `phone`, `created_at`, `updated_at`, `last_contacted_at` e qualquer query param livre.
  - [x] Rejeitar query params repetidos ou em formato de array antes da consulta, incluindo `status[]=active`, `status=active&status=inactive` e equivalentes.
  - [x] Autorizar via `Gate::forUser($user)->allows('viewPeople', Person::class)` ou ability equivalente em `PersonPolicy`, permitindo somente `secretary` e `administrator`.
  - [x] Resolver `church_id` exclusivamente de `authenticated_session.membership`; nunca aceitar escopo pelo query string.
  - [x] Implementar consulta em `app/Domain/People/Services/ListPeopleService.php` ou `app/Domain/People/Repositories/PeopleSearchRepository.php` se a query ficar mais complexa que um service coeso.
  - [x] Aplicar `q` em `display_name` com termo aparado, case-insensitive, maximo 80 caracteres apos `trim`, binding parametrizado e sem buscar em email/telefone bruto nesta story; string acima do limite retorna `422` antes da consulta.
  - [x] Aplicar filtros `person_type`, `status` e `contact` exatamente como descritos nos ACs.
  - [x] Ordenar por `display_name` ascendente e `id` ascendente para paginação determinística.
  - [x] Usar paginacao Laravel com `per_page` default 15 e maximo 50, preservando o comportamento padrao quando `page` excede `last_page`.
  - [x] Criar somente `PersonSearchResource` e retornar `PersonSearchResource::collection($paginator)`, preservando o formato paginado padrao do Laravel com `data`, `links` e `meta`; nao criar `ResourceCollection` customizada, nao criar wrapper manual `data.people` e nao inventar contrato paralelo de colecao.

- [x] Implementar autorizacao, rate limiting e privacidade da busca (AC: 1, 3, 9, 15-16)
  - [x] Estender `PersonPolicy` com `viewPeople` ou ability equivalente, sem enfraquecer `createMember`, `viewMember`, `updateMember`, `createVisitor`, `viewVisitor`, `updateVisitor` ou `view-secretary-home`.
  - [x] Registrar gate em `AppServiceProvider`.
  - [x] Criar rate limiter `secretary-people-read` com limite inicial 60/min, chaveado por `user_id|church_id`.
  - [x] Garantir que `treasurer`, `leadership`, sessao ausente e membership inativa nao recebam nomes, contatos, contagens nem metadados que indiquem existencia de pessoas.
  - [x] Nao registrar audit log de leitura individual por item; se algum log tecnico de erro for necessario, nao incluir `display_name`, email, telefone, query bruta, token, cookie, header de auth ou resposta upstream.

- [x] Implementar BFF Next.js de busca de pessoas (AC: 2, 5-9, 15-16)
  - [x] Criar `church-erp-web/src/app/api/secretary/people/route.ts` para `GET`.
  - [x] Seguir o padrao autenticado existente das rotas de secretaria: `AUTH_SESSION_COOKIE_NAME`, `readSessionTokenFromCookieValue`, `callLaravel`, `normalizeAuthResponse`, limpeza de cookie em `401` e `cache: "no-store"`.
  - [x] Rejeitar query params fora da allowlist no BFF antes de chamar Laravel.
  - [x] Rejeitar query params repetidos ou arrays no BFF antes de chamar Laravel.
  - [x] Rejeitar `q` acima de 80 caracteres apos `trim` no BFF antes de chamar Laravel.
  - [x] Encaminhar para Laravel somente `/api/v1/people` com query string allowlisted e normalizada.
  - [x] Minimizar respostas 2xx antes de devolver ao browser; nunca repassar campos extras do upstream.
  - [x] Sanitizar `401`, `403`, `404`, `422` e `5xx`; em `403/404`, nao repassar mensagem upstream que possa revelar existencia de PII.
  - [x] Nao adicionar CORS permissivo; esta rota de leitura e same-origin pelo proprio BFF.

- [x] Implementar tela web de busca e filtros de pessoas (AC: 1, 4-14, 17)
  - [x] Criar rota visual `church-erp-web/src/app/secretaria/pessoas/page.tsx` protegida por `AreaGuard area="secretaria"`.
  - [x] Criar tipos e helpers em `church-erp-web/src/features/people/person-search.ts` com contratos `snake_case`, allowlist de filtros, normalizadores de resposta e extração de erros.
  - [x] Criar helper de estado testavel em `church-erp-web/src/features/people/person-search-state.ts` para serializacao de filtros, validacao local leve, estados e preservacao de criterios.
  - [x] Criar componente operacional `church-erp-web/src/components/operational/person-search-list.tsx` ou nome equivalente, usando `Input`, `Select`, `Button`, `Badge`, `Table`/lista responsiva e `Surface` existentes.
  - [x] Exibir filtros: busca por nome, tipo de pessoa, situacao e contato; manter poucos filtros e limpar criterio em um comando claro.
  - [x] Inicializar filtros a partir de `searchParams`, sincronizar alteracoes na URL com `URLSearchParams` e garantir que voltar/avancar do browser restaure criterios e pagina.
  - [x] Exibir cada pessoa com nome, tipo, situacao, resumo de contato e acao de abrir cadastro; nao renderizar email/telefone bruto na lista.
  - [x] Diferenciar membro/visitante por texto visivel; nao depender so de cor.
  - [x] Implementar loading com skeleton/estrutura estavel, empty state honesto, erro de validacao, acesso negado/sessao invalida e erro tecnico.
  - [x] Usar `AbortController` ou request sequence guard para impedir que uma resposta antiga sobrescreva resultados de filtros mais recentes.
  - [x] Atualizar `BuildSecretaryHomeService` para apontar pendencias e quick action de pessoas para `/secretaria/pessoas` com query filters reais.

- [x] Cobrir backend com testes de feature e source inspection (AC: 1-12, 14-16, 18)
  - [x] Criar `church-erp-api/tests/Feature/People/PeopleSearchTest.php`.
  - [x] Testar que `secretary` e `administrator` listam membros e visitantes do tenant atual.
  - [x] Testar que `treasurer`, `leadership`, sessao ausente e membership inativa nao acessam nem recebem PII.
  - [x] Testar que dados de outro tenant nunca entram na resposta, contagem ou paginacao.
  - [x] Testar busca parcial/case-insensitive por `display_name`.
  - [x] Testar que `q` vazio apos `trim` e tratado como ausencia de termo e que `q` acima de 80 caracteres apos `trim` retorna `422` antes de consultar ou devolver PII.
  - [x] Testar filtros `person_type`, `status` e `contact`, incluindo `all`.
  - [x] Testar `status=new,follow_up_needed` para pendencia de visitantes e rejeicao de lista vazia, status desconhecido e `all` combinado com outro valor.
  - [x] Testar semantica de contato: `with_contact` como telefone ou email, `missing_contact` como nenhum contato, `phone_only` e `email_only`.
  - [x] Testar rejeicao de query params fora da allowlist, parametros de escopo, query params repetidos e arrays com `422`.
  - [x] Testar `per_page` default, maximo 50, minimo 1, `page` valido, erro de pagina invalida e comportamento padrao Laravel quando `page > last_page`.
  - [x] Testar ordenacao por `display_name` e `id`.
  - [x] Testar que `PersonSearchResource::collection($paginator)` retorna o formato paginado padrao do Laravel com `data`, `links` e `meta`, sem `data.people` e sem `ResourceCollection` customizada.
  - [x] Testar que `PersonSearchResource` nao retorna `church_id`, email bruto, telefone bruto, `last_contacted_at`, timestamps, IDs de usuario, auditoria ou `person_type` editavel fora do contrato esperado.
  - [x] Testar que `BuildSecretaryHomeService` atualiza hrefs exatamente para `/secretaria/pessoas?person_type=all&status=all&contact=all`, `/secretaria/pessoas?person_type=visitor&status=new%2Cfollow_up_needed&contact=all`, `/secretaria/pessoas?person_type=all&status=all&contact=missing_contact` e `/secretaria/pessoas?person_type=all&status=needs_update&contact=all`.
  - [x] Testar que route middleware inclui `resolve.internal.session` e `throttle:secretary-people-read`.

- [x] Cobrir BFF e frontend com testes atuais do projeto (AC: 2, 5-18)
  - [x] Criar `church-erp-web/tests/people-search.test.mjs`.
  - [x] Ampliar `church-erp-web/tests/bff-smoke.test.mjs` para exigir `src/app/api/secretary/people/route.ts`.
  - [x] Provar que browser chama somente `/api/secretary/people`, nunca `/api/v1/people` ou `API_BASE_URL`.
  - [x] Provar que BFF usa `AUTH_SESSION_COOKIE_NAME`, `readSessionTokenFromCookieValue`, `callLaravel`, `normalizeAuthResponse`, `cache: "no-store"` e limpeza de cookie em `401`.
  - [x] Provar que BFF rejeita query params fora da allowlist antes de chamar Laravel.
  - [x] Provar que BFF rejeita query params repetidos e arrays antes de chamar Laravel.
  - [x] Provar que BFF rejeita `q` acima de 80 caracteres apos `trim` antes de chamar Laravel e preserva filtros em `422`.
  - [x] Provar que respostas 2xx preservam o shape paginado padrao Laravel `data`, `links`, `meta`, minimizam cada item e nao repassam campos extras upstream.
  - [x] Provar que `403/404/5xx` sao sanitizados.
  - [x] Provar que a UI cobre loading, loaded, empty, validation error, denied/session invalid e technical error.
  - [x] Provar que filtros sao poucos, reversiveis e preservados em erro de validacao.
  - [x] Provar que filtros inicializam pela URL, atualizam a URL e que voltar/avancar do browser restaura criterios.
  - [x] Provar que resposta antiga de busca nao sobrescreve resultados mais recentes.
  - [x] Provar que links de edicao apontam para membros e visitantes corretamente.
  - [x] Provar que textos visiveis dos arquivos de UI da secretaria nao usam "dashboard", "widget", "KPI", "performance" ou "BI"; nao varrer esta story nem comentarios internos como se fossem UI renderizada.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story entrega a primeira lista pesquisavel unificada de People para a secretaria encontrar rapidamente membros e visitantes durante atendimento semanal.
- A fonte de verdade ja existe: tabela `people`, model `Person`, services de membros/visitantes, home da secretaria e rotas de edicao das Stories 4.1-4.3.
- O fluxo deve ser leitura e navegacao para edicao existente; nao e uma nova modelagem de pessoas, nem um fluxo de escrita, nem uma comunicacao, nem uma conversao visitante-para-membro.
- A busca precisa reforcar a home da secretaria: pendencias e atalhos devem poder levar a uma lista filtrada real, preservando o contexto operacional.

### Guardrails de implementacao obrigatorios

- Buscar somente em `people` com `Person::query()->forChurch($churchId)` ou equivalente seguro; nao criar tabela paralela, view materializada, indice externo ou busca global.
- `church_id` vem exclusivamente da sessao autenticada resolvida por `resolve.internal.session`.
- Browser chama somente o BFF `/api/secretary/people`; Laravel autenticado nunca e chamado diretamente pelo browser.
- Laravel e autoridade final para autorizacao, tenant scope, validacao de filtros e minimizacao de dados.
- Resposta de lista nao deve incluir telefone/email bruto; use resumo textual como "Telefone informado", "Email informado", "Telefone e email informados" ou "Contato pendente".
- Lista deve tratar membros e visitantes juntos, com filtro opcional por tipo. Evitar duas queries/telas divergentes que possam ordenar, paginar ou sanitizar de forma diferente.
- Paginar sempre. A home ja limita previews; esta story nao deve carregar todos os registros do tenant no browser.
- Usar o shape padrao de paginacao do Laravel para colecoes: `data`, `links` e `meta`. Nao criar `ResourceCollection` customizada nem wrapper `data.people`.
- Requisicoes concorrentes de busca nao podem permitir que uma resposta antiga substitua os resultados de uma busca mais recente.
- Reaproveitar estados, mensagens e padroes de BFF das stories 4.2 e 4.3, especialmente sanitizacao, cookie em `401` e contratos `snake_case`.

### Abordagens proibidas

- Nao criar `members`/`visitors` como tabelas separadas, endpoint agregado manual sem `people`, cache global ou search index externo.
- Nao aceitar `church_id`, `tenant`, `scope`, `role` ou `person_type` livre para definir escopo da consulta.
- Nao buscar em email/telefone bruto nesta story; o requisito aprovado fala nome, estado e atributos basicos, e a lista deve minimizar PII.
- Nao expor email, telefone, `church_id`, `last_contacted_at`, timestamps ou dados internos em listagem.
- Nao implementar criacao, edicao, merge de duplicados, conversao visitante-para-membro, eventos, comunicacao ou pendencias completas nesta story.
- Nao usar biblioteca paralela de tabela/filtro/combobox; usar primitives existentes de `shadcn/ui` e componentes operacionais do produto.
- Nao nomear a tela ou componentes como dashboard/widget/KPI/BI/performance.
- Nao criar `PersonSearchCollection`, `PeopleSearchCollection` ou qualquer `ResourceCollection` customizada para alterar shape de lista. O padrao permitido e `PersonSearchResource::collection($paginator)`.

### Arquivos provaveis a alterar ou criar

- `church-erp-api/routes/api.php`
- `church-erp-api/app/Providers/AppServiceProvider.php`
- `church-erp-api/app/Policies/PersonPolicy.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ListPeopleController.php`
- `church-erp-api/app/Http/Requests/ListPeopleRequest.php`
- `church-erp-api/app/Http/Resources/PersonSearchResource.php`
- `church-erp-api/app/Domain/People/Services/ListPeopleService.php`
- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php`
- `church-erp-api/tests/Feature/People/PeopleSearchTest.php`
- `church-erp-api/tests/Feature/People/SecretaryHomeTest.php`
- `church-erp-web/src/app/api/secretary/people/route.ts`
- `church-erp-web/src/app/secretaria/pessoas/page.tsx`
- `church-erp-web/src/features/people/person-search.ts`
- `church-erp-web/src/features/people/person-search-state.ts`
- `church-erp-web/src/components/operational/person-search-list.tsx`
- `church-erp-web/src/components/operational/secretary-home-shell.tsx` apenas se necessario para novo link/CTA visual.
- `church-erp-web/tests/people-search.test.mjs`
- `church-erp-web/tests/bff-smoke.test.mjs`

### Estados obrigatorios da UI ou do fluxo

- `loading_people_search`: estrutura da tela permanece estavel com skeleton ou texto de carregamento sem layout shift.
- `people_search_ready`: tela sem busca executada ainda ou com filtros default prontos.
- `people_search_loaded`: resultados reais renderizados com paginacao e criterios visiveis.
- `empty_people_search`: nenhum resultado, com orientacao para limpar ou ajustar filtros.
- `validation_error`: criterios preservados, erro junto ao filtro afetado e sem perda de contexto.
- `denied_or_session_invalid`: dados pessoais removidos, cookie limpo em `401`, mensagem simples de acesso/sessao.
- `server_error`: mensagem operacional em portugues, sem PII nem stack trace, com possibilidade de tentar novamente.

### Threat Modeling - STRIDE

**Escopo:** busca paginada unificada de pessoas em `/secretaria/pessoas`, BFF `GET /api/secretary/people` e Laravel `GET /api/v1/people`.
**Fronteiras de confianca:** browser da secretaria; BFF Next.js same-origin; cookie de sessao BFF; chamada server-side para Laravel via `callLaravel`; middleware `resolve.internal.session`; banco MySQL com tabela `people` por `church_id`.
**Entradas:** query params `q`, `person_type`, `status`, `contact`, `page`, `per_page`; cookie `AUTH_SESSION_COOKIE_NAME`; resposta upstream Laravel consumida pelo BFF.
**Saidas:** resposta paginada minimizada `data`, `links`, `meta`; mensagens sanitizadas de `401`, `403`, `404`, `422` e `5xx`; links de edicao protegidos por rotas existentes.
**Dados sensiveis:** nomes de pessoas, tipo de pessoa, status operacional, resumo de contato, existencia/contagem de registros, tenant `church_id`, cookie/token de sessao e detalhes internos de erro.
**Autenticacao:** BFF le cookie de sessao com `readSessionTokenFromCookieValue`; Laravel resolve sessao interna por `resolve.internal.session`; `401` limpa cookie no BFF.
**Autorizacao:** Laravel e autoridade final via `PersonPolicy::viewPeople` ou ability equivalente; somente `secretary` e `administrator`; tenant vem exclusivamente de `authenticated_session.membership`.
**Limites de payload e abuso:** allowlist dupla BFF/Laravel; rejeicao de parametros repetidos/arrays; `q` maximo 80 caracteres apos `trim`; `per_page` entre 1 e 50; paginacao obrigatoria; rate limiter `secretary-people-read` 60/min chaveado por `user_id|church_id`.

| STRIDE | Pergunta adversarial | Mitigacao obrigatoria | Status |
| --- | --- | --- | --- |
| Spoofing | Como um atacante poderia se passar por secretaria, administrador, servico interno ou outro tenant? | Browser chama somente BFF same-origin; BFF usa cookie `AUTH_SESSION_COOKIE_NAME`; Laravel revalida sessao via `resolve.internal.session`; `401` limpa cookie; testes cobrem sessao ausente/expirada e membership inativa. | Mitigacao definida; validar por testes da story. |
| Tampering | Como parametros podem alterar tenant, role, escopo, tipo de pessoa, paginacao ou consulta SQL? | BFF e Laravel aceitam somente `q`, `person_type`, `status`, `contact`, `page`, `per_page`; rejeitam query params livres, repetidos e arrays; `church_id` nunca vem do browser; `q` usa binding parametrizado em `LOWER(display_name) LIKE ?`. | Mitigacao definida; validar por testes da story. |
| Repudiation | Como provar fluxo autorizado sem registrar PII ou permitir negacao posterior? | Nao criar audit log por item de leitura; qualquer log tecnico deve omitir `display_name`, email, telefone, query bruta, token, cookie, headers de auth e resposta upstream; autorizacao deve ser testada por perfil e tenant. | Mitigacao definida; validar por testes da story. |
| Information Disclosure | Que PII, contagem, tenant, erro tecnico ou detalhe interno poderia vazar? | Resposta 2xx minimiza itens; nao expor `church_id`, email bruto, telefone bruto, `last_contacted_at`, timestamps, IDs de usuario ou auditoria; `401/403/404/5xx` sao sanitizados e nao revelam existencia de registros; `422` repassa somente campos allowlisted. | Mitigacao definida; validar por testes da story. |
| Denial of Service | Como payloads ou consultas podem degradar banco/BFF? | `q` maximo 80 caracteres apos `trim`; `per_page` maximo 50; paginacao obrigatoria; ordenacao deterministica; rate limiter `secretary-people-read`; UI usa `AbortController` ou request sequence guard para descartar respostas antigas. | Mitigacao definida; validar por testes da story. |
| Elevation of Privilege | Como usuario sem permissao pode obter lista, atravessar tenant ou acessar edicao por ID manipulado? | `PersonPolicy::viewPeople` permite somente `secretary` e `administrator`; `treasurer`, `leadership`, sessao ausente e membership inativa recebem `401/403` sem PII; `church_id` resolvido apenas da sessao; links de edicao continuam protegidos pelas rotas existentes. | Mitigacao definida; validar por testes da story. |

### Negative Constraints de Seguranca

- Nunca gravar chaves de API, senhas, tokens ou segredos em texto claro em codigo, fixtures, docs operacionais ou testes.
- Nunca chamar endpoint Laravel autenticado diretamente do browser; todo trafego de browser passa pelo BFF.
- Nunca registrar PII, tokens, payloads sensiveis, headers de auth, cookies, stack traces ou resposta upstream bruta em logs expostos.
- Nunca concatenar input em SQL, comandos shell, HTML raw ou caminhos de arquivo.
- Nunca aceitar escopo, tenant, role, permissao, email bruto ou telefone bruto como filtro desta busca.

### Requisitos tecnicos obrigatorios

- Stack atual: Laravel `^12.0`, PHP `^8.3`, Next.js `16.2.3`, React `19.2.4`, TypeScript strict, Tailwind CSS `^4`.
- Endpoint Laravel: `GET /api/v1/people`.
- Endpoint BFF: `GET /api/secretary/people`.
- Query params oficiais:
  - `q`: string opcional, trim, maximo obrigatorio de 80 caracteres apos `trim`; string vazia apos `trim` e ausencia de termo; acima do limite retorna `422` no BFF e no Laravel antes de qualquer consulta.
  - `person_type`: `all|member|visitor`, default `all`.
  - `status`: `all|active|needs_update|inactive|new|follow_up_needed|contacted` ou lista unica separada por virgula desses status concretos, default `all`.
  - `contact`: `all|with_contact|missing_contact|phone_only|email_only`, default `all`; `with_contact` e telefone ou email, `missing_contact` e telefone e email ausentes.
  - `page`: inteiro positivo, default `1`.
  - `per_page`: inteiro entre `1` e `50`, default `15`.
- Resposta sugerida:
  - `data[]`: `id`, `person_type`, `person_type_label`, `display_name`, `status`, `status_label`, `contact_summary`, `primary_action_href`, `primary_action_label`.
  - `links` e `meta`: formato paginado padrao do Laravel gerado por `PersonSearchResource::collection($paginator)`.
  - proibido criar wrapper `data.people` ou `ResourceCollection` customizada para esta lista.
- Labels de tipo: `member -> Membro`, `visitor -> Visitante`.
- Labels de status:
  - `active -> Ativo`
  - `needs_update -> Precisa de atualizacao`
  - `inactive -> Inativo`
  - `new -> Novo`
  - `follow_up_needed -> Precisa de acompanhamento`
  - `contacted -> Contatado`
- Links:
  - membro: `/secretaria/membros/{id}/editar`
  - visitante: `/secretaria/visitantes/{id}/editar`
- `primary_action_label`: `Abrir cadastro`.
- Links exatos da home:
  - quick action: `/secretaria/pessoas?person_type=all&status=all&contact=all`
  - `visitor_follow_up`: `/secretaria/pessoas?person_type=visitor&status=new%2Cfollow_up_needed&contact=all`
  - `missing_contact`: `/secretaria/pessoas?person_type=all&status=all&contact=missing_contact`
  - `needs_update`: `/secretaria/pessoas?person_type=all&status=needs_update&contact=all`
- Search SQL deve ser simples e MVP-friendly: normalizar o termo com trim + lowercase e usar comparacao parametrizada portavel, por exemplo `LOWER(display_name) LIKE ?` com binding. Nao interpolar termo bruto em SQL.

### Compliance de arquitetura

- Laravel permanece fonte de verdade para autorizacao, validacao, tenant scope, filtros, paginacao e minimizacao de dados.
- Controllers continuam finos: FormRequest -> service/repository -> `PersonSearchResource::collection($paginator)` para listas paginadas.
- Policy/Gate decide permissao; service/repository decide consulta; Resource decide exposicao.
- Listas paginadas devem usar o formato padrao Laravel gerado por `JsonResource::collection($paginator)`; nao criar `ResourceCollection` customizada para renomear `data` ou reduzir `links/meta`.
- Contratos HTTP oficiais permanecem em `snake_case`.
- Browser chama somente o BFF same-origin; endpoints Laravel autenticados nunca sao chamados diretamente pelo browser.
- Componentes de fluxo ficam em `src/components/operational` ou `src/features/people`; `src/components/ui` permanece reservado a primitives sem dominio.
- Usar `shadcn/ui` primitives, `Surface` e tokens existentes; nao criar UI generica de SaaS nem linguagem de dashboard.
- Nomenclatura visivel deve seguir a rotina da secretaria: "pessoas", "membros", "visitantes", "situacao", "contato", "acompanhamento".

### Requisitos de teste

- Backend minimo:
  - `cd church-erp-api && php artisan test tests/Feature/People/PeopleSearchTest.php`
  - `cd church-erp-api && php artisan test tests/Feature/People/SecretaryHomeTest.php`
  - `cd church-erp-api && php artisan test tests/Feature/People/MemberManagementTest.php`
  - `cd church-erp-api && php artisan test tests/Feature/People/VisitorManagementTest.php`
  - `cd church-erp-api && php artisan test`
- Frontend minimo:
  - `cd church-erp-web && npm test -- tests/people-search.test.mjs`
  - `cd church-erp-web && npm test -- tests/bff-smoke.test.mjs`
  - `cd church-erp-web && npm test`
  - `cd church-erp-web && npm run lint`
  - `cd church-erp-web && npm run typecheck`
  - `cd church-erp-web && npm run build:smoke`
- Seguranca/tooling antes de review:
  - `cd church-erp-api && composer audit`
  - `cd church-erp-api && npm audit --omit=dev`
  - `cd church-erp-web && npm audit --omit=dev`
  - `bash deploy/security-gate.sh dev`; em `dev`/`local` o gate registra skip explicito e nao exige `detect-secrets` ou `pre-commit`.
  - Antes de promocao para STG/PROD, executar `bash deploy/security-gate.sh stg|prod` em ambiente com `pre-commit` ou `detect-secrets==1.5.0` instalado; falha por scanner ausente bloqueia promocao, mas nao bloqueia dev-story.

### Licoes de stories ou reviews anteriores

- Story 4.1 criou `people`, `Person`, `BuildSecretaryHomeService`, `/api/v1/secretary/home`, BFF `/api/secretary/home`, `SecretaryHomeShell` e `PeopleFollowupBlock`; a busca deve estender essa base, nao criar modulo paralelo.
- Story 4.2 consolidou escrita de membros com allowlist dupla, tenant da sessao, `404` indistinguivel, `403` sem existencia, sanitizacao de erros e BFF same-origin.
- Story 4.3 consolidou visitantes na mesma tabela `people`, com `person_type = visitor`, status `new|follow_up_needed|contacted|inactive`, BFF minimizando resposta 2xx e erro operacional em portugues para `5xx`.
- `BuildSecretaryHomeService` ja calcula pendencias `visitor_follow_up`, `missing_contact` e `needs_update`; a 4.4 deve transformar esses blocos em entradas para lista filtrada real.
- Reviews anteriores encontraram riscos em parametros de escopo, estados otimistas, logs e linguagem tecnica visivel. Converter cada risco em teste.
- `Person::$fillable` ainda inclui `person_type` por compatibilidade interna; nesta story nao ha escrita, mas nenhum filtro pode permitir alterar ou inferir tipo fora dos valores allowlisted.
- Gate de segredos local nao bloqueia dev-story; promocao STG/PROD continua exigindo scanner conforme governanca atual.
- Para endpoints de lista paginada, manter o padrao Laravel `data`/`links`/`meta`; nunca criar collection customizada para trocar o shape para `data.people`.

### Git Intelligence Summary

- `cf0f340 Merge pull request #20 from WesleyDenia/story_4-3` incorporou cadastro/edicao de visitantes e refinou governanca de seguranca.
- `96d3861 implementa a story 4.3` adicionou rotas Laravel/BFF de visitantes, services, resources, policy abilities, testes e UI operacional.
- `5d90bbd Merge pull request #19 from WesleyDenia/story_4_2` incorporou membros sobre `people`.
- `1440f6c implementa 4.2` adicionou o padrao de BFF/allowlist/tenant isolation que deve ser reutilizado na busca.
- `68753bd Merge pull request #18 from WesleyDenia/story_4_1` criou home da secretaria, `people`, previews limitados e blocos operacionais que esta story deve conectar a filtros reais.

### Informacoes tecnicas atuais

- Next.js Route Handlers usam arquivos `route.ts` e exportam metodos HTTP como `GET`, `POST` e `PATCH`; rotas dinamicas recebem `params` como Promise no padrao atual. Para esta story, `/api/secretary/people/route.ts` e rota estatica de `GET`.
- A API `cookies` do Next.js e assincrona, mas o projeto ja usa leitura de cookie via header da `Request` com `readSessionTokenFromCookieValue`; manter o padrao existente se coberto por testes.
- Laravel 12 documenta Policies/Gates para autorizacao por recurso, `throttle:nome` para anexar rate limiters nomeados a rotas e `paginate/simplePaginate/cursorPaginate` para paginacao. Para esta story, usar paginacao Laravel normal e contrato meta minimizado.

### Project Structure Notes

- `church-erp-api/app/Domain/People/Models/Person.php` existe com `person_type`, `status`, `display_name`, `phone`, `email`, `last_contacted_at`; `church_id` nao esta em `$fillable`.
- `church-erp-api/database/migrations/2026_08_12_000001_create_people_table.php` criou indices `church_id`, `church_id/person_type/created_at`, `church_id/status` e `church_id/person_type/status`.
- `church-erp-api/database/migrations/2026_08_18_000001_add_member_indexes_to_people_table.php` adicionou `people_church_type_display_name_index`, util para busca por tipo e nome; busca geral por nome em todos os tipos ainda deve manter ordenacao deterministica.
- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php` atualmente retorna hrefs de pendencias para `/secretaria`; esta story deve apontar para `/secretaria/pessoas` com filtros.
- `church-erp-api/routes/api.php` ja tem rotas de membros e visitantes sob `resolve.internal.session`; `GET /api/v1/people` deve ficar no mesmo grupo, perto das rotas de People.
- `church-erp-web/src/app/api/secretary/members/*` e `src/app/api/secretary/visitors/*` sao os padroes BFF mais proximos.
- `church-erp-web/src/features/people/member.ts` e `visitor.ts` mostram normalizadores minimizados; criar contrato unificado em `person-search.ts` em vez de misturar regras nos arquivos de escrita.
- `church-erp-web/src/components/operational/people-followup-block.tsx` e o ponto visual a conectar a filtros reais da busca.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 4, Story 4.4 e padrao frontend.
- `_bmad-output/planning-artifacts/prd.md` - FR-5, FR-6, Jornada B, NFR-5 e NFR-8.
- `_bmad-output/planning-artifacts/architecture.md` - dominios People/Operations, BFF, tenancy, autorizacao, estrutura, contratos e paginacao/filtros como gap identificado.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - jornada da secretaria, `PeopleFollowupBlock`, Search and Filtering, padroes de feedback, navegacao e acessibilidade.
- `_bmad-output/project-context.md` - stack, BFF, componentes, testes, seguranca e regras criticas.
- `_bmad-output/implementation-artifacts/4-3-cadastrar-e-editar-visitantes.md` - padrao concreto mais recente para People, BFF, sanitizacao, STRIDE, testes e licoes.
- `church-erp-api/app/Domain/People/Models/Person.php`
- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php`
- `church-erp-api/app/Policies/PersonPolicy.php`
- `church-erp-api/app/Providers/AppServiceProvider.php`
- `church-erp-api/routes/api.php`
- `church-erp-web/src/app/api/secretary/members/route.ts`
- `church-erp-web/src/app/api/secretary/visitors/route.ts`
- `church-erp-web/src/components/operational/secretary-home-shell.tsx`
- `church-erp-web/src/components/operational/people-followup-block.tsx`
- Web: https://raw.githubusercontent.com/vercel/next.js/canary/docs/01-app/03-api-reference/03-file-conventions/route.mdx
- Web: https://raw.githubusercontent.com/vercel/next.js/canary/docs/01-app/03-api-reference/04-functions/cookies.mdx
- Web: https://laravel.com/framework/docs/12.x/authorization
- Web: https://laravel.com/framework/docs/12.x/routing#rate-limiting
- Web: https://laravel.com/framework/docs/12.x/pagination

### Checklist pre-review

- `/secretaria/pessoas` renderiza lista pesquisavel real protegida por `AreaGuard`.
- Browser chama somente `/api/secretary/people`.
- BFF chama Laravel somente server-side por `callLaravel("/api/v1/people...")`.
- Rotas Laravel existem sob `/api/v1`, `resolve.internal.session` e `throttle:secretary-people-read`.
- `secretary` e `administrator` listam; `treasurer`, `leadership`, sessao ausente e membership inativa nao acessam.
- `church_id`, `tenant`, `scope`, `role`, `roles`, `permission`, email bruto e telefone bruto nao sao aceitos como filtros.
- Dados de outro tenant nao entram em itens, totais ou metadados.
- Busca por `q` funciona por nome, trim e case-insensitive; string vazia apos `trim` nao filtra e termo acima de 80 caracteres apos `trim` retorna `422` antes da consulta.
- Filtros por tipo, status e contato funcionam e rejeitam valores invalidos.
- `status=new,follow_up_needed` funciona para visitantes em acompanhamento; query params repetidos e arrays sao rejeitados.
- `contact=with_contact`, `missing_contact`, `phone_only` e `email_only` seguem a semantica exata definida na story.
- Lista mistura membros e visitantes quando `person_type=all` ou omitido.
- Resultados sao paginados com default 15, max 50 e ordenacao por `display_name`, `id`.
- `page > last_page` retorna `data` vazio com `meta` padrao do Laravel, sem erro artificial.
- Response usa shape paginado padrao Laravel `data`, `links`, `meta`; nao existe `data.people` nem `ResourceCollection` customizada.
- Response minimizada nao retorna `church_id`, email bruto, telefone bruto, timestamps, `last_contacted_at`, usuario ou auditoria.
- `primary_action_label` e sempre `Abrir cadastro`.
- UI diferencia Membro/Visitante com texto, nao so cor.
- Empty state orienta ajuste/limpeza de filtros sem mockar dados.
- Links abrem `/secretaria/membros/{id}/editar` ou `/secretaria/visitantes/{id}/editar`.
- Pendencias e quick action da home apontam para `/secretaria/pessoas` com filtros reais.
- Pendencias e quick action da home apontam para os hrefs exatos definidos em Requisitos tecnicos obrigatorios.
- `401` limpa cookie; `403/404/5xx` nao vazam PII ou existencia de registros.
- `422` preserva criterios e mostra mensagens por campo/filtro allowlisted.
- Filtros da tela inicializam de `searchParams`, atualizam a URL e respeitam voltar/avancar do browser.
- Respostas antigas de busca nao sobrescrevem resultados mais recentes.
- UI cobre loading, ready, loaded, empty, validation error, denied/session invalid e server error.
- UI nao implementa escrita, conversao, comunicacao, eventos, merge de duplicados ou pendencias completas nesta story.
- UI nao usa "dashboard", "widget", "KPI", "performance" ou "BI".
- Testes backend, web, lint, typecheck, smoke build, audits e gate de seguranca passam antes de review.
- `/bmad-review-security` foi executado, findings validos foram incorporados e Security Sign-off foi preenchido antes de escrever codigo de produto.

### Security Sign-off

- Status: Approved with Security Notes
- Auditor: Vex - Security Auditor
- Data: 2026-08-26
- Findings incorporados: H-01 STRIDE explicito adicionado; M-01 limite obrigatorio de `q` formalizado em AC, tarefas, testes, requisitos tecnicos e checklist; L-01 sign-off alinhado ao Change Log.

### Story Completion Status

- Status alvo desta story para entrada em implementacao: `ready-for-dev`.
- Observacao de gate: gate inicial `/bmad-review-security` executado em 2026-08-26, findings H-01/M-01/L-01 incorporados e Security Sign-off preenchido; codigo de produto pode iniciar a partir deste contexto. `detect-secrets`/`pre-commit` nao e requisito de dev/local e permanece obrigatorio antes de promocao para STG/PROD.
- Nota de conclusao do contexto: `Ultimate context engine analysis completed - comprehensive developer guide created`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Implementar primeiro o contrato Laravel com `FormRequest`, service coeso, resource minimizado e paginator padrao.
- Reutilizar o padrao de policy/gate e rate limiter existente nas rotas de membros/visitantes.
- Implementar o BFF como unico endpoint chamado pelo browser, com allowlist dupla, limpeza de cookie em `401` e sanitizacao de erros.
- Criar a tela operacional `/secretaria/pessoas` com filtros sincronizados na URL, estados explicitos e protecao contra corrida por `AbortController`.
- Cobrir backend, BFF e UI com testes de feature/source inspection antes de marcar a story em review.

### Debug Log References

- `php artisan test tests/Feature/People/PeopleSearchTest.php` - PASS, 6 tests / 186 assertions.
- `php artisan test tests/Feature/People/SecretaryHomeTest.php` - PASS, 7 tests / 94 assertions.
- `php artisan test tests/Feature/People/MemberManagementTest.php` - PASS, 5 tests / 153 assertions.
- `php artisan test tests/Feature/People/VisitorManagementTest.php` - PASS, 6 tests / 187 assertions.
- `php artisan test` - PASS, 130 tests / 1294 assertions.
- `npm test -- tests/people-search.test.mjs` - PASS, 79 tests.
- `npm test -- tests/bff-smoke.test.mjs` - PASS, 79 tests.
- `npm run lint` - PASS.
- `npm run typecheck` - PASS.
- `npm run build:smoke` - PASS.
- `./vendor/bin/pint --test` - PASS.
- `composer audit` - PASS, no advisories.
- `cd church-erp-api && npm audit --omit=dev` - PASS, 0 vulnerabilities.
- `cd church-erp-web && npm audit --omit=dev` - PASS, 0 vulnerabilities.
- `bash deploy/security-gate.sh dev` - PASS, secret scan skipped for dev as expected.
- Review fix 2026-08-31: `php artisan test tests/Feature/People/PeopleSearchTest.php` - PASS, 6 tests / 186 assertions.
- Review fix 2026-08-31: `npm test -- tests/people-search.test.mjs` - PASS, 79 tests.
- Review fix 2026-08-31: `npm test -- tests/bff-smoke.test.mjs` - PASS, 79 tests.
- Review fix 2026-08-31: `npm run lint` - PASS.
- Review fix 2026-08-31: `npm run typecheck` - PASS.

### Completion Notes List

- Criado `GET /api/v1/people` sob `resolve.internal.session` com `throttle:secretary-people-read`, autorizacao `viewPeople`, tenant vindo exclusivamente da membership autenticada e resposta paginada padrao `data`/`links`/`meta`.
- Implementada validacao backend para allowlist de query params, bloqueio de parametros de escopo, repetidos e arrays, `q` trim/max 80, filtros `person_type`, `status`, `contact`, `page` e `per_page`.
- Criado `PersonSearchResource` minimizado com labels, resumo de contato e links de edicao, sem expor telefone/email bruto, `church_id`, timestamps, `last_contacted_at` ou metadados internos.
- Criado BFF `GET /api/secretary/people` usando cookie de sessao, `callLaravel`, `normalizeAuthResponse`, `cache: "no-store"`, limpeza em `401`, minimizacao 2xx e sanitizacao de erros.
- Criada tela `/secretaria/pessoas` com `AreaGuard`, filtros por URL, estados de loading/loaded/empty/validation/denied/server, lista responsiva, paginacao e `AbortController`.
- Atualizados hrefs da home da secretaria para apontar pendencias e quick action para `/secretaria/pessoas` com filtros reais.
- Review 2026-08-31 corrigiu a tela para enviar a query crua da URL ao BFF quando existir, impedindo que parametros invalidos sejam normalizados para uma busca valida antes do `422`.
- Review 2026-08-31 endureceu a sanitizacao do BFF para `401` upstream e para query params nao allowlisted, sem repassar mensagem sensivel nem nomes de campos arbitrarios.
- Review 2026-08-31 tornou `people_search_ready` estado inicial real antes do carregamento e adicionou cobertura de teste contra regressao de query crua e sanitizacao de `401`.

### Senior Developer Review (AI)

Reviewer: Wesley Silva via Codex em 2026-08-31

Outcome: Approved after fixes.

Findings corrigidos:

- [x] HIGH: `/secretaria/pessoas` normalizava query params invalidos antes de chamar o BFF, permitindo que URLs como `?tenant=other` ou `?person_type=unknown` virassem busca default com dados reais. Corrigido em `person-search-list.tsx` enviando `rawQueryString` ao BFF quando a URL possui query.
- [x] HIGH: BFF repassava `body.message` do upstream em `401`, podendo vazar SQL/PII/token. Corrigido em `route.ts` com mensagem fixa sanitizada.
- [x] MEDIUM: BFF ecoava chave arbitraria de query invalida em `errors`, como `tenant`. Corrigido para retornar apenas mensagem generica quando o campo nao pertence a allowlist.
- [x] MEDIUM: `people_search_ready` era branch morta. Corrigido tornando esse o estado inicial antes da transicao assíncrona para `loading_people_search`.
- [x] MEDIUM: `_bmad-output/project-context.md` estava modificado no git mas ausente da File List. Corrigido na File List.

### File List

- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php`
- `church-erp-api/app/Domain/People/Services/ListPeopleService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ListPeopleController.php`
- `church-erp-api/app/Http/Requests/ListPeopleRequest.php`
- `church-erp-api/app/Http/Resources/PersonSearchResource.php`
- `church-erp-api/app/Policies/PersonPolicy.php`
- `church-erp-api/app/Providers/AppServiceProvider.php`
- `church-erp-api/routes/api.php`
- `church-erp-api/tests/Feature/People/PeopleSearchTest.php`
- `church-erp-web/src/app/api/secretary/people/route.ts`
- `church-erp-web/src/app/secretaria/pessoas/page.tsx`
- `church-erp-web/src/components/operational/person-search-list.tsx`
- `church-erp-web/src/features/people/person-search-state.ts`
- `church-erp-web/src/features/people/person-search.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`
- `church-erp-web/tests/people-search.test.mjs`
- `_bmad-output/implementation-artifacts/4-4-pesquisar-e-filtrar-pessoas.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/project-context.md`

## Change Log

- 2026-08-25: Story criada com contexto completo para busca e filtros de pessoas; status definido como `ready-for-dev`.
- 2026-08-26: Revisao adversarial incorporada; corrigidos contrato de status multiplo, hrefs exatos da home, semantica de contato, URL sync, controle de corrida, query params repetidos/arrays, shape padrao Laravel `data`/`links`/`meta` e proibicao de `ResourceCollection` customizada.
- 2026-08-26: Findings de seguranca H-01, M-01 e L-01 corrigidos; adicionado STRIDE explicito, limite obrigatorio de `q` e Security Sign-off aprovado com notas.
- 2026-08-26: Implementada busca unificada de pessoas com endpoint Laravel, BFF Next.js, tela `/secretaria/pessoas`, filtros/paginacao, links da home e cobertura de testes; story movida para review.
- 2026-08-31: Code review corrigiu todos os findings High/Medium, reforcou testes de BFF/UI para query crua e sanitizacao, e moveu a story para done.
