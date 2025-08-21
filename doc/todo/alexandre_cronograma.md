# TODO

## Épico:Dashboard Fundador (fundador)

** Descrição:**
dashboard para fundadores de startups onde ele tem acesso as rodadas de captação ativa  contendo o valor total recebido e o valor total partilhado, total de investidores, valorização da startup, um gráfico mostrando a evolução do valor recebido nos investimentos mostrando o valor requerido, uma tab mostrando as rodadas de captação ativas e inativas ou concluídas

### Todo

- [ ] Criar layout do dashboard fundador com seção de rodadas de captação ativas.
- [ ] Implementar card de resumo com valor total recebido, valor partilhado, total de investidores e valorização da startup.
- [ ] Desenvolver gráfico de evolução de investimentos (valor recebido vs. valor requerido) usando uma biblioteca como Chart.js.
- [ ] Criar aba para alternar entre rodadas ativas e inativas/concluídas com filtro.
- [ ] Implementar endpoint para buscar dados de rodadas de captação ativas/inativas com detalhes de status, valor esperado, datas, total recebido, tokens disponíveis e lista de investidores.
  - **Exemplo de body de requisição (GET /api/rounds):**
    ```json
    {
      "status": "active", // ou "inactive", "completed" ou "true" , "false"
      "startupId": "12345", // id da startup
      "userId": "founder_67890" // id do fundador
    }
    ```
  - **Exemplo de resposta (GET /api/rounds):**
    ```json
    {
      "rounds": [ //rodadas de captação
        {
          "id": "round_001", //id da rodada
          "status": "active", //status da rodada ativa/inativa/concluída true/false
          "expectedValue": 500000.00, //valor esperado
          "startDate": "2025-01-01", //data de inicio
          "endDate": "2025-12-31", //data de fim
          "totalReceived": 250000.00, //valor recebido
          "totalTokensAvailable": 100000, //tokens disponíveis
          "investors": [ //investidores
            {
              "id": "inv_001", //id do investidor
              "name": "João Silva", //nome do investidor
              "investmentDate": "2025-03-15", //data de investimento
              "tokensPurchased": 5000, //tokens comprados
              "amountReceived": 25000.00 //valor recebido
            },
            {
              "id": "inv_002", //id do investidor
              "name": "Maria Oliveira", //nome do investidor
              "investmentDate": "2025-04-10", //data de investimento
              "tokensPurchased": 3000, //tokens comprados
              "amountReceived": 15000.00 //valor recebido
            }
          ]
        }
      ]
    }
    ```
- [ ] Adicionar testes para componentes do dashboard fundador e chamadas de API.



## Épico:Dashboard Afiliado (afiliado)

** Descrição:**
dashboard para afiliados onde ele tem acesso as investidores indicados, total recebido, total não resgatado, tabela mostra os investidores indicados e o valor recebido

### Todo

- [ ] Criar layout do dashboard afiliado com seção de investidores indicados.
- [ ] Implementar card de resumo com total recebido e total não resgatado.
- [ ] Desenvolver tabela para listar investidores indicados com colunas para nome, valor investido e valor recebido pelo afiliado.
- [ ] Criar funcionalidade de filtro/ordenação na tabela de investidores.
- [ ] Implementar endpoint para buscar dados de investidores indicados com detalhes de ID, nome, data, valor investido e valor recebido pelo afiliado.
  - **Exemplo de body de requisição (GET /api/affiliate/investors):**
    ```json
    {
      "affiliateId": "aff_12345",
      "status": "confirmed", // ou "pending"
      "sortBy": "valueReceived",
      "order": "desc"
    }
    ```
  - **Exemplo de resposta (GET /api/affiliate/investors):**
    ```json
    {
      "affiliateId": "aff_12345",
      "totalReceived": 5000.00,
      "totalPending": 1000.00,
      "investors": [
        {
          "id": "inv_001",
          "name": "João Silva",
          "investmentDate": "2025-02-20",
          "amountInvested": 10000.00,
          "amountReceivedByAffiliate": 1000.00
        },
        {
          "id": "inv_002",
          "name": "Maria Oliveira",
          "investmentDate": "2025-03-15",
          "amountInvested": 5000.00,
          "amountReceivedByAffiliate": 500.00
        }
      ]
    }
    ```
- [ ] Adicionar testes para componentes do dashboard afiliado e chamadas de API.


## Épico: Marketplace Investidor (investidor)

