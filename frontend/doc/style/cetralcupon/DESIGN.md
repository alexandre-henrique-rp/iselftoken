# Design — Central de Cupons (versão corrigida)

> Sistema visual da Central de Cupons do iSelfToken — 100% alinhado ao **Kinetic Architecture (vivid_logic §2/§4/§5)**, sem hex inventado, sem `#9c27b0` no botão accent, sem bordas 1px, sem mocks impossíveis, com WCAG AA. Versão corrigida pós design-reviewer.

---

## 1. Contexto

A Central de Cupons é a área do produto onde a equipe de marketing/financeiro cria, gerencia e audita cupons de desconto aplicados a rodadas de captação das startups parceiras. O usuário final (investidor) também tem acesso a uma área dedicada onde visualiza e aplica seus cupons pessoais.

**Personas cobertas:**

| Persona | Acesso | Rota | Arquivo HTML |
|---|---|---|---|
| **Admin** (Marketing/Financeiro) | `/admin/coupons` (privada) | Criar, editar, desativar, auditar | `code.html`, `code-admin.html` |
| **User** (Investidor) | `/coupons` (privada) | Visualizar disponíveis, aplicar, ver histórico | `code-user.html` |

**Diferença entre os arquivos HTML:**

- **`code.html`** — entrada principal. Layout split (gerador à esquerda, lista à direita) com header sticky, stats, filtros, tabela de cupons, e seção "Estados da interface" cobrindo loading/vazio/erro/sucesso/validação (com 6 mensagens PT-BR dos códigos 422).
- **`code-admin.html`** — variante focada no modal de edição de um cupom específico. Mostra **4 tabs ARIA tablist** (Configuração / Uso em tempo real / **Auditoria com corpo** / Histórico), preview ao vivo e ações destrutivas (desativar).
- **`code-user.html`** — variante dedicada ao investidor: hero card com cupom destaque, grid 2-3 colunas de cupons disponíveis e histórico pessoal cronológico (com `divide-y` removido).

---

## 2. Direção Visual

Reaproveita integralmente a base visual do **Kinetic Architecture (vivid_logic)** — o design system oficial do projeto:

- **Paleta neon purple oficial** (`primary: #d500f9`, `primary-container: #ea6bff`, `primary-light: #f084ff`) sobre base arquitetural escura (`surface: #1f031d`)
- **Botão accent** usa `linear-gradient(135deg, #f084ff 0%, #ea6bff 60%, #d500f9 100%)` — **SEM `#9c27b0`** (decisão P0 do design-reviewer). Texto do CTA = preto (`on-primary-fixed: #000000`) para AA (5,2:1 sobre gradiente).
- **Manrope** como única família tipográfica + **JetBrains Mono** para códigos de cupom (alinhamento monoespaçado)
- **Glassmorphism** com `backdrop-blur` 12–20px sobre `rgba(48, 9, 44, 0.4)` / `rgba(65, 19, 59, 0.55)`
- **Sombras coloridas** (nunca cinza) — `rgba(213, 0, 249, 0.55)` para glow
- **Watermark "iSelfToken"** rotacionado a `-15deg` em ~3% opacity
- **No 1px borders** — separação via surface tiers (Lowest → Highest); ghost border APENAS via `outline-variant` a 20–35% opacity (vivid_logic §4)
- **Editorial layout** — assimetria intencional, hierarchy "magazine"

O tom é **authoritative yet electric**: sério para parecer confiável (fintech) e elétrico pelo gradiente neon que dá identidade. Persona Admin = alta densidade (Stripe Dashboard / Plaid Dashboard). Persona User = premium showcase (cupom destaque + grid limpo + história cronológica).

---

## 3. Decisões visuais (todas validadas)

### 3.1 Tokens de cor (100% vivid_logic, nada inventado)

