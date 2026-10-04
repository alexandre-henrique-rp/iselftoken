# Módulo Campaigns

> Documentação técnica e funcional do módulo de **campanhas de captação** da plataforma iSelfToken.
> Cobre endpoints, modelo de dados, regras de negócio, máquina de estados e auditoria.

---

## 1. Visão Geral

O módulo `campaigns` gerencia o **ciclo de vida completo** das rodadas de investimento (campanhas) abertas pelas startups para captar recursos via equity crowdfunding.

**Responsabilidades:**

- CRUD de campanhas (listagem pública, detalhe, criação e edição)
- Aplicação das **regras regulatórias CVM 88/2022** (dados obrigatórios da oferta)
- **Máquina de estados** (`OPEN → PAUSED → CLOSED → FUNDED → PAID_OUT`)
- Regra de **"Nova Rodada"** (B05): só permite nova campanha se a anterior foi 100% vendida + 3 meses
- **Alocação de recursos** por categoria (soma obrigatória = 100%)
- **Auditoria** dos aceites de termos (LGPD Art. 7º, V e Art. 6º, IX)
- Cálculo de **equity oferecida** e **progresso de venda**

**Localização:** `backendnode/src/api/campaigns/`

---

## 2. Endpoints

| Verbo   | Rota                              | Auth    | Quem pode                | Função                                          |
| ------- | --------------------------------- | ------- | ------------------------ | ----------------------------------------------- |
| `GET`   | `/campaigns`                      | público | qualquer                 | Listagem paginada com filtros                   |
| `GET`   | `/campaigns/:id`                  | público | qualquer                 | Detalhe + cálculos (equity, progress)           |
| `GET`   | `/campaigns/:id/checkout`         | sim     | investor                 | Dados públicos p/ tela de checkout              |
| `POST`  | `/campaigns/:startupId`           | sim     | founder (owner) ou admin | **Criar 1ª campanha** (status DRAFT)            |
| `POST`  | `/campaigns/:startupId/new-round` | sim     | founder (owner) ou admin | Criar **nova rodada** (regra B05)               |
| `PATCH` | `/campaigns/:id/draft`            | sim     | founder (owner) ou admin | **Editar campanha DRAFT** (recalcula snapshots) |
| `PATCH` | `/campaigns/:id/action`           | sim     | founder (owner) ou admin | Transição de estado (PAUSE/RESUME/FINISH)       |
| `PATCH` | `/campaigns/:id`                  | sim     | founder (owner) ou admin | **Legado** — atualizar status/campos CVM        |
| `GET`   | `/campaigns/:id/resources`        | público | qualquer (campanhas OPEN/FUNDED/PAID_OUT) | Listar alocações públicas de recursos    |
| `GET`   | `/campaigns/:id/resources/private`| sim     | founder (owner) ou papel administrativo   | Listar alocações de campanhas não públicas |
| `PUT`   | `/campaigns/:id/resources`        | sim     | founder (owner) ou admin                  | Substituir alocações (atômico)            |

### 2.1. Query params de listagem

| Param    | Tipo   | Default | Valores                               |
| -------- | ------ | ------- | ------------------------------------- |
| `page`   | number | 1       | —                                     |
| `limit`  | number | 25      | —                                     |
| `search` | string | —       | Match `title` (case-insensitive)      |
| `status` | enum   | —       | `DRAFT`, `OPEN`, `FUNDED`, `PAID_OUT` |

> ⚠️ `PAUSED` e `CLOSED` existem no enum Prisma mas **não estão expostos** no filtro público (ver §10).

---

## 3. Modelo de Dados

Tabela principal: `Campaign` (`prisma/schema.prisma:620`).

### 3.1. Campos financeiros (core)

