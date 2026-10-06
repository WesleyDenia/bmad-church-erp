# Story 5.4: Fazer handoff externo por copiar ou partilhar

Status: done

<!-- Implementation gate: esta story e o ponto explicito de egress de uma mensagem que pode conter dados pessoais para clipboard ou aplicativos externos. O primeiro passo obrigatorio do dev-story e executar /bmad-review-security, incorporar findings validos nesta story e preencher o Security Sign-off antes de escrever codigo de produto. Varredura detect-secrets/pre-commit nao bloqueia dev/local; ela permanece gate obrigatorio apenas para promocao STG/PROD. -->

## Story

As a secretaria da igreja,
I want copiar ou partilhar a mensagem preparada para o WhatsApp ou canal externo,
so that eu conclua a comunicacao sem exigir integracao nativa no MVP.

## Acceptance Criteria

1. Dado que um usuario `secretary` ou `administrator` ja gerou um rascunho em `/communications`, quando o estado e `message_draft_ready` ou `draft_has_missing_contact`, `draftText.trim()` nao e vazio e o valor bruto possui no maximo 5000 Unicode code points, entao a UI apresenta `Copiar mensagem` como acao primaria e `Partilhar mensagem` como acao secundaria; sem rascunho, com texto vazio/whitespace ou acima do limite bruto, o handoff permanece bloqueado com orientacao clara.
2. Dado que a secretaria alterou o rascunho no `Textarea`, quando escolhe copiar ou partilhar, entao a fonte unica do handoff e o valor atual de `composer.draftText`, preservando quebras de linha e edicoes manuais; a UI nao usa novamente `draft.message_body`, `body_template`, texto do DOM ou uma versao anterior do rascunho.
3. Dado que o browser esta em contexto seguro e oferece `navigator.clipboard.writeText`, quando a secretaria aciona `Copiar mensagem`, entao a aplicacao copia exatamente o texto atual por gesto explicito, anuncia `Mensagem copiada. Agora cole no WhatsApp ou no canal que preferir.` e preserva rascunho, modelo, pessoa, busca e contexto da pendencia.
4. Dado que Clipboard API esta ausente, o contexto nao e seguro, a permissao e negada ou `writeText` rejeita, quando a copia e tentada, entao a UI nao alega sucesso, abre fallback manual acessivel derivado do `draftText` atual em `Textarea` somente leitura, move foco e seleciona o conteudo, permite tentar novamente e orienta `Nao foi possivel copiar automaticamente. Selecione o texto e copie para continuar.`; se o retry acionado pelo usuario funcionar, o dialog fecha, qualquer copia duplicada do texto em state e limpa e o foco retorna ao acionador.
5. Dado que Web Share API suporta o payload textual, quando a secretaria aciona `Partilhar mensagem`, entao `navigator.share()` e chamado diretamente pelo handler do clique, sem `fetch` ou outro `await` anterior, com exatamente as propriedades `{ title: "Mensagem preparada", text: currentDraftText }`; nenhuma propriedade adicional carrega `url`, query string, `person_id`, `template_key`, `church_id`, `contact_summary` ou outro metadado, embora o proprio `text` possa conter nome/telefone/email conscientemente preparados para o destinatario.
6. Dado que `navigator.share` nao existe, `navigator.canShare` retorna `false`/lanca erro ou a partilha rejeita por motivo diferente de `AbortError`, quando a acao e tentada, entao a UI preserva todo o contexto, mostra estado recuperavel e abre/oferece fallback manual; nao chama Clipboard automaticamente, nao abre URL externa/deep link e qualquer nova tentativa de copiar exige clique explicito.
7. Dado que `navigator.share` rejeita com `AbortError`, o que pode representar cancelamento ou ausencia de share target, quando a secretaria retorna ao sistema, entao a UI trata o resultado de forma neutra, anuncia `Partilha cancelada ou indisponivel. A mensagem continua disponivel; use Copiar mensagem para continuar.`, nao mostra sucesso nem erro destrutivo e mantem o rascunho editavel.
8. Dado que `navigator.share` resolve, quando a secretaria retorna ao sistema, entao a UI anuncia apenas `A mensagem foi aberta para partilha. Conclua o envio no canal escolhido.`; nunca afirma que a mensagem foi enviada, entregue ou lida, porque o handoff ao sistema operacional nao confirma entrega no canal externo.
9. Dado que o texto atual ainda contem `[contato pendente]` ou qualquer marcador atual no formato `{{...}}`, inclusive inserido manualmente depois da geracao, quando a secretaria inicia copiar ou partilhar, entao uma confirmacao curta avisa `Revise os campos destacados antes de continuar.` e oferece `Voltar e revisar` e `Continuar mesmo assim`; o handler do proprio botao `Continuar mesmo assim` deve invocar a acao escolhida diretamente e, no caso de share, chamar `navigator.share()` sincronamente sem Promise de confirmacao, timer, efeito ou `await` anterior. Marcadores removidos deixam de gerar aviso/bloqueio visual e `profile_needs_update` sem marcador textual permanece apenas aviso nao bloqueante.
10. Dado que a mesma pagina/aba permanece montada, quando copiar, partilhar, cancelar, falhar ou retornar de foco/visibilidade, entao `draftText`, `draft`, modelo, pessoa, query de busca e contexto da pendencia permanecem intactos, editaveis e sem novo POST automatico. Cada operacao captura a revisao do texto; se o usuario editar enquanto sua Promise esta pendente, o resultado obsoleto nao pode marcar sucesso para a versao nova. Toda edicao recalcula elegibilidade para `handoff_ready`, `handoff_blocked_empty_message`, `handoff_blocked_too_long` ou `handoff_review_required`, conforme o novo conteudo.
11. Dado que esta story e implementada, quando o fluxo de handoff e inspecionado, entao ele permanece frontend-only e acionado por clique: nao cria endpoint Laravel/BFF, migration, model, tabela, provider, SDK, webhook, scheduler, fila, QR code, `window.open`, `wa.me`, `api.whatsapp.com`, custom scheme ou envio automatico.
12. Dado que a secretaria conclui ou abandona o handoff, quando o fluxo termina, entao o sistema nao persiste rascunho ou corpo da mensagem, nao marca pendencia como resolvida/enviada, nao atualiza `people.last_contacted_at`, nao cria historico/status de entrega e nao dispara mutacao de backend.
13. Dado que a mensagem preparada pode conter PII, quando copy/share/fallback e executado, entao a aplicacao nao grava corpo, IDs ou contexto em `localStorage`, `sessionStorage`, IndexedDB, cookies, caches controlados pela aplicacao, analytics, telemetria, `console`, logs ou nova URL; a query same-origin ja recebida da Story 5.3 pode permanecer inalterada, mas nao e propagada ao share nem a destino externo. Clipboard, sistema operacional e aplicativo escolhido ficam explicitamente fora do controle do ERP apos o gesto consciente. O texto continua renderizado apenas como texto em `Textarea`, sem HTML, markdown, rich text, `iframe` ou `dangerouslySetInnerHTML`.
14. Dado que o handoff e usado em desktop, tablet, mobile, teclado ou leitor de tela, quando seus estados mudam, entao os botoes mantem alvo minimo de 44x44px e foco visivel, acoes empilham no mobile sem sobreposicao, progresso/sucesso usam `aria-live="polite"` ou `role="status"`, falhas usam `role="alert"`, dialogs gerenciam foco e nenhum estado depende apenas de cor.
15. Dado que os browsers variam em suporte e permissoes, quando os testes automatizados rodam, entao funcoes puras de elegibilidade/transicao e adaptadores injetaveis provam texto editado exato, Unicode/limite/vazio, revisoes concorrentes, Clipboard seguro/ausente/rejeitado/sucesso, Web Share ausente, `canShare` ausente/true/false/erro, share resolvido, `AbortError`, outras rejeicoes, confirmacao de marcadores atuais, resultados obsoletos descartados e ausencia de properties/side effects proibidos. Foco real, selecao, focus trap/restoration, teclado, leitor de tela e responsividade sao gates manuais obrigatorios registrados no Dev Agent Record, nao alegacoes cobertas por source inspection.
16. Dado que esta story esta marcada como `ready-for-dev`, quando um dev agent iniciar `dev-story`, entao pode executar somente o gate inicial de seguranca ate que `/bmad-review-security` tenha produzido artefato referenciado, auditor/data, revisao ou commit analisado, findings por severidade e disposicao. Nenhum Critical/High pode permanecer aberto; aceite excepcional exige owner e justificativa registrados no `Security Sign-off`.

