# Story 4.5: Resolver pendencias operacionais de pessoas

Status: done

<!-- Implementation gate: esta story manipula dados pessoais, autorizacao por perfil, tenant isolation, navegacao contextual e atualizacao de cadastros existentes. O primeiro passo obrigatorio do dev-story e executar /bmad-review-security, incorporar findings validos e preencher o Security Sign-off antes de escrever codigo de produto. Varredura detect-secrets/pre-commit nao bloqueia dev/local; ela permanece gate obrigatorio apenas para promocao STG/PROD. -->

## Story

As a secretaria da igreja,
I want ver pendencias de pessoas e entrar direto no fluxo de resolucao,
so that eu conclua follow-ups e atualizacoes com menos friccao.

## Acceptance Criteria

1. Dado que um usuario com perfil `secretary` ou `administrator` acessa a home da secretaria, quando existirem pendencias de pessoas no tenant atual, entao o sistema apresenta cartoes de pendencia por categoria com contagem, descricao curta, tipo de acao necessaria e preview limitado sem expor dados de outro tenant.
2. Dado que um usuario `treasurer`, `leadership`, sem sessao ou com membership inativa tenta acessar pendencias de pessoas, quando a home, a fila ou a ficha de resolucao forem carregadas, entao o sistema retorna `401` ou `403` sanitizado, limpa cookie em `401` no BFF e nao revela nomes, contatos, contagens ou existencia de registros; os BFFs de edicao de membros e visitantes tambem devem devolver mensagem fixa em `401`, sem repassar `body.message` upstream.
3. Dado que existem visitantes com `person_type=visitor` e status `new` ou `follow_up_needed`, quando a home carrega, entao o cartao `visitor_follow_up` aponta para `/secretaria/pessoas?person_type=visitor&status=new%2Cfollow_up_needed&contact=all` e indica acao de acompanhamento sem criar fluxo de comunicacao.
4. Dado que existem membros ou visitantes nao inativos sem telefone e sem email, quando a home carrega, entao o cartao `missing_contact` aponta para `/secretaria/pessoas?person_type=all&status=all&contact=missing_contact` e indica acao de completar contato.
5. Dado que existem membros com status `needs_update`, quando a home carrega, entao o cartao `needs_update` aponta para `/secretaria/pessoas?person_type=member&status=needs_update&contact=all` e indica acao de conferir cadastro; visitantes nao usam `needs_update` no contrato atual e nao devem aparecer nessa categoria.
6. Dado que uma categoria nao possui pendencias, quando a home carrega, entao essa categoria nao deve produzir cartao acionavel vazio; se nenhuma categoria tiver pendencias, o bloco usa estado vazio honesto sem dados ficticios.
7. Dado que a secretaria seleciona um cartao de pendencia, quando abre a fila filtrada em `/secretaria/pessoas`, entao os filtros da URL preservam a categoria escolhida, a lista mostra somente pessoas elegiveis ao criterio e cada linha mantem diferenciacao textual entre "Membro" e "Visitante".
8. Dado que a secretaria seleciona uma pessoa da fila de pendencias, quando aciona "Abrir cadastro", entao membros abrem `/secretaria/membros/{id}/editar` e visitantes abrem `/secretaria/visitantes/{id}/editar`, com retorno seguro para a fila filtrada ou para `/secretaria`; o retorno contextual e usado apenas para renderizar navegacao no frontend e nunca e enviado como query, payload ou header aos BFFs/Laravel de edicao.
9. Dado que a ficha foi aberta a partir da fila de pendencias, quando o cadastro e salvo com sucesso, entao a tela mostra confirmacao clara e oferece "Voltar para pendencias" preservando os filtros originais e "Voltar para secretaria"; nao deve redirecionar automaticamente antes da confirmacao ficar visivel.
10. Dado que a ficha foi aberta a partir de uma categoria especifica, quando a confirmacao de salvamento aparece, entao a tela identifica de forma simples a fila de retorno, como "Voltar para pendencias de contato", "Voltar para visitantes em acompanhamento" ou "Voltar para cadastros para conferir", sem depender de texto tecnico de query string.
11. Dado que uma pendencia de contato e resolvida, quando telefone ou email passa a estar preenchido e a secretaria volta para a fila, entao a pessoa deixa de aparecer em `contact=missing_contact` apos nova leitura real do BFF/API, e a home recalcula contagem/cartoes em nova leitura de `/api/secretary/home`.
12. Dado que uma pendencia de visitante e resolvida, quando o status do visitante muda para `contacted` ou `inactive`, entao a pessoa deixa de aparecer na fila `person_type=visitor&status=new,follow_up_needed&contact=all` apos nova leitura real, sem atualizar `last_contacted_at` nesta story.
13. Dado que uma pendencia de membro `needs_update` e resolvida, quando o status muda para `active` ou `inactive`, entao a pessoa deixa de aparecer em `person_type=member&status=needs_update&contact=all` apos nova leitura real, e a home recalcula contagem/cartoes em nova leitura de `/api/secretary/home`.
14. Dado que a secretaria altera dados em ficha de membro ou visitante, quando a requisicao chega ao BFF ou Laravel, entao `return_to`, `church_id`, `person_type`, `id`, `role`, `roles`, `permission`, `tenant`, `scope`, timestamps, `last_contacted_at` e campos fora da allowlist continuam rejeitados; o tenant vem somente da sessao autenticada.
15. Dado que o retorno contextual chega via URL, quando o frontend monta links de volta, entao aceita somente caminhos internos allowlisted (`/secretaria` e `/secretaria/pessoas` com filtros permitidos), aplica trim/limite de 80 caracteres para `q`, rejeita parametros repetidos e arrays, e descarta qualquer URL absoluta, protocolo, host externo, `//`, path traversal ou parametro de escopo para cair em `/secretaria`.
16. Dado que a home ou a fila sofre erro tecnico recuperavel, quando existe ultima leitura confiavel, entao pode preservar apenas contagens ou filtros sem nomes/contatos; nunca deve manter PII antiga em estado de erro, logs ou mensagens.
17. Dado que a UI e usada em desktop, tablet ou mobile, quando a secretaria abre cartoes, fila, ficha, salva, recebe erro de validacao ou retorna, entao os estados `loading_secretary_home`, `people_pending_items_loaded`, `empty_people_pending_items`, `people_search_loaded`, `empty_people_search`, `loading_member_form`, `loading_visitor_form`, `member_saved`, `visitor_saved`, `validation_error`, `denied_or_session_invalid`, `not_found` e `server_error` ficam cobertos sem sobreposicao visual, com foco visivel e navegacao por teclado.
18. Dado que esta story entra em review, quando os testes forem executados, entao backend, BFF e frontend provam autorizacao por perfil, tenant isolation, hrefs exatos dos cartoes, retorno seguro, resolucao natural das pendencias por atualizacao de cadastro, recomputacao da home apos resolucao, ausencia de chamada Laravel pelo browser, sanitizacao de erro, preservacao de filtros e ausencia de termos genericos como "dashboard", "widget", "KPI", "performance" ou "BI" nos textos visiveis da secretaria.
19. Dado que esta story esta marcada como `ready-for-dev`, quando um dev agent iniciar dev-story, entao pode executar somente o gate inicial de seguranca ate que `/bmad-review-security` tenha sido executado, findings validos tenham sido incorporados nesta story e o Security Sign-off esteja preenchido; codigo de produto fica bloqueado ate esse gate estar concluido.