| Campo                | Tipo          | Obrigatório          | Descrição                           |
| -------------------- | ------------- | -------------------- | ----------------------------------- |
| `id`                 | Int           | sim                  | PK autoincrement                    |
| `startupId`          | Int           | sim                  | FK → `Startup`                      |
| `title`              | String        | sim                  | Título da oferta (max 120 chars)    |
| `targetAmount`       | Decimal(15,2) | sim                  | Meta de captação                    |
| `minInvestment`      | Decimal(10,2) | sim                  | Investimento mínimo                 |
| `valuation`          | Decimal(15,2) | sim                  | Valuation pré-money                 |
| `tokenPrice`         | Decimal(10,2) | sim                  | Preço unitário do token             |
| `totalTokens`        | Int           | sim                  | Total de tokens emitidos            |
| `tokensSold`         | Int           | sim (default 0)      | Tokens já vendidos                  |
| `deadline`           | DateTime      | sim                  | Data limite da captação             |
| `status`             | enum          | sim (default `OPEN`) | Estado da máquina                   |
| `closedAt`           | DateTime?     | não                  | Setado quando `FINISH` é executado  |
| `reservationFeePaid` | Boolean       | sim (default false)  | Founder pagou taxa de reserva?      |
| `totalRaised`        | Decimal?      | não                  | Calculado dos investments CONFIRMED |
| `transferStarted`    | Boolean       | sim (default false)  | Repasse já foi iniciado             |

### 3.2. Snapshots Financeiros (ADR-008)

Gravados na **criação** da campanha e **recalculados** em `PATCH /:id/draft` quando `targetAmount` ou `totalTokens` mudam. Garantem auditoria/reconstrução histórica sem depender das configs dinâmicas (que podem mudar no tempo).

| Campo                 | Tipo          | Origem                                                           |
| --------------------- | ------------- | ---------------------------------------------------------------- |
| `tokenBaseValue`      | Decimal(10,2) | calculado: `targetAmount / totalTokens`                          |
| `tokenSellPrice`      | Decimal(10,2) | calculado: `targetAmount / totalTokens` (Modelo A — base = sell) |
| `adminFeeValue`       | Decimal(15,2) | calculado: `targetAmount × PLATFORM_ADMIN_FEE_PCT`               |
| `tokenMintingCost`    | Decimal(15,2) | calculado: `totalTokens × TOKEN_MINT_FEE`                        |
| `complianceFeeBilled` | Boolean       | flag — setada após cobrança quando `status=FUNDED`               |

> 📐 **Referência completa:** ver [ADR-008 — Modelo Financeiro & de Cobranças](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/campaigns/decisions/ADR-008-financial-model.md).

### 3.3. Campos CVM (Resolução CVM 88/2022)

Obrigatórios por lei para ofertas de crowdfunding:

| Campo                     | Tipo      | Validação                                                 |
| ------------------------- | --------- | --------------------------------------------------------- |
| `dataLancamentoRodada`    | DateTime? | ISO 8601                                                  |
| `objetivoCaptacao`        | Text?     | 10–500 chars                                              |
| `oQueEsperaAlcancar`      | Text?     | 10–500 chars                                              |
| `participacaoLucros`      | Boolean   | default `false`                                           |
| `faturamentoMinimoLucros` | Decimal?  | ≥ 0                                                       |
| `beneficiosAdicionais`    | Boolean   | default `false`                                           |
| `beneficiosDescricao`     | Text?     | 10–500 chars (obrigatório se `beneficiosAdicionais=true`) |
| `aceiteTermoRepasse`      | Boolean   | **default `false` — LGPD Art. 7º, V**                     |
| `declaracaoVeracidade`    | Boolean   | **default `false` — LGPD Art. 6º, IX**                    |

> ⚠️ Mudar `aceiteTermoRepasse` ou `declaracaoVeracidade` para `true` gera **entrada imutável** em `CampaignOfferAuditLog` (ver §8).

### 3.4. Campos de captação (pitch)

Realocados de `Startup → Campaign` (M7-S21) para ficarem junto da oferta:

| Campo                | Validação          |
| -------------------- | ------------------ |
| `problema`           | Text, 10–500 chars |
| `solucao`            | Text, 10–500 chars |
| `modeloReceita`      | Text, 10–300 chars |
| `diferencial`        | Text, 10–500 chars |
| `mercadoAlvo`        | Text, 10–500 chars |
| `sociosCount`        | Int ≥ 1            |
| `dedicacao`          | Text, 10–200 chars |
| `compradores`        | Text, 10–500 chars |
| `investimentoPrevio` | Text, 10–500 chars |
| `concorrencia`       | Text, 10–500 chars |

