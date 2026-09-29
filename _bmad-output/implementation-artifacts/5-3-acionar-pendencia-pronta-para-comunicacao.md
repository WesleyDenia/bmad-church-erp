# Story 5.3: Acionar pendencia pronta para comunicacao

Status: done

<!-- Implementation gate: esta story conecta pendencias operacionais de pessoas com preparacao de comunicacao. O primeiro passo obrigatorio do dev-story e executar /bmad-review-security, incorporar findings validos nesta story e preencher o Security Sign-off antes de escrever codigo de produto. Varredura detect-secrets/pre-commit nao bloqueia dev/local; ela permanece gate obrigatorio apenas para promocao STG/PROD. -->

## Story

As a secretaria da igreja,
I want abrir diretamente o fluxo de comunicacao a partir de uma pendencia acionavel,
so that eu transforme follow-up pendente em acao concreta com menos cliques.

## Acceptance Criteria

1. Dado que existem pessoas do tenant atual com pendencia pronta para comunicacao, quando um usuario `secretary` ou `administrator` abre a home da secretaria, entao `GET /api/v1/secretary/home` retorna `communication_pending.state = "communication_pending_loaded"` com itens acionaveis derivados de dados reais de `people` e `communication_templates`.
2. Dado que uma pendencia esta pronta para comunicacao, quando ela aparece na home da secretaria, entao o item contem somente dados minimizados: `category`, `label`, `count`, `next_step_label`, `href`, `template_key`, `person_type`, `person_id`, `display_name`, `status`, `status_label` e `contact_summary`, sem `church_id`, telefone bruto, email bruto, `body_template`, timestamps, token, headers ou dados de outro tenant; na home, `contact_summary` deve ser apenas um resumo sem valor bruto, como `Contato disponivel`, `Telefone informado`, `Email informado` ou `Contato pendente`.
3. Dado que um visitante do tenant atual possui status `new` ou `follow_up_needed` e possui telefone ou email, quando a home da secretaria e carregada, entao ele aparece como pendencia pronta de `visitor_follow_up_ready` usando `template_key = "visitante_primeiro_contato"` e `href` para `/communications` com contexto suficiente para pre-selecionar a preparacao.
4. Dado que um membro do tenant atual possui status `needs_update` e possui telefone ou email, quando a home da secretaria e carregada, entao ele aparece como pendencia pronta de `member_update_ready` usando `template_key = "atualizacao_cadastro"` e `href` para `/communications` com contexto suficiente para pre-selecionar a preparacao.
5. Dado que uma pessoa esta pendente de comunicacao mas nao possui telefone nem email, quando a home da secretaria e carregada, entao ela aparece apenas em um agrupamento bloqueado `missing_contact_for_communication`, informa que falta contato e aponta para o fluxo correto de complementacao em `/secretaria/pessoas?...contact=missing_contact`, sem chamar preparacao de mensagem.
6. Dado que nao existem pendencias prontas nem bloqueadas, quando a home da secretaria e carregada, entao `communication_pending.state = "empty_communication_pending"` com mensagem honesta de que nao ha comunicacao pendente agora; nao deve voltar ao placeholder antigo `communication_pending_unavailable`.
7. Dado que uma categoria possui pessoas pendentes, quando o bloco e montado, entao a ordenacao e deterministica: categorias na ordem `visitor_follow_up_ready`, `member_update_ready`, `missing_contact_for_communication`, `missing_template_for_communication`; dentro de cada categoria, pessoas por prioridade de status (`follow_up_needed`, `new`, `needs_update`), depois `created_at` ascendente e `id` ascendente.
8. Dado que a secretaria ou administradora aciona uma pendencia pronta na home, quando abre `/communications?template_key=...&person_type=...&person_id=...&source=secretary_home`, entao a tela preserva `AreaGuard area="communications"`, seleciona o modelo ativo correspondente, mostra que a pendencia foi carregada e permite preparar o rascunho com o contexto da pessoa sem exigir nova busca manual.
9. Dado que a tela `/communications` recebe contexto por query string, quando os parametros sao validos, entao o browser continua chamando somente BFF same-origin (`GET /api/communications/templates`, `POST /api/communications/message-drafts` e, se necessario para busca manual, `GET /api/secretary/people`), nunca Laravel autenticado diretamente; `person_id` em query e dado operacional sensivel e nao pode ser enviado a analytics, telemetria de terceiros, logs de browser, links externos ou `referrer` para dominios externos.
10. Dado que a tela `/communications` recebe query string malformada, campos extras ou escopo sensivel (`church_id`, `tenant`, `scope`, `role`, `roles`, `permission`, `user_id`, `phone`, `email`, `body_template`, `message_body`, `status`), quando renderiza, entao deve rejeitar deterministicamente o contexto como `communication_context_invalid`, mostrar mensagem operacional clara, limpar qualquer pessoa/template pre-selecionado e nao chamar `POST /api/communications/message-drafts` com dados suspeitos.
11. Dado que uma pendencia pronta referencia pessoa inexistente, inativa, de outro tenant, tipo divergente ou template inexistente/inativo, quando a preparacao e tentada, entao o BFF/Laravel ja existentes retornam erro sanitizado (`404`, `422`, `401` ou `403` conforme caso) sem revelar PII, existencia de registros, `church_id`, SQL, stack trace ou payload upstream.
12. Dado que usuario `treasurer`, `leadership`, sem sessao ou com membership inativa tenta ler a home da secretaria ou preparar comunicacao, quando a requisicao e feita, entao recebe `401` ou `403` sanitizado e nenhum dado de pendencia, pessoa ou modelo e retornado.
13. Dado que o papel atual e `administrator`, quando acessa a navegacao protegida, a rota `/secretaria`, a rota `/communications`, a BFF `/api/secretary/home`, a BFF `/api/communications/templates` e o POST `/api/communications/message-drafts`, entao o acesso e permitido como fluxo operacional equivalente ao de `secretary`; `administrator` deve continuar visivel no shell para `Secretaria` e `Comunicacao`.
14. Dado que a secretaria prepara um rascunho a partir da pendencia, quando o rascunho aparece na tela, entao a entrega continua restrita ao escopo da Story 5.2: texto editavel local em `Textarea`, sem salvar rascunho, sem marcar pendencia como resolvida, sem atualizar `last_contacted_at`, sem copiar, partilhar, envio, WhatsApp nativo, webhook, scheduler ou fila.
15. Dado que a home ou a tela de comunicacao falha tecnicamente, quando existe uma ultima leitura confiavel, entao a UI pode preservar apenas contagens agregadas sem PII; nao deve preservar nomes de pessoas, contato, template custom, `person_id`, `template_key`, `href` contextual ou qualquer query string de pendencia em estado recuperado.
16. Dado que a UI carrega pendencias de comunicacao, abre contexto, prepara rascunho, encontra dados insuficientes, nega acesso ou falha, entao os estados `communication_pending_loaded`, `empty_communication_pending`, `blocked_missing_contact`, `communication_context_loaded`, `communication_context_invalid`, `generating_message_draft`, `message_draft_ready`, `draft_has_missing_contact`, `denied_or_session_invalid` e `server_error` ficam cobertos sem sobreposicao visual, com foco visivel e navegacao por teclado.
17. Dado que esta story entra em review, quando os testes forem executados, entao backend, BFF e frontend provam tenant isolation, roles permitidos/proibidos, minimizacao de response da home, derivacao correta de pendencias prontas/bloqueadas, ordenacao deterministica, deep link seguro para `/communications`, ausencia de chamada direta para `/api/v1`, ausencia de auto-POST ao abrir URL contextual, sanitizacao, ausencia de side effects de envio/resolucao e ausencia de termos visiveis "dashboard", "widget", "KPI", "performance" ou "BI".
18. Dado que esta story esta marcada como `ready-for-dev`, quando um dev agent iniciar dev-story, entao pode executar somente o gate inicial de seguranca ate que `/bmad-review-security` tenha sido executado, findings validos tenham sido incorporados nesta story e o Security Sign-off esteja preenchido.

