# Planos Anuais - Design Minimalista & Alto Padrão

## 🎨 Identidade Visual Sofisticada

### Cor Principal da Empresa
<div style="display: inline-block; padding: 16px 32px; background: #d500f9; color: white; border-radius: 4px; font-weight: 300; letter-spacing: 1px; margin: 12px 0; font-size: 14px;">
#d500f9 - MAGENTA ELEGANTE
</div>

**Aplicações Premium nos Planos:**
- Nomes dos planos e elementos de destaque
- Estados hover e cards recomendados
- Botões de seleção e calls-to-action
- Ícones e elementos de navegação

### Paleta de Cores Premium para Planos
```css
/* Fundos monocromáticos sofisticados */
--bg-primary: oklch(0.090 0.004 49.25);      /* Preto suave */
--bg-secondary: oklch(0.120 0.004 49.25);    /* Cinza escuro */
--bg-tertiary: oklch(0.160 0.004 49.25);     /* Cinza médio */
--bg-card: oklch(0.140 0.004 49.25);         /* Cards premium */
--bg-surface: oklch(0.180 0.004 49.25);      /* Superfícies */

/* Tipografia elegante */
--text-primary: oklch(0.980 0.004 49.25);     /* Branco suave */
--text-secondary: oklch(0.850 0.004 49.25);   /* Cinza claro */
--text-tertiary: oklch(0.650 0.004 49.25);    /* Cinza médio */
--text-muted: oklch(0.450 0.004 49.25);       /* Cinza escuro */

/* Cor principal - uso estratégico */
--accent-primary: #d500f9;                    /* Magenta elegante */
--accent-subtle: rgba(213, 0, 249, 0.1);      /* Acento minimalista */
--accent-hover: rgba(213, 0, 249, 0.08);      /* Hover sutil */

/* Cores funcionais sofisticadas */
--success: oklch(0.650 0.006 150);            /* Verde sutil */
--error: oklch(0.650 0.008 15);              /* Vermelho sutil */
--warning: oklch(0.720 0.008 60);            /* Amarelo sutil */
--border-subtle: oklch(0.180 0.004 49.25);    /* Bordas quase invisíveis */
```

---

## 💎 Planos de Taxa de Adesão

**Validade:** 1 ano para todas as taxas de adesão

### 📈 ISELF-INVESTIDOR
- **Compra de tokens** para investimento
- **Revenda de tokens** adquiridos com lucro
- **Acesso dashboard** de investimentos

### 🚀 ISELF-FUNDADOR  
- **Compra de tokens** para investimento
- **Revenda de tokens** adquiridos com lucro
- **Cadastro de startups** para captação de investimento
- **Acesso exclusivo** a oportunidades de fundador

### 🤝 ISELF-AFILIADO
- **Compra de tokens** para investimento  
- **Revenda de tokens** adquiridos com lucro
- **Recompensa por indicação** de novos investidores
- **Programa de afiliação** com comissões progressivas

---

## 📐 Estrutura Geral Premium (Desktop)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TELA COMPLETA                                   │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  iSelfToken                                                         │    │
│  │                                                                      │    │
│  │                    ESCOLHA SUA TAXA DE ADESÃO                       │    │
│  │              A taxa de adesão terá validade de 1 ano                │    │
│  │                                                                      │    │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │    │
│  │  │              │    │              │    │              │         │    │
│  │  │   PLANO 1    │    │   PLANO 2    │    │   PLANO 3    │         │    │
│  │  │ Investidor   │    │  Fundador    │    │  Afiliado    │         │    │
│  │  │              │    │              │    │              │         │    │
│  │  └──────────────┘    └──────────────┘    └──────────────┘         │    │
│  │                                                                      │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘

Layout: Grid 3 colunas com espaçamento premium
Espaçamento: Padding generoso (80px vertical)
Cores: Fundos monocromáticos com acentos magenta sutis
Cards: Design sofisticado com bordas quase invisíveis
```

---

## 🎯 Layout Detalhado Premium

### Cabeçalho Sofisticado
```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  iSelfToken                                                 │ ← Logo magenta + ícone sutil
│                                                               │
│         ─────────────────────────────────────                │ ← Divisor elegante
│                                                               │
│            ESCOLHA SUA TAXA DE ADESÃO                        │ ← Título display (40px, 300)
│                                                               │
│       A taxa de adesão terá validade de 1 ano               │ ← Subtítulo terciário (16px, 500)
│                                                               │
│         ─────────────────────────────────────                │ ← Divisor elegante
│                                                               │
└─────────────────────────────────────────────────────────────┘

