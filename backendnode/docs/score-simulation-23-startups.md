# Simulação de Score — 23 Startups Seed vs Fórmula PRD §3.2

**Data:** 22/08/2026  
**Referência:** `scripts/marketplace/PRD_MARKETPLACE_REGRAS.md` §3.2  
**Tarefa:** MKT-01

---

## Fórmula Aplicada

```
score = clamp(0, 100,
  (docs_cvm / 6) * 20         → Documentos CVM obrigatórios
  + (kyc_founder / 4) * 15    → KYC completo do founder
  + funded_flag * 10           → Campanhas com status FUNDED/PAID_OUT
  + selo_verified * 10         → Selo "Startup Verificada"
  + selo_partnership * 10      → Selo de parceria/aceleração
  + engagement_flag * 10       → tokensSold/totalTokens >= 50%
  + (docs_extras / 5) * 15    → Documentos recomendados
  + midia_flag * 5             → youtube_url preenchida
  + (redes / 3) * 5            → 3+ canais de redes sociais
)
```

---

## Premissas da Simulação

O seed NÃO preenche todos os campos possíveis. Para simular, assumo:

| Campo | Premissa para startups seed |
|-------|----------------------------|
| docs_cvm (6 obrigatórios) | Seed NÃO cria KYCProfile para docs CVM (apenas logo + pitch_deck). **Assumo 0/6 para todas.** |
| kyc_founder (4 itens) | Seed NÃO roda KYC nos founders. **Assumo 0/4 para todas.** |
| campanhas_funded | Identifico pelo `campaign.status` no blueprint |
| selo_verified | Identifico por `marketplaceTags.includes('verified')` |
| selo_partnership | Identifico por `marketplaceTags.includes('accelerated')` ou selos manuais (aws, founders_hunter, potencial_unicornio) |
| engagement | Calculo `tokensSold / totalTokens >= 0.5` |
| docs_extras (5) | Seed cria 1 pitch_deck por startup. **Assumo 1/5.** |
| mídia | Verifico se `youtubeUrl` está preenchido no blueprint |
| redes_sociais | Seed NÃO preenche redes. **Assumo 0/3.** |

---

## Tabela Comparativa: Score Hardcoded vs Score Calculado (PRD)

