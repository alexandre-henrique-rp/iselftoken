# Checkout de Pagamento - Design Minimalista & Alto Padrão

## 🎨 Identidade Visual Sofisticada

### Cor Principal da Empresa
<div style="display: inline-block; padding: 16px 32px; background: #d500f9; color: white; border-radius: 4px; font-weight: 300; letter-spacing: 1px; margin: 12px 0; font-size: 14px;">
#d500f9 - MAGENTA ELEGANTE
</div>

**Aplicações Premium no Checkout:**
- Botões principais e calls-to-action
- Estados hover e focus minimalistas
- Elementos de navegação e tabs ativas
- Detalhes de luxo e sofisticação

### Paleta de Cores Premium para Checkout
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

## 📐 Estrutura Geral Premium (Desktop)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TELA COMPLETA                                   │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                                                                      │    │
│  │  ┌──────────────────────────────┐  ┌────────────────────────────┐ │    │
│  │  │                              │  │                            │ │    │
│  │  │     DADOS DE PAGAMENTO       │  │     RESUMO DO PEDIDO       │ │    │
│  │  │        (Lado Esquerdo)       │  │     (Lado Direito)         │ │    │
│  │  │           60%                │  │          40%               │ │    │
│  │  │                              │  │                            │ │    │
│  │  └──────────────────────────────┘  └────────────────────────────┘ │    │
│  │                                                                      │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘

Layout: Split-screen minimalista com espaçamento generoso
Espaçamento: Padding premium (80px)
Cores: Fundos monocromáticos com acentos magenta sutis
```

---

## 🎯 Layout Detalhado Premium

### Cabeçalho Sofisticado
```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  iSelfToken                                         [X Sair] │ ← Logo magenta + botão ghost
│                                                               │
└─────────────────────────────────────────────────────────────┘

Design: Fundo preto suave, borda quase invisível
Logo: Cor principal #d500f9, tipografia Inter 300
Botão: Ghost button com hover sutil
```

### Lado Esquerdo - Formulário Premium
```
┌──────────────────────────────────────────┐
│                                          │
│  ← Voltar                                │ ← Link ghost com hover magenta
│                                          │
│  ═══════════════════════════════════    │ ← Divisor sutil
│                                          │
│  FINALIZAR PAGAMENTO                    │ ← Título display (32px, 300)
│                                          │
│  ═══════════════════════════════════    │
│                                          │
│  Forma de pagamento                     │ ← Label secundária (14px, 500)
│                                          │
│  ┌────────────┐  ┌────────────┐        │
│  │    💳      │  │    📱      │        │ ← Tabs minimalistas
│  │  Cartão    │  │    PIX     │        │   (height: 56px, border-radius: 6px)
│  └────────────┘  └────────────┘        │
│     (Ativo magenta)   (Inativo cinza)   │
│                                          │
│  ─────────────────────────────────      │ ← Divisor elegante
│                                          │
│  [CONTEÚDO DINÂMICO]                    │ ← Muda conforme tab
│  - Formulário de Cartão                 │   com transições suaves
│  - OU Dados do PIX                      │
│                                          │
│  ─────────────────────────────────      │
│                                          │
│  ☐ Aceito os termos e condições        │ ← Checkbox minimalista
│                                          │
│  ┌──────────────────────────┐          │
│  │  Finalizar Pagamento     │          │ ← Botão principal magenta
│  └──────────────────────────┘          │   (height: 56px, border-radius: 6px)
│                                          │
│  🔒 Pagamento seguro                    │ ← Texto terciário com ícone
│                                          │
└──────────────────────────────────────────┘

Design: Fundo preto suave, espaçamento generoso
Inputs: Fundo cinza escuro, bordas quase invisíveis
Focus: Borda magenta sutil com shadow elegante
```

### Lado Direito - Resumo Sofisticado
```
┌────────────────────────────────────┐
│                                    │
│  RESUMO DO PEDIDO                 │ ← Título secundário (20px, 300)
│                                    │
│  ══════════════════════════════   │ ← Divisor sutil
│                                    │
│  ┌──────────────────────────┐    │
│  │  [ÍCONE]  ISELF-FUNDADOR │    │ ← Card premium minimalista
│  │                           │    │   com borda sutil
│  │  Plano anual              │    │
│  │  Validade: 12 meses       │    │
│  │                           │    │
│  └──────────────────────────┘    │
│                                    │
│  ──────────────────────────────   │ ← Divisor elegante
│                                    │
│  Subtotal        R$ 000,00        │ ← Linhas de valores (14px)
│  Desconto         - R$ 00,00      │   com espaçamento confortável
│  Taxa             R$ 00,00        │
│                                    │
│  ──────────────────────────────   │
│                                    │
│  TOTAL           R$ 000,00        │ ← Total (24px, 300) com magenta
│                                    │
│  ──────────────────────────────   │
│                                    │
│  💰 Economize R$ XX com PIX       │ ← Badge desconto com fundo verde sutil
│     (5% de desconto)              │
│                                    │
│  ──────────────────────────────   │
│                                    │
│  ✓ Acesso imediato após           │ ← Benefícios com checkmarks
│    confirmação                    │   em verde sutil
│                                    │
│  ✓ Válido por 12 meses            │
│                                    │
│  ✓ Suporte 24/7                   │
│                                    │
└────────────────────────────────────┘

