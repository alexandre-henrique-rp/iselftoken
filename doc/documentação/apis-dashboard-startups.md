# APIs Necessárias - Dashboard de Startups

**Arquivo:** `apis-dashboard-startups.md`  
**Data:** 2025-01-14  
**Versão:** 1.0  
**Responsável:** Frontend Team

---

## 📋 **Resumo**

Este documento especifica todas as APIs necessárias para o funcionamento completo do Dashboard de Gerenciamento de Startups (`/dashboard_startups`). Cada endpoint inclui detalhes de request/response, validações e códigos de erro.

---

## 🔍 **1. GET /api/startups - Listar Startups**

### Descrição
Retorna lista paginada de startups do usuário autenticado com filtros e busca.

### Request Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `page` | number | Não | Página atual (padrão: 1) |
| `limit` | number | Não | Itens por página (padrão: 10, máx: 50) |
| `search` | string | Não | Busca por nome ou CNPJ |
| `status` | string | Não | Filtro por status: "Em Análise", "Aprovada", "Ativa", "Pausada", "Rejeitada" |
| `area_atuacao` | string | Não | Filtro por área: "Fintech", "Healthtech", etc. |
| `estagio` | string | Não | Filtro por estágio: "Ideação", "MVP", etc. |
| `meta_min` | number | Não | Meta mínima de captação |
| `meta_max` | number | Não | Meta máxima de captação |
| `sort_by` | string | Não | Campo para ordenação: "nome", "data_fundacao", "meta_captacao" |
| `sort_order` | string | Não | Ordem: "asc" ou "desc" (padrão: "asc") |

### Response Success (200)
```json
{
  "status": "success",
  "message": "Startups recuperadas com sucesso",
  "data": {
    "startups": [
      {
        "id": 123,
        "nome": "TechStart Innovação",
        "cnpj": "12.345.678/0001-95",
        "pais": {
          "iso3": "BRA",
          "nome": "Brasil",
          "emoji": "🇧🇷"
        },
        "area_atuacao": "Fintech",
        "estagio": "MVP",
        "meta_captacao": 500000,
        "equity_oferecido": 15,
        "valuation_calculado": 3333333.33,
        "status": "Aprovada",
        "data_fundacao": "2023-06-15",
        "site": "https://techstart.com.br",
        "logo_url": "https://cdn.exemplo.com/logos/techstart.png",
        "descritivo_basico": "Fintech revolucionária para PMEs",
        "total_captado": 150000,
        "total_investidores": 25,
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-20T14:45:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "per_page": 10,
      "total_items": 47,
      "has_next": true,
      "has_previous": false
    },
    "filters_applied": {
      "search": "Tech",
      "status": "Aprovada",
      "area_atuacao": null
    }
  }
}
```

### Response Error (400/404/500)
```json
{
  "status": "error",
  "message": "Parâmetros inválidos",
  "errors": [
    {
      "field": "limit",
      "message": "Limite máximo é 50 itens por página"
    }
  ]
}
```

---

## 📊 **2. GET /api/startups/stats - Estatísticas do Dashboard**

### Descrição
Retorna métricas agregadas das startups do usuário para exibição nos cards de estatísticas.

### Request Parameters
Nenhum parâmetro obrigatório.

### Response Success (200)
```json
{
  "status": "success",
  "message": "Estatísticas calculadas com sucesso",
  "data": {
    "investimento_total": {
      "valor": 2750000,
      "moeda": "BRL",
      "formatado": "R$ 2.750.000,00",
      "variacao_mes_anterior": 15.5,
      "tipo_variacao": "aumento"
    },
    "total_investidores": {
      "quantidade": 142,
      "unicos": true,
      "variacao_mes_anterior": 8,
      "tipo_variacao": "aumento"
    },
    "startups_ativas": {
      "quantidade": 8,
      "status_incluidos": ["Aprovada", "Ativa"],
      "variacao_mes_anterior": 2,
      "tipo_variacao": "aumento"
    },
    "startups_pendentes": {
      "quantidade": 3,
      "status_incluidos": ["Em Análise"],
      "variacao_mes_anterior": -1,
      "tipo_variacao": "diminuicao"
    },
    "performance_geral": {
      "score": 85,
      "classificacao": "Excelente",
      "tendencia": "crescimento"
    }
  }
}
```

---

## 🚀 **3. POST /api/startups - Criar Nova Startup**

### Descrição
Cria uma nova startup com validações completas e upload de arquivos.

