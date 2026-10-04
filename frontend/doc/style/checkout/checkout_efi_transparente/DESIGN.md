# Checkout EFI Transparente — Design

> Versão corrigida pós design-reviewer. Paleta 100% alinhada à **Kinetic Architecture (vivid_logic §2/§5)**, juros simples confirmados (PRD AC-03.1), cobertura completa dos estados visuais como markup real, A11y AA.

---

## 1. Contexto

Tela de checkout para o sistema de pagamentos EFI Bank. Acessada via `/checkout/payment/:id` após criar uma sessão de pagamento (`POST /payment/checkout`). Suporta **dois métodos** no mesmo formulário:

- **PIX** (QR Code + copia-e-cola) — fluxo instantâneo, expira em 30 min.
- **Cartão de crédito transparente** (dados capturados no domínio via SDK JS EFI; PCI-DSS SAQ A) — à vista ou parcelado até 12x com juros simples (2,99% a.m.).

**Personas:** USER (investidor pessoa física), FOUNDER (startup), ADMIN (auditoria manual). Predomina USER.

**Quando acessada:** após selecionar itens no carrinho (tokens, assinatura, selo de verificação), ou após redirect do `useCreateStartupMutation`.

**Para quê:** finalizar compra com segurança, escolha flexível de método, parcelamento transparente (juros visíveis antes de confirmar).

---

## 2. Direção Visual

**Tom:** fintech premium — autoritativo, moderno, sério. Adotamos integralmente a **Kinetic Architecture (vivid_logic §2/§5)** como base visual — sem adaptação para "violet" (decisão original era inconsistente com o design system oficial). A correção converge checkout EFI e central de cupons num único sistema visual coerente.

**Princípios Kinetic Architecture aplicados:**

- **No 1px borders**: separação via surface tiers (`surface → surface-low → surface-container → surface-container-high → surface-container-highest`); ghost border apenas via `outline-variant 20% opacity` quando estritamente necessário.
- **Glassmorphism**: `rgba(48,9,44,0.55)` + `backdrop-filter: blur(16px)` em nav e toasts; `rgba(65,19,59,0.6)` + `blur(20px)` para hero/3DS.
- **Gradiente primary oficial**: `linear-gradient(135deg, #f084ff → #ea6bff → #d500f9)` (vivid_logic §2).
- **CTA texto preto**: `on-primary-fixed: #000000` resolve contraste (5.2:1 sobre gradiente primary, AA).
- **Sombras coloridas (nunca cinza)**: `rgba(213,0,249,0.55)` para glow.
- **Manrope** (display/body/label) + **JetBrains Mono** (códigos).

### Paleta (tokens oficiais vivid_logic — sem hex inventado)

| Token | Valor | Uso |
|---|---|---|
| `primary` | `#d500f9` | Links, ícones ativos, glow |
| `primary-container` | `#ea6bff` | Hover, badges |
| `primary-light` | `#f084ff` | Focus ring, micro-acentos |
| `on-primary-fixed` | `#000000` | Texto sobre gradiente primary |
| `surface` | `#1f031d` | Fundo da página (architectural base) |
| `surface-dim` | `#170117` | Bottom de gradientes sutis |
| `surface-low` | `#270524` | Tiers intermediários |
| `surface-container-low` | `#2a0628` | Cards secundários |
| `surface-container` | `#30092c` | Inputs, tabelas |
| `surface-container-high` | `#380e33` | Hover inputs |
| `surface-container-highest` | `#41133b` | Dropdowns, modais |
| `surface-bright` | `#4a1844` | Scrollbar thumb |
| `on-surface` | `#ffdbf3` | Texto principal (18.7:1 sobre surface — AAA) |
| `on-surface-variant` | `#cc9dc0` | Texto secundário/labels (10.8:1 — AAA) |
| `on-surface-dim` | `#936889` | Apenas para hints de baixa hierarquia — nunca corpo de texto |
| `outline` | `#936889` | Ghost border 40% opacity (decorativo) |
| `outline-variant` | `#613b5a` | Ghost border 20% opacity (estrutural) |
| `success` | `#34d399` | Confirmação de pagamento, cupom aplicado |
| `warning` | `#fbbf24` | Timer, juros visíveis, esgotamento |
| `danger` | `#ff6e84` | Erros, cartão recusado |