## Threat Modeling - STRIDE

**Escopo:** Story 5.3 - exibicao de pendencias prontas para comunicacao na home da secretaria e abertura contextual do fluxo de preparacao de mensagem.
**Fronteiras de confianca:** browser same-origin -> BFF Next.js `/api/secretary/home` e `/api/communications/message-drafts` -> Laravel interno `/api/v1/secretary/home` e `/api/v1/communications/message-drafts` -> banco multi-tenant `people` e `communication_templates`.
**Entradas:** `GET /secretaria` sem query para home; links internos para `/communications` com query minimizada `template_key`, `person_type`, `person_id`, `source`; `POST /api/communications/message-drafts` com allowlist da Story 5.2.
**Saidas:** bloco `communication_pending` minimizado, deep links internos e rascunho editavel ja protegido pela Story 5.2. Sem telefone/email bruto, `church_id`, `body_template`, dados de outro tenant, tokens, headers, SQL ou traces.
**Dados sensiveis:** existencia de pessoas com follow-up pendente, nomes, status funcionais, contato resumido, templates custom do tenant, cookie de sessao e membership autenticada.
**Autenticacao/autorizacao:** `resolve.internal.session`; Laravel e autoridade final; home e comunicacao somente para `secretary` e `administrator`.

### Invariantes obrigatorios

- `administrator` deve conseguir navegar e operar `/secretaria` e `/communications`; esta regra ja existe em `src/features/app-shell/navigation-policy.js` e nao pode regredir.
- A home nunca mostra telefone, email, `church_id`, `body_template`, token, header, timestamp tecnico ou dados de outro tenant.
- Contexto de URL em `/communications` nunca e autoridade; o Laravel revalida pessoa e template no POST.
- Query invalida em `/communications` sempre vira `communication_context_invalid`; nao ha estrategia alternativa de "ignorar silenciosamente".
- Abrir URL contextual nunca dispara `POST /api/communications/message-drafts` sem clique explicito.
- Pendencias prontas sao derivadas em leitura e ordenadas deterministicamente; nao criar persistencia paralela.

| STRIDE | Pergunta adversarial | Mitigacao obrigatoria | Status |
| --- | --- | --- | --- |
| Spoofing | Um atacante pode se passar por outro tenant, role ou usuario via query de deep link? | Derivar `church_id` somente de `authenticated_session.membership`; `person_id` e `template_key` da URL sao apenas contexto inicial e devem ser revalidados pelo Laravel no POST de rascunho. | Mitigado na especificacao |
| Tampering | Um atacante pode trocar `person_id`, `person_type` ou `template_key` para preparar mensagem de outra igreja? | `PrepareCommunicationMessageDraftService` ja valida template via `activeBaseOrTenant($churchId)` e pessoa via `Person::forChurch($churchId)` + `person_type`; manter essa validacao e testar deep links adulterados. | Mitigado na especificacao |
| Repudiation | Como investigar acionamento sem gravar PII? | Reusar auditoria metadata-only `communication_message_draft_attempted`; nao registrar nome, contato, `message_body`, `body_template`, cookie, token, headers, SQL ou payload completo. | Mitigado na especificacao |
| Information Disclosure | A home pode vazar contatos ou pessoas de outro tenant? | `communication_pending` deve retornar somente allowlist minimizada e consultas por `church_id`; erros e estados recuperados nao preservam nomes/IDs/template custom apos falha. | Mitigado na especificacao |
| Denial of Service | A home pode ficar pesada por varrer muitas pessoas? | Limitar previews por categoria, retornar contagens agregadas, usar consultas focadas e indices existentes; nao carregar todos os pendentes em memoria. | Mitigado na especificacao |
| Elevation of Privilege | Tesoureiro ou lideranca podem usar pendencias de comunicacao para acessar PII? | Home protegida por `view-secretary-home`; comunicacao protegida por `AreaGuard`, BFF e policy `prepareCommunicationMessageDraft`; testes negativos obrigatorios. | Mitigado na especificacao |
| Cross-Site Scripting | Template custom ou texto de pessoa pode executar HTML/script? | Continuar renderizando rascunho somente em `Textarea`; pendencias usam texto escapado pelo React; proibido `dangerouslySetInnerHTML`, markdown ou rich text. | Mitigado na especificacao |

## Tasks / Subtasks

- [x] Executar gate de seguranca antes de iniciar dev-story (AC: 18)
  - [x] Rodar `/bmad-review-security` contra esta story.
  - [x] Incorporar findings validos diretamente nesta story antes de escrever codigo.
  - [x] Preencher `Security Sign-off` com status, auditor e data.
  - [x] Interromper escrita de codigo de produto se o sign-off ainda estiver pendente.
  - [x] Antes de promover para STG, executar `bash deploy/security-gate.sh stg` em ambiente com `pre-commit` ou `detect-secrets-hook`.
  - [x] Antes de promover para PROD, executar `bash deploy/security-gate.sh prod` em ambiente com `pre-commit` ou `detect-secrets-hook`.