** Descrição:**
igual a página / deve mostrar as startups que estão em rodadas de captação ativas, deve ter um filtro para mostrar startups verificadas e startups não verificadas, deve ter um filtro para mostrar startups com rodadas de captação ativas e startups com rodadas de captação concluídas, deve ter cards mostrando o total de tokens que o investidor tem, uma tabela mostrando as startups que o investidor tem investido e o total de tokens comprados.

### Todo

- [ ] Criar layout do marketplace investidor com listagem de startups em rodadas de captação.
- [ ] Implementar filtros para startups verificadas/não verificadas e rodadas ativas/concluídas.
- [ ] Desenvolver cards de resumo com total de tokens possuídos pelo investidor.
- [ ] Criar tabela para listar startups investidas pelo investidor com colunas para nome da startup, total de tokens comprados e status da rodada.
- [ ] Implementar endpoint para buscar dados de startups disponíveis no marketplace e investimentos do usuário.
  - **Exemplo de body de requisição (GET /api/marketplace/startups):**
    ```json
    {
      "investorId": "inv_12345",
      "filter": {
        "verified": true, // ou false
        "roundStatus": "active" // ou "completed"
      },
      "sortBy": "valuation",
      "order": "desc"
    }
    ```
  - **Exemplo de resposta (GET /api/marketplace/startups):**
    ```json
    {
      "status": "success",
      "message": "Lista de startups no marketplace",
      "data": {
        "investorId": "inv_12345",
        "totalTokensOwned": 8000,
        "startups": [
          {
            "id": "startup_001",
            "name": "TechNova",
            "verified": true,
            "roundStatus": "active",
            "valuation": 1000000.00,
            "totalTokensAvailable": 50000,
            "tokensPurchasedByInvestor": 0
          },
          {
            "id": "startup_002",
            "name": "GreenWave",
            "verified": false,
            "roundStatus": "active",
            "valuation": 750000.00,
            "totalTokensAvailable": 30000,
            "tokensPurchasedByInvestor": 2000
          }
        ],
        "investedStartups": [
          {
            "id": "startup_002",
            "name": "GreenWave",
            "tokensPurchased": 2000,
            "investmentDate": "2025-03-10",
            "roundStatus": "active"
          },
          {
            "id": "startup_003",
            "name": "BioHealth",
            "tokensPurchased": 3000,
            "investmentDate": "2025-01-15",
            "roundStatus": "completed"
          }
        ]
      }
    }
    ```
- [ ] Adicionar testes para componentes do marketplace investidor e chamadas de API.

## Épico: Financeiro (investidor)

** Descrição:**
financeiro para investidores onde ele tem acesso as rodadas de captação ativas e concluídas no qual ele participou, deve ter uma tabela mostrando as startups e o total de tokens comprados, deve ter um botão para vender os tokens, deve ter um botão para resgatar os tokens, deve ter um botão para ver o extrato de investimentos, e um botão para solicitar atualização da valorização do token

### Todo

- [ ] Criar layout do dashboard financeiro para investidores com seção de rodadas de captação participadas.
- [ ] Implementar tabela para listar startups investidas com colunas para nome da startup, total de tokens comprados e status da rodada.
- [ ] Adicionar botões de ação na tabela: Vender Tokens, Resgatar Tokens, Ver Extrato de Investimentos e Solicitar Atualização da Valorização do Token.
- [ ] Desenvolver card de resumo com informações gerais sobre investimentos e tokens possuídos.
- [ ] Implementar endpoint para buscar dados de rodadas de captação participadas e detalhes dos tokens do investidor.
  - **Exemplo de body de requisição (GET /api/investor/financial):**
    ```json
    {
      "investorId": "inv_12345",
      "filter": {
        "roundStatus": "all" // ou "active", "completed"
      },
      "sortBy": "investmentDate",
      "order": "desc"
    }
    ```
  - **Exemplo de resposta (GET /api/investor/financial):**
    ```json
    {
      "status": "success",
      "message": "Dados financeiros do investidor",
      "data": {
        "investorId": "inv_12345",
        "totalTokensOwned": 8000,
        "totalInvestedValue": 40000.00,
        "investments": [
          {
            "id": "investment_001",
            "startupId": "startup_002",
            "startupName": "GreenWave",
            "tokensPurchased": 2000,
            "investmentDate": "2025-03-10",
            "investmentValue": 10000.00,
            "roundStatus": "active",
            "currentTokenValue": 6.00
          },
          {
            "id": "investment_002",
            "startupId": "startup_003",
            "startupName": "BioHealth",
            "tokensPurchased": 3000,
            "investmentDate": "2025-01-15",
            "investmentValue": 15000.00,
            "roundStatus": "completed",
            "currentTokenValue": 8.50
          }
        ]
      }
    }
    ```
