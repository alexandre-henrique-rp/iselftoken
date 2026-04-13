# PRD — Layout Privado (07-layout)

## 1. Visão Geral

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Fornecer layout padrão com sidebar e breadcrumb para áreas privadas |
| **Path** | `app/routes/layout/index.tsx` |
| **Componentes únicos** | `app/routes/layout/components/index.tsx` |
| **Tipo** | Private (Layout Wrapper) |
| **Design System** | Tailwind CSS v4 + shadcn/ui (tema stone) |
| **Base shadcn** | `npx shadcn@latest add sidebar-07` |

---

## 2. Dependências e Componentes

### 2.1 Componentes shadcn/ui
```bash
npx shadcn@latest add sidebar-07
npx shadcn@latest add breadcrumb
npx shadcn@latest add avatar
npx shadcn@latest add dropdown-menu
npx shadcn@latest add separator
npx shadcn@latest add tooltip
```

### 2.2 Componentes Customizados
- `Sidebar` — menu lateral colapsável
- `SidebarHeader` — logo e seletor de workspace
- `SidebarNav` — navegação principal
- `SidebarFooter` — informações do usuário
- `Breadcrumb` — navegação em trilha
- `PageHeader` — cabeçalho de página com título

---

## 3. Requisitos Funcionais (Ponto a Ponto)

### 3.1 Estrutura do Layout

```
┌────────────────────────────────────────────────────────────────┐
│                           LAYOUT                                │
├──────────┬─────────────────────────────────────────────────────┤
│          │  [Breadcrumb]                                        │
│          ├─────────────────────────────────────────────────────┤
│  SIDEBAR │                                                      │
│          │                                                      │
│  - Logo  │                    CONTEÚDO                          │
│  - Menu  │                   (Outlet)                           │
│  - User  │                                                      │
│          │                                                      │
│          │                                                      │
├──────────┴─────────────────────────────────────────────────────┤
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Sidebar Fixa

**Dimensões:**
| Estado | Largura | Comportamento |
|--------|---------|---------------|
| Expandida | 280px | Ícones + texto |
| Colapsada | 80px | Apenas ícones |
| Mobile | 100% (overlay) | Drawer lateral |

**Estrutura da Sidebar:**

```typescript
interface SidebarConfig {
  header: {
    logo: string;
    title: string;
    workspaceSelector?: boolean;
  };
  navigation: SidebarSection[];
  footer: {
    user: UserInfo;
  };
}

interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

interface SidebarItem {
  name: string;
  icon: string;         // Nome do ícone Lucide
  path: string;
  authorization?: string[]; // Roles permitidos
  badge?: {
    text: string;
    variant: 'default' | 'success' | 'warning' | 'error';
  };
  submenu?: SidebarItem[];
}
```

### 3.3 Header da Sidebar

**Componentes:**
| Elemento | Descrição |
|----------|-----------|
| Logo | "iSelfToken" em `#d500f9` |
| Seletor de Workspace | Dropdown com workspaces/empresas do usuário |
| Botão Colapsar | Ícone de seta, alterna estado |

**Seletor de Workspace:**
```typescript
interface Workspace {
  id: string;
  name: string;
  logo?: string;
  role: 'owner' | 'admin' | 'member';
}
```

### 3.4 Navegação (Menu)

**Estrutura de Links (JSON):**

```json
{
  "navigation": [
    {
      "title": "Principal",
      "items": [
        {
          "name": "Home",
          "icon": "Home",
          "path": "/home",
          "authorization": ["USER", "ADMIN", "FOUNDER"]
        },
        {
          "name": "Investimentos",
          "icon": "TrendingUp",
          "path": "/investments",
          "authorization": ["USER", "ADMIN"]
        },
        {
          "name": "Meus Tokens",
          "icon": "Coins",
          "path": "/tokens",
          "authorization": ["USER", "ADMIN"]
        }
      ]
    },
    {
      "title": "Fundador",
      "items": [
        {
          "name": "Minhas Startups",
          "icon": "Building2",
          "path": "/dashboard/startups",
          "authorization": ["FOUNDER", "ADMIN"]
        },
        {
          "name": "Captações",
          "icon": "Target",
          "path": "/dashboard/campaigns",
          "authorization": ["FOUNDER", "ADMIN"]
        }
      ]
    },
    {
      "title": "Configurações",
      "items": [
        {
          "name": "Perfil",
          "icon": "User",
          "path": "/profile",
          "authorization": ["USER", "ADMIN", "FOUNDER"]
        },
        {
          "name": "Planos",
          "icon": "CreditCard",
          "path": "/plans",
          "authorization": ["USER", "ADMIN", "FOUNDER"]
        },
        {
          "name": "Notificações",
          "icon": "Bell",
          "path": "/notifications",
          "authorization": ["USER", "ADMIN", "FOUNDER"]
        }
      ]
    }
  ]
}
```

**Estados dos Links:**
| Estado | Estilo |
|--------|--------|
| Normal | `text-stone-400 hover:text-stone-50 hover:bg-stone-800` |
| Ativo | `text-stone-50 bg-stone-800` |
| Desabilitado | `text-stone-600 cursor-not-allowed` |

### 3.5 Submenu

**Comportamento:**
- Clique no item pai expande/colapsa
- Ícone de seta indica expansível
- Itens filhos com indentação

```jsx
<div className="pl-8">
  {submenu.map((item) => (
    <SidebarSubItem key={item.path} item={item} />
  ))}
</div>
```

### 3.6 Rodapé da Sidebar

**Componentes:**
| Elemento | Descrição |
|----------|-----------|
| Avatar | Imagem ou iniciais do usuário |
| Nome | Nome completo |
| Email | Email do usuário |
| Menu | Dropdown com opções |

