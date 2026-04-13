# PRD — Página de Cadastro (05-cadastro)

## 1. Visão Geral

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Registrar novos usuários com validações robustas |
| **Rota** | `/cadastro` |
| **Path** | `app/routes/public/auth/cadastro/index.tsx` |
| **Componentes únicos** | `app/routes/public/auth/cadastro/components/index.tsx` |
| **API** | `ApiPage.register()` |
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
npx shadcn@latest add checkbox
```

### 2.2 Componentes Customizados
- `AuthLayoutPremium` — layout split-screen
- `RegisterForm` — formulário de cadastro
- `PasswordStrength` — indicador de força da senha
- `PhoneInput` — input com máscara de telefone

---

## 3. Requisitos Funcionais (Ponto a Ponto)

### 3.1 Layout Split-Screen

| Coluna | Largura | Conteúdo |
|--------|---------|----------|
| Esquerda | 50% | Formulário de cadastro |
| Direita | 50% | Imagem hero com overlay |

**Responsivo:** Igual ao login (1 coluna no mobile)

### 3.2 Coluna Esquerda — Formulário

**Header:**
| Elemento | Especificação |
|----------|---------------|
| Logo | "iSelfToken" em `#d500f9` |
| Título | "Criar conta" — `text-2xl font-semibold` |
| Subtítulo | "Preencha seus dados para começar" — `text-stone-400` |

**Campos do Formulário:**

```typescript
interface RegisterFormData {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  confirmarSenha: string;
  termosAceitos: boolean;
  politicaAceita: boolean;
}
```

| Campo | Tipo | Placeholder | Obrigatório |
|-------|------|-------------|-------------|
| Nome completo | `text` | "Seu nome completo" | Sim |
| E-mail | `email` | "seu@email.com" | Sim |
| Telefone | `tel` | "55 11 9 9999-9999" | Sim |
| Senha | `password` | "••••••••••••" | Sim |
| Confirmar senha | `password` | "••••••••••••" | Sim |
| Termos de Uso | `checkbox` | — | Sim |
| Política de Privacidade | `checkbox` | — | Sim |

### 3.3 Validações Obrigatórias

#### Validação de Senha

```typescript
const senhaValidation = {
  minLength: 12,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecial: /[!@#$%^&*(),.?":{}|<>]/
};

interface PasswordRequirement {
  id: string;
  label: string;
  regex: RegExp;
  met: boolean;
}

const requirements: PasswordRequirement[] = [
  { id: 'length', label: 'Mínimo 12 caracteres', regex: /.{12,}/, met: false },
  { id: 'upper', label: '1 letra maiúscula', regex: /[A-Z]/, met: false },
  { id: 'lower', label: '1 letra minúscula', regex: /[a-z]/, met: false },
  { id: 'number', label: '1 número', regex: /[0-9]/, met: false },
  { id: 'special', label: '1 caractere especial', regex: /[!@#$%^&*(),.?":{}|<>]/, met: false }
];
```

#### Validação de Email

```typescript
const emailValidation = {
  pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  transform: (value: string) => value.toLowerCase().trim()
};
```

#### Validação de Telefone

```typescript
const telefoneValidation = {
  // Formato: DDI DDD 9 XXXX-XXXX ou DDI DDD XXXX-XXXX
  pattern: /^\d{2}\s\d{2}\s9?\s?\d{4}-?\d{4}$/,
  mask: '99 99 9 9999-9999',
  examples: ['55 11 9 9999-9999', '55 11 99999-9999']
};
```

### 3.4 Indicador de Força da Senha

**Componente PasswordStrength:**

```typescript
interface PasswordStrengthProps {
  password: string;
  requirements: PasswordRequirement[];
}
```

**Visual:**
| Requisito Cumprido | Ícone | Cor |
|-------------------|-------|-----|
| Sim | Check | `text-green-500` |
| Não | X | `text-stone-500` |

**Layout:**
```jsx
<div className="mt-2 space-y-1">
  {requirements.map((req) => (
    <div key={req.id} className="flex items-center gap-2 text-sm">
      {req.met ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <X className="w-4 h-4 text-stone-500" />
      )}
      <span className={req.met ? 'text-green-500' : 'text-stone-500'}>
        {req.label}
      </span>
    </div>
  ))}
</div>
```

### 3.5 Coluna Direita — Hero

Igual ao login:
- Imagem com overlay
- Título e subtítulo de valor
- Badges inferiores

---

## 4. Fluxo de Cadastro

### 4.1 Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────────┐
│                     Fluxo de Cadastro                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Usuário preenche todos os campos                            │
│  2. Validação em tempo real                                      │
│  3. Aceita termos e política                                     │
│  4. Clica em "Criar conta"                                       │
│  5. Validação final frontend                                     │
│     │                                                            │
│     ├─ INVÁLIDO: Exibir erros inline                             │
│     │                                                            │
│     └─ VÁLIDO: Gerar código AF2 + Chamar API                     │
│         │                                                        │
│         ├─ ERRO API: Exibir mensagem de erro                     │
│         │   - Email já cadastrado                                │
│         │   - Erro de validação                                  │
│         │                                                        │
│         └─ SUCESSO: Redirecionar → /auth                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Chamada da API

```typescript
// Request
interface RegisterRequest {
  email: string;
  nome: string;
  senha: string;
  senhaConfirmacao: string;
  telefone: string;
  termosAceitos: boolean;
  politicaAceita: boolean;
  codigo: string; // Código AF2 gerado no frontend
}

// Response
interface RegisterResponse {
  error: boolean;
  message: string;
  codigo: number;
  data: {
    id: number;
    email: string;
    nome: string;
    role: 'USER';
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
| Background | `bg-stone-950` |
| Input background | `bg-stone-900` |
| Input border | `border-stone-700` |
| Botão primário | `bg-blue-600` |
| Checkbox checked | `bg-blue-600` |
| Sucesso | `text-green-500` |
| Erro | `text-red-500` |

### 5.2 Checkbox Customizado

```css
.checkbox-custom {
  @apply w-5 h-5 rounded border-stone-600;
  @apply checked:bg-blue-600 checked:border-blue-600;
  @apply focus:ring-2 focus:ring-blue-500;
}
```

---

## 6. Estados e Feedbacks

### 6.1 Validação em Tempo Real
- Email: validação após blur
- Senha: requisitos atualizados a cada digitação
- Confirmar senha: comparação após blur
- Telefone: máscara aplicada durante digitação

### 6.2 Erros de Validação

| Campo | Erro | Mensagem |
|-------|------|----------|
| Nome | Vazio | "Nome é obrigatório" |
| Nome | Curto | "Nome deve ter no mínimo 3 caracteres" |
| Email | Vazio | "E-mail é obrigatório" |
| Email | Inválido | "E-mail inválido" |
| Telefone | Vazio | "Telefone é obrigatório" |
| Telefone | Inválido | "Telefone inválido" |
| Senha | Requisitos | "Senha não atende aos requisitos" |
| Confirmar | Diferente | "Senhas não conferem" |
| Termos | Não aceito | "Você deve aceitar os termos" |
| Política | Não aceita | "Você deve aceitar a política" |

### 6.3 Erros de API

| Código | Mensagem |
|--------|----------|
| 409 | "E-mail já cadastrado" |
| 422 | "Dados inválidos" |
| 500 | "Erro interno. Tente novamente." |

### 6.4 Sucesso
- Toast: "Conta criada com sucesso!"
- Redirecionamento para `/auth` (verificação 2FA)

---

## 7. Acessibilidade

| Requisito | Implementação |
|-----------|---------------|
| Labels | Todos os inputs com labels vinculados |
| Foco | `focus:ring-2 focus:ring-blue-500` |
| Ordem tab | Nome → Email → Telefone → Senha → Confirmar → Termos → Política → Criar |
| Checkboxes | Labels clicáveis |
| Erros | `aria-invalid` e `aria-describedby` |

---

## 8. Critérios de Aceitação

### 8.1 Layout
- [ ] Split-screen no desktop
- [ ] Formulário scrollável se necessário
- [ ] Hero com imagem e overlay

### 8.2 Validações
- [ ] Nome: mínimo 3 caracteres
- [ ] Email: formato válido, convertido para lowercase
- [ ] Telefone: máscara aplicada (55 11 9 9999-9999)
- [ ] Senha: todos os 5 requisitos
- [ ] Confirmar senha: igual à senha
- [ ] Checkboxes: ambos obrigatórios

### 8.3 Indicador de Senha
- [ ] Atualiza em tempo real
- [ ] Check verde para requisitos cumpridos
- [ ] X cinza para requisitos pendentes

### 8.4 Integração
- [ ] Gera código AF2 antes de chamar API
- [ ] Cadastro chama API corretamente
- [ ] Redireciona para `/auth` após sucesso
- [ ] Erros de API tratados

---

## 9. Observações Técnicas

1. **Email lowercase:** Transformar email para minúsculas antes de enviar
2. **Máscara telefone:** Usar biblioteca como `react-input-mask`
3. **Código AF2:** Gerar no frontend e salvar em localStorage
4. **Termos:** Links abrem em nova aba
5. **Scroll:** Formulário pode ser longo, garantir scroll suave

---

## 10. Referências Cruzadas

| Documento | Descrição |
|-----------|-----------|
| [SPEC/05-cadastro.md](../SPEC/05-cadastro.md) | Especificação técnica |
| [style/05-cadastro.md](../style/05-cadastro.md) | Documentação de estilos |
| [style/05-cadastro.jsx](../style/05-cadastro.jsx) | Exemplo de implementação |
| [descritivo/05-cadastro.md](../descritivo/05-cadastro.md) | Descrição funcional original |
| [PRD/03-auth-context.md](./03-auth-context.md) | Contexto de autenticação |
| [PRD/04-login.md](./04-login.md) | Página de login |
| [PRD/06-auth-af2.md](./06-auth-af2.md) | Verificação 2FA |