- [x] Criar bloco backend real de pendencias de comunicacao na home da secretaria (AC: 1-7, 11-15, 17)
  - [x] Criar service em `app/Domain/Communications/Services`, por exemplo `BuildCommunicationPendingBlockService`, para evitar colocar regra de comunicacao diretamente em `BuildSecretaryHomeService`.
  - [x] Injetar o novo service em `BuildSecretaryHomeService` e substituir o placeholder `communication_pending_unavailable` por bloco real.
  - [x] Derivar pendencias prontas de `people` do tenant atual:
    - visitantes `person_type = visitor`, status `new` ou `follow_up_needed`, status diferente de `inactive`, com `phone` ou `email`, usando `template_key = visitante_primeiro_contato`;
    - membros `person_type = member`, status `needs_update`, status diferente de `inactive`, com `phone` ou `email`, usando `template_key = atualizacao_cadastro`.
  - [x] Reutilizar uma unica funcao/metodo privado de elegibilidade por categoria dentro do service para montar contagem, preview e href; nao duplicar regras entre queries de contagem e queries de preview.
  - [x] Aplicar ordenacao deterministica obrigatoria por categoria, prioridade de status, `created_at` ascendente e `id` ascendente.
  - [x] Derivar pendencias bloqueadas de pessoas relevantes sem `phone` e sem `email`, com `state = blocked_missing_contact`, sem permitir abrir preparacao.
  - [x] Validar que o template necessario esta ativo e acessivel por `activeBaseOrTenant($churchId)` antes de marcar item como pronto; se faltar template, mostrar categoria bloqueada `missing_template_for_communication` como item agregado da categoria, com `count` dos registros afetados, sem `people_preview`, sem `person_id` e com acao para revisar modelos.
  - [x] Limitar previews por categoria, por exemplo 3 pessoas por categoria, e retornar contagem total para evitar carregar a fila completa.
  - [x] Usar somente dados minimizados no response; nao retornar telefone bruto, email bruto, `church_id`, `body_template`, timestamps ou dados de outro tenant.
  - [x] Transformar `contact_summary` da home em resumo sem valor bruto: `Contato disponivel`, `Telefone informado`, `Email informado` ou `Contato pendente`; nao reutilizar `contactValue()` da Story 5.2 na home.
  - [x] Manter `SecretaryHomeResource` como shape unico da home, sem criar endpoint paralelo para home de comunicacao nesta story.
  - [x] Atualizar `SecretaryHomeTest` ou criar teste dedicado para `communication_pending` cobrindo pronto, bloqueado, vazio, ordenacao deterministica, tenant cruzado, template ausente, roles proibidos, `administrator` permitido e response minimizada.

- [x] Atualizar contrato TypeScript da home da secretaria (AC: 1-7, 15-17)
  - [x] Atualizar `src/features/secretaria/secretary-home.ts` para substituir `UnavailableSecretaryBlock` da comunicacao por tipos discriminados `CommunicationPendingBlock`, `CommunicationPendingItem` e estados reais.
  - [x] Manter `event_schedule` como `UnavailableSecretaryBlock`; nao misturar eventos nesta story.
  - [x] Definir allowlist de campos de pendencia de comunicacao e garantir que `phone`, `email`, `church_id`, `body_template`, `token`, `headers` e `Authorization` nao aparecem no contrato.
  - [x] Definir tipos separados para item pronto, item bloqueado por contato e item bloqueado por template para impedir que `person_id` exista em bloqueios.
  - [x] Atualizar `readSecretaryHome`/normalizadores apenas o suficiente para reconhecer o novo bloco sem converter contratos `snake_case` para `camelCase`.

- [x] Transformar `CommunicationPendingBlock` em bloco acionavel (AC: 1-8, 15-17)
  - [x] Atualizar `src/components/operational/communication-pending-block.tsx` para renderizar estados `communication_pending_loaded`, `empty_communication_pending`, `blocked_missing_contact` e erro/indisponibilidade quando aplicavel.
  - [x] Para itens prontos, renderizar link interno para `href` em `/communications?template_key=...&person_type=...&person_id=...&source=secretary_home`.
  - [x] Para itens bloqueados, renderizar link para complementacao em `/secretaria/pessoas?person_type=all&status=all&contact=missing_contact` ou rota equivalente ja existente.
  - [x] Para item `missing_template_for_communication`, renderizar acao para `/communications` sem `person_id`, explicando que o modelo precisa estar disponivel antes de preparar mensagens.
  - [x] Nao renderizar contato bruto, telefone, email, IDs de tenant ou detalhes tecnicos.
  - [x] Garantir foco visivel, navegacao por teclado, area de clique confortavel e layout sem sobreposicao em desktop/tablet/mobile.
  - [x] Manter linguagem pastoral/operacional; nao usar termos proibidos de SaaS generico.

- [x] Suportar contexto seguro na tela `/communications` (AC: 8-14, 16-17)
  - [x] Atualizar `CommunicationTemplateList` e/ou `CommunicationMessageComposer` para ler query string do App Router no client (`template_key`, `person_type`, `person_id`, `source`) e validar allowlist.
  - [x] Se `source=secretary_home` e os parametros forem validos, selecionar o template ativo correspondente quando a lista carregar.
  - [x] Para contexto direto, permitir preparar rascunho com o `person_id` e `person_type` vindos da pendencia sem obrigar a pessoa a aparecer primeiro na busca manual.
  - [x] Nao disparar `POST /api/communications/message-drafts` somente por carregar a URL; exigir acao explicita da secretaria para preparar o rascunho contextual.
  - [x] Isolar `person_id` contextual em estado local e no payload do BFF; nao escrever esse valor em storage, analytics, console, logs, atributos `data-*`, links externos ou mensagens de erro.
  - [x] Mostrar estado `communication_context_loaded` quando o contexto da pendencia estiver pronto para acao, e `communication_context_invalid` quando a query for invalida ou o template nao estiver ativo.
  - [x] Garantir que `administrator` continua podendo acessar `/communications` pelo shell e operar o contexto da pendencia como `secretary`.
  - [x] Continuar permitindo o fluxo manual da Story 5.2: escolher modelo, buscar pessoa e preparar rascunho.
  - [x] Nao implementar copiar, partilhar, WhatsApp, envio, historico, salvar rascunho, resolucao de pendencia ou `last_contacted_at`.

- [x] Endurecer BFF/frontend contra query abusiva (AC: 9-11, 15-17)
  - [x] Garantir que browser continua sem chamada direta para `/api/v1`, `API_BASE_URL`, token interno ou header `Authorization`.
  - [x] Sanitizar mensagens de contexto invalido sem ecoar `person_id`, `template_key`, PII ou payload suspeito.
  - [x] Rejeitar contexto invalido sempre com estado `communication_context_invalid`; nao implementar fallback silencioso que mantenha selecao anterior.
  - [x] Se a preparacao contextual falhar, reutilizar o tratamento sanitizado de `POST /api/communications/message-drafts`.
  - [x] Nao preservar dados de pessoa/template em estado recuperado apos erro; no maximo preservar contagens agregadas da home, excluindo `display_name`, `person_id`, `template_key`, `href` contextual e query string.
  - [x] Configurar `Referrer-Policy: no-referrer` no Next.js para impedir vazamento de `person_id` contextual por header `Referer` para dominios externos ou internos nao necessarios.
  - [x] Garantir por teste que abrir `/communications?template_key=...&person_type=...&person_id=...&source=secretary_home` nao chama `POST /api/communications/message-drafts` ate clique explicito.

