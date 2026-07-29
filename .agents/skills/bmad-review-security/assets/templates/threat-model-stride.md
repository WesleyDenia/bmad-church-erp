## Threat Modeling - STRIDE

**Escopo:** {{feature_or_story}}
**Fronteiras de confianca:** {{trust_boundaries}}
**Entradas:** {{entry_points}}
**Saidas:** {{exit_points}}
**Dados sensiveis:** {{sensitive_data}}
**Autenticacao:** {{authentication}}
**Autorizacao:** {{authorization}}
**Limites de payload e abuso:** {{payload_limits}}

| STRIDE | Pergunta adversarial | Mitigacao obrigatoria | Status |
| --- | --- | --- | --- |
| Spoofing | Como um atacante poderia se passar por usuario, servico ou tenant? | {{mitigation}} | Pendente |
| Tampering | Como dados, parametros, arquivos ou mensagens poderiam ser alterados? | {{mitigation}} | Pendente |
| Repudiation | Como provar quem fez a acao e impedir negacao posterior? | {{mitigation}} | Pendente |
| Information Disclosure | Que PII, segredo, dado financeiro ou detalhe interno poderia vazar? | {{mitigation}} | Pendente |
| Denial of Service | Como payloads, loops, arquivos ou chamadas externas podem degradar o servico? | {{mitigation}} | Pendente |
| Elevation of Privilege | Como um usuario pode ganhar permissao indevida ou atravessar tenant/role? | {{mitigation}} | Pendente |

### Negative Constraints

- Nunca gravar chaves de API, senhas, tokens ou segredos em texto claro.
- Nunca chamar backend sensivel diretamente do browser quando houver BFF.
- Nunca registrar PII, tokens, payloads sensiveis ou stack traces em logs expostos.
- Nunca concatenar input em SQL, comandos shell, HTML raw ou caminhos de arquivo.

### Security Sign-off

- **Status:** Pendente | Aprovado com notas | Bloqueado
- **Auditor:** Vex - Security Auditor
- **Data:** {{date}}
