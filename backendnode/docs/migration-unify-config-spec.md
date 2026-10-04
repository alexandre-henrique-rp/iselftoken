# Especificação da Migration: Unificação de Configurações

**Data:** 22/08/2026  
**Referência:** `scripts/PRD_CONFIG_TAXAS_VALORES.md` §5.1 RF-01..03  
**Tarefa:** CFG-04  
**Depende de:** CFG-02, CFG-03

---

## Objetivo

Consolidar os valores de `system_configs` + hardcoded em `config_parameter_values` (append-only, vigência por data). Ao final, `config_parameter_values` será a **única** fonte de verdade.

---

## Estrutura Atual

### `system_configs` (legado — a ser dropada na Fase 3)

```sql
CREATE TABLE `system_configs` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `key`         VARCHAR(191) NOT NULL UNIQUE,
  `value`       DECIMAL(15,4) NOT NULL,
  `description` TEXT,
  `updatedAt`   DATETIME(3) NOT NULL,
  `updatedBy`   INT NULL
);
```

### `config_parameter_values` (destino canônico)

```sql
CREATE TABLE `config_parameter_values` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `key`           VARCHAR(191) NOT NULL,
  `value`         TEXT NOT NULL,
  `effectiveFrom` DATETIME(3) NOT NULL,
  `note`          TEXT,
  `createdById`   INT NULL,
  `createdAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `config_parameter_values_key_effectiveFrom_idx`(`key`, `effectiveFrom`)
);
```

---

## Fase 1: DDL (Alterações de Schema)

### 1.1 Adicionar `revokedAt` e `revokedById` (soft-cancel de agendamentos)

```sql
-- Migration: add_revoked_fields_to_config_parameter_values

ALTER TABLE `config_parameter_values`
  ADD COLUMN `revokedAt`    DATETIME(3) NULL DEFAULT NULL,
  ADD COLUMN `revokedById`  INT NULL DEFAULT NULL;

-- Índice para query de valor vigente (exclui revogados)
CREATE INDEX `cpv_key_effective_revoked_idx`
  ON `config_parameter_values`(`key`, `effectiveFrom`, `revokedAt`);
```

### 1.2 Adicionar UNIQUE constraint (key + effectiveFrom onde revokedAt IS NULL)

> **Nota:** MySQL não suporta partial unique index nativamente. A unicidade será enforceada no application layer (ConfigService.setValue lança Conflict se já existe versão vigente com mesma key+effectiveFrom não-revogada).

---

## Fase 2: DML — Seed dos Valores Existentes

### 2.1 Copiar valores da `system_configs` → `config_parameter_values`

A query abaixo copia cada registro de `system_configs` para `config_parameter_values` com `effectiveFrom = '1970-01-01'` (epoch — garante que são as versões mais antigas, nunca conflitam com futuras).

```sql
-- Migration: seed_config_from_system_configs (IDEMPOTENTE)

-- Mapeamento de chaves: SystemConfig → canônica
-- TOKEN_BASE_VALUE        → fundraising.tokenPrice
-- TOKEN_TRANSACTION_FEE   → fundraising.tokenTransactionFee
-- TOKEN_MINT_FEE          → fundraising.authFeePerToken
-- PLATFORM_ADMIN_FEE_PCT  → fundraising.platformFee
-- COMPLIANCE_FEE          → fundraising.complianceFee
-- CAMPAIGN_MIN_TARGET     → fundraising.minCampaign
-- CAMPAIGN_MAX_TARGET     → fundraising.maxCampaign
-- CAMPAIGN_MIN_TOKENS     → fundraising.minTokensPerCampaign
-- CAMPAIGN_MAX_TOKENS     → fundraising.maxTokensPerCampaign

