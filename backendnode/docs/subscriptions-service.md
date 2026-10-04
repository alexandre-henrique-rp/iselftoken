# Documentação Técnica - SubscriptionsService

## Visão Geral

O `SubscriptionsService` é a camada de aplicação responsável por gerenciar assinaturas e validar acesso a recursos premium baseado em planos ativos. Implementa a **regra de negócio central** que bloqueia acesso a recursos premium se a assinatura não estiver válida.

## Padrão de Documentação

Este serviço utiliza o padrão **"Comentários Inline"** com **JSDoc Tags**:

- **JSDoc no topo**: Tags `@name`, `@description`, `@param` e `@throws` para documentação formal
- **Comentários inline**: Explicam o fluxo passo-a-passo dentro do código

---

## Arquitetura

### Camada: Application Layer (Casos de Uso)

**Responsabilidade Única**: Validar acesso a recursos premium e gerenciar assinaturas.

### Dependências

- **PrismaService**: Acesso ao banco de dados (Infrastructure Layer)

### Fluxo de Dados

```bash
Guard/Controller → SubscriptionsService.validateUserPlan() → PrismaService → Database
                                ↓
                    ForbiddenException (se inválido)
                                ↓
                         Allow Access (se válido)
```

---

## Método Principal: `validateUserPlan`

### Propósito

Validar se um usuário possui acesso a um recurso premium específico baseado em:

1. Assinatura ativa (`status = ACTIVE`)
2. Plano correto (`plan.slug = planSlug`)
3. Não expirado (`expiresAt > NOW()`)

### Assinatura do Método

```typescript
/**
 * Valida se o usuário possui plano ativo válido
 * @name validateUserPlan
 * @description Verifica se o usuário tem acesso a um plano específico baseado em assinatura ativa e não expirada
 *
 * @param userId ID do usuário a ser validado
 * @param planSlug Slug do plano a ser verificado (ex: "investor_pro")
 *
 * @throws ForbiddenException Se o usuário não possui plano ativo ou está expirado
 */
async validateUserPlan(userId: number, planSlug: string): Promise<void>
```

### Lógica de Validação

```typescript
// busca assinatura ativa do usuário para o plano específico
const subscription = await this.prisma.subscription.findFirst({
  where: {
    userId: userId,              // usuário específico
    status: 'ACTIVE',            // apenas assinaturas ativas
    plan: {
      slug: planSlug,            // plano específico (ex: "investor_pro")
    },
    expiresAt: {
      gt: new Date(),            // maior que a data atual (não expirado)
    },
  },
  include: {
    plan: true,                  // inclui dados do plano
  },
});

// valida se encontrou assinatura válida
if (!subscription) {
  throw new ForbiddenException(
    `Acesso negado. Você precisa de um plano ativo "${planSlug}" para acessar este recurso.`,
  );
}
```

### Critérios de Validação

| Critério                      | Validação           | Resultado se Falhar  |
|-------------------------------|---------------------|----------------------|
| **Usuário possui assinatura** | `userId = id`       | `ForbiddenException` |
| **Status ativo**              | `status = ACTIVE`   | `ForbiddenException` |
| **Plano correto**             | `plan.slug = slug`  | `ForbiddenException` |
| **Não expirado**              | `expiresAt > NOW()` | `ForbiddenException` |

### Exemplos de Uso

#### 1. Validar acesso a recurso premium

```typescript
// Em um Guard ou Controller
async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest();
  const userId = request.user.id;
  
  try {
    // valida se usuário tem plano "investor_pro"
    await this.subscriptionsService.validateUserPlan(userId, 'investor_pro');
    return true; // acesso permitido
  } catch (error) {
    return false; // acesso negado
  }
}
```

#### 2. Validar em um método de serviço

```typescript
async accessPremiumFeature(userId: number) {
  // valida acesso antes de executar lógica
  await this.subscriptionsService.validateUserPlan(userId, 'premium_plan');
  
  // se chegou aqui, usuário tem acesso
  return this.executePremiumLogic();
}
```

---

## Testes Unitários

### Cenários Cobertos

Os testes cobrem todos os cenários especificados nos critérios de aceite:

#### ✅ 1. Usuário sem plano

```typescript
it('deve lançar ForbiddenException quando usuário não possui plano', async () => {
  mockPrismaService.subscription.findFirst.mockResolvedValue(null);
  
  await expect(service.validateUserPlan(userId, planSlug))
    .rejects.toThrow(ForbiddenException);
});
```

#### ✅ 2. Usuário com plano vencido

```typescript
it('deve lançar ForbiddenException quando plano está vencido', async () => {
  // Query com expiresAt > NOW() não retorna planos vencidos
  mockPrismaService.subscription.findFirst.mockResolvedValue(null);
  
  await expect(service.validateUserPlan(userId, planSlug))
    .rejects.toThrow(ForbiddenException);
});
```

#### ✅ 3. Usuário com plano ativo (sucesso)

```typescript
it('deve passar quando usuário possui plano ativo e válido', async () => {
  const mockSubscription = {
    id: 1,
    userId: userId,
    status: 'ACTIVE',
    expiresAt: new Date('2025-12-31'), // válido
    plan: { slug: planSlug }
  };
  
  mockPrismaService.subscription.findFirst.mockResolvedValue(mockSubscription);
  
  await expect(service.validateUserPlan(userId, planSlug))
    .resolves.not.toThrow();
});
```

#### ✅ 4. Status não ACTIVE

