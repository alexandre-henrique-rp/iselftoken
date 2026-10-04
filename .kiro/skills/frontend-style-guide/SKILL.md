---
name: frontend-style-guide
description: >-
  Guia de estilo e Design System oficial do iSelfToken — fonte Inter, paleta magenta brand (#d500f9) sobre preto puro, 4 estados obrigatórios de tela, espaçamento editorial da Wallet e padrões de revisão de breakpoints.
---

# Frontend Style Guide — Design System Oficial (Inter + Magenta Brand)

Esta skill aplica e orienta a implementação das regras visuais do produto com base no documento oficial:
👉 **[frontend/STYLE_GUIDE.md](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/STYLE_GUIDE.md)** e na proposta oficial em `doc/iSelfToken - Proposta de Design System.pdf`.

> **Atualização 2026-09 (Sprint T126 — Brand unification):** a cor primária foi
> consolidada em **magenta `#d500f9`** (RGB 213, 0, 249) — alinhada com a logo
> "iSelfToken". Todas as referências anteriores a "violeta `#a855f7`" ou "azul
> `#2563eb`" são **legado** e devem ser migradas para o token `--color-primary`.

---

## 1. Tipografia Oficial (Inter)

* **Fonte:** **`Inter` (sans-serif)** — variável via `@fontsource-variable/inter`.
* **Pesos:** Regular (`400`), Medium (`500`), SemiBold (`600`), Bold (`700`).
* **Escala:**
  - `Display / H1`: `36px - 48px` (títulos de tela)
  - `H2`: `28px - 32px` (subtítulos de seção)
  - `H3`: `20px - 24px` (cards e widgets)
  - `Body`: `16px` (parágrafos e inputs)
  - `Small`: `14px` (textos auxiliares)
  - `Extra Small`: `12px` (badges e timestamps)

---

## 2. Paleta de Cores e Tokens

### 2.1. Brand Primária (Magenta)
* **Magenta Principal (`primary`):** `#d500f9` (RGB 213, 0, 249) — cor da logo.
* **Magenta Container (`primary-container`):** `#b400c9` — gradiente terminal de CTAs.
* **Magenta Light (`primary-light`):** `#f0abff` — hover states e textos claros.
* **On Primary:** `#ffffff` (texto sobre magenta).
* **Gradiente oficial:** `linear-gradient(135deg, #d500f9 0%, #b400c9 60%, #8e24aa 100%)`.

### 2.2. Fundos e Superfícies (Preto Puro)

O produto prioriza **preto puro** como tela principal. Surface tiers escalonam
em níveis mínimos de cinza para hierarquia visual sem "amarelamento":

| Token | Valor | Uso |
|---|---|---|
| `--color-background` | `#000000` | Tela principal |
| `--color-surface` | `#000000` | Páginas |
| `--color-surface-dim` | `#000000` | Estados desabilitados |
| `--color-surface-low` | `#050505` | Containers baixos |
| `--color-surface-container-low` | `#0a0a0a` | Cards |
| `--color-surface-container` | `#121212` | Bento |
| `--color-surface-container-high` | `#1a1a1a` | Cards elevados |
| `--color-surface-container-highest` | `#222222` | Modais |
| `--color-card` | `#0a0a0a` | Variável legacy shadcn |
| `--color-popover` | `#0a0a0a` | Variável legacy shadcn |

### 2.3. Texto e Bordas
* **Texto Principal (`foreground`):** `#f5f5f5` (neutral-100).
* **Texto Secundário (`muted-foreground`):** `#a3a3a3` (neutral-400).
* **Texto Dim:** `#737373` (neutral-500) — placeholders e labels secundários.
* **Outline (ghost border):** `#525252` (neutral-600).
* **Outline Variant:** `#1f1f1f` — bordas internas sutis.
* **Bordas de cards:** `rgba(255, 255, 255, 0.08)` (border-white/5/10).

### 2.4. Status Semânticos
* **Sucesso (`success`):** `#34d399` (emerald-400) — APENAS em contextos semânticos
  estritos (Repasse concluído, documento verificado). **Não** usar para acentos
  decorativos ou badges de status de plataforma — nesses casos, usar magenta.
* **Aviso (`warning`):** `#fbbf24` (amber-400) — Pendente, Em Análise.
* **Erro (`error` / `destructive`):** `#ef4444` (red-500) — Falhas, recusas.
* **Informação (`info`):** `#3b82f6` (blue-500) — Informativo raro.

> ⚠️ **REGRA CRÍTICA:** emerald não é tom de marca. Usar magenta para qualquer
> destaque de plataforma (aprovado, ativo, em captação). Reservar emerald para
> status financeiro terminal positivo (pago, validado).

---

### 2.5. Recipe Visual dos Cards — Cinza Neutro + Magenta

Cards de métricas usam superfícies pretas/cinza neutro; o cinza não deve puxar para verde, azul ou violeta.

- Card padrão: `bg-accent/20 rounded-2xl border border-white/5 shadow-lg`, com `accent` neutro (`#202020`).
- Card hero **Captado**: `bg-gradient-to-br from-primary/10 via-accent/30 to-accent/10`, `border-primary/15` e `shadow-lg`.
- Ícones e destaques de plataforma: `text-primary` ou `bg-primary/10` (`#d500f9`).
- Valores: `text-foreground`; labels e descrições: `text-muted-foreground` em cinza neutro.
- Não usar `emerald`, `green`, `lime`, azul ou violeta em KPIs como cor decorativa. “Captado”, “Total captado”, “Aprovado” e “Ativo” usam magenta.
- Emerald fica reservado a estados financeiros terminais, como repasse concluído, pagamento confirmado ou documento financeiro validado.

Esse recipe é a referência da dashboard do fundador e deve ser reutilizado em novos cards.

## 3. Padrões de Componentes e Estados

1. **Botões:** shadcn/ui com variante primária em magenta `#d500f9` (`bg-primary`).
   Loading state: `disabled` + spinner via `isPending`. CTA primário geralmente em
   pill (`rounded-full`) com glow `shadow-[0_0_18px_rgba(213,0,249,0.25)]`.

2. **4 Estados Obrigatórios:** Toda tela com dados de API deve tratar:
   - **Loading:** Skeleton estrutural (preserva layout, evita reflow).
   - **Empty:** Ícone + mensagem amigável + botão CTA.
   - **Error:** Mensagem PT-BR + botão de retry.
   - **Data:** Apresentação formatada (BRL via `formatBRLCompact`).

3. **Formulários:** Zod + React Hook Form, máscaras oficiais (CPF/CNPJ/Telefone),
   validação client-side antes de submeter.

---

## 4. Background da Dashboard (Watermark)

Para páginas autenticadas com áreas grandes, usar o watermark de marca:
- Logo "iSelfToken" gigante (`text-[12vw]`) em opacity `[0.02]`, posicionada
  `fixed -bottom-10 -right-10 -z-10`.
- **PROIBIDO:** grids quadriculados ou patterns de linha visíveis — não combinam
  com a identidade do produto.

---

## 5. Shell Editorial e Espaçamento da Wallet

A Wallet é a referência real de respiro para páginas editoriais autenticadas:

- Layout global autenticado: `pt-28 pb-12 px-6 lg:px-12`.
- Shell da página: `min-h-screen pt-3 pb-6 px-1.5 md:pt-4 md:pb-8 md:px-0`.
- Container: `w-full max-w-7xl xl:max-w-[1400px]`; evitar `max-w-4xl` em páginas principais.
- Header: `mb-6 md:mb-8`; empilhado no mobile e horizontal em `md+` quando houver ações.
- Cards/bento: `p-4`/`p-6`, `gap-4 md:gap-6`, `mb-8 md:mb-10`; listas longas podem usar `mb-24` no fechamento.
- `<md` empilha, `md` pode iniciar duas colunas e `lg` divide o bento em 5 colunas.
- `max-w-[96rem]` é apenas uma variante excepcional para listas densas.

Exemplo canônico: `main pt-3 pb-6 px-1.5 md:pt-4 md:pb-8 md:px-0` + `div w-full max-w-7xl xl:max-w-[1400px]`.

---

## 6. Comando Obrigatório — Revisar Breakpoints

> **COMANDO OBRIGATÓRIO — REVISAR BREAKPOINTS ANTES DE CONCLUIR**
>
> Toda tela nova ou alterada deve ser conferida em **mobile (<640px)**, **tablet (640–1023px)** e **desktop (>=1024px)**. A implementação deve ser mobile-first.

Checklist: overflow horizontal; padding lateral/superior; grids e cards; tipografia; botões, filtros e ações; estados Loading/Empty/Error/Data. Nenhum `lg:` pode ser o único estado de um componente crítico: sempre deve existir estado base para mobile.

---

## 7. Lições Aprendidas (Anti-Padrões Documentados)

| ❌ Anti-pattern | ✅ Correto | Origem |
|---|---|---|
| Hardcoded `rgba(213,0,249,...)` em componentes | Usar token `--color-primary` via `bg-primary`/`text-primary` | T126 |
| Múltiplos tons de verde (emerald) decorativos | Usar magenta para destaques de plataforma; emerald só em semântica financeira | T126 |
| Fundo `#0a0a0a` "quase preto" | `#000000` preto puro (alinhado à logo) | T126 |
| Grid quadriculado como background | Watermark de logo "iSelfToken" em opacity 2% | T126 |
| Botão "Aprovada" com `text-emerald-400` | `text-primary` (magenta) — aprovação é destaque de marca | T126 |
| Cor primária tripla (spec / theme / shadows) | Única: `--color-primary: #d500f9`. Theme.css é single source of truth | T126 |
