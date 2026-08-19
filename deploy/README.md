# Deploy

## Servidor

Defina os segredos em um arquivo `.env` local ou no secret manager do servidor
antes de subir a infraestrutura. No minimo, configure:

```bash
MYSQL_ROOT_PASSWORD=
DEV_DB_PASSWORD=
STG_DB_PASSWORD=
PROD_DB_PASSWORD=
API_DEV_APP_KEY=
API_STG_APP_KEY=
API_PROD_APP_KEY=
```

Para ambiente local, configure tambem:

```bash
API_LOCAL_APP_KEY=
LOCAL_INTERNAL_JWT_PUBLIC_KEY=
LOCAL_INTERNAL_JWT_PRIVATE_KEY=
```

Suba a infraestrutura compartilhada uma vez:

```bash
docker compose -f deploy/docker-compose.infra.yml up -d
```

Depois suba os ambientes de aplicação:

```bash
docker compose -f deploy/docker-compose.server.yml up -d --build
```

Quando quiser atualizar apenas um ambiente, recrie só os serviços dele:

```bash
bash deploy/security-gate.sh stg
docker compose -f deploy/docker-compose.server.yml up -d --build web-stg api-stg
```

Para `stg` e `prod`, execute sempre `deploy/security-gate.sh` antes do deploy. O gate exige `pre-commit` ou `detect-secrets-hook` instalado e bloqueia a promoção se a varredura de segredos falhar.

Guard-rail de segredos por ambiente:

- `dev`, `local` e `development`: não exigem `detect-secrets`; o gate registra skip explícito para não bloquear ambiente de desenvolvimento.
- `ci`, `stg`, `staging`, `prod` e `production`: exigem `pre-commit` ou `detect-secrets-hook`; sem scanner instalado, o deploy falha antes da promoção.

## Local

```bash
docker compose -f deploy/docker-compose.local.yml up -d --build
```

Depois acesse `http://localhost:8080`.

## Observações

- Troque `teudominio.pt` antes de usar fora de ambiente controlado.
- Nunca grave senhas, `APP_KEY` ou chaves JWT nos arquivos versionados; use `.env` local ou secret manager.
- No servidor, `nginx` e `mysql` ficam isolados da stack de aplicação para reduzir risco operacional.
- O MySQL compartilhado cria três databases: `church_erp_dev`, `church_erp_stg` e `church_erp_prod`, cada um com usuario proprio e grants explicitos.