### 3.5. Relacionamentos

```
Campaign
  ├── startup          Startup          (N:1)
  ├── investments      Investment[]     (1:N)
  ├── tokens           Token[]          (1:N)
  ├── payments         Payment[]        (1:N, ex: taxa de reserva)
  ├── resources        CampaignResourceAllocation[] (1:N)
  └── auditLogs        CampaignOfferAuditLog[]      (1:N)
```

### 3.6. Tabelas satélite

**`CampaignResourceAllocation`** — alocação de uso de recursos (`schema.prisma:703`)

| Campo                  | Tipo                    | Constraint                     |
| ---------------------- | ----------------------- | ------------------------------ |
| `id`                   | Int                     | PK                             |
| `campaignId`           | Int                     | FK → Campaign (cascade delete) |
| `categoria`            | enum `ResourceCategory` | —                              |
| `percentual`           | Int                     | 1–100                          |
| `descricaoCustomizada` | String?                 | obrigatório se `CUSTOMIZADO`   |
| `@@unique`             | —                       | `(campaignId, categoria)`      |

Enum `ResourceCategory`: `FUNDADOR, DESENVOLVIMENTO, COMERCIAL, MARKETING, NUVEM, JURIDICO, RESERVA_CAIXA, CUSTOMIZADO`

**`CampaignOfferAuditLog`** — auditoria de aceite CVM (`schema.prisma:724`)

Append-only. Campos: `id, campaignId, action, ip, userAgent, userId, occurredAt`. `action` ∈ `{ACEITE_TERMO_REPASSE, DECLARACAO_VERACIDADE}`.

---

## 4. Máquina de Estados

### 4.1. Diagrama

```
                  ┌─────────┐
                  │  DRAFT  │  (criada, ainda não abriu)
                  └────┬────┘
                       │ admin.approve (TODO)
                       ▼
                  ┌─────────┐
        ┌────────►│  OPEN   │◄────────┐
        │         └────┬────┘         │
        │   action=PAUSE│              │ action=RESUME
        │              ▼              │
        │         ┌─────────┐         │
        │         │ PAUSED  │─────────┘
        │         └────┬────┘
        │              │ action=FINISH
        │              ▼
        │         ┌─────────┐
        └─────────┤ CLOSED  │
                  └────┬────┘
                       │ deadline atingido + totalTokens = tokensSold
                       ▼
                  ┌─────────┐
                  │ FUNDED  │  (terminal — repasse financeiro)
                  └─────────┘

                       │
                       ▼
                  ┌──────────┐
                  │ PAID_OUT │  (repasse concluído)
                  └──────────┘
```

### 4.2. Transições permitidas (`executeAction`)

| Status atual | Ações permitidas   | Novo status                         |
| ------------ | ------------------ | ----------------------------------- |
| `OPEN`       | `PAUSE`            | `PAUSED`                            |
| `PAUSED`     | `RESUME`, `FINISH` | `OPEN`, `CLOSED`                    |
| `CLOSED`     | `FINISH`           | `CLOSED` (no-op ou re-confirmação)  |
| `FUNDED`     | `[]`               | terminal                            |
| `PAID_OUT`   | `[]`               | terminal                            |
| `DRAFT`      | `[]`               | (sem ação até admin.approve — TODO) |

Ação inválida → **403 Forbidden** com payload:

```json
{
  "code": "ACAO_NAO_PERMITIDA_POS_RODADA",
  "message": "Acao X nao permitida para status Y",
  "allowedActions": ["..."]
}
```

---

## 5. Regras de Negócio

### 5.1. Regra B05 — "Nova Rodada" (M5-S09 / T032)

**Aplicada em:** `POST /campaigns/:startupId/new-round`

Uma nova campanha só pode ser criada se:

1. **A campanha anterior da startup foi 100% vendida** (`tokensSold == totalTokens`)
2. **OU** nunca houve campanha anterior (`lastClosed == null`)
3. **E** se houve campanha anterior, **≥ 3 meses** desde `closedAt`

