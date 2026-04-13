# **Documentação Técnica \- Página de Login**

## **Informações Gerais**

| Propriedade | Valor |
| :---- | :---- |
| **Rota** | /login |
| **Path** | /app/routes/page/login/index.tsx |
| **Componentes Únicos** | /app/routes/page/login/components/index.tsx |
| **API Route** | ApiPage.LoginPublic() |
| **Tipo** | Pública |
| **Framework** | React \+ Tailwind CSS v4 |
| **Tema** | Dark (padrão) |
| **Design System** | shadcn/ui (tema stone) |

## **Componentes shadcn/ui Recomendados**

A base visual utiliza o padrão de blocos de autenticação, mas com customizações profundas para o tema Stone.

\# Base de referência  
npx shadcn@latest add login-02

## **Dependências**

### **Ícones (Lucide React)**

import {   
  Mail,   
  Lock,   
  ArrowRight,   
  CheckCircle,   
  Shield,   
  Eye,   
  EyeOff,   
  Globe   
} from 'lucide-react';

## **Estrutura da Página**

A página de login utiliza um layout **Split-Screen** (Tela Dividida) composto por **2 seções principais**:

1. [Coluna Esquerda (Formulário)](https://www.google.com/search?q=%231-coluna-esquerda-formul%C3%A1rio)  
2. [Coluna Direita (Visual Hero)](https://www.google.com/search?q=%232-coluna-direita-visual-hero)

## **1\. Coluna Esquerda (Formulário)**

### **Descrição**

Área funcional da página, focada na conversão e entrada de dados do usuário.

### **Características**

* **Posição**: Esquerda (Desktop) / Full Width (Mobile)  
* **Padding**: p-8 (mobile) a p-12 (desktop)  
* **Container Interno**: Largura máxima fixa de 400px, centralizado.

### **Elementos**

| Elemento | Tipo | Descrição |
| :---- | :---- | :---- |
| Header | Navegação | Logo "iSelfToken" (\#d500f9) \+ Seletor de Idioma (Mobile) |
| Título | Texto | "Bem-vindo de volta" (text-3xl, bold) |
| Subtítulo | Texto | Instrução breve em stone-400 |
| Formulário | Componente | Campos de E-mail, Senha e Botões de Ação |
| Footer | Links | Termos, Privacidade e Copyright |

### **Código de Referência**

\<div className="flex flex-col justify-between p-8 md:p-12 relative z-10"\>  
  {/\* Header com Logo \*/}  
  \<div className="flex justify-between items-center lg:justify-start"\>  
     {/\* ... \*/}  
  \</div\>

  {/\* Form Container \*/}  
  \<div className="mx-auto w-full max-w-\[400px\] py-12 lg:py-0"\>  
     {/\* ... Inputs e Botões \*/}  
  \</div\>  
\</div\>

## **2\. Coluna Direita (Visual Hero)**

### **Descrição**

Área visual imersiva exclusiva para desktop, reforçando a proposta de valor da marca.

### **Características**

* **Visibilidade**: hidden lg:block (Apenas Desktop)  
* **Background**: Imagem temática de tecnologia/investimento.  
* **Overlay**: Gradientes stone-950 para garantir legibilidade do texto.  
* **Efeitos**: mix-blend-luminosity na imagem, blurs coloridos decorativos.

### **Estrutura Visual**

┌───────────────────────────────────────┐  
│ \[Imagem de Fundo \+ Overlay\]           │  
│                                       │  
│                                       │  
│          \[Blur Decorativo\]            │  
│                                       │  
│ ┌───────────────────────────────────┐ │  
│ │ Badge: Rodadas Abertas (Pulse)    │ │  
│ └───────────────────────────────────┘ │  
│                                       │  
│ Título H1 (Invista em startups...)    │  
│ Subtítulo (A iSelfToken conecta...)   │  
│                                       │  
│ ┌────────────────┐ ┌────────────────┐ │  
│ │Plat. Regulada  │ │Inv. Acessível  │ │  
│ └────────────────┘ └────────────────┘ │  
│                                       │  
└───────────────────────────────────────┘

### **Elementos de Destaque**

| Elemento | Estilo | Detalhe |
| :---- | :---- | :---- |
| Badge Topo | Glassmorphism | bg-blue-500/10 \+ animate-ping (ponto azul) |
| Título Hero | Display | text-4xl, font-bold, text-white |
| Badges Footer | Outline/Glass | Ícones coloridos (Shield verde, Check azul) |

## **Componentes Customizados**

### **1\. InputPremium**

Input de texto estilizado com suporte a ícones e toggle de senha.

#### **Props**

| Prop | Tipo | Padrão | Descrição |
| :---- | :---- | :---- | :---- |
| label | string | \- | Texto do label superior |
| icon | LucideIcon | \- | Ícone decorativo à esquerda |
| type | string | "text" | Tipo do input (suporte a "password") |
| placeholder | string | \- | Texto de ajuda interno |
| id | string | \- | ID para acessibilidade (label for) |

#### **Comportamento**

* **Foco**: Borda azul (border-blue-600) e anel de foco (ring-blue-600/50).  
* **Senha**: Botão interno para alternar visibilidade (Eye/EyeOff).

### **2\. ButtonPremium**

Botão principal de interação com variantes de estilo.

#### **Variantes**

| Variante | Classes Principais | Uso |
| :---- | :---- | :---- |
| primary | bg-blue-600 text-white shadow-lg | Ação principal (Entrar) |
| secondary | bg-stone-900 border-stone-700 | Ação secundária (Criar conta) |
| outline | bg-transparent border-stone-800 | Botões auxiliares |
| ghost | hover:bg-stone-800/50 | Links discretos |

## **Paleta de Cores**

### **Cores da Marca e UI**

| Token | Valor | Uso |
| :---- | :---- | :---- |
| Brand | \#d500f9 | Logo iSelfToken |
| Primary | \#2563eb (blue-600) | Botão Entrar, Foco dos Inputs |
| Background | stone-950 | Fundo geral da página |
| Surface | stone-900 | Fundo dos inputs e coluna visual |
| Border | stone-800 | Divisores e bordas de inputs |

## **Responsividade**

### **Breakpoints**

| Breakpoint | Comportamento do Layout |
| :---- | :---- |
| **Mobile** (\< 1024px) | Layout de coluna única. Coluna direita oculta (hidden). Formulário ocupa 100% da largura. |
| **Desktop** (≥ 1024px) | Grid de 2 colunas (lg:grid-cols-2). Formulário ocupa 50%, Visual Hero ocupa 50%. |

## **Checklist de Implementação**

* \[ \] Configurar rota /login no roteador da aplicação.  
* \[ \] Implementar validação de formulário (ex: React Hook Form \+ Zod).  
* \[ \] Conectar ApiPage.LoginPublic() no submit do formulário.  
* \[ \] Implementar feedback de erro (toast ou mensagem inline) em caso de falha no login.  
* \[ \] Configurar redirecionamento após login bem-sucedido (ex: para /dashboard).  
* \[ \] Verificar acessibilidade (navegação por teclado nos inputs).  
* \[ \] Otimizar imagem de fundo da coluna direita (WebP/AVIF).

## **Notas de Acessibilidade**

* Todos os inputs possuem tags \<label\> associadas via htmlFor.  
* O contraste dos placeholders (stone-600) e texto (stone-100) sobre fundo stone-900 atende aos critérios WCAG.  
* Foco visível implementado em todos os elementos interativos (focus:ring-2).