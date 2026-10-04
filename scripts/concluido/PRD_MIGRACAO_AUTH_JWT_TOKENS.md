# PRD — Migração de Autenticação: Cookies/Sessions → JWT Access + Refresh Tokens

**Data:** 10/08/2026  
**Autor:** Agente IselfToken  
**Status:** Draft — Aguardando aprovação  
**Prioridade:** Alta  
**Impacto:** Backend + Frontend (Full-Stack)

---

## 1. Contexto e Motivação

### Estado Atual

O sistema usa **sessões Redis com cookies httpOnly**:

```
Login → gera UUID → salva USER COMPLETO no Redis (7 dias) → seta cookie session_id
```

**Problemas identificados:**

| # | Problema | Severidade |
|---|----------|-----------|
| P1 | **Sessão Redis armazena o user INTEIRO** (wallet, payments, subscriptions, startups, investments, tokens, tokenHistory, auditLogs, avatar, comprovante, documento, biofacial) — ~5-20KB por sessão | Alta |
| P2 | **Dados ficam stale** — alterações no user (novo investimento, nova startup) não refletem na sessão até logout/login | Alta |
| P3 | **Sem refresh token** — se a sessão expira, o user perde tudo e precisa refazer login + 2FA | Média |
| P4 | **Cookie-based impede mobile/API externa** — apps nativos e integrações third-party não funcionam com cookies httpOnly | Alta |
| P5 | **Acoplamento** — o AuthGuard depende de ter TODOS os dados do user na sessão para tomar decisões (2FA, perfil incompleto, etc.) | Média |
| P6 | **Performance** — toda requisição autenticada faz GET no Redis de ~5-20KB de JSON. Controllers que precisam só do `user.id` carregam o user completo | Média |

### Decisão

Migrar para **JWT Access Token + Refresh Token** com:
- Access token de curta duração (15 min) contendo claims mínimas
- Refresh token de longa duração (7 dias) para renovação silenciosa
- Redis como cache inteligente (apenas dados necessários, com invalidação)
- Tokens via header `Authorization: Bearer` (compatível com mobile, APIs externas e web)

---

## 2. Arquitetura Proposta

### 2.1 Visão Geral

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE AUTENTICAÇÃO                           │
│                                                                         │
│  ┌──────────┐   login    ┌──────────┐    JWT pair    ┌──────────────┐  │
│  │  Client  │ ─────────► │  Backend │ ─────────────► │  Client      │  │
│  │          │            │ AuthSvc  │                │  (armazena)  │  │
│  └────┬─────┘            └────┬─────┘                └──────┬───────┘  │
│       │                       │                              │          │
│       │  Authorization:       │  Salva refresh              │          │
│       │  Bearer <access>      │  token no Redis             │          │
│       │                       ▼                              │          │
│       │                 ┌──────────┐                         │          │
│       │                 │  Redis   │                         │          │
│       │                 │ • RT:{jti} = userId (7d)           │          │
│       │                 │ • user:{id} = dados cache (1h)     │          │
│       │                 │ • blacklist:{jti} = 1 (15min)      │          │
│       │                 └──────────┘                         │          │
│       │                                                      │          │
│       │  GET /api/resource                                   │          │
│       │  Authorization: Bearer <access_token>                │          │
│       ▼                                                      │          │
│  ┌──────────┐  decode JWT   ┌──────────┐                    │          │
│  │ AuthGuard│ ────────────► │ Validação│                    │          │
│  │          │  (stateless)  │ • exp    │                    │          │
│  │          │               │ • jti    │                    │          │
│  │          │               │ • role   │                    │          │
│  └──────────┘               │ • af2    │                    │          │
│       │                     └──────────┘                    │          │
│       │  req.user = { id, role, af2Verified }               │          │
│       ▼                                                      │          │
│  ┌──────────────────────┐                                    │          │
│  │ Controller/Service   │  Se precisa mais dados:           │          │
│  │ (usa req.user.id)    │  → Redis cache user:{id}         │          │
│  │                      │  → Se miss: DB → seta cache 1h   │          │
│  └──────────────────────┘                                    │          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Estrutura dos Tokens

#### Access Token (JWT, 15 min)

```json
{
  "sub": 42,
  "jti": "uuid-v4",
  "email": "user@example.com",
  "role": "USER",
  "af2": true,
  "iat": 1723334400,
  "exp": 1723335300
}
```

**Claims mínimas:** apenas o necessário para o AuthGuard decidir. Nenhum dado pessoal.

