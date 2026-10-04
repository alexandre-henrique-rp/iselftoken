# API Contract — ConfigService Unificado

**Data:** 22/08/2026  
**Referência:** `scripts/PRD_CONFIG_TAXAS_VALORES.md` §5.1 + §7  
**Tarefa:** CFG-05  
**Depende de:** CFG-04

---

## Visão Geral

O `ConfigService` é a **fonte única de verdade** para parâmetros de cálculo (taxas, percentuais, limites). Opera sobre a tabela `config_parameter_values` em modo append-only: cada alteração cria uma nova versão com data de vigência — o passado nunca é reescrito.

**Localização:** `backendnode/src/api/config/config.service.ts`

---

## Interface Pública (TypeScript)

```typescript
@Injectable()
export class ConfigService implements OnModuleInit {

  /**
   * Semeia linha de base na inicialização (idempotente).
   * Para cada chave em CONFIG_PARAMETERS sem versão, insere com effectiveFrom epoch.
   */
  onModuleInit(): Promise<void>;

  /**
   * Retorna o valor vigente de um parâmetro numa data específica.
   *
   * Lógica: busca a versão de maior `effectiveFrom <= at` onde `revokedAt IS NULL`.
   * Se nenhuma versão encontrada, retorna o `default` de CONFIG_PARAMETERS.
   *
   * @param key - Chave canônica (ex: 'fundraising.platformFee')
   * @param at - Data de referência (default: now())
   * @returns Valor numérico vigente
   * @throws Error se chave desconhecida e não há default
   */
  getEffective(key: string, at?: Date): Promise<number>;

  /**
   * Retorna vários parâmetros vigentes como mapa key→valor.
   *
   * @param keys - Lista de chaves canônicas
   * @param at - Data de referência (default: now())
   * @returns Mapa { 'key': valorNumérico }
   */
  getManyEffective(keys: string[], at?: Date): Promise<Record<string, number>>;

  /**
   * Visão completa para o painel admin: valor atual + agendamento + histórico.
   *
   * @param now - Data de referência para calcular "atual" vs "agendado"
   * @returns Array de ParamAdminView (1 por chave em CONFIG_PARAMETERS)
   */
  listForAdmin(now?: Date): Promise<ParamAdminView[]>;

  /**
   * Cria uma nova versão (imediata ou agendada).
   *
   * - effectiveFrom <= now → vigente imediatamente
   * - effectiveFrom > now → agendada para o futuro
   *
   * Validações:
   * - Chave deve existir em CONFIG_PARAMETERS (BadRequest se não)
   * - Valor não pode ser NaN nem negativo
   * - Se já existe versão não-revogada com mesma key+effectiveFrom → Conflict
   *
   * Efeitos colaterais:
   * - Invalida cache Redis da chave (pub/sub broadcast para outros workers)
   * - Cria registro de AuditLog (CONFIG_SET)
   * - Se chave é CRITICAL → emite evento `config.critical.changed`
   *
   * @returns ParamVersion criada
   * @throws BadRequestException se chave desconhecida ou valor inválido
   * @throws ConflictException se já existe versão com mesma key+effectiveFrom
   */
  setValue(input: SetValueInput): Promise<ParamVersion>;

  /**
   * Cancela (revoga) um agendamento futuro.
   *
   * Regras:
   * - Só pode cancelar versões com effectiveFrom > now (futuras)
   * - Versões passadas/atuais são IMUTÁVEIS (BadRequest se tentar)
   * - Soft-cancel: seta revokedAt=now, revokedById=userId
   *
   * Efeitos colaterais:
   * - Cria registro de AuditLog (CONFIG_SCHEDULE_CANCELLED)
   *
   * @param key - Chave canônica
   * @param versionId - ID da versão agendada a cancelar
   * @param userId - Quem está cancelando
   * @throws BadRequestException se versão já vigente ou já revogada
   * @throws NotFoundException se versão não encontrada
   */
  cancelScheduled(key: string, versionId: number, userId: number): Promise<void>;

  /**
   * Histórico completo de um parâmetro (todas as versões, incluindo revogadas).
   *
   * Paginado, ordenado por effectiveFrom DESC.
   * Usado pelo painel admin para visualizar timeline de alterações.
   *
   * @param key - Chave canônica
   * @param options - Paginação (page, limit)
   * @returns { data: ParamVersion[], total: number }
   */
  getHistory(key: string, options?: PaginationInput): Promise<PaginatedResult<ParamVersionFull>>;

  /**
   * Exporta auditoria de todas as alterações de config (cross-key).
   *
   * Filtros: período (from/to), key específica, actor (createdById).
   * Formato: array pronto para CSV ou JSON.
   *
   * Usado por Compliance para relatórios de auditoria (LGPD Art. 16 I).
   *
   * @param filter - Filtros opcionais
   * @returns Array de registros de auditoria
   */
  exportAuditLog(filter?: AuditLogFilter): Promise<ConfigAuditEntry[]>;
}
```

