# PRD — Financeiro: CRUD de Planos com Benefícios Configuráveis

**Data:** 15/08/2026  
**Autor:** Agente IA  
**Status:** Rascunho  
**Prioridade:** Alta  
**Módulo:** Frontend + Backend — Financeiro / Admin

---

## 1. Contexto

O backend já possui CRUD completo de planos (`POST/GET/PATCH/DELETE /plans`) com validação de admin, mas **não existe tela no frontend** para gerenciar planos. Hoje os planos são criados apenas via seed ou API direta. A tela de pricing (`/pricing`) mostra planos ao usuário final para contratação.

**Model Plan no schema:**
```
id, nome, slug, descricao, preco, periodoMeses, periodo, icon, beneficios (Json — string[]),
visivel, isActive, recomendado, subscriptions[], createdAt, updatedAt
```

---

## 2. Objetivo

Criar uma tela administrativa para o time financeiro/admin gerenciar planos de forma visual:
- Criar novos planos com lista de benefícios (array dinâmico)
- Editar planos existentes (preço, benefícios, visibilidade)
- Desativar/reativar planos
- Preview de como o plano aparece no `/pricing`
- Benefícios default sugeridos (templates)

---

## 3. Rota e Posição na Sidebar

| Rota | Arquivo | Menu |
|------|---------|------|
| `/financeiro/plans` | `routes/private/financeiro-plans.tsx` | Sidebar FINANCEIRO → novo item "Planos" |
| `/financeiro/plans/:id` | `routes/private/financeiro-plan-edit.tsx` | Detalhe/edição |

---

## 4. Tela de Lista (`/financeiro/plans`)

### 4.1 Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│  PLANOS                                            [+ Novo Plano]│
│  ─────────                                                      │
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                        │
│  │ AFILIADO│  │INVESTIDOR│  │ FUNDADOR│                        │
│  │ R$ 85/a │  │ R$ 50/a  │  │ R$100/a │                        │
│  │ ○ Oculto│  │ ● Visível│  │ ● Visível│                       │
│  │ 4 benef.│  │ 3 benef. │  │ 4 benef.│                        │
│  │ 12 subs │  │ 47 subs  │  │ 23 subs │                        │
│  │[Editar] │  │[Editar]  │  │[Editar] │                        │
│  └─────────┘  └─────────┘  └─────────┘                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ INATIVOS                                                │    │
│  │ Nenhum plano inativo no momento.                        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Dados por Card

| Campo | Fonte |
|-------|-------|
| Nome | `plan.nome` |
| Preço | `plan.preco` formatado + `plan.periodo` |
| Visibilidade | `plan.visivel` (badge verde/cinza) |
| Status | `plan.isActive` (Ativo/Inativo) |
| Recomendado | `plan.recomendado` (estrela/badge) |
| Benefícios | `plan.beneficios.length` |
| Assinantes | `count(subscriptions where status=ACTIVE)` |
| Ícone | `plan.icon` (Lucide icon name) |

---

## 5. Tela de Criação/Edição (`/financeiro/plans/:id` ou modal)

### 5.1 Formulário

| Campo | Tipo | Validação |
|-------|------|-----------|
| Nome | Input texto | Obrigatório, 3-50 chars |
| Slug | Input texto (auto-gerado do nome) | Único, kebab-case |
| Descrição | Textarea | Opcional, max 500 chars |
| Preço | Input numérico (R$) | Obrigatório, > 0 |
| Período (meses) | Select (1/3/6/12) | Default: 12 |
| Período (label) | Input texto | Default: "/ano" |
| Ícone | Select com preview (Lucide icons) | Opcional |
| Visível | Toggle | Default: true |
| Recomendado | Toggle | Default: false |
| **Benefícios** | Lista dinâmica (ver 5.2) | Mín. 1 item |

### 5.2 Lista de Benefícios (array dinâmico)

