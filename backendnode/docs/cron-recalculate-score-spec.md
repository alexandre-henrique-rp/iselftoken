# Especificação: Cron de Recálculo de Score (RF-06)

**Data:** 22/08/2026  
**Referência:** `scripts/marketplace/PRD_MARKETPLACE_REGRAS.md` §5.1 RF-06 + §10  
**Tarefa:** MKT-08  
**Depende de:** MKT-01, MKT-02

---

## 1. Schedule

| Parâmetro | Valor | Justificativa |
|-----------|-------|---------------|
| Horário | **03:00 BRT (06:00 UTC)** | Fora do horário de pico; antes do founder acordar |
| Frequência | **Diário** (seg-dom) | Score muda com baixa frequência — diário é suficiente |
| Expressão cron | `0 6 * * *` | NestJS `@Cron()` |

---

## 2. Escopo do Recálculo

```typescript
// Startups elegíveis para recálculo:
const startups = await this.prisma.startup.findMany({
  where: {
    status: 'APPROVED',
    campaigns: {
      some: {
        status: { in: ['OPEN', 'FUNDED', 'PAID_OUT'] },
      },
    },
  },
  select: { id: true },
});
```

**Estimativa:** ~20-50 startups em produção inicial. Crescimento esperado: < 500 no primeiro ano.

---

## 3. Lock (evitar runs concorrentes)

```typescript
const LOCK_KEY = 'score:cron:lock';
const LOCK_TTL = 3600; // 1 hora

async runWithLock(): Promise<boolean> {
  const acquired = await this.redis.set(LOCK_KEY, process.pid.toString(), 'EX', LOCK_TTL, 'NX');
  if (!acquired) {
    this.logger.warn('Score cron: lock já existe — outro worker está executando');
    return false;
  }
  try {
    await this.recalculateAll();
    return true;
  } finally {
    await this.redis.del(LOCK_KEY);
  }
}
```

---

## 4. Retry

| Parâmetro | Valor |
|-----------|-------|
| Máximo de retries | **3** |
| Backoff | Exponencial: 5min, 15min, 45min |
| Granularidade | **Por startup** (falha de 1 não bloqueia as demais) |

```typescript
for (const startup of startups) {
  let attempts = 0;
  while (attempts < 3) {
    try {
      await this.computeAndSaveScore(startup.id);
      break;
    } catch (err) {
      attempts++;
      if (attempts >= 3) {
        failedIds.push(startup.id);
        this.logger.error(`Score cron: falha em startup ${startup.id} após 3 tentativas: ${err.message}`);
      } else {
        await this.sleep(5000 * Math.pow(3, attempts)); // 5s, 15s, 45s
      }
    }
  }
}
```

---

## 5. Alerta de Falha

| Condição | Ação | Destinatário |
|----------|------|-------------|
| Cron falha completamente (lock não adquirido 3 dias seguidos) | Email urgente | DPO + CTO |
| > 10% das startups falharam no recálculo | Email warning | ADMIN |
| Cron demorou > 5 minutos | Log warning (Sentry) | Monitoramento |
| Score = 0 para startup com campanha FUNDED | Log anomaly | ADMIN (in-app) |

### Implementação do alerta

```typescript
if (failedIds.length > startups.length * 0.1) {
  await this.alertService.sendEmail({
    to: process.env.DPO_ALERT_EMAIL,
    subject: '[iSelfToken] ⚠️ Score cron: >10% de falhas',
    body: `${failedIds.length} de ${startups.length} startups falharam no recálculo. IDs: ${failedIds.join(', ')}`,
  });
}

// Contador de falhas consecutivas (Redis)
const consecutiveKey = 'score:cron:consecutive_failures';
if (failedIds.length === startups.length) {
  const count = await this.redis.incr(consecutiveKey);
  if (count >= 3) {
    // Alerta urgente: 3 dias seguidos sem sucesso
    await this.alertService.sendUrgentEmail(/* ... */);
  }
} else {
  await this.redis.del(consecutiveKey);
}
```

---

## 6. Scheduler

### Opção escolhida: NestJS `@Cron()` + Redis lock

**Justificativa:**
- `@nestjs/schedule` já está no projeto (`ScheduleModule.forRoot()` em `app.module.ts`)
- Redis lock garante single-execution em multi-worker (PM2 cluster ou ECS tasks)
- Não precisa de BullMQ para um job diário simples (BullMQ fica para o debounce de eventos real-time em MKT-02)

```typescript
@Injectable()
export class ScoreCronService {
  constructor(
    private readonly scoreService: RecalculateScoreService,
    private readonly redis: Redis,
    private readonly logger: Logger,
  ) {}

  @Cron('0 6 * * *') // 06:00 UTC = 03:00 BRT
  async handleCron(): Promise<void> {
    this.logger.log('Score cron: iniciando recálculo diário');
    const success = await this.runWithLock();
    if (success) {
      this.logger.log('Score cron: concluído com sucesso');
    }
  }
}
```

---

## 7. Observabilidade

| Métrica | Como | Onde |
|---------|------|------|
| Duração do cron | `Date.now()` start/end | Log estruturado + Sentry breadcrumb |
| Startups processadas | Counter | Log |
| Startups com falha | Counter + lista de IDs | Log + Redis (para alerta) |
| Score médio pós-cron | `AVG(score)` query | Log |
| Distribuição de scores | Histograma (0-30, 31-60, 61-100) | Log semanal |

---

## 8. Estimativa

| Item | Esforço |
|------|---------|
| `ScoreCronService` com lock + retry | 1.5h |
| Integração com `RecalculateScoreService` (MKT-02) | 30min |
| Alertas (email + Redis counter) | 1h |
| Testes unitários (≥ 5) | 1h |
| **Total** | **~4h** |
