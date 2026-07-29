# Security Quality Gates

Use este arquivo quando a revisao precisar decidir quais comandos executar. Execute apenas comandos seguros e disponiveis no ambiente. Quando a ferramenta nao existir, registre o gap e recomende instalacao no CI/pre-commit.

## Gates por stack

| Stack / Artefato | Comando preferencial | Objetivo |
| --- | --- | --- |
| Python | `bandit -r .` | SAST para vulnerabilidades comuns em Python |
| Python | `ruff check .` | Lint e conformidade |
| Python dependencies | `pip-audit` ou `safety check` | SCA para CVEs em dependencias |
| SQL | `sqlfluff lint .` | Auditoria de sintaxe e padroes de SQL |
| Node.js | `npm audit --omit=dev` | SCA em dependencias runtime |
| PHP/Composer | `composer audit` | SCA em dependencias PHP |
| Secrets | `detect-secrets scan` | Deteccao de segredos em arquivos |
| Git ignore | `rg -n "^\\.env|\\.pem|\\.key|id_rsa|secrets" .gitignore` | Confirmar exclusao de segredos |

## Classificacao sugerida

- **Alto Risco:** segredo real exposto, bypass de authz/authn, injecao exploravel, XSS persistente/refletido, path traversal em leitura/escrita, stack trace com dados sensiveis em cliente, dependencia com CVE critica exploravel.
- **Medio Risco:** ausencia de schema em entrada, logs excessivos, erro pouco sanitizado, ferramenta SAST/SCA ausente em area sensivel, falta de STRIDE em spec sensivel.
- **Baixo Risco:** hardening adicional, documentacao incompleta, configuracao de IDE nao comprovada sem impacto direto, melhoria de allowlist ou pre-commit.

## Comandos proibidos

Nao executar comandos com elevacao/destruicao ou mudanca irreversivel, incluindo `sudo`, `rm -rf`, `chmod 777`, `chown -R /`, alteracoes de registro/SO, rotacao de credenciais reais ou comandos que enviem dados sensiveis a servicos externos sem aprovacao.
