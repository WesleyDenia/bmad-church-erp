# Story 4.1: Exibir home operacional da secretaria

Status: done

<!-- Security gate required: esta story toca dados pessoais, autorizacao, tenant isolation e sessao BFF. Status ready-for-dev indica que o contexto esta pronto; a implementacao nao deve iniciar via dev-story antes de executar /bmad-review-security e incorporar findings validos. -->

## Story

As a secretaria da igreja,
I want abrir uma home da secretaria com blocos de pendencias, atalhos e checklist semanal,
so that eu consiga organizar minha rotina sem navegar por modulos abstratos.

## Acceptance Criteria

1. Dado que um usuario com perfil `secretary` ou `administrator` acessa `/secretaria`, quando a verificacao de area e executada, entao a home real da secretaria e exibida; `treasurer`, `leadership` e usuario sem sessao recebem negacao apropriada sem renderizar conteudo de pessoas.
2. Dado que a home da secretaria carrega, quando o browser busca os dados da tela, entao ele chama somente o BFF Next.js `GET /api/secretary/home`; o BFF chama server-side o Laravel `GET /api/v1/secretary/home`, usa `cache: "no-store"`, preserva contratos em `snake_case`, limpa cookie em `401` e sanitiza `403`, `422` e `5xx` sem vazar stack trace, token, headers internos ou payload sensivel.
3. Dado que existem dados reais de pessoas no tenant atual, quando a home e exibida, entao ela mostra blocos operacionais para pendencias de pessoas, visitantes recentes, acoes rapidas, programacao e checklist semanal, sempre derivados do retorno do endpoint de secretaria e nunca de arrays mockados no React; blocos sem fonte real nesta etapa devem vir do endpoint com estado indisponivel explicito.
4. Dado que ainda nao existem membros, visitantes ou pendencias reais, quando a home e exibida, entao ela apresenta estados vazios honestos e acionaveis, com proximo passo claro para cadastrar membro ou visitante, sem inventar contagens, nomes, programacao ou comunicacao.
5. Dado que a Story 4.1 abre a Epic 4, quando o backend de secretaria for implementado, entao deve existir a tabela unificada `people` como fonte inicial real de People, com `church_id`, `person_type`, `status`, nome e contato minimo para consultas da home, preparada para membros, visitantes, busca e comunicacao futura sem duplicar modelagem.
6. Dado que a home apresenta visitantes recentes, quando houver registros elegiveis no tenant, entao o bloco deve listar no maximo 5 registros com `person_type = visitor`, ordenados por `created_at desc`, criados nos ultimos 30 dias, contendo apenas nome, status operacional, contato resumido quando existir e proximo passo. Nao exibir IDs internos sensiveis, dados de outros tenants, auditoria tecnica ou qualquer dado pessoal nao necessario ao bloco.
7. Dado que existem pendencias de pessoas, quando a home carrega, entao o bloco de pendencias deve derivar itens somente de regras deterministicas do backend: visitante com `status in (new, follow_up_needed)`, pessoa sem telefone e sem email, ou pessoa marcada com `status = needs_update`; cada item deve ter categoria operacional, contagem e proximo passo seguro.
8. Dado que programacao de eventos e comunicacao operacional ainda dependem de historias futuras, quando esses blocos forem renderizados nesta story, entao o endpoint da home deve retornar `event_schedule.state = event_schedule_unavailable` e `communication_pending.state = communication_pending_unavailable`, com linguagem simples explicando que a leitura sera completada apos fonte real, sem endpoints, listas ou dados ficticios.
9. Dado que a secretaria precisa de rotina semanal, quando a home carrega, entao o checklist semanal deve ser retornado pelo backend com exatamente estes itens iniciais nao persistidos: revisar visitantes recentes, completar contatos pendentes, conferir pessoas que precisam de atualizacao e preparar proximas comunicacoes quando a fonte existir. Todos devem iniciar como `not_started`; nao usar localStorage nem fingir conclusao persistida.
10. Dado que qualquer erro de autorizacao, sessao, tenant ou backend ocorre, quando a home tenta carregar, entao a UI mostra estados `loading`, `loaded`, `empty`, `denied_or_session_invalid` e `server_error`; para `401`/`403`/troca de contexto e proibido preservar nomes, contatos ou listas anteriores. Estado recuperado so pode existir para erro tecnico recuperavel e deve preservar no maximo contagens agregadas sem PII, nunca dados pessoais.
11. Dado que a home e usada em desktop, tablet ou mobile, quando os blocos se reorganizam, entao a hierarquia operacional permanece clara, com foco visivel, navegacao por teclado, contraste adequado, labels explicitos e alvos de toque confortaveis.
12. Dado que a Epic 5 vai depender dos dados de pessoas, quando esta story definir contratos ou modelos iniciais, entao os nomes, status e campos devem permitir reutilizacao futura por membros, visitantes e comunicacao sem refazer a modelagem basica.
13. Dado que a story entra em review, quando os testes forem executados, entao backend, BFF e frontend provam autorizacao por perfil, tenant isolation, ausencia de chamadas Laravel pelo browser, contratos `snake_case`, estados honestos, ausencia de mocks permanentes e ausencia de termos genericos como "dashboard", "widget" ou "KPI" na UI da secretaria.
14. Dado que esta story manipula dados pessoais e boundaries de autorizacao, quando a implementacao for iniciada, entao o threat model STRIDE desta story deve estar incorporado aos testes e as decisoes tecnicas: spoofing de sessao BFF, tampering de parametros de escopo, repudiation por ausencia de logs seguros, information disclosure de PII, denial of service por scraping da home e elevation of privilege entre perfis.
15. Dado que erros ou eventos tecnicos ocorram no Laravel, BFF ou frontend, quando houver registro de logs, entao e proibido registrar nomes, contatos, listas de pessoas, payload completo, cookie, token, header `Authorization`, stack trace enviada ao cliente ou exception bruta; testes/source inspection devem provar sanitizacao de resposta e ausencia de logs com PII/token.