#### Refresh Token (JWT, 7 dias)

```json
{
  "sub": 42,
  "jti": "uuid-v4-diferente",
  "type": "refresh",
  "family": "uuid-family",
  "iat": 1723334400,
  "exp": 1723939200
}
```

**`family`**: Detecta refresh token rotation theft (se o mesmo family é usado 2x, invalida toda a família).

### 2.3 Redis — O que Fica no Cache

| Chave | Conteúdo | TTL | Uso |
|-------|----------|-----|-----|
| `rt:{jti}` | `{ userId, family, createdAt }` | 7 dias | Validar refresh token (revogação) |
| `blacklist:{jti}` | `1` | 15 min (= accessToken TTL) | Access tokens revogados (logout) |
| `user:{userId}` | Dados essenciais para decisões de negócio (ver abaixo) | 1 hora | Cache de dados usados frequentemente |
| `2fa:{sessionId}` | `{ code, userId, attempts }` | 5 min | Código 2FA pendente |

#### Cache `user:{userId}` — Apenas o Necessário

```json
{
  "id": 42,
  "publicId": "cuid...",
  "email": "user@email.com",
  "nome": "João",
  "role": "USER",
  "isActive": true,
  "af2Verified": true,
  "termosAceitos": true,
  "politicaAceita": true,
  "hasActiveSubscription": true,
  "subscriptionPlan": "plano-fundador",
  "kycStatus": "APPROVED"
}
```

**O que SAI do cache:**
- ❌ `wallet` — só precisa na página de carteira
- ❌ `payments[]` — só precisa no histórico financeiro
- ❌ `subscriptions[]` (detalhes) — só status importa para guards
- ❌ `startups[]` — só precisa no dashboard do founder
- ❌ `investments[]` — só precisa no dashboard do investidor
- ❌ `tokens[]` — só precisa na carteira de tokens
- ❌ `tokenHistory[]` — só precisa no histórico
- ❌ `auditLogs[]` — só precisa no perfil/admin
- ❌ `avatar`, `comprovante`, `documento`, `biofacial` — só precisa no perfil/KYC
- ❌ Endereço completo — só precisa na edição de perfil

**Redução estimada:** de ~5-20KB para ~500 bytes por sessão.

---

## 3. Fluxos Detalhados

### 3.1 Login

```
1. POST /auth/login { email, senha }
2. Backend valida credenciais
3. Gera código 2FA, salva em Redis (2fa:{tempSessionId})
4. Retorna { tempSessionId, requiresVerification: true }
   (NÃO emite tokens ainda — precisa do 2FA primeiro)
```

### 3.2 Verificação 2FA

```
1. POST /auth/verify-code { tempSessionId, code }
2. Backend valida código contra Redis (2fa:{tempSessionId})
3. Se válido:
   - Gera access_token (JWT, 15min, com af2: true)
   - Gera refresh_token (JWT, 7d)
   - Salva refresh token no Redis (rt:{jti})
   - Popula cache user:{userId}
   - Retorna { access_token, refresh_token, user: { id, nome, email, role } }
4. Deleta 2fa:{tempSessionId}
```

### 3.3 Refresh (Renovação Silenciosa)

```
1. POST /auth/refresh { refresh_token }
2. Backend decodifica JWT → extrai jti e family
3. Verifica se rt:{jti} existe no Redis
4. Se NÃO existe → token já foi usado ou revogado → 401
5. Se existe:
   - Deleta rt:{jti} (single-use)
   - Gera NOVO access_token (15min)
   - Gera NOVO refresh_token (7d, mesmo family)
   - Salva novo rt:{newJti} no Redis
   - Retorna { access_token, refresh_token }
```

### 3.4 Logout

```
1. POST /auth/logout (Authorization: Bearer <access_token>)
2. Backend:
   - Adiciona access_token.jti ao blacklist:{jti} (TTL = tempo restante do token)
   - Deleta rt:{refresh_jti} do Redis
   - Deleta cache user:{userId}
3. Retorna 200
```

### 3.5 Requisição Autenticada (AuthGuard)

```
1. Extrai token do header Authorization: Bearer <token>
2. jwt.verify(token, secret) → se inválido/expirado → 401
3. Verifica blacklist:{jti} → se existe → 401 (token revogado)
4. Seta req.user = { id: sub, role, email, af2Verified: af2 }
5. Se controller precisa mais dados → UserCacheService.get(userId) → Redis ou DB
```

