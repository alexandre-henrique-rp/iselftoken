# CSS Padrão - iSelfToken Design System

Sistema de estilos baseado em **Tailwind CSS v4** + **shadcn/ui (tema stone)**.
**Tema padrão: Dark** | Suporte a tema Light | Layout Responsivo

---

## 1. Cores

### 1.1 Marca iSelfToken

| Token | Valor | Uso |
|-------|-------|-----|
| `--brand` | `#d500f9` | Logo "iSelfToken" e elementos de destaque |

**Logo:** Texto "iSelfToken" na cor `#d500f9` (magenta/roxo)

**Destaques:** A cor `#d500f9` pode ser usada em alguns elementos de destaque especiais relacionados à marca (usar com moderação)

### 1.2 Cores Primárias (Ação)

Baseado no azul para ações principais.

| Token | Valor Hex | Tailwind Class | Uso |
|-------|-----------|----------------|-----|
| `--primary` | `#2563eb` | `blue-600` | Botões primários, links, ícones de destaque |
| `--primary-light` | `#eff6ff` | `blue-50` | Fundos de seções, estados hover |
| `--primary-dark` | `#1d4ed8` | `blue-700` | Estados pressed/active |

### 1.3 Cores Neutras (shadcn/ui Stone)

Para uso com shadcn/ui tema stone:

#### Tema Dark (Padrão)

| Elemento | Tailwind Class | Hex |
|----------|----------------|-----|
| Background | `stone-950` | `#0c0a09` |
| Card/Surface | `stone-900` | `#1c1917` |
| Borda | `stone-800` | `#292524` |
| Texto Secundário | `stone-400` | `#a8a29e` |
| Texto Principal | `stone-50` | `#fafaf9` |

#### Tema Light

| Elemento | Tailwind Class | Hex |
|----------|----------------|-----|
| Background | `stone-50` | `#fafaf9` |
| Card/Surface | `white` | `#ffffff` |
| Borda | `stone-200` | `#e7e5e4` |
| Texto Secundário | `stone-600` | `#57534e` |
| Texto Principal | `stone-900` | `#1c1917` |

### 1.4 Cores Semânticas (Feedback)

| Status | Valor Hex | Tailwind Class | Uso |
|--------|-----------|----------------|-----|
| Sucesso | `#22c55e` | `green-500` | Confirmações, ações completadas |
| Aviso | `#f59e0b` | `amber-500` | Alertas, atenção necessária |
| Erro | `#ef4444` | `red-500` | Erros, ações destrutivas |
| Informação | `#3b82f6` | `blue-500` | Dicas, informações adicionais |

---

## 2. Tipografia

### 2.1 Família Tipográfica

**Fonte padrão do sistema:** Inter

```css
--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
```

A fonte Inter deve ser usada em **todo o sistema** (títulos, corpo de texto, botões, labels, etc.).

### 2.2 Escala de Tamanhos

| Nome | Tamanho | Tailwind Class | Uso |
|------|---------|----------------|-----|
| Display/H1 | 36px - 48px | `text-4xl` / `text-5xl` | Títulos principais de tela |
| H2 | 28px - 32px | `text-2xl` / `text-3xl` | Subtítulos de seção |
| H3 | 20px - 24px | `text-xl` / `text-2xl` | Títulos de cards/componentes |
| Body | 16px | `text-base` | Texto padrão |
| Small | 14px | `text-sm` | Textos auxiliares, legendas |
| Extra Small | 12px | `text-xs` | Disclaimers, timestamps |

### 2.3 Pesos da Fonte

| Peso | Valor | Tailwind Class | Uso |
|------|-------|----------------|-----|
| Regular | 400 | `font-normal` | Corpo de texto |
| Medium | 500 | `font-medium` | Ênfase leve |
| SemiBold | 600 | `font-semibold` | Títulos, labels |
| Bold | 700 | `font-bold` | Destaque forte |

### 2.4 Altura de Linha (Line Height)

| Tipo | Tailwind Class | Uso |
|------|----------------|-----|
| Tight | `leading-tight` | Títulos |
| Normal | `leading-normal` | Texto padrão |
| Relaxed | `leading-relaxed` | Corpo de texto longo |

---

## 3. Espaçamento

Escala baseada em múltiplos de 4px (padrão Tailwind).

| Token | Valor | Tailwind Class |
|-------|-------|----------------|
| xs | 4px | `p-1` / `m-1` / `gap-1` |
| sm | 8px | `p-2` / `m-2` / `gap-2` |
| md | 12px | `p-3` / `m-3` / `gap-3` |
| base | 16px | `p-4` / `m-4` / `gap-4` |
| lg | 24px | `p-6` / `m-6` / `gap-6` |
| xl | 32px | `p-8` / `m-8` / `gap-8` |
| 2xl | 48px | `p-12` / `m-12` / `gap-12` |
| 3xl | 64px | `p-16` / `m-16` / `gap-16` |

---

## 4. Breakpoints (Responsivo)