**Opções do Menu:**
| Opção | Ícone | Ação |
|-------|-------|------|
| Meu Perfil | User | → `/profile` |
| Configurações | Settings | → `/settings` |
| Sair | LogOut | Logout |

### 3.7 Breadcrumb

**Estrutura:**

```typescript
interface BreadcrumbItem {
  label: string;
  path?: string;  // undefined = item atual (não clicável)
}

// Mapeamento automático
const routeMap: Record<string, string> = {
  '/home': 'Home',
  '/profile': 'Perfil',
  '/dashboard': 'Dashboard',
  '/dashboard/startups': 'Minhas Startups',
  '/dashboard/startups/create': 'Nova Startup',
  '/startup': 'Startup',
  // ...
};
```

**Visual:**
```jsx
<nav className="flex items-center gap-2 text-sm text-stone-400">
  {items.map((item, index) => (
    <React.Fragment key={item.path || index}>
      {index > 0 && <ChevronRight className="w-4 h-4" />}
      {item.path ? (
        <Link to={item.path} className="hover:text-stone-50">
          {item.label}
        </Link>
      ) : (
        <span className="text-stone-50">{item.label}</span>
      )}
    </React.Fragment>
  ))}
</nav>
```

**Regras:**
- Último item não é clicável
- Separador visual entre níveis (> ou /)
- Mapeamento automático baseado na rota

---

## 4. Requisitos de UI/UX

### 4.1 Tema e Cores

| Elemento | Classe Tailwind |
|----------|-----------------|
| Sidebar background | `bg-stone-900` |
| Sidebar border | `border-r border-stone-800` |
| Content background | `bg-stone-950` |
| Link hover | `bg-stone-800` |
| Link ativo | `bg-stone-800 text-stone-50` |
| Separador | `bg-stone-800` |

### 4.2 Responsivo

| Breakpoint | Sidebar | Comportamento |
|------------|---------|---------------|
| Desktop (> 1024px) | Fixa, expandida | Sempre visível |
| Tablet (768-1024px) | Fixa, colapsada | Ícones apenas |
| Mobile (< 768px) | Drawer | Overlay, botão hamburger |

### 4.3 Transições

```css
.sidebar {
  @apply transition-all duration-300 ease-in-out;
}

.sidebar-collapsed {
  @apply w-20;
}

.sidebar-expanded {
  @apply w-72;
}
```

---

## 5. Proteção de Rotas

### 5.1 Verificação de Autenticação

```typescript
// Layout verifica autenticação
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);

  if (!user) {
    return redirect('/login');
  }

  // Verificar plano
  if (!validateExistePlan(user)) {
    return redirect('/plans');
  }

  return json({ user });
}
```

### 5.2 Autorização de Menu

```typescript
function filterByAuthorization(
  items: SidebarItem[],
  userRole: string
): SidebarItem[] {
  return items.filter((item) => {
    if (!item.authorization) return true;
    return item.authorization.includes(userRole);
  });
}
```

---

## 6. Estados e Feedbacks

### 6.1 Loading
- Skeleton para sidebar durante carregamento
- Spinner no conteúdo principal

### 6.2 Colapso
- Animação suave de 300ms
- Tooltip nos ícones quando colapsado

### 6.3 Mobile
- Overlay escuro atrás do drawer
- Swipe para fechar
- Botão X para fechar

---

## 7. Acessibilidade

| Requisito | Implementação |
|-----------|---------------|
| Navegação | Teclas de seta para navegar menu |
| Foco | `focus:ring-2 focus:ring-blue-500` |
| Skip link | "Pular para conteúdo principal" |
| Landmarks | `nav`, `main`, `aside` |
| Aria | `aria-current="page"` no item ativo |
| Colapso | `aria-expanded` no botão |

---

## 8. Critérios de Aceitação

### 8.1 Sidebar
- [ ] Logo iSelfToken visível
- [ ] Seletor de workspace funcional
- [ ] Botão de colapso funciona
- [ ] Menu renderiza baseado em JSON
- [ ] Item ativo destacado

### 8.2 Navegação
- [ ] Links navegam corretamente
- [ ] Submenus expandem/colapsam
- [ ] Autorização filtra itens por role
- [ ] Badges exibidos quando configurados

### 8.3 Breadcrumb
- [ ] Mapeamento automático de rotas
- [ ] Links navegáveis exceto último
- [ ] Separadores visuais

### 8.4 Responsivo
- [ ] Desktop: sidebar expandida
- [ ] Tablet: sidebar colapsada
- [ ] Mobile: drawer com hamburger

### 8.5 Footer
- [ ] Avatar do usuário
- [ ] Nome e email
- [ ] Menu dropdown funcional
- [ ] Logout funciona

---

## 9. Observações Técnicas

1. **Base shadcn:** Usar `sidebar-07` como base
2. **Context:** Criar `SidebarContext` para gerenciar estado
3. **Persistência:** Salvar estado de colapso no localStorage
4. **Performance:** Lazy loading para ícones
5. **Auth:** Integrar com `AuthContext` para dados do usuário

---

## 10. Referências Cruzadas

| Documento | Descrição |
|-----------|-----------|
| [SPEC/07-layout.md](../SPEC/07-layout.md) | Especificação técnica |
| [descritivo/07-layout.md](../descritivo/07-layout.md) | Descrição funcional original |
| [PRD/03-auth-context.md](./03-auth-context.md) | Contexto de autenticação |
| [PRD/08-home.md](./08-home.md) | Home privada |
| [css_padrão.md](../css_padrão.md) | Design System |
