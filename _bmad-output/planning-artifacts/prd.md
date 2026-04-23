---
stepsCompleted: []
inputDocuments:
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/planning-artifacts/mvp-scope.md
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/planning-artifacts/ux-design-specification.md
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/brainstorming/brainstorming-session-2026-03-16-22-22-20.md
workflowType: prd
status: draft
language: portuguese
---

# Documento de Requisitos do Produto - ERP para Igrejas

**Author:** Wesley Silva  
**Date:** 2026-03-25

## 1. Resumo Executivo

Este produto é um SaaS de ERP eclesiástico desenhado para maximizar adoção e retenção desde as primeiras semanas de uso. O MVP vai priorizar valor operacional imediato para tesoureiros e secretarias, permitindo lançamento financeiro rápido, resumos de fechamento imediatos, manutenção de registos de pessoas e gestão semanal de pendências por perfil. O produto deve parecer confiável, leve e pastoralmente adequado, e não corporativo ou controlador.

## 2. Problema

As igrejas frequentemente executam processos administrativos críticos por meio de ferramentas fragmentadas e rotinas informais. Prestação de contas financeira, registos de membros e visitantes e preparação de comunicação ficam espalhados entre planilhas, apps de mensagem, cadernos e memória individual. Softwares existentes falham porque exigem configuração excessiva, são culturalmente desalinhados ou introduzem medo e burocracia antes de valor claro.

## 3. Objetivos do Produto

- Entregar valor visível na primeira semana de uso
- Melhorar a consistência da rotina administrativa semanal
- Reduzir retrabalho manual em finanças e operação de pessoas
- Construir confiança por meio de clareza, reversibilidade e auditabilidade
- Criar uso recorrente através de pendências e ciclos de resumo operacional

## 4. Não Objetivos

- Substituir todos os sistemas da igreja na primeira release
- Entregar operação contábil completa ou folha de pagamento
- Introduzir analytics empresariais ou scoring de performance
- Forçar substituição nativa de canais de mensageria no MVP
- Cobrir fluxos pastorais avançados no MVP

## 5. Usuários-Alvo

### Usuários Primários

- Tesoureiro
- Secretário(a) / administrador(a) da igreja

### Usuário Secundário

- Líder da igreja que precisa de visibilidade simples e resumos claros

## 6. Jobs to Be Done

### Tesoureiro

- Quando termino um culto ou recebo movimentação financeira, quero registar tudo rapidamente para poder fechar o período e prestar contas com confiança.

### Secretaria

- Quando recebo novas informações de pessoas ou preciso fazer follow-up durante a semana, quero atualizar registos e preparar comunicações sem perder tempo.

### Liderança

- Quando preciso de visibilidade, quero um resumo conciso e confiável para entender a situação sem entrar em detalhe operacional.

## 7. Princípios Centrais do Produto

- Valor antes de configuração
- Confiança antes de controlo
- Clareza operacional antes de complexidade sistémica
- Alinhamento cultural antes de linguagem empresarial
- Formação de hábito semanal antes de amplitude funcional

## 8. Escopo do MVP

### 8.1 Organização e Acesso

- Criar e gerir perfil da igreja
- Isolamento lógico por igreja desde a fundação do produto
- Acesso básico com permissões por perfil para tesoureiro, secretaria e liderança
- Categorias iniciais simples para operação financeira e de pessoas

### 8.2 Finanças

- Lançamento rápido de receitas e despesas
- Campos mínimos obrigatórios: tipo, valor, subtipo, contraparte e centro de custo
- Criação inline de contrapartes ausentes
- Edição com trilha de auditoria e motivo de alteração
- Indicadores leves de revisão para anomalias
- Resumo de fechamento imediato com totais e segmentações por centro de custo e categoria/subtipo
- Exportação ou partilha simples do resumo com a liderança

### 8.3 Registos de Pessoas

- Criar e atualizar registos de membros
- Criar e atualizar registos de visitantes
- Manter status e dados essenciais de contacto para membros e visitantes
- Pesquisar e filtrar por nome, estado e dados básicos

### 8.4 Operação Semanal