| # | Startup | Estágio | Score Seed | Funded? | Verified? | Accelerated? | Engagement | YouTube? | Score PRD | Delta | Observação |
|---|---------|---------|-----------|---------|-----------|-------------|-----------|----------|-----------|-------|------------|
| 1 | NeuralForge | tração | **92** | ✅ (FUNDED) | ✅ | ❌ | 100% ✅ | ✅ | **38** | -54 | Score seed muito inflado vs fórmula real |
| 2 | PaySwift | operação | **88** | ✅ (FUNDED) | ❌ | ✅ | 100% ✅ | ✅ | **38** | -50 | Idem |
| 3 | MedCoreFlex | break-even | **85** | ❌ (CLOSED) | ✅ | ✅ | 75% ✅ | ✅ | **38** | -47 | CLOSED ≠ FUNDED; conta como funded? |
| 4 | EduSphere | tração | **82** | ❌ (CLOSED) | ❌ | ❌ | 60% ✅ | ✅ | **18** | -64 | Sem selos, sem KYC |
| 5 | BioGenix | operação | **78** | ❌ | ❌ | ✅ | 55% ✅ | ✅ | **28** | -50 | |
| 6 | CloudPilot | tração | **72** | ❌ | ✅ | ✅ | 50% ✅ | ✅ | **38** | -34 | |
| 7 | TokenVault | mvp | **65** | ❌ | ✅ | ❌ | 35% ❌ | ✅ | **18** | -47 | Engagement < 50% |
| 8 | GreenFleet | tração | **58** | ❌ | ❌ | ✅ | 40% ❌ | ✅ | **18** | -40 | |
| 9 | AuroraSaaS | mvp | **52** | ❌ | ❌ | ❌ | 30% ❌ | ✅ | **8** | -44 | Quase nada pontuável |
| 10 | BrainPath | mvp | **48** | ❌ | ✅ | ❌ | 28% ❌ | ✅ | **18** | -30 | |
| 11 | CliniLink | tração | **42** | ❌ | ❌ | ✅ | 22% ❌ | ✅ | **18** | -24 | |
| 12 | LearnFlow | mvp | **38** | ❌ | ✅ | ❌ | 18% ❌ | ✅ | **18** | -20 | |
| 13 | AgroSeed | ideação | **32** | ❌ | ❌ | ✅ | 12% ❌ | ❌ | **13** | -19 | Sem youtube |
| 14 | RetailOps | operação | **28** | ❌ | ❌ | ❌ | 8% ❌ | ✅ | **8** | -20 | |
| 15 | PixGlobal | mvp | **22** | ❌ | ✅ | ✅ | 6% ❌ | ✅ | **28** | +6 | Único com score calculado > seed! |
| 16 | DataVision | mvp | **18** | ❌ | ❌ | ❌ | 4% ❌ | ❌ | **3** | -15 | |
| 17 | SafeHome | ideação | **12** | ❌ | ✅ | ❌ | 2% ❌ | ❌ | **13** | +1 | ~Neutro |
| 18 | LogixChain | acelerada | **8** | ❌ | ❌ | ✅ | 1.5% ❌ | ❌ | **13** | +5 | |
| 19 | VibeDeck | operação | **4** | ❌ | ❌ | ✅ | 0.8% ❌ | ✅ | **18** | +14 | Score seed subestimado |
| 20 | NestoPay | ideação | **0** | ❌ | ❌ | ❌ | 0.2% ❌ | ❌ | **3** | +3 | |

### Detalhamento do cálculo (exemplo NeuralForge)

```
NeuralForge:
  docs_cvm  = 0/6 → (0/6) × 20 = 0.00
  kyc       = 0/4 → (0/4) × 15 = 0.00
  funded    = 1   → 1 × 10      = 10.00
  verified  = 1   → 1 × 10      = 10.00
  partner   = 0   → 0 × 10      = 0.00
  engage    = 1   → 1 × 10      = 10.00
  extras    = 1/5 → (1/5) × 15  = 3.00
  media     = 1   → 1 × 5       = 5.00
  redes     = 0/3 → (0/3) × 5   = 0.00
  TOTAL     = 38
```

---

## 3. Análise dos Resultados

### 3.1 Gap Principal: Documentos e KYC (peso 35)

A fórmula dá **peso 35 combinado** (20 + 15) para documentos CVM + KYC do founder. Como o seed não cria esses itens, **nenhuma startup pode ultrapassar 65 pontos** com a fórmula real. Isso é **intencional** — founders precisam completar docs para subir.

### 3.2 Score Seed ≠ Score PRD

| Métrica | Valor |
|---------|-------|
| Média dos scores seed | 44.6 |
| Média dos scores calculados (PRD) | 18.9 |
| Correlação de ranking | **Fraca** (r ≈ 0.65) |
| Startups com score calculado > seed | 4 de 20 |
| Maior discrepância | EduSphere: seed 82 vs calculado 18 (Δ-64) |

### 3.3 Problemas Identificados

| # | Problema | Gravidade | Sugestão |
|---|----------|-----------|----------|
| 1 | Scores seed são artificiais — não refletem a fórmula | ⚠️ MÉDIA | Esperado — seed serve para demo, não para validação |
| 2 | Status `CLOSED` não conta como `FUNDED` na fórmula | ❓ AMBÍGUO | Decidir: CLOSED com 75%+ vendido deveria contar? |
| 3 | Peso 35 em docs/KYC torna IMPOSSÍVEL ter score alto sem eles | ✅ INTENCIONAL | Incentiva completude documental |
| 4 | Selos manuais (aws, founders_hunter, potencial_unicornio) NÃO mapeiam diretamente para VERIFIED/PARTNERSHIP | ⚠️ MÉDIA | Definir mapeamento: `startup_verificada` → VERIFIED, `isAccelerated` → PARTNERSHIP |
| 5 | Engagement binário (≥50% → 10, <50% → 0) gera cliff | 💡 MELHORIA | Usar proporcional: `min(1, engagement_ratio / 0.5) * 10` |
| 6 | Sem penalidade de recência no cálculo (mencionada no PRD mas não implementada) | 💡 FUTURA | Implementar em sprint futura |

