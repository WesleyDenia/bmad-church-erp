# Story 4.3: Cadastrar e editar visitantes

Status: done

<!-- Implementation gate: esta story manipula dados pessoais, autorizacao por perfil, tenant isolation e sessao BFF; portanto dev-story so pode iniciar depois de executar /bmad-review-security, incorporar findings validos e registrar o Security Sign-off abaixo. Varredura detect-secrets/pre-commit nao bloqueia dev/local; ela e gate obrigatorio de promocao para STG/PROD. -->

## Story

As a secretaria da igreja,
I want manter registos basicos de visitantes com status de acompanhamento,
so that eu consiga fazer follow-up sem depender de planilhas externas.

## Acceptance Criteria

1. Dado que um usuario com perfil `secretary` ou `administrator` acessa o fluxo de novo visitante, quando a verificacao de area e executada, entao o formulario real de visitante e exibido; `treasurer`, `leadership`, usuario sem sessao e membership inativa recebem negacao apropriada sem renderizar dados pessoais.
2. Dado que a secretaria informa dados essenciais validos, quando salva um novo visitante, entao o browser chama somente o BFF Next.js `POST /api/secretary/visitors`; o BFF segue o padrao autenticado existente com `AUTH_SESSION_COOKIE_NAME`, `readSessionTokenFromCookieValue`, `callLaravel`, `normalizeAuthResponse`, cookie limpo em `401`, contratos `snake_case` e erros sanitizados.
3. Dado que o Laravel recebe o cadastro de visitante, quando persiste o registro, entao cria um registro em `people` com `person_type = visitor`, `church_id` resolvido exclusivamente da sessao autenticada e nunca vindo do browser.
4. Dado que campos obrigatorios ou formatos invalidos sao enviados, quando a validacao roda, entao o sistema retorna `422` com mensagens simples por campo e nao cria nem altera registros parciais.
5. Dado que o payload contem `church_id`, `user_id`, `role`, `roles`, `tenant`, `permission`, `person_type`, `id`, timestamps ou outro campo fora da allowlist, quando chega ao BFF ou Laravel, entao a requisicao e rejeitada com `422` sem persistir nada e sem expor dados existentes.
6. Dado que o visitante foi criado com sucesso, quando a resposta retorna ao frontend, entao a UI mostra confirmacao clara, preserva o contexto da secretaria e oferece proximo passo real para cadastrar outro visitante ou voltar a home.
7. Dado que um visitante existente do tenant atual e aberto para edicao por rota direta, quando a tela carrega, entao o browser chama somente o BFF `GET /api/secretary/visitors/{visitor_id}`; o BFF chama server-side o Laravel `GET /api/v1/people/visitors/{person}` e retorna somente dados minimizados necessarios ao formulario.
8. Dado que a secretaria atualiza dados essenciais de um visitante existente, quando salva, entao o browser chama somente o BFF `PATCH /api/secretary/visitors/{visitor_id}`; o Laravel atualiza somente registro `people` com `person_type = visitor` e `church_id` do tenant atual.
9. Dado que o ID informado pertence a outro tenant, a membro ou a registro inexistente, quando a tela ou salvamento tenta carregar/alterar, entao o sistema retorna `404` indistinguivel; dado que o usuario autenticado nao possui perfil permitido, entao retorna `403` sem indicar se o registro existe.
10. Dado que email ou telefone sao informados, quando o backend valida e normaliza o payload, entao `display_name` e aparado, email fica em lowercase, strings vazias viram `null` para contato opcional, telefone e armazenado em formato simples aceito pelo MVP e `last_contacted_at` permanece fora do formulario.
11. Dado que um visitante salvo possui `status = new` ou `follow_up_needed`, quando a home da secretaria for recarregada, entao o visitante aparece nas regras existentes de pendencia de acompanhamento de visitantes e no bloco de visitantes recentes quando estiver dentro da janela de 30 dias.
12. Dado que um visitante e salvo com `status = contacted`, quando a home da secretaria for recarregada, entao ele pode aparecer em visitantes recentes, mas nao deve contar como pendencia de acompanhamento; visitantes `inactive` nao entram em pendencias operacionais nem no bloco de visitantes recentes.
13. Dado que um visitante e criado ou atualizado, quando futuras buscas da Story 4.4 consultarem `people`, entao o registro ja fica persistido de forma pesquisavel por `person_type = visitor`, `display_name`, `status`, telefone e email, sem depender de tabela paralela.
14. Dado que um visitante e salvo com email, quando ja existe outro visitante do mesmo tenant com o mesmo email normalizado, entao o backend retorna `422` com mensagem simples e nao cria nem altera o registro; a unicidade de email e por tenant e por `person_type = visitor`. Email igual entre um membro e um visitante no mesmo tenant permanece permitido pela constraint existente `people_church_type_email_unique`.
15. Dado que a UI e usada em desktop, tablet ou mobile, quando o formulario renderiza ou valida, entao os estados `loading_visitor_form`, `editing_loaded`, `creating_ready`, `saving_visitor`, `visitor_saved`, `validation_error`, `denied_or_session_invalid`, `not_found` e `server_error` sao tratados sem sobrepor controles, sem perder dados digitados em `422` e com navegacao por teclado.
16. Dado que a story entra em review, quando os testes forem executados, entao backend, BFF e frontend provam autorizacao por perfil, tenant isolation, ausencia de chamadas Laravel pelo browser, rejeicao de campos de escopo, contratos `snake_case`, mensagens de validacao exatas, sanitizacao de erros, ausencia de logs com PII/token, audit log sanitizado e nao enganoso, atualizacao imediata da fonte `people`, unicidade de email por tenant por tipo, status de follow-up refletido na home, inativos fora de pendencias e visitantes recentes, quick action real de visitante e ausencia de termos genericos como "dashboard", "widget" ou "KPI" na UI da secretaria.
17. Dado que esta story esta marcada como `ready-for-dev`, quando um dev agent for iniciar implementacao, entao deve primeiro confirmar que `/bmad-review-security` foi executado, que findings validos foram incorporados na story e que o Security Sign-off desta story foi preenchido; sem isso, a implementacao deve ser interrompida. A ausencia local de `detect-secrets` ou `pre-commit` nao bloqueia dev-story; esses scanners sao obrigatorios apenas para promocao STG/PROD.