- [x] Criar o contrato integrado da home da secretaria antes da UI final (AC: 1-5, 8-10)
  - [x] Definir `GET /api/v1/secretary/home` no Laravel sob `resolve.internal.session`.
  - [x] Criar controller fino em `app/Http/Controllers/Api/V1/ShowSecretaryHomeController.php`.
  - [x] Criar service em `app/Domain/People/Services/BuildSecretaryHomeService.php` ou nome equivalente orientado ao caso de uso.
  - [x] Criar resource em `app/Http/Resources/SecretaryHomeResource.php` conforme padrao atual de HTTP resources; manter resposta `200 { data: { secretary_home: ... } }`.
  - [x] Autorizar a leitura com Gate/Policy proprio para area `secretaria`, permitindo `secretary` e `administrator`; negar `treasurer`, `leadership` e sessao ausente.
  - [x] Resolver `church_id` exclusivamente da sessao autenticada; rejeitar qualquer query/body com `church_id`, `user_id`, `role`, `tenant`, `permission` ou escopo sensivel com `422`.
  - [x] Aplicar rate limit nomeado obrigatorio `throttle:secretary-home`, com chave por `user_id|church_id`, porque a rota consulta listas sensiveis de pessoas e pode ser chamada repetidamente pela home.

- [x] Criar a fonte inicial real de People usada pela home (AC: 3-7, 12)
  - [x] Criar modelagem unificada `people` com `person_type` para evitar duplicar busca, comunicacao e pendencias entre membros e visitantes.
  - [x] Criar migration com `church_id`, `person_type`, `status`, `display_name`, `phone`, `email`, `last_contacted_at`, timestamps, indices por `church_id`, `person_type`, `status` e constraints para tipo/status.
  - [x] Tipos obrigatorios: `member`, `visitor`. Status obrigatorios do MVP: `active`, `inactive`, `new`, `follow_up_needed`, `contacted`, `needs_update`.
  - [x] Nao criar fluxo completo de cadastro/edicao nesta story; preparar leitura e estrutura que as Stories 4.2 e 4.3 vao escrever.
  - [x] Derivar visitantes recentes apenas de `people.person_type = visitor`, `created_at >= now()-30d`, ordenacao `created_at desc`, limite 5.
  - [x] Derivar pendencias apenas de `status in (new, follow_up_needed, needs_update)` ou ausencia simultanea de `phone` e `email`.
  - [x] Com zero registros, retornar estado vazio em vez de seed visual.
  - [x] Manter `PersonCategory` e `ProvisionInitialPersonCategoriesService` como base existente; nao duplicar categorias de pessoas em outra estrutura.

- [x] Implementar o BFF Next.js da secretaria (AC: 2, 5, 10, 13)
  - [x] Criar `church-erp-web/src/app/api/secretary/home/route.ts`.
  - [x] Ler a sessao via cookie `HttpOnly` usando o padrao existente de `AUTH_SESSION_COOKIE_NAME` e `readSessionTokenFromCookieValue`.
  - [x] Chamar Laravel exclusivamente por `callLaravel("/api/v1/secretary/home", ...)`.
  - [x] Usar `cache: "no-store"` por consistencia defensiva do projeto.
  - [x] Sanitizar respostas nao OK; em `401`, limpar cookie da sessao BFF.
  - [x] Nao encaminhar query params livres; se a rota aceitar filtros no futuro, usar allowlist explicita e testes de rejeicao.

- [x] Implementar a home operacional da secretaria no frontend (AC: 1, 3, 4, 7-11, 13)
  - [x] Atualizar `church-erp-web/src/app/secretaria/page.tsx` para manter `AreaGuard area="secretaria"` e renderizar `SecretaryHomeShell`.
  - [x] Criar `church-erp-web/src/components/operational/secretary-home-shell.tsx`.
  - [x] Criar ou adaptar componentes operacionais em `src/components/operational`, como `people-followup-block.tsx`, `event-schedule-block.tsx`, `communication-pending-block.tsx` e/ou bloco de checklist semanal.
  - [x] Reutilizar primitives existentes de `src/components/ui` e `Surface`; adicionar primitive nova somente se realmente necessaria.
  - [x] Usar `WeeklyPriorityBlock` e `QuickActionRail` apenas se os textos, CTAs e estados ficarem coerentes com secretaria, sem copiar linguagem da tesouraria.
  - [x] Manter a tela como home operacional real, nao landing page, dashboard generico ou lista decorativa.
  - [x] Garantir estados responsivos e acessiveis para carregamento, vazio, negado, erro, sucesso e `technical_recovered_without_pii`.

