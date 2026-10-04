# PRD — Remoção do Limite de Requisições no Upload

**Data:** 14/08/2026
**Autor:** Agente IselfToken
**Status:** Draft — Aguardando aprovação
**Prioridade:** Média
**Sprint estimado:** 0.5 sprint (mudança cirúrgica)

---

## 1. Contexto e Motivação

### Estado Atual

O endpoint `POST /uploads` do backend (`backendnode/src/api/uploads/uploads.controller.ts:79`) está protegido por `@Throttle({ upload: { ttl: 3600000, limit: 50 } })` — ou seja, **50 uploads por hora por IP**.

```ts
// uploads.controller.ts (estado atual)
@UseGuards(ThrottlerGuard)
@Throttle({ upload: { ttl: 3600000, limit: 200 } }) // após ajuste emergencial
```

Esse limite foi recentemente ajustado de 50 → 200 para destravar desenvolvimento, mas a reclamação original do usuário continua válida: **o limite não é a proteção certa para esta rota**.

### Problema

1. **Throttler por IP não reflete o ator real** — em dev, todos os devs/testes compartilham `127.0.0.1`; em prod, vários usuários podem estar atrás de um mesmo proxy/CDN/load balancer e compartilhar IP. O limite "por IP" não protege contra abuso individual real, mas bloqueia usuários legítimos.

2. **A rota já tem proteções mais granulares implementadas, mas elas não estão integradas no fluxo principal:**
   - `QuotaService` (`services/quota.service.ts`) — limites por plano (FREE: 50MB/arquivo, 500MB storage, 50/h; PRO: 100MB/arquivo, 5GB storage, 200/h). **Não é chamado no controller.**
   - `MulterConfigService` (`multer-config.service.ts`) — limite global de 50MB por arquivo (retorna 413).
- `Pipeline de uploads` — validação de MIME, sanitização, geração de variantes e atualização de status.   - Validação de MIME type — bloqueia tipos não permitidos.
   - Dedup SHA-256 — evita persistir o mesmo arquivo 2x.

3. **O limite de 50/h colide com o limite de 50/h do FREE do `QuotaService`** — duas camadas medindo a mesma coisa de forma diferente e incompatível, o que torna debugging confuso.

### Caso Real

Durante desenvolvimento da sprint atual, o usuário recebeu `429 ThrottlerException: Too Many Requests` ao fazer upload — não porque abusou do sistema, mas porque estava iterando no wizard de criação de startup com várias rodadas de teste de upload de logo + pitch deck.

---

## 2. Decisão Proposta

**Remover o `@Throttle({ upload: ... })` da rota `POST /uploads`** e confiar nas camadas de proteção existentes + `QuotaService` como mecanismos de rate limiting/accountability.

A proteção contra abuso passa a ser responsabilidade de:

| Camada | Função | Onde |
|---|---|---|
| Limite de tamanho por arquivo | Bloqueia arquivos >50MB (413) | `MulterConfigService` |
| Quota por plano | Bloqueia quando storage/uploads/hora excedem plano (413) | `QuotaService` (FREE/PRO) |
| Segurança de upload | Valida MIME, sanitiza imagens, gera variantes e controla o status | `UploadsService (pipeline síncrono)` |
| MIME validation | Bloqueia tipos não permitidos (400) | `uploads.controller.ts:106` |
| Dedup SHA-256 | Evita persistir duplicatas | `uploads.service.ts` |
| Storage físico | Limite natural de disco | S3/LocalFs |

---

## 3. Objetivos e Não-objetivos

### Objetivos

