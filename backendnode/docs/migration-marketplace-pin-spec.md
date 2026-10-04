# Especificação: Migration de Schema — Marketplace Pin + Score

**Data:** 22/08/2026  
**Referência:** `scripts/marketplace/PRD_MARKETPLACE_REGRAS.md` §7  
**Tarefa:** MKT-03  
**Depende de:** MKT-01

---

## 1. Alterações no Model Startup

### 1.1 Novos campos

```prisma
model Startup {
  // ... campos existentes ...

  // Score manual (já existe)
  score Int @default(0)

  // === NOVOS (MKT-03) ===

  /// JSON com breakdown do score por critério (populado pelo RecalculateScoreService)
  scoreBreakdown Json? @db.Json

  /// Data/hora do último recálculo de score
  scoreLastCalculatedAt DateTime?

  /// Flag: startup manualmente pinada por ADMIN/COMPLIANCE no marketplace
  manuallyPinned Boolean @default(false)

  /// ID do User que pinou (FK opcional, on delete SET NULL)
  manuallyPinnedBy Int?
  manuallyPinnedByUser User? @relation("PinnedByUser", fields: [manuallyPinnedBy], references: [id], onDelete: SetNull)

  /// Data/hora do pin
  manuallyPinnedAt DateTime?

  /// Justificativa obrigatória (motivo do pin)
  manuallyPinnedReason String? @db.Text

  // ... relacionamentos existentes ...
}
```

### 1.2 Formato do `scoreBreakdown` (JSON)

```typescript
interface ScoreBreakdown {
  docsCvm: { count: number; max: 6; points: number };       // peso 20
  kycFounder: { count: number; max: 4; points: number };    // peso 15
  campaignsFunded: { count: number; points: number };       // peso 10
  seloVerified: { has: boolean; points: number };            // peso 10
  seloPartnership: { has: boolean; points: number };         // peso 10
  engagement: { ratio: number; points: number };            // peso 10
  docsExtras: { count: number; max: 5; points: number };    // peso 15
  media: { hasYoutube: boolean; points: number };            // peso 5
  redesSociais: { count: number; max: 3; points: number };  // peso 5
  total: number;                                             // soma final (0-100)
}
```

---

## 2. DDL — Migration SQL (MySQL 8)

```sql
-- Migration: add_marketplace_pin_and_score_fields
-- Descrição: Adiciona campos de pin manual + score breakdown à tabela startups

ALTER TABLE `startups`
  ADD COLUMN `scoreBreakdown` JSON NULL DEFAULT NULL,
  ADD COLUMN `scoreLastCalculatedAt` DATETIME(3) NULL DEFAULT NULL,
  ADD COLUMN `manuallyPinned` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `manuallyPinnedBy` INT NULL DEFAULT NULL,
  ADD COLUMN `manuallyPinnedAt` DATETIME(3) NULL DEFAULT NULL,
  ADD COLUMN `manuallyPinnedReason` TEXT NULL DEFAULT NULL;

-- FK: manuallyPinnedBy → users.id (SET NULL on delete)
ALTER TABLE `startups`
  ADD CONSTRAINT `startups_manuallyPinnedBy_fkey`
  FOREIGN KEY (`manuallyPinnedBy`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Índice composto para query principal do marketplace (pinned primeiro, depois score)
CREATE INDEX `startups_marketplace_ranking_idx`
  ON `startups`(`manuallyPinned` DESC, `score` DESC, `updatedAt` DESC);

-- Índice para buscar startups pinadas rapidamente
CREATE INDEX `startups_pinned_idx`
  ON `startups`(`manuallyPinned`)
  WHERE `manuallyPinned` = TRUE;
```

> **Nota MySQL:** MySQL não suporta partial index (`WHERE`). O índice `startups_pinned_idx` será criado sem a cláusula WHERE:
```sql
CREATE INDEX `startups_pinned_idx` ON `startups`(`manuallyPinned`, `manuallyPinnedAt` DESC);
```

---

## 3. Validações

### 3.1 Campos são NULLABLE (sem FK constraint forte)

| Campo | Nullable? | Default | Justificativa |
|-------|-----------|---------|---------------|
| `scoreBreakdown` | ✅ NULL | NULL | Preenchido apenas após 1º recálculo |
| `scoreLastCalculatedAt` | ✅ NULL | NULL | Idem |
| `manuallyPinned` | ❌ NOT NULL | `false` | Sempre tem valor (boolean) |
| `manuallyPinnedBy` | ✅ NULL | NULL | Apenas quando pinada |
| `manuallyPinnedAt` | ✅ NULL | NULL | Apenas quando pinada |
| `manuallyPinnedReason` | ✅ NULL | NULL | Apenas quando pinada |

### 3.2 FK `manuallyPinnedBy`

- Referencia `users.id`
- `ON DELETE SET NULL` — se o user admin for deletado, o pin permanece mas sem referência ao autor
- `ON UPDATE CASCADE` — se o user.id mudar (raro), atualiza

