# iSelfToken — Design System & Guia de Estilo Unificado
### Documento Mestre de UX/UI · v1.2 (Brand unification — Sprint T126)

> Este documento é a **fonte única de verdade visual e funcional** do produto iSelfToken. Qualquer tela nova, refatoração ou geração via IA deve seguir estritamente as diretrizes deste guia.

> **Mudança principal v1.2:** Cor primária consolidada em **magenta `#d500f9`** (alinhada à logo "iSelfToken") sobre **preto puro `#000000`**. Versões anteriores usavam violeta `#a855f7` — esse token foi depreciado e todas as referências devem ser migradas para o magenta oficial.

---

## 1. Princípios Fundamentais do Design System

1. **Consistência:** Experiência de usuário unificada em todos os módulos e plataformas (web e mobile).
2. **Eficiência:** Reutilização de componentes e padrões para acelerar o desenvolvimento.
3. **Escalabilidade:** Adição de novas telas e fluxos mantendo a integridade do design.
4. **Acessibilidade (A11y):** Contraste adequado (WCAG AA), tamanhos legíveis e suporte a navegação por teclado e leitores de tela.
5. **Marca & Clareza Fintech:** Refletir a solidez e a identidade visual magenta da iSelfToken em cada interação.

---

## 2. Tipografia (Typography)

* **Família Tipográfica Oficial:** **`Inter` (sans-serif)** — variável via `@fontsource-variable/inter`.
* **Pesos da Fonte:**
  * Regular (`400`) — Corpo de texto e descrições
  * Medium (`500`) — Subtítulos, abas e navegação
  * SemiBold (`600`) — Títulos de componentes, cards e tabelas
  * Bold (`700`) — Headings principais e destaques

### Escala Tipográfica Padronizada:

| Nível / Token | Tamanho (px / rem) | Peso | Line-Height | Uso no Sistema |
| :--- | :--- | :--- | :--- | :--- |
| **Display / H1** | `36px - 48px` (2.25rem - 3rem) | Bold (`700`) | 1.2 | Título principal de telas e páginas |
| **H2** | `28px - 32px` (1.75rem - 2rem) | SemiBold (`600`) | 1.3 | Subtítulos de grandes seções |
| **H3** | `20px - 24px` (1.25rem - 1.5rem) | SemiBold (`600`) | 1.4 | Títulos de cards, widgets e modais |
| **Corpo (Padrão)** | `16px` (1rem) | Regular (`400`) | 1.5 | Texto corrido, parágrafos e inputs |
| **Pequeno** | `14px` (0.875rem) | Regular (`400`) / Med (`500`) | 1.5 | Textos auxiliares, legendas, tabelas |
| **Extra Pequeno** | `12px` (0.75rem) | Medium (`500`) / Bold (`700`) | 1.4 | Badges, disclaimers, timestamps |

---

## 3. Paleta de Cores e Tokens de Design

### 3.1. Paleta Primária (Brand & Ação — MAGENTA)

| Token | Valor | Uso |
|---|---|---|
| **`primary`** | `#d500f9` (RGB 213, 0, 249) | Cor da logo "iSelfToken". CTAs, links de ação, ícones de destaque, focus rings. |
| `primary-container` | `#b400c9` | Gradiente terminal de CTAs. |
| `primary-light` | `#f0abff` | Hover states, textos em hover. |
| `primary-foreground` | `#ffffff` | Texto sobre magenta. |

**Gradiente oficial de CTA:** `linear-gradient(135deg, #d500f9 0%, #b400c9 60%, #8e24aa 100%)`.

**Glow sombra oficial:** `shadow-[0_0_18px_rgba(213,0,249,0.25)]` em elementos ativos.

### 3.2. Paleta Neutra — Fundos Pretos Puros

O produto prioriza **preto puro** como tela principal. Surface tiers escalonam em níveis mínimos de cinza para hierarquia visual sem "amarelamento":