| # | Objetivo | Critério de Aceite |
|---|----------|-------------------|
| O1 | Remover `@Throttle` da rota POST /uploads | Linha `@Throttle({ upload: ... })` deletada do `uploads.controller.ts`; typecheck passa |
| O2 | Garantir que `QuotaService.checkQuota()` é chamado antes de persistir o upload | Controller chama `quotaService.checkQuota(userId, startupId, file.size, plan)` antes de `uploadsService.create()` |
| O3 | Validar fluxo real com no mínimo 50 uploads seguidos pelo mesmo usuário | Suite E2E (`test/e2e/flows/uploads-flow.e2e-spec.ts`) ampliada: 1 user FREE faz 50 uploads seguidos → todos retornam 202; o 51º retorna 429 ou 413 (limite FREE) |
| O4 | Documentar a decisão no `CASE.md` | Bloco `[Uploads]` atualizado com a remoção do throttle e a política de quotas vigente |
| O5 | Manter ou melhorar a proteção contra abuso de IP único | Verificação: o IP ainda é throttled pelo throttler **global** default (100 req/min do `auth.module.ts`) — uploads de imagem continuam abaixo desse limite em uso normal |

### Não-objetivos

- ❌ Não substituir o throttler por outro mecanismo de rate limiting nesta sprint (avaliação em PRD futuro se necessário).
- ❌ Não mudar o limite de 50MB por arquivo (mantido por `MulterConfigService`).
- ❌ Não mexer nos limites FREE/PRO do `QuotaService` (são regras de produto já validadas).
- ❌ Não adicionar autenticação forte adicional ao endpoint (já exige cookie de sessão via `AuthGuard` se aplicável).

---

## 4. Trade-offs

### O que GANHAMOS com a remoção

- **Dev sem fricção:** Nenhum 429 ao iterar no wizard de upload durante desenvolvimento.
- **Sem contagem compartilhada por IP:** Usuários reais atrás de proxy corporativo não bloqueiam uns aos outros.
- **Camadas mais inteligentes:** Limite por plano (FREE/PRO) em vez de um número mágico igual para todos.
- **Observabilidade melhor:** `QuotaService` loga uso atual vs limite — facilita debug.

### O que PERDEMOS

- **Proteção "rápida" contra abuso:** Sem o ThrottlerGuard, um usuário autenticado FREE poderia disparar uploads em loop até bater no limite do `QuotaService` (50/h FREE). O custo disso é aceitável porque:
- Cada upload passa por validação MIME, sanitização e dedup.  - O `QuotaService` retorna 413 antes de persistir.
  - O storage é finito (500MB FREE).
- **Defense in depth em uma camada:** Removemos uma das camadas. Mas o throttler **global** default (100 req/min por IP do `auth.module.ts:25-30`) ainda existe e cobre o caso de "1 IP fazendo milhares de requests" (cobrindo o endpoint `/uploads` mesmo sem o `@Throttle` específico).

### Veredicto

**Aceitável** porque (a) o throttler global default continua ativo, (b) o `QuotaService` é mais apropriado como rate limit de negócio, (c) o cenário real de abuso é raro dado o modelo de uso (founders + investidores precisam estar autenticados e com KYC).

---

## 5. Arquitetura — Antes vs Depois

### Antes (atual)

```
Cliente → POST /uploads
   │
   ├─→ ThrottlerGuard (50/h por IP)         ← problema
   │     └─ 429 se exceder
   │
   ├─→ Multer fileSize check (50MB max)     ← OK
   │
   ├─→ MIME validation                       ← OK
   │
   ├─→ Processamento síncrono             ← OK
   │
   ├─→ Dedup SHA-256                        ← OK
   │
   ├─→ uploadsService.create()              ← persiste
   │
   └─→ (QuotaService.checkQuota() NÃO é chamado) ← GAP
```

### Depois (proposto)

```
Cliente → POST /uploads
   │
   ├─→ ThrottlerGuard GLOBAL (100 req/min por IP) ← herdado do auth.module.ts
   │     └─ 429 se exceder (proteção de força bruta / DoS)
   │
   ├─→ Multer fileSize check (50MB max)     ← OK
   │
   ├─→ MIME validation                       ← OK
   │
   ├─→ QuotaService.checkQuota(userId, plan) ← NOVO: bloqueia FREE/PRO excessivo
   │     └─ 413 se storage/uploads/hora exceder plano
   │
   ├─→ Processamento síncrono             ← OK
   │
   ├─→ Dedup SHA-256                        ← OK
   │
   └─→ uploadsService.create()              ← persiste
```

