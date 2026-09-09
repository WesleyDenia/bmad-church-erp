# Story 5.1: Manter modelos pre-definidos de comunicacao

Status: done

<!-- Implementation gate: esta story introduz o dominio de Communications e pode expor dados operacionais de comunicacao por tenant. O primeiro passo obrigatorio do dev-story e executar /bmad-review-security, incorporar findings validos e preencher o Security Sign-off antes de escrever codigo de produto. Varredura detect-secrets/pre-commit nao bloqueia dev/local; ela permanece gate obrigatorio apenas para promocao STG/PROD. -->

## Story

As a secretaria da igreja,
I want acessar modelos pre-definidos de comunicacao,
so that eu reduza retrabalho nas mensagens recorrentes da semana.

## Acceptance Criteria

1. Dado que um usuario com perfil `secretary` ou `administrator` acessa `/communications`, quando abre a area de comunicacoes, entao o browser carrega a lista apenas via BFF same-origin `GET /api/communications/templates`, o BFF chama Laravel em `GET /api/v1/communications/templates`, e a tela nunca chama Laravel autenticado diretamente.
2. Dado que existem modelos base do MVP, quando a lista e carregada, entao o sistema exibe modelos disponiveis para o tenant com `template_key`, nome, descricao curta, categoria, canal sugerido, estado e ordem estavel, no response exato `{"data":[...]}`, sem expor `id`, `church_id`, `body_template`, timestamps, IDs de outros tenants ou dados de pessoas.
3. Dado que nao existem modelos customizados do tenant, quando a area e aberta, entao o sistema ainda apresenta os modelos base do MVP e nao mostra estado vazio impeditivo.
4. Dado que existam modelos customizados de outra igreja ou modelos inativos, quando a secretaria abre a lista, entao eles nao aparecem no tenant atual; modelos globais/base podem aparecer para todos porque nao contem PII nem configuracao de igreja.
5. Dado que um modelo custom ativo do tenant atual possui o mesmo `template_key` de um modelo global ativo, quando a lista e carregada, entao o modelo custom do tenant substitui o global na resposta e a lista nao mostra duplicidade de `template_key`.
6. Dado que um usuario `treasurer`, `leadership`, sem sessao ou com membership inativa tenta acessar a API/BFF de modelos, quando a requisicao e feita, entao recebe `401` ou `403` sanitizado, cookie e limpo em `401`, e a resposta nao revela nomes de modelos customizados, existencia de registros, contagens, categorias, `church_id`, headers, token, SQL, stack trace ou payload upstream.
7. Dado que o browser envia query params com `church_id`, `tenant`, `scope`, `role`, `roles`, `permission`, `user_id`, `id`, `template_id`, `status`, `created_at`, `updated_at` ou qualquer parametro, quando a listagem e chamada por `GET`, entao BFF e Laravel rejeitam com `422` e mensagem operacional clara; outros metodos HTTP nao sao implementados nesta story e devem retornar `405`/rota inexistente sem executar regra de dominio.
8. Dado que a lista carrega com sucesso, quando a UI renderiza os cards/lista, entao cada modelo mostra nome e descricao curta com acao futura indisponivel ou preparatoria, sem abrir editor de mensagem, sem selecionar pessoa, sem mostrar corpo do modelo e sem prometer envio/WhatsApp nesta story.
9. Dado que ocorre erro tecnico recuperavel, quando a tela ja tinha uma ultima leitura confiavel, entao nao deve preservar dados customizados do tenant; pode preservar somente que a area esta temporariamente indisponivel e oferecer retry. Se nao houver leitura confiavel, mostra erro claro e acao de tentar novamente.
10. Dado que a area e usada em desktop, tablet ou mobile, quando carrega, falha, fica sem modelos customizados ou nega acesso, entao os estados `loading_communication_templates`, `templates_loaded`, `base_templates_only`, `denied_or_session_invalid` e `server_error` ficam cobertos sem sobreposicao visual, com foco visivel e navegacao por teclado.
11. Dado que esta story entra em review, quando os testes forem executados, entao backend, BFF e frontend provam autorizacao por perfil, tenant isolation, defaults base, deduplicacao/precedencia tenant sobre global, rejeicao de query vinda do browser, sanitizacao de erro, ausencia de chamada Laravel pelo browser, estabilidade da ordem, uso de `JsonResource::collection` no formato `data: [...]` e ausencia de termos visiveis "dashboard", "widget", "KPI", "performance" ou "BI" na area de comunicacoes.
12. Dado que esta story esta marcada como `ready-for-dev`, quando um dev agent iniciar dev-story, entao pode executar somente o gate inicial de seguranca ate que `/bmad-review-security` tenha sido executado, findings validos tenham sido incorporados nesta story e o Security Sign-off esteja preenchido.

## Threat Modeling - STRIDE

