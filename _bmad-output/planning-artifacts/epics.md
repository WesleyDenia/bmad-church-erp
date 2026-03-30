---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/planning-artifacts/prd.md
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/planning-artifacts/ux-design-specification.md
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/planning-artifacts/architecture.md
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/planning-artifacts/mvp-scope.md
---

# curso-bmad - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for curso-bmad, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: O sistema deve suportar autenticacao de usuarios com permissoes basicas por perfil de tesoureiro, secretaria e lideranca.
FR2: O sistema deve restringir acesso a dados financeiros e pessoais conforme o perfil do usuario.
FR3: O sistema deve suportar isolamento multi-tenant por igreja desde a fundacao da aplicacao.
FR4: O sistema deve permitir criar e gerir o perfil da igreja para inicializar a operacao.
FR5: O sistema deve disponibilizar categorias minimas para iniciar a operacao financeira e de pessoas com defaults enxutos.
FR6: O sistema deve permitir registrar receitas e despesas com fluxo curto e com o minimo de dados obrigatorios.
FR7: O sistema deve exigir no lancamento financeiro os campos tipo, valor, subtipo, contraparte e centro de custo.
FR8: O sistema deve permitir criacao inline de contrapartes ausentes durante o lancamento financeiro.
FR9: O sistema deve confirmar com clareza o salvamento de um lancamento financeiro.
FR10: O sistema deve permitir editar lancamentos financeiros existentes.
FR11: O sistema deve exigir motivo ao alterar um lancamento financeiro salvo.
FR12: O sistema deve preservar historico visivel e auditavel das alteracoes financeiras.
FR13: O sistema deve sinalizar itens financeiros incomuns ou incompletos para revisao.
FR14: O sistema deve gerar um resumo de fechamento imediatamente apos a operacao financeira.
FR15: O resumo de fechamento deve exibir receitas, despesas, resultado liquido, quebra por centro de custo e quebra por categoria ou subtipo.
FR16: O sistema deve permitir exportar ou compartilhar o resumo de fechamento com a lideranca.
FR17: O sistema deve permitir criar e editar registos de membros.
FR18: O sistema deve permitir criar e editar registos de visitantes.
FR19: O sistema deve armazenar status e informacoes essenciais de contacto para membros e visitantes.
FR20: O sistema deve suportar pesquisa e filtros por nome, estado e atributos basicos nas listas de pessoas.
FR21: O sistema deve fornecer home operacional especifica para o tesoureiro com acoes diretas, lancamentos recentes, pendencias e acesso ao fechamento.
FR22: O sistema deve fornecer home operacional especifica para a secretaria com pendencias por dominio, atalhos e checklist semanal.
FR23: O sistema deve expor pendencias operacionais por perfil e por dominio de trabalho.
FR24: O sistema deve permitir navegacao direta do cartao de pendencia para a fila ou fluxo de resolucao correspondente.
FR25: O sistema deve oferecer modelos pre-definidos de comunicacao.
FR26: O sistema deve permitir preparar comunicacoes a partir dos dados de membros e visitantes.
FR27: O sistema deve suportar handoff para WhatsApp e canais externos via copiar ou partilhar, sem automacao nativa.
FR28: O sistema deve fornecer uma visao resumida para lideranca com estado financeiro e operacional sem sobrecarga de detalhe.
FR29: O sistema deve manter padrao transversal de validacao, mensagens, feedback e confirmacoes operacionais.

### NonFunctional Requirements

NFR1: O produto deve parecer responsivo nos fluxos centrais em desktop e mobile.
NFR2: O produto deve usar linguagem clara, acolhedora, pastoral e nao corporativa.
NFR3: O produto deve tornar acoes destrutivas ou sensiveis compreensiveis e reversiveis.
NFR4: O produto deve manter auditabilidade forte para edicoes financeiras sensiveis.
NFR5: O produto deve tratar com seguranca dados pessoais e financeiros.
NFR6: O produto deve ser confiavel durante fluxos semanais criticos, especialmente em janelas de domingo e pos-culto.
NFR7: A primeira sessao deve levar o usuario rapidamente ao primeiro valor com configuracao minima.
NFR8: As homes devem ser orientadas por missao e por acao, nao por navegacao labirintica de modulos.
NFR9: Formularios devem ser curtos, tolerantes a erro e usar progressive disclosure para campos avancados.
NFR10: Validacoes e erros devem ser explicados em linguagem simples.
NFR11: Os fluxos centrais devem ter areas de toque amplas, alto contraste, tipografia legivel e suporte a teclado.
NFR12: A arquitetura deve permitir evolucao progressiva do dominio sem refactor estrutural precoce.

