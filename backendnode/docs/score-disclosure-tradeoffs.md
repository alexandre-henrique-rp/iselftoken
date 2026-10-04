# Decisão: Score Aparece Público? (DEC-MKT-02)

**Data:** 22/08/2026  
**Referência:** `scripts/marketplace/PRD_MARKETPLACE_REGRAS.md` §11 DEC-MKT  
**Tarefa:** MKT-07

---

## Opções Avaliadas

### Opção A — Score 100% público (visível para visitantes)

| Prós | Contras |
|------|---------|
| Transparência total | Founders podem tentar "burlar" (gaming) |
| Investidor vê qualidade | Competição tóxica entre founders |
| Incentiva melhoria | Startup com score baixo pode se sentir exposta |

### Opção B — Score 100% privado (só no dashboard do founder)

| Prós | Contras |
|------|---------|
| Sem gaming possível | Founder não sabe por que está atrás |
| Sem exposição negativa | Investidor não tem sinal de qualidade |
| Simples | "Score mágico" sem explicação |

### Opção C — Parcial (rank na home + detalhe no dashboard privado)

| Prós | Contras |
|------|---------|
| Investidor vê posição relativa (#3 de 20) | Não expõe número exato (anti-gaming) |
| Founder tem breakdown completo no privado | Levemente mais complexo |
| Equilíbrio entre transparência e proteção | — |

---

## Decisão: **Opção C — Parcial**

### O que é público (marketplace/home)

- **Posição relativa** como badge: "#3 de 20" no card da startup (tooltip opcional)
- **NÃO** mostra o número do score (72, 88, etc.)
- **NÃO** mostra breakdown público
- Badge visual de qualidade:
  - Score 61-100: badge "⭐ Destaque" (verde)
  - Score 31-60: sem badge
  - Score 0-30: sem badge (não humilhar)

### O que é privado (founder dashboard)

- Score numérico exato (72/100)
- Breakdown completo dos 9 critérios
- Posição exata (#4 de 20)
- Checklist "Como melhorar?" com ações concretas
- Histórico de evolução (futuro)

### O que NÃO existe

- Score exato NÃO aparece na API pública do marketplace
- Breakdown NÃO é exposto para investidores
- NÃO existe ranking público tipo "leaderboard"

---

## Justificativa

1. **Anti-gaming:** Sem número exato público, founders não sabem exatamente quanto falta para "ultrapassar" outro — reduz manipulação
2. **Incentivo justo:** O founder VÊ seu score e sabe como melhorar (dashboard privado) — não é opaco
3. **Investidor informado:** A posição relativa e o badge "Destaque" dão sinal suficiente de qualidade sem expor mecânicas internas
4. **Referências de mercado:** G2 mostra "Leader" badge sem score; ProductHunt mostra ranking sem fórmula; Crunchbase mostra "Trending" sem número

---

## Implementação

| Onde | O que mostrar | Endpoint |
|------|--------------|----------|
| Card público (marketplace) | Badge "⭐ Destaque" se score > 60 + posição relativa opcional | `GET /api/startup/marketplace` (já existe, adicionar `rank` e `isFeatured`) |
| Dashboard founder | Score + breakdown + posição | `GET /api/founder/startups/:id/dashboard` (campo `marketplacePosition`) |
| API pública | **NÃO** retornar campo `score` numérico | Filtrar no serializer/DTO de resposta |

---

## Riscos Residuais

| Risco | Probabilidade | Mitigação |
|-------|-------------|-----------|
| Founder deduz score pelo ranking | Baixa | Ranking é relativo — não dá info absoluta |
| Investidor reclama falta de transparência | Baixa | Badge + posição são sinais suficientes |
| Founder com score 0 reclama de "invisibilidade" | Média | Modal "Como melhorar?" dá caminho claro |