- [x] Cobrir seguranca, privacidade e tenant isolation (AC: 1, 2, 5, 6, 10, 13, 14, 15)
  - [x] Incorporar o threat model STRIDE desta story aos testes e revisao tecnica antes de iniciar implementacao.
  - [x] Testar que `secretary` e `administrator` acessam `GET /api/v1/secretary/home`.
  - [x] Testar que `treasurer`, `leadership`, usuario sem sessao e membership inativa nao acessam.
  - [x] Testar que registros de outro `church_id` nunca entram em pendencias, visitantes recentes, checklist ou contagens.
  - [x] Testar que visitantes recentes respeitam janela de 30 dias, ordenacao decrescente e limite 5.
  - [x] Testar que pendencias respeitam as regras de `status` e contato ausente.
  - [x] Testar que parametros de escopo vindos do browser retornam `422` e nao alteram consulta.
  - [x] Testar que respostas de erro nao incluem token, headers internos, stack trace, exception class ou payload sensivel.
  - [x] Testar ou verificar por source inspection que nenhum log registra nomes, contatos, listas de pessoas, payload completo, cookie, token, header `Authorization`, exception bruta ou dump de request/response.
  - [x] Testar que `GET /api/v1/secretary/home` usa `throttle:secretary-home` e que o rate limiter e chaveado por usuario e igreja.

- [x] Cobrir BFF e frontend com testes de source inspection e estado (AC: 2-4, 7-11, 13)
  - [x] Criar `church-erp-web/tests/secretary-home.test.mjs` para contracts/helpers/estados.
  - [x] Ampliar `church-erp-web/tests/bff-smoke.test.mjs` para exigir `src/app/api/secretary/home/route.ts`.
  - [x] Provar que a page `/secretaria` usa `AreaGuard` e `SecretaryHomeShell`.
  - [x] Provar que browser chama apenas `/api/secretary/home`, nunca `/api/v1/secretary/home` ou `API_BASE_URL`.
  - [x] Provar por shape/snapshot que o payload da home nao inclui campos PII fora da allowlist: `display_name`, `status`, `contact_summary`, `next_step_label` e `href`.
  - [x] Provar que a UI nao importa componentes financeiros operacionais (`TreasuryEntryForm`, handoff de fechamento, financial entries) nem calcula dados de pessoas a partir de mock local.
  - [x] Provar que textos visiveis nao usam "dashboard", "widget", "KPI", "performance" ou "BI".


### Contexto funcional e objetivo desta story

- Esta story inicia a Epic 4: Base de Pessoas e Rotina da Secretaria.
- O objetivo e substituir o placeholder atual de `/secretaria` por uma home operacional real, orientada por blocos de rotina semanal.
- A home deve organizar pendencias de pessoas, visitantes recentes, acoes rapidas, programacao e checklist semanal, mas sem fingir dados que ainda nao possuem fonte.
- A entrega deve fechar o primeiro contrato integrado de People/Secretaria entre Laravel, BFF e UI. A principal licao da Epic 3 foi que a tela precisa nascer de fonte real, nao de composicao visual.
- Esta story nao implementa o cadastro completo de membros (Story 4.2), cadastro completo de visitantes (Story 4.3), busca/filtros (Story 4.4), resolucao completa de pendencias (Story 4.5) nem comunicacao/handoff (Epic 5).

### Nao objetivos tecnicos desta story

- Nao implementar CRUD completo de membros ou visitantes.
- Nao implementar busca, filtros ou listagens completas de pessoas.
- Nao implementar resolucao persistida de pendencias.
- Nao implementar eventos/programacao real.
- Nao implementar comunicacao, modelos de mensagem ou handoff externo.
- Nao criar permissao granular avancada alem do acesso seguro a area `secretaria`.

### Guardrails de implementacao obrigatorios

- Browser chama somente Next.js BFF; Laravel autenticado nunca deve ser chamado diretamente do browser.
- Dados pessoais exigem o mesmo rigor de tenant isolation aplicado em financas: `church_id` sempre vem da sessao autenticada e todas as queries relevantes usam escopo do tenant.
- Autorizacao real fica no Laravel com Gate/Policy/middleware; `AreaGuard` e navegacao frontend sao apenas adaptacao de UX.
- `GET /api/v1/secretary/home` deve usar rate limiter nomeado `secretary-home`, associado via `throttle:secretary-home`, com chave `user_id|church_id` ou equivalente extraida da sessao autenticada.
- Reusar `ResolveBackofficeAreaAccessService`, `BackofficeAreaPolicy`, `callLaravel`, `normalizeAuthResponse`/normalizadores existentes e padroes de limpeza de cookie em `401`.
- Contratos HTTP oficiais permanecem em `snake_case`; tipos TypeScript devem espelhar payload Laravel sem conversao para `camelCase`.
- Componentes de dominio ficam em `src/components/operational` ou `src/features/secretaria`/`src/features/people`; `src/components/ui` continua reservado para primitives sem contexto de dominio.
- Se for criada estrutura de dados de pessoas nesta story, ela deve ser minima, relacional, tenant-scoped e preparada para as Stories 4.2/4.3, sem fluxo de cadastro completo antes da hora.
- Estados vazios sao produto: quando nao houver dados, mostrar proximo passo real; nao preencher com exemplos, seeds visuais ou contagens hardcoded.
- Blocos de programacao e comunicacao podem aparecer, mas precisam declarar indisponibilidade honesta enquanto nao houver fonte real. Nao criar endpoint falso de eventos/comunicacao.
- A home precisa ser operacional: cada bloco deve dizer o que esta pendente, por que importa e qual e o proximo passo.
- CTAs para fluxos futuros devem usar uma de tres opcoes explicitas: rota existente, botao desabilitado com motivo claro, ou acao controlada que mostra estado "fluxo em preparacao". Links quebrados sao proibidos.
- Logs tecnicos nao podem conter PII, payload completo, cookie, token, header `Authorization`, stack trace enviada ao cliente ou exception bruta. Quando logs forem necessarios, registrar somente codigos de estado, categorias operacionais e identificadores internos indispensaveis.

### Threat Model STRIDE

| Categoria | Ameaça nesta story | Mitigacao obrigatoria |
| --- | --- | --- |
| Spoofing | Usuario tenta acessar `/secretaria` com cookie ausente, expirado, forjado ou role inadequada. | BFF le token somente de cookie `HttpOnly`; Laravel resolve sessao por `resolve.internal.session`; Gate/Policy permite apenas `secretary` e `administrator`; `401` limpa cookie. |
| Tampering | Browser envia `church_id`, `user_id`, `role`, `tenant`, `permission` ou filtros de escopo para alterar a consulta. | BFF nao encaminha query params livres; Laravel rejeita parametros de escopo com `422`; `church_id` vem apenas da sessao autenticada. |
| Repudiation | Erros ou acoes de leitura sensivel ficam sem rastreio seguro ou sao registrados com excesso de dados pessoais. | Logs, se usados, devem registrar somente metadados minimos sem PII/token; testes/source inspection devem bloquear dumps de request, response, headers e exception bruta. |
| Information Disclosure | Nomes, contatos, listas de visitantes, dados de outro tenant, IDs internos ou stack traces vazam para perfil indevido ou resposta de erro. | Todas as queries usam `church_id`; payload usa allowlist de PII minima; `401`/`403`/troca de contexto descartam listas; BFF sanitiza `403`, `422` e `5xx`. |
| Denial of Service | Home e consultada em loop para scraping ou carga excessiva sobre listas de pessoas. | Rota Laravel usa `throttle:secretary-home` chaveado por `user_id|church_id`; visitantes recentes limitados a 5 e janela de 30 dias; endpoint evita consultas abertas. |
| Elevation of Privilege | `treasurer`, `leadership` ou usuario sem membership ativa visualiza dados operacionais de pessoas. | Autorizacao final fica no Laravel; testes cobrem roles negadas, membership inativa e isolamento por tenant; frontend `AreaGuard` e apenas camada de UX. |

### Abordagens proibidas

- Nao deixar `/secretaria` como placeholder textual com cards estaticos.
- Nao criar `DashboardCard`, `SecretaryDashboard`, `InfoWidget`, `GenericPanel`, graficos ou biblioteca de charts.
- Nao colocar arrays mockados no React para visitantes, pendencias, eventos ou comunicacoes.
- Nao aceitar `church_id`, `user_id`, `role`, `tenant`, `permissions` ou filtros de escopo vindos do browser.
- Nao expor dados pessoais alem do minimo necessario para a rotina da secretaria.
- Nao reutilizar endpoints financeiros, componentes da tesouraria ou dados de fechamento para preencher a home da secretaria.
- Nao criar formulario completo de membro/visitante nesta story; usar CTAs e rotas planejadas para as proximas stories quando o fluxo ainda nao existir.
- Nao persistir estado de checklist falso no frontend/localStorage como se fosse dado confiavel.
- Nao preservar nomes, contatos, listas de visitantes ou pendencias apos `401`, `403` ou troca de contexto de igreja.
- Nao introduzir Zustand/Redux/global state, filas, Redis, PDF, analytics, automacao de WhatsApp ou integracao externa.
- Nao usar linguagem visivel corporativa como "dashboard", "KPI", "business intelligence" ou "performance".

### Arquivos provaveis a alterar ou criar