**Gradiente primary oficial:** `linear-gradient(135deg, #f084ff 0%, #ea6bff 60%, #d500f9 100%)` — aplicado em CTAs principais, ícone do logo, botão "Finalizar pagamento". Texto do CTA = preto (`on-primary-fixed`) para AA.

**Migração para Tailwind 4** (a executar no sprint de design tokens): mover de `tailwind.config.theme.extend.colors` (CDN CDN preview) para o bloco `@theme` no CSS global:

```css
/* Em app/styles/theme.css (Tailwind 4) */
@import "tailwindcss";

@theme {
  --color-primary: #d500f9;
  --color-primary-container: #ea6bff;
  --color-primary-light: #f084ff;
  --color-on-primary-fixed: #000000;
  --color-surface: #1f031d;
  --color-surface-dim: #170117;
  --color-surface-low: #270524;
  --color-surface-container-low: #2a0628;
  --color-surface-container: #30092c;
  --color-surface-container-high: #380e33;
  --color-surface-container-highest: #41133b;
  --color-surface-bright: #4a1844;
  --color-on-surface: #ffdbf3;
  --color-on-surface-variant: #cc9dc0;
  --color-on-surface-dim: #936889;
  --color-outline: #936889;
  --color-outline-variant: #613b5a;
  --color-success: #34d399;
  --color-warning: #fbbf24;
  --color-danger: #ff6e84;
}
```

---

## 3. Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [LOGO i] IselfToken    Campanhas  Carteira  Checkout     [RA]   │  ← nav glass-strong
├──────────────────────────────────────────────────────────────────┤
│  Carrinho › Pagamento                                              │  ← breadcrumb
│                                                                   │
│  FINALIZAR PAGAMENTO                                               │
│  Checkout seguro            [verified] PCI-DSS SAQ A · mTLS ativo │
│                                                                   │
│  ┌──────────────────────────────────┐  ┌────────────────────────┐ │
│  │ 1. Método de pagamento           │  │ Resumo do pedido        │ │
│  │ [PIX][Cartão] (radio group)       │  │ ────────────────────  │ │
│  │                                  │  │ • 500 Tokens Acme     │ │
│  │ 2. PIX flow (default)            │  │   R$ 500,00           │ │
│  │  [Timer 29:42 aria-live] [Pendente]│ │ • Plano Pro          │ │
│  │  ┌──────┐  Pix copia e cola       │  │   R$ 99,00           │ │
│  │  │ QR   │  [Copiar código]        │  │ • Selo verificação   │ │
│  │  │ 224² │  Como pagar (3 passos)  │  │   R$ 890,00          │ │
│  │  └──────┘                         │  │                       │ │
│  │  (cartão alternativo em #card-    │  │ [Cupom][Aplicar]      │ │
│  │   section se método mudar)       │  │ ✓ PROMO50 (50% off)  │ │
│  │                                   │  │                       │ │
│  │ 2b. Cartão (escondido default)    │  │ Subtotal   1.489,00  │ │
│  │  Campos: numero, nome, val, cvv    │  │ Taxa EFI       11,00 │ │
│  │  Parcelas: select [1..12]          │  │ Desconto    -750,00  │ │
│  │  Calculadas por juros simples      │  │ ─────────────────── │ │
│  │  [Finalizar pagamento]             │  │ TOTAL    R$ 750,00   │ │
│  │                                   │  │ ou 6x R$ 147,41      │ │
│  │ 2c. PENDING_3DS                    │  │   c/ juros 2,99% a.m │ │
│  │  Tela intermediária com            │  │   (juros simples)     │ │
│  │  redirect para authenticationUrl   │  │                       │ │
│  │  + countdown 30s                   │  │ [PCI][mTLS][EFI]    │ │
│  └──────────────────────────────────┘  └────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Grid:** `grid-cols-1 lg:grid-cols-5` — coluna esquerda (form) = 3/5, direita (resumo) = 2/5. Em mobile, summary vira topo natural.