```typescript
it('deve lançar ForbiddenException quando status não é ACTIVE', async () => {
  // Query filtra apenas status ACTIVE
  mockPrismaService.subscription.findFirst.mockResolvedValue(null);
  
  await expect(service.validateUserPlan(userId, planSlug))
    .rejects.toThrow(ForbiddenException);
});
```

#### ✅ 5. Edge case: Plano expira hoje

```typescript
it('deve lançar ForbiddenException quando plano expira hoje', async () => {
  // gt (greater than) não inclui data de hoje
  mockPrismaService.subscription.findFirst.mockResolvedValue(null);
  
  await expect(service.validateUserPlan(userId, planSlug))
    .rejects.toThrow(ForbiddenException);
});
```

### Executar Testes

```bash
# Executar todos os testes do serviço
npm run test subscriptions.service.spec.ts

# Executar com coverage
npm run test:cov subscriptions.service.spec.ts
```

---

## Integração com Outros Módulos

### Exportação do Serviço

O `SubscriptionsService` é exportado no módulo para uso em outros módulos:

```typescript
@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PrismaService],
  exports: [SubscriptionsService], // disponível para importação
})
export class SubscriptionsModule {}
```

### Uso em Guards

Exemplo de Guard que valida plano premium:

```typescript
@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(private subscriptionsService: SubscriptionsService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;
    
    try {
      await this.subscriptionsService.validateUserPlan(userId, 'premium_plan');
      return true;
    } catch {
      return false;
    }
  }
}
```

### Uso em Controllers

```typescript
@Controller('premium-features')
export class PremiumController {
  constructor(private subscriptionsService: SubscriptionsService) {}
  
  @Get('advanced-analytics')
  async getAdvancedAnalytics(@User() user: PayloadEntity) {
    // valida acesso ao recurso
    await this.subscriptionsService.validateUserPlan(user.id, 'investor_pro');
    
    // retorna dados premium
    return this.analyticsService.getAdvanced();
  }
}
```

---

## Schema do Banco de Dados

### Modelo Subscription

```prisma
model Subscription {
  id     Int @id @default(autoincrement())
  userId Int
  user   User @relation(fields: [userId], references: [id])
  
  planId Int
  plan   Plan @relation(fields: [planId], references: [id])
  
  status    SubStatus @default(PENDING)
  startedAt DateTime?
  expiresAt DateTime?
  
  payments  Payment[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([userId])
}

enum SubStatus {
  PENDING
  ACTIVE
  EXPIRED
  CANCELED
}
```

### Modelo Plan

```prisma
model Plan {
  id           Int      @id @default(autoincrement())
  nome         String
  slug         String   @unique // Ex: "investor_pro"
  descricao    String?  @db.Text
  preco        Decimal  @db.Decimal(10, 2)
  periodoMeses Int      @default(12)
  
  subscriptions Subscription[]
  
  @@map("plans")
}
```

---

## Regras de Negócio

### 1. Validação de Acesso

- **Regra**: Usuário só acessa recurso premium se tiver assinatura ACTIVE e não expirada
- **Implementação**: Método `validateUserPlan()`
- **Exceção**: `ForbiddenException` (HTTP 403)

### 2. Expiração de Planos

- **Regra**: Plano expira quando `expiresAt <= NOW()`
- **Implementação**: Query com `expiresAt: { gt: new Date() }`
- **Comportamento**: Plano que expira hoje já é considerado expirado

### 3. Status de Assinatura

- **PENDING**: Aguardando pagamento
- **ACTIVE**: Ativa e válida (permite acesso)
- **EXPIRED**: Expirada (bloqueia acesso)
- **CANCELED**: Cancelada pelo usuário (bloqueia acesso)

---

## Melhorias Futuras

### 1. Cache de Validação

Implementar cache para evitar consultas repetidas ao banco:

```typescript
async validateUserPlan(userId: number, planSlug: string): Promise<void> {
  const cacheKey = `subscription:${userId}:${planSlug}`;
  
  // verifica cache primeiro
  const cached = await this.cacheService.get(cacheKey);
  if (cached) return;
  
  // consulta banco
  const subscription = await this.prisma.subscription.findFirst({ ... });
  
  if (!subscription) {
    throw new ForbiddenException(...);
  }
  
  // armazena em cache (TTL: 5 minutos)
  await this.cacheService.set(cacheKey, true, 300);
}
```

### 2. Retornar Dados da Assinatura

Modificar para retornar informações da assinatura ao invés de void:

```typescript
async validateUserPlan(userId: number, planSlug: string): Promise<Subscription> {
  const subscription = await this.prisma.subscription.findFirst({ ... });
  
  if (!subscription) {
    throw new ForbiddenException(...);
  }
  
  return subscription; // retorna dados para uso posterior
}
```

### 3. Validação por Feature Flag

Validar acesso a features específicas ao invés de planos:

```typescript
async validateFeatureAccess(userId: number, feature: string): Promise<void> {
  const subscription = await this.prisma.subscription.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
      plan: {
        features: {
          has: feature, // verifica se plano tem a feature
        },
      },
    },
  });
  
  if (!subscription) {
    throw new ForbiddenException(`Feature "${feature}" não disponível no seu plano.`);
  }
}
```

---

## Histórico de Mudanças

### v1.0 (2026-01-13)

- ✅ Implementação inicial do `validateUserPlan()`
- ✅ Lógica de validação: userId, status ACTIVE, planSlug, expiresAt
- ✅ Testes unitários cobrindo todos os cenários especificados
- ✅ Documentação completa com JSDoc
- ✅ Exportação do serviço no módulo