- [x] Cobrir backend com testes focados (AC: 1-7, 11-15, 17)
  - [x] Atualizar `tests/Feature/People/SecretaryHomeTest.php` ou criar `tests/Feature/Communications/CommunicationPendingHomeTest.php`.
  - [x] Testar `secretary` e `administrator` permitidos; `treasurer`, `leadership`, sem sessao e membership inativa proibidos.
  - [x] Testar tenant isolation: pessoas e templates custom de outro tenant nao aparecem nem influenciam contagem.
  - [x] Testar visitantes prontos, membros prontos, pessoas sem contato bloqueadas, template ausente/inativo e home vazia.
  - [x] Testar ordenacao deterministica por categoria, prioridade de status, `created_at` e `id`.
  - [x] Testar que response nao expoe `phone`, `email`, `church_id`, `body_template`, timestamps, token, headers, SQL ou stack trace.
  - [x] Testar que `contact_summary` da home nunca contem valor bruto de telefone ou email.
  - [x] Testar que previews sao limitados e consultas nao fazem `get()` da fila completa antes de aplicar limite.
  - [x] Rodar `cd church-erp-api && php artisan test tests/Feature/People/SecretaryHomeTest.php`.
  - [x] Rodar `cd church-erp-api && php artisan test tests/Feature/Communications/CommunicationMessageDraftTest.php`.
  - [x] Rodar `cd church-erp-api && php artisan test`.
  - [x] Rodar `cd church-erp-api && vendor/bin/pint --test`.

- [x] Cobrir BFF/frontend com os testes atuais do projeto (AC: 8-10, 13-17)
  - [x] Atualizar `church-erp-web/tests/secretary-home.test.mjs` para o novo contrato `communication_pending`.
  - [x] Atualizar `church-erp-web/tests/communication-message-drafts.test.mjs` para contexto de pendencia em `/communications`.
  - [x] Atualizar `church-erp-web/tests/bff-smoke.test.mjs` para exigir o deep link seguro e a ausencia de chamada direta para Laravel.
  - [x] Testar query valida, query invalida, campos bloqueados, template ausente, preparacao contextual, `administrator` no shell/navegacao, no-auto-POST ao abrir URL e preservacao do fluxo manual.
  - [x] Testar estado recuperado sem PII: nenhuma renderizacao ou state helper deve preservar `display_name`, `person_id`, `template_key`, `href` contextual ou query string apos erro.
  - [x] Testar por source inspection que nao ha `dangerouslySetInnerHTML`, markdown/rich text, copiar/partilhar/envio/WhatsApp/scheduler/fila.
  - [x] Rodar `cd church-erp-web && node --test --loader ./tests/node-alias-loader.mjs tests/secretary-home.test.mjs tests/communication-message-drafts.test.mjs tests/bff-smoke.test.mjs`.
  - [x] Rodar `cd church-erp-web && npm test`.
  - [x] Rodar `cd church-erp-web && npm run lint`.
  - [x] Rodar `cd church-erp-web && npm run typecheck`.
  - [x] Rodar `cd church-erp-web && npm run build:smoke`.


### Contexto funcional e objetivo desta story

- Esta story liga a rotina semanal da secretaria ao fluxo de comunicacao ja criado nas Stories 5.1 e 5.2.
- O valor esperado e a secretaria abrir a home, ver quais follow-ups ja podem virar mensagem e entrar em `/communications` com modelo e pessoa pre-contextualizados.
- A fonte de pessoas continua sendo `people`; a fonte de modelos continua sendo `communication_templates`.
- A entrega e uma ponte operacional entre pendencia e preparacao. Ela nao conclui comunicacao externa.
- A pendencia pronta e derivada em tempo de leitura; nao criar tabela persistente de pendencias de comunicacao nesta story.
- "Grupo relacionado" fica fora do MVP desta story porque nao existe fonte de grupos no dominio atual. Nao inventar tabela de grupos, audiencia, campanha ou lista de envio. Se um grupo futuro surgir, deve entrar por story propria.
- Story 5.4 sera responsavel por copiar/partilhar/handoff externo. Esta story deve parar no rascunho editavel.

### Guardrails de implementacao obrigatorios

- Browser chama somente BFF same-origin. A home usa `/api/secretary/home`; modelos usam `/api/communications/templates`; preparacao usa `/api/communications/message-drafts`.
- `administrator` deve continuar autorizado e visivel no shell para `/secretaria` e `/communications`, conforme `src/features/app-shell/navigation-policy.js`.
- Laravel continua autoridade final para autorizacao, tenant scope, validacao, selecao de template e leitura da pessoa.
- `church_id` vem exclusivamente de `authenticated_session.membership`.
- `template_key`, `person_type` e `person_id` em query de `/communications` sao apenas pre-contexto; nunca confiar neles sem revalidacao no POST de rascunho.
- `person_id` em query deve ficar restrito ao fluxo same-origin; nao enviar para analytics, telemetria de terceiros, logs de browser, console, storage, links externos ou mensagens de erro.
- `CommunicationPendingBlock` nao pode expor telefone bruto nem email bruto. Use `contact_summary` funcional e minimizado, sem valor bruto.
- Pendencia sem contato nao pode abrir preparacao; deve direcionar para complementacao de cadastro.
- Query invalida de contexto em `/communications` deve produzir `communication_context_invalid`; nao ignorar silenciosamente nem manter selecao anterior.
- Abertura de URL contextual nunca pode gerar rascunho automaticamente; `POST /api/communications/message-drafts` exige clique explicito.
- Nao marcar pendencia como resolvida, nao alterar `last_contacted_at`, nao criar historico de comunicacao e nao persistir rascunho.
- Nao criar integracao nativa com WhatsApp, webhook, scheduler, filas, provider externo, automacao de envio, QR code ou status de entrega.
- Nao adicionar biblioteca UI, estado global, Jest, Vitest, Playwright ou dependencia externa para cumprir a story.
- Nao aceitar `church_id`, `tenant`, `scope`, `role`, `phone`, `email`, `body_template` ou `message_body` por query como parte do contexto de pendencia.
- Nao transformar `BuildSecretaryHomeService` em god service. Se necessario, delegue a comunicacao para service em `Domain/Communications`.

