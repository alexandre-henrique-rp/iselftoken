# **Documentação Técnica \- Checkout de Pagamento**

## **Informações Gerais**

| Propriedade | Valor |
| :---- | :---- |
| **Rota** | /payment/checkout |
| **Query Param** | ?transaction={jwt\_token} |
| **Path** | /app/routes/private/payment/checkout/index.tsx |
| **Componentes Únicos** | /app/routes/private/payment/checkout/components/\* |
| **Type** | Private (Checkout Seguro) |
| **Framework** | React \+ Tailwind CSS v4 |
| **Tema** | Dark (Stone) |

## **Dependências**

### **Ícones (Lucide React)**

import {   
  CreditCard, QrCode, ShieldCheck, Lock,   
  ChevronRight, ChevronLeft, CheckCircle,   
  AlertTriangle, Copy, Loader2, Calendar, User  
} from 'lucide-react';

## **Estrutura da Página**

O layout é dividido em **2 colunas principais** (no desktop):

1. **Esquerda (Fluxo de Pagamento):** Onde o usuário interage (escolhe método, preenche dados).  
2. **Direita (Resumo do Pedido):** Informações estáticas da transação, valores e totais.

### **Lógica de Estados (Machine State Simplificado)**

1. **Loading:** Validando e decodificando o token.  
2. **Error:** Token inválido ou expirado (expiresAt \< now).  
3. **Checkout:**  
   * *Step 1:* Revisão de dados e escolha do método.  
   * *Step 2:* Inserção de dados (Cartão) ou Visualização (PIX).  
4. **Processing:** Enviando pagamento para o gateway.  
5. **Success:** Recibo final.

## **Funcionalidades Detalhadas**

### **1\. Validação do Token (Simulada)**

Ao carregar, o useEffect tenta ler transaction da URL.

* Se válido: Popula o estado transactionData.  
* Se expirado: Redireciona para estado de erro.

### **2\. Cálculo de Parcelamento (Juros)**

Função calculateInstallments(total):

* **1x a 5x:** Sem juros (total / parcelas).  
* **6x a 10x:** Juros simples de 2% a.m. (Configurável).  
  * Fórmula: total \* (1 \+ (taxa \* parcelas)).  
  * Ex: R$ 1.000 em 10x \= R$ 1.000 \* (1 \+ 0.20) \= R$ 1.200 (10x de R$ 120).

### **3\. Pagamento via PIX**

* Gera um QR Code estático (placeholder) e uma string "Copia e Cola".  
* Botão de copiar para área de transferência.  
* Timer visual de expiração do código.

### **4\. Pagamento via Cartão**

* Máscara de cartão de crédito (visual).  
* Seleção de parcelas com resumo financeiro imediato.  
* Validação de campos obrigatórios.

## **Mock Data Structure (Payload JWT Decodificado)**

{  
  "transactionId": "txn\_778899",  
  "product": {  
    "name": "Plano Enterprise Anual",  
    "description": "Acesso ilimitado \+ Suporte 24/7",  
    "quantity": 1,  
    "unitPrice": 1200.00  
  },  
  "summary": {  
    "subtotal": 1200.00,  
    "discount": 0,  
    "fees": 0,  
    "total": 1200.00,  
    "currency": "BRL"  
  },  
  "buyer": {  
    "name": "Ricardo Mendes",  
    "email": "ricardo@finflow.com.br",  
    "document": "123.456.789-00"  
  },  
  "expiresAt": "2030-01-01T00:00:00Z"  
}  