## Tasks / Subtasks

- [x] Executar gate de seguranca antes de iniciar dev-story (AC: 17)
  - [x] Rodar `/bmad-review-security` contra esta story.
  - [x] Incorporar findings validos diretamente nesta story antes de escrever codigo.
  - [x] Preencher `Security Sign-off` com status, auditor e data.
  - [x] Interromper dev-story se o sign-off ainda estiver pendente.

- [x] Criar contrato backend de visitantes sobre a tabela `people` existente (AC: 2-5, 7-14)
  - [x] Criar `POST /api/v1/people/visitors`, `GET /api/v1/people/visitors/{person}` e `PATCH /api/v1/people/visitors/{person}` dentro de `resolve.internal.session`.
  - [x] Criar controllers finos em `app/Http/Controllers/Api/V1`, por exemplo `StoreVisitorController`, `ShowVisitorController` e `UpdateVisitorController`.
  - [x] Criar `StoreVisitorRequest`, `ShowVisitorRequest` e `UpdateVisitorRequest` com allowlist estrita: `display_name`, `status`, `phone`, `email`.
  - [x] Rejeitar explicitamente `church_id`, `user_id`, `role`, `roles`, `permission`, `permissions`, `tenant`, `tenant_id`, `scope`, `person_type`, `id`, `created_at`, `updated_at` e qualquer query param livre.
  - [x] Criar services em `app/Domain/People/Services`, por exemplo `CreateVisitorService` e `UpdateVisitorService`, copiando a coesao de `CreateMemberService`/`UpdateMemberService` sem duplicar logica insegura.
  - [x] Criar `VisitorResource` que retorne `data.visitor` com somente `id`, `display_name`, `status`, `phone` e `email`.
  - [x] Resolver `church_id` exclusivamente de `authenticated_session.membership`; nunca aceitar escopo pelo payload ou query.
  - [x] Proibir que as rotas desta story alterem `person_type`: `StoreVisitorRequest`, `UpdateVisitorRequest`, controllers e services de visitantes nunca podem repassar payload do browser para `fill()`, `create()` ou `update()` capaz de mass assignar `person_type`.
  - [x] Manter `Person::$fillable` sem `church_id`; usar `forceFill` somente nos services controlados quando precisar definir tenant e `person_type`.
  - [x] Fixar `person_type = visitor` no backend; o cliente nao escolhe tipo da pessoa nesta story.
  - [x] Documentar explicitamente que conversao de visitante para membro e uma regra de negocio valida para secretaria, mas fica fora deste endpoint de edicao; quando implementada, deve usar rota/acao dedicada, policy propria, validacao de transicao, auditoria de conversao e testes de tenant isolation.
  - [x] Reusar a constraint existente `people_church_type_email_unique`; testar que email duplicado entre visitantes do mesmo tenant retorna `422` e que email igual entre membro e visitante permanece permitido.
  - [x] Tratar violacao da constraint como `422` sanitizado, sem vazar SQL, nome de indice bruto, dados existentes ou stack trace.

- [x] Implementar autorizacao, rate limiting e privacidade para visitantes (AC: 1, 3, 5, 9, 15)
  - [x] Estender `PersonPolicy` com `createVisitor`, `viewVisitor` e `updateVisitor`, permitindo apenas `secretary` e `administrator`.
  - [x] Registrar gates em `AppServiceProvider` sem enfraquecer `view-secretary-home`, membros ou outras areas.
  - [x] Criar rate limiters nomeados `secretary-visitors-read` com 60/min e `secretary-visitors-write` com 20/min, ambos chaveados por `user_id|church_id`.
  - [x] Em `GET/PATCH`, buscar visitante por `id`, `church_id` da sessao e `person_type = visitor`; se nao encontrar, retornar `404` generico.
  - [x] Negar `treasurer`, `leadership`, sessao ausente e membership inativa antes de qualquer retorno com PII.
  - [x] Registrar audit log sanitizado `people_visitor_changed` em create/update com `event`, `actor_user_id`, `church_id`, `person_id`, `action` e nomes dos campos alterados; nao registrar valores de nome, email, telefone, payload bruto, token, cookie ou header de auth.

- [x] Implementar BFF Next.js de visitantes (AC: 2, 5, 7-10, 15)
  - [x] Criar `church-erp-web/src/app/api/secretary/visitors/route.ts` para `POST`.
  - [x] Criar `church-erp-web/src/app/api/secretary/visitors/[visitorId]/route.ts` para `GET` e `PATCH`.
  - [x] Seguir o mesmo padrao autenticado das rotas de membros: `AUTH_SESSION_COOKIE_NAME`, `readSessionTokenFromCookieValue`, `callLaravel`, `normalizeAuthResponse`, limpeza de cookie em `401` e `cache: "no-store"` nas leituras.
  - [x] Chamar Laravel exclusivamente via `callLaravel("/api/v1/people/visitors...")`.
  - [x] Preservar payloads `snake_case` e rejeitar campos fora da allowlist antes do upstream.
  - [x] Rejeitar query params livres e `visitorId` invalido antes de chamar Laravel: aceitar somente inteiro positivo decimal seguro; rejeitar zero, negativo, decimal, string vazia ou valor exagerado.
  - [x] Mutations BFF devem permanecer same-origin, nao emitir CORS permissivo e rejeitar `Origin` ausente ou `Origin`/`Host` incompatibilizados antes de chamar `callLaravel`.
  - [x] Sanitizar `401`, `403`, `404`, `422` e `5xx`; em `403/404`, nao repassar mensagem upstream que possa revelar existencia de PII.

