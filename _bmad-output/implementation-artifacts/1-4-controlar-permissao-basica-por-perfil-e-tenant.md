# Story 1.4: Controlar permissao basica por perfil e tenant

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a lider de implantacao do produto,
I want que tesoureiro, secretaria e lideranca tenham acessos coerentes com seu papel,
so that dados financeiros e pessoais fiquem protegidos desde o MVP.

## Acceptance Criteria

1. Dado que um usuario autenticado possui perfil permitido para uma area do MVP e o contexto ativo da igreja esta valido, quando acessa a area correspondente, entao o sistema libera o acesso normalmente e preserva o escopo por `church_id`.
2. Dado que um usuario autenticado tenta acessar uma area fora do seu perfil ou fora do tenant ativo, quando a requisicao e feita, entao o sistema bloqueia o acesso, retorna `403` no backend e apresenta uma mensagem clara e compreensivel no frontend.
3. Dado que o contexto da igreja nao corresponde ao tenant ativo da sessao ou a membership deixa de ser valida, quando o acesso e reavaliado, entao o sistema nega a entrada sem expor detalhes tecnicos e sem depender de verificacao apenas visual.

## Tasks / Subtasks

- [ ] Definir a matriz minima de acesso por perfil e area no Laravel, usando `church_user.role` e `church_id` como fonte de verdade (AC: 1, 2, 3)
  - [ ] Registrar gates/policies leves para as areas do MVP, sem criar um subsistema separado de permissoes.
  - [ ] Garantir que qualquer decisao de autorizacao revalide o tenant ativo antes de liberar a area.
  - [ ] Manter controllers finos e delegar a decisao para `authorize()`, `Gate::authorize()` ou policies.

- [ ] Proteger os entrypoints HTTP e os fluxos autenticados do BFF com a mesma regra de acesso (AC: 1, 2, 3)
  - [ ] Aplicar a autorizacao no backend Laravel, onde a decisao final sempre reside.
  - [ ] Manter mensagens de negacao funcionais e curtas, sem detalhes de implementacao.
  - [ ] Preservar o contrato `snake_case` e os responses idiomaticos do Laravel.

- [ ] Adaptar a experiencia Next.js por perfil sem transformar UI em fonte de verdade da autorizacao (AC: 1, 2)
  - [ ] Usar `roles` e `role` do contexto autenticado para esconder ou desabilitar areas nao permitidas no shell.
  - [ ] Exibir um estado claro de acesso negado quando o usuario entrar diretamente em uma rota bloqueada.
  - [ ] Manter `src/proxy.ts` e os route handlers apenas como suporte de navegacao e boundary do BFF.

- [ ] Cobrir o comportamento com testes de backend e smoke tests do BFF (AC: 1, 2, 3)
  - [ ] Adicionar Feature tests no Laravel para acesso permitido, acesso negado e tenant invalido.
  - [ ] Cobrir o retorno `403` e a mensagem funcional em linguagem simples.
  - [ ] Atualizar smoke tests web para refletir a navegacao por perfil e a boundary BFF.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story fecha o baseline de acesso seguro do Epic 1.
- O objetivo nao e criar um motor generico de permissoes.
- O objetivo e garantir que o MVP use regras simples e coerentes por perfil e tenant, com o backend validando tudo e o frontend apenas refletindo o contexto autenticado.
- Perfis iniciais do MVP, conforme arquitetura: `treasurer`, `secretary` e `leadership`.
- Areas do app ja expostas no shell atual: `treasury`, `secretaria`, `leadership` e `communications`.
- Nesta story, somente as areas permitidas por perfil devem ficar acessiveis; areas nao autorizadas permanecem bloqueadas ate historias futuras.

### Requisitos tecnicos obrigatorios

