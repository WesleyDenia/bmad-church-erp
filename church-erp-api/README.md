# Church ERP API

Baseline do backend desacoplado do projeto `curso-bmad`.

## Stack

- Laravel 12
- PHP 8.3+
- MySQL 8.4 como banco transacional alvo
- API versionada em `routes/api.php`

## Estrutura base

- `app/Domain` organiza o codigo por dominio de negocio.
- `app/Http/Controllers/Api/V1` concentra os entrypoints HTTP versionados.
- `app/Http/Requests` recebe validacoes customizadas.
- `app/Policies` centraliza autorizacao.
- `app/Http/Resources` define o contrato idiomatico de respostas de sucesso.

## Tenancy

O isolamento logico do sistema deve existir desde a fundacao via `church_id`.

- Toda entidade relevante precisa carregar `church_id`.
- Consultas, policies e regras de dominio nao podem ignorar `church_id`.
- O backend segue como fonte de verdade para autenticacao, autorizacao, validacao e escopo de tenant.

## Contrato HTTP

- O frontend nao consome endpoints autenticados do Laravel diretamente no browser.
- O `church-erp-web` funciona como BFF e conversa com esta API usando JWT interno de curta duracao.
- Payloads e query params devem usar `snake_case`.
- Respostas de sucesso devem usar `JsonResource` ou `ResourceCollection`.

## Desenvolvimento

1. Copie `.env.example` para `.env`.
2. Ajuste o acesso ao MySQL 8.4 local.
3. Execute `composer install`.
4. Execute `php artisan key:generate`.
5. Execute `php artisan serve`.
6. Rode `php artisan test` para validar o baseline.

## Endpoint inicial

- `GET /api/v1/health`
- `POST /api/v1/onboarding/initial-setup`

## Onboarding inicial

O endpoint de onboarding cria a igreja, a usuaria administradora inicial e o vinculo `church_user` em uma transacao.

Payload minimo:

```json
{
  "church_name": "Igreja Central",
  "admin_name": "Maria Silva",
  "admin_email": "maria@example.com",
  "password": "secret-password",
  "password_confirmation": "secret-password"
}
```

Em caso de validacao, a API retorna `422` com `message` simples e erros por campo.
