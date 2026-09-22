# Story 5.2: Preparar mensagem a partir de dados de pessoas

Status: done

<!-- Implementation gate: esta story combina modelos de comunicacao com dados pessoais de membros e visitantes. O primeiro passo obrigatorio do dev-story e executar /bmad-review-security, incorporar findings validos nesta story e preencher o Security Sign-off antes de escrever codigo de produto. Varredura detect-secrets/pre-commit nao bloqueia dev/local; ela permanece gate obrigatorio apenas para promocao STG/PROD. -->

## Story

As a secretaria da igreja,
I want gerar uma mensagem usando dados de membros e visitantes,
so that eu consiga personalizar a comunicacao sem copiar informacoes manualmente.

## Acceptance Criteria

1. Dado que um usuario com perfil `secretary` ou `administrator` acessa `/communications`, quando seleciona um modelo ativo e uma pessoa elegivel do tenant atual, entao o browser chama somente o BFF same-origin `POST /api/communications/message-drafts`, o BFF chama Laravel em `POST /api/v1/communications/message-drafts`, e o browser nunca chama Laravel autenticado diretamente.
2. Dado que a secretaria informa JSON root com `template_key`, `person_type` e `person_id` validos, quando o rascunho e gerado, entao a resposta contem uma mensagem editavel preenchida com nome, contato disponivel e status funcional da pessoa, sem persistir rascunho, sem disparar envio e sem marcar pendencia como resolvida.
3. Dado que o `body_template` possui placeholders conhecidos, quando o rascunho e gerado, entao o backend substitui apenas `{{nome}}`, `{{contato}}` e `{{status}}`; qualquer placeholder desconhecido permanece visivel no texto e e retornado em `missing_fields` com `field`, `label`, `placeholder` e `message`, sem tentar inferir dados sensiveis.
4. Dado que o `body_template` nao possui placeholders conhecidos, quando o rascunho e gerado, entao o backend preserva o texto base e acrescenta exatamente o bloco `\n\nDados para personalizar:\nNome: {nome}\nContato: {contato}\nSituacao: {status}` para cumprir FR26 sem depender de alteracao manual nos seeds antigos.
5. Dado que faltam telefone e email da pessoa, quando o rascunho e gerado, entao o sistema inclui marcador editavel de contato pendente, retorna `missing_fields` com `contact`, mostra alerta claro na UI e permite editar manualmente o texto.
6. Dado que falta apenas um canal de contato, quando o rascunho e gerado, entao o contato existente e usado; o campo ausente nao bloqueia a preparacao nem aparece como dado inventado.
7. Dado que o modelo selecionado e global ativo ou custom ativo do tenant atual, quando existe override custom com o mesmo `template_key`, entao o custom do tenant atual e usado; modelos inativos, de outro tenant ou inexistentes retornam erro sanitizado sem revelar existencia.
8. Dado que a pessoa selecionada pertence ao tenant atual e nao esta `inactive`, quando a requisicao e feita, entao ela pode gerar rascunho; `needs_update` e permitido somente com alerta `profile_needs_update` em `missing_fields`; pessoas de outro tenant, IDs inexistentes, `person_type` divergente ou status `inactive` retornam `404` ou `422` sanitizado sem PII.
9. Dado que usuario `treasurer`, `leadership`, sem sessao ou com membership inativa tenta gerar rascunho, quando a requisicao e feita, entao recebe `401` ou `403` sanitizado, cookie e limpo em `401`, e a resposta nao revela template, pessoa, contato, `church_id`, token, SQL, stack trace ou payload upstream.
10. Dado que o browser envia query string, campos extras ou qualquer campo de escopo/dado sensivel fora da allowlist, incluindo `church_id`, `tenant`, `scope`, `role`, `roles`, `permission`, `user_id`, `id`, `template_id`, `person`, `person_id` em query ou nested object, `status`, `phone`, `email`, `body_template`, `message_body`, `created_at` ou `updated_at`, quando o BFF ou Laravel processa a requisicao, entao rejeita com `422` e mensagem operacional clara antes de executar regra de dominio. `person_id` e permitido apenas como propriedade root do JSON permitido.
11. Dado que a secretaria ajusta manualmente o rascunho na tela, quando edita o texto, entao a edicao acontece apenas no estado local do frontend nesta story; nao ha salvamento em banco, historico, copiar, partilhar, WhatsApp nativo, webhook, scheduler ou fila.
12. Dado que um template custom contem HTML, markdown, script, URL ou caracteres especiais, quando o rascunho e exibido, entao a UI renderiza o conteudo apenas como texto dentro de `Textarea`, sem `dangerouslySetInnerHTML`, markdown renderer, rich text renderer ou interpretacao de HTML.
13. Dado que a UI carrega, seleciona pessoa/modelo, gera rascunho, falha, nega acesso ou encontra lacunas, entao os estados `loading_people_for_message`, `ready_to_prepare_message`, `generating_message_draft`, `message_draft_ready`, `draft_has_missing_contact`, `validation_error`, `denied_or_session_invalid` e `server_error` ficam cobertos sem sobreposicao visual, com foco visivel e navegacao por teclado.
14. Dado que esta story entra em review, quando os testes forem executados, entao backend, BFF e frontend provam autorizacao por perfil, tenant isolation de template e pessoa, rejeicao de payload/query abusivo, minimizacao de resposta, substituicao de placeholders, fallback sem placeholders, lacunas de contato, ausencia de persistencia/envio, sanitizacao de erro, renderizacao textual anti-XSS e ausencia de chamadas diretas do browser para `/api/v1`.
15. Dado que esta story esta marcada como `ready-for-dev`, quando um dev agent iniciar dev-story, entao pode executar somente o gate inicial de seguranca ate que `/bmad-review-security` tenha sido executado, findings validos tenham sido incorporados nesta story e o Security Sign-off esteja preenchido.

## Threat Modeling - STRIDE

