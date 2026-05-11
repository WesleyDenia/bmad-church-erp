# Story 2.2: Registrar receita ou despesa com campos minimos

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a tesoureiro,
I want registrar receita ou despesa com um formulario curto,
so that eu conclua o lancamento em poucos passos apos o culto.

## Acceptance Criteria

1. Dado que o tesoureiro autenticado inicia um novo lancamento na area `treasury`, quando informa `tipo`, `valor`, `subtipo`, `contraparte` e `centro de custo` validos, entao o sistema salva o lancamento no tenant correto e retorna confirmacao clara sem tirar o usuario da home da tesouraria.
2. Dado que algum campo obrigatorio esta ausente, invalido ou inconsistente com o `tipo` escolhido, quando o tesoureiro tenta salvar, entao o sistema nao conclui o lancamento, preserva os dados digitados e explica o que precisa ser corrigido em linguagem simples.
3. Dado que o browser consome o fluxo de lancamento, quando a submissao acontece, entao a chamada segue apenas pelo `church-erp-web` via BFF e o backend Laravel deriva `church_id` e autorizacao da sessao autenticada, sem aceitar tenant vindo do payload.
4. Dado que nao existam categorias financeiras disponiveis para o tenant atual, quando a area de lancamento e aberta, entao a UI entra em estado bloqueado orientado a acao, nao hardcode subtipos e nao tenta salvar lancamento incompleto.
5. Dado que esta e a primeira versao do fluxo e a Story 2.3 ainda nao foi implementada, quando o tesoureiro informa a contraparte, entao o sistema persiste apenas o nome informado em `counterparty_name`, sem introduzir cadastro inline, catalogo de contrapartes ou `counterparty_id` nesta entrega.
6. Dado que o produto ainda nao fechou a taxonomia final de categoria versus subtipo, quando o usuario escolhe `subtipo` nesta story, entao a UI trata esse campo como selecao de uma `financial_category` existente do tenant e envia tecnicamente `financial_category_id` como representacao MVP do subtipo.

## Tasks / Subtasks

- [x] Implementar o primeiro contrato real de lancamento financeiro no backend Laravel, mantendo o dominio financeiro como fonte de verdade do fluxo (AC: 1, 2, 3)
  - [x] Criar a persistencia tenant-scoped para `financial_entries` no dominio `Finance`, com migration propria e model em `church-erp-api/app/Domain/Finance/Models/FinancialEntry.php`.
  - [x] Criar `CreateFinancialEntryService` em `church-erp-api/app/Domain/Finance/Services/` para orquestrar a escrita e manter a regra de negocio fora do controller.
  - [x] Expor `POST /api/v1/finance/entries` dentro do grupo `resolve.internal.session`, com controller fino em `church-erp-api/app/Http/Controllers/Api/V1/StoreFinancialEntryController.php`, `FormRequest` dedicado e `JsonResource` de resposta.
  - [x] Reutilizar autorizacao explicita para a area `treasury` no endpoint de escrita, aplicando o mesmo contrato de acesso por role ja adotado na tesouraria, em vez de depender apenas da sessao autenticada.
  - [x] Fixar o payload MVP desta story como `entry_type`, `amount`, `financial_category_id`, `counterparty_name` e `cost_center_name`, todos em `snake_case`.
  - [x] Garantir que `church_id` seja sempre derivado da `authenticated_session` e nunca aceite override do browser.

- [x] Conectar o fluxo pelo BFF do Next.js, sem chamar o Laravel autenticado diretamente do browser (AC: 1, 2, 3)
  - [x] Criar `church-erp-web/src/app/api/finance/entries/route.ts` reutilizando `callLaravel`, cookie de sessao e padroes de saneamento ja usados em `api/auth/*` e `api/categories/defaults`.
  - [x] Expor uma fonte autenticada tenant-scoped para listar todas as categorias financeiras validas do tenant, sem limitar o seletor apenas a defaults iniciais.
  - [x] Criar contratos TypeScript em `church-erp-web/src/features/finance/financial-entry.ts` com payload/resposta em `snake_case`, espelhando exatamente `entry_type`, `amount`, `financial_category_id`, `counterparty_name` e `cost_center_name`.
  - [x] Popular o seletor visual de `subtipo` a partir da lista completa de categorias financeiras do tenant, filtrando por `kind` no fluxo da UI e enviando tecnicamente `financial_category_id`.