### Abordagens proibidas

- Criar endpoint Laravel ou BFF novo se o contrato da home e o endpoint de rascunho existente resolverem o caso.
- Criar nova tabela `communication_pending_items`, `message_drafts`, `campaigns`, `audiences`, `groups` ou equivalente nesta story.
- Fazer chamada autenticada direta do browser para Laravel ou expor `API_BASE_URL`/JWT interno no client.
- Resolver autorizacao por visibilidade de UI; `AreaGuard` nao substitui policy/ability do Laravel.
- Reusar telefone/email bruto no bloco da home, em URL, em logs ou em estado recuperado.
- Expor `person_id` contextual em analytics, telemetria, storage, console, links externos, mensagens de erro ou atributos HTML desnecessarios.
- Fazer fallback silencioso de contexto invalido para selecao anterior.
- Auto-gerar rascunho por simples carregamento de URL com query string.
- Usar HTML/markdown/rich text para renderizar template ou rascunho.
- Criar wrapper global customizado de API ou `ResourceCollection` customizada sem necessidade.
- Mudar React, Next, Tailwind ou Laravel como parte desta story sem motivo de seguranca documentado.

### Arquivos provaveis a alterar ou criar

- `church-erp-api/app/Domain/Communications/Services/BuildCommunicationPendingBlockService.php`
- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php`
- `church-erp-api/app/Http/Resources/SecretaryHomeResource.php`
- `church-erp-api/tests/Feature/People/SecretaryHomeTest.php`
- `church-erp-api/tests/Feature/Communications/CommunicationMessageDraftTest.php`
- `church-erp-web/src/features/secretaria/secretary-home.ts`
- `church-erp-web/src/components/operational/communication-pending-block.tsx`
- `church-erp-web/src/components/operational/secretary-home-shell.tsx`
- `church-erp-web/src/components/operational/communication-template-list.tsx`
- `church-erp-web/src/components/operational/communication-message-composer.tsx`
- `church-erp-web/src/app/communications/page.tsx`
- `church-erp-web/tests/secretary-home.test.mjs`
- `church-erp-web/tests/communication-message-drafts.test.mjs`
- `church-erp-web/tests/bff-smoke.test.mjs`
- `_bmad-output/implementation-artifacts/5-3-acionar-pendencia-pronta-para-comunicacao.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Estados obrigatorios da UI ou do fluxo

- `communication_pending_loaded`: existem itens prontos e/ou bloqueados.
- `empty_communication_pending`: nao ha comunicacoes pendentes derivadas de pessoas.
- `blocked_missing_contact`: ha pessoas com pendencia de comunicacao, mas sem contato minimo.
- `communication_context_loaded`: `/communications` recebeu contexto valido e esta pronto para preparar.
- `communication_context_invalid`: query de contexto invalida, template inativo/ausente ou pessoa rejeitada.
- `loading_communication_templates`: preservado da Story 5.1.
- `loading_people_for_message`: preservado para fluxo manual da Story 5.2.
- `generating_message_draft`: POST de rascunho em andamento.
- `message_draft_ready`: rascunho editavel gerado.
- `draft_has_missing_contact`: preservado da Story 5.2 para casos em que backend sinaliza lacuna.
- `denied_or_session_invalid`: `401` ou `403`.
- `server_error`: erro tecnico sanitizado.

### Contratos de dados obrigatorios

**Item pronto**

```json
{
  "category": "visitor_follow_up_ready",
  "label": "Visitantes prontos para primeiro contato",
  "count": 2,
  "next_step_label": "Preparar mensagem",
  "template_key": "visitante_primeiro_contato",
  "href": "/communications?template_key=visitante_primeiro_contato&person_type=visitor&person_id=7&source=secretary_home",
  "people_preview": [
    {
      "person_id": 7,
      "person_type": "visitor",
      "display_name": "Ana Visitante",
      "status": "follow_up_needed",
      "status_label": "Precisa de acompanhamento",
      "contact_summary": "Contato disponivel"
    }
  ]
}
```

**Item bloqueado por falta de contato**

```json
{
  "category": "missing_contact_for_communication",
  "label": "Pessoas com comunicacao pendente sem contato",
  "count": 3,
  "next_step_label": "Completar contato",
  "template_key": null,
  "href": "/secretaria/pessoas?person_type=all&status=all&contact=missing_contact",
  "people_preview": [
    {
      "person_id": 12,
      "person_type": "visitor",
      "display_name": "Carlos Visitante",
      "status": "new",
      "status_label": "Novo",
      "contact_summary": "Contato pendente"
    }
  ]
}
```

**Item bloqueado por template ausente ou inativo**

```json
{
  "category": "missing_template_for_communication",
  "label": "Modelo de comunicacao indisponivel",
  "count": 2,
  "next_step_label": "Revisar modelos",
  "template_key": "visitante_primeiro_contato",
  "href": "/communications",
  "people_preview": []
}
```

- `missing_template_for_communication` e agregado por `template_key`; nao deve listar nomes nem `person_id`, porque o bloqueio e de configuracao/modelo, nao de acao individual pronta.
- `blocked_missing_contact` pode exibir preview minimizado porque o destino e completar cadastro, mas nunca pode apontar para `/communications`.
- `contact_summary` na home usa somente valores sem PII bruta: `Contato disponivel`, `Telefone informado`, `Email informado`, `Contato pendente`.

### Requisitos tecnicos obrigatorios

- Stack local verificada: Laravel `^12.0` em PHP `^8.3`; PHPUnit `^12.5.12`; Next.js `^16.3.4`; React `19.2.4`; Tailwind CSS `^4`; testes web com `node --test`.
- Rotas Laravel sensiveis permanecem sob `/api/v1` e `resolve.internal.session`.
- BFF-to-Laravel deve usar `src/lib/api/client.ts`, `cache: "no-store"` e cookie `AUTH_SESSION_COOKIE_NAME`.
- Contratos HTTP usam `snake_case`; tipos TypeScript de payload e response devem espelhar Laravel.
- `CommunicationTemplate` continua sem `BelongsToAuthenticatedChurch`; templates globais e tenant-scoped precisam coexistir.
- Reusar `PrepareCommunicationMessageDraftService` para validacao real do contexto no POST; nao duplicar validacao de template/pessoa no frontend como autoridade final.
- Usar a mesma elegibilidade base para contagem, preview e href dentro de `BuildCommunicationPendingBlockService`; divergencias entre "aparece como pronto" e "POST sempre falha" devem ser tratadas como bug.
- Ordenacao backend obrigatoria:
  - categorias: `visitor_follow_up_ready`, `member_update_ready`, `missing_contact_for_communication`, `missing_template_for_communication`;
  - status: `follow_up_needed`, `new`, `needs_update`;
  - desempate: `created_at` ascendente e `id` ascendente.