| Breakpoint | Min Width | Tailwind Prefix | Dispositivo |
|------------|-----------|-----------------|-------------|
| Default | 0px | (sem prefixo) | Mobile |
| sm | 640px | `sm:` | Mobile landscape |
| md | 768px | `md:` | Tablet |
| lg | 1024px | `lg:` | Desktop |
| xl | 1280px | `xl:` | Desktop grande |
| 2xl | 1536px | `2xl:` | Monitores grandes |

### Abordagem Mobile-First

Estilos base são para mobile, adicionar prefixos para telas maiores:

```html
<div class="p-4 md:p-6 lg:p-8">
  <h1 class="text-2xl md:text-3xl lg:text-4xl">Título</h1>
</div>
```

---

## 5. Bordas e Arredondamento

### 5.1 Border Radius

| Nome | Tailwind Class | Uso |
|------|----------------|-----|
| None | `rounded-none` | Elementos retos |
| Small | `rounded-sm` | Inputs, badges |
| Default | `rounded` | Botões, cards |
| Medium | `rounded-md` | Cards, modais |
| Large | `rounded-lg` | Containers principais |
| Full | `rounded-full` | Avatares, pills |

### 5.2 Bordas

| Tema | Tailwind Class |
|------|----------------|
| Dark | `border-stone-800` |
| Light | `border-stone-200` |

---

## 6. Sombras

| Nome | Tailwind Class | Uso |
|------|----------------|-----|
| Small | `shadow-sm` | Elementos sutis |
| Default | `shadow` | Cards, dropdowns |
| Medium | `shadow-md` | Modais, popovers |
| Large | `shadow-lg` | Elementos flutuantes |

---

## 7. Estados de Componentes

### 7.1 Interativos

```html
<!-- Botão com estados -->
<button class="
  bg-blue-600
  hover:bg-blue-700
  active:bg-blue-800
  focus:ring-2
  focus:ring-blue-500
  focus:ring-offset-2
  disabled:opacity-50
  disabled:cursor-not-allowed
">
```

### 7.2 Foco (Acessibilidade)

```html
focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
```

Para tema dark, adicionar:
```html
dark:focus:ring-offset-stone-950
```

---

## 8. Configuração de Tema (app.css)

```css
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif,
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
}

/* Tema Dark como padrão */
html {
  color-scheme: dark;
}

body {
  @apply bg-stone-950 text-stone-50;
}

/* Suporte a tema Light */
html.light body,
[data-theme="light"] body {
  @apply bg-stone-50 text-stone-900;
  color-scheme: light;
}
```

---

## 9. Contraste e Acessibilidade

### 9.1 Requisitos Mínimos de Contraste

- Texto normal: 4.5:1
- Texto grande (18px+ ou 14px bold): 3:1
- Elementos interativos: 3:1

### 9.2 Classes de Foco Visível

```html
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-blue-500
```

---

## 10. Padrões de Layout Responsivo

### 10.1 Container

```html
<div class="container mx-auto px-4 sm:px-6 lg:px-8">
```

### 10.2 Grid Responsivo

```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
```

### 10.3 Flexbox Responsivo

```html
<div class="flex flex-col md:flex-row gap-4">
```

---

## 11. Variáveis CSS para shadcn/ui

Variáveis compatíveis com shadcn/ui tema stone:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 20 14.3% 4.1%;
  --card: 0 0% 100%;
  --card-foreground: 20 14.3% 4.1%;
  --popover: 0 0% 100%;
  --popover-foreground: 20 14.3% 4.1%;
  --primary: 24 9.8% 10%;
  --primary-foreground: 60 9.1% 97.8%;
  --secondary: 60 4.8% 95.9%;
  --secondary-foreground: 24 9.8% 10%;
  --muted: 60 4.8% 95.9%;
  --muted-foreground: 25 5.3% 44.7%;
  --accent: 60 4.8% 95.9%;
  --accent-foreground: 24 9.8% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 60 9.1% 97.8%;
  --border: 20 5.9% 90%;
  --input: 20 5.9% 90%;
  --ring: 20 14.3% 4.1%;
  --radius: 0.5rem;
}

.dark {
  --background: 20 14.3% 4.1%;
  --foreground: 60 9.1% 97.8%;
  --card: 20 14.3% 4.1%;
  --card-foreground: 60 9.1% 97.8%;
  --popover: 20 14.3% 4.1%;
  --popover-foreground: 60 9.1% 97.8%;
  --primary: 60 9.1% 97.8%;
  --primary-foreground: 24 9.8% 10%;
  --secondary: 12 6.5% 15.1%;
  --secondary-foreground: 60 9.1% 97.8%;
  --muted: 12 6.5% 15.1%;
  --muted-foreground: 24 5.4% 63.9%;
  --accent: 12 6.5% 15.1%;
  --accent-foreground: 60 9.1% 97.8%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 60 9.1% 97.8%;
  --border: 12 6.5% 15.1%;
  --input: 12 6.5% 15.1%;
  --ring: 24 5.7% 82.9%;
}
```
