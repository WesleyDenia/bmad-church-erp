---
sourceDocuments:
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/brainstorming/brainstorming-session-2026-03-16-22-22-20.md
documentType: mvp-scope
status: draft
language: portuguese
---

# Escopo do MVP - ERP para Igrejas com foco em adoção e retenção

**Author:** Wesley Silva  
**Date:** 2026-03-25

## Tese do Produto

A versão inicial do produto deve ajudar igrejas a executar sua rotina administrativa semanal com menos fricção, mais confiança e prestação de contas mais rápida, sem parecer um ERP corporativo. O MVP deve conquistar adoção tornando o primeiro fluxo realmente útil extremamente curto e emocionalmente seguro.

## Problema a Resolver

Igrejas pequenas e médias frequentemente dependem de planilhas, WhatsApp, memória e rotinas fragmentadas para gerir finanças, membros, visitantes e comunicação. Os sistemas existentes costumam falhar porque são pesados demais, corporativos demais ou exigem configuração excessiva antes de gerar valor. Isso provoca baixa adoção, baixa qualidade dos dados e fraca retenção.

## Resultado Esperado do MVP

Entregar uma primeira versão que ajude a igreja a concluir suas tarefas semanais mais frequentes em um só lugar:

- registrar entradas e saídas financeiras rapidamente
- gerar um resumo simples de fechamento imediatamente
- manter uma base útil de membros e visitantes
- agir sobre pendências semanais por perfil
- preparar comunicações sem substituir os canais já usados

## Usuários-Alvo

- Tesoureiro
- Secretário(a) / administrador(a)
- Líder da igreja que precisa de visibilidade simples, sem complexidade operacional

## Restrições de Design

- Deve transmitir segurança, reversibilidade e facilidade de compreensão
- Não deve exigir configuração ampla antes do primeiro valor
- Deve usar linguagem pastoral e operacional, e não jargão corporativo
- Deve suportar com confiabilidade fluxos de domingo e pós-culto
- Deve ser amigável para uso móvel em tarefas operacionais leves

## Capacidades Incluídas no MVP

### 1. Configuração Inicial da Organização

- Criar perfil da igreja
- Controle básico de acesso com permissões por perfil
- Categorias mínimas para começar operação financeira e de pessoas

### 2. Lançamento Financeiro Rápido

- Lançamento rápido de receitas e despesas
- Campos mínimos obrigatórios: tipo, valor, subtipo, contraparte e centro de custo
- Criação inline de contrapartes ausentes
- Edição de lançamentos com trilha de auditoria e motivo da alteração
- Indicadores simples de revisão para itens incomuns ou incompletos

### 3. Resumo Financeiro Imediato

- Resumo de fechamento com um clique
- Totais de receitas, despesas e resultado do período
- Quebra por centro de custo e subtipo
- Resumo pronto para exportação ou compartilhamento com a liderança

### 4. Base de Membros e Visitantes

- Cadastro básico de membros
- Cadastro básico de visitantes
- Status e informações essenciais de contacto
- Busca e atualização desenhadas para uso semanal com baixa fricção

### 5. Homes Operacionais por Perfil

- Home da tesouraria com blocos operacionais, ações rápidas e pendências
- Home da secretaria com blocos operacionais, pendências de membros, visitantes, comunicações e documentos
- Home da liderança com leitura resumida do estado financeiro e operacional
- Navegação direta da pendência para a fila de resolução

### 6. Camada de Preparação de Comunicação

- Modelos pré-definidos de comunicação
- Preparação de mensagens a partir dos dados de membros e visitantes
- Suporte a handoff para WhatsApp via fluxo de copiar/partilhar

## Itens Explicitamente Fora do Escopo do MVP

- Suite contábil completa
- Folha de pagamento e gestão salarial
- Hierarquia multi-campus ou multi-entidade
- Automação de fluxos de voluntariado
- Registos pastorais profundos
- Gestão complexa de inscrições para grandes conferências
- Automação nativa de WhatsApp ou integrações profundas de mensageria
- Analytics avançados, scoring, rankings ou painéis de performance
- Arquitetura offline-first para além de responsividade móvel básica

## Fluxo Hero do MVP

1. O tesoureiro abre o sistema após o culto
2. Registra ofertas e despesas em um fluxo curto
3. Corrige qualquer erro sem medo de comprometer o registo
4. Gera um resumo de fechamento instantaneamente
5. Partilha ou apresenta o resultado à liderança

Este é o principal ciclo de prova de valor do MVP.

## Loops de Retenção

- Homes por perfil e blocos semanais de pendências incentivam retorno frequente
- Base de membros e visitantes reduz retrabalho manual
- Registos financeiros tornam-se a fonte confiável para prestação de contas
- Modelos reduzem esforço de comunicação ao longo do tempo

## Princípios de Produto para Decisões de Escopo

- Valor antes de configuração
- Ação antes de navegação
- Confiança antes de controlo
- Orientação antes de complexidade
- Suportar hábitos reais da igreja antes de tentar substituí-los

## Critérios de Sucesso do MVP

- A igreja consegue concluir a configuração financeira inicial e o primeiro resumo de fechamento no mesmo dia
- Um tesoureiro consegue executar o fluxo hero em minutos, não em horas
- Uma secretaria consegue manter membros e visitantes sem fadiga operacional
- Os usuários sentem que o sistema ajuda a organizar, e não a vigiar
- O retorno semanal passa a acontecer em torno de pendências e resumos operacionais

## Candidatos para Fase 2

- Integrações nativas de comunicação
- Expansão de eventos e inscrições
- Fluxos de voluntariado e ministérios
- Permissões e governança mais avançadas
- Filas de revisão orientadas por exceção com mais automação
- Ferramentas mais profundas de auditoria, conformidade e reconciliação
