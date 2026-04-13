# **Documentação Técnica \- Editar Startup**

## **Informações Gerais**

| Propriedade | Valor |
| :---- | :---- |
| **Rota** | /dashboard/startups/:id/edit |
| **Path** | /app/routes/private/dashboard/startups/\[id\]/edit/index.tsx |
| **Componentes Únicos** | /app/routes/private/dashboard/startups/\[id\]/edit/components/\* |
| **API Route** | StartupApi.getById(), StartupApi.update() |
| **Type** | Private (Requer autenticação \+ Permissão de Edição) |
| **Framework** | React \+ Tailwind CSS v4 |
| **Tema** | Dark (Stone) |

## **Dependências**

### **Ícones (Lucide React)**

import {   
  Save, X, Upload, Globe, DollarSign, Users,   
  Settings, MapPin, FileText, CheckCircle,   
  AlertCircle, Plus, Trash2, PieChart, Briefcase,  
  ChevronLeft, Loader2  
} from 'lucide-react';

## **Estrutura da Página**

### **1\. Header & Tabs**

* Título dinâmico com o nome da startup e Badge de status atual.  
* Barra de abas (Tabs) persistente abaixo do título.

### **2\. Conteúdo das Abas**

#### **A. Dados Gerais**

* **Identidade:** Upload de logo, Razão Social, CNPJ (com máscara), Fundação.  
* **Descritivo:** TextAreas para Problema, Solução, Diferencial e Modelo de Receita.

#### **B. Localização**

* **Seletor de País:** Combobox simulado que retorna objeto { iso3, nome, emoji }.  
* Visualização do país selecionado com bandeira.

#### **C. Financeiro**

* **Campanha:** Meta, Equity, Datas (Início/Fim).  
* **Valuation:** Campo read-only calculado automaticamente: Meta / (Equity / 100).  
* **Alocação de Recursos:** Sliders (Marketing, Produto, Operação, etc).  
* **Validação:** Exibe erro se a soma da alocação \!= 100%.

#### **D. Time**

* **Sócios (Cap Table):** Lista com Nome, Cargo e % de Equity.  
* **Colaboradores:** Lista com Nome, Cargo e Foto.  
* Ações de Adicionar/Remover itens.

#### **E. Configurações**

* Toggles booleanos para: Repasse de Lucros, Benefícios, Exibir Selos, Status Ativo.

### **3\. Sticky Footer**

* Barra fixa no rodapé para salvar alterações.  
* Botão "Salvar" desabilitado se houver erros de validação (ex: Alocação \!= 100%).

## **Mock Data Structure**

{  
  "id": "1",  
  "name": "FinFlow",  
  "status": "approved",  
  "general": { ... },  
  "financial": {  
    "targetAmount": 500000,  
    "equityPercentage": 10,  
    "allocation": { "marketing": 30, "dev": 50, "ops": 20 }  
  },  
  "config": { "active": true, "profitShare": false }  
}  
