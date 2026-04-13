# **Documentação Técnica \- Dashboard Minhas Startups**

## **Informações Gerais**

| Propriedade | Valor |
| :---- | :---- |
| **Rota** | /dashboard/startups |
| **Path** | /app/routes/private/dashboard/startups/index.tsx |
| **Componentes Únicos** | /app/routes/private/dashboard/startups/components/\* |
| **API Route** | StartupApi.listMyStartups(), StartupApi.create() |
| **Type** | Private (Requer autenticação \+ Perfil de Fundador) |
| **Framework** | React \+ Tailwind CSS v4 |
| **Tema** | Dark (Stone) |

## **Dependências**

### **Ícones (Lucide React)**

import {   
  Plus,   
  Search,   
  Filter,   
  MoreHorizontal,   
  TrendingUp,   
  Users,   
  Calendar,   
  AlertCircle,   
  CheckCircle,   
  Clock,   
  FileText,  
  Rocket,  
  ChevronRight,  
  Edit3,  
  Eye  
} from 'lucide-react';

## **Estrutura da Página**

### **1\. Header do Dashboard**

* **Título:** "Minhas Startups"  
* **Subtítulo:** "Gerencie seus projetos e acompanhe o progresso das rodadas."  
* **Ação Principal:** Botão Criar Nova Startup (Link para /create).

### **2\. Barra de Filtros**

* **Busca:** Input de texto para filtrar por nome.  
* **Filtro de Status:** Dropdown ou Tabs (Todas, Em Análise, Aprovada, Rejeitada).  
* **Filtro de Campanha:** Dropdown (Rascunho, Aberta, Finalizada).

### **3\. Lista de Startups (Card Row Layout)**

Optou-se por um layout de **Cards Horizontais** em vez de uma tabela tradicional pura, pois permite exibir a logo e informações hierárquicas de forma mais rica em dispositivos móveis e desktop.

#### **Estrutura do Item (Card)**

* **Coluna 1 (Identidade):** Logo, Nome, Segmento (Tag).  
* **Coluna 2 (Status):** Badge de Status da Plataforma (ex: "Em Análise").  
* **Coluna 3 (Captação):** Barra de progresso, Valor captado / Meta, Status da Campanha.  
* **Coluna 4 (Ações):** Botões "Editar" e "Gerenciar".

### **4\. Estado Vazio (Empty State)**

Exibido quando o array de startups é vazio ou o filtro não retorna resultados.

* Ilustração ou Ícone grande (Rocket).  
* Texto encorajador.  
* Botão CTA para criar startup.

## **Status e Cores (Design Tokens)**

| Status Plataforma | Cor Badge | Significado |
| :---- | :---- | :---- |
| **Em Análise** | amber | Aguardando aprovação da curadoria. |
| **Aprovada** | green | Aprovada para criar ofertas. |
| **Rejeitada** | red | Não atendeu aos critérios. |
| **Rascunho** | stone | Ainda não enviada. |

| Status Campanha | Cor Indicador | Significado |
| :---- | :---- | :---- |
| **Em Edição** | stone | Configurando a oferta. |
| **Aberta** | blue | Captação ativa (Barra de progresso visível). |
| **Financiada** | green | Meta atingida. |
| **Encerrada** | stone | Prazo expirou. |

## **Mock Data Structure**

\[  
  {  
    "id": "1",  
    "name": "FinFlow",  
    "segment": "FinTech",  
    "logo": "url...",  
    "status": "approved", // Status Plataforma  
    "campaign": {  
      "status": "open", // Status Campanha  
      "raised": 630000,  
      "goal": 840000,  
      "percentage": 75,  
      "investors": 234  
    },  
    "createdAt": "2025-12-01"  
  }  
\]  
