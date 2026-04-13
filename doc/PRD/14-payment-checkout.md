# PRD — Checkout Pagamento (14-payment-checkout)

## 1. Visão Geral

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Validar token de transação e processar pagamento de investimento |
| **Rota** | `/payment/checkout?transaction={token}` |
| **Path** | `app/routes/private/payment/checkout/index.tsx` |
| **Componentes** | `app/routes/private/payment/checkout/components/*` |
| **APIs** | `PaymentApi.validateTransaction()`, `PaymentApi.processCardPayment()`, `PaymentApi.generatePixCode()`, `PaymentApi.checkPixStatus()` |
| **Tipo** | Private (requer autenticação + token válido) |
| **Design System** | Tailwind CSS v4 + shadcn/ui (tema stone) |
| **Referência de Estilo** | `doc/style/14-payment-checkout.md`, `doc/style/14-payment-checkout.jsx` |

## 2. Dependências

### 2.1 APIs Utilizadas
```typescript
// app/api/paymentApi.ts
PaymentApi.validateTransaction(token: string): Promise<TransactionData>
PaymentApi.processCardPayment(data: CardPaymentDTO): Promise<PaymentResult>
PaymentApi.generatePixCode(transactionId: string): Promise<PixData>
PaymentApi.checkPixStatus(transactionId: string): Promise<PixStatus>
```

### 2.2 Bibliotecas
```typescript
import { jwtVerify, decodeJwt } from 'jose';
```

### 2.3 Contextos
- `AuthContext` — verificação de autenticação
- `UserContext` — dados do comprador

### 2.4 Componentes UI
- `Card` — containers de seção
- `Input` — campos de formulário
- `Button` — CTAs
- `RadioGroup` — seleção de método
- `Select` — parcelas
- `Skeleton` — loading
- `Alert` — mensagens

## 3. Requisitos Funcionais

### 3.1 Validação do Token JWT

| Etapa | Descrição | Erro |
|-------|-----------|------|
| 1. Ler query param | Extrair `transaction` da URL | "Token não fornecido" |
| 2. Decodificar JWT | Usar `jose` para decode | "Token inválido" |
| 3. Validar assinatura | Verificar com chave pública | "Assinatura inválida" |
| 4. Verificar expiração | Checar `exp` claim | "Token expirado" |
| 5. Validar payload | Campos obrigatórios | "Dados incompletos" |

```typescript
interface TransactionJWT {
  transactionId: string;
  productId: string;
  productType: 'token' | 'plan';
  amount: number;
  quantity?: number;
  buyerId: string;
  sellerId?: string;
  exp: number;
  iat: number;
}

async function validateTransactionToken(token: string): Promise<TransactionJWT> {
  try {
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ['RS256']
    });

    if (Date.now() >= payload.exp! * 1000) {
      throw new Error('Token expirado');
    }

    return payload as TransactionJWT;
  } catch (error) {
    throw new Error('Token inválido');
  }
}
```

### 3.2 Fluxo em 3 Etapas

| Etapa | Nome | Descrição |
|-------|------|-----------|
| 1 | Revisão | Dados do comprador + seleção de método |
| 2 | Pagamento | Formulário do método escolhido |
| 3 | Confirmação | Recibo e status final |

```typescript
type CheckoutStep = 'review' | 'payment' | 'confirmation';

interface CheckoutState {
  step: CheckoutStep;
  transaction: TransactionData;
  paymentMethod: 'card' | 'pix' | null;
  cardData?: CardFormData;
  pixData?: PixData;
  result?: PaymentResult;
  isProcessing: boolean;
  error?: string;
}
```

### 3.3 Etapa 1: Revisão

| Seção | Campos |
|-------|--------|
| Dados do comprador | Nome, e-mail, CPF |
| Produto | Nome, descrição, quantidade |
| Resumo | Subtotal, taxas, desconto, total |
| Método | Cartão ou PIX |

