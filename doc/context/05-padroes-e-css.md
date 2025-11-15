# 🎨 Guia de Padrões CSS - iSelfToken
## Design Minimalista & Alto Padrão

## 🌈 Identidade Visual Sofisticada

### Cor Principal da Empresa
<div style="display: inline-block; padding: 16px 32px; background: #d500f9; color: white; border-radius: 4px; font-weight: 300; letter-spacing: 1px; margin: 12px 0; font-size: 14px;">
#d500f9 - MAGENTA ELEGANTE
</div>

**Aplicações Premium:**
- Acentos sutis em elementos estratégicos
- Estados hover e focus minimalistas
- Elementos de navegação principal
- Detalhes de luxo e sofisticação

### Paleta de Cores Premium

#### Fundos Monocromáticos
```css
/* Fundos principais - tons de cinza sofisticados */
bg-primary: oklch(0.090 0.004 49.25)      /* Preto suave */
bg-secondary: oklch(0.120 0.004 49.25)    /* Cinza escuro */
bg-tertiary: oklch(0.160 0.004 49.25)     /* Cinza médio */
bg-card: oklch(0.140 0.004 49.25)         /* Cards premium */
bg-surface: oklch(0.180 0.004 49.25)      /* Superfícies */

/* Cor principal em backgrounds - uso sutil */
bg-accent-primary: rgba(213, 0, 249, 0.05)  /* Acento minimalista */
bg-accent-hover: rgba(213, 0, 249, 0.08)   /* Hover sutil */
```

#### Tipografia Monocromática
```css
/* Hierarquia tipográfica sofisticada */
text-primary: oklch(0.980 0.004 49.25)     /* Branco suave */
text-secondary: oklch(0.850 0.004 49.25)   /* Cinza claro */
text-tertiary: oklch(0.650 0.004 49.25)    /* Cinza médio */
text-muted: oklch(0.450 0.004 49.25)       /* Cinza escuro */

/* Cor principal em textos - uso estratégico */
text-accent: #d500f9                        /* Destaques elegantes */
text-accent-subtle: rgba(213, 0, 249, 0.8) /* Links suaves */
```

#### Bordas Invisíveis
```css
/* Bordas quase invisíveis - design limpo */
border-subtle: oklch(0.180 0.004 49.25)    /* Bordas sutis */
border-card: oklch(0.160 0.004 49.25)      /* Cards */
border-divider: oklch(0.140 0.004 49.25)   /* Divisores */

/* Cor principal em bordas - uso minimalista */
border-accent: rgba(213, 0, 249, 0.2)      /* Focus states */
border-accent-active: rgba(213, 0, 249, 0.4) /* Estados ativos */
```

---

## 🏗️ Layout Minimalista

### Grid System Elegante
```css
/* Layout clean e espaçoso */
.grid-premium {
  @apply grid min-h-dvh lg:grid-cols-2;
  gap: 0; /* Sem divisão visual */
}

.container-elegant {
  @apply flex flex-col gap-8 p-8 sm:p-12 md:p-16;
  max-width: 1400px;
  margin: 0 auto;
}

/* Espaçamento generoso */
.spacing-generous {
  @apply gap-12 lg:gap-16;
}

.padding-premium {
  @apply p-12 sm:p-16 md:p-20;
}
```

### Estrutura Simples
```css
/* Layout limpo sem decorações excessivas */
.layout-clean {
  background: oklch(0.090 0.004 49.25);
  min-height: 100vh;
}

.content-centered {
  @apply flex items-center justify-center;
  padding: 80px 40px;
}
```

---

## 📐 Espaçamentos Generosos

### Sistema de Espaçamento Premium
```css
/* Espaçamentos amplos para respiração visual */
.space-xxs { @apply gap-2; }
.space-xs { @apply gap-4; }
.space-sm { @apply gap-6; }
.space-md { @apply gap-8; }
.space-lg { @apply gap-12; }
.space-xl { @apply gap-16; }
.space-xxl { @apply gap-20; }

/* Padding sofisticado */
.padding-compact { @apply p-6; }
.padding-comfortable { @apply p-8; }
.padding-generous { @apply p-12; }
.padding-luxurious { @apply p-16; }
```

---

## 🎴 Cards Minimalistas

### Design de Cards Premium
```css
.card-premium {
  @apply bg-card border border-subtle;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-premium:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Sem bordas arredondadas excessivas */
.rounded-subtle { border-radius: 4px; }
.rounded-regular { border-radius: 8px; }
.rounded-smooth { border-radius: 12px; }
```

---

## 🔘 Botões Sofisticados