**Escopo:** Story 5.2 - geracao de rascunho editavel a partir de um modelo de comunicacao e uma pessoa do tenant atual.
**Fronteiras de confianca:** browser same-origin -> BFF Next.js `/api/communications/message-drafts` -> Laravel interno `/api/v1/communications/message-drafts` -> banco multi-tenant `communication_templates` e `people`.
**Entradas:** `POST` com `Content-Type: application/json` e JSON root com allowlist estrita: `template_key`, `person_type`, `person_id`. Sem query string, nested payloads ou aliases.
**Saidas:** rascunho minimizado com texto renderizado, metadados seguros do template, pessoa selecionada minimizada, `missing_fields` e flags de UI. Sem `church_id`, IDs internos do template, `body_template` cru, timestamps, tokens, headers, SQL ou stack trace.
**Dados sensiveis:** nome, telefone, email, status de pessoa, templates custom do tenant, cookie de sessao e membership autenticada.
**Autenticacao/autorizacao:** sessao interna resolvida por `resolve.internal.session`; Laravel e autoridade final; apenas `secretary` e `administrator` podem gerar rascunho.

| STRIDE | Pergunta adversarial | Mitigacao obrigatoria | Status |
| --- | --- | --- | --- |
| Spoofing | Um atacante pode se passar por outro tenant, role ou usuario via payload/query/header? | Derivar `church_id` somente de `authenticated_session.membership`; rejeitar query string; ignorar role/tenant vindo do browser; policy dedicada. | Mitigado na especificacao |
| Tampering | Um atacante pode trocar `template_key`, `person_id` ou `person_type` para combinar dados indevidos? | Validar payload allowlist; carregar template via `activeBaseOrTenant($churchId)` com override tenant; carregar pessoa via `Person::forChurch($churchId)` e `person_type`; bloquear `inactive`. | Mitigado na especificacao |
| Repudiation | Como investigar abuso sem vazar PII? | Registrar auditoria metadata-only para cada tentativa de geracao: actor/user id, `church_id`, `person_type`, `person_id`, `template_key`, outcome, timestamp e correlation id. Nao registrar body completo, `message_body`, contato bruto, `body_template`, cookie, token, headers, SQL ou payload completo. | Mitigado na especificacao |
| Information Disclosure | Que PII ou dado de outro tenant pode vazar? | Response minimizado; erros fixos; nao retornar `church_id`, `body_template` cru, IDs de template, timestamps ou registros de outro tenant; testes negativos de tenant cruzado. | Mitigado na especificacao |
| Denial of Service | Geracao de rascunho pode ser abusada? | Payload pequeno, sem busca livre neste endpoint, throttle dedicado por usuario+igreja, limite para `template_key`, limite de leitura/renderizacao de `body_template` e limite de `message_body`. | Mitigado na especificacao |
| Elevation of Privilege | Tesoureiro/lideranca pode acessar dados pessoais por comunicacao? | Ability dedicada `prepareCommunicationMessageDraft` permitindo apenas `secretary` e `administrator`; `AreaGuard` visual nao substitui policy Laravel. | Mitigado na especificacao |
| Cross-Site Scripting | Template custom pode executar HTML/script no browser? | Renderizar rascunho somente como valor textual de `Textarea`; proibir `dangerouslySetInnerHTML`, markdown, rich text e interpretacao de HTML. | Mitigado na especificacao |

## Tasks / Subtasks

- [x] Executar gate de seguranca antes de iniciar dev-story (AC: 15)
  - [x] Rodar `/bmad-review-security` contra esta story.
  - [x] Incorporar findings validos diretamente nesta story antes de escrever codigo.
  - [x] Preencher `Security Sign-off` com status, auditor e data.
  - [x] Interromper escrita de codigo de produto se o sign-off ainda estiver pendente.
  - [x] Antes de promover para STG, executar `bash deploy/security-gate.sh stg` em ambiente com `pre-commit` ou `detect-secrets-hook`.
  - [x] Antes de promover para PROD, executar `bash deploy/security-gate.sh prod` em ambiente com `pre-commit` ou `detect-secrets-hook`.

- [x] Criar contrato backend de rascunho de mensagem (AC: 1-10, 12, 14)
  - [x] Criar service em `app/Domain/Communications/Services`, por exemplo `PrepareCommunicationMessageDraftService`.
  - [x] Criar suporte pequeno para renderizacao de template, por exemplo `app/Domain/Communications/Support/RenderCommunicationTemplateBody.php`, com substituicao exclusiva de `{{nome}}`, `{{contato}}` e `{{status}}`, deteccao de placeholders desconhecidos e limite de tamanho de saida.
  - [x] Usar fallback deterministico quando o template nao contem placeholders conhecidos: preservar corpo base e acrescentar exatamente `\n\nDados para personalizar:\nNome: {nome}\nContato: {contato}\nSituacao: {status}`.
  - [x] Carregar templates com a mesma regra da Story 5.1: globais ativos + tenant ativo, custom do tenant substitui global por `template_key`, sem usar `BelongsToAuthenticatedChurch` em `CommunicationTemplate`.
  - [x] Carregar pessoa apenas por `Person::query()->forChurch($churchId)->where('person_type', $personType)->whereKey($personId)` e bloquear `status = inactive`.
  - [x] Criar `StoreCommunicationMessageDraftRequest` com payload root allowlist exata: `template_key` string ate 80, `person_type` em `member|visitor`, `person_id` inteiro positivo seguro.
  - [x] Exigir `Content-Type: application/json` no BFF e tratar JSON invalido ou ausente com erro sanitizado.
  - [x] Rejeitar qualquer query string, campo extra, nested object ou tentativa de enviar escopo/dados de pessoa/modelo pelo browser com `422` sanitizado.
  - [x] Criar resource, por exemplo `CommunicationMessageDraftResource`, expondo somente dados necessarios para UI e contrato `data: { template, person, draft }`.
  - [x] Registrar `POST /api/v1/communications/message-drafts` dentro de `resolve.internal.session`, com throttle dedicado como `throttle:communication-message-drafts`.
  - [x] Registrar ability dedicada obrigatoria `prepareCommunicationMessageDraft`, preferencialmente em policy separada `CommunicationMessageDraftPolicy` ou metodo dedicado sem alterar o contrato de listagem da Story 5.1, permitindo somente `secretary` e `administrator`.
  - [x] Registrar auditoria metadata-only para tentativas de gerar rascunho, incluindo actor/user id, `church_id`, `person_type`, `person_id`, `template_key`, outcome, timestamp e correlation id, sem gravar `message_body`, contato bruto, `body_template`, cookie, token, headers, SQL ou payload completo.
  - [x] Nao criar tabela, migration ou modelo persistente de rascunho nesta story.