---

## 4. Gerenciamento de Estado no Frontend

### 4.1 Armazenamento dos Tokens

| Opção | Segurança | Compatibilidade | Decisão |
|-------|-----------|-----------------|---------|
| localStorage | XSS vulnerável | Universal | ❌ |
| httpOnly cookies | XSS-safe, CSRF risk | Web only | ❌ (restringe mobile) |
| **Memory + httpOnly refresh cookie** | XSS-safe para refresh, access em memória | Web + mobile | ✅ |

**Estratégia híbrida:**
- `access_token` → armazenado **em memória** (variável JS, perdido no refresh da página)
- `refresh_token` → armazenado em **httpOnly cookie** (seguro contra XSS)
- Na carga da página, o frontend faz `POST /auth/refresh` (cookie enviado automaticamente) para obter novo access_token

### 4.2 TanStack Query — O que Muda

**Antes (cookie-based):**
```typescript
const res = await fetch("/api/users/me", { credentials: "include" });
```

**Depois (Bearer token):**
```typescript
const res = await fetch("/api/users/me", {
  headers: { Authorization: `Bearer ${getAccessToken()}` }
});
```

**Interceptor global com refresh automático:**
```typescript
async function authFetch(url: string, options?: RequestInit) {
  let token = getAccessToken();
  
  // Se token expirado ou ausente, tenta refresh
  if (!token || isTokenExpired(token)) {
    token = await refreshAccessToken(); // POST /auth/refresh (cookie httpOnly)
    if (!token) {
      // Refresh falhou → redirect para login
      window.location.href = "/login";
      throw new Error("Session expired");
    }
  }
  
  const res = await fetch(url, {
    ...options,
    headers: { ...options?.headers, Authorization: `Bearer ${token}` }
  });
  
  // Se 401 (token blacklisted), tenta refresh uma vez
  if (res.status === 401) {
    token = await refreshAccessToken();
    if (!token) { redirect login; }
    return fetch(url, { ...options, headers: { Authorization: `Bearer ${token}` } });
  }
  
  return res;
}
```

### 4.3 Queries — O que Fica no Cache do TanStack Query

| Query Key | staleTime | Quando Busca | Dados |
|-----------|-----------|-------------|-------|
| `["auth-status"]` | 0 (always fresh) | Toda navegação | `{ isAuthenticated, role }` |
| `["me"]` | 5 min | Páginas que precisam | Nome, email, role, avatar URL |
| `["me", "profile"]` | 30s | Página de perfil | Endereço, documento, KYC completo |
| `["me", "wallet"]` | 30s | Página de carteira | Saldo, transações |
| `["me", "subscriptions"]` | 5 min | Sidebar, guards | Plano ativo, expiração |
| `["startups"]` | 1 min | Dashboard founder | Lista de startups |
| `["investments"]` | 1 min | Dashboard investor | Lista de investimentos |

**Princípio:** Cada página busca apenas o que precisa. Não existe mais um "user completo" cacheado globalmente.

---

## 5. Plano de Execução

### Fase 1: Backend — Novo Sistema de Tokens (Sprint 1)

| # | Tarefa | Esforço |
|---|--------|---------|
| T1 | Criar `TokenService` (gera access + refresh, valida, revoga) | L |
| T2 | Criar `RefreshTokenStore` (Redis rt:{jti}, family tracking) | M |
| T3 | Criar `TokenBlacklistService` (Redis blacklist:{jti}) | S |
| T4 | Criar `UserCacheService` (Redis user:{id} com dados mínimos, 1h TTL) | M |
| T5 | Refatorar `AuthGuard` → ler de `Authorization: Bearer` + JWT verify + blacklist check | L |
| T6 | Criar `RefreshGuard` (valida refresh token do cookie httpOnly) | M |
| T7 | Novo endpoint `POST /auth/refresh` (emite novo par de tokens) | M |
| T8 | Refatorar `POST /auth/login` → retorna tempSessionId (sem tokens) | M |
| T9 | Refatorar `POST /auth/verify-code` → emite access+refresh tokens | M |
| T10 | Refatorar `POST /auth/logout` → blacklist access + revoga refresh | S |
| T11 | Criar `POST /auth/revoke-all` → invalida todos os refresh tokens de um user | S |
| T12 | Atualizar `AuthModule` com novos providers | S |

### Fase 2: Backend — Migrar Controllers e Separar Dados (Sprint 1-2)