## Tasks / Subtasks

- [x] Task 1 - Executar o gate de seguranca antes de codigo de produto (AC: 13, 16)
  - [x] Rodar `/bmad-review-security` contra esta story e incorporar todos os findings validos.
  - [x] Salvar/referenciar o relatorio, registrar auditor, data, revisao/commit analisado e disposicao por finding; nenhum Critical/High pode ficar aberto sem aceite formal de owner e justificativa.
- [x] Task 2 - Implementar adaptadores browser focados em comunicacao (AC: 3-8, 15)
  - [x] Implementar helpers injetaveis em `src/features/communications/message-handoff.ts`, reutilizando as licoes — nao o fluxo assincorno — da Story 3.3.
  - [x] Nao alterar `features/finance/closing-summary-handoff.ts` nem o componente financeiro nesta story; eventual unificacao/correcao cross-domain fica registrada como debito tecnico separado.
  - [x] Cobrir contexto seguro, feature detection, `canShare` ausente/false/excecao, `AbortError` ambiguo e falhas de permissao sem `document.execCommand`.
- [x] Task 3 - Modelar elegibilidade, payload e estados de handoff de comunicacao (AC: 1, 2, 5-10, 13)
  - [x] Criar funcoes puras de elegibilidade/transicao em `src/features/communications/message-handoff.ts`, contando Unicode code points com `Array.from(text).length`, usando `trim()` somente para vazio e sem truncar o valor bruto.
  - [x] Detectar no texto atual `[contato pendente]` e qualquer `{{...}}`; remover alertas stale quando o marcador for corrigido e manter `profile_needs_update` apenas como aviso.
  - [x] Modelar `draftRevision`/snapshot da operacao e descartar resultado assincorno obsoleto; recalcular estado em toda edicao.
  - [x] Diferenciar sucesso, `share_cancelled_or_unavailable` e fallback; nunca modelar `sent`/`delivered`.
- [x] Task 4 - Criar a composicao operacional de acoes e fallback (AC: 1-10, 14)
  - [x] Criar `src/components/operational/communication-message-handoff-actions.tsx` usando `Button`, `Dialog` e `Textarea` existentes.
  - [x] Implementar `Copiar mensagem`, `Partilhar mensagem`, confirmacao de lacunas e fallback manual com foco/selecao, retry, fechamento/limpeza/restauracao de foco no sucesso e feedback inline acessivel.
  - [x] Guardar apenas o tipo de acao pendente na confirmacao; o clique em `Continuar mesmo assim` chama copy/share diretamente e nunca armazena outra copia persistente do corpo.
  - [x] Em share indisponivel/falho, nao copiar automaticamente; abrir/oferecer fallback e exigir clique explicito para cada tentativa de Clipboard.
  - [x] Desabilitar concorrencia/duplo clique durante operacao e manter layout responsivo com uma unica acao primaria dominante.
- [x] Task 5 - Integrar o handoff no compositor existente (AC: 1, 2, 9-13)
  - [x] Renderizar as acoes junto ao `Textarea` somente apos gerar rascunho, passando `composer.draftText`, warnings originais e uma revisao incrementada a cada edicao.
  - [x] Nao usar `maxLength` HTML por sua semantica UTF-16; aceitar mudanca somente quando `Array.from(nextText).length <= 5000`, exibir contador/erro claro e nunca truncar silenciosamente.
  - [x] Derivar warnings de placeholders do texto atual e recalcular elegibilidade/feedback em toda edicao; nao limpar `draft`, pessoa, modelo ou contexto.
  - [x] Atualizar exatamente `Handoff externo futuro` para `WhatsApp ou canal externo` e `Camada futura para apoiar mensagens recorrentes.` para `Prepare, copie ou partilhe mensagens pelo canal que preferir.`, sem alterar guards, navegacao ou contratos.