- [x] Implementar fluxo web de cadastro e edicao de visitantes (AC: 1, 6-8, 10-15)
  - [x] Criar rota visual `church-erp-web/src/app/secretaria/visitantes/novo/page.tsx` dentro de `AreaGuard area="secretaria"`.
  - [x] Criar rota visual `church-erp-web/src/app/secretaria/visitantes/[visitorId]/editar/page.tsx`, tambem protegida por `AreaGuard`.
  - [x] Criar `church-erp-web/src/features/people/visitor.ts` com tipos, allowlist e normalizadores do contrato.
  - [x] Criar componente operacional `church-erp-web/src/components/operational/visitor-form.tsx`; pode extrair helper compartilhado com `member-form.tsx` somente se reduzir duplicacao real sem misturar regras de membro e visitante.
  - [x] Campos visiveis: `display_name` com label "Nome do visitante"; `status` com opcoes "Novo", "Precisa de acompanhamento", "Contatado" e "Inativo"; `phone` com label "Telefone"; `email` com label "Email".
  - [x] Nao incluir `last_contacted_at`, conversao para membro, historico pastoral, eventos, lista pesquisavel, comunicacao ou merge de duplicados nesta story.
  - [x] Atualizar `BuildSecretaryHomeService::quickActions()` para tornar `Cadastrar visitante` uma acao real para `/secretaria/visitantes/novo` com `state = available`.
  - [x] Reaproveitar primitives existentes em `src/components/ui`, `Surface` e padroes operacionais; nao criar biblioteca paralela de formulario.
  - [x] Garantir que `422` preserve dados digitados e foque o primeiro erro; `401`, `403`, `404` e troca de contexto devem limpar dados pessoais carregados.

- [x] Cobrir backend com testes de feature e source inspection (AC: 1-5, 7-14, 16)
  - [x] Criar `church-erp-api/tests/Feature/People/VisitorManagementTest.php`.
  - [x] Testar que `secretary` e `administrator` criam, veem e atualizam visitantes.
  - [x] Testar que `treasurer`, `leadership`, sessao ausente e membership inativa nao acessam nem recebem PII.
  - [x] Testar que `church_id` vem da sessao e que dados de outro tenant nunca sao lidos ou alterados.
  - [x] Testar que membro (`person_type = member`) nao pode ser lido/atualizado pelas rotas de visitante.
  - [x] Testar rejeicao de campos extra e parametros de escopo com `422`.
  - [x] Testar normalizacao de nome, email lowercase e strings vazias para `null`.
  - [x] Testar status permitidos de visitante: `new`, `follow_up_needed`, `contacted`, `inactive`; rejeitar `active`, `needs_update`, string vazia, `null` e valores desconhecidos em `POST` e `PATCH`.
  - [x] Testar PATCH parcial omitindo `status` enquanto altera outro campo, e PATCH com `status` invalido sem alterar demais campos.
  - [x] Testar que `new` e `follow_up_needed` aparecem nas pendencias de acompanhamento da home; `contacted` nao conta como pendencia de acompanhamento; `inactive` fica fora de pendencias.
  - [x] Testar que visitantes recentes usam a janela existente de 30 dias, limite 5 e excluem visitantes `inactive`.
  - [x] Testar email duplicado no mesmo tenant com `person_type = visitor` retorna `422`; email igual para membro e visitante no mesmo tenant e permitido; email igual em outro tenant e permitido.
  - [x] Testar que `Person::$fillable` nao permite mass assignment de `church_id` e que os paths de request desta story nunca mass assignam `person_type` a partir do browser.
  - [x] Testar por source inspection que nenhuma rota BFF/Laravel de visitantes aceita `person_type` no payload, mesmo que uma future story implemente conversao visitante-para-membro por endpoint dedicado.
  - [x] Testar que route middleware inclui `resolve.internal.session`, `throttle:secretary-visitors-read` nas leituras e `throttle:secretary-visitors-write` nas mutacoes.
  - [x] Testar que `VisitorResource` nao retorna `church_id`, `person_type`, timestamps internos, IDs de usuario, auditoria tecnica ou qualquer campo fora da allowlist.
  - [x] Testar que criacao e edicao emitem audit log sanitizado sem PII, token, cookie, header de auth, payload bruto ou stack trace.
  - [x] Testar PATCH sem mudanca real: o service deve responder com sucesso idempotente, mas nao deve registrar auditoria enganosa; se logar, `changed_fields` deve ser lista vazia e `action` deve deixar claro que nao houve alteracao.

- [x] Cobrir BFF e frontend com testes atuais do projeto (AC: 2, 5-8, 14-16)
  - [x] Criar `church-erp-web/tests/visitor-management.test.mjs`.
  - [x] Ampliar `church-erp-web/tests/bff-smoke.test.mjs` para exigir os route handlers de visitantes.
  - [x] Provar que browser chama somente `/api/secretary/visitors`, nunca `/api/v1/people/visitors` ou `API_BASE_URL`.
  - [x] Provar que o quick action "Cadastrar visitante" fica habilitado na home da secretaria e aponta para `/secretaria/visitantes/novo`.
  - [x] Provar que BFF de visitantes segue `AUTH_SESSION_COOKIE_NAME`, `readSessionTokenFromCookieValue`, `callLaravel`, `normalizeAuthResponse` e limpeza de cookie em `401`.
  - [x] Provar que mutations BFF permanecem same-origin, nao retornam CORS permissivo e rejeitam `Origin` ausente ou incompatibilizado sem chamar Laravel.
  - [x] Provar que `visitorId` invalido nao chama `callLaravel`.
  - [x] Provar que payloads continuam `snake_case` e rejeitam campos fora da allowlist.
  - [x] Provar que `422` preserva dados digitados e exibe mensagens por campo.
  - [x] Provar que `401/403/404` limpam PII carregada.
  - [x] Provar que a UI cobre loading, criar pronto, edicao carregada, salvando, salvo, erro de validacao, negado, nao encontrado e erro tecnico.
  - [x] Provar que textos visiveis nao usam "dashboard", "widget", "KPI", "performance" ou "BI".

## Threat Modeling - STRIDE