### Additional Requirements

- O isolamento por igreja deve ser uma regra fundacional da solucao e impacta autenticacao, autorizacao, persistencia e consultas.
- A aplicacao deve nascer organizada por dominios de negocio claros: Identity and Access, Finance, People, Operational Inbox e Communications Support.
- Auditabilidade deve fazer parte do modelo de dominio financeiro, nao apenas de logging tecnico.
- O dashboard de pendencias deve ser tratado como capacidade central de retencao, nao apenas camada visual.
- O handoff para WhatsApp deve permanecer desacoplado e simples no MVP, evitando integracoes profundas.
- O sistema deve aplicar padroes comuns para feedback, erros, confirmacoes e estados de revisao em todos os modulos.
- Devem existir restricoes claras de acesso para dados financeiros e pessoais, incluindo explicacao compreensivel quando um acesso for bloqueado.
- A UX exige componentes prioritarios como cartoes de home por perfil, formulario de lancamento rapido, cartoes de pendencias, banners de revisao, bloco de resumo, lista pesquisavel de pessoas, compositor de mensagens e painel de auditoria.
- O fluxo hero do MVP prioriza tesoureiro registrar entradas e saidas, corrigir erros com seguranca, gerar fechamento instantaneo e compartilhar com a lideranca.
- O escopo MVP nao inclui folha de pagamento, suite contabil completa, multi-campus, automacao nativa de WhatsApp, analytics avancados ou governanca avancada de permissoes.

### FR Coverage Map

FR1: Epic 1 - autenticacao e perfis basicos
FR2: Epic 1 - restricao de acesso por perfil
FR3: Epic 1 - isolamento multi-tenant por igreja
FR4: Epic 1 - perfil da igreja
FR5: Epic 1 - configuracao minima inicial
FR6: Epic 2 - lancamento rapido de receitas e despesas
FR7: Epic 2 - campos obrigatorios do lancamento financeiro
FR8: Epic 2 - criacao inline de contraparte
FR9: Epic 2 - confirmacao clara de salvamento
FR10: Epic 2 - edicao de lancamento
FR11: Epic 2 - motivo obrigatorio na alteracao
FR12: Epic 2 - historico e auditoria de alteracoes
FR13: Epic 2 - sinalizacao de itens para revisao
FR14: Epic 3 - resumo de fechamento imediato
FR15: Epic 3 - detalhamento do fechamento por categorias e centros de custo
FR16: Epic 3 - exportacao e compartilhamento do resumo
FR17: Epic 4 - cadastro e edicao de membros
FR18: Epic 4 - cadastro e edicao de visitantes
FR19: Epic 4 - status e informacoes essenciais de contacto
FR20: Epic 4 - busca e filtros de pessoas
FR21: Epic 2 - home operacional do tesoureiro com acoes e pendencias
FR22: Epic 4 - home operacional da secretaria com pendencias e atalhos
FR23: Epic 2, Epic 4 e Epic 5 - pendencias divididas por dominio
- FR23a: Epic 2 - pendencias financeiras do tesoureiro
- FR23b: Epic 4 - pendencias operacionais de pessoas e rotina da secretaria
- FR23c: Epic 5 - pendencias prontas para acao de comunicacao
FR24: Epic 2, Epic 4 e Epic 5 - navegacao direta da pendencia para resolucao
- FR24a: Epic 2 - abrir revisao ou correcao financeira a partir da pendencia
- FR24b: Epic 4 - abrir ficha, fila ou checklist da secretaria a partir da pendencia
- FR24c: Epic 5 - abrir preparacao de comunicacao a partir da pendencia
FR25: Epic 5 - modelos pre-definidos de comunicacao
FR26: Epic 5 - preparacao de mensagens com dados existentes
FR27: Epic 5 - handoff para WhatsApp e canais externos
FR28: Epic 3 - visao resumida para lideranca
FR29: Epic 1, Epic 2, Epic 3, Epic 4 e Epic 5 - padrao transversal de validacao, feedback e confirmacoes

## Epic List

### Epic 1: Fundacao da Igreja e Acesso Seguro
Permitir que a igreja entre no sistema com isolamento por tenant, perfis basicos de acesso e configuracao minima suficiente para iniciar a operacao com seguranca.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR29