- Nao criar tabela nova de permissoes nem um subsistema separado de RBAC.
- Usar a relacao existente `church_user` com `church_id`, `user_id`, `role`, `status` e timestamps.
- Usar `church_id` como eixo obrigatorio de isolamento em qualquer decisao de acesso.
- Nunca confiar apenas no `role` exposto ao frontend para decidir autorizacao real.
- O backend Laravel continua sendo a fonte de verdade para autorizacao, validacao e escopo.
- As mensagens de acesso negado devem ser funcionais, curtas e nao tecnicas.
- Qualquer alteracao de perfil ou contexto que invalide autorizacao deve implicar revalidacao da sessao/contexto interno.

### Compliance de arquitetura

- Backend:
  - usar `app/Policies` e/ou `Gate` para checks simples e transversais;
  - manter controllers em `app/Http/Controllers/Api/V1` finos;
  - preservar o padrao de responses em `JsonResource` ou JSON bem definido;
  - respeitar `church_id` em consultas, policies e services.
- Frontend:
  - continuar com Next.js App Router como BFF e UI layer;
  - manter `src/proxy.ts` como guard server-side do Next.js 16;
  - usar `src/features/auth` para contexto autenticado e helpers de navegacao;
  - usar `src/components/ui` apenas para primitives, sem colocar regra de negocio ali;
  - usar `src/components/design-system` e `src/components/operational` para composicoes reais do produto.
- UX:
  - nao criar dashboard generico;
  - adaptar navegacao e visibilidade por perfil;
  - manter mensagens operacionais, claras e curtas.

### Requisitos atuais de bibliotecas e framework