```ts
const THREE_MONTHS_MS = 3 * 30 * 24 * 60 * 60 * 1000;

if (lastClosed && lastClosed.tokensSold < lastClosed.totalTokens) {
  throw new BadRequestException('RODADA_ANTERIOR_NAO_VENDIDA');
}
if (
  lastClosed &&
  new Date(lastClosed.closedAt) > Date.now() - THREE_MONTHS_MS
) {
  throw new BadRequestException('INTERVALO_MINIMO_3_MESES');
}
```

**Quem pode:** founder da startup (dono) ou `ADMIN`.

### 5.2. Regra B06 — State Machine Pós-Rodada (M5-S09 / T033)

**Aplicada em:** `PATCH /:id/action`

Ver tabela §4.2. **PATCH genérico `/:id` está bloqueado** em campanhas `CLOSED` ou `FUNDED` se a intenção for mudar `status`.

### 5.3. Regra de Captação — Apenas `OPEN` aceita investimentos

**Aplicada em:** `GET /:id/checkout`, `POST /investments`

```ts
if (campaign.status !== 'OPEN') {
  return ResponseDto.error(
    `Campanha está com status ${campaign.status}. Apenas campanhas OPEN aceitam investimentos.`,
    400,
  );
}
```

### 5.4. Regra CVM — Warnings de validação cruzada

**Aplicada em:** `getCheckoutData`, `update`

```ts
if (faturamentoMinimoLucros != null && participacaoLucros === false) {
  warnings.push(
    'ATENCAO: faturamentoMinimoLucros definido, mas participacaoLucros esta desligada.',
  );
}
```

Logado como **warning** (não bloqueante), mas visível na resposta de checkout.

### 5.5. Regra de Recursos — Soma obrigatória = 100%

**Aplicada em:** `PUT /:id/resources`, `CreateNewRoundDto.resourceAllocations`

- Cada percentual: **1–100**
- Soma total: **exatamente 100**
- `CUSTOMIZADO` exige `descricaoCustomizada` não vazia
- Sem categorias duplicadas no mesmo input
- Operação atômica (`$transaction`): `deleteMany` + `create` em sequência

```ts
if (soma !== 100)
  throw new BadRequestException('Soma deve ser exatamente 100%. Atual: X%');
```

### 5.6. Regra de Configuração Dinâmica (ADR-008)

**Aplicada em:** `POST /:startupId`, `POST /:startupId/new-round`, `PATCH /:id/draft`.

Criação/edição valida contra `SystemConfig` (fonte de verdade dinâmica, sem hardcode):

- `targetAmount` ∈ [`CAMPAIGN_MIN_TARGET`, `CAMPAIGN_MAX_TARGET`]
- `totalTokens` ∈ [`CAMPAIGN_MIN_TOKENS`, `CAMPAIGN_MAX_TOKENS`]

Falha → **400 Bad Request** com código estruturado:

| Código                         | Quando                                   | Campos extras                 |
| ------------------------------ | ---------------------------------------- | ----------------------------- |
| `TARGET_BELOW_MINIMUM`         | `targetAmount < CAMPAIGN_MIN_TARGET`     | `currentMin`, `receivedValue` |
| `TARGET_ABOVE_MAXIMUM`         | `targetAmount > CAMPAIGN_MAX_TARGET`     | `currentMax`, `receivedValue` |
| `TOKENS_BELOW_MINIMUM`         | `totalTokens < CAMPAIGN_MIN_TOKENS`      | `currentMin`, `receivedValue` |
| `TOKENS_ABOVE_MAXIMUM`         | `totalTokens > CAMPAIGN_MAX_TOKENS`      | `currentMax`, `receivedValue` |
| `STARTUP_ALREADY_HAS_CAMPAIGN` | 2ª campanha via `POST /:startupId`       | —                             |
| `CAMPAIGN_NOT_EDITABLE`        | `PATCH /:id/draft` em campanha não-DRAFT | —                             |

**Snapshots financeiros (§3.2) são gravados na criação** e **recalculados no PATCH /:id/draft** se `targetAmount` ou `totalTokens` mudarem. Ver `CampaignFinancialHelper.validateCampaignLimits` e `computeFinancialSnapshots` em [service/campaign-financial.helper.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/campaigns/service/campaign-financial.helper.ts).

---

## 6. Autorização

