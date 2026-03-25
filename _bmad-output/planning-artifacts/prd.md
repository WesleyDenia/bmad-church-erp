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

Este produto é um SaaS de ERP eclesiástico desenhado para maximizar adoção e retenção desde as primeiras semanas de uso. O MVP vai priorizar valor operacional imediato para tesoureiros e secretarias, permitindo lançamento financeiro rápido, relatórios instantâneos, manutenção de registos de pessoas e gestão semanal de pendências por perfil. O produto deve parecer confiável, leve e pastoralmente adequado, e não corporativo ou controlador.

## 2. Problema

As igrejas frequentemente executam processos administrativos críticos por meio de ferramentas fragmentadas e rotinas informais. Prestação de contas financeira, registos de membros e visitantes e preparação de comunicação ficam espalhados entre planilhas, apps de mensagem, cadernos e memória individual. Softwares existentes falham porque exigem configuração excessiva, são culturalmente desalinhados ou introduzem medo e burocracia antes de valor claro.

## 3. Objetivos do Produto

- Entregar valor visível na primeira semana de uso
- Melhorar a consistência da rotina administrativa semanal
- Reduzir retrabalho manual em finanças e operação de pessoas
- Construir confiança por meio de clareza, reversibilidade e auditabilidade
- Criar uso recorrente através de pendências e ciclos de relatório

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

- Líder da igreja que precisa de visibilidade simples e relatórios

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
- Acesso básico com permissões por perfil para tesoureiro, secretaria e liderança
- Categorias iniciais simples para operação financeira e de pessoas

### 8.2 Finanças

- Lançamento rápido de receitas e despesas
- Campos mínimos obrigatórios
- Criação inline de contrapartes ausentes
- Edição com trilha de auditoria e motivo de alteração
- Indicadores leves de revisão para anomalias
- Resumo de fechamento imediato com totais e segmentações

### 8.3 Registos de Pessoas

- Criar e atualizar registos de membros
- Criar e atualizar registos de visitantes
- Pesquisar e filtrar por nome, estado e dados básicos

### 8.4 Operação Semanal

- Home do tesoureiro com ações diretas e pendências
- Home da secretaria com filas de pendência por domínio
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

1. O usuário abre a Home do Tesoureiro
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

1. O usuário acede à visão resumida
2. Revê o estado financeiro e operacional atual
3. Sai com clareza, sem sobrecarga de informação

## 11. Requisitos Funcionais

### FR-1 Acesso e Perfis

- O sistema deve suportar usuários autenticados com permissões básicas por perfil.
- O sistema deve restringir dados sensíveis financeiros e pessoais conforme o perfil.

### FR-2 Lançamento Financeiro Rápido

- O sistema deve permitir registar receitas e despesas com o mínimo de dados obrigatórios.
- O sistema deve permitir criação inline de contrapartes ausentes durante o lançamento.
- O sistema deve confirmar o salvamento com clareza.

### FR-3 Correções Financeiras e Auditabilidade

- O sistema deve permitir editar lançamentos existentes.
- O sistema deve exigir motivo quando um lançamento salvo for alterado.
- O sistema deve preservar histórico visível das alterações.

### FR-4 Resumo de Fechamento

- O sistema deve gerar um relatório simples de fechamento imediatamente após a operação.
- O relatório deve mostrar receitas, despesas, resultado líquido e segmentação por categoria.

### FR-5 Registos de Membros e Visitantes

- O sistema deve permitir criação e edição de registos de membros e visitantes.
- O sistema deve suportar pesquisa por nome e atributos básicos.

### FR-6 Homes Operacionais por Perfil

- O sistema deve fornecer visões iniciais específicas para tesoureiro e secretaria.
- As homes devem expor ações diretas e pendências relevantes.

### FR-7 Preparação de Comunicação

- O sistema deve oferecer modelos pré-definidos de mensagem.
- O sistema deve permitir preparar comunicações usando dados existentes de pessoas.
- O sistema deve suportar handoff por copiar/partilhar para canais externos.

## 12. Requisitos Não Funcionais

- O produto deve parecer responsivo nos fluxos centrais em desktop e mobile.
- O produto deve usar linguagem clara e não corporativa.
- O produto deve tornar ações destrutivas ou sensíveis compreensíveis e reversíveis.
- O produto deve manter auditabilidade para edições financeiras sensíveis.
- O produto deve suportar tratamento seguro de dados pessoais e financeiros.
- O produto deve ser confiável durante fluxos semanais críticos, especialmente em janelas de uso ligadas ao culto.

## 13. Métricas de Sucesso

- Tempo até primeiro valor: a igreja conclui o primeiro lançamento e o primeiro resumo no mesmo dia
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

- Nível de granularidade das permissões no MVP
- Estrutura exata de centros de custo e subtipos financeiros
- Se o acesso da liderança será apenas leitura em todos os casos iniciais
- Se a progressão visitante-para-membro entra no MVP ou fica para fase 2

## 16. Próximos Artefactos Recomendados

- Arquitetura de informação detalhada
- Wireframes por ecrã para Home do Tesoureiro e Home da Secretaria
- Modelo de dados do MVP para finanças, pessoas e pendências
- Quebra em stories para planeamento de implementação
