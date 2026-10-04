# Especificação: Eventos Triggers de Recálculo de Score

**Data:** 22/08/2026  
**Referência:** `scripts/marketplace/PRD_MARKETPLACE_REGRAS.md` §5.1 RF-07  
**Tarefa:** MKT-02

---

## 1. Objetivo

Definir TODOS os eventos do backend que devem invalidar o score atual de uma startup e disparar recálculo. Duas estratégias coexistem:

| Estratégia | Quando | Latência | Uso |
|-----------|--------|----------|-----|
| **Evento** (real-time) | Ação específica que impacta critério do score | 1-5s | UX imediata para o founder |
| **Cron** (batch) | Diário às 03:00 BRT | ~24h | Correção/consistência global |

---

## 2. Mapeamento: Critério do Score → Evento Trigger

### Critério 1: Documentos CVM obrigatórios (peso 20)

| Evento | Descrição | Payload mínimo |
|--------|-----------|----------------|
| `startup.document.uploaded` | Upload de doc CVM com processamento e validação concluídos | `{ startupId, categoria }` |
| `startup.document.deleted` | Documento removido pelo founder ou compliance | `{ startupId, categoria }` |

**Fonte:** `UploadsGateway` emite `upload.status.change` quando scan termina com sucesso. Criar listener que filtra por categorias CVM (MIE, CONTRATO_SOCIAL, CNPJ, BALANCO_ATUAL, DECLARACAO_VERACIDADE, ATA_ELEICAO) e emite `startup.document.uploaded`.

**Alternativa (mais simples):** Hook no Prisma middleware quando `Startup.mie_id`, `contrato_social_id`, `cnpj_id`, `balanco_atual_id`, `declaracao_veracidade_id`, `ata_eleicao_id` mudam de/para NULL.

---

### Critério 2: KYC do founder (peso 15)

| Evento | Descrição | Payload mínimo |
|--------|-----------|----------------|
| `kyc.status.changed` | KYC profile aprovado/rejeitado (avatar, doc, comprovante, biofacial) | `{ userId, profileType, newStatus }` |

**Fonte:** O fluxo de KYC já existe no `admin-kyc.controller.ts` (approve/reject). Emitir evento após UPDATE de status.

**Resolução startupId:** `Startup.founderId === userId` → busca a startup do founder.

---

### Critério 3: Campanhas concluídas com sucesso (peso 10)

| Evento | Descrição | Payload mínimo |
|--------|-----------|----------------|
| `campaign.status.changed` | Status muda para FUNDED ou PAID_OUT | `{ campaignId, startupId, oldStatus, newStatus }` |

**Fonte:** `CampaignsStateService` ao transicionar status. Verificar se `newStatus IN ('FUNDED', 'PAID_OUT')`.

---

### Critério 4: Selo VERIFIED (peso 10)

| Evento | Descrição | Payload mínimo |
|--------|-----------|----------------|
| `startup.seal.attached` | Selo atrelado à startup | `{ startupId, sealSlug }` |
| `startup.seal.removed` | Selo removido | `{ startupId, sealSlug }` |
| `startup.verification.changed` | `verificationStatus` muda para VERIFIED | `{ startupId, newStatus }` |

**Fonte:** Admin/Compliance atribui selo via endpoint. Emitir após create/delete em `StartupSeal`.

**Mapeamento:** `verificationStatus = 'VERIFIED'` OU selo com slug `startup_verificada` → critério atendido.

---

### Critério 5: Selo PARTNERSHIP / Aceleração (peso 10)

| Evento | Descrição | Payload mínimo |
|--------|-----------|----------------|
| `startup.seal.attached` | (mesmo evento do critério 4) | `{ startupId, sealSlug }` |
| `startup.accelerated.changed` | `isAccelerated` muda | `{ startupId, isAccelerated }` |

**Mapeamento:** `isAccelerated = true` OU selo com categoria que indica parceria → critério atendido.

---

### Critério 6: Engajamento ≥ 50% (peso 10)

| Evento | Descrição | Payload mínimo |
|--------|-----------|----------------|
| `investment.confirmed` | Investimento confirmado (tokens vendidos) | `{ campaignId, startupId, tokensQty }` |
| `investment.cancelled` | Investimento cancelado | `{ campaignId, startupId, tokensQty }` |

**Fonte:** `InvestmentsService.confirmInvestment()` e `cancelInvestment()`.

**Nota:** O engajamento muda toda vez que `tokensSold` da campanha muda. Como isso pode ser frequente, usar **debounce de 60s** — se múltiplos investments confirmarem em sequência, recalcular uma vez só.

---

### Critério 7: Documentos extras (peso 15)

| Evento | Descrição | Payload mínimo |
|--------|-----------|----------------|
| `startup.document.uploaded` | (mesmo evento do critério 1 — filtrar por categorias extras) | `{ startupId, categoria }` |
| `startup.document.deleted` | Idem | `{ startupId, categoria }` |

**Categorias extras:** PROJECOES, PITCH_DECK, MODELO_CONTRATO_OFERTA, COMPROVANTE_ENDERECO, DECLARACAO_RECEITA.

---

### Critério 8: Mídia / YouTube (peso 5)

| Evento | Descrição | Payload mínimo |
|--------|-----------|----------------|
| `startup.updated` | Campo `youtube_url` muda de/para null | `{ startupId, changedFields }` |

**Fonte:** PATCH/PUT de startup. Emitir apenas quando `youtube_url` for um dos campos alterados.

---

### Critério 9: Redes sociais (peso 5)

| Evento | Descrição | Payload mínimo |
|--------|-----------|----------------|
| `startup.updated` | Campo `redes_sociais` muda | `{ startupId, changedFields }` |

**Fonte:** Mesmo endpoint de update da startup.

---

## 3. Tabela Consolidada de Eventos

| Evento | Critérios impactados | Frequência estimada | Debounce |
|--------|---------------------|---------------------|----------|
| `startup.document.uploaded` | 1, 7 | ~5/dia | Não |
| `startup.document.deleted` | 1, 7 | Raro | Não |
| `kyc.status.changed` | 2 | ~3/dia | Não |
| `campaign.status.changed` | 3 | Raro (~1/semana) | Não |
| `startup.seal.attached` | 4, 5 | Raro | Não |
| `startup.seal.removed` | 4, 5 | Muito raro | Não |
| `startup.verification.changed` | 4 | Raro | Não |
| `startup.accelerated.changed` | 5 | Muito raro | Não |
| `investment.confirmed` | 6 | ~10/dia | **60s** |
| `investment.cancelled` | 6 | ~2/dia | **60s** |
| `startup.updated` (youtube/redes) | 8, 9 | ~2/dia | Não |

---

## 4. Decisão: Mecanismo de Dispatch

### Escolha: NestJS EventEmitter (`@nestjs/event-emitter`)

**Justificativa:**
- Já utilizado em todo o projeto (FIN-09, FIN-10, uploads)
- Leve, síncrono no processo (não precisa de RabbitMQ para isso)
- `@OnEvent('score.recalculate')` no `RecalculateScoreService` com debounce via Redis

**Fluxo:**

```
[Evento de domínio] → [Listener intermediário] → emit('score.recalculate', { startupId })
                                                        ↓
                                          [RecalculateScoreService]
                                          @OnEvent('score.recalculate')
                                                        ↓
                                          debounce(60s, startupId)
                                                        ↓
                                          computeScore(startupId)
                                                        ↓
                                          prisma.startup.update({ score })
```

### Evento unificado: `score.recalculate`

Todos os listeners de domínio acima convergem para um **único evento**: `score.recalculate` com payload `{ startupId: number }`. O `RecalculateScoreService` é o único consumer.

```typescript
// Em qualquer lugar que detecta mudança:
this.events.emit('score.recalculate', { startupId });
```

---

## 5. Debounce via Redis

```typescript
// RecalculateScoreService
@OnEvent('score.recalculate')
async handleRecalculate(payload: { startupId: number }): Promise<void> {
  const key = `score:debounce:${payload.startupId}`;
  const locked = await this.redis.set(key, '1', 'EX', 60, 'NX');
  if (!locked) {
    // Já há recálculo agendado para esta startup nos próximos 60s
    return;
  }
  // Aguarda 60s para agrupar múltiplos eventos (ex: vários investments)
  setTimeout(async () => {
    await this.computeAndSaveScore(payload.startupId);
    await this.redis.del(key);
  }, 60_000);
}
```

**Alternativa sem setTimeout (mais robusta):** Usar BullMQ delayed job:
```typescript
await this.scoreQueue.add('recalculate', { startupId }, {
  delay: 60_000,
  jobId: `score-${startupId}`, // deduplica por startupId
});
```

**Recomendação:** BullMQ (já existe Redis + RabbitMQ no projeto). Garante retry e persistência.

---

## 6. Cron de Consistência (03:00 BRT = 06:00 UTC)

```typescript
@Cron('0 6 * * *') // 06:00 UTC = 03:00 BRT
async recalculateAll(): Promise<void> {
  const startups = await this.prisma.startup.findMany({
    where: {
      status: 'APPROVED',
      campaigns: { some: { status: { in: ['OPEN', 'FUNDED', 'PAID_OUT'] } } },
    },
    select: { id: true },
  });

  for (const s of startups) {
    await this.computeAndSaveScore(s.id);
  }

  this.logger.log(`Score recalculado para ${startups.length} startups`);
}
```

**Lock:** Usar Redis lock (`score:cron:lock`, TTL 1h) para evitar runs concorrentes em multi-worker.

---

## 7. Alerta de Falha

| Condição | Ação |
|----------|------|
| Cron falha 3× seguidas | Alerta para DPO via email (reutilizar `ConfigAlertService` pattern) |
| Cron demora > 5min | Log warning (monitorar em Sentry) |
| Score calculado = 0 para startup com campanha FUNDED | Log warning — possível bug na fórmula |

---

## 8. Resumo de Implementação

| # | Item | Esforço |
|---|------|---------|
| 1 | Criar `RecalculateScoreService` com `computeScore(startupId)` | 2h |
| 2 | Criar listener `@OnEvent('score.recalculate')` com debounce | 1h |
| 3 | Emitir `score.recalculate` nos 6 pontos de domínio identificados | 1h |
| 4 | Cron diário com lock Redis | 30min |
| 5 | Testes unitários (≥ 8: fórmula, debounce, cron, lock, edge cases) | 2h |
| **Total** | | **~6h30** |

---

## 9. Próximos Passos

1. **MKT-03** — Mapear impacto da migration de schema (campos `scoreBreakdown`, `scoreLastCalculatedAt`)
2. Implementar `RecalculateScoreService` com fórmula validada em MKT-01
3. Adicionar emissões nos 6 pontos de domínio
4. Implementar cron + lock + alerta de falha