| Endpoint                     | Regras                                                             |
| ---------------------------- | ------------------------------------------------------------------ |
| `GET /` e `GET /:id`         | público (exibe apenas campanhas visíveis)                          |
| `GET /:id/checkout`          | autenticado (qualquer role)                                        |
| `POST /:startupId`           | `founder == startup.founderId` **OU** `user.role == ADMIN`         |
| `POST /:startupId/new-round` | `founder == user.id` (dono da startup) **OU** `user.role == ADMIN` |
| `PATCH /:id/draft`           | mesma regra + `campaign.status === DRAFT`                          |
| `PATCH /:id/action`          | mesma regra                                                        |
| `PATCH /:id` (legado)        | mesma regra                                                        |
| `GET /:id/resources`         | público para campanhas `OPEN`, `FUNDED` e `PAID_OUT`; retorna apenas `categoria`, `percentual` e `descricaoCustomizada` |
| `GET /:id/resources/private` | `AuthGuard` + founder owner ou papel administrativo (`ADMIN`, `FINANCEIRO`, `COMPLIANCE`) |
| `PUT /:id/resources`         | mesma regra                                                        |

Violação → **403 Forbidden** com código `NOT_OWNER` (ou `CAMPAIGN_NOT_EDITABLE` em PATCH DRAFT fora de DRAFT, ou `ACAO_NAO_PERMITIDA_POS_RODADA` se for transição inválida).

---

## 7. Cálculos Derivados

### 7.1. Equity oferecida (em `findOne` e `getCheckoutData`)

```ts
const equity = (targetAmount / valuation) * 100;
```

Retornado como string formatada: `"12.34%"`.

### 7.2. Progresso de venda

```ts
const progress = tokensSold > 0 ? (tokensSold / totalTokens) * 100 : 0;
```

Retornado como `"45.0%"` e `remainingTokens = totalTokens - tokensSold`.

---

## 8. Auditoria de Aceite CVM (LGPD)

Toda vez que `aceiteTermoRepasse` ou `declaracaoVeracidade` mudam para `true`, é gravada uma linha em `CampaignOfferAuditLog`:

| Quem                    | O quê                     | Quando                            | Onde                               |
| ----------------------- | ------------------------- | --------------------------------- | ---------------------------------- |
| `createAuditLogEntry()` | INSERT com IP, UA, userId | `update()` ou `requestNewRound()` | tabela `campaign_offer_audit_logs` |

**Natureza:** append-only. Não há UPDATE nem DELETE nessa tabela (LGPD Art. 7º, V + Art. 6º, IX — fundamento de **consentimento** e **finalidade**).

> ⚠️ **Atualmente** usa `$executeRawUnsafe` (raw SQL). Migrar para Prisma model está planejado (S01 do roadmap).

---

## 9. Endpoints — Detalhes e Exemplos

### 9.1. `POST /campaigns/:startupId/new-round`

Cria nova campanha para uma startup (sujeito à regra B05).

```bash
curl -X POST http://localhost:7077/campaigns/123/new-round \
  -H "Cookie: session_id=..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Rodada Seed 2026",
    "targetAmount": 500000,
    "minInvestment": 1000,
    "valuation": 5000000,
    "tokenPrice": 10,
    "totalTokens": 50000,
    "deadline": "2026-12-31T23:59:59Z",
    "objetivoCaptacao": "Expandir operação para 3 estados",
    "oQueEsperaAlcancar": "Atingir R$ 2M de faturamento até Q4",
    "participacaoLucros": true,
    "faturamentoMinimoLucros": 500000,
    "aceiteTermoRepasse": true,
    "declaracaoVeracidade": true,
    "resourceAllocations": [
      { "categoria": "DESENVOLVIMENTO", "percentual": 50 },
      { "categoria": "MARKETING", "percentual": 30 },
      { "categoria": "RESERVA_CAIXA", "percentual": 20 }
    ]
  }'
```

### 9.2. `PATCH /campaigns/:id/action`

Transição de estado:

```bash
curl -X PATCH http://localhost:7077/campaigns/42/action \
  -H "Cookie: session_id=..." \
  -H "Content-Type: application/json" \
  -d '{ "action": "PAUSE" }'
```