- [x] Implementar BFF e contrato TypeScript de composicao (AC: 1, 9-14)
  - [x] Criar `church-erp-web/src/app/api/communications/message-drafts/route.ts` com `POST` apenas, usando `callLaravel("/api/v1/communications/message-drafts")`, `cache: "no-store"` e cookie `AUTH_SESSION_COOKIE_NAME`.
  - [x] Validar same-origin em `POST`, exigir `Content-Type: application/json`, rejeitar query string e rejeitar payload com campos fora da allowlist antes de chamar Laravel.
  - [x] Ler cookie pelo helper exato usado em `src/app/api/communications/templates/route.ts`; nao repetir o regex impreciso ainda existente em rotas antigas de pessoas.
  - [x] Sanitizar `401`, `403`, `404`, `422` e `5xx`; limpar cookie em `401`; nunca repassar `body.message` upstream quando puder conter PII ou detalhe tecnico.
  - [x] Criar `src/features/communications/message-draft.ts` com tipos `snake_case`, normalizador de response, allowlists de payload/response e lista de estados de UI.
  - [x] Garantir que o browser nao envia `church_id`, `phone`, `email`, `status`, `body_template`, `message_body` inicial ou dados de pessoa fora de `person_type` e `person_id`.

- [x] Atualizar UI de comunicacoes para preparar rascunho editavel (AC: 1-6, 11-13)
  - [x] Preservar `AreaGuard area="communications"` em `src/app/communications/page.tsx`.
  - [x] Atualizar `communication-template-list.tsx` para permitir escolher um modelo ativo, removendo o texto "Preparar em etapa futura" apenas quando o fluxo real estiver implementado.
  - [x] Criar composicao operacional em `src/components/operational`, por exemplo `communication-message-composer.tsx`, reutilizando `Surface`, `Button`, `Input`, `Select`, `Textarea` e primitives existentes.
  - [x] Reutilizar a busca existente `/api/secretary/people` para selecionar pessoa, sem criar busca paralela que exponha telefone/email antes da selecao.
  - [x] Ao gerar rascunho, chamar `POST /api/communications/message-drafts` com `template_key`, `person_type` e `person_id`.
  - [x] Renderizar `Textarea` editavel com `message_body`; edicoes ficam somente no estado local e conteudo do template nunca e renderizado como HTML/markdown/rich text.
  - [x] Mostrar alerta claro para `missing_fields` sem bloquear edicao manual, incluindo `contact`, `unknown_placeholder` e `profile_needs_update` quando retornados.
  - [x] Nao implementar copiar, partilhar, WhatsApp, envio, historico, salvar rascunho, pendencia pronta ou resolucao de pendencia nesta story.
  - [x] Manter linguagem pastoral/operacional; nao usar termos visiveis "dashboard", "widget", "KPI", "performance" ou "BI".
  - [x] Garantir layout desktop/tablet/mobile sem sobreposicao e navegacao por teclado para busca, selecao, gerar rascunho e editar texto.

- [x] Cobrir backend com testes focados (AC: 2-10, 12, 14)
  - [x] Criar `tests/Feature/Communications/CommunicationMessageDraftTest.php`.
  - [x] Criar `tests/Unit/Communications/RenderCommunicationTemplateBodyTest.php` ou equivalente.
  - [x] Testar sucesso para `secretary` e `administrator` com template global, template custom do tenant e override por `template_key`.
  - [x] Testar pessoa `member` e `visitor`, com contato completo, contato parcial e sem contato.
  - [x] Testar fallback deterministico de template sem placeholders, substituicao de placeholders conhecidos e limite de tamanho do rascunho.
  - [x] Testar placeholder desconhecido permanecendo visivel e retornando `missing_fields` com `field`, `label`, `placeholder` e `message`.
  - [x] Testar bloqueio de `treasurer`, `leadership`, sem sessao e membership inativa.
  - [x] Testar tenant cruzado para template e pessoa, template inativo, pessoa `inactive`, `person_type` divergente e ID inexistente.
  - [x] Testar rejeicao de query string, campos extras, payload aninhado, JSON invalido, content-type ausente/incorreto e campos de escopo/dados sensiveis no payload.
  - [x] Testar que nao ha insert/update em tabela de rascunho e que `people.last_contacted_at` nao muda nesta story.
  - [x] Testar que response nao expoe `church_id`, `church_scope_id`, template `id`, `body_template`, timestamps, token, headers, SQL, stack trace nem dados de outro tenant.
  - [x] Testar que rota tem middleware `resolve.internal.session` e `throttle:communication-message-drafts`.
  - [x] Testar que a auditoria registra somente metadados permitidos e nao registra `message_body`, telefone, email, `body_template`, cookie, token, headers, SQL ou payload completo.

- [x] Cobrir BFF/frontend com os testes atuais do projeto (AC: 1, 9-14)
  - [x] Criar `church-erp-web/tests/communication-message-drafts.test.mjs`.
  - [x] Atualizar `church-erp-web/tests/communication-templates.test.mjs` e `bff-smoke.test.mjs` para reconhecer o novo fluxo.
  - [x] Testar normalizador, payload allowlist, estados de UI, BFF same-origin, content-type JSON, rejeicao de query/payload extra, cookie limpo em `401` e sanitizacao de `403`/`404`/`422`/`5xx`.
  - [x] Testar por source inspection que o browser chama somente `/api/communications/message-drafts` e `/api/secretary/people`, nunca `/api/v1`, `API_BASE_URL` ou token interno.
  - [x] Testar por source inspection que a UI usa `Textarea`, nao usa `dangerouslySetInnerHTML`/markdown/rich text, cobre lacunas de contato/status/placeholders, nao implementa copiar/partilhar/envio e nao usa termos visiveis proibidos.
  - [x] Rodar `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke` no `church-erp-web`.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story transforma a lista real de modelos da Story 5.1 em um fluxo de preparacao de mensagem com dados de pessoas ja existentes.