Design: Fundo cinza escuro, cards sofisticados
Cores: Textos em tons monocromáticos, acentos verdes
```

---

## Conteúdo da Tab: Cartão de Crédito Premium
```
┌──────────────────────────────────────────┐
│                                          │
│  💳 Cartão de Crédito                   │ ← Ícone + título secundário
│                                          │
│  Parcelamento                           │ ← Label terciária (14px, 500)
│  ┌────────────────────────────────┐    │
│  │ Selecione as parcelas      ▼   │    │ ← Select premium minimalista
│  └────────────────────────────────┘    │   (height: 56px, fundo cinza escuro)
│                                          │
│  ─────────────────────────────────      │
│                                          │
│  Número do cartão                       │ ← Label
│  ┌────────────────────────────────┐    │
│  │ 1234 5678 9012 3456            │    │ ← Input com máscara
│  └────────────────────────────────┘    │
│                                          │
│  ┌─────────────────┐  ┌──────────────┐ │
│  │ Validade        │  │ CVV          │ │ ← Dois inputs lado a lado
│  │ MM/AA        ▼  │  │ 123          │ │   (45% e 45% da largura)
│  └─────────────────┘  └──────────────┘ │
│                                          │
│  ─────────────────────────────────      │
│                                          │
│  Nome no cartão                         │ ← Label
│  ┌────────────────────────────────┐    │
│  │ NOME COMO ESTÁ NO CARTÃO        │    │ ← Input uppercase
│  └────────────────────────────────┘    │
│                                          │
└──────────────────────────────────────────┘
```

## 📱 Conteúdo da Tab: PIX Premium
```
┌──────────────────────────────────────────┐
│                                          │
│  📱 Pagamento via PIX                    │ ← Ícone + título secundário
│                                          │
│  ══════════════════════════════════     │ ← Divisor sutil
│                                          │
│  💰 5% de desconto exclusivo             │ ← Badge premium com fundo verde sutil
│     ao pagar com PIX                     │
│                                          │
│  ══════════════════════════════════     │
│                                          │
│  Como funciona:                         │ ← Instruções em texto terciário
│                                          │
│  1. Clique em "Gerar código PIX"        │
│  2. Escaneie o QR Code ou copie o       │
│     código                               │
│  3. Realize o pagamento no app do       │
│     seu banco                            │
│  4. Aguarde a confirmação automática    │
│                                          │
│  ─────────────────────────────────      │ ← Divisor elegante
│                                          │
│  ┌──────────────────────────┐          │
│  │   Gerar Código PIX       │          │ ← Botão outline com magenta
│  └──────────────────────────┘          │   (hover: fundo magenta sutil)
│                                          │
│  [APÓS CLICAR - MOSTRA QR CODE]         │ ← Estado dinâmico
│                                          │
└──────────────────────────────────────────┘

