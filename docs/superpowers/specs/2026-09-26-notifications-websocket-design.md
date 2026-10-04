# Notificações Real-Time via WebSocket — Design

**Status:** Aprovado (sessão de planning 2026-09-26)
**Owner:** backend (gateway) + frontend (hook)
**Sprint:** WS-01

---

## Contexto

Hoje o badge de notificações não-lidas no `TopNavbar` é atualizado exclusivamente por **polling HTTP** (`refetchInterval: 30_000` em `notificationsUnreadCountQueryOptions`). Isso causa:

- Latência p95 de até 30 s entre o evento de domínio e a UI.
- Custo: 1 request/usuário-conectado/30 s mesmo quando não há novidades.
- Cold start de até 30 s para o badge aparecer em páginas que não fazem hidratação SSR de unread-count.

Não existe infraestrutura de real-time no projeto (zero WebSocket, EventSource ou socket.io-client).

---

## Decisões

| Decisão | Escolha | Trade-off |
|---------|---------|-----------|
| Transporte | **socket.io + Redis adapter** | Rooms built-in (essencial para 1 user = sala privada), reconexão automática, fallback polling. Redis adapter habilita multi-instância futura sem reescrita. |
| Auth WS | **Cookie HTTP-only via `withCredentials: true`** | Reaproveita `SessionService.getSession()` (`auth/session/session.service.ts:94`) já existente. CORS já está com `credentials: true` no backend. |
| Fallback | **Manter polling HTTP** | Aumenta `refetchInterval` de 30 s para **60 s**. Garante entrega em ambientes sem WS, durante cold start do socket, ou em scripts/curl. |
| Schema Prisma | **Sem migration nesta sprint** | Escopo focado em transporte. `link` (deep-link), `expiresAt` (TTL), `NotificationPreference` ficam no backlog. |

---

## Arquitetura

```
Domain event  ──►  NotificationsService.create()
                         │
                         ├─► prisma.notification.create()  (persistência)
                         │
                         └─► gateway.server.to(`user:${userId}`).emit('notification', payload)
                                   │
                                   ▼
                          socket.io (namespace /notifications)
                          + Redis adapter (multi-instância)
                                   │
                                   ▼
                     Frontend hook (use-notifications-socket.ts)
                         │
                         ├─► queryClient.invalidateQueries(['notifications-unread-count'])
                         └─► queryClient.setQueryData(['notifications', filter, 1], prepend payload)

[Polling fallback: 60 s, independente do WS]
```

### Salas (rooms)

- Toda conexão entra em **exatamente uma sala**: `user:{userId}`.
- `userId` vem de `SessionService.getSession(cookie.sessionId)` no `handleConnection`.
- Não há sala compartilhada, broadcast cego ou sala por role — garante que **apenas o destinatário correto** recebe o push.

### Payload

Mesmo formato que `NotificationRaw` no frontend (`app/lib/queries.ts:382`):

```ts
{
  id: number;
  title: string;
  description: string;
  type: string;       // kyc_approved | investment_confirmed | ...
  isRead: boolean;
  createdAt: string;  // ISO
}
```

---

## Auth no `handleConnection`

Reaproveita o pipeline existente:

1. `socket.handshake.headers.cookie` → parse com `cookie-parser` (já registrado em `main.ts:90`).
2. Extrai `session_id`.
3. `SessionService.getSession(sessionId)` → snapshot do user.
4. Validações (espelho de `auth.guard.ts:72-179`):
   - `user.isActive` ✓
   - `revokedAt === null` ✓
   - `af2Verified === true` ✓ (se 2FA obrigatório para o role)
5. Em caso de falha → `socket.disconnect(true)` + log estruturado (sem session_id em plain text).
6. Sucesso → `socket.data.user = { id, role }` + `socket.join(\`user:${userId}\`)`.

---

## Stack adicionada

