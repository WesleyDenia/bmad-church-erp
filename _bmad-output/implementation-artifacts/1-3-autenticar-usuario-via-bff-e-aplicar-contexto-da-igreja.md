# Story 1.3: Autenticar usuario via BFF e aplicar contexto da igreja

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a usuario autenticado,
I want entrar no sistema com meu contexto de igreja aplicado automaticamente,
so that eu veja apenas os dados da minha organizacao.

## Acceptance Criteria  

1. Dado que o usuario possui credenciais validas, quando realiza login pelo `church-erp-web`, entao o browser estabelece sessao com cookie `HttpOnly`, o contexto ativo da igreja e resolvido corretamente, e as chamadas autenticadas do BFF para o `church-erp-api` usam JWT interno sem expor o token ao JavaScript do browser.
2. Dado que as credenciais sao invalidas, quando o usuario tenta autenticar, entao o sistema nega o acesso, nao expoe detalhes sensiveis e informa a falha em linguagem simples.
3. Dado que o usuario autenticado nao possui contexto valido de igreja ativa, quando o login ou a resolucao da sessao ocorre, entao o sistema bloqueia o acesso, limpa qualquer estado incoerente e explica de forma clara que nao foi possivel aplicar a igreja correta.

## Tasks / Subtasks

- [x] Implementar o fluxo de autenticacao no backend Laravel com foco em sessao BFF e contexto de tenant (AC: 1, 2, 3)
  - [x] Criar o entrypoint HTTP versionado para login em `app/Http/Controllers/Api/V1`.
  - [x] Delegar a orquestracao para um service de dominio em `app/Domain/Identity/Services`.
  - [x] Validar credenciais, resolver a `church_id` ativa e montar o contexto de sessao sem devolver segredos ao cliente.
  - [x] Garantir que falhas de autenticacao e ausencia de contexto de igreja retornem mensagens simples e previsiveis.
  - [x] Manter o contrato HTTP em `snake_case` e usar `JsonResource` ou resposta JSON explicita conforme o caso.

- [x] Implementar o BFF de autenticacao no Next.js para login, estado de sessao e saida segura (AC: 1, 2, 3)
  - [x] Criar route handlers em `church-erp-web/src/app/api/auth/` para login, `/me` e logout.
  - [x] Reutilizar `church-erp-web/src/lib/api/client.ts` para falar com o Laravel sem expor a API diretamente ao browser.
  - [x] Persistir apenas cookie de sessao `HttpOnly` no browser e manter o JWT interno fora do JavaScript do cliente.
  - [x] Conectar a pagina `church-erp-web/src/app/(auth)/login/page.tsx` ao novo fluxo BFF.
  - [x] Preparar a resolucao de contexto da igreja para consumo por `church-erp-web/src/hooks/use-session-context.ts` e pelas rotas protegidas.

- [x] Ajustar o guard de rotas e a experiencia de estado autenticado do frontend (AC: 1, 2, 3)
  - [x] Atualizar `church-erp-web/src/proxy.ts` para refletir a protecao real das areas autenticadas, sem retornar ao padrao `middleware`.
  - [x] Garantir redirecionamento coerente entre login, area autenticada e logout.
  - [x] Manter os estados visuais de carregamento, erro e autenticacao usando os primitives existentes em `src/components/ui`.

- [x] Cobrir o fluxo com testes de backend e smoke tests do BFF (AC: 1, 2, 3)
  - [x] Adicionar Feature tests no Laravel para login bem-sucedido, credenciais invalidas e ausencia de contexto valido de igreja.
  - [x] Cobrir a resposta de `/me` e o encerramento de sessao, se implementados nesta story.
  - [x] Atualizar os smoke tests web para confirmar que o browser continua falando com o BFF e que nao ha acesso direto ao Laravel pelo cliente.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta e a proxima etapa requerida apos a Story 1.2 ser aprovada. A igreja e a conta administradora inicial ja existem; agora o sistema precisa permitir entrada segura com contexto correto de tenant.
- O objetivo nao e criar um sistema de permissao completo ainda. A matriz operacional de perfis e controle basico por papel fica para a Story 1.4.
- O fluxo deve ser BFF-first: o browser fala com `church-erp-web`, e o `church-erp-web` conversa com o `church-erp-api` de forma autenticada e isolada.
- A experiencia precisa ser simples para o usuario final: confirmar acesso, aplicar igreja correta e negar de forma clara quando algo estiver inconsistente.

### Requisitos tecnicos obrigatorios

- Nao permitir chamada autenticada direta do browser ao Laravel.
- Nao expor JWT interno, password, session secret ou stack trace em resposta para o browser.
- Preservar o isolamento por `church_id` em todo o fluxo autenticado.
- A sessao do browser deve usar cookie `HttpOnly` e o contexto interno do BFF deve ser tratado no servidor.
- Validacao e regras de negocio sensiveis pertencem ao Laravel; o frontend pode complementar UX, mas nao substituir a regra.
- Respostas de sucesso da API devem continuar usando `JsonResource` ou contrato JSON bem definido.
- Mensagens de erro para login e contexto de tenant devem ser compreensiveis e nao tecnicas.

### Compliance de arquitetura

- Manter o backend organizado em `app/Domain/Identity` para os artefatos de autenticacao e contexto de igreja.
- Controllers em `app/Http/Controllers/Api/V1` devem permanecer finos: recebem request, chamam service e retornam resource/JSON.
- Nao criar um segundo caminho de autenticacao fora do BFF para resolver esta story.
- O frontend continua desacoplado, com route handlers em `src/app/api` e pagina de login em `src/app/(auth)/login`.
- O guard de rotas do Next.js deve usar a convencao atual do projeto (`proxy.ts`), nao o nome legado `middleware.ts`.
- Use `shadcn/ui` como base tecnica de primitives e mantenha a linguagem visual do produto sobre os tokens e temas aprovados, sem introduzir uma biblioteca paralela de componentes.

### Requisitos atuais de bibliotecas e framework

- Backend atual: Laravel 12 sobre PHP 8.3.
- Frontend atual: Next.js 16.2.3 com App Router e React 19.2.4.
- Route handlers devem continuar em `route.ts` dentro de `src/app/api`.
- O projeto ja adota `callLaravel(...)` com `cache: "no-store"` para BFF-to-Laravel.
- A transicao de `middleware` para `proxy` em Next.js 16 ja esta refletida no baseline do repositorio e deve ser preservada.
- O fluxo de autenticacao deve seguir o mesmo padrao de validacao, recursos JSON e contratos `snake_case` ja usado no onboarding.

### Estrutura de arquivos obrigatoria

- Backend provavel desta story:
  - `church-erp-api/app/Http/Controllers/Api/V1/LoginController.php`
  - `church-erp-api/app/Http/Controllers/Api/V1/CurrentSessionController.php`
  - `church-erp-api/app/Http/Controllers/Api/V1/LogoutController.php`
  - `church-erp-api/app/Domain/Identity/Services/AuthenticateUserSessionService.php`
  - `church-erp-api/app/Domain/Identity/Services/ResolveActiveChurchContextService.php`
  - `church-erp-api/app/Http/Requests/StoreLoginRequest.php`
  - `church-erp-api/app/Http/Resources/AuthenticatedSessionResource.php`
  - `church-erp-api/routes/api.php`
- Frontend provavel desta story:
  - `church-erp-web/src/app/(auth)/login/page.tsx`
  - `church-erp-web/src/app/api/auth/login/route.ts`
  - `church-erp-web/src/app/api/auth/me/route.ts`
  - `church-erp-web/src/app/api/auth/logout/route.ts`
  - `church-erp-web/src/features/auth/` para tipos e helpers de sessao
  - `church-erp-web/src/hooks/use-session-context.ts`
  - `church-erp-web/src/proxy.ts`
  - `church-erp-web/src/components/ui/` para estados basicos de formulario e feedback

### Requisitos de teste

- Cobrir sucesso de login com cookie HttpOnly e retorno de contexto de igreja.
- Cobrir credenciais invalidas com mensagem simples e sem vazamento de detalhes.
- Cobrir ausencia de contexto de igreja ativa como falha controlada.
- Cobrir o limite BFF: browser fala com `church-erp-web`, nao com Laravel diretamente.
- Manter os testes de backend como Feature tests para auth, tenancy e integracao de fluxo.
- Manter os smoke tests web leves, focados em boundary e contrato, nao em UI visual pesada.

### Learning from Story 1.2

- A Story 1.2 criou a igreja e a conta administradora inicial, mas nao encerrou o ciclo de entrada no sistema.
- O login desta story deve reaproveitar a saida de onboarding, sem recriar a configuracao inicial.
- O backend ja trata onboarding em transacao e com contrato JSON padronizado; a autenticacao deve seguir a mesma disciplina.
- O frontend ja tem o BFF scaffold, a pagina de login placeholder e o hook de sessao reservado.

### Projeto e UX relevantes para esta story

- O login deve ser curto, claro e orientado a acao.
- A mensagem de erro nao deve expor se o problema foi senha, usuario, contexto de igreja ou detalhe de infraestrutura.
- O estado autenticado deve carregar o contexto da igreja automaticamente para evitar navegacao ambigua.
- O estilo visual deve continuar coerente com a fundacao "Teal Operacional" e com os tokens semanticos do produto.

### Project Structure Notes

- O repositorio ja possui o baseline de BFF, login placeholder, proxy e hook de sessao.
- A story deve expandir esse baseline, nao substitui-lo por uma arquitetura diferente.
- O backend segue com dominio em `app/Domain`, enquanto os entrypoints HTTP ficam em `app/Http`.
- O frontend deve continuar dividido entre `src/app`, `src/app/api`, `src/features`, `src/hooks` e `src/components`.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 1, Story 1.3, acceptance criteria e sequencia da epic.
- `_bmad-output/implementation-artifacts/1-2-criar-igreja-e-conta-administradora-inicial.md` - learnings da etapa anterior e divisao de responsabilidade entre onboarding e login.
- `_bmad-output/planning-artifacts/architecture.md` - ADR de BFF com JWT interno, tenancy por `church_id`, estrutura de dominio e padroes do frontend.
- `_bmad-output/project-context.md` - regras duraveis do projeto para API Laravel, BFF Next.js, `snake_case`, testes e guardrails de autenticacao.
- `church-erp-web/src/app/(auth)/login/page.tsx` - placeholder atual da pagina de login.
- `church-erp-web/src/app/(auth)/onboarding/page.tsx` - fluxo anterior de onboarding, que termina com CTA para login.
- `church-erp-web/src/lib/api/client.ts` - helper server-side do BFF para falar com o Laravel.
- `church-erp-web/src/hooks/use-session-context.ts` - contrato reservado para contexto autenticado.
- `church-erp-web/src/proxy.ts` - local atual do guard server-side do Next.js 16.
- `church-erp-web/tests/bff-smoke.test.mjs` - smoke tests do boundary BFF atual.
- `church-erp-api/README.md` - regras basicas do backend sobre tenancy, contrato HTTP e onboarding.
- `https://nextjs.org/docs/app/getting-started/route-handlers-and-middleware` - convencao oficial de route handlers do App Router.
- `https://nextjs.org/docs/messages/middleware-to-proxy` - renomeacao de middleware para proxy no Next.js 16.
- `https://laravel.com/docs/12.x/validation` - validacao e mensagens customizadas no Laravel 12.
- `https://laravel.com/docs/12.x/database` - transacoes com `DB::transaction(...)` no Laravel 12.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

### Completion Notes List

- Story criada a partir da proxima etapa da Epic 1 apos a aprovacao da Story 1.2.
- O escopo foi mantido focado em autenticacao via BFF e resolucao de contexto de igreja, sem antecipar a matriz completa de permissao da Story 1.4.
- O baseline atual do repositorio ja possui placeholders e contratos iniciais para pagina de login, hook de sessao, proxy e BFF client, e esta story deve completalos.
- Implementado fluxo de login Laravel com resolucao de contexto ativo de igreja, mensagens simples para erro de credenciais e bloqueio controlado quando nao existe contexto valido.
- Implementado BFF Next.js com route handlers para `login`, `me` e `logout`, cookie `HttpOnly` e emissao de JWT interno assinado no servidor.
- Atualizados o guard server-side (`proxy.ts`), a pagina de login, o hook `useSessionContext` e os smoke tests web para refletir o contrato autenticado.
- Cobertura adicionada com Feature tests no Laravel para login, `/me` e logout, incluindo o caso em que o contexto da igreja deixa de ser valido.

### File List

- `church-erp-api/app/Domain/Identity/Services/ResolveAuthenticatedSessionService.php`
- `church-erp-api/app/Http/Controllers/Api/V1/LogoutController.php`
- `church-erp-api/tests/Feature/Identity/AuthSessionTest.php`
- `church-erp-web/src/app/(auth)/login/page.tsx`
- `church-erp-web/src/app/(auth)/onboarding/page.tsx`
- `church-erp-web/src/app/api/auth/login/route.ts`
- `church-erp-web/src/app/api/auth/logout/route.ts`
- `church-erp-web/src/app/api/auth/me/route.ts`
- `church-erp-web/src/app/api/onboarding/initial-setup/route.ts`
- `church-erp-web/src/features/auth/auth-response.ts`
- `church-erp-web/src/features/auth/initial-setup-response.js`
- `church-erp-web/src/features/auth/navigation.ts`
- `church-erp-web/src/features/auth/session-constants.ts`
- `church-erp-web/src/features/auth/session-types.ts`
- `church-erp-web/src/features/auth/session.ts`
- `church-erp-web/src/hooks/use-session-context.ts`
- `church-erp-web/src/proxy.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`

## Change Log

- 2026-04-27: Implemented BFF auth flow with Laravel login, active church resolution, internal JWT session cookie, protected route guard, and test coverage for login, session resolution, and logout.
- 2026-04-28: Code review fixes applied for safe next-path handling, authoritative logout revocation, and stronger session-cookie/test coverage; story moved to done.

## Senior Developer Review (AI)

- Fixed open-redirect risk by normalizing the `next` parameter before redirecting after login.
- Made logout authoritative by revoking the internal session token on the backend and blocking revoked tokens on `/auth/me`.
- Strengthened coverage around session cookie behavior and session revocation with feature and smoke tests.
