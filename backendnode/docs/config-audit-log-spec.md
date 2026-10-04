# Especificação: ConfigAuditLog (Modelo + Política de Retenção)

**Data:** 22/08/2026  
**Referência:** `scripts/PRD_CONFIG_TAXAS_VALORES.md` §7 + §12  
**Tarefa:** CFG-06  
**Depende de:** CFG-05

---

## 1. Decisão: AuditLog Genérico vs Tabela Dedicada

### Opções Avaliadas

| Critério | AuditLog genérico (existente) | ConfigAuditLog dedicado |
|----------|------------------------------|------------------------|
| Schema | Já existe (model AuditLog) | Nova tabela |
| Performance | Tabela grande (todas as ações do sistema), query precisa filtrar por entity+action | Tabela pequena e focada, queries rápidas |
| Retenção | Política única para tudo (difícil aplicar 10 anos só para config) | Política independente (10 anos sem impactar outros logs) |
| Indexação | Já tem índices genéricos | Índices otimizados para timeline de config |
| Compliance export | Precisa de WHERE complexo | SELECT * simples com filtros |
| Imutabilidade | Compartilha regras de DELETE com outras entidades | Append-only isolado (zero DELETE) |

### Decisão: **Usar AuditLog genérico + view materializada para compliance**

**Justificativa:**
1. O `AuditLog` genérico já é usado pelo projeto para todas as ações administrativas
2. O `ConfigService.setValue()` já deveria registrar entries com `action: 'CONFIG_SET'` e `entity: 'ConfigParameterValue'`
3. Criar tabela dedicada duplicaria lógica sem ganho real — o volume de alterações de config é baixíssimo (~20 por mês no máximo)
4. A política de retenção diferenciada será implementada via soft-delete/archival rules (não DELETE físico)

**Porém:** Se no futuro o volume de AuditLog genérico ultrapassar 1M registros e queries de compliance ficarem lentas, migrar para tabela dedicada é trivial (INSERT INTO ... SELECT FROM).

---

## 2. Formato do Registro de Auditoria (via AuditLog genérico)

### 2.1 Criação de versão (CONFIG_SET)

```typescript
await this.auditLog.create({
  action: 'CONFIG_SET',
  entity: 'ConfigParameterValue',
  entityId: String(version.id),
  userId: input.createdById ?? null,
  oldValue: {
    key: input.key,
    previousValue: oldValue, // valor vigente antes da mudança
    previousEffectiveFrom: oldEffectiveFrom?.toISOString() ?? null,
  },
  newValue: {
    key: input.key,
    value: input.value,
    effectiveFrom: input.effectiveFrom.toISOString(),
    note: input.note ?? null,
    isScheduled: input.effectiveFrom > new Date(),
  },
  ip: requestIp ?? null,
});
```

### 2.2 Cancelamento de agendamento (CONFIG_SCHEDULE_CANCELLED)

```typescript
await this.auditLog.create({
  action: 'CONFIG_SCHEDULE_CANCELLED',
  entity: 'ConfigParameterValue',
  entityId: String(versionId),
  userId,
  oldValue: {
    key,
    value: scheduledVersion.value,
    effectiveFrom: scheduledVersion.effectiveFrom.toISOString(),
  },
  newValue: {
    revokedAt: new Date().toISOString(),
    revokedById: userId,
  },
  ip: requestIp ?? null,
});
```

### 2.3 Rollback manual (CONFIG_ROLLBACK)

```typescript
await this.auditLog.create({
  action: 'CONFIG_ROLLBACK',
  entity: 'ConfigParameterValue',
  entityId: String(newVersion.id),
  userId,
  oldValue: {
    key,
    revertedFrom: currentValue,
    revertedEffectiveFrom: currentEffectiveFrom.toISOString(),
  },
  newValue: {
    key,
    value: rollbackValue,
    effectiveFrom: new Date().toISOString(),
    note: `Rollback manual de ${currentValue} para ${rollbackValue}`,
  },
  ip: requestIp ?? null,
});
```

---

## 3. Índices Recomendados (no AuditLog existente)

```sql
-- Índice composto para queries de compliance sobre configs
CREATE INDEX `audit_log_config_timeline_idx`
  ON `audit_logs`(`entity`, `action`, `createdAt`)
  WHERE `entity` = 'ConfigParameterValue';

-- Alternativa sem partial index (MySQL não suporta partial):
CREATE INDEX `audit_log_entity_action_created_idx`
  ON `audit_logs`(`entity`, `action`, `createdAt`);
```

> **Nota:** Se o índice composto já existe para outras queries, verificar com `SHOW INDEX FROM audit_logs` antes de criar.

---

## 4. Política de Retenção

### Requisitos Legais

| Norma | Exigência | Aplicação |
|-------|-----------|-----------|
| LGPD Art. 16 I | Dados necessários para cumprimento de obrigação legal | Retenção mínima obrigatória |
| CVM (regulação fintech/tokenização) | Auditoria financeira — 5 a 10 anos | Logs de alteração de taxas/valores |
| Marco Legal da Tokenização (PL 4401/2021) | Rastreabilidade de operações | Todas as alterações que impactam cálculos financeiros |

### Política Definida

| Tier | Período | Ação | Storage |
|------|---------|------|---------|
| **Hot** | 0 – 12 meses | Acesso direto via API (queries rápidas) | MySQL principal |
| **Warm** | 12 – 60 meses (5 anos) | Acesso via query com índice, sem cache | MySQL principal |
| **Cold** | 60 – 120 meses (10 anos) | Exportado para S3 (JSON Lines comprimido) | S3 Glacier IR |
| **Retenção mínima** | **10 anos** | Imutável — NUNCA deletar | — |

### Regras de Imutabilidade

1. **NUNCA** executar `DELETE` físico em registros de auditoria de config
2. **NUNCA** executar `UPDATE` em registros de auditoria (append-only)
3. Soft-delete **NÃO SE APLICA** — registros de auditoria não podem ser "deletados"
4. Archival para S3 após 5 anos é uma **CÓPIA** (registros permanecem no MySQL até os 10 anos)
5. Após 10 anos: registros podem ser removidos do MySQL (já existem no S3 Glacier)

### Implementação do Archival

```typescript
// Cron mensal (1º dia do mês às 03:00 UTC)
@Cron('0 3 1 * *')
async archiveOldConfigLogs(): Promise<void> {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 5);

  const logs = await this.prisma.auditLog.findMany({
    where: {
      entity: 'ConfigParameterValue',
      createdAt: { lt: cutoff },
    },
    orderBy: { createdAt: 'asc' },
    take: 1000, // Batch de 1000
  });

  if (logs.length === 0) return;

  // Export para S3 como JSON Lines (.jsonl.gz)
  const key = `audit-archive/config/${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}.jsonl.gz`;
  await this.s3.uploadGzippedJsonLines(key, logs);

  this.logger.log(`Archived ${logs.length} config audit logs to S3: ${key}`);
  // NÃO deleta do MySQL — apenas marca como archived (optional flag futuro)
}
```

---

## 5. Query de Compliance (exportAuditLog)

```sql
-- Query base para o endpoint GET /api/config/audit
SELECT
  al.id,
  al.action,
  al.entityId AS versionId,
  JSON_EXTRACT(al.newValue, '$.key') AS `key`,
  JSON_EXTRACT(al.oldValue, '$.previousValue') AS oldValue,
  JSON_EXTRACT(al.newValue, '$.value') AS newValue,
  JSON_EXTRACT(al.newValue, '$.effectiveFrom') AS effectiveFrom,
  JSON_EXTRACT(al.newValue, '$.note') AS note,
  al.userId AS actorId,
  u.nome AS actorName,
  al.ip,
  al.createdAt
FROM audit_logs al
LEFT JOIN users u ON u.id = al.userId
WHERE al.entity = 'ConfigParameterValue'
  AND al.action IN ('CONFIG_SET', 'CONFIG_SCHEDULE_CANCELLED', 'CONFIG_ROLLBACK')
  AND al.createdAt BETWEEN :from AND :to
  -- Filtros opcionais:
  -- AND JSON_EXTRACT(al.newValue, '$.key') = :keyFilter
  -- AND al.userId = :actorFilter
ORDER BY al.createdAt DESC
LIMIT :limit OFFSET :offset;
```

---

## 6. Segurança e Compliance

### Quem pode ver o audit log?

| Role | Acesso |
|------|--------|
| ADMIN | Full (todas as chaves, todos os actors) |
| COMPLIANCE | Full (para auditoria regulatória) |
| FINANCEIRO | Read-only das chaves do grupo "Comissões" e "Limites de campanha" |
| Outros | Sem acesso |

### Dados sensíveis no audit log

- **NÃO** logar PII (CPF, email, telefone) nos campos oldValue/newValue
- O `userId` é o único identificador do actor — nome é obtido via JOIN (não armazenado no log)
- IPs são armazenados para rastreabilidade mas **não expostos** na API pública

### Rate limiting

- Endpoint `/api/config/audit` com rate limit de 10 req/min por usuário
- Export CSV limitado a 10.000 registros por request

---

## 7. Resumo de Ações

| # | Ação | Sprint |
|---|------|--------|
| 1 | Adicionar index `audit_log_entity_action_created_idx` | Próxima migration |
| 2 | Implementar `exportAuditLog()` no ConfigService (CFG-05) | Sprint Config |
| 3 | Adicionar emissão de AuditLog em `setValue()` e `cancelScheduled()` | Sprint Config |
| 4 | Implementar cron de archival para S3 (após 5 anos) | Sprint Infra (baixa prioridade) |
| 5 | Documentar política no compliance handbook | Paralelo |