- O fluxo principal e: secretaria abre `/communications`, escolhe um modelo, busca/seleciona um membro ou visitante elegivel, gera rascunho, ve lacunas de contato se houver e edita o texto antes de uma etapa futura de handoff.
- O resultado desta story e um rascunho editavel em tela. O rascunho nao e salvo, enviado, copiado, compartilhado, versionado, auditado ou vinculado a pendencia nesta entrega.
- A fonte de pessoas e o dominio `People` ja entregue na Epic 4. Nao criar nova tabela de destinatarios, nova modelagem de membros/visitantes ou nova projection com PII.
- A fonte de modelos e `communication_templates` da Story 5.1. O campo `body_template` ja existe, mas nao foi exposto na listagem; esta story pode usa-lo server-side para gerar `message_body` renderizado.
- Pessoas elegiveis nesta story: `member` com status diferente de `inactive`; `visitor` com status diferente de `inactive`. Bloquear `inactive` para evitar preparar comunicacao para registro operacionalmente encerrado. Se `status = needs_update`, permitir rascunho apenas com `missing_fields.profile_needs_update` para alertar que o cadastro precisa conferencia.
- Story 5.3 abre o fluxo a partir de pendencias. Story 5.4 faz copiar/partilhar/handoff externo. Nao antecipar esses escopos.

### Guardrails de implementacao obrigatorios

- Browser chama somente BFF same-origin: `GET /api/communications/templates`, `GET /api/secretary/people` e `POST /api/communications/message-drafts`.
- Laravel continua autoridade final para autorizacao, tenant scope, validacao, selecao do template, leitura da pessoa e renderizacao do rascunho.
- `church_id` vem exclusivamente de `authenticated_session.membership`; qualquer tentativa de escopo pelo browser deve falhar cedo.
- `template_key` identifica o modelo publicamente seguro; nao aceitar template `id` vindo do browser.
- `person_id` e `person_type` identificam a pessoa selecionada; o backend precisa validar os dois juntos no tenant atual.
- Retornar contato somente da pessoa selecionada e somente no contexto do rascunho. A busca de pessoas continua minimizada por `PersonSearchResource` e nao deve passar a listar telefone/email.
- `body_template` cru nao deve ir ao browser; o browser recebe apenas `draft.message_body` renderizado e editavel.
- Renderizar template custom somente como texto. Nao usar `dangerouslySetInnerHTML`, parser markdown, rich text renderer, `iframe`, preview HTML ou qualquer interpretacao de markup.
- Formatar contato de modo deterministico: se telefone e email existirem, usar `Telefone: {phone}; Email: {email}`; se houver apenas telefone, usar `Telefone: {phone}`; se houver apenas email, usar `Email: {email}`; se ambos faltarem, usar `[contato pendente]`.
- Usar marcador textual simples para lacunas e tambem retornar `missing_fields` para a UI mostrar alerta.
- `missing_fields` deve ser uma lista de objetos com shape fixo: `field`, `label`, `message` e, quando aplicavel, `placeholder`. Campos previstos nesta story: `contact`, `unknown_placeholder` e `profile_needs_update`.
- BFF de `message-drafts` deve copiar o padrao mais seguro da rota `communications/templates`: leitura exata do cookie com escape do nome, `try/catch` para falha upstream, mensagens fixas e limpeza de cookie em `401`.
- O fluxo nao deve preservar rascunho com PII apos erro tecnico. Em erro, limpar rascunho gerado e manter somente estado de indisponibilidade/retry.
- A geracao de rascunho deve produzir auditoria metadata-only para investigacao de abuso: actor/user id, `church_id`, `person_type`, `person_id`, `template_key`, outcome, timestamp e correlation id. Auditoria e logs nunca devem conter `message_body`, telefone/email bruto, `body_template`, cookie, token, headers, SQL, stack trace ou payload completo.

### Abordagens proibidas

- Fazer chamada autenticada direta do browser para Laravel ou expor `API_BASE_URL`/JWT interno no client.
- Retornar `body_template` cru, `church_id`, `church_scope_id`, template `id`, timestamps, headers, token, SQL ou stack trace.
- Aceitar `church_id`, `tenant`, `role`, `phone`, `email`, `status`, `body_template` ou `message_body` vindo do browser para gerar o rascunho.
- Aceitar `person_id` em query string, nested object, array, alias (`person`, `member_id`, `visitor_id`) ou qualquer local diferente do JSON root permitido.
- Criar CRUD de templates, tabela de rascunhos, historico de comunicacao, fila de envio, scheduler, webhook, WhatsApp nativo ou integracao externa.
- Atualizar `people.last_contacted_at`, status da pessoa, pendencias ou qualquer contador operacional nesta story.
- Criar nova busca de pessoas que liste telefone/email antes da selecao do destinatario.
- Resolver placeholder desconhecido com dados sensiveis ou heuristica; placeholder desconhecido deve permanecer visivel e ser sinalizado.
- Gravar em log ou auditoria conteudo do rascunho, telefone/email bruto, template cru, cookie, token, headers, SQL, stack trace ou dumps completos de request/response.
- Usar global state para o compositor; estado local por componente/feature e suficiente.
- Introduzir Jest, Vitest, Playwright, biblioteca UI paralela ou dependencia externa nova para cumprir o fluxo.
- Usar texto visivel "dashboard", "widget", "KPI", "performance" ou "BI".

### Arquivos provaveis a alterar ou criar