- [x] Implementar o formulario curto de lancamento dentro da rota oficial da tesouraria, preservando a home operacional criada na Story 2.1 (AC: 1, 2, 4)
  - [x] Estender `church-erp-web/src/components/operational/treasury-home-shell.tsx` com uma secao real em `#lancamento-rapido`, ou compor um componente dedicado como `treasury-entry-form.tsx`, sem criar rota paralela, wizard, modal ou pagina separada.
  - [x] Se a base atual nao tiver primitives suficientes, adicionar apenas os necessarios em `church-erp-web/src/components/ui/` derivados de `shadcn/ui` para `input`, `label` e seletor simples.
  - [x] Modelar `tipo` como escolha explicita `income|expense`, `valor` como campo monetario, `subtipo` como seletor dependente das categorias default filtradas por `kind`, `contraparte` como campo textual obrigatorio mapeado para `counterparty_name` e `centro_de_custo` como campo textual obrigatorio mapeado para `cost_center_name`.
  - [x] Permitir digitacao localizada de valor no input da UI quando isso melhorar a operacao, mas normalizar obrigatoriamente para string decimal com ponto antes do submit para o BFF/API.
  - [x] Exibir feedback inline e/ou persistente apos salvar, resetar o formulario de forma previsivel no sucesso e preservar os valores digitados quando houver erro.

- [x] Cobrir o risco principal com testes de backend e web antes de review (AC: 1, 2, 3, 4, 5, 6)
  - [x] Adicionar testes de backend para sucesso, validacao, sessao ausente, role sem acesso e isolamento por tenant em `church-erp-api/tests/Feature/Finance/`.
  - [x] Garantir que os testes backend tambem validem que `financial_category_id` pertence ao tenant atual, que o `kind` da categoria bate com `entry_type` e que o backend rejeita payloads fora do contrato MVP definido.
  - [x] Asserir explicitamente no teste de sucesso o shape minimo da resposta (`id`, `entry_type`, `amount`, `financial_category_id`, `counterparty_name`, `cost_center_name`, `created_at`, `message`).
  - [x] Ampliar `church-erp-web/tests/bff-smoke.test.mjs` para proteger a boundary do novo BFF, a permanencia do formulario em `/treasury` e a ausencia de chamada direta do browser ao Laravel.
  - [x] Executar `php artisan test` e `./vendor/bin/pint --test` em `church-erp-api`, alem de `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke` em `church-erp-web`.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story e a primeira mutacao financeira real do MVP e precisa transformar o atalho `Lancamento rapido` da home do tesoureiro em um fluxo funcional.
- O objetivo nao e construir um modulo financeiro completo; e permitir o primeiro registro confiavel de receita ou despesa no contexto da igreja ativa.
- O fluxo precisa continuar curto, seguro e rastreavel, reforcando o ciclo descrito no PRD: entrar na home, registrar o movimento, receber feedback claro e seguir para o fechamento.
- Esta entrega serve como fundacao para as stories 2.3, 2.4 e 2.5. Portanto, a modelagem deve ser enxuta, mas nao pode empurrar regra critica para React nem criar atalhos que dificultem auditoria futura.
- Nesta story, `contraparte` e tratada como nome livre persistido em `counterparty_name`, deixando a Story 2.3 livre para introduzir selecao e criacao inline de uma entidade propria sem precisar reescrever a jornada atual.
- Nesta story, o rotulo funcional `subtipo` sera representado tecnicamente por `financial_category_id` como decisao MVP local, sem encerrar de forma global a discussao futura sobre taxonomia final de categoria versus subtipo.
- O seletor de `subtipo` nao deve ficar restrito aos defaults iniciais da Story 1.5; ele precisa aceitar qualquer categoria financeira valida do tenant atual.

### Guardrails de implementacao obrigatorios

