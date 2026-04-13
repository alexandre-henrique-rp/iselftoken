# **Documentação Técnica \- Criar Nova Startup**

## **Informações Gerais**

| Propriedade | Valor |
| :---- | :---- |
| **Rota** | /dashboard/startups/create |
| **Path** | /app/routes/private/dashboard/startups/create/index.tsx |
| **Componentes Únicos** | /app/routes/private/dashboard/startups/create/components/\* |
| **API Route** | StartupApi.create() |
| **Type** | Private (Requer autenticação) |
| **Framework** | React \+ Tailwind CSS v4 |
| **Tema** | Dark (Stone) |

## **Dependências**

### **Ícones (Lucide React)**

import {   
  ChevronLeft, ChevronRight, Upload, Plus, Trash2,   
  Save, AlertCircle, CheckCircle, DollarSign,   
  Globe, Linkedin, Youtube, Instagram, Twitter,  
  Building, Briefcase, FileText, Banknote  
} from 'lucide-react';

## **Estrutura da Página**

### **1\. Header de Navegação**

* **Breadcrumb:** Link para voltar ao Dashboard.  
* **Título:** "Nova Startup".  
* **Stepper:** Barra de progresso visual dividida em 4 etapas.

### **2\. Formulário Multi-etapas (Wizard)**

O estado do formulário é gerenciado em um único objeto formData no componente pai.

#### **Etapa 1: Informações Básicas**

* Campos de identidade corporativa (Razão Social, CNPJ, etc.).  
* Seleção de País e Área de Atuação.  
* Descrição curta do negócio.

#### **Etapa 2: Captação e Valuation**

* **Meta de Captação:** Input monetário.  
* **Equity Oferecido:** Input de porcentagem.  
* **Valuation (Cálculo):** Campo *read-only* calculado automaticamente: Meta / (Equity / 100).  
* **Total Captado:** Campo informativo (inicia em 0).

#### **Etapa 3: Mídias e Redes Sociais**

* Links para Logo, Pitch Deck e Vídeo.  
* **Lista Dinâmica:** Componente para adicionar URLs de redes sociais com botão de remover.

#### **Etapa 4: Informações Bancárias**

* Dados para recebimento dos aportes.

### **3\. Footer de Ações**

* Botão **Voltar** (oculto na etapa 1).  
* Botão **Próximo** (valida etapa atual).  
* Botão **Salvar e Criar** (apenas na última etapa).

## **Componentes Customizados**

### **StepIndicator**

Barra lateral ou superior que mostra:

1. Básico  
2. Valuation  
3. Mídia  
4. Bancário

### **DynamicSocialList**

Gerencia um array de objetos { network, url }.

* Botão "Adicionar Rede": Insere novo item no array.  
* Botão "Lixeira": Remove item pelo índice.

### **CurrencyInput**

Input estilizado com prefixo "R$" fixo e formatação visual.

## **Lógica de Validação e Máscaras**

* **CNPJ:** Máscara XX.XXX.XXX/0001-XX.  
* **Valuation:** Atualiza via useEffect sempre que targetAmount ou equityPercentage mudam.  
* **Envio:** Simulação de *loading* de 2 segundos antes do sucesso.

## **Mock Data Structure (Payload)**

{  
  "name": "",  
  "legalName": "",  
  "cnpj": "",  
  "country": "Brasil",  
  "segment": "",  
  "stage": "",  
  "website": "",  
  "description": "",  
  "targetAmount": "",  
  "equityPercentage": "",  
  "valuation": "", // Calculado  
  "logoUrl": "",  
  "pitchDeckUrl": "",  
  "videoUrl": "",  
  "socials": \[{ "network": "linkedin", "url": "..." }\],  
  "bankData": {  
    "bank": "",  
    "agency": "",  
    "account": ""  
  }  
}  