- [ ] Adicionar endpoints para ações financeiras como vender tokens, resgatar tokens e solicitar atualização de valorização.
  - **Exemplo de body de requisição (POST /api/investor/sell-tokens):**
    ```json
    {
      "investorId": "inv_12345",
      "investmentId": "investment_001",
      "tokensToSell": 500,
      "pricePerToken": 6.00
    }
    ```
  - **Exemplo de resposta (POST /api/investor/sell-tokens):**
    ```json
    {
      "status": "success",
      "message": "Venda de tokens realizada com sucesso",
      "data": {
        "transactionId": "trans_001",
        "investmentId": "investment_001",
        "tokensSold": 500,
        "totalValue": 3000.00,
        "transactionDate": "2025-08-20"
      }
    }
    ```
  - **Exemplo de body de requisição (POST /api/investor/redeem-tokens):**
    ```json
    {
      "investorId": "inv_12345",
      "investmentId": "investment_002",
      "tokensToRedeem": 1000
    }
    ```
  - **Exemplo de resposta (POST /api/investor/redeem-tokens):**
    ```json
    {
      "status": "success",
      "message": "Resgate de tokens solicitado com sucesso",
      "data": {
        "requestId": "req_001",
        "investmentId": "investment_002",
        "tokensToRedeem": 1000,
        "requestDate": "2025-08-20",
        "status": "pending"
      }
    }
    ```
  - **Exemplo de body de requisição (POST /api/investor/request-valuation-update):**
    ```json
    {
      "investorId": "inv_12345",
      "investmentId": "investment_001"
    }
    ```
  - **Exemplo de resposta (POST /api/investor/request-valuation-update):**
    ```json
    {
      "status": "success",
      "message": "Solicitação de atualização de valorização enviada",
      "data": {
        "requestId": "val_req_001",
        "investmentId": "investment_001",
        "requestDate": "2025-08-20",
        "status": "pending"
      }
    }
    ```
  - **Exemplo de body de requisição (GET /api/investor/statement):**
    ```json
    {
      "investorId": "inv_12345",
      "dateRange": {
        "start": "2025-01-01",
        "end": "2025-12-31"
      }
    }
    ```
  - **Exemplo de resposta (GET /api/investor/statement):**
    ```json
    {
      "status": "success",
      "message": "Extrato de investimentos",
      "data": {
        "investorId": "inv_12345",
        "period": {
          "start": "2025-01-01",
          "end": "2025-12-31"
        },
        "transactions": [
          {
            "id": "trans_001",
            "type": "investment",
            "description": "Investimento em GreenWave",
            "date": "2025-03-10",
            "amount": -10000.00,
            "tokens": 2000
          },
          {
            "id": "trans_002",
            "type": "investment",
            "description": "Investimento em BioHealth",
            "date": "2025-01-15",
            "amount": -15000.00,
            "tokens": 3000
          }
        ],
        "totalInvested": 25000.00,
        "totalTokens": 8000
      }
    }
    ```
- [ ] Adicionar testes para componentes do dashboard financeiro e chamadas de API.


## Épico: Notificação (Investidor, Fundador, Afiliado)

** Descrição:**
notificação para investidores, fundadores e afiliados onde ele tem acesso an notificações gerais. também tem que ter um rota contando quantas notificações tem para o id logado, toda notificação deve ter titulo descrição data da postagem e quem postou
quando clicar na notificação vai abrir um modal quando aberto val alterado status para false siando a da contagem de notificações ativas

### Todo

