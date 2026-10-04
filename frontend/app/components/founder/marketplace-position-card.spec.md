# UX Spec: Card "Posição no Marketplace" — /founder/dashboard

**Data:** 22/08/2026  
**Referência:** `scripts/marketplace/PRD_MARKETPLACE_REGRAS.md` §5.2 RF-11..12  
**Tarefa:** MKT-04

---

## 1. Visão Geral

Card exibido no `/founder/dashboard` que mostra ao fundador sua posição no ranking do marketplace, score atual com breakdown, e ações concretas para melhorar.

---

## 2. Wireframe (Desktop — 400px largura)

```
┌──────────────────────────────────────────────────────────────┐
│  ⬡ POSIÇÃO NO MARKETPLACE                         #4 de 20  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────────────────────────────────────────┐        │
│   │  ████████████████████████░░░░░░░░░░  72/100     │        │
│   └─────────────────────────────────────────────────┘        │
│                                                              │
│   Score: 72 pontos                    Atualizado há 2h       │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  ▼ Detalhamento                                    [colapsar]│
│                                                              │
│   Documentos CVM          ████████████████████  20/20   ✓    │
│   KYC Founder             ████████████████████  15/15   ✓    │
│   Campanha Funded         ████████████████████  10/10   ✓    │
│   Selo Verificada         ████████████████████  10/10   ✓    │
│   Selo Parceria           ░░░░░░░░░░░░░░░░░░░░   0/10   ✗    │
│   Engajamento (67%)       ████████████████████  10/10   ✓    │
│   Docs Recomendados       ████████░░░░░░░░░░░░   6/15   ~    │
│   Mídia (YouTube)         ████████████████████   5/5    ✓    │
│   Redes Sociais           ░░░░░░░░░░░░░░░░░░░░   0/5    ✗    │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   [  ↑ Como melhorar minha posição?  ]                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Wireframe (Mobile — full width, stacked)

```
┌────────────────────────────────┐
│ ⬡ POSIÇÃO NO MARKETPLACE      │
│ #4 de 20                       │
├────────────────────────────────┤
│ ██████████████░░░░░░  72/100   │
│ Atualizado há 2h               │
├────────────────────────────────┤
│ ▼ Ver detalhamento             │
│ (colapsado por padrão mobile)  │
├────────────────────────────────┤
│ [ Como melhorar? ]             │
└────────────────────────────────┘
```

---

## 4. Elementos do Card

### 4.1 Header

| Elemento | Conteúdo | Estilo |
|----------|----------|--------|
| Ícone | `⬡` (hexágono) ou ícone de gráfico | `text-primary` |
| Título | "POSIÇÃO NO MARKETPLACE" | `text-[10px] font-black uppercase tracking-widest text-muted-foreground` |
| Posição | "#4 de 20" | `text-lg font-black tabular-nums` |

### 4.2 Barra de Progresso

| Elemento | Lógica | Estilo |
|----------|--------|--------|
| Barra | `width: ${score}%` | Background por faixa de cor |
| Label | `{score}/100` | `text-sm font-bold tabular-nums` à direita |
| Subtítulo | "Atualizado há {tempo}" | `text-[10px] text-muted-foreground` |

### 4.3 Cores por Faixa de Score

| Faixa | Cor da barra | Background do card | Significado |
|-------|-------------|-------------------|-------------|
| 0-30 | `bg-red-500` | `border-red-500/20` | Precisa melhorar |
| 31-60 | `bg-amber-500` | `border-amber-500/20` | Em progresso |
| 61-100 | `bg-emerald-500` | `border-emerald-500/20` | Excelente |

### 4.4 Breakdown (colapsável)

| Item | Barra | Pontos | Ícone status |
|------|-------|--------|-------------|
| Documentos CVM | `width: (count/6)*100%` | `{pontos}/20` | ✓ verde se 20/20, ~ amarelo se parcial, ✗ vermelho se 0 |
| KYC Founder | `width: (count/4)*100%` | `{pontos}/15` | Idem |
| Campanha Funded | `width: (flag)*100%` | `{pontos}/10` | Idem |
| Selo Verificada | `width: (flag)*100%` | `{pontos}/10` | Idem |
| Selo Parceria | `width: (flag)*100%` | `{pontos}/10` | Idem |
| Engajamento | `width: (ratio/0.5)*100%` (cap 100%) | `{pontos}/10` | Idem + `({ratio}%)` |
| Docs Recomendados | `width: (count/5)*100%` | `{pontos}/15` | Idem |
| Mídia | `width: (flag)*100%` | `{pontos}/5` | Idem |
| Redes Sociais | `width: (count/3)*100%` | `{pontos}/5` | Idem |

**Estado colapsado:** Desktop = expandido por padrão. Mobile = colapsado por padrão.

### 4.5 Botão "Como melhorar?"

Abre **modal/drawer** com checklist acionável:

```
┌──────────────────────────────────────────────────────┐
│  COMO MELHORAR SUA POSIÇÃO                       [X] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ✓  Enviar 6 documentos CVM obrigatórios     20 pts │
│     → Todos enviados! Parabéns.                      │
│                                                      │
│  ✓  Completar KYC (avatar + doc + comprov + bio)     │
│     → KYC aprovado! 15 pts conquistados.             │
│                                                      │
│  ✗  Conseguir selo de Parceria              +10 pts  │
│     → Entre em contato com nosso time de parcerias   │
│       ou se inscreva em um programa de aceleração.   │
│                                                      │
│  ~  Enviar documentos recomendados           +9 pts  │
│     → Faltam: Projeções, Modelo de Contrato,         │
│       Comprovante de Endereço.                       │
│     [ Ir para Documentos ]                           │
│                                                      │
│  ✗  Adicionar redes sociais (3+)             +5 pts  │
│     → Preencha LinkedIn, Instagram e site.           │
│     [ Editar Startup ]                               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 5. Dados Necessários (API)

