# PRD — Página de Login (04-login)

## 1. Visão Geral

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Autenticar usuários com layout split-screen e CTA para cadastro |
| **Rota** | `/login` |
| **Path** | `app/routes/public/auth/login/index.tsx` |
| **Componentes únicos** | `app/routes/public/auth/login/components/index.tsx` |
| **API** | `ApiPage.login()` |
| **Tipo** | Pública |
| **Design System** | Tailwind CSS v4 + shadcn/ui (tema stone) |
| **Base shadcn** | `npx shadcn@latest add login-02` |

---

## 2. Dependências e Componentes

### 2.1 Componentes shadcn/ui
```bash
npx shadcn@latest add login-02
npx shadcn@latest add input
npx shadcn@latest add button
npx shadcn@latest add label
```

### 2.2 Componentes Customizados
- `AuthLayoutPremium` — layout split-screen
- `LoginForm` — formulário de login
- `ButtonPremium` — botão estilizado
- `InputPremium` — input estilizado

---

## 3. Requisitos Funcionais (Ponto a Ponto)

### 3.1 Layout Split-Screen (Desktop)

| Coluna | Largura | Conteúdo |
|--------|---------|----------|
| Esquerda | 50% | Formulário de login |
| Direita | 50% | Imagem hero com overlay |

**Responsivo:**
| Breakpoint | Layout |
|------------|--------|
| Desktop (> 1024px) | 2 colunas (50/50) |
| Tablet (768-1024px) | 2 colunas (60/40) |
| Mobile (< 768px) | 1 coluna (formulário apenas) |

### 3.2 Coluna Esquerda — Formulário

**Header do Formulário:**
| Elemento | Especificação |
|----------|---------------|
| Logo | "iSelfToken" em `#d500f9`, `font-bold text-xl` |
| Posição | Topo esquerdo |
| Título | "Bem-vindo de volta" — `text-2xl font-semibold text-center` |
| Subtítulo | "Faça login para continuar" — `text-stone-400 text-center` |

**Campos do Formulário:**

```typescript
interface LoginFormData {
  email: string;
  senha: string;
}
```

| Campo | Tipo | Placeholder | Validação |
|-------|------|-------------|-----------|
| E-mail | `email` | "seu@email.com" | Email válido, obrigatório |
| Senha | `password` | "••••••••" | Mínimo 8 caracteres, obrigatório |

**Elementos Adicionais:**
| Elemento | Posição | Ação |
|----------|---------|------|
| Link "Esqueceu a senha?" | Abaixo do campo senha, à direita | → `/recuperar-senha` |
| Botão "Entrar" | Centralizado, largura total | Submit do formulário |
| Divisor | Centralizado | "Não tem conta?" |
| Botão "Crie sua conta" | Centralizado, largura total | → `/cadastro` |
| Texto de termos | Rodapé do formulário | Link para "Termos de Uso" |

**Estilos dos Elementos:**
```css
/* Botão Entrar */
.btn-entrar {
  @apply w-full bg-blue-600 hover:bg-blue-700;
  @apply text-white font-semibold py-3 rounded-lg;
  @apply transition-colors duration-200;
}

/* Botão Criar Conta */
.btn-criar-conta {
  @apply w-full bg-transparent border border-stone-600;
  @apply text-stone-300 hover:bg-stone-800;
  @apply font-semibold py-3 rounded-lg;
}

/* Input */
.input-login {
  @apply w-full bg-stone-900 border-stone-700;
  @apply text-stone-50 placeholder:text-stone-500;
  @apply focus:ring-2 focus:ring-blue-500 focus:border-transparent;
  @apply py-3 px-4 rounded-lg;
}
```

### 3.3 Coluna Direita — Hero

| Elemento | Especificação |
|----------|---------------|
| Imagem | Background cover, altura 100% |
| Overlay | `bg-gradient-to-t from-stone-950/90 to-stone-950/50` |
| Posição conteúdo | Centralizado verticalmente, padding inferior |

**Conteúdo do Hero:**
| Elemento | Texto | Estilo |
|----------|-------|--------|
| Título | "Invista em startups promissoras via tokenização de equity" | `text-3xl font-bold text-white` |
| Subtítulo | "Conectamos investidores a fundadores em uma plataforma segura e acessível" | `text-lg text-stone-300` |

**Badges Inferiores:**
| Badge | Ícone | Cor |
|-------|-------|-----|
| Plataforma regulada | Shield | `bg-stone-800/80` |
| Investimento acessível | Coins | `bg-stone-800/80` |

---

## 4. Fluxo de Autenticação

### 4.1 Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────────┐
│                     Fluxo de Login                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Usuário preenche email e senha                              │
│  2. Clica em "Entrar"                                            │
│  3. Validação frontend                                           │
│     │                                                            │
│     ├─ INVÁLIDO: Exibir erros inline                             │
│     │                                                            │
│     └─ VÁLIDO: Chamar API login()                                │
│         │                                                        │
│         ├─ ERRO API: Exibir mensagem de erro                     │
│         │                                                        │
│         └─ SUCESSO: Verificar cookie AF2                         │
│             │                                                    │
│             ├─ SEM AF2: Redirecionar → /auth                     │
│             │                                                    │
│             └─ COM AF2: Redirecionar → /home                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Validações Frontend

```typescript
const loginSchema = {
  email: {
    required: 'E-mail é obrigatório',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'E-mail inválido'
    }
  },
  senha: {
    required: 'Senha é obrigatória',
    minLength: {
      value: 8,
      message: 'Senha deve ter no mínimo 8 caracteres'
    }
  }
};
```

