# Transparency

**Propósito:** Pagina `/founder/startups/:id/transparencia` com **2 secoes** (TRANSP-03/04): Post Principal Vigente em destaque + feed de Discussao (sticky/upvote/taxonomia/busca/anonimato). Visivel para fundador, token-holder e ADMIN.

> **Atualizado Sprint S36 — FIN-11 §8.2:** a aba "Atualizacoes" agora tem **secao dedicada** (`InstallmentReportsSection`) com auto-posts de InstallmentRequest aprovada, renderizada **acima** do feed manual. O label "Discussao" virou "Chat por Topicos" (helper text explicativo).

**Localizacao:**
- Rota: `/founder/startups/:id/transparencia?tab=discussao` (shell ≤ 60 linhas)
- Arquivo: [app/routes/private/founder.startups.$id.transparencia.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/routes/private/founder.startups.$id.transparencia.tsx)
- Shell: [app/components/transparency/transparency-shell.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/transparency-shell.tsx)
- API BFF: `/api/transparency/startups/:startupId/{posts,discussions,featured-report}`, `/api/transparency/discussions/:id/{upvote,pin,replies}`, `/api/transparency/replies/:replyId`

**Dependencias:**
- `[../../hooks/use-transparency-posts]`, `[use-transparency-mutations]` — Atualizacoes (TRANSP-03)
- `[../../hooks/use-transparency-featured-report]` — Post vigente
- `[../../hooks/use-transparency-discussions]` — Lista de discussions (q, category, sort)
- `[../../hooks/use-transparency-discussion-mutations|upvote|pin]` — Mutations Discussion
- `[../../types/transparency]` — TransparencyPost + TransparencyDiscussion + TransparencyReply
- `[react-markdown]` + `[rehype-sanitize]` + `[remark-gfm]` — markdown sanitizado (XSS prevention)

**Layout (do topo para baixo):**
1. Header (back + nome + botao "Postar atualizacao" se founder)
2. **FeaturedReportCard** — Post vigente do mes (FINANCIAL_REPORT). Se 204/null NAO renderiza nada.
3. **TabNav** (`?tab=discussao`) — Atualizacoes | Discussao
4. Conteudo da aba:
   - **Atualizacoes**: FilterChips (tipo) + lista paginada + criar/editar/deletar
   - **Discussao**: SearchBar (busca+sort+categoria) + StickyPin (fixada) + lista DiscussionCard + Nova thread

**Decisoes de UI (TRANSP-04 DECs):**
- authorPublicId: anonimo = "Nome U." / identificado = nome completo. NUNCA cpf/email/phone.
- title 10..200, content 20..10000. Editar/deletar: ate 24h (autor) ou sempre (ADMIN).
- Upvote: toggle idempotente (1 voto/usuario/discussao).
- Pin: max 1 por startup (atomicidade backend).
- Anonymous: default false; toggle explicito no editor.

**Mapa de Arquivos:**

### Aba Atualizacoes (extraidos em TRANSP-04 + FIN-11 §8.2)
- [post-card.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/post-card.tsx) — item de lista (com badge `Auto` quando `sourceType=INSTALLMENT_REQUEST`)
- [post-detail.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/post-detail.tsx) — view de detalhe (com badge `Auto: Relatorio de Solicitacao` para auto-posts)
- [post-editor.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/post-editor.tsx) — criar/editar (founder pode editar auto-posts gerados pelo sistema)
- [filter-chips.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/filter-chips.tsx) — chips de tipo
- [empty-state.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/empty-state.tsx) — sem posts
- [pagination.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/pagination.tsx) — anterior/proxima
- [access-denied-card.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/access-denied-card.tsx) — CTA "Quero investir"
- [transparency-posts-list.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/transparency-posts-list.tsx) — feed manual (EXCLUI auto-posts com `sourceType=INSTALLMENT_REQUEST` para nao duplicar com a secao dedicada)
- [transparency-featured-report.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/transparency-featured-report.tsx) — Post vigente
- [transparency-tabs.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/transparency-tabs.tsx) — TabNav ("Atualizacoes" | "Chat por Topicos" + helper text) + helper `readTabFromSearch`
- [transparency-shell.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/transparency-shell.tsx) — orquestra header + featured + tabs + InstallmentReportsSection + posts/discussions
- [installment-reports-section.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/installment-reports-section.tsx) — **NOVO Sprint S36**: grid de cards com auto-posts de InstallmentRequest aprovada, renderizado acima do feed manual
- [_shared.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/_shared.ts) — constants/labels/formatters compartilhados

### Aba Discussao (TRANSP-04)
- [discussion-search-bar.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/discussion-search-bar.tsx) — busca+sort+categoria
- [discussion-sticky-pin.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/discussion-sticky-pin.tsx) — badge "Fixada"
- [discussion-card.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/discussion-card.tsx) — ThreadCard
- [discussion-list.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/discussion-list.tsx) — lista (sem pinned)
- [discussion-feed.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/discussion-feed.tsx) — orquestrador (sticky + lista)
- [discussion-thread-view.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/discussion-thread-view.tsx) — thread expandida
- [discussion-editor.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/discussion-editor.tsx) — modal criar/editar
- [discussion-upvote-toggle.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/discussion-upvote-toggle.tsx) — botao toggle
- [discussion-replies.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/discussion-replies.tsx) — replies + form
- [discussion-confirm-delete.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/discussion-confirm-delete.tsx) — modal confirm delete
- [discussion-confirm-pin.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/discussion-confirm-pin.tsx) — modal confirm pin

### Testes (Vitest)
- [discussion-card.test.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/__tests__/discussion-card.test.tsx)
- [discussion-upvote-toggle.test.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/__tests__/discussion-upvote-toggle.test.tsx)
- [discussion-editor.test.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/__tests__/discussion-editor.test.tsx)
- [discussion-confirm-delete.test.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/__tests__/discussion-confirm-delete.test.tsx)
- [installment-reports-section.test.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/transparency/__tests__/installment-reports-section.test.tsx) — **NOVO Sprint S36** (loading/error/empty/grid/link)

**Regras de Acesso:**
- Founder da startup: cria/edita/deleta posts + threads; fixa threads
- Token-holder: le tudo (read-only); vota em discussions; responde threads
- Outros: 403 com CTA "Quero investir" -> link para `/startups/:id`
- ADMIN: bypass total; pode fixar/destfixar/deletar sempre

**Referencia:** scripts/PRD_PAGINA_TRANSPARENCIA.md + CASE.md §Transparencia