**Escopo:** Story 5.1 - listagem de modelos pre-definidos de comunicacao via BFF Next.js e API Laravel.
**Fronteiras de confianca:** browser same-origin -> BFF Next.js `/api/communications/templates` -> Laravel interno `/api/v1/communications/templates` -> banco multi-tenant `communication_templates`.
**Entradas:** somente `GET` sem query string, sem body e sem parametros de escopo vindos do browser.
**Saidas:** response minimizado `data: CommunicationTemplate[]` sem `id`, `church_id`, `church_scope_id`, `body_template`, timestamps, tokens, headers, SQL, stack trace ou dados de pessoas.
**Dados sensiveis:** templates customizados por tenant, existencia de modelos por igreja, metadados operacionais de comunicacao, cookie de sessao e membership autenticada.
**Autenticacao:** sessao interna resolvida por `resolve.internal.session`; BFF usa cookie de sessao e limpa cookie em `401`.
**Autorizacao:** Laravel e autoridade final; policy/ability dedicada permite apenas `secretary` e `administrator`; `AreaGuard` visual nao substitui policy da API.
**Limites de payload e abuso:** query string rejeitada com `422` no BFF e Laravel, apenas `GET` implementado, rota Laravel com throttle dedicado `throttle:communication-templates-read`.

| STRIDE | Pergunta adversarial | Mitigacao obrigatoria | Status |
| --- | --- | --- | --- |
| Spoofing | Um atacante pode se passar por usuario, role ou tenant via query/header/body? | Ignorar escopo externo; derivar `church_id` exclusivamente de `authenticated_session.membership`; validar sessao em `resolve.internal.session`; limpar cookie em `401`; testar usuario sem sessao e membership inativa. | Mitigado na especificacao |
| Tampering | Um atacante pode alterar escopo, status, role, ID ou filtro para listar dados indevidos? | Rejeitar qualquer query string no BFF e Laravel com `422`; nao implementar metodos de escrita; usar policy dedicada; nao aceitar `church_id`, `tenant`, `scope`, `role`, `permission`, `user_id`, `id`, `template_id`, `status` ou timestamps. | Mitigado na especificacao |
| Repudiation | Como provar ou investigar abuso sem vazar dado sensivel? | Registrar somente eventos operacionais sanitizados de autorizacao/erro quando necessario; nao logar payload completo, cookie, token, headers de auth, SQL, stack trace ou corpo de templates; manter testes negativos para respostas sanitizadas. | Mitigado na especificacao |
| Information Disclosure | Que dado de outro tenant, PII, segredo ou detalhe interno pode vazar? | Resource com allowlist estrita; nao retornar `body_template`, `church_id`, IDs, timestamps ou dados de pessoas; respostas `401`/`403`/`5xx` fixas; estado recuperado da UI nao preserva nomes, categorias ou contagens customizadas. | Mitigado na especificacao |
| Denial of Service | A listagem pode ser abusada por payloads, filtros ou chamadas repetidas? | Endpoint sem filtros/paginacao customizada nesta story; rejeicao de query/body; throttle dedicado; ordenacao estavel por indices `status`, `sort_order`, `church_id`; testes verificam middleware de throttle. | Mitigado na especificacao |
| Elevation of Privilege | Usuario `treasurer`, `leadership` ou tenant cruzado pode obter modelos? | `CommunicationTemplatePolicy` obrigatoria para `secretary` e `administrator`; query combina globais ativos e tenant atual apenas; testes cobrem roles proibidos, tenant cruzado, modelos inativos e membership inativa. | Mitigado na especificacao |

## Tasks / Subtasks

- [x] Executar gate de seguranca antes de iniciar dev-story (AC: 12)
  - [x] Rodar `/bmad-review-security` contra esta story.
  - [x] Incorporar findings validos diretamente nesta story antes de escrever codigo.
  - [x] Preencher `Security Sign-off` com status, auditor e data.
  - [x] Interromper escrita de codigo de produto se o sign-off ainda estiver pendente.
  - [x] Antes de promover para STG, executar `bash deploy/security-gate.sh stg` em ambiente com `pre-commit` ou `detect-secrets-hook`.
  - [x] Antes de promover para PROD, executar `bash deploy/security-gate.sh prod` em ambiente com `pre-commit` ou `detect-secrets-hook`.

- [x] Criar contrato backend de modelos de comunicacao (AC: 2-7, 11)
  - [x] Criar dominio `app/Domain/Communications` com `Models`, `Services`, `Resources` se necessario e manter controllers finos em `app/Http/Controllers/Api/V1`.
  - [x] Criar migration `communication_templates` com `church_id` nullable para templates base globais, coluna gerada ou coluna mantida `church_scope_id` para unicidade sem o problema de `NULL` do MySQL, `template_key`, `name`, `short_description`, `body_template`, `category`, `suggested_channel`, `status`, `sort_order`, timestamps e indices para `church_id`, `status` e ordenacao.
  - [x] Implementar unique composto real para `(church_scope_id, template_key)`, onde `church_scope_id = 0` representa global e `church_scope_id = church_id` representa tenant; nao usar unique direto em `(church_id, template_key)` porque MySQL permite multiplos `NULL`.
  - [x] Modelar templates base globais sem PII e templates tenant-scoped futuros com `church_id`; nunca permitir leitura de `church_id` diferente do tenant ativo.
  - [x] Criar `body_template` ja nesta story para evitar retrabalho na Story 5.2, mas nao retornar esse campo na listagem.
  - [x] Criar `ProvisionBaseCommunicationTemplatesService` idempotente e chamavel por `DatabaseSeeder` e por teste/rotina de provisionamento; a story nao deve depender apenas de fixture manual para que os modelos base existam em ambientes reais.
  - [x] Provisionar os modelos base do MVP, como `visitante_primeiro_contato`, `atualizacao_cadastro`, `aviso_semanal` e `lembrete_evento`, com `body_template` simples e sem dados pessoais concretos.
  - [x] Implementar `ListCommunicationTemplatesService` retornando templates globais ativos mais templates ativos do tenant atual, ordenados por `sort_order`, `name` e `template_key`, com deduplicacao por `template_key`: template tenant-scoped ativo substitui template global ativo com a mesma chave.
  - [x] Criar `ListCommunicationTemplatesRequest` com autorizacao obrigatoria por `CommunicationTemplatePolicy`/ability dedicada e rejeicao explicita de qualquer query string; esta story nao aceita filtros do browser.
  - [x] Criar `CommunicationTemplateResource` expondo exatamente `template_key`, `name`, `short_description`, `category`, `suggested_channel`, `status` e `sort_order`; nao expor `id`, `church_id`, `church_scope_id`, `body_template`, timestamps internos ou dados de pessoa nesta story.
  - [x] Registrar somente `GET /api/v1/communications/templates` dentro do grupo `resolve.internal.session` em `routes/api.php`, com throttle dedicado como `throttle:communication-templates-read`.