```
┌─────────────────────────────────────────────────────────────────┐
│  BENEFÍCIOS                                   [+ Adicionar]     │
│  ─────────────                                                  │
│                                                                 │
│  1. [Compra de tokens para investimento           ] [🗑️]  [⬆⬇] │
│  2. [Revenda de tokens adquiridos com lucro       ] [🗑️]  [⬆⬇] │
│  3. [Acesso dashboard de investimentos            ] [🗑️]  [⬆⬇] │
│  4. [________________________________             ] [🗑️]  [⬆⬇] │
│                                                                 │
│  💡 Sugestões:                                                   │
│  [+ Compra de tokens] [+ Revenda com lucro] [+ Dashboard]       │
│  [+ Comissões progressivas] [+ Suporte prioritário]             │
│  [+ Relatórios exclusivos] [+ Acesso early-access]              │
└─────────────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Adicionar item (input + botão)
- Remover item (botão lixeira)
- Reordenar (drag & drop ou setas ⬆⬇)
- Sugestões rápidas (chips clicáveis com benefícios padrão)

### 5.3 Benefícios Default (templates)

Array de sugestões pré-definidas que o admin pode clicar para adicionar rapidamente:

```typescript
const DEFAULT_BENEFITS = [
  'Compra de tokens para investimento',
  'Revenda de tokens adquiridos com lucro',
  'Acesso dashboard de investimentos',
  'Recompensa por indicação de novos investidores',
  'Programa de afiliação com comissões progressivas',
  'Cadastro de startups para captação de investimento',
  'Acesso exclusivo a oportunidades de fundador',
  'Suporte prioritário via chat',
  'Relatórios exclusivos de performance',
  'Acesso antecipado a novas rodadas (early-access)',
  'Descontos em taxas de transação',
  'Badge exclusivo no perfil',
];
```

### 5.4 Preview ao Vivo

Ao lado do formulário (em desktop), mostrar um card de preview em tempo real que replica exatamente como aparece no `/pricing`:

```
┌──────────────────────────┐
│  [Ícone]                 │
│  INVESTIDOR              │
│  Recomendado             │
│  ─────────               │
│  R$ 50 /ano              │
│  ─────────               │
│  ✓ Compra de tokens...   │
│  ✓ Revenda com lucro...  │
│  ✓ Dashboard...          │
│  ─────────               │
│  [Começar agora]         │
└──────────────────────────┘
```

---

## 6. Ações Especiais

### 6.1 Desativar Plano

- `DELETE /plans/:id` faz soft-delete (`isActive = false`)
- Plano desativado não aparece no `/pricing`
- Assinaturas existentes continuam válidas até expiração
- Banner de aviso: "X assinantes ativos serão impactados na renovação"

### 6.2 Duplicar Plano

Botão "Duplicar" que cria cópia com slug auto-incrementado (`plano-investidor-2`).
Útil para criar variantes (ex: plano promocional temporário).

### 6.3 Estatísticas do Plano

Na tela de edição, exibir:
- Total de assinantes ativos
- Receita mensal recorrente (MRR) deste plano
- Gráfico de assinaturas ao longo do tempo (últimos 6 meses)

---

## 7. Regras de Negócio

| Regra | Validação |
|-------|-----------|
| Slug único | Backend valida via `@unique`. Frontend gera auto e mostra erro se existir |
| Preço > 0 | Frontend + backend |
| Pelo menos 1 benefício | Frontend bloqueia salvar sem benefícios |
| Plano com assinantes não pode ser deletado permanentemente | Apenas soft-delete (isActive=false) |
| Slug não pode ser alterado após criação | Campo disabled em edição |
| Alteração de preço não afeta subscriptions existentes | Preço é snapshot no momento da assinatura |
| Apenas ADMIN ou FINANCEIRO pode gerenciar planos | Guard no backend + verificação de role no frontend |

---

## 8. Impacto Técnico

### 8.1 Frontend — Arquivos a Criar

| Arquivo | Propósito |
|---------|-----------|
| `routes/private/financeiro-plans.tsx` | Lista de planos (cards + ações) |
| `routes/private/financeiro-plan-edit.tsx` | Criação/Edição com form + preview |
| `routes/api/plans.admin.ts` | BFF proxy para `GET/POST/PATCH/DELETE /plans` (se necessário) |
| `components/layout/sidebar.tsx` | Adicionar item "Planos" no menu FINANCEIRO |

### 8.2 Frontend — Rotas em `routes.ts`

```typescript
route("financeiro/plans", "routes/private/financeiro-plans.tsx"),
route("financeiro/plans/:id", "routes/private/financeiro-plan-edit.tsx"),
route("financeiro/plans/new", "routes/private/financeiro-plan-edit.tsx"),
```

### 8.3 Backend — Ajustes

| Endpoint | Status | Ajuste |
|----------|--------|--------|
| `GET /plans` | ✅ Existe | Adicionar query `?includeInactive=true` para admin ver inativos |
| `POST /plans` | ✅ Existe | Nenhum |
| `PATCH /plans/:id` | ✅ Existe | Nenhum |
| `DELETE /plans/:id` | ✅ Existe | Verificar se faz soft-delete (isActive=false) |
| `GET /plans/:id/stats` | ❌ Não existe | **CRIAR** — retorna subscribers count, MRR |

### 8.4 Sidebar

Adicionar no array `financeiroMenuItems` em `sidebar.tsx`:
```typescript
{ label: "Planos", href: "/financeiro/plans", icon: CreditCard },
```

---

## 9. Critérios de Aceite

- [ ] **AC-01:** Lista de planos exibida em cards com nome, preço, visibilidade, assinantes
- [ ] **AC-02:** Criar novo plano com todos os campos (nome, slug, preço, benefícios, etc)
- [ ] **AC-03:** Editar plano existente (preço, benefícios, visibilidade, recomendado)
- [ ] **AC-04:** Lista de benefícios dinâmica com add/remove/reorder
- [ ] **AC-05:** Sugestões de benefícios default (chips clicáveis)
- [ ] **AC-06:** Preview ao vivo do card do plano durante edição
- [ ] **AC-07:** Desativar plano (soft-delete) com aviso de impacto
- [ ] **AC-08:** Slug auto-gerado e não editável após criação
- [ ] **AC-09:** Validação: preço > 0, pelo menos 1 benefício, slug único
- [ ] **AC-10:** Apenas ADMIN/FINANCEIRO tem acesso à tela
- [ ] **AC-11:** Item "Planos" visível na sidebar do Financeiro

---

## 10. Fora de Escopo

- Gestão de subscriptions individuais (cancelar/reembolsar) — usar tela existente
- Criação de cupons de desconto — feature separada
- Precificação dinâmica / A/B testing de preços
- Integração com gateway para atualizar preço automaticamente
- Histórico de alterações de preço (pode ser follow-up via AuditLog)
