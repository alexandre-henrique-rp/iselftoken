# Política de Fairness — Marketplace IselfToken

**Data:** 22/08/2026  
**Referência:** `scripts/marketplace/PRD_MARKETPLACE_REGRAS.md` §11 DEC-MKT  
**Tarefa:** MKT-06

---

## 1. Objetivo

Garantir que o marketplace da IselfToken seja justo, diverso e livre de vieses — protegendo tanto investidores quanto founders de manipulações ou concentrações indevidas.

---

## 2. Regras de Fairness

### 2.1 Limite de Pins

| Regra | Valor | Enforcement |
|-------|-------|-------------|
| Máximo de startups pinadas simultaneamente | **3** | Backend: count WHERE manuallyPinned=true, se ≥ 3 → 409 |
| Cooldown de re-pin (mesma startup) | **30 dias** | Backend: se `manuallyPinnedAt` < 30 dias atrás na mesma startup → 409 |
| Pin obrigatoriamente auditado | Sempre | AuditLog com reason + actorId |

### 2.2 Diversidade por Categoria

| Regra | Valor | Enforcement |
|-------|-------|-------------|
| Máximo de startups pinadas da mesma categoria | **2 de 3** | Backend: count pinadas por categoria, se ≥ 2 → warning (não bloqueia, mas exibe aviso ao admin) |
| Featured automático (score): sem filtro de categoria | — | Score é cego à categoria — diversidade emerge naturalmente |

### 2.3 Anti-Clustering de Sócios

| Regra | Valor | Enforcement |
|-------|-------|-------------|
| Mesmo founder com 2+ startups no top 10 | **Alerta** | Cron de consistência: se detectar, log warning para review manual |
| Bloqueio hard? | **NÃO** | Apenas alerta — pode haver founders legítimos com múltiplas startups |

### 2.4 Diversidade por Estágio

| Regra | Valor | Enforcement |
|-------|-------|-------------|
| Todos os estágios representados no Featured? | **Desejável** mas não obrigatório | Score natural já tende a diversificar (startups maduras ganham mais pontos, mas novas com docs completos também sobem) |
| Cota por estágio? | **NÃO** | Complexidade alta, retorno baixo |

### 2.5 Recência e Rotatividade

| Regra | Valor | Enforcement |
|-------|-------|-------------|
| Penalidade por inatividade (>30 dias sem update) | `-score × 0.1` por dia | RecalculateScoreService aplica no cron |
| Alerta ao founder | "Sua startup está parada há {N} dias" | Email/in-app após 30, 45, 60 dias |
| Pin expira automaticamente? | **NÃO** (decisão manual) | Admin precisa despinar explicitamente |

---

## 3. Monitoramento

| Métrica | Frequência | Alerta se |
|---------|-----------|-----------|
| Distribuição de scores (desvio padrão) | Semanal (cron) | σ < 5 (todos com score similar = fórmula não discrimina) |
| % de startups com score 0 | Diário | > 50% (muitas não preencheram nada) |
| Tempo médio de pin | Mensal | > 90 dias (pin "esquecido") |
| Founders com 2+ startups no top 10 | Diário | Qualquer ocorrência → log para review |

---

## 4. Transparência para o Founder

- Score é visível **apenas no dashboard privado** (decisão MKT-07)
- Breakdown completo com dicas de melhoria
- Posição relativa (#X de N) é informativa, não manipulável
- Não existe "pagar para subir" — score é 100% baseado em completude documental e métricas objetivas

---

## 5. Revisão da Política

- Revisão semestral pela equipe de Compliance
- Qualquer alteração nos pesos/regras precisa passar por CFG-01 (reunião stakeholders)
- Política documentada e acessível internamente