### Botão Principal Elegante
```css
.btn-primary {
  background: #d500f9;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px 24px;
  font-weight: 500;
  letter-spacing: 0.5px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary:hover {
  background: #e400e5;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(213, 0, 249, 0.25);
}

### Botão Sucesso Luxuoso
```css
.btn-success {
  background: #d500f9;
  color: oklch(0.980 0.004 49.25);
  border: none;
  border-radius: 8px;
  padding: 12px 28px;
  font-weight: 600;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.25s ease;
  box-shadow: 0 6px 18px rgba(213, 0, 249, 0.35);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.btn-success:hover {
  background: linear-gradient(135deg, #d500f9, #e400e5);
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 10px 28px rgba(213, 0, 249, 0.45);
}

.btn-success:active {
  animation: success-press 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.btn-success:disabled {
  background: oklch(0.160 0.004 49.25);
  color: oklch(0.450 0.004 49.25);
  box-shadow: none;
  cursor: not-allowed;
}

### Botão Secundário Minimalista
```css
.btn-secondary {
  background: transparent;
  color: oklch(0.850 0.004 49.25);
  border: 1px solid oklch(0.180 0.004 49.25);
  border-radius: 6px;
  padding: 12px 24px;
  font-weight: 400;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: oklch(0.120 0.004 49.25);
  border-color: oklch(0.220 0.004 49.25);
  color: oklch(0.920 0.004 49.25);
}
```

### Botão Ghost (Invisível)
```css
.btn-ghost {
  background: transparent;
  color: oklch(0.650 0.004 49.25);
  border: none;
  padding: 8px 16px;
  font-weight: 400;
  transition: all 0.2s ease;
}

.btn-ghost:hover {
  color: oklch(0.850 0.004 49.25);
  background: rgba(255, 255, 255, 0.05);
}
```

### Botão Cancelar (Outline Sofisticado)
```css
.btn-cancel {
  background: transparent;
  color: oklch(0.650 0.004 49.25);
  border: 1px solid oklch(0.220 0.004 49.25);
  border-radius: 8px;
  padding: 12px 26px;
  font-weight: 500;
  letter-spacing: 0.4px;
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.25s ease,
    color 0.25s ease;
  box-shadow: 0 0 0 1px oklch(0.220 0.004 49.25),
    0 6px 16px rgba(0, 0, 0, 0.3);
}

.btn-cancel:hover {
  color: #d500f9;
  border-color: #d500f9;
  transform: translateY(-2px);
  box-shadow: 0 0 0 1px rgba(213, 0, 249, 0.4),
    0 10px 24px rgba(213, 0, 249, 0.18);
}

.btn-cancel:active {
  transform: translateY(1px);
  box-shadow: 0 0 0 1px rgba(213, 0, 249, 0.5),
    0 4px 12px rgba(213, 0, 249, 0.25);
}
```

---

## 📝 Inputs Elegantes

### Design de Forms Premium
```css
.input-premium {
  background: oklch(0.120 0.004 49.25);
  border: 1px solid oklch(0.180 0.004 49.25);
  border-radius: 6px;
  color: oklch(0.920 0.004 49.25);
  padding: 12px 16px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.input-premium:focus {
  outline: none;
  border-color: rgba(213, 0, 249, 0.3);
  box-shadow: 0 0 0 3px rgba(213, 0, 249, 0.1);
}

.input-premium::placeholder {
  color: oklch(0.450 0.004 49.25);
}
```

---

## ✨ Tipografia Sofisticada

### Fontes e Hierarquia
```css
/* Sistema tipográfico clean */
.font-display {
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 300;
  letter-spacing: -0.5px;
}

.font-body {
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 400;
  line-height: 1.6;
}

.font-accent {
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 500;
  letter-spacing: 0.5px;
}

/* Tamanhos elegantes */
.text-xs { font-size: 12px; line-height: 1.4; }
.text-sm { font-size: 14px; line-height: 1.5; }
.text-base { font-size: 16px; line-height: 1.6; }
.text-lg { font-size: 18px; line-height: 1.5; }
.text-xl { font-size: 20px; line-height: 1.4; }
.text-2xl { font-size: 24px; line-height: 1.3; }
.text-3xl { font-size: 32px; line-height: 1.2; }
```

---

## 🎬 Animações Sutis

### Transições Sofisticadas
```css
/* Animações minimalistas */
.transition-elegant {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.transition-smooth {
  transition: all 0.2s ease-out;
}

/* Hover effects sutis */
.hover-lift:hover {
  transform: translateY(-2px);
}

.hover-glow:hover {
  box-shadow: 0 4px 20px rgba(213, 0, 249, 0.15);
}

@keyframes success-press {
  0% {
    transform: translateY(-1px) scale(1.01);
    box-shadow: 0 10px 28px rgba(213, 0, 249, 0.45);
  }
  60% {
    transform: translateY(1px) scale(0.97);
    box-shadow: 0 4px 12px rgba(213, 0, 249, 0.25);
  }
  100% {
    transform: translateY(0) scale(1);
    box-shadow: 0 6px 18px rgba(213, 0, 249, 0.35);
  }
}
```

---

## 🎯 Aplicações Premium

### Componentes de Alto Padrão
```css
/* Navigation elegante */
.nav-premium {
  background: oklch(0.090 0.004 49.25);
  border-bottom: 1px solid oklch(0.140 0.004 49.25);
  backdrop-filter: blur(10px);
}

/* Cards de conteúdo */
.content-card {
  background: oklch(0.120 0.004 49.25);
  border: 1px solid oklch(0.160 0.004 49.25);
  border-radius: 8px;
  padding: 32px;
}

/* Badges sofisticados */
.badge-premium {
  background: rgba(213, 0, 249, 0.1);
  color: #d500f9;
  border: 1px solid rgba(213, 0, 249, 0.2);
  border-radius: 4px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
}
```

---

## 📋 Referências de Design Premium

### Classes Principais
- `bg-primary` → Preto suave sofisticado
- `text-primary` → Branco suave elegante
- `border-subtle` → Bordas quase invisíveis
- `btn-primary` → Botão magenta elegante
- `card-premium` → Cards minimalistas

### Cores da Paleta Premium
```css
/* Fundos */
--bg-primary: oklch(0.090 0.004 49.25);
--bg-secondary: oklch(0.120 0.004 49.25);
--bg-tertiary: oklch(0.160 0.004 49.25);

/* Textos */
--text-primary: oklch(0.980 0.004 49.25);
--text-secondary: oklch(0.850 0.004 49.25);
--text-tertiary: oklch(0.650 0.004 49.25);

/* Acentos */
--accent-primary: #d500f9;
--accent-subtle: rgba(213, 0, 249, 0.1);
```

---

*Guia de padrões CSS otimizado para design minimalista e alto padrão iSelfToken*