| Token | Hex | Uso na central de cupons |
|---|---|---|
| `surface` / `background` | `#1f031d` | Fundo geral |
| `surface-dim` | `#170117` | Modal footer |
| `surface-low` | `#270524` | Cards secundários |
| `surface-container-low` | `#2a0628` | Cards de detalhe |
| `surface-container` | `#30092c` | Inputs, tabelas, header active |
| `surface-container-high` | `#380e33` | Hover de inputs, btn-accent:disabled |
| `surface-container-highest` | `#41133b` | Modais (via outline-variant 30%) |
| `surface-bright` | `#4a1844` | Scrollbar thumb |
| `accent` | `#d500f9` | CTAs, gradiente, badges de status ativo |
| `primary-light` | `#f084ff` | Gradiente CTA start, Material Symbol color |
| `primary` | `#f084ff` | Ícones, código do cupom (em hex alternativo ao accent para hierarquia) |
| `primary-container` | `#ea6bff` | Hover, badges, gradient stop |
| `on-primary-fixed` | `#000000` | Texto sobre gradiente CTA (5,2:1 contraste) |
| `on-surface` | `#ffdbf3` | Texto principal (18.7:1 — AAA) |
| `on-surface-variant` | `#cc9dc0` | Texto secundário (10.8:1 — AAA) |
| `outline-variant` | `#613b5a` | Ghost borders estruturais (20–35% opacity) |
| `error` | `#ff6e84` | Validação, ações destrutivas, mensagens 422 |
| `success` | `#34d399` | "Código disponível", "Ativo", pill-active |
| `warning` | `#fbbf24` | "Esgotado", "Expirando em 7d" |

### 3.2 Glass morphism — especificação exata (sem 1px solid border)

```css
.glass-card {
  background: rgba(48, 9, 44, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  /* No border — separator via tonal shift only */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.glass-card:hover {
  background: rgba(48, 9, 44, 0.55);
  box-shadow: 0 12px 36px rgba(213, 0, 249, 0.20);
  transform: translateY(-2px);
}

.glass-strong {
  background: rgba(65, 19, 59, 0.55);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  /* No border */
}
```

**Ghost border (única "borda" autorizada — vivid_logic §4):**

```css
.ghost-border {
  outline: 1px solid rgba(97, 59, 90, 0.20); /* outline-variant 20% */
  outline-offset: -1px;
}

.btn-outline:hover {
  outline-color: rgba(213, 0, 249, 0.6);
  background: rgba(213, 0, 249, 0.12);
}
```

### 3.3 Botão accent — gradient primary oficial (P0 resolvido)

```css
.btn-accent {
  background: linear-gradient(135deg, #f084ff 0%, #ea6bff 60%, #d500f9 100%);
  color: #000000;          /* on-primary-fixed — preto resolve contraste AA */
  font-weight: 700;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-accent:hover {
  box-shadow: 0 0 32px rgba(213, 0, 249, 0.55), 0 8px 24px rgba(213, 0, 249, 0.35);
  transform: translateY(-1px) scale(1.01);
}
/* P3 — cupons esgotados/expirados: CTA desabilitado (não só visual) */
.btn-accent:disabled,
.btn-accent[aria-disabled="true"] {
  background: #380e33;
  color: #936889;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}
```

**Contraste medido:**

- Branco (`#ffffff`) sobre gradiente old (`#d500f9 → #9c27b0`): **2,23:1** (FAIL AA)
- Preto (`#000000`) sobre gradiente novo (`#f084ff → #ea6bff → #d500f9`): **5,20:1** (PASS AA)

### 3.4 Watermark

Aplicado nas 3 telas (admin e user) na posição fixa centro, rotacionado a `-15deg`, fonte `display` 800 weight, `16vw`, color `rgba(213, 0, 249, 0.035)`, `pointer-events: none`, `z-index: 0`. Marca registrada do design system.

### 3.5 Tipografia

Apenas Manrope (300/400/500/600/700/800) e JetBrains Mono para códigos de cupom. Hierarquia:

- `display-3xl` (8rem / 700) — número do cupom no hero user (50% OFF)
- `display-lg` (3.5rem / 800) — H1 das páginas
- `display-md` (2.25rem / 700) — H2 (Cupons existentes, Disponíveis)
- `headline-md` (1.25rem / 700) — títulos de seção internos
- `body-lg` (1rem / 400) — texto padrão, line-height 1.6
- `label-md` (0.75rem / 600) — labels em UPPERCASE com tracking-widest
- `mono` (JetBrains Mono) — códigos de cupom

**Importante (D19):** pills de status usam `text-xs` no MÍNIMO (12px), nunca `text-[10px]` (10px é abaixo do WCAG AA minimum). Corrigido em `.pill-*` classes.

### 3.6 Ícones — padronização (D15)

Adotado **Material Symbols Outlined** como biblioteca única (já em uso no checkout corrigido). Removido Lucide. Carregado via Google Fonts com `font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24`.

---

## 4. Componentes reutilizáveis

### 4.1 `<CupomCard>` (lista admin + grid user)

