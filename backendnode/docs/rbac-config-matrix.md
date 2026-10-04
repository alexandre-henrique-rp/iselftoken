# Especificação: RBAC Granular por Chave/Role (Config)

**Data:** 22/08/2026  
**Referência:** `scripts/PRD_CONFIG_TAXAS_VALORES.md` §5.1 Épico C  
**Tarefa:** CFG-09  
**Depende de:** CFG-05

---

## 1. Decisão: Granularidade por Grupo (não por chave individual)

**Opções avaliadas:**

| Opção | Complexidade | Manutenção |
|-------|-------------|-----------|
| A) Por chave individual (N chaves × M roles) | Alta (19×4 = 76 regras) | Toda nova chave exige update |
| B) Por grupo (6 grupos × 4 roles) | Média (24 regras) | Grupos são estáveis |
| C) Binário (ADMIN full, outros read-only) | Baixa | Não atende FINANCEIRO com write parcial |

**Decisão: Opção B — Granularidade por grupo.**

Cada chave pertence a um `group` (já definido em `config.constants.ts`). Permissões são atribuídas por `(role, group)`.

---

## 2. Grupos de Configuração

| Grupo | Chaves |
|-------|--------|
| `Tokens e emissão` | fundraising.authFeePerToken, fundraising.tokenPrice |
| `Comissões` | fundraising.platformFee, affiliate.defaultAffiliatePct, affiliate.defaultPlatformPct |
| `Compliance` | fundraising.complianceFee, fundraising.fastTrackFee |
| `Limites de campanha` | fundraising.minCampaign, fundraising.maxCampaign, fundraising.equityMin, fundraising.equityMax, fundraising.capByStage.* |
| `Taxas de adesão (planos)` | plan.plano-afiliado.preco, plan.plano-investidor.preco, plan.plano-fundador.preco |
| `Operacional` | seal.verificationPrice, earlyAccess.price, sla.installmentPaymentDays |
| `Afiliação` | affiliate.requireFounderReview |

---

## 3. Matriz de Permissões

| Role \ Grupo | Tokens e emissão | Comissões | Compliance | Limites de campanha | Taxas de adesão | Operacional | Afiliação |
|---|---|---|---|---|---|---|---|
| **ADMIN** | READ + WRITE | READ + WRITE | READ + WRITE | READ + WRITE | READ + WRITE | READ + WRITE | READ + WRITE |
| **FINANCEIRO** | READ | READ + WRITE | READ | READ | READ + WRITE | READ | READ |
| **COMPLIANCE** | READ | READ | READ + WRITE | READ | READ | READ | READ |
| **Outros** | — | — | — | — | — | — | — |

**Legenda:**
- **READ** = pode ver valor atual, histórico e agendamentos
- **WRITE** = pode criar versão (setValue) e cancelar agendamento (cancelScheduled)
- **—** = sem acesso (endpoint retorna 403)

---

## 4. Implementação

### 4.1 Constante de permissões

```typescript
// backendnode/src/api/config/config-permissions.ts

export type ConfigPermission = 'READ' | 'WRITE';

export const CONFIG_GROUP_PERMISSIONS: Record<
  string, // group
  Record<string, ConfigPermission[]> // role → permissions
> = {
  'Tokens e emissão': {
    ADMIN: ['READ', 'WRITE'],
    FINANCEIRO: ['READ'],
    COMPLIANCE: ['READ'],
  },
  'Comissões': {
    ADMIN: ['READ', 'WRITE'],
    FINANCEIRO: ['READ', 'WRITE'],
    COMPLIANCE: ['READ'],
  },
  'Compliance': {
    ADMIN: ['READ', 'WRITE'],
    FINANCEIRO: ['READ'],
    COMPLIANCE: ['READ', 'WRITE'],
  },
  'Limites de campanha': {
    ADMIN: ['READ', 'WRITE'],
    FINANCEIRO: ['READ'],
    COMPLIANCE: ['READ'],
  },
  'Taxas de adesão (planos)': {
    ADMIN: ['READ', 'WRITE'],
    FINANCEIRO: ['READ', 'WRITE'],
    COMPLIANCE: ['READ'],
  },
  'Operacional': {
    ADMIN: ['READ', 'WRITE'],
    FINANCEIRO: ['READ'],
    COMPLIANCE: ['READ'],
  },
  'Afiliação': {
    ADMIN: ['READ', 'WRITE'],
    FINANCEIRO: ['READ'],
    COMPLIANCE: ['READ'],
  },
};
```

### 4.2 Helper de verificação

```typescript
import { CONFIG_PARAM_BY_KEY } from './config.constants';
import { CONFIG_GROUP_PERMISSIONS, type ConfigPermission } from './config-permissions';

/**
 * Verifica se um role tem uma permissão específica sobre uma chave.
 */
export function hasConfigPermission(
  role: string,
  key: string,
  permission: ConfigPermission,
): boolean {
  const meta = CONFIG_PARAM_BY_KEY[key];
  if (!meta) return false;

  const groupPerms = CONFIG_GROUP_PERMISSIONS[meta.group];
  if (!groupPerms) return false;

  const rolePerms = groupPerms[role];
  if (!rolePerms) return false;

  return rolePerms.includes(permission);
}
```