```typescript
interface ReviewData {
  buyer: {
    nome: string;
    email: string;
    cpf: string;
  };
  product: {
    nome: string;
    descricao: string;
    tipo: 'token' | 'plan';
    quantidade?: number;
    precoUnitario: number;
  };
  summary: {
    subtotal: number;
    fees: number;
    discount: number;
    total: number;
  };
}
```

### 3.4 Etapa 2: Pagamento por Cartão

| Campo | Tipo | Validação |
|-------|------|-----------|
| Nome no cartão | text | Como impresso |
| Número do cartão | text | 16 dígitos, Luhn |
| Validade | text | MM/AA, não expirado |
| CVV | text | 3-4 dígitos |
| Parcelas | select | 1-10x |

```typescript
interface CardFormData {
  cardholderName: string;
  cardNumber: string;
  expiryDate: string; // MM/YY
  cvv: string;
  installments: number;
}

interface CardPaymentDTO {
  transactionId: string;
  cardData: {
    number: string;
    holderName: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
  };
  installments: number;
  amount: number;
}
```

**Regras de Parcelamento:**

| Parcelas | Juros | Exemplo (R$ 1.000) |
|----------|-------|-------------------|
| 1x | 0% | R$ 1.000,00 |
| 2x | 0% | 2x R$ 500,00 |
| 3x | 0% | 3x R$ 333,33 |
| 4x | 0% | 4x R$ 250,00 |
| 5x | 0% | 5x R$ 200,00 |
| 6x | 2% a.m. | 6x R$ 187,85 |
| 7x | 2% a.m. | 7x R$ 165,05 |
| 8x | 2% a.m. | 8x R$ 148,28 |
| 9x | 2% a.m. | 9x R$ 135,21 |
| 10x | 2% a.m. | 10x R$ 124,72 |

```typescript
function calculateInstallmentValue(
  amount: number,
  installments: number,
  interestRate: number = 0.02
): { value: number; total: number } {
  if (installments <= 5) {
    return {
      value: amount / installments,
      total: amount
    };
  }

  // Juros simples: 2% a.m.
  const months = installments - 5;
  const interest = amount * interestRate * months;
  const total = amount + interest;

  return {
    value: total / installments,
    total
  };
}
```

### 3.5 Etapa 2: Pagamento por PIX

| Elemento | Descrição |
|----------|-----------|
| QR Code | Imagem 256x256px |
| Código | Texto "copia e cola" |
| Validade | Tempo restante |
| Status | Aguardando / Pago |

```typescript
interface PixData {
  qrCodeImage: string; // base64
  qrCodeText: string;
  expiresAt: string;
  transactionId: string;
}

interface PixStatus {
  status: 'pending' | 'paid' | 'expired' | 'error';
  paidAt?: string;
}
```

**Fluxo PIX:**
1. Gerar QR Code via API
2. Exibir código e QR
3. Polling a cada 5s para verificar status
4. Timeout após 15 minutos
5. Redirecionar ao confirmar pagamento

### 3.6 Etapa 3: Confirmação

| Status | Exibição |
|--------|----------|
| Sucesso | Comprovante + CTA |
| Erro | Mensagem + retry |
| Pendente | Aguardando confirmação |

```typescript
interface PaymentResult {
  status: 'approved' | 'pending' | 'rejected' | 'error';
  transactionId: string;
  paymentId?: string;
  receiptUrl?: string;
  message?: string;
  rejectionReason?: string;
}
```

### 3.7 Resumo da Transação (Sidebar)

| Campo | Descrição |
|-------|-----------|
| Produto | Nome e descrição |
| Quantidade | Se aplicável |
| Subtotal | Valor base |
| Taxas | Taxa de serviço |
| Desconto | Cupom aplicado |
| Total | Valor final |
| Parcela | Se parcelado |

```typescript
interface TransactionSummary {
  product: {
    nome: string;
    descricao: string;
    imagem?: string;
  };
  quantidade?: number;
  subtotal: number;
  fees: number;
  discount: number;
  discountCode?: string;
  total: number;
  installmentValue?: number;
  installments?: number;
}
```

## 4. Estruturas de Dados

### 4.1 TransactionData Completo