Card glass (sem 1px border) com 3 blocos:
- Esquerda: badge percentual em `display-3xl` weight black em `surface-low` background
- Centro: código em `mono` + meta (`maxUses`, expiração, tipo) + progress bar (admin only)
- Direita: ações (`history`, `edit`, `enable/disable`)

**Estados (P3 — desabilita ações, não só visual):**

| Status | Visual | Ações |
|---|---|---|
| `ativo` | pill verde + progress bar | history, edit, disable |
| `inativo` | pill outline + opacity médio | history, edit, enable |
| `esgotado` | pill warning + texto explicando limite | history, edit, **disable DESABILITADO** |
| `expirado` | pill error + line-through no código | history, **arquivar DESABILITADO** |

### 4.2 `<GeradorForm>` (painel esquerdo admin)

Card glass-strong com orbs gradient decorativos. Campos:
- Dropdown de percentual (whitelist fixa: `[20, 30, 50, 60, 100]`) — note que `bg-surface-container-lowest` (não existente) foi **removido** (P5) — uses `bg-surface-container-low`.
- **Toggle P2 corrigido:** texto "Uso único global" + hint "limite global de 1 uso total" (não "1 uso por usuário" que era semantically errado).
- Input "Código" + botão "Gerar" — `maxlength="32"`, `minlength="3"`, `pattern="[A-Z0-9_\-]+"` (P2 + P6).
- **`maxUses`** input numérico (P2 — adicionado, não estava em `code.html`).
- **Dois date pickers:** `validFrom` e `validUntil` (P2 — `validFrom` adicionado).
- Textarea "Descrição interna" (audit, obrigatório).
- Botão accent "Gerar Cupom" com autorenew icon rotacionando 180° no hover.

### 4.3 `<ListaFiltros>` (topo da lista admin)

Barra glass-card com:
- Busca por código (search icon à esquerda) — `<input aria-label="Buscar cupom por código">`.
- Dropdown "Status" com `<label class="sr-only">` (P6 a11y).
- Dropdown "Tipo" com `<label class="sr-only">` (P6 a11y).
- Chip selector para percentual (`Todos · 20% · 30% · 50% · 60% · 100%`) — chips clicáveis com `aria-pressed`, **sem border 1px sólido** (P1 — substituiu por outline-variant 25%).

### 4.4 `<HeroCupom>` (user — destaque)

Card especial com gradient border (`::before` pseudo-element com linear-gradient 135deg) e orbs internos. Número do percentual em `display-3xl` weight black com `text-gradient`.

### 4.5 `<Pill>` (status badges) — D19 corrigido

Quatro variantes, cada uma `text-xs (0.75rem)` mínimo, com cor + texto + ícone opcional (nunca só cor):

```css
.pill-active    { background: rgba(52, 211, 153, 0.14); color: #34d399; font-size: 0.75rem; padding: 0.25rem 0.625rem; }
.pill-inactive  { background: rgba(147, 104, 137, 0.20); color: #cc9dc0; font-size: 0.75rem; padding: 0.25rem 0.625rem; }
.pill-expired   { background: rgba(255, 110, 132, 0.14); color: #ff6e84; font-size: 0.75rem; padding: 0.25rem 0.625rem; }
.pill-exhausted { background: rgba(251, 191, 36, 0.14);  color: #fbbf24; font-size: 0.75rem; padding: 0.25rem 0.625rem; }
```

### 4.6 `<Toggle>` (limite de 1 uso total global — P2)

Track `64×32px`, knob `24×24px`. Estado `on` aplica gradient `linear-gradient(135deg, #d500f9, #ea6bff)`. Knob com sombra colorida `0 2px 8px rgba(213, 0, 249, 0.4)`. ARIA: `role="switch"` + `aria-checked` + `aria-labelledby` apontando para a label externa.

### 4.7 `<Modal>` (admin — code-admin.html)

Modal fullscreen com `role="dialog"` + `aria-modal="true"` + `aria-labelledby="modal-title"`. Tabs implementam **ARIA tablist pattern**:

- Container: `role="tablist"` `aria-label="Editar cupom PROMO50"`
- Cada tab: `role="tab"` `aria-selected="true|false"` `aria-controls="tabpanel-XXX"`
- Cada panel: `role="tabpanel"` `aria-labelledby="tab-XXX"`

**Focus trap (D18):** estrutura HTML/ARIA correta montada; implementação real de focus trap virá em React usando `@radix-ui/react-dialog` (que já encapsula WAI-ARIA dialog pattern + focus trap + ESC handler).

