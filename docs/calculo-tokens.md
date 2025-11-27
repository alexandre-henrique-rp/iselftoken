# Lógica de Cálculo de Tokens e Reserva

## 📋 Fórmulas Implementadas

### 1. Quantidade de Tokens da Campanha
```
Quantidade Tokens = Meta de Captação ÷ R$ 200
```

**Exemplo:**
- Meta: R$ 500.000
- Cálculo: 500.000 ÷ 200 = 2.500 tokens

### 2. Valor da Taxa de Reserva
```
Valor Reserva = Quantidade Tokens × R$ 5
```

**Exemplo:**
- Reservar: 100 tokens
- Cálculo: 100 × 5 = R$ 500

## 🎯 Fluxo Completo

1. **Usuário define meta** (ex: R$ 500.000)
2. **Sistema calcula tokens**: 500.000 ÷ 200 = 2.500 tokens totais
3. **Usuário escolhe quantidade para reserva** (ex: 100 tokens)
4. **Sistema calcula valor**: 100 × R$ 5 = R$ 500
5. **Usuário paga taxa de reserva** de R$ 500

## 💰 Valores Fixos

| Item | Valor | Finalidade |
|------|-------|------------|
| Token Campanha | R$ 200 | Valor para investidores |
| Token Reserva | R$ 5 | Taxa de reserva antecipada |

## 🔧 Implementação no Código

```typescript
// Constantes
const VALOR_TOKEN = 200; // R$ 200 por token (campanha)
const VALOR_RESERVA_TOKEN = 5; // R$ 5 por token (reserva)

// Cálculos
const metaNumerica = parseFloat(metaCaptacao) || 0;
// 1. Meta ÷ 200 = Quantidade de tokens da campanha
const quantidadeTokensCampanha = metaNumerica / VALOR_TOKEN;
const quantidadeReservaNumerica = parseInt(quantidadeTokensReserva) || 0;
// 2. Quantidade × R$ 5 = Valor da reserva
const valorTotalReserva = quantidadeReservaNumerica * VALOR_RESERVA_TOKEN;
```

## 🎨 Interface do Usuário

### Step 1 - Configurar Campanha
- Campo para meta de captação
- Preview cards com quantidade de tokens calculada

### Step 2 - Selecionar Tokens
- Card explicativo com fórmulas
- Input para quantidade de reserva
- Limite máximo baseado nos tokens da campanha

### Step 3 - Pagamento
- Exibe valor total da reserva
- Métodos de pagamento disponíveis

## ✅ Validações Implementadas

- **Meta mínima**: R$ 100.000
- **Meta máxima**: Varia por estágio (200k a 1M)
- **Reserva mínima**: 1 token
- **Reserva máxima**: Não pode exceder tokens da campanha

## 📊 Exemplos Práticos

| Meta | Tokens Campanha | Reserva (50%) | Valor Reserva |
|------|-----------------|---------------|---------------|
| R$ 200.000 | 1.000 | 500 | R$ 2.500 |
| R$ 500.000 | 2.500 | 1.250 | R$ 6.250 |
| R$ 800.000 | 4.000 | 2.000 | R$ 10.000 |
| R$ 1.000.000 | 5.000 | 2.500 | R$ 12.500 |

---

**🚀 Resultado:** Sistema claro e transparente para cálculo de tokens e taxas de reserva!