| Pacote | Onde | Por quê |
|--------|------|---------|
| `@nestjs/platform-socket.io@^10` | backend | Adapter NestJS para socket.io |
| `@nestjs/websockets@^10` | backend | Decorators `@WebSocketGateway`, `@SubscribeMessage` |
| `@socket.io/redis-adapter@^8` | backend | Rooms distribuídas via Redis (já temos `@nestjs-modules/ioredis`) |
| `socket.io-client@^4` | frontend | Cliente com reconexão, rooms, fallback polling |

> Conforme AGENTS.md §3, **adição de deps requer aprovação humana**. Esta spec registra a aprovação obtida na sessão de planning 2026-09-26.

---

## Critérios de aceite

- [ ] `pnpm typecheck` + `pnpm test` passando em backend e frontend.
- [ ] E2E: user A recebe push em < 2 s após evento; user B não recebe.
- [ ] Multi-tab: evento dispara atualização em todas as abas do mesmo user.
- [ ] Reconexão: socket derruba → reconecta sozinho → próxima notificação chega + unread-count reconcilia.
- [ ] Fallback: WS bloqueado → polling de 60 s continua funcionando.
- [ ] Logout: socket desconecta em < 5 s.
- [ ] LGPD: zero PII em logs (apenas `userId` opaco).
- [ ] `backendnode/src/api/notifications/AGENTS.md` e `frontend/AGENTS.md` atualizados.

---

## Fases

| Fase | Descrição | Estimativa |
|------|-----------|------------|
| 0 | Spec (este doc) | ✅ |
| 1 | Backend foundation: deps + adapter + gateway + auth | 4-6 h |
| 2 | Backend integration: emit no service + specs | 3-4 h |
| 3 | Frontend hook: `use-notifications-socket` + sync | 3-4 h |
| 4 | Frontend integration: TopNavbar + polling 60 s + mutations migradas | 3-4 h |
| 5 | E2E Playwright: isolamento, multi-tab, reconexão, fallback | 4-5 h |
| 6 | Hardening: rate limit, WSS, monitoring, docs | 2-3 h |

**Total:** 20-28 h (~ 1 sprint S).

---

## Riscos & mitigações

| Risco | Mitigação |
|-------|-----------|
| Cookie HTTP-only não atravessa CORS | CORS já com `credentials: true`; `withCredentials: true` no cliente socket.io |
| StrictMode cria 2 sockets em dev | Singleton por `userId` com ref-count em `Map<userId, Socket>` |
| Backend multi-instância perde rooms | Redis adapter (já temos Redis 7.4) |
| Usuário com 100 abas abertas | Limite 5 conexões/userId via `@nestjs/throttler` (já no stack) |
| LGPD em logs de erro | Reaproveitar padrão de `startup-notification.service.ts:23` — apenas IDs opacos |

---

## Backlog explícito (fora desta sprint)

1. Migration Prisma: `link`, `expiresAt`, `payload` JSON.
2. Model `NotificationPreference` (opt-in/opt-out por categoria).
3. Ativar `INVESTMENT_CONFIRMED` órfão (notificar investidor).
4. Push notification browser (service worker).
5. Cron de cleanup > 90 dias.
6. Audit log de criação/leitura (model já existe).

---

## Addendum — Realtime Multi-Conector (2026-10-02)

**Status:** Implementado
**Motivação:** O WebSocket de notificações demorava a atualizar e exigia reload da página. Diagnóstico identificou (a) DUAS conexões socket.io desalinhadas no frontend, (b) ausência de reconciliação ao voltar o foco da aba, (c) ordem de transports divergente cliente↔servidor, e (d) falta de evento de domínio para KYC/perfil. Escopo expandido para cobrir **notificações, pagamento, KYC, transações e perfil** em dev e produção.

### Mudanças

#### Backend

