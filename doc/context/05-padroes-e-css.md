---
Descrição: Padrões de estilos e css do projeto iSelfToken
---

# Padrões de Layout e Tema - iSelfToken

Este documento define os padrões de layout e sistema de tema para dark mode e light mode da aplicação iSelfToken.

## Sistema de Cores e Tema

### Configuração Base

A aplicação utiliza **Tailwind CSS 4** com **CSS custom properties** para gerenciar o sistema de tema. O sistema é baseado em tokens semânticos que se adaptam automaticamente aos modos claro e escuro.

#### Tipografia

**Fonte Principal:** [Inter](https://fonts.google.com/specimen/Inter)
- Carregada via Google Fonts
- Fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif`
- Suporte completo a peso variável (100-900)
- Otimizada para legibilidade em interfaces digitais

#### Cores da Empresa

**Paleta Principal:**
- **Roxo Principal:** `#d500f9` - Cor primária da marca
- **Azul Padrão:** `#2962ff` - Cor secundária para ações e links
- **Verde:** `#34a853` - Cor para status positivos e indicadores de sucesso

#### Variáveis de Cor (OKLCH)

**Light Mode (:root)**
```css
--background: oklch(1 0 0);                    /* Branco puro */
--foreground: oklch(0.147 0.004 49.25);        /* Texto principal escuro */
--card: oklch(1 0 0);                          /* Fundo de cards */

/* Cores da empresa */
--primary: oklch(0.586 0.263 318);             /* #d500f9 - Roxo principal */
--primary-foreground: oklch(1 0 0);            /* Branco para contraste */
--blue: oklch(0.515 0.251 263);               /* #2962ff - Azul padrão */
--blue-foreground: oklch(1 0 0);
--green: oklch(0.638 0.177 142);              /* #34a853 - Verde */
--green-foreground: oklch(1 0 0);

--secondary: oklch(0.97 0.001 106.424);        /* Cinza claro */
--muted: oklch(0.97 0.001 106.424);            /* Texto secundário */
--border: oklch(0.923 0.003 48.717);           /* Bordas suaves */
--ring: oklch(0.586 0.263 318);               /* Ring usando cor principal */
```

**Dark Mode (.dark)**
```css
--background: oklch(0.147 0.004 49.25);        /* Fundo escuro */
--foreground: oklch(0.985 0.001 106.423);      /* Texto claro */
--card: oklch(0.216 0.006 56.043);             /* Cards mais escuros */

/* Cores da empresa no dark mode - mais vibrantes */
--primary: oklch(0.686 0.313 318);             /* Roxo mais claro para dark mode */
--primary-foreground: oklch(0.147 0.004 49.25); /* Fundo escuro para contraste */
--blue: oklch(0.615 0.301 263);               /* Azul mais claro */
--blue-foreground: oklch(0.147 0.004 49.25);
--green: oklch(0.738 0.227 142);              /* Verde mais claro */
--green-foreground: oklch(0.147 0.004 49.25);

--secondary: oklch(0.268 0.007 34.298);        /* Cinza médio */
--muted: oklch(0.268 0.007 34.298);            /* Texto secundário escuro */
--border: oklch(1 0 0 / 10%);                  /* Bordas transparentes */
--ring: oklch(0.686 0.313 318);               /* Ring usando cor principal dark */
```

### Implementação do Theme Provider

```tsx
// Root layout com ThemeProvider
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  <Outlet />
</ThemeProvider>
```

### Toggle de Tema Animado

O componente `AnimatedThemeToggler` implementa:
- Transição suave com View Transitions API
- Animação de revelação circular
- Integração com next-themes para persistência
- Detecção automática da preferência do sistema

## Padrões de Layout

### 1. Header/Navigation

**Estrutura Base:**
```tsx
<header className="border-border bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
  <div className="container mx-auto flex h-16 items-center justify-between px-6">
    {/* Logo - usando cor primária da empresa */}
    <div className="flex items-center gap-2">
      <span className="text-xl font-bold tracking-tight text-primary">
        iSelfToken
      </span>
    </div>

    {/* Navigation Desktop */}
    <nav className="hidden items-center gap-4 md:flex">
      <LanguageSelect />
      <AnimatedThemeToggler />
      <Button className="bg-blue text-blue-foreground hover:bg-blue/90">
        Login
      </Button>
    </nav>

    {/* Mobile Menu */}
    <div className="md:hidden">
      <MobileMenu />
    </div>
  </div>
</header>
```

**Características:**
- `bg-background/80` - Fundo semi-transparente
- `backdrop-blur` - Efeito de blur no fundo
- `sticky top-0 z-50` - Header fixo no topo
- Responsivo com menu mobile

### 2. Cards

**Componente Base:**
```tsx
<Card className="bg-card text-card-foreground">
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descrição</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Conteúdo */}
  </CardContent>
  <CardFooter>
    {/* Ações */}
  </CardFooter>
</Card>
```

**Características:**
- `rounded-xl border py-6 shadow-sm` - Bordas arredondadas e sombra sutil
- Uso de tokens semânticos (`bg-card`, `text-card-foreground`)
- Layout flexível com gap consistente

### 3. Buttons

**Variantes por Tema:**
```tsx
// Primary (roxo da empresa)
className="bg-primary text-primary-foreground hover:bg-primary/90"

// Blue (azul da empresa)
className="bg-blue text-blue-foreground hover:bg-blue/90"

// Green (verde da empresa)
className="bg-green text-green-foreground hover:bg-green/90"

// Outline
className="border bg-background hover:bg-accent dark:bg-input/30 dark:border-input dark:hover:bg-input/50"

// Ghost
className="hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
```

**Características:**
- Estados específicos para dark mode (`dark:`)
- Transições suaves em todas as interações
- Uso consistente de tokens de cor semânticos

### 4. Footer

**Estrutura:**
```tsx
<footer className="dark:bg-background text-muted-foreground bg-zinc-700">
  <div className="border-border container mx-auto border-t px-6 py-12">
    <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
      {/* Colunas de conteúdo */}
    </div>
  </div>
</footer>
```

**Características:**
- Fundo diferenciado: `bg-zinc-700` (light) / `dark:bg-background` (dark)
- Layout grid responsivo
- Texto em `text-white` para contraste

## Padrões de Aplicação de Tema

### 1. Classes Condicionais por Tema

```tsx
// Exemplo de aplicação condicional
className="bg-gradient-to-r from-[#d500f9] to-black dark:bg-gradient-to-l dark:from-black/10 dark:to-zinc-200/10"

// Estados de hover específicos
className="hover:bg-blue-500 hover:text-white"

// Bordas e fundos adaptativos
className="border border-blue-500 bg-transparent dark:bg-input/30 dark:border-input"
```

### 2. Tokens Semânticos

Sempre priorizar tokens semânticos sobre cores hardcoded:

**✅ Correto - Cores da Empresa:**
```tsx
// Usando cores da empresa
className="bg-primary text-primary-foreground"    // Roxo principal
className="bg-blue text-blue-foreground"          // Azul padrão
className="bg-green text-green-foreground"        // Verde

// Tokens semânticos do sistema
className="bg-background text-foreground border-border"
```

**❌ Evitar - Cores Hardcoded:**
```tsx
className="bg-white text-black border-gray-200"       // Não responsivo ao tema
className="bg-blue-500 text-white"                    // Não usa cores da empresa
className="text-[#d500f9]"                           // Hardcoded, não adapta ao dark mode
```

**🎯 Guia de Uso das Cores da Empresa:**
```tsx
// Primário (Roxo #d500f9) - Use para:
// - Elementos principais da marca
// - CTAs primários
// - Destaques importantes
className="bg-primary text-primary-foreground"

// Azul (#2962ff) - Use para:
// - Botões de ação secundária
// - Links e navegação
// - Estados informativos
className="bg-blue text-blue-foreground"

// Verde (#34a853) - Use para:
// - Estados de sucesso
// - Confirmações positivas
// - Indicadores de progresso
className="bg-green text-green-foreground"
```

### 3. Transparência e Opacidade

```tsx
// Fundos com transparência para melhor adaptação
className="bg-background/80"

// Bordas com opacidade no dark mode
className="border-border dark:border-input"

// Estados hover com opacidade
className="hover:bg-primary/90"
```

### 4. Gradientes Adaptativos

```tsx
// Gradientes que se adaptam ao tema
className="bg-gradient-to-r from-[#d500f9] to-black dark:bg-gradient-to-l dark:from-black/10 dark:to-zinc-200/10"
```

## Componentes Especiais

### 1. Language Select

```tsx
<select className="appearance-none rounded-md border border-border bg-muted py-2 pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors">
```

### 2. Mobile Menu

Utiliza drawer/sheet components com tema adaptativo:
```tsx
<MobileMenu />
```

### 3. Theme Toggler

Componente com animação de transição:
```tsx
<AnimatedThemeToggler className="inline-flex h-10 w-10 items-center justify-center" />
```

## Boas Práticas

### 1. Consistência de Tokens
- Sempre usar tokens semânticos (`--foreground`, `--background`, etc.)
- Evitar cores hardcoded
- Usar opacidade quando necessário (`/80`, `/50`)

### 2. Estados Responsivos
- Desktop first com breakpoints `md:`, `lg:`
- Menu mobile dedicado
- Layout grid adaptativo

### 3. Acessibilidade
- Contraste adequado em ambos os temas
- Estados de foco visíveis
- Labels apropriados para theme toggle

### 4. Performance
- Uso de `backdrop-blur` apenas quando necessário
- Transições CSS performáticas
- View Transitions API para mudança de tema

### 5. Manutenibilidade
- Centralização de tokens no `styles.css`
- Componentes reutilizáveis
- Padrões consistentes de nomenclatura

## Implementação em Novos Componentes

Ao criar novos componentes, seguir esta checklist:

1. **✅ Usar tokens semânticos** - `bg-background`, `text-foreground`
2. **✅ Definir estados dark** - `dark:bg-card`, `dark:text-foreground`
3. **✅ Implementar hover states** - `hover:bg-accent`
4. **✅ Considerar responsividade** - `md:hidden`, `lg:flex`
5. **✅ Manter consistência** - Seguir padrões existentes
6. **✅ Testar ambos os temas** - Light e dark mode
7. **✅ Validar acessibilidade** - Contraste e navegação

Este documento serve como referência para manter a consistência visual e funcional do sistema de tema da aplicação iSelfToken.