```typescript
interface TransactionData {
  id: string;
  type: 'token' | 'plan';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

  product: {
    id: string;
    nome: string;
    descricao: string;
    imagemUrl?: string;
    tipo: string;
  };

  buyer: {
    id: string;
    nome: string;
    email: string;
    cpf: string;
  };

  seller?: {
    id: string;
    nome: string;
  };

  pricing: {
    unitPrice: number;
    quantity: number;
    subtotal: number;
    fees: number;
    discount: number;
    total: number;
  };

  payment?: {
    method: 'card' | 'pix';
    status: string;
    paidAt?: string;
  };

  expiresAt: string;
  createdAt: string;
}
```

### 4.2 Exemplo de Resposta API

```json
{
  "id": "txn-001",
  "type": "token",
  "status": "pending",
  "product": {
    "id": "startup-001",
    "nome": "TechFlow Token",
    "descricao": "Token de participação na TechFlow",
    "imagemUrl": "/logos/techflow.png",
    "tipo": "token"
  },
  "buyer": {
    "id": "user-001",
    "nome": "João Silva",
    "email": "joao@email.com",
    "cpf": "***.***.***-00"
  },
  "seller": {
    "id": "startup-001",
    "nome": "TechFlow"
  },
  "pricing": {
    "unitPrice": 5.00,
    "quantity": 100,
    "subtotal": 500.00,
    "fees": 25.00,
    "discount": 0,
    "total": 525.00
  },
  "expiresAt": "2024-01-15T12:00:00Z",
  "createdAt": "2024-01-15T11:30:00Z"
}
```

## 5. Requisitos de UI/UX

### 5.1 Layout (2 Colunas Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│  🔒 Checkout Seguro                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────┬───────────────────────┐   │
│  │ ETAPA 1 DE 3               │ RESUMO DA COMPRA      │   │
│  │ Revisão do pedido          │                       │   │
│  ├─────────────────────────────┤ ┌───────────────────┐ │   │
│  │                             │ │ [IMG] TechFlow    │ │   │
│  │ DADOS DO COMPRADOR          │ │       Token       │ │   │
│  │ ┌─────────────────────────┐ │ └───────────────────┘ │   │
│  │ │ João Silva              │ │                       │   │
│  │ │ joao@email.com          │ │ Quantidade: 100      │   │
│  │ │ ***.***.***-00          │ │ Subtotal: R$ 500,00  │   │
│  │ └─────────────────────────┘ │ Taxas: R$ 25,00      │   │
│  │                             │ ─────────────────────│   │
│  │ MÉTODO DE PAGAMENTO         │ Total: R$ 525,00     │   │
│  │ ┌─────────────────────────┐ │                       │   │
│  │ │ ○ Cartão de crédito     │ │                       │   │
│  │ │ ○ PIX                   │ │                       │   │
│  │ └─────────────────────────┘ │                       │   │
│  │                             │                       │   │
│  │ [Continuar para pagamento]  │                       │   │
│  └─────────────────────────────┴───────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Layout Etapa Cartão

```
┌─────────────────────────────────────────────────────────────┐
│  ETAPA 2 DE 3                 │ RESUMO DA COMPRA      │   │
│  Pagamento com cartão         │                       │   │
├─────────────────────────────────┤                       │   │
│                               │ Total: R$ 525,00      │   │
│ Nome no cartão *              │                       │   │
│ [JOÃO SILVA_________________] │ Parcelas:             │   │
│                               │ 3x R$ 175,00          │   │
│ Número do cartão *            │ sem juros             │   │
│ [4111 1111 1111 1111________] │                       │   │
│                               │                       │   │
│ Validade *        CVV *       │                       │   │
│ [12/25]          [123]       │                       │   │
│                               │                       │   │
│ Parcelas *                    │                       │   │
│ [▼ 3x de R$ 175,00 sem juros] │                       │   │
│                               │                       │   │
│ [← Voltar]  [Finalizar compra]│                       │   │
└─────────────────────────────────┴───────────────────────┘
```

### 5.3 Layout PIX

