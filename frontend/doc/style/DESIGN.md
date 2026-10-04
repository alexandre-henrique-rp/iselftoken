# Design System Tokens - iSelfToken (Shadcn/UI + Google Stitch)

Este documento define os tokens de design (variáveis) para o **Google Stitch**, mapeando-os para as convenções do **Shadcn/UI** (Tailwind 4). Isso garante que o protótipo no Stitch reflita fielmente o código final.

## 1. Cores (Semantic Color Tokens)

Mapeamento das variáveis base do Shadcn/UI para os temas Light e Dark (Premium Black).

| Shadcn Variable | Light Mode (Slate) | Dark Mode (Premium Black) | Descrição |
| :--- | :--- | :--- | :--- |
| `--background` | `#F8FAFC` (Slate 50) | `#030712` (Gray 950) | Fundo da aplicação |
| `--foreground` | `#0F172A` (Slate 950) | `#F8FAFC` (Slate 50) | Cor principal do texto |
| `--card` | `#FFFFFF` | `#111827` (Gray 900) | Superfície de cards |
| `--card-foreground` | `#0F172A` | `#F8FAFC` | Texto dentro de cards |
| `--popover` | `#FFFFFF` | `#111827` | Menus e dropdowns |
| `--primary` | `#2563EB` (Blue 600) | `#3B82F6` (Blue 500) | Cor de destaque/ação principal |
| `--primary-foreground`| `#FFFFFF` | `#F8FAFC` | Texto sobre cor primária |
| `--secondary` | `#F1F5F9` | `#1E293B` | Botões e áreas secundárias |
| `--muted` | `#F1F5F9` | `#1E293B` | Texto ou fundos desativados |
| `--accent` | `#F1F5F9` | `#1E293B` | Destaque sutil (hover) |
| `--destructive` | `#EF4444` | `#EF4444` | Ações críticas (delete/error) |
| `--border` | `#E2E8F0` | `#1E293B` | Divisores e bordas de inputs |
| `--input` | `#E2E8F0` | `#1E293B` | Fundo de inputs |
| `--ring` | `#2563EB` | `#3B82F6` | Anel de foco (acessibilidade) |

---

## 2. Tipografia (Typography)

**Família:** `Inter`, sans-serif (conforme documentação oficial).

| Escala | Tamanho | Peso | Line Height | Uso no Shadcn |
| :--- | :--- | :--- | :--- | :--- |
| `h1` | 36px - 48px | Bold (700) | 1.2 | `scroll-m-20 text-4xl` |
| `h2` | 30px | SemiBold (600) | 1.3 | `scroll-m-20 text-3xl` |
| `h3` | 24px | Medium (500) | 1.4 | `scroll-m-20 text-2xl` |
| `p` | 16px | Regular (400) | 1.5 | `leading-7` |
| `small` | 14px | Regular (400) | 1.5 | `text-sm font-medium` |
| `xs` | 12px | Regular (400) | 1.5 | `text-xs` |

---

## 3. Espaçamento (Spacing Rhythm)

Baseado no sistema de 4px/8px do Tailwind, essencial para manter o ritmo visual.

| Token | Pixel | Uso Comum |
| :--- | :--- | :--- |
| `space-1` | 4px | Gaps internos pequenos, padding de ícones |
| `space-2` | 8px | Gap entre label e input, padding de botões sm |
| `space-4` | 16px | Padding padrão de cards, margens entre parágrafos |
| `space-6` | 24px | Espaçamento entre seções, padding de containers |
| `space-8` | 32px | Grandes áreas de respiro em landing pages |
| `space-12` | 48px | Margens de topo de seção (hero) |

---

## 4. Arredondamento (Border Radius)

Tokens para controle de cantos, alinhados com a variável `--radius` do Shadcn.

| Token | Valor | Uso Comum |
| :--- | :--- | :--- |
| `radius-sm` | 4px (0.25rem) | Inputs pequenos, checkboxes |
| `radius-md` | 8px (0.5rem) | Botões padrão, inputs, dropdowns |
| `radius-lg` | 12px (0.75rem) | Cards, modais (padrão Shadcn) |
| `radius-xl` | 16px (1rem) | Banners, elementos de destaque |
| `radius-full` | 9999px | Badges, avatares circulares |

---

## 5. Sombras & Efeitos (Shadows & Elevation)

| Nível | Estilo | Uso no Dark Mode |
| :--- | :--- | :--- |
| `shadow-sm` | 0 1px 2px rgba(0,0,0,0.05) | Botões discretos |
| `shadow-md` | 0 4px 6px -1px rgba(0,0,0,0.1) | Cards de conteúdo |
| `shadow-lg` | 0 10px 15px -3px rgba(0,0,0,0.1) | Modais e Popovers |
| `glow` | (Apenas Dark) 0 0 15px rgba(59,130,246,0.1) | Destaque neon sutil em ações primárias |

---

## 6. Feedback & Estados (Interactions)

*   **Hover:** Opacidade 90% no Primary ou brilho de 10%.
*   **Disabled:** Opacidade 50%, cursor `not-allowed`.
*   **Focus:** `ring-2 ring-ring ring-offset-2` (Acessibilidade crítica).
