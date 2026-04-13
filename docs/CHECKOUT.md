# Documentação do Sistema de Checkout

## Visão Geral

O sistema de checkout foi completamente reestruturado para oferecer uma experiência profissional e modular, processando pagamentos para qualquer tipo de produto através de uma janela popup otimizada (1025x768 pixels).

## 🏗️ Arquitetura

### Componentes Principais

1. **Página de Checkout** (`/src/app/(public)/checkout/page.tsx`)
   - Interface principal processamento de pagamentos
   - Suporte a múltiplos métodos (Cartão/PIX)
   - Sistema de cupons de desconto
   - Cálculo automático de serviços adicionais

2. **Serviço de Storage** (`/src/services/CheckoutStorageService.ts`)
   - Gerenciamento de dados no localStorage
   - Validação de dados de entrada
   - Cálculo de valores e formatação

3. **Serviço de Cupons** (`/src/services/CupomService.ts`)
   - Validação de cupons via API
   - Sistema de fallback para desenvolvimento
   - Suporte a descontos percentuais e fixos

4. **Componente de Integração** (`/src/components/chekout/index.ts`)
   - Interface simplificada para abrir checkout
   - Configuração automática da janela popup

## 📋 Estrutura de Dados

### CheckoutData (Interface Principal)

```typescript
interface CheckoutData {
  userName: string;              // Obrigatório
  userId: string;                // Obrigatório
  valor: string;                 // Obrigatório (ex: "R$ 1.500,00")
  productName: string;           // Obrigatório
  productType: string;           // Obrigatório
  productDescription: string;    // Obrigatório
  validity?: number;              // Opcional (meses)
  obs?: string;                  // Opcional
  addServicesDescription?: AdditionalService[]; // Opcional
}
```

### AdditionalService (Serviços Adicionais)

```typescript
interface AdditionalService {
  description: string;           // Descrição do serviço
  value: number;                 // Valor numérico do serviço
}
```

### CupomData (Cupons de Desconto)

```typescript
interface CupomData {
  code: string;                  // Código do cupom
  discountType: 'percentage' | 'fixed'; // Tipo de desconto
  discountValue: number;         // Valor do desconto
  isValid: boolean;              // Status de validação
  message?: string;              // Mensagem de feedback
}
```

## 🚀 Como Usar

### 1. Importar o Componente

```typescript
import Checkout from '@/components/chekout';
import { AdditionalService } from '@/types/Checkout';
```

### 2. Básico (Apenas Campos Obrigatórios)

```typescript
Checkout({
  userName: 'João Silva',
  userId: 'usr_12345',
  valor: 'R$ 99,90',
  productName: 'Plano Básico',
  productType: 'plano',
  productDescription: 'Acesso básico à plataforma'
});
```

### 3. Completo (Com Serviços Adicionais)

```typescript
const servicosAdicionais: AdditionalService[] = [
  {
    description: 'Suporte Prioritário 24/7',
    value: 49.90
  },
  {
    description: 'Backup Automático Diário',
    value: 19.90
  }
];

Checkout({
  userName: 'Maria Santos',
  userId: 'usr_67890',
  valor: 'R$ 299,90',
  productName: 'Plano Premium',
  productType: 'plano',
  productDescription: 'Acesso completo com todos os recursos',
  validity: 12,
  obs: 'Renovação automática com desconto',
  addServicesDescription: servicosAdicionais
});
```

## 💰 Cálculo de Valores

O sistema calcula automaticamente:

1. **Valor Base**: Valor principal do produto
2. **Serviços Adicionais**: Soma de todos os serviços extras
3. **Subtotal**: Valor base + serviços adicionais
4. **Desconto**: Aplicado sobre o subtotal (se cupom válido)
5. **Total**: Subtotal - desconto

### Exemplo de Cálculo

```
Valor Base: R$ 299,90
Serviço 1: + R$ 49,90
Serviço 2: + R$ 19,90
Subtotal: R$ 369,70
Cupom 10%: - R$ 36,97
Total: R$ 332,73
```

## 🎫 Sistema de Cupons

### Cupons de Teste (Fallback)

Para desenvolvimento/teste, os seguintes cupons são válidos:

- `DESCONTO10` - 10% de desconto
- `DESCONTO20` - 20% de desconto  
- `FIXO50` - R$ 50 de desconto fixo
- `PROMO2025` - 15% de desconto especial

### Validação via API

O sistema tenta validar cupons via API:

```typescript
POST /api/cupons/validar
{
  "code": "DESCONTO10",
  "amount": 369.70
}
```

### Resposta Esperada

```typescript
{
  "code": "DESCONTO10",
  "discountType": "percentage",
  "discountValue": 10,
  "isValid": true,
  "message": "10% de desconto aplicado!"
}
```

## 💳 Métodos de Pagamento

### Cartão de Crédito

- Parcelamento automático baseado no valor
- Até 3x sem juros para valores < R$ 500
- Até 10x sem juros para valores ≥ R$ 500 e < R$ 3000
- Até 15x sem juros para valores ≥ R$ 3000

### PIX

- Geração de QR Code simulado
- Timer de 30 minutos com alertas
- Cópia automática do código
- Contagem regressiva visual

## 🔧 Configuração da Janela

- **Dimensões**: 1025x768 pixels
- **Posicionamento**: Centralizada na tela
- **Opções**: Redimensionável, com scrollbars
- **Foco**: Automático ao abrir

## 🛡️ Segurança

- Dados criptografados via SSL
- Validação de todos os campos
- Limpeza automática do localStorage
- Timer de expiração para sessões PIX

## 📱 Responsividade

A página é otimizada especificamente para:
- Desktop (1025x768)
- Tablets (redimensionável)
- Não recomendado para mobile (usar versão mobile-specific)

## 🔄 Fluxo Completo

1. **Chamada do Componente**: `Checkout(dados)`
2. **Salvamento**: Dados salvos no localStorage
3. **Abertura**: Nova janela popup centralizada
4. **Carregamento**: Dados recuperados e validados
5. **Interação**: Usuário preenche dados de pagamento
6. **Cupons**: Aplicação de descontos (opcional)
7. **Processamento**: Simulação de pagamento
8. **Conclusão**: Limpeza e fechamento da janela

## 🐛 Troubleshooting

### Dados Não Encontrados

Verifique se:
- Os dados obrigatórios foram fornecidos
- O localStorage está habilitado
- Não há bloqueadores de popup

### Cupom Inválido

Verifique se:
- O código está na lista de cupons de teste
- A API está respondendo corretamente
- O valor é suficiente para descontos fixos

### Janela Não Abre

Verifique se:
- Bloqueadores de popup estão desativados
- As dimensões da tela são suficientes
- O caminho `/checkout` está correto

## 📈 Métricas e Logs

O sistema inclui logging detalhado:

```javascript
console.log('📋 Dados do checkout carregados:', data);
console.log('🎉 Cupom aplicado com sucesso:', cupom);
console.log('💳 Processando pagamento...', paymentData);
```

## 🔄 Futuras Melhorias

- [ ] Integração com gateway de pagamento real
- [ ] Versão mobile responsiva
- [ ] Sistema de assinaturas recorrentes
- [ ] Histórico de pagamentos
- [ ] Múltiplas moedas
- [ ] Internacionalização

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar o console do navegador
2. Consultar os logs do sistema
3. Testar com cupons de exemplo
4. Validar estrutura de dados