- [ ] Criar layout do sistema de notificações acessível a investidores, fundadores e afiliados com listagem de notificações gerais.
- [ ] Implementar modal para exibição de detalhes da notificação ao clicar, com alteração de status para 'lida' (false).
- [ ] Desenvolver indicador de contagem de notificações não lidas no header ou sidebar, visível para o usuário logado.
- [ ] Implementar endpoint para buscar notificações do usuário logado e contagem de não lidas.
  - **Exemplo de body de requisição (GET /api/notifications):**
    ```json
    {
      "userId": "user_12345",
      "userType": "investor", // ou "founder", "affiliate"
      "filter": {
        "read": false // ou true, "all"
      },
      "sortBy": "postDate",
      "order": "desc"
    }
    ```
  - **Exemplo de resposta (GET /api/notifications):**
    ```json
    {
      "status": "success",
      "message": "Lista de notificações do usuário",
      "data": {
        "userId": "user_12345",
        "unreadCount": 3,
        "notifications": [
          {
            "id": "notif_001",
            "title": "Novo Investimento Recebido",
            "description": "Sua startup GreenWave recebeu um investimento de 10.000,00.",
            "postDate": "2025-08-20T10:30:00Z",
            "postedBy": "Sistema iSelfToken",
            "read": false
          },
          {
            "id": "notif_002",
            "title": "Atualização de Valorização",
            "description": "A valorização do token da BioHealth foi atualizada para 8,50.",
            "postDate": "2025-08-19T14:45:00Z",
            "postedBy": "Admin iSelfToken",
            "read": false
          },
          {
            "id": "notif_003",
            "title": "Novo Investidor Indicado",
            "description": "Um novo investidor foi indicado por você e confirmou o cadastro.",
            "postDate": "2025-08-18T09:15:00Z",
            "postedBy": "Sistema iSelfToken",
            "read": true
          }
        ]
      }
    }
    ```
- [ ] Implementar endpoint para contar notificações não lidas do usuário logado (para badge/indicador).
  - **Exemplo de body de requisição (GET /api/notifications/count):**
    ```json
    {
      "userId": "user_12345",
      "userType": "investor" // ou "founder", "affiliate"
    }
    ```
  - **Exemplo de resposta (GET /api/notifications/count):**
    ```json
    {
      "status": "success",
      "message": "Contagem de notificações não lidas",
      "data": {
        "userId": "user_12345",
        "unreadCount": 3
      }
    }
    ```
- [ ] Implementar endpoint para marcar notificação como lida ao abrir o modal.
  - **Exemplo de body de requisição (POST /api/notifications/mark-read):**
    ```json
    {
      "userId": "user_12345",
      "notificationId": "notif_001"
    }
    ```
  - **Exemplo de resposta (POST /api/notifications/mark-read):**
    ```json
    {
      "status": "success",
      "message": "Notificação marcada como lida",
      "data": {
        "notificationId": "notif_001",
        "read": true,
        "updatedAt": "2025-08-20T15:20:00Z"
      }
    }
    ```
- [ ] Adicionar testes para componentes do sistema de notificações e chamadas de API.


## Épico: Perfil (Investidor, Fundador, Afiliado)

** Descrição:**
perfil para investidores, fundadores e afiliados onde ele tem acesso as informações do perfil, deve ter um botão para editar o perfil, deve ter um botão para ver o extrato de investimentos, deve pode modificar todas as informaçoes do perfil, principalmente informações bancarias banco conta e chave pix, deve ter um botão para alterar a senha de acesso, deve ter um botão para subir foto de perfil e banner

### Todo

- [ ] Criar layout do perfil para investidores, fundadores e afiliados com seção de informações do perfil.
- [ ] Implementar botão para editar perfil, que abre modal com campos para edição.
- [ ] Implementar botão para ver extrato de investimentos, que abre modal com lista de investimentos.
- [ ] Implementar botão para alterar senha de acesso, que abre modal com campos para edição.
- [ ] Implementar botão para subir foto de perfil e banner, que abre modal com campos para edição.
- [ ] Desenvolver card de resumo com informações gerais sobre investimentos e tokens possuídos.
- [ ] Implementar endpoint para buscar informações do perfil do usuário logado.
  - **Exemplo de body de requisição (GET /api/profile):**
    ```json
    {
      "userId": "user_12345",
      "userType": "investor" // ou "founder", "affiliate"
    }
    ```
  - **Exemplo de resposta (GET /api/profile):**
    ```json
    {
      "status": "success",
      "message": "Dados do perfil do usuário",
      "data": {
        "userId": "user_12345",
        "userType": "investor",
        "profile": {
          "fullName": "João Silva",
          "email": "joao.silva@email.com",
          "phone": "+55 11 98765-4321",
          "profilePicture": "https://example.com/images/joao.jpg",
          "banner": "https://example.com/images/banner_joao.jpg",
          "bankInfo": {
            "bankName": "Banco XYZ",
            "accountNumber": "12345-6",
            "pixKey": "joao.silva@email.com"
          },
          "documents": [
            {
              "type": "CPF",
              "url": "https://example.com/docs/cpf_joao.pdf",
              "status": "verified",
              "uploadDate": "2025-01-10"
            },
            {
              "type": "Comprovante de Residência",
              "url": "https://example.com/docs/residencia_joao.pdf",
              "status": "pending",
              "uploadDate": "2025-08-15"
            }
          ],
          "createdAt": "2024-10-05T14:30:00Z",
          "updatedAt": "2025-08-15T10:20:00Z"
        }
      }
    }
    ```
