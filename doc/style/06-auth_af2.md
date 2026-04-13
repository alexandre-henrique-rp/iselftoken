# **Documentação Técnica \- Autenticação de 2 Fatores (2FA)**

## **Informações Gerais**

| Propriedade | Valor |
| :---- | :---- |
| **Rota** | /auth/af2 |
| **Path** | /app/routes/public/auth/af2/index.tsx |
| **Componentes Únicos** | /app/routes/public/auth/af2/components/index.tsx |
| **API Route** | ApiAuth.verify2FA(), ApiAuth.resendCode() |
| **Tipo** | Pública (Requer sessão parcial) |
| **Framework** | React \+ Tailwind CSS v4 |
| **Tema** | Dark (padrão) |
| **Design System** | shadcn/ui (tema stone) |

## **Dependências**

### **Ícones (Lucide React)**

import {   
  ShieldCheck,   
  ArrowLeft,   
  RotateCcw,   
  CheckCircle,   
  Shield,   
  Globe   
} from 'lucide-react';

## **Estrutura da Página**

A página utiliza o layout **Split-Screen** (Tela Dividida), mantendo a consistência com o fluxo de autenticação.

1. [Coluna Esquerda (Verificação)](https://www.google.com/search?q=%231-coluna-esquerda-verificacao)  
2. [Coluna Direita (Visual Hero)](https://www.google.com/search?q=%232-coluna-direita-visual-hero)

## **1\. Coluna Esquerda (Verificação)**

### **Descrição**

Área funcional para inserção do código de segurança enviado (E-mail/SMS).

### **Elementos Principais**

| Elemento | Comportamento | Detalhes |
| :---- | :---- | :---- |
| **Título** | Estático | "Verificação em dois fatores" |
| **Instrução** | Informativo | Informa para onde o código foi enviado (ex: e\*\*\*@domain.com). |
| **Input OTP** | Interativo | 6 campos numéricos. Auto-focus, auto-tab, paste support. |
| **Timer** | Dinâmico | Contador regressivo (ex: 05:00). Bloqueia reenvio enquanto ativo. |
| **Botão Verificar** | Ação | Habilita apenas quando os 6 dígitos estão preenchidos. |
| **Botão Reenviar** | Ação | Habilita apenas após o timer expirar. |
| **Botão Voltar** | Navegação | Retorna para a tela de login. |

### **Lógica do Input OTP**

* Aceita apenas números.  
* Ao digitar, pula para o próximo campo.  
* Ao apagar (Backspace) em campo vazio, volta para o anterior.  
* Ao colar um código de 6 dígitos, preenche todos os campos automaticamente.

## **2\. Coluna Direita (Visual Hero)**

### **Descrição**

Mantém a identidade visual das páginas de Login e Cadastro.

### **Características**

* **Imagem**: Tema "Business/Fintech" (Consistente com Cadastro).  
* **Overlay**: Escuro (stone-950/60).  
* **Badges**: "Plataforma Regulada" e "Investimento Acessível".

## **Componentes Customizados**

### **OtpInput**

Componente especializado para entrada de códigos segmentados.

* **Props**: length (padrão 6), value, onChange.  
* **Estilo**: Campos individuais com w-12 h-12, borda stone-800 e foco blue-600.

### **TimerDisplay**

Formata o tempo restante (MM:SS) e altera a cor (Cinza \-\> Vermelho) quando está perto de expirar.

## **Responsividade**

| Breakpoint | Comportamento |
| :---- | :---- |
| **Mobile** | Coluna única. Inputs OTP podem reduzir tamanho (w-10) para caber em telas estreitas. |
| **Desktop** | Grid 2 colunas. Layout fixo. |