Design: Fundo preto suave com tipografia Inter
Logo: Cor principal #d500f9, peso 300, letter-spacing 1px
Divisores: Linhas sutis com oklch(0.180 0.004 49.25)
```

### Cards de Planos Premium (3 colunas)
```
                         ┌─────────────────────┐
┌─────────────────────┐  |    [recomendado]    |  ┌─────────────────────┐
│                     │  │                     │  │                     │
│  ISELF-INVESTIDOR   │  │  ISELF-FUNDADOR     │  │  ISELF-AFILIADO     │ ← Nome do plano (magenta)
│                     │  │                     │  │                     │   (20px, 600, #d500f9)
│  ─────────────────  │  │  ─────────────────  │  │  ─────────────────  │ ← Divisor sutil
│                     │  │                     │  │                     │
│      [ÍCONE]        │  │      [ÍCONE]        │  │      [ÍCONE]        │ ← Ícone magenta (64px)
│                     │  │                     │  │                     │
│                     │  │                     │  │                     │
│    R$ 000,00/ano    │  │    R$ 000,00/ano    │  │    R$ 000,00/ano    │ ← Preço display (32px, 300)
│                     │  │                     │  │                     │
│  ─────────────────  │  │  ─────────────────  │  │  ─────────────────  │ ← Divisor elegante
│                     │  │                     │  │                     │
│  Benefícios:        │  │  Benefícios:        │  │  Benefícios:        │ ← Label (14px, 500)
│                     │  │                     │  │                     │
│  ✓ Compra de        │  │  ✓ Compra de        │  │  ✓ Compra de        │ ← Lista benefícios
│    tokens           │  │    tokens           │  │    tokens           │   (14px, verde sutil)
│                     │  │                     │  │                     │
│  ✓ Revenda de       │  │  ✓ Revenda de       │  │  ✓ Revenda de       │
│    tokens           │  │    tokens           │  │    tokens           │
│    adquiridos       │  │    adquiridos       │  │    adquiridos       │
│                     │  │                     │  │                     │
│                     │  │  ✓ Cadastro de      │  │  ✓ Recompensa por   │
│                     │  │    startups para    │  │    indicação de     │
│                     │  │    captação         │  │    novos            │
│                     │  │                     │  │    investidores     │
│                     │  │                     │  │                     │
│  ┌───────────────┐  │  │  ┌───────────────┐  │  │  ┌───────────────┐  │
│  │  Selecionar   │  │  │  │  Selecionar   │  │  │  │  Selecionar   │  │ ← Botões premium
│  └───────────────┘  │  │  └───────────────┘  │  │  └───────────────┘  │   (48px, border-radius: 6px)
│                     │  │                     │  │                     │
└─────────────────────┘  |                     |  └─────────────────────┘
                         └─────────────────────┘

Design: Cards com fundo cinza escuro e bordas sutis
Hover: Borda magenta com shadow elegante
Checkmarks: Verde sutil para benefícios
Botões: Branco com hover magenta (exceto recomendado)
```

---

## 🎨 Componentes CSS Premium

### Container Principal Sofisticado
```css
.planos-container {
  background: oklch(0.090 0.004 49.25); /* Preto suave */
  min-height: 100vh;
  padding: 80px 40px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

### Cabeçalho Premium
```css
.planos-header {
  text-align: center;
  margin-bottom: 80px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

/* Logo com cor principal */
.planos-logo {
  position: absolute;
  top: 24px;
  left: 40px;
  color: #d500f9; /* Magenta elegante */
  font-size: 24px;
  font-weight: 300;
  letter-spacing: 1px;
  text-decoration: none;
  transition: opacity 0.3s ease;
}

.planos-logo:hover {
  opacity: 0.8;
}

/* Título display */
.planos-title {
  color: oklch(0.980 0.004 49.25); /* Branco suave */
  font-size: 40px;
  font-weight: 300;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
  line-height: 1.2;
}

/* Subtítulo terciário */
.planos-subtitle {
  color: oklch(0.650 0.004 49.25); /* Cinza médio */
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
}

/* Divisores elegantes */
.planos-divider {
  width: 80px;
  height: 1px;
  background: oklch(0.180 0.004 49.25); /* Borda quase invisível */
  margin: 32px auto;
}
```

### Grid de Cards Premium
```css
.planos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Card individual sofisticado */
.plano-card {
  background: oklch(0.140 0.004 49.25); /* Fundo card */
  border: 1px solid oklch(0.180 0.004 49.25); /* Borda quase invisível */
  border-radius: 12px;
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

/* Hover elegante */
.plano-card:hover {
  border-color: #d500f9;
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(213, 0, 249, 0.15);
  background: oklch(0.160 0.004 49.25);
}

/* Card recomendado (destaque) */
.plano-card.recomendado {
  border-color: #d500f9;
  transform: scale(1.02);
  box-shadow: 0 8px 32px rgba(213, 0, 249, 0.2);
}

/* Badge "Recomendado" */
.plano-badge {
  position: absolute;
  top: -12px;
  background: #d500f9;
  color: oklch(0.980 0.004 49.25);
  padding: 8px 24px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
```

### Elementos do Card Premium

/* Nome do plano com cor principal */
.plano-nome {
  color: #d500f9; /* Magenta elegante */
  font-size: 20px;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 24px;
  text-align: center;
  letter-spacing: 0.5px;
}

/* Ícone representativo */
.plano-icone {
  width: 64px;
  height: 64px;
  margin-bottom: 24px;
  color: #d500f9;
  transition: transform 0.3s ease;
}

.plano-card:hover .plano-icone {
  transform: scale(1.1);
}

/* Preço display */
.plano-preco {
  color: oklch(0.980 0.004 49.25); /* Branco suave */
  font-size: 32px;
  font-weight: 300;
  margin-bottom: 8px;
  line-height: 1;
}

/* Período */
.plano-periodo {
  color: oklch(0.650 0.004 49.25); /* Cinza médio */
  font-size: 14px;
  margin-bottom: 32px;
}

/* Divisor elegante */
.plano-divisor {
  width: 100%;
  height: 1px;
  background: oklch(0.180 0.004 49.25);
  margin: 24px 0;
}

/* Label benefícios */
.plano-beneficios-label {
  color: oklch(0.850 0.004 49.25); /* Cinza claro */
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 16px;
  align-self: flex-start;
}

/* Lista de benefícios */
.plano-beneficios {
  width: 100%;
  margin-bottom: 32px;
}

/* Item de benefício */
.plano-beneficio-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
  color: oklch(0.850 0.004 49.25); /* Cinza claro */
  font-size: 14px;
  line-height: 1.5;
}

/* Checkmark verde sutil */
.plano-checkmark {
  color: oklch(0.650 0.006 150); /* Verde sutil */
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}
```

### Botões Premium
```css
/* Botão selecionar padrão */
.plano-botao {
  width: 100%;
  height: 56px; /* Altura premium */
  background: oklch(0.980 0.004 49.25); /* Branco suave */
  color: oklch(0.090 0.004 49.25); /* Preto suave */
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: auto;
  letter-spacing: 0.5px;
}

.plano-botao:hover {
  background: #d500f9;
  color: oklch(0.980 0.004 49.25);
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(213, 0, 249, 0.25);
}

/* Botão do card recomendado */
.plano-card.recomendado .plano-botao {
  background: #d500f9;
  color: oklch(0.980 0.004 49.25);
}

.plano-card.recomendado .plano-botao:hover {
  background: oklch(0.980 0.004 49.25);
  color: #d500f9;
}

/* Botão selecionado */
.plano-card.selecionado .plano-botao {
  background: oklch(0.650 0.006 150); /* Verde sutil */
  color: oklch(0.980 0.004 49.25);
}

.plano-card.selecionado .plano-botao::after {
  content: ' ✓ Selecionado';
}
```

---

## 📱 Layout Responsivo Premium

### Tablet (768px - 1024px)
```css
@media (max-width: 1024px) {
  .planos-grid {
    grid-template-columns: 1fr;
    gap: 32px;
    max-width: 600px;
  }
  
  .planos-container {
    padding: 60px 24px;
  }
  
  .planos-header {
    margin-bottom: 60px;
  }
  
  .plano-card {
    padding: 32px 24px;
  }
  
  .planos-title {
    font-size: 32px;
  }
  
  .plano-preco {
    font-size: 28px;
  }
}
```
```
┌─────────────────────────────────────┐
│                                     │
│     ESCOLHA SUA TAXA DE ADESÃO     │
│  A taxa de adesão terá validade... │
│                                     │
│  ┌───────────────┐                 │
│  │               │                 │
│  │  Investidor   │                 │
│  │               │                 │
│  └───────────────┘                 │
│                                     │
│  ┌───────────────┐                 │
│  │               │                 │
│  │  Fundador     │                 │
│  │               │                 │
│  └───────────────┘                 │
│                                     │
│  ┌───────────────┐                 │
│  │               │                 │
│  │  Afiliado     │                 │
│  │               │                 │
│  └───────────────┘                 │
│                                     │
└─────────────────────────────────────┘

Layout: Grid 1 coluna centralizada
Gap: 32px entre cards
Padding: 60px vertical, 24px horizontal
Cards: Largura máxima 600px
```

### Mobile (< 768px)
```css
@media (max-width: 767px) {
  .planos-container {
    padding: 40px 16px;
  }
  
  .planos-header {
    margin-bottom: 40px;
  }
  
  .planos-title {
    font-size: 28px;
    font-weight: 400;
  }
  
  .planos-subtitle {
    font-size: 14px;
  }
  
  .plano-card {
    padding: 24px 20px;
  }
  
  .plano-nome {
    font-size: 18px;
  }
  
  .plano-preco {
    font-size: 24px;
  }
  
  .plano-botao {
    height: 52px;
    font-size: 15px;
  }
  
  .plano-icone {
    width: 56px;
    height: 56px;
  }
}
```
```
┌─────────────────────┐
│                     │
│  iSelfToken         │
│                     │
│  ESCOLHA SUA        │
│  TAXA DE ADESÃO     │
│                     │
│  Validade: 1 ano    │
│                     │
│ ┌─────────────────┐ │
│ │                 │ │
│ │  Investidor     │ │
│ │                 │ │
│ │  R$ 000,00/ano  │ │
│ │                 │ │
│ │  ✓ Benefício 1  │ │
│ │  ✓ Benefício 2  │ │
│ │                 │ │
│ │  [Selecionar]   │ │
│ │                 │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │   Fundador      │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │   Afiliado      │ │
│ └─────────────────┘ │
│                     │
└─────────────────────┘

Layout: Cards full-width
Gap: 24px vertical
Padding: 40px vertical, 16px horizontal
Botões: Altura 52px para touch-friendly
```

---

## 🎯 Variações de Estado Premium

### Card Normal
```css
.plano-card {
  background: oklch(0.140 0.004 49.25);
  border: 1px solid oklch(0.180 0.004 49.25);
  transform: translateY(0);
}
```
```
┌─────────────────────┐
│                     │
│  ISELF-INVESTIDOR   │
│      [ÍCONE]        │
│   R$ 000,00/ano     │
│  ─────────────────  │
│  Benefícios...      │
│  [Selecionar]       │
│                     │
└─────────────────────┘

Design: Fundo cinza escuro com borda sutil
Borda: oklch(0.180 0.004 49.25) quase invisível
Background: oklch(0.140 0.004 49.25) card premium
```

### Card Hover
```css
.plano-card:hover {
  border-color: #d500f9;
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(213, 0, 249, 0.15);
  background: oklch(0.160 0.004 49.25);
}
```
```
┌─────────────────────┐
│                     │ ↑ Elevado 8px
│  ISELF-INVESTIDOR   │
│      [ÍCONE]        │
│   R$ 000,00/ano     │
│  ─────────────────  │
│  Benefícios...      │
│  [Selecionar]       │
│                     │
└─────────────────────┘

Design: Borda magenta com shadow elegante
Borda: #d500f9 (cor principal)
Shadow: 0 12px 40px rgba(213, 0, 249, 0.15)
Background: oklch(0.160 0.004 49.25) mais claro
```

### Card Recomendado
```css
.plano-card.recomendado {
  border-color: #d500f9;
  transform: scale(1.02);
  box-shadow: 0 8px 32px rgba(213, 0, 249, 0.2);
}
```
```
     [RECOMENDADO]     ← Badge magenta elegante
┌─────────────────────┐
│                     │ Escala: 1.02
│  ISELF-FUNDADOR     │
│      [ÍCONE]        │
│   R$ 000,00/ano     │
│  ─────────────────  │
│  Benefícios...      │
│  [Selecionar]       │
│                     │
└─────────────────────┘

Design: Destaque sutil com borda magenta
Badge: Fundo #d500f9, texto branco
Botão: Background magenta permanente
Shadow: Glow magenta sofisticado
```

### Card Selecionado
```css
.plano-card.selecionado {
  border-color: oklch(0.650 0.006 150);
  background: rgba(100, 200, 100, 0.05);
}

.plano-card.selecionado::before {
  content: '✓';
  position: absolute;
  top: 16px;
  right: 16px;
  color: oklch(0.650 0.006 150);
  font-size: 20px;
  font-weight: bold;
}
```
```
┌─────────────────────┐
│                ✓    │ ← Check verde no canto
│  ISELF-AFILIADO     │
│      [ÍCONE]        │
│   R$ 000,00/ano     │
│  ─────────────────  │
│  Benefícios...      │
│  [Selecionado ✓]    │ ← Botão verde
│                     │
└─────────────────────┘

Design: Feedback visual claro de seleção
Borda: Verde sutil oklch(0.650 0.006 150)
Background: Overlay verde sutil (5%)
Checkmark: Indicador no topo direito
```

---

## 🎨 Ícones Premium para cada Plano

### 📈 ISELF-INVESTIDOR
- **TrendingUp** - Crescimento e investimentos
- **Briefcase** - Portfólio profissional
- **BarChart3** - Análise e dados
- **Coins** - Tokens e criptoativos

### 🚀 ISELF-FUNDADOR
- **Rocket** - Inovação e crescimento
- **Crown** - Status premium
- **Star** - Destaque e excelência
- **Building** - Startups e empreendedorismo

### 🤝 ISELF-AFILIADO
- **Handshake** - Parcerias e colaboração
- **Users** - Rede e conexões
- **Gift** - Recompensas e benefícios
- **Share2** - Indicações e compartilhamento

---

## ✨ Animações Sofisticadas

### Entrada dos Cards
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.plano-card {
  animation: fadeInUp 0.6s ease-out forwards;
  opacity: 0;
}

.plano-card:nth-child(1) { animation-delay: 0.1s; }
.plano-card:nth-child(2) { animation-delay: 0.2s; }
.plano-card:nth-child(3) { animation-delay: 0.3s; }
```

### Hover Interativo
```css
.plano-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.plano-icone {
  transition: transform 0.3s ease;
}

.plano-card:hover .plano-icone {
  transform: scale(1.1) rotate(5deg);
}

.plano-botao {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Seleção Animada
```css
@keyframes selectPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(100, 200, 100, 0.4);
  }
  70% {
    box-shadow: 0 0 0 20px rgba(100, 200, 100, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(100, 200, 100, 0);
  }
}