INSERT INTO `config_parameter_values` (`key`, `value`, `effectiveFrom`, `note`, `createdById`, `createdAt`)
SELECT
  CASE sc.`key`
    WHEN 'TOKEN_BASE_VALUE'       THEN 'fundraising.tokenPrice'
    WHEN 'TOKEN_TRANSACTION_FEE'  THEN 'fundraising.tokenTransactionFee'
    WHEN 'TOKEN_MINT_FEE'         THEN 'fundraising.authFeePerToken'
    WHEN 'PLATFORM_ADMIN_FEE_PCT' THEN 'fundraising.platformFee'
    WHEN 'COMPLIANCE_FEE'         THEN 'fundraising.complianceFee'
    WHEN 'CAMPAIGN_MIN_TARGET'    THEN 'fundraising.minCampaign'
    WHEN 'CAMPAIGN_MAX_TARGET'    THEN 'fundraising.maxCampaign'
    WHEN 'CAMPAIGN_MIN_TOKENS'    THEN 'fundraising.minTokensPerCampaign'
    WHEN 'CAMPAIGN_MAX_TOKENS'    THEN 'fundraising.maxTokensPerCampaign'
  END AS `key`,
  CAST(sc.`value` AS CHAR) AS `value`,
  '1970-01-01 00:00:00.000' AS `effectiveFrom`,
  CONCAT('Migrado de system_configs (key=', sc.`key`, ', id=', sc.`id`, ')') AS `note`,
  NULL AS `createdById`,
  NOW() AS `createdAt`
FROM `system_configs` sc
WHERE sc.`key` IN (
  'TOKEN_BASE_VALUE', 'TOKEN_TRANSACTION_FEE', 'TOKEN_MINT_FEE',
  'PLATFORM_ADMIN_FEE_PCT', 'COMPLIANCE_FEE',
  'CAMPAIGN_MIN_TARGET', 'CAMPAIGN_MAX_TARGET',
  'CAMPAIGN_MIN_TOKENS', 'CAMPAIGN_MAX_TOKENS'
)
-- Idempotência: não insere se já existe para essa chave canônica
AND NOT EXISTS (
  SELECT 1 FROM `config_parameter_values` cpv
  WHERE cpv.`key` = CASE sc.`key`
    WHEN 'TOKEN_BASE_VALUE'       THEN 'fundraising.tokenPrice'
    WHEN 'TOKEN_TRANSACTION_FEE'  THEN 'fundraising.tokenTransactionFee'
    WHEN 'TOKEN_MINT_FEE'         THEN 'fundraising.authFeePerToken'
    WHEN 'PLATFORM_ADMIN_FEE_PCT' THEN 'fundraising.platformFee'
    WHEN 'COMPLIANCE_FEE'         THEN 'fundraising.complianceFee'
    WHEN 'CAMPAIGN_MIN_TARGET'    THEN 'fundraising.minCampaign'
    WHEN 'CAMPAIGN_MAX_TARGET'    THEN 'fundraising.maxCampaign'
    WHEN 'CAMPAIGN_MIN_TOKENS'    THEN 'fundraising.minTokensPerCampaign'
    WHEN 'CAMPAIGN_MAX_TOKENS'    THEN 'fundraising.maxTokensPerCampaign'
  END
  AND cpv.`effectiveFrom` = '1970-01-01 00:00:00.000'
);
```

### 2.2 Seed dos valores HARDCODED (novos, nunca existiram em nenhuma tabela)

```sql
-- Migration: seed_hardcoded_values (IDEMPOTENTE)

INSERT INTO `config_parameter_values` (`key`, `value`, `effectiveFrom`, `note`, `createdAt`)
SELECT * FROM (
  SELECT 'seal.verificationPrice' AS `key`, '890' AS `value`,
         '1970-01-01 00:00:00.000' AS `effectiveFrom`,
         'Migrado de hardcoded: startup-crud.service.ts:312 (amount: 890)' AS `note`,
         NOW() AS `createdAt`
  UNION ALL
  SELECT 'earlyAccess.price', '5000',
         '1970-01-01 00:00:00.000',
         'Migrado de hardcoded: transactions.service.ts:549 (const amount = 5000)',
         NOW()
  UNION ALL
  SELECT 'sla.installmentPaymentDays', '5',
         '1970-01-01 00:00:00.000',
         'Migrado de hardcoded: installment-requests.service.ts:43 (SLA_BUSINESS_DAYS = 5)',
         NOW()
  UNION ALL
  SELECT 'fundraising.capByStage.min', '100000',
         '1970-01-01 00:00:00.000',
         'Migrado de hardcoded: frontend/app/lib/new-startup-schema.ts:134',
         NOW()
  UNION ALL
  SELECT 'fundraising.capByStage.ideacao.max', '250000',
         '1970-01-01 00:00:00.000',
         'Migrado de hardcoded: frontend/app/lib/new-startup-schema.ts:134',
         NOW()
  UNION ALL
  SELECT 'fundraising.capByStage.mvp.max', '500000',
         '1970-01-01 00:00:00.000',
         'Migrado de hardcoded: frontend/app/lib/new-startup-schema.ts:135',
         NOW()
  UNION ALL
  SELECT 'fundraising.capByStage.operacao.max', '1000000',
         '1970-01-01 00:00:00.000',
         'Migrado de hardcoded: frontend/app/lib/new-startup-schema.ts:136',
         NOW()
  UNION ALL
  SELECT 'fundraising.capByStage.tracao.max', '2500000',
         '1970-01-01 00:00:00.000',
         'Migrado de hardcoded: frontend/app/lib/new-startup-schema.ts:137',
         NOW()
  UNION ALL
  SELECT 'fundraising.capByStage.escala.max', '5000000',
         '1970-01-01 00:00:00.000',
         'Migrado de hardcoded: frontend/app/lib/new-startup-schema.ts:138',
         NOW()
) AS seed
WHERE NOT EXISTS (
  SELECT 1 FROM `config_parameter_values` cpv
  WHERE cpv.`key` = seed.`key`
    AND cpv.`effectiveFrom` = '1970-01-01 00:00:00.000'
);
```

---

## Fase 3: DDL — Drop da Tabela Legada (APÓS validação completa)

> ⚠️ **EXECUTAR APENAS** após confirmar que todos os consumers foram migrados (Fase 2 do CFG-03) e testes e2e passam sem `SystemConfigService`.

```sql
-- Migration: drop_system_configs_table

-- 1. Backup (opcional — já está no DML acima, mas por segurança):
-- CREATE TABLE `system_configs_backup_20260822` AS SELECT * FROM `system_configs`;

-- 2. Drop
DROP TABLE IF EXISTS `system_configs`;
```

**Schema Prisma:** Remover o model `SystemConfig` do `schema.mysql.prisma` e `schema.sqlite.prisma`.

---

## Rollback Plan

### Rollback Fase 1 (DDL)

```sql
ALTER TABLE `config_parameter_values`
  DROP COLUMN `revokedAt`,
  DROP COLUMN `revokedById`;

DROP INDEX `cpv_key_effective_revoked_idx` ON `config_parameter_values`;
```

### Rollback Fase 2 (DML)

```sql
-- Remove os registros inseridos pela migration (identificados pela nota e effectiveFrom epoch)
DELETE FROM `config_parameter_values`
WHERE `effectiveFrom` = '1970-01-01 00:00:00.000'
  AND `note` LIKE 'Migrado de%';