**Observação:** O ThrottlerGuard GLOBAL (do `auth.module.ts`) já cobre o endpoint porque está registrado no módulo raiz. A remoção do `@Throttle({ upload: ... })` específico **não desabilita** o guard global — apenas remove o override de 50/h.

---

## 6. Plano de Execução

### Fase 1 — Integração do QuotaService (Sprint atual)

| # | Tarefa | Arquivo | Esforço |
|---|--------|---------|---------|
| T1 | Remover `@Throttle({ upload: { ... } })` da rota POST /uploads | `uploads.controller.ts:79` | XS |
| T2 | Remover import `Throttle` (manter `ThrottlerGuard` se usado em outra rota do mesmo controller) | `uploads.controller.ts:26` | XS |
| T3 | Adicionar chamada `quotaService.checkQuota()` antes de `uploadsService.create()` no controller | `uploads.controller.ts` + `uploads.module.ts` | S |
| T4 | Resolver `userId` no controller: priorizar `(req as any).user.id` da sessão, fallback para `query.userId` apenas se não houver auth | `uploads.controller.ts` | S |
| T5 | Mapear plano do usuário (`UserPlan.FREE` / `UserPlan.PRO`) a partir de `req.user.plan` ou `Subscription.activePlan` | `uploads.controller.ts` + helper | M |
| T6 | Atualizar Swagger description: substituir "Rate limit: 200 uploads por hora por IP" por texto explicando as quotas por plano | `uploads.controller.ts` | XS |

### Fase 2 — Cobertura de Testes (mesmo sprint)

| # | Tarefa | Arquivo | Esforço |
|---|--------|---------|---------|
| T7 | Atualizar teste de integração que mocka o `Throttle` (remover referência se aplicável) | `uploads.controller.integration.spec.ts` | S |
| T8 | Adicionar teste: 1 user FREE faz 50 uploads válidos (202), o 51º retorna 413 (quota excedida) | `test/e2e/flows/uploads-flow.e2e-spec.ts` | M |
| T9 | Adicionar teste: 1 user FREE faz 1 upload >50MB → retorna 413 (multer limit) | mesmo | S |
| T10 | Adicionar teste: 1 user FREE faz 50 uploads OK + 1ª tentativa de 51ª retorna 413 com mensagem em PT-BR | mesmo | S |
| T11 | Smoke test: sem nenhum `@Throttle` específico, mas com guard global, validar que IP flood (1000 req) ainda retorna 429 no nível global | manual + script | S |

### Fase 3 — Documentação (mesmo sprint)

| # | Tarefa | Arquivo | Esforço |
|---|--------|---------|---------|
| T12 | Atualizar bloco `[Uploads]` do `CASE.md` — remover menção a "throttle" e adicionar "quota por plano (FREE/PRO) via QuotaService" | `CASE.md` (raiz) | XS |
| T13 | Atualizar `AGENTS.md` do módulo de uploads | `backendnode/src/api/uploads/AGENTS.md` | XS |
| T14 | Atualizar `AGENTS.md` raiz do backend se mencionar o limite específico | `backendnode/AGENTS.md` | XS |

---

## 7. Detalhamento Técnico

### 7.1 Mudança no Controller (T1 + T2 + T3)

**Arquivo:** `backendnode/src/api/uploads/uploads.controller.ts`