Ações válidas: `PAUSE`, `RESUME`, `FINISH`.

### 9.3. `PUT /campaigns/:id/resources`

Substitui alocações atomicamente:

```bash
curl -X PUT http://localhost:7077/campaigns/42/resources \
  -H "Cookie: session_id=..." \
  -H "Content-Type: application/json" \
  -d '{
    "resourceAllocations": [
      { "categoria": "FUNDADOR", "percentual": 60 },
      { "categoria": "DESENVOLVIMENTO", "percentual": 40 }
    ]
  }'
```

### 9.4. `POST /campaigns/:startupId` — Criar 1ª campanha (DRAFT)

Cria a **1ª campanha** da startup (status DRAFT). Sem regra B05. Bloqueia se já existe qualquer campanha prévia.

```bash
curl -X POST http://localhost:7077/campaigns/123 \
  -H "Cookie: session_id=..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Rodada Seed 2026",
    "targetAmount": 500000,
    "minInvestment": 1000,
    "valuation": 5000000,
    "tokenPrice": 20,
    "totalTokens": 25000,
    "deadline": "2026-12-31T23:59:59Z"
  }'
```

**Resposta (201):**

```json
{
  "error": false,
  "message": "Campanha criada em rascunho (DRAFT).",
  "codigo": 201,
  "data": {
    "id": 99,
    "status": "DRAFT",
    "tokenBaseValue": "20.00",
    "tokenSellPrice": "20.00",
    "adminFeeValue": "100000.00",
    "tokenMintingCost": "25000.00"
  }
}
```

**Erros:**

- `400 TARGET_BELOW_MINIMUM` / `TARGET_ABOVE_MAXIMUM` — `targetAmount` fora de [`CAMPAIGN_MIN_TARGET`, `CAMPAIGN_MAX_TARGET`].
- `400 TOKENS_BELOW_MINIMUM` / `TOKENS_ABOVE_MAXIMUM` — `totalTokens` fora de [`CAMPAIGN_MIN_TOKENS`, `CAMPAIGN_MAX_TOKENS`].
- `400 STARTUP_ALREADY_HAS_CAMPAIGN` — startup já tem campanha (use `POST /:startupId/new-round` para criar nova rodada).
- `403 NOT_OWNER` — caller não é o founder da startup nem ADMIN.

### 9.5. `PATCH /campaigns/:id/draft` — Editar campanha DRAFT

Edita campos da campanha **apenas em status DRAFT**. Revalida limites dinamicamente se `targetAmount`/`totalTokens` mudam e recalcula snapshots financeiros (ADR-008).

```bash
curl -X PATCH http://localhost:7077/campaigns/99/draft \
  -H "Cookie: session_id=..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Rodada Seed Atualizada",
    "targetAmount": 600000,
    "totalTokens": 20000,
    "objetivoCaptacao": "Expandir a operacao para 3 estados brasileiros"
  }'
```

**Resposta (200):** `Campaign` atualizada com snapshots recalculados.

**Erros:**

- `403 NOT_OWNER` — caller não é o founder da startup nem ADMIN.
- `403 CAMPAIGN_NOT_EDITABLE` — campanha não está em `DRAFT` (use `PATCH /:id/action` para mudar status).
- `400 TARGET_BELOW_MINIMUM` / `TOKENS_ABOVE_MAXIMUM` / etc — novos valores financeiros fora dos limites dinâmicos.

---

## 10. Mapeamento de Status (Prisma ↔ UI)

| Prisma (`CampaignStatus`) | UI atual (`startup/entities`) | Significado                     |
| ------------------------- | ----------------------------- | ------------------------------- |
| `DRAFT`                   | `edicao`                      | Criada, ainda não abriu         |
| `OPEN`                    | `aberto`                      | Aceitando investimentos         |
| `PAUSED`                  | _(não mapeado)_               | Pausada temporariamente         |
| `CLOSED`                  | _(não mapeado)_               | Finalizada pelo founder         |
| `FUNDED`                  | `financiado`                  | Meta atingida, repasse iniciado |
| `PAID_OUT`                | `pago`                        | Repasse concluído               |