.plano-card.selecionado {
  animation: selectPulse 0.6s ease-out;
}
```

---

## 🔒 Acessibilidade Premium

### Navegação por Teclado
```css
/* Focus visível e elegante */
.plano-card:focus,
.plano-botao:focus {
  outline: 2px solid #d500f9;
  outline-offset: 2px;
}

/* Skip to content */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: #d500f9;
  color: white;
  padding: 8px;
  text-decoration: none;
  border-radius: 4px;
  z-index: 1000;
}

.skip-link:focus {
  top: 6px;
}
```

### Contraste e Legibilidade
```css
/* Alto contraste para modo escuro */
@media (prefers-contrast: high) {
  .plano-card {
    border-width: 2px;
  }
  
  .plano-nome {
    font-weight: 700;
  }
  
  .plano-botao {
    border: 2px solid oklch(0.980 0.004 49.25);
  }
}

/* Redução de movimento */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

### ARIA Labels
```html
<div class="plano-card" role="article" aria-label="Plano ISELF-Investidor">
  <h3 class="plano-nome">ISELF-INVESTIDOR</h3>
  <button class="plano-botao" aria-describedby="preco-investidor">
    Selecionar Plano
  </button>
  <div id="preco-investidor" class="sr-only">
    R$ 000,00 por ano
  </div>
</div>
```

