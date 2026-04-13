# **Documentação Técnica \- Home Privada (Marketplace)**

## **Informações Gerais**

| Propriedade | Valor |
| :---- | :---- |
| **Rota** | /home |
| **Path** | /app/routes/private/home/index.tsx |
| **Componentes Únicos** | /app/routes/private/home/components/index.tsx |
| **API Route** | PrivateApi.home(), ApiPage.getBanner() |
| **Type** | Private (Requer autenticação) |
| **Framework** | React \+ Tailwind CSS v4 |
| **Tema** | Dark (Stone) |

## **Dependências**

### **Ícones (Lucide React)**

import {   
  Search,   
  Bell,   
  LogOut,   
  User,   
  ChevronRight,   
  TrendingUp,   
  ShieldCheck,   
  Rocket,   
  Clock   
} from 'lucide-react';

## **Estrutura da Página**

A página é renderizada dentro do \<Outlet /\> do Layout Principal.

### **1\. Header Interno**

Barra superior específica do marketplace.

* **Logo:** iSelfToken (\#d500f9).  
* **Busca:** Input largo com ícone de lupa (bg-stone-900).  
* **Ações:** Ícones de notificação, perfil e logout.

### **2\. Banner Rotativo (Hero)**

Carrossel automático com lógica de tempo.

* **Tempo:** 5 segundos por slide.  
* **Largura:** 95% do container pai, centralizado com mx-auto.  
* **Indicador:** Barra de progresso na parte inferior do slide ativo.  
* **Interação:** Sem botões de navegação (apenas indicadores visuais).

### **3\. Seções de Startups**

Organizadas verticalmente. As 4 primeiras utilizam rolagem horizontal (Carousel), a última utiliza Grid.

| Seção | Tipo de Exibição | Ícone/Tema |
| :---- | :---- | :---- |
| **Rodadas de Captação** | Carrossel Horizontal | TrendingUp (Azul) |
| **Startups Verificadas** | Carrossel Horizontal | ShieldCheck (Verde) |
| **Startups Aceleradas** | Carrossel Horizontal | Rocket (Roxo) |
| **Em Aprovação** | Carrossel Horizontal | Clock (Âmbar) |
| **Oportunidades** | Grid Responsivo (4 col) | Geral |

## **Componentes Customizados**

### **BannerSlider**

Gerencia o estado do slide ativo e o timer.

* **Props:** banners (Array de objetos).  
* **Lógica:** useEffect com setInterval de 5000ms.  
* **Animação:** CSS Keyframes para a barra de progresso.

### **StartupCard**

Card padrão para exibição de startups.

* **Props:** data (Objeto da startup).  
* **Elementos:** Imagem de capa, Badge de categoria, Título, Descrição curta, Barra de progresso (se for rodada de captação) ou Status.  
* **Ação:** Botão "Ver mais" redireciona para /startup/:id.

### **SectionHeader**

Título padronizado para cada seção com ícone e link "Ver todos".

## **Mock Data Structure**

// Banner  
{  
  "id": 1,  
  "title": "Demo Day 2026",  
  "description": "Participe do maior evento de startups...",  
  "image": "url...",  
  "category": "Evento"  
}

// Startup  
{  
  "id": 101,  
  "name": "FinFlow",  
  "category": "FinTech",  
  "image": "url...",  
  "status": "Captando",  
  "progress": 75, // Opcional  
  "badges": \["Verificada"\]  
}

## **Responsividade**

| Breakpoint | Banner | Carrossel | Grid Oportunidades |
| :---- | :---- | :---- | :---- |
| **Mobile** | Altura ajustada | 1.2 cards visíveis | 1 coluna |
| **Tablet** | Altura média | 2.5 cards visíveis | 2 colunas |
| **Desktop** | Altura cheia | 4 cards visíveis | 4 colunas |

