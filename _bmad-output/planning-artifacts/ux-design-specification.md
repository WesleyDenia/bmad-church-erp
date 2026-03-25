---
inputDocuments:
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/planning-artifacts/mvp-scope.md
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/brainstorming/brainstorming-session-2026-03-16-22-22-20.md
documentType: ux-design
status: draft
language: portuguese
---

# Especificação de UX - ERP para Igrejas

**Author:** Wesley Silva  
**Date:** 2026-03-25

## Intenção de UX

Criar uma experiência que pareça operacionalmente útil, culturalmente respeitosa e emocionalmente segura. O sistema deve reduzir o stress semanal, não acrescentar pressão gerencial.

## Princípios Centrais da Experiência

### 1. Confiança Antes de Profundidade

Os usuários precisam sentir que as ações são seguras, compreensíveis e reversíveis antes de o produto pedir que eles dependam dele.

### 2. Valor Imediato Antes de Configuração

A primeira sessão deve levar o usuário rapidamente a uma tarefa útil. Evitar configuração extensa antes do uso real.

### 3. Homes por Perfil, Não Labirintos de Módulos

O produto deve abrir em telas iniciais orientadas à missão do Tesoureiro e da Secretaria, e não em menus abstratos de módulos.

### 4. Tom Pastoral, Não Tom Corporativo

Os textos, rótulos e feedbacks devem soar acolhedores e claros. Evitar linguagem centrada em KPI ou performance.

### 5. Visibilidade Acionável, Não Teatro de Dashboard

Os dashboards devem priorizar o que exige ação agora, e não métricas decorativas.

## Usuários Principais e suas Intenções

### Tesoureiro

- Quer registar atividade financeira rapidamente
- Precisa de confiança em correções e relatórios
- Valoriza prestação de contas rápida após o culto

### Secretário(a) / Administrador(a)

- Quer manter registos sem burocracia
- Precisa de pendências claras
- Valoriza comunicação reutilizável e preparação de documentos

### Liderança

- Quer resumos simples e confiáveis
- Não precisa de sobrecarga operacional

## Objetivos Emocionais

- Primeira impressão: alívio
- Durante o uso: clareza
- Ao editar: segurança
- Ao relatar: confiança
- Com o tempo: rotina confiável

## Riscos de UX a Evitar

- Interface parecer back office empresarial
- Usuários sentirem-se vigiados em vez de apoiados
- Erros parecerem perigosos ou irreversíveis
- Estados de pendência gerarem vergonha ou ansiedade
- Configuração bloquear o trabalho real

## Arquitetura de Informação

### Home do Tesoureiro

- Lançamento financeiro rápido
- Lançamentos recentes
- Itens pendentes de revisão
- Gerar relatório de fechamento
- Resumo do período atual

### Home da Secretaria

- Atualizações de membros pendentes
- Follow-up de novos visitantes
- Modelos de comunicação
- Atalhos para geração de documentos
- Checklist operacional semanal

### Navegação Compartilhada

- Home
- Pessoas
- Finanças
- Comunicações
- Relatórios
- Configurações

A navegação deve ser rasa e orientada por tarefas.

## Fluxos-Chave de UX

### Fluxo 1: Lançamento Financeiro Rápido

1. Abrir a Home do Tesoureiro
2. Selecionar receita ou despesa
3. Preencher apenas os campos essenciais
4. Salvar com confirmação clara
5. Editar, se necessário, com motivo da alteração

### Fluxo 2: Relatório de Fechamento Imediato

1. Abrir a Home do Tesoureiro
2. Selecionar gerar relatório
3. Rever totais e anomalias
4. Exportar ou partilhar o resumo

### Fluxo 3: Visitante para Base de Registo

1. Abrir a Home da Secretaria
2. Adicionar visitante com dados essenciais
3. Marcar estado de follow-up
4. Reutilizar os dados para comunicação

### Fluxo 4: Resolução de Pendências

1. Abrir a home do perfil
2. Ver pendências por categoria
3. Entrar diretamente na fila correta a partir do cartão de pendência
4. Resolver e regressar

## Diretrizes de Interação

- Usar progressive disclosure para campos avançados
- Manter formulários curtos e tolerantes a erros
- Explicar sempre validações em linguagem simples
- Fornecer confirmação após salvar, editar e gerar relatório
- Tornar visíveis e de baixo risco os caminhos de correção

## Diretrizes de Conteúdo

- Preferir termos como “resumo”, “follow-up”, “registo”, “cuidado” e “pendência”
- Evitar termos corporativos pesados como “KPI”, “performance”, “ROI” e “controlo de recursos”
- Usar linguagem acolhedora em empty states e alertas
- Explicar por que existem restrições quando um acesso for bloqueado

## Direção Visual

- Linguagem visual acolhedora, calma e estruturada
- Layouts limpos com forte legibilidade
- Hierarquia visual guiada por urgência de tarefa, não por decoração
- Usar cor para apoiar significado, nunca para punir
- Evitar estética fria de software empresarial

## Componentes Prioritários

- Cartões de home por perfil
- Formulário de lançamento rápido
- Cartões de pendências
- Banners de revisão para anomalias
- Bloco de resumo de relatório
- Lista pesquisável de pessoas
- Compositor de mensagens com modelos
- Drawer ou painel de histórico/auditoria

## Requisitos de Responsividade e Acessibilidade

- Fluxos centrais devem funcionar bem em mobile e desktop
- Áreas de toque amplas para uso operacional
- Alto contraste e tipografia legível
- Suporte a teclado para usuários com entrada intensa de dados
- Mensagens de estado claras para tecnologias assistivas

## Sinais de Aceitação de UX

- Novos usuários entendem por onde começar sem treinamento
- O tesoureiro conclui lançamento e geração de relatório sem hesitação
- A secretaria atualiza registos e comunicações com navegação mínima
- Os usuários descrevem o sistema como simples, confiável e útil
