# Revisao Adversarial de Seguranca

**Escopo:** Story 5.4, fronteira frontend de egress por Clipboard/Web Share, codigo-base relacionado e dependencias runtime
**Auditor:** Vex - Security Auditor
**Data:** 2026-10-06
**Revisao/commit analisado:** `06a5d60c2c86a7b18e0f0a181c0210e67d25b0bf` + story 5.4 ainda nao versionada
**Decisao:** Approved with Security Notes

## 🔴 Alto Risco

### SEC-H-001 `sharp` runtime vulneravel
- **Item / Componente Afetado:** `church-erp-web/package.json:38` e lockfile (`sharp` 0.35.4 antes da correcao)
- **Risco Detectado:** `npm audit --omit=dev` identificou GHSA-wq5f-xc86-pv6w/CVE-2026-96889 na dependencia transitiva runtime `sharp <0.35.5`.
- **Impacto para o Projeto:** uma versao vulneravel da biblioteca nativa de imagens poderia expor o processo Next.js a falha de memoria ao processar conteudo SVG malicioso em uma superficie futura de imagem.
- **Solucao Recomendada:** aplicada: override atualizado para `sharp 0.35.5`, lockfile regenerado e SCA runtime repetida com zero vulnerabilidades.

### SEC-H-002 `source-map-js` runtime vulneravel
- **Item / Componente Afetado:** `church-erp-web/package.json:39` e lockfile (`source-map-js` 1.2.1 antes da correcao)
- **Risco Detectado:** `npm audit --omit=dev` identificou GHSA-68fv-2mgg-jv7q em `source-map-js >=1.0.0 <1.2.2`, com possibilidade de bloqueio do event loop por offsets de secoes de source map.
- **Impacto para o Projeto:** processamento de source map especialmente construido poderia causar indisponibilidade do processo Node.js.
- **Solucao Recomendada:** aplicada: override explicito para `source-map-js 1.2.2`, lockfile regenerado e SCA runtime repetida com zero vulnerabilidades.

**Disposicao:** SEC-H-001 e SEC-H-002 corrigidos neste gate. Nenhum finding Critical/High permanece aberto.

## 🟡 Medio Risco

Nenhum achado material de medio risco foi identificado. A story ja define STRIDE, allowlist estrita do payload, limite de 5000 code points, descarte por revisao, ausencia de persistencia/log e fallback sem copia automatica.

## 🟢 Baixo Risco

Nenhum achado material de baixo risco adicional foi identificado no escopo pre-implementacao.

## STRIDE

| Categoria | Observacao | Status |
| --- | --- | --- |
| Spoofing | O handoff reutiliza o acesso ja autorizado de `secretary`/`administrator`; nao cria autenticacao ou endpoint. | OK |
| Tampering | Snapshot `{ revision, text }`, payload fechado e fonte unica em `draftText` evitam troca silenciosa da mensagem. | OK |
| Repudiation | A UI nao deve alegar envio/entrega/leitura nem criar auditoria falsa de entrega externa. | OK |
| Information Disclosure | Egress somente por gesto explicito; payload share limitado a `title` e `text`; sem URL, IDs, storage, logs ou analytics. | OK |
| Denial of Service | Limite de 5000 code points, busy state e fallbacks recuperaveis reduzem abuso e concorrencia. | OK |
| Elevation of Privilege | `AreaGuard` e autorizacoes existentes permanecem; a story nao cria mutacao ou nova fronteira backend. | OK |

## Gates Executados

| Gate | Comando | Resultado | Observacao |
| --- | --- | --- | --- |
| SAST | inspecao focal com `rg` e leitura de composer, normalizadores, guard, primitives e politicas | Passou | Nao havia implementacao de handoff; os controles obrigatorios da story foram validados antes do codigo. |
| SCA Node inicial | `cd church-erp-web && npm audit --omit=dev` | Falhou | SEC-H-001 e SEC-H-002 identificados e corrigidos por patch. |
| SCA Node final | `cd church-erp-web && npm audit --omit=dev` | Passou | Zero vulnerabilidades runtime apos `sharp 0.35.5` e `source-map-js 1.2.2`. |
| SCA PHP | `cd church-erp-api && composer audit` | Passou | Nenhum advisory encontrado. |
| Segredos | revisao de `.gitignore`, arquivos `.env*` versionados e arquivos sensiveis rastreados | N/A em dev/CI | Somente `.env.example` esta versionado; `.env`, chaves e PEMs estao ignorados. O scanner permanece gate de STG/PROD. |

## Riscos Residuais

- Clipboard, sistema operacional e aplicativo escolhido saem da fronteira de confianca do ERP apos o gesto consciente do usuario.
- Foco real, selecao, focus trap/restoration, teclado, leitor de tela e responsividade dependem de validacao manual apos a implementacao.
- A promocao STG/PROD continua bloqueada sem `bash deploy/security-gate.sh stg|prod` em ambiente com o scanner requerido.

## Proximas Acoes Obrigatorias

- [x] Corrigir SEC-H-001 e SEC-H-002 e repetir SCA runtime.
- [x] Implementar estritamente os controles de egress, revisao concorrente, payload e privacidade definidos na story.
- [x] Executar testes automatizados, validacao em Chrome real da acessibilidade/concorrencia e diff final antes de marcar a story para review.

## Decisao

Approved with Security Notes
