# PRD — Página de Transparência da Startup

**Data:** 14/08/2026
**Autor:** Agente IselfToken
**Status:** Draft — Aguardando aprovação
**Prioridade:** Média
**Sprint estimado:** 1-2 sprints

---

## 1. Contexto e Motivação

### Estado Atual

- **Founder:** `/founder/dashboard` lista as startups do fundador (já existe). Cada card mostra status da rodada, valor captado, meta, e ações (nova rodada, editar, ver investidores).
- **Investidor:** `/investor/dashboard` lista investimentos agregados (sem agrupar por startup). A página de detalhe da startup `/startups/:id` mostra dados públicos da rodada (público/auth-gated).
- **Não existe** nenhuma feature de "transparência" ou "relatórios financeiros" no código (busca em `src/api/*`, `app/components/*`, `app/routes/*` retornou zero matches).
- **Backend já tem** `Token` model com `userId + startupId + campaignId`, e endpoint `/investments/my-startups` (investor-dashboard poderia consumir mas hoje não consome).

### Problema

1. **Fundador não tem canal direto para investidores.** Hoje a única comunicação é via e-mail (transacional, sem histórico) ou suporte. Não há como o fundador compartilhar atualizações sobre a startup com quem comprou tokens.
2. **Investidor não tem visibilidade pós-compra.** Após comprar tokens, o investidor perde o vínculo com a startup. Não há prestação de contas contínua nem updates de negócio.
3. **Não há prestação de contas formal.** Reguladores (CVM) esperam que captações tenham algum nível de reporting aos investidores. Hoje só temos snapshots financeiros no momento da criação da campanha (`ADR-008`), sem update contínuo.
4. **Risco de churn do investidor.** Sem informação, o investidor pode tratar o token como "esquecido" e abandonar a plataforma. Manter a relação aumenta LTV.

### Caso Real

Um founder capta R$ 500k via tokens. 6 meses depois, o MRR da startup dobrou e ele quer comunicar isso aos investidores — sem ter que mandar e-mail individual. Os investidores querem saber se o negócio está performando antes de investir em uma próxima rodada.

---

## 2. Decisão Proposta

Criar uma **página de transparência por startup** onde:

1. **Founder posta atualizações** (relatórios financeiros, marcos de produto, mudanças societárias) que ficam visíveis para todos os investidores daquela startup.
2. **Investidor com tokens ativos** acessa a página de transparência da startup via `/startups/:id/transparency`.
3. **Sem tokens = sem acesso.** Visitante anônimo e usuário sem tokens da startup recebem 403. Isso cria **valor real do token** além do retorno financeiro.
4. **Lista de startups do investidor:** a página `/startups/:id/transparency` é acessada a partir da lista de startups do **fundador** (`/founder/dashboard`) que JÁ EXISTE — para o investidor usaremos a lista de investimentos em `/investor/dashboard` como ponto de entrada (agrupando por startup). A mudança na `/investor/dashboard` é descrita no PRD §11 como **escopo opcional / follow-up**.

### Não-objetivos (esclarecimento)

> **ATUALIZADO 2026-08-15:** Itens "Mensagens assíncronas / chat 1-1" e "Comentários em posts" foram **REVERTIDOS** por decisão do usuário. A nova seção de Discussão (onde founder e token-holders criam tópicos e respondem dentro do tópico) está especificada em `CASE.md` → **[Transparência] — Discussão e Relatório Vigente**, com implementação planejada em `TRANSP-03/04/05` no `todo/todo.json`. Itens restantes permanecem fora do escopo.

- ❌ ~~Mensagens assíncronas / chat 1-1~~ **REVERTIDO** — agora incluído como seção Discussão na página de transparência (ver CASE.md).
- ❌ ~~Comentários em posts~~ **REVERTIDO** — replies em tópicos de discussão estão permitidos (ver CASE.md).
- ❌ ~~Sistema de likes/curtidas~~ **REVERTIDO** — upvotes em threads estão permitidos no Feed da Discussão. Reverte exclusão original após feedback do usuário (ver CASE.md).
- ❌ **Notificações push/email ao publicar** — fora do escopo (pode ser follow-up).
- ❌ **Criptografia ponta-a-ponta** — fora do escopo.

---

## 3. Objetivos e Não-objetivos

### Objetivos

| # | Objetivo | Critério de Aceite |
|---|----------|-------------------|
| O1 | Founder posta "relatório" na página `/startups/:id/transparency` | Botão "Postar atualização" visível para founder; salva no banco; aparece no feed |
| O2 | Investor com token ativo da startup vê a página | Request autenticada com `Token.userId = req.user.id AND Token.startupId = :startupId` retorna 200 |
| O3 | Investor sem token da startup recebe 403 | Mesma request acima retorna 403 com mensagem em PT-BR |
| O4 | Visitante anônimo recebe 401 | Request sem cookie de sessão redireciona para `/login` |
| O5 | Founder pode editar/excluir posts próprios | UI mostra botões condicionais; backend valida `post.authorId === req.user.id OR ADMIN` |
| O6 | Lista de startups no `/founder/dashboard` exibe link para `/startups/:id/transparency` | Card da startup no dashboard founder mostra botão "Transparência" (só para startups com campanha OPEN/CLOSED/FUNDED) |
| O7 | Posts suportam conteúdo rico (markdown) + anexos | Conteúdo é markdown renderizado; anexos vêm do módulo `uploads` existente |
| O8 | Posts têm período (mês/ano) e tipo (Financeiro / Produto / Societário / Geral) | Filtros por tipo e período funcionam no feed |

### Não-objetivos

- ❌ Não criar sistema de notificações nesta sprint (pode ser S28).
- ❌ Não criar funcionalidades sociais (likes, comments, follows).
- ❌ Não reescrever `/investor/dashboard` para agrupar por startup (decidir em PRD separado).
- ❌ Não implementar visibilidade diferenciada por tipo de usuário (todos os token-holders veem tudo).

---

## 4. Personas

### Persona 1 — Founder ("Carlos")
- **Perfil:** CEO de startup que captou R$ 500k via tokens. Conhece bem o produto mas tem tempo limitado.
- **Objetivo:** Comunicar marcos e relatórios financeiros sem mandar 50 e-mails individuais.
- **Frustração atual:** Não tem canal centralizado para updates pós-captação.
- **Uso típico:** Posta 1-2x por mês (relatório mensal + atualização ad-hoc).

### Persona 2 — Investor ("Ana")
- **Perfil:** Investidora-anjo diversificada, comprou tokens de 4 startups. Acompanha performance.
- **Objetivo:** Saber se as startups estão performando e se vale a pena aportar mais na próxima rodada.
- **Frustração atual:** Sem informação pós-compra; esquece quais startups ela tem tokens.
- **Uso típico:** Acessa `/startups/:id/transparency` 1x/mês para cada startup; quer ver a tendência (não cada post individual).

### Persona 3 — Visitante sem tokens ("Visitante")
- **Perfil:** Usuário logado que NÃO comprou tokens de uma startup específica.
- **Objetivo:** Quer espiar a página de transparência para decidir se vale comprar.
- **Comportamento esperado:** Recebe 403 com CTA "Quero investir" → vai para `/startups/:id` (página pública da startup) → decide.

---

## 5. Arquitetura Proposta

### 5.1 Visão Geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                │
│                                                                      │
│  Founder                       Investor (com token)                  │
│  ┌──────────────────────┐     ┌──────────────────────┐              │
│  │ /founder/dashboard   │     │ /startups/:id/       │              │
│  │ (já existe)          │     │   transparency       │              │
│  │                      │     │                      │              │
│  │ Card da startup ──┐  │     │ Lista de posts       │              │
│  │   "Transparência" │  │     │   por período/tipo   │              │
│  └──────────────────┼─┘  │     │   [Ler post]         │              │
│                     │    │     │                      │              │
│                     ▼    │     │ ┌──────────────────┐ │              │
│            /startups/:id/  │     │ │  Post individual │ │              │
│              transparency │     │ │  (markdown)      │ │              │
│                     ▲    │     │ │  + anexos        │ │              │
│                     │    │     │ └──────────────────┘ │              │
│                     │    │     │                      │              │
│                     ▼    │     │ [Postar atualização] │              │
│         ┌──────────────────┐   │  (só para founder)   │              │
│         │  Modal de criar  │   └──────────────────────┘              │
│         │  post           │                                          │
│         └──────────────────┘                                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                 │
│                                                                      │
│  POST   /transparency/startups/:startupId/posts    (founder only)    │
│  GET    /transparency/startups/:startupId/posts    (token-holder)    │
│  GET    /transparency/posts/:id                    (token-holder)    │
│  PUT    /transparency/posts/:id                    (author or admin) │
│  DELETE /transparency/posts/:id                    (author or admin) │
│                                                                      │
│  Middleware:                                                          │
│  ┌──────────────────────────────────────────────────┐              │
│  │  TokenGateGuard                                   │              │
│  │  - User authenticated?     → else 401            │              │
│  │  - User is founder of      → allow               │              │
│  │    startup?                                       │              │
│  │  - User has Token for      → allow               │              │
│  │    startup?                                       │              │
│  │  - Else 403 ("Sem acesso — compre tokens")        │              │
│  └──────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  ┌──────────────────────────┐
                  │  Prisma model:           │
                  │  TransparencyPost        │
                  │  Upload (FK attachments) │
                  │  Token (gate)            │
                  └──────────────────────────┘
```

### 5.2 Modelo de Dados

```prisma
/// Post de transparência publicado pelo founder para investidores.
/// Acessível apenas para usuários com Token ativo da startup.
model TransparencyPost {
  id Int @id @default(autoincrement())

  startupId Int
  startup   Startup @relation(fields: [startupId], references: [id])

  /// Autor do post (sempre um USER com role FOUNDER ou ADMIN).
  /// Validado no service: authorId === req.user.id (founder da startup) ou ADMIN.
  authorId Int
  author   User @relation("TransparencyPostAuthor", fields: [authorId], references: [id])

  /// Tipo do post — usado para filtros no feed.
  type TransparencyPostType @default(GENERAL)

  title   String @db.VarChar(200)
  /// Conteúdo em markdown (renderizado no client via react-markdown).
  content String @db.Text

  /// Período de referência do post (nullable para posts sem período, ex: "Marcos do produto").
  periodMonth Int? // 1-12
  periodYear  Int? // 2020+

  /// Soft delete para preservar histórico de auditoria.
  publishedAt DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  /// Anexos (PDFs, imagens, planilhas). Relação many-to-many via join table.
  attachments TransparencyPostAttachment[]

  @@index([startupId, publishedAt(sort: Desc)])
  @@index([startupId, type])
}

enum TransparencyPostType {
  FINANCIAL_REPORT  // relatório financeiro (DRE, balanço, fluxo de caixa)
  PRODUCT_MILESTONE // marco de produto (lançamento, nova feature)
  CORPORATE_CHANGE  // mudança societária (novo CTO, M&A, rodada subsequente)
  GENERAL           // qualquer outra atualização
}

/// Join table para anexos do post (PDFs, planilhas, imagens).
model TransparencyPostAttachment {
  postId    Int
  post      TransparencyPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  uploadId  Int
  upload    Upload           @relation(fields: [uploadId], references: [id])

  @@id([postId, uploadId])
  @@index([uploadId])
}
```

### 5.3 Endpoints da API

| Método | Rota | Quem acessa | Descrição |
|---|---|---|---|
| `POST` | `/transparency/startups/:startupId/posts` | Founder da startup / ADMIN | Cria post (multipart para anexos). Body: `{ title, content (markdown), type, periodMonth?, periodYear?, attachmentIds?: number[] }` |
| `GET` | `/transparency/startups/:startupId/posts` | Founder OU token-holder | Lista posts (paginado, filtros via query: `?type=FINANCIAL_REPORT&year=2026&page=1&limit=10`). Default: mais recente primeiro. |
| `GET` | `/transparency/posts/:id` | Founder OU token-holder | Detalhe de um post específico |
| `PATCH` | `/transparency/posts/:id` | Autor do post OU ADMIN | Edita post (mesmos campos do POST) |
| `DELETE` | `/transparency/posts/:id` | Autor do post OU ADMIN | Soft delete (`deletedAt = now()`) |

### 5.4 Gating: TokenGateGuard

```typescript
/**
 * Guard que valida acesso à página de transparência de uma startup.
 *
 * Regras:
 * 1. User autenticado (AuthGuard) — senão 401
 * 2. User é founder da startup OU tem Token ativo — senão 403
 * 3. ADMIN sempre tem acesso
 */
@Injectable()
export class TokenGateGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const startupId = +req.params.startupId;

    // 1. Auth (AuthGuard já rodou antes)
    const user = req.user;
    if (!user) throw new UnauthorizedException();

    // 2. ADMIN sempre passa
    if (user.role === 'ADMIN') return true;

    // 3. Founder da startup passa
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      select: { founderId: true },
    });
    if (!startup) throw new NotFoundException('Startup não encontrada');
    if (startup.founderId === user.id) return true;

    // 4. Token-holder passa (token ativo = user tem tokens dessa startup)
    const token = await this.prisma.token.findFirst({
      where: { userId: user.id, startupId },
      select: { id: true },
    });
    if (token) return true;

    // 5. Senão, bloqueia
    throw new ForbiddenException(
      'Você precisa comprar tokens desta startup para acessar a área de transparência.',
    );
  }
}
```

### 5.5 Comportamento do Token Expirado / Campaign Encerrada

- **Token ativo:** Token existe na tabela `Token`. Não importa o status da campanha.
- **Campanha encerrada (PAID_OUT):** Tokens continuam existindo. A página de transparência continua acessível.
- **Campanha nunca existiu (status DRAFT):** Apenas o founder pode acessar (não há investidores).

> Decisão: a regra é simples: existência de Token (não importa status). Se a startup apaga tokens (compliance hard-delete), o investor perde acesso. Documentar isso no CASE.md.

---

## 6. Frontend (rotas e componentes)

### 6.1 Novas Rotas

| Rota | Arquivo | Quem acessa | Descrição |
|---|---|---|---|
| `/startups/:id/transparency` | `routes/private/transparency.$startupId.tsx` (criar) | Founder da startup + token-holders | Lista de posts + (founder) botão "Postar atualização" |
| `/startups/:id/transparency/:postId` | (mesmo arquivo, opcional) | Idem | Post individual (deep-link) |

> **Decisão:** Single page com navegação interna (lista → detalhe via state), não múltiplas rotas. Mais simples e segue o padrão das outras páginas da app.

### 6.2 Componentes Novos

| Componente | Caminho | Props |
|---|---|---|
| `TransparencyFeed` | `components/transparency/transparency-feed.tsx` | `posts: TransparencyPost[]`, `onSelectPost` |
| `TransparencyPostCard` | `components/transparency/post-card.tsx` | `post: TransparencyPost`, `onClick` |
| `TransparencyPostDetail` | `components/transparency/post-detail.tsx` | `post: TransparencyPost` (renderiza markdown) |
| `TransparencyPostEditor` | `components/transparency/post-editor.tsx` | `startupId`, `post?` (null=criar, defined=editar) |
| `TransparencyFilterBar` | `components/transparency/filter-bar.tsx` | `filters`, `onChange` |
| `TokenGateError` | `components/transparency/token-gate-error.tsx` | `startupId` (CTA "Quero investir") |

### 6.3 Modificações em Páginas Existentes

**`/founder/dashboard`** (já existe):
- Adicionar botão "Transparência" no card da startup (só para startups com campaign OPEN/CLOSED/FUNDED, não DRAFT).
- Link: `/startups/:id/transparency`

**`/investor/dashboard`** (já existe) — **OPCIONAL / follow-up:**
- Mudança opt-in descrita no §11. Não bloqueia este PRD.

### 6.4 Renderização de Markdown

Usar `react-markdown` (já deve estar disponível — verificar em `package.json`) com sanitização via `rehype-sanitize`. Whitelist: headings, listas, links, bold, italic, code inline, code blocks. **Sem** iframes/scripts (XSS prevention).

### 6.5 Upload de Anexos

Reutilizar `useUploadMutation` do PRD anterior (`app/hooks/use-upload.ts`). Frontend chama POST `/api/uploads` primeiro, pega o `uploadId`, depois envia o post com `attachmentIds: [1, 2, 3]`.

---

## 7. Modelo de Segurança

| Aspecto | Política |
|---|---|
| Autenticação | Obrigatória (cookie de sessão, mesma do resto da app) |
| Acesso de leitura (GET) | Founder + token-holder da startup |
| Acesso de escrita (POST/PATCH/DELETE) | Apenas autor do post + ADMIN |
| Conteúdo | Markdown sanitizado (whitelist conservadora) |
| Uploads | Mesma proteção do módulo uploads (validação de MIME, sanitização, dedup, 50MB) |
| Soft delete | Preserva histórico para auditoria |
| Audit log | `compliance/audit` log deve registrar POST/PATCH/DELETE com IP/UA (Fase 2 — fora do escopo desta sprint) |
| LGPD | Posts podem conter dados sensíveis (números de clientes, salários). Marking "CONFIDENCIAL" é follow-up. |

---

## 8. Plano de Execução

### Fase 1 — Backend (Sprint atual)

| # | Tarefa | Arquivo | Esforço |
|---|--------|---------|---------|
| T1 | Criar `TransparencyPost` e `TransparencyPostAttachment` no schema.prisma + migration | `backendnode/prisma/schema.prisma` | S |
| T2 | Criar `TransparencyModule` (módulo + controller + service) | `backendnode/src/api/transparency/` | M |
| T3 | Criar `TokenGateGuard` + testes unitários | `backendnode/src/api/transparency/guards/token-gate.guard.ts` | M |
| T4 | Implementar endpoints REST (POST/GET/LIST/PATCH/DELETE) | `backendnode/src/api/transparency/transparency.controller.ts` | M |
| T5 | DTOs com class-validator (CreateTransparencyPostDto, UpdateTransparencyPostDto, ListPostsQueryDto) | `backendnode/src/api/transparency/dto/` | S |
| T6 | Service com regras: founder-check, token-check, soft-delete, paginação | `backendnode/src/api/transparency/transparency.service.ts` | M |
| T7 | Testes E2E: founder post, investor read, sem-token 403, edit, delete | `backendnode/test/e2e/flows/transparency.e2e-spec.ts` | M |
| T8 | Registrar módulo em `app.module.ts` | `backendnode/src/app.module.ts` | XS |

### Fase 2 — Frontend (mesma sprint)

| # | Tarefa | Arquivo | Esforço |
|---|--------|---------|---------|
| T9 | BFF `transparency.$startupId.ts` (proxy ao backend, propaga cookie) | `frontend/app/routes/api/transparency.$startupId.ts` | S |
| T10 | Página `/startups/:id/transparency` (lista + detalhe + editor) | `frontend/app/routes/private/transparency.$startupId.tsx` | L |
| T11 | Componentes: `TransparencyFeed`, `PostCard`, `PostDetail`, `PostEditor`, `FilterBar`, `TokenGateError` | `frontend/app/components/transparency/` | L |
| T12 | Adicionar botão "Transparência" no card do `/founder/dashboard` | `frontend/app/components/founder/startup-card.tsx` (ou actions-cell) | S |
| T13 | Instalar/reactuar `react-markdown` + `rehype-sanitize` (verificar deps) | `frontend/package.json` | XS |
| T14 | Hook `useTransparencyPosts(startupId, filters)` (TanStack Query) | `frontend/app/hooks/use-transparency-posts.ts` | S |
| T15 | Hook `useCreateTransparencyPost` / `useUpdateTransparencyPost` / `useDeleteTransparencyPost` (mutations) | `frontend/app/hooks/use-transparency-mutations.ts` | S |
| T16 | Atualizar `AGENTS.md` do módulo | `frontend/app/routes/private/AGENTS.md` + `frontend/app/components/transparency/AGENTS.md` | XS |

### Fase 3 — Docs e Validação (mesma sprint)

| # | Tarefa | Arquivo | Esforço |
|---|--------|---------|---------|
| T17 | Atualizar `CASE.md` bloco `[Transparência]` (novo) | `CASE.md` | XS |
| T18 | Atualizar `routes.ts` com nova rota | `frontend/app/routes.ts` | XS |
| T19 | Atualizar `AGENTS.md` raiz do frontend | `frontend/AGENTS.md` | XS |
| T20 | Teste E2E Playwright (frontend): founder posta, investor com token vê | `frontend/test/e2e/flows/transparency.spec.ts` | M |

---

## 9. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| XSS via markdown do founder | Média | Alto | `rehype-sanitize` com whitelist conservadora; **sem** iframes/scripts/html raw |
| Founder posta dados confidenciais (CPF, salário) e LGPD cobra | Baixa | Alto | Doc告诫 no editor; disclaimer visual "Conteúdo visível para todos os token-holders"; audit log de ações |
| Investor vê post de outro investor (NÃO deveria — só vê posts do founder) | Zero | — | PRD garante: posts são todos do founder. Validação adicional no service |
| Token expirado / campaign paid-out — investor perde acesso | Baixa | Médio | Documentar no PRD; tokens não expiram na implementação atual (decisão consciente) |
| Performance: lista de posts fica lenta com 1000+ posts | Baixa | Médio | Paginação obrigatória (`limit: 10, page: 1`); índice em `(startupId, publishedAt DESC)` |
| Conflito com rota `/startups/:id` (já existe) | Baixa | Baixo | Rota nova `/startups/:id/transparency` — RR resolve por especificidade |
| `/founder/dashboard` precisa mostrar startup DRAFT (ainda não campanha) | Baixa | Baixo | Botão "Transparência" só aparece se `campaign.status IN (OPEN, CLOSED, FUNDED)` |
| Audit log ausente (compliance) | Média | Médio | Fora desta sprint; flag `compliance-audit-required` no log do service |

---

## 10. Critérios de Aceitação (Gherkin)

```gherkin
Funcionalidade: Transparência da Startup

Cenário: Founder posta atualização
  Dado um founder autenticado da startup X
  Quando acessa /startups/X/transparency e clica "Postar atualização"
  E preenche título, conteúdo (markdown) e tipo=FINANCEIRO
  E clica "Publicar"
  Então o post aparece no topo do feed
  E retorna 201 Created com {id, title, publishedAt}

Cenário: Investor com token vê a página
  Dado um investor que comprou tokens da startup X
  Quando acessa /startups/X/transparency
  Então vê a lista de posts ordenada por mais recente
  E pode clicar em um post para ver detalhes

Cenário: Investor SEM token recebe 403
  Dado um investor logado que NÃO tem tokens da startup X
  Quando tenta acessar /startups/X/transparency
  Então recebe 403 com mensagem "Você precisa comprar tokens desta startup"
  E vê CTA "Quero investir" → link para /startups/X

Cenário: Anônimo redireciona para /login
  Dado um visitante sem cookie de sessão
  Quando tenta acessar /startups/X/transparency
  Então é redirecionado para /login

Cenário: Founder pode editar post próprio
  Dado um founder autenticado da startup X
  E um post existente que ele criou
  Quando clica em "Editar" e altera o título
  Então o post reflete a mudança imediatamente
  E updatedAt é atualizado

Cenário: Founder NÃO pode editar post de outro founder
  Dado um founder da startup X
  E um post criado por outro founder (co-fundador) na mesma startup X
  Quando tenta editar
  Então recebe 403 "Você não é o autor deste post"

Cenário: Admin pode editar qualquer post
  Dado um ADMIN
  Quando edita um post de qualquer startup
  Então a edição é aceita

Cenário: Filtros funcionam no feed
  Dado 10 posts (5 FINANCEIRO, 3 PRODUTO, 2 SOCIETARIO)
  Quando filtro por type=FINANCEIRO
  Então vejo apenas 5 posts

Cenário: Markdown é sanitizado
  Dado um founder posta conteúdo com "<script>alert('xss')</script>"
  Quando um investor abre o post
  Então o script NÃO é executado
  E aparece apenas texto plano
```

---

## 11. Definição de Done

### Must-have (bloqueia release)
- [ ] Schema `TransparencyPost` + migration aplicada
- [ ] Endpoints REST funcionando (POST/GET/PATCH/DELETE)
- [ ] `TokenGateGuard` bloqueia sem-token com 403
- [ ] Frontend renderiza feed + detalhe + editor
- [ ] Markdown sanitizado (zero XSS)
- [ ] Botão "Transparência" aparece no `/founder/dashboard`
- [ ] Testes E2E backend cobrem cenários do PRD §10
- [ ] Teste E2E frontend cobre fluxo principal

### Nice-to-have (follow-up)
- [ ] Agrupar `/investor/dashboard` por startup (escopo separado — ver Anexo A)
- [ ] Audit log de compliance (S28)
- [ ] Notificações push/email quando novo post é publicado (S28)
- [ ] Marcação "CONFIDENCIAL" em posts sensíveis (LGPD)

---

## 12. Timeline Estimada

| Dia | Atividade |
|-----|-----------|
| D1-D2 | T1-T6 (backend: schema, módulo, controller, service, guard, DTOs) |
| D3 | T7 (testes E2E backend) + T8 (registrar módulo) |
| D4 | T9-T13 (frontend: BFF, página, componentes) |
| D5 | T14-T16 (hooks, mutations, AGENTS.md) |
| D6 | T17-T20 (docs + teste E2E frontend) |

Total: **~6 dias úteis (1 sprint)**

---

## 13. Checklist de Aprovação

Antes de iniciar a implementação, confirmar com o time:

- [ ] Modelo de dados `TransparencyPost` está correto (campos, índices, soft-delete)
- [ ] Regra de gating é simples: existência de Token (não importa status de campaign) — OK?
- [ ] Não-objetivos (chat, comentários, likes, notificações) estão realmente fora do escopo?
- [ ] Founder sem ADMIN pode editar posts de outro founder da mesma startup? **Decisão recomendada: NÃO** — apenas o autor ou ADMIN.
- [ ] Lista de startups no `/investor/dashboard` agrupada por startup é follow-up ou escopo? (PRD assume **follow-up** — ver Anexo A)
- [ ] Markdown sanitizado (sem HTML raw) é suficiente ou precisa de editor rich-text (TipTap, Lexical)?
- [ ] Audit log é obrigatório nesta sprint ou S28?
- [ ] Notificações ao publicar (S28) é OK?

---

## Anexo A — Lista de Startups no `/investor/dashboard` (follow-up, fora do escopo)

**Contexto:** O usuário mencionou "do lado do investidor onde vai listar as startups que o investidor comprou tokens". Hoje, `/investor/dashboard` lista investimentos (não agrupados por startup). O backend já tem o endpoint `/investments/my-startups` que retorna startups agregadas.

**Estado atual:**
- ✅ Backend: `GET /investments/my-startups` retorna `{ startups: [{ startupId, nome, logo, totalInvestido, totalTokens, currentValue }], totalStartups, totalInvestido, currentValueTotal }`
- ✅ `founder-dashboard.tsx` JÁ consome esse endpoint (linha 100) — fundador que também é investidor vê essas startups no `/founder/dashboard`
- ❌ `investor-dashboard.tsx` NÃO consome — mostra lista de investimentos plana

**Decisão recomendada:** implementar como **sprint separada** (S27 ou S28) porque:
1. Mudança no `investor-dashboard.tsx` afeta UX core do investidor
2. Requer decidir layout (lista agrupada vs. cards vs. tabela)
3. Precisa migração de UX — analytics antigos (ROI etc.) podem quebrar
4. Vale a pena coletar feedback dos founders primeiro

**Esta sprint:** apenas adicionar (opcional) um card pequeno em `/investor/dashboard` apontando "Minhas startups (3)" → link futuro para uma página dedicada. Sem refatoração da página.

---

## Anexo B — Histórico de Versões do PRD

| Data | Versão | Autor | Mudança |
|------|--------|-------|---------|
| 2026-08-14 (original) | rascunho | usuário | Ideia vaga: relatórios + tópicos + mensagens |
| 2026-08-14 (esta versão) | Draft 1 | agente | Foco em transparência + relatórios + gating por token; corta chat/comentários/likes |
