# ADR-008: Modelo Financeiro & de Cobranças do Módulo Campaigns

> **Status:** Accepted
> **Date:** 2026-07-29
> **Sprint:** S01 (Refatoração Campaigns — Zero Trust & Configurações Dinâmicas)
> **Deciders:** orchestrator + product owner (via grill-me, 3 perguntas)

## Contexto

O módulo `campaigns` precisa ser refatorado para seguir o padrão **"Zero Trust"** (backend como source of truth) e adotar **configurações dinâmicas** (sem hardcode de taxas/limites no código).

O plano original de implementação proposto tinha **três inconsistências bloqueantes**:

1. **Modelo matemático não fechava:** `totalTokens = targetAmount / baseValue` (2500 tokens para R$500k) não bate com `tokenSellPrice = baseValue + txFee` (R$240) → `2500 × R$240 = R$600k ≠ R$500k target`.
2. **Conflito de campos de fee:** o plano propunha criar `complianceFeeBilled`, mas já existe `reservationFeePaid` em uso em 3 arquivos do código (`transactions.service.ts:506/727`, `fund-transfer.service.ts:194`, `enrichment.service.ts:109`). Risco de cobrança dupla.
3. **Equity órfão:** o cálculo `equity = targetAmount / valuation * 100` depende de `valuation`, que se for removido do input, quebra o cálculo em 2 lugares (`campaigns.service.ts:237` e `enrichment.service.ts:161`).

Adicionalmente, **validações hardcoded** (`@Min(500000)`, `@Max(10000000)`) no DTO eram estáticas — mudar o valor no `SystemConfig` não tinha efeito porque o `class-validator` roda antes do service.

## Decisão

Adotaremos **3 decisões fechadas** que juntas definem o modelo financeiro:

### 1. Fórmula de tokens: **Modelo A — Token = Fração de Captação**

- `totalTokens` permanece como **INPUT** do founder (escolhe a granularidade)
- `targetAmount` permanece como **INPUT** do founder
- `tokenSellPrice` é **DERIVADO** = `targetAmount / totalTokens`
- Backend remove `valuation` e `tokenPrice` do input (valores derivados)

**Validações de sanidade (no service, via `SystemConfig`):**

- `CAMPAIGN_MIN_TARGET` (ex: 500.000) — limite mínimo de captação
- `CAMPAIGN_MAX_TARGET` (ex: 10.000.000) — limite máximo de captação
- `CAMPAIGN_MIN_TOKENS` (ex: 100) — mínimo de tokens (anti-token-unitário)
- `CAMPAIGN_MAX_TOKENS` (ex: 1.000.000) — máximo de tokens (anti-diluição)

### 2. Campos de fee: **Manter os dois separados**

- `reservationFeePaid` (Boolean, **já existe**) — taxa paga **ANTES** de criar campanha
- `complianceFeeBilled` (Boolean, **novo**) — taxa de compliance cobrada **APÓS** `campaign.status = FUNDED`
- Cada um representa um **momento distinto** do ciclo de vida da campanha, sem sobreposição semântica

### 3. Equity: **Calculada por tokens vendidos**

- `equity = (tokensSold / totalTokens) * 100`
- **Remove dependência de `valuation`** (que deixa de ser input)
- Representa "quanto da oferta já foi vendido" — mais intuitivo para investidores

## Alternativas considered

### Fórmula de tokens

#### Modelo B: Token com valor de face fixo

- **Pro:** Valor de face do token é intuitivo (ex: "token vale R$200")
- **Con:** `tokens × preço ≠ targetAmount` → precisa definir política de rateio (sobra vai pra onde?)
- **Rejected because:** Adiciona ambiguidade sobre o que acontece com a diferença entre captação-meta e captação-efetiva. Modelo A é matematicamente fechado.

#### Modelo C: Preço de venda fixo + taxa variável

- **Pro:** txFee embutida no preço (R$200 face + R$40 taxa = R$240 venda)
- **Con:** founder não controla granularidade (precisa aceitar preço pré-definido)
- **Rejected because:** Menos flexível para startups com diferentes estratégias de captação.

### Campos de fee