- `church-erp-api/app/Domain/Communications/Services/PrepareCommunicationMessageDraftService.php`
- `church-erp-api/app/Domain/Communications/Support/RenderCommunicationTemplateBody.php`
- `church-erp-api/app/Http/Controllers/Api/V1/StoreCommunicationMessageDraftController.php`
- `church-erp-api/app/Http/Requests/StoreCommunicationMessageDraftRequest.php`
- `church-erp-api/app/Http/Resources/CommunicationMessageDraftResource.php`
- `church-erp-api/app/Policies/CommunicationMessageDraftPolicy.php`
- `church-erp-api/app/Providers/AppServiceProvider.php`
- `church-erp-api/routes/api.php`
- `church-erp-api/tests/Feature/Communications/CommunicationMessageDraftTest.php`
- `church-erp-api/tests/Unit/Communications/RenderCommunicationTemplateBodyTest.php`
- `church-erp-web/src/app/api/communications/message-drafts/route.ts`
- `church-erp-web/src/features/communications/message-draft.ts`
- `church-erp-web/src/components/operational/communication-message-composer.tsx`
- `church-erp-web/src/components/operational/communication-template-list.tsx`
- `church-erp-web/src/app/communications/page.tsx`
- `church-erp-web/tests/communication-message-drafts.test.mjs`
- `church-erp-web/tests/communication-templates.test.mjs`
- `church-erp-web/tests/bff-smoke.test.mjs`

### Estados obrigatorios da UI ou do fluxo

- `loading_people_for_message`: lista/busca de pessoas carregando para selecao.
- `ready_to_prepare_message`: modelo e pessoa elegivel selecionados, botao de gerar habilitado.
- `generating_message_draft`: requisicao de rascunho em andamento, sem duplo submit.
- `message_draft_ready`: `Textarea` editavel renderizado com rascunho gerado.
- `draft_has_missing_contact`: rascunho gerado com marcador de contato pendente e alerta claro.
- `validation_error`: payload, selecao ou filtros invalidos; manter selecao segura quando possivel, sem PII extra.
- `denied_or_session_invalid`: `401`/`403`; limpar dados carregados e orientar reentrada/acesso.
- `server_error`: erro tecnico; limpar rascunho com PII e oferecer retry.

### Requisitos tecnicos obrigatorios

- Stack local verificada: Laravel `^12.0` em PHP `^8.3`; PHPUnit `^12.5.12`; Next.js `^16.3.4`; React `19.2.4`; Tailwind CSS `^4`; testes web com `node --test`.
- Rotas Laravel de produto permanecem versionadas sob `/api/v1` e dentro de `resolve.internal.session` quando sensiveis.
- BFF-to-Laravel deve usar `src/lib/api/client.ts`, que aplica headers internos e `cache: "no-store"`.
- Contratos HTTP usam `snake_case`; tipos TypeScript devem espelhar o contrato Laravel.
- Payload BFF/Laravel esperado:
  - `template_key`: string, max 80;
  - `person_type`: `member` ou `visitor`;
  - `person_id`: inteiro positivo seguro.
- O BFF deve aceitar apenas `Content-Type: application/json` para `POST`; JSON invalido, content-type ausente/incorreto, array JSON ou objeto vazio retornam erro sanitizado antes do upstream.
- `body_template` lido no backend deve ser tratado como texto simples e rejeitado se exceder 4000 caracteres antes de renderizar. `message_body` final deve ter limite maximo de 5000 caracteres; se exceder, retornar `422` sanitizado em vez de cortar silenciosamente.
- `person.id` pode voltar no response porque ja e identificador operacional exposto na busca/autorizado para abrir ficha; template `id` continua proibido porque `template_key` e o identificador publico suficiente e evita expor chave interna de override tenant/global.
- Response recomendado:
  - HTTP `200`;
  - JSON `{"data":{"template":{"template_key":"visitante_primeiro_contato","name":"Primeiro contato com visitante","category":"visitor_follow_up","suggested_channel":"external_handoff"},"person":{"id":7,"person_type":"visitor","display_name":"Ana Visitante","status":"follow_up_needed","status_label":"Precisa de acompanhamento","contact_summary":"Telefone: +351999999999"},"draft":{"message_body":"Ola Ana Visitante...","missing_fields":[],"used_fields":["nome","contato","status"],"editable":true}}}`;
  - sem `body_template`, template `id`, `church_id`, `church_scope_id`, timestamps, `links` ou `meta`.
- Status labels devem seguir os labels ja usados em `PersonSearchResource` para consistencia.
- Se contato estiver ausente, `contact_summary` deve ser "Contato pendente", `message_body` deve conter `[contato pendente]` e `missing_fields` deve incluir `{"field":"contact","label":"Contato","message":"Telefone ou email ainda nao foi informado."}`.
- Se houver placeholder desconhecido como `{{aniversario}}`, preservar `{{aniversario}}` no `message_body` e incluir `{"field":"unknown_placeholder","label":"Campo do modelo","placeholder":"{{aniversario}}","message":"Revise este campo do modelo antes do handoff."}`.
- Se status for `needs_update`, incluir `{"field":"profile_needs_update","label":"Cadastro para conferir","message":"Confira os dados da pessoa antes do handoff."}` sem bloquear a edicao.
- Fallback sem placeholders deve acrescentar exatamente: linha em branco, `Dados para personalizar:`, `Nome: {nome}`, `Contato: {contato}`, `Situacao: {status}`.
- Este endpoint nao e paginado e nao deve usar `ResourceCollection` customizada.
- Throttle dedicado sugerido: `RateLimiter::for('communication-message-drafts', Limit::perMinute(30)->by("{$userId}|{$churchId}"))`.

### Compliance de arquitetura