## Tasks / Subtasks

- [x] Executar gate de seguranca antes de iniciar dev-story (AC: 19)
  - [x] Rodar `/bmad-review-security` contra esta story.
  - [x] Incorporar findings validos diretamente nesta story antes de escrever codigo.
  - [x] Preencher `Security Sign-off` com status, auditor e data.
  - [x] Interromper qualquer escrita de codigo de produto se o sign-off ainda estiver pendente; dev-story pode executar somente este gate inicial.

- [x] Consolidar contrato de pendencias de pessoas na home da secretaria (AC: 1-6, 16)
  - [x] Reutilizar `BuildSecretaryHomeService`; nao criar tabela de tarefas, inbox paralela, projection persistida ou endpoint novo se o contrato atual atender.
  - [x] Manter `pendingPeopleQuery`, `visitorFollowUpQuery`, `missingContactQuery` e `needsUpdateQuery` como fonte unica das categorias de pendencia desta story.
  - [x] Garantir que `visitor_follow_up`, `missing_contact` e `needs_update` usem exatamente os hrefs definidos nos ACs.
  - [x] Restringir `needs_update` a `person_type=member`; visitantes nao possuem esse status nos contratos de edicao atuais.
  - [x] Manter previews limitados (`limit(3)`) e sem `id`, `church_id`, email bruto, telefone bruto, timestamps, auditoria ou usuario.
  - [x] Tratar categoria sem contagem como ausente da lista de cartoes; tratar ausencia total como `empty_people_pending_items`.
  - [x] Manter `recent_visitors` e blocos de eventos/comunicacao sem novas responsabilidades de resolucao.

- [x] Implementar retorno contextual seguro da fila para as fichas existentes (AC: 7-10, 15)
  - [x] Em `PersonSearchList`, construir `primary_action_href` com retorno para a URL atual somente no client, sem alterar o contrato Laravel de `PersonSearchResource` para conhecer contexto de browser.
  - [x] Criar helper testavel em `src/features/people/person-resolution-return.ts` ou nome equivalente para validar e serializar retorno.
  - [x] Aceitar retorno apenas para `/secretaria` ou `/secretaria/pessoas` com query params de busca permitidos (`q`, `person_type`, `status`, `contact`, `page`, `per_page`); aplicar trim e maximo 80 em `q`; rejeitar protocolos, host externo, `//`, path traversal, parametros de escopo, repetidos e arrays.
  - [x] Atualizar paginas `src/app/secretaria/membros/[memberId]/editar/page.tsx` e `src/app/secretaria/visitantes/[visitorId]/editar/page.tsx` para ler `searchParams` no padrao async do App Router e passar o retorno sanitizado aos forms.
  - [x] Atualizar `MemberForm` e `VisitorForm` para aceitar `returnHref?: string` em modo edit e renderizar "Voltar para pendencias" apos salvar quando o retorno aponta para `/secretaria/pessoas`.
  - [x] Derivar label de retorno pela categoria/filtros sanitizados, sem exibir query string crua para o usuario.
  - [x] Garantir que `return_to` nunca seja anexado aos fetches de `GET`/`PATCH` para `/api/secretary/members/*` ou `/api/secretary/visitors/*`.
  - [x] Manter "Voltar para secretaria" como fallback sempre seguro.

- [x] Provar resolucao natural das pendencias sem novo estado persistido (AC: 11-14)
  - [x] Confirmar que resolver `missing_contact` significa salvar telefone ou email na ficha existente.
  - [x] Confirmar que resolver `visitor_follow_up` significa alterar visitante de `new` ou `follow_up_needed` para `contacted` ou `inactive`; nao criar envio de WhatsApp nem comunicacao automatica.
  - [x] Confirmar que resolver `needs_update` significa alterar membro para `active` ou `inactive`; nao tentar resolver `needs_update` em visitantes nesta story.
  - [x] Nao atualizar `last_contacted_at` nesta story; o campo continua fora de payload, response minimizada e formularios.
  - [x] Reutilizar `UpdateMemberService`, `UpdateVisitorService`, `UpdateMemberRequest`, `UpdateVisitorRequest`, BFFs de membros/visitantes e resources existentes.
  - [x] Garantir que `return_to`, `person_type`, `last_contacted_at` e escopo/tenant continuem rejeitados no backend e no BFF.
  - [x] Provar que a home recalcula `people_pending_items.total_count` e a presenca/ausencia de cartoes apos nova leitura real.