### Epic 2: Operacao Financeira Semanal do Tesoureiro
Permitir que o tesoureiro use sua home operacional para registrar receitas e despesas rapidamente, revisar pendencias financeiras, corrigir com seguranca e manter confianca operacional no fluxo pos-culto.
**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR21, FR23a, FR24a, FR29

### Epic 3: Fechamento e Visibilidade para Lideranca
Permitir gerar fechamento financeiro imediato, revisar o periodo e compartilhar uma visao clara para a lideranca sem sobrecarga operacional.
**FRs covered:** FR14, FR15, FR16, FR28, FR29

### Epic 4: Base de Pessoas e Rotina da Secretaria
Permitir que a secretaria use sua home operacional para manter membros e visitantes com baixa friccao, resolver pendencias de pessoas e executar a rotina semanal a partir de filas acionaveis.
**FRs covered:** FR17, FR18, FR19, FR20, FR22, FR23b, FR24b, FR29

### Epic 5: Comunicacao Operacional e Handoff Externo
Permitir preparar comunicacoes reutilizando dados existentes e concluir o handoff para canais externos sem exigir integracoes profundas no MVP.
**FRs covered:** FR23c, FR24c, FR25, FR26, FR27, FR29

## Epic 1: Fundacao da Igreja e Acesso Seguro

Permitir que a igreja entre no sistema com isolamento por tenant, perfis basicos de acesso e configuracao minima suficiente para iniciar a operacao com seguranca.

### Story 1.1: Criar igreja e conta administradora inicial

As a responsavel pela implantacao da igreja,
I want criar o perfil inicial da igreja junto com a conta administradora,
So that eu possa iniciar o uso do sistema sem depender de configuracao externa.

**Acceptance Criteria:**

**Given** que ainda nao existe uma igreja cadastrada para aquele contexto de onboarding
**When** o usuario informa os dados minimos da igreja e da conta inicial
**Then** o sistema cria a igreja e associa a conta administradora ao tenant correto
**And** apresenta confirmacao clara de sucesso

**Given** que campos obrigatorios nao foram preenchidos
**When** o usuario tenta concluir o onboarding
**Then** o sistema impede a finalizacao
**And** explica os erros em linguagem simples

### Story 1.2: Autenticar usuario e aplicar contexto da igreja

As a usuario autenticado,
I want entrar no sistema com meu contexto de igreja aplicado automaticamente,
So that eu veja apenas os dados da minha organizacao.

**Acceptance Criteria:**

**Given** que o usuario possui credenciais validas
**When** realiza login
**Then** o sistema autentica a sessao e aplica o tenant da igreja associado ao usuario
**And** redireciona para a home adequada ao perfil

**Given** que as credenciais sao invalidas
**When** o usuario tenta autenticar
**Then** o sistema nega o acesso
**And** informa a falha sem expor detalhes sensiveis

### Story 1.3: Controlar permissao basica por perfil

As a lider de implantacao do produto,
I want que tesoureiro, secretaria e lideranca tenham acessos coerentes com seu papel,
So that dados financeiros e pessoais fiquem protegidos desde o MVP.

**Acceptance Criteria:**

**Given** que um usuario autenticado acessa uma area permitida ao seu perfil
**When** abre a funcionalidade correspondente
**Then** o sistema libera o acesso normalmente
**And** mantem o contexto do tenant

**Given** que um usuario tenta acessar funcionalidade fora da sua permissao
**When** a requisicao e feita
**Then** o sistema bloqueia o acesso
**And** apresenta mensagem compreensivel explicando a restricao

### Story 1.4: Configurar categorias minimas iniciais

As a administradora da igreja,
I want iniciar a operacao com categorias financeiras e de pessoas predefinidas,
So that eu consiga gerar valor rapido sem configuracao extensa.

**Acceptance Criteria:**

**Given** que uma nova igreja foi criada
**When** o ambiente inicial e provisionado
**Then** o sistema registra categorias minimas necessarias para financas e pessoas
**And** essas categorias ficam disponiveis apenas no tenant da igreja

**Given** que a igreja acessa o sistema pela primeira vez
**When** o usuario entra em um fluxo que depende dessas categorias
**Then** o sistema oferece os defaults iniciais sem exigir cadastro manual previo
**And** mantem possibilidade de evolucao futura sem refactor estrutural

## Epic 2: Operacao Financeira Semanal do Tesoureiro

Permitir que o tesoureiro use sua home operacional para registrar receitas e despesas rapidamente, revisar pendencias financeiras, corrigir com seguranca e manter confianca operacional no fluxo pos-culto.