- [x] Task 6 - Implementar testes de risco e regressao (AC: 3-15)
  - [x] Criar `tests/communication-message-handoff.test.mjs` para helpers/adaptadores e state model: Unicode, payload exato, lacunas atuais, revisoes concorrentes e transicoes de elegibilidade.
  - [x] Atualizar `communication-message-drafts.test.mjs`, `communication-templates.test.mjs` e `bff-smoke.test.mjs` para o novo escopo sem remover protecoes da 5.2/5.3.
  - [x] Manter source inspection apenas para boundaries estaticos; nao usa-la como prova de foco, selecao ou preservacao runtime.
- [x] Task 7 - Validar a entrega completa antes de review (AC: 14-16)
  - [x] Rodar os testes web focados, a suite web completa, lint, typecheck e smoke build.
  - [x] Fazer e registrar no Dev Agent Record revisao manual desktop/tablet/mobile, teclado, focus trap/restoration, selecao, leitor de tela, double-click e edicao durante Promise pendente.
  - [x] Confirmar por diff que nenhum arquivo backend, financeiro, dependency manifest, endpoint ou persistencia foi adicionado sem necessidade.

## Dev Notes

### Contexto funcional e objetivo desta story

- Esta story conclui o Epic 5 entregando a ponte entre o rascunho editavel ja preparado pelas Stories 5.2/5.3 e o canal externo escolhido conscientemente pela secretaria. O produto prepara e entrega o texto ao clipboard ou share sheet; o usuario continua responsavel por escolher o aplicativo/destinatario e concluir o envio fora do ERP.
- A fonte da verdade no browser e `composer.draftText`, porque ela inclui os ajustes manuais feitos depois da resposta do backend. O handoff nao pode voltar ao texto original do response, ao template cru ou a uma leitura do DOM.
- O requisito de "retornar sem recompor" vale para a mesma instancia montada da pagina/aba: abrir/cancelar/concluir o share sheet ou copiar nao pode desmontar nem limpar o estado React. Recuperacao apos reload, fechamento de aba ou nova sessao exigiria persistencia de PII e esta explicitamente fora do escopo.
- O sistema nao consegue provar envio, entrega ou leitura em um canal externo. A entrega desta story termina em copia confirmada, abertura do share sheet ou fallback manual, sempre com linguagem honesta.
- Dependencias ja prontas: Story 5.1 fornece modelos; Story 5.2 fornece rascunho textual editavel e autorizado; Story 5.3 fornece deep link contextual seguro e ausencia de auto-POST. Esta story estende o compositor existente e nao recria nenhuma dessas capacidades.

### Guardrails de implementacao obrigatorios

- Estender `CommunicationMessageComposer`; nao criar segunda pagina/compositor. As acoes entram junto ao `Textarea` existente e recebem o `draftText` atual.
- Manter `AreaGuard area="communications"`, proxy, policies e BFFs existentes. Handoff nao precisa de nova autorizacao ou request porque atua sobre texto ja entregue ao browser por fluxo autorizado.
- Chamar Clipboard e Web Share somente em handlers de clique. Em especial, `navigator.share()` deve ocorrer antes de qualquer `await`/fetch para preservar a ativacao transitoria exigida pelo browser.
- Compartilhar somente titulo estatico e texto atual. Nunca incluir `window.location`, URL atual, query contextual ou metadados de pessoa/template.
- Usar a Story 3.3 apenas como referencia de UX/fallback. Nao reutilizar seu fluxo assincorno nem alterar Finance nesta story: ele pode carregar dados antes de share e nao trata excecao de `canShare` conforme o novo contrato.
- Preservar o estado do compositor em todos os resultados. Acoes de handoff podem alterar somente estado local de feedback/dialog; nao podem limpar `draft`, `draftText`, `selectedPersonKey`, `query`, modelo ou contexto.
- Cada edicao incrementa `draftRevision`, invalida feedback anterior e recalcula elegibilidade; resultado de Promise cuja revisao nao coincide com a atual e descartado sem anunciar sucesso/erro stale.
- Tratar Clipboard indisponivel/rejeitado e Web Share indisponivel/rejeitado como caminhos normais e recuperaveis. Fallback manual e requisito funcional, nao melhoria opcional.
- Detectar lacunas a partir do texto atual (`[contato pendente]` e `{{...}}`) e reconciliar alertas originais; nao bloquear por `missing_fields.length`, que pode ficar stale depois da edicao.
- Manter o corpo apenas em memoria local do componente. Nenhum storage/cache controlado pela aplicacao, log, analytics ou request novo recebe o texto; clipboard/SO/app externo sao a fronteira consentida e ficam fora do controle do ERP.
- A query same-origin existente pode permanecer para preservar o contexto da Story 5.3; esta story nao a altera, nao a inclui no payload e nao cria URL externa.

### Abordagens proibidas

