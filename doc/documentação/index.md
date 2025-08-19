# **nome:** Marketplace

# **rota:** /

## **descrição:** 

- Página inicial do marketplace de startups e investimentos, exibindo captações em destaque, lista de startups e depoimentos.

## **funcionalidades embarcadas:** 

- Lista de captações
- Lista de startups
- Lista de depoimentos
- Botão de login
- Botão de cadastro startup
- Botão de cadastro investidor
- Botão detalhes da startup
- Botão de captação
- Link iSelfToken Education

## **restrições:** 

- Botões de captação só devem ser liberados se o usuário estiver logado.

## **Requests:**

### **GET - Oportunidades**

- Request de oportunidades de investimento

```json
{
  "status": "success",
  "message": "Lista de oportunidades",
  "data": [
    {
      "name": "Thape",
      "subName": "Tintacp",
      "category": "Fintech",
      "icon": "fintech"
    },
    {
      "name": "AI Abs",
      "subName": "Stracp Carfgus",
      "category": "AI",
      "icon": "ai"
    },
    {
      "name": "Edtech",
      "subName": "Avcle Getterer",
      "category": "EdTech",
      "icon": "education"
    },
    {
      "name": "CF Shimap",
      "subName": "Conp Pctns",
      "category": "SaaS",
      "icon": "saas"
    },
    {
      "name": "FinPulse",
      "subName": "Credit Solutions",
      "category": "Fintech",
      "icon": "fintech"
    },
    {
      "name": "AgroGrowth",
      "subName": "Smart Farming",
      "category": "AI",
      "icon": "ai"
    },
    {
      "name": "CloudBase",
      "subName": "API Services",
      "category": "SaaS",
      "icon": "saas"
    },
    {
      "name": "CareConnect",
      "subName": "Patient Management",
      "category": "Healthtech",
      "icon": "health"
    },
    {
      "name": "TutorMe",
      "subName": "Peer-to-peer learning",
      "category": "EdTech",
      "icon": "education"
    },
    {
      "name": "BioGen",
      "subName": "Synthetic Biology",
      "category": "Biotech",
      "icon": "biotech"
    },
    {
      "name": "AIVision",
      "subName": "Image Recognition",
      "category": "AI",
      "icon": "ai"
    },
    {
      "name": "DataFlow",
      "subName": "ETL Platform",
      "category": "SaaS",
      "icon": "saas"
    },
    {
      "name": "MedTech",
      "subName": "Diagnostic Tools",
      "category": "Healthtech",
      "icon": "health"
    },
    {
      "name": "EduSmart",
      "subName": "Learning Analytics",
      "category": "EdTech",
      "icon": "education"
    },
    {
      "name": "GreenTech",
      "subName": "Carbon Tracking",
      "category": "Biotech",
      "icon": "biotech"
    },
    {
      "name": "PayFlow",
      "subName": "Payment Gateway",
      "category": "Fintech",
      "icon": "fintech"
    }
  ]
}
```

- data: (máx. 20 em ordem aleatória)
  - name: nome da startup (string)
  - subName: subtítulo/descrição curta (string)
  - category: categoria da startup (string)
  - icon: ícone da categoria (string)

### **GET - Destaques**

- Request de captações em destaque

```json
{
  "status": "success",
  "message": "Lista de destaques",
  "data": [
    {
      "id": "eco-tech",
      "name": "EcoTech Solutions",
      "categoryLabel": "Sustentabilidade",
      "stageLabel": "Série A",
      "trending": true,
      "endingSoon": true,
      "description": "Soluções inovadoras para energia renovável e sustentabilidade urbana.",
      "image": "https://images.unsplash.com/photo-1522199755839-a2bacb67c546?q=80&w=1600&auto=format&fit=crop",
      "raisedLabel": "R$ 1.8M",
      "goalLabel": "R$ 2.5M",
      "percent": 72,
      "collectedLabel": "72% arrecadado",
      "timeLeftLabel": "3 dias restantes",
      "valuationLabel": "R$ 15M",
      "investorsCount": 142
    },
    {
      "id": "health-ai",
      "name": "HealthAI",
      "categoryLabel": "Saúde",
      "stageLabel": "Seed",
      "trending": true,
      "endingSoon": false,
      "description": "Plataforma de IA para triagem e acompanhamento de pacientes.",
      "image": "https://images.unsplash.com/photo-1581092921461-eab62e97a780?q=80&w=1600&auto=format&fit=crop",
      "raisedLabel": "R$ 900k",
      "goalLabel": "R$ 1.6M",
      "percent": 56,
      "collectedLabel": "56% arrecadado",
      "timeLeftLabel": "12 dias restantes",
      "valuationLabel": "R$ 8M",
      "investorsCount": 89
    },
    {
      "id": "edtech-pro",
      "name": "EdTech Pro",
      "categoryLabel": "Educação",
      "stageLabel": "Série B",
      "trending": false,
      "endingSoon": true,
      "description": "Ferramentas de aprendizagem adaptativa para escolas públicas.",
      "image": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1600&auto=format&fit=crop",
      "raisedLabel": "R$ 2.1M",
      "goalLabel": "R$ 3.0M",
      "percent": 70,
      "collectedLabel": "70% arrecadado",
      "timeLeftLabel": "5 dias restantes",
      "valuationLabel": "R$ 22M",
      "investorsCount": 203
    },
    {
      "id": "fintech-plus",
      "name": "FinTech Plus",
      "categoryLabel": "Fintech",
      "stageLabel": "Série A",
      "trending": true,
      "endingSoon": false,
      "description": "Plataforma de pagamentos digitais para pequenas empresas.",
      "image": "https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=1600&auto=format&fit=crop",
      "raisedLabel": "R$ 1.2M",
      "goalLabel": "R$ 2.0M",
      "percent": 60,
      "collectedLabel": "60% arrecadado",
      "timeLeftLabel": "12 dias restantes",
      "valuationLabel": "R$ 18M",
      "investorsCount": 156
    },
    {
      "id": "biotech-innovations",
      "name": "BioTech Innovations",
      "categoryLabel": "Biotech",
      "stageLabel": "Seed",
      "trending": true,
      "endingSoon": false,
      "description": "Desenvolvimento de terapias genéticas para doenças raras.",
      "image": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?q=80&w=1600&auto=format&fit=crop",
      "raisedLabel": "R$ 800K",
      "goalLabel": "R$ 1.5M",
      "percent": 53,
      "collectedLabel": "53% arrecadado",
      "timeLeftLabel": "18 dias restantes",
      "valuationLabel": "R$ 12M",
      "investorsCount": 89
    }
  ]
}
```

