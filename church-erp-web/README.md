# Church ERP Web

Frontend Next.js desacoplado, preparado para atuar como BFF do projeto.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- ESLint
- Estrutura `src/`

## Responsabilidades

- Receber autenticacao do browser.
- Manter sessao e protecao server-side.
- Encaminhar chamadas autenticadas ao `church-erp-api`.
- Nao mover regra de negocio sensivel para o React.

## Guardrails

- O browser fala apenas com o `church-erp-web`.
- O BFF usa JWT interno de curta duracao ao chamar o `church-erp-api`.
- Validacao principal, autorizacao e escopo por tenant continuam no Laravel.
- Contratos HTTP usam `snake_case`.

## Estrutura base

- `src/app/(auth)` para fluxos de autenticacao.
- `src/app/treasury`, `src/app/secretaria`, `src/app/leadership`, `src/app/communications` para as areas operacionais.
- `src/lib/api` para chamadas server-side ao Laravel.
- `src/lib/env` para leitura segura de variaveis do BFF.
- `src/middleware.ts` como ponto de entrada para guardas server-side futuras.

## Desenvolvimento

1. Copie `.env.example` para `.env.local`.
2. Ajuste `API_BASE_URL` para o backend local.
3. Execute `npm install`.
4. Execute `npm run dev`.
5. Rode `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build`.

## Onboarding inicial

- Pagina: `GET /onboarding`
- BFF route handler: `POST /api/onboarding/initial-setup`
- Backend chamado pelo BFF: `POST /api/v1/onboarding/initial-setup`

O browser envia o formulario apenas ao `church-erp-web`; o route handler encaminha o payload `snake_case` ao Laravel usando `src/lib/api/client.ts`.
