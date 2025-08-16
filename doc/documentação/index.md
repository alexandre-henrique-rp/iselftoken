# ** nome:** Marketplace
# ** rota:** /

## ** descrição:** 
- Página inicial do marketplace de startups e investimentos, exibindo captações em destaque, lista de startups e depoimentos.

## ** funcionalidades embarcadas:** 
- Lista de captações
- Lista de startups
- Lista de depoimentos
- Botão de login
- Botão de cadastro startup
- Botão de cadastro investidor
- Botão detalhes da startup
- Botão de captação
- Link iSelfToken Education

## ** restrições:** 
- Botões de captação só devem ser liberados se o usuário estiver logado.

## ** Request:** 

### ** GET **
- Request de dados do marketplace (captações e startups)
```json
{
  "status": "success",
  "message": "Lista de startups e captações",
  "data": {
    "captacoes": [
      {
        "id": 1,
        "nome": "Startup X",
        "descricao": "Solução de pagamentos",
        "total": 1000000,
        "total_invest": 250000,
        "total_investidores": 125,
        "valuation": "R$ 10.000.000",
        "categoria": "fintech",
        "capa": "/images/capas/x.jpg",
        "logo": "/images/logos/x.png",
        "selo": "Destaque",
        "status": true,
        "created_at": "2025-08-15T12:00:00Z",
        "final_date": "2025-10-15T23:59:59Z",
        "updated_at": "2025-08-15T12:00:00Z"
      }
    ],
    "startups": [
      {
        "id": 10,
        "nome": "Startup Y",
        "total": 5000000,
        "total_invest": 1250000,
        "total_investidores": 320,
        "categoria": "edtech",
        "logo": "/images/logos/y.png",
        "selo": "Top 3",
        "created_at": "2025-07-10T09:00:00Z",
        "updated_at": "2025-08-14T18:30:00Z"
      }
    ]
  }
}
```
- captacoes: (máx. 10 em ordem aleatória)
  - id: número da id (number)
  - nome: nome fantasia ou razão social (string)
  - descricao: descrição da startup (string)
  - total: valor total da captação (number)
  - total_invest: valor total investido até o momento (number)
  - total_investidores: número total de investidores até o momento (number)
  - valuation: valorização da startup (string)
  - categoria: categoria da startup (edtech, agtech, etc) (string)
  - capa: URL da capa (string)
  - logo: URL do logo (string)
  - selo: selo de premiação ou destaque (string)
  - status: status da captação (boolean)
  - created_at: data de criação ISO (string)
  - final_date: data final da captação ISO (string)
  - updated_at: data de atualização ISO (string)

- startups: (máx. 28 em ordem aleatória)
  - id: número da id (number)
  - nome: nome fantasia ou razão social (string)
  - total: valor total da startup (number)
  - total_invest: valor total investido até o momento (number)
  - total_investidores: número total de investidores até o momento (number)
  - valuation: valorização da startup (string)
  - categoria: categoria da startup (edtech, agtech, etc) (string)
  - capa: URL da capa (string) [opcional]
  - logo: URL do logo (string)
  - selo: selo de premiação ou destaque (string) [opcional]
  - created_at: data de criação ISO (string)
  - updated_at: data de atualização ISO (string)


## ** GET - depoimentos **
- Request de depoimentos

```json
{
  "status": "success",
  "message": "Lista de depoimentos",
  "data": {
    "dep_startups": [
      {
        "id": 1,
        "nome": "João Silva",
        "linkedin": "https://linkedin.com/in/joaosilva",
        "youtube": "https://youtube.com/@startupx",
        "instagram": "https://instagram.com/startupx",
        "depoimento": "Excelente plataforma para captação",
        "created_at": "2025-08-10T10:00:00Z"
      }
    ],
    "dep_investimentos": [
      {
        "id": 2,
        "nome": "Ana Costa",
        "linkedin": "https://linkedin.com/in/anacosta",
        "youtube": null,
        "instagram": null,
        "depoimento": "Investi e tive ótima experiência",
        "created_at": "2025-08-12T15:30:00Z"
      }
    ]
  }
}
```
  
- dep_investimentos: (máx. 3 em ordem aleatória)
  - id: número da id (number)
  - nome: nome do investidor (string)
  - linkedin: URL do perfil (string|null)
  - youtube: URL (string|null)
  - instagram: URL (string|null)
  - depoimento: texto (string)
  
- dep_startups: (máx. 3 em ordem aleatória)
  - id: número da id (number)
  - nome: responsável/startup (string)
  - linkedin: URL do perfil (string|null)
  - youtube: URL (string|null)
  - instagram: URL (string|null)
  - depoimento: texto (string)
  
## ** GET by id **
- Request de startup por id

```json
{
  "status": "success",
  "message": "Startup encontrada",
  "data": {
    "id": 10,
    "nome": "Startup Y",
    "linkedin": "https://linkedin.com/company/startupy",
    "youtube": null,
    "instagram": "https://instagram.com/startupy",
    "categoria": "edtech",
    "logo": "/images/logos/y.png",
    "selo": "Top 3",
    "video": "https://youtube.com/watch?v=xxxx",
    "status": true,
    "total": 5000000,
    "total_invest": 1250000,
    "total_investidores": 320,
    "valuation": "R$ 20.000.000",
    "capa": "/images/capas/y.jpg",
    "history": "História da startup...",
    "descricao": "Descrição detalhada...",
    "final_date": "2025-10-15T23:59:59Z",
    "created_at": "2025-07-10T09:00:00Z",
    "updated_at": "2025-08-14T18:30:00Z"
  }
}
```
- data:
  - id: número da id (number)
  - nome: nome fantasia ou razão social (string)
  - linkedin: URL (string|null)
  - youtube: URL (string|null)
  - instagram: URL (string|null)
  - categoria: categoria (string)
  - logo: URL do logo (string)
  - selo: selo de premiação/destaque (string|null)
  - video: URL do vídeo/pitch (string|null)
  - status: ativa? (boolean)
  - total: valor total da startup (number)
  - total_invest: valor total investido até o momento (number)
  - total_investidores: número de investidores até o momento (number)
  - valuation: valorização (string)
  - capa: URL da capa (string)
  - history: história/pitch (string)
  - descricao: descrição (string)
  - final_date: data final da captação ISO (string)
  - created_at: data de criação ISO (string)
  - updated_at: data de atualização ISO (string)

**obs:** sobre o vídeo, podemos usar um campo de URL (ex.: YouTube) para servir de pitch/apresentação.

---

## ** Paginação, filtros e ordenação (sugeridos)**
- Query params comuns: `page`, `per_page`, `order_by` (ex.: total_invest, created_at), `order` (asc|desc), `categoria`.
- Resposta paginada (exemplo):
```json
{
  "status": "success",
  "message": "Lista de captações",
  "data": [
    { "id": 1, "nome": "Startup X" }
  ],
  "meta": {
    "page": 1,
    "per_page": 10,
    "total": 42,
    "total_pages": 5
  }
}
```

## ** Links úteis**
- Documentação Login: `/doc/documentação/login.md`
- Documentação Cadastro: `/doc/documentação/register.md`
- Recuperar Senha: `/doc/documentação/recuperar-senha.md`
- Redefinir Senha: `/doc/documentação/redefinir-senha.md`
- A2F: `/doc/documentação/a2f.md`
- Termos de Uso: `/doc/documentação/termos-de-uso.md`