- Seguir o dominio `app/Domain/Communications`; nao colocar regra de preparacao em `People`, `Identity` ou controller.
- Controllers recebem request, chamam service e retornam resource; nao concentrar query, authorization, placeholder rendering ou shape manual no controller.
- Reusar o modelo `Person` e o scope `forChurch`; nao criar novo model ou tabela de destinatarios.
- Reusar a politica de area visual `AreaGuard area="communications"`, mas autorizacao real do rascunho fica no Laravel.
- Components base ficam em `src/components/ui`; composicao de produto vai para `src/components/operational`; contratos e normalizadores vao para `src/features/communications`.
- Interface deve seguir Tailwind, tokens existentes e direcao "Teal Operacional"; nao criar tema paralelo.
- Browser nunca deve chamar endpoint autenticado Laravel diretamente; todo trafego autenticado passa pelo BFF.

### Requisitos de teste

- Backend minimo:
  - `cd church-erp-api && php artisan test tests/Feature/Communications/CommunicationMessageDraftTest.php`
  - `cd church-erp-api && php artisan test tests/Unit/Communications/RenderCommunicationTemplateBodyTest.php`
  - `cd church-erp-api && php artisan test`
  - `cd church-erp-api && vendor/bin/pint --test`
- Frontend minimo:
  - `cd church-erp-web && node --test --loader ./tests/node-alias-loader.mjs tests/communication-message-drafts.test.mjs tests/communication-templates.test.mjs tests/bff-smoke.test.mjs`
  - `cd church-erp-web && npm test`
  - `cd church-erp-web && npm run lint`
  - `cd church-erp-web && npm run typecheck`
  - `cd church-erp-web && npm run build:smoke`
- Testes precisam provar roles permitidos/proibidos, tenant cruzado, pessoa inativa, `needs_update` com alerta, template inativo, response minimizada, BFF boundary, same-origin para POST, content-type JSON, sanitizacao, placeholders, fallback deterministico, limite de tamanho, anti-XSS e estados honestos.
- Testes tambem precisam provar que a trilha de auditoria registra apenas metadados operacionais e nao inclui mensagem gerada, contato bruto, template cru, cookies, tokens, headers, SQL, stack trace ou payload completo.
- Ausencia de teste DOM real continua risco conhecido do projeto; compensar com source inspection, testes de normalizador/estado e revisao manual responsiva antes de review.

### Licoes de stories ou reviews anteriores

- Story 5.1 estabeleceu o dominio `Communications`, a tabela `communication_templates`, policy dedicada, throttle e BFF `/api/communications/templates`; esta story deve estender esse caminho, nao criar arquitetura paralela.
- Nao misturar a ability de listagem `viewCommunicationTemplates` com a nova ability `prepareCommunicationMessageDraft`; listagem e composicao tem exposicao de dados diferente.
- Story 5.1 corrigiu parser de cookie para casar o nome exato do cookie. Rotas antigas de pessoas ainda usam regex mais simples; para rota nova, copiar o padrao seguro de `communications/templates`.
- Story 5.1 removeu carregamento desnecessario de `body_template` na listagem. Nesta story, `body_template` so deve ser lido no backend para renderizacao do rascunho, nunca enviado cru ao browser.
- Epic 4 consolidou busca e edicao de pessoas via BFF `/api/secretary/people`, `PersonSearchResource`, `MemberResource` e `VisitorResource`; nao recriar fonte de pessoas.
- Sanitizacao de `401`, `403`, `404`, `422` e `5xx` foi recorrente em BFFs; toda resposta browser-facing precisa ser fixa e testada.
- Query invalida e payload com campos extras devem falhar cedo; normalizar silenciosamente parametros suspeitos pode esconder abuso.
- Dados pessoais exigem minimizacao por padrao, inclusive em erro, estado recuperado e testes.
- `AreaGuard` e visibilidade de UI ajudam a experiencia, mas nao substituem policy/ability no Laravel.

### Git Intelligence Summary

- `c0de583 Merge pull request #23 from WesleyDenia/story_5_1` incorporou a base de modelos de comunicacao.
- `34b1f3f implementa a story 5.1` criou `communication_templates`, listagem segura, BFF same-origin, resource minimizado e testes de seguranca.
- `088c03b Merge pull request #22 from WesleyDenia/story_4_5` consolidou pendencias operacionais de pessoas e retorno contextual para listas filtradas.
- `50ebac8 finaliza epic 4.5 e retro` registrou learnings da Epic 4 sobre BFF, sanitizacao e retorno seguro.
- Padrao recente: fonte real no Laravel, BFF same-origin, contrato TypeScript em `src/features`, componente operacional em `src/components/operational`, testes backend de feature e web com `node:test`.

### Informacoes tecnicas atuais

- Em 25/08/2026, o blog oficial do Next.js publicou security release para `16.3.3` Active LTS e `15.5.24` Maintenance LTS; o projeto ja usa `next@^16.3.4`, entao preserve essa linha e nao faca downgrade.
- A pagina oficial de versoes do React lista `v19.3.0` em 09/09/2026 e `v19.2.4` em janeiro de 2026; o projeto usa React `19.2.4`. Nao atualizar React nesta story sem necessidade explicita e testes dedicados.
- Tailwind CSS v4.3 aparece como linha atual no site oficial; o projeto usa `tailwindcss@^4` e `@tailwindcss/postcss@^4`. Seguir CSS variables/tokens existentes e evitar recursos CSS exoticos sem validar compatibilidade.
- A documentacao oficial do Next.js App Router confirma route handlers em `app/**/route.ts` e suporte a metodos HTTP exportados; implemente apenas `POST` para `message-drafts`.
- Laravel 12 segue documentando Gates/Policies, FormRequest e `JsonResource` como mecanismos adequados; manter esses mecanismos em vez de wrappers manuais.
- O site oficial do `shadcn/ui` confirma `ui.shadcn.com` como fonte oficial e a CLI/registry como forma de adicionar primitives. Esta story deve reutilizar primitives existentes antes de adicionar novos.

### Project Structure Notes