- [ ] Implementar endpoint para atualizar informações do perfil, incluindo dados bancários.
  - **Exemplo de body de requisição (PUT /api/profile):**
    ```json
    {
      "userId": "user_12345",
      "userType": "investor",
      "updates": {
        "fullName": "João Silva Atualizado",
        "phone": "+55 11 91234-5678",
        "bankInfo": {
          "bankName": "Banco ABC",
          "accountNumber": "65432-1",
          "pixKey": "joao.atualizado@email.com"
        }
      }
    }
    ```
  - **Exemplo de resposta (PUT /api/profile):**
    ```json
    {
      "status": "success",
      "message": "Perfil atualizado com sucesso",
      "data": {
        "userId": "user_12345",
        "updatedFields": ["fullName", "phone", "bankInfo"],
        "updatedAt": "2025-08-20T16:45:00Z"
      }
    }
    ```
- [ ] Implementar endpoint para alterar senha do usuário.
  - **Exemplo de body de requisição (POST /api/profile/change-password):**
    ```json
    {
      "userId": "user_12345",
      "currentPassword": "senhaAntiga123",
      "newPassword": "novaSenhaSegura456"
    }
    ```
  - **Exemplo de resposta (POST /api/profile/change-password):**
    ```json
    {
      "status": "success",
      "message": "Senha alterada com sucesso",
      "data": {
        "userId": "user_12345",
        "updatedAt": "2025-08-20T16:50:00Z"
      }
    }
    ```
- [ ] Implementar endpoint para upload de foto de perfil, banner e documentos.
  - **Exemplo de body de requisição (POST /api/profile/upload):**
    ```json
    {
      "userId": "user_12345",
      "fileType": "profilePicture", // ou "banner", "document"
      "file": "[binary data]",
      "documentType": "" // opcional, usado apenas se fileType for "document", ex.: "CPF"
    }
    ```
  - **Exemplo de resposta (POST /api/profile/upload):**
    ```json
    {
      "status": "success",
      "message": "Arquivo enviado com sucesso",
      "data": {
        "userId": "user_12345",
        "fileType": "profilePicture",
        "fileUrl": "https://example.com/images/joao_novo.jpg",
        "uploadDate": "2025-08-20T16:55:00Z"
      }
    }
    ```
- [ ] Adicionar testes para componentes da página de perfil e chamadas de API.



## Épico: Academy (Investidor, Fundador, Afiliado)

** Descrição:**
academy para investidores, fundadores e afiliados onde ele tem acesso a cursos e webinars, deve ter um botão para ver os cursos e webinars ou podcasts

### Todo

- [ ] Criar layout da seção Academy acessível a investidores, fundadores e afiliados com listagem de cursos, webinars e podcasts.
- [ ] Implementar botão para visualizar detalhes de cursos, webinars ou podcasts, abrindo um modal ou página específica.
- [ ] Desenvolver funcionalidade de filtro para categorizar conteúdo por tipo (cursos, webinars, podcasts) e status (em andamento, concluído).
- [ ] Adicionar seção de progresso para cursos, mostrando porcentagem concluída e próximas aulas.
- [ ] Implementar endpoint para buscar lista de conteúdos disponíveis na Academy.
  - **Exemplo de body de requisição (GET /api/academy/content):**
    ```json
    {
      "userId": "user_12345",
      "userType": "investor", // ou "founder", "affiliate"
      "filter": {
        "type": "course", // ou "webinar", "podcast", "all"
        "status": "in_progress" // ou "completed", "all"
      },
      "sortBy": "startDate",
      "order": "desc"
    }
    ```
  - **Exemplo de resposta (GET /api/academy/content):**
    ```json
    {
      "status": "success",
      "message": "Lista de conteúdos da Academy",
      "data": {
        "userId": "user_12345",
        "contents": [
          {
            "id": "course_001",
            "title": "Introdução ao Investimento em Startups",
            "type": "course",
            "description": "Aprenda os fundamentos de investir em startups.",
            "startDate": "2025-01-10",
            "endDate": "2025-03-10",
            "duration": "8 semanas",
            "progress": 45,
            "status": "in_progress",
            "instructor": "Ana Ribeiro",
            "thumbnail": "https://example.com/images/course_001.jpg"
          },
          {
            "id": "webinar_002",
            "title": "Estratégias de Captação de Recursos",
            "type": "webinar",
            "description": "Dicas para fundadores captarem investimentos.",
            "date": "2025-02-15",
            "time": "14:00",
            "duration": "2 horas",
            "status": "upcoming",
            "host": "Carlos Mendes",
            "link": "https://example.com/webinar/002"
          },
          {
            "id": "podcast_003",
            "title": "Histórias de Sucesso em Startups",
            "type": "podcast",
            "description": "Entrevistas com fundadores de sucesso.",
            "releaseDate": "2025-01-20",
            "duration": "45 minutos",
            "status": "completed",
            "host": "Mariana Lopes",
            "audioUrl": "https://example.com/podcast/003.mp3"
          }
        ]
      }
    }
    ```