Design: Fundo preto suave, elementos minimalistas
Cores: Verde sutil para badges, magenta para ações
```

## 🔄 Estado: PIX Gerado (Premium)
```
┌──────────────────────────────────────────┐
│                                          │
│  📱 Pagamento via PIX                    │ ← Título secundário
│                                          │
│  ══════════════════════════════════     │ ← Divisor sutil
│                                          │
│       ┌─────────────────┐               │
│       │                 │               │
│       │   [QR CODE]     │               │ ← QR Code premium (200x200)
│       │   Fundo branco  │               │   com borda arredondada
│       │   Borda suave   │               │
│       └─────────────────┘               │
│                                          │
│  Escaneie o QR Code acima               │ ← Instrução principal
│  ou copie o código PIX                  │
│                                          │
│  ┌────────────────────────────────┐    │
│  │ 1234-5678-9012-3456-7890-1234 │    │ ← Código PIX copiável
│  │                                │    │   com fundo cinza escuro
│  └────────────────────────────────┘    │
│                                          │
│  📋 Copiar código                       │ ← Botão ghost com hover magenta
│                                          │
│  ─────────────────────────────────      │
│                                          │
│  ⏳ Aguardando pagamento...              │ ← Status em amarelo sutil
│     Tempo restante: 29:59               │
│                                          │
│  💡 Dica: O pagamento é confirmado      │ ← Dica em texto terciário
│     automaticamente em até 5 minutos    │
│                                          │
│                                          │
│  🔄 Aguardando pagamento...             │ ← Status (pulsando)
│                                          │
│  O pagamento será confirmado            │
│  automaticamente                        │
│                                          │
└──────────────────────────────────────────┘
```

## 🎨 Componentes CSS Premium

### Container Principal Sofisticado
```css
.checkout-container {
  display: flex;
  background: oklch(0.090 0.004 49.25); /* Preto suave */
  min-height: 100vh;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

### Cabeçalho Premium
```css
.checkout-header {
  position: fixed;
  top: 0;
  width: 100%;
  background: oklch(0.090 0.004 49.25);
  border-bottom: 1px solid oklch(0.180 0.004 49.25); /* Borda quase invisível */
  padding: 20px 80px; /* Padding premium */
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  backdrop-filter: blur(10px);
  background: rgba(9, 9, 9, 0.95);
}

/* Logo com cor principal */
.checkout-logo {
  color: #d500f9; /* Magenta elegante */
  font-size: 24px;
  font-weight: 300;
  letter-spacing: 1px;
  text-decoration: none;
  transition: opacity 0.3s ease;
}

.checkout-logo:hover {
  opacity: 0.8;
}

/* Botão Sair minimalista */
.btn-sair {
  color: oklch(0.650 0.004 49.25); /* Cinza médio */
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.3s ease;
  background: transparent;
  border: 1px solid oklch(0.180 0.004 49.25);
  padding: 8px 16px;
  border-radius: 6px;
}

.btn-sair:hover {
  color: oklch(0.980 0.004 49.25); /* Branco suave */
  border-color: oklch(0.450 0.004 49.25);
  background: oklch(0.120 0.004 49.25);
}
```

### Layout Split-Screen Premium
```css
.checkout-content {
  display: flex;
  margin-top: 80px; /* Altura do cabeçalho fixo */
  min-height: calc(100vh - 80px);
}

/* Lado esquerdo - Formulário */
.form-section {
  flex: 0 0 60%; /* 60% da largura */
  background: oklch(0.090 0.004 49.25);
  padding: 80px; /* Padding generoso */
  overflow-y: auto;
}

/* Lado direito - Resumo */
.summary-section {
  flex: 0 0 40%; /* 40% da largura */
  background: oklch(0.120 0.004 49.25); /* Cinza escuro */
  padding: 80px 60px;
  border-left: 1px solid oklch(0.180 0.004 49.25);
  overflow-y: auto;
}
```

### Botões Premium
```css
/* Botão principal com cor principal */
.btn-primary {
  background: #d500f9;
  color: white;
  border: none;
  padding: 16px 32px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  letter-spacing: 0.5px;
}

.btn-primary:hover {
  background: rgba(213, 0, 249, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(213, 0, 249, 0.25);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 4px 12px rgba(213, 0, 249, 0.2);
}

/* Botão outline (cancelar/voltar) */
.btn-outline {
  background: transparent;
  color: #d500f9;
  border: 1px solid #d500f9;
  padding: 16px 32px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
}

.btn-outline:hover {
  background: rgba(213, 0, 249, 0.1);
  color: oklch(0.980 0.004 49.25);
  border-color: rgba(213, 0, 249, 0.6);
}

/* Botão ghost minimalista */
.btn-ghost {
  background: transparent;
  color: oklch(0.650 0.004 49.25);
  border: 1px solid oklch(0.180 0.004 49.25);
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-ghost:hover {
  color: #d500f9;
  border-color: #d500f9;
  background: rgba(213, 0, 249, 0.05);
}
```

### Inputs Premium
```css
.input-field {
  width: 100%;
  background: oklch(0.140 0.004 49.25); /* Fundo card */
  border: 1px solid oklch(0.180 0.004 49.25); /* Borda quase invisível */
  border-radius: 6px;
  padding: 16px 20px;
  font-size: 16px;
  color: oklch(0.980 0.004 49.25); /* Texto branco suave */
  transition: all 0.3s ease;
  outline: none;
}

.input-field::placeholder {
  color: oklch(0.450 0.004 49.25); /* Texto muted */
}

.input-field:focus {
  border-color: #d500f9;
  box-shadow: 0 0 0 3px rgba(213, 0, 249, 0.1);
  background: oklch(0.160 0.004 49.25);
}

.input-field:invalid {
  border-color: oklch(0.650 0.008 15); /* Vermelho sutil */
}

/* Select premium */
.select-field {
  width: 100%;
  background: oklch(0.140 0.004 49.25);
  border: 1px solid oklch(0.180 0.004 49.25);
  border-radius: 6px;
  padding: 16px 20px;
  font-size: 16px;
  color: oklch(0.980 0.004 49.25);
  transition: all 0.3s ease;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23650' d='M6 8L0 0h12z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 20px center;
  padding-right: 48px;
}

.select-field:focus {
  border-color: #d500f9;
  box-shadow: 0 0 0 3px rgba(213, 0, 249, 0.1);
}
```

### Tabs Minimalistas
```css
.tabs-container {
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
}

.tab-button {
  flex: 1;
  background: oklch(0.140 0.004 49.25);
  border: 1px solid oklch(0.180 0.004 49.25);
  border-radius: 6px;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 500;
  color: oklch(0.650 0.004 49.25);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tab-button:hover {
  background: oklch(0.160 0.004 49.25);
  color: oklch(0.850 0.004 49.25);
}

.tab-button.active {
  background: #d500f9;
  color: white;
  border-color: #d500f9;
  box-shadow: 0 4px 12px rgba(213, 0, 249, 0.2);
}

.tab-button .icon {
  font-size: 20px;
}
```

### Cards Sofisticados
```css
.card {
  background: oklch(0.140 0.004 49.25);
  border: 1px solid oklch(0.180 0.004 49.25);
  border-radius: 8px;
  padding: 24px;
  transition: all 0.3s ease;
}

.card:hover {
  border-color: oklch(0.220 0.004 49.25);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* Card do plano */
.plan-card {
  background: oklch(0.140 0.004 49.25);
  border: 1px solid oklch(0.180 0.004 49.25);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
  text-align: center;
}

.plan-name {
  font-size: 18px;
  font-weight: 600;
  color: oklch(0.980 0.004 49.25);
  margin-bottom: 8px;
}

.plan-description {
  font-size: 14px;
  color: oklch(0.650 0.004 49.25);
  margin-bottom: 16px;
}
```

### Badges Premium
```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

/* Badge de desconto */
.badge-success {
  background: oklch(0.650 0.006 150); /* Verde sutil */
  color: oklch(0.980 0.004 49.25);
}

/* Badge de status */
.badge-warning {
  background: oklch(0.720 0.008 60); /* Amarelo sutil */
  color: oklch(0.090 0.004 49.25);
}

/* Badge de erro */
.badge-error {
  background: oklch(0.650 0.008 15); /* Vermelho sutil */
  color: oklch(0.980 0.004 49.25);
}
```

### Checkbox Minimalista
```css
.checkbox-container {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 24px;
}

.checkbox-input {
  width: 20px;
  height: 20px;
  background: oklch(0.140 0.004 49.25);
  border: 1px solid oklch(0.180 0.004 49.25);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  appearance: none;
  position: relative;
  margin-top: 2px;
}

.checkbox-input:checked {
  background: #d500f9;
  border-color: #d500f9;
}

.checkbox-input:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 14px;
  font-weight: 600;
}

.checkbox-label {
  color: oklch(0.850 0.004 49.25);
  font-size: 14px;
  line-height: 1.5;
  cursor: pointer;
}

.checkbox-label a {
  color: #d500f9;
  text-decoration: none;
  transition: opacity 0.3s ease;
}

.checkbox-label a:hover {
  opacity: 0.8;
  text-decoration: underline;
}
```

### QR Code Premium
```css
.qr-code-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 32px 0;
}

.qr-code {
  background: white;
  border: 1px solid oklch(0.180 0.004 49.25);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.qr-code img {
  width: 200px;
  height: 200px;
  display: block;
}

/* Código PIX copiável */
.pix-code {
  background: oklch(0.140 0.004 49.25);
  border: 1px solid oklch(0.180 0.004 49.25);
  border-radius: 6px;
  padding: 16px 20px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: oklch(0.980 0.004 49.25);
  margin-bottom: 16px;
  text-align: center;
  word-break: break-all;
  position: relative;
}

.copy-button {
  background: transparent;
  color: #d500f9;
  border: 1px solid #d500f9;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.copy-button:hover {
  background: rgba(213, 0, 249, 0.1);
  color: oklch(0.980 0.004 49.25);
}

.copy-button.copied {
  background: oklch(0.650 0.006 150);
  color: oklch(0.980 0.004 49.25);
  border-color: oklch(0.650 0.006 150);
}
```

### Animações Sofisticadas
```css
/* Animação de carregamento */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading {
  animation: pulse 2s ease-in-out infinite;
}

/* Animação de sucesso */
@keyframes slideInUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.success-animation {
  animation: slideInUp 0.5s ease-out;
}

/* Animação de erro */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.error-animation {
  animation: shake 0.5s ease-in-out;
}

/* Transições suaves para todos os elementos */
* {
  transition: color 0.3s ease, background-color 0.3s ease, border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
}
```

---

## 📱 Layout Responsivo Premium

### Tablet (768px - 1023px)
```css
@media (max-width: 1023px) {
  .checkout-content {
    flex-direction: column;
  }
  
  .form-section,
  .summary-section {
    flex: 1;
    padding: 60px 40px;
  }
  
  .summary-section {
    border-left: none;
    border-top: 1px solid oklch(0.180 0.004 49.25);
  }
  
  .checkout-header {
    padding: 20px 40px;
  }
}
```

### Mobile (até 767px)
```css
@media (max-width: 767px) {
  .checkout-header {
    padding: 16px 20px;
  }
  
  .checkout-logo {
    font-size: 20px;
  }
  
  .form-section,
  .summary-section {
    padding: 40px 20px;
  }
  
  .tabs-container {
    flex-direction: column;
  }
  
  .tab-button {
    padding: 14px 20px;
  }
  
  .input-field,
  .select-field,
  .btn-primary,
  .btn-outline {
    padding: 14px 18px;
    font-size: 16px; /* Evita zoom no iOS */
  }
  
  .qr-code img {
    width: 160px;
    height: 160px;
  }
}
```

---

## 🎯 Estados e Feedback Premium

### Estados de Carregamento
```css
.loading-state {
  position: relative;
  opacity: 0.6;
  pointer-events: none;
}

.loading-state::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  margin: -10px 0 0 -10px;
  border: 2px solid oklch(0.180 0.004 49.25);
  border-top: 2px solid #d500f9;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

### Estados de Sucesso
```css
.success-state {
  background: oklch(0.650 0.006 150);
  color: oklch(0.980 0.004 49.25);
  border-color: oklch(0.650 0.006 150);
  animation: success-animation 0.5s ease-out;
}

.success-icon {
  display: inline-block;
  width: 20px;
  height: 20px;
  background: oklch(0.980 0.004 49.25);
  border-radius: 50%;
  position: relative;
  margin-right: 8px;
}

.success-icon::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: oklch(0.650 0.006 150);
  font-size: 14px;
  font-weight: bold;
}
```

### Estados de Erro
```css
.error-state {
  background: oklch(0.650 0.008 15);
  color: oklch(0.980 0.004 49.25);
  border-color: oklch(0.650 0.008 15);
  animation: error-animation 0.5s ease-out;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: oklch(0.650 0.008 15);
  border: 1px solid oklch(0.650 0.008 15);
  border-radius: 6px;
  color: oklch(0.980 0.004 49.25);
  font-size: 14px;
  margin-bottom: 16px;
}
```

---

## 🔒 Segurança e Acessibilidade Premium

### Indicadores de Segurança
```css
.security-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  color: oklch(0.650 0.004 49.25);
  font-size: 12px;
  margin-top: 16px;
}