- Home da tesouraria com blocos operacionais, ações diretas e pendências
- Home da secretaria com blocos operacionais, pendências por domínio e checklist operacional semanal
- Home da liderança com leitura resumida do estado financeiro e operacional sem sobrecarga
- Navegação direta do cartão de pendência para o fluxo de ação

### 8.5 Comunicações

- Comunicações baseadas em modelos
- Uso de dados de membros e visitantes para preparar mensagens
- Handoff para WhatsApp via fluxo pronto para copiar/partilhar

## 9. Fora de Escopo

- Folha de pagamento
- Suporte multi-campus
- Automação nativa de mensageria
- Gestão profunda de eventos
- Gestão do ciclo de vida de voluntários
- Registos pastorais sensíveis
- Analytics avançados e benchmarking
- Reconciliação completa ou complexidade contábil avançada

## 10. Jornadas Principais do Usuário

### Jornada A: Fechamento Semanal do Tesoureiro

1. O usuário abre a Home da Tesouraria
2. Registra ofertas e despesas
3. Revê exceções sinalizadas, se necessário
4. Gera o resumo de fechamento
5. Partilha os resultados com a liderança

### Jornada B: Administração Semanal da Secretaria

1. O usuário abre a Home da Secretaria
2. Revê pendências de atualização
3. Adiciona ou atualiza visitantes e membros
4. Usa um modelo de comunicação
5. Conclui tarefas semanais de follow-up

### Jornada C: Visibilidade para a Liderança

1. O usuário acede à Home da Liderança
2. Revê o estado financeiro e operacional atual
3. Sai com clareza, sem sobrecarga de informação

## 11. Requisitos Funcionais

### FR-1 Acesso e Perfis

- O sistema deve suportar usuários autenticados com permissões básicas por perfil.
- O sistema deve restringir dados sensíveis financeiros e pessoais conforme o perfil.
- O sistema deve suportar isolamento lógico por igreja desde a fundação da aplicação.
- O sistema deve permitir criar e gerir o perfil inicial da igreja para iniciar a operação.
- O sistema deve disponibilizar categorias mínimas iniciais para a operação financeira e de pessoas com configuração enxuta.

### FR-2 Lançamento Financeiro Rápido

- O sistema deve permitir registar receitas e despesas com o mínimo de dados obrigatórios.
- O sistema deve exigir no lançamento financeiro os campos tipo, valor, subtipo, contraparte e centro de custo.
- O sistema deve permitir criação inline de contrapartes ausentes durante o lançamento.
- O sistema deve confirmar o salvamento com clareza.
- O sistema deve sinalizar itens financeiros incomuns ou incompletos para revisão.

### FR-3 Correções Financeiras e Auditabilidade

- O sistema deve permitir editar lançamentos existentes.
- O sistema deve exigir motivo quando um lançamento salvo for alterado.
- O sistema deve preservar histórico visível das alterações.

### FR-4 Resumo de Fechamento

- O sistema deve gerar um resumo simples de fechamento imediatamente após a operação.
- O resumo deve mostrar receitas, despesas, resultado líquido e segmentação por centro de custo e categoria/subtipo.
- O sistema deve permitir exportar ou partilhar o resumo de fechamento com a liderança.

### FR-5 Registos de Membros e Visitantes

- O sistema deve permitir criação e edição de registos de membros e visitantes.
- O sistema deve manter status e informações essenciais de contacto para membros e visitantes.
- O sistema deve suportar pesquisa por nome e atributos básicos.

### FR-6 Homes Operacionais por Perfil

- O sistema deve fornecer homes por perfil específicas para tesoureiro, secretaria e liderança.
- As homes devem expor blocos operacionais, ações diretas e pendências relevantes.
- O sistema deve expor pendências operacionais por perfil e por domínio de trabalho.
- O sistema deve permitir navegação direta do cartão de pendência para a fila ou fluxo de resolução correspondente.

### FR-7 Preparação de Comunicação

- O sistema deve oferecer modelos pré-definidos de mensagem.
- O sistema deve permitir preparar comunicações usando dados existentes de pessoas.
- O sistema deve suportar handoff por copiar/partilhar para canais externos.

## 12. Requisitos Não Funcionais

