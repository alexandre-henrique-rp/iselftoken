# PRD — Marketplace: Implementation Spec (PRD-IMPL)

**Versão:** 1.0 — **Pronto para Implementação**
**Data:** 2026-08-17
**Status:** ✅ DEC-MKT-01..03 resolvidas com defaults (podem ser revisadas)
**Pré-requisito de leitura:** `scripts/marketplace/PRD_MARKETPLACE_REGRAS.md` (PRD de análise — racional, histórias, métricas)
**Pós-requisito de leitura:** `backendnode/docs/migration-marketplace-pin-spec.md` (spec detalhada da migration — produzido em MKT-03)

> ⚠️ Este documento é o **plano de execução**. Contém contratos de API exatos, migration Prisma, pseudocódigo, sequência de sprints, critérios de aceite. Use-o como "blueprint" para gerar o código.

---

## Índice

1. [Resumo executivo](#1-resumo-executivo)
2. [DEC-MKT resolvidas (defaults)](#2-dec-mkt-resolvidas-defaults)
3. [Modelo de dados (DDL exato)](#3-modelo-de-dados-ddl-exato)
4. [Contratos de API (request/response)](#4-contratos-de-api-requestresponse)
5. [Pseudocódigo do algoritmo de score](#5-pseudocódigo-do-algoritmo-de-score)
6. [UI — Wireframes e payloads](#6-ui--wireframes-e-payload)
7. [Eventos e Jobs](#7-eventos-e-jobs)
8. [Sequência de sprints (4 sprints)](#8-sequência-de-sprints-4-sprints)
9. [Critérios de aceite por RF](#9-critérios-de-aceite-por-rf)
10. [Riscos e mitigações](#10-riscos-e-mitigações)
11. [Smoke tests pós-deploy](#11-smoke-tests-pós-deploy)

---

## 1. Resumo executivo

**Problema:** TechInnovate está em captação ativa (R$ 5M, OPEN) mas tem `score=0`, então nunca aparece em `/home` ou em "Rodadas em Destaque". O founder não tem visibilidade nem mecanismo pra melhorar.

**Solução em 1 frase:** 3 pinos manuais (ADMIN/COMPLIANCE, audit log) + score 0..100 calculado por job + em eventos (upload, KYC, selo, status de campanha) + card no `/founder/dashboard` mostrando score + breakdown + botão "Como melhorar?".

**Estimativa:** 4 sprints (1 cada: S1=schema/seed, S2=score+endpoint, S3=pin/UI founder, S4=admin UI + cron + polish).

**Stack usada (já em produção, ZERO instalação nova):**
- `@nestjs/schedule` v4 para cron (já em uso em `payment.cron.ts`, `campaign-deadline.cron.ts`, `uploads/jobs/cleanup.job.ts`)
- `@nestjs/event-emitter` v2 para invalidação reativa (já usado em `payment/events/`)
- Prisma + MySQL 8 (já em produção)
- Redis 7.4 (já em produção — usado pra locks e cache)
- shadcn/ui + TanStack Query no frontend (já em uso)

---

## 2. DEC-MKT resolvidas (defaults)

| ID | Decisão | Default aplicado | Como reverter |
|---|---|---|---|
| **DEC-MKT-01** | Limite de pinos | **3** (pinned simultâneos) | Mudar constante `MAX_PINNED` em `marketplace.service.ts:18` + regra de UI |
| **DEC-MKT-02** | Score público | **Tooltip resumido na home + detalhe só no dashboard privado** | Adicionar flag `showPublicScore` em `MarketplaceCardDto` |
| **DEC-MKT-03** | Recálculo | **Cron 03:00 BRT + listeners em eventos** (NestJS EventEmitter2) | Trocar decorator `@Cron` por `@OnEvent` apenas ou vice-versa |

Se stakeholder reverter alguma DEC, ajustar **apenas** o que está marcado em "Como reverter".

---

## 3. Modelo de dados (DDL exato)

### 3.1 Migration Prisma — `add_marketplace_pinning_score`

**Localização:** `backendnode/prisma/migrations/<timestamp>_add_marketplace_pinning_score/migration.sql`

```sql
-- ============================================================
-- Migration: add_marketplace_pinning_score
-- Data: 2026-08-17
-- Referencia: PRD_MARKETPLACE_IMPL.md §3
-- ============================================================

-- 3.1 Startups: pinning manual (RF-01) + score cache (RF-08)
ALTER TABLE `startups`
  ADD COLUMN `manuallyPinned` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN `manuallyPinnedBy` INT NULL,
  ADD COLUMN `manuallyPinnedAt` DATETIME(3) NULL,
  ADD COLUMN `manuallyPinnedReason` VARCHAR(500) NULL,
  ADD COLUMN `scoreLastCalculatedAt` DATETIME(3) NULL,
  ADD COLUMN `scoreBreakdown` JSON NULL,
  ADD CONSTRAINT `fk_pinned_by_user`
    FOREIGN KEY (`manuallyPinnedBy`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Indice composto: query principal é "ORDER BY manuallyPinned DESC, score DESC"
CREATE INDEX `idx_startups_pinned_score` 
  ON `startups` (`manuallyPinned` DESC, `score` DESC);

-- 3.2 AuditLog: acoes de pin/unpin (RF-10)
ALTER TABLE `AuditLog`
  MODIFY COLUMN `action` ENUM(
    -- existing actions...
    'CREATE','UPDATE','DELETE','LOGIN','LOGOUT','KYC_APPROVED','KYC_REJECTED',
    -- novas:
    'PIN_STARTUP','UNPIN_STARTUP','SCORE_RECALCULATED'
  ) NOT NULL;

-- (NÃO-EXECUTAR: exemplo para knowledge)
-- 3.3 Validar pinos <= 3 com trigger (DB-level safety net)
DELIMITER $$
CREATE TRIGGER `trg_check_max_pinned`
BEFORE UPDATE ON `startups`
FOR EACH ROW
BEGIN
  DECLARE pinned_count INT;
  IF NEW.manuallyPinned = 1 THEN
    SELECT COUNT(*) INTO pinned_count
    FROM `startups`
    WHERE `manuallyPinned` = 1 AND `id` != NEW.id;
    IF pinned_count >= 3 THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'MAX_PINNED_EXCEEDED';
    END IF;
  END IF;
END$$
DELIMITER ;
```

### 3.2 Prisma schema (atualização)

**Arquivo:** `backendnode/prisma/schema.prisma`

```prisma
model Startup {
  // ...campos existentes...

  /// Pinning manual (max 3 simultâneos). Audit Log + email DPO obrigatórios.
  manuallyPinned        Boolean   @default(false)
  manuallyPinnedBy      Int?
  manuallyPinnedAt      DateTime?
  manuallyPinnedReason  String?   @db.VarChar(500)
  manuallyPinnedByUser  User?     @relation("StartupPinnedBy", fields: [manuallyPinnedBy], references: [id], onDelete: SetNull)

  /// Cache do score 0..100 calculado por job diário + listeners.
  /// `scoreBreakdown` JSON com detalhes por critério (educacional pro founder).
  scoreLastCalculatedAt DateTime?
  scoreBreakdown        Json?

  @@index([manuallyPinned, score(sort: Desc)])  // query do featured
}

model User {
  // ...campos existentes...
  pinnedStartups  Startup[] @relation("StartupPinnedBy")
}

enum AuditAction {
  // ...existente...
  PIN_STARTUP
  UNPIN_STARTUP
  SCORE_RECALCULATED
}
```

### 3.3 Seed pós-migration (idempotente)

**Arquivo:** `backendnode/prisma/seed.ts` (patch mínimo)

```typescript
// Após criar a TechInnovate (slug='techinnovate'), adicionar:
const scoreSeed = await prisma.startup.update({
  where: { slug: 'techinnovate' },
  data: {
    scoreBreakdown: {
      cvmRequired: 20,
      kycComplete: 15,
      completedCampaigns: 0,
      seloVerified: 0,
      seloPartnership: 0,
      engagement: 5,
      extras: 0,
      media: 0,
      redes: 5,
    },
    scoreLastCalculatedAt: new Date(),
  },
});
// Score final: 45 (não 75 — porque captação em 45% ainda não atinge 50%)
```

---

## 4. Contratos de API (request/response)

> Todos os endpoints em PT-BR. Sucesso: `ResponseDto.success()`. Erro: `ResponseDto.error()`.

### 4.1 `GET /api/startups/featured` (PÚBLICO, **consolidado**)

**Consolida em um único endpoint** (substitui os 2 atuais: `/api/startups/featured` + `/api/marketplace/featured`).

```http
GET /api/startups/featured?limit=10
ResponseDto.success(200, {
  data: [
    {
      id: 1,
      slug: 'techinnovate',
      nome: 'TechInnovate',
      logo: 'https://cdn.iselfoken.com/...',
      cover: 'https://cdn.iselfoken.com/...',
      sector: 'AI',
      segment: 'Inteligência Artificial',
      estagio: 'SERIES_A',
      // CAMPOS ESPECÍFICOS DO MARKETPLACE
      position: 1,                       // 1..N dentro do featured
      reason: 'PINNED_PARTNERSHIP',      // 'PINNED_*' ou 'AUTO_SCORE'
      pinnedReason: 'Acelerada Y Combinator 2026',  // presente se reason comeca com PINNED_
      featuredScore: 88,                // publico: arredondado (sem detalhes)
      // CAMPOS DA CAMPANHA ATIVA
      campaign: {
        id: 1,
        title: 'Rodada Série A - Expansão Nacional',
        targetAmount: 5000000,
        totalRaised: 2250000,
        progress: 0.45,                   // 0..1
        deadline: '2026-12-31T23:59:59Z',
        tokenPrice: 50.0,
      },
      // SELOS
      seals: ['verified', 'accelerated'],  // apenas categorias (sem detalhamento)
    },
    // ...
    {
      id: 4,
      slug: 'neuralforge',
      ...
      position: 4,
      reason: 'AUTO_SCORE',
      featuredScore: 92,
    },
  ],
  total: 10,
  pinnedCount: 1,                       // 0..3
  config: {
    featuredLimit: 10,
    pinnedMax: 3,
    version: '2026-08-17.1',
  },
});
```

**Cache:** Redis key `marketplace:featured:v1`, TTL 5min. Invalidação on-event (`startup.scoreUpdated`) + on-pin.

---

### 4.2 `GET /api/startups/:id/marketplace-info` (privado — só ADMIN, COMPLIANCE ou FOUNDER da startup)

```http
GET /api/startups/1/marketplace-info
ResponseDto.success(200, {
  startupId: 1,
  nome: 'TechInnovate',
  // SCORE DETALHADO
  score: 45,
  scoreCalculatedAt: '2026-08-17T03:00:00Z',
  breakdown: {
    cvmRequired: { earned: 20, max: 20, count: '6/6', docs: ['MIE','CONTRATO_SOCIAL','CNPJ','BALANCO_ATUAL','DECLARACAO_VERACIDADE','ATA_ELEICAO'] },
    kycComplete: { earned: 15, max: 15, count: '4/4', docs: ['avatar','documento','comprovante','biofacial'] },
    completedCampaigns: { earned: 0, max: 10, count: '0/1+' },
    seloVerified: { earned: 0, max: 10, attached: false },
    seloPartnership: { earned: 0, max: 10, attached: false },
    engagement: { earned: 5, max: 10, currentProgress: '0.45', threshold: '0.50', gap: '5%' },
    extras: { earned: 0, max: 15, count: '0/5', missing: ['PROJECOES','PITCH_DECK','MODELO_CONTRATO_OFERTA','COMPROVANTE_ENDERECO','DECLARACAO_RECEITA'] },
    media: { earned: 0, max: 5, has_video: false, has_cover: true },
    redes: { earned: 5, max: 5, count: '3/3', channels: ['linkedin','site','instagram'] },
  },
  // POSICAO
  position: {
    featured: 8,
    featuredTotal: 10,
    opportunities: 23,
    recentlyAdded: null,                       // null = fora do top recent
    pinned: false,
  },
  // SUGESTOES
  suggestions: [
    { id: 'reach_50pct', title: 'Atingir 50% vendido', impact: '+5 pts', blockedBy: null },
    { id: 'add_pitch_deck', title: 'Adicionar pitch deck', impact: '+3 pts', blockedBy: null },
    { id: 'add_projection', title: 'Adicionar projecoes financeiras', impact: '+3 pts', blockedBy: null },
    { id: 'apply_verified', title: 'Solicitar selo Startup Verificada', impact: '+10 pts', blockedBy: 'COMPLIANCE' },
  ],
  // RANK dentro de Featured (só exibir se position dentro do top)
  nearbyStartups: [
    { position: 7, slug: 'cloudpilot', score: 51 },
    { position: 9, slug: 'tokenvault', score: 38 },
  ],
});
```

---

### 4.3 `POST /admin/startups/:id/pin` (ADMIN ou COMPLIANCE)

```http
POST /admin/startups/4/pin
Headers: Cookie: session_id=...
Body: {
  category: 'partnership-aceleradora',     // enum (vide RF02-categories)
  reason: 'Acelerada pela Y Combinator W26, parceria estratégica de longo prazo',
}
```

**Possíveis respostas:**

```http
201 Created
{
  data: {
    startupId: 4,
    manuallyPinned: true,
    manuallyPinnedBy: 1,
    manuallyPinnedAt: '2026-08-17T22:00:00Z',
    pinnedCount: 1,
  }
}

409 Conflict (max 3 ja atingido)
{
  error: true,
  code: 'MAX_PINNED_EXCEEDED',
  message: 'Limite de 3 pinos atingido. Desfie um antes.',
  data: { currentPinned: [{ id: 4, slug: 'neuralforge', reason: '...' }, ...] },
}

400 Bad Request (motivo < 20 chars)
{ error: true, code: 'REASON_TOO_SHORT', minLength: 20, received: 12 }
```

**Validação Zod (DTO):**

```typescript
// src/api/admin/dto/pin-startup.dto.ts
import { z } from 'zod';

export const pinStartupSchema = z.object({
  category: z.enum([
    'partnership-aceleradora',
    'early-access',
    'estrategica-comercial',
    'outra',
  ]),
  reason: z.string().min(20).max(500),
});
```

---

### 4.4 `DELETE /admin/startups/:id/pin`

```http
DELETE /admin/startups/4/pin
Headers: Cookie: ...
Body (optional): { reason: '...' }

204 No Content
```

---

### 4.5 `GET /admin/marketplace/pinned`

```http
GET /admin/marketplace/pinned
ResponseDto.success(200, {
  data: [
    {
      startupId: 4, slug: 'neuralforge', nome: 'NeuralForge', logo: '...',
      manuallyPinnedBy: { id: 1, nome: 'Alex Admin', role: 'ADMIN' },
      manuallyPinnedAt: '2026-08-17T22:00:00Z',
      manuallyPinnedReason: 'Acelerada pela Y Combinator W26',
      campaign: { id: 4, title: 'Rodada Inicial', progress: 0.18 },
    },
  ],
  total: 1,
  maxAllowed: 3,
});
```

---

### 4.6 Audit log (RF-10)

Cada `PIN_STARTUP` / `UNPIN_STARTUP` / `SCORE_RECALCULATED` gera entrada em `AuditLog`:

```typescript
// Auditoria completa no AuditLog (Campos obrigatórios LGPD Art. 37)
{
  userId: <actorId>,
  action: 'PIN_STARTUP' | 'UNPIN_STARTUP' | 'SCORE_RECALCULATED',
  entity: 'Startup',
  entityId: <startupId>,
  oldValue: { manuallyPinned: false },
  newValue: { manuallyPinned: true, manuallyPinnedReason: '...', manuallyPinnedBy: 1 },
  ip: '<request.ip>',
  userAgent: '<request.userAgent>',
  createdAt: now,
}
```

---

## 5. Pseudocódigo do algoritmo de score

**Arquivo:** `backendnode/src/api/marketplace/score-calculator.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface ScoreBreakdown {
  cvmRequired: { earned: number; max: number; count: string; docs: string[] };
  kycComplete: { earned: number; max: number; count: string };
  completedCampaigns: { earned: number; max: number; count: string };
  seloVerified: { earned: number; max: number; attached: boolean };
  seloPartnership: { earned: number; max: number; attached: boolean };
  engagement: { earned: number; max: number; currentProgress: number; threshold: number };
  extras: { earned: number; max: number; count: string; missing: string[] };
  media: { earned: number; max: number; hasVideo: boolean; hasCover: boolean };
  redes: { earned: number; max: number; count: string; channels: string[] };
}

export const CVM_REQUIRED_DOCS = [
  'MIE', 'CONTRATO_SOCIAL', 'CNPJ', 'BALANCO_ATUAL', 'DECLARACAO_VERACIDADE', 'ATA_ELEICAO',
] as const;

export const EXTRAS_DOCS = [
  'PROJECOES', 'PITCH_DECK', 'MODELO_CONTRATO_OFERTA', 'COMPROVANTE_ENDERECO', 'DECLARACAO_RECEITA',
] as const;

const WEIGHTS = {
  cvmRequired: 20,
  kycComplete: 15,
  completedCampaigns: 10,
  seloVerified: 10,
  seloPartnership: 10,
  engagement: 10,
  extras: 15,
  media: 5,
  redes: 5,
};

const MAX_PESOS_DOCS_KYC = 4; // avatar + documento + comprovante + biofacial
const MIN_REDES = 3;
const ENGAGEMENT_THRESHOLD = 0.50; // 50% vendido

@Injectable()
export class ScoreCalculatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Calcula score e breakdown para uma startup.
   * Recalcular em batch (cron) ou em eventos (upload, KYC, selo, status).
   */
  async calculateForStartup(startupId: number): Promise<{ score: number; breakdown: ScoreBreakdown }> {
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      include: {
        founder: {
          include: {
            avatar: true, documento: true, comprovante: true, biofacial: true,
          },
        },
        campaigns: {
          where: {
            OR: [
              { status: 'OPEN' },
              { status: { in: ['CLOSED', 'FUNDED'] }, closedAt: { gte: new Date(Date.now() - 10*86400e3) } },
            ],
          },
          orderBy: { createdAt: 'desc' },
        },
        seals: { where: { seal: { active: true } }, include: { seal: true } },
      },
    });
    if (!startup) throw new NotFoundException(`Startup ${startupId} não encontrada`);

    // ---- CVM Required (20 pts)
    const cvmCount = await this.prisma.startupDocument.count({
      where: { startupId, categoria: { in: [...CVM_REQUIRED_DOCS] } },
    });
    const cvmDocs = await this.prisma.startupDocument.findMany({
      where: { startupId, categoria: { in: [...CVM_REQUIRED_DOCS] } },
      select: { categoria: true },
    });
    const cvmRequired = {
      earned: Math.round((cvmCount / CVM_REQUIRED_DOCS.length) * WEIGHTS.cvmRequired),
      max: WEIGHTS.cvmRequired,
      count: `${cvmCount}/${CVM_REQUIRED_DOCS.length}`,
      docs: cvmDocs.map(d => d.categoria),
    };

    // ---- KYC Complete (15 pts)
    const kycPresent = [
      !!startup.founder?.avatar?.status && startup.founder.avatar.status === 'APPROVED',
      !!startup.founder?.documento?.status && startup.founder.documento.status === 'APPROVED',
      !!startup.founder?.comprovante?.status && startup.founder.comprovante.status === 'APPROVED',
      !!startup.founder?.biofacial?.status && startup.founder.biofacial.status === 'APPROVED',
    ].filter(Boolean).length;
    const kycComplete = {
      earned: Math.round((kycPresent / MAX_PESOS_DOCS_KYC) * WEIGHTS.kycComplete),
      max: WEIGHTS.kycComplete,
      count: `${kycPresent}/${MAX_PESOS_DOCS_KYC}`,
    };

    // ---- Completed Campaigns (10 pts)
    const completedCount = startup.campaigns.filter(c =>
      c.status === 'FUNDED' || c.status === 'PAID_OUT'
    ).length;
    const completedCampaigns = {
      earned: completedCount > 0 ? WEIGHTS.completedCampaigns : 0,
      max: WEIGHTS.completedCampaigns,
      count: completedCount > 0 ? `${completedCount}/1+` : '0/1+',
    };

    // ---- Selos (10 pts cada, apenas se attached)
    const seloVerified = {
      earned: startup.seals.some(s => s.seal.slug === 'selo-verified') ? WEIGHTS.seloVerified : 0,
      max: WEIGHTS.seloVerified,
      attached: startup.seals.some(s => s.seal.slug === 'selo-verified'),
    };
    const seloPartnership = {
      earned: startup.seals.some(s => s.seal.slug === 'acelerada') ? WEIGHTS.seloPartnership : 0,
      max: WEIGHTS.seloPartnership,
      attached: startup.seals.some(s => s.seal.slug === 'acelerada'),
    };

    // ---- Engagement (10 pts)
    const activeCampaign = startup.campaigns.find(c => c.status === 'OPEN');
    const progress = activeCampaign && activeCampaign.totalTokens > 0
      ? Number(activeCampaign.tokensSold) / Number(activeCampaign.totalTokens)
      : 0;
    const engagement = {
      earned: progress >= ENGAGEMENT_THRESHOLD ? WEIGHTS.engagement : Math.round(progress / ENGAGEMENT_THRESHOLD * WEIGHTS.engagement / 2),
      max: WEIGHTS.engagement,
      currentProgress: progress,
      threshold: ENGAGEMENT_THRESHOLD,
    };

    // ---- Extras (15 pts)
    const extrasCount = await this.prisma.startupDocument.count({
      where: { startupId, categoria: { in: [...EXTRAS_DOCS] } },
    });
    const extrasPresent = await this.prisma.startupDocument.findMany({
      where: { startupId, categoria: { in: [...EXTRAS_DOCS] } },
      select: { categoria: true },
    });
    const extrasMissing = EXTRAS_DOCS.filter(d => !extrasPresent.find(p => p.categoria === d));
    const extras = {
      earned: Math.round((extrasCount / EXTRAS_DOCS.length) * WEIGHTS.extras),
      max: WEIGHTS.extras,
      count: `${extrasCount}/${EXTRAS_DOCS.length}`,
      missing: extrasMissing,
    };

    // ---- Media (5 pts)
    const media = {
      earned: (startup.youtube_url ? 2.5 : 0) + (startup.cover_id ? 2.5 : 0),
      max: WEIGHTS.media,
      hasVideo: !!startup.youtube_url,
      hasCover: !!startup.cover_id,
    };

    // ---- Redes (5 pts)
    const redesCount = Object.keys(startup.redes_sociais || {}).length;
    const redes = {
      earned: redesCount >= MIN_REDES ? WEIGHTS.redes : Math.round(redesCount / MIN_REDES * WEIGHTS.redes / 2),
      max: WEIGHTS.redes,
      count: `${redesCount}/${MIN_REDES}`,
      channels: Object.keys(startup.redes_sociais || {}),
    };

    const breakdown: ScoreBreakdown = {
      cvmRequired, kycComplete, completedCampaigns, seloVerified, seloPartnership,
      engagement, extras, media, redes,
    };

    const score = Math.min(100, Math.round(
      cvmRequired.earned + kycComplete.earned + completedCampaigns.earned +
      seloVerified.earned + seloPartnership.earned + engagement.earned +
      extras.earned + media.earned + redes.earned
    ));

    return { score, breakdown };
  }

  /**
   * Persiste score + breakdown + emite evento para invalidacao de cache.
   */
  async persistAndInvalidate(startupId: number): Promise<number> {
    const { score, breakdown } = await this.calculateForStartup(startupId);
    await this.prisma.startup.update({
      where: { id: startupId },
      data: { score, scoreBreakdown: breakdown, scoreLastCalculatedAt: new Date() },
    });
    this.events.emit('startup.scoreUpdated', { startupId, score });
    return score;
  }

  /**
   * Cron 03:00 BRT — recalcula TODAS as startups elegiveis.
   * Lock distribuido via Redis (mesma pattern de cleanup.job.ts).
   */
  @Cron('0 3 * * *', { name: 'recalculate-marketplace-scores' })
  async recalculateAll(): Promise<void> {
    const lockKey = 'lock:recalculate:marketplace-scores';
    const lockAcquired = await this.acquireLock(lockKey);
    if (!lockAcquired) {
      this.logger.log('Lock nao adquirido — outro worker ja esta rodando');
      return;
    }
    try {
      const eligible = await this.prisma.startup.findMany({
        where: {
          status: 'APPROVED',
          campaigns: { some: { status: 'OPEN' } },
        },
        select: { id: true, score: true },
      });
      let updated = 0;
      for (const s of eligible) {
        const before = s.score;
        const after = await this.persistAndInvalidate(s.id);
        if (Math.abs(before - after) >= 30) {
          this.events.emit('marketplace.scoreOutlier', { startupId: s.id, before, after });
        }
        updated++;
      }
      await this.prisma.auditLog.create({
        data: {
          action: 'SCORE_RECALCULATED',
          entity: 'Startup',
          entityId: 0,
          newValue: { updatedCount: updated, totalEligible: eligible.length } as any,
          ip: '0.0.0.0',
          userAgent: 'cron-recalculate-scores',
        },
      });
      this.logger.log(`Recalculado: ${updated}/${eligible.length} startups`);
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  private async acquireLock(key: string): Promise<boolean> { /* vide uploads/queue/uploads.producer.ts */ }
  private async releaseLock(key: string): Promise<void> { /* ... */ }
}
```

### 5.1 Listeners (eventos que disparam recálculo)

**Arquivo:** `backendnode/src/api/marketplace/score-recalc.listener.ts`

```typescript
@Injectable()
export class ScoreRecalcListener {
  constructor(private readonly calc: ScoreCalculatorService) {}

  @OnEvent('startup.document.uploaded')
  async onDocUploaded({ startupId }: { startupId: number }) {
    await this.calc.persistAndInvalidate(startupId);
  }

  @OnEvent('startup.document.deleted')
  async onDocDeleted({ startupId }: { startupId: number }) {
    await this.calc.persistAndInvalidate(startupId);
  }

  @OnEvent('startup.kyc.changed')   // 4 eventos granulares (avatar/doc/comprovante/biofacial)
  async onKycChanged({ startupId }: { startupId: number }) {
    await this.calc.persistAndInvalidate(startupId);
  }

  @OnEvent('startup.seal.attached')
  @OnEvent('startup.seal.detached')
  async onSealChanged({ startupId }: { startupId: number }) {
    await this.calc.persistAndInvalidate(startupId);
  }

  @OnEvent('campaign.status.changed')
  async onCampaignStatusChanged({ startupId }: { startupId: number }) {
    // OPEN ou FUNDED/PAID_OUT mudaram
    await this.calc.persistAndInvalidate(startupId);
  }

  @OnEvent('marketplace.scoreOutlier')
  async onOutlier({ startupId, before, after }: any) {
    // DPO notificado por email + audit (vide PRD §LGPD)
    await this.notifyDPO({ startupId, before, after });
  }
}
```

**Quem emite esses eventos?** Os services existentes (upload, kyc, seal, campaign) devem chamar `this.events.emit('startup.document.uploaded', { startupId })` após mutations bem-sucedidas. Localização dos emits:

```typescript
// src/api/uploads/uploads.service.ts (apos upload completar)
this.events.emit('startup.document.uploaded', { startupId: doc.startupId });

// src/api/seals/seal-assignment.service.ts (apos atrelar selo)
this.events.emit('startup.seal.attached', { startupId });

// src/api/campaigns/service/campaigns-state.service.ts (apos update status)
this.events.emit('campaign.status.changed', { startupId: c.startupId });

// src/api/users/kyc.service.ts ou similar (apos doc KYC ser aprovado)
this.events.emit('startup.kyc.changed', { founderId });
// (resolver via founder → startup lookup para pegar startupId)
```

---

## 6. UI — Wireframes e payloads

### 6.1 `/founder/dashboard` — Card "Posição no Marketplace" (RF-11, RF-12)

**Componente:** `frontend/app/components/founder/marketplace-position-card.tsx` (NOVO)

**Payload carregado via BFF:**
- BFF: `frontend/app/routes/api/founder.startups.$.marketplace-info.ts` (NOVO)
- Chama: `GET /api/startups/:id/marketplace-info` (com cookie de auth)
- Hook: `useFounderStartupMarketplaceInfo(startupId)` em `frontend/app/hooks/use-founder-startup-marketplace-info.ts` (NOVO)

**Layout (renderizado dentro do `/founder/dashboard`):**

```
┌──────────────────────────────────────────────────────────┐
│  📊 Posição no Marketplace          [Atualizado há 2h] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Você está em  #3 de 10  no "Rodadas em Destaque"        │
│                                                          │
│  Score:  45 / 100    [████████░░░░░░░░░░░] 45%          │
│          Faixa: 31-60 amarelo (faça mais para subir)     │
│                                                          │
│  ▼ Breakdown                                  [+ expand] │
│   ✅ Documentos CVM       20/20  ████████████  (6/6 OK) │
│   ✅ KYC Completo         15/15  ████████████  (4/4 OK) │
│   ⚠️ Campanhas concluídas  0/10  ░░░░░░░░░░░░  (0)   │
│   ❌ Selo Verified         0/10  ░░░░░░░░░░░░  (não)   │
│   ❌ Selo Acelerada        0/10  ░░░░░░░░░░░░  (não)   │
│   ⚠️ Engajamento           5/10  ████░░░░░░░░░  (45%)  │
│       💡 Atingindo 50% vendido você ganha +5 pts        │
│   ❌ Documentos extras     0/15  ░░░░░░░░░░░░  (0/5)  │
│       💡 Adicione PITCH_DECK (+3 pts) e PROJECOES (+3 pts)│
│   ⚠️ Mídia                 2.5/5 █████░░░░░░░  (capa OK)│
│       💡 Adicione vídeo do pitch (+2.5 pts)             │
│   ✅ Redes sociais        5/5   ████████████  (3/3)   │
│                                                          │
│  💡 Como melhorar minha posição?                         │
│   1. Atingir 50% vendido na captação          +5 pts    │
│   2. Adicionar pitch deck (PDF ou slides)     +3 pts    │
│   3. Adicionar projeções financeiras 2027-29 +3 pts    │
│   4. Solicitar Selo Startup Verificada        +10 pts   │
│   Próxima atualização: 03:00 BRT (em 6h 32min)          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Empty state (score=0, nenhuma campanha):**

```
┌─────────────────────────────────────────────────┐
│  📊 Posição no Marketplace                      │
├─────────────────────────────────────────────────┤
│  Você ainda não pontua.  Comece pelo essencial: │
│   1. Envie os 6 documentos CVM obrigatórios    │
│   2. Complete sua KYC (avatar + doc + ...)      │
│   3. Adicione pitch deck + projeções            │
│  [Botão: Começar agora →]                       │
└─────────────────────────────────────────────────┘
```

### 6.2 `/admin/marketplace` (rota NOVA, RF-13)

**Localização:** `frontend/app/routes/private/admin.marketplace.tsx` (NOVO)

**Wireframe:**

```
┌─────────────────────────────────────────────────────────────┐
│  Marketplace — Curadoria              (acesso: ADMIN)       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🟢 Pinos ativos (1 / 3)              [+] Adicionar pino    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ #1  ⬆ [NeuralForge]    Acelerada — Y Combinator W26     ││
│  │     by Alex Admin (ADMIN)  há 2h                        ││
│  │     "Acelerada pela Y Combinator W26, parceria..."        ││
│  │     [📌 Desfixar]                                        ││
│  └─────────────────────────────────────────────────────────┘│
│  [Slot #2 vazio]   [Slot #3 vazio]                           │
│                                                             │
│  🔍 Buscar startup para pinar                              │
│  [busca: techinnovate ✓]                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ TechInnovate  Score 45  (engajamento 45%) OPEN R$ 5M    ││
│  │ [📌 Pinar esta]                                           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  📊 Lista ranqueada atual (Featured auto) — top 10         │
│  [tabela com position, score, slug, status, ações]           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Modal "Pinar":**

```
┌─────────────────────────────────────────────┐
│  📌 Pinar TechInnovate                       │
├─────────────────────────────────────────────┤
│  Categoria:    [▾ parceria-aceleradora       │
│                  early-access                │
│                  estratégica-comercial        │
│                  outra                       ]│
│                                             │
│  Justificativa * (mín. 20 chars):           │
│  ┌─────────────────────────────────────────┐│
│  │ Y Combinator W26 Batch, parceria...     ││
│  │ [contador: 123/500]                     ││
│  └─────────────────────────────────────────┘│
│                                             │
│  ⚠️ Isso gerará AuditLog e notificará o DPO. │
│                                             │
│   [Cancelar]              [✓ Pinar]          │
└─────────────────────────────────────────────┘
```

### 6.3 BFFs novos

| Path | Método | Backend call |
|---|---|---|
| `/api/startups/featured` | GET | Já existe → consolidar |
| `/api/startups/recently-added` | GET | Já existe |
| `/api/startups/opportunities` | GET | Já existe |
| `/api/startups/:id/marketplace-info` | GET | Novo |
| `/api/founder/startups/:id/marketplace-info` | GET | Novo (alias autenticado) |
| `/api/admin/startups/:id/pin` | POST | Novo |
| `/api/admin/startups/:id/pin` | DELETE | Novo (toggle unpin) |
| `/api/admin/marketplace/pinned` | GET | Novo |

Todos devem ser adicionados em `frontend/app/routes.ts` no array `route()`.

---

## 7. Eventos e Jobs

### 7.1 Tabela de eventos (NestJS EventEmitter2)

| Evento | Emitido por | Listeners |
|---|---|---|
| `startup.document.uploaded` | `uploads.service.ts` após upload OK | `ScoreRecalcListener` |
| `startup.document.deleted` | `uploads.service.ts` após delete | `ScoreRecalcListener` |
| `startup.kyc.changed` | `users.service.ts` ao aprovar/rejeitar KYC | `ScoreRecalcListener` |
| `startup.seal.attached` | `seal-assignment.service.ts` | `ScoreRecalcListener` |
| `startup.seal.detached` | `seal-assignment.service.ts` | `ScoreRecalcListener` |
| `campaign.status.changed` | `campaigns-state.service.ts` | `ScoreRecalcListener` |
| `startup.scoreUpdated` | `ScoreCalculatorService.persistAndInvalidate` | Listener de cache Redis (`features-page-cache.service.ts`) → invalida `marketplace:featured:v1` |
| `marketplace.scoreOutlier` | `ScoreCalculatorService.recalculateAll` (delta ≥ 30 pts) | `ScoreRecalcListener.onOutlier` → email DPO + AuditLog |

### 7.2 Jobs (cron)

| Decorator | Schedule | Service |
|---|---|---|
| `@Cron('0 3 * * *', { name: 'recalculate-marketplace-scores' })` | Diariamente 03:00 BRT | `ScoreCalculatorService.recalculateAll` |
| Já existe `@Cron('0 5 * * *', { name: 'cleanup-orphan-uploads' })` | — | (não tocar) |

Lock distribuído via Redis SET NX EX (`lock:recalculate:marketplace-scores`, TTL 30min).

### 7.3 Cache invalidation

```typescript
// backendnode/src/api/marketplace/featured-cache.listener.ts
@Injectable()
export class FeaturedCacheInvalidator {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  @OnEvent('startup.scoreUpdated')
  @OnEvent('startup.manuallyPinned')
  @OnEvent('startup.manuallyUnpinned')
  async invalidate() {
    await this.redis.del('marketplace:featured:v1');
    this.logger.log('Cache do featured invalidado por evento');
  }
}
```

---

## 8. Sequência de sprints (4 sprints)

### Sprint 1 — Fundação (1 semana)
**Tema:** Migration Prisma + seed com breakdown

| Task | Descrição | Acceptance |
|---|---|---|
| **MKT-IMPL-01** | Migration `add_marketplace_pinning_score` conforme §3.1 | Aplicável em dev e produção sem downtime (apenas aditiva + nullable) |
| **MKT-IMPL-02** | Atualizar `schema.prisma` com novos campos (§3.2) | `npx prisma generate` OK |
| **MKT-IMPL-03** | Patchar `seed.ts` para popular `scoreBreakdown` na TechInnovate | TechInnovate tem score 45 com breakdown após seed |

### Sprint 2 — Cálculo (1 semana)
**Tema:** ScoreCalculatorService + listeners

| Task | Descrição | Acceptance |
|---|---|---|
| **MKT-IMPL-04** | Implementar `ScoreCalculatorService.calculateForStartup` (§5) | Unit tests ≥ 6 cenários (TechInnovate com/sem CVM, PaySwift full, NeuralForge, etc.) |
| **MKT-IMPL-05** | Implementar `persistAndInvalidate` + `recalculateAll` (§5) | Testa lock distribuído + Auditoria |
| **MKT-IMPL-06** | Implementar `ScoreRecalcListener` + emite eventos (§5.1) | Integração com `uploads`, `seals`, `kyc`, `campaigns` services |
| **MKT-IMPL-07** | Adicionar emits nos services existentes (uploads, seals, kyc, campaigns-state) | Cada emit documentado no AGENTS.md do módulo |

### Sprint 3 — APIs + UI Founder (1.5 semanas)
**Tema:** Endpoint público + card no /founder/dashboard

| Task | Descrição | Acceptance |
|---|---|---|
| **MKT-IMPL-08** | Endpoint público `GET /api/startups/featured` consolidado (§4.1) | Remove `/marketplace/featured` antigo, mantém só `/startups/featured` |
| **MKT-IMPL-09** | Endpoint privado `GET /api/startups/:id/marketplace-info` (§4.2) | Auth: ADMIN, COMPLIANCE ou founder da startup |
| **MKT-IMPL-10** | Componente `marketplace-position-card.tsx` (§6.1) | Renderiza corretamente com score 0/45/92 |
| **MKT-IMPL-11** | BFFs `startups-featured.ts`, `founder.startups.$.marketplace-info.ts` | Cache HTTP 60s no BFF da home |
| **MKT-IMPL-12** | Hook `useFounderStartupMarketplaceInfo` | TanStack Query, staleTime 60s |

### Sprint 4 — Pin/Admin (1 semana)
**Tema:** Pinning manual + UI admin

| Task | Descrição | Acceptance |
|---|---|---|
| **MKT-IMPL-13** | `POST/DELETE /admin/startups/:id/pin` (§4.3, §4.4) | Auth AdminGuard ou ComplianceGuard; 409 se max 3 |
| **MKT-IMPL-14** | `GET /admin/marketplace/pinned` (§4.5) | Lista 0-3 pinos + audit info |
| **MKT-IMPL-15** | Rota `admin.marketplace.tsx` (§6.2) | Modal pin com motivo ≥ 20 chars |
| **MKT-IMPL-16** | Auditoria `PIN_STARTUP`/`UNPIN_STARTUP` + email DPO | AuditLog com IP + userAgent |
| **MKT-IMPL-17** | Cron `RecalculateMarketplaceScore` rodando em prod | Email semanal "X startups recalculadas" |
| **MKT-IMPL-18** | Cache invalidation de featured (`marketplace:featured:v1`) | TTL 5min + invalidado por eventos |

---

## 9. Critérios de aceite por RF

| RF | Aceitação |
|---|---|
| RF-01 | Migration aditiva aplica em dev e prod sem erro; colunas nullable; FK SET NULL testada |
| RF-02 | `POST /admin/startups/:id/pin` retorna 201 com pino registrado. Testar: motivo 19 chars = 400, motivo 20+ = 201, 4 pinos = 409 |
| RF-03 | `DELETE /admin/startups/:id/pin` retorna 204. Pino removido do featured em ≤ 30s |
| RF-04 | `GET /admin/marketplace/pinned` lista os 0..3 pinos ativos com info de quem pineou |
| RF-05 | `GET /api/startups/featured` retorna 0..10 itens em ordem: pinned (1..N), depois score desc. Total = `marketplace.featured_limit` |
| RF-06 | Cron roda 03:00 BRT. Auditoria gerada com `action='SCORE_RECALCULATED'` |
| RF-07 | Eventos disparam recálculo ≤ 5s. Testar: upload doc → score recalculado |
| RF-08 | `MarketplaceInfo.breakdown` retorna todas as 9 chaves + earned/max/count |
| RF-09 | Endpoint respeita RBAC: founder vê apenas dados da própria startup |
| RF-10 | AuditLog criado para TODO pin/unpin com IP + userAgent + actorId + newValue |
| RF-11 | Card `marketplace-position-card` renderiza em /founder/dashboard quando há startup |
| RF-12 | Tooltip no breakdown explica exatamente "Como ganhar mais pontos" |
| RF-13 | `/admin/marketplace` abre para ADMIN e COMPLIANCE; UI mostra 3 slots e lista atual |
| RF-14 | Home pública: card pinned mostra "Em destaque por: <motivo>"; auto-rank mostra "Score alto" |
| RF-15 | Não requer refresh manual: cache invalidado por eventos |

### Testes obrigatórios por sprint

| Sprint | Testes |
|---|---|
| S1 | Migration: `prisma migrate diff` em CI; seed: TechInnovate tem score 45 esperado |
| S2 | Unit (ScoreCalculator): 6+ casos. Integration (listener): upload dispara recálculo |
| S3 | E2E (Playwright): card aparece em `/founder/dashboard`; tooltip mostra breakdown |
| S4 | E2E: ADMIN pina; home atualiza; 4º pino retorna 409 |

---

## 10. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Schema migration quebra em prod | Baixa | Crítico | Aditiva + nullable; testar em staging; rollback = DROP COLUMN |
| Job cron demora > 24h | Média | Médio | Lock Redis 30min; alert se > 1h running |
| Score muda muito (founder burlando) | Média | Alto | DPO notifica outliers ±30pts/dia; detectar upload suspeito |
| 5+ ADMIN pinando em paralelo | Alta | Médio | UNIQUE partial constraint via trigger MySQL |
| Cache stale após evento | Alta | Baixo | TTL 5min + invalidação on-event é suficiente |
| Listener dispara 100x (spam) | Média | Médio | Debounce: só recalcula 1× a cada 30s por startupId |

---

## 11. Smoke tests pós-deploy

```bash
# 1. Verificar schema
mysql -u dev -pchangeme fintech_db -t -e "DESCRIBE startups;" | grep -E "manuallyPinned|scoreBreakdown|scoreLastCalculated"

# 2. Endpoint publico
curl -s http://localhost:7077/api/startups/featured | jq '.data | length'   # esperado: 10

# 3. Endpoint privado (precisa cookie)
COOKIE=$(...)
curl -s --cookie "session_id=$COOKIE" http://localhost:7077/api/startups/1/marketplace-info | jq '.data.score'   # esperado: 45

# 4. Pin (precisa role ADMIN)
curl -s -X POST --cookie "session_id=$ADMIN_COOKIE" \
    -H "Content-Type: application/json" \
    -d '{"category":"partnership-aceleradora","reason":"Y Combinator W26 batch"}' \
    http://localhost:7077/admin/startups/4/pin | jq .data.manuallyPinned   # esperado: true

# 5. Job cron — disparado manual pra teste
curl -s -X POST http://localhost:7077/internal/admin/recalculate-scores \
    -H "X-Internal-Token: $INTERNAL_TOKEN"   # endpoint de trigger admin (NOVO)
```

---

## Próximo passo (quando implementação for autorizada)

1. **Code review deste spec** com 1 DEVELOPER + 1 TECH LEAD (mínimo 2 sign-offs)
2. Resolver **DEC-MKT-01..03** em reunião (os defaults estão em §2 mas podem ser revisados)
3. Criar tasks técnicas no `todo/todo.json` (MKT-IMPL-01..18) — espelhar §8
4. Setup do ambiente: branch, CI, code owner
5. Iniciar Sprint 1

---

**Versão:** 1.0 (Implementation Spec — 2026-08-17)
**Aprovações pendentes para implementação:**
- [ ] REVIEWER 1 (dev backend NestJS)
- [ ] REVIEWER 2 (dev frontend React)
- [ ] DPO (LGPD impact + audit policy)
- [ ] CTO (custo de migração + lock + caching)