### 4.3 Guard no Controller

```typescript
// backendnode/src/api/config/guards/config-rbac.guard.ts

@Injectable()
export class ConfigRbacGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { role: string };
    const key = req.params?.key ?? req.body?.key;
    const method = req.method;

    // GET = READ, POST/DELETE = WRITE
    const permission: ConfigPermission = method === 'GET' ? 'READ' : 'WRITE';

    if (!key) return false; // fallback seguro
    if (!hasConfigPermission(user.role, key, permission)) {
      throw new ForbiddenException(
        `Seu papel (${user.role}) não tem permissão de ${permission} sobre "${key}".`,
      );
    }
    return true;
  }
}
```

### 4.4 Aplicação nos Endpoints

| Endpoint | Guard |
|----------|-------|
| `GET /api/config/parameters` | `AuthGuard` + filtro no service (retorna apenas chaves que o role pode READ) |
| `GET /api/config/parameters/:key/history` | `AuthGuard` + `ConfigRbacGuard` (READ) |
| `POST /api/config/parameters/:key` | `AuthGuard` + `ConfigRbacGuard` (WRITE) |
| `DELETE /api/config/parameters/:key/versions/:id` | `AuthGuard` + `ConfigRbacGuard` (WRITE) |
| `GET /api/config/audit` | `AuthGuard` + role IN (ADMIN, COMPLIANCE) |

---

## 5. UX no Frontend

### Decisão: Mesma página, campos bloqueados por role

O endpoint `GET /api/config/parameters` retorna **todos os parâmetros visíveis** para o role do usuário, com campo adicional `canWrite: boolean` por parâmetro.

```typescript
// Response shape ajustada para o frontend
interface ParamAdminViewWithPermission extends ParamAdminView {
  canWrite: boolean; // false = campo read-only no frontend
}
```

### Comportamento no frontend

| Situação | UI |
|----------|-----|
| `canWrite = true` | Input editável + botão "Salvar" + botão "Agendar" |
| `canWrite = false` | Valor exibido em `<span>` + badge "Somente leitura" + tooltip "Apenas ADMIN pode alterar" |
| Parâmetro invisível (sem READ) | Não aparece na lista |

### Filtro por grupo no frontend

- Sidebar com filtro por grupo (accordion/tabs)
- Badge de quantidade de parâmetros editáveis por grupo: `Comissões (2 editáveis)`
- Se nenhum parâmetro do grupo é editável pelo role, mostrar grupo como collapsed por padrão

---

## 6. Endpoint `listForAdmin` Ajustado

```typescript
async listForAdmin(now: Date, userRole: string): Promise<ParamAdminViewWithPermission[]> {
  const params = await this.listForAdmin(now);
  return params
    .filter((p) => hasConfigPermission(userRole, p.key, 'READ'))
    .map((p) => ({
      ...p,
      canWrite: hasConfigPermission(userRole, p.key, 'WRITE'),
    }));
}
```

---

## 7. Testes Esperados

| Teste | Descrição |
|-------|-----------|
| ADMIN pode WRITE em qualquer grupo | `expect(hasConfigPermission('ADMIN', 'fundraising.platformFee', 'WRITE')).toBe(true)` |
| FINANCEIRO pode WRITE em Comissões | `expect(hasConfigPermission('FINANCEIRO', 'fundraising.platformFee', 'WRITE')).toBe(true)` |
| FINANCEIRO NÃO pode WRITE em Tokens | `expect(hasConfigPermission('FINANCEIRO', 'fundraising.authFeePerToken', 'WRITE')).toBe(false)` |
| COMPLIANCE pode WRITE em Compliance | `expect(hasConfigPermission('COMPLIANCE', 'fundraising.complianceFee', 'WRITE')).toBe(true)` |
| COMPLIANCE NÃO pode WRITE em Planos | `expect(hasConfigPermission('COMPLIANCE', 'plan.plano-afiliado.preco', 'WRITE')).toBe(false)` |
| USER/FOUNDER/INVESTOR sem acesso | `expect(hasConfigPermission('USER', 'fundraising.platformFee', 'READ')).toBe(false)` |
| Guard retorna 403 se role sem permissão | Integration test no controller |

---

## 8. Resumo de Ações

| # | Ação | Estimativa |
|---|------|-----------|
| 1 | Criar `config-permissions.ts` com matriz | 30min |
| 2 | Criar `ConfigRbacGuard` | 30min |
| 3 | Ajustar `listForAdmin()` para filtrar por role + incluir `canWrite` | 30min |
| 4 | Aplicar guard nos endpoints do controller | 15min |
| 5 | Frontend: renderizar badge "Somente leitura" + desabilitar inputs | 1h |
| 6 | Testes (≥ 7) | 45min |
| **Total** | | **~3h30** |