### Endpoint existente/novo

**Opção A (recomendada):** Incluir no response do `/api/founder/startups/:id/dashboard` (que já existe):

```typescript
// Adicionar ao response do dashboard
marketplacePosition: {
  rank: number;        // posição atual (1-indexed)
  totalRanked: number; // total de startups ranqueadas
  score: number;       // 0-100
  breakdown: ScoreBreakdown; // JSON do campo scoreBreakdown
  lastCalculatedAt: string | null; // ISO timestamp
} | null; // null se startup não tem campanha OPEN/FUNDED
```

**Opção B:** Endpoint separado `GET /api/founder/startups/:id/marketplace-position` — evita carregar o dashboard inteiro se quiser polling.

**Recomendação:** Opção A (já tem o loader no dashboard).

---

## 6. Comportamento

| Situação | Comportamento |
|----------|--------------|
| Startup sem campanha OPEN/FUNDED | Card **não aparece** |
| Score = 0 (nunca calculado) | Mostra "Score pendente — será calculado em até 24h" |
| Score desatualizado (> 48h) | Badge "Desatualizado" + texto "Próximo cálculo: 03:00" |
| Founder acabou de enviar doc | Toast "Score será recalculado em até 1 minuto" |
| Startup pinada por ADMIN | Badge "⭐ Destaque manual" acima do score (informativo) |

---

## 7. Responsividade

| Breakpoint | Layout |
|-----------|--------|
| `< 640px` (mobile) | Card full-width, breakdown colapsado, botão full-width |
| `640-1024px` (tablet) | Card ~50% width no grid, breakdown colapsado |
| `> 1024px` (desktop) | Card ~33% width no grid (com outros KPIs), breakdown expandido |

---

## 8. Acessibilidade

| Requisito | Implementação |
|-----------|---------------|
| Barra de progresso | `role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}` |
| Colapso/expansão | `aria-expanded` + `aria-controls` no botão do breakdown |
| Cores | Não depender apenas da cor — ícones ✓/~/✗ comunicam o status |
| Screen reader | `aria-label="Posição número 4 de 20 startups no marketplace. Score 72 de 100."` |

---

## 9. Componentes React

| Componente | Responsabilidade |
|-----------|-----------------|
| `MarketplacePositionCard` | Shell do card — recebe dados, renderiza header + barra + breakdown |
| `ScoreProgressBar` | Barra de progresso com cor por faixa |
| `ScoreBreakdownList` | Lista colapsável dos 9 critérios |
| `ScoreBreakdownItem` | Uma linha do breakdown (label + mini-barra + pontos + ícone) |
| `ImproveScoreModal` | Modal com checklist acionável e links |

---

## 10. Estimativa

| Item | Esforço |
|------|---------|
| `MarketplacePositionCard` + sub-componentes | 3h |
| `ImproveScoreModal` | 1.5h |
| Integração com loader do dashboard | 30min |
| Testes Vitest (≥ 4) | 1h |
| **Total** | **~6h** |