- Response recomendado para `communication_pending` dentro da home:

```json
{
  "state": "communication_pending_loaded",
  "summary": "Ha acompanhamentos prontos para preparar mensagem.",
  "total_count": 3,
  "items": [
    {
      "category": "visitor_follow_up_ready",
      "label": "Visitantes prontos para primeiro contato",
      "count": 2,
      "next_step_label": "Preparar mensagem",
      "template_key": "visitante_primeiro_contato",
      "href": "/communications?template_key=visitante_primeiro_contato&person_type=visitor&person_id=7&source=secretary_home",
      "people_preview": [
        {
          "person_id": 7,
          "person_type": "visitor",
          "display_name": "Ana Visitante",
          "status": "follow_up_needed",
          "status_label": "Precisa de acompanhamento",
          "contact_summary": "Contato disponivel"
        }
      ]
    }
  ]
}
```

- Para bloqueio por falta de contato, `template_key` pode ser `null`, `next_step_label` deve apontar para complementar cadastro, e `href` deve ir para a lista/filtro de pessoas, nao para `/communications`.
- Para bloqueio por template ausente, `href` deve ir para `/communications` sem `person_id`, `people_preview` deve ser vazio e `count` deve informar somente quantidade agregada afetada.
- Usar `urlencode`/`URLSearchParams` para montar `href`; nao concatenar valores sem encoding.
- Se houver contagem maior que preview, exibir contagem agregada e limitar nomes.

### Compliance de arquitetura

- Seguir dominio `app/Domain/Communications` para regra de pendencias de comunicacao.
- `BuildSecretaryHomeService` pode orquestrar o bloco da home, mas nao deve conter toda a regra de comunicacao se a logica crescer.
- Controllers continuam finos: request -> service -> resource.
- Reusar `view-secretary-home`, `viewCommunicationTemplates` e `prepareCommunicationMessageDraft`; criar nova ability somente se houver acao realmente nova no backend.
- Components base ficam em `src/components/ui`; composicao de produto vai para `src/components/operational`; contratos vao para `src/features`.
- Interface segue Tailwind, tokens existentes e direcao "Teal Operacional"; nao criar tema paralelo.
- Browser nunca chama Laravel autenticado diretamente.

### Requisitos de teste

- Backend minimo:
  - `cd church-erp-api && php artisan test tests/Feature/People/SecretaryHomeTest.php`
  - `cd church-erp-api && php artisan test tests/Feature/Communications/CommunicationMessageDraftTest.php`
  - `cd church-erp-api && php artisan test`
  - `cd church-erp-api && vendor/bin/pint --test`
- Frontend minimo:
  - `cd church-erp-web && node --test --loader ./tests/node-alias-loader.mjs tests/secretary-home.test.mjs tests/communication-message-drafts.test.mjs tests/bff-smoke.test.mjs`
  - `cd church-erp-web && npm test`
  - `cd church-erp-web && npm run lint`
  - `cd church-erp-web && npm run typecheck`
  - `cd church-erp-web && npm run build:smoke`
- Testes precisam provar roles permitidos/proibidos, `administrator` navegavel e autorizado, tenant cruzado, response minimizada, deep link seguro, query invalida deterministica, falta de contato, template ausente, ordenacao deterministica, ausencia de auto-POST, estado recuperado sem PII, ausencia de side effects e estados honestos.
- Ausencia de teste DOM real continua risco conhecido do projeto; compensar com source inspection, testes de normalizadores/estado e revisao manual responsiva antes de review.

### Licoes de stories ou reviews anteriores

- Story 5.1 estabeleceu `communication_templates`, listagem segura, policy dedicada, throttle e BFF `/api/communications/templates`; esta story deve estender esse caminho.
- Story 5.2 estabeleceu `PrepareCommunicationMessageDraftService`, `POST /api/communications/message-drafts`, auditoria metadata-only e renderizacao textual em `Textarea`; esta story deve reutilizar, nao recriar.
- Story 5.2 corrigiu auditoria de falhas (`forbidden`, `validation_failed`, `not_found`) sem payload bruto; manter esse padrao.
- Story 5.2 reforcou parser exato de cookie no BFF de comunicacao; nao copiar rotas antigas com regex impreciso.
- `src/features/app-shell/navigation-policy.js` ja permite `administrator` em `/secretaria` e `/communications`; a story deve preservar e testar esse comportamento.
- `BuildSecretaryHomeService` hoje retorna `communication_pending_unavailable`; este e o ponto de extensao principal.
- `SecretaryHomeTest` ja cobre tenant isolation, scope params, previews limitados e ausencia de log de PII; ampliar esse padrao para comunicacao.
- `PersonSearchResource` ja expoe `id`, `person_type`, labels e `contact_summary` no contexto autorizado; a home pode expor `person_id` somente para itens acionaveis, mas nao telefone/email bruto.
- Sanitizacao de `401`, `403`, `404`, `422` e `5xx` foi recorrente em BFFs; toda resposta browser-facing precisa ser fixa e testada.
- Query invalida deve falhar cedo; normalizar silenciosamente parametros suspeitos pode esconder abuso.

### Git Intelligence Summary

- `227aacb implementa a story 5.2` criou preparacao de rascunho via Laravel service, BFF same-origin, composer operacional e testes.
- `5f4328f Merge pull request #24 from WesleyDenia/story_5_2` incorporou a Story 5.2 completa.
- `34b1f3f implementa a story 5.1` criou modelos de comunicacao, listagem segura e resource minimizado.
- `c0de583 Merge pull request #23 from WesleyDenia/story_5_1` incorporou a base da Epic 5.
- Padrao recente: fonte real no Laravel, BFF same-origin, contrato TypeScript em `src/features`, componente operacional em `src/components/operational`, testes backend de feature e web com `node:test`.

### Informacoes tecnicas atuais