- [x] Ajustar UX operacional sem criar modulo novo (AC: 7-10, 17)
  - [x] Manter os cartoes em `PeopleFollowupBlock` como entrada para filas filtradas reais, reaproveitando `OperationalPendingBlock` somente se isso reduzir duplicacao sem reestruturar a home.
  - [x] Na fila, deixar claro quando a lista representa pendencias e qual filtro esta ativo, sem usar texto tecnico nem linguagem de dashboard.
  - [x] Apos salvar ficha vinda de uma pendencia, exibir confirmacao com proximo passo visivel; nao esconder erro de validacao nem limpar dados digitados em erro recuperavel.
  - [x] Garantir layout responsivo com controles sem sobreposicao em mobile, tablet e desktop.
  - [x] Garantir foco visivel e labels acessiveis nos botoes de retorno e nos formularios.

- [x] Cobrir backend com testes de feature e source inspection (AC: 1-6, 11-14, 16, 18)
  - [x] Ampliar `church-erp-api/tests/Feature/People/SecretaryHomeTest.php` para provar hrefs exatos dos cartoes e ausencia de categorias vazias.
  - [x] Ampliar `PeopleSearchTest.php`, `MemberManagementTest.php` e `VisitorManagementTest.php` para provar que salvar os campos/status corretos remove a pessoa da fila correspondente apos nova leitura.
  - [x] Ampliar testes da home para provar recomputacao de `total_count` e remocao/criacao de cartoes apos resolver contato, visitante em acompanhamento e membro `needs_update`.
  - [x] Testar que roles proibidos, sessao ausente e membership inativa nao recebem contagens, nomes ou previews.
  - [x] Testar rejeicao de `return_to`, `church_id`, `tenant`, `scope`, `role`, `roles`, `permission`, `person_type`, `id`, timestamps, `last_contacted_at` e payload/query fora da allowlist nos endpoints de edicao relevantes.
  - [x] Verificar que a home nao loga payload de pessoas nem PII em erro.

- [x] Cobrir BFF e frontend com os testes atuais do projeto (AC: 2, 7-10, 15-18)
  - [x] Ampliar `church-erp-web/tests/secretary-home.test.mjs` para exigir os hrefs de pendencias e bloqueio de termos visiveis proibidos.
  - [x] Ampliar `church-erp-web/tests/people-search.test.mjs` para provar que a linha monta link de edicao com retorno seguro para a fila filtrada atual.
  - [x] Criar ou ampliar teste do helper de retorno para cobrir URL absoluta, host externo, `//`, path traversal, query param repetido, array, `q` acima de 80 caracteres apos trim, parametro de escopo e fallback para `/secretaria`.
  - [x] Ampliar `member-management.test.mjs` e `visitor-management.test.mjs` para provar botoes "Voltar para pendencias" e "Voltar para secretaria" no estado salvo de edicao.
  - [x] Ampliar testes dos BFFs de membro/visitante para provar que `return_to` em query e rejeitado e que `401` upstream retorna mensagem fixa sanitizada.
  - [x] Manter testes de BFF provando que browser chama somente rotas `/api/secretary/*`, nunca `/api/v1/*` nem `API_BASE_URL`.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story fecha o ciclo operacional do Epic 4: a secretaria sai da home, entra na fila/ficha certa e volta com a pendencia naturalmente resolvida pelos dados reais.
- A base ja existe: tabela `people`, model `Person`, home da secretaria, busca unificada `/secretaria/pessoas`, BFF `/api/secretary/people`, endpoint Laravel `GET /api/v1/people` e edicao de membros/visitantes.
- Pendencia nesta story nao e uma nova entidade persistida; e uma leitura derivada de status e contato em `people`.
- O fluxo principal e: home da secretaria -> cartao de pendencia -> fila filtrada -> ficha existente -> salvar -> retorno seguro para fila/home.
- O usuario precisa perceber continuidade e baixa friccao, mas o sistema nao deve automatizar comunicacao, criar checklist persistente, converter visitante em membro ou criar workflow de eventos.

### Guardrails de implementacao obrigatorios

- Reutilizar a tabela `people` e os services atuais; nao criar `people_tasks`, `operational_inbox`, `pending_items` persistido ou busca externa.
- `church_id` vem exclusivamente de `authenticated_session.membership`; nenhum query param, payload, cookie custom ou valor do browser pode alterar tenant.
- Browser chama somente BFFs Next.js same-origin (`/api/secretary/home`, `/api/secretary/people`, `/api/secretary/members/*`, `/api/secretary/visitors/*`).
- Laravel continua autoridade final para autorizacao, tenant scope, validacao e persistencia.
- Retorno contextual e comportamento de UI; nao coloque `return_to` em Resource Laravel, BFF upstream request ou regra de dominio.
- Sanitizar retorno de URL com allowlist estrita antes de renderizar `href`; evitar open redirect e vazamento de parametros de escopo.
- Nao manter PII antiga em erro tecnico; se preservar estado recuperado, limitar a contagens/filtros.
- `needs_update` pertence ao fluxo de membros nesta story; visitantes sao acompanhados por `new`, `follow_up_needed`, `contacted` ou `inactive`.
- `last_contacted_at` nao entra nesta entrega: nao aceitar no payload, nao expor em response e nao atualizar ao marcar visitante como `contacted`.
- Nao transformar o fluxo em comunicacao: WhatsApp, modelos de mensagem e handoff pertencem ao Epic 5.
- Nao usar termos visiveis "dashboard", "widget", "KPI", "performance" ou "BI" nas telas da secretaria.

### Abordagens proibidas