- Criar `/api/communications/send`, `/handoff`, endpoint Laravel/BFF, mutation, migration, tabela de drafts/historico, provider, SDK, webhook, scheduler ou fila.
- Abrir `wa.me`, `api.whatsapp.com`, custom scheme, `window.open`, QR code ou URL que carregue o corpo/PII. WhatsApp e apenas um possivel destino oferecido pelo share sheet do dispositivo.
- Copiar/partilhar automaticamente no mount, apos gerar o rascunho ou ao abrir o deep link; toda saida exige gesto explicito.
- Usar `document.execCommand("copy")`. Em browser sem Clipboard API segura, usar dialog de copia manual.
- Importar helper/componente de Finance em Communications ou modificar o handoff financeiro como efeito colateral desta story; a semantica nova fica isolada na feature Communications.
- Fazer `fetch`, timer ou operacao assincorna antes de `navigator.share()` no handler.
- Incluir propriedade `url` ou metadados como `person_id`, `template_key`, `contact_summary`, `church_id`, current URL ou query no payload do share; PII intencional pode existir somente dentro de `text`.
- Afirmar `mensagem enviada`, `entregue`, `lida` ou mudar pendencia para `enviado`; a API do browser nao prova isso.
- Resolver pendencia, alterar `last_contacted_at`, pessoa/template, gerar auditoria de envio ou persistir rascunho.
- Armazenar mensagem/IDs em localStorage, sessionStorage, IndexedDB, cookies, cache da aplicacao, nova URL, analytics, telemetria, console ou logs.
- Interpretar o texto como HTML/markdown/rich text, usar `dangerouslySetInnerHTML`, iframe ou preview executavel.
- Introduzir Toast/lib de clipboard/share/UI paralela. Feedback inline, `Dialog`, `Button` e `Textarea` existentes sao suficientes.
- Refatorar/extrair o handoff financeiro, adicionar print ao fluxo de comunicacao ou alterar dependencies/manifests sem necessidade; unificacao cross-domain e debito tecnico separado.

### Arquivos provaveis a alterar ou criar

- Criar `church-erp-web/src/features/communications/message-handoff.ts` para adaptadores injetaveis, regras puras, estados, revisoes, payload e deteccao de lacunas atuais.
- Criar `church-erp-web/src/components/operational/communication-message-handoff-actions.tsx` para a composicao de UI.
- Alterar `church-erp-web/src/components/operational/communication-message-composer.tsx` para integrar as acoes ao `draftText` atual.
- Alterar `church-erp-web/src/features/communications/communication-template.ts` e `church-erp-web/src/features/app-shell/navigation-policy.js` somente para aplicar as duas copys exatas definidas nas Tasks.
- Criar `church-erp-web/tests/communication-message-handoff.test.mjs`.
- Alterar `church-erp-web/tests/communication-message-drafts.test.mjs`, `communication-templates.test.mjs` e `bff-smoke.test.mjs`.
- Nao se espera alterar `church-erp-api`, arquivos de Finance, rotas BFF, `package.json`, lockfiles ou configuracao de ambiente.

### Estados obrigatorios da UI ou do fluxo

- Herdados e preservados: `loading_people_for_message`, `ready_to_prepare_message`, `communication_context_loaded`, `communication_context_invalid`, `generating_message_draft`, `message_draft_ready`, `draft_has_missing_contact`, `validation_error`, `denied_or_session_invalid`, `server_error`.
- Novos estados de handoff: `handoff_idle`, `handoff_ready`, `handoff_blocked_empty_message`, `handoff_blocked_too_long`, `handoff_review_required`, `copy_in_progress`, `copy_success`, `copy_fallback_required`, `share_in_progress`, `share_success_or_returned`, `share_cancelled_or_unavailable`, `share_fallback_required`.
- `handoff_review_required`: texto atual ainda contem `[contato pendente]` ou qualquer `{{...}}`; dialog de confirmacao permite revisar ou prosseguir conscientemente por novo gesto.
- `copy_success`: confirma copia e proximo passo, nunca envio.
- `copy_fallback_required`: dialog somente leitura derivado do texto atual, focado e selecionado, com retry e instrucao manual; sucesso fecha/limpa o fallback e restaura foco.
- `share_success_or_returned`: confirma abertura/preparacao da partilha, nunca entrega.
- `share_cancelled_or_unavailable`: resultado neutro de `AbortError`; rascunho e CTA de copiar permanecem disponiveis.
- `share_fallback_required`: partilha indisponivel/falhou; oferece copiar/manual sem copiar automaticamente nem perder contexto.
- Em qualquer edicao, recalcular para `handoff_ready`, `handoff_blocked_empty_message`, `handoff_blocked_too_long` ou `handoff_review_required`; resultados de revisao anterior nao alteram o novo estado.

### Requisitos tecnicos obrigatorios

- Stack instalada: Next.js `^16.3.7`, React/React DOM `19.2.4`, TypeScript `^5`, Tailwind CSS `^4`; testes web usam `node:test`. O `project-context.md` ainda cita Next 16.2.3, mas o manifesto instalado e a fonte de verdade; esta story nao deve atualizar nem fazer downgrade.
- Clipboard: usar `navigator.clipboard.writeText(text)` somente quando `window.isSecureContext === true` e a funcao existir; capturar Promise rejeitada/`NotAllowedError` e cair em copia manual.
- Web Share: feature-detect `navigator.share`; se `navigator.canShare` existir, validar o payload e tratar tanto `false` quanto excecao como indisponibilidade. Ausencia de `canShare` nao impede tentar share textual quando `share` existe.
- Web Share exige transient activation. Construir payload sincronamente e invocar `navigator.share()` diretamente no evento do usuario; se houver confirmacao, o clique em `Continuar mesmo assim` e o evento autorizador. Nao usar rede, Promise de confirmacao, timeout, efeito ou `await` anterior.
- `AbortError` deve mapear para estado neutro `share_cancelled_or_unavailable`, porque a especificacao tambem o admite quando nao ha share target; demais erros mapeiam para fallback recuperavel. Nao expor nomes/mensagens tecnicas da excecao ao usuario.
- Payload de share deve ter somente `title: "Mensagem preparada"` e `text: draftText`. O tipo nao deve aceitar `url` nesse caso de uso.
- Unidade de limite: Unicode code points, contados no frontend por `Array.from(text).length`, coerente com `mb_strlen` do backend para os casos suportados. `trim()` serve somente para detectar vazio; o texto bruto e preservado. Nao usar `Textarea.maxLength`, que conta UTF-16 code units; impedir a mudanca acima de 5000 sem truncar e cobrir emoji/caracteres combinantes em teste.
- Deteccao de revisao: fazer scan nao destrutivo do texto atual por `[contato pendente]` e `/{{\s*[^{}]+?\s*}}/u`; reconciliar/remover warnings resolvidos e nao bloquear `profile_needs_update` sem marcador textual.
- Cada operacao captura `{revision, text}`; o reducer aplica seu resultado somente se `revision === currentRevision`, evitando feedback stale quando o texto muda durante a Promise.
- O fallback manual deve reutilizar `Dialog` e `Textarea readOnly`, atribuir `aria-describedby`, focar/selecionar por `ref` ao abrir, permitir `Tentar copiar novamente` e, no sucesso, fechar, limpar duplicata em memoria e restaurar foco ao acionador.
- Manter TypeScript strict, imports `@/*`, named exports nos helpers da feature, estado local por feature e nenhuma dependencia nova.

