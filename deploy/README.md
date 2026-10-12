# Deploy

Esta stack usa Docker Compose e separa os três ambientes de aplicação (`dev`,
`stg` e `prod`). Caddy é o único serviço exposto à Internet: termina TLS para
`stg` e `prod`, e encaminha `dev` explicitamente por HTTP. A API e o MySQL não
têm portas públicas; o browser comunica apenas com o frontend/BFF.

## Pré-requisitos do servidor

- Docker Engine com Docker Compose v2, Git e OpenSSL;
- portas TCP 80 e 443 abertas;
- registos DNS `A`/`AAAA` de `STG_DOMAIN` e `PROD_DOMAIN` a apontar para o
  servidor antes do primeiro arranque. O Caddy obtém e renova os certificados
  TLS automaticamente para esses ambientes;
- dois diretórios persistentes, fora do repositório, para segredos e cópias de
  segurança. Proteja-os com permissões do utilizador de deploy e faça cópia do
  segundo para armazenamento externo.

## Configuração inicial do servidor

No servidor, a partir da raiz do repositório:

```bash
bash deploy/bootstrap.sh server
```

Na primeira execução o script cria `deploy/.env` e para, para que sejam
preenchidos os domínios, email ACME e caminhos externos. Edite esse ficheiro,
mantendo-o sem passwords ou chaves:

```dotenv
DEPLOY_SECRETS_DIR=/srv/church-erp/secrets
DEPLOY_BACKUP_DIR=/srv/church-erp/backups
ACME_EMAIL=admin@example.com
DEV_DOMAIN=localhost
STG_DOMAIN=stg.example.com
PROD_DOMAIN=app.example.com
```

Execute novamente `bash deploy/bootstrap.sh server`. Ele cria apenas os
segredos que ainda não existem, com permissões restritas, cria a infraestrutura
partilhada e não inicia nenhum ambiente de aplicação. Nunca versione
`deploy/.env`, o diretório de segredos ou as cópias de segurança.

## Publicar um ambiente

O deploy é intencionalmente manual nesta fase:

```bash
bash deploy/release.sh dev
bash deploy/release.sh stg
bash deploy/release.sh prod
```

`release.sh` recusa uma árvore Git com alterações; faça commit antes de publicar.
Em emergência, `--allow-dirty` permite uma publicação explícita de uma árvore
alterada. Pode atribuir uma tag de imagem concreta com `RELEASE_TAG`:

```bash
RELEASE_TAG=2026.10.07.1 bash deploy/release.sh stg
```

Em cada release, o script executa o gate de segredos, cria uma cópia SQL do
database do ambiente, constrói imagens etiquetadas com o commit/tag, executa as
migrations uma única vez, espera pelos health checks e faz smoke test ao
frontend. Se os containers novos não ficarem saudáveis, restaura as imagens da
última release bem-sucedida. Migrations não são revertidas automaticamente; a
cópia criada antes do deploy é a salvaguarda para uma recuperação de dados.

Para `stg` e `prod`, o gate requer `pre-commit` ou `detect-secrets-hook`
instalado. Instale um deles no host de deploy antes da primeira promoção.

## Desenvolvimento local

```bash
bash deploy/bootstrap.sh local
```

O script gera segredos de desenvolvimento em `.deploy-secrets/`, inicia MySQL,
aplica migrations de forma explícita e inicia a stack. A aplicação fica em
`http://localhost:8080`. Para parar a stack local:

```bash
docker compose -f deploy/docker-compose.local.yml down
```

O ambiente local usa Nginx como proxy HTTP. Na configuração partilhada de
servidor, o Caddy mantém a rota `dev` igualmente em HTTP, sem solicitar um
certificado; `stg` e `prod` continuam obrigatoriamente em HTTPS.

## Limites atuais e próximo passo

- Os ambientes têm databases, utilizadores, redes de aplicação, volumes e
  chaves JWT distintos, mas partilham o mesmo host e a mesma instância MySQL.
  Produção deve migrar para um host ou serviço de base de dados dedicado quando
  o risco operacional justificar essa separação.
- As imagens são imutáveis no host pelo respetivo commit/tag, mas ainda são
  construídas no servidor. Um registry e CI são o passo seguinte para promoção
  de artefactos já construídos; não foram ativados nesta fase.
- Teste periodicamente a restauração das cópias SQL num ambiente isolado.