### Story 2.1: Exibir home operacional do tesoureiro

As a tesoureiro,
I want abrir uma home com acoes financeiras principais e pendencias financeiras abertas,
So that eu saiba imediatamente por onde comecar o fechamento semanal.

**Acceptance Criteria:**

**Given** que um usuario com perfil de tesoureiro autenticado entra no sistema
**When** acessa a tela inicial
**Then** o sistema exibe a home do tesoureiro com atalhos para novo lancamento, revisao e fechamento
**And** mostra apenas dados do tenant atual

**Given** que existem pendencias financeiras abertas
**When** a home e carregada
**Then** o sistema apresenta os cartoes de pendencia com contagem e contexto suficiente
**And** exibe os itens em ordem simples definida pelo sistema

### Story 2.2: Registrar receita ou despesa com campos minimos

As a tesoureiro,
I want registrar receita ou despesa com um formulario curto,
So that eu conclua o lancamento em poucos passos apos o culto.

**Acceptance Criteria:**

**Given** que o tesoureiro inicia um novo lancamento
**When** informa tipo, valor, subtipo, contraparte e centro de custo validos
**Then** o sistema salva o lancamento no tenant correto
**And** confirma o salvamento com clareza

**Given** que algum campo obrigatorio esta ausente ou invalido
**When** o tesoureiro tenta salvar
**Then** o sistema nao conclui o lancamento
**And** explica quais campos precisam de correcao em linguagem simples

### Story 2.3: Criar contraparte inline durante o lancamento

As a tesoureiro,
I want cadastrar uma contraparte sem sair do fluxo de lancamento,
So that eu nao perca ritmo quando encontro um registro ausente.

**Acceptance Criteria:**

**Given** que a contraparte informada ainda nao existe
**When** o tesoureiro escolhe cria-la no proprio formulario
**Then** o sistema cadastra a contraparte com os dados minimos exigidos
**And** retorna ao lancamento com a contraparte ja selecionada

**Given** que os dados minimos da contraparte nao sao informados
**When** o tesoureiro tenta concluir a criacao inline
**Then** o sistema impede a criacao
**And** preserva o restante do formulario de lancamento sem perda de dados

### Story 2.4: Editar lancamento com motivo e trilha de auditoria

As a tesoureiro,
I want corrigir um lancamento salvo informando o motivo da alteracao,
So that eu mantenha seguranca e prestacao de contas confiavel.

**Acceptance Criteria:**

**Given** que existe um lancamento financeiro salvo
**When** o tesoureiro altera qualquer dado relevante e informa o motivo
**Then** o sistema salva a nova versao do lancamento
**And** registra o motivo, usuario, horario e valores alterados na trilha de auditoria

**Given** que o tesoureiro tenta salvar uma alteracao sem motivo
**When** confirma a edicao
**Then** o sistema bloqueia a atualizacao
**And** informa que o motivo e obrigatorio para alteracoes financeiras

### Story 2.5: Sinalizar e resolver pendencias financeiras

As a tesoureiro,
I want visualizar pendencias financeiras e entrar diretamente no fluxo de revisao,
So that eu resolva excecoes antes de gerar o fechamento.

**Acceptance Criteria:**

**Given** que existem lancamentos com campos obrigatorios faltantes, edicoes recentes que exigem revisao ou inconsistencias basicas definidas pelo MVP
**When** a home do tesoureiro e carregada
**Then** o sistema gera pendencias financeiras acionaveis
**And** diferencia claramente itens que precisam de revisao

**Given** que o tesoureiro seleciona uma pendencia financeira
**When** aciona o cartao correspondente
**Then** o sistema abre diretamente o fluxo de revisao ou correcao aplicavel
**And** permite retornar a home apos resolver o item

## Epic 3: Fechamento e Visibilidade para Lideranca

Permitir gerar fechamento financeiro imediato, revisar o periodo e compartilhar uma visao clara para a lideranca sem sobrecarga operacional.

### Story 3.1: Gerar resumo de fechamento do periodo

As a tesoureiro,
I want gerar um resumo de fechamento com um clique,
So that eu conclua a prestacao de contas do periodo sem montar relatorios manualmente.

**Acceptance Criteria:**

**Given** que existem lancamentos validos no periodo selecionado
**When** o tesoureiro solicita o fechamento
**Then** o sistema gera o resumo imediatamente
**And** apresenta receitas, despesas e resultado liquido do periodo

