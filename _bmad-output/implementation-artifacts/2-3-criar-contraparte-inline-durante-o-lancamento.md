# Story 2.3: Criar contraparte inline durante o lancamento

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a tesoureiro,
I want cadastrar uma contraparte sem sair do fluxo de lancamento,
so that eu nao perca ritmo quando encontro um registro ausente.

## Acceptance Criteria

1. Dado que o tesoureiro esta no formulario `#lancamento-rapido` e nao encontra a contraparte desejada, quando abre a criacao inline e informa os dados minimos validos, entao o sistema cria a contraparte no tenant atual e retorna ao mesmo formulario com a nova contraparte ja selecionada, sem perder `tipo`, `valor`, `subtipo` nem `centro de custo` ja digitados.
2. Dado que o nome da contraparte esta ausente, invalido ou duplica uma contraparte existente no mesmo tenant segundo a regra de normalizacao definida pela story, quando o tesoureiro tenta concluir a criacao inline, entao o sistema bloqueia a criacao, explica o problema em linguagem simples, nao persiste registro parcial e preserva o restante do formulario principal sem limpeza indevida.
3. Dado que o browser consome o fluxo de contrapartes inline, quando lista ou cria contraparte, entao toda chamada passa apenas pelo `church-erp-web` via BFF e o backend Laravel deriva `church_id` e autorizacao da sessao autenticada, sem aceitar tenant vindo do payload.
4. Dado que ja existam contrapartes no tenant atual, quando o formulario de lancamento e aberto, entao a UI oferece uma lista tenant-scoped para selecao e ainda permite criar uma nova contraparte inline sem navegar para rota paralela, wizard ou CRUD separado.
5. Dado que a Story 2.2 persistiu apenas `counterparty_name` como texto livre, quando a Story 2.3 concluir um novo lancamento, entao o backend passa a persistir o relacionamento com a contraparte cadastrada e tambem preserva um snapshot `counterparty_name` no `financial_entry`, mantendo legibilidade historica e compatibilidade com registros antigos.
6. Dado que esta story estende a implementacao real da Story 2.2, quando o fluxo e entregue, entao continuam intactos a normalizacao monetaria, o filtro de categorias por `kind`, a ancora `#lancamento-rapido`, a boundary BFF e a separacao de camadas, sem antecipar auditoria de edicao, pendencias financeiras ou fechamento das Stories 2.4, 2.5 e Epic 3.

## Tasks / Subtasks

- [x] Introduzir um catalogo tenant-scoped de contrapartes no dominio `Finance`, com persistencia propria, listagem autenticada e criacao minima coesa (AC: 1, 2, 3, 4)
  - [x] Criar migration para `financial_counterparties` com `church_id`, `name`, `slug` e timestamps, aplicando unicidade por tenant sobre a representacao normalizada escolhida.
  - [x] Criar model em `church-erp-api/app/Domain/Finance/Models/FinancialCounterparty.php` reutilizando o mesmo padrao de tenancy de `FinancialCategory` e `FinancialEntry`.
  - [x] Criar services dedicados, como `ListFinancialCounterpartiesService` e `CreateFinancialCounterpartyService`, mantendo a regra de criacao e deduplicacao fora de controllers.
  - [x] Expor `GET /api/v1/finance/counterparties` e `POST /api/v1/finance/counterparties` dentro do grupo `resolve.internal.session`, com controllers finos, `FormRequest` para criacao e `JsonResource` para resposta.

- [x] Evoluir o contrato real de lancamento financeiro para usar contraparte cadastrada sem quebrar a base da Story 2.2 (AC: 1, 3, 5, 6)
  - [x] Adicionar `counterparty_id` em `financial_entries` como referencia nullable para compatibilidade com os registros ja salvos na Story 2.2.
  - [x] Atualizar `FinancialEntry`, `CreateFinancialEntryService`, `StoreFinancialEntryRequest` e `FinancialEntryResource` para que novos lancamentos exijam `counterparty_id`, derivem `counterparty_name` da contraparte selecionada e retornem ambos no response.
  - [x] Preservar `counterparty_name` como snapshot historico da entrada financeira; nao substituir o historico antigo por join em tempo de leitura nem exigir backfill massivo para marcar a story como pronta.

- [x] Estender o BFF e os contratos TypeScript do web app para a nova seam de contraparte (AC: 1, 2, 3, 4, 5)
  - [x] Criar `church-erp-web/src/app/api/finance/counterparties/route.ts` para listar e criar contraparte via `callLaravel`, repetindo a mesma sanitizacao de `401`, `403` e `500` ja usada nas rotas de financas.
  - [x] Criar contratos TS em `church-erp-web/src/features/finance/counterparty.ts` e evoluir `church-erp-web/src/features/finance/financial-entry.ts` para refletir o contrato atualizado com `counterparty_id`.
  - [x] Garantir que os contratos HTTP publicos continuem em `snake_case`, sem browser falar diretamente com `api/v1`.