- [x] Implementar BFF e contrato frontend de comunicacoes (AC: 1, 6-9, 11)
  - [x] Criar `church-erp-web/src/app/api/communications/templates/route.ts` usando `callLaravel("/api/v1/communications/templates")`, `cache: "no-store"` e cookie `AUTH_SESSION_COOKIE_NAME`.
  - [x] Sanitizar `401`, `403`, `422`, `404` e `5xx` com mensagens fixas e claras; limpar cookie em `401`; nunca repassar `body.message` upstream quando puder conter detalhe sensivel.
  - [x] Criar `src/features/communications/communication-template.ts` com tipos em `snake_case`, normalizador do response exato `data: CommunicationTemplate[]`, estados de UI e allowlist de campos.
  - [x] Rejeitar qualquer query param no BFF antes de chamar Laravel; esta story nao precisa de filtros do browser.
  - [x] Implementar apenas `GET`; nao exportar `POST`, `PATCH`, `PUT` ou `DELETE` nesta route handler.

- [x] Substituir placeholder da pagina de comunicacoes por lista real (AC: 1-3, 8-10)
  - [x] Atualizar `src/app/communications/page.tsx` preservando `AreaGuard area="communications"`.
  - [x] Criar componente operacional em `src/components/operational`, por exemplo `communication-template-list.tsx`, reutilizando `Surface`, `Button` e primitives existentes de `src/components/ui`.
  - [x] Mostrar blocos/lista de modelos com nome, descricao curta, categoria e canal sugerido; acao de preparacao deve ficar claramente indisponivel ou marcada como proxima etapa.
  - [x] Manter linguagem operacional e pastoral; nao usar labels genericos de SaaS nem prometer automacao de WhatsApp.
  - [x] Implementar estados de loading, base-only, erro recuperavel, negacao e retry sem armazenar PII antiga.

- [x] Cobrir backend com testes de feature e unitarios focados (AC: 2-7, 11)
  - [x] Criar `tests/Feature/Communications/CommunicationTemplateListTest.php` cobrindo `secretary` e `administrator` permitidos, `treasurer`/`leadership` proibidos, sessao ausente, membership inativa e tenant cruzado.
  - [x] Provar que templates base aparecem mesmo sem custom do tenant e que templates custom de outro tenant nao aparecem.
  - [x] Provar que template custom ativo do tenant substitui template global ativo com o mesmo `template_key`.
  - [x] Provar que a constraint impede duplicar `template_key` no escopo global e no mesmo tenant, mas permite um tenant sobrescrever uma chave global.
  - [x] Provar que qualquer query string retorna `422` sem dados.
  - [x] Provar shape exato de response `data: [...]` usando `CommunicationTemplateResource::collection($templates)`.
  - [x] Provar que `id`, `body_template`, `church_id`, `church_scope_id`, timestamps, token, headers e PII nao aparecem na listagem.
  - [x] Provar que a rota tem middleware `throttle:communication-templates-read`.

- [x] Cobrir BFF/frontend com os testes atuais do projeto (AC: 1, 6, 8-11)
  - [x] Criar `church-erp-web/tests/communication-templates.test.mjs` cobrindo normalizador, estados, BFF same-origin, rejeicao de query, cookie limpo em `401`, sanitizacao de `403`/`5xx` e ausencia de chamada direta para `/api/v1`.
  - [x] Atualizar `bff-smoke.test.mjs` para exigir a rota BFF de comunicacoes, o contrato `src/features/communications/communication-template.ts` e a page real em `/communications`.
  - [x] Incluir source inspection para garantir que textos visiveis nao usam "dashboard", "widget", "KPI", "performance" ou "BI".
  - [x] Rodar `npm run test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke` no `church-erp-web`.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story inicia a Epic 5 criando a fonte real de modelos de comunicacao. O valor esperado e a secretaria abrir `/communications` e encontrar modelos recorrentes sem depender de planilhas, memoria ou texto solto em WhatsApp.
- O escopo e criar a fonte real e listar modelos pre-definidos. Apesar do titulo usar "manter", esta story nao entrega criacao, edicao, exclusao ou ativacao/desativacao de modelos customizados pela UI; essas capacidades ficam fora do MVP atual ou para story futura explicita.
- Preparar mensagem com dados de pessoas, selecionar destinatario, lidar com lacunas de dados e copiar/partilhar para WhatsApp ficam nas Stories 5.2 a 5.4.
- A area `/communications` ja existe no web app, mas hoje e placeholder com `AreaGuard`. O trabalho principal e trocar o placeholder por uma lista real via BFF/API.
- A home da secretaria ja possui `CommunicationPendingBlock` com estado indisponivel. Esta story nao precisa transformar esse bloco em fluxo acionavel; ela deve deixar a base pronta para as proximas stories.
- A Epic 4 consolidou `people` como fonte de pessoas. Esta story nao deve criar nova modelagem de membros/visitantes, pendencias ou destinatarios.

### Guardrails de implementacao obrigatorios

- Browser chama somente BFF Next.js same-origin: `/api/communications/templates`.
- Laravel continua autoridade final para autorizacao, tenant scope, validacao e persistencia.
- `church_id` vem exclusivamente de `authenticated_session.membership`; rejeitar qualquer tentativa de escopo pelo browser.
- Templates base podem ser globais com `church_id = null` desde que nao contenham PII nem configuracao de igreja; templates custom futuros devem ser sempre tenant-scoped.
- Nao usar o trait `BelongsToAuthenticatedChurch` em `CommunicationTemplate`: ele filtra estritamente `church_id = tenant` e excluiria templates globais com `church_id = null`. Implementar scopes explicitos para `activeBaseOrTenant($churchId)` e `forTenant($churchId)` ou nomes equivalentes.
- Criar e persistir `body_template` nesta story para sustentar a Story 5.2, mas nao expor esse campo na listagem nem na UI desta story.
- Nao criar integracao nativa com WhatsApp, envio automatico, fila de disparo, scheduler, webhook, QR code, API externa ou estado de entrega.
- Nao criar nova tabela de pessoas, nova inbox de pendencias ou projection de comunicacao baseada em PII.
- Nao adicionar biblioteca UI, estado global, Jest, Vitest, Playwright ou dependencia externa para cumprir a listagem.
- Nao repassar erro upstream sensivel do Laravel para o browser; mensagens browser-facing precisam ser fixas, simples e em portugues.
- Nao preservar nomes, categorias ou contagens de templates customizados em estado recuperado apos erro; prefira estado indisponivel com retry.

### Abordagens proibidas

- Fazer chamada autenticada direta do browser para Laravel ou expor `API_BASE_URL`/JWT interno no client.
- Usar dados de `people` nesta story para preencher mensagem, preview, destinatario ou contador de comunicacao.
- Criar CRUD completo de templates customizados se nao estiver explicitamente necessario para os ACs.
- Usar `BelongsToAuthenticatedChurch` no model `CommunicationTemplate` ou qualquer global scope que esconda `church_id = null`.
- Usar unique direto em `(church_id, template_key)` para resolver globais; em MySQL isso nao impede duplicatas globais com `NULL`.
- Marcar modelo como enviado, pronto para WhatsApp ou pendencia resolvida.
- Criar wrapper global customizado de API ou `ResourceCollection` customizada para renomear payload sem necessidade.
- Aceitar ou normalizar silenciosamente query/payload de escopo; abuso deve falhar cedo.
- Renderizar estado vazio impeditivo quando nao ha customizacao do tenant; os modelos base do MVP devem aparecer.
- Usar texto visivel "dashboard", "widget", "KPI", "performance" ou "BI".

### Arquivos provaveis a alterar ou criar

- `church-erp-api/database/migrations/*_create_communication_templates_table.php`
- `church-erp-api/database/seeders/DatabaseSeeder.php`
- `church-erp-api/app/Domain/Communications/Models/CommunicationTemplate.php`
- `church-erp-api/app/Domain/Communications/Services/ListCommunicationTemplatesService.php`
- `church-erp-api/app/Domain/Communications/Services/ProvisionBaseCommunicationTemplatesService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ListCommunicationTemplatesController.php`
- `church-erp-api/app/Http/Requests/ListCommunicationTemplatesRequest.php`
- `church-erp-api/app/Http/Resources/CommunicationTemplateResource.php`
- `church-erp-api/app/Policies/CommunicationTemplatePolicy.php`
- `church-erp-api/routes/api.php`
- `church-erp-api/tests/Feature/Communications/CommunicationTemplateListTest.php`
- `church-erp-api/tests/Unit/Communications/ProvisionBaseCommunicationTemplatesServiceTest.php`
- `church-erp-web/src/app/api/communications/templates/route.ts`
- `church-erp-web/src/app/communications/page.tsx`
- `church-erp-web/src/features/communications/communication-template.ts`
- `church-erp-web/src/components/operational/communication-template-list.tsx`
- `church-erp-web/tests/communication-templates.test.mjs`
- `church-erp-web/tests/bff-smoke.test.mjs`

### Estados obrigatorios da UI ou do fluxo

- `loading_communication_templates`: tela preserva estrutura visual enquanto busca via BFF.
- `templates_loaded`: ha modelos base e/ou customizados renderizados.
- `base_templates_only`: nao ha custom do tenant, mas os modelos base do MVP aparecem como estado valido.
- `denied_or_session_invalid`: `401` ou `403` sem dados de modelos; em `401`, cookie limpo pelo BFF.
- `server_error`: erro claro com retry, sem detalhe tecnico.
- Esta story nao deve renderizar estado recuperado com dados de templates customizados. Se existir tipo interno equivalente a `technical_recovered_without_pii`, ele deve mostrar somente indisponibilidade temporaria e retry, sem nomes, categorias, contagens ou outros sinais de modelos customizados.

### Requisitos tecnicos obrigatorios

- Stack local verificada: Laravel `^12.0` em PHP `^8.3`; PHPUnit `^12.5.12`; Next.js `^16.3.4`; React `19.2.4`; Tailwind CSS `^4`; testes web com `node --test`.
- Rotas Laravel de produto permanecem versionadas sob `/api/v1` e dentro de `resolve.internal.session` quando sensiveis.
- BFF-to-Laravel deve usar `src/lib/api/client.ts`, que aplica headers internos e `cache: "no-store"`.
- Contratos HTTP usam `snake_case`; tipos TypeScript de payload devem espelhar o contrato Laravel.
- `CommunicationTemplatePolicy` deve permitir apenas `secretary` e `administrator` para listagem nesta story.
- `CommunicationTemplateResource` deve seguir `JsonResource`; lista sem paginacao pode retornar `CommunicationTemplateResource::collection($templates)` no formato Laravel padrao `data: [...]`.
- Modelo recomendado:
  - `church_id`: nullable, FK para `churches`, `null` para base global;
  - `church_scope_id`: coluna gerada ou mantida para unicidade; `0` para global e `church_id` para tenant;
  - `template_key`: string curta e estavel;
  - `name`: string ate 120;
  - `short_description`: string ate 240;
  - `body_template`: texto simples com placeholders futuros, sem PII concreta;
  - `category`: valores como `visitor_follow_up`, `member_update`, `weekly_notice`, `event_reminder`;
  - `suggested_channel`: valor inicial `external_handoff`;
  - `status`: `active` ou `inactive`;
  - `sort_order`: inteiro.
- Indices minimos: `church_id`, `status`, `sort_order` e unique composto obrigatorio para impedir duplicidade de `template_key` por tenant/global.
- Unicidade obrigatoria: unique composto em `(church_scope_id, template_key)`. Templates custom de tenant podem usar o mesmo `template_key` de global para override; dois globais com a mesma chave ou dois templates do mesmo tenant com a mesma chave devem falhar.
- Response exato da listagem:
  - HTTP `200`;
  - JSON `{"data":[{"template_key":"visitante_primeiro_contato","name":"Primeiro contato com visitante","short_description":"Mensagem curta para acolher um visitante recente.","category":"visitor_follow_up","suggested_channel":"external_handoff","status":"active","sort_order":10}]}`;
  - sem `meta`, `links` ou wrapper `communication_templates`, porque a lista desta story nao e paginada.
- `body_template` deve existir no banco e nos seeds/provisionamento, mas nao deve ser retornado na listagem desta story.

### Compliance de arquitetura

- Seguir o dominio `app/Domain/Communications` previsto na arquitetura; nao colocar regra de comunicacao em `People`, `Identity` ou controllers.
- Controllers recebem request, chamam service e retornam resource; nao concentrar query, authorization ou shape manual no controller.
- Reutilizar `BackofficeAreaPolicy`/matriz existente para area visual, mas criar policy/ability propria obrigatoria para recurso de template na API.
- Preservar `AreaGuard area="communications"` em `/communications`; a checagem visual nao substitui a policy Laravel.
- Components base ficam em `src/components/ui`; composicao de produto vai para `src/components/operational`; contratos e normalizadores vao para `src/features/communications`.
- Interface deve seguir a direcao "Teal Operacional", Tailwind e tokens existentes; nao criar tema paralelo.

### Requisitos de teste

- Backend minimo:
  - `cd church-erp-api && php artisan test tests/Feature/Communications/CommunicationTemplateListTest.php`
  - `cd church-erp-api && php artisan test tests/Unit/Communications/ProvisionBaseCommunicationTemplatesServiceTest.php`
  - `cd church-erp-api && php artisan test`
- Frontend minimo:
  - `cd church-erp-web && node --test --loader ./tests/node-alias-loader.mjs tests/communication-templates.test.mjs tests/bff-smoke.test.mjs`
  - `cd church-erp-web && npm test`
  - `cd church-erp-web && npm run lint`
  - `cd church-erp-web && npm run typecheck`
  - `cd church-erp-web && npm run build:smoke`
- Testes precisam provar roles permitidos/proibidos, tenant cruzado, defaults base, response minimizada, BFF boundary, sanitizacao e estados honestos.
- Testes tambem precisam provar que `BelongsToAuthenticatedChurch` nao foi usado em `CommunicationTemplate`, que globais entram na listagem, que override tenant/global deduplica por `template_key`, que `body_template` existe no banco/provisionamento e nao aparece na listagem, e que a rota tem throttle dedicado.

### Licoes de stories ou reviews anteriores

- A Epic 4 mostrou que comunicacao deve nascer conectada a secretaria e `people`, mas sem puxar PII antes do contrato certo.
- Sanitizacao de `401`, `403`, `404` e `5xx` foi problema recorrente em BFFs; esta story ja deve nascer com mensagens fixas e testes negativos.
- Query invalida deve falhar cedo; normalizar demais parametros suspeitos pode esconder abuso e expor dados.
- Dados pessoais exigem minimizacao por padrao, inclusive em erro e estado recuperado.
- Retorno contextual e handoff externo precisam de allowlist estrita nas proximas stories; nesta story nao introduzir retorno/partilha ainda.
- A ausencia de testes DOM completos continua risco conhecido; compensar com source inspection, testes de normalizadores e verificacao de estados visiveis.
- O trait `BelongsToAuthenticatedChurch` funcionou para `people`, mas nao serve para entidades que combinam registros globais (`church_id = null`) e registros tenant-scoped no mesmo endpoint.

### Git Intelligence Summary

- `50ebac8 finaliza epic 4.5 e retro` consolidou pendencias de pessoas, retorno seguro, sanitizacao de BFFs e retrospectiva da Epic 4.
- `a53eb02 implementa a story 4.4` adicionou busca unificada, BFF `/api/secretary/people`, service Laravel e resource minimizado.
- `cf0f340 Merge pull request #20 from WesleyDenia/story_4-3` incorporou cadastro/edicao de visitantes preservando conversao fora do escopo.
- Padrao recente: entregar fonte real no Laravel, BFF same-origin, contrato TypeScript em `src/features`, componente operacional em `src/components/operational`, testes backend de feature e web com `node:test`.

### Informacoes tecnicas atuais

- Em 25/08/2026, o blog oficial do Next.js publicou security release para `16.3.3` Active LTS e `15.5.24` Maintenance LTS. O web app foi atualizado para `next@16.3.4` e `sharp@0.35.4`; dev deve preservar estas versoes corrigidas ao implementar a story.
- React 19.2 esta documentado como release atual da linha 19; o projeto usa React `19.2.4`, entao nao ha necessidade de trocar padrao de componentes para esta story.
- Tailwind CSS esta na linha v4 e usa recursos modernos de CSS; seguir os tokens/utilitarios existentes e validar browser alvo antes de introduzir recurso CSS exotico.
- `shadcn/ui` se apresenta como fundacao customizavel de componentes acessiveis; neste projeto ele e primitive tecnica, nao linguagem visual final.
- Laravel 12 segue documentando Gates/Policies e `JsonResource` como mecanismos adequados para autorizacao e transformacao de API; usar esses mecanismos em vez de wrappers manuais.

### Project Structure Notes

- `church-erp-web/src/app/communications/page.tsx` existe e usa `AreaGuard`, mas hoje mostra apenas um texto base.
- `church-erp-web/src/components/operational/communication-pending-block.tsx` existe como bloco futuro da secretaria e nao deve virar fluxo de preparacao nesta story.
- `ResolveBackofficeAreaAccessService` ja permite `communications` para `administrator` e `secretary`; `treasurer` e `leadership` nao devem acessar.
- Nao existe ainda `app/Domain/Communications` no backend; esta story deve criar o dominio seguindo os padroes de `People` e `Finance`.
- Diferenca importante em relacao a `People`: `Person` usa `BelongsToAuthenticatedChurch` porque toda pessoa pertence a uma igreja; `CommunicationTemplate` nao deve usar esse trait porque precisa listar templates globais e templates do tenant juntos.
- `routes/api.php` ja agrupa endpoints sensiveis em `resolve.internal.session`; manter comunicacoes dentro desse grupo.
- `src/lib/api/client.ts` ja centraliza chamada BFF -> Laravel com headers internos e `cache: "no-store"`.
- `project-context.md` exige `snake_case`, BFF boundary, tenant isolation por `church_id`, components operacionais e testes no framework atual.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 5, Story 5.1, FR25 e restricoes frontend.
- `_bmad-output/planning-artifacts/prd.md` - escopo 8.5 Comunicacoes, Jornada B e FR-7 Preparacao de Comunicacao.
- `_bmad-output/planning-artifacts/architecture.md` - dominio `Communications`, BFF, policies, tenancy, resources e estrutura de projeto.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - jornada da secretaria, `CommunicationPendingBlock`, feedback, navegacao, responsividade e acessibilidade.
- `_bmad-output/project-context.md` - stack, BFF, testes, arquitetura, seguranca e regras criticas para agentes.
- `_bmad-output/implementation-artifacts/epic-4-retro-2026-09-08.md` - preparacao obrigatoria para Epic 5.
- `church-erp-web/src/app/communications/page.tsx`
- `church-erp-web/src/components/operational/communication-pending-block.tsx`
- `church-erp-api/routes/api.php`
- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php`
- `church-erp-api/app/Policies/PersonPolicy.php`
- Web: https://nextjs.org/blog/august-2026-security-release
- Web: https://react.dev/blog/2025/10/01/react-19-2
- Web: https://tailwindcss.com/
- Web: https://ui.shadcn.com/
- Web: https://laravel.com/framework/docs/12.x/authorization
- Web: https://laravel.com/framework/docs/12.x/eloquent-resources

### Checklist pre-review

- `/bmad-review-security` foi executado, findings validos foram incorporados e Security Sign-off foi preenchido antes de codigo de produto.
- `/communications` preserva `AreaGuard area="communications"` e carrega modelos por BFF.
- Browser chama somente `/api/communications/templates`; nao ha chamada direta para Laravel, `API_BASE_URL` ou token interno no client.
- Laravel expoe `GET /api/v1/communications/templates` sob `resolve.internal.session`.
- `secretary` e `administrator` acessam; `treasurer`, `leadership`, sem sessao e membership inativa nao recebem dados.
- Templates base aparecem mesmo sem custom do tenant; templates inativos e de outro tenant nao aparecem.
- Template custom ativo do tenant substitui template global ativo com o mesmo `template_key`; a resposta nao tem duplicidade de chave.
- Constraint de banco impede duplicidade de `template_key` no escopo global e no mesmo tenant.
- Listagem nao expoe `id`, `church_id`, `church_scope_id`, `body_template`, timestamps internos, headers, token, SQL, stack trace ou dados de pessoas.
- Qualquer query string falha com `422` no BFF e no Laravel.
- Apenas `GET` e implementado para a listagem nesta story; nenhum metodo de escrita existe.
- Rota Laravel tem throttle dedicado para leitura de modelos.
- `401`, `403`, `404` e `5xx` sao sanitizados; `401` limpa cookie no BFF.
- UI cobre loading, loaded, base-only, denied e server error sem sobreposicao em mobile/desktop; estado recuperado nao renderiza nomes, categorias ou contagens customizadas.
- Nao ha editor, composicao com dados de pessoas, envio, WhatsApp nativo, webhook, scheduler ou fila de handoff nesta story.
- Componentes usam `src/components/ui`, `Surface`, Tailwind e tokens existentes; nao ha biblioteca UI paralela.
- Textos visiveis nao usam "dashboard", "widget", "KPI", "performance" ou "BI".
- Backend e frontend passam nos comandos de teste, lint, typecheck e smoke build listados.
- Promocao STG/PROD exige `bash deploy/security-gate.sh stg` e `bash deploy/security-gate.sh prod` em ambiente com `pre-commit` ou `detect-secrets-hook`; ausencia deste gate bloqueia promocao, nao dev/local.

### Security Sign-off

- Status: Approved with Security Notes
- Auditor: Vex - Security Auditor
- Data: 2026-09-08
- Findings incorporados: SEC-H-001 dependencia vulneravel no BFF Next.js corrigida com `next@16.3.4` e `sharp@0.35.4`; SEC-H-002 STRIDE preenchido nesta story; SEC-M-001 gate de promocao STG/PROD explicitado.
- Gates executados: `composer audit` em `church-erp-api`; `npm audit --omit=dev` em `church-erp-api`; `npm audit` e `npm audit --omit=dev` em `church-erp-web`; `npm run test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke` em `church-erp-web`.

### Story Completion Status

- Status final desta story: `done`.
- Nota de conclusao do contexto: `Ultimate context engine analysis completed - comprehensive developer guide created`.

### Senior Developer Review (AI)

- Data: 2026-09-09
- Revisor: Wesley Silva via Codex
- Resultado: Approved after fixes
- Findings corrigidos: BFF agora sanitiza falhas de rede/exception do upstream com `500` fixo; `church-erp-web/AGENTS.md` foi documentado no File List; testes backend cobrem duplicidade global de `template_key`; testes web reforcam inspecao de responsividade, foco visivel e navegacao por teclado no framework atual; `church_scope_id` passou a ser coluna gerada por banco a partir de `church_id`.
- Risco residual: a story ainda nao possui teste visual/DOM real por Playwright ou equivalente porque o projeto usa `node:test` e a story proibiu adicionar framework externo.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-09-08: Gate `/bmad-review-security` executado contra esta story antes de codigo de produto. Nenhum achado material novo; STRIDE, Security Sign-off e gates STG/PROD ja estavam incorporados.
- 2026-09-08: `composer audit` em `church-erp-api` passou sem advisories.
- 2026-09-08: `npm audit --omit=dev` em `church-erp-api` passou sem vulnerabilidades.
- 2026-09-08: `npm audit --omit=dev` e `npm audit` em `church-erp-web` passaram sem vulnerabilidades.
- 2026-09-08: `php artisan test tests/Feature/Communications/CommunicationTemplateListTest.php` passou com 6 testes e 156 assertions.
- 2026-09-08: `php artisan test tests/Unit/Communications/ProvisionBaseCommunicationTemplatesServiceTest.php` passou com 2 testes e 9 assertions.
- 2026-09-08: `php artisan test` passou com 142 testes e 1509 assertions.
- 2026-09-08: `node --test --loader ./tests/node-alias-loader.mjs tests/communication-templates.test.mjs tests/bff-smoke.test.mjs` passou com 30 testes.
- 2026-09-08: `npm test` passou com 86 testes.
- 2026-09-08: `npm run lint`, `npm run typecheck`, `npm run build:smoke` e `vendor/bin/pint --test` passaram sem erros.
- 2026-09-09: Code review corrigiu achados altos, medios e baixos: exception sanitizada no BFF, unicidade global testada, cobertura web de responsividade/foco/teclado reforcada, `church_scope_id` convertido para coluna gerada e File List alinhado.
- 2026-09-09: `php artisan test tests/Feature/Communications/CommunicationTemplateListTest.php` passou com 7 testes e 157 assertions.
- 2026-09-09: `php artisan test tests/Unit/Communications/ProvisionBaseCommunicationTemplatesServiceTest.php` passou com 2 testes e 9 assertions.
- 2026-09-09: `node --test --loader ./tests/node-alias-loader.mjs tests/communication-templates.test.mjs` passou com 6 testes.
- 2026-09-09: `php artisan test` passou com 143 testes e 1510 assertions.
- 2026-09-09: `vendor/bin/pint --test` passou sem erros.
- 2026-09-09: `npm test` passou com 87 testes.
- 2026-09-09: `npm run lint`, `npm run typecheck` e `npm run build:smoke` passaram sem erros.
- 2026-09-09: Follow-up de seguranca corrigiu parser de cookie da BFF para casar apenas o nome exato do cookie de sessao e restringiu a query de templates a colunas estritamente necessarias para listagem/deduplicacao. O achado anterior sobre ausencia de Security Sign-off foi invalidado apos leitura completa do artefato; a secao ja estava presente.
- 2026-09-09: Validacao do follow-up passou: `php artisan test tests/Feature/Communications/CommunicationTemplateListTest.php tests/Unit/Communications/ProvisionBaseCommunicationTemplatesServiceTest.php`, `node --test --loader ./tests/node-alias-loader.mjs tests/communication-templates.test.mjs tests/bff-smoke.test.mjs`, `npm run lint`, `npm run typecheck`, `npm run build:smoke`, `vendor/bin/pint --test app/Domain/Communications/Services/ListCommunicationTemplatesService.php`, `composer audit`, `npm audit --omit=dev` em `church-erp-web` e `npm audit --omit=dev` em `church-erp-api`.

### Completion Notes List

- Gate inicial de seguranca concluido antes de alteracoes de produto; promocao STG/PROD permanece condicionada a `deploy/security-gate.sh`.
- Backend criou o dominio `Communications`, tabela `communication_templates`, provisionamento global idempotente, listagem tenant-aware com deduplicacao por `template_key`, policy dedicada e resource minimizado no formato `data: [...]`.
- BFF `/api/communications/templates` chama Laravel somente server-side, rejeita qualquer query antes do upstream, sanitiza `401`/`403`/`422`/`404`/`5xx` e limpa cookie em `401`.
- UI `/communications` preserva `AreaGuard`, renderiza lista real de modelos com acao futura indisponivel, cobre loading/base-only/loaded/denied/server_error e nao renderiza corpo do template nem dados de pessoas.
- Review AI corrigiu tratamento de excecoes no BFF, completou cobertura de unicidade global e consolidou `church_scope_id` como coluna gerada para proteger integridade tambem fora de writes Eloquent.
- Follow-up de seguranca removeu carregamento desnecessario de `body_template` na query de listagem e reforcou a leitura exata do cookie de sessao no BFF.

### File List

- `_bmad-output/implementation-artifacts/5-1-manter-modelos-pre-definidos-de-comunicacao.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `church-erp-api/app/Domain/Communications/Models/CommunicationTemplate.php`
- `church-erp-api/app/Domain/Communications/Services/ListCommunicationTemplatesService.php`
- `church-erp-api/app/Domain/Communications/Services/ProvisionBaseCommunicationTemplatesService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ListCommunicationTemplatesController.php`
- `church-erp-api/app/Http/Requests/ListCommunicationTemplatesRequest.php`
- `church-erp-api/app/Http/Resources/CommunicationTemplateResource.php`
- `church-erp-api/app/Policies/CommunicationTemplatePolicy.php`
- `church-erp-api/app/Providers/AppServiceProvider.php`
- `church-erp-api/database/migrations/2026_09_08_000001_create_communication_templates_table.php`
- `church-erp-api/database/seeders/DatabaseSeeder.php`
- `church-erp-api/routes/api.php`
- `church-erp-api/tests/Feature/Communications/CommunicationTemplateListTest.php`
- `church-erp-api/tests/Unit/Communications/ProvisionBaseCommunicationTemplatesServiceTest.php`
- `church-erp-web/package.json`
- `church-erp-web/package-lock.json`
- `church-erp-web/AGENTS.md`
- `church-erp-web/src/app/api/communications/templates/route.ts`
- `church-erp-web/src/app/communications/page.tsx`
- `church-erp-web/src/components/operational/communication-template-list.tsx`
- `church-erp-web/src/features/communications/communication-template.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`
- `church-erp-web/tests/communication-templates.test.mjs`

### Change Log

- 2026-09-08: Implementada listagem segura de modelos pre-definidos de comunicacao via Laravel, BFF e UI; adicionados testes backend/frontend e story movida para review.
- 2026-09-09: Corrigidos achados do code review AI e story movida para done.
