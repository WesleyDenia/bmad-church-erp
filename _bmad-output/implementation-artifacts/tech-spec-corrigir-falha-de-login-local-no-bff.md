---
title: 'Corrigir falha de login local no BFF'
slug: 'corrigir-falha-de-login-local-no-bff'
created: '2026-05-20T23:17:38+01:00'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - 'Next.js 16 App Router + React 19 + TypeScript strict'
  - 'Laravel 12 + PHP 8.3 API versionada em /api/v1'
  - 'BFF Next.js com fetch server-side via src/lib/api/client.ts'
  - 'JWT interno RS256 assinado no church-erp-web e validado no church-erp-api'
files_to_modify:
  - 'church-erp-web/src/app/api/auth/login/route.ts'
  - 'church-erp-web/src/features/auth/session.ts'
  - 'church-erp-web/src/lib/env/server.ts'
  - 'church-erp-web/.env.example'
  - 'church-erp-web/README.md'
  - 'church-erp-web/tests/bff-smoke.test.mjs'
code_patterns:
  - 'Browser -> BFF Next.js em src/app/api -> Laravel via callLaravel'
  - 'Contratos HTTP em snake_case e respostas sanitizadas por normalizeAuthResponse'
  - 'Sessao BFF emitida por cookie HttpOnly com JWT interno RS256'
  - 'Variaveis obrigatorias do BFF lidas por modulos server-only'
test_patterns:
  - 'Web usa node:test em tests/bff-smoke.test.mjs'
  - 'Smoke tests validam arquivos, env example e convencoes de fronteira BFF'
  - 'Backend usa Feature tests para auth e sessao interna'
---

# Tech-Spec: Corrigir falha de login local no BFF

**Created:** 2026-05-20T23:17:38+01:00

## Overview

### Problem Statement

O login com credenciais validas retorna `500` em `POST /api/auth/login` no `church-erp-web` em ambiente local, enquanto credenciais invalidas retornam `422` como esperado. Isso indica que a camada BFF responde, mas o caminho de sucesso do login falha antes de concluir a integracao de sessao entre Next.js e Laravel.

### Solution

Investigar o handler de login do BFF, o client HTTP compartilhado e as dependencias de ambiente usadas no fluxo autenticado para identificar por que o caminho feliz quebra. A correcao deve ser a menor mudanca segura no `church-erp-web`, preservando o contrato existente com o Laravel, e precisa incluir confirmacao reproduzivel da causa raiz no servidor web antes da mudanca definitiva.

### Scope

**In Scope:**
- Rastrear o fluxo browser -> `church-erp-web` -> `church-erp-api` no login.
- Verificar `src/app/api/auth/login/route.ts`, `src/lib/api/client.ts` e utilitarios de sessao relacionados.
- Confirmar dependencia de variaveis de ambiente, URL base `http://localhost:8000`, headers internos e tratamento de erro.
- Confirmar se a requisicao deveria atingir a rota Laravel e por que isso pode nao estar ocorrendo.
- Propor a menor correcao segura, os arquivos a alterar e a estrategia de validacao local.

**Out of Scope:**
- Refatorar amplamente o fluxo de autenticacao.
- Alterar o contrato HTTP do Laravel sem evidencia de necessidade.
- Redesenhar a arquitetura BFF ou trocar a estrategia de sessao.

## Context for Development

### Codebase Patterns

- O browser deve chamar o BFF Next.js em `src/app/api`.
- Chamadas BFF -> Laravel devem passar por `src/lib/api/client.ts`.
- O backend Laravel permanece como fonte de verdade para autenticacao e contexto da igreja.
- O contrato HTTP entre camadas usa `snake_case`.
- `src/app/api/auth/login/route.ts` repassa o payload para `POST /api/v1/auth/login`, normaliza a resposta e, apenas no caminho de sucesso, assina um JWT interno e grava cookie `HttpOnly`.
- `src/lib/api/client.ts` injeta `Accept`, `X-Internal-Audience` e `X-Internal-Issuer` em todas as chamadas BFF -> Laravel usando `serverEnv`.
- `src/features/auth/session.ts` falha com excecao se `INTERNAL_JWT_PRIVATE_KEY` estiver ausente ao assinar o JWT interno.
- A leitura da chave privada hoje acontece apenas no momento de assinar o JWT interno; isso permite que o app suba normalmente e falhe somente no login bem-sucedido.
- `src/app/api/auth/me/route.ts` e `src/app/api/auth/logout/route.ts` dependem do mesmo cookie de sessao interna emitido no login.
- A rota Laravel `POST /api/v1/auth/login` existe e aceita apenas `email` e `password`; o backend retorna `200` no sucesso e `422` em falhas de validacao/credenciais.
- O middleware Laravel `resolve.internal.session` valida apenas rotas autenticadas subsequentes como `/api/v1/auth/me`; ele nao participa do `POST /api/v1/auth/login`.
- O Laravel valida a sessao interna com chave publica configurada via `church-erp-api/config/services.php`; qualquer chave privada usada no `church-erp-web` precisa ser compativel com essa configuracao.

### Files to Reference

| File | Purpose |
| ---- | ------- |

| `_bmad-output/implementation-artifacts/1-3-autenticar-usuario-via-bff-e-aplicar-contexto-da-igreja.md` | Story original do fluxo de login BFF e sessao |
| `_bmad-output/project-context.md` | Regras arquiteturais e convencoes obrigatorias |
| `church-erp-web/src/app/api/auth/login/route.ts` | Handler BFF de login e emissao de cookie de sessao |
| `church-erp-web/src/lib/api/client.ts` | Cliente HTTP server-side para chamadas BFF -> Laravel |
| `church-erp-web/src/features/auth/session.ts` | Assinatura do JWT interno e configuracao do cookie |
| `church-erp-web/src/lib/env/server.ts` | Leitura centralizada de envs obrigatorias do BFF |
| `church-erp-web/src/app/(auth)/login/page.tsx` | Chamada do browser para `/api/auth/login` e feedback ao usuario |
| `church-erp-web/src/app/api/auth/me/route.ts` | Consumo da sessao interna apos login |
| `church-erp-web/src/app/api/auth/logout/route.ts` | Encerramento da sessao interna |
| `church-erp-web/.env.example` | Documenta envs locais esperadas para o BFF |
| `church-erp-web/README.md` | Passos locais de configuracao do frontend/BFF |
| `church-erp-web/tests/bff-smoke.test.mjs` | Smoke tests da camada web/BFF |
| `church-erp-api/routes/api.php` | Confirmacao da rota Laravel `/api/v1/auth/login` |
| `church-erp-api/app/Http/Controllers/Api/V1/LoginController.php` | Contrato do endpoint de login no backend |
| `church-erp-api/app/Domain/Identity/Services/AuthenticateUserSessionService.php` | Fluxo feliz do login no backend |
| `church-erp-api/app/Http/Middleware/ResolveInternalSession.php` | Middleware usado apenas apos o login para sessao autenticada |
| `church-erp-api/config/services.php` | Configuracao da chave publica usada para validar o JWT interno |

### Technical Decisions

- Assumir como alvo a menor correcao segura no `church-erp-web`.
- Preservar a URL esperada do Laravel API como `http://localhost:8000`.
- Tratar a diferenca entre `422` e `500` como indicio de falha no caminho feliz do BFF, nao no submit basico do formulario.
- Tratar como causa raiz provavel a ausencia ou formatacao invalida de `INTERNAL_JWT_PRIVATE_KEY` no `church-erp-web`, porque essa env e acessada somente apos o Laravel responder com sucesso.
- Exigir confirmacao reproduzivel da causa raiz no `church-erp-web`, preferencialmente por log/stack trace local apontando erro de leitura ou uso da `INTERNAL_JWT_PRIVATE_KEY`, antes de considerar o diagnostico encerrado.
- Manter o contrato com o Laravel inalterado; a requisicao deve atingir `POST http://localhost:8000/api/v1/auth/login`, e a ausencia de log no Laravel e compativel com uma falha posterior no BFF ao montar a sessao local.
- A menor correcao segura nao deve derrubar o app inteiro no bootstrap por causa de uma env usada apenas no fluxo autenticado; a falha deve ser tratada no ponto de uso do login/sessao server-side.
- O browser deve receber `500` com mensagem generica e segura em caso de falha interna de configuracao ou assinatura da sessao; o detalhamento fica restrito ao log server-side.
- `INTERNAL_JWT_PRIVATE_KEY` deve aceitar tanto PEM multiline quanto valor com `\\n` escapado em `.env.local`, com normalizacao server-side antes da assinatura.
- O log server-side deve registrar apenas evento, rota, tipo de falha e mensagem tecnica sanitizada, sem payload de credenciais, senha, cookie ou token.

## Implementation Plan

### Tasks

- [x] Task 1: Confirmar e isolar a causa raiz no ponto de uso da sessao
  - File: `church-erp-web/src/app/api/auth/login/route.ts`
  - Action: Instrumentar temporariamente ou estruturar tratamento para confirmar, no servidor web, se a falha ocorre ao ler/normalizar/usar `INTERNAL_JWT_PRIVATE_KEY` depois do `200` do Laravel.
  - Notes: Essa confirmacao deve acontecer sem logar credenciais, payload, token ou cookie. O objetivo e eliminar ambiguidade antes e durante a correcao.

- [x] Task 2: Normalizar e validar a chave privada somente na camada de sessao
  - File: `church-erp-web/src/features/auth/session.ts`
  - Action: Introduzir helper server-side para ler `INTERNAL_JWT_PRIVATE_KEY`, aceitar PEM multiline ou valor com `\\n`, normalizar o conteudo e falhar com erro controlado se a chave estiver ausente ou malformada.
  - Notes: Preservar a assinatura RS256 e o contrato atual do cookie; nao mover essa validacao para bootstrap global do app.

- [x] Task 3: Melhorar o tratamento operacional do erro no login BFF
  - File: `church-erp-web/src/app/api/auth/login/route.ts`
  - Action: Envolver a emissao do JWT/cookie em tratamento de erro controlado, registrar log server-side sem segredos e retornar `500` com mensagem segura para falhas internas de configuracao ou assinatura.
  - Notes: Nao logar payload de login, senha, cookie ou token. O log minimo deve incluir evento, rota, classe/tipo de erro e mensagem tecnica sanitizada.

- [x] Task 4: Documentar corretamente a configuracao local obrigatoria do BFF
  - File: `church-erp-web/.env.example`
  - Action: Manter `API_BASE_URL`, `INTERNAL_API_AUDIENCE`, `INTERNAL_API_ISSUER` e `INTERNAL_JWT_PRIVATE_KEY`, deixando claro que a chave precisa ser preenchida com uma PEM privada valida e indicando formato aceito.
  - Notes: Se necessario, ajustar o placeholder para incluir exemplo com `\\n` escapado ou orientacao de multiline.
  - File: `church-erp-web/README.md`
  - Action: Adicionar instrucao objetiva para criar `.env.local`, preencher `API_BASE_URL=http://localhost:8000` e configurar `INTERNAL_JWT_PRIVATE_KEY` compativel com a chave publica usada pelo Laravel.
  - Notes: Incluir como gerar ou reaproveitar par de chaves RS256 local, onde conferir a chave publica no Laravel e passos curtos de validacao local do login e de `/api/auth/me`.

- [x] Task 5: Cobrir a regressao com smoke tests da camada web
  - File: `church-erp-web/tests/bff-smoke.test.mjs`
  - Action: Adicionar assertions para exigir `INTERNAL_JWT_PRIVATE_KEY` no `.env.example` e cobrir o comportamento esperado do modulo server-side quando a chave estiver ausente ou malformada.
  - Notes: Seguir o padrao atual de `node:test`; nao introduzir outro framework. Se viavel no padrao atual, incluir cobertura do caminho de sessao emitida e consumo subsequente por `/api/auth/me`.

### Acceptance Criteria

- [ ] AC 1: Given o `church-erp-web` sem `INTERNAL_JWT_PRIVATE_KEY`, when ocorre um login com credenciais validas, then o BFF detecta a falha no servidor, registra diagnostico seguro e responde `500` sem expor segredos ao browser.
- [ ] AC 2: Given credenciais invalidas, when o browser envia `POST /api/auth/login` ao BFF, then a resposta continua `422` com mensagem/erros sanitizados sem regressao do comportamento atual.
- [ ] AC 3: Given credenciais validas e `INTERNAL_JWT_PRIVATE_KEY` configurada corretamente, when o browser envia `POST /api/auth/login`, then o BFF chama `POST http://localhost:8000/api/v1/auth/login`, retorna `200` e grava o cookie `church-erp-bff-session`.
- [ ] AC 4: Given `INTERNAL_JWT_PRIVATE_KEY` preenchida em formato multiline ou com `\\n` escapado, when o BFF assina a sessao interna, then a chave e normalizada corretamente e o login continua funcional.
- [ ] AC 5: Given uma falha interna ao assinar a sessao no BFF por chave ausente ou malformada, when o login valido ocorre, then o browser recebe erro seguro sem segredos e o servidor registra evento, rota e mensagem tecnica sanitizada suficiente para diagnostico local.
- [ ] AC 6: Given um desenvolvedor seguindo a documentacao local, when ele configura `.env.local` para o `church-erp-web`, then encontra instrucoes claras para `API_BASE_URL`, `INTERNAL_API_AUDIENCE`, `INTERNAL_API_ISSUER`, `INTERNAL_JWT_PRIVATE_KEY` e compatibilidade com a chave publica do Laravel.
- [ ] AC 7: Given login valido com sessao emitida, when o browser ou o frontend consulta `/api/auth/me` na sequencia, then o BFF reutiliza o cookie `church-erp-bff-session` e o Laravel aceita o JWT interno validado pela chave publica configurada.

## Additional Context

### Dependencies

- `church-erp-web`
- `church-erp-api`
- Variaveis de ambiente locais do BFF e do backend
- Chave RSA privada no `church-erp-web` compativel com a chave publica configurada no `church-erp-api`
- Fluxo Laravel existente em `POST /api/v1/auth/login` sem mudanca de contrato
- Configuracao Laravel da chave publica em `church-erp-api/config/services.php`

### Testing Strategy

- Adicionar ou ajustar smoke test web para exigir `INTERNAL_JWT_PRIVATE_KEY` no `.env.example` e cobrir que o modulo de sessao falha de forma controlada quando a chave estiver ausente ou malformada.
- Validar localmente o fluxo com `.env.local` contendo `API_BASE_URL=http://localhost:8000`, `INTERNAL_API_AUDIENCE`, `INTERNAL_API_ISSUER` e uma chave RSA privada compativel com a chave publica configurada no Laravel.
- Antes da correcao final, reproduzir o erro com log/stack trace do `church-erp-web` para confirmar a causa raiz.
- Confirmar que credenciais invalidas continuam retornando `422`, credenciais validas passam a retornar `200` com cookie `church-erp-bff-session`, e `GET /api/auth/me` funciona na sequencia do login.

### Notes

- Credenciais invalidas retornam `422` corretamente.
- Credenciais validas retornam `500` no endpoint BFF `/api/auth/login`.
- Nao ha log correspondente no Laravel segundo o relato atual.
- Nao existe `.env.local` no `church-erp-web` neste workspace no momento da investigacao.
- `.env.example` ja declara `INTERNAL_JWT_PRIVATE_KEY`, mas o `README.md` nao orienta explicitamente o preenchimento dessa chave.
- O comportamento observado e consistente com a chamada ao Laravel ocorrer e a falha acontecer depois, no momento em que o BFF tenta assinar o JWT interno para emitir a sessao local.
- A correcao recomendada nao exige alterar controller, service ou rotas do Laravel.
- A implementacao deve evitar mover a falha para bootstrap global do Next.js, porque isso quebraria partes publicas do app sem necessidade.