**Escopo:** Story 4.3 - cadastro e edicao de visitantes sobre `people`, com browser -> BFF Next.js -> Laravel API -> MySQL.
**Fronteiras de confianca:** browser autenticado, BFF Next.js same-origin, cookie HttpOnly `AUTH_SESSION_COOKIE_NAME`, chamada server-side `callLaravel`, middleware Laravel `resolve.internal.session`, tenant `church_id` da membership autenticada e banco MySQL.
**Entradas:** formularios de novo visitante e edicao, rotas BFF `POST /api/secretary/visitors`, `GET/PATCH /api/secretary/visitors/{visitorId}`, rotas Laravel `/api/v1/people/visitors`, headers/cookies de sessao e payload JSON allowlisted.
**Saidas:** respostas JSON minimizadas `data.visitor`, mensagens de validacao `422`, confirmacao visual, home da secretaria atualizada e audit logs sanitizados.
**Dados sensiveis:** `display_name`, `phone`, `email`, `church_id`, `user_id`, membership, session cookie/JWT interno, permissao/role e identificadores de pessoa.

| STRIDE | Pergunta adversarial | Mitigacao obrigatoria | Status |
| --- | --- | --- | --- |
| Spoofing | Como alguem poderia se passar por usuario, tenant ou tipo de pessoa? | Ler somente `AUTH_SESSION_COOKIE_NAME`; validar JWT interno no Laravel; resolver `church_id` da membership; fixar `person_type = visitor` no service desta story; nunca aceitar tenant/role/person_type do browser nas rotas de visitantes. Conversao visitante-para-membro requer endpoint dedicado, policy propria e auditoria. | Exigir em implementacao e testes |
| Tampering | Como dados ou escopo poderiam ser adulterados? | BFF e FormRequest rejeitam campos fora da allowlist; queries de GET/PATCH filtram `id`, `church_id` e `person_type`; mutations BFF validam same-origin antes do upstream; qualquer futura transicao de tipo deve ser uma acao explicita, nao mass assignment. | Exigir em implementacao e testes |
| Repudiation | Como provar quem criou ou alterou visitante sem vazar PII? | Emitir audit log sanitizado com evento, ator, tenant, pessoa, acao e nomes dos campos alterados, sem valores pessoais. | Exigir em implementacao e testes |
| Information Disclosure | Que PII poderia vazar? | `VisitorResource` minimizado; `403` nao indica existencia; `404` indistinguivel para outro tenant, membro ou inexistente; erros `5xx` sanitizados; UI limpa PII em `401/403/404`. | Exigir em implementacao e testes |
| Denial of Service | Como chamadas repetidas podem degradar o servico? | Rate limiters nomeados por `user_id|church_id`, limites de tamanho nos campos, rejeicao de IDs invalidos antes do upstream e ausencia de lista geral nesta story. | Exigir em implementacao e testes |
| Elevation of Privilege | Como perfil sem permissao poderia operar dados de visitantes? | `PersonPolicy` com `createVisitor`, `viewVisitor`, `updateVisitor`; somente `secretary`/`administrator`; `AreaGuard` nao substitui autorizacao Laravel. | Exigir em implementacao e testes |

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story entrega o fluxo de escrita de visitantes para completar o par central de People iniciado na Story 4.2.
- A fonte de verdade ja existe: tabela `people`, model `Person`, home da secretaria, bloco de visitantes recentes e pendencias de acompanhamento.
- O objetivo e permitir cadastrar e editar visitantes com baixa friccao, mantendo status operacional suficiente para follow-up semanal e comunicacao futura.
- O visitante salvo deve atualizar imediatamente a mesma fonte usada pela home da secretaria; nao criar tabela `visitors`, store frontend paralelo nem mock intermediario.
- Esta story nao implementa pesquisa/filtros completos, resolucao de pendencias, comunicacao, conversao visitante-para-membro, campos pastorais sensiveis, eventos ou automacao de WhatsApp.

### Guardrails de implementacao obrigatorios

- Reaproveitar o padrao da Story 4.2: `people`, `Person`, services de People, Resource minimizado, FormRequests, BFF same-origin, `callLaravel`, `AreaGuard area="secretaria"` e testes de source inspection.
- Criar rotas e nomes especificos de visitante para manter contratos claros: `/api/v1/people/visitors`, `/api/secretary/visitors`, `/secretaria/visitantes/...`.
- Manter `church_id` fora de `$fillable`; somente service controlado pode definir tenant com `forceFill`.
- Fechar tambem o risco de mass assignment de `person_type` nos endpoints desta story: nenhum `FormRequest`, controller ou service de visitantes pode usar payload do browser para definir `person_type`.
- A regra de negocio de transformar visitante em membro e reconhecida, mas deve ser implementada em story/endpoint de conversao dedicado, com ability propria em `PersonPolicy`, confirmacao explicita da secretaria, validacao de transicao `visitor -> member`, resolucao de tenant pela sessao, auditoria sanitizada e testes especificos. Nao implementar conversao por meio do `PATCH /people/visitors/{person}` desta story.
- Em leitura/edicao, filtrar por `id`, `church_id` da sessao e `person_type = visitor` antes de retornar dados.
- Visitantes usam statuses operacionais `new`, `follow_up_needed`, `contacted`, `inactive`; nao reutilizar `active`/`needs_update` do formulario de membro.
- Nesta story, acompanhamento de visitante e derivado somente de `status`: `new` e `follow_up_needed` exigem acompanhamento, `contacted` indica contato ja feito, `inactive` remove o visitante de pendencias e visitantes recentes.
- `last_contacted_at` existe no schema, mas fica fora do formulario, payload e response desta story.

### Abordagens proibidas

- Nao criar tabela `visitors`, model `Visitor`, rota browser direta para Laravel ou client usando `API_BASE_URL`.
- Nao aceitar `church_id`, tenant, role, permissao, `person_type`, IDs internos ou timestamps do browser nas rotas desta story.
- Nao relaxar a autorizacao de membros para encaixar visitantes; adicionar abilities especificas.
- Nao criar wrapper global customizado de API nem trocar `JsonResource`/`Resource` por contrato paralelo.
- Nao introduzir Jest, Vitest, Playwright, nova biblioteca de componentes ou store global.
- Nao criar lista pesquisavel, filtros, comunicacao, eventos, conversao para membro ou historico pastoral nesta story.
- Nao exibir ou logar PII, token, cookie, payload bruto, header de auth, exception bruta ou stack trace.
- Nao extrair helper compartilhado com membros se isso exigir relaxar status, mensagens, resource shape ou regras de auditoria de qualquer um dos fluxos.

### Arquivos provaveis a alterar ou criar