### NFR-1 Responsividade e Tempo de Resposta

- Os fluxos centrais do MVP devem funcionar de forma confortável em desktop e mobile.
- Em condições normais de uso, a navegação inicial das homes por perfil e o salvamento de ações centrais devem apresentar feedback visual em até 2 segundos para pelo menos 95% das operações.

### NFR-2 Linguagem e Clareza Operacional

- O produto deve usar linguagem clara, acolhedora e não corporativa em telas, validações, estados vazios e confirmações.
- Toda mensagem de erro ou restrição deve explicar o problema e o próximo passo esperado sem jargão técnico.

### NFR-3 Segurança Percebida e Reversibilidade

- Ações destrutivas ou sensíveis devem apresentar confirmação explícita e motivo quando aplicável.
- O sistema deve tornar caminhos de correção compreensíveis, sem exigir suporte técnico para desfazer ou corrigir um erro operacional comum.

### NFR-4 Auditabilidade Financeira

- Toda edição financeira sensível deve registrar usuário, data/hora, motivo e valores alterados.
- O histórico de alterações financeiras deve ficar visível ao perfil autorizado no próprio fluxo operacional.

### NFR-5 Segurança e Privacidade de Dados

- O sistema deve aplicar autenticação, controle de acesso por perfil e isolamento por igreja sobre dados pessoais e financeiros.
- Dados sensíveis não devem ser expostos a perfis não autorizados nem em listagens, nem em detalhes, nem em respostas de erro.

### NFR-6 Confiabilidade Operacional

- O sistema deve estar preparado para uso em janelas semanais críticas, especialmente domingo e pós-culto, sem depender de configurações manuais prévias para o fluxo hero.
- Em caso de falha operacional recuperável, o sistema deve preservar contexto suficiente para o usuário retomar o trabalho sem recompor manualmente toda a tarefa.

### NFR-7 Primeiro Valor com Configuração Mínima

- Uma nova igreja deve conseguir concluir onboarding básico, primeiro lançamento financeiro e primeiro resumo no mesmo dia.
- O produto não deve exigir configuração ampla antes que os usuários executem a primeira tarefa útil.

### NFR-8 Acessibilidade e Uso Operacional

- Fluxos centrais devem oferecer áreas de toque adequadas, contraste suficiente e tipografia legível.
- Os principais formulários e ações devem ser utilizáveis por teclado para perfis com uso intenso de dados.

## 13. Métricas de Sucesso

- Tempo até primeiro valor: a igreja conclui o primeiro lançamento e o primeiro resumo de fechamento no mesmo dia
- Uso ativo semanal entre usuários operacionais
- Percentual de lançamentos concluídos sem suporte
- Percentual de pendências semanais resolvidas dentro do produto
- Retenção inicial após o primeiro mês
- Percepção de confiança e clareza reportada pelos usuários

## 14. Riscos e Mitigações

### Risco: o produto parecer corporativo demais

Mitigação: usar linguagem pastoral, fluxos por perfil e UX de apoio.

### Risco: configuração inicial ser pesada

Mitigação: minimizar configuração obrigatória e priorizar fluxos com defaults.

### Risco: usuários terem medo de errar

Mitigação: fornecer estados claros de salvamento, histórico de edição e trilha de auditoria com motivo.

### Risco: o produto adicionar trabalho em vez de reduzir

Mitigação: suportar preparação de comunicação e handoff por copiar/partilhar em vez de forçar substituição de canal.

## 15. Decisões em Aberto

- Nível exato de granularidade das permissões no MVP além dos perfis básicos
- Estrutura final de centros de custo e taxonomia de subtipos financeiros
- Se a visão da liderança será estritamente leitura em todos os cenários iniciais
- Se a progressão visitante-para-membro entra no MVP ou fica para fase 2
- Se o checklist operacional semanal da secretaria será tratado como componente implícito da home ou como entrega explicitamente nomeada

## 16. Próximos Artefactos Recomendados

- Arquitetura de informação detalhada
- Wireframes por ecrã para Home da Tesouraria, Home da Secretaria e Home da Liderança
- Modelo de dados do MVP para finanças, pessoas e pendências
- Quebra em stories para planeamento de implementação