| Token | Valor | Uso |
|---|---|---|
| `--color-background` | `#000000` | Tela principal (`html`/`body`) |
| `--color-surface` | `#000000` | Páginas autenticadas |
| `--color-surface-dim` | `#000000` | Estados desabilitados |
| `--color-surface-low` | `#050505` | Containers baixos |
| `--color-surface-container-low` | `#0a0a0a` | Cards |
| `--color-surface-container` | `#121212` | Bento |
| `--color-surface-container-high` | `#1a1a1a` | Cards elevados |
| `--color-surface-container-highest` | `#222222` | Modais |
| `--color-card` (legacy) | `#0a0a0a` | Variável shadcn |
| `--color-popover` (legacy) | `#0a0a0a` | Variável shadcn |

> ⚠️ **REGRA:** Backgrounds `near-black` (`#0a0a0a`, `#141414`) eram usados em
> versões anteriores — depreciados. Use `#000000` como padrão e reserve os
> cinzas apenas para hierarquia de containers (cards sobre fundo preto).

### 3.3. Texto e Bordas

* **Texto Principal (`foreground`):** `#f5f5f5` (neutral-100) — Branco neutro.
* **Texto Secundário (`muted-foreground`):** `#a3a3a3` (neutral-400).
* **Texto Dim (`on-surface-dim`):** `#737373` (neutral-500) — Placeholders.
* **Outline (ghost border):** `#525252` (neutral-600).
* **Outline Variant:** `#1f1f1f` — bordas internas sutis.
* **Bordas de cards:** `rgba(255, 255, 255, 0.08)` (`border-white/5/10`).

### 3.4. Cores Semânticas (Feedback e Status)

| Token | Valor | Uso Permitido |
|---|---|---|
| **`success`** | `#34d399` (emerald-400) | APENAS semântica financeira terminal: Repasse concluído, KYC Validado, Documento verificado. |
| **`warning`** | `#fbbf24` (amber-400) | Pendente, Em Análise, Expira em Breve. |
| **`error`** / **`destructive`** | `#ef4444` (red-500) | Rejeitado, Falha no Pagamento, Recusado. |
| **`info`** | `#3b82f6` (blue-500) | Informativo raro. |

> ⚠️ **REGRA CRÍTICA:** Emerald **não** é tom de marca. Para destaques de
> plataforma (badge "Aprovada", campanha "Aberta", capital "Captado"), usar
> magenta. Reservar emerald estritamente para contexto financeiro onde o verde
> tem significado semântico universal (dinheiro pago, retorno positivo).

---

### 3.5. Cards de Métricas — Preto, Cinza Neutro e Magenta

Os cards de métricas devem usar superfícies neutras e escuras. O cinza dos cards é estrutural e não deve puxar para verde, azul ou violeta.

- **Card padrão:** `bg-accent/20 rounded-2xl border border-white/5 shadow-lg`, usando o token `--accent: #202020` como superfície neutra.
- **Card hero “Captado”:** `bg-gradient-to-br from-primary/10 via-accent/30 to-accent/10`, com `border-primary/15` e `shadow-lg`.
- **Ícones e métricas de marca:** `text-primary` / `bg-primary/10`, usando o magenta `#d500f9`.
- **Valores:** `text-foreground` (`#f5f5f5`); labels e descrições usam `text-muted-foreground` em cinza neutro.
- **Proibição:** não usar `emerald`, `green`, `lime`, azul ou violeta como fundo, borda ou acento decorativo de KPIs. “Captado”, “Total captado”, “Aprovado” e “Ativo” são destaques de plataforma e usam magenta.
- **Exceção semântica:** emerald permanece permitido apenas para estados financeiros terminais, como repasse concluído, pagamento confirmado ou documento financeiro validado.

Esse recipe é a referência visual para cards da dashboard do fundador e deve ser reutilizado antes de criar novas variações de KPI.

## 4. Espaçamento e Grid (Rhythm System)