- `church-erp-api/routes/api.php`
- `church-erp-api/app/Providers/AppServiceProvider.php`
- `church-erp-api/app/Policies/PersonPolicy.php`
- `church-erp-api/app/Domain/People/Services/CreateVisitorService.php`
- `church-erp-api/app/Domain/People/Services/UpdateVisitorService.php`
- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/StoreVisitorController.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ShowVisitorController.php`
- `church-erp-api/app/Http/Controllers/Api/V1/UpdateVisitorController.php`
- `church-erp-api/app/Http/Requests/StoreVisitorRequest.php`
- `church-erp-api/app/Http/Requests/ShowVisitorRequest.php`
- `church-erp-api/app/Http/Requests/UpdateVisitorRequest.php`
- `church-erp-api/app/Http/Resources/VisitorResource.php`
- `church-erp-api/tests/Feature/People/VisitorManagementTest.php`
- `church-erp-api/tests/Feature/People/SecretaryHomeTest.php`
- `church-erp-web/src/app/api/secretary/visitors/route.ts`
- `church-erp-web/src/app/api/secretary/visitors/[visitorId]/route.ts`
- `church-erp-web/src/app/secretaria/visitantes/novo/page.tsx`
- `church-erp-web/src/app/secretaria/visitantes/[visitorId]/editar/page.tsx`
- `church-erp-web/src/features/people/visitor.ts`
- `church-erp-web/src/components/operational/visitor-form.tsx`
- `church-erp-web/src/components/operational/secretary-home-shell.tsx`
- `church-erp-web/tests/bff-smoke.test.mjs`
- `church-erp-web/tests/visitor-management.test.mjs`

### Estados obrigatorios da UI ou do fluxo

- `loading_visitor_form`: leitura inicial da edicao em andamento.
- `creating_ready`: formulario novo pronto sem dados pessoais pre-carregados.
- `editing_loaded`: visitante do tenant atual carregado.
- `saving_visitor`: submit em andamento com controles desabilitados.
- `visitor_saved`: confirmacao clara com proximo passo.
- `validation_error`: `422` por campo, preservando valores digitados e foco no primeiro erro.
- `denied_or_session_invalid`: `401/403`, sem PII carregada.
- `not_found`: `404` generico para outro tenant, membro ou inexistente.
- `server_error`: erro tecnico sanitizado, sem stack trace ou payload.

### Requisitos tecnicos obrigatorios

- Stack atual do workspace: Next.js `^16.2.12`, React `19.2.4`, TypeScript `^5`, Tailwind CSS `^4`; Laravel `^12.0`, PHP `^8.3`, PHPUnit `^12.5.12`.
- API Laravel versionada sob `/api/v1`; novas rotas autenticadas devem ficar dentro de `resolve.internal.session`.
- BFF Next.js deve usar Route Handlers em `src/app/api/secretary/visitors`.
- `callLaravel` continua sendo o unico caminho BFF -> Laravel e leituras devem usar `cache: "no-store"`.
- Contrato minimo de cadastro:
  - Request: `{ display_name, status, phone?, email? }`
  - Response `201`: `{ data: { visitor: { id, display_name, status, phone, email } }, message }`
- Contrato minimo de leitura:
  - Response `200`: `{ data: { visitor: { id, display_name, status, phone, email } } }`
- Contrato minimo de atualizacao:
  - Request PATCH parcial, mas somente campos allowlisted.
  - Response `200`: `{ data: { visitor: ... }, message }`
- Status permitidos para visitante nesta story: `new`, `follow_up_needed`, `contacted`, `inactive`.
- `display_name` e obrigatorio, string, max 160.
- `email` e opcional, email valido, max 160, normalizado para lowercase ou `null`.
- `phone` e opcional, string simples, max 40, aparada ou `null`.
- `visitorId` do BFF deve ser inteiro positivo decimal seguro antes de chamar Laravel.
- Rate limiting obrigatorio: `secretary-visitors-read` 60/min para `GET` e `secretary-visitors-write` 20/min para `POST/PATCH`, ambos por `user_id|church_id`.
- Audit log de criacao/edicao deve registrar somente metadados sanitizados.
- Mensagens minimas obrigatorias de validacao:
  - `display_name.required`: `Informe o nome do visitante.`
  - `display_name.max`: `Use ate 160 caracteres para o nome do visitante.`
  - `status.required` / `status.in`: `Escolha uma situacao valida para o visitante.`
  - `phone.max`: `Use ate 40 caracteres para o telefone.`
  - `email.email`: `Informe um email valido.`
  - `email.max`: `Use ate 160 caracteres para o email.`
  - email duplicado entre visitantes do mesmo tenant: `Este email ja esta em uso por outro visitante.`
  - payload fora da allowlist: `Envie apenas os campos permitidos do visitante.`
  - erro geral de validacao: `Revise os campos do visitante e tente novamente.`
- PATCH parcial deve aceitar atualizacao de qualquer subconjunto allowlisted, mas deve validar `status` quando presente e rejeitar status desconhecido sem alterar outros campos.
- PATCH sem mudanca real deve ser idempotente e nao pode gerar audit log enganoso; se for registrado, deve explicitar ausencia de alteracao com `changed_fields = []`.

### Compliance de arquitetura

- Laravel permanece fonte de verdade para autorizacao, validacao, tenant scope e persistencia.
- Controllers continuam finos: FormRequest -> service -> Resource.
- Policy/Gate decide permissao; service decide persistencia; Resource decide exposicao.
- Contratos HTTP oficiais permanecem em `snake_case`.
- Browser chama somente o BFF same-origin; endpoints Laravel autenticados nunca sao chamados diretamente pelo browser.
- Componentes de fluxo ficam em `src/components/operational` ou `src/features/people`; `src/components/ui` permanece reservado a primitives sem dominio.
- Usar `shadcn/ui` primitives, `Surface` e tokens existentes; nao criar UI generica de SaaS nem linguagem de dashboard.
- Nomenclatura visivel deve seguir a rotina da secretaria: "visitante", "acompanhamento", "contato", "secretaria".

### Requisitos de teste

- Backend minimo:
  - `cd church-erp-api && php artisan test tests/Feature/People/VisitorManagementTest.php`
  - `cd church-erp-api && php artisan test tests/Feature/People/SecretaryHomeTest.php`
  - `cd church-erp-api && php artisan test`
- Frontend minimo:
  - `cd church-erp-web && npm test -- tests/visitor-management.test.mjs`
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

- Story 4.1 criou `people`, `Person`, `BuildSecretaryHomeService`, `/api/v1/secretary/home`, BFF `/api/secretary/home` e `SecretaryHomeShell`; visitantes devem usar essa fonte, nao uma estrutura paralela.
- Story 4.2 consolidou o padrao de seguranca para dados pessoais: BFF same-origin, allowlist dupla, tenant da sessao, `404` indistinguivel, `403` sem existencia, PII limpa em falhas e audit log sanitizado.
- Story 4.2 ja criou a constraint `people_church_type_email_unique`, que e por `church_id`, `person_type` e `email`; visitantes podem compartilhar email com membros, mas nao com outro visitante do mesmo tenant.
- Story 4.2 atualizou pendencias para excluir `inactive`; preservar esse comportamento para visitantes.
- Se houver extracao de helper entre membro e visitante, executar tambem os testes de membros para provar que a Story 4.2 nao regrediu.
- Reviews anteriores encontraram riscos em parametros de escopo, estados otimistas, logs e linguagem tecnica visivel. Converter cada risco em teste.
- `detect-secrets` ja existe no repositorio com baseline; usar o fluxo atual em vez de ignorar a verificacao.
- Review de seguranca de 2026-08-24: nao tratar `person_type` como campo editavel neste formulario. A promocao visitante-para-membro e prerrogativa da secretaria, mas deve ser modelada como conversao dedicada com autorizacao e auditoria, nao como mass assignment no payload de edicao de visitante.
- Ajuste de governanca de 2026-08-25: `detect-secrets`/`pre-commit` e gate obrigatorio apenas para promocao STG/PROD; ausencia local do scanner nao bloqueia entrada desta story em desenvolvimento.

### Git Intelligence Summary

- `1440f6c implementa 4.2` adicionou rotas Laravel de membros, services, FormRequests, `MemberResource`, `PersonPolicy`, rate limiters, BFFs, paginas visuais, `member-form.tsx`, testes e gate de segredos.
- `5d90bbd Merge pull request #19 from WesleyDenia/story_4_2` incorporou a story de membros no branch atual.
- `3b21760 implementa a story 4.1` criou a home da secretaria e a base unificada de People que esta story deve estender.
- O codigo atual ainda deixa o quick action "Cadastrar visitante" apontando para `/secretaria` com `state = preparing_flow`; esta story deve transformar esse atalho em fluxo real.