.security-icon {
  color: oklch(0.650 0.006 150);
  font-size: 16px;
}

.ssl-badge {
  background: oklch(0.140 0.004 49.25);
  border: 1px solid oklch(0.180 0.004 49.25);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 10px;
  color: oklch(0.650 0.006 150);
  font-weight: 600;
  letter-spacing: 0.5px;
}
```

### Acessibilidade
```css
/* Focus visível para navegação por teclado */
.input-field:focus,
.btn-primary:focus,
.btn-outline:focus,
.tab-button:focus,
.checkbox-input:focus {
  outline: 2px solid #d500f9;
  outline-offset: 2px;
}

/* Alto contraste para modo escuro */
@media (prefers-contrast: high) {
  .input-field {
    border-width: 2px;
  }
  
  .btn-primary {
    border: 2px solid oklch(0.980 0.004 49.25);
  }
}

/* Redução de movimento para usuários sensíveis */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## ✨ Implementação React/TypeScript Premium

### Componente Principal
```typescript
import React, { useState } from 'react';
import { CreditCard, Smartphone, Lock, ArrowLeft, Check } from 'lucide-react';

interface CheckoutData {
  paymentMethod: 'credit' | 'pix';
  cardNumber: string;
  cardName: string;
  expiryDate: string;
  cvv: string;
  installments: string;
  termsAccepted: boolean;
}

const CheckoutPremium: React.FC = () => {
  const [formData, setFormData] = useState<CheckoutData>({
    paymentMethod: 'credit',
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    installments: '1',
    termsAccepted: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [pixGenerated, setPixGenerated] = useState(false);

  const handlePaymentMethodChange = (method: 'credit' | 'pix') => {
    setFormData(prev => ({ ...prev, paymentMethod: method }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Lógica de processamento
  };

  return (
    <div className="checkout-container">
      {/* Componentes implementados com os estilos premium */}
    </div>
  );
};

export default CheckoutPremium;
```