### Compliance de arquitetura

- O handoff acontece no frontend com conteudo ja preparado, conforme ADR-05; nao e integracao nativa nem capacidade de dominio no Laravel.
- `src/features/communications/message-handoff.ts`: adaptadores browser injetaveis, reducer/transicoes puras e tipos especificos da feature, sem JSX e sem dependencias de Finance.
- `src/components/operational/communication-message-handoff-actions.tsx`: composicao de negocio/UX usando primitives existentes.
- `src/components/ui` permanece apenas para primitives domain-agnostic; nao criar novo primitive para esta story.
- Estado continua local ao compositor/feature; nao introduzir store global, context provider ou persistencia client-side.
- Browser nao chama Laravel diretamente e esta story nao adiciona chamada BFF. Os contratos e controles de tenant/role existentes continuam inalterados.
- `AreaGuard` permanece UX defensiva; as policies/abilities ja aplicadas na preparacao continuam sendo a autoridade sobre os dados que originam o rascunho.
- Naming visivel deve ser operacional e pastoral. Evitar `dashboard`, `widget`, `KPI`, `performance`, `BI`, `send`, `delivered` ou termos que prometam automacao.
- Manter `Referrer-Policy: no-referrer` ja configurado; nao enfraquecer headers para acomodar compartilhamento.

### Requisitos de bibliotecas e frameworks

- Nao instalar bibliotecas de clipboard, share, toast, state management ou WhatsApp. As APIs nativas e primitives atuais cobrem o requisito.
- Manter o componente de acoes como client component e nao acessar `window`/`navigator` durante render server-side.
- Efeitos React sao permitidos para foco/selecao/restauracao do dialog; nunca para iniciar copy/share. Recalculo de elegibilidade deve ocorrer no handler/reducer de edicao, nao por efeito que possa disparar handoff.
- `Button`, `Dialog` e `Textarea` existentes sao obrigatorios; manter tokens e direcao visual `Teal Operacional`.
- Os adaptadores da feature devem ser injetaveis/testaveis com objetos navigator/environment-like, evitando depender de globals em testes puros.
- Nao alterar versions/lockfiles. Se uma vulnerabilidade for detectada no gate de seguranca, registrar finding e tratar conforme decisao do auditor.

### Requisitos de estrutura de arquivos

- Nao mover `CommunicationMessageComposer`; extrair somente as acoes para impedir crescimento adicional do componente de aproximadamente 430 linhas.
- Manter contratos de draft em `src/features/communications/message-draft.ts`; nao misturar Clipboard/Web Share nesse normalizador.
- Nao importar, mover ou reexportar helpers de `features/finance`; a correcao/unificacao do precedente financeiro fica fora desta story para limitar blast radius.
- Testes novos ficam em `church-erp-web/tests` e seguem `.test.mjs` + loader de alias existente.
- Nao criar arquivo backend, BFF route, migration ou fixture para esta story.

### Requisitos de teste

- Funcoes puras: vazio usa `trim()` apenas para elegibilidade; limite usa code points do valor bruto; cobrir acentos, emoji surrogate pair e caracteres combinantes sem truncar texto/quebras de linha; payload contem somente as properties `title`/`text`.
- Clipboard: contexto seguro + API disponivel + sucesso; contexto inseguro; API ausente; `writeText` rejeitado. Provar que o texto enviado e exatamente a ultima edicao.
- Web Share: `share` ausente; `canShare` ausente/true/false/lancando; share resolve; `AbortError`; `NotAllowedError`/`InvalidStateError`/`TypeError` e erro generico.
- Confirmacao: `[contato pendente]`, placeholders originais e `{{...}}` inseridos manualmente pedem revisao; removidos deixam de bloquear/alertar; `profile_needs_update` sem placeholder nao bloqueia; o handler de `Continuar mesmo assim` chama share sem await anterior.
- State model: editar durante copy/share incrementa revisao e invalida resultado antigo; editar para vazio/over-limit/review-required produz o estado correto; double-click/busy nao cria duas operacoes.
- Source inspection fica restrita a boundaries estaticos: APIs apenas em handlers, nenhum effect/auto-handoff, nenhum fetch antes de share e ausencia de APIs proibidas. Nao declarar foco/selecao/preservacao runtime como provados por regex.
- Privacidade/limites: objeto de share nao possui `url`/metadata, `location.href` nao e alterado, e nao aparecem `wa.me`, `api.whatsapp.com`, `window.open`, `execCommand`, storage, analytics, console, HTML/rich text ou mutation. O teste aceita PII intencional dentro de `text`.
- Continuidade automatizada via reducer/transicoes: sucesso, cancelamento/falha e resultados obsoletos nao limpam compositor nem sobrescrevem revisao nova; nao ha auto-POST ao retornar.
- Validacao manual documentada: foco inicial, selecao, focus trap/restoration, retry que fecha/limpa dialog, teclado, leitor de tela, layout responsivo, double-click e edicao durante Promise pendente.
- Regressao: testes de drafts/templates/BFF das Stories 5.1-5.3 continuam verdes; Finance nao e alterado por esta story.
- Comandos minimos:
  - `cd church-erp-web && node --test --loader ./tests/node-alias-loader.mjs tests/communication-message-handoff.test.mjs tests/communication-message-drafts.test.mjs tests/communication-templates.test.mjs tests/bff-smoke.test.mjs`
  - `cd church-erp-web && npm test`
  - `cd church-erp-web && npm run lint`
  - `cd church-erp-web && npm run typecheck`
  - `cd church-erp-web && npm run build:smoke`
