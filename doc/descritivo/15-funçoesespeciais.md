# Funções especiais
## **Type:** private

## **Descrição:**

- criptografia de payload de transação
  - criar uma função onde ela possa receber um payload
  - fazer a criptografia jwt
  - retornar o rash
- isplanExiste
  - criar uma função onde ela possa receber od dados do usuário logado 
  - verificar se o plano existe
   - exemplo:
  ```ts
    async validateExistePlan(user: PayloadEntity): Promise<boolean> {
      // Verifica assinaturas com plano
      const SubscriptionsExiste = user.subscriptions?.filter((sub: any) => {
        if(sub.plan?.length > 0){
          return true;
        }
        return false;
      });
    }
  ```
 

  - retornar true ou false
- isPlanFundador
  - criar uma função onde ela possa receber od dados do usuário logado 
  - verificar se o plano é fundador
  - se existir o plano fundador, verificar se o ultimo não expirou a validade
  - retornar true ou false
   - exemplo:
  ```ts
    async validateFundadorPlan(user: PayloadEntity): Promise<boolean> {
      // Verifica assinaturas com plano fundador
      const fundadorSubscriptions = user.subscriptions?.filter((sub: any) =>
        sub.plan?.slug?.toLowerCase().includes('fundador'),
      );

      if (!fundadorSubscriptions || fundadorSubscriptions.length === 0) {
        return false;
      }

      // Verifica cada assinatura do plano fundador
      for (const subscription of fundadorSubscriptions) {
        const isExpired = new Date(subscription.expiresAt) < new Date();

        // Retorna true se encontrar alguma assinatura ativa e não expirada
        if (subscription.status === 'ACTIVE' && !isExpired) {
          return true;
        }
      }

      return false;
    }
  ```


## **Exemplos:**

**User**
```json
  {
    "error": false,
    "message": "Usuário encontrado com sucesso",
    "codigo": 200,
    "data": {
      "id": 1,
      "publicId": "2b1d5a1f-2c2f-4c8a-8e6f-1a2b3c4d5e6f",
      "email": "email@dominio.com",
      "nome": "Nome do Usuário",
      "role": "USER",
      "telefone": "+55 11 99999-9999",
      "data_nascimento": "1990-01-01T00:00:00.000Z",
      "genero": "MASCULINO",
      "endereco": "Rua Exemplo",
      "numero": "100",
      "complemento": "Apto 12",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "uf": "SP",
      "cep": "01000-000",
      "pais": "Brasil",
      "tipo_documento": "RG",
      "reg_documento": "123456789",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "avatar": {
        "id": 1,
        "url": "arquivo.pdf",
        "url_sm": "arquivo_sm.pdf",
        "url_md": "arquivo_md.pdf",
        "url_lg": "arquivo_lg.pdf",
        "status": "PENDING"
      },
      "comprovante": {
        "id": 1,
        "url": "arquivo.pdf",
        "url_sm": "arquivo_sm.pdf",
        "url_md": "arquivo_md.pdf",
        "url_lg": "arquivo_lg.pdf",
        "status": "PENDING"
      },
      "documento": {
        "id": 1,
        "url": "arquivo.pdf",
        "url_sm": "arquivo_sm.pdf",
        "url_md": "arquivo_md.pdf",
        "url_lg": "arquivo_lg.pdf",
        "status": "PENDING"
      },
      "biofacial": {
        "id": 1,
        "url": "arquivo.pdf",
        "url_sm": "arquivo_sm.pdf",
        "url_md": "arquivo_md.pdf",
        "url_lg": "arquivo_lg.pdf",
        "status": "PENDING"
      },
      "wallet": {
        "id": 1,
        "balance": "1000.00",
        "blocked": "0.00",
        "currency": "BRL"
      },
      "payments": [
        {
          "id": 1,
          "amount": "100.00",
          "method": "PIX",
          "status": "PAID"
        }
      ],
      "subscriptions": [
        {
          "id": 1,
          "status": "ACTIVE",
          "startedAt": "2024-01-01T00:00:00.000Z",
          "expiresAt": "2025-01-01T00:00:00.000Z"
        }
      ],
      "startups": [
        {
          "id": 1,
          "nome": "Minha Startup",
          "slug": "minha-startup",
          "status": "PENDING"
        }
      ],
      "investments": [
        {
          "id": 1,
          "amount": "500.00",
          "tokensQty": 10,
          "status": "CONFIRMED"
        }
      ],
      "tokens": [
        {
          "id": "uuid",
          "hash": "hash",
          "quantity": 1,
          "purchaseVal": "100.00",
          "currentVal": "120.00"
        }
      ],
      "tokenHistory": [
        {
          "id": 1,
          "type": "BUY_MARKET",
          "amount": "10.00",
          "description": "Compra no mercado"
        }
      ],
      "auditLogs": [
        {
          "id": 1,
          "action": "UPDATE_STARTUP",
          "entity": "Startup",
          "entityId": "1",
          "createdAt": "2024-01-01T00:00:00.000Z"
        }
      ]
    }
  }
```