---

## Tipos

```typescript
/** Input para setValue */
interface SetValueInput {
  key: string;
  value: number;
  effectiveFrom: Date;
  note?: string | null;
  createdById?: number | null;
}

/** Versão de um parâmetro (retorno de setValue, getHistory) */
interface ParamVersion {
  id: number;
  value: number;
  effectiveFrom: Date;
  note: string | null;
  createdById: number | null;
  createdAt: Date;
}

/** Versão extendida com campos de revogação */
interface ParamVersionFull extends ParamVersion {
  revokedAt: Date | null;
  revokedById: number | null;
}

/** Visão admin de um parâmetro */
interface ParamAdminView extends ConfigParamMeta {
  currentValue: number;
  currentEffectiveFrom: Date | null;
  scheduled: ParamVersion | null;
  history: ParamVersion[];
}

/** Filtro para export de auditoria */
interface AuditLogFilter {
  from?: Date;
  to?: Date;
  key?: string;
  createdById?: number;
  includeRevoked?: boolean;
  page?: number;
  limit?: number;
}

/** Entrada de auditoria para export */
interface ConfigAuditEntry {
  id: number;
  key: string;
  value: number;
  effectiveFrom: Date;
  note: string | null;
  createdById: number | null;
  createdByName: string | null; // JOIN com User.nome
  createdAt: Date;
  revokedAt: Date | null;
  revokedById: number | null;
  revokedByName: string | null;
}

/** Paginação genérica */
interface PaginationInput {
  page?: number;
  limit?: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

---

## Estado Atual vs Especificado

| Método | Existe? | Status |
|--------|---------|--------|
| `onModuleInit()` | ✅ | Implementado e funcional |
| `getEffective(key, at?)` | ✅ | Implementado — **TODO:** adicionar filtro `revokedAt IS NULL` na query (Fase 1 DDL) |
| `getManyEffective(keys, at?)` | ✅ | Implementado |
| `listForAdmin(now?)` | ✅ | Implementado — **TODO:** filtrar versões revogadas no cálculo de `current` |
| `setValue(input)` | ✅ | Implementado — **TODO:** adicionar validação de Conflict, cache invalidation, AuditLog, evento critical |
| `cancelScheduled(key, id, userId)` | ❌ | A implementar |
| `getHistory(key, options?)` | ❌ | A implementar |
| `exportAuditLog(filter?)` | ❌ | A implementar |

---

## Validações por Método

### `setValue`

| Validação | Tipo | Mensagem |
|-----------|------|----------|
| Chave desconhecida | BadRequest | `Parâmetro de configuração desconhecido: {key}` |
| Valor NaN | BadRequest | `Valor inválido para {key}` |
| Valor negativo | BadRequest | `Valor não pode ser negativo` |
| Versão duplicada (key+effectiveFrom não-revogada) | Conflict | `Já existe versão vigente para {key} em {effectiveFrom}` |

### `cancelScheduled`

| Validação | Tipo | Mensagem |
|-----------|------|----------|
| Versão não encontrada | NotFound | `Versão {id} não encontrada para {key}` |
| Versão já vigente (effectiveFrom <= now) | BadRequest | `Não é possível cancelar versão já vigente (passado é imutável)` |
| Versão já revogada | BadRequest | `Versão já foi cancelada em {revokedAt}` |

### `getEffective`

| Validação | Tipo | Comportamento |
|-----------|------|---------------|
| Chave com default mas sem versão | — | Retorna `meta.default` |
| Chave desconhecida sem default | — | Retorna `NaN` (caller deve tratar) |

---

## Efeitos Colaterais

### Cache Invalidation (Redis pub/sub)

```typescript
// Após setValue ou cancelScheduled:
await this.redis.publish('config:invalidate', JSON.stringify({ key }));