- `church-erp-web/src/app/communications/page.tsx` ja usa `AreaGuard area="communications"` e renderiza `CommunicationTemplateList`.
- `church-erp-web/src/components/operational/communication-template-list.tsx` carrega modelos via BFF e hoje mostra acao desabilitada "Preparar em etapa futura".
- `church-erp-web/src/features/communications/communication-template.ts` contem allowlist e estados da listagem; criar arquivo separado para rascunho evita misturar contratos.
- `church-erp-web/src/app/api/communications/templates/route.ts` e a referencia BFF mais segura para cookie, sanitizacao e `try/catch`.
- `church-erp-web/src/app/api/secretary/people/route.ts` ja busca pessoas, mas seu parser de cookie e menos robusto; nao copiar esse detalhe para rota nova.
- `church-erp-api/app/Domain/Communications/Services/ListCommunicationTemplatesService.php` ja implementa deduplicacao global/tenant por `template_key`.
- `church-erp-api/app/Domain/People/Models/Person.php` usa `BelongsToAuthenticatedChurch`; usar `forChurch($churchId)` explicitamente nos services quando combinar com sessao.
- `MemberResource` e `VisitorResource` ja expoem telefone/email em leitura individual autorizada; a busca paginada de pessoas continua minimizada e nao deve passar a listar contato bruto.
- `AppServiceProvider` ja registra `viewCommunicationTemplates`, `viewPeople` e rate limiters de leitura/escrita da secretaria; adicionar ability/throttle novos de forma consistente.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 5, Story 5.2, FR26 e restricoes frontend.
- `_bmad-output/planning-artifacts/prd.md` - escopo 8.5 Comunicacoes, Jornada B e FR-7 Preparacao de Comunicacao.
- `_bmad-output/planning-artifacts/architecture.md` - dominio `Communications`, BFF, policies, tenancy, resources, estrutura de projeto e ADR de autenticacao.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - jornada da secretaria, comunicacao nascida do contexto semanal, feedback, navegacao, responsividade e acessibilidade.
- `_bmad-output/project-context.md` - stack, BFF, testes, arquitetura, seguranca e regras criticas para agentes.
- `_bmad-output/implementation-artifacts/5-1-manter-modelos-pre-definidos-de-comunicacao.md` - padroes, findings e learnings da story anterior.
- `church-erp-api/app/Domain/Communications/Services/ListCommunicationTemplatesService.php`
- `church-erp-api/app/Domain/Communications/Services/ProvisionBaseCommunicationTemplatesService.php`
- `church-erp-api/app/Domain/People/Services/ListPeopleService.php`
- `church-erp-api/app/Http/Resources/PersonSearchResource.php`
- `church-erp-web/src/app/api/communications/templates/route.ts`
- `church-erp-web/src/app/api/secretary/people/route.ts`
- `church-erp-web/src/components/operational/communication-template-list.tsx`

### Checklist pre-review

- `/bmad-review-security` foi executado, findings validos foram incorporados e Security Sign-off foi preenchido antes de codigo de produto.
- `/communications` preserva `AreaGuard area="communications"`.
- Browser chama somente BFF same-origin para modelos, pessoas e rascunho; nao ha chamada direta para Laravel, `API_BASE_URL` ou token interno no client.
- Laravel expoe `POST /api/v1/communications/message-drafts` sob `resolve.internal.session`.
- `secretary` e `administrator` geram rascunho; `treasurer`, `leadership`, sem sessao e membership inativa nao recebem dados.
- Payload aceita somente `template_key`, `person_type` e `person_id`; query string e campos extras falham com `422` no BFF e Laravel.
- `person_id` e permitido somente como propriedade root do JSON; query string, nested object, array e aliases sao rejeitados.
- `POST /api/communications/message-drafts` exige `Content-Type: application/json` e rejeita JSON invalido antes de chamar Laravel.
- Template global ativo ou custom ativo do tenant atual e usado; custom do tenant substitui global com mesmo `template_key`.
- Template inativo, template de outro tenant, pessoa de outro tenant, pessoa inativa e tipo divergente nao vazam existencia nem PII.
- Response nao expoe `church_id`, `church_scope_id`, template `id`, `body_template`, timestamps internos, headers, token, SQL ou stack trace.
- Rascunho substitui `{{nome}}`, `{{contato}}` e `{{status}}`; template sem placeholders recebe fallback deterministico; placeholder desconhecido permanece visivel e sinalizado com shape completo.
- Falta de contato aparece como marcador editavel e `missing_fields`, sem bloquear edicao manual; `needs_update` gera alerta `profile_needs_update`.
- Template custom e rascunho sao renderizados somente como texto em `Textarea`; nao ha HTML/markdown/rich text nem `dangerouslySetInnerHTML`.
- `body_template` e `message_body` respeitam limites de tamanho e falham de forma sanitizada quando excedidos.
- Nenhum rascunho e persistido; nenhum envio, copiar, partilhar, WhatsApp, webhook, scheduler, fila ou resolucao de pendencia foi implementado.
- UI cobre loading, ready, generating, ready, missing contact, validation, denied e server error sem sobreposicao mobile/desktop; foco e teclado funcionam.
- Componentes usam `src/components/ui`, `Surface`, Tailwind e tokens existentes; nao ha biblioteca UI paralela.
- Textos visiveis nao usam "dashboard", "widget", "KPI", "performance" ou "BI".
- Backend e frontend passam nos comandos de teste, lint, typecheck, smoke build e Pint listados.
- Promocao STG/PROD exige `bash deploy/security-gate.sh stg` e `bash deploy/security-gate.sh prod` em ambiente com `pre-commit` ou `detect-secrets-hook`; ausencia deste gate bloqueia promocao, nao dev/local.
- Auditoria metadata-only de geracao de rascunho esta implementada e testada sem gravar PII bruta, conteudo do rascunho, template cru, cookies, tokens, headers, SQL, stack trace ou payload completo.
- Politica operacional de IDE/sandbox confirmada: `Artifact Review Policy = Asks for Review`, autoexec de terminal bloqueia elevacao/destruicao, Browser URL Allowlist restrita a dominios homologados e credenciais de banco para agentes usam privilegio minimo sem DBA/SYSTEM.

### Politica operacional de IDE/sandbox para esta story