```

### Rollback Fase 3 (Drop)

```sql
-- Recriar tabela a partir do backup
CREATE TABLE `system_configs` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `key`         VARCHAR(191) NOT NULL UNIQUE,
  `value`       DECIMAL(15,4) NOT NULL,
  `description` TEXT,
  `updatedAt`   DATETIME(3) NOT NULL,
  `updatedBy`   INT NULL,
  UNIQUE INDEX `system_configs_key_key`(`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Restaurar dados do backup (se existir)
-- INSERT INTO `system_configs` SELECT * FROM `system_configs_backup_20260822`;
```

---

## Validação Pós-Migration

### Checklist de Cobertura (100%)

```sql
-- 1. Todas as chaves canônicas existem com effectiveFrom epoch?
SELECT key, COUNT(*) as versions
FROM config_parameter_values
WHERE effectiveFrom = '1970-01-01 00:00:00.000'
  AND revokedAt IS NULL
GROUP BY key
ORDER BY key;
-- Esperado: 21 linhas (12 de config.constants.ts + 9 novos)

-- 2. Valores migrados batem com system_configs?
SELECT
  cpv.key AS canonical_key,
  CAST(cpv.value AS DECIMAL(15,4)) AS new_value,
  sc.key AS legacy_key,
  sc.value AS legacy_value,
  CASE WHEN CAST(cpv.value AS DECIMAL(15,4)) = sc.value THEN 'OK' ELSE 'DIVERGENTE' END AS status
FROM config_parameter_values cpv
JOIN system_configs sc ON (
  CASE cpv.key
    WHEN 'fundraising.tokenPrice' THEN 'TOKEN_BASE_VALUE'
    WHEN 'fundraising.tokenTransactionFee' THEN 'TOKEN_TRANSACTION_FEE'
    WHEN 'fundraising.authFeePerToken' THEN 'TOKEN_MINT_FEE'
    WHEN 'fundraising.platformFee' THEN 'PLATFORM_ADMIN_FEE_PCT'
    WHEN 'fundraising.complianceFee' THEN 'COMPLIANCE_FEE'
    WHEN 'fundraising.minCampaign' THEN 'CAMPAIGN_MIN_TARGET'
    WHEN 'fundraising.maxCampaign' THEN 'CAMPAIGN_MAX_TARGET'
    WHEN 'fundraising.minTokensPerCampaign' THEN 'CAMPAIGN_MIN_TOKENS'
    WHEN 'fundraising.maxTokensPerCampaign' THEN 'CAMPAIGN_MAX_TOKENS'
  END = sc.key
)
WHERE cpv.effectiveFrom = '1970-01-01 00:00:00.000';
-- Esperado: 9 linhas, todas com status = 'OK'

-- 3. Nenhum valor revogado foi inserido acidentalmente?
SELECT COUNT(*) FROM config_parameter_values WHERE revokedAt IS NOT NULL;
-- Esperado: 0
```

---

## Estimativa de Impacto

| Aspecto | Detalhe |
|---------|---------|
| Tempo de execução | < 1s (DDL + 18 INSERTs) |
| Lock de tabela | Mínimo (ALTER ADD COLUMN = instant no MySQL 8 com ALGORITHM=INSTANT) |
| Downtime | Zero (migration aditiva, não destrutiva) |
| Risco | Baixo (Fases 1 e 2 são reversíveis; Fase 3 só após validação completa) |
| Dependência | ConfigService.getEffective() já lê de config_parameter_values — após seed, consumers existentes passam a puxar os novos valores automaticamente |

---

## Ordem de Execução

1. ✅ Deploy com Fase 1 DDL (add columns)
2. ✅ Deploy com Fase 2 DML (seed values)
3. ⏳ Sprint dedicada: refactor de 7 consumers (CFG-03 Fase 2)
4. ⏳ Testes e2e confirmam que `SystemConfigService` não é mais chamado
5. ⏳ Deploy com Fase 3 DDL (drop table)

---

## Prisma Schema Update (acompanha Fases 1 e 3)

### Fase 1 — Adicionar campos ao model

```prisma
model ConfigParameterValue {
  id            Int       @id @default(autoincrement())
  key           String
  value         String    @db.Text
  effectiveFrom DateTime
  note          String?   @db.Text
  createdById   Int?
  createdAt     DateTime  @default(now())
  revokedAt     DateTime? // Fase 1: soft-cancel de agendamento
  revokedById   Int?      // Fase 1: quem cancelou

  @@index([key, effectiveFrom])
  @@index([key, effectiveFrom, revokedAt], map: "cpv_key_effective_revoked_idx")
  @@map("config_parameter_values")
}
```

### Fase 3 — Remover model SystemConfig

```diff
- model SystemConfig {
-   id          Int      @id @default(autoincrement())
-   key         String   @unique
-   value       Decimal  @db.Decimal(15, 4)
-   description String?  @db.Text
-   updatedAt   DateTime @updatedAt
-   updatedBy   Int?
-   @@map("system_configs")
- }
```
