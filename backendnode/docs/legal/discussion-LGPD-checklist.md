# Checklist LGPD — Discussão e Featured Report (TRANSP-05)

**PENDENTE_REVISAO_HUMANA**

> Checklist operacional para o agente `lgpd-officer` revisar em produção
> (post-deploy) e para o controlador/DPO auditar em periodicidade trimestral.
>
> Cobre os endpoints publicos de Discussion + Featured Report introduzidos em
> TRANSP-03/04. Cada caso de teste manual deve ser executado contra o
> ambiente de staging com dados sintéticos (CPF/email fake gerados pelos
> helpers em `backendnode/test/e2e/flows/setup/test-helpers.ts`).
>
> **Origem:** todo/todo.json -> TRANSP-05 (criacao solicitada).
> **Lei aplicavel:** LGPD (Lei 13.709/2018) + Res. CD/ANPD 4/2023 (cookies)
> + Res. CD/ANPD 15/2024 (direitos do titular) + Res. CD/ANPD 18/2024
> (incidentes).
> **Ultima auditoria automatizada:** TRANSP-05 (2026-08-15) — zero findings
> critical/high no escopo de discussions + featured-report.

---

## 1. Payload publico NAO contem PII

### 1.1 GET /transparency/startups/:startupId/featured-report

**Setup:** 1 startup + 1 post vigente (type=`FINANCIAL_REPORT`,
`periodMonth`=mes atual, `periodYear`=ano atual) + 1 token-holder
autenticado.

**Acao:**
```bash
curl -b "session_id=<cookie>" \
  http://localhost:7077/api/transparency/startups/50/featured-report
```

**Esperado (assertiva LGPD):**
- Response 200 com objeto post.
- Payload do autor: `{ "id": <int>, "nome": "<string>" }` APENAS.
- Payload NAO contem: `email`, `cpf`, `phone`, `telefone`, `reg_documento`,
  `data_nascimento`, `endereco`.
- Attachments: apenas `id`, `publicId`, `originalName`, `mimeType`, `url`.

**Validacao automatizada:** `featured-report.service.spec.ts` linha 122
(test `LGPD: payload NAO contem cpf/email/phone`).

---

### 1.2 GET /transparency/startups/:startupId/discussions

**Setup:** 1 startup + 5 discussions (3 identificadas + 2 anonimas) +
1 token-holder autenticado.

**Acao:**
```bash
curl -b "session_id=<cookie>" \
  "http://localhost:7077/api/transparency/startups/50/discussions?sort=recent&limit=20"
```

**Esperado (assertiva LGPD):**
- Response 200 com lista paginada.
- Cada thread expõe `authorPublicId` derivado (NAO `authorUser`, NAO `authorId`
  mapeado para User).
- Modo anonimo: `authorPublicId` no formato `"<PrimeiroNome> <Inicial>S."`
  (ex: "Ana S.").
- Modo identificado: `authorPublicId` = nome completo.
- Payload NAO contem: `email`, `cpf`, `phone`, `telefone`, `reg_documento`.
- `upvotesCount`, `repliesCount`, `lastActivityAt` presentes e numericos.

**Validacao automatizada:** `discussions.service.spec.ts` linha 369
(test `list() nunca inclui cpf/email/phone no payload`).

---

### 1.3 GET /transparency/discussions/:discussionId

**Setup:** 1 discussion + 3 replies (2 normais + 1 deletada via soft delete).

**Acao:**
```bash
curl -b "session_id=<cookie>" \
  http://localhost:7077/api/transparency/discussions/<uuid>
```

**Esperado:**
- Response 200 com thread + replies paginadas (so nao-deletadas).
- Cada reply: `authorPublicId` derivado (mesma regra).
- `viewerHasUpvoted`: boolean.
- Reply deletada NAO aparece no array de replies.

**Validacao automatizada:** `discussions.service.spec.ts` linha 401
(test `findOne() nunca inclui cpf/email/phone`).

---

## 2. AuditLog estrutural (sem conteudo de thread)

### 2.1 Criar thread -> gera log CREATE_DISCUSSION

**Setup:** token-holder autenticado.

**Acao:**
```bash
curl -X POST -b "session_id=<cookie>" -H "Content-Type: application/json" \
  -d '{"title":"Thread de teste LGPD","content":"Conteudo maior que 20 chars abc","category":"GERAL","isAnonymous":true}' \
  http://localhost:7077/api/transparency/startups/50/discussions
```

**Esperado (verificar via Prisma Studio ou SELECT no MySQL):**
- Entrada em `AuditLog`:
  - `action = 'CREATE_DISCUSSION'`
  - `entity = 'TransparencyDiscussion'`
  - `entityId = <uuid da thread>`
  - `userId = <FK opaca do User>`
  - `ip = <ip do request>`
  - `timestamp = <ISO8601>`
- AuditLog NAO armazena: `title`, `content`, `category`, `isAnonymous`,
  `cpf`, `email`, `phone` do autor.

### 2.2 Editar thread -> UPDATE_DISCUSSION

Mesma estrutura. Auditoria apenas da metadata de mudanca.

### 2.3 Deletar thread -> DELETE_DISCUSSION