#### Renomear para `feeStage1Paid` / `feeStage2Paid`

- **Pro:** Mais explícito (estágios numerados)
- **Con:** Migration de rename quebra referências em código externo + mais ruído no diff
- **Rejected because:** `reservationFeePaid` já tem consumidores estáveis. Manter nomes semânticos é menos disruptivo.

#### Generalizar em `feePaid` + `feeStage` enum

- **Pro:** Mais flexível para futuros estágios
- **Con:** Over-engineering para 2 estágios atuais. YAGNI.
- **Rejected because:** Complexidade desnecessária. Se chegar um 3º estágio, refatoramos.

### Equity

#### Manter `equity = targetAmount / valuation`

- **Pro:** Compatibilidade com código atual
- **Con:** `valuation` deixa de ser input. Precisaria calcular via market signals (complexo, fora de escopo).
- **Rejected because:** Equivalente semântico mais simples é calcular por tokens vendidos — mesma informação útil, sem dependência externa.

#### Remover campo `equity` (frontend calcula)

- **Pro:** Mais simples no backend
- **Con:** Inconsistência — outras entidades (Startup, Investment) têm `equity` no response.
- **Rejected because:** Quebra contrato implícito com frontend que já consome `equity`.

## Consequences

### Positive

- **Single source of truth:** Backend calcula todos os valores financeiros. Frontend não pode mais enviar valores conflitantes.
- **Configurações dinâmicas:** Admin pode ajustar taxas/limites sem deploy. Cache de 1h + invalidação on-update.
- **Modelo matemático fechado:** Sem ambiguidade sobre rateio ou sobras.
- **Auditoria facilitada:** Snapshots gravados na criação permitem reconstruir o cálculo exato.
- **Compliance LGPD-ready:** Cobranças explícitas em momentos definidos, com termo de aceite documentado.

### Negative

- **Trade-off de flexibilidade:** Founder perde controle sobre preço unitário do token (agora é derivado). Pode ser percebido como perda de autonomia estratégica.
- **Mais campos no DB:** +4 colunas em `Campaign` (`adminFeeValue`, `tokenBaseValue`, `tokenSellPrice`, `tokenMintingCost`, `complianceFeeBilled`).
- **Migration com backfill:** Campanhas existentes precisam de script de preenchimento retroativo.

### Neutral

- **`valuation` deixa de ser exposto na API** mas pode permanecer no schema (deprecated) para histórico.
- **`equity` muda de significado** — frontend precisa atualizar UI ("X% vendido" vs "X% equity oferecida").

## Implementation notes

### Arquivos afetados

- `prisma/schema.prisma` (Campaign + SystemConfig)
- `src/api/campaigns/campaigns.service.ts` (cálculos)
- `src/api/campaigns/dto/create-new-round.dto.ts` (DTO limpo)
- `src/api/campaigns/dto/update-campaign.dto.ts` (mesmas remoções)
- `src/common/system-config/` (novo módulo: service + cache + endpoint admin)
- `src/common/billing/` (novo serviço para cobranças)
- `src/api/campaigns/service/compliance-fee.listener.ts` (novo listener)

### Modelo matemático formal

```typescript
// Todas as fórmulas recebem inputs validados pelo SystemConfig

// 1. Input do founder (já validado)
const targetAmount: number; // [CAMPAIGN_MIN_TARGET, CAMPAIGN_MAX_TARGET]
const totalTokens: number; // [CAMPAIGN_MIN_TOKENS, CAMPAIGN_MAX_TOKENS]

// 2. Configs carregadas (cache 1h)
const PLATFORM_ADMIN_FEE_PCT = configs.PLATFORM_ADMIN_FEE_PCT; // 0.20
const TOKEN_MINT_FEE = configs.TOKEN_MINT_FEE; // 1.00

// 3. Cálculos derivados (snapshot gravado no Campaign)
const tokenBaseValue = targetAmount / totalTokens; // R$ por token (face)
const tokenSellPrice = tokenBaseValue; // venda = face (sem taxa no preço)
const adminFeeValue = targetAmount * PLATFORM_ADMIN_FEE_PCT; // 20% da meta
const tokenMintingCost = totalTokens * TOKEN_MINT_FEE; // custo de geração
```