**Given** que nao existem lancamentos para o periodo
**When** o tesoureiro tenta gerar o fechamento
**Then** o sistema apresenta um estado vazio compreensivel
**And** orienta o proximo passo sem erro tecnico

### Story 3.2: Exibir detalhamento por centro de custo e subtipo

As a tesoureiro,
I want ver a quebra do fechamento por centro de custo e subtipo,
So that eu consiga explicar os totais com clareza para a lideranca.

**Acceptance Criteria:**

**Given** que o resumo de fechamento foi gerado
**When** o usuario abre o detalhamento do periodo
**Then** o sistema mostra a segmentacao por centro de custo e subtipo
**And** os totais detalhados batem com o resultado consolidado

**Given** que uma categoria nao possui movimentacao no periodo
**When** o detalhamento e exibido
**Then** o sistema nao polui a visualizacao com ruido desnecessario
**And** mantem foco nas informacoes relevantes

### Story 3.3: Compartilhar ou exportar o resumo de fechamento

As a tesoureiro,
I want exportar ou compartilhar o resumo de fechamento,
So that eu entregue a visibilidade necessaria para a lideranca no mesmo fluxo.

**Acceptance Criteria:**

**Given** que o resumo de fechamento esta disponivel
**When** o tesoureiro escolhe exportar ou compartilhar
**Then** o sistema gera uma saida simples do resumo em formato textual ou imprimivel do MVP
**And** preserva os dados consolidados exibidos na tela

**Given** que o usuario conclui a acao de compartilhamento
**When** retorna ao sistema
**Then** o sistema informa que a acao foi preparada com sucesso
**And** nao exige retrabalho para reencontrar o resumo

### Story 3.4: Exibir visao resumida para lideranca

As a lider da igreja,
I want acessar uma visao resumida do estado financeiro e operacional,
So that eu entenda a situacao atual sem entrar em detalhe operacional.

**Acceptance Criteria:**

**Given** que um usuario com perfil de lideranca acessa o sistema
**When** abre sua area de visibilidade
**Then** o sistema exibe um resumo claro do fechamento e do estado operacional
**And** evita expor controles de operacao diaria desnecessarios

**Given** que o perfil de lideranca nao possui permissao para detalhes sensiveis de edicao
**When** o usuario tenta aprofundar alem da visao prevista
**Then** o sistema restringe o acesso
**And** explica a limitacao de forma compreensivel

## Epic 4: Base de Pessoas e Rotina da Secretaria

Permitir que a secretaria use sua home operacional para manter membros e visitantes com baixa friccao, resolver pendencias de pessoas e executar a rotina semanal a partir de filas acionaveis.

### Story 4.1: Exibir home operacional da secretaria

As a secretaria da igreja,
I want abrir uma home com pendencias por categoria e atalhos principais da rotina,
So that eu consiga organizar minha rotina sem navegar por modulos abstratos.

**Acceptance Criteria:**

**Given** que um usuario com perfil de secretaria acessa o sistema
**When** a tela inicial e carregada
**Then** o sistema apresenta a home da secretaria com pendencias por dominio e atalhos principais
**And** mostra apenas informacoes do tenant atual

**Given** que existem tarefas abertas relacionadas a pessoas
**When** a home e exibida
**Then** o sistema destaca as pendencias acionaveis
**And** permite identificar rapidamente o proximo passo

### Story 4.2: Cadastrar e editar membros

As a secretaria da igreja,
I want criar e atualizar registos de membros com os dados essenciais,
So that a base da igreja permaneça util para a rotina semanal.

**Acceptance Criteria:**

**Given** que a secretaria abre o formulario de membro
**When** informa os dados essenciais validos
**Then** o sistema salva o registo no tenant correto
**And** confirma a operacao com clareza

**Given** que um membro ja existe
**When** a secretaria atualiza seus dados essenciais
**Then** o sistema persiste a alteracao
**And** torna o registo pesquisavel imediatamente

### Story 4.3: Cadastrar e editar visitantes

As a secretaria da igreja,
I want manter registos basicos de visitantes com status de acompanhamento,
So that eu consiga fazer follow-up sem depender de planilhas externas.

**Acceptance Criteria:**

**Given** que a secretaria cadastra um novo visitante
**When** informa os dados essenciais e o status inicial
**Then** o sistema salva o visitante no tenant correto
**And** disponibiliza o registo para busca e uso posterior em comunicacao

**Given** que um visitante precisa de atualizacao
**When** a secretaria altera status ou contacto
**Then** o sistema salva a edicao
**And** preserva consistencia para a rotina semanal