```
┌─────────────────────────────────────────────────────────────┐
│  ETAPA 2 DE 3                 │ RESUMO DA COMPRA      │   │
│  Pagamento com PIX            │                       │   │
├─────────────────────────────────┤                       │   │
│                               │ Total: R$ 525,00      │   │
│  ┌───────────────────────┐    │                       │   │
│  │                       │    │                       │   │
│  │      [QR CODE]        │    │                       │   │
│  │       256x256         │    │                       │   │
│  │                       │    │                       │   │
│  └───────────────────────┘    │                       │   │
│                               │                       │   │
│  Código PIX:                  │                       │   │
│  ┌───────────────────────┐    │                       │   │
│  │ 00020126580014br...   │    │                       │   │
│  │              [Copiar] │    │                       │   │
│  └───────────────────────┘    │                       │   │
│                               │                       │   │
│  ⏱ Expira em: 14:32          │                       │   │
│  Status: ● Aguardando        │                       │   │
│                               │                       │   │
│  [← Voltar] [Já fiz o pagamento]                      │   │
└─────────────────────────────────┴───────────────────────┘
```

### 5.4 Cores e Estilos

| Elemento | Classe Tailwind |
|----------|-----------------|
| Background página | `bg-stone-950` |
| Card principal | `bg-stone-900 border border-stone-800 rounded-xl` |
| Card resumo | `bg-stone-900/50 border border-stone-800` |
| Header seguro | `bg-green-900/20 border-b border-green-800` |
| Input | `bg-stone-800 border-stone-700 text-stone-100` |
| Input focus | `focus:border-[#d500f9] focus:ring-[#d500f9]` |
| Radio selected | `border-[#d500f9] bg-[#d500f9]/10` |
| Botão primário | `bg-[#d500f9] hover:bg-[#b000d4] text-white` |
| Botão secundário | `bg-stone-800 hover:bg-stone-700` |
| QR Code container | `bg-white p-4 rounded-lg` |
| Status aguardando | `text-yellow-400` |
| Status pago | `text-green-400` |

### 5.5 Responsividade

| Breakpoint | Layout |
|------------|--------|
| Desktop (`≥ 1024px`) | 2 colunas (60/40) |
| Tablet (`768px - 1023px`) | 1 coluna, resumo no topo |
| Mobile (`< 768px`) | 1 coluna, resumo colapsável |

## 6. Estados e Feedbacks

### 6.1 Estados de Loading

| Estado | Comportamento |
|--------|---------------|
| Validando token | Spinner fullscreen |
| Carregando dados | Skeleton no formulário |
| Processando pagamento | Modal com spinner + mensagem |
| Gerando PIX | Spinner no container |

### 6.2 Estados de Erro

| Erro | Mensagem | Ação |
|------|----------|------|
| Token inválido | "Link de pagamento inválido" | Voltar para origem |
| Token expirado | "Este link expirou" | Gerar nova transação |
| Falha no pagamento | "Pagamento não aprovado" | Tentar outro método |
| Cartão recusado | "Cartão recusado: {motivo}" | Tentar outro cartão |
| PIX expirado | "QR Code expirou" | Gerar novo código |

### 6.3 Bloqueio durante Processamento

```typescript
interface ProcessingState {
  isProcessing: boolean;
  message: string;
  canCancel: boolean;
}

// Durante processamento
{
  isProcessing: true,
  message: "Processando pagamento...",
  canCancel: false
}
```

### 6.4 Confirmação de Sucesso

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                        ✓                                    │
│                                                             │
│              Pagamento aprovado!                            │
│                                                             │
│              Transação: #TXN-001                            │
│              Valor: R$ 525,00                               │
│              Método: Cartão (3x)                            │
│                                                             │
│              Um e-mail de confirmação foi enviado.          │
│                                                             │
│              [Baixar comprovante]                           │
│                                                             │
│              [Voltar ao início]                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 7. Segurança

### 7.1 Requisitos Obrigatórios

