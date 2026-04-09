# Deploy

## Servidor

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
docker compose -f deploy/docker-compose.server.yml up -d --build web-stg api-stg
```

## Local

```bash
docker compose -f deploy/docker-compose.local.yml up -d --build
```

Depois acesse `http://localhost:8080`.

## Observações

- Troque `teudominio.pt`, senhas e `APP_KEY` antes de usar fora de ambiente controlado.
- No servidor, `nginx` e `mysql` ficam isolados da stack de aplicação para reduzir risco operacional.
- O MySQL compartilhado cria três databases: `church_erp_dev`, `church_erp_stg` e `church_erp_prod`.