### Story 4.4: Pesquisar e filtrar pessoas

As a secretaria da igreja,
I want pesquisar membros e visitantes por nome, estado e atributos basicos,
So that eu encontre rapidamente o registo certo durante o atendimento semanal.

**Acceptance Criteria:**

**Given** que existem registos de pessoas no tenant
**When** a secretaria pesquisa por nome ou aplica filtros basicos
**Then** o sistema retorna apenas os resultados correspondentes
**And** diferencia membros e visitantes de forma clara

**Given** que nenhum registo corresponde aos filtros
**When** a pesquisa e executada
**Then** o sistema apresenta estado vazio compreensivel
**And** sugere ajustes simples para continuar

### Story 4.5: Resolver pendencias operacionais de pessoas

As a secretaria da igreja,
I want ver pendencias de pessoas e entrar direto no fluxo de resolucao,
So that eu conclua follow-ups e atualizacoes com menos friccao.

**Acceptance Criteria:**

**Given** que existem pendencias relacionadas a membros ou visitantes
**When** a home da secretaria e carregada
**Then** o sistema apresenta cartoes de pendencia por categoria
**And** permite distinguir o tipo de acao necessaria

**Given** que a secretaria seleciona uma pendencia
**When** aciona o cartao correspondente
**Then** o sistema abre diretamente a ficha, fila ou checklist aplicavel
**And** permite retornar a home apos concluir a tarefa

## Epic 5: Comunicacao Operacional e Handoff Externo

Permitir preparar comunicacoes reutilizando dados existentes e concluir o handoff para canais externos sem exigir integracoes profundas no MVP.

### Story 5.1: Manter modelos pre-definidos de comunicacao

As a secretaria da igreja,
I want acessar modelos pre-definidos de comunicacao,
So that eu reduza retrabalho nas mensagens recorrentes da semana.

**Acceptance Criteria:**

**Given** que a secretaria acessa a area de comunicacoes
**When** abre a lista de modelos
**Then** o sistema exibe os modelos disponiveis para o tenant
**And** apresenta nome e descricao curta para cada modelo

**Given** que nao existem modelos customizados adicionais
**When** a area e aberta
**Then** o sistema ainda apresenta os modelos base do MVP
**And** evita estado vazio impeditivo

### Story 5.2: Preparar mensagem a partir de dados de pessoas

As a secretaria da igreja,
I want gerar uma mensagem usando dados de membros e visitantes,
So that eu consiga personalizar a comunicacao sem copiar informacoes manualmente.

**Acceptance Criteria:**

**Given** que a secretaria seleciona um modelo e uma pessoa elegivel
**When** inicia a preparacao da comunicacao
**Then** o sistema preenche a mensagem com os dados basicos disponiveis do registo, incluindo nome, contacto e status quando existirem
**And** permite ajustes antes do handoff externo

**Given** que faltam dados necessarios para preencher parte da mensagem
**When** o rascunho e gerado
**Then** o sistema sinaliza as lacunas de forma clara
**And** nao impede a edicao manual do texto

### Story 5.3: Acionar pendencia pronta para comunicacao

As a secretaria da igreja,
I want abrir diretamente o fluxo de comunicacao a partir de uma pendencia acionavel,
So that eu transforme follow-up pendente em acao concreta com menos cliques.

**Acceptance Criteria:**

**Given** que existe uma pendencia pronta para comunicacao
**When** a secretaria a seleciona na home ou fila correspondente
**Then** o sistema abre diretamente o fluxo de preparacao da mensagem
**And** carrega o contexto da pessoa ou grupo relacionado

**Given** que a pendencia ainda nao possui dados suficientes para comunicacao
**When** a secretaria tenta aciona-la
**Then** o sistema informa o que falta
**And** redireciona para o fluxo correto de complementacao se aplicavel

### Story 5.4: Fazer handoff externo por copiar ou partilhar

As a secretaria da igreja,
I want copiar ou partilhar a mensagem preparada para o WhatsApp ou canal externo,
So that eu conclua a comunicacao sem exigir integracao nativa no MVP.

**Acceptance Criteria:**

**Given** que a mensagem foi preparada
**When** a secretaria escolhe copiar ou partilhar
**Then** o sistema disponibiliza o conteudo final em formato pronto para envio
**And** confirma que o conteudo foi preparado para handoff externo

**Given** que o usuario retorna apos copiar ou partilhar a mensagem
**When** volta ao sistema
**Then** o fluxo permanece em estado consistente
**And** nao exige recompor a mensagem do zero
