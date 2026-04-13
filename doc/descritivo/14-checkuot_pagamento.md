# checkout pagamento

## **rota:** /payment/checkout?transaction={transactiontoken}
## **path:** app/routes/private/payment/checkout/index.tsx
## **component únicos:** app/routes/private/payment/checkout/components/index.tsx
## **api route:** 
## **Type:** private

## **Description:**
- pagina que recebera transaction={transactiontoken} na url
- deve descriptografar(informado no descritivo 15-funçoesespeciais.md) o transactiontoken qua vai ser od dados de transação (ex: valor, produto, etc)
- deve renderizar o componente de pagamento

### **Exemplo de JSON do transactiontoken (payload JWT)**
```json
{
  "transactionId": "txn_123",
  "product": {
    "name": "Plano Premium",
    "description": "Acesso completo à plataforma",
    "quantity": 1,
    "unitPrice": 199.9
  },
  "summary": {
    "subtotal": 199.9,
    "discount": 0,
    "fees": 0,
    "total": 199.9,
    "currency": "BRL"
  },
  "buyer": {
    "name": "Nome do Comprador",
    "email": "email@dominio.com",
    "document": "000.000.000-00"
  },
  "expiresAt": "2026-01-28T15:30:00Z"
}
```

### **Descrição detalhada da página**
1. **Objetivo da rota**
   - Exibir o checkout privado da transação, validando o token da URL e apresentando o fluxo de pagamento.

2. **Fluxo de navegação por abas**
   - A página possui um **componente de checkout com abas** que organiza o processo em etapas claras.
   - Aba 1: **Confirmar dados e selecionar tipo de pagamento**.
   - Aba 2: **Pagamento com cartão de crédito**.
   - Aba 3: **Pagamento via PIX**.

3. **Dados exibidos no resumo do checkout**
   - Produto/serviço comprado.
   - Descrição do produto.
   - Quantidade e preço unitário.
   - Moeda (ex: BRL).
   - Subtotal, descontos e taxas (se aplicável).
   - Valor final a pagar.
   - Identificador da transação/pedido.
   - Validade/expiração do checkout.
   - Informações do comprador (nome, e-mail, documento), quando presentes no token.

## **Funcionalidades:**
1. **Leitura e validação do token**
   - Valida a assinatura do `transactiontoken` antes de renderizar o checkout.
   - Bloqueia o fluxo quando o token está inválido ou expirado, exibindo mensagem de erro.

2. **Aba 1 — Confirmar dados e selecionar tipo de pagamento**
   - Exibe os dados de compra (produto, descrição, quantidade, preço, subtotal, taxas, descontos e total).
   - Permite confirmar dados do comprador (nome, e-mail e documento).
   - Permite selecionar **tipo de pagamento**: Cartão de crédito ou PIX.
   - Botão **Continuar** habilita a próxima aba conforme o tipo selecionado.

3. **Aba 2 — Pagamento com cartão de crédito**
   - Campos obrigatórios: nome no cartão, número, validade (MM/AA), CVV e parcelas (quando aplicável).
   - Validação de formato e máscara para número do cartão e validade.
   - Parcelamento: **até 5x sem juros** e **de 6x a 10x com juros**.
   - Exibe resumo do total e botão **Pagar com cartão**.
   - Após o pagamento, exibe status: aprovado, pendente ou recusado.

   **Exemplo de simulação de juros por parcela**
   - Valor da compra: **R$ 1.000,00**
   - Juros aplicado a partir de 6x: **2% a.m.** (exemplo)
   - Fórmula simplificada: **valorComJuros = total + (total × juros × númeroDeMeses)**
   - Exemplo em **6x**: 1.000 + (1.000 × 0,02 × 6) = **R$ 1.120,00** → **6x de R$ 186,67**
   - Exemplo em **10x**: 1.000 + (1.000 × 0,02 × 10) = **R$ 1.200,00** → **10x de R$ 120,00**

4. **Aba 3 — Pagamento via PIX**
   - Exibe QR Code e código copia e cola.
   - Mostra tempo de expiração do PIX e status em tempo real.
   - Exibe instruções de pagamento e botão para copiar código.

5. **Estados e feedbacks do checkout**
   - Loading durante validação do token e geração do pagamento.
   - Mensagens de erro claras em falhas de pagamento.
   - Confirmação visual de pagamento aprovado e instruções de próxima ação.

## **Estrutura sugerida do payload do token**
```json
{
  "transactionId": "txn_123",
  "expiresAt": "2026-01-28T15:30:00Z",
  "currency": "BRL",
  "product": {
    "name": "Plano Premium",
    "description": "Acesso completo à plataforma",
    "quantity": 1,
    "unitPrice": 199.9
  },
  "summary": {
    "subtotal": 199.9,
    "discount": 0,
    "fees": 0,
    "total": 199.9
  },
  "buyer": {
    "name": "Nome do Comprador",
    "email": "email@dominio.com",
    "document": "000.000.000-00"
  }
}
```

## **Mensagens de erro padronizadas**
1. **Token inválido**
   - Mensagem: "Transação inválida. Solicite um novo link de pagamento."
2. **Token expirado**
   - Mensagem: "Este checkout expirou. Gere um novo pagamento."
3. **Pagamento recusado**
   - Mensagem: "Pagamento recusado. Verifique os dados e tente novamente."
4. **Erro de comunicação**
   - Mensagem: "Falha ao processar o pagamento. Tente novamente mais tarde."

## **Regras de segurança e anti-fraude**
1. **Validação de integridade do token**
   - Sempre validar assinatura e expiração antes de iniciar o checkout.
2. **Limite de tentativas de pagamento**
   - Bloquear múltiplas tentativas consecutivas por curto período.
3. **Mascaramento de dados sensíveis**
   - Exibir apenas os últimos 4 dígitos do cartão (quando aplicável).
4. **Monitoramento de status**
   - Atualização em tempo real para evitar pagamentos duplicados.