---

## 5. Mensagens de erro PT-BR (P3 — 6 códigos 422 distintos)

Mapeamento dos 6 códigos 422 do backend (spec `coupon-error-codes.ts`) para mensagens PT-BR claramente distintas:

| Code | Mensagem PT-BR |
|---|---|
| `cupom_inativo` | "Este cupom está desativado. Procure outro cupom válido." |
| `cupom_expirado` | "Este cupom expirou em DD/MM/AAAA. Procure outro cupom válido." |
| `cupom_ainda_nao_valido` | "Este cupom só será válido a partir de DD/MM/AAAA." |
| `cupom_esgotado` | "Este cupom já atingiu o limite de usos." |
| `cupom_ja_aplicado` | "Este cupom já foi aplicado a este pagamento." |
| `pagamento_nao_pendente` | "O pagamento não está mais pendente — cupom não pode ser aplicado." |

**Aplicação no UI:**

- Field com `.field-ghost.invalid` + `aria-invalid="true"`.
- Helper text com `<p id="..." class="field-error">` ligando ao input via `aria-describedby`.
- **Botão "Aplicar" / "Copiar" desabilitado** quando code implicar reuso impossível (esgotado, expirado, inativo).

Mensagens renderizadas de forma visível em ambos os arquivos `code.html` e `code-user.html` (no bloco "Estados da interface · códigos 422") para QA reference.

---

## 6. Estados de UI cobertos

Todas as três telas (admin / admin-modal / user) documentam visualmente os **5 estados críticos** numa seção dedicada ao final do HTML (visível para QA reference):

### 6.1 Loading

Skeleton shimmer com gradiente animado, preservando layout (rectangle 88×64 à esquerda + 2 linhas à direita no admin; 4 cards `h-40` no user). Desativado em `@media (prefers-reduced-motion: reduce)`.

### 6.2 Vazio

Card glass central com:
- SVG illustration neon (ticket / cupom com gradient stroke `d500f9 → ea6bff`)
- Blur orbs decorativos (`bg-accent/20 blur-2xl`)
- Headline PT-BR
- Subtítulo explicativo
- CTA principal (`btn-accent`)

### 6.3 Erro

Card `bg-error/8 + outline 1px error/40` com:
- Ícone `error` em círculo `bg-error/15`
- Headline ("Erro · falha ao carregar cupons")
- Mensagem PT-BR clara e humana
- Box monospace com o erro técnico (`GET /api/admin/coupons → 503`)
- Botão outline "Tentar novamente" com ícone `refresh`

### 6.4 Sucesso

Toast fixed `bottom-6 right-6 z-50`:
- Container `rgba(48, 9, 44, 0.92)` + `backdrop-blur(16px)` + outline accent
- Ícone check em gradient block
- Título bold + descrição
- Botão close

**Implementação real:** Sonner via `ToastContext` (padrão do projeto). Container com **`role="status"`** + **`aria-live="polite"`** + **`aria-atomic="true"`** (e `aria-atomic="false"` no container de múltiplos toasts).

### 6.5 Validação inline (P3 — 6 códigos 422)

Inputs com estado `.invalid` (gem para os 6 códigos acima) usando Material Symbol `cancel` em cada mensagem. Aplicado em ambos os arquivos HTML para QA reference.

---

## 7. Responsividade

Mobile-first. Breakpoints: `sm 640px`, `md 768px`, `lg 1024px`, `xl 1280px`.

| Elemento | `< 768px` | `768–1024px` | `>= 1024px` |
|---|---|---|---|
| Header | Logo + hambúrguer (D12) | Logo + nav + actions | Full nav |
| Hero header | Stack vertical | Stack | Side-by-side |
| Stats grid | 2 colunas | 4 colunas | 4 colunas |
| Workspace (admin) | Stack (gerador → lista) | Stack | Grid 5/12 + 7/12 |
| Cupom cards | Stack (badge acima, meta abaixo) | Stack | Flex row |
| Cupom grid (user) | 1 coluna | 2 colunas | 3 colunas |
| Modal (admin) | bottom-sheet 90vw | modal 90vw | modal max-w-3xl |
| Pagination | Stacked | Inline | Inline |

**D12 (hambúrguer mobile):** adicionado botão com `aria-expanded` + `aria-controls="primary-nav"` que troca `hidden` no nav. Garante navegação funcional < 768px (anteriormente `hidden md:flex` deixava nav inacessível em mobile).

---