---

## 🎯 Implementação React/TypeScript Premium

### Componente Principal
```typescript
import React, { useState } from 'react';
import { TrendingUp, Rocket, Handshake, Check, Star } from 'lucide-react';

interface Plano {
  id: string;
  nome: string;
  preco: string;
  periodo: string;
  beneficios: string[];
  icone: React.ReactNode;
  recomendado?: boolean;
}

const PlanosPremium: React.FC = () => {
  const [planoSelecionado, setPlanoSelecionado] = useState<string | null>(null);

  const planos: Plano[] = [
    {
      id: 'investidor',
      nome: 'ISELF-INVESTIDOR',
      preco: 'R$ 000,00',
      periodo: '/ano',
      beneficios: [
        'Compra de tokens para investimento',
        'Revenda de tokens adquiridos com lucro',
        'Acesso dashboard de investimentos'
      ],
      icone: <TrendingUp size={64} />
    },
    {
      id: 'fundador',
      nome: 'ISELF-FUNDADOR',
      preco: 'R$ 000,00',
      periodo: '/ano',
      beneficios: [
        'Compra de tokens para investimento',
        'Revenda de tokens adquiridos com lucro',
        'Cadastro de startups para captação',
        'Acesso exclusivo a oportunidades'
      ],
      icone: <Rocket size={64} />,
      recomendado: true
    },
    {
      id: 'afiliado',
      nome: 'ISELF-AFILIADO',
      preco: 'R$ 000,00',
      periodo: '/ano',
      beneficios: [
        'Compra de tokens para investimento',
        'Revenda de tokens adquiridos com lucro',
        'Recompensa por indicação',
        'Programa de afiliação progressivo'
      ],
      icone: <Handshake size={64} />
    }
  ];

  const handleSelecionarPlano = (planoId: string) => {
    setPlanoSelecionado(planoId);
    // Lógica de seleção
  };

  return (
    <div className="planos-container">
      <header className="planos-header">
        <a href="/" className="planos-logo">iSelfToken</a>
        <h1 className="planos-title">Escolha Sua Taxa de Adesão</h1>
        <p className="planos-subtitle">
          A taxa de adesão terá validade de 1 ano
        </p>
        <div className="planos-divider"></div>
      </header>

      <main className="planos-grid">
        {planos.map((plano) => (
          <article
            key={plano.id}
            className={`plano-card ${plano.recomendado ? 'recomendado' : ''} ${
              planoSelecionado === plano.id ? 'selecionado' : ''
            }`}
            role="article"
            aria-label={`Plano ${plano.nome}`}
          >
            {plano.recomendado && (
              <span className="plano-badge">Recomendado</span>
            )}
            
            <h3 className="plano-nome">{plano.nome}</h3>
            <div className="plano-icone">{plano.icone}</div>
            
            <div className="plano-preco">
              {plano.preco}
              <span className="plano-periodo">{plano.periodo}</span>
            </div>
            
            <div className="plano-divisor"></div>
            
            <div className="plano-beneficios-label">Benefícios:</div>
            <ul className="plano-beneficios">
              {plano.beneficios.map((beneficio, index) => (
                <li key={index} className="plano-beneficio-item">
                  <span className="plano-checkmark" aria-hidden="true">
                    <Check size={16} />
                  </span>
                  {beneficio}
                </li>
              ))}
            </ul>
            
            <button
              className="plano-botao"
              onClick={() => handleSelecionarPlano(plano.id)}
              aria-describedby={`preco-${plano.id}`}
            >
              {planoSelecionado === plano.id ? 'Selecionado' : 'Selecionar Plano'}
            </button>
            
            <div id={`preco-${plano.id}`} className="sr-only">
              {plano.preço}{plano.periodo}
            </div>
          </article>
        ))}
      </main>
    </div>
  );
};

export default PlanosPremium;
```

---

## 🎯 Conclusão

Este design de planos premium combina:

- **Minimalismo sofisticado** com fundos monocromáticos oklch
- **Cor principal #d500f9** aplicada estrategicamente em elementos-chave
- **Componentes elegantes** com transições suaves e micro-interações
- **Acessibilidade completa** com foco visível e navegação por teclado
- **Responsividade perfeita** para desktop, tablet e mobile
- **Feedback visual claro** para estados hover, recomendado e selecionado
- **Animações sutis** que não comprometem a performance
- **Implementação React/TypeScript** completa e acessível

O resultado é uma experiência de seleção de planos transmissível, profissional e premium que reflete a qualidade e sofisticação da marca iSelfToken, mantendo a usabilidade e acessibilidade como prioridades.