### Informacoes tecnicas atuais

- Next.js Route Handlers usam arquivos `route.ts` e exportam metodos HTTP como `GET`, `POST` e `PATCH`; o contexto de rota dinamica entrega `params` como Promise no padrao atual documentado.
- A API `cookies` do Next.js e assincrona nas versoes atuais e pode ler/escrever cookies em Route Handlers; o projeto hoje le o cookie pelo header da `Request`, o que pode continuar se permanecer coberto por testes.
- Laravel 12 suporta Policies para organizar autorizacao por recurso e `throttle:nome` para anexar rate limiters nomeados a rotas; isso combina com o padrao ja usado por membros.

### Project Structure Notes

- `church-erp-api/app/Domain/People/Models/Person.php` existe com `person_type`, `status`, `display_name`, `phone`, `email`, `last_contacted_at`; `church_id` nao deve entrar em `$fillable`. Mesmo se `person_type` permanecer fillable por compatibilidade interna, nenhum caminho de request desta story pode mass assignar esse campo a partir do browser.
- `church-erp-api/database/migrations/2026_08_12_000001_create_people_table.php` ja criou `people` com `person_type in (member, visitor)` e status `active`, `inactive`, `new`, `follow_up_needed`, `contacted`, `needs_update`.
- `church-erp-api/database/migrations/2026_08_18_000001_add_member_indexes_to_people_table.php` adicionou `people_church_type_display_name_index` e `people_church_type_email_unique`, ambos uteis tambem para visitante.
- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php` ja calcula `visitor_follow_up` para visitantes com `new`/`follow_up_needed`, visitantes recentes dos ultimos 30 dias e limite 5.
- `BuildSecretaryHomeService::recentVisitors()` atualmente nao filtra `inactive`; a implementacao desta story deve decidir explicitamente pelo comportamento aprovado nesta story: visitantes `inactive` nao aparecem nem em pendencias nem em visitantes recentes.
- `church-erp-api/routes/api.php` ja tem rotas de membros sob `resolve.internal.session`; rotas de visitantes devem ficar no mesmo grupo.
- `church-erp-web/src/app/api/secretary/members/*` e o padrao mais proximo para BFF autenticado de create/show/update.
- `church-erp-web/src/components/operational/member-form.tsx` e o padrao visual e de estados mais proximo, mas regras de status e labels de visitante devem ficar separadas.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 4, Story 4.3 e padrao frontend.
- `_bmad-output/planning-artifacts/prd.md` - FR-5, Jornada B, NFR-5 e NFR-8.
- `_bmad-output/planning-artifacts/architecture.md` - dominios People/Operations, BFF, tenancy, autorizacao, estrutura e contracts.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - jornada da secretaria, `PeopleFollowupBlock`, padroes de formulario, feedback, navegacao e acessibilidade.
- `_bmad-output/project-context.md` - stack, BFF, componentes, testes e regras criticas.
- `_bmad-output/implementation-artifacts/4-2-cadastrar-e-editar-membros.md` - padrao concreto para People write flows, security notes, STRIDE e licoes.
- `church-erp-api/app/Domain/People/Models/Person.php`
- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php`
- `church-erp-api/app/Domain/People/Services/CreateMemberService.php`
- `church-erp-api/app/Domain/People/Services/UpdateMemberService.php`
- `church-erp-api/app/Policies/PersonPolicy.php`
- `church-erp-api/app/Providers/AppServiceProvider.php`
- `church-erp-api/routes/api.php`
- `church-erp-web/src/app/api/secretary/members/route.ts`
- `church-erp-web/src/app/api/secretary/members/[memberId]/route.ts`
- `church-erp-web/src/components/operational/member-form.tsx`
- `church-erp-web/src/components/operational/secretary-home-shell.tsx`
- Web: https://raw.githubusercontent.com/vercel/next.js/canary/docs/01-app/03-api-reference/03-file-conventions/route.mdx
- Web: https://raw.githubusercontent.com/vercel/next.js/canary/docs/01-app/03-api-reference/04-functions/cookies.mdx
- Web: https://laravel.com/framework/docs/12.x/authorization
- Web: https://laravel.com/framework/docs/12.x/routing#rate-limiting

### Checklist pre-review

- `/secretaria/visitantes/novo` renderiza formulario real protegido por `AreaGuard`.
- `/secretaria/visitantes/[visitorId]/editar` carrega somente visitante do tenant atual e `person_type = visitor`.
- Browser chama somente `/api/secretary/visitors` e `/api/secretary/visitors/{visitorId}`.
- BFF chama Laravel somente server-side por `callLaravel`.
- Rotas Laravel existem sob `/api/v1`, `resolve.internal.session` e rate limiter nomeado.
- `secretary` e `administrator` criam/editam; `treasurer`, `leadership`, sessao ausente e membership inativa nao acessam.
- `church_id` e `person_type` nao sao aceitos do browser.
- Conversao visitante-para-membro nao e aceita por `PATCH /api/secretary/visitors/{visitorId}`; deve ser endpoint/acao dedicado em story futura, com policy, auditoria e testes proprios.
- Payloads com campos extras ou parametros de escopo retornam `422`.
- Dados de outro tenant nao sao lidos nem alterados.
- Membros nao sao lidos/alterados por rotas de visitante.
- Visitante `new` ou `follow_up_needed` entra em pendencia de acompanhamento.
- Visitante `contacted` nao conta como pendencia de acompanhamento.
- Visitante `inactive` nao entra em pendencias nem em visitantes recentes.
- Visitantes recentes respeitam janela de 30 dias, limite 5 e exclusao de `inactive`.
- Email duplicado entre visitantes do mesmo tenant retorna `422`; email igual entre membro e visitante permanece permitido.
- Mensagens de validacao batem exatamente com as mensagens obrigatorias desta story.
- Email e normalizado para lowercase; strings vazias de contato viram `null`.
- `VisitorResource` nao retorna `church_id`, `person_type`, timestamps internos, IDs de usuario ou auditoria tecnica.
- BFF rejeita `visitorId` invalido sem chamar Laravel.
- Mutations BFF nao emitem CORS permissivo, validam `Origin`/`Host` e rejeitam `Origin` ausente ou origem incompatibilizada sem chamar Laravel.
- Rotas BFF autenticadas seguem o padrao atual do sistema para cookie, `callLaravel`, `normalizeAuthResponse` e limpeza de cookie em `401`.
- Respostas e logs nao vazam PII, token, cookie, payload completo, header de auth, exception bruta ou stack trace.
- Audit logs de visitante existem e contem somente metadados sanitizados.
- PATCH sem mudanca real nao gera auditoria enganosa.
- `401`, `403`, `404` e troca de contexto limpam dados pessoais carregados.
- `422` preserva os dados digitados e mostra mensagens por campo.
- Quick action "Cadastrar visitante" esta habilitado e aponta para `/secretaria/visitantes/novo`.
- UI cobre loading, criar pronto, edicao carregada, salvando, salvo, erro de validacao, negado, nao encontrado e erro tecnico.
- UI nao implementa busca/filtros completos, comunicacao, conversao para membro, eventos ou lista geral de pessoas nesta story.
- UI nao usa "dashboard", "widget", "KPI", "performance" ou "BI".
- Testes backend, web, lint, typecheck, smoke build, audits e gate de seguranca passam antes de review.
- `/bmad-review-security` foi executado e findings validos foram incorporados antes de iniciar dev-story.
  - Achados incorporados em 2026-08-24: `person_type` nao pode ser mass-assignable nos endpoints desta story; conversao visitante-para-membro fica documentada como acao dedicada futura.
  - Ajuste incorporado em 2026-08-25: scanner de segredos nao bloqueia dev/local; gate com `detect-secrets`/`pre-commit` permanece obrigatorio para STG/PROD.

### Security Sign-off

- Status: Approved with Security Notes
- Auditor: Vex - Security Auditor
- Data: 2026-08-25
- Findings incorporados: sim; liberado para dev-story com `person_type` protegido contra mass assignment nesta story e gate de segredos exigido apenas para promocao STG/PROD.

### Story Completion Status

- Status alvo desta story para entrada em implementacao: `ready-for-dev`.
- Observacao de gate: story liberada para dev-story. `detect-secrets`/`pre-commit` nao e requisito de dev/local; continua obrigatorio antes de promocao para STG/PROD.
- Nota de conclusao do contexto: `Ultimate context engine analysis completed - comprehensive developer guide created`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Reaproveitar o fluxo seguro da Story 4.2 para criar endpoints Laravel/BFF e UI especificos de visitantes, mantendo tenant scope e allowlist dupla.
- Cobrir primeiro backend com testes de contrato, autorizacao, isolamento por tenant, validacao, auditoria sanitizada, unicidade de email e reflexo na home da secretaria.
- Cobrir web com testes de source inspection e helpers para garantir BFF same-origin, contrato `snake_case`, estados de UI e ausencia de chamada browser direta ao Laravel.
- Atualizar a story somente apos testes passarem, mantendo o registro de arquivos e comandos executados.

### Debug Log References

- `cd church-erp-api && php artisan test tests/Feature/People/VisitorManagementTest.php` - RED inicial falhou por rotas/gates ausentes; GREEN final passou 6 testes / 187 assercoes.
- `cd church-erp-api && php artisan test tests/Feature/People/SecretaryHomeTest.php` - passou 7 testes / 94 assercoes.
- `cd church-erp-api && php artisan test tests/Feature/People/MemberManagementTest.php` - passou 5 testes / 153 assercoes.
- `cd church-erp-api && php artisan test` - passou 124 testes / 1108 assercoes.
- `cd church-erp-web && npm test -- tests/visitor-management.test.mjs` - RED inicial falhou por arquivos ausentes; GREEN final passou junto da suite Node.
- `cd church-erp-web && npm test -- tests/bff-smoke.test.mjs` - passou junto da suite Node.
- `cd church-erp-web && npm test` - passou 73 testes.
- `cd church-erp-web && npm run lint` - passou.
- `cd church-erp-web && npm run typecheck` - uma execucao paralela falhou por artefato `.next` concorrente; rerun apos build passou.
- `cd church-erp-web && npm run build:smoke` - passou e incluiu rotas de visitantes no manifesto.
- `cd church-erp-web && npm test -- tests/visitor-management.test.mjs tests/bff-smoke.test.mjs` - review fix passou 75 testes.
- `cd church-erp-web && npm run typecheck` - review fix passou.
- `cd church-erp-web && npm run lint` - review fix passou.
- `cd church-erp-api && ./vendor/bin/pint --test` - passou.
- `git diff --check` - passou.
- `cd church-erp-api && composer audit` - sem advisories.
- `cd church-erp-api && npm audit --omit=dev` - 0 vulnerabilidades.
- `cd church-erp-web && npm audit --omit=dev` - 0 vulnerabilidades.
- `bash deploy/security-gate.sh dev` - skip esperado do scan de segredos em dev/local.

### Completion Notes List

- Dev agent deve registrar aqui as decisoes de implementacao, comandos executados, falhas corrigidas e qualquer desvio autorizado.
- Gate de seguranca confirmado pelo `Security Sign-off`: Approved with Security Notes, auditor Vex, data 2026-08-25, findings incorporados.
- Implementado contrato Laravel de visitantes sobre `people`, com `person_type = visitor` fixo no service, `church_id` resolvido da sessao autenticada e resource minimizado.
- Implementadas abilities `createVisitor`, `viewVisitor`, `updateVisitor`, throttles nomeados de leitura/escrita e auditoria sanitizada `people_visitor_changed`; PATCH sem mudanca real nao emite log enganoso.
- Implementados BFFs Next.js para create/read/update com same-origin obrigatorio em mutacoes, allowlist de payload, `visitorId` seguro, limpeza de cookie em `401` e sanitizacao de `403/404/5xx`.
- Implementadas paginas protegidas e `VisitorForm` operacional com estados obrigatorios, preservacao de dados em `422`, limpeza de PII em `401/403/404`, status de visitante e proximo passo para cadastrar outro visitante.
- Atualizada home da secretaria para acao real `Cadastrar visitante` e exclusao de visitantes `inactive` dos visitantes recentes.
- Review AI corrigiu os achados HIGH/MEDIUM: formulario de edicao nao fica disponivel apos falha inicial de carregamento, BFF minimiza respostas 2xx, erro 5xx usa mensagem operacional em portugues e testes executam helpers de estado em vez de depender somente de regex.

### Senior Developer Review (AI)

- Review executada em 2026-08-25 contra a File List da story e os arquivos alterados no git.
- Achados corrigidos: 2 HIGH e 3 MEDIUM.
- Resultado apos fixes: aprovado; nenhum HIGH/MEDIUM restante identificado nesta rodada.
- Observacao residual: testes de componente DOM completos ainda nao existem no projeto porque a suite atual usa `node:test` sem ambiente React DOM; a logica critica foi extraida para helper de feature e coberta por testes executaveis.

### File List

- `_bmad-output/implementation-artifacts/4-3-cadastrar-e-editar-visitantes.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `.github/workflows/security-ci.yml`
- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php`
- `church-erp-api/app/Domain/People/Services/CreateVisitorService.php`
- `church-erp-api/app/Domain/People/Services/UpdateVisitorService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ShowVisitorController.php`
- `church-erp-api/app/Http/Controllers/Api/V1/StoreVisitorController.php`
- `church-erp-api/app/Http/Controllers/Api/V1/UpdateVisitorController.php`
- `church-erp-api/app/Http/Requests/ShowVisitorRequest.php`
- `church-erp-api/app/Http/Requests/StoreVisitorRequest.php`
- `church-erp-api/app/Http/Requests/UpdateVisitorRequest.php`
- `church-erp-api/app/Http/Resources/VisitorResource.php`
- `church-erp-api/app/Policies/PersonPolicy.php`
- `church-erp-api/app/Providers/AppServiceProvider.php`
- `church-erp-api/routes/api.php`
- `church-erp-api/tests/Feature/People/SecretaryHomeTest.php`
- `church-erp-api/tests/Feature/People/VisitorManagementTest.php`
- `church-erp-web/src/app/api/secretary/visitors/[visitorId]/route.ts`
- `church-erp-web/src/app/api/secretary/visitors/route.ts`
- `church-erp-web/src/app/secretaria/visitantes/[visitorId]/editar/page.tsx`
- `church-erp-web/src/app/secretaria/visitantes/novo/page.tsx`
- `church-erp-web/src/components/operational/visitor-form.tsx`
- `church-erp-web/src/features/people/visitor-form-state.ts`
- `church-erp-web/src/features/people/visitor.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`
- `church-erp-web/tests/visitor-management.test.mjs`
- `deploy/README.md`
- `deploy/security-gate.sh`

## Change Log

- 2026-08-24: Story criada com contexto completo para cadastro e edicao de visitantes; status definido como `ready-for-dev`.
- 2026-08-24: Review de seguranca incorporado; status ajustado para `security-gate-pending` ate execucao bem-sucedida do gate de segredos e preenchimento do Security Sign-off.
- 2026-08-25: Governanca ajustada para exigir `detect-secrets`/`pre-commit` apenas em STG/PROD; status retornou para `ready-for-dev` com Security Sign-off preenchido.
- 2026-08-25: Implementado cadastro/edicao de visitantes no Laravel, BFF e UI; testes, lint, typecheck, build smoke, audits e gate dev passaram; status movido para `review`.
- 2026-08-25: Achados HIGH/MEDIUM da revisao de codigo corrigidos; BFF/UI/testes ajustados, File List sincronizada e status movido para `done`.
