# PRD — Autenticação 2FA (06-auth-af2)

## 1. Visão Geral

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Validar código 2FA enviado ao usuário por email |
| **Rota** | `/auth` |
| **Path** | `app/routes/public/auth/af2/index.tsx` |
| **Componentes únicos** | `app/routes/public/auth/af2/components/index.tsx` |
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
```

### 2.2 Componentes Customizados
- `AuthLayoutPremium` — layout split-screen
- `CodeInput` — input segmentado para 6 dígitos
- `CountdownTimer` — timer de expiração

---

## 3. Requisitos Funcionais (Ponto a Ponto)

### 3.1 Layout Split-Screen

| Coluna | Largura | Conteúdo |
|--------|---------|----------|
| Esquerda | 50% | Verificação de código |
| Direita | 50% | Imagem hero com overlay |

### 3.2 Coluna Esquerda — Verificação

**Header:**
| Elemento | Especificação |
|----------|---------------|
| Logo | "iSelfToken" em `#d500f9` |
| Título | "Verificação em dois fatores" — `text-2xl font-semibold` |
| Subtítulo | "Digite o código de 6 dígitos enviado para seu email" — `text-stone-400` |

**Indicador de Email:**
```jsx
<p className="text-stone-400 text-sm">
  Código enviado para <span className="text-stone-50 font-medium">{maskedEmail}</span>
</p>
```

### 3.3 Input de Código (6 Dígitos)

**Estrutura:**

```typescript
interface CodeInputProps {
  length: number;           // 6
  value: string;
  onChange: (code: string) => void;
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
}
```

**Comportamentos:**
| Ação | Comportamento |
|------|---------------|
| Digitar número | Preenche campo atual, foca no próximo |
| Backspace | Limpa campo atual, foca no anterior |
| Colar código | Preenche todos os campos automaticamente |
| Tab | Navega entre campos |
| Foco | Primeiro campo vazio ou último preenchido |

**Estilos:**
```css
.code-input {
  @apply w-12 h-14 text-center text-2xl font-bold;
  @apply bg-stone-900 border-2 border-stone-700 rounded-lg;
  @apply focus:border-blue-500 focus:ring-2 focus:ring-blue-500;
  @apply text-stone-50;
}

.code-input-error {
  @apply border-red-500 focus:border-red-500 focus:ring-red-500;
}
```

### 3.4 Timer de Expiração

**Componente:**

```typescript
interface CountdownTimerProps {
  initialSeconds: number;    // 300 (5 minutos)
  onExpire: () => void;
  onTick?: (seconds: number) => void;
}
```

**Visual:**
```jsx
<div className="flex items-center gap-2 text-sm">
  <Clock className="w-4 h-4 text-stone-400" />
  <span className={isExpiring ? 'text-red-500' : 'text-stone-400'}>
    Código expira em {formatTime(seconds)}
  </span>
</div>
```

**Estados do Timer:**
| Tempo Restante | Cor | Comportamento |
|----------------|-----|---------------|
| > 60 segundos | `text-stone-400` | Normal |
| ≤ 60 segundos | `text-amber-500` | Alerta |
| ≤ 30 segundos | `text-red-500` | Crítico, pulsar |
| 0 segundos | — | Expirado, habilitar reenvio |

### 3.5 Botões de Ação

| Botão | Estado | Estilo | Ação |
|-------|--------|--------|------|
| Verificar código | Desabilitado (< 6 dígitos) | `bg-stone-700` | — |
| Verificar código | Habilitado (6 dígitos) | `bg-blue-600` | Validar código |
| Reenviar código | Desabilitado (timer ativo) | `text-stone-500` | — |
| Reenviar código | Habilitado (timer expirado) | `text-blue-500` | Reenviar email |
| Voltar | Sempre visível | `text-stone-400` | Retornar ao login |

---

## 4. Fluxo de Verificação

### 4.1 Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────────┐
│                     Fluxo de Verificação 2FA                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Usuário acessa /auth (vindo do login/cadastro)              │
│  2. Recuperar código salvo no localStorage                       │
│  3. Exibir formulário com timer                                  │
│  4. Usuário digita os 6 dígitos                                  │
│  5. Clica em "Verificar código" (ou auto-submit)                 │
│     │                                                            │
│     ├─ CÓDIGO CORRETO:                                           │
│     │   ├─ Criar cookie AF2_AUTHENTICATED                        │
│     │   ├─ Salvar tokens                                         │
│     │   └─ Redirecionar → /home                                  │
│     │                                                            │
│     ├─ CÓDIGO INCORRETO:                                         │
│     │   ├─ Exibir erro "Código inválido"                         │
│     │   ├─ Limpar campos                                         │
│     │   └─ Permitir nova tentativa                               │
│     │                                                            │
│     └─ CÓDIGO EXPIRADO:                                          │
│         ├─ Exibir erro "Código expirado"                         │
│         └─ Habilitar "Reenviar código"                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Validação do Código

```typescript
async function verifyCode(code: string): Promise<boolean> {
  const savedCode = localStorage.getItem('af2_code');

  if (!savedCode) {
    throw new Error('Código não encontrado');
  }

  if (code === savedCode) {
    // Criar cookie AF2_AUTHENTICATED
    await createAf2Cookie();
    // Limpar código do localStorage
    localStorage.removeItem('af2_code');
    return true;
  }

  return false;
}
```

### 4.3 Reenvio de Código

```typescript
async function resendCode(): Promise<void> {
  // Gerar novo código
  const newCode = generateCode();

  // Salvar no localStorage
  localStorage.setItem('af2_code', newCode);

  // Enviar por email
  await sendCodeEmail(userEmail, newCode);

  // Reiniciar timer
  resetTimer(300); // 5 minutos
}
```

---

## 5. Requisitos de UI/UX

### 5.1 Tema e Cores

| Elemento | Classe Tailwind |
|----------|-----------------|
| Background | `bg-stone-950` |
| Input normal | `border-stone-700` |
| Input focus | `border-blue-500` |
| Input erro | `border-red-500` |
| Timer normal | `text-stone-400` |
| Timer alerta | `text-amber-500` |
| Timer crítico | `text-red-500` |
| Botão ativo | `bg-blue-600` |
| Botão inativo | `bg-stone-700` |

### 5.2 Animações

**Shake (Erro):**
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.shake {
  animation: shake 0.3s ease-in-out;
}
```

**Pulsar (Timer Crítico):**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.pulse {
  animation: pulse 1s ease-in-out infinite;
}
```

---

## 6. Estados e Feedbacks

### 6.1 Estado Inicial
- 6 campos vazios
- Timer contando (5 minutos)
- Botão "Verificar" desabilitado
- Botão "Reenviar" desabilitado

### 6.2 Estado Digitando
- Campos preenchidos sequencialmente
- Foco automático no próximo campo
- Botão "Verificar" habilita com 6 dígitos

### 6.3 Estado Loading
- Spinner no botão "Verificar"
- Campos desabilitados
- Timer pausado

### 6.4 Estado Erro

| Erro | Mensagem | Ação |
|------|----------|------|
| Código inválido | "Código incorreto. Tente novamente." | Limpar campos, shake animation |
| Código expirado | "Código expirado. Solicite um novo." | Habilitar reenvio |
| Muitas tentativas | "Muitas tentativas. Aguarde 5 minutos." | Bloquear temporariamente |

### 6.5 Estado Sucesso
- Checkmark verde
- Mensagem: "Verificação concluída!"
- Redirecionamento automático para `/home`

---

## 7. Acessibilidade

| Requisito | Implementação |
|-----------|---------------|
| Labels | `aria-label="Dígito X do código"` para cada campo |
| Foco | Auto-focus no primeiro campo ao carregar |
| Teclado | Navegação completa por teclado |
| Colar | Suporte a colar código completo |
| Anúncio | `aria-live` para timer e erros |
| Contraste | Mínimo 4.5:1 |

---

## 8. Critérios de Aceitação

### 8.1 Input de Código
- [ ] 6 campos individuais para dígitos
- [ ] Auto-focus no próximo campo ao digitar
- [ ] Backspace volta para campo anterior
- [ ] Colar código preenche todos os campos
- [ ] Apenas números aceitos

### 8.2 Timer
- [ ] Contador regressivo de 5 minutos
- [ ] Mudança de cor em < 60 segundos
- [ ] Pulsar em < 30 segundos
- [ ] Habilita reenvio ao expirar

### 8.3 Verificação
- [ ] Botão desabilitado até 6 dígitos
- [ ] Código correto redireciona para `/home`
- [ ] Código incorreto exibe erro e limpa campos
- [ ] Cria cookie AF2_AUTHENTICATED no sucesso

### 8.4 Reenvio
- [ ] Desabilitado enquanto timer ativo
- [ ] Gera novo código ao clicar
- [ ] Reinicia timer após reenvio

---

## 9. Observações Técnicas

1. **localStorage:** Código AF2 salvo no login/cadastro
2. **Cookie AF2:** Criado após verificação bem-sucedida
3. **Expiração:** Código válido por 5 minutos
4. **Rate limit:** Máximo 3 tentativas por código
5. **Reenvio:** Máximo 3 reenvios por sessão

---

## 10. Referências Cruzadas

| Documento | Descrição |
|-----------|-----------|
| [SPEC/06-auth-af2.md](../SPEC/06-auth-af2.md) | Especificação técnica |
| [style/06-auth_af2.md](../style/06-auth_af2.md) | Documentação de estilos |
| [style/06-auth_af2.jsx](../style/06-auth_af2.jsx) | Exemplo de implementação |
| [descritivo/06-auth_af2.md](../descritivo/06-auth_af2.md) | Descrição funcional original |
| [PRD/03-auth-context.md](./03-auth-context.md) | Contexto de autenticação |
| [PRD/04-login.md](./04-login.md) | Página de login |
| [PRD/05-cadastro.md](./05-cadastro.md) | Página de cadastro |