---

## 🎯 Conclusão

Este design de checkout premium combina:

- **Minimalismo sofisticado** com fundos monocromáticos
- **Cor principal #d500f9** aplicada estrategicamente
- **Componentes elegantes** com transições suaves
- **Acessibilidade completa** com foco visível e navegação por teclado
- **Responsividade perfeita** para todos os dispositivos
- **Feedback visual claro** para estados de carregamento, sucesso e erro
- **Segurança perceptível** com indicadores visuais de proteção

O resultado é uma experiência de checkout transmissível, profissional e confiável que reflete a qualidade e sofisticação da marca iSelfToken.
```

### Lado Esquerdo (Formulário)
```css
flex: 1;
max-width: 60%;
padding: 60px 80px;
background: #0a0a0a;
overflow-y: auto;
```

### Lado Direito (Resumo)
```css
flex: 1;
max-width: 40%;
padding: 60px 40px;
background: #151515;
border-left: 1px solid #2a2a2a;
position: sticky;
top: 80px;
height: calc(100vh - 80px);
overflow-y: auto;
```

### Link Voltar
```css
color: #a0a0a0;
font-size: 14px;
display: flex;
align-items: center;
gap: 8px;
margin-bottom: 32px;
cursor: pointer;
transition: color 0.3s;
```

**Hover**
```css
color: #FF00FF;
```

### Título Principal
```css
color: #ffffff;
font-size: 32px;
font-weight: bold;
margin-bottom: 40px;
```

### Label de Seção
```css
color: #ffffff;
font-size: 16px;
font-weight: 600;
margin-bottom: 16px;
```

### Tabs de Pagamento
```css
display: flex;
gap: 16px;
margin-bottom: 40px;
```

### Tab Individual
```css
flex: 1;
height: 60px;
background: #1a1a1a;
border: 2px solid #2a2a2a;
border-radius: 12px;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
gap: 4px;
cursor: pointer;
transition: all 0.3s ease;
```

**Tab Ativa**
```css
background: rgba(255, 0, 255, 0.1);
border-color: #FF00FF;
```

**Tab Hover**
```css
border-color: #FF00FF;
transform: translateY(-2px);
```

**Ícone da Tab**
```css
font-size: 24px;
```

**Texto da Tab**
```css
color: #a0a0a0;
font-size: 14px;
font-weight: 600;
```

**Texto Tab Ativa**
```css
color: #FF00FF;
```

### Select/Dropdown de Parcelas
```css
width: 100%;
height: 48px;
background: #1a1a1a;
border: 2px solid #2a2a2a;
border-radius: 8px;
color: #ffffff;
padding: 0 16px;
font-size: 14px;
margin-bottom: 24px;
cursor: pointer;
transition: border-color 0.3s;
```

**Focus**
```css
border-color: #FF00FF;
outline: none;
```

### Inputs de Formulário
```css
width: 100%;
height: 48px;
background: #1a1a1a;
border: 2px solid #2a2a2a;
border-radius: 8px;
color: #ffffff;
padding: 0 16px;
font-size: 14px;
margin-bottom: 24px;
transition: border-color 0.3s;
```

**Focus**
```css
border-color: #FF00FF;
outline: none;
```

**Error**
```css
border-color: #ff4444;
```

### Inputs em Linha (Validade/CVV)
```css
display: flex;
gap: 16px;
```

**Input Validade**
```css
flex: 1;
```

**Input CVV**
```css
width: 120px;
position: relative;
```

### Ícones de Bandeiras
```css
display: flex;
gap: 12px;
margin-bottom: 24px;
```

**Ícone Individual**
```css
width: 40px;
height: 28px;
opacity: 0.3;
transition: opacity 0.3s;
```

**Bandeira Detectada**
```css
opacity: 1;
```

### Tooltip CVV
```css
position: absolute;
right: 12px;
top: 50%;
transform: translateY(-50%);
width: 20px;
height: 20px;
background: #2a2a2a;
border-radius: 50%;
display: flex;
align-items: center;
justify-content: center;
cursor: help;
color: #a0a0a0;
font-size: 12px;
```

### Checkbox Termos
```css
display: flex;
align-items: flex-start;
gap: 12px;
margin-bottom: 32px;
color: #a0a0a0;
font-size: 14px;
line-height: 1.5;
```

**Checkbox Input**
```css
width: 20px;
height: 20px;
accent-color: #FF00FF;
cursor: pointer;
flex-shrink: 0;
```

**Link nos Termos**
```css
color: #FF00FF;
text-decoration: underline;
```

### Botão Principal (Finalizar)
```css
width: 100%;
height: 56px;
background: #FF00FF;
color: #ffffff;
border: none;
border-radius: 12px;
font-size: 16px;
font-weight: bold;
cursor: pointer;
transition: all 0.3s ease;
margin-bottom: 16px;
text-transform: uppercase;
letter-spacing: 0.5px;
```

**Hover**
```css
background: #ff33ff;
transform: translateY(-2px);
box-shadow: 0 8px 24px rgba(255, 0, 255, 0.3);
```

**Disabled**
```css
background: #2a2a2a;
color: #666666;
cursor: not-allowed;
```

### Botão Secundário (Gerar PIX/Copiar)
```css
width: 100%;
height: 48px;
background: transparent;
color: #FF00FF;
border: 2px solid #FF00FF;
border-radius: 12px;
font-size: 16px;
font-weight: bold;
cursor: pointer;
transition: all 0.3s ease;
```

**Hover**
```css
background: rgba(255, 0, 255, 0.1);
```

### Texto Segurança
```css
display: flex;
align-items: center;
justify-content: center;
gap: 8px;
color: #a0a0a0;
font-size: 13px;
```

### Card do Plano (Resumo)
```css
background: #1a1a1a;
border: 2px solid #2a2a2a;
border-radius: 12px;
padding: 20px;
margin-bottom: 24px;
display: flex;
align-items: center;
gap: 16px;
```

**Ícone do Plano**
```css
width: 48px;
height: 48px;
color: #FF00FF;
flex-shrink: 0;
```

**Título do Plano**
```css
color: #FF00FF;
font-size: 16px;
font-weight: bold;
margin-bottom: 4px;
```

**Subtítulo**
```css
color: #a0a0a0;
font-size: 13px;
```

### Linhas de Valores
```css
display: flex;
justify-content: space-between;
padding: 12px 0;
color: #e0e0e0;
font-size: 14px;
```

**Linha Total**
```css
font-size: 24px;
font-weight: bold;
color: #ffffff;
padding: 16px 0;
border-top: 2px solid #2a2a2a;
border-bottom: 2px solid #2a2a2a;
margin: 16px 0;
```

### Badge Desconto PIX
```css
background: rgba(0, 200, 100, 0.15);
border: 1px solid rgba(0, 200, 100, 0.3);
border-radius: 8px;
padding: 16px;
margin: 16px 0;
text-align: center;
```

**Ícone**
```css
font-size: 24px;
margin-bottom: 8px;
```

**Texto**
```css
color: #00c864;
font-size: 14px;
font-weight: 600;
```

### Lista de Benefícios
```css
margin-top: 24px;
```

**Item**
```css
display: flex;
align-items: flex-start;
gap: 12px;
padding: 8px 0;
color: #e0e0e0;
font-size: 14px;
```

**Checkmark**
```css
color: #00c864;
font-size: 16px;
flex-shrink: 0;
margin-top: 2px;
```

### QR Code Container
```css
display: flex;
flex-direction: column;
align-items: center;
padding: 32px 0;
```

**QR Code**
```css
width: 200px;
height: 200px;
background: #ffffff;
padding: 16px;
border-radius: 12px;
margin-bottom: 24px;
```

### Campo Código PIX
```css
width: 100%;
height: 48px;
background: #1a1a1a;
border: 2px solid #2a2a2a;
border-radius: 8px;
color: #a0a0a0;
padding: 0 16px;
font-size: 12px;
font-family: monospace;
margin-bottom: 16px;
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
```

### Timer Countdown
```css
display: flex;
align-items: center;
gap: 8px;
color: #ff9800;
font-size: 14px;
font-weight: bold;
padding: 12px 0;
```

### Status Aguardando
```css
display: flex;
align-items: center;
gap: 12px;
color: #FF00FF;
font-size: 14px;
font-weight: 600;
padding: 16px;
background: rgba(255, 0, 255, 0.1);
border-radius: 8px;
margin: 16px 0;
```

**Ícone Pulsando**
```css
animation: pulse 1.5s infinite;
```
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

## Layout Responsivo

### Tablet (768px - 1024px)
```
┌─────────────────────────────────┐
│  iSelfToken              [Sair] │
├─────────────────────────────────┤
│                                 │
│  ← Voltar                       │
│                                 │
│  FINALIZAR PAGAMENTO            │
│                                 │
│  ┌───────┐  ┌───────┐          │
│  │ Cartão│  │  PIX  │          │
│  └───────┘  └───────┘          │
│                                 │
│  [Formulário completo]          │
│                                 │
│  ─────────────────────────      │
│                                 │
│  RESUMO DO PEDIDO               │
│                                 │
│  [Card do plano]                │
│                                 │
│  Subtotal     R$ 000,00         │
│  TOTAL        R$ 000,00         │
│                                 │
│  [Finalizar Pagamento]          │
│                                 │
└─────────────────────────────────┘