| # | Tarefa | Esforço |
|---|--------|---------|
| T13 | Refatorar `GET /users/me` → retornar apenas dados essenciais (nome, email, role, avatar) | M |
| T14 | Criar `GET /users/me/profile` → dados completos (endereço, docs, KYC) | S |
| T15 | Criar `GET /users/me/wallet` → saldo e transações recentes | S |
| T16 | Criar `GET /users/me/subscriptions` → assinatura ativa + plano | S |
| T17 | Remover `userSelectWithRelations` do login (não carrega mais tudo) | S |
| T18 | Controllers que usam `req.user.wallet` → buscar via `UserCacheService` ou DB | L |
| T19 | Remover `SessionService` antigo (ou manter como deprecated durante transição) | M |
| T20 | Remover `CookiesService` (ou manter apenas para refresh cookie) | S |

### Fase 3: Frontend — Migrar State Management (Sprint 2)

| # | Tarefa | Esforço |
|---|--------|---------|
| T21 | Criar `AuthProvider` com token em memória + refresh via cookie | L |
| T22 | Criar `authFetch` (wrapper de fetch com interceptor de refresh) | M |
| T23 | Migrar todas as chamadas de `credentials: "include"` para `authFetch` com Bearer | L |
| T24 | Atualizar `useUser()` → usar `GET /users/me` (dados mínimos) | S |
| T25 | Criar `useProfile()` → `GET /users/me/profile` (página de perfil) | S |
| T26 | Criar `useWallet()` → `GET /users/me/wallet` (página carteira) | S |
| T27 | Criar `useSubscription()` → `GET /users/me/subscriptions` | S |
| T28 | Atualizar `serverFetch` para SSR (usar refresh cookie para obter access token) | M |
| T29 | Remover `authStatusQueryOptions` (agora é decode local do JWT) | S |
| T30 | Atualizar fluxo de login (2FA → recebe tokens → armazena) | M |

### Fase 4: Cleanup e Testes (Sprint 2-3)

| # | Tarefa | Esforço |
|---|--------|---------|
| T31 | Remover lógica de session cookie do AuthGuard | S |
| T32 | Remover redis keys `session:*` (migração gradual) | S |
| T33 | Testes unitários do TokenService + RefreshTokenStore | M |
| T34 | Testes e2e do fluxo completo (login → 2FA → refresh → logout) | L |
| T35 | Teste de refresh token rotation (detectar roubo) | M |
| T36 | Documentar nova API de auth (Swagger) | S |
| T37 | Atualizar AGENTS.md com nova arquitetura | S |

---

## 6. Variáveis de Ambiente

### Novas

```bash
# JWT
JWT_ACCESS_SECRET=uma-chave-forte-aleatoria-access
JWT_REFRESH_SECRET=outra-chave-forte-aleatoria-refresh
JWT_ACCESS_TTL=900          # 15 minutos em segundos
JWT_REFRESH_TTL=604800      # 7 dias em segundos

# Refresh cookie
REFRESH_COOKIE_NAME=rt
REFRESH_COOKIE_DOMAIN=       # vazio = mesmo domínio
REFRESH_COOKIE_SECURE=true   # false em dev
REFRESH_COOKIE_SAMESITE=strict
```

### Removidas (após migração completa)

```bash
# SESSION_COOKIE_MAX_AGE (obsoleto)
# SESSION_COOKIE_NAME (obsoleto)
```

---

## 7. Segurança

### Proteções Implementadas

| Vetor | Mitigação |
|-------|-----------|
| XSS roubo de access_token | Em memória (não localStorage). Refresh em httpOnly cookie |
| XSS roubo de refresh cookie | httpOnly + Secure + SameSite=Strict |
| CSRF | SameSite=Strict no refresh cookie. Access via header (não cookie) |
| Token theft (refresh) | Rotation com family tracking. Uso único. Detecta reuso → revoga família |
| Logout bypass | Blacklist no Redis com TTL = access token restante |
| Força bruta no refresh | Rate limit no endpoint `/auth/refresh` |
| Replay attack | `jti` único por token, single-use refresh |

### Refresh Token Rotation — Detecção de Roubo

```
Legítimo:                    Atacante rouba RT-1:
                             
User usa RT-1 → recebe RT-2  Atacante usa RT-1 → FALHA (já usado)
User usa RT-2 → recebe RT-3  → Backend detecta reuso da family
User usa RT-3 → recebe RT-4  → Revoga TODA a family
                              → User precisa relogar
```