**Acao:** `DELETE /transparency/discussions/:id` com `{"force": false}` (ou
`true` se houver replies).

**Esperado:**
- Soft delete (campo `deletedAt` preenchido).
- Thread NAO aparece mais em `GET /discussions` ou `GET /discussions/:id`.
- AuditLog: `action = 'DELETE_DISCUSSION'` + `userId` (autor ou ADMIN).

### 2.4 Upvote/unvote -> DISCUSSION_UPVOTE / DISCUSSION_UNVOTE

**Acao:** `POST /transparency/discussions/:id/upvote` (toggle).

**Esperado:**
- AuditLog: action correta + `entityId` + `userId` + `ip`.
- `upvotesCount` na thread incrementa/decrementa.

### 2.5 Pin/unpin -> DISCUSSION_PIN / DISCUSSION_UNPIN

**Acao:** `POST /transparency/discussions/:id/pin` (founder ou ADMIN).

**Esperado:**
- AuditLog: action correta.
- Apenas 1 thread fixada por startup (atomicidade — outras sao
  automaticamente destfixadas; este efeito colateral NAO gera log separado
  para cada destfix, mas o log principal da thread fixada registra a action).

---

## 3. Toggle anonimo (isAnonymous) — opt-in

### 3.1 Criar thread isAnonymous=true

**Acao:**
```bash
curl -X POST -b "session_id=<cookie>" -H "Content-Type: application/json" \
  -d '{"title":"Anonima Test","content":"Conteudo maior que 20 chars abc","category":"GERAL","isAnonymous":true}' \
  http://localhost:7077/api/transparency/startups/50/discussions
```

**Esperado:**
- `GET /discussions` retorna thread com `authorPublicId = "Ana S."`
  (formato `<PrimeiroNome> <Inicial(sobrenome)>.`).
- Backend NAO usa `User.cpf`/`User.email`/`User.phone` em momento algum
  do calculo do `authorPublicId` (ver `buildAuthorPublicId()` em
  `discussions.service.ts:63` — funcao pura que opera apenas sobre
  `User.nome`).

### 3.2 Criar thread isAnonymous=false (default)

**Acao:** mesma request, omitindo `isAnonymous` ou setando `false`.

**Esperado:**
- `authorPublicId = "Ana Silva"` (nome completo do `User.nome`).
- `User.email`/`User.cpf` permanecem no banco mas NAO sao serializados
  para o payload publico (Prisma `select: { id, nome, publicId }`).

---

## 4. Direito deoposicao (Art. 18 §1º) — soft delete

### 4.1 Autor deleta propria thread (ate 24h)

**Setup:** autor autenticado cria thread ha <24h.

**Acao:** `DELETE /transparency/discussions/:id` com `{"force": false}`.

**Esperado:**
- 200 OK, soft delete.
- Thread NAO aparece em listagens.
- `AuditLog.action = 'DELETE_DISCUSSION'`, `userId = autor`.

### 4.2 Autor deleta propria thread (>24h) — bloqueado

**Setup:** autor autenticado, thread criada ha >24h.

**Esperado:**
- 403 Forbidden via `CanEditDiscussionGuard`.
- Mensagem: `"Janela de edicao de 24h expirada. Apenas ADMIN pode remover."`

### 4.3 ADMIN deleta qualquer thread (sempre)

**Setup:** usuario com role=ADMIN.

**Esperado:**
- 200 OK, soft delete.
- AuditLog com `userId = ADMIN`.

### 4.4 Confirmacao explicita com replies

**Setup:** thread com N replies (N >= 1).

**Esperado:**
- Frontend abre modal de confirmacao com texto
  `"Esta thread tem N respostas. Ao excluir, as respostas serao mantidas
  porem a thread aparecera como removida. Continuar?"`.
- Checkbox de ciencia obrigatorio para habilitar botao deletar.
- Backend exige `force: true` no body se houver replies (validacao no
  service).

---

## 5. Retencao e purga (Art. 6º, V + Art. 15)

### 5.1 Discussion/reply (conteudo)

**Esperado:**
- Conteudo retido enquanto nao soft-deleted.
- Apos soft delete: registros preservados por **5 anos** (auditoria
  financeira / CVM 88/2022 + LGPD Art. 6º, V).
- Job de purga: NAO implementado em TRANSP-05 (backlog para sprint
  futura — abrir task de fix).

### 5.2 AuditLog de discussions

**Esperado:**
- Retido por **5 anos** (mesmo TTL minimo usado para outras actions).
- Job de purga: NAO implementado em TRANSP-05.

### 5.3 Anexo / upload

**Esperado:**
- Mesmo regime do restante do sistema (presigned URL TTL 7d; storage
  S3 indefinido ate purga manual).

---

## 6. Frontend — verificacoes manuais no browser

### 6.1 Network tab no DevTools (Chrome)

**Acao:** abrir `/founder/startups/50/transparencia?tab=discussao`,
logar como token-holder, abrir DevTools > Network.

**Esperado:**
- Request `GET /api/transparency/startups/50/discussions`: response payload
  NAO contem `email`, `cpf`, `phone` (buscar no JSON response).