- A informacao de seguranca do Next.js e temporalmente sensivel: antes de implementar, verificar o blog oficial do Next.js e `npm audit` para a linha instalada. Em 22/09/2026, o update out-of-band `16.3.6`/`15.5.26` corrigiu vulnerabilidade critica em `next/og`; em 29/09/2026, o projeto foi atualizado para `next@^16.3.7` e `eslint-config-next@^16.3.7`, versao mais recente disponivel no npm naquele momento. O blog oficial ainda anuncia release de seguranca planejada para 30/09/2026 com Next.js `16.3.8`; revalidar e aplicar esse patch antes de promocao se ja estiver publicado.
- React `19.3` foi publicado em 09/09/2026 com View Transitions estaveis e Trusted Types support, mas o projeto esta pinado em React `19.2.4`. Nao atualizar React nesta story sem necessidade explicita e testes dedicados.
- Tailwind CSS mostra linha `v4.3` no site oficial; o projeto usa `tailwindcss@^4` e `@tailwindcss/postcss@^4`. Seguir tokens/utilitarios existentes e evitar recursos modernos com suporte limitado quando nao forem necessarios.
- Laravel 12 docs continuam recomendando Gates/Policies para autorizacao e API Resources (`JsonResource`) para transformar responses; manter esses mecanismos em vez de wrappers manuais.
- Fontes consultadas: Next.js Blog (`https://nextjs.org/blog`), React 19.3 (`https://react.dev/blog/2026/09/09/react-19-3`), Tailwind CSS (`https://tailwindcss.com/` e `/docs/compatibility`), Laravel 12 Authorization/API Resources/Rate Limiting docs.

### Project Structure Notes

- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php` contem hoje o placeholder `communication_pending_unavailable`.
- `church-erp-api/app/Http/Resources/SecretaryHomeResource.php` ja inclui `communication_pending` no shape da home.
- `church-erp-api/tests/Feature/People/SecretaryHomeTest.php` e o melhor ponto para validar o novo bloco sem criar endpoint paralelo.
- `church-erp-web/src/components/operational/communication-pending-block.tsx` hoje e placeholder visual e deve virar bloco acionavel.
- `church-erp-web/src/features/secretaria/secretary-home.ts` hoje tipa `communication_pending` como `UnavailableSecretaryBlock`.
- `church-erp-web/src/components/operational/communication-template-list.tsx` ja carrega templates e renderiza `CommunicationMessageComposer`.
- `church-erp-web/src/components/operational/communication-message-composer.tsx` ja prepara rascunho via `/api/communications/message-drafts`, mas ainda exige selecao manual de pessoa.
- `church-erp-web/src/app/api/communications/message-drafts/route.ts` ja tem allowlist, same-origin, cookie parser seguro e sanitizacao; reusar.
- `church-erp-web/src/app/api/secretary/home/route.ts` ainda usa regex simples de cookie; esta story nao precisa mexer se nao for necessario, mas nao copie esse padrao para novas rotas.
- `church-erp-web/src/features/app-shell/navigation-policy.js` permite `administrator` em `Secretaria` e `Comunicacao`; testes devem bloquear regressao nessa matriz.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 5, Story 5.3, FR23c e FR24c.
- `_bmad-output/planning-artifacts/prd.md` - escopo 8.5 Comunicacoes, Jornada B e FR-7 Preparacao de Comunicacao.
- `_bmad-output/planning-artifacts/architecture.md` - dominio `Communications`, BFF, policies, tenancy, resources e estrutura de projeto.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - jornada da secretaria, `CommunicationPendingBlock`, feedback, navegacao, responsividade e acessibilidade.
- `_bmad-output/project-context.md` - stack, BFF, testes, arquitetura, seguranca e regras criticas para agentes.
- `_bmad-output/implementation-artifacts/5-1-manter-modelos-pre-definidos-de-comunicacao.md` - padroes de templates e listagem segura.
- `_bmad-output/implementation-artifacts/5-2-preparar-mensagem-a-partir-de-dados-de-pessoas.md` - padroes de rascunho, auditoria, BFF e anti-XSS.
- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php`
- `church-erp-api/app/Domain/Communications/Services/PrepareCommunicationMessageDraftService.php`
- `church-erp-api/app/Domain/Communications/Services/ListCommunicationTemplatesService.php`
- `church-erp-api/app/Http/Resources/SecretaryHomeResource.php`
- `church-erp-api/tests/Feature/People/SecretaryHomeTest.php`
- `church-erp-web/src/components/operational/communication-pending-block.tsx`
- `church-erp-web/src/components/operational/communication-message-composer.tsx`
- `church-erp-web/src/components/operational/communication-template-list.tsx`
- `church-erp-web/src/features/secretaria/secretary-home.ts`
- `church-erp-web/src/app/api/communications/message-drafts/route.ts`
- Web: https://nextjs.org/blog
- Web: https://react.dev/blog/2026/09/09/react-19-3
- Web: https://tailwindcss.com/docs/compatibility
- Web: https://laravel.com/framework/docs/12.x/authorization
- Web: https://laravel.com/framework/docs/12.x/eloquent-resources

### Checklist pre-review

- `/bmad-review-security` foi executado, findings validos foram incorporados e Security Sign-off foi preenchido antes de codigo de produto.
- Home da secretaria nao retorna mais `communication_pending_unavailable` quando o bloco real puder ser calculado.
- `communication_pending` diferencia pendencias prontas, bloqueadas por contato e estado vazio.
- Pendencias aparecem em ordenacao deterministica por categoria, status, `created_at` e `id`.
- `contact_summary` da home nao contem telefone nem email bruto.
- Browser chama somente BFF same-origin; nao ha chamada direta para Laravel, `API_BASE_URL`, token interno ou header `Authorization` no client.
- Links de pendencia pronta levam a `/communications` com query minimizada e URL-encoded.
- `Referrer-Policy: no-referrer` permanece configurado no Next.js para impedir vazamento de query contextual com `person_id`.
- `/communications` valida query de contexto, rejeita invalidos como `communication_context_invalid`, nao mantem selecao anterior suspeita e nao auto-dispara POST sem acao explicita da secretaria.
- `person_id` contextual nao e enviado a analytics, telemetria de terceiros, storage, console, links externos, mensagens de erro ou atributos HTML desnecessarios.
- Laravel revalida template e pessoa no tenant atual antes de gerar rascunho.
- `secretary` e `administrator` acessam; `treasurer`, `leadership`, sem sessao e membership inativa nao recebem dados.
- `administrator` permanece com links e acesso protegido a `/secretaria` e `/communications` no shell.
- Pessoas de outro tenant, inativas, tipo divergente, template inativo/ausente e query adulterada nao vazam existencia nem PII.
- Response da home nao expoe `phone`, `email`, `church_id`, `body_template`, timestamps internos, headers, token, SQL ou stack trace.
- Estado recuperado apos erro preserva somente contagens agregadas, sem `display_name`, `person_id`, `template_key`, `href` contextual ou query string.
- Rascunho continua local/editavel e nao persistido; nenhum envio, copiar, partilhar, WhatsApp, webhook, scheduler, fila, `last_contacted_at` ou resolucao de pendencia foi implementado.
- UI cobre loaded, empty, blocked, context loaded, context invalid, denied e server error sem sobreposicao mobile/desktop; foco e teclado funcionam.
- Componentes usam `src/components/ui`, `Surface`, Tailwind e tokens existentes; nao ha biblioteca UI paralela.
- Textos visiveis nao usam "dashboard", "widget", "KPI", "performance" ou "BI".
- Backend e frontend passam nos comandos de teste, lint, typecheck, smoke build e Pint listados.
- Promocao STG/PROD exige `bash deploy/security-gate.sh stg` e `bash deploy/security-gate.sh prod` em ambiente com `pre-commit` ou `detect-secrets-hook`; ausencia deste gate bloqueia promocao, nao dev/local.