- Backend focal opcional como prova de nao regressao do contrato, apesar de nenhum arquivo backend ser esperado: `cd church-erp-api && php artisan test tests/Feature/Communications/CommunicationMessageDraftTest.php tests/Unit/Communications/RenderCommunicationTemplateBodyTest.php`.
- Baseline antes da implementacao: web focado atual 41/41 verde; backend focal atual 11 testes/242 assertions verdes. Warnings existentes do loader experimental/module typeless nao sao falha desta story.

### Licoes de stories ou reviews anteriores

- Story 3.3 oferece referencia util para Clipboard, Dialog e fallback, mas nao e um adaptador pronto para reuso: seu componente pode aguardar `prepareContent()` antes de share, `canShare()` pode lancar fora do `try`, retry de copia nao fecha necessariamente o dialog e `AbortError` e agrupado com retorno bem-sucedido. Nao copiar esses comportamentos nem alterar Finance nesta story.
- Nesta story, `AbortError` e estado neutro `share_cancelled_or_unavailable`, porque a especificacao tambem o usa quando nao ha targets; o CTA de copiar continua disponivel.
- Story 5.2 estabeleceu o `Textarea` como renderizacao textual segura, o limite de 5000 caracteres, o rascunho local e a proibicao de persistir/enviar. A Story 5.4 deve consumir esse resultado, nao alterar o endpoint ou reimplementar template rendering.
- O review da Story 5.2 reforcou auditoria metadata-only, deteccao ampla de placeholders e cobertura de roles. Esta story nao deve criar auditoria de corpo nem inferir que handoff equivale a envio.
- Story 5.3 estabeleceu deep link seguro, `Referrer-Policy: no-referrer`, ausencia de auto-POST e preservacao minimizada de PII. O review corrigiu justamente cobertura insuficiente de no-auto-POST, recuperacao com PII, parser de cookie e pessoa contextual fora dos 25 primeiros.
- O `person_id` pode existir na URL atual. Por isso o share payload nunca pode carregar `url`/`window.location`, mesmo que exemplos genericos da Web Share API mostrem esse campo.
- A mensagem editada e o dado mais recente. Usar `draft.data.draft.message_body` em vez de `draftText`, ou aplicar resultado de uma revisao assincorna antiga, repetiria erro de estado stale.
- Testes web usam `node:test`; o state model/adaptadores devem ser puros para cobertura real. Source inspection cobre somente boundaries estaticos. Sem harness DOM instalado, foco, selecao, trap/restoration, responsividade e leitor de tela sao gates manuais explicitamente registrados.

### Git intelligence

- Os cinco commits mais recentes sao os merges/implementacoes das Stories 5.3, 5.2 e 5.1 (`06a5d60`, `0d74a97`, `5f4328f`, `227aacb`, `c0de583`). Eles confirmam o padrao: contratos/helpers em `src/features`, composicoes em `src/components/operational`, primitives existentes e testes `.test.mjs`.
- A Story 5.3 alterou `communication-message-composer.tsx`, `message-draft.ts`, testes de drafts/BFF e configuracao de referrer. A Story 5.4 deve construir sobre esses arquivos, sem reabrir backend ou tenancy.
- A Story 5.2 criou o endpoint e normalizador de draft; a Story 5.1 criou templates. Nenhum commit recente sugere uma camada de envio ou persistencia de comunicacao, portanto cria-la aqui seria arquitetura paralela.
- A Story 3.3, embora fora dos cinco commits mais recentes, e referencia direta de copy/share, mas seus arquivos nao fazem parte do diff desta story; extracao/unificacao futura deve entrar por prerequisite tecnico separado.

### Informacoes tecnicas atuais

