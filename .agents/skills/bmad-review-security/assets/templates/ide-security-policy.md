# Politica de Seguranca da IDE e Sandbox

## Artifact Review Policy

- **Valor exigido:** `Asks for Review`
- **Regra:** pausar e pedir aprovacao humana antes de modificar arquitetura, `implementation_plan.md`, workflows BMAD, permissoes, secrets, CI ou scripts de deploy.

## Terminal Command Auto Execution Policy

- **Bloquear automaticamente:** `sudo`, `rm -rf`, `chmod 777`, `chown -R /`, alteracoes de registro/SO, destruicao de banco, rotacao de credenciais reais, deploy ou migrations destrutivas.
- **Permitir normalmente:** leitura (`rg`, `sed`, `cat`, `git diff`), testes locais, lint, typecheck, SAST/SCA local e comandos sem efeito destrutivo.

## Browser URL Allowlist

- **Permitir:** documentacao oficial do framework/projeto, OWASP, repositorios oficiais, registry oficial de pacotes, docs internas aprovadas.
- **Bloquear:** sites anonimos, pastebins, encurtadores, conteudo de terceiros nao confiavel, paginas com prompts externos nao revisados.

## Banco de Dados para Agentes

- Usar usuarios restritos a bancos/tabelas de teste.
- Proibir privilegios `DBA`, `SYSTEM`, superuser, alteracao global e acesso a dados reais.
- Preferir permissao minima: `SELECT` e `INSERT` quando suficiente; adicionar `UPDATE`/`DELETE` somente quando a story exigir testes de mutacao.