### 3.3 Índice composto

```
(manuallyPinned DESC, score DESC, updatedAt DESC)
```

Cobre a query principal do `MarketplaceService.getFeatured()`:
```sql
SELECT * FROM startups
WHERE status = 'APPROVED'
ORDER BY manuallyPinned DESC, score DESC, updatedAt DESC
LIMIT 10;
```

---

## 4. Impacto em Código Existente

### 4.1 `MarketplaceService` (leitura)

| Método | Impacto | Ação |
|--------|---------|------|
| `getFeatured()` | Deve priorizar `manuallyPinned = true` (máx 3) antes do sort por score | Ajustar `queryEligible` para ORDER BY `manuallyPinned DESC, score DESC` |
| `getAll()` | Sem impacto (usa score como está) | Nenhuma |
| `hydrateCards()` | Adicionar campo `isPinned: boolean` no response | Ajustar DTO de resposta |

### 4.2 `AdminService` / novo endpoint

| Endpoint | Ação |
|----------|------|
| `POST /admin/startups/:id/pin` | Criar — seta manuallyPinned=true + reason + pinnedBy + AuditLog |
| `DELETE /admin/startups/:id/pin` | Criar — seta manuallyPinned=false + limpa campos + AuditLog |
| `GET /admin/marketplace/pinned` | Criar — lista as até 3 pinadas com justificativa |

### 4.3 `RecalculateScoreService` (novo, MKT-02)

Após computar o score:
```typescript
await this.prisma.startup.update({
  where: { id: startupId },
  data: {
    score: computedScore,
    scoreBreakdown: breakdown,
    scoreLastCalculatedAt: new Date(),
  },
});
```

### 4.4 Prisma Schema

Adicionar os campos no model + relação `manuallyPinnedByUser`. Verificar que `User` model aceita a relação inversa.

---

## 5. Regras de Negócio (Enforcement)

| Regra | Onde enforceada |
|-------|----------------|
| Máximo 3 startups pinadas simultaneamente | Backend: `POST /admin/startups/:id/pin` → count WHERE manuallyPinned=true, se ≥ 3 → 409 Conflict |
| Justificativa obrigatória ao pinar | DTO com `@IsString() @MinLength(20) reason` |
| Apenas ADMIN/COMPLIANCE pode pinar | Guard no endpoint |
| AuditLog obrigatório em pin/unpin | Service emite AuditLog |

---

## 6. Rollback

```sql
-- Rollback: remove campos e índices adicionados

ALTER TABLE `startups` DROP FOREIGN KEY `startups_manuallyPinnedBy_fkey`;

DROP INDEX `startups_marketplace_ranking_idx` ON `startups`;
DROP INDEX `startups_pinned_idx` ON `startups`;

ALTER TABLE `startups`
  DROP COLUMN `scoreBreakdown`,
  DROP COLUMN `scoreLastCalculatedAt`,
  DROP COLUMN `manuallyPinned`,
  DROP COLUMN `manuallyPinnedBy`,
  DROP COLUMN `manuallyPinnedAt`,
  DROP COLUMN `manuallyPinnedReason`;
```

---

## 7. Estimativa de Impacto

| Aspecto | Detalhe |
|---------|---------|
| Tempo de execução | < 2s (ALTER TABLE INSTANT para colunas nullable no MySQL 8) |
| Lock de tabela | Mínimo (ALGORITHM=INSTANT para ADD COLUMN nullable) |
| Downtime | Zero |
| Dados existentes | Não afetados (campos novos são NULL/false) |
| FK | Leve (1 FK para users.id com SET NULL) |
| Índice | 2 índices novos — build rápido (< 100 rows em dev, < 10k em prod) |

---

## 8. Prisma Schema Diff (para copiar)

```diff
model Startup {
  // ... existentes ...

  score Int @default(0)
+ scoreBreakdown        Json?     @db.Json
+ scoreLastCalculatedAt DateTime?

+ manuallyPinned       Boolean   @default(false)
+ manuallyPinnedBy     Int?
+ manuallyPinnedByUser User?     @relation("PinnedByUser", fields: [manuallyPinnedBy], references: [id], onDelete: SetNull)
+ manuallyPinnedAt     DateTime?
+ manuallyPinnedReason String?   @db.Text

+ @@index([manuallyPinned, score, updatedAt], map: "startups_marketplace_ranking_idx")

  // ... relacionamentos ...
}
```

**No model User:**
```diff
model User {
  // ... existentes ...
+ pinnedStartups Startup[] @relation("PinnedByUser")
}
```

---

## 9. Próximos Passos

1. Criar migration Prisma (`prisma migrate dev --name add_marketplace_pin_score`)
2. Implementar endpoints PIN/UNPIN no `admin.controller.ts`
3. Ajustar `MarketplaceService.getFeatured()` para priorizar pinned
4. Implementar `RecalculateScoreService` (MKT-02 triggers + esta migration)
5. **MKT-04** — Especificar UX do card "Posição no Marketplace" no founder dashboard