- `Artifact Review Policy`: `Asks for Review` antes de aceitar artefatos gerados ou alteracoes sensiveis.
- `Terminal Command Auto Execution Policy`: bloquear comandos destrutivos, elevacao de privilegio e mudancas irreversiveis, incluindo `sudo`, `rm -rf`, `chmod 777`, rotacao de credenciais reais e alteracoes de SO.
- `Browser URL Allowlist`: restringir navegacao automatizada a dominios homologados do projeto e documentacao oficial necessaria para a stack.
- Credenciais de banco para agentes: usar usuario de menor privilegio necessario para dev/test; proibido DBA, `SYSTEM`, root ou equivalente em fluxos automatizados.

### Security Sign-off

- Status: Approved with Security Notes
- Auditor: Vex - Security Auditor
- Data: 2026-09-22
- Findings incorporados: SEC-M-001 auditoria metadata-only para tentativas de geracao de rascunho; SEC-M-002 Security Sign-off preenchido; SEC-L-001 politica operacional de IDE/sandbox registrada no artefato.
- Gates executados: `composer audit --no-interaction` em `church-erp-api` sem advisories; `npm audit --omit=dev` em `church-erp-api` e `church-erp-web` com 0 vulnerabilidades; verificacao de `.env*` versionados confirmou apenas exemplos versionados e `.env`/`.env.local` ignorados; busca focalizada de segredos na story e `.env.example` sem segredo material; `deploy/security-gate.sh` existe e e executavel.
- Nota: Aprovado para dev com notas de seguranca. O codigo da story ainda deve implementar e testar os controles listados; promocao STG/PROD continua bloqueada sem `bash deploy/security-gate.sh stg|prod` em ambiente com `pre-commit` ou `detect-secrets-hook`.

### Story Completion Status

- Status final desta story: `done`.
- Nota de conclusao do contexto: `Ultimate context engine analysis completed - comprehensive developer guide created`.

## Senior Developer Review (AI)

### Review Follow-ups Applied

- 2026-09-22: Corrigida auditoria metadata-only para registrar tambem tentativas com falha (`forbidden`, `validation_failed`, `not_found` e erro inesperado) sem gravar payload bruto, contato, template cru, token, headers, SQL ou trace.
- 2026-09-22: Corrigida deteccao de placeholders desconhecidos para sinalizar qualquer `{{...}}` restante apos substituir `{{nome}}`, `{{contato}}` e `{{status}}`, incluindo placeholders com hifen ou espaco.
- 2026-09-22: Corrigida cobertura backend para bloquear explicitamente `leadership` e validar auditoria metadata-only em falhas, alem dos casos ja existentes de `treasurer`, sessao ausente, membership inativa e tenant cruzado.

### Review Verification

- `cd church-erp-api && php artisan test tests/Feature/Communications/CommunicationMessageDraftTest.php tests/Unit/Communications/RenderCommunicationTemplateBodyTest.php` - 11 passed, 228 assertions.
- `cd church-erp-api && vendor/bin/pint --test` - pass.
- `cd church-erp-api && php artisan test` - 154 passed, 1738 assertions.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-09-22: BMAD dev-story workflow loaded; project context, sprint status and story context read. Security sign-off already approved with notes, so product implementation may proceed.
- 2026-09-22: Added failing renderer/backend/web draft tests, implemented Laravel draft endpoint and Next BFF/UI, then ran backend and frontend validation suites.
- 2026-09-22: Applied senior review fixes for failed-attempt audit logging, broader unknown placeholder detection, leadership denial coverage, and metadata-only audit assertions.

### Completion Notes List

- Implemented message draft preparation for active global/tenant templates with tenant override, eligible selected people, placeholder rendering, deterministic fallback, missing-field reporting, and metadata-only audit logging.
- Strengthened audit logging so failed draft attempts are recorded with metadata-only outcomes before returning sanitized errors.
- Broadened unknown placeholder detection beyond alphanumeric placeholders while preserving the template text visibly for manual review.
- Added same-origin BFF POST route with strict JSON payload allowlist, exact session cookie parsing, sanitized error handling, and client contract normalizers.
- Updated `/communications` to select an active template, choose a person via the existing people BFF, generate an editable local-only draft, and render all template content as text in `Textarea`.
- STG/PROD `deploy/security-gate.sh` executions remain promotion gates per the story security sign-off; they were confirmed as required but not run for local dev completion.

### File List

- `_bmad-output/implementation-artifacts/5-2-preparar-mensagem-a-partir-de-dados-de-pessoas.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `church-erp-api/app/Domain/Communications/Services/PrepareCommunicationMessageDraftService.php`
- `church-erp-api/app/Domain/Communications/Support/RenderCommunicationTemplateBody.php`
- `church-erp-api/app/Http/Controllers/Api/V1/StoreCommunicationMessageDraftController.php`
- `church-erp-api/app/Http/Requests/StoreCommunicationMessageDraftRequest.php`
- `church-erp-api/app/Http/Resources/CommunicationMessageDraftResource.php`
- `church-erp-api/app/Policies/CommunicationMessageDraftPolicy.php`
- `church-erp-api/app/Providers/AppServiceProvider.php`
- `church-erp-api/routes/api.php`
- `church-erp-api/tests/Feature/Communications/CommunicationMessageDraftTest.php`
- `church-erp-api/tests/Unit/Communications/RenderCommunicationTemplateBodyTest.php`
- `church-erp-web/src/app/api/communications/message-drafts/route.ts`
- `church-erp-web/src/components/operational/communication-message-composer.tsx`
- `church-erp-web/src/components/operational/communication-template-list.tsx`
- `church-erp-web/src/features/communications/message-draft.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`
- `church-erp-web/tests/communication-message-drafts.test.mjs`
- `church-erp-web/tests/communication-templates.test.mjs`

### Change Log

- 2026-09-22: Implemented Story 5.2 message draft preparation flow and moved story to review.
- 2026-09-22: Fixed senior review findings and moved Story 5.2 to done.
