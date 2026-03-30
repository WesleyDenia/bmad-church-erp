---
stepsCompleted: [1, 2]
inputDocuments:
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/planning-artifacts/prd.md
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/planning-artifacts/ux-design-specification.md
  - /home/oem/Workspace/bmad-church-erp/_bmad-output/planning-artifacts/mvp-scope.md
workflowType: 'architecture'
project_name: 'curso-bmad'
user_name: 'Wesley Silva'
date: '2026-03-25'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
O produto precisa suportar autenticação com permissões por perfil, lançamento financeiro rápido, correção com trilha de auditoria, geração imediata de resumo de fechamento, manutenção de registos de membros e visitantes, homes operacionais por perfil e preparação de comunicação com handoff para canais externos. Arquiteturalmente, isso implica modularização clara entre identidade/acesso, finanças, pessoas, pendências operacionais e comunicação.

**Non-Functional Requirements:**
Os NFRs mais relevantes são responsividade em desktop e mobile, linguagem clara e não corporativa, segurança no tratamento de dados pessoais e financeiros, reversibilidade de ações sensíveis, auditabilidade de alterações financeiras e confiabilidade em janelas críticas de uso semanal. Estes requisitos afetam diretamente estrutura de aplicação, modelagem de permissões, estratégias de persistência, logging e padrões de feedback ao utilizador.

**Scale & Complexity:**
O projeto apresenta complexidade média. Não há sinais de real-time intenso, multi-campus inicial ou integrações profundas no MVP, mas há forte necessidade de consistência funcional, segurança de domínio e experiência previsível.Docker

- Primary domain: web full-stack administrativo
- Complexity level: medium
- Estimated architectural components: 6 a 8 blocos principais

### Technical Constraints & Dependencies

- O PRD define um MVP enxuto, com foco em valor operacional imediato
- A UX exige homes por perfil e fluxos curtos, o que favorece arquitetura orientada a módulos de domínio e casos de uso
- O sistema deve suportar dados financeiros e pessoais com controle de acesso rigoroso
- O handoff para WhatsApp deve ser tratado como capacidade de saída simples, não como integração nativa complexa
- O modelo deve prever multi-tenancy por igreja desde o início, mesmo que de forma simples
- A arquitetura deve permitir evolução progressiva do domínio sem exigir refactor estrutural precoce

### Cross-Cutting Concerns Identified

- Autenticação e autorização por perfil
- Multi-tenancy por igreja
- Auditoria e histórico de alterações
- Validação de dados com mensagens claras
- Responsividade e consistência de UX
- Segurança e privacidade de dados
- Estruturação de pendências operacionais por domínio
- Padrões comuns para feedback, erros, confirmações e estados de revisão

### Initial Domain Boundaries Suggested

- Identity & Access
- Finance
- People
- Operational Inbox / Pending Work
- Communications Support

### Architectural Notes from Context

- Auditabilidade deve ser parte do modelo de domínio financeiro, não apenas logging técnico
- O dashboard de pendências deve ser tratado como capability central de retenção, não só como camada visual
- Toda decisão técnica que aumente controlo deve também aumentar clareza e segurança percebida pelo utilizador

### Early Architectural Decision Signals

- ADR-01: isolamento por igreja deve ser regra fundacional do sistema
- ADR-02: a solução deve nascer organizada por domínios de negócio claros
- ADR-03: alterações financeiras exigem histórico explícito e motivo persistido
- ADR-04: validação, mensagens e feedback operacional devem seguir padrão transversal
- ADR-05: integrações externas no MVP devem privilegiar handoff simples e desacoplado

### Primary Failure Risks if Ignored

- Exposição cruzada de dados entre igrejas
- Permissões frágeis sobre dados financeiros e pessoais
- Burocratização do fluxo hero financeiro
- Inconsistência de UX entre módulos críticos
- Pendências sem acoplamento real ao trabalho semanal
- Auditoria insuficiente para gerar confiança institucional