- **Novo evento de domínio** `kyc.user.decided` (`src/api/admin/events/kyc-events.ts`): emitido por `AdminService.decideKycUser` para cada dono do `KYCProfile`, logo após `refreshKycOwnersSessions` sincronizar a sessão Redis. Payload LGPD-safe: `{ userId, decision, kycStatus }`. Dedup por `Set`; fallback via `cleanupOwnerId` para os casos REJECTED/NEEDS_RESUBMISSION onde o `KYCProfile` é deletado (as FKs do user são zeradas e o `findMany` não encontraria o dono).
- **Relay no gateway** (`NotificationsGateway.onKycDecided`): `@OnEvent('kyc.user.decided')` → `emitToUser(userId, 'kyc.decided', { decision, kycStatus })`, best-effort. O gateway agora relaya **quatro** eventos: `notification`, `payment.confirmed`, `payment.cancelled`, `kyc.decided` — todos pela mesma sala `user:{userId}`.

#### Frontend

- **Conexão única consolidada** (`app/hooks/use-realtime-connection.ts`): substitui os dois singletons antigos (`socketRefs` em `use-notifications-socket` + `paymentListenerRefs` em `use-payment-confirmed`) por **UM** `Map<userId, RealtimeManager>` global com ref-count. Expõe `subscribe(event, handler)` com fan-out (um listener real por evento no socket, N handlers de aplicação). Estado `connected`.
- **Transports alinhados**: `['polling', 'websocket']` no cliente, igual ao `socket-io.adapter.ts`. Long-poll primeiro garante conexão atrás de proxy/CDN que bloqueie o header `Upgrade`; o upgrade para `ws` ocorre em seguida.
- **URL atrás de proxy**: `VITE_WS_URL` (produção) com fallback para `BACKEND_URL` (dev). Backend: `SOCKET_IO_CORS_ORIGINS` (CSV) com fallback para `FRONTEND_URL`.
- **Reconciliação robusta**: o manager revalida as `REALTIME_RECONCILE_KEYS` (`notifications-unread-count`, `notifications`, `me`, `wallet`, `transactions`, `admin-financeiro-transactions`) em três gatilhos — `connect`/reconnect, `window.focus` e `document.visibilitychange`→visible — com debounce de 150 ms para coalescer focus+visibility. Isso elimina a necessidade de reload quando a aba volta do background.
- **Conectores de domínio** (todos consumindo o socket único via `subscribe`):
  - `use-notifications-socket.ts` → `notification`: incremento OTIMISTA do unread-count (sem round-trip) + invalida lista + prepend na página 1.
  - `use-payment-confirmed.ts` → `payment.confirmed`: refetch+invalidate `[me]` + invalida `wallet`/`transactions`/`admin-financeiro-transactions`; `payment.cancelled`: invalida `[me]`.
  - `use-kyc-realtime.ts` → `kyc.decided`: refetch+invalidate `[me]` + invalida `kyc`/`admin-kyc`.
  - Perfil (`[me]`) é coberto por `payment.confirmed` e `kyc.decided` — sem hook dedicado.
- Montados os três conectores no app shell (`components/layout/top-navbar.tsx`).

### Resultado

Uma única conexão WebSocket por usuário cobre todos os domínios. Notificações, pagamento, KYC, transações e perfil atualizam em tempo real (sub-segundo), sem reload. Ao voltar o foco da aba após período offline, os caches reconciliam automaticamente.

### Testes

- Backend: `notifications.gateway.spec.ts` (relay de `kyc.decided`, LGPD, best-effort) + `admin-kyc-session-sync.spec.ts` (emit por dono em APPROVED/múltiplos/REVOKE/sem-dono) — 27 verdes.
- Frontend: `use-realtime-connection.test.ts` (10), `use-notifications-socket.test.ts` (5), `use-payment-confirmed.test.ts` (3), `use-kyc-realtime.test.ts` (2) — 20 verdes.
- E2E: `notifications-websocket.spec.ts` estendido (conexão única, reconciliação em focus, KYC realtime) com guards `test.skip` para ambientes sem endpoints dev.