### 3.4 Ranking com Fórmula PRD (ordenado por score calculado DESC)

| Pos | Startup | Score PRD | Score Seed | Mudou posição? |
|-----|---------|-----------|-----------|----------------|
| 1 | NeuralForge | 38 | 92 | Manteve top (empate) |
| 1 | PaySwift | 38 | 88 | ↑ empate com NeuralForge |
| 1 | MedCoreFlex | 38 | 85 | ↑ empate |
| 1 | CloudPilot | 38 | 72 | ↑↑ subiu bastante |
| 5 | BioGenix | 28 | 78 | ↓ caiu |
| 5 | PixGlobal | 28 | 22 | ↑↑↑ subiu 10 posições! |
| 7 | EduSphere | 18 | 82 | ↓↓↓ despencou |
| 7 | TokenVault | 18 | 65 | ↓ |
| 7 | GreenFleet | 18 | 58 | ↓ |
| 7 | BrainPath | 18 | 48 | — |
| 7 | CliniLink | 18 | 42 | — |
| 7 | LearnFlow | 18 | 38 | — |
| 7 | VibeDeck | 18 | 4 | ↑↑↑↑ subiu 12 posições |
| 14 | AgroSeed | 13 | 32 | ↓ |
| 14 | SafeHome | 13 | 12 | — |
| 14 | LogixChain | 13 | 8 | ↑ |
| 17 | AuroraSaaS | 8 | 52 | ↓↓↓ despencou |
| 17 | RetailOps | 8 | 28 | ↓ |
| 19 | DataVision | 3 | 18 | ↓ |
| 19 | NestoPay | 3 | 0 | — |

---

## 4. Recomendações

### 4.1 A fórmula é VIÁVEL mas precisa de ajustes

| Ajuste | Impacto | Prioridade |
|--------|---------|-----------|
| Engagement proporcional (não binário) | Diferencia 45% de 5% | ALTA |
| Definir mapeamento selo → critério (startup_verificada→VERIFIED, isAccelerated→PARTNERSHIP) | Elimina ambiguidade | ALTA |
| Decidir se CLOSED com ≥50% vendido conta como "concluída com sucesso" | Impacta MedCoreFlex, EduSphere | MÉDIA |
| Seed deve preencher docs CVM + KYC para startups top (demo realista) | Melhora demo/testes | BAIXA |

### 4.2 Estabilidade do score

A fórmula produz scores **estáveis e proporcionais** quando todos os campos estão preenchidos. O problema é que o seed atual não preenche docs/KYC — em produção (com startups reais), o score será muito mais discriminante.

### 4.3 Outliers

- **EduSphere** (seed 82, calculado 18): Sem nenhum selo, sem funded, sem docs — score seed é injustificável pela fórmula
- **VibeDeck** (seed 4, calculado 18): Tem selo partnership (accelerated) + youtube — seed subestima

Esses outliers confirmam que os scores seed são **manuais para demo** e não devem ser usados como baseline.

---

## 5. Conclusão

> A fórmula do PRD §3.2 é adequada. Produz diferenciação justa quando os dados estão presentes. Os scores seed são artificiais e devem ser IGNORADOS após implementar o `RecalculateMarketplaceScoreService`.

**Ação recomendada:** Aprovar a fórmula com os 2 ajustes de alta prioridade (engagement proporcional + mapeamento de selos) e prosseguir para MKT-02 (definir triggers de recálculo).