> ⚠️ **Inconsistência conhecida:** o enum do Prisma tem 6 valores, mas a entity UI só traduz 4 (PT-BR). `PAUSED` e `CLOSED` não têm equivalente na UI atual. Planejado: centralizar em `src/common/mappers/campaign-status.mapper.ts` (S02 do roadmap).

---

## 11. Integrações com Outros Módulos

### Consumidores (leem dados de Campaign)

- **`investments/`** — valida `status === OPEN` antes de criar investment
- **`payment/`** — webhook C6 consulta `campaign.status` para liberar repasse
- **`v2/payments/`** — `create-checkout.dto.ts` aceita `campaignId` no contexto
- **`startup/`** — `startup-round.service.ts` orquestra pausa/fechamento
- **`admin/`** — dashboards (métricas agregadas)
- **`marketplace/`** — tokens da campanha são listados para P2P

### Consumidos (Campaign lê dados externos)

- **`Startup`** — valida ownership (`founderId == user.id`)
- **`AuthGuard`** — protege endpoints privados
- **`PrismaService`** — único acesso ao banco
- **`SystemConfigService`** ([`src/common/system-config/AGENTS.md`](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/system-config/AGENTS.md)) — fonte de verdade para limites dinâmicos e snapshots financeiros (S01.2b). Injetado em `CampaignsCreateService` e `CampaignsStateService`.

### 11.5. Configurações Dinâmicas (SystemConfig)

Limites e taxas são lidos via `SystemConfigService` (cache Redis, TTL 1h). Mudanças via `PATCH /admin/configs/:key` invalidam cache imediatamente.

**Configs vigentes (seed S01.1):**

| Key                      | Default  | Função                                 |
| ------------------------ | -------- | -------------------------------------- |
| `CAMPAIGN_MIN_TARGET`    | 500000   | Captação mínima (R$)                   |
| `CAMPAIGN_MAX_TARGET`    | 10000000 | Captação máxima (R$)                   |
| `CAMPAIGN_MIN_TOKENS`    | 100      | Mínimo de tokens emitidos              |
| `CAMPAIGN_MAX_TOKENS`    | 1000000  | Máximo de tokens emitidos              |
| `TOKEN_BASE_VALUE`       | 200      | Valor de face do token                 |
| `TOKEN_TRANSACTION_FEE`  | 40       | Taxa de transação (%)                  |
| `TOKEN_MINT_FEE`         | 1        | Custo de geração por token (R$)        |
| `PLATFORM_ADMIN_FEE_PCT` | 0.20     | 20% da meta (admin fee)                |
| `COMPLIANCE_FEE`         | 500      | Taxa fixa cobrada após `status=FUNDED` |

**Validação dinâmica:**

- DTOs validam apenas **forma** (`@IsNumber`, `@IsInt`, `@IsString`).
- O service valida **regras** comparando com essas configs via `CampaignFinancialHelper.validateCampaignLimits()`.
- Mensagens de erro retornam `currentMin`/`currentMax`/`receivedValue` para a UI exibir contexto útil.

**Para alterar limites sem deploy:** `PATCH /admin/configs/CAMPAIGN_MIN_TARGET` com `{ "value": 600000 }`. Cache invalida automaticamente e o próximo request já usa o novo valor.

---

## 12. Como Testar

### 12.1. Unitários

```bash
cd backendnode
npm test -- campaigns.service.spec
```

Cobertura atual: `campaigns.service.spec.ts` (10KB) — testa `findAll`, `findOne`, `executeAction`, `update` e caminhos de erro.

### 12.2. E2E (fluxo UX completo)

```bash
npm run test:e2e:flows
```

Testa o fluxo: founder cria startup → cria campanha → investidor investe → campanha é financiada. Localização: `backendnode/test/e2e/flows/`.

### 12.3. Smoke (manual)

```bash
# 1. Subir stack
cd docker && docker-compose up -d

# 2. Subir backend
cd backendnode && npm run start:dev

# 3. Acessar Swagger
open http://localhost:7077/docs

# 4. Testar listagem pública
curl http://localhost:7077/campaigns | jq

# 5. Testar detalhe
curl http://localhost:7077/campaigns/1 | jq
```

---

## 13. Problemas Conhecidos / TODOs