### Exemplo numérico (targetAmount=500000, totalTokens=25000)

| Campo                            | Fórmula             | Valor         |
| -------------------------------- | ------------------- | ------------- |
| `targetAmount`                   | input               | R$ 500.000,00 |
| `totalTokens`                    | input               | 25.000        |
| `tokenBaseValue`                 | 500000 / 25000      | R$ 20,00      |
| `tokenSellPrice`                 | = tokenBaseValue    | R$ 20,00      |
| `adminFeeValue`                  | 500000 × 0.20       | R$ 100.000,00 |
| `tokenMintingCost`               | 25000 × 1.00        | R$ 25.000,00  |
| **Equity (após 10000 vendidos)** | 10000 / 25000 × 100 | 40%           |

### Migration strategy (backfill)

```sql
-- Migration: update_campaign_financials
-- 1. Adicionar colunas como nullable
ALTER TABLE Campaign
  ADD COLUMN adminFeeValue    DECIMAL(15,2) NULL,
  ADD COLUMN tokenBaseValue   DECIMAL(10,2) NULL,
  ADD COLUMN tokenSellPrice   DECIMAL(10,2) NULL,
  ADD COLUMN tokenMintingCost DECIMAL(15,2) NULL,
  ADD COLUMN complianceFeeBilled BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Backfill para campanhas existentes
UPDATE Campaign
SET
  tokenBaseValue   = targetAmount / totalTokens,
  tokenSellPrice   = targetAmount / totalTokens,
  adminFeeValue    = targetAmount * 0.20,  -- hardcoded como fallback
  tokenMintingCost = 0                      -- sem histórico
WHERE tokenBaseValue IS NULL;

-- 3. Depois da migration, alterar para NOT NULL
ALTER TABLE Campaign
  MODIFY COLUMN adminFeeValue    DECIMAL(15,2) NOT NULL,
  MODIFY COLUMN tokenBaseValue   DECIMAL(10,2) NOT NULL,
  MODIFY COLUMN tokenSellPrice   DECIMAL(10,2) NOT NULL;
```

### Rollback plan

Se o deploy falhar em produção:

1. Reverter código (git revert)
2. Manter colunas novas no DB (não destrutivo)
3. Frontend volta a consumir campos antigos (`targetAmount`, `totalTokens`, `tokenPrice` se voltar)

### Validação dinâmica (pattern confirmado)

```typescript
// DTO: valida apenas FORMA
class CreateNewRoundDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  targetAmount!: number;

  @IsInt() @Min(1)
  totalTokens!: number;
}

// Service: valida REGRA via SystemConfig
async createNewRound(startupId: number, dto: CreateNewRoundDto, user: PayloadEntity) {
  const configs = await this.systemConfig.getFinancialConfigs();

  if (dto.targetAmount < configs.CAMPAIGN_MIN_TARGET) {
    throw new BadRequestException({
      code: 'TARGET_BELOW_MINIMUM',
      currentMin: configs.CAMPAIGN_MIN_TARGET,
      receivedValue: dto.targetAmount,
    });
  }
  // ... demais validações
}
```

### Invalidação de cache

```typescript
// system-config.service.ts
async setConfig(key: string, value: number, userId: number) {
  await this.prisma.systemConfig.upsert({
    where: { key },
    update: { value, updatedBy: userId },
    create: { key, value, updatedBy: userId },
  });
  await this.cacheManager.del('financial_configs'); // invalidação imediata
}
```

## Source

- **Grill-me session:** 2026-07-29 (3 perguntas resolvidas)
- **User input:**
  - "Modelo A: Token = fração de captação (Recommended)"
  - "Manter os dois (Recommended)" — para campos de fee
  - "Calcular por tokens vendidos (Recommended)" — para equity
  - "vamos deixar essa validação dimanico pq é um criterio importate do projeto"
- **Related ADRs:**
  - ADR-007 (D8: Alocação de recursos relacional) — citado em `campaign-resource.service.ts:13`
- **Análise crítica prévia:** ver `README.md` §13 (Problemas Conhecidos)