- `church-erp-web/src/app/treasury/page.tsx` permanece como entrypoint oficial da tesouraria e continua protegido por `AreaGuard`.
- O formulario deve nascer dentro da experiencia atual da home da tesouraria; nao criar nova rota como `/treasury/new`, `/finance/entry` ou equivalente.
- O browser so pode conversar com `church-erp-web/src/app/api/finance/entries/route.ts`; a rota web deve falar com Laravel via `callLaravel`.
- O backend deve derivar `church_id` e contexto de usuario da `authenticated_session`; o payload do browser nao deve conter `church_id`, `role` nem qualquer sinal de tenancy confiavel.
- O endpoint `POST /api/v1/finance/entries` nao pode confiar apenas em `resolve.internal.session`; ele tambem deve exigir autorizacao explicita coerente com a area `treasury`, reutilizando gate/policy ja adotado para acesso da tesouraria.
- O contrato tecnico desta story deve ser explicitamente `entry_type`, `amount`, `financial_category_id`, `counterparty_name` e `cost_center_name`. Nao deixar isso implicito no texto da story.
- `subtipo` desta story deve usar categorias financeiras validas do tenant atual, filtradas por `kind`, e ser transmitido como `financial_category_id`. Os defaults da Story 1.5 sao apenas a base inicial minima, nao o limite funcional do seletor.
- `contraparte` e `centro_de_custo` nesta story devem entrar como campos obrigatorios do proprio lancamento. `contraparte` sera persistida apenas como `counterparty_name` nesta entrega; nao criar nesta story catalogo de contrapartes, `counterparty_id`, CRUD proprio, wizard de configuracao ou overlay de criacao inline.
- A validacao oficial fica no Laravel. O frontend so antecipa UX basica, sem substituir as regras definitivas do backend.

### Abordagens proibidas

- Nao chamar o Laravel autenticado diretamente do browser.
- Nao usar Server Actions, React Hook Form, Zod, estado global novo ou outra arquitetura paralela para resolver um formulario curto que pode seguir o padrao atual de `fetch` + `useState`.
- Nao hardcode listas de subtipos no frontend nem limitar a UX apenas ao endpoint de defaults iniciais quando o tenant ja possuir categorias financeiras adicionais validas.
- Nao aceitar `church_id` vindo do payload nem confiar apenas no filtro visual da home para autorizacao de mutacao financeira.
- Nao introduzir `counterparty_id`, tabela de contrapartes, autocomplete com cadastro persistente ou qualquer variante de selecao inline nesta story.
- Nao resolver esta story criando inline create de contraparte, trilha de auditoria completa, pendencias financeiras ou resumo de fechamento; essas responsabilidades pertencem as stories 2.3, 2.4, 2.5 e Epic 3.
- Nao usar JSON opaco, coluna polimorfica vaga ou nomes genericos como `FinanceFormData`, `GenericEntryPanel` ou `DashboardFinanceWidget`.

### Arquivos provaveis a alterar ou criar

- `church-erp-api/routes/api.php`
- `church-erp-api/app/Domain/Finance/Models/FinancialEntry.php`
- `church-erp-api/app/Domain/Finance/Services/CreateFinancialEntryService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/StoreFinancialEntryController.php`
- `church-erp-api/app/Http/Requests/StoreFinancialEntryRequest.php`
- `church-erp-api/app/Http/Resources/FinancialEntryResource.php`
- `church-erp-api/database/migrations/`
- `church-erp-api/tests/Feature/Finance/`
- `church-erp-web/src/app/treasury/page.tsx` ou `church-erp-web/src/components/operational/treasury-home-shell.tsx`
- `church-erp-web/src/components/operational/treasury-entry-form.tsx`
- `church-erp-web/src/components/ui/`
- `church-erp-web/src/app/api/finance/entries/route.ts`
- `church-erp-web/src/features/finance/financial-entry.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`

### Estados obrigatorios da UI ou do fluxo

- `loading_categories`: enquanto o web carrega a lista tenant-scoped de categorias financeiras para montar o seletor de subtipo.
- `ready`: formulario pronto para receber `tipo`, `valor`, `subtipo`, `contraparte` e `centro de custo`.
- `submitting`: botao e feedback deixam claro que o salvamento esta em andamento.
- `validation_error`: mensagens proximas aos campos e feedback geral simples, sem perder valores digitados.
- `success`: confirmacao clara do salvamento e retorno imediato ao contexto da tesouraria, sem navegar para outra tela.
- `blocked_categories_missing`: se nao houver categorias financeiras disponiveis no tenant, bloquear a submissao e orientar o proximo passo em vez de inventar subtipos locais.
- `denied_or_session_invalid`: manter o comportamento atual do `AreaGuard` e da sanitizacao BFF quando a sessao expirar ou o acesso for negado.

### Requisitos tecnicos obrigatorios