- Laravel 12 continua sendo o backend alvo.
- A autorizacao do Laravel deve seguir o padrao oficial de `Gates` e `Policies`; use `authorize()`/`Gate::authorize()` para obter `403` padrao quando a decisao negar acesso. [Source: https://laravel.com/docs/12.x/authorization]
- Next.js 16 continua usando `proxy.ts` como substituto de `middleware`; ele e adequado para redirecionamentos e checks otimistas, mas nao deve virar solucao completa de sessao ou autorizacao. [Source: https://nextjs.org/docs/app/getting-started/proxy]
- Route handlers do App Router seguem em `src/app/api` e continuam sendo o boundary do BFF para o browser.

### Estrutura de arquivos obrigatoria

- Backend provavel desta story:
  - `church-erp-api/app/Providers/AppServiceProvider.php`
  - `church-erp-api/app/Policies/`
  - `church-erp-api/app/Http/Controllers/Api/V1/`
  - `church-erp-api/app/Domain/Identity/Services/`
  - `church-erp-api/routes/api.php`
  - `church-erp-api/tests/Feature/Identity/`
- Frontend provavel desta story:
  - `church-erp-web/src/proxy.ts`
  - `church-erp-web/src/features/auth/session-types.ts`
  - `church-erp-web/src/features/auth/navigation.ts`
  - `church-erp-web/src/features/auth/session.ts`
  - `church-erp-web/src/app/page.tsx`
  - `church-erp-web/src/app/treasury/page.tsx`
  - `church-erp-web/src/app/secretaria/page.tsx`
  - `church-erp-web/src/app/leadership/page.tsx`
  - `church-erp-web/src/app/communications/page.tsx`
  - `church-erp-web/src/components/operational/`
  - `church-erp-web/src/components/design-system/`

### Requisitos de teste

- Testes de backend devem cobrir:
  - acesso permitido para o perfil correto;
  - acesso negado para o perfil incorreto;
  - bloqueio quando o tenant ativo nao bate com o contexto esperado;
  - resposta `403` com mensagem simples.
- Use `RefreshDatabase` nos testes que tocarem persistencia.
- Asserte tanto a forma da resposta HTTP quanto o comportamento de negocio.
- Os smoke tests web devem focar boundary e contrato:
  - navegacao por perfil;
  - uso de `roles`/`role` na adaptacao da UI;
  - preservacao do boundary BFF;
  - ausencia de dependencia em chamadas autenticadas diretas ao Laravel pelo browser.

### Learning from Story 1.3

- A Story 1.3 ja entregou login via BFF, cookie `HttpOnly`, JWT interno curto e `/auth/me` com `roles`, `role` e `permissions_version`.
- Esta story deve reaproveitar esse contexto autenticado, nao recriar autenticacao.
- O frontend ja conhece o contrato de sessao e ja possui a base de `proxy.ts`; agora precisa usar o contexto para adaptar navegacao e bloqueio por area.
- O backend ja tem o modelo de membership por `church_user`; a autorizacao desta story deve partir dessa estrutura, nao de um model novo de permissao.

### Projeto e UX relevantes para esta story

- A experiencia deve ser coerente com o produto operacional e nao com um sistema corporativo de permissoes.
- Bloqueio deve ser claro, curto e orientado a proximo passo.
- Areas nao permitidas devem desaparecer da navegacao quando possivel, mas a decisao final continua no backend.
- O shell atual do produto ja usa cards e areas operacionais; a story deve evoluir esse shell para refletir o perfil autenticado.

### Project Structure Notes

- O workspace ja tem a fundacao do BFF, o contexto autenticado e os shells iniciais de area.
- Esta story deve expandir o baseline existente, nao substitui-lo por outra arquitetura.
- `church_id` continua sendo o eixo de isolamento obrigatorio.
- `roles` no token/contexto sao contexto operacional rapido, nao autoridade final.
- Componentes genericos de UI nao devem receber regras de autorizacao.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 1, Story 1.4, Acceptance Criteria e sequencia da epic.
- `_bmad-output/planning-artifacts/architecture.md` - Authentication Operational Design, Authorization Strategy by Role in Laravel, Frontend responsibility, Next.js BFF/proxy.
- `_bmad-output/planning-artifacts/prd.md` - sections 8.1, 8.4, 11 FR-1, 11 FR-6 e 12 NFR-5/NFR-8.
- `_bmad-output/project-context.md` - regras duraveis sobre `church_id`, policies, frontend BFF, `snake_case`, `proxy` e responsabilidades de autorizacao.
- `_bmad-output/implementation-artifacts/1-3-autenticar-usuario-via-bff-e-aplicar-contexto-da-igreja.md` - learnings da story anterior, especialmente `roles`, `role`, `permissions_version` e `src/proxy.ts`.
- `church-erp-api/README.md` - tenancy, contrato HTTP e backend como fonte de verdade.
- `church-erp-api/app/Policies/README.md` - filosofia de autorizacao por papel e tenant.
- `church-erp-web/README.md` - responsabilidades do BFF e estrutura de rotas.
- `church-erp-web/src/features/auth/session-types.ts` - contrato atual de sessao com `roles` e `role`.
- `church-erp-web/src/proxy.ts` - guard server-side atual que esta pronto para receber checks de perfil.
- `church-erp-web/src/app/page.tsx` - shell inicial de areas operacionais.
- `church-erp-api/tests/Feature/Identity/AuthSessionTest.php` - padrao atual de testes de sessao, token interno e mensagens simples.
- `https://laravel.com/docs/12.x/authorization` - referencia oficial para Gates, Policies e `authorize()`.
- `https://nextjs.org/docs/app/getting-started/proxy` - referencia oficial para `proxy.ts` no Next.js 16.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story gerada a partir do primeiro backlog disponivel na Epic 1 em `sprint-status.yaml`.
- Escopo deliberadamente mantido simples: permissao basica por perfil e tenant, sem inventar um subsistema separado de permissoes.
- Contexto de sessao existente em Story 1.3 foi tratado como insumo obrigatorio para adaptacao do frontend.

### Completion Notes List

- Story criada automaticamente como a proxima story da Epic 1.
- A autorizacao real deve permanecer no Laravel; o frontend apenas adapta navegacao e feedback.
- O contexto de sessao ja exposto em `/auth/me` deve ser reaproveitado para a navegacao por perfil.
- Areas nao autorizadas continuam bloqueadas ate historias futuras definirem acesso explicito.

### File List

- Nenhum arquivo de implementacao alterado ainda. Esta story esta pronta para dev.
