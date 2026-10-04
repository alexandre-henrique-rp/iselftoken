# Especificação: Alertas de Chave Crítica

**Data:** 22/08/2026  
**Referência:** `scripts/PRD_CONFIG_TAXAS_VALORES.md` §6 (LGPD) + Épico C  
**Tarefa:** CFG-08  
**Depende de:** CFG-06

---

## 1. Objetivo

Notificar automaticamente stakeholders quando uma **chave crítica** de configuração é alterada (SET efetivado — não agendamento). Garante visibilidade imediata de mudanças que impactam cálculos financeiros, compliance ou experiência do investidor.

---

## 2. Lista de Chaves Críticas (CRITICAL_KEYS)

```typescript
export const CRITICAL_KEYS: readonly string[] = [
  // Comissões e taxas — impactam receita da plataforma
  'fundraising.platformFee',
  'fundraising.authFeePerToken',

  // Preço base do token — impacta cálculo de tokenização
  'fundraising.tokenPrice',

  // Valores cobrados — impactam checkout
  'seal.verificationPrice',
  'earlyAccess.price',
  'fundraising.complianceFee',
  'fundraising.fastTrackFee',

  // Limites de captação — impactam criação de campanhas
  'fundraising.capByStage.min',
  'fundraising.capByStage.ideacao.max',
  'fundraising.capByStage.mvp.max',
  'fundraising.capByStage.operacao.max',
  'fundraising.capByStage.tracao.max',
  'fundraising.capByStage.escala.max',
  'fundraising.minCampaign',
  'fundraising.maxCampaign',

  // Planos — impactam preço de adesão
  'plan.plano-afiliado.preco',
  'plan.plano-investidor.preco',
  'plan.plano-fundador.preco',
] as const;
```

**Critério de inclusão:** Qualquer chave cuja alteração impacte diretamente valores monetários cobrados, percentuais de receita, ou limites regulatórios.

---

## 3. Gatilho

### Quando dispara

| Evento | Dispara? | Justificativa |
|--------|----------|---------------|
| `setValue()` com `effectiveFrom <= now` (imediato) | ✅ SIM | Valor já está vigente |
| `setValue()` com `effectiveFrom > now` (agendamento) | ✅ SIM (com label "AGENDADO") | Stakeholders precisam saber que vai mudar |
| `cancelScheduled()` | ❌ NÃO | Cancelamento é revogação — nada muda de fato |
| Rollback manual (via `setValue` com valor anterior) | ✅ SIM | É um SET como qualquer outro |

### Condição de disparo (pseudocódigo)

```typescript
// Após setValue() com sucesso:
if (CRITICAL_KEYS.includes(input.key)) {
  await this.configAlertService.notifyCriticalChange({
    key: input.key,
    oldValue,
    newValue: input.value,
    effectiveFrom: input.effectiveFrom,
    isScheduled: input.effectiveFrom > new Date(),
    changedById: input.createdById,
    changedByName: actor.nome,
    changedAt: new Date(),
  });
}
```

---

## 4. Destinatários

| Role | Canal | Obrigatório? |
|------|-------|-------------|
| DPO (Data Protection Officer) | Email | ✅ Sim |
| ADMIN (CTO/founder da plataforma) | Email + In-app | ✅ Sim |
| COMPLIANCE (equipe) | In-app | ✅ Sim |
| FINANCEIRO (equipe) | In-app (apenas chaves de comissões/valores) | ✅ Se chave do grupo "Comissões" ou "Taxas de adesão" |

### Resolução de destinatários

```typescript
// DPO: endereço fixo em env var (não é um User no sistema)
const DPO_EMAIL = process.env.DPO_ALERT_EMAIL; // ex: dpo@iselftoken.com

// ADMIN: todos os Users com role = 'ADMIN'
const admins = await this.prisma.user.findMany({
  where: { role: 'ADMIN', isActive: true },
  select: { id: true, email: true, nome: true },
});

// COMPLIANCE: todos com role = 'COMPLIANCE'
const compliance = await this.prisma.user.findMany({
  where: { role: 'COMPLIANCE', isActive: true },
  select: { id: true },
});

// FINANCEIRO: se chave pertence a grupo relevante
const isFinanceKey = ['Comissões', 'Taxas de adesão (planos)'].includes(meta.group);
const financeiro = isFinanceKey
  ? await this.prisma.user.findMany({
      where: { role: 'FINANCEIRO', isActive: true },
      select: { id: true },
    })
  : [];
```

---

## 5. Canais de Notificação

### 5.1 Email (DPO + ADMIN)

**Template:** `config-critical-changed`

**Subject:**
```
[iSelfToken] ⚠️ Alteração crítica: {label} ({key})
```

**Conteúdo mínimo (PT-BR):**

```
Olá {destinatário},

Uma configuração crítica da plataforma foi alterada:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Parâmetro: {label} ({key})
Grupo: {group}
Valor anterior: {oldValue} {unitLabel}
Novo valor: {newValue} {unitLabel}
Vigência: {effectiveFrom} {isScheduled ? '(AGENDADO)' : '(IMEDIATO)'}
Alterado por: {changedByName} (ID: {changedById})
Data/hora: {changedAt}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Para revisar o histórico completo:
{BASE_URL}/admin/config?key={key}

Se esta alteração não foi autorizada, entre em contato com a equipe de TI imediatamente.

— iSelfToken Platform
```

**Formatação de unidade:**

| Unit | Formato |
|------|---------|
| FRACTION | `{value * 100}%` (ex: 0.05 → "5%") |
| PERCENT | `{value}%` (ex: 3 → "3%") |
| BRL | `R$ {value.toFixed(2)}` (ex: 890 → "R$ 890,00") |
| INT | `{value}` (ex: 5 → "5") |
| BOOL | `{value ? 'Ligado' : 'Desligado'}` |

### 5.2 In-app Notification

**Modelo:** Reutilizar sistema de notificações existente (se houver) ou criar registros em tabela `notifications`.

```typescript
interface ConfigAlertNotification {
  userId: number;
  type: 'CONFIG_CRITICAL_CHANGED';
  title: string;   // "Alteração crítica: Taxa da plataforma"
  body: string;    // "De 5% para 7% — vigente imediatamente"
  link: string;    // "/admin/config?key=fundraising.platformFee"
  read: boolean;   // default false
  createdAt: Date;
}
```

**Entrega:** Criada no banco. Frontend consome via polling (TanStack Query) ou WebSocket (futuro).

---

## 6. Throttling (Anti-Spam)

| Regra | Valor | Justificativa |
|-------|-------|---------------|
| Max emails por chave por dia | 1 | Evita flood se admin testar valores repetidamente |
| Max emails totais por dia (all keys) | 10 | Cap de segurança contra loops |
| Cooldown entre emails da mesma chave | 24h | Agrupamento natural de mudanças no mesmo dia |
| In-app: sem throttle | — | Notificações in-app são leves e não incomodam |

### Implementação do throttle

```typescript
// Cache Redis com TTL 24h
const throttleKey = `config-alert:${key}:email`;
const alreadySent = await this.redis.get(throttleKey);
if (alreadySent) {
  this.logger.log(`Config alert throttled for key=${key} (email já enviado nas últimas 24h)`);
  return; // Não envia email, mas AINDA cria notificação in-app
}
await this.redis.setex(throttleKey, 86400, '1'); // TTL 24h
```

---

## 7. Service: ConfigAlertService

**Localização:** `backendnode/src/api/config/config-alert.service.ts`

```typescript
@Injectable()
export class ConfigAlertService {
  constructor(
    private readonly email: EmailService,
    private readonly prisma: PrismaService,
    private readonly redis: Redis,
    private readonly logger: Logger,
  ) {}

  /**
   * Notifica stakeholders sobre alteração de chave crítica.
   * Chamado pelo ConfigService.setValue() quando key ∈ CRITICAL_KEYS.
   *
   * Fluxo:
   * 1. Resolve destinatários (DPO, admins, compliance, financeiro)
   * 2. Cria notificações in-app (sem throttle)
   * 3. Verifica throttle de email (1/chave/dia)
   * 4. Se não throttled: envia email via EmailService (template DB)
   */
  async notifyCriticalChange(payload: CriticalChangePayload): Promise<void>;
}

interface CriticalChangePayload {
  key: string;
  oldValue: number;
  newValue: number;
  effectiveFrom: Date;
  isScheduled: boolean;
  changedById: number | null;
  changedByName: string | null;
  changedAt: Date;
}
```

### Listener via EventEmitter (alternativa ao call direto)

```typescript
// No ConfigService.setValue():
this.events.emit('config.critical.changed', payload);

// No ConfigAlertService:
@OnEvent('config.critical.changed')
async handleCriticalChange(payload: CriticalChangePayload): Promise<void> {
  await this.notifyCriticalChange(payload);
}
```

**Vantagem do evento:** Desacoplamento — ConfigService não depende de ConfigAlertService diretamente. Facilita testes unitários.

---

## 8. Variáveis de Ambiente Necessárias

```env
# Email do DPO para alertas críticos de config
DPO_ALERT_EMAIL=dpo@iselftoken.com

# URL base para links nos emails (sem trailing slash)
# Já deve existir: FRONTEND_URL ou BASE_URL
```

---

## 9. Testes Esperados

| Teste | Tipo | Descrição |
|-------|------|-----------|
| `config-alert.service.spec.ts` | Unit | Verifica que `notifyCriticalChange` envia email para DPO + admins |
| | Unit | Verifica throttle: 2ª chamada com mesma key em 24h NÃO envia email |
| | Unit | Verifica que in-app é criado MESMO com throttle de email ativo |
| | Unit | Verifica que chaves NÃO críticas não disparam alerta |
| | Unit | Verifica formatação correta por unit (FRACTION→%, BRL→R$) |
| | Unit | Verifica resolução de destinatários por grupo (FINANCEIRO só recebe se chave é de comissão) |

---

## 10. Decisões Pendentes

| # | Pergunta | Recomendação | Impacto |
|---|----------|-------------|---------|
| 1 | Dispara em ROLLBACK? | ✅ Sim (é um SET como qualquer outro) | Nenhum — já coberto |
| 2 | Notificação in-app: polling ou WebSocket? | Polling (já usado no projeto via TanStack Query) | Sem infra adicional |
| 3 | Texto do email em hardcoded ou via EmailTemplate DB? | Via EmailTemplate DB (slug `config-critical-changed`) — consistente com FIN-05 | Precisa seed do template |

---

## 11. Próximos Passos

1. Criar `ConfigAlertService` com listener `@OnEvent('config.critical.changed')`
2. Adicionar `CRITICAL_KEYS` em `config.constants.ts`
3. Emitir evento no `ConfigService.setValue()` quando key é crítica
4. Criar seed do EmailTemplate `config-critical-changed` (com variáveis: key, label, oldValue, newValue, effectiveFrom, changedByName, changedAt, link)
5. Adicionar `DPO_ALERT_EMAIL` no `.env.example`
6. Testes unitários (≥ 6)