| Severidade            | Item                                                                      | Status                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| ✅ Resolvido (S01.2b) | **Não existe endpoint público para criar a 1ª campanha**                  | `POST /campaigns/:startupId` cria a 1ª campanha em DRAFT. Snapshots financeiros calculados via ADR-008.                              |
| ✅ Resolvido (S01.2a) | **Duplicação entre `create-new-round.dto.ts` e `update-campaign.dto.ts`** | `CampaignsCreateService` + `CampaignsStateService` compartilham validação via `CampaignFinancialHelper`.                             |
| 🟠 Alta               | **Service monolítico** (parcialmente resolvido em S01.2a)                 | `CampaignsService` foi quebrado em 4 services (Crud/Create/State/Resource). `CampaignsService` legado ainda existe — remover em S02. |
| 🟡 Média              | **Raw SQL no audit (`$executeRawUnsafe`)**                                | Migrar para Prisma model — pendente (fora do escopo de S01).                                                                         |
| 🟡 Média              | **`PATCH /:id` é legado/morto**                                           | Remover ou migrar frontend para `/action` (S02).                                                                                     |
| 🟡 Média              | **Mapeamento de status implícito**                                        | Centralizar em `common/mappers/` (S02).                                                                                              |
| 🟡 Média              | **Sem moderação admin (approve DRAFT)**                                   | Criar `CampaignModerationService` (S03).                                                                                             |
| 🟢 Baixa              | **Falta ADR da máquina de estados**                                       | Documentar em S03.                                                                                                                   |
| 🟢 Baixa              | **Cobertura E2E dos fluxos críticos**                                     | S01.3a entregou E2E de criação de 1ª campanha (7 cenários). Faltam 4 fluxos: cancelamento, repasse, checkout e edição pós-DRAFT.     |

---

## 14. Roadmap (resumo)

1. **S01 — Fundação:** ✅ **ENTREGUE** (S01.2a + S01.2b + S01.3a)
   - S01.1: SystemConfig (cache Redis, seed configs financeiras)
   - S01.2a: 3 services coesos (Crud/Create/State) — quebra do `CampaignsService` monolítico
   - S01.2b: 2 novos endpoints (`POST /:startupId`, `PATCH /:id/draft`) + fórmula ADR-008 (Modelo A) + snapshots
   - S01.3a: E2E dos 7 cenários de criação/edição de campanha + docs
2. **S02 — Refatoração:** quebrar `CampaignsService` em 4 services coesos (parcialmente feito), normalizar status, remover legado
3. **S03 — Moderação:** `CampaignModerationService` (admin), `EligibilityService`, ADR state machine
4. **S04 — Qualidade:** E2E dos 5 fluxos críticos restantes (cancel, repasse, checkout, edit-pós-DRAFT)

---

## 15. Architecture Decision Records (ADRs)

Decisões de design deste módulo são documentadas em [`decisions/`](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/campaigns/decisions):

- **[ADR-008 — Modelo Financeiro & de Cobranças](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/campaigns/decisions/ADR-008-financial-model.md)** (Accepted, 2026-07-29)
  - Fórmula de tokens: **Modelo A** — `tokenSellPrice = targetAmount / totalTokens` (founder controla granularidade)
  - Campos de fee: `reservationFeePaid` (pré-criação) + `complianceFeeBilled` (pós-FUNDED)
  - Equity: calculado por tokens vendidos (`tokensSold / totalTokens`)
  - Validação de limites via `SystemConfig` (dinâmico, não hardcoded)

---

## 16. Referências

- **Schema Prisma:** `backendnode/prisma/schema.prisma:620`
- **Migrations:** `backendnode/prisma/migrations/`
- **AGENTS.md local:** [AGENTS.md](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/campaigns/AGENTS.md)
- **Mapa de API:** `backendnode/src/api/AGENTS.md`
- **Conformidade LGPD:** `~/.config/opencode/training/lgpd-brasil.md` (CVM Art. 7º, V + Art. 6º, IX)
- **Resolução CVM 88/2022:** base regulatória para os campos `objetivoCaptacao`, `participacaoLucros`, etc.

---

**Mantido por:** squad iSelfToken / M7-S22 (CVM Compliance)
**Última atualização:** 2026-07-29