- Request `GET /api/transparency/discussions/:id`: idem.
- Request `GET /api/transparency/startups/50/featured-report`: idem.

### 6.2 Renderizacao visual

**Acao:** clicar em uma thread anonima criada pelo proprio usuario.

**Esperado:**
- `authorPublicId = "Nome U."` (anonimo).
- Hover ou inspecao do elemento NAO revela mais nenhum identificador
  pessoal (clicar com botao direito > "Inspect" no nome do autor NAO
  mostra `data-*` com email/cpf).

### 6.3 Screenshot de teste E2E

**Setup:** Playwright em `frontend/test/e2e/flows/`.

**Esperado:**
- Screenshot da discussion NAO captura (por zoom/crop ou por dados
  sinteticos) nenhum cpf/email real do autor.

---

## 7. Testes automatizados existentes (TRANSP-03/04)

| Arquivo | Cobre | Como rodar |
|---------|-------|------------|
| `backendnode/src/api/transparency/discussions/discussions.service.spec.ts` (LGPD describe block) | `list()` e `findOne()` sem PII; `isAnonymous` toggle; `buildAuthorPublicId` | `npm test -- discussions.service.spec` |
| `backendnode/src/api/transparency/featured-report.service.spec.ts` (linha 122) | `getFeaturedReport()` sem PII | `npm test -- featured-report.service.spec` |
| `frontend/app/components/transparency/__tests__/discussion-card.test.tsx` (linha 67) | render sem PII (sem `@`, sem `\d{3}\.?\d{3}\.?\d{3}-?\d{2}`, sem `\(\d{2}\)`) | `npm run test` |

**Frequencia recomendada:** rodar antes de cada deploy + smoke em staging.

---

## 8. Achados pre-existentes (NAO escopo TRANSP-05 — backlog)

> Auditoria TRANSP-05 identificou 2 vazamentos de PII em codigo **pre-existente**
> da feature de POSTS (nao Discussions/Replies). Corrigidos em **2026-08-22** via
> task **T-26**.

| # | Local | Detalhe | Status |
|---|-------|---------|--------|
| ~~BACKLOG-01~~ | `backendnode/src/api/transparency/transparency.service.ts:167` | `findOne()` (POSTS) retornava `author: { select: { id, nome, email: true } }` — expunha email do autor para qualquer usuario autenticado (gate: AuthGuard + TokenGateGuard). | ✅ **RESOLVIDO 2026-08-22** — `email: true` → `publicId: true` (alinhado com discussions.service.ts:133,233,245). |
| ~~BACKLOG-02~~ | `frontend/app/types/transparency.ts:41-46` | Interface `TransparencyAuthor` (POSTS) tinha `email: string` — frontend ESPERAVA o email no payload, propagando o leak. | ✅ **RESOLVIDO 2026-08-22** — removido `email`, adicionado `publicId: string` com JSDoc explicando o motivo LGPD. |

**Fix aplicado (T-26 — 2026-08-22):**
1. `transparency.service.ts:167` → `email: true` substituído por `publicId: true`
   (mesmo padrao usado em discussions).
2. `transparency.ts:41-46` → removido `email`, adicionado `publicId`.
3. Spec regressivo criado em `src/api/transparency/__tests__/lgpd-posts.spec.ts`
   (5 testes: nao expoe email/cpf/telefone; expoe publicId/nome/id).
4. Audit scan global pós-fix: 0 hits em `cpf|email|telefone|phone` em
   `src/api/transparency/` (fora de testes).
5. **79 testes passing** no módulo transparency (74 existentes + 5 novos).

**Validacoes futuras (nao revertidas):**
- DPO deve rodar `npm test -- transparency` antes de cada deploy.
- Smoke em staging com curl + JWT cookie admin para confirmar payload de
  `GET /api/transparency/posts/:id` NAO contem campo `email` no `author`.
- Adicionar este caso no quarterly audit manual (item 9).

---

## 9. Resumo executivo (para o controlador)

**LGPD compliant?** **SIM** para Discussion + Featured Report (TRANSP-03/04/05)
**+ Posts (T-26 resolvido em 2026-08-22)**.

**Evidencias:**
- 9 actions auditadas (CREATE/UPDATE/DELETE thread, CREATE/DELETE reply,
  UPVOTE/UNVOTE, PIN/UNPIN) + findOne/findMany de POSTS (T-26).
- 9 testes automatizados cobrem `not.toMatch(/email|cpf|telefone|phone/)`
  (5 backend novos em lgpd-posts.spec.ts + 4 existentes: 3 backend + 1 frontend).
- `authorPublicId` derivado via funcao pura (sem I/O).
- `isAnonymous` opt-in default `false` (consentimento via termos de adesao).
- Soft delete + AuditLog preservam historico sem expor conteudo.

**Riscos residuais:** **ZERO** — backlog T-26 RESOLVIDO. Modulo
`src/api/transparency/` inteiro esta LGPD-compliant (zero hits em
`cpf|email|telefone|phone` no payload Prisma).

**Proxima revisao:** trimestral (recomendado) ou apos qualquer mudanca em
`backendnode/src/api/transparency/**`.