Sistema baseado em múltiplos de 4px / 8px:
* **Escala:** `4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px` (`space-1` a `space-16`).
* **Padding de Cards:** `16px` a `24px` (`p-4` a `p-6`).
* **Gap entre Seções:** `24px` a `32px` (`gap-6` a `gap-8`).
* **Grid Padrão:** 3 a 4 colunas em Desktop, 2 em Tablet e 1 em Mobile com gutter de `24px`.

### 4.1. Shell Editorial Autenticado — Referência Wallet

A página Wallet define o padrão real de respiro para páginas editoriais autenticadas. O espaçamento deve ser aplicado em camadas, sem somar paddings equivalentes em cada componente:

* **Layout autenticado global:** `pt-28 pb-12 px-6 lg:px-12`. Esse padding já considera a navegação superior e a sidebar; rotas filhas não devem recriá-lo.
* **Shell editorial da página:** `min-h-screen pt-3 pb-6 px-1.5 md:pt-4 md:pb-8 md:px-0`. O mobile usa `12px` no topo, `24px` embaixo e `6px` laterais; em `md+`, passa para `16px` no topo, `32px` embaixo e remove o padding lateral próprio.
* **Container editorial:** `w-full max-w-7xl xl:max-w-[1400px]` (`1280px` até `xl`, `1400px` em telas muito largas). Não usar `max-w-4xl` como padrão para páginas principais.
* **Header editorial:** `mb-6 md:mb-8`, com header empilhado no mobile e horizontal em `md+` quando houver ações.
* **Cards e seções:** usar `16px` a `24px` de padding interno (`p-4`/`p-6`) e `16px` a `24px` entre blocos do bento (`gap-4 md:gap-6`).
* **Ritmo vertical Wallet:** bento com `mb-8 md:mb-10`; listas/tabelas editoriais podem fechar com `mb-24` quando houver uma seção final longa.
* **Responsividade:** `<md` empilha conteúdo; `md` pode iniciar uma grade de duas colunas; `lg` divide hero e KPIs do bento em `5` colunas. Não comprimir cards para preservar uma grade artificial.
* **Variante larga:** `xl:max-w-[1400px]` é o padrão para shells editoriais amplos; `max-w-[96rem]` fica reservado para páginas de listas ainda mais densas.

Exemplo canônico:

```tsx
<main className="min-h-screen pt-3 pb-6 px-1.5 md:pt-4 md:pb-8 md:px-0">
  <div className="w-full max-w-7xl xl:max-w-[1400px]">
    <header className="mb-6 md:mb-8" />
    <section className="mb-8 md:mb-10" />
  </div>
</main>
```

### 4.2. Background Decorativo de Páginas Autenticadas

Para páginas autenticadas com hero (Dashboard, Wallet), usar o watermark de marca:
- Logo "iSelfToken" gigante (`text-[12vw]`) em `opacity-[0.02]`.
- Posicionado `fixed -bottom-10 -right-10 -z-10 overflow-hidden`.

**PROIBIDO:** grids quadriculados, patterns de linhas visíveis, ou gradientes coloridos no background. Apenas preto puro + watermark de marca.

### 4.3. Comando obrigatório de revisão de breakpoints

> **COMANDO OBRIGATÓRIO — REVISAR BREAKPOINTS ANTES DE CONCLUIR**
>
> Toda tela nova ou alterada deve ser conferida em três faixas: **mobile (<640px)**, **tablet (640–1023px)** e **desktop (>=1024px)**. A implementação deve ser mobile-first.

Checklist obrigatório antes de concluir:

- [ ] Sem overflow horizontal ou conteúdo cortado.
- [ ] Padding lateral e superior coerentes com o shell da página.
- [ ] Grids, cards e tabelas reorganizados para a largura disponível.
- [ ] Tipografia legível, sem labels ou valores espremidos.
- [ ] Botões, filtros e ações acessíveis sem sobreposição ou quebra indevida.
- [ ] Estados Loading, Empty, Error e Data continuam utilizáveis.
- [ ] Nenhum `lg:` é o único estado de um componente crítico; deve existir estado base mobile-first.