// Listeners em todos os workers:
this.redis.subscribe('config:invalidate', (message) => {
  const { key } = JSON.parse(message);
  this.localCache.delete(key); // in-memory cache por worker
});
```

**TTL do cache local:** 60s (fallback se pub/sub falhar).

### AuditLog

```typescript
// Em setValue:
await this.auditLog.create({
  action: 'CONFIG_SET',
  entity: 'ConfigParameterValue',
  entityId: String(version.id),
  details: { key, value, effectiveFrom, note },
  userId: input.createdById,
});

// Em cancelScheduled:
await this.auditLog.create({
  action: 'CONFIG_SCHEDULE_CANCELLED',
  entity: 'ConfigParameterValue',
  entityId: String(versionId),
  details: { key, revokedAt: new Date() },
  userId,
});
```

### Evento de Chave Crítica

```typescript
const CRITICAL_KEYS = [
  'fundraising.platformFee',
  'fundraising.authFeePerToken',
  'fundraising.tokenPrice',
  'seal.verificationPrice',
  'fundraising.capByStage.min',
];

// Após setValue com chave crítica:
if (CRITICAL_KEYS.includes(input.key)) {
  this.events.emit('config.critical.changed', {
    key: input.key,
    oldValue: await this.getEffective(input.key), // valor anterior
    newValue: input.value,
    effectiveFrom: input.effectiveFrom,
    changedById: input.createdById,
  });
}
```

**Listener:** `ConfigAlertService` (CFG-08) envia email para DPO + notificação in-app.

---

## Endpoints REST (Controller)

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| GET | `/api/config/parameters` | AuthGuard + AdminOrFinanceiroGuard | `listForAdmin()` |
| GET | `/api/config/parameters/:key/history` | AuthGuard + AdminGuard | `getHistory(key)` |
| POST | `/api/config/parameters/:key` | AuthGuard + AdminGuard | `setValue()` |
| DELETE | `/api/config/parameters/:key/versions/:id` | AuthGuard + AdminGuard | `cancelScheduled()` |
| GET | `/api/config/audit` | AuthGuard + ComplianceOrAdminGuard | `exportAuditLog()` |
| GET | `/api/config/public` | Público (rate-limited) | Retorna limites de captação por estágio (frontend) |

### Endpoint Público (`/api/config/public`)

```typescript
// Response shape (para substituir LIMITES_CAPTACAO do frontend)
{
  capByStage: {
    min: number; // fundraising.capByStage.min
    ideacao: { max: number };
    mvp: { max: number };
    operacao: { max: number };
    tracao: { max: number };
    escala: { max: number };
  },
  tokenPrice: number; // fundraising.tokenPrice
}
```

Cachear por 5min no browser (`Cache-Control: public, max-age=300`).

---

## Próximos Passos

1. **Implementar** `cancelScheduled()` no ConfigService
2. **Implementar** `getHistory()` com paginação
3. **Implementar** `exportAuditLog()` com JOINs de User
4. **Adicionar** filtro `revokedAt IS NULL` no `getEffective()` (após Fase 1 DDL)
5. **Adicionar** cache invalidation via Redis pub/sub (CFG-08 prerequisite)
6. **Criar** endpoint `/api/config/public` para o frontend
7. **CFG-06** — Especificar modelo do ConfigAuditLog (append-only, retenção 10 anos)