### Request Body
```json
{
  "nome": "Nova Startup Tech",
  "pais": "BRA",
  "cnpj": "98.765.432/0001-10",
  "data_fundacao": "2024-03-10",
  "area_atuacao": "Edtech",
  "estagio": "Ideação",
  "site": "https://novastartup.com",
  "redes_sociais": {
    "facebook": "https://facebook.com/novastartup",
    "instagram": "https://instagram.com/novastartup",
    "linkedin": "https://linkedin.com/company/novastartup",
    "twitter": "https://twitter.com/novastartup",
    "youtube": "https://youtube.com/@novastartup"
  },
  "logo": "base64_encoded_image_or_url",
  "video_pitch": "https://youtube.com/watch?v=abc123",
  "pitch_pdf": "https://docs.google.com/document/d/abc123",
  "descritivo_basico": "Plataforma educacional inovadora",
  "imagem_marketplace": "https://cdn.exemplo.com/marketplace/startup.jpg",
  "descricao_objetivo": "Nosso objetivo é revolucionar a educação...",
  "dados_bancarios": {
    "banco": "Banco do Brasil",
    "agencia": "1234-5",
    "conta": "12345-6",
    "tipo": "Conta Corrente",
    "titular": "Nova Startup Tech LTDA"
  },
  "meta_captacao": 300000,
  "equity_oferecido": 20
}
```

### Validações de Negócio
- **CNPJ**: Deve ser válido e não estar em uso
- **Email**: Único no sistema
- **Meta de Captação**: 
  - Ideação/MVP: R$ 100.000 - R$ 500.000
  - Outros estágios: até R$ 15.000.000
- **Equity**: 1% - 49%
- **Data de Fundação**: Não pode ser futura

### Response Success (201)
```json
{
  "status": "success",
  "message": "Startup criada com sucesso",
  "data": {
    "startup": {
      "id": 124,
      "nome": "Nova Startup Tech",
      "status": "Em Análise",
      "valuation_calculado": 1500000,
      "created_at": "2024-01-20T15:30:00Z",
      // ... outros campos
    },
    "next_steps": [
      "Aguarde análise da equipe (2-5 dias úteis)",
      "Prepare documentação adicional se necessário",
      "Acompanhe o status pelo dashboard"
    ]
  }
}
```

### Response Error (422)
```json
{
  "status": "error",
  "message": "Dados inválidos",
  "errors": [
    {
      "field": "cnpj",
      "message": "CNPJ já está em uso por outra startup",
      "code": "CNPJ_DUPLICATE"
    },
    {
      "field": "meta_captacao",
      "message": "Para estágio 'Ideação', meta deve estar entre R$ 100.000 e R$ 500.000",
      "code": "META_INVALID_FOR_STAGE"
    }
  ]
}
```

---

## 📝 **4. PUT /api/startups/:id - Atualizar Startup**

### Descrição
Atualiza dados de uma startup existente. Permite atualização parcial.

### Request Parameters
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `id` | number | Sim | ID da startup |

### Request Body
Same as POST, mas todos os campos são opcionais exceto validações de negócio.

### Response Success (200)
```json
{
  "status": "success",
  "message": "Startup atualizada com sucesso",
  "data": {
    "startup": {
      // dados atualizados
    },
    "changes": [
      {
        "field": "meta_captacao",
        "old_value": 300000,
        "new_value": 450000
      }
    ]
  }
}
```

---

## 🗑️ **5. DELETE /api/startups/:id - Excluir Startup**

### Descrição
Exclui uma startup permanentemente. Ação irreversível.

### Request Parameters
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `id` | number | Sim | ID da startup |

### Response Success (200)
```json
{
  "status": "success",
  "message": "Startup excluída com sucesso",
  "data": {
    "startup_id": 123,
    "backup_url": "https://backup.exemplo.com/startup-123-backup.json",
    "deleted_at": "2024-01-20T16:00:00Z"
  }
}
```

### Response Error (409)
```json
{
  "status": "error",
  "message": "Não é possível excluir startup com investimentos ativos",
  "data": {
    "blocker_reason": "ACTIVE_INVESTMENTS",
    "active_investments_count": 15,
    "total_invested": 75000,
    "suggestion": "Pause a startup ou entre em contato com o suporte"
  }
}
```

---

## 📈 **6. GET /api/startups/:id/history - Histórico de Captações**

### Descrição
Retorna histórico de captações e campanhas da startup.

### Response Success (200)
```json
{
  "status": "success",
  "message": "Histórico recuperado com sucesso",
  "data": {
    "startup_id": 123,
    "total_captado_historico": 850000,
    "campanhas": [
      {
        "id": 45,
        "nome": "Série A",
        "valor_objetivo": 500000,
        "valor_captado": 375000,
        "percentual_atingido": 75,
        "status": "Concluída",
        "data_inicio": "2023-06-01",
        "data_fim": "2023-08-31",
        "numero_investidores": 42,
        "equity_oferecido": 15,
        "tipo": "Equity"
      },
      {
        "id": 52,
        "nome": "Pré-Série B",
        "valor_objetivo": 1000000,
        "valor_captado": 125000,
        "percentual_atingido": 12.5,
        "status": "Ativa",
        "data_inicio": "2024-01-15",
        "data_fim": null,
        "numero_investidores": 8,
        "equity_oferecido": 12,
        "tipo": "Equity"
      }
    ],
    "resumo": {
      "total_campanhas": 3,
      "campanhas_concluidas": 2,
      "campanhas_ativas": 1,
      "taxa_sucesso": 66.7,
      "ticket_medio": 20357
    }
  }
}
```

---

## 👥 **7. GET /api/startups/:id/investors - Lista de Investidores**

### Descrição
Retorna investidores da startup respeitando configurações de privacidade.

