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
2. Ajuste `API_BASE_URL=http://localhost:8000`.
3. Mantenha `INTERNAL_API_AUDIENCE=church-erp-api` e `INTERNAL_API_ISSUER=church-erp-web`, salvo se o backend local usar valores diferentes.
4. Preencha `INTERNAL_JWT_PRIVATE_KEY` com uma chave privada RSA valida compativel com `INTERNAL_JWT_PUBLIC_KEY` configurada no `church-erp-api`.
5. Execute `npm install`.
6. Execute `npm run dev`.
7. Rode `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build`.

## Configuracao local do JWT interno

- O BFF usa `INTERNAL_JWT_PRIVATE_KEY` para assinar o cookie `church-erp-bff-session`.
- A chave pode ser salva como PEM multiline no `.env.local` ou como string unica com `\n` escapado.
- O Laravel precisa validar a chave publica correspondente em `church-erp-api/config/services.php` via `INTERNAL_JWT_PUBLIC_KEY`.
- Para gerar um par local de testes com OpenSSL:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out internal-jwt-private.pem
openssl rsa -pubout -in internal-jwt-private.pem -out internal-jwt-public.pem
```

- Copie o conteudo de `internal-jwt-private.pem` para `INTERNAL_JWT_PRIVATE_KEY` no `church-erp-web/.env.local`.
- Copie o conteudo de `internal-jwt-public.pem` para `INTERNAL_JWT_PUBLIC_KEY` no ambiente do `church-erp-api`.
- Para usar a chave em uma linha no `.env.local`, substitua as quebras por `\n`.
- Validacao local esperada: login invalido continua retornando `422`; login valido deve retornar `200` em `/api/auth/login` e `GET /api/auth/me` deve funcionar na sequencia usando o cookie emitido pelo BFF.

## Onboarding inicial

- Pagina: `GET /onboarding`
- BFF route handler: `POST /api/onboarding/initial-setup`
- Backend chamado pelo BFF: `POST /api/v1/onboarding/initial-setup`

O browser envia o formulario apenas ao `church-erp-web`; o route handler encaminha o payload `snake_case` ao Laravel usando `src/lib/api/client.ts`.