- Clipboard `writeText()` retorna Promise, exige secure context e pode rejeitar com `NotAllowedError`; feature detection e fallback manual sao obrigatorios. Fonte: [MDN Clipboard.writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) e [W3C Clipboard API](https://www.w3.org/TR/clipboard-apis/).
- Web Share tem disponibilidade limitada, exige transient activation e pode rejeitar por cancelamento, falta de targets, policy ou estado invalido. Fonte: [MDN Navigator.share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) e [W3C Web Share API](https://www.w3.org/TR/web-share/).
- `navigator.canShare()` pode nao existir e serve para validar o payload; sua ausencia nao significa que `navigator.share({title, text})` esteja indisponivel. Fonte: [MDN Navigator.canShare](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare).
- O retorno resolvido de Web Share representa handoff ao mecanismo/target do sistema operacional, nao confirmacao de entrega no WhatsApp. `AbortError` pode indicar cancelamento ou falta de targets; a copy da UI deve refletir ambas as limitacoes.
- O projeto ja usa APIs browser sem dependencia externa. Nao ha ganho em adicionar pacote; a implementacao focada de Communications evita ampliar o blast radius para Finance.

### Project Structure Notes

- Alinhamento: Epic 5 ja esta em `src/features/communications`, `/app/communications` e `src/components/operational`; as acoes propostas seguem exatamente essa divisao.
- O compositor existente ja possui aproximadamente 430 linhas. Extrair a UI de handoff em componente proprio preserva coesao e reduz risco de tornar o compositor um componente monolitico.
- Helpers com nomes financeiros permanecem em `features/finance`; nao importa-los nem move-los nesta story. A feature de Communications recebe adaptadores proprios porque exige semantica diferente de ativacao, `canShare`, cancelamento, revisao do texto e lacunas.
- O `project-context.md` lista Next 16.2.3, enquanto `church-erp-web/package.json` usa `^16.3.7`; usar o manifesto instalado e nao editar o contexto apenas por causa desta story.
- Copys existentes `Handoff externo futuro` e `Camada futura...` ficaram obsoletas depois desta entrega; atualiza-las e parte da consistencia, mas nao alterar estrutura de navegacao ou permissao.
- Nenhum conflito requer backend. Se a implementacao tocar `church-erp-api`, o dev deve justificar diretamente contra um AC antes de prosseguir.

### Threat Model - fronteira de egress

- **Spoofing/Elevation:** somente `secretary`/`administrator` chegam ao draft via guards/policies existentes; o handoff nao cria novo canal de autorizacao.
- **Tampering:** copiar/partilhar exatamente o snapshot de `draftText` evita substituir silenciosamente a edicao; `draftRevision` impede sucesso stale e scan atual cobre marcadores inseridos depois da geracao.
- **Repudiation:** nao afirmar nem auditar entrega que o browser nao consegue provar. O produto registra apenas o que sabe: copia ou abertura/cancelamento do handoff na UI local.
- **Information disclosure:** texto, que pode conter PII intencional, sai somente por gesto explicito; nao ha properties extras com URL/IDs/metadados nem persistencia/log/analytics controlados pela aplicacao. Clipboard/SO/app externo sao fronteira fora do controle apos consentimento.
- **Denial of service:** browser sem permissao/suporte continua funcional por fallback manual; botoes bloqueiam concorrencia enquanto uma acao esta em progresso.
- **Boundary:** browser -> clipboard/share sheet do sistema operacional. Depois do handoff, o canal externo fica fora da confianca e observabilidade do ERP.

### References

- `_bmad-output/planning-artifacts/epics.md` - `Epic 5` e `Story 5.4` (story, ACs oficiais, FR27 e constraints frontend).
- `_bmad-output/planning-artifacts/prd.md` - `8.5 Comunicacoes`, `FR-7 Preparacao de Comunicacao`, NFR-2, NFR-5, NFR-6 e NFR-8.
- `_bmad-output/planning-artifacts/architecture.md` - ADR-05, `State Management Patterns`, mapeamento do Epic 5 e `External Integrations`.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - `CommunicationPendingBlock`, `Button Hierarchy`, `Feedback Patterns`, `Navigation Patterns`, `Responsive Design & Accessibility`.
- `_bmad-output/project-context.md` - stack, framework rules, testing rules e critical don't-miss rules.
- `_bmad-output/implementation-artifacts/5-2-preparar-mensagem-a-partir-de-dados-de-pessoas.md` - contrato textual/local do draft, limite de 5000 e ausencia de envio/persistencia.
- `_bmad-output/implementation-artifacts/5-3-acionar-pendencia-pronta-para-comunicacao.md` - deep link seguro, no-auto-POST, referrer, minimizacao e side effects proibidos.
- `church-erp-web/src/components/operational/communication-message-composer.tsx` - estado `draftText` e `Textarea` atuais.
- `church-erp-web/src/features/communications/message-draft.ts` - tipos, normalizador, estados e `missing_fields`.
- `church-erp-web/src/features/finance/closing-summary-handoff.ts` e `src/components/operational/closing-summary-handoff-actions.tsx` - referencia de UX/fallback e pitfalls conhecidos; nao alterar/reutilizar diretamente nesta story.
- `church-erp-api/app/Domain/Communications/Support/RenderCommunicationTemplateBody.php` - limite de 5000 e placeholders desconhecidos.
- `church-erp-web/package.json` - versions e comandos web instalados.
- [MDN Clipboard.writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText), [W3C Clipboard API](https://www.w3.org/TR/clipboard-apis/), [MDN Navigator.share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share), [MDN Navigator.canShare](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare), [W3C Web Share API](https://www.w3.org/TR/web-share/).

### Checklist pre-review

- [x] `/bmad-review-security` foi executado antes de codigo de produto; relatorio/revisao analisada, auditor, data, severidades e disposicoes estao referenciados no `Security Sign-off`, sem Critical/High aberto ou com aceite nao autorizado.
- [x] `Copiar mensagem` e `Partilhar mensagem` usam exatamente o `draftText` atual; edicoes manuais e quebras de linha chegam intactas.
- [x] Vazio usa `trim()` apenas para elegibilidade; limite bruto usa Unicode code points, cobre emoji/combinantes e nunca trunca silenciosamente.
- [x] Marcadores atuais `[contato pendente]`/`{{...}}`, inclusive inseridos manualmente, exigem confirmacao; removidos deixam de bloquear e de aparecer como warning stale.
- [x] Clipboard so e usado em secure context e possui fallback manual focado/selecionado; retry bem-sucedido fecha/limpa dialog e restaura foco.
- [x] Web Share e invocado diretamente no clique ou no novo clique `Continuar mesmo assim`, sem `await`/fetch anterior; `canShare` ausente/false/erro, `AbortError` ambiguo e demais falhas estao cobertos.
- [x] Falha de share nao dispara Clipboard automaticamente; cada tentativa de copiar requer gesto explicito.
- [x] Payload de share contem somente as properties `title` e `text`; URL/query/IDs/tenant nao aparecem fora do `text`, que pode conter PII intencional.
- [x] Nenhum texto afirma envio/entrega/leitura. Sucesso, cancelamento e indisponibilidade possuem copys honestas e proximos passos.
- [x] `draftRevision` descarta resultado obsoleto; editar durante/depois da operacao recalcula ready, vazio, over-limit ou review-required sem limpar contexto.
- [x] Copy/share/cancel/error preservam rascunho, modelo, pessoa, busca e a query same-origin existente sem cria-la/propaga-la externamente.
- [x] Nao ha auto-copy/share, novo request, endpoint, mutation, persistence ou storage/cache/log/analytics controlado pela aplicacao, deep link WhatsApp ou side effect em pessoa/pendencia.
- [x] UI continua textual, sem HTML/markdown/rich text/iframe/`dangerouslySetInnerHTML`.
- [x] `Button`, `Dialog`, `Textarea`, Tailwind e tokens existentes foram reutilizados; nenhuma dependencia/UI paralela foi adicionada.
- [x] Desktop/tablet/mobile, teclado, foco/selecao/trap/restoration, retry, double-click, edicao durante Promise, alvos 44x44 e leitor de tela foram revisados manualmente e registrados no Dev Agent Record.
- [x] Testes focados, `npm test`, lint, typecheck e `build:smoke` passaram; source inspection foi usada somente para boundaries estaticos.
- [x] Diff final nao contem arquivo backend, Finance, BFF route, manifest/lockfile ou configuracao alterada sem justificativa direta de AC.
- [x] Promocao STG/PROD continua exigindo `bash deploy/security-gate.sh stg|prod` em ambiente com `pre-commit` ou `detect-secrets-hook`; ausencia bloqueia promocao, nao dev/local.

### Security Sign-off

- Status: Approved with Security Notes - gate concluido antes de codigo de produto.
- Auditor: Vex - Security Auditor.
- Data: 2026-10-06.
- Relatorio/artefato: `_bmad-output/implementation-artifacts/security-reviews/5-4-security-review.md`.
- Revisao/commit analisado: `06a5d60c2c86a7b18e0f0a181c0210e67d25b0bf` + story 5.4 ainda nao versionada.
- Findings incorporados: SEC-H-001 (`sharp <0.35.5`) e SEC-H-002 (`source-map-js <1.2.2`).
- Findings Critical/High abertos: nenhum.
- Disposicao dos demais findings: SEC-H-001 corrigido com `sharp 0.35.5`; SEC-H-002 corrigido com `source-map-js 1.2.2`; nenhum finding Medium/Low material.

### Story Completion Status

- Status final: `done`.
- Nota de conclusao: implementacao frontend-only concluida com gate de seguranca, testes e validacao em browser real.
- Escopo validado em 2026-10-05: frontend-only, com Clipboard/Web Share progressivos, fallback manual e nenhuma integracao nativa.
- Revisao adversarial de 2026-10-05: 16 achados Critical/High/Medium incorporados ao contexto da story; nenhuma alteracao de codigo de produto foi realizada.

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Implementation Plan

- Executar primeiro o gate adversarial de seguranca e eliminar qualquer finding Critical/High.
- Implementar adaptadores e transicoes puras em TDD, mantendo payload e fronteira de egress estritos.
- Compor a UI com primitives existentes, integrar ao `draftText` atual e validar acessibilidade/concorrencia em Chrome real.
- Rodar regressao completa, qualidade, build, SCA e diff final antes de mover a story para review.

### Debug Log References

- 2026-10-06: gate `/bmad-review-security` em `_bmad-output/implementation-artifacts/security-reviews/5-4-security-review.md`; SCA runtime inicial detectou dois High, ambos corrigidos e revalidados com zero vulnerabilidades.
- 2026-10-06: RED confirmado com `ERR_MODULE_NOT_FOUND` para `message-handoff.ts`; suite focada ficou verde apos helpers, componente e integracao.
- 2026-10-06: Chrome real via CDP validou 9 grupos: breakpoints 375/700/768/1280, alvos 44x44, teclado, foco inicial, trap/restoration, selecao, arvore de acessibilidade, retry, ativacao transitoria, double-click e edicao durante Promise pendente.
- 2026-10-06: a validacao real encontrou restauracao de foco incorreta apos retry; corrigida com `onCloseAutoFocus` e revalidada.
- 2026-10-06: gates finais: web focado 50/50, web completa 107/107, backend focal 11 testes/242 assertions, lint, typecheck, build smoke, `npm audit --omit=dev` e `composer audit` verdes.
- 2026-10-06: code review corrigiu cinco achados: respostas de draft obsoletas por troca de pessoa, handoff de draft stale apos busca, divergencia entre transicao testada e producao, prova do caminho sincrono de Web Share e semantica de alerta dos estados bloqueados.
- 2026-10-06: pos-review validado com web focado 52/52, web completa 109/109, lint, typecheck, build smoke, `npm audit --omit=dev`, backend focal 11 testes/242 assertions e `composer audit` verdes.

### Completion Notes List

- Gate de seguranca concluido antes do codigo de produto. `npm audit --omit=dev` e `composer audit` verdes; nenhum Critical/High aberto.
- Helpers injetaveis cobrem Clipboard seguro/indisponivel/rejeitado e Web Share ausente, `canShare` ausente/false/erro, sucesso, `AbortError` e demais falhas.
- Elegibilidade usa code points Unicode, preserva texto bruto, reconcilia marcadores atuais e descarta resultados de revisoes obsoletas.
- Acoes acessiveis oferecem confirmacao consciente, fallback manual focado/selecionado, retry, foco restaurado, feedback honesto e bloqueio de concorrencia.
- Integracao usa somente `composer.draftText`, mantem todo o contexto do compositor e nao adiciona backend, BFF, Finance, persistencia ou envio automatico.
- Validacao responsiva/assistiva executada em Chrome real; arvore de acessibilidade confirmou nomes/roles, e os fluxos por teclado/foco foram exercitados sem depender de source inspection.
- Review adversarial final eliminou egress de rascunho associado a contexto de pessoa obsoleto, passou a aplicar somente respostas da requisicao corrente e restringiu as acoes aos estados de draft permitidos.
- O mesmo orquestrador de resultado stale e de partilha sincrona agora e usado pela producao e pelos testes; estados bloqueados usam anuncio de alerta.

### File List

- `_bmad-output/implementation-artifacts/security-reviews/5-4-security-review.md`
- `_bmad-output/implementation-artifacts/5-4-fazer-handoff-externo-por-copiar-ou-partilhar.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `church-erp-web/package.json`
- `church-erp-web/package-lock.json`
- `church-erp-web/src/components/operational/communication-message-handoff-actions.tsx`
- `church-erp-web/src/components/operational/communication-message-composer.tsx`
- `church-erp-web/src/features/app-shell/navigation-policy.js`
- `church-erp-web/src/features/communications/communication-template.ts`
- `church-erp-web/src/features/communications/message-handoff.ts`
- `church-erp-web/tests/bff-smoke.test.mjs`
- `church-erp-web/tests/communication-message-drafts.test.mjs`
- `church-erp-web/tests/communication-message-handoff.test.mjs`
- `church-erp-web/tests/communication-templates.test.mjs`

## Change Log

- 2026-10-06: implementado handoff externo por copia/partilha, fallback manual acessivel, protecao contra resultados stale, testes de risco e remediacao das dependencias runtime encontradas no gate de seguranca.
- 2026-10-06: code review concluido; cinco achados High/Medium/Low corrigidos, testes ampliados e story promovida para done.