---

## 5. Padrões de Componentes

### 5.1. Botões
* **Primário (`variant="default"`):** Fundo Magenta (`#d500f9`) ou gradiente oficial, texto branco, cantos arredondados (`rounded-lg` ou `rounded-full`), peso 600/700. Exibe spinner durante loading.
* **Secundário (`variant="outline"`):** Fundo transparente, borda `rgba(255,255,255,0.08)`, texto `#f5f5f5`.
* **Destrutivo (`variant="destructive"`):** Fundo Vermelho (`#ef4444`), texto branco.

### 5.2. Inputs e Formulários
* Fundo limpo com borda sutil, foco com anel magenta (`ring-2 ring-primary`).
* Labels sempre visíveis acima do campo (`text-sm font-medium`).
* Feedback de erro em vermelho abaixo do campo (`text-xs text-destructive`).
* Validação via Zod + React Hook Form e máscaras oficiais (CPF, CNPJ, Telefone).

### 5.3. Badges e Status

Componente em formato pill (`rounded-full`) com variantes fechadas:

* `success`: Fundo emerald-500/10 com texto emerald-400 — **APENAS** financeiro.
* `primary` (recomendado para plataforma): Fundo `bg-primary/10` com texto `text-primary`.
* `warning`: Fundo âmbar claro com texto âmbar.
* `error`: Fundo vermelho claro com texto vermelho.
* `neutral`: Fundo cinza com texto cinza.

### 5.4. Padrão Obrigatório dos 4 Estados de Tela
Toda tela de dados deve tratar explicitamente:
1. **Loading:** Skeleton estrutural preservando o layout (via `<DashboardStartupGridSkeleton>` ou similar).
2. **Error:** Card com mensagem amigável em PT-BR e botão "Tentar novamente".
3. **Empty:** Ilustração/ícone com mensagem e CTA principal.
4. **Data:** Apresentação dos dados com formatação monetária (`BRL` via `formatBRLCompact`).

---

## 6. Acessibilidade e SEO
* Contraste mínimo de 4.5:1 para texto normal.
* Botões de ícones devem conter `aria-label`.
* Tags HTML semânticas (`<main>`, `<header>`, `<nav>`, `<section>`).

---

## 7. Lições Aprendidas — Anti-Padrões Documentados

| ❌ Anti-pattern | ✅ Correto | Origem |
|---|---|---|
| Tripla divergência de cor primária (spec / theme.css / shadows) | Única fonte: `--color-primary: #d500f9` em `theme.css`. Theme.css é single source of truth | T126 |
| `rgba(213,0,249,...)` hardcoded em shadows | Valor alinhado ao token — `rgba(213,0,249,0.25)` para glow do botão primário | T126 |
| `text-emerald-400` em badge "Aprovada" | `text-primary` (magenta) — aprovação é destaque de marca, não financeiro | T126 |
| Background `#0a0a0a` "quase preto" | `#000000` preto puro — alinhado à logo | T126 |
| Grid quadriculado como background de dashboard | Apenas watermark de marca "iSelfToken" em opacity 2% | T126 |
| Loader chamando `${BACKEND_URL}` direto | Sempre via BFF (`app/routes/api/*`) — cookie propagado, cache compartilhado | T126 |
| Loader SSR passando dados crus pelo `loaderData` | `queryClient.setQueryData()` + `dehydrate` — zero waterfall na hidratação | T126 |
| Rota com 500+ linhas de markup inline | ≤ 40 linhas; markup em `app/components/<feature>/`, lógica em `app/hooks/` | T126 |
| `formatCurrency` redeclarado por componente | `formatBRLCompact` em `lib/currency-format.ts` (single source of truth) | T126 |