### 4.3 Chamada da API

```typescript
// Request
interface LoginRequest {
  email: string;
  password: string;
  codigo?: string; // Código AF2 se necessário
}

// Response
interface LoginResponse {
  error: boolean;
  message: string;
  codigo: number;
  data: {
    id: number;
    email: string;
    nome: string;
    role: 'USER' | 'ADMIN' | 'FOUNDER';
    isActive: boolean;
    token: string;
    refreshToken: string;
    exp: number;
  };
}
```

---

## 5. Requisitos de UI/UX

### 5.1 Tema e Cores

| Elemento | Classe Tailwind |
|----------|-----------------|
| Background form | `bg-stone-950` |
| Background hero | Imagem + overlay |
| Texto principal | `text-stone-50` |
| Texto secundário | `text-stone-400` |
| Input background | `bg-stone-900` |
| Input border | `border-stone-700` |
| Botão primário | `bg-blue-600` |
| Logo | `text-[#d500f9]` |
| Links | `text-blue-500 hover:text-blue-400` |

### 5.2 Tipografia

| Elemento | Estilo |
|----------|--------|
| Logo | Inter, `text-xl font-bold` |
| Título | Inter, `text-2xl font-semibold` |
| Labels | Inter, `text-sm font-medium` |
| Inputs | Inter, `text-base` |
| Botões | Inter, `text-base font-semibold` |

### 5.3 Espaçamento

```css
.form-container {
  @apply max-w-md mx-auto px-6 py-12;
  @apply flex flex-col gap-6;
}

.form-group {
  @apply flex flex-col gap-2;
}
```

---

## 6. Estados e Feedbacks

### 6.1 Estado Inicial
- Campos vazios
- Botão "Entrar" habilitado
- Sem mensagens de erro

### 6.2 Estado Loading
```typescript
interface LoadingState {
  isSubmitting: boolean;
}
```
- Botão "Entrar" com spinner
- Campos desabilitados
- Cursor `not-allowed`

### 6.3 Estado de Erro

**Erros de Validação:**
| Erro | Mensagem |
|------|----------|
| Email vazio | "E-mail é obrigatório" |
| Email inválido | "E-mail inválido" |
| Senha vazia | "Senha é obrigatória" |
| Senha curta | "Senha deve ter no mínimo 8 caracteres" |

**Erros de API:**
| Código | Mensagem |
|--------|----------|
| 401 | "E-mail ou senha incorretos" |
| 403 | "Conta desativada. Entre em contato com o suporte." |
| 429 | "Muitas tentativas. Tente novamente em alguns minutos." |
| 500 | "Erro interno. Tente novamente mais tarde." |

**Estilo de Erro:**
```css
.error-message {
  @apply text-red-500 text-sm mt-1;
}

.input-error {
  @apply border-red-500 focus:ring-red-500;
}
```

### 6.4 Estado de Sucesso
- Redirecionamento automático
- Sem feedback visual (transição rápida)

---

## 7. Acessibilidade

| Requisito | Implementação |
|-----------|---------------|
| Labels | Cada input com `<label htmlFor>` vinculado |
| Foco visível | `focus:ring-2 focus:ring-blue-500` |
| Ordem de tab | Email → Senha → Esqueceu senha → Entrar → Criar conta |
| Contraste | Mínimo 4.5:1 para textos |
| Aria | `aria-invalid` em campos com erro |
| Erro anunciado | `role="alert"` em mensagens de erro |

---

## 8. Critérios de Aceitação

### 8.1 Layout
- [ ] Split-screen funcional no desktop
- [ ] Coluna única no mobile
- [ ] Hero com imagem e overlay
- [ ] Badges exibidos corretamente

### 8.2 Formulário
- [ ] Logo iSelfToken no topo
- [ ] Campos de email e senha funcionais
- [ ] Link "Esqueceu a senha?" navegável
- [ ] Botão "Entrar" executa login
- [ ] Botão "Crie sua conta" navega para `/cadastro`

### 8.3 Validação
- [ ] Erros inline exibidos corretamente
- [ ] Validação de email
- [ ] Validação de senha mínima

### 8.4 Integração
- [ ] Login chama API corretamente
- [ ] Redirecionamento para `/auth` sem AF2
- [ ] Redirecionamento para `/home` com AF2
- [ ] Erros de API tratados

---

## 9. Observações Técnicas

1. **Base shadcn:** Usar `login-02` como base e customizar
2. **Contexto de Auth:** Integrar com `AuthContext` para login
3. **Redirect:** Manter URL de retorno se usuário foi redirecionado
4. **Segurança:** Não exibir se email existe ou não (mensagem genérica)
5. **Performance:** Debounce na validação de email

---

## 10. Referências Cruzadas

| Documento | Descrição |
|-----------|-----------|
| [SPEC/04-login.md](../SPEC/04-login.md) | Especificação técnica |
| [style/04-login.md](../style/04-login.md) | Documentação de estilos |
| [style/04-login.jsx](../style/04-login.jsx) | Exemplo de implementação |
| [descritivo/04-login.md](../descritivo/04-login.md) | Descrição funcional original |
| [PRD/03-auth-context.md](./03-auth-context.md) | Contexto de autenticação |
| [PRD/05-cadastro.md](./05-cadastro.md) | Página de cadastro |
| [css_padrão.md](../css_padrão.md) | Design System |