- `church-erp-web/src/app/secretaria/page.tsx`
- `church-erp-web/src/app/api/secretary/home/route.ts`
- `church-erp-web/src/features/secretaria/secretary-home.ts`
- `church-erp-web/src/components/operational/secretary-home-shell.tsx`
- `church-erp-web/src/components/operational/people-followup-block.tsx`
- `church-erp-web/src/components/operational/event-schedule-block.tsx`
- `church-erp-web/src/components/operational/communication-pending-block.tsx`
- `church-erp-web/src/components/operational/weekly-checklist-block.tsx`
- `church-erp-web/tests/secretary-home.test.mjs`
- `church-erp-web/tests/bff-smoke.test.mjs`
- `church-erp-api/routes/api.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ShowSecretaryHomeController.php`
- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php`
- `church-erp-api/app/Http/Resources/SecretaryHomeResource.php`
- `church-erp-api/app/Domain/People/Models/Person.php`
- `church-erp-api/database/migrations/*_create_people_table.php`
- `church-erp-api/app/Providers/AppServiceProvider.php` para Gate/rate limiter `secretary-home`
- `church-erp-api/tests/Feature/People/SecretaryHomeTest.php`
- `church-erp-api/tests/Feature/Identity/BackofficeAreaAccessTest.php`

### Estados obrigatorios da UI ou do fluxo

- `loading_secretary_home`: verificando ou carregando dados da home pelo BFF.
- `secretary_home_loaded`: blocos carregados a partir de fonte real do tenant.
- `empty_secretary_home`: sem membros, visitantes ou pendencias reais; mostrar proximo passo de cadastro.
- `people_pending_items_loaded`: pendencias reais de pessoas carregadas.
- `empty_people_pending_items`: sem pendencias de pessoas no tenant.
- `recent_visitors_loaded`: visitantes recentes reais carregados.
- `empty_recent_visitors`: sem visitantes recentes; orientar cadastro futuro.
- `event_schedule_unavailable`: programacao ainda sem fonte real nesta etapa.
- `communication_pending_unavailable`: comunicacao ainda depende de Epic 5.
- `weekly_checklist_ready`: checklist semanal deterministico disponivel.
- `denied_or_session_invalid`: usuario sem sessao ou sem perfil permitido.
- `server_error`: falha tecnica sem dados confiaveis.
- `technical_recovered_without_pii`: erro tecnico recuperavel preservando no maximo contagens agregadas sem nomes, contatos ou listas; proibido em `401`, `403` e troca de contexto.

### Requisitos tecnicos obrigatorios

- Stack atual confirmada no workspace:
  - Next.js `16.2.12`, React `19.2.4`, Tailwind CSS `4.2.2`, `@radix-ui/react-dialog` `1.1.15`.
  - Laravel framework `12.64.0`, PHP `^8.3`, PHPUnit `12.5.17`.
- API Laravel versionada sob `/api/v1`; nova rota autenticada deve ficar dentro do grupo `resolve.internal.session`.
- BFF Next.js deve usar Route Handler em `src/app/api/secretary/home/route.ts`.
- `callLaravel` deve continuar como caminho central para chamadas BFF -> Laravel e manter `cache: "no-store"`.
- Contrato obrigatorio de resposta:
  - `200 { data: { secretary_home: { state, people_pending_items, recent_visitors, quick_actions, event_schedule, communication_pending, weekly_checklist } } }`
  - `401 { message }` para sessao invalida.
  - `403 { message }` para perfil sem acesso.
  - `422 { message, errors }` apenas para validacao funcional segura.
  - `5xx { message: "Server error" }` no BFF.
- Campos de resposta devem ser `snake_case`; datas em ISO 8601; ausencia de dado deve ser `null` ou lista vazia conforme contrato.
- Dados pessoais retornados devem ser minimizados para a home: nome exibivel, status operacional, contato resumido permitido, proximo passo e href/acao segura.
- Respostas de erro e logs devem ser sanitizados: nao retornar nem registrar stack trace, exception class bruta, token, headers internos, cookie, payload completo, nomes, contatos ou listas de pessoas.
- Schema minimo obrigatorio:
  - `state`: `secretary_home_loaded` ou `empty_secretary_home`.
  - `people_pending_items`: `{ state, total_count, items[] }`, com items `{ category, count, next_step_label, href, people_preview[] }`; `people_preview[]` usa no maximo `{ display_name, status, contact_summary }`.
  - `recent_visitors`: `{ state, window_days: 30, limit: 5, items[] }`, com items `{ display_name, status, contact_summary, next_step_label, href }`.
  - `quick_actions`: lista fixa do MVP com `{ label, href, state }`, onde `state` e `available` ou `preparing_flow`.
  - `event_schedule`: `{ state: "event_schedule_unavailable", summary, next_step_label: null, items: [] }`.
  - `communication_pending`: `{ state: "communication_pending_unavailable", summary, next_step_label: null, items: [] }`.
  - `weekly_checklist`: `{ state: "weekly_checklist_ready", items[] }`; items fixos `{ key, label, state: "not_started" }`.

### Compliance de arquitetura

- Manter Laravel como fonte de verdade para autorizacao, validacao e tenant scope.
- Controllers finos: FormRequest/Request, service de dominio, Resource de saida.
- Domain People deve seguir `app/Domain/People/Models`, `Services`, `Resources`/Resources HTTP e `Repositories` apenas se a complexidade justificar.
- Nao mover regra de pendencia para React; frontend apresenta estados e aciona fluxos.
- Usar `JsonResource`/Resource idiomatico do Laravel; nao criar wrapper global customizado.
- `administrator` e `secretary` podem acessar secretaria; isso nao concede acesso a tesouraria, lideranca executiva financeira ou administracao de usuarios.
- Preservar a matriz atual de areas em `ResolveBackofficeAreaAccessService` e cobrir regressao por teste.
- UI deve usar `shadcn/ui` primitives existentes, `Surface` e componentes operacionais compostos.
- Endpoint tecnico padronizado em ingles: `/api/secretary/home` no BFF e `/api/v1/secretary/home` no Laravel. A rota visual `/secretaria` permanece por linguagem de produto.

### Requisitos de teste

- Backend minimo:
  - `cd church-erp-api && php artisan test tests/Feature/People/SecretaryHomeTest.php`
  - `cd church-erp-api && php artisan test tests/Feature/Identity/BackofficeAreaAccessTest.php`
  - `cd church-erp-api && php artisan test tests/Feature/Identity/InitialCategoryDefaultsTest.php` se tocar categorias de pessoas
  - `cd church-erp-api && php artisan test`
- Frontend minimo:
  - `cd church-erp-web && npm test -- tests/secretary-home.test.mjs`
  - `cd church-erp-web && npm test -- tests/bff-smoke.test.mjs`
  - `cd church-erp-web && npm test`
  - `cd church-erp-web && npm run lint`
  - `cd church-erp-web && npm run typecheck`
  - `cd church-erp-web && npm run build:smoke`
- Testes devem provar:
  - tenant isolation em dados de pessoas;
  - autorizacao `secretary`/`administrator` permitida e demais perfis negados;
  - rate limit `secretary-home` aplicado por `user_id|church_id`;
  - browser nao chama Laravel direto;
  - BFF limpa cookie em `401`;
  - nenhum dado pessoal e preservado apos `401`, `403` ou troca de contexto;
  - nenhum log ou resposta de erro inclui PII, payload completo, cookie, token, header de auth, exception bruta ou stack trace;
  - payloads continuam `snake_case`;
  - shape da resposta nao inclui PII fora da allowlist;
  - UI renderiza loading, empty, denied, error, success e estados indisponiveis;
  - nao existem mocks permanentes nem termos genericos proibidos.

### Licoes de stories ou reviews anteriores

- Epic 3 mostrou que leitura confiavel nasce de contrato e regra de dominio, nao de tela composta com dados soltos.
- Story 3.1 fechou cedo o contrato backend-BFF-UI; repetir esse padrao para People/Secretaria antes de polir a UI.
- Story 3.2 tratou divergencia de dados como falha grave; em People, leitura sem tenant ou fonte real deve bloquear estado confiavel.
- Story 3.3 reforcou allowlist de dados para handoff; aqui, dados pessoais precisam de minimizacao ainda mais rigorosa.
- Story 3.4 separou permissao de lideranca e tesouraria; aqui, secretaria nao deve herdar acesso financeiro e lideranca nao deve ver dados pessoais operacionais.
- Reviews anteriores encontraram riscos em parametros de escopo, estados otimistas, logs e linguagem tecnica visivel. Converter isso em testes e mensagens claras.
- Retrospectiva da Epic 3 definiu que a Epic 4 deve priorizar People com `church_id`, permissao por perfil, consultas tenant-scoped, BFF dedicado e UI operacional real.

### Git Intelligence Summary

- `c8620ab implementa a story 3.4` adicionou endpoint Laravel e BFF dedicados para lideranca, Gate especifico, rate limit nomeado, UI operacional propria e testes extensos. Use esse padrao para secretaria, mas sem copiar dominio financeiro.
- `3862715 implementa a story 3.3` reforcou handoff seguro e allowlist de dados; aplicar a mesma disciplina para dados pessoais.
- O codigo atual ja possui `/secretaria` protegido por `AreaGuard`, mas ainda como placeholder.
- `ResolveBackofficeAreaAccessService` ja permite `administrator` e `secretary` na area `secretaria`; preserve essa regra e teste regressao.
- `PersonCategory` e `ProvisionInitialPersonCategoriesService` ja existem; a story deve estender o dominio People sem duplicar defaults.

### Informacoes tecnicas atuais

- A documentacao oficial atual do Next.js App Router confirma Route Handlers em `app` para criar handlers HTTP; GET Route Handlers nao sao cacheados por padrao, mas o projeto deve manter `cache: "no-store"` por regra defensiva e por sensibilidade de dados pessoais.
- A documentacao oficial atual de Next.js descreve `cookies` como API assíncrona para ler cookies em Server Components e ler/escrever cookies em Server Actions/Route Handlers; o projeto pode manter o padrao atual de leitura pelo header da `Request` nos BFFs ou migrar com teste explicito, sem misturar abordagens sem necessidade.
- A documentacao oficial do Laravel 12 define Gates e Policies como mecanismos primarios de autorizacao; Gates sao adequados para acoes sem modelo especifico, como acesso a area, e Policies para recursos de dominio.
- A documentacao oficial de routing/rate limiting do Laravel permite associar rate limiters nomeados a rotas via middleware `throttle:nome`; esta story deve usar `throttle:secretary-home` porque a leitura retorna dados pessoais minimizados.

### Project Structure Notes

- `church-erp-web/src/app/secretaria/page.tsx` existe, mas e placeholder dentro de `AreaGuard`.
- `church-erp-web/src/components/operational/area-guard.tsx` verifica `/api/backoffice/access/{area}` antes de renderizar conteudo.
- `church-erp-web/src/features/app-shell/navigation-policy.js` ja lista `/secretaria` para `administrator` e `secretary`.
- `church-erp-api/app/Domain/Identity/Services/ResolveBackofficeAreaAccessService.php` ja separa `secretaria`, `treasury`, `leadership` e `communications`.
- `church-erp-api/app/Domain/People/Models/PersonCategory.php` e `ProvisionInitialPersonCategoriesService.php` sao a base atual de People.
- Ainda nao existem modelos/tabelas de membros, visitantes ou pendencias de pessoas; esta story deve criar a base unificada `people` para leitura real e explicitar estados indisponiveis honestos onde a fonte ainda nao existe.
- `church-erp-web/tests/bff-smoke.test.mjs` ja usa source inspection para BFF boundaries e deve ser ampliado com secretaria.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 4, Story 4.1 e padrao frontend.
- `_bmad-output/planning-artifacts/prd.md` - FR-5, FR-6, Jornada B e NFR-5.
- `_bmad-output/planning-artifacts/architecture.md` - dominios People/Operations, BFF, tenancy, autorizacao, estrutura e contratos.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - home da secretaria, PeopleFollowupBlock, EventScheduleBlock, CommunicationPendingBlock, QuickActionRail e padroes de feedback/navegacao.
- `_bmad-output/project-context.md` - stack, BFF, componentes, testes e regras criticas.
- `_bmad-output/implementation-artifacts/epic-3-retro-2026-08-10.md` - preparacao da Epic 4, riscos e action items.
- `_bmad-output/implementation-artifacts/3-4-exibir-visao-resumida-para-lideranca.md` - padrao recente de BFF/endpoint dedicado, autorizacao e estados honestos.
- `church-erp-web/src/app/secretaria/page.tsx`
- `church-erp-web/src/components/operational/area-guard.tsx`
- `church-erp-web/src/components/operational/treasury-home-shell.tsx`
- `church-erp-web/src/features/app-shell/navigation-policy.js`
- `church-erp-api/app/Domain/Identity/Services/ResolveBackofficeAreaAccessService.php`
- `church-erp-api/app/Policies/BackofficeAreaPolicy.php`
- `church-erp-api/app/Domain/People/Models/PersonCategory.php`
- `church-erp-api/app/Domain/People/Services/ProvisionInitialPersonCategoriesService.php`
- `church-erp-api/routes/api.php`
- Web: https://nextjs.org/docs/app/getting-started/route-handlers
- Web: https://nextjs.org/docs/app/api-reference/functions/cookies
- Web: https://laravel.com/docs/12.x/authorization
- Web: https://laravel.com/docs/12.x/routing#rate-limiting

### Checklist pre-review

- `/secretaria` renderiza home real com `SecretaryHomeShell`, nao placeholder.
- Browser chama somente `/api/secretary/home`.
- BFF chama Laravel somente server-side por `callLaravel`.
- `GET /api/v1/secretary/home` existe sob `/api/v1` e `resolve.internal.session`.
- `secretary` e `administrator` acessam; `treasurer`, `leadership`, sessao ausente e membership inativa nao acessam.
- `church_id` vem apenas da sessao autenticada.
- Query/body com `church_id`, `user_id`, `role`, `tenant` ou escopo sensivel e rejeitado.
- Dados de outros tenants nao aparecem em nenhum bloco.
- Pessoas/visitantes/pendencias vêm de fonte real ou retornam estado vazio honesto.
- Visitantes recentes usam janela de 30 dias, ordenacao decrescente e limite 5.
- Pendencias usam somente regras deterministicas de status/contato ausente.
- Programacao e comunicacao usam estados indisponiveis honestos ate existir fonte real.
- Checklist semanal nao finge persistencia concluida.
- Dados pessoais retornados sao minimos para a home.
- `401`, `403` e troca de contexto limpam dados pessoais previamente renderizados.
- UI cobre loading, loaded, empty, denied, error e `technical_recovered_without_pii`.
- Componentes novos ficam em `src/components/operational` ou `src/features`, nao em `src/components/ui` com dominio.
- UI nao importa componentes de tesouraria/financeiros para preencher secretaria.
- UI nao usa "dashboard", "widget", "KPI", "performance" ou "BI".
- Testes backend, web, lint, typecheck e smoke build passam antes de review.
- `composer audit`, `npm audit --omit=dev` nos dois apps e `detect-secrets` via pre-commit passam antes de review.
- `/bmad-review-security` foi executado e findings validos foram incorporados antes de iniciar dev-story.

### Story Completion Status

- Status alvo desta story para entrada em implementacao: `ready-for-dev`
- Nota de conclusao do contexto: `Ultimate context engine analysis completed - comprehensive developer guide created`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-08-12: Executado pre-gate `/bmad-review-security` sobre story/spec e superficie sensivel. Sem achado bloqueante; `pre-commit`/`detect-secrets` indisponivel no ambiente local.
- 2026-08-12: Backend implementado em ciclo vermelho/verde com `tests/Feature/People/SecretaryHomeTest.php` cobrindo autorizacao, tenant isolation, rate limiter, parametros de escopo, regras deterministicas de pendencia, visitantes recentes, estados vazios e logs sem PII.
- 2026-08-12: BFF e frontend cobertos por `tests/secretary-home.test.mjs` e `tests/bff-smoke.test.mjs` com source inspection e runtime de sanitizacao.
- 2026-08-12: Validacoes executadas: `php artisan test`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build:smoke`, `composer audit`, `npm audit --omit=dev` nos dois apps.
- 2026-08-12: Code review corrigido automaticamente: limpeza imediata de PII no reload, CTAs acionaveis/indisponibilidade explicita, consulta de pendencias sem carregar conjunto completo, erro frontend sanitizado e File List alinhada ao Git. `pre-commit run detect-secrets --all-files` segue indisponivel porque `pre-commit` nao esta instalado.
- 2026-08-13: Security review corrigido: estado `denied_or_session_invalid` deixou de montar blocos operacionais da secretaria; `Person` nao aceita `church_id` por mass assignment; constraints de People foram consolidadas em `enum` sem SQL raw novo; `.secrets.baseline` criada e `detect-secrets-hook` validado em container.

### Completion Notes List

- Criado endpoint Laravel `GET /api/v1/secretary/home` sob `resolve.internal.session`, autorizado por Gate `view-secretary-home` e protegido por `throttle:secretary-home` chaveado por `user_id|church_id`.
- Criada tabela/modelagem unificada `people` com `church_id`, `person_type`, `status`, nome exibivel e contato minimo, preparada para membros, visitantes, busca e comunicacao futura.
- Implementado `BuildSecretaryHomeService` com dados reais tenant-scoped, visitantes recentes em janela de 30 dias com limite 5, pendencias deterministicas e blocos indisponiveis honestos para programacao/comunicacao.
- Criado BFF `GET /api/secretary/home` com chamada server-side via `callLaravel`, `cache: "no-store"`, rejeicao de query livre, sanitizacao de erros e limpeza de cookie em `401`.
- Substituido placeholder de `/secretaria` por `SecretaryHomeShell` dentro de `AreaGuard`, com blocos operacionais para pessoas, visitantes, atalhos, checklist semanal, programacao e comunicacao.
- Estados de seguranca implementados para nao preservar PII apos `401`/`403`; erro tecnico recuperavel preserva somente contagens agregadas sem nomes/listas/contatos.
- Correcoes de review aplicadas: a UI limpa dados pessoais antes de nova leitura, CTAs usam `href` seguro ou motivo explicito de indisponibilidade, previews de pendencias sao limitados em consultas dedicadas e erro tecnico local usa mensagem sanitizada.
- Correcoes de security review aplicadas: usuarios negados veem somente o estado de negacao, sem blocos de pessoas; `church_id` foi removido de `$fillable`; hook `detect-secrets` passou a usar baseline auditada para falsos positivos existentes.

### File List

- `.pre-commit-config.yaml`
- `.secrets.baseline`
- `_bmad-output/implementation-artifacts/4-1-exibir-home-operacional-da-secretaria.md`
- `_bmad-output/implementation-artifacts/epic-3-retro-2026-08-10.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `church-erp-api/README.md`
- `church-erp-api/app/Domain/People/Models/Person.php`
- `church-erp-api/app/Domain/People/Services/BuildSecretaryHomeService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ShowSecretaryHomeController.php`
- `church-erp-api/app/Http/Requests/ShowSecretaryHomeRequest.php`
- `church-erp-api/app/Http/Resources/SecretaryHomeResource.php`
- `church-erp-api/app/Models/User.php`
- `church-erp-api/app/Providers/AppServiceProvider.php`
- `church-erp-api/composer.lock`
- `church-erp-api/database/migrations/2026_08_12_000001_create_people_table.php`
- `church-erp-api/routes/api.php`
- `church-erp-api/tests/Feature/People/SecretaryHomeTest.php`
- `church-erp-api/tests/Unit/Identity/CreateChurchUserServiceTest.php`
- `church-erp-api/tests/Unit/Identity/CreateInitialChurchSetupServiceTest.php`
- `church-erp-web/package-lock.json`
- `church-erp-web/src/app/api/secretary/home/route.ts`
- `church-erp-web/src/app/secretaria/page.tsx`
- `church-erp-web/src/components/operational/communication-pending-block.tsx`
- `church-erp-web/src/components/operational/event-schedule-block.tsx`
- `church-erp-web/src/components/operational/people-followup-block.tsx`
- `church-erp-web/src/components/operational/secretary-home-shell.tsx`
- `church-erp-web/src/components/operational/weekly-checklist-block.tsx`
- `church-erp-web/src/features/auth/session.ts`
- `church-erp-web/src/features/secretaria/secretary-home.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`
- `church-erp-web/tests/secretary-home.test.mjs`

### Change Log

- 2026-08-12: Implementada home operacional da secretaria com contrato backend-BFF-UI, base inicial `people`, seguranca/privacidade/tenant isolation e cobertura de testes. Status alterado para `review`.
- 2026-08-12: Corrigidos achados do code review e status alterado para `done`.