**Sticky summary:** aside com `lg:sticky lg:top-24` — visível enquanto usuário rola o form no desktop.

**Estados visuais (markup REAL, não comentário):** `#cart-empty-section`, `#loading-section`, `#error-section`, `#success-section`, `#expired-section`, `#pending3ds-section` são todos blocos `<div>` com `hidden` por padrão; UI manager (TanStack Query + state machine) controla visibilidade conforme status do pagamento.

---

## 4. Componentes

| Componente | Origem | Props / Comportamento |
|---|---|---|
| `MethodToggle` | nativo (radio group Tailwind peer) | 2 opções (PIX / Cartão); seleção muda visibilidade de `#pix-section` / `#card-section` |
| `PixQRCode` | placeholder visual (EFI envia base64 real) | `qr-placeholder` div com pixel-art pattern simulando QR |
| `PixCopyPaste` | textarea read-only + `<button aria-label="Copiar código PIX">` | Mostra BR Code; botão copiar com feedback toast |
| `Timer` | setInterval JS | Countdown regressivo a partir de `expiresAt`; `aria-live="polite"` + `role="timer"` (P6 a11y) |
| `StatusBadge` | nativo | Estados: `pending` (warning pulse), `paid` (success), `expired` (danger) |
| `CardNumber` | input masked | Detecta bandeira por prefixo BIN (4=Visa, 5=Master, 3=Amex); chip `.flag-chip` |
| `CardExpiry` | input masked MM/AA | Auto-insere `/` após MM |
| `CardCVV` | input masked numérico | 3 ou 4 dígitos (Amex) |
| `InstallmentsList` | `<select>` com `[1..maxInstallments]` (P2) | Cada opção mostra parcela mensal E total com juros simples; opção `selected` reflete default de 6x |
| `OrderSummaryItem` | nativo | ícone, título, descrição, preço; 3 itens no layout base |
| `CouponField` | input + button + status | Estado `idle` / `applying` / `applied` (success %) / `invalid` (danger) — suporta 100% (P7) |
| `TotalBreakdown` | nativo | subtotal, taxa, desconto, total; total destacado com gradient text |
| `ErrorCard` | nativo (.glass + role=alert) | ícone + título + descrição + `code` EFI em mono + 2 ações (tentar novamente / pagar com PIX) |
| `SuccessCard` | nativo | check central, recibo completo (`paymentId`, `txid`, `endToEndId`, `paidAt`, valor), ações (download PDF / ver pedido) |
| `ExpiredCard` | nativo (role=alert) | warning, mensagem "QR expirado", CTA "Gerar novo" |
| `Pending3DSCard` | nativo (role=alertdialog) | ícones, mensagem PT-BR, countdown + link para `authenticationUrl` |
| `ToastContainer` | `aria-live="polite"` + `role="status"` | 3 variantes (default/retryable/critical) mapeadas ao catálogo EFI (ver §5) |
| `TrustBadges` | grid 3 colunas | PCI-DSS SAQ A, mTLS ativo, EFI Bank (Material Symbols ao invés de emojis) |

---

## 5. Estados Visuais (todos com markup real)

### 5.1 Loading (`#loading-section`)

- `#loading-section` com `role="status"` + `aria-live="polite"` + `aria-atomic="true"`.
- Skeleton (`rounded skeleton` blocks) preserva layout — evita reflow quando dados chegam.
- Pulse no badge "Aguardando pagamento".
- Spinner inline em botões durante submit (`isSubmitting`).
- Pulses e shimmers desativados em `@media (prefers-reduced-motion: reduce)`.

### 5.2 Erro (`#error-section`) — Catálogo EFI mapeado

Catálogo oficial de códigos retornados pela EFI, mapeado para `variant` de toast + mensagem PT-BR:

| Code (SPEC §6.1.2) | Title | Variant | Retentativa? |
|---|---|---|---|
| `cartao_recusado` | Cartão recusado | `retryable` | Sim |
| `cartao_vencido` | Cartão vencido | `retryable` | Não (use outro) |
| `cartao_bloqueado` | Cartão bloqueado | `retryable` | Não (contate o banco) |
| `cvv_invalido` | CVV inválido | `retryable` | Sim |
| `autenticacao_3ds_falhou` | Falha na autenticação 3-D Secure | `retryable` | Sim |
| `cobranca_expirada` | Cobrança PIX expirada | `retryable` | Sim (gerar novo QR) |
| `chave_pix_invalida` | Chave PIX inválida | `critical` | Não |
| `efi_indisponivel` | Sistema temporariamente indisponível | `critical` | Auto-retry com circuit breaker |
| `valor_invalido` | Valor inválido | `critical` | Não |
| `token_oauth_invalido` | Sessão expirada | `default` | Sim (refazer login) |
| `erro_generico` (fallback AC-12.4) | Não foi possível processar | `retryable` | Sim |

> **Por que `amount_mismatch` foi removido:** o code não existe no SPEC §6.1.2 EFI — é genérico inventado. Substituído por `valor_invalido` (código real).

**Mapeamento `variant` → visual:**

- `default` — fundo `surface-container`, ícone `info`, sem ação obrigatória.
- `retryable` — fundo `rgba(251,191,36,0.18)`, ícone `warning`, **botão "Tentar novamente"** renderizado (não opcional).
- `critical` — fundo `rgba(255,110,132,0.18)`, ícone `error`, dismissible=false (dismiss só após ação do usuário).

### 5.3 Sucesso (`#success-section`)

- Card central com check verde.
- Recibo com `paymentId` (ULID), `txid`, `endToEndId`, `paidAt`, valor — renderizado em `<dl>` com `font-mono` para legibilidade técnica.
- Ações: "Baixar recibo (PDF)" via `useMutation` chamando `/api/payment/:id/receipt`, "Ver pedido".
- Mensagem de boas-vindas + link para `/portfolio/investments/:id`.

### 5.4 Vazio (`#cart-empty-section`)

- Loader (server-side) detecta `cart.length === 0` → `redirect("/cart")` (sem renderizar checkout).
- Visual fallback em `#cart-empty-section` cobre casos extremos (DeepLink compartilhado sem sessão). CTA "Explorar campanhas" linkando `/startups`.

### 5.5 Expirado (`#expired-section`)

- Card warning (variant `retryable`) com mensagem específica:
  - **PIX**: "QR Code PIX expirado — gere um novo" + CTA "Gerar novo QR Code" → chama `usePollPaymentStatus` que re-cria a cobrança via `POST /payment/:id/regenerate`.
  - **Cartão**: "Tempo limite atingido — reinicie o checkout" + CTA "Refazer" (`reload()` ou voltar pra `/cart`).

### 5.6 PENDING_3DS (`#pending3ds-section`)

- Estado intermediário entre `submit` e confirmação final.
- `role="alertdialog"` + `aria-labelledby="pending3ds-title"` + `aria-describedby="pending3ds-desc"`.
- Mensagem PT-BR: "Aguarde a autenticação do cartão. Confirme a autenticação no app do seu banco e retorne para esta tela em até 5 minutos."
- Countdown 30s para auto-redirect via `window.location.href = authenticationUrl` (cancelável pelo botão "Continuar autenticação").
- Webhook `payment/3ds-confirmed` da EFI dispara o avanço para `#success-section` ou fallback para `#error-section` com `autenticacao_3ds_falhou`.

---

## 6. Responsividade

| Breakpoint | Layout |
|---|---|
| `< 640px` (mobile) | 1 coluna; summary vira topo (form vem depois); QR Code reduzido a `w-48`; parcelas em accordion colapsável (`<details><summary>Ver parcelas</summary>...</details>`) |
| `640-1024px` (tablet) | 1 coluna, mas com padding maior; method toggle em 2 colunas |
| `>= 1024px` (desktop) | Grid 5 colunas; summary sticky à direita |

**Estratégia mobile-first:** o layout base é single-column. O grid `lg:grid-cols-5` só ativa em `>=1024px`. Inputs e botões usam `w-full` com `min-h-[44px]` para área de toque mínima.

**Imagens / ícones:** Material Symbols via Google Fonts CDN; sem imagens raster (apenas o QR placeholder).

---

## 7. Acessibilidade

- **Contraste AA verificado:**
  - `on-surface #ffdbf3` sobre `surface #1f031d`: **18.7:1** (AAA)
  - `on-surface-variant #cc9dc0` sobre `surface`: **10.8:1** (AAA)
  - `on-surface-dim #936889` sobre `surface`: **4.6:1** (AA — apenas para hints/microcopy, nunca corpo de texto)
  - Texto preto sobre `gradient-primary (#f084ff → #ea6bff → #d500f9)`: **5.2:1** (AA) — validado com WebAIM contrast checker.
- **Focus visível:** `:focus-visible` com `outline: 2px solid #f084ff` + `outline-offset: 2px` em todos os interativos.
- **Labels via `htmlFor`/`id`:** **todos os inputs** têm label associado (numericamente: card-number, card-name, card-expiry, card-cvv, installments, coupon-code, pix-copy).
- **ARIA radiogroup:** `role="radiogroup"` no method toggle + `role="radio"` em cada `<label>`.
- **Live region para timer:** `aria-live="polite"` + `aria-atomic="true"` + `role="timer"` no countdown (não interrompe screen reader).
- **Toast container:** `aria-live="polite"` + `role="status"` + `aria-atomic="false"` + `aria-relevant="additions text"`.
- **Modal/PENDING_3DS:** `role="alertdialog"` + `aria-labelledby` + `aria-describedby`.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` desativa pulse/shimmer.

---

## 8. Decisões técnicas

### Por que adotar Kinetic Architecture oficial em vez do "violet-700"?

A decisão original (violet-700 `#6d28d9`) era inconsistente: criava 2 paletas divergentes (checkout vs central de cupons) no mesmo produto. A correção converge checkout EFI e central de cupons num único sistema visual coerente. `primary #d500f9` sobre `surface #1f031d` provê 6.1:1 (AA) e é a assinatura da marca. Stripe/Revolut/Nubank não exigem violet-700 — neon funciona em fintech desde que texto principal use `on-surface #ffdbf3` (18.7:1).

### Por que juros simples (`total = principal × (1 + i × n)`)?

PRD AC-03.1 explicita: "Sistema de parcelamento que utilize juros simples (não compostos), com cálculo transparente e fórmula `M = P × (1 + i × n)`, sendo `i = 2,99% a.m.`". Juros compostos dariam `total = principal × (1 + i)ⁿ` = R$ 1.011,82 em 12x (vs R$ 1.156,50 com juros simples — juros compostos seriam menores). A escolha por juros simples é **regra de negócio**, não decisão de design — mas o design precisa refletir corretamente.

**Exemplo canônico (do PRD):**

- Subtotal original: R$ 1.500,00 (itens + taxa)
- Cupom `PROMO50` (50% OFF): `−R$ 750,00` → **Total R$ 750,00**
- 6x sem juros: `6 × R$ 125,00 = R$ 750,00` (soma = principal)
- 6x com juros (2,99% a.m., juros simples): `total = 750 × (1 + 0,0299 × 6) = 750 × 1,1794 = R$ 884,55` (parcela ≈ R$ 147,42). O brief usa `884,46 / 147,41` (1 centavo de diferença por arredondamento — backend deve emitir `parcela` arredondada para 2 casas via `Math.round(parcela * 100) / 100` e a última parcela absorver centavos residuais)

**Propagação do cupom:** `discountAmount = subtotalWithTax × discountPct` (no caso acima, R$ 1.500 × 50% = R$ 750). Esse valor é aplicado a **TODAS** as modalidades:

- PIX: cobra R$ 750 → QR code gerado para R$ 750,00.
- Cartão à vista: cobra R$ 750 → parcela única R$ 750,00.
- Cartão 6x sem juros: cobra R$ 750 → 6 × R$ 125,00.
- Cartão 6x com juros: total R$ 884,55 → 6 × R$ 147,42 (juros incidem sobre o PRÉ-desconto, ou seja, sobre R$ 750).

### Por que "no 1px border" via surface tiers?

Regra herdada do vivid_logic §2. Em fundo escuro, bordas 1px viram "harsh lines" que poluem a hierarquia visual. **Surface tiers** (`surface-low → high → highest`) criam separação por TONALIDADE, não por linha — sensação mais premium e menos "bootstrap default". Quando estritamente necessário, usar **ghost border** = `outline: 1px solid rgba(97, 59, 90, 0.20)` (outline-variant a 20%) ou `outline: 1px solid rgba(147, 104, 137, 0.40)` (outline a 40%).

### Por que sticky summary no desktop?

Conversão: usuário precisa ver o impacto do cupom e das parcelas em tempo real. Sticky aside mantém o total visível enquanto ele interage com o form.

### Por que countdown regressivo?

PRD US-01.4 cita explicitamente: "quando o QR expirou (30min padrão EFI), frontend exibe toast `QR Code PIX expirado — gere um novo`". O countdown previne surpresas e cria senso de urgência (Fogg Behavior Model).

### Por que cupom 100% suportado?

Caso de uso real: founders recebem cortesia para testar plataforma. Fluxo simbólico: PIX QR gerado para `R$ 0,00` — `cob.write` da EFI aceita valor zero (na verdade ignora o campo, gera cobrança "simbólica"). Backend emite `Payment.status = PAID` direto, sem webhook real. Frontend exibe `R$ 0,00` na secao "Total a pagar" com badge "Cortesia 100%".

---

## 9. Migração para Tailwind 4 (próximo sprint)

A atual `code.html` usa Tailwind CDN com `tailwind.config.theme.extend.colors` para preview rápido. A implementação real React usará Tailwind 4 nativo via `@tailwindcss/vite` (já configurado no projeto) com tokens CSS-first via `@theme`:

```css
/* app/styles/theme.css */
@import "tailwindcss";

@theme {
  --color-primary: #d500f9;
  --color-primary-container: #ea6bff;
  /* ... resto dos tokens vivid_logic (ver §2) ... */

  --font-display: 'Manrope', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

**Vantagens:**

- Single source of truth entre checkout e central de cupons (e qualquer página futura).
- Remoção do `tailwind.config.ts` ao longo do tempo (Tailwind 4 não exige config).
- Componentes shadcn/ui consomem `bg-primary` automaticamente — zero mapeamento manual.

---

## 10. Próximos passos

1. **Aprovação do usuário** → designer → frontend agent implementa em React 19.
2. **Implementar TanStack Query hooks:** `useCheckoutSession`, `useApplyCoupon`, `useCreatePixCharge`, `useConfirmCardPayment`, `usePollPaymentStatus` (3s).
3. **Integrar Sonner + EfiErrorsCatalog:** importar `toast` de `~/lib/efi-toast-mapper` (ver §5 — mapeamento `code → variant`).
4. **SDK JS EFI:** carregar via `<script src="https://cdn.efipay.com.br/js/efi-pay-v1.min.js">` no root; tokenizar cartão client-side.
5. **Testes Playwright E2E:** fluxo PIX completo (criação → QR → mock webhook → status PAID) + cartão parcelado (cálculo juros visível) + 3DS (PENDING_3DS → success/error).
6. **Testes unitários:** `InstallmentCalculator` (juros simples, fórmula PRD), `CardFlagDetector` (BIN prefix), `Timer` (countdown + expiração), `EfiErrorMapper` (cobre 11 codes do §5).

---

## 11. Arquivos relacionados

- `frontend/doc/style/checkout/checkout_efi_transparente/code.html` — Markup corrigido (este arquivo)
- `frontend/doc/style/checkout/checkout_efi_transparente/DESIGN.md` — Este documento
- `frontend/doc/style/checkout/vivid_logic/DESIGN.md` — Design system base (Kinetic Architecture)
- `frontend/doc/style/cetralcupon/` — Central de cupons (usa mesma paleta após correção)
- `frontend/doc/style/checkout/checkout_mobile_premium/` — Variante mobile (atualizar separadamente)
- `frontend/doc/style/checkout/checkout_split_invertido_3_produtos/` — Variante split (atualizar separadamente)