- [x] Incorporar a selecao e criacao inline de contraparte no formulario existente da tesouraria, sem quebrar a home operacional (AC: 1, 2, 4, 6)
  - [x] Estender `church-erp-web/src/components/operational/treasury-entry-form.tsx` para carregar contrapartes reais do tenant, substituir o input livre atual por uma selecao consistente e acionar criacao inline no mesmo bloco operacional.
  - [x] Adicionar o primitive necessario em `church-erp-web/src/components/ui/` para overlay inline, preferindo `Dialog` e, se houver ganho real para mobile, mantendo compatibilidade com `Drawer`, sem criar overlay custom de infraestrutura paralela.
  - [x] Criar um componente dedicado para a criacao inline, como `church-erp-web/src/components/operational/counterparty-inline-dialog.tsx` ou equivalente na `feature`, deixando o `TreasuryEntryForm` coordenar estado e payload final.
  - [x] Garantir que sucesso inline injete a contraparte recem-criada na lista local, selecione automaticamente o novo `counterparty_id` e mantenha intactos os demais campos do formulario principal.

- [x] Cobrir o risco principal com testes de backend e web antes de review (AC: 1, 2, 3, 4, 5, 6)
  - [x] Adicionar testes de backend para listagem, criacao, duplicidade por tenant, sessao ausente, role sem acesso e isolamento multi-tenant de contrapartes em `church-erp-api/tests/Feature/Finance/`.
  - [x] Atualizar `StoreFinancialEntryTest` para proteger a evolucao do contrato, garantindo `counterparty_id` obrigatorio para novos writes e `counterparty_name` derivado no backend.
  - [x] Ampliar `church-erp-web/tests/bff-smoke.test.mjs` para proteger a nova rota BFF, a permanencia do fluxo na home da tesouraria, a ausencia de chamada direta ao Laravel e a preservacao do formulario principal durante erro inline.
  - [x] Executar `php artisan test` e `./vendor/bin/pint --test` em `church-erp-api`, alem de `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke` em `church-erp-web`.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story transforma a contraparte de texto livre da Story 2.2 em um objeto reutilizavel do fluxo financeiro, sem desmontar a jornada curta de `Lancamento rapido`.
- O objetivo nao e abrir um modulo de cadastro de terceiros; e permitir que o tesoureiro resolva a ausencia de uma contraparte no momento exato do lancamento, sem sair da home.
- A experiencia continua ancorada em `#lancamento-rapido` dentro de `church-erp-web/src/components/operational/treasury-home-shell.tsx`, que ja foi consolidada pela Story 2.1 como centro operacional da tesouraria.
- Esta story e a evolucao natural da decisao da 2.2: primeiro persistir `counterparty_name` para destravar o MVP, depois introduzir selecao e criacao inline de entidade propria sem reescrever toda a journey.
- O resultado esperado e um fluxo com catalogo tenant-scoped de contrapartes, criacao inline minima e gravacao do lancamento com vinculo relacional mais snapshot textual, preservando velocidade e rastreabilidade basica.

### Guardrails de implementacao obrigatorios

- `church-erp-web/src/components/operational/treasury-entry-form.tsx` continua sendo o host do fluxo; nao criar pagina nova como `/treasury/counterparties`, `/finance/counterparties/new` ou wizard lateral fora da home.
- O browser so pode conversar com `church-erp-web/src/app/api/finance/counterparties/route.ts`, `church-erp-web/src/app/api/finance/categories/route.ts` e `church-erp-web/src/app/api/finance/entries/route.ts`.
- O backend deve continuar derivando `church_id` e autorizacao da `authenticated_session`; nenhum payload do browser deve aceitar tenant, role ou qualquer pista confiavel de escopo.
- A criacao inline desta story exige exatamente um campo obrigatorio no MVP: `name`. Nao introduzir `email`, `telefone`, `documento`, `endereco`, `observacoes` ou qualquer outro atributo obrigatorio nesta entrega.
- O gatilho da criacao inline deve nascer no proprio campo de contraparte, com affordance explicita como `Nao encontrou? Cadastrar contraparte agora`, sem esconder a acao em menu distante ou CTA fora do contexto do campo.
- A entrada financeira nova deve deixar de confiar em texto livre vindo do browser para a contraparte. O frontend escolhe `counterparty_id`; o backend deriva `counterparty_name` a partir do registro selecionado e o persiste como snapshot.
- O browser nao deve enviar `counterparty_name` como campo autoritativo para novos lancamentos. O backend deve carregar a contraparte tenant-scoped a partir de `counterparty_id` e derivar dela o snapshot `counterparty_name` persistido em `financial_entries`.
- `counterparty_name` em `financial_entries` nao deve ser removido nem ignorado. Ele continua sendo a representacao historica do nome visto no momento do lancamento.
- Registros antigos da Story 2.2 nao podem bloquear esta entrega. A nova foreign key em `financial_entries` deve ser pensada para conviver com linhas legacy que ainda so possuem `counterparty_name`.
- A listagem de contrapartes precisa ser tenant-scoped e autorizada para a area `treasury`, do mesmo modo que `finance/categories` e `finance/entries`.
- O overlay inline deve reutilizar a fundacao de `shadcn/ui`; nao criar modal ad hoc com markup solto ou controlar acessibilidade manualmente quando ja houver primitive apropriado.
- A UI deve preservar os campos ja digitados no formulario principal quando o dialog falhar, for cancelado ou concluir com erro de validacao.
- Ao cancelar ou fechar o overlay inline sem salvar, o formulario principal deve preservar integralmente `entry_type`, `amount_input`, `financial_category_id` e `cost_center_name`, e nenhuma contraparte parcial pode ser persistida.
- Ao concluir a criacao inline com sucesso, o overlay deve fechar, a contraparte criada deve entrar imediatamente na lista local, ficar selecionada no formulario principal e exibir confirmacao curta no contexto do lancamento.
- O overlay inline deve parecer uma extensao do lancamento rapido, nao uma saida para outro fluxo administrativo.

### Abordagens proibidas

- Nao chamar o Laravel autenticado diretamente do browser.
- Nao manter `counterparty_name` como texto autoritativo do browser para novos writes depois desta story, salvo snapshot derivado no backend.
- Nao transformar a story em CRUD completo de contrapartes, tela administrativa separada, pesquisa global de pessoas ou mini-CRM.
- Nao reutilizar `PersonCategory`, cadastros de membros/visitantes ou qualquer outro dominio para representar contrapartes financeiras.
- Nao introduzir Server Actions, estado global novo, biblioteca paralela de modal/combobox ou arquitetura paralela ao padrao atual de `fetch` + BFF + `useState`.
- Nao introduzir combobox com busca remota, autocomplete inteligente, fuzzy search ou `create-while-typing` fora do dialog nesta story; o fluxo inline deve permanecer simples, local e previsivel.
- Nao misturar a entrega com motivo de edicao, trilha de auditoria completa, pendencias financeiras ou alteracoes de fechamento; isso pertence as Stories 2.4, 2.5 e Epic 3.
- Nao limpar o formulario principal quando a criacao inline falhar ou quando o usuario apenas fechar o overlay.
- Nao esconder duplicidade de contraparte com insercao silenciosa de sufixos ou duplicatas quase identicas sem uma regra explicita e testada.

### Arquivos provaveis a alterar ou criar

- `church-erp-api/routes/api.php`
- `church-erp-api/app/Domain/Finance/Models/FinancialCounterparty.php`
- `church-erp-api/app/Domain/Finance/Models/FinancialEntry.php`
- `church-erp-api/app/Domain/Finance/Services/ListFinancialCounterpartiesService.php`
- `church-erp-api/app/Domain/Finance/Services/CreateFinancialCounterpartyService.php`
- `church-erp-api/app/Domain/Finance/Services/CreateFinancialEntryService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/ListFinancialCounterpartiesController.php`
- `church-erp-api/app/Http/Controllers/Api/V1/StoreFinancialCounterpartyController.php`
- `church-erp-api/app/Http/Controllers/Api/V1/StoreFinancialEntryController.php`
- `church-erp-api/app/Http/Requests/StoreFinancialCounterpartyRequest.php`
- `church-erp-api/app/Http/Requests/StoreFinancialEntryRequest.php`
- `church-erp-api/app/Http/Resources/FinancialCounterpartyListResource.php`
- `church-erp-api/app/Http/Resources/FinancialCounterpartyResource.php`
- `church-erp-api/app/Http/Resources/FinancialEntryResource.php`
- `church-erp-api/database/migrations/`
- `church-erp-api/tests/Feature/Finance/`
- `church-erp-web/src/app/api/finance/counterparties/route.ts`
- `church-erp-web/src/components/operational/treasury-entry-form.tsx`
- `church-erp-web/src/components/operational/counterparty-inline-dialog.tsx`
- `church-erp-web/src/components/ui/dialog.tsx`
- `church-erp-web/src/components/ui/drawer.tsx` (somente se a implementacao realmente usar fallback responsivo)
- `church-erp-web/src/features/finance/counterparty.ts`
- `church-erp-web/src/features/finance/financial-entry.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`

### Estados obrigatorios da UI ou do fluxo

- `loading_categories`: estado ja existente enquanto o form carrega categorias financeiras.
- `loading_counterparties`: enquanto a lista tenant-scoped de contrapartes e carregada para o seletor.
- `ready`: formulario principal pronto para receber `tipo`, `valor`, `subtipo`, `contraparte` selecionada e `centro de custo`.
- `counterparty_dialog_open`: overlay inline aberto para cadastro minimo da contraparte.
- `counterparty_dialog_cancelled`: overlay fechado sem salvar, com retorno imediato ao formulario principal sem perda de estado.
- `creating_counterparty`: submissao da criacao inline em andamento, com CTA principal bloqueado de forma previsivel.
- `inline_validation_error`: falha de validacao dentro do overlay sem perda dos dados do formulario principal.
- `inline_success_selected`: contraparte criada com sucesso, inserida na lista e selecionada automaticamente no form principal.
- `entry_submitting`: salvamento do lancamento em andamento.
- `entry_validation_error`: erros do submit principal, preservando categoria, contraparte e centro de custo ja informados.
- `blocked_categories_missing`: manter o bloqueio ja existente quando nao houver categorias financeiras para o tenant.
- `denied_or_session_invalid`: manter o tratamento atual para sessao expirada ou acesso negado.
- `server_error`: falhas tecnicas sanitizadas como `Server error`, sem vazamento de detalhes internos nem reset indevido do fluxo.

### Requisitos tecnicos obrigatorios

- Backend alvo: PHP `^8.3`, Laravel `^12.0`, MySQL `8.4 LTS`. Frontend alvo: Next.js `16.2.3`, React `19.2.4`, TypeScript estrito e Tailwind CSS `^4`. [Source: `church-erp-api/composer.json`, `church-erp-web/package.json`]
- A API oficial continua versionada em `/api/v1` e protegida por `resolve.internal.session` para mutacoes e listagens autenticadas da tesouraria. [Source: `church-erp-api/routes/api.php`]
- O novo catalogo deve expor `GET /api/v1/finance/counterparties` e `POST /api/v1/finance/counterparties` como seam oficial de listagem/criacao inline, ambos autorizados para a area `treasury`.
- O request de criacao inline deve permanecer em `snake_case` e ficar fechado em exatamente um campo obrigatorio nesta entrega: `name`.
- O request principal de `POST /api/v1/finance/entries` deve evoluir de `counterparty_name` para `counterparty_id` como entrada obrigatoria do browser/BFF, mantendo `entry_type`, `amount`, `financial_category_id` e `cost_center_name`.
- Para qualquer novo `POST /api/v1/finance/entries` criado apos esta story, `counterparty_id` passa a ser obrigatorio. Payload sem `counterparty_id` deve ser rejeitado, mesmo que envie `counterparty_name`.
- A resposta de sucesso do lancamento deve continuar em `snake_case` e passar a expor, no minimo, `id`, `entry_type`, `amount`, `financial_category_id`, `counterparty_id`, `counterparty_name`, `cost_center_name`, `created_at` e `message`.
- `counterparty_name` no `financial_entry` deve ser preenchido pelo backend a partir da contraparte selecionada/criada, nao confiado ao payload do browser, e preservado como snapshot historico.
- O model de contraparte deve ser tenant-scoped com `church_id`. A deduplicacao deve acontecer por tenant usando comparacao normalizada de `name`: `trim` nas extremidades, colapso de espacos internos repetidos, comparacao case-insensitive e derivacao de `slug` consistente para suporte a unicidade por tenant.
- A escrita de contraparte e a escrita do lancamento devem continuar em services coesos; se a criacao inline envolver mais de uma operacao persistente relevante, use transacao explicita via `DB::transaction()`. [Source: https://laravel.com/docs/12.x/database]
- Validacao principal deve continuar em `FormRequest`, com mensagens operacionais simples e resposta `422` JSON para requests XHR. [Source: https://laravel.com/docs/12.x/validation]
- Respostas de sucesso devem continuar usando `JsonResource`. [Source: https://laravel.com/docs/12.x/eloquent-resources]
- O BFF segue implementado com `route.ts` em `src/app/api/...`, nao em utilitario ad hoc nem com fetch direto do browser para o Laravel. [Source: https://nextjs.org/docs/app/getting-started/route-handlers, https://nextjs.org/docs/app/guides/backend-for-frontend]

### Compliance de arquitetura

- Backend:
  - manter controller fino, validacao em `FormRequest`, regra de listagem/criacao em services e resposta em `JsonResource`;
  - manter contrapartes e lancamentos no dominio `Finance`, nao em `Identity`, `People` ou `App\Models` generico;
  - preservar `church_id` como eixo de tenancy em modelo, query, validacao e autorizacao.
- Frontend:
  - `src/components/ui` continua concentrando primitives;
  - `src/components/design-system` continua aplicando tokens visuais;
  - `src/components/operational` continua hospedando o formulario e a composicao inline da tesouraria;
  - `src/features/finance` deve concentrar contratos e helpers de dominio do fluxo, sem espalhar regra pelo `page.tsx`.
- Produto:
  - a linguagem precisa continuar operacional, curta e nao corporativa;
  - a criacao inline deve parecer apoio ao fluxo principal, nao mini-cadastro burocratico;
  - a home da tesouraria continua sendo ambiente de trabalho, nao uma colagem de CRUDs separados.

### Requisitos de bibliotecas e frameworks

- A documentacao atual do Next.js continua posicionando `route.ts` dentro do `app` directory como local oficial para handlers HTTP e reforca o uso do padrao BFF. [Source: https://nextjs.org/docs/app/getting-started/route-handlers, https://nextjs.org/docs/app/guides/backend-for-frontend]
- A documentacao de forms do Next.js 16 enfatiza Server Actions como possibilidade, mas o repositorio atual padronizou `fetch` client-side contra rotas BFF locais. Esta story deve seguir o padrao do repo, nao trocar a arquitetura no meio do fluxo. [Source: https://nextjs.org/docs/app/guides/forms]
- O catalogo oficial do `shadcn/ui` continua oferecendo `Dialog` e `Drawer`; a propria documentacao de `Drawer` mostra o padrao de dialog responsivo em desktop/mobile. Use essas primitives se precisar de overlay, em vez de criar implementacao custom paralela. [Source: https://ui.shadcn.com/docs/components, https://ui.shadcn.com/docs/components/base/dialog, https://ui.shadcn.com/docs/components/base/drawer]
- A documentacao do Laravel 12 confirma `FormRequest` + validacao adicional para regras compostas, como deduplicacao ou integridade entre campos. [Source: https://laravel.com/docs/12.x/validation]
- A documentacao do Laravel 12 mantem `DB::transaction()` e `JsonResource` como caminhos idiomaticos para escrita transacional e serializacao consistente. [Source: https://laravel.com/docs/12.x/database, https://laravel.com/docs/12.x/eloquent-resources]

### Requisitos de estrutura de arquivos

- O formulario principal permanece em `church-erp-web/src/components/operational/treasury-entry-form.tsx`; a criacao inline entra como componente filho ou helper da mesma feature, nao como rota nova.
- O novo contrato BFF nasce em `church-erp-web/src/app/api/finance/counterparties/route.ts`.
- Contratos TS de contrapartes devem viver em `church-erp-web/src/features/finance/`, lado a lado com `financial-entry.ts` e `amount.ts`.
- No backend, counterparties seguem a estrutura obrigatoria do dominio `Finance`: `Models`, `Services`, `Http/Controllers/Api/V1`, `Http/Requests`, `Http/Resources`, `tests/Feature/Finance`.
- Se houver helper de normalizacao/deduplicacao de nome, mantelo proximo do dominio `Finance`; nao espalhar a regra de unicidade em controller, migration e React sem uma unica fonte clara.

### Requisitos de teste

- Backend:
  - sucesso ao listar contrapartes do tenant autenticado;
  - sucesso ao criar contraparte minima com tesoureiro autenticado;
  - `422` quando `name` estiver ausente, vazio ou duplicado no mesmo tenant;
  - `401` sem sessao valida;
  - `403` para perfil sem acesso a tesouraria;
  - isolamento por tenant nas listagens e na deduplicacao;
  - compatibilidade legacy: registros antigos sem `counterparty_id` continuam legiveis; registros novos falham sem `counterparty_id`; registros novos persistem `counterparty_id` e `counterparty_name` derivado da contraparte selecionada;
  - atualizacao de `StoreFinancialEntryTest` para exigir `counterparty_id`, persistir `counterparty_name` derivado e rejeitar `counterparty_id` de outro tenant.
- Web:
  - a rota BFF `GET/POST /api/finance/counterparties` existe e usa `callLaravel`;
  - o browser continua chamando apenas `/api/finance/*` locais;
  - a home `/treasury` continua protegida por `AreaGuard`;
  - o formulario continua ancorado em `#lancamento-rapido`;
  - a criacao inline preserva os demais campos do formulario principal em caso de erro;
  - ao cancelar ou fechar o overlay inline sem salvar, o formulario principal preserva os campos ja digitados e nenhuma contraparte parcial e persistida;
  - o payload final do lancamento usa `counterparty_id`, nao `counterparty_name` livre;
  - respostas `500` de categorias, contrapartes e lancamentos continuam sanitizadas como `Server error`.
- Comandos obrigatorios:
  - em `church-erp-api`: `php artisan test`, `./vendor/bin/pint --test`
  - em `church-erp-web`: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build:smoke`

### Licoes de stories ou reviews anteriores

- A Story 2.1 consolidou `church-erp-web/src/app/treasury/page.tsx` e `treasury-home-shell.tsx` como contrato da experiencia operacional; a 2.3 nao deve quebrar anchors, boundary de acesso nem introduzir fluxo fora da home.
- A Story 2.2 fixou a atual seam financeira real: `finance/categories`, `finance/entries`, `TreasuryEntryForm`, validacao em `FormRequest`, service transacional e resposta em `JsonResource`. A 2.3 deve estender essas mesmas costuras, nao criar atalho paralelo.
- A Story 2.2 tambem deixou explicito que `counterparty_name` era apenas MVP textual ate a 2.3. Esta story e o momento correto para introduzir entidade propria; nao trate isso como refactor opcional.
- Os reviews recentes endureceram boundary BFF, sanitizacao de `500`, preservacao de anchors e mensagens simples. Qualquer implementacao que reabra esses problemas deve ser tratada como regressao.
- A Story 1.5 criou `FinancialCategory` tenant-scoped com `BelongsToAuthenticatedChurch`; a modelagem de contraparte deve espelhar esse padrao em vez de inventar outro mecanismo de tenancy.

### Project Structure Notes

- `church-erp-web/src/components/operational/treasury-entry-form.tsx` hoje ainda renderiza `Contraparte` como `Input` textual; essa e a seam direta a evoluir nesta story.
- `church-erp-web/src/app/api/finance/categories/route.ts` e `church-erp-web/src/app/api/finance/entries/route.ts` ja mostram o padrao oficial de leitura do cookie de sessao, `callLaravel` e sanitizacao de erros; a nova rota de contrapartes deve repetir esse desenho.
- `church-erp-api/app/Http/Requests/StoreFinancialEntryRequest.php` hoje ainda considera `counterparty_name` obrigatorio. A story deve mover a autoridade para `counterparty_id` sem quebrar a mensagem operacional nem a deduplicacao de campos extras do payload.
- `church-erp-api/app/Domain/Finance/Services/ListFinancialCategoriesService.php` ja prova o padrao atual de listagem simples tenant-scoped no dominio `Finance`; a listagem de contrapartes deve seguir estrutura equivalente.
- O repositorio ainda nao possui primitive de `Dialog` ou `Drawer` em `src/components/ui`; se o overlay inline usar uma dessas primitives, esta story e o lugar correto para adiciona-la seguindo a fundacao `shadcn/ui`.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 2, Story 2.3, ACs e restricoes de frontend.
- `_bmad-output/planning-artifacts/prd.md` - FR-2 e a exigencia de criacao inline de contrapartes ausentes durante o lancamento.
- `_bmad-output/planning-artifacts/architecture.md` - Data Architecture, domain boundaries, BFF pattern, tenancy por `church_id` e lista de entidades incluindo contrapartes.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - principio de fluxo financeiro curto, desktop-first e feedback operacional claro.
- `_bmad-output/project-context.md` - stack atual, regras de `snake_case`, BFF boundary, tenancy, layering de componentes e comandos obrigatorios de validacao.
- `_bmad-output/implementation-artifacts/2-1-exibir-home-operacional-do-tesoureiro.md` - ancora `#lancamento-rapido`, home shell e contratos da tesouraria.
- `_bmad-output/implementation-artifacts/2-2-registrar-receita-ou-despesa-com-campos-minimos.md` - contrato atual de lancamento, limites deliberados da contraparte textual e learnings reais da implementacao anterior.
- `church-erp-api/app/Domain/Finance/Models/FinancialCategory.php` - exemplo atual de model tenant-scoped no dominio `Finance`.
- `church-erp-api/app/Domain/Finance/Models/FinancialEntry.php` - estado atual do entry model ainda sem relacao de contraparte.
- `church-erp-api/app/Domain/Finance/Services/CreateFinancialEntryService.php` - escrita transacional atual do lancamento.
- `church-erp-api/app/Http/Requests/StoreFinancialEntryRequest.php` - contrato atual que ainda trata `counterparty_name` como input obrigatorio.
- `church-erp-api/app/Http/Controllers/Api/V1/StoreFinancialEntryController.php` - gate da area `treasury` e controller fino atual.
- `church-erp-api/tests/Feature/Finance/StoreFinancialEntryTest.php` - cobertura existente do contrato 2.2 que a 2.3 precisa evoluir, nao descartar.
- `church-erp-web/src/components/operational/treasury-entry-form.tsx` - formulario operacional real a ser estendido.
- `church-erp-web/src/app/api/finance/categories/route.ts` - padrao BFF atual para listagem autenticada tenant-scoped.
- `church-erp-web/src/app/api/finance/entries/route.ts` - padrao BFF atual para mutacao autenticada.
- `church-erp-web/src/features/finance/financial-entry.ts` - contrato TS atual do fluxo financeiro.
- `church-erp-web/src/features/finance/amount.ts` - normalizacao monetaria ja validada na 2.2.
- `church-erp-web/tests/bff-smoke.test.mjs` - protecoes atuais de boundary, anchors e sanitizacao no web app.
- `https://nextjs.org/docs/app/getting-started/route-handlers` - `route.ts` no App Router como handler HTTP oficial.
- `https://nextjs.org/docs/app/guides/backend-for-frontend` - padrao BFF oficial suportado pelo Next.js atual.
- `https://nextjs.org/docs/app/guides/forms` - forms no App Router e contexto atual de Server Actions.
- `https://ui.shadcn.com/docs/components` - catalogo atual de primitives disponiveis.
- `https://ui.shadcn.com/docs/components/base/dialog` - primitive oficial de dialog.
- `https://ui.shadcn.com/docs/components/base/drawer` - drawer oficial e exemplo de dialog responsivo.
- `https://laravel.com/docs/12.x/validation` - `FormRequest`, `422` JSON e validacao adicional.
- `https://laravel.com/docs/12.x/database` - `DB::transaction()` para escrita transacional.
- `https://laravel.com/docs/12.x/eloquent-resources` - `JsonResource` para respostas de sucesso.

### Checklist pre-review

- O fluxo continua dentro de `church-erp-web/src/app/treasury/page.tsx` e `#lancamento-rapido`.
- `AreaGuard` foi preservado e nao duplicado.
- Existe BFF `GET/POST /api/finance/counterparties` em `src/app/api/finance/counterparties/route.ts`.
- O browser nao chama o Laravel autenticado diretamente.
- A criacao inline usa primitive oficial de overlay (`Dialog` ou `Drawer`) em vez de implementacao ad hoc.
- O formulario principal preserva `tipo`, `valor`, `subtipo` e `centro de custo` quando a criacao inline falha ou e cancelada.
- A listagem e a criacao de contraparte sao tenant-scoped e autorizadas para `treasury`.
- O payload tecnico do lancamento usa `counterparty_id`, e o backend deriva/persiste `counterparty_name` como snapshot.
- Registros antigos de `financial_entries` continuam legiveis sem exigir migracao destrutiva.
- Respostas `500` continuam sanitizadas como `Server error`.
- `php artisan test`, `./vendor/bin/pint --test`, `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke` passaram.

### Git intelligence

- O commit `4b62927` (`implement 2.2`) concentrou toda a seam financeira real em `Finance` + BFF + `TreasuryEntryForm` + testes. A 2.3 deve estender exatamente esse eixo, nao abrir outro.
- O merge `edba76a` consolidou a 2.2 sem refactor amplo; o padrao recente e entrega incremental por story, com write-scope focado e protecao forte de testes.
- Os commits `731bfc3` e `f897cd2` da Story 2.1 reforcam que a home da tesouraria e os anchors internos sao contrato de navegacao, nao detalhe de implementacao descartavel.
- O commit `77cf776` da Story 1.5 mostra o padrao atual para entidades financeiras tenant-scoped (`FinancialCategory`) e para seed/default/list endpoints; a modelagem de contraparte deve seguir essa mesma disciplina.

### Latest tech information

- A documentacao do Next.js App Router continua tratando `route.ts` dentro de `app` como o mecanismo oficial para handlers HTTP e BFF locais. [Source: https://nextjs.org/docs/app/getting-started/route-handlers]
- O guia oficial de BFF do Next.js continua suportando explicitamente o uso do framework como camada intermediaria entre browser e backend, alinhado ao desenho atual do repo. [Source: https://nextjs.org/docs/app/guides/backend-for-frontend]
- A documentacao atual de forms do Next.js 16 enfatiza Server Actions, mas isso nao invalida o padrao local de `fetch` client-side + BFF `route.ts`; nesta codebase, manter o padrao existente reduz risco de divergencia arquitetural. [Source: https://nextjs.org/docs/app/guides/forms]
- O `shadcn/ui` atual continua oferecendo `Dialog` e `Drawer`, incluindo exemplo oficial de uso responsivo entre desktop e mobile. [Source: https://ui.shadcn.com/docs/components/base/dialog, https://ui.shadcn.com/docs/components/base/drawer]
- A documentacao do Laravel 12 continua confirmando `FormRequest` com resposta `422` JSON para XHR, `DB::transaction()` para fluxos de escrita e `JsonResource` para serializacao consistente. [Source: https://laravel.com/docs/12.x/validation, https://laravel.com/docs/12.x/database, https://laravel.com/docs/12.x/eloquent-resources]

### Project context reference

- Esta story deve ser implementada em conformidade com `_bmad-output/project-context.md`, especialmente nas regras de:
  - browser consumir apenas o `church-erp-web`
  - contratos HTTP em `snake_case`
  - controllers finos e services coesos no Laravel
  - `church_id` como eixo obrigatorio de tenancy
  - separacao entre `src/components/ui`, `src/components/design-system` e `src/components/operational`
  - proibicao de mover autorizacao, tenancy ou validacao sensivel para React

### Story completion status

- Status da story neste momento: `done`
- Nota de conclusao: a implementacao foi entregue, revisada e endurecida apos code review adversarial, incluindo bloqueio de leaks de autorizacao antes da validacao, primitive oficial de dialog baseada em Radix/shadcn e estabilizacao do estado inline de sucesso/cancelamento.
- Proximo passo esperado: seguir para a proxima story do epic com esta seam de contraparte inline consolidada e protegida por testes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Introduzir o catalogo `financial_counterparties` tenant-scoped no backend `Finance`, com listagem e criacao minima autenticadas.
- Evoluir o contrato de `finance/entries` para usar `counterparty_id` como entrada do browser e `counterparty_name` como snapshot derivado/persistido pelo backend.
- Estender `TreasuryEntryForm` com lista real de contrapartes e criacao inline por overlay oficial, preservando estados do formulario principal.
- Fechar a story com testes de tenancy, duplicidade, boundary BFF, sanitizacao e preservacao de estado no web app.

### Debug Log References

- Story descoberta automaticamente a partir do backlog `2-3-criar-contraparte-inline-durante-o-lancamento` em `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- A analise usou `epics.md`, `prd.md`, `architecture.md`, `ux-design-specification.md`, `_bmad-output/project-context.md`, a story 2.2, a implementacao atual de financas e os ultimos commits do repositorio.
- Foi identificado que o estado atual do repositorio ainda nao possui entidade de contraparte financeira, rota BFF de contrapartes nem primitive de dialog/drawer em `src/components/ui`.
- Foi identificado que `TreasuryEntryForm` ainda usa `counterparty_name` como `Input` textual e que `StoreFinancialEntryRequest` ainda trata esse campo como obrigatorio no payload.
- Foi identificado que a Story 2.2 ja consolidou amount normalization, listagem de categorias tenant-scoped, rotas BFF e gate `treasury`, entao a 2.3 deve evoluir esse mesmo caminho.
- Cobertura vermelha executada primeiro com `php artisan test tests/Feature/Finance/FinancialCounterpartyApiTest.php tests/Feature/Finance/StoreFinancialEntryTest.php` e `npm test`, falhando inicialmente por ausencia do catalogo de contrapartes, rota BFF nova e contrato antigo de `counterparty_name`.
- Validacoes finais executadas com `./vendor/bin/pint --test`, `php artisan test`, `npm test`, `npm run lint`, `npm run typecheck` e `npm run build:smoke`, todas verdes no estado final da implementacao.
- No code review, foram corrigidos leaks de autorizacao nos `FormRequest`, o `dialog.tsx` deixou de ser um overlay manual e o fluxo inline passou a distinguir corretamente sucesso, cancelamento e expiracao de sessao.

### Completion Notes List

- A story fixa explicitamente a evolucao do contrato: `counterparty_id` vira a entrada obrigatoria do browser para novos lancamentos, enquanto `counterparty_name` permanece snapshot historico persistido no backend.
- A story define a contraparte como entidade tenant-scoped do dominio `Finance`, evitando misturar o problema com pessoas, categorias ou um CRUD administrativo paralelo.
- A story amarra a criacao inline ao `TreasuryEntryForm` existente, preservando a ancora `#lancamento-rapido`, o padrao BFF e a home operacional da tesouraria.
- A story promove deduplicacao por tenant e protecao de estado do formulario principal como riscos obrigatorios de implementacao, nao como melhoria opcional de review.
- A story deixa claro que esta entrega nao deve antecipar auditoria de edicao, pendencias financeiras, fechamento ou qualquer refactor amplo fora da seam de contraparte inline.
- O backend agora persiste `financial_counterparties`, deriva `counterparty_name` a partir de `counterparty_id` no service de lancamento e mantem `counterparty_id` nullable para compatibilidade com registros legados.
- O web app agora lista contrapartes tenant-scoped via BFF, abre cadastro inline no mesmo formulario, seleciona automaticamente a contraparte criada e preserva os demais campos quando o overlay falha ou e cancelado.
- A cobertura passou a proteger tenancy, duplicidade normalizada, boundary BFF, contrato `counterparty_id`, sanitizacao de `500` e permanencia do fluxo na home da tesouraria.
- O hardening final do review garante que utilizadores sem acesso a `treasury` recebem `403` antes de qualquer detalhe de validacao e que o dialog inline promove `401/403` para o estado principal `denied_or_session_invalid` sem mascarar isso como erro generico.

### File List

- _bmad-output/implementation-artifacts/2-3-criar-contraparte-inline-durante-o-lancamento.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- church-erp-api/routes/api.php
- church-erp-api/app/Domain/Finance/Models/FinancialCounterparty.php
- church-erp-api/app/Domain/Finance/Models/FinancialEntry.php
- church-erp-api/app/Domain/Finance/Services/ListFinancialCounterpartiesService.php
- church-erp-api/app/Domain/Finance/Services/CreateFinancialCounterpartyService.php
- church-erp-api/app/Domain/Finance/Support/FinancialCounterpartyNameNormalizer.php
- church-erp-api/app/Domain/Finance/Services/CreateFinancialEntryService.php
- church-erp-api/app/Http/Controllers/Api/V1/ListFinancialCounterpartiesController.php
- church-erp-api/app/Http/Controllers/Api/V1/StoreFinancialCounterpartyController.php
- church-erp-api/app/Http/Controllers/Api/V1/StoreFinancialEntryController.php
- church-erp-api/app/Http/Requests/StoreFinancialCounterpartyRequest.php
- church-erp-api/app/Http/Requests/StoreFinancialEntryRequest.php
- church-erp-api/app/Http/Resources/FinancialCounterpartyListResource.php
- church-erp-api/app/Http/Resources/FinancialCounterpartyResource.php
- church-erp-api/app/Http/Resources/FinancialEntryResource.php
- church-erp-api/database/migrations/2026_05_11_000001_create_financial_counterparties_table.php
- church-erp-api/database/migrations/2026_05_11_000002_add_counterparty_id_to_financial_entries_table.php
- church-erp-api/tests/Feature/Finance/FinancialCounterpartyApiTest.php
- church-erp-api/tests/Feature/Finance/StoreFinancialEntryTest.php
- church-erp-web/src/app/api/finance/counterparties/route.ts
- church-erp-web/src/app/api/finance/entries/route.ts
- church-erp-web/src/components/operational/treasury-entry-form.tsx
- church-erp-web/src/components/operational/counterparty-inline-dialog.tsx
- church-erp-web/src/components/ui/dialog.tsx
- church-erp-web/src/features/finance/counterparty.ts
- church-erp-web/src/features/finance/counterparty-inline-state.ts
- church-erp-web/src/features/finance/financial-entry.ts
- church-erp-web/package.json
- church-erp-web/package-lock.json
- church-erp-web/tests/bff-smoke.test.mjs
- church-erp-web/tests/counterparty-inline-state.test.mjs

### Change Log

- 2026-05-11: implementado catalogo tenant-scoped de contrapartes financeiras, evolucao do contrato de `finance/entries` para `counterparty_id`, BFF de contrapartes, dialog inline no `TreasuryEntryForm` e ampliacao da cobertura backend/web com validacoes finais verdes.
- 2026-05-12: code review adversarial corrigiu leaks de autorizacao pre-validacao, substituiu o dialog manual por primitive Radix compatível com `shadcn/ui`, estabilizou o estado de sucesso/cancelamento do fluxo inline e ampliou a cobertura de testes backend/web para o boundary e para a maquina de estados do formulario.

## Senior Developer Review (AI)

### Outcome

- Review result: `approve`
- Status after review: `done`
- High/medium findings resolvidos: `5`

### Review Notes

- `StoreFinancialCounterpartyRequest` e `StoreFinancialEntryRequest` passaram a autorizar antes da validacao, devolvendo `401`/`403` coerentes e sem vazar detalhes de duplicidade ou tenancy para perfis fora da tesouraria.
- `church-erp-web/src/components/ui/dialog.tsx` foi refeito sobre `@radix-ui/react-dialog`, alinhando o overlay inline com a fundacao oficial esperada pelo padrao `shadcn/ui`.
- `TreasuryEntryForm` agora usa uma pequena maquina de estados explicita para fechar o dialog inline com motivo (`created`, `access_failure`, `cancelled`), evitando que um sucesso seja sobrescrito como cancelamento.
- O dialog inline deixou de tratar `401/403` como `server_error` local e promove essas falhas para o estado principal `denied_or_session_invalid`, preservando o formulario e a semantica correta do fluxo.
- A cobertura foi ampliada com testes de leak de autorizacao no Laravel, runtime tests para as rotas BFF de contrapartes e testes puros da logica de estado inline no web app.

### Verification

- `php artisan test`
- `./vendor/bin/pint --test`
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build:smoke`