---

## 8. Melhorias Adicionais Identificadas

### 8.1 Separação de Responsabilidades nos Endpoints

| Antes | Depois | Benefício |
|-------|--------|-----------|
| `GET /users/me` retorna TUDO | `/users/me` (básico) + `/users/me/profile` + `/users/me/wallet` + `/users/me/subscriptions` | Frontend busca só o que precisa |
| Login carrega 12 relações | Login faz apenas validação de credenciais | Login 10x mais rápido |
| AuthGuard faz lookup de 20KB no Redis | AuthGuard decodifica JWT (0ms Redis) | Latência -5ms por request |

### 8.2 Cache Invalidation

| Evento | Ação |
|--------|------|
| User atualiza perfil | Invalida `user:{id}` no Redis |
| Novo investimento confirmado | Invalida `user:{id}` (campo `hasActiveSubscription` pode mudar) |
| Admin altera role | Revoga TODOS os refresh tokens do user + invalida cache |
| User troca senha | Revoga TODOS os refresh tokens + blacklist access atual |

### 8.3 Rate Limiting por Endpoint

| Endpoint | Limite |
|----------|--------|
| `POST /auth/login` | 5/min por IP |
| `POST /auth/verify-code` | 3/min por sessão |
| `POST /auth/refresh` | 30/min por user |
| `POST /auth/forgot-password` | 3/min por email |

### 8.4 Monitoring & Observability

- Log de todas as emissões de tokens (userId, IP, userAgent)
- Alerta se um user tem > 10 refresh tokens ativos simultâneos
- Métrica de taxa de refresh (indica token TTL adequado)
- Dashboard de sessions ativas (Redis SCAN rt:*)

### 8.5 Suporte a Mobile/API

Com Bearer tokens, o mesmo backend serve:
- Web app (React Router SSR)
- App mobile (React Native / Flutter)
- Integrações third-party (API keys futuras)
- Webhooks (com service tokens)

---

## 9. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Access token expirado causa UX ruim (flash de logout) | Média | Médio | Refresh proativo: renovar quando `exp - now < 2min` |
| Refresh cookie não funciona cross-domain (staging) | Baixa | Alto | Configurar CORS + cookie domain corretamente |
| Redis down = ninguém faz refresh | Baixa | Alto | Fallback: aceitar access tokens válidos sem check de blacklist (degraded mode) |
| Migração quebrando sessões existentes | Alta | Alto | Período de transição: aceitar AMBOS (cookie session E Bearer token) por 2 semanas |
| Controllers que dependem de req.user completo | Alta | Médio | Auditoria + criação de `UserCacheService` para lookup sob demanda |

---

## 10. Período de Transição

Para evitar logout forçado de todos os usuários:

1. **Semana 1-2:** Deploy do novo sistema. AuthGuard aceita AMBOS:
   - Cookie `session_id` (legado) → busca Redis → popula req.user
   - Header `Authorization: Bearer` (novo) → decode JWT → popula req.user
2. **Semana 3:** Frontend migra para Bearer. Novos logins usam tokens.
3. **Semana 4:** Remove suporte a session cookies. Sessões Redis antigas expiram naturalmente (7d TTL).

---

## 11. Definição de Done

- [ ] Login + 2FA → emite access + refresh tokens
- [ ] Refresh endpoint funciona (rotation + family tracking)
- [ ] Logout invalida tokens (blacklist + revoke)
- [ ] AuthGuard valida JWT sem Redis lookup
- [ ] Frontend usa Bearer token em todas as requests
- [ ] `GET /users/me` retorna apenas dados essenciais (~500 bytes)
- [ ] Redis não armazena mais user completo (economia de ~90% memória)
- [ ] Testes e2e cobrindo login → 2FA → refresh → logout
- [ ] Mobile-ready (Bearer token funciona sem cookies)
- [ ] Zero sessões legadas após 4 semanas de transição

---

## 12. Timeline Estimada

| Sprint | Fase | Entregável |
|--------|------|-----------|
| S1 (semana 1-2) | Fase 1 | TokenService, AuthGuard novo, endpoints de refresh/login/logout |
| S1-S2 (semana 2-3) | Fase 2 | Separação de endpoints, UserCacheService, remoção de dados do Redis |
| S2 (semana 3-4) | Fase 3 | Frontend migrado para Bearer + AuthProvider + authFetch |
| S3 (semana 5) | Fase 4 | Cleanup, testes, docs, remoção do legado |