- data: (máx. 10 em ordem aleatória)
  - id: identificador único (string)
  - name: nome da startup (string)
  - categoryLabel: categoria da startup (string)
  - stageLabel: estágio da captação (string)
  - trending: está em alta? (boolean)
  - endingSoon: termina em breve? (boolean)
  - description: descrição da startup (string)
  - image: URL da imagem de capa (string)
  - raisedLabel: valor arrecadado formatado (string)
  - goalLabel: meta de captação formatada (string)
  - percent: porcentagem arrecadada (number)
  - collectedLabel: porcentagem formatada (string)
  - timeLeftLabel: tempo restante formatado (string)
  - valuationLabel: valuation formatado (string)
  - investorsCount: número de investidores (number)

### **GET - Depoimentos de Investidores**

- Request de depoimentos de investidores

```json
{
  "status": "success",
  "message": "Lista de depoimentos de investidores",
  "data": [
    {
      "name": "Ana Silva",
      "testimonial": "A iSelfToken abriu portas para investimentos que eu não teria acesso. Curadoria impecável!",
      "role": "Investidora"
    },
    {
      "name": "Carlos Pereira",
      "testimonial": "Plataforma confiável e transparente. Já obtive excelentes retornos nos meus investimentos.",
      "role": "Investidor"
    },
    {
      "name": "Juliana Costa",
      "testimonial": "Interface intuitiva e suporte excepcional. Recomendo para quem quer diversificar a carteira.",
      "role": "Investidora"
    }
  ]
}
```

- data: (máx. 3 em ordem aleatória)
  - name: nome do investidor (string)
  - testimonial: texto do depoimento (string)
  - role: papel/função (string)

### **GET - Depoimentos de Fundadores**

- Request de depoimentos de fundadores

```json
{
  "status": "success",
  "message": "Lista de depoimentos de fundadores",
  "data": [
    {
      "name": "Roberto Santos",
      "testimonial": "A iSelfToken nos ajudou a captar recursos de forma rápida e eficiente. Processo transparente e investidores qualificados.",
      "role": "CEO, TechFlow",
      "linkedinUrl": "https://linkedin.com/in/roberto-santos",
      "youtubeUrl": "https://youtube.com/@techflow",
      "websiteUrl": "https://techflow.com.br"
    },
    {
      "name": "Marina Oliveira",
      "testimonial": "Excelente plataforma para startups em crescimento. O suporte da equipe fez toda a diferença no nosso processo de captação.",
      "role": "Fundadora, GreenTech Solutions",
      "linkedinUrl": "https://linkedin.com/in/marina-oliveira",
      "youtubeUrl": null,
      "websiteUrl": "https://greentech.solutions"
    },
    {
      "name": "Felipe Costa",
      "testimonial": "Conseguimos conectar com investidores alinhados com nossa visão. A iSelfToken é essencial para o ecossistema de inovação.",
      "role": "CTO, FinanceAI",
      "linkedinUrl": "https://linkedin.com/in/felipe-costa",
      "youtubeUrl": "https://youtube.com/@financeai",
      "websiteUrl": "https://financeai.com"
    }
  ]
}
```

- data: (máx. 3 em ordem aleatória)
  - name: nome do fundador (string)
  - testimonial: texto do depoimento (string)
  - role: cargo e empresa (string)
  - linkedinUrl: URL do LinkedIn (string|null)
  - youtubeUrl: URL do YouTube (string|null)
  - websiteUrl: URL do site (string|null)

### **GET by id - Detalhes da Startup**

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

## **Paginação, filtros e ordenação (sugeridos)**

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

## **Links úteis**

- Documentação Login: `/doc/documentação/login.md`
- Documentação Cadastro: `/doc/documentação/register.md`
- Recuperar Senha: `/doc/documentação/recuperar-senha.md`
- Redefinir Senha: `/doc/documentação/redefinir-senha.md`
- A2F: `/doc/documentação/a2f.md`
- Termos de Uso: `/doc/documentação/termos-de-uso.md`