Layout: 1 coluna
Ordem: Formulário → Resumo
Padding: 40px 24px
```

### Mobile (< 768px)
```
┌─────────────────────┐
│ iSelfToken  [Sair] │
├─────────────────────┤
│                     │
│ ← Voltar            │
│                     │
│ FINALIZAR           │
│ PAGAMENTO           │
│                     │
│ ┌────┐  ┌────┐     │
│ │💳  │  │📱  │     │
│ │Card│  │PIX │     │
│ └────┘  └────┘     │
│                     │
│ [Form compacto]     │
│                     │
│ ───────────────     │
│                     │
│ RESUMO              │
│                     │
│ ┌─────────────┐    │
│ │ Plano       │    │
│ │ R$ 000,00   │    │
│ └─────────────┘    │
│                     │
│ ───────────────     │
│                     │
│ [Finalizar]         │
│                     │
└─────────────────────┘

Layout: 1 coluna estreita
Tabs: ícones maiores, texto menor
Inputs: altura padrão (48px)
Padding: 24px 16px
```

## Estados e Validações

### Estado: Carregando
```
┌──────────────────────────┐
│                          │
│  [Spinner animado]       │
│                          │
│  Processando pagamento...│
│                          │
└──────────────────────────┘
```

### Estado: Sucesso
```
┌──────────────────────────┐
│                          │
│      ✓ [Grande]          │
│                          │
│  Pagamento confirmado!   │
│                          │
│  Redirecionando...       │
│                          │
└──────────────────────────┘