- [ ] Implementar endpoint para registrar progresso em cursos ou marcar conteúdo como concluído.
  - **Exemplo de body de requisição (POST /api/academy/progress):**
    ```json
    {
      "userId": "user_12345",
      "contentId": "course_001",
      "progress": 50, // porcentagem concluída
      "status": "in_progress" // ou "completed"
    }
    ```
  - **Exemplo de resposta (POST /api/academy/progress):**
    ```json
    {
      "status": "success",
      "message": "Progresso atualizado com sucesso",
      "data": {
        "userId": "user_12345",
        "contentId": "course_001",
        "progress": 50,
        "status": "in_progress",
        "updatedAt": "2025-08-20T18:30:00Z"
      }
    }
    ```
- [ ] Implementar endpoint para inscrição em webinars ou acesso a conteúdos específicos.
  - **Exemplo de body de requisição (POST /api/academy/register):**
    ```json
    {
      "userId": "user_12345",
      "contentId": "webinar_002"
    }
    ```
  - **Exemplo de resposta (POST /api/academy/register):**
    ```json
    {
      "status": "success",
      "message": "Inscrição realizada com sucesso",
      "data": {
        "userId": "user_12345",
        "contentId": "webinar_002",
        "registrationDate": "2025-08-20T18:35:00Z",
        "accessLink": "https://example.com/webinar/002/access"
      }
    }
    ```
- [ ] Adicionar testes para componentes da seção Academy e chamadas de API.



## Épico: Módulo de Pagamento PIX e Cartão de Crédito (Investidor, Fundador, Afiliado)

** Descrição:**
Módulo de pagamento para investidores, fundadores e afiliados, permitindo transações via PIX e cartão de crédito. O módulo captura dados como valor, CPF e nome do pagador. Para PIX, retorna QR Code em base64 e código copia e cola. Para cartão de crédito, processa número do cartão, código de segurança, nome do titular, CPF, total de parcelas e valor.

### Todo

- [ ] Desenvolver interface do módulo de pagamento com opções PIX e cartão de crédito.
- [ ] Implementar formulário para dados do pagador (nome, CPF, valor).
- [ ] Criar validação frontend para CPF, valor e dados do cartão.
- [ ] Implementar endpoint para pagamento via PIX.
  - **Exemplo de requisição (POST /api/payment/pix):**
    ```json
    {
      "userId": "user_12345",
      "payerName": "João Silva",
      "payerCpf": "123.456.789-00",
      "amount": 1500.00
    }
    ```
  - **Exemplo de resposta:**
    ```json
    {
      "status": "success",
      "message": "Pagamento PIX gerado",
      "data": {
        "transactionId": "pix_987654",
        "amount": 1500.00,
        "qrCodeBase64": "data:image/png;base64,...",
        "copyPasteCode": "000201..."
      }
    }
    ```
- [ ] Implementar endpoint para pagamento via cartão de crédito.
  - **Exemplo de requisição (POST /api/payment/credit-card):**
    ```json
    {
      "userId": "user_12345",
      "payerName": "João Silva",
      "payerCpf": "123.456.789-00",
      "amount": 1500.00,
      "installments": 3,
      "cardNumber": "****-****-****-1234",
      "cardHolder": "João Silva",
      "cardCvv": "***",
      "cardExpiry": "12/26"
    }
    ```
  - **Exemplo de resposta:**
    ```json
    {
      "status": "success",
      "message": "Pagamento processado",
      "data": {
        "transactionId": "cc_987654",
        "amount": 1500.00,
        "installments": 3,
        "status": "approved"
      }
    }
    ```
- [ ] Adicionar testes para componentes e chamadas de API.
