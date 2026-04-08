# Backend Domain Baseline

Este backend nasce organizado por dominio para evitar controllers anemicos e regras sensiveis dispersas.

## Dominios iniciais

- `Identity`
- `Finance`
- `People`
- `Operations`
- `Communications`

Cada dominio ja possui as subpastas `Models`, `Services`, `Resources` e `Repositories`.

## Guardrails

- Toda entidade multi-tenant relevante deve considerar `church_id` em modelos, policies, consultas e servicos.
- Controllers HTTP apenas orquestram requests, autorizacao e resources.
- Respostas bem-sucedidas devem seguir `JsonResource` ou `ResourceCollection`.