| Requisito | Implementação |
|-----------|---------------|
| Validação JWT | Sempre verificar assinatura e expiração |
| Mascaramento | CPF e cartão parcialmente ocultos |
| HTTPS | Obrigatório em produção |
| Rate limiting | Max 3 tentativas de pagamento |
| Timeout | Sessão expira em 30 minutos |

### 7.2 Dados Sensíveis

```typescript
// Mascarar CPF
const maskCPF = (cpf: string) =>
  cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.$2.***-$4');

// Mascarar cartão
const maskCard = (number: string) =>
  `**** **** **** ${number.slice(-4)}`;

// Não logar dados sensíveis
const sanitizeForLog = (data: CardFormData) => ({
  ...data,
  cardNumber: maskCard(data.cardNumber),
  cvv: '***'
});
```

### 7.3 Limite de Tentativas

```typescript
interface PaymentAttempts {
  count: number;
  lastAttempt: Date;
  blocked: boolean;
  blockedUntil?: Date;
}

// Bloquear após 3 falhas
if (attempts.count >= 3) {
  attempts.blocked = true;
  attempts.blockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min
}
```

## 8. Fluxo Completo

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Validar    │────▶│   Etapa 1   │────▶│   Etapa 2   │
│   Token     │     │   Revisão   │     │  Pagamento  │
└─────────────┘     └─────────────┘     └─────────────┘
      │                                       │
      │ Erro                                  │
      ▼                                       ▼
┌─────────────┐                        ┌─────────────┐
│   Tela de   │                        │  Processar  │
│    Erro     │                        │  Pagamento  │
└─────────────┘                        └─────────────┘
                                             │
                          ┌──────────────────┼──────────────────┐
                          │                  │                  │
                          ▼                  ▼                  ▼
                   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                   │   Sucesso   │    │   Pendente  │    │    Erro     │
                   │  Etapa 3    │    │   (PIX)     │    │   Retry     │
                   └─────────────┘    └─────────────┘    └─────────────┘
```

## 9. Acessibilidade

| Requisito | Implementação |
|-----------|---------------|
| Focus visible | `focus-visible:ring-2 focus-visible:ring-[#d500f9]` |
| Labels | Todos os inputs com `<label>` associado |
| Erros | `aria-invalid`, `aria-describedby` |
| Progress | `aria-current="step"` nas etapas |
| Loading | `aria-busy="true"`, `aria-live="polite"` |
| QR Code | Alt text descritivo |

## 10. Critérios de Aceitação

- [ ] Token JWT validado corretamente (assinatura + expiração)
- [ ] Erro claro para token inválido/expirado
- [ ] Etapas navegam corretamente
- [ ] Dados do comprador exibidos
- [ ] Seleção de método de pagamento funciona
- [ ] Formulário de cartão valida campos
- [ ] Parcelas calculam juros corretamente
- [ ] QR Code PIX gerado e exibido
- [ ] Código PIX copiável com feedback
- [ ] Timer de expiração funciona
- [ ] Polling verifica status do PIX
- [ ] Processamento bloqueia ações
- [ ] Confirmação exibe comprovante
- [ ] Erro permite retry
- [ ] Dados sensíveis mascarados
- [ ] Responsivo em mobile

## 11. Notas Técnicas

- Usar `jose` para validação JWT
- Formulário com `react-hook-form` + `zod`
- Polling PIX com `setInterval` (cleanup no unmount)
- Copiar código com `navigator.clipboard.writeText()`
- Compressão QR Code em base64
- Timeout de 30s para chamadas de pagamento
- Retry automático em caso de timeout de rede

## 12. Referências Cruzadas

| Documento | Relação |
|-----------|---------|
| [07-layout.md](./07-layout.md) | Layout pai com sidebar |
| [15-special-functions.md](./15-special-functions.md) | Funções de criptografia JWT |
| [css_padrão.md](../css_padrão.md) | Design tokens |
| [SPEC/14-payment-checkout.md](../SPEC/14-payment-checkout.md) | Especificação técnica |
| [style/14-payment-checkout.md](../style/14-payment-checkout.md) | Guia de estilo |
| [style/14-payment-checkout.jsx](../style/14-payment-checkout.jsx) | Exemplo de layout |
