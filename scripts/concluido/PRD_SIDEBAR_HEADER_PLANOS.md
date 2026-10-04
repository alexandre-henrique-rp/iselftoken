# PRD — Ajuste de Layout Dashboard (Sidebar + Header) por Plano

**Data:** 15/08/2026  
**Autor:** Agente IA  
**Status:** Rascunho  
**Prioridade:** Alta  
**Módulo:** Frontend — Layout (Sidebar + TopNavbar)

---

## 1. Contexto e Motivação

Atualmente a Sidebar determina os itens de menu com base em uma lógica que mapeia `planId` da subscription ativa para uma "role local" (`INVESTOR`, `AFILIADO`, `FOUNDER`, etc.). O Header exibe um texto estático baseado no `user.role` do banco ("Usuario", "Administrador", etc.), sem refletir o plano real.

**Problemas identificados:**

1. O **INVESTOR (planId=2)** vê os itens "Afiliação" e "Financeiro Afiliado" — que deveriam ser exclusivos de quem tem plano Afiliado.
2. Não existe link de **"Transparência"** na sidebar para investidores (só dentro da tela de detalhe de startup).
3. O Header mostra "Usuario" para todos que têm `role: "USER"`, independente do plano contratado.
4. Não há suporte a **múltiplos planos ativos** simultâneos (ex.: Investidor + Afiliado).

---

## 2. Objetivos

- Exibir itens de menu condicionalmente com base nos **planos ativos** do usuário (não apenas role do banco).
- Suportar cenário de **múltiplos planos ativos** (Investidor + Afiliado).
- Exibir dinamicamente o **nome do plano** no Header em vez de texto fixo.
- Não alterar footer da sidebar (Perfil, Minha Carteira, Logout).

---

## 3. Definições de Negócio

| Conceito | Definição |
|----------|-----------|
| Usuário Investidor | Possui subscription ACTIVE com `plan.slug = 'plano-investidor'` (R$ 50/ano) |
| Usuário Afiliado | Possui subscription ACTIVE com `plan.slug = 'plano-afiliado'` (R$ 85/ano) |
| Usuário Fundador | Possui subscription ACTIVE com `plan.slug = 'plano-fundador'` (R$ 100/ano) |
| Múltiplos Planos | Usuário pode ter mais de uma subscription ACTIVE simultaneamente |

---

## 4. Regras da Sidebar

### 4.1 Links Principais (body da nav)

| Item | Ícone | Rota | Condição de Exibição |
|------|-------|------|---------------------|
| Home | `LayoutDashboard` | `/home` | Sempre visível (qualquer plano ativo) |
| Transparência | `Eye` | `/transparencia` | Visível se plano **Investidor** ativo |
| Afiliação | `Handshake` | `/affiliate` | Visível **somente** se plano **Afiliado** ativo |
| Financeiro Afiliado | `Wallet` | `/affiliate/financeiro` | Visível **somente** se plano **Afiliado** ativo |

> **Cenário múltiplos planos:** se o usuário tem Investidor + Afiliado ativos, ele vê TODOS os itens acima (Home, Transparência, Afiliação, Financeiro Afiliado).

### 4.2 Links do Footer (rodapé da sidebar)

| Item | Comportamento |
|------|--------------|
| Perfil | **Sem alteração** — mantém link para `/profile` |
| Minha Carteira | **Sem alteração** — mantém CTA para `/wallet` |
| Logout | **Sem alteração** — mantém botão de logout |

> **Importante:** Não modificar ordem, posicionamento ou comportamento desses itens.

### 4.3 Lógica de Composição (proposta)

```
subscriptions ativas → extrair slugs dos planos
itens = [Home] (sempre)
if "plano-investidor" ativo → adicionar "Transparência"
if "plano-afiliado" ativo → adicionar "Afiliação" + "Financeiro Afiliado"
```

Remover o mapeamento atual `planId → role → roleMenuItems[role]` e substituir por composição aditiva baseada nos slugs dos planos ativos.

---

## 5. Regras do Header (TopNavbar)

### 5.1 Estado Atual

```tsx
<p className="text-[10px] text-primary ...">
  {user.role === "USER" && "Usuario"}
  {user.role === "ADMIN" && "Administrador"}
  ...
</p>
```

### 5.2 Comportamento Desejado

| Campo | De (atual) | Para (novo) |
|-------|-----------|-------------|
| Texto abaixo do nome | Texto fixo baseado em `user.role` | Nome(s) do(s) plano(s) ativo(s) |

**Regras:**

1. Exibir o campo `plan.nome` de cada subscription com `status === "ACTIVE"`.
2. Se houver **múltiplos planos ativos**, separar por vírgula.
   - Exemplo: `"Investidor, Afiliado"`
3. Se não houver nenhum plano ativo, exibir fallback baseado no `user.role`:
   - `ADMIN` → "Administrador"
   - `FINANCEIRO` → "Financeiro"
   - `COMPLIANCE` → "Compliance"
   - `USER` sem plano → "Sem plano ativo"
4. Manter avatar e nome inalterados.

### 5.3 Exemplo Visual

```
┌──────────────────────────────┐
│  Pedro Investidor            │
│  INVESTIDOR                  │  ← dinâmico, vem de plan.nome
│  [Avatar]                    │
└──────────────────────────────┘
```

Múltiplos planos:
```
┌──────────────────────────────┐
│  Pedro Investidor            │
│  INVESTIDOR, AFILIADO        │  ← join de plan.nome
│  [Avatar]                    │
└──────────────────────────────┘
```

---

## 6. Nova Página: Transparência do Investidor (`/transparencia`)

### 6.1 Objetivo

Página que lista todas as startups nas quais o investidor possui tokens comprados, com link direto para a página de transparência de cada startup.

### 6.2 Fonte de Dados

O backend **já possui** o endpoint:

```
GET /investments/my-startups
Authorization: Cookie session_id
```

**Retorno:**
```json
{
  "data": {
    "startups": [
      {
        "startupId": 1,
        "nome": "TechInnovate",
        "logo": "/files/logos/techinnovate.png",
        "segmento": "Tecnologia",
        "campaignStatus": "OPEN",
        "aportes": 2,
        "totalInvestido": 5000,
        "totalTokens": 100,
        "currentValue": 5500
      }
    ],
    "totalStartups": 1,
    "totalInvestido": 5000,
    "currentValueTotal": 5500
  }
}
```

### 6.3 Comportamento da Página

| Aspecto | Definição |
|---------|-----------|
| Rota | `/transparencia` |
| Arquivo | `routes/private/investor-transparencia.tsx` |
| Loader | Busca `GET /investments/my-startups` via BFF (server-side) |
| Estado vazio | Mensagem amigável: "Você ainda não investiu em nenhuma startup." |
| Layout | Grid/lista de cards com dados de cada startup |

### 6.4 Card de Startup (conteúdo)

Cada card deve exibir:

| Campo | Origem | Obrigatório |
|-------|--------|-------------|
| Logo | `startup.logo` | Sim (fallback: iniciais) |
| Nome da Startup | `startup.nome` | Sim |
| Segmento | `startup.segmento` | Não (ocultar se null) |
| Total investido | `startup.totalInvestido` (formatado R$) | Sim |
| Tokens | `startup.totalTokens` | Sim |
| Valor atual | `startup.currentValue` (formatado R$) | Sim |
| Status da campanha | `startup.campaignStatus` (badge) | Sim |
| **Botão "Ver Transparência"** | Link para `/founder/startups/:id/transparencia` | Sim |

> **Nota:** A rota de transparência da startup já existe em `/founder/startups/:id/transparencia`. Porém, como essa rota é prefixada com `founder/`, pode ser necessário criar um alias `/startups/:id/transparencia` acessível ao investidor, OU reutilizar a mesma rota ajustando o guard para aceitar investidores que possuam tokens daquela startup.

### 6.5 Permissões na Página de Transparência (por papel)

A rota `/founder/startups/:id/transparencia` será reutilizada para investidores. As permissões devem ser diferenciadas:

| Ação | Fundador | Investidor | Admin |
|------|----------|------------|-------|
| **Ver posts/atualizações** | ✅ | ✅ | ✅ |
| **Criar post (atualização)** | ✅ | ❌ | ✅ |
| **Editar post** | ✅ (próprios) | ❌ | ✅ |
| **Excluir post** | ✅ (próprios) | ❌ | ✅ |
| **Ver discussões** | ✅ | ✅ | ✅ |
| **Criar nova discussão (thread)** | ✅ | ✅ | ✅ |
| **Responder em discussão (comentário)** | ✅ | ✅ | ✅ |
| **Mencionar outros investidores (@user)** | ✅ | ✅ | ✅ |
| **Mencionar fundador (@fundador)** | ✅ | ✅ | ✅ |
| **Excluir discussão/thread** | ✅ (próprias) | ❌ | ✅ |
| **Excluir comentários/replies** | ✅ (próprios) | ❌ (somente os próprios) | ✅ |
| **Fixar discussão (pin)** | ✅ | ❌ | ✅ |

**Resumo para o Investidor:**
- **Pode:** Ver tudo, criar discussão/comentário, mencionar pessoas
- **Não pode:** Criar/editar/excluir posts de atualização, excluir discussões de outros, fixar discussões

**Sistema de Menções (@mentions):**
- O investidor pode mencionar outros investidores da mesma startup usando `@nome`
- O investidor pode mencionar o fundador diretamente para perguntas (ex.: `@João Founder`)
- Menções devem gerar notificação para o mencionado
- Autocomplete de nomes ao digitar `@`

### 6.6 Ajustes no Componente `TransparencyShell`

**Estado atual:**
```typescript
const isFounder = !!user && !!startup && Number(user.id) === Number(startup.founderId);
// canPost (discussions) = isFounder || isAdmin
```

**Ajuste necessário:**
```typescript
const isFounder = !!user && !!startup && Number(user.id) === Number(startup.founderId);
const isInvestor = !!user && !isFounder && !isAdmin; // investidor com tokens

// Posts: somente founder/admin podem criar/editar/excluir
const canManagePosts = isFounder || isAdmin;

// Discussões: investidores TAMBÉM podem criar threads e comentar
const canPostDiscussion = isAuthenticated; // qualquer user autenticado com tokens
```

O botão "Postar atualização" (aba atualizações) permanece visível **somente para founder/admin**. Na aba de discussões, o botão "Nova thread" deve ser visível para **todos** (incluindo investidores).

### 6.7 Ajuste no Guard/Loader da Rota

O loader atual busca dados da startup sem validar se o usuário é o founder. Para o investidor acessar, o backend precisa:

1. **Não retornar 403** quando um investidor com tokens naquela startup acessa a transparência
2. O endpoint `GET /transparency/startups/:id/posts` já deve aceitar qualquer user com tokens (verificar no backend)
3. O endpoint `GET /transparency/discussions/:id` idem

> **Verificação necessária:** confirmar que os endpoints de transparência do backend validam "é founder OU tem tokens nessa startup" (não apenas "é founder").

### 6.8 Rota no Frontend

Adicionar em `routes.ts` dentro do layout privado:

```typescript
route("transparencia", "routes/private/investor-transparencia.tsx"),
```

### 6.9 Rota BFF (API proxy)

Adicionar proxy no prefixed `/api`:

```typescript
route("investments/my-startups", "routes/api/investments.my-startups.ts"),
```

Ou reutilizar o proxy existente se já estiver mapeado.

---

## 7. Impacto Técnico

### 7.1 Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `frontend/app/components/layout/sidebar.tsx` | Refatorar lógica de menu: remover `roleMenuItems` para USER/INVESTOR/AFILIADO, usar composição aditiva por plano |
| `frontend/app/components/layout/top-navbar.tsx` | Substituir exibição fixa do role por nome(s) dinâmico(s) dos planos ativos |

### 7.2 Arquivos a Criar

| Arquivo | Propósito |
|---------|-----------|
| `frontend/app/routes/private/investor-transparencia.tsx` | Nova página de listagem de startups investidas |
| `frontend/app/routes/api/investments.my-startups.ts` | BFF proxy para `GET /investments/my-startups` (se necessário) |

### 7.3 Arquivos que NÃO Devem ser Alterados

- `frontend/app/hooks/use-user.ts` — Hook não precisa mudar (já retorna subscriptions com plan)
- `frontend/app/types/auth.ts` — Tipos já suportam `subscriptions[].plan.nome`
- Backend — Nenhuma alteração necessária (dados já retornam nos endpoints)

### 7.4 Arquivos a Alterar (adição de rota)

- `frontend/app/routes.ts` — Adicionar `route("transparencia", ...)` no layout privado

### 7.5 Dependência de Backend

O endpoint `GET /investments/my-startups` **já existe e retorna os dados necessários**. Nenhuma alteração no backend é necessária para a listagem.

Para a questão do acesso à transparência individual (seção 6.5), pode ser necessário ajuste de guard no loader da rota `/founder/startups/:id/transparencia`.

---

## 8. Critérios de Aceite

- [ ] **AC-01:** Investidor com plano ativo vê: Home + Transparência na sidebar
- [ ] **AC-02:** Investidor com plano ativo NÃO vê: Afiliação e Financeiro Afiliado (a menos que também tenha plano Afiliado)
- [ ] **AC-03:** Afiliado com plano ativo vê: Afiliação + Financeiro Afiliado
- [ ] **AC-04:** Usuário com ambos planos (Investidor + Afiliado) vê: Home + Transparência + Afiliação + Financeiro Afiliado
- [ ] **AC-05:** Header exibe nome do plano ativo (ex.: "INVESTIDOR") em vez de "Usuario"
- [ ] **AC-06:** Header com múltiplos planos exibe separado por vírgula (ex.: "INVESTIDOR, AFILIADO")
- [ ] **AC-07:** Footer da sidebar inalterado (Perfil, Minha Carteira, Logout)
- [ ] **AC-08:** Roles ADMIN, FINANCEIRO, COMPLIANCE mantêm comportamento atual (menu não afetado)
- [ ] **AC-09:** Página `/transparencia` lista todas as startups onde o investidor possui tokens
- [ ] **AC-10:** Cada card exibe: logo, nome, segmento, total investido, tokens, valor atual, status campanha
- [ ] **AC-11:** Cada card tem botão/link "Ver Transparência" que leva à página de transparência da startup
- [ ] **AC-12:** Estado vazio exibe mensagem quando investidor não tem tokens em nenhuma startup
- [ ] **AC-13:** Investidor NÃO vê botão "Postar atualização" na aba de atualizações
- [ ] **AC-14:** Investidor pode criar nova thread na aba de discussões
- [ ] **AC-15:** Investidor pode responder/comentar em threads existentes
- [ ] **AC-16:** Investidor pode mencionar outros investidores e o fundador via @nome
- [ ] **AC-17:** Investidor NÃO pode excluir threads/comentários de outros (somente os próprios)
- [ ] **AC-18:** Fundador mantém controle total (criar/editar/excluir posts, fixar discussões, excluir threads)

---

## 9. Fora de Escopo

- Alterações pesadas no backend (endpoint `/investments/my-startups` já funciona)
- Sistema de notificações por menção (pode ser implementado em fase posterior se não existir)
- Lógica de `ensureActivePlan` (guard de rotas no server-side)
- Menu do Fundador (mantém como está)
- Lógica de expiração/renovação de planos
- Criação de nova rota separada para transparência do investidor (reutiliza a existente)

---

## 10. Riscos e Considerações

| Risco | Mitigação |
|-------|-----------|
| Plano sem campo `plan.nome` preenchido | Fallback para `plan.slug` formatado |
| Subscription expirada não filtrada | Filtrar apenas `status === "ACTIVE"` |
| Regressão em menus de ADMIN/FINANCEIRO/COMPLIANCE | Manter lógica de `user.role` como override para roles administrativas |
| Cache do TanStack Query com dados antigos | staleTime de 5min já é aceitável para mudanças de plano |
| Backend retorna 403 para investidor na transparência | Ajustar endpoint para validar "é founder OU tem tokens" |
| Sistema de @menções não existente no backend | Implementar como fase 2 se não houver suporte atual; inicialmente usar texto livre com `@` |

---

## 11. Mockup de Lógica (Pseudocódigo)

```typescript
// sidebar.tsx — nova lógica
const activePlans = user.subscriptions
  ?.filter(sub => sub.status === "ACTIVE")
  .map(sub => sub.plan?.slug) ?? [];

const hasInvestidor = activePlans.includes("plano-investidor");
const hasAfiliado = activePlans.includes("plano-afiliado");
const hasFundador = activePlans.includes("plano-fundador");

// Para roles administrativas, manter menu fixo
if (["ADMIN", "FINANCEIRO", "COMPLIANCE"].includes(user.role)) {
  // usar roleMenuItems existente baseado em user.role
} else if (hasFundador) {
  // menu do founder (já existente)
} else {
  // composição aditiva
  navItems = [{ label: "Home", href: "/home", icon: LayoutDashboard }];
  if (hasInvestidor) navItems.push({ label: "Transparência", href: "/transparencia", icon: Eye });
  if (hasAfiliado) navItems.push({ label: "Afiliação", href: "/affiliate", icon: Handshake });
  if (hasAfiliado) navItems.push({ label: "Financeiro Afiliado", href: "/affiliate/financeiro", icon: Wallet });
}
```

```typescript
// top-navbar.tsx — nova lógica
const activeNames = user.subscriptions
  ?.filter(sub => sub.status === "ACTIVE")
  .map(sub => sub.plan?.nome)
  .filter(Boolean) ?? [];

const displayRole = activeNames.length > 0
  ? activeNames.join(", ")
  : fallbackByRole(user.role); // "Administrador" | "Financeiro" | "Compliance" | "Sem plano ativo"
```