### Request Parameters
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `page` | number | Não | Página (padrão: 1) |
| `limit` | number | Não | Itens por página (padrão: 20) |
| `include_private` | boolean | Não | Incluir investidores que não autorizaram exibição |

### Response Success (200)
```json
{
  "status": "success",
  "message": "Investidores recuperados com sucesso",
  "data": {
    "startup_id": 123,
    "investidores": [
      {
        "id": 456,
        "nome": "João Silva",
        "email": "j***@email.com",
        "email_completo": null,
        "total_investido": 15000,
        "total_tokens": 150,
        "data_primeiro_investimento": "2023-07-15",
        "data_ultimo_investimento": "2023-12-20",
        "numero_investimentos": 3,
        "perfil_publico": true,
        "foto_url": "https://cdn.exemplo.com/avatars/456.jpg",
        "localizacao": {
          "cidade": "São Paulo",
          "uf": "SP",
          "pais": "Brasil"
        }
      },
      {
        "id": 789,
        "nome": "Investidor Anônimo",
        "email": "****@****.***",
        "email_completo": null,
        "total_investido": 25000,
        "total_tokens": 250,
        "data_primeiro_investimento": "2023-08-01",
        "data_ultimo_investimento": "2023-11-15",
        "numero_investimentos": 2,
        "perfil_publico": false,
        "foto_url": null,
        "localizacao": null
      }
    ],
    "estatisticas": {
      "total_investidores": 67,
      "total_publicos": 45,
      "total_anonimos": 22,
      "ticket_medio": 18750,
      "investimento_total": 1256250,
      "distribuicao_geografica": {
        "SP": 32,
        "RJ": 18,
        "MG": 8,
        "Outros": 9
      }
    },
    "pagination": {
      "current_page": 1,
      "total_pages": 4,
      "per_page": 20,
      "total_items": 67
    }
  }
}
```

---

## 🌍 **8. GET /api/countries - Lista de Países**

### Descrição
Retorna lista completa de países para seleção no formulário. **API externa já disponível.**

### URL Atual
`http://3.23.98.16/apiV0/countries`

### Response Structure
```json
{
  "status": "success",
  "message": "Todos os países",
  "data": [
    {
      "id": 32,
      "name": "Brazil",
      "iso3": "BRA",
      "iso2": "BR",
      "emoji": "🇧🇷",
      "native": "Brasil",
      "currency": "BRL",
      "currency_symbol": "R$"
    }
  ]
}
```

---

## 📂 **9. POST /api/uploads - Upload de Arquivos**

### Descrição
Endpoint para upload de logos, documentos e imagens.

### Request (Multipart Form)
```
POST /api/uploads
Content-Type: multipart/form-data

file: [binary]
type: "logo" | "document" | "image"
startup_id: 123 (opcional)
```

### Validações
- **Logos**: PNG, JPG, SVG (max 2MB, min 100x100px)
- **Documentos**: PDF (max 10MB)
- **Imagens**: PNG, JPG (max 5MB)

### Response Success (200)
```json
{
  "status": "success",
  "message": "Upload realizado com sucesso",
  "data": {
    "file_id": "uuid-123-456",
    "url": "https://cdn.exemplo.com/uploads/uuid-123-456.png",
    "original_name": "logo.png",
    "size": 145678,
    "type": "logo",
    "dimensions": {
      "width": 512,
      "height": 512
    },
    "uploaded_at": "2024-01-20T16:30:00Z"
  }
}
```

---

## ⚠️ **Códigos de Erro Comuns**

| Código | Descrição | Ação Sugerida |
|--------|-----------|---------------|
| `400` | Bad Request | Verificar parâmetros |
| `401` | Unauthorized | Renovar token |
| `403` | Forbidden | Verificar permissões |
| `404` | Not Found | Startup não existe |
| `409` | Conflict | CNPJ duplicado |
| `422` | Validation Error | Corrigir dados |
| `429` | Rate Limited | Aguardar e tentar novamente |
| `500` | Server Error | Reportar erro |

---

## 🔧 **Headers Necessários**

```http
Content-Type: application/json
Authorization: Bearer {jwt_token}
X-User-Role: fundador
X-Request-ID: unique-request-id
Accept: application/json
```

---

## 🎯 **Observações para Backend**

1. **Paginação**: Implementar cursor-based para melhor performance
2. **Cache**: TTL de 5min para estatísticas, 1min para lista
3. **Rate Limiting**: 100 req/min por usuário
4. **Logs**: Todas as operações de CRUD devem ser logadas
5. **Validações**: Sempre validar no servidor, não confiar no frontend
6. **Segurança**: Verificar ownership da startup em todas as operações
7. **Performance**: Índices em campos de busca e filtro
8. **Backup**: Backup antes de operações destrutivas

---

## 📊 **Métricas para Monitoramento**

- Tempo de resposta por endpoint
- Taxa de erro por operação
- Uso de filtros mais comuns
- Performance de uploads
- Queries mais lentas

**Documento criado para facilitar a implementação do backend e garantir consistência na integração frontend-backend.**