```diff
 @Post()
 @HttpCode(HttpStatus.ACCEPTED)
-@UseGuards(ThrottlerGuard)
-@Throttle({ upload: { ttl: 3600000, limit: 200 } })
+// Throttle especifico removido — ver PRD scripts/PRD_UPLOAD_DE_ARQUIVOS.md
+// Protecao: ThrottlerGuard global (auth.module.ts) + QuotaService.checkQuota()
 @ApiOperation({
   summary: 'Upload de arquivo (multipart)',
   description:
-    'Recebe arquivo via multipart/form-data. Persiste original, calcula SHA-256, ' +
-    'processa o arquivo e retorna 202 Accepted com status PENDING. ' +
-    'Rate limit: 200 uploads por hora por IP.',
+    'Recebe arquivo via multipart/form-data. Persiste original, calcula SHA-256, ' +
+    'processa o arquivo e retorna 202 Accepted com status PENDING. ' +
+    'Limitado por QuotaService (FREE: 50/h, 500MB storage; PRO: 200/h, 5GB storage).',
 })
 @ApiConsumes('multipart/form-data')
 @ApiResponse({
   status: 202,
   description: 'Upload aceito e processamento concluído.',
   type: CreateUploadResponseDto,
 })
 @ApiResponse({ status: 400, description: 'Arquivo invalido ou MIME nao permitido.' })
 @ApiResponse({ status: 413, description: 'Arquivo excede limite de tamanho ou quota do plano.' })
 @ApiResponse({ status: 429, description: 'Rate limit global excedido (100 req/min por IP).' })
 @UseInterceptors(FileInterceptor('file'))
 async uploadFile(
   @Req() req: Request,
   @UploadedFile() file: Express.Multer.File,
   @Query('userId') userIdQuery?: string,
 ): Promise<{ success: boolean; data: CreateUploadResponseDto }> {
   if (!file) {
     throw new BadRequestException('Arquivo obrigatorio');
   }

   if (!isAllowedMime(file.mimetype)) {
     throw new BadRequestException(
       `Tipo de arquivo nao permitido: ${file.mimetype}. ` +
         `Tipos aceitos: ${ALLOWED_MIMES.join(', ')}`,
     );
   }

   const userId = userIdQuery
     ? parseInt(userIdQuery, 10)
     : ((req as any).user?.id as number | undefined);

-  const result = await this.uploadsService.create(file, userId);
+  if (userId) {
+    const plan = await this.getUserPlan(userId);
+    await this.quotaService.checkQuota(userId, undefined, file.size, plan);
+  }
+
+  const result = await this.uploadsService.create(file, userId);

   return {
     success: true,
     data: {
       id: result.id,
       publicId: result.publicId,
       status: result.status,
     },
   };
 }
```

### 7.2 Integração do QuotaService (T3)

**Arquivo:** `backendnode/src/api/uploads/uploads.module.ts`

```diff
 @Module({
   imports: [
     PrismaModule,
     ScheduleModule.forRoot(),
     MulterModule.register({
       limits: {
         fileSize: 50 * 1024 * 1024,
       },
     }),
     forwardRef(() => StorageProviderModule),
     `UploadsService (pipeline síncrono)` (validação, sanitização e variantes)
+    SubscriptionsModule, // necessário para resolver plano do usuário
   ],
   controllers: [UploadsController],
   providers: [
     UploadsService,
     MulterConfigService,
     CleanupJob,
+    QuotaService, // novo
   ],
   exports: [UploadsService, UploadsGateway, QuotaService],
 })
 export class UploadsModule {}
```

### 7.3 Mapeamento Plano do Usuário (T5)

Helper a ser criado em `backendnode/src/api/uploads/helpers/user-plan.helper.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserPlan } from '../services/quota.service';

@Injectable()
export class UserPlanHelper {
  constructor(private readonly prisma: PrismaService) {}

  async getPlan(userId: number): Promise<UserPlan> {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { plan: true },
    });
    if (!sub) return UserPlan.FREE;
    return sub.plan.tier === 'PRO' ? UserPlan.PRO : UserPlan.FREE;
  }
}
```

### 7.4 Variáveis de Ambiente

**Nenhuma mudança** nas envs. Os limites do `QuotaService` são hard-coded em `services/quota.service.ts:55-70` (FREE/PRO). Migração futura para `SystemConfig` é uma dívida separada.

---

