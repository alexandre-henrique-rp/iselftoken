# **Documentação Técnica \- Página de Cadastro**

## **Informações Gerais**

| Propriedade | Valor |
| :---- | :---- |
| **Rota** | /cadastro |
| **Path** | /app/routes/page/cadastro/index.tsx |
| **Componentes Únicos** | /app/routes/page/cadastro/components/index.tsx |
| **API Route** | ApiPage.register() |
| **Tipo** | Pública |
| **Framework** | React \+ Tailwind CSS v4 |
| **Tema** | Dark (padrão) |
| **Design System** | shadcn/ui (tema stone) |

## **Dependências**

### **Ícones (Lucide React)**

import {   
  User,   
  Mail,   
  Phone,   
  Lock,   
  ArrowRight,   
  CheckCircle,   
  Shield,   
  Eye,   
  EyeOff,   
  Globe,  
  Check,  
  X  
} from 'lucide-react';

## **Estrutura da Página**

A página utiliza o layout **Split-Screen** (Tela Dividida), similar ao login, mas com foco em coleta de dados mais densa.

1. [Coluna Esquerda (Formulário de Registro)](https://www.google.com/search?q=%231-coluna-esquerda-formul%C3%A1rio)  
2. [Coluna Direita (Visual Hero)](https://www.google.com/search?q=%232-coluna-direita-visual-hero)

## **1\. Coluna Esquerda (Formulário)**

### **Descrição**

Área funcional para criação de nova conta.

### **Campos do Formulário**

| Campo | Tipo | Validação / Regras |
| :---- | :---- | :---- |
| **Nome Completo** | Text | Obrigatório. |
| **E-mail** | Email | Obrigatório. Deve ser convertido para **lowercase**. |
| **Telefone** | Tel | Obrigatório. Máscara: \+55 11 9 9999-9999. |
| **Senha** | Password | Min. 12 chars, 1 Maiúscula, 1 Minúscula, 1 Número, 1 Especial. |
| **Confirmar Senha** | Password | Deve ser idêntica à senha. |
| **Termos** | Checkbox | Obrigatório. Link para Termos de Uso. |
| **Privacidade** | Checkbox | Obrigatório. Link para Política de Privacidade. |

### **Feedback de Senha (Password Strength)**

Um componente visual deve indicar o cumprimento dos requisitos:

* \[x\] Pelo menos 12 caracteres  
* \[x\] Letra maiúscula  
* \[x\] Letra minúscula  
* \[x\] Número  
* \[x\] Caractere especial

## **2\. Coluna Direita (Visual Hero)**

### **Descrição**

Mantém a consistência visual com a página de login, reforçando a marca para novos usuários.

### **Características**

* **Imagem**: Tema "Business/Fintech" (unsplash/photo-1486406146926...).  
* **Overlay**: Escuro (stone-950/60) para contraste.  
* **Badges**: "Plataforma Regulada" e "Investimento Acessível".

## **Componentes Customizados**

### **PasswordRequirement**

Item de lista que muda de cor (Vermelho/Cinza \-\> Verde) conforme o requisito é atendido.

### **CheckboxPremium**

Checkbox estilizado seguindo o tema Stone, substituindo o padrão do navegador.

## **Responsividade**

| Breakpoint | Comportamento |
| :---- | :---- |
| **Mobile** | Coluna única, formulário ocupa 100%. Scroll vertical habilitado devido à altura do formulário. |
| **Desktop** | Grid 2 colunas. Coluna direita fixa (h-screen sticky). Coluna esquerda com scroll independente se necessário. |