### Security Sign-off

- Status: Approved with Security Notes
- Auditor: Vex - Security Auditor via `/bmad-review-security`
- Data: 2026-09-29
- Findings incorporados: SEC-H-001 corrigido com `next@^16.3.7`; SEC-M-001 corrigido com `Referrer-Policy: no-referrer`; SEC-L-001 corrigido com `laravel/framework v12.69.3` e `league/flysystem 3.36.0`; SEC-L-002 corrigido por este sign-off.
- Gates executados: `composer audit` passou; `cd church-erp-web && npm audit --omit=dev` passou; `cd church-erp-api && npm audit --omit=dev` passou; varredura focalizada de segredos em story e `.env.example` passou. `detect-secrets/pre-commit` permanece N/A em dev/CI e obrigatorio apenas para promocao STG/PROD.

### Story Completion Status

- Status final desta story: `done`.
- Nota de conclusao do contexto: implementacao concluida com backend, BFF/frontend, correcoes de code review e validacoes automatizadas verdes em 2026-09-29.

### Senior Developer Review (AI)

- Resultado: Approved after fixes.
- Findings corrigidos: teste `bff-smoke` agora cobre deep link contextual seguro e ausencia de auto-POST; recuperacao tecnica da home preserva somente contagens agregadas; BFF `/api/secretary/home` usa parser de cookie exato; seletor de pessoa em `/communications` mostra a pendencia contextual carregada mesmo quando a pessoa nao esta nos primeiros resultados manuais.
- Validacoes de review executadas: `cd church-erp-api && php artisan test tests/Feature/People/SecretaryHomeTest.php tests/Feature/Communications/CommunicationMessageDraftTest.php`; `cd church-erp-web && node --test --loader ./tests/node-alias-loader.mjs tests/secretary-home.test.mjs tests/communication-message-drafts.test.mjs tests/bff-smoke.test.mjs`; `cd church-erp-web && npm run lint`; `cd church-erp-web && npm run typecheck`.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-09-29: Gate inicial de seguranca executado antes de codigo de produto. `composer audit`, `cd church-erp-web && npm audit --omit=dev` e `cd church-erp-api && npm audit --omit=dev` passaram; varredura focalizada de segredos em story, `.env.example`, `deploy` e `.github` nao encontrou segredo material.
- 2026-09-29: Backend implementado com `BuildCommunicationPendingBlockService`, integracao em `BuildSecretaryHomeService`, ordenacao deterministica e response minimizada.
- 2026-09-29: Frontend implementado com contrato real de `communication_pending`, bloco acionavel na home, parser de contexto seguro em `/communications` e preparacao contextual sem auto-POST.
- 2026-09-29: Validacoes executadas: `composer audit`; `cd church-erp-web && npm audit --omit=dev`; `cd church-erp-api && npm audit --omit=dev`; `cd church-erp-api && php artisan test tests/Feature/People/SecretaryHomeTest.php`; `cd church-erp-api && php artisan test tests/Feature/Communications/CommunicationMessageDraftTest.php`; `cd church-erp-api && php artisan test`; `cd church-erp-api && vendor/bin/pint --test`; `cd church-erp-web && node --test --loader ./tests/node-alias-loader.mjs tests/secretary-home.test.mjs tests/communication-message-drafts.test.mjs tests/bff-smoke.test.mjs`; `cd church-erp-web && npm test`; `cd church-erp-web && npm run lint`; `cd church-erp-web && npm run typecheck`; `cd church-erp-web && npm run build:smoke`.
- 2026-09-29: Code review corrigiu achados criticos/altos/medios: `bff-smoke` passou a provar deep link seguro e no-auto-POST; recuperacao tecnica guarda somente contagens agregadas; BFF da home usa cookie parser exato; contexto carregado aparece no seletor de pessoa.

### Completion Notes List

- Gate de seguranca validado com decisao `Approved with Security Notes`; promocao STG/PROD permanece condicionada a `bash deploy/security-gate.sh stg|prod` em ambiente com `pre-commit` ou `detect-secrets-hook`.
- Home da secretaria agora deriva pendencias de comunicacao de `people` e `communication_templates`, separando itens prontos, falta de contato, template ausente e estado vazio sem retornar contato bruto ou dados de outro tenant.
- `/communications` valida query contextual minimizada, rejeita campos suspeitos como `communication_context_invalid`, preseleciona modelo/pessoa quando seguro e preserva clique explicito para gerar rascunho via BFF.
- Testes backend e web cobrem tenant isolation, roles permitidos/proibidos, minimizacao, template ausente, ordenacao, deep link seguro, ausencia de auto-POST, sanitizacao e ausencia de side effects de envio/resolucao.

### File List

- `_bmad-output/implementation-artifacts/5-3-acionar-pendencia-pronta-para-comunicacao.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `church-erp-api/app/Domain/Communications/Services/BuildCommunicationPendingBlockService.php`
- `church-erp-api/app/Domain/People/Models/Person.php`
- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php`
- `church-erp-api/composer.lock`
- `church-erp-api/tests/Feature/People/SecretaryHomeTest.php`
- `church-erp-web/next.config.ts`
- `church-erp-web/package-lock.json`
- `church-erp-web/package.json`
- `church-erp-web/src/app/api/secretary/home/route.ts`
- `church-erp-web/src/components/operational/communication-message-composer.tsx`
- `church-erp-web/src/components/operational/communication-pending-block.tsx`
- `church-erp-web/src/components/operational/communication-template-list.tsx`
- `church-erp-web/src/components/operational/people-followup-block.tsx`
- `church-erp-web/src/components/operational/secretary-home-shell.tsx`
- `church-erp-web/src/features/communications/message-draft.ts`
- `church-erp-web/src/features/secretaria/secretary-home.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`
- `church-erp-web/tests/communication-message-drafts.test.mjs`
- `church-erp-web/tests/secretary-home.test.mjs`

### Change Log

- 2026-09-29: Implementada Story 5.3 com bloco real de pendencias de comunicacao, deep link seguro para preparacao e cobertura backend/frontend completa.
- 2026-09-29: Corrigidos achados de code review e story marcada como `done`.