## 8. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| User FREE dispara 50 uploads em loop e satura storage | Média | Baixo | `QuotaService` retorna 413 após 50/h; storage é finito (500MB) |
| User autenticado abusar via script (1000 uploads) | Baixa | Médio | ThrottlerGuard global (100 req/min por IP) do `auth.module.ts` ainda cobre esse cenário |
| Remoção do `@Throttle` quebrar outros consumers (frontend) | Muito baixa | Baixo | Nenhum cliente lê o header `X-RateLimit-*`; testes E2E cobrem fluxo |
| `QuotaService.checkQuota()` falhar silenciosamente se Redis/DB cair | Baixa | Médio | PrismaService já tem retry implícito; checkQuota falha rápido via `PayloadTooLargeException` se DB inacessível |
| `UserPlan` mal mapeado (todos virarem FREE ou PRO) | Baixa | Médio | Helper consulta `Subscription.status === 'ACTIVE'` + `plan.tier`; testes unitários do helper |
| Aumento de carga no banco pelo `getPlan()` a cada upload | Média | Baixo | Cache em memória por userId (TTL 5min) é evolução natural; fora do escopo desta sprint |

---

## 9. Critérios de Aceitação (Gherkin)

```gherkin
Funcionalidade: Upload sem throttle específico por IP

Cenário: User FREE faz upload válido
  Dado um user autenticado com plano FREE
  Quando faz POST /uploads com 1 imagem <50MB
  Então recebe 202 com {id, publicId, status: PENDING}

Cenário: User FREE atinge limite de 50 uploads/hora
  Dado um user autenticado com plano FREE que já fez 50 uploads na última hora
  Quando faz POST /uploads com 1 imagem <50MB
  Então recebe 413 com mensagem "Limite de uploads atingido"

Cenário: User FREE atinge limite de storage
  Dado um user autenticado com plano FREE cujo storage total está em 499MB
  Quando faz POST /uploads com 1 imagem de 2MB
  Então recebe 413 com mensagem "Limite de storage excedido"

Cenário: User FREE tenta arquivo >50MB
  Dado um user autenticado com plano FREE
  Quando faz POST /uploads com arquivo de 60MB
  Então recebe 413 (Multer limit)

Cenário: IP flood (1000 req em 1 min)
  Dado um IP fazendo 1000 req em 60 segundos para /uploads
  Quando excede 100 req/min
  Então recebe 429 do ThrottlerGuard global

Cenário: User não autenticado tenta upload
  Dado uma request sem cookie de sessão
  Quando faz POST /uploads
  Então recebe 401 (AuthGuard)

Cenário: User FREE envia arquivo com MIME não permitido
  Dado um user FREE
  Quando faz POST /uploads com arquivo .exe
  Então recebe 400 "Tipo de arquivo nao permitido"
```

---

## 10. Definição de Done

- [ ] `@Throttle({ upload: ... })` removido de `uploads.controller.ts`
- [ ] `QuotaService.checkQuota()` chamado antes de `uploadsService.create()`
- [ ] `UserPlanHelper.getPlan()` implementado e coberto por teste unitário
- [ ] Swagger description atualizada (sem "Rate limit: 200/h")
- [ ] Testes E2E: 50 uploads OK + 51º retorna 413
- [ ] Teste: 1 upload >50MB retorna 413
- [ ] Typecheck passa (`pnpm typecheck` no backend)
- [ ] Coverage do `uploads.controller` >= 80%
- [ ] `CASE.md` atualizado (bloco `[Uploads]`)
- [ ] `AGENTS.md` do módulo atualizado
- [ ] Manual: 1000 req em 1 min ainda retorna 429 no nível global
- [ ] Diff revisado por `code-reviewer` (score >= 70)

---

## 11. Timeline Estimada

| Dia | Atividade |
|-----|-----------|
| D1 | T1, T2, T3, T4 (mudanças no controller + integração QuotaService) |
| D2 | T5 (UserPlanHelper), T6 (Swagger) |
| D3 | T7, T8, T9, T10 (testes) |
| D4 | T11 (smoke test global), T12-T14 (docs) |
| D5 | Code review + ajustes + deploy em dev |

Total: **~5 dias úteis (1 sprint)**

---

## 12. Checklist de Aprovação

Antes de iniciar a implementação:

- [ ] Confirmar que o throttler global default (100 req/min) do `auth.module.ts` é suficiente como fallback de segurança
- [ ] Confirmar que os limites FREE/PRO do `QuotaService` estão alinhados com a estratégia de produto
- [ ] Validar com o time de segurança que a remoção do `@Throttle` específico não viola nenhuma política interna
- [ ] Confirmar que o frontend (BFF `routes/api/uploads.ts` + hook `useUploadMutation`) não depende do header `X-RateLimit-*` retornado pelo throttler específico
- [ ] Aprovar o helper `UserPlanHelper` como localização canônica para resolver plano (evitar duplicação)

---

## Anexo A — Camadas de Proteção Vigentes Pós-mudança

```
┌─────────────────────────────────────────────────────────────────────┐
│ Camada                       │ Limite              │ Onde             │
├─────────────────────────────────────────────────────────────────────┤
│ ThrottlerGuard global        │ 100 req/min por IP  │ auth.module.ts   │
│ Multer fileSize              │ 50MB por arquivo    │ multer-config    │
│ MIME validation              │ 8 tipos permitidos  │ controller:106   │
│ QuotaService (FREE)          │ 50/h, 500MB total   │ quota.service    │
│ QuotaService (PRO)           │ 200/h, 5GB total    │ quota.service    │
│ Segurança de upload        │ MIME, sanitização e status │ UploadsService (pipeline síncrono) │
│ Dedup SHA-256                │ mesmo arquivo = 1x  │ uploads.service  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Anexo B — Histórico de Mudanças do Limite

| Data       | Limite  | Motivo                                          |
|------------|---------|--------------------------------------------------|
| 2026-08-14 | 200/h   | Ajuste emergencial após 429 durante dev manual |
| Anterior   | 50/h    | Valor original conservador                       |
| Pós-PRD    | removido| Esta proposta                                     |

---

## Anexo C — Descoberta Durante Implementação (S26.5+)

### Bug encontrado: throttler `email` bloqueando `/uploads`

**Problema:** Ao validar com curl após implementar a Fase 1 do PRD, uploads válidos continuavam retornando 429. Investigação revelou:

1. `auth.module.ts:25-36` configura 2 throttlers no `forRoot([...])`:
   ```ts
   ThrottlerModule.forRoot([
     { name: 'default', ttl: 60000, limit: 100 },
     { name: 'email', ttl: 3600000, limit: 5 },
   ])
   ```

2. O `@nestjs/throttler` v5 trata **TODOS os throttlers do array como globais** (aplicados pelo `ThrottlerGuard` em todas as rotas), não apenas os seletivos via `@Throttle({ email })`.

3. Resultado: o throttler `email: 5/h` estava bloqueando `/uploads` (e provavelmente outras rotas não-auth) após 5 reqs por hora por IP.

**Evidência:** Response 429 vinha com `Retry-After-email: 2387` (TTL do throttler `email`) + `X-RateLimit-Limit: 100` (do `default`).

**Fix aplicado (commit `3504b792`):**
```ts
@Controller('uploads')
@SkipThrottle({ email: true })  // ← novo
export class UploadsController { ... }
```

**Validação pós-fix:**
- 10 uploads seguidos: 10/10 retornam 202 ✓
- 112/112 testes Jest passam ✓
- Response mostra apenas headers `X-RateLimit-*` do `default` (sem `Retry-After-email`)

### Recomendação arquitetural (follow-up, fora do escopo deste PRD)

A configuração atual do `ThrottlerModule.forRoot([...])` no `AuthModule` é **frágil**:
- Qualquer rota nova no sistema herda o throttler `email: 5/h`
- Apenas rotas com `@SkipThrottle({ email: true })` ficam imunes
- Isso é propenso a bugs sutis (rotas esquecendo o skip)

**Sugestão para refatoração futura:**
1. Mover o `ThrottlerModule` para um módulo dedicado (`ThrottlerCoreModule`) que exporta apenas o `default`
2. Criar `AuthThrottlerModule` separado (não-global) com `email: 5/h`, importado só pelo `AuthModule`
3. `AuthController` usa `@UseGuards(ThrottlerGuard)` explicitamente para ativar o throttler de email

Até essa refatoração, **toda rota nova do projeto precisa considerar se precisa de `@SkipThrottle({ email: true })`**.
