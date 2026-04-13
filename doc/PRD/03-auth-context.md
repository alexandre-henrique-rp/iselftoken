# PRD — Contexto de Autenticação (03-auth-context)

## 1. Visão Geral

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Centralizar estado de autenticação, controle de tokens, sessão parcial e regras de redirecionamento |
| **Path** | `app/context/AuthContext.tsx` |
| **Tipo** | Private (Context Provider) |
| **Dependências** | React Router v7, jose (JWT), axios |
| **Referência técnica** | Funções de cookies/session do React Router v7 |

---

## 2. Dependências e Documentação Externa

### 2.1 React Router v7 — Cookies
| Função | Documentação |
|--------|--------------|
| `createCookie` | [api.reactrouter.com/v7/functions/react_router.createCookie](https://api.reactrouter.com/v7/functions/react_router.createCookie.html) |
| `isCookie` | [api.reactrouter.com/v7/functions/react_router.isCookie](https://api.reactrouter.com/v7/functions/react_router.isCookie.html) |
| `destroyCookie` | [api.reactrouter.com/v7/functions/react_router.destroyCookie](https://api.reactrouter.com/v7/functions/react_router.destroyCookie.html) |

### 2.2 React Router v7 — Sessions
| Função | Documentação |
|--------|--------------|
| `createSession` | [api.reactrouter.com/v7/functions/react_router.createSession](https://api.reactrouter.com/v7/functions/react_router.createSession.html) |
| `isSession` | [api.reactrouter.com/v7/functions/react_router.isSession](https://api.reactrouter.com/v7/functions/react_router.isSession.html) |
| `destroySession` | [api.reactrouter.com/v7/functions/react_router.destroySession](https://api.reactrouter.com/v7/functions/react_router.destroySession.html) |

### 2.3 Jose (JWT)
- Documentação: [github.com/panva/jose](https://github.com/panva/jose)
- Versão: 6.1.x

---

## 3. Arquitetura do Contexto

### 3.1 Interface do Contexto

```typescript
interface AuthContextType {
  // Estado
  user: UserData | null;
  loading: boolean;
  isAuthenticated: boolean;

  // Métodos
  login: (email: string, senha: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  token: () => Promise<string | null>;
  isAuthAfterLogin: () => string | null;
  refreshSession: () => Promise<boolean>;
}

interface UserData {
  id: number;
  publicId: string;
  email: string;
  nome: string;
  role: 'USER' | 'ADMIN' | 'FOUNDER';
  telefone: string;
  data_nascimento: string;
  genero: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  pais: string;
  tipo_documento: string;
  reg_documento: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  avatar: FileUpload | null;
  comprovante: FileUpload | null;
  documento: FileUpload | null;
  biofacial: FileUpload | null;
  wallet: Wallet | null;
  payments: Payment[];
  subscriptions: Subscription[];
  startups: StartupBasic[];
  investments: Investment[];
  tokens: Token[];
  tokenHistory: TokenHistory[];
  auditLogs: AuditLog[];
}

interface FileUpload {
  id: number;
  url: string;
  url_sm: string;
  url_md: string;
  url_lg: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface Wallet {
  id: number;
  balance: string;
  blocked: string;
  currency: string;
}

interface Subscription {
  id: number;
  status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'EXPIRED';
  startedAt: string;
  expiresAt: string;
  plan?: {
    id: number;
    name: string;
    slug: string;
  };
}

interface LoginResult {
  success: boolean;
  requiresAf2: boolean;
  error?: string;
}
```

---

## 4. Requisitos Funcionais (Ponto a Ponto)

### 4.1 Função `login(email, senha)`

**Fluxo Completo:**

```
┌─────────────────────────────────────────────────────────────────┐
│                         login(email, senha)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Verificar cookie AF2_AUTHENTICATED                          │
│     │                                                            │
│     ├─ NÃO existe:                                               │
│     │   ├─ Gerar código 6 dígitos (generateCode())              │
│     │   ├─ Enviar código por email (sendCodeEmail())            │
│     │   ├─ Chamar API: login(email, senha, codigo)              │
│     │   ├─ Salvar código em localStorage                         │
│     │   └─ Redirecionar → /auth                                  │
│     │                                                            │
│     └─ SIM existe:                                               │
│         └─ Redirecionar → /home                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Processamento da Resposta da API:**

```typescript
// Exemplo de resposta da API de login
interface LoginApiResponse {
  error: boolean;
  message: string;
  codigo: number;
  data: {
    id: number;
    email: string;
    nome: string;
    role: 'USER' | 'ADMIN' | 'FOUNDER';
    isActive: boolean;
    token: string;        // JWT com expiração de 30min
    refreshToken: string; // JWT com expiração de 7 dias
    exp: number;          // timestamp de expiração
  };
}
```

**Separação e Armazenamento:**

| Dado | Armazenamento | Expiração | Criptografia |
|------|---------------|-----------|--------------|
| `token` | Cookie httpOnly | 30 minutos | JWT criptografado |
| `user` | Cookie httpOnly | `exp` do payload | JWT criptografado |
| `refreshToken` | localStorage | 7 dias | Texto simples |

**Funções Auxiliares:**

```typescript
// Gerar código de 6 dígitos
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Verificar se cookie AF2_AUTHENTICATED existe
function hasAf2Cookie(): boolean {
  // Implementar verificação de cookie
}

// Enviar código por email
async function sendCodeEmail(email: string, code: string): Promise<void> {
  // Implementar envio de email
}
```

### 4.2 Função `logout()`

**Ações:**
1. Remover cookie de token
2. Remover cookie de usuário
3. Remover refreshToken do localStorage
4. Redirecionar para `/login`

```typescript
async function logout(): Promise<void> {
  // Destruir cookies
  await destroyCookie('auth_token');
  await destroyCookie('auth_user');

  // Limpar localStorage
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('af2_code');

  // Redirecionar
  navigate('/login');
}
```

### 4.3 Função `isAuthenticated()`

**Lógica:**
```typescript
function isAuthenticated(): boolean {
  // Verifica se o cookie de usuário existe e é válido
  const userCookie = getCookie('auth_user');
  return userCookie !== null && userCookie !== undefined;
}
```

### 4.4 Função `token()`

**Fluxo de Renovação:**

```
┌─────────────────────────────────────────────────────────────────┐
│                            token()                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Verificar cookie auth_token                                  │
│     │                                                            │
│     ├─ EXISTE e válido:                                          │
│     │   └─ Retornar token                                        │
│     │                                                            │
│     └─ NÃO existe ou expirado:                                   │
│         ├─ Verificar cookie AF2_AUTHENTICATED                    │
│         │   │                                                    │
│         │   ├─ EXISTE:                                           │
│         │   │   ├─ Buscar refreshToken do localStorage           │
│         │   │   ├─ Chamar ApiPage.newToken(refreshToken)         │
│         │   │   │   │                                            │
│         │   │   │   ├─ SUCESSO:                                  │
│         │   │   │   │   ├─ Recriar cookie auth_token (30min)     │
│         │   │   │   │   └─ Retornar novo token                   │
│         │   │   │   │                                            │
│         │   │   │   └─ ERRO:                                     │
│         │   │   │       ├─ Remover cookies                       │
│         │   │   │       └─ Redirecionar → /login                 │
│         │   │                                                    │
│         │   └─ NÃO EXISTE:                                       │
│         │       └─ Redirecionar → /login                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Resposta da API de Refresh:**

```json
{
  "error": false,
  "message": "Token renovado com sucesso",
  "codigo": 200,
  "data": {
    "id": 1,
    "email": "email@email.com",
    "nome": "John Doe",
    "role": "USER",
    "isActive": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "exp": 1769433824
  }
}
```

### 4.5 Função `isAuthAfterLogin()`

**Lógica:**
```typescript
function isAuthAfterLogin(): string | null {
  // Verifica se existe o cookie AF2_AUTHENTICATED
  const af2Cookie = getCookie('AF2_AUTHENTICATED');

  if (af2Cookie) {
    // Retorna o refreshToken do localStorage
    return localStorage.getItem('refreshToken');
  }

  return null;
}
```

### 4.6 Função `user()`

**Fluxo:**

```typescript
async function getUser(): Promise<UserData | null> {
  try {
    const response = await UserApi.me();
    const userData = response.data;

    // Validar role
    if (userData.role !== 'USER') {
      // Tratamento específico para outros roles
    }

    // Verificar se tem plano
    const hasPlan = validateExistePlan(userData);
    if (!hasPlan) {
      navigate('/planos');
      return null;
    }

    return userData;
  } catch (error) {
    logout();
    return null;
  }
}
```

**Exemplo de Resposta Completa da API:**

```json
{
  "error": false,
  "message": "Usuário encontrado com sucesso",
  "codigo": 200,
  "data": {
    "id": 1,
    "publicId": "2b1d5a1f-2c2f-4c8a-8e6f-1a2b3c4d5e6f",
    "email": "email@dominio.com",
    "nome": "Nome do Usuário",
    "role": "USER",
    "telefone": "+55 11 99999-9999",
    "data_nascimento": "1990-01-01T00:00:00.000Z",
    "genero": "MASCULINO",
    "endereco": "Rua Exemplo",
    "numero": "100",
    "complemento": "Apto 12",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "uf": "SP",
    "cep": "01000-000",
    "pais": "Brasil",
    "tipo_documento": "RG",
    "reg_documento": "123456789",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "avatar": {
      "id": 1,
      "url": "arquivo.pdf",
      "url_sm": "arquivo_sm.pdf",
      "url_md": "arquivo_md.pdf",
      "url_lg": "arquivo_lg.pdf",
      "status": "PENDING"
    },
    "wallet": {
      "id": 1,
      "balance": "1000.00",
      "blocked": "0.00",
      "currency": "BRL"
    },
    "subscriptions": [
      {
        "id": 1,
        "status": "ACTIVE",
        "startedAt": "2024-01-01T00:00:00.000Z",
        "expiresAt": "2025-01-01T00:00:00.000Z",
        "plan": {
          "id": 1,
          "name": "Investidor",
          "slug": "investidor"
        }
      }
    ],
    "startups": [],
    "investments": [],
    "tokens": []
  }
}
```

### 4.7 Estado `loading`

```typescript
const [loading, setLoading] = useState<boolean>(true);

// Durante inicialização
useEffect(() => {
  async function initAuth() {
    setLoading(true);
    try {
      await checkSession();
    } finally {
      setLoading(false);
    }
  }
  initAuth();
}, []);
```

---

## 5. Requisitos de Segurança

### 5.1 Tokens e Expiração

| Token | Expiração | Armazenamento | Renovação |
|-------|-----------|---------------|-----------|
| Access Token | 30 minutos | Cookie httpOnly | Via refresh token |
| Refresh Token | 7 dias | localStorage | Login novamente |
| AF2 Code | 5 minutos | localStorage | Reenviar código |

### 5.2 Cookies

```typescript
// Configuração do cookie de token
const tokenCookie = createCookie('auth_token', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 30 * 60, // 30 minutos
  path: '/',
});

// Configuração do cookie de usuário
const userCookie = createCookie('auth_user', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
});
```

### 5.3 Criptografia JWT

```typescript
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

// Criptografar
async function encryptPayload(payload: object): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30m')
    .sign(secret);
}

// Descriptografar
async function decryptPayload(token: string): Promise<object> {
  const { payload } = await jwtVerify(token, secret);
  return payload;
}
```

---

## 6. Fluxos de Redirecionamento

### 6.1 Mapa de Redirecionamentos

| Condição | Origem | Destino |
|----------|--------|---------|
| Login sem AF2 | `/login` | `/auth` |
| Login com AF2 | `/login` | `/home` |
| AF2 válido | `/auth` | `/home` |
| AF2 inválido | `/auth` | `/auth` (retry) |
| Logout | Qualquer | `/login` |
| Sem plano | `/home` | `/planos` |
| Token expirado | Qualquer privada | `/login` |
| Refresh falhou | Qualquer privada | `/login` |

### 6.2 Proteção de Rotas

```typescript
// Wrapper para rotas privadas
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

---

## 7. Funções Auxiliares de Validação

### 7.1 Validar Existência de Plano

```typescript
function validateExistePlan(user: UserData): boolean {
  const subscriptionsWithPlan = user.subscriptions?.filter((sub) => {
    return sub.plan !== null && sub.plan !== undefined;
  });

  return subscriptionsWithPlan && subscriptionsWithPlan.length > 0;
}
```

### 7.2 Validar Plano Fundador

```typescript
function validateFundadorPlan(user: UserData): boolean {
  const fundadorSubscriptions = user.subscriptions?.filter((sub) =>
    sub.plan?.slug?.toLowerCase().includes('fundador')
  );

  if (!fundadorSubscriptions || fundadorSubscriptions.length === 0) {
    return false;
  }

  for (const subscription of fundadorSubscriptions) {
    const isExpired = new Date(subscription.expiresAt) < new Date();

    if (subscription.status === 'ACTIVE' && !isExpired) {
      return true;
    }
  }

  return false;
}
```

---

## 8. Critérios de Aceitação

### 8.1 Login
- [ ] Login sem AF2 gera código e redireciona para `/auth`
- [ ] Login com AF2 redireciona para `/home`
- [ ] Token salvo em cookie criptografado
- [ ] Refresh token salvo em localStorage
- [ ] Código AF2 salvo em localStorage

### 8.2 Logout
- [ ] Cookies removidos
- [ ] localStorage limpo
- [ ] Redirecionamento para `/login`

### 8.3 Token
- [ ] Token válido retornado diretamente
- [ ] Token expirado tenta renovar via refresh
- [ ] Refresh falho faz logout

### 8.4 Sessão
- [ ] Loading true durante verificação inicial
- [ ] Loading false após sessão estabilizar
- [ ] Usuário sem plano redirecionado para `/planos`

---

## 9. Observações Técnicas

1. **React Router v7:** Usar funções nativas para cookies/sessions
2. **jose:** Usar para criptografia/descriptografia JWT
3. **Refresh Token:** Nunca armazenar em cookie (somente localStorage)
4. **Segurança:** httpOnly e secure em produção
5. **Logs:** Registrar eventos de autenticação para auditoria

---

## 10. Referências Cruzadas

| Documento | Descrição |
|-----------|-----------|
| [SPEC/03-auth-context.md](../SPEC/03-auth-context.md) | Especificação técnica |
| [descritivo/03-contexto_de_Auth.md](../descritivo/03-contexto_de_Auth.md) | Descrição funcional original |
| [PRD/04-login.md](./04-login.md) | Página de login |
| [PRD/06-auth-af2.md](./06-auth-af2.md) | Autenticação 2FA |
| [PRD/15-special-functions.md](./15-special-functions.md) | Funções especiais |
| [documentacao_externa.md](../documentacao_externa.md) | Links de documentação |
