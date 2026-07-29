# Revisao Adversarial de Seguranca

**Escopo:** {{scope}}
**Auditor:** Vex - Security Auditor
**Data:** {{date}}
**Decisao:** Changes Requested | Blocked | Approved with Security Notes

## 🔴 Alto Risco

### SEC-H-001 {{titulo}}
- **Item / Componente Afetado:** {{arquivo_ou_spec_linha}}
- **Risco Detectado:** {{descricao_tecnica}}
- **Impacto para o Projeto:** {{impacto_exploracao_negocio}}
- **Solucao Recomendada:** {{correcao_precisa}}

## 🟡 Medio Risco

### SEC-M-001 {{titulo}}
- **Item / Componente Afetado:** {{arquivo_ou_spec_linha}}
- **Risco Detectado:** {{descricao_tecnica}}
- **Impacto para o Projeto:** {{impacto_exploracao_negocio}}
- **Solucao Recomendada:** {{correcao_precisa}}

## 🟢 Baixo Risco

### SEC-L-001 {{titulo}}
- **Item / Componente Afetado:** {{arquivo_ou_spec_linha}}
- **Risco Detectado:** {{descricao_tecnica}}
- **Impacto para o Projeto:** {{impacto_exploracao_negocio}}
- **Solucao Recomendada:** {{correcao_precisa}}

## STRIDE

| Categoria | Observacao | Status |
| --- | --- | --- |
| Spoofing | {{auth_identidade}} | OK | Gap | N/A |
| Tampering | {{integridade}} | OK | Gap | N/A |
| Repudiation | {{auditoria}} | OK | Gap | N/A |
| Information Disclosure | {{lgpd_pii_segredos}} | OK | Gap | N/A |
| Denial of Service | {{limites_payload_rate_limit}} | OK | Gap | N/A |
| Elevation of Privilege | {{authz_privilegios}} | OK | Gap | N/A |

## Gates Executados

| Gate | Comando | Resultado | Observacao |
| --- | --- | --- | --- |
| SAST | `{{command}}` | Passou | Falhou | Nao executado | {{observacao}} |
| SCA | `{{command}}` | Passou | Falhou | Nao executado | {{observacao}} |
| Segredos | `{{command}}` | Passou | Falhou | Nao executado | {{observacao}} |

## Riscos Residuais

- {{risco_residual}}

## Proximas Acoes Obrigatorias

- [ ] {{acao}}