- Backend alvo: PHP `^8.3`, Laravel `^12.0`, MySQL `8.4 LTS`. Frontend alvo: Next.js `16.2.3`, React `19.2.4`, TypeScript estrito e Tailwind CSS `^4`. [Source: `church-erp-api/composer.json`, `church-erp-web/package.json`]
- A API oficial deve continuar versionada em `/api/v1` e protegida por `resolve.internal.session` para mutacoes autenticadas da tesouraria. [Source: `church-erp-api/routes/api.php`, `church-erp-api/app/Http/Middleware/ResolveInternalSession.php`]
- O request oficial desta story deve permanecer em `snake_case`. `tipo` pode ser exibido como label em portugues, mas o contrato deve ser consistente com a base atual; se o campo tecnico escolhido for `kind`, ele deve continuar alinhado a `financial_categories.kind`. [Source: `_bmad-output/project-context.md`, `church-erp-api/app/Domain/Finance/Models/FinancialCategory.php`]
- O request oficial desta story fica fechado como `entry_type`, `amount`, `financial_category_id`, `counterparty_name` e `cost_center_name`, todos em `snake_case`.
- `subtipo` deve apontar para uma categoria financeira valida do tenant atual e compativel com o `entry_type` escolhido (`income` usa categorias `income`; `expense` usa categorias `expense`). Nao permitir categoria de outro tenant nem categoria de `kind` diferente.
- A fonte de categorias para o seletor de `subtipo` deve listar qualquer categoria financeira valida do tenant atual, incluindo categorias customizadas futuras, e nao apenas registros marcados como `is_default=true`.
- `counterparty_name` representa apenas o nome informado da contraparte nesta primeira versao. A Story 2.3 podera evoluir isso para selecao/criacao de entidade propria, mas esta entrega nao deve depender dessa entidade para funcionar.
- `amount` deve ser trafegado entre web, BFF e API como string decimal em formato de ponto, com duas casas quando aplicavel, por exemplo `125.40`. O backend deve normalizar e persistir esse valor em tipo decimal apropriado do banco, sem usar float binario como contrato de transporte nem como persistencia final.
- O input de valor no frontend deve converter entrada operacional localizada para esse contrato antes do submit. Se a UI aceitar `125,40`, o request ainda precisa sair como `125.40`.
- A escrita do lancamento deve acontecer em transacao de banco via service. [Source: https://laravel.com/docs/12.x/database]
- Validacao principal deve ficar em `FormRequest`, com mensagens funcionais e simples para o usuario. [Source: https://laravel.com/docs/12.x/validation]
- A resposta de sucesso deve usar `JsonResource` e expor, no minimo, `id`, `entry_type`, `amount`, `financial_category_id`, `counterparty_name`, `cost_center_name`, `created_at` e `message`, todos em `snake_case`, para que a UI consiga confirmar o salvamento sem adivinhar contrato. [Source: https://laravel.com/docs/12.x/eloquent-resources]
- O docs atuais do Next.js continuam posicionando `route.ts` dentro de `app/` como o local correto para handlers HTTP. Portanto o novo BFF deve nascer em `src/app/api/...`, nao em utilitario ad hoc nem junto da `page.tsx`. [Source: https://nextjs.org/docs/app/getting-started/route-handlers]
- A documentacao de forms do Next.js 16 destaca Server Actions, mas o projeto ja padronizou BFF `route.ts` + `fetch` client-side nas paginas de auth e defaults. Esta story deve seguir o padrao do repo, nao mudar de arquitetura no meio do fluxo. [Source: `church-erp-web/src/app/(auth)/login/page.tsx`, `church-erp-web/src/app/api/auth/login/route.ts`, https://nextjs.org/docs/app/guides/forms]

### Compliance de arquitetura

- Backend:
  - manter controller fino, validacao em `FormRequest`, regra de escrita em service e resposta em `JsonResource`;
  - manter `FinancialEntry` no dominio `Finance`, nao em `App\Models` generico;
  - preservar `church_id` como eixo de tenancy em modelo, query e validacao de integridade.
- Frontend:
  - `src/components/ui` concentra primitives;
  - `src/components/design-system` continua aplicando tokens visuais;
  - a composicao do formulario fica em `src/components/operational` e/ou `src/features/finance`;
  - a rota `/treasury` continua sendo a experiencia principal da area, sem fragmentacao.
- Produto:
  - a linguagem deve continuar operacional e nao corporativa;
  - o feedback precisa dizer o que foi salvo e o que o usuario pode fazer em seguida;
  - a home deve continuar parecendo ambiente de trabalho do tesoureiro, nao um dashboard generico.

### Requisitos de teste

- Backend:
  - sucesso com tesoureiro autenticado;
  - `422` com mensagens claras quando faltar `entry_type`, `amount`, `financial_category_id`, `counterparty_name` ou `cost_center_name`;
  - falha quando `financial_category_id` nao pertencer ao tenant ativo;
  - falha quando o `entry_type` nao combinar com o `kind` da categoria;
  - `401` sem sessao valida;
  - `403` para perfil sem acesso a tesouraria, validando explicitamente a autorizacao da area alem da autenticacao.
- Web:
  - o BFF `POST /api/finance/entries` existe e usa `callLaravel`;
  - a rota `/treasury` continua protegida por `AreaGuard`;
  - o formulario de lancamento esta ancorado em `#lancamento-rapido` dentro da home;
  - a implementacao nao introduz chamada direta do browser ao Laravel;
  - o frontend lida com `blocked_categories_missing` sem hardcode de categorias;
  - o label visual `subtipo` mapeia para `financial_category_id`, e o label visual `contraparte` mapeia para `counterparty_name`;
  - o frontend envia `amount` como string decimal, mesmo quando a digitacao local usar virgula, e consome a resposta de sucesso com o shape minimo fixado nesta story.
- Comandos obrigatorios:
  - em `church-erp-api`: `php artisan test`, `./vendor/bin/pint --test`
  - em `church-erp-web`: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build:smoke`

### Licoes de stories ou reviews anteriores

- A Story 2.1 mostrou que a rota `treasury` e os anchors internos ja sao contrato de navegacao; nao quebrar `#lancamento-rapido`, `#pendencias`, `#fechamento` e `#fluxo-financeiro`.
- O review da 2.1 endureceu a regra de manter empty states e CTAs reais; esta story nao pode criar um formulario silencioso ou sem proximo passo claro.
- A Story 1.5 criou a base inicial de categorias e um endpoint de defaults, mas a 2.2 nao deve ficar acoplada a uma fonte que retorne apenas `is_default=true` se o tenant ja possuir categorias financeiras adicionais validas.
- A Story 2.3 ja reserva a criacao inline de contraparte; a 2.2 nao deve invadir esse espaco nem congelar uma modelagem que bloqueie a evolucao seguinte.
- As stories do Epic 1 consolidaram tenancy, BFF e `snake_case` como contratos nao negociaveis. Qualquer atalho nesses pontos vai gerar regressao imediata de review.

### Project Structure Notes

- `church-erp-web/src/components/operational/treasury-home-shell.tsx` ja contem a ancora `#lancamento-rapido` e o CTA principal da rotina. O formulario precisa nascer ali ou em um componente filho direto dessa regiao.
- `church-erp-web/src/features/treasury/home-view-model.ts` ja orienta o CTA "Abrir lancamento rapido"; a story deve manter esse contrato util e sem links quebrados.
- `church-erp-web/src/app/api/categories/defaults/route.ts` e `church-erp-web/src/features/categories/defaults.ts` ja estabelecem o padrao de BFF autenticado + tipos TS espelhados ao Laravel, mas esta story provavelmente exigira uma fonte diferente para listar todas as categorias financeiras validas do tenant.
- `church-erp-api/app/Domain/Finance` hoje ainda nao possui entidade de lancamento. Esta story e o ponto correto para introduzir `FinancialEntry` sem misturar essa responsabilidade a `Identity`.
- O repositorio ainda nao possui `src/features/finance`; esta story pode cria-lo, mas sem espalhar a logica por `src/lib` ou pela `page.tsx`.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 2, Stories 2.1, 2.2 e 2.3, incluindo ACs e restricoes de frontend.
- `_bmad-output/planning-artifacts/prd.md` - FR-2, FR-3, jornada do tesoureiro, campos minimos e decisao ainda aberta sobre taxonomia final de centros de custo e subtipos.
- `_bmad-output/planning-artifacts/architecture.md` - Data Architecture, Structure Patterns, Frontend UI System Pattern, Integration Points e boundaries entre Next.js e Laravel.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - jornada da home do tesoureiro, feedback patterns, form patterns e estrategia desktop-first.
- `_bmad-output/project-context.md` - regras de tenancy, `snake_case`, BFF boundary, layering de componentes e comandos obrigatorios de validacao.
- `_bmad-output/implementation-artifacts/1-5-configurar-categorias-minimas-iniciais.md` - defaults financeiros e endpoint autenticado de categorias.
- `_bmad-output/implementation-artifacts/2-1-exibir-home-operacional-do-tesoureiro.md` - anchors, shell atual da tesouraria, licoes de review e padrao de composicao operacional.
- `church-erp-api/app/Domain/Identity/Services/ListInitialCategoryDefaultsService.php` - evidencia de que o endpoint atual de defaults lista apenas categorias com `is_default=true`, insuficiente como fonte universal do seletor de `subtipo`.
- `church-erp-api/routes/api.php` - padrao atual de rotas `/api/v1` e grupo `resolve.internal.session`.
- `church-erp-api/app/Http/Middleware/ResolveInternalSession.php` - origem do contexto autenticado usado para tenancy.
- `church-erp-api/app/Domain/Finance/Models/FinancialCategory.php` - categoria financeira tenant-scoped com `kind`.
- `church-erp-api/app/Domain/Finance/Services/ProvisionInitialFinancialCategoriesService.php` - defaults financeiros existentes (`dizimos`, `ofertas`, `despesas-operacionais`, `acao-social`).
- `church-erp-web/src/app/treasury/page.tsx` - rota oficial da area.
- `church-erp-web/src/components/operational/treasury-home-shell.tsx` - shell atual e anchors internos da tesouraria.
- `church-erp-web/src/app/api/categories/defaults/route.ts` - padrao atual de BFF autenticado para defaults.
- `church-erp-web/src/features/categories/defaults.ts` - contrato TS atual para defaults.
- `church-erp-web/src/lib/api/client.ts` - boundary oficial BFF -> Laravel.
- `church-erp-web/src/app/(auth)/login/page.tsx` - padrao atual de formulario client-side com `fetch` e preservacao de erros.
- `church-erp-web/package.json`, `church-erp-api/composer.json`, `church-erp-web/components.json` - stack e configuracao atuais.
- `https://nextjs.org/docs/app/getting-started/route-handlers` - `route.ts` no App Router como handler HTTP oficial.
- `https://nextjs.org/docs/app/guides/forms` - formas atuais de lidar com formularios no App Router e referencia para nao divergir sem necessidade.
- `https://laravel.com/docs/12.x/validation` - `FormRequest` e resposta `422` para requests XHR.
- `https://laravel.com/docs/12.x/eloquent-resources` - `JsonResource` para resposta de sucesso.
- `https://laravel.com/docs/12.x/database` - `DB::transaction()` e rollback automatico em excecoes.

### Checklist pre-review

- O formulario continua dentro da experiencia `/treasury` e respeita `AreaGuard`.
- O browser nao chama o Laravel autenticado diretamente.
- Existe BFF `POST /api/finance/entries` em `src/app/api/finance/entries/route.ts`.
- O backend deriva `church_id` da sessao e nao aceita tenant do payload.
- `subtipo` reutiliza categorias financeiras validas do tenant, filtradas por `kind`, e o payload tecnico usa `financial_category_id`.
- `contraparte` e `centro_de_custo` sao obrigatorios nesta story, com payload tecnico `counterparty_name` e `cost_center_name`, mas sem inline create nem CRUD paralelo.
- O endpoint de escrita exige autorizacao explicita coerente com a area `treasury`, nao apenas sessao autenticada.
- `amount` usa string decimal como contrato de transporte e nao float.
- O input de valor normaliza digitacao localizada para string decimal antes do submit.
- Erros de validacao ficam claros e preservam os dados digitados.
- Sucesso confirma o que foi salvo e mantem o usuario no contexto da tesouraria.
- A resposta de sucesso expoe pelo menos `id`, `entry_type`, `amount`, `financial_category_id`, `counterparty_name`, `cost_center_name`, `created_at` e `message`.
- `php artisan test`, `./vendor/bin/pint --test`, `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke` passaram.

### Git intelligence

- O historico recente mostra entregas incrementais por story (`1.5`, `2.1`) com foco em uma seam de arquitetura por vez; esta story deve seguir a mesma disciplina e evitar adiantar auditoria, pendencias e resumo.
- O merge mais recente da `2.1` consolidou a home da tesouraria como centro da experiencia. A `2.2` precisa nascer como extensao desse shell, nao como fluxo paralelo.
- Os reviews anteriores endureceram BFF boundary, anchors reais e empty states. Qualquer implementacao que quebre esses contratos deve ser tratada como regressao, nao como refactor aceitavel.

### Latest tech information

- A documentacao do Next.js continua tratando `route.ts` dentro do `app` directory como o mecanismo oficial para handlers HTTP no App Router, reforcando o uso do BFF local para mutacoes desta story. [Source: https://nextjs.org/docs/app/getting-started/route-handlers]
- A documentacao atual de forms do Next.js 16 enfatiza Server Actions, mas o repositorio atual ainda padroniza `fetch` client-side contra rotas BFF locais; manter esse padrao evita divergencia de arquitetura entre auth, categories defaults e treasury. [Source: https://nextjs.org/docs/app/guides/forms]
- A documentacao do Laravel 12 confirma que `FormRequest` e o ponto correto para encapsular validacao e autorizacao de requests mais complexos, com resposta `422` JSON para requests XHR. [Source: https://laravel.com/docs/12.x/validation]
- A documentacao do Laravel 12 mantem `JsonResource` como forma idiomatica de transformar modelos em JSON consistente, o que se alinha ao padrao ja usado pelo repositorio. [Source: https://laravel.com/docs/12.x/eloquent-resources]
- A documentacao do Laravel 12 confirma que `DB::transaction()` faz rollback automatico quando ha excecao, o que deve proteger a escrita do lancamento se a composicao da persistencia falhar. [Source: https://laravel.com/docs/12.x/database]

### Project context reference

- Esta story deve ser implementada em conformidade com `_bmad-output/project-context.md`, especialmente nas regras de:
  - browser consumir apenas o `church-erp-web`
  - contratos HTTP em `snake_case`
  - controllers finos e services coesos no Laravel
  - `church_id` como eixo obrigatorio de tenancy
  - componentes separados entre `ui`, `design-system` e `operational`
  - proibicao de mover autorizacao ou validacao sensivel para React

### Story completion status

- Status da story neste momento: `done`
- Nota de conclusao: implementacao revisada e alinhada com o fluxo real de lancamento rapido, incluindo normalizacao monetaria corrigida para separadores de milhar e sanitizacao de erros `500` no BFF sem expor detalhes tecnicos.
- Proximo passo esperado: seguir para a Story 2.3 preservando os contratos `snake_case`, a boundary BFF e a composicao da home da tesouraria.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Introduzir o contrato backend `POST /api/v1/finance/entries` com validacao, service e recurso dedicados no dominio `Finance`.
- Adicionar o BFF `POST /api/finance/entries`, contratos TS em `src/features/finance` e o formulario de lancamento dentro da regiao `#lancamento-rapido` da home existente.
- Fechar a story com testes de tenancy, validacao, boundary BFF e comandos obrigatorios do backend/web.

### Debug Log References

- Story descoberta automaticamente a partir do backlog `2-2-registrar-receita-ou-despesa-com-campos-minimos` em `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- A analise usou `epics.md`, `prd.md`, `architecture.md`, `ux-design-specification.md`, `_bmad-output/project-context.md`, a story 2.1 e os contratos atuais de auth/categories.
- Foi identificado que ainda nao existe entidade de lancamento financeiro nem BFF de mutacao financeira no repositorio atual.
- Foi identificado que `financial_categories` ja existem e devem servir como base de `subtipo`, evitando taxonomia paralela, mas que o endpoint atual de defaults lista apenas `is_default=true` e nao deve ser tratado como fonte universal do seletor.
- Foi identificado que `contraparte` inline pertence a Story 2.3 e nao deve ser antecipada nesta entrega; por isso a Story 2.2 fixa apenas `counterparty_name` como representacao MVP.

### Completion Notes List

- Story escrita para estender a home real da tesouraria, sem rota paralela e sem quebra do `AreaGuard`.
- A seam oficial desta entrega ficou definida como Laravel domain service + BFF route + formulario operacional em `#lancamento-rapido`.
- O contrato de `subtipo` foi explicitamente amarrado a `financial_categories` tenant-scoped ja provisionadas na Story 1.5, representadas tecnicamente por `financial_category_id`.
- O contrato tecnico MVP agora esta fixado sem ambiguidade: `entry_type`, `amount`, `financial_category_id`, `counterparty_name` e `cost_center_name`.
- A story agora tambem fixa autorizacao explicita da area `treasury`, contrato decimal de `amount` e shape minimo da resposta de sucesso.
- A story agora exige que a fonte de `subtipo` aceite qualquer categoria financeira valida do tenant, nao apenas defaults iniciais, e explicita a normalizacao do valor digitado na UI.
- O escopo desta story foi limitado para evitar antecipar inline create de contraparte, auditoria completa, pendencias financeiras e fechamento.
- Os testes obrigatorios foram promovidos a criterio explicito de prontidao para evitar regressao de tenancy e boundary BFF.
- Implementado `GET /api/v1/finance/categories` e `POST /api/v1/finance/entries` com gate da area `treasury`, `FormRequest`, `JsonResource` e services coesos no dominio `Finance`.
- Implementado o BFF em `church-erp-web/src/app/api/finance/*` e os contratos TS em `src/features/finance`, mantendo payload e resposta em `snake_case`.
- Implementado o formulario `TreasuryEntryForm` dentro de `#lancamento-rapido`, com estados `loading_categories`, `blocked_categories_missing`, `validation_error`, `submitting` e `success`.
- Adicionados helper de normalizacao monetaria e primitives `input`, `label` e `select` para manter o fluxo local, previsivel e sem depender de arquitetura paralela.
- Validacoes executadas com sucesso em `php artisan test`, `./vendor/bin/pint --test`, `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke`.
- Ajustado o helper de valor para aceitar `1.234` e `1,234` como entrada operacional valida, normalizando para contrato decimal antes do submit.
- Sanitizados os handlers BFF de financas para responder apenas `Server error` em falhas `500`, sem vazar detalhes tecnicos para a UI.
- Separados os estados de erro do formulario entre validacao, sessao/acesso e falha de servidor, evitando mensagens enganosas para indisponibilidade tecnica.
- Revisao adversarial concluida com correcoes aplicadas e validacao frontend rerodada com `npm test`, `npm run lint` e `npm run typecheck`.

### File List

- _bmad-output/implementation-artifacts/2-2-registrar-receita-ou-despesa-com-campos-minimos.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- church-erp-api/app/Domain/Finance/Models/FinancialEntry.php
- church-erp-api/app/Domain/Finance/Services/CreateFinancialEntryService.php
- church-erp-api/app/Domain/Finance/Services/ListFinancialCategoriesService.php
- church-erp-api/app/Http/Controllers/Api/V1/ListFinancialCategoriesController.php
- church-erp-api/app/Http/Controllers/Api/V1/StoreFinancialEntryController.php
- church-erp-api/app/Http/Requests/StoreFinancialEntryRequest.php
- church-erp-api/app/Http/Resources/FinancialCategoryListResource.php
- church-erp-api/app/Http/Resources/FinancialEntryResource.php
- church-erp-api/database/migrations/2026_05_06_000001_create_financial_entries_table.php
- church-erp-api/database/migrations/2026_05_06_000002_add_entry_type_check_constraint_to_financial_entries_table.php
- church-erp-api/routes/api.php
- church-erp-api/tests/Feature/Finance/ListFinancialCategoriesTest.php
- church-erp-api/tests/Feature/Finance/StoreFinancialEntryTest.php
- church-erp-web/src/app/api/categories/defaults/route.ts
- church-erp-web/src/app/api/finance/categories/route.ts
- church-erp-web/src/app/api/finance/entries/route.ts
- church-erp-web/src/components/operational/treasury-entry-form.tsx
- church-erp-web/src/components/operational/treasury-home-shell.tsx
- church-erp-web/src/components/ui/input.tsx
- church-erp-web/src/components/ui/label.tsx
- church-erp-web/src/components/ui/select.tsx
- church-erp-web/src/features/categories/defaults.ts
- church-erp-web/src/features/finance/amount.ts
- church-erp-web/src/features/finance/financial-entry.ts
- church-erp-web/tests/bff-smoke.test.mjs
- church-erp-web/tests/finance-entry.test.mjs

### Change Log

- 2026-05-06: implementado o primeiro fluxo real de lancamento financeiro com persistencia tenant-scoped no Laravel, BFF dedicado no Next.js, seletor de categorias financeiras completo do tenant e formulario operacional embutido na home da tesouraria.
- 2026-05-07: review adversarial aplicada com correcoes no parse de valor com separador de milhar, sanitizacao de `500` como `Server error`, ajuste semantico dos estados de erro do formulario e sincronizacao da story com o git real.

## Senior Developer Review (AI)

### Outcome

- Aprovar apos correcoes.

### Findings Resolved

- Corrigido o helper monetario para aceitar entrada localizada com separador de milhar sem quebrar o contrato decimal do payload.
- Corrigida a sanitizacao do BFF para que respostas `500` de categorias e lancamentos retornem apenas `Server error`.
- Corrigido o formulario para nao tratar indisponibilidade tecnica como sessao invalida nem como erro de validacao.
- Corrigida a rastreabilidade da `File List` para refletir tambem os arquivos de categorias presentes no worktree desta entrega.

### Validation

- `npm test`
- `npm run lint`
- `npm run typecheck`

### Review Date

- 2026-05-07