Background: verde escuro
Ícone: verde brilhante
Auto-redirect: 3s
```

### Estado: Erro
```
┌──────────────────────────┐
│                          │
│      ✕ [Grande]          │
│                          │
│  Erro no pagamento       │
│                          │
│  [Mensagem específica]   │
│                          │
│  [Tentar novamente]      │
│                          │
└──────────────────────────┘

Background: vermelho escuro
Ícone: vermelho
Mensagem: específica do erro
```

### Validação de Campos

**Campo Inválido**
```css
border-color: #ff4444;
```

**Mensagem de Erro**
```css
color: #ff4444;
font-size: 12px;
margin-top: -16px;
margin-bottom: 16px;
```

**Exemplos:**
- "Número de cartão inválido"
- "Data de validade expirada"
- "CVV inválido"
- "CPF inválido"

## Animações e Transições

### Troca de Tabs
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tab-content {
  animation: fadeIn 0.3s ease;
}
```

### Spinner de Loading
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  border: 3px solid #2a2a2a;
  border-top-color: #FF00FF;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 0.8s linear infinite;
}
```

### Pulse do Status PIX
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
}
```

## Segurança e Badges

### Badges de Segurança (Footer)
```
🔒 Pagamento seguro | 🛡️ SSL Certificado | 💳 PCI Compliant
```

### Logos de Bandeiras Aceitas
```
[Visa] [Mastercard] [Elo] [Amex] [Hipercard]
```

### Selo de Segurança
```
┌────────────────┐
│   🔐 100%      │
│   SEGURO       │
└────────────────┘
```

## Paleta de Cores
```
# - Rosa principal (destaques, botões, bordas ativas)
#0a0a0a - Fundo principal
#151515 - Fundo resumo (lado direito)
#1a1a1a - Fundo cards e inputs
#2a2a2a - Bordas e divisores
#ffffff - Texto principal
#e0e0e0 - Texto secundário
#a0a0a0 - Texto terciário (labels, placeholders)
#00c864 - Verde (sucesso, desconto PIX)
#ff4444 - Vermelho (erro)
#ff9800 - Laranja (avisos, timer)
```

## Acessibilidade

- Labels sempre associados aos inputs
- Placeholders descritivos
- Mensagens de erro claras e específicas
- Contraste mínimo 4.5:1
- Foco visível em todos os elementos interativos
- Navegação por teclado funcional
- ARIA labels para screen readers
- Tooltips informativos