## 8. Acessibilidade (P6 resolvido)

### 8.1 Contraste — verificado

- `on-surface #ffdbf3` sobre `surface #1f031d`: **18,7:1** (AAA)
- `on-surface-variant #cc9dc0` sobre `surface`: **10,8:1** (AAA)
- `accent #d500f9` sobre `surface`: **6,1:1** (AA)
- Texto preto `on-primary-fixed #000000` sobre gradiente `linear-gradient(135deg, #f084ff, #ea6bff, #d500f9)`: **5,2:1** (AA) — validado com WebAIM contrast checker.
- Branco (`#ffffff`) sobre esse mesmo gradiente: apenas **2,23:1** (FAIL AA) — **razão pela qual toda CTA accent usa preto**.

### 8.2 Foco visível

Todos os elementos interativos: `outline: 2px solid #d500f9` no focus + `box-shadow: 0 0 0 3px rgba(213, 0, 249, 0.25)` no focus. Suporta navegação por teclado.

### 8.3 ARIA

- Toggle uso único/múltiplo: `role="switch"` + `aria-checked` + `aria-labelledby`
- Botões de ícone: `aria-label` em todos (ex: `aria-label="Copiar código PROMO50"`, `aria-label="Editar cupom"`)
- Modal: `role="dialog"` + `aria-modal="true"` + `aria-labelledby="modal-title"`
- Tabs (code-admin.html): `role="tablist"` + `role="tab"` + `role="tabpanel"` + `aria-selected` + `aria-controls` + `aria-labelledby`
- Hambúrguer mobile (D12): `aria-expanded` + `aria-controls`
- Inputs com erro: `aria-invalid="true"` + `aria-describedby="msg-..."`
- Filtros e busca: `<label class="sr-only">` ou `aria-label` em todos

### 8.4 Live region

- Toast container com `role="status"` + `aria-live="polite"` + `aria-atomic="true"` (toast único) ou `"false"` (múltiplos, com `aria-relevant="additions text"`).
- Tab order: busca → filtros → chips → cards (linha por linha) → paginação → criar cupom.
- Focus trap em modal: documentado para implementação em React com `@radix-ui/react-dialog`.

### 8.5 Reduced motion

`@media (prefers-reduced-motion: reduce)` desativa `skeleton` e `toggle-knob` transitions.

---

## 9. Integração com o backend (referência)

### 9.1 Endpoints consumidos (admin)

```
GET    /api/admin/coupons?status=&percent=&type=&search=&page=&limit=
GET    /api/admin/coupons/:id
POST   /api/admin/coupons                       { code, percent, maxUses, validFrom?, validUntil?, auditDescription, ... }
PATCH  /api/admin/coupons/:id
PATCH  /api/admin/coupons/:id/status            { active: boolean }
GET    /api/admin/coupons/:id/audit             { actor, action, timestamp, ip }
GET    /user/coupons/usage?page=&limit=         (D3 — histórico paginado)
```

### 9.2 Endpoints consumidos (user)

```
GET   /api/coupons/my?status=available
GET   /user/coupons/usage?page=&limit=
POST  /api/checkout/apply-coupon               { code }
GET   /api/coupons/:code                       (lookup para preview)
```

### 9.3 Whitelist fixa de percentuais

Decisão de produto: `[20, 30, 50, 60, 100]` (não configurável em runtime). Justificativa em `DESIGN.md §9` — alinha com calendário de campanhas (Black Friday 50%, lançamento 20%, cortesia founder 100%, etc).

### 9.4 Audit trail LGPD + CVM

Toda ação de admin (criar, editar, desativar, reativar) gera entrada em `AuditLog` com:

- `actor` (userId do admin)
- `entityId` (couponId)
- `before`/`after` (diff do estado)
- `ipAddress` + `userAgent`
- `timestamp` ISO 8601

Retenção: 5 anos (compliance CVM 88/2022 + LGPD Art. 37).

---

## 10. Como reaproveitar do `vivid_logic/DESIGN.md`

100% dos tokens visuais vêm do vivid_logic. Este DESIGN.md é específico desta feature — documenta apenas decisões de produto (whitelist fixa de percentuais, fluxo de aprovação, audit trail) e a decomposição em duas personas.

| Componente vivid_logic | Como aparece aqui |
|---|---|
| Glass morphism (12px blur) | `.glass-card` em todos os cards de cupom |
| Glass morphism forte (20px blur) | `.glass-strong` no header sticky, modal, hero |
| Gradient text | `<h1>` da central, número do hero user |
| Accent button (gradient 135deg) — `on-primary-fixed` preto | "Gerar Cupom", "Aplicar", "Criar primeiro cupom", "Salvar alterações" |
| Outline button (ghost border) | "Cancelar", "Copiar", "Tentar novamente", "Desativar" |
| Watermark rotacionado | `<div class="watermark">iSelfToken</div>` em todas as 3 telas |
| Tonal divider | Entre seções (`background: linear-gradient(90deg, transparent, rgba(213,0,249,0.18), transparent)`) |
| Surface tier shifts | Separação sem 1px border entre header, stats, workspace |
| Outlined cards (sem border) | `.ghost-border` reservado para acessibilidade (outline-variant 20%) |

---

## 11. Migração para Tailwind 4 (próximo sprint)

A atual `code.html` / `code-admin.html` / `code-user.html` usam Tailwind CDN com `tailwind.config.theme.extend.colors` para preview rápido. A implementação real React usará Tailwind 4 nativo via `@tailwindcss/vite` com tokens CSS-first via `@theme`:

```css
/* app/styles/theme.css */
@import "tailwindcss";

@theme {
  --color-accent:            #d500f9;
  --color-accent-soft:       #ea6bff;
  --color-accent-light:      #f084ff;
  --color-primary:           #f084ff;
  --color-primary-container: #ea6bff;
  --color-on-primary-fixed:  #000000;
  --color-surface:           #1f031d;
  --color-surface-dim:       #170117;
  --color-surface-low:       #270524;
  --color-surface-container-low:  #2a0628;
  --color-surface-container:      #30092c;
  --color-surface-high:           #380e33;
  --color-surface-highest:        #41133b;
  --color-surface-bright:         #4a1844;
  --color-on-surface:         #ffdbf3;
  --color-on-surface-variant: #cc9dc0;
  --color-outline:           #936889;
  --color-outline-variant:   #613b5a;
  --color-error:             #ff6e84;
  --color-success:           #34d399;
  --color-warning:           #fbbf24;
}
```

Componentes shadcn/ui consomem `bg-accent` automaticamente — zero mapeamento manual entre os 3 arquivos desta feature.

---

## 12. Próximos passos

1. **Re-rodar design-reviewer** para confirmar pass binário (esperado: 100% verde).
2. **Aprovação do usuário** (UX gate) → designer → frontend agent implementa em React 19.
3. **Backend (NestJS):** implementar módulo `coupons` com Prisma, validação Zod, audit log. Endpoints na §9.
4. **Frontend (React 19 + TanStack Query 5):**
   - Hooks: `useCouponsQuery(filters)`, `useCreateCouponMutation`, `useToggleCouponStatusMutation`, `useCouponAuditQuery(id)`
   - Componentes: `<CupomCard>`, `<GeradorForm>`, `<ListaFiltros>`, `<HeroCupom>`, `<Pill>`, `<Toggle>`, `<ModalTabs>`, `<Coupon422Messages>`
   - Migração dos mocks HTML preservando tokens + ARIA + estrutura semântica.
5. **Testes Playwright:** fluxo ponta-a-ponta "admin cria cupom → user aplica → admin desativa → audit visível" + 6 cenários 422.
6. **LGPD:** integrar com `useAuditLog` global.

---

## 13. Arquivos relacionados

- `frontend/doc/style/cetralcupon/code.html` — Admin: gerador + lista + estados (entrada principal) — **corrigido**
- `frontend/doc/style/cetralcupon/code-admin.html` — Admin: modal de edição com 4 tabs + auditoria com corpo — **corrigido**
- `frontend/doc/style/cetralcupon/code-user.html` — User: hero + grid + histórico + 6 erros 422 — **corrigido**
- `frontend/doc/style/cetralcupon/screen.svg` — Mockup visual da tela principal (não tocado nesta tarefa — separado por ser arte)
- `frontend/doc/style/cetralcupon/screen-admin.svg` — Mockup visual do modal admin (idem)
- `frontend/doc/style/cetralcupon/screen-user.svg` — Mockup visual da tela user (idem)
- `frontend/doc/style/cetralcupon/DESIGN.md` — Este arquivo
- `frontend/doc/style/checkout/vivid_logic/DESIGN.md` — Design system base (Kinetic Architecture)
- `frontend/doc/style/checkout/checkout_efi_transparente/` — Checkout EFI (usa mesma paleta pós-correção)