- Criar modulo paralelo de pendencias operacionais persistidas para cumprir esta story.
- Fazer chamada autenticada direta do browser para Laravel.
- Aceitar `return_to`, `church_id`, `tenant`, `scope`, `role`, `roles`, `permission`, `person_type`, `id`, `last_contacted_at` ou timestamps vindos do browser como autorizacao, escopo ou alteracao permitida.
- Resolver pendencia por flag cosmetica no frontend sem atualizar o cadastro real.
- Considerar pendencia resolvida apenas por clicar em um cartao.
- Redirecionar automaticamente apos salvar antes de exibir confirmacao.
- Adicionar Jest, Vitest, Playwright, Redux/Zustand ou biblioteca UI nova.
- Escrever SQL manual interpolado ou query sem `forChurch($churchId)`.
- Criar ResourceCollection customizada para listas paginadas.

### Arquivos provaveis a alterar ou criar

- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php`
- `church-erp-api/tests/Feature/People/SecretaryHomeTest.php`
- `church-erp-api/tests/Feature/People/PeopleSearchTest.php`
- `church-erp-api/tests/Feature/People/MemberManagementTest.php`
- `church-erp-api/tests/Feature/People/VisitorManagementTest.php`
- `church-erp-web/src/components/operational/people-followup-block.tsx`
- `church-erp-web/src/components/operational/person-search-list.tsx`
- `church-erp-web/src/components/operational/member-form.tsx`
- `church-erp-web/src/components/operational/visitor-form.tsx`
- `church-erp-web/src/app/secretaria/membros/[memberId]/editar/page.tsx`
- `church-erp-web/src/app/secretaria/visitantes/[visitorId]/editar/page.tsx`
- `church-erp-web/src/features/people/person-resolution-return.ts`
- `church-erp-web/tests/secretary-home.test.mjs`
- `church-erp-web/tests/people-search.test.mjs`
- `church-erp-web/tests/member-management.test.mjs`
- `church-erp-web/tests/visitor-management.test.mjs`

### Estados obrigatorios da UI ou do fluxo

- Home: `loading_secretary_home`, `secretary_home_loaded`, `empty_secretary_home`, `people_pending_items_loaded`, `empty_people_pending_items`, `denied_or_session_invalid`, `server_error`, `technical_recovered_without_pii`.
- Fila: `people_search_ready`, `loading_people_search`, `people_search_loaded`, `empty_people_search`, `validation_error`, `denied_or_session_invalid`, `server_error`.
- Ficha de membro: `loading_member_form`, `editing_loaded`, `saving_member`, `member_saved`, `validation_error`, `denied_or_session_invalid`, `not_found`, `server_error`.
- Ficha de visitante: `loading_visitor_form`, `editing_loaded`, `saving_visitor`, `visitor_saved`, `validation_error`, `denied_or_session_invalid`, `not_found`, `server_error`.
- Estado salvo vindo de pendencia deve mostrar confirmacao e acoes de retorno; estado de erro deve preservar formulario quando recuperavel e limpar PII em `401`, `403`, `404` ou erro de carregamento.

### Requisitos tecnicos obrigatorios

- Stack local verificada: Laravel `^12.0` em PHP `^8.3`; PHPUnit `^12.5.12`; Next.js `^16.2.12`; React `19.2.4`; Tailwind CSS `^4`; testes web com `node --test`.
- Cartoes de pendencia atuais:
  - `visitor_follow_up`: visitantes `new` ou `follow_up_needed`, href `/secretaria/pessoas?person_type=visitor&status=new%2Cfollow_up_needed&contact=all`.
- `missing_contact`: pessoa nao inativa sem `phone` e sem `email`, href `/secretaria/pessoas?person_type=all&status=all&contact=missing_contact`.
- `needs_update`: membro com `status=needs_update`, href `/secretaria/pessoas?person_type=member&status=needs_update&contact=all`; visitantes nao entram nessa categoria.
- O retorno seguro deve ser serializado preferencialmente como `return_to` codificado, mas validado antes de qualquer renderizacao de `Link`.
- `return_to` valido deve manter somente `/secretaria` ou `/secretaria/pessoas` e query params permitidos pela busca.
- `return_to` valido com `q` deve aplicar trim e limite de 80 caracteres; retornos invalidos, ausentes ou suspeitos devem cair para `/secretaria`.
- `return_to` nunca deve ser repassado aos BFFs/Laravel de edicao; as rotas atuais devem continuar rejeitando qualquer query param.
- BFFs de edicao de membros/visitantes devem sanitizar `401` com mensagem fixa, sem confiar em `body.message` upstream.
- A home deve ser lida novamente depois da resolucao para recalcular contagens/cartoes; nao use decremento otimista como fonte de verdade.
- Ao voltar para a fila, a nova leitura deve vir do BFF/API; nao remova item localmente como se estivesse resolvido sem confirmacao persistida.
- `primary_action_href` do Laravel continua apontando para a ficha base; o frontend pode anexar retorno contextual a partir da URL atual.

### Compliance de arquitetura

- Backend Laravel e fonte de verdade para dominio, autorizacao, validacao e tenant.
- Controllers e route handlers devem continuar finos; orchestration pertence a services/helpers coesos.
- Endpoints Laravel ficam sob `/api/v1` e `resolve.internal.session`; BFFs ficam sob `src/app/api/secretary`.
- Contratos HTTP oficiais permanecem em `snake_case`.
- `JsonResource` e formato Laravel padrao devem ser preservados em listas.
- Componentes base continuam em `src/components/ui`; componentes operacionais ficam em `src/components/operational`; helpers de dominio ficam em `src/features/people`.
- Estado compartilhado global nao e necessario; use estado local/componentizado.
- UX deve manter linguagem pastoral/operacional, com blocos e acoes claras, sem UI generica de SaaS.

### Requisitos de teste

- Backend minimo:
  - `cd church-erp-api && php artisan test tests/Feature/People/SecretaryHomeTest.php`
  - `cd church-erp-api && php artisan test tests/Feature/People/PeopleSearchTest.php`
  - `cd church-erp-api && php artisan test tests/Feature/People/MemberManagementTest.php`
  - `cd church-erp-api && php artisan test tests/Feature/People/VisitorManagementTest.php`
  - `cd church-erp-api && php artisan test`
- Frontend minimo:
  - `cd church-erp-web && npm test -- tests/secretary-home.test.mjs`
  - `cd church-erp-web && npm test -- tests/people-search.test.mjs`
  - `cd church-erp-web && npm test -- tests/member-management.test.mjs`
  - `cd church-erp-web && npm test -- tests/visitor-management.test.mjs`
  - `cd church-erp-web && npm test`
  - `cd church-erp-web && npm run lint`
  - `cd church-erp-web && npm run typecheck`
  - `cd church-erp-web && npm run build:smoke`
- Seguranca/tooling antes de review:
  - `cd church-erp-api && composer audit`
  - `cd church-erp-api && npm audit --omit=dev`
  - `cd church-erp-web && npm audit --omit=dev`
  - `bash deploy/security-gate.sh dev`; em `dev`/`local` o gate registra skip explicito e nao exige `detect-secrets` ou `pre-commit`.
  - Antes de promocao para STG/PROD, executar `bash deploy/security-gate.sh stg|prod` em ambiente com `pre-commit` ou `detect-secrets==1.5.0` instalado.

### Licoes de stories ou reviews anteriores

- Story 4.1 criou a home da secretaria, `PeopleFollowupBlock`, `BuildSecretaryHomeService`, blocos indisponiveis de eventos/comunicacao e checklist semanal nao persistido.
- Story 4.2 consolidou edicao de membros sobre `people`, tenant pela sessao, allowlist de payload, `404` sem vazamento cross-tenant e logs tecnicos sem payload sensivel.
- Story 4.3 consolidou visitantes na mesma tabela `people`, com status `new`, `follow_up_needed`, `contacted`, `inactive`; conversao visitante-para-membro ficou explicitamente fora do endpoint.
- Story 4.4 criou busca unificada, filtros reais, BFF `/api/secretary/people`, endpoint Laravel `/api/v1/people`, `PersonSearchResource`, sanitizacao de erros e links base para fichas de edicao.
- Reviews da 4.4 corrigiram dois riscos que esta story deve proteger desde o inicio: query invalida nao pode ser normalizada para busca valida, e `401`/erros upstream nao podem repassar mensagens sensiveis.
- Hrefs de home ja foram alterados na 4.4; esta story deve preservar `visitor_follow_up` e `missing_contact`, ajustar `needs_update` para membros resolviveis e adicionar resolucao/retorno, nao refazer a busca.
- `people_search_ready` existe como estado inicial real; nao transformar novamente em branch morta.
- Gate de segredos local nao bloqueia dev-story; promocao STG/PROD continua exigindo scanner conforme governanca atual.

### Git Intelligence Summary

- `a53eb02 implementa a story 4.4` adicionou busca unificada, BFF de pessoas, service Laravel, resource minimizado, testes e atualizacao dos hrefs da home.
- `cf0f340 Merge pull request #20 from WesleyDenia/story_4-3` incorporou cadastro/edicao de visitantes e governanca de seguranca.
- `96d3861 implementa a story 4.3` adicionou rotas e forms de visitantes, mantendo conversao fora do escopo.
- `5d90bbd Merge pull request #19 from WesleyDenia/story_4_2` incorporou membros sobre `people`.
- A sequencia recente mostra padrao consistente: BFF same-origin, Laravel como autoridade, testes de feature no backend e source inspection com `node:test` no frontend.

### Informacoes tecnicas atuais

- Next.js App Router Route Handlers continuam definidos por `route.ts` dentro de `app` e exportam metodos HTTP como `GET`, `POST` e `PATCH`; use-os para BFFs, nao API Routes de `pages`.
- `useSearchParams` le a query string no client e `useRouter` permite navegacao programatica; ao montar retorno, sanitize antes de passar para `router.replace` ou `Link`.
- Laravel 12 documenta Gates/Policies como caminho principal para autorizacao organizada; manter `PersonPolicy` e `Gate::forUser`/abilities existentes.
- Laravel HTTP tests simulam requisicoes internamente e oferecem assertions JSON/HTTP adequadas para provar autorizacao, tenant isolation, validacao e sanitizacao.
- Laravel API Resources continuam adequados para expor recursos minimizados; nao mover formato de lista para wrapper customizado.

### Project Structure Notes

- `Person` esta em `app/Domain/People/Models/Person.php` e possui `person_type`, `status`, `display_name`, `phone`, `email`, `last_contacted_at`; `church_id` nao esta em `$fillable`.
- `BuildSecretaryHomeService` ja calcula `visitor_follow_up`, `missing_contact` e `needs_update`, com previews limitados e hrefs filtrados para `/secretaria/pessoas`; `needs_update` precisa ficar alinhado ao contrato de status de membros.
- `PersonPolicy` permite area de secretaria para `secretary` e `administrator`; nao enfraquecer abilities existentes.
- Rotas Laravel de People ja ficam sob `resolve.internal.session`; edicoes de membros/visitantes usam rotas separadas por tipo.
- Edit pages de membro/visitante usam `params` async do App Router e `AreaGuard`.
- `MemberForm` e `VisitorForm` hoje voltam para `/secretaria`; esta story deve aceitar retorno seguro sem remover esse fallback.
- `PersonSearchList` ja usa filtros por URL, `AbortController`, BFF `/api/secretary/people` e estados explicitos.
- `PersonSearchResource` nao deve passar a conhecer o retorno de UI; esse contexto pertence ao frontend.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 4, Story 4.5, FR23b/FR24b e padrao frontend.
- `_bmad-output/planning-artifacts/prd.md` - Jornada B, FR-5, FR-6, NFR-5, NFR-6 e NFR-8.
- `_bmad-output/planning-artifacts/architecture.md` - dominios People/Operations, BFF, tenancy, policies, estrutura de projeto e contratos HTTP.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - home da secretaria, `OperationalPendingBlock`, `PeopleFollowupBlock`, Search and Filtering, feedback, navegacao, responsividade e acessibilidade.
- `_bmad-output/project-context.md` - stack, BFF, testes, arquitetura, seguranca e regras criticas para agentes.
- `_bmad-output/implementation-artifacts/4-4-pesquisar-e-filtrar-pessoas.md` - contexto anterior direto, licoes, links e padroes de busca/filtros.
- `church-erp-api/app/Domain/People/Models/Person.php`
- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php`
- `church-erp-api/app/Domain/People/Services/UpdateMemberService.php`
- `church-erp-api/app/Domain/People/Services/UpdateVisitorService.php`
- `church-erp-api/app/Http/Requests/UpdateMemberRequest.php`
- `church-erp-api/app/Http/Requests/UpdateVisitorRequest.php`
- `church-erp-api/app/Policies/PersonPolicy.php`
- `church-erp-api/routes/api.php`
- `church-erp-web/src/components/operational/people-followup-block.tsx`
- `church-erp-web/src/components/operational/person-search-list.tsx`
- `church-erp-web/src/components/operational/member-form.tsx`
- `church-erp-web/src/components/operational/visitor-form.tsx`
- Web: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Web: https://nextjs.org/docs/app/api-reference/functions/use-search-params
- Web: https://nextjs.org/docs/app/api-reference/functions/use-router
- Web: https://laravel.com/framework/docs/12.x/authorization
- Web: https://laravel.com/framework/docs/12.x/http-tests
- Web: https://laravel.com/framework/docs/12.x/eloquent-resources

### Checklist pre-review

- `/bmad-review-security` foi executado, findings validos foram incorporados e Security Sign-off foi preenchido antes de codigo de produto.
- Home da secretaria mostra pendencias por categoria somente para `secretary` e `administrator`.
- `treasurer`, `leadership`, sessao ausente e membership inativa nao recebem nomes, contatos, contagens ou existencia de pessoas.
- Cartoes `visitor_follow_up`, `missing_contact` e `needs_update` usam os hrefs exatos definidos na story.
- Categoria sem pendencia nao gera cartao acionavel vazio; ausencia total usa estado vazio honesto.
- Browser chama somente BFFs `/api/secretary/*`; Laravel autenticado nunca e chamado diretamente pelo browser.
- Toda leitura ou atualizacao Laravel permanece escopada por `church_id` da sessao.
- `return_to` aceita apenas `/secretaria` e `/secretaria/pessoas` com filtros permitidos; URL externa, protocolo, host, `//`, path traversal, parametro repetido, array, `q` acima de 80 e escopo proibido caem para `/secretaria`.
- Links da fila abrem ficha de membro ou visitante com retorno seguro para a fila filtrada atual.
- Apos salvar ficha aberta por pendencia, UI mostra confirmacao e botoes "Voltar para pendencias" e "Voltar para secretaria".
- `return_to` nunca e enviado aos fetches BFF/Laravel de edicao.
- Apos resolver contato, nova leitura remove pessoa de `contact=missing_contact`.
- Apos mudar visitante para `contacted` ou `inactive`, nova leitura remove pessoa de `visitor_follow_up`.
- Apos mudar membro `needs_update` para `active` ou `inactive`, nova leitura remove pessoa de `person_type=member&status=needs_update`.
- Home recalcula contagens/cartoes apos nova leitura real de `/api/secretary/home`.
- Backend/BFF continuam rejeitando `return_to`, campos de escopo, `person_type`, `id`, timestamps, `last_contacted_at` e campos fora da allowlist.
- BFFs de membro/visitante sanitizam `401` upstream com mensagem fixa.
- Estados de loading, vazio, sucesso, validacao, negacao, nao encontrado e erro tecnico estao visiveis e sem sobreposicao responsiva.
- Foco, labels e navegacao por teclado funcionam nos retornos e formularios.
- Erros tecnicos nao mantem PII antiga nem repassam SQL, stack trace, token, cookie, headers, payload ou mensagem upstream sensivel.
- Testes backend, frontend, lint, typecheck, smoke build, audits e gate de seguranca dev passam antes de review.
- Textos visiveis da secretaria nao usam "dashboard", "widget", "KPI", "performance" ou "BI".

### Threat Modeling - STRIDE

**Escopo:** Story 4.5 - resolver pendencias operacionais de pessoas.
**Fronteiras de confianca:** browser autenticado da secretaria -> BFF Next.js same-origin (`/api/secretary/*`) -> Laravel `/api/v1` com `resolve.internal.session` -> banco de dados tenant-scoped por `church_id`.
**Entradas:** filtros da home/fila (`q`, `person_type`, `status`, `contact`, `page`, `per_page`), parametro de UI `return_to`, cookies de sessao, payloads `PATCH` de membros/visitantes e respostas upstream Laravel consumidas pelos BFFs.
**Saidas:** cartoes de pendencia com contagens/previews minimizados, lista paginada de pessoas, fichas de membro/visitante, confirmacoes de salvamento, erros sanitizados e logs tecnicos sem payload sensivel.
**Dados sensiveis:** nomes, tipo de pessoa, status pastoral/operacional, telefone, email, identificadores internos, `church_id`, sessao/cookie, headers internos e detalhes de infraestrutura.
**Autenticacao:** sessao resolvida pelo BFF e validada no Laravel via middleware interno; `401` limpa cookie no BFF e usa mensagem fixa sem repassar `body.message` upstream.
**Autorizacao:** somente `secretary` e `administrator` ativos acessam home, fila e fichas; Laravel permanece autoridade final por policy/membership e tenant vem exclusivamente da sessao autenticada.
**Limites de payload e abuso:** allowlist estrita de query/payload, rejeicao de parametros repetidos/arrays/escopo, `q` com trim e limite de 80 caracteres, paginacao controlada, previews `limit(3)` e nenhum endpoint novo para inbox/tarefas persistidas.

| STRIDE | Pergunta adversarial | Mitigacao obrigatoria | Status |
| --- | --- | --- | --- |
| Spoofing | Como um atacante poderia se passar por secretaria, administrador ou outro tenant? | Exigir sessao valida, membership ativa e role `secretary` ou `administrator` no BFF e no Laravel; ignorar `church_id`, `tenant`, `role`, `roles`, `permission` e qualquer escopo vindo do browser. | Obrigatorio na implementacao |
| Tampering | Como filtros, `return_to`, IDs ou payloads de ficha poderiam ser alterados para mudar escopo ou estado indevido? | Validar `return_to` por allowlist antes de renderizar link; rejeitar URL absoluta, protocolo, host externo, `//`, path traversal, parametro repetido, array e parametros de escopo; manter FormRequests/BFF allowlists rejeitando campos fora do contrato. | Obrigatorio na implementacao |
| Repudiation | Como provar quem alterou cadastro e impedir negacao posterior sem expor PII em logs? | Manter autoria pela sessao/membership autenticada e preservar trilha tecnica existente sem registrar payload completo, contatos, tokens, cookies, headers de auth, SQL ou stack trace em respostas/logs expostos. | Obrigatorio na implementacao |
| Information Disclosure | Que PII, segredo, dado interno ou existencia de registro poderia vazar? | Minimizar previews sem `id`, `church_id`, email/telefone bruto, timestamps ou auditoria; retornar `401`/`403`/`404` sanitizados sem nomes, contatos, contagens ou existencia cross-tenant; limpar PII antiga em erro tecnico. | Obrigatorio na implementacao |
| Denial of Service | Como filtros, paginação ou estados de erro poderiam degradar o servico ou manter dados sensiveis antigos? | Aplicar limites em `q`, `page`, `per_page` e previews; usar novas leituras reais do BFF/API apos resolucao; nao criar projection/inbox persistida nem comunicacao automatica; cancelar fetches obsoletos no frontend quando aplicavel. | Obrigatorio na implementacao |
| Elevation of Privilege | Como `treasurer`, `leadership`, usuario sem sessao ou membership inativa poderia acessar/alterar pendencias? | Reforcar policy Laravel, BFF same-origin e testes negativos para roles proibidos, sessao ausente, membership inativa e tenant cruzado; browser nunca chama Laravel autenticado diretamente. | Obrigatorio na implementacao |

### Security Sign-off

- Status: Approved with Security Notes
- Auditor: Vex - Security Auditor
- Data: 2026-09-02
- Findings incorporados: SEC-H-001 STRIDE formal adicionado; SEC-M-001 sign-off preenchido.
- Gates executados: `composer audit` em `church-erp-api`; `npm audit --omit=dev` em `church-erp-api`; `npm audit --omit=dev` em `church-erp-web`; `bash deploy/security-gate.sh dev`; grep focalizado para segredos obvios em arquivos versionaveis.
- Notas de seguranca: aprovacao condicionada a implementacao preservar todas as mitigacoes STRIDE, testes negativos e gates de review listados nesta story; promocao STG/PROD continua exigindo `bash deploy/security-gate.sh stg|prod` em ambiente com `pre-commit` ou `detect-secrets==1.5.0`.

### Story Completion Status

- Status final desta story: `done`.
- Observacao de gate: `/bmad-review-security` inicial executado e Security Sign-off preenchido; mitigacoes obrigatorias preservadas na implementacao e no review.
- Nota de conclusao do contexto: `Ultimate context engine analysis completed - comprehensive developer guide created`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cd church-erp-api && php artisan test tests/Feature/People/SecretaryHomeTest.php tests/Feature/People/PeopleSearchTest.php tests/Feature/People/MemberManagementTest.php tests/Feature/People/VisitorManagementTest.php` - PASS, 27 tests / 664 assertions.
- `cd church-erp-web && node --test --loader ./tests/node-alias-loader.mjs tests/people-search.test.mjs tests/member-management.test.mjs tests/visitor-management.test.mjs` - PASS, 17 tests.
- `cd church-erp-web && npm run typecheck` - PASS.
- `cd church-erp-web && npm run lint` - PASS.
- `cd church-erp-api && composer audit` - PASS, no advisories.
- `cd church-erp-web && npm audit --omit=dev` - PASS, 0 vulnerabilities.
- `cd church-erp-api && npm audit --omit=dev` - PASS, 0 vulnerabilities.
- `cd church-erp-api && php artisan test` - PASS, 133 tests / 1338 assertions.
- `cd church-erp-web && npm test` - PASS, 80 tests.
- `cd church-erp-web && npm run build:smoke` - PASS.
- `bash deploy/security-gate.sh dev` - PASS, secret scan explicitly skipped for dev/local per governance.
- `cd church-erp-api && php artisan test tests/Feature/People/SecretaryHomeTest.php tests/Feature/People/PeopleSearchTest.php tests/Feature/People/MemberManagementTest.php tests/Feature/People/VisitorManagementTest.php` - PASS apos review, 28 tests / 670 assertions.
- `cd church-erp-web && node --test --loader ./tests/node-alias-loader.mjs tests/people-search.test.mjs tests/member-management.test.mjs tests/visitor-management.test.mjs tests/secretary-home.test.mjs` - PASS apos review, 22 tests.
- `cd church-erp-web && npm test` - PASS apos review, 81 tests.
- `cd church-erp-web && npm run typecheck` - PASS apos review.
- `cd church-erp-web && npm run lint` - PASS apos review.
- `cd church-erp-api && php artisan test` - PASS apos review, 134 tests / 1344 assertions.

### Implementation Plan

- Reuse derived `people` queries for operational pendencies, tightening `needs_update` to members and preventing inactive people from appearing in missing-contact queues.
- Keep Laravel resources unaware of browser return context; build the edit return URL in `PersonSearchList` using a frontend helper with strict allowlist validation.
- Pass sanitized `return_to` through App Router edit pages into existing forms and render contextual post-save return actions without sending `return_to` to BFF/Laravel fetches.
- Extend backend and web source/runtime tests around tenant isolation, exact hrefs, natural resolution after real reads, BFF sanitization and forbidden visible language.

### Completion Notes List

- Restricted secretary-home `needs_update` pendencies to members and updated the card href to `/secretaria/pessoas?person_type=member&status=needs_update&contact=all`.
- Ensured `contact=missing_contact` queues exclude inactive people at the Laravel list service layer.
- Added `person-resolution-return.ts` to sanitize and label contextual returns; it rejects absolute URLs, external hosts, protocol-relative paths, path traversal, repeated/array params, scope params and long `q`.
- Updated people search rows to append encoded `return_to` only to frontend edit links; Laravel `PersonSearchResource` remains context-free.
- Updated member/visitor edit pages and forms to show contextual return actions after successful saves while preserving `/secretaria` as the safe fallback.
- Hardened member/visitor BFF `401` handling to return the fixed session-invalid message instead of upstream `body.message`.
- Added backend and web tests proving exact pendency contracts, natural resolution after real reads, BFF allowlists, sanitized returns and no direct browser calls to Laravel.
- Applied code-review fixes for safe return URL host confusion via backslash, fixed `per_page` bounds in contextual return, sanitized secretary-home `401`/`403`/`5xx` responses, sanitized member BFF `5xx` responses and suppressed no-op member audit logs.

### File List

- `_bmad-output/implementation-artifacts/4-5-resolver-pendencias-operacionais-de-pessoas.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php`
- `church-erp-api/app/Domain/People/Services/ListPeopleService.php`
- `church-erp-api/app/Domain/People/Services/UpdateMemberService.php`
- `church-erp-api/tests/Feature/People/MemberManagementTest.php`
- `church-erp-api/tests/Feature/People/PeopleSearchTest.php`
- `church-erp-api/tests/Feature/People/SecretaryHomeTest.php`
- `church-erp-api/tests/Feature/People/VisitorManagementTest.php`
- `church-erp-web/src/app/api/secretary/home/route.ts`
- `church-erp-web/src/app/api/secretary/members/[memberId]/route.ts`
- `church-erp-web/src/app/api/secretary/members/route.ts`
- `church-erp-web/src/app/api/secretary/visitors/[visitorId]/route.ts`
- `church-erp-web/src/app/api/secretary/visitors/route.ts`
- `church-erp-web/src/app/secretaria/membros/[memberId]/editar/page.tsx`
- `church-erp-web/src/app/secretaria/visitantes/[visitorId]/editar/page.tsx`
- `church-erp-web/src/components/operational/member-form.tsx`
- `church-erp-web/src/components/operational/person-search-list.tsx`
- `church-erp-web/src/components/operational/visitor-form.tsx`
- `church-erp-web/src/features/people/person-resolution-return.ts`
- `church-erp-web/tests/member-management.test.mjs`
- `church-erp-web/tests/people-search.test.mjs`
- `church-erp-web/tests/secretary-home.test.mjs`
- `church-erp-web/tests/visitor-management.test.mjs`

## Senior Developer Review (AI)

### Review Date

2026-09-03

### Reviewer

Quinn - Senior Developer & QA Architect

### Findings Applied

- HIGH: `sanitizePersonResolutionReturn` podia aceitar host externo mascarado com barra invertida antes de `/secretaria/pessoas`. Corrigido com rejeicao de `\` bruto e validacao explicita de origin interno antes de aceitar pathname allowlisted.
- HIGH: BFF `/api/secretary/home` repassava `body.message` upstream em `401`/`403`, permitindo vazamento de PII ou detalhe tecnico. Corrigido para mensagens fixas sanitizadas.
- MEDIUM: BFFs de home e membros retornavam `"Server error"` visivel em `5xx`, fora do padrao operacional da secretaria. Corrigido para mensagens fixas em portugues sem detalhe tecnico.
- MEDIUM: `UpdateMemberService` registrava `people_member_changed` mesmo quando o PATCH nao alterava nenhum campo. Corrigido para logar somente quando `changed_fields` nao esta vazio.
- MEDIUM: faltavam testes cobrindo a variante de open redirect com `\`, limite superior de `per_page` no retorno contextual e sanitizacao de mensagens upstream da home. Cobertura adicionada nos testes web e backend.

### Review Outcome

- Todos os findings validos foram corrigidos.
- Testes focados, suites completas, lint e typecheck passaram apos as correcoes.
- Status final recomendado: `done`.

## Change Log

- 2026-09-01: Story criada com contexto completo para resolver pendencias operacionais de pessoas; status definido como `ready-for-dev`.
- 2026-09-02: Revisao adversarial incorporada; endurecidos retorno contextual, sanitizacao dos BFFs de edicao, escopo de `needs_update`, recomputacao da home e testes obrigatorios.
- 2026-09-02: Implementada resolucao operacional de pendencias de pessoas com retorno contextual seguro, contratos de home/fila ajustados, BFFs endurecidos e testes/validacoes completas; status definido como `review`.
- 2026-09-03: Aplicadas todas as correcoes do code review, incluidos testes adicionais e validacao completa; status definido como `done`.
