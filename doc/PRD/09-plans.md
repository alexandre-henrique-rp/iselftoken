# PRD — Plans (09-plans)

## 1. Visão Geral

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Seleção de planos de adesão com foco em conversão |
| **Rota** | `/plans` |
| **Path** | `app/routes/private/plans/index.tsx` |
| **Componentes** | `app/routes/private/plans/components/index.tsx` |
| **API** | `ApiPage.getPlans()` |
| **Tipo** | Private (requer autenticação) |
| **Design System** | Tailwind CSS v4 + shadcn/ui (tema stone) |

## 2. Dependências

### 2.1 APIs Utilizadas
```typescript
// app/api/pageapi.ts
ApiPage.getPlans(): Promise<PlansResponse>
```

### 2.2 Contextos
- `AuthContext` — verificação de autenticação
- `UserContext` — dados do usuário e plano atual

### 2.3 Componentes UI
- `Card` — cards de plano
- `Badge` — destaque "Recomendado"
- `Button` — CTAs
- `Skeleton` — loading states

## 3. Requisitos Funcionais

### 3.1 Cabeçalho Central

| Elemento | Descrição | Estilo |
|----------|-----------|--------|
| Título | "Escolha sua taxa de adesão" | `text-3xl font-bold text-stone-100` |
| Subtítulo | "Plano válido por 12 meses" | `text-lg text-stone-400` |
| Alinhamento | Centralizado | `text-center` |
| Margem | Espaçamento inferior | `mb-12` |

```typescript
interface PlansHeaderProps {
  titulo: string;
  subtitulo: string;
  validadeMeses: number;
}
```

### 3.2 Cards de Planos

| Elemento | Descrição |
|----------|-----------|
| Badge de destaque | "Recomendado", "Popular", etc. |
| Ícone | Representativo do plano (Lucide) |
| Nome | Título do plano |
| Preço | Valor anual formatado |
| Descrição | Resumo do plano |
| CTA | Botão "Começar agora" |
| Benefícios | Lista com ícones de check |

```typescript
interface Plano {
  id: string;
  nome: string;
  descricao: string;
  precoAnual: number;
  precoMensal?: number;
  icone: string; // nome do ícone Lucide
  badge?: 'recomendado' | 'popular' | 'economico';
  beneficios: string[];
  destaque: boolean;
  cor?: string; // cor do tema
}

interface PlanoCardProps {
  plano: Plano;
  isSelected?: boolean;
  onSelect: (planoId: string) => void;
}
```

### 3.3 Plano Recomendado (Destaque)

| Propriedade | Valor |
|-------------|-------|
| Escala | 5% maior que os demais (`scale-105`) |
| Borda | `border-2 border-[#d500f9]` |
| Sombra | `shadow-lg shadow-[#d500f9]/20` |
| Badge | Fixo no topo do card |
| Z-index | Acima dos demais (`z-10`) |

### 3.4 Lista de Benefícios

```typescript
interface Beneficio {
  texto: string;
  incluido: boolean;
  destaque?: boolean;
}

interface ListaBeneficios {
  beneficios: Beneficio[];
}
```

**Exibição:**
- ✓ Verde para benefícios incluídos
- ✗ Cinza para não incluídos
- Texto em destaque para benefícios premium

### 3.5 Seleção e Navegação

| Ação | Comportamento |
|------|---------------|
| Click no card | Seleciona o plano |
| Click no CTA | Redireciona para checkout |
| Plano já ativo | Card desabilitado com "Plano atual" |

```typescript
interface PlansPageState {
  planos: Plano[];
  planoSelecionado: string | null;
  planoAtual: string | null;
  isLoading: boolean;
  error: string | null;
}
```

## 4. Estruturas de Dados

### 4.1 Resposta da API

```typescript
interface PlansResponse {
  planos: Plano[];
  planoAtual?: string;
  promocao?: {
    codigo: string;
    desconto: number;
    validoAte: string;
  };
}
```

### 4.2 Exemplo de Resposta

```json
{
  "planos": [
    {
      "id": "plan-basic",
      "nome": "Básico",
      "descricao": "Ideal para começar a investir",
      "precoAnual": 199.00,
      "precoMensal": 19.90,
      "icone": "Rocket",
      "badge": null,
      "destaque": false,
      "beneficios": [
        "Acesso a startups verificadas",
        "Suporte por e-mail",
        "Dashboard básico"
      ]
    },
    {
      "id": "plan-pro",
      "nome": "Profissional",
      "descricao": "Para investidores ativos",
      "precoAnual": 499.00,
      "precoMensal": 49.90,
      "icone": "TrendingUp",
      "badge": "recomendado",
      "destaque": true,
      "beneficios": [
        "Tudo do plano Básico",
        "Acesso antecipado a rodadas",
        "Relatórios avançados",
        "Suporte prioritário"
      ]
    },
    {
      "id": "plan-fundador",
      "nome": "Fundador",
      "descricao": "Para criar e gerenciar startups",
      "precoAnual": 999.00,
      "precoMensal": 99.90,
      "icone": "Crown",
      "badge": "popular",
      "destaque": false,
      "beneficios": [
        "Tudo do plano Profissional",
        "Criar startups ilimitadas",
        "Ferramentas de gestão",
        "Consultoria mensal"
      ]
    }
  ],
  "planoAtual": null,
  "promocao": {
    "codigo": "WELCOME2024",
    "desconto": 20,
    "validoAte": "2024-12-31"
  }
}
```

## 5. Requisitos de UI/UX

### 5.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              Escolha sua taxa de adesão                     │
│              Plano válido por 12 meses                      │
│                                                             │
│  ┌─────────┐  ┌─────────────┐  ┌─────────┐                 │
│  │         │  │ RECOMENDADO │  │         │                 │
│  │  ★      │  │             │  │  ♛      │                 │
│  │ Básico  │  │  ⚡ Pro     │  │ Fundador│                 │
│  │         │  │             │  │         │                 │
│  │ R$199   │  │   R$499     │  │ R$999   │                 │
│  │  /ano   │  │    /ano     │  │  /ano   │                 │
│  │         │  │             │  │         │                 │
│  │ ✓ Item  │  │  ✓ Item     │  │ ✓ Item  │                 │
│  │ ✓ Item  │  │  ✓ Item     │  │ ✓ Item  │                 │
│  │ ✓ Item  │  │  ✓ Item     │  │ ✓ Item  │                 │
│  │         │  │  ✓ Item     │  │ ✓ Item  │                 │
│  │         │  │             │  │ ✓ Item  │                 │
│  │[Começar]│  │ [Começar]   │  │[Começar]│                 │
│  └─────────┘  └─────────────┘  └─────────┘                 │
│                                                             │
│           🎉 Use o código WELCOME2024 e ganhe 20% OFF       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Grid Responsivo

| Breakpoint | Layout |
|------------|--------|
| Desktop (`≥ 1024px`) | 3 colunas lado a lado |
| Tablet (`768px - 1023px`) | 2 colunas |
| Mobile (`< 768px`) | 1 coluna, empilhado |

```css
/* Classes Tailwind */
.plans-grid {
  @apply grid gap-6;
  @apply grid-cols-1 md:grid-cols-2 lg:grid-cols-3;
  @apply max-w-6xl mx-auto px-4;
}
```

### 5.3 Cores e Estilos

| Elemento | Classe Tailwind |
|----------|-----------------|
| Background página | `bg-stone-950` |
| Card normal | `bg-stone-900 border border-stone-800` |
| Card destaque | `bg-stone-900 border-2 border-[#d500f9] scale-105` |
| Card hover | `hover:border-stone-600 transition-all` |
| Título plano | `text-xl font-bold text-stone-100` |
| Preço | `text-3xl font-bold text-[#d500f9]` |
| Descrição | `text-sm text-stone-400` |
| Benefício ✓ | `text-green-500` |
| Benefício ✗ | `text-stone-600` |
| Badge | `bg-[#d500f9] text-white text-xs px-2 py-1 rounded-full` |
| CTA | `bg-[#d500f9] hover:bg-[#b000d4] text-white w-full` |

### 5.4 Animações

| Elemento | Animação |
|----------|----------|
| Card hover | `transition-transform duration-200 hover:scale-102` |
| Card destaque | `animate-pulse-slow` (borda brilhante) |
| Seleção | `transition-all duration-300` |
| Badge | `animate-bounce` (1x ao carregar) |

## 6. Estados e Feedbacks

### 6.1 Loading

```typescript
// Skeleton para cada card
<div className="animate-pulse">
  <div className="h-6 bg-stone-800 rounded w-1/3 mb-4" />
  <div className="h-10 bg-stone-800 rounded w-1/2 mb-4" />
  <div className="h-4 bg-stone-800 rounded w-full mb-2" />
  <div className="h-4 bg-stone-800 rounded w-full mb-2" />
  <div className="h-4 bg-stone-800 rounded w-3/4 mb-6" />
  <div className="h-10 bg-stone-800 rounded w-full" />
</div>
```

### 6.2 Estados do Card

| Estado | Visual |
|--------|--------|
| Normal | Borda `stone-800` |
| Hover | Borda `stone-600`, cursor pointer |
| Selecionado | Borda `[#d500f9]`, checkmark |
| Desabilitado | Opacidade 50%, sem hover |
| Plano atual | Badge "Plano atual", CTA desabilitado |

### 6.3 Estado Vazio

```typescript
interface EmptyState {
  titulo: string;
  mensagem: string;
  icone: string;
}

// Exibido quando não há planos disponíveis
{
  titulo: "Nenhum plano disponível",
  mensagem: "Novos planos serão lançados em breve.",
  icone: "PackageOpen"
}
```

### 6.4 Erro

| Tipo | Mensagem | Ação |
|------|----------|------|
| API Error | "Não foi possível carregar os planos" | Botão "Tentar novamente" |
| Timeout | "Conexão lenta, tente novamente" | Retry automático |

## 7. Fluxo de Seleção

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Visualiza  │────▶│  Seleciona  │────▶│  Checkout   │
│   Planos    │     │    Plano    │     │  Pagamento  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Valida     │
                    │  Sessão     │
                    └─────────────┘
```

**Passos:**
1. Usuário visualiza planos disponíveis
2. Clica no plano desejado ou CTA
3. Sistema valida sessão e permissões
4. Redireciona para `/payment/checkout?plan={planoId}`

## 8. Acessibilidade

| Requisito | Implementação |
|-----------|---------------|
| Focus visible | `focus-visible:ring-2 focus-visible:ring-[#d500f9]` |
| Navegação teclado | Tab entre cards, Enter para selecionar |
| Screen readers | `aria-label` nos cards e CTAs |
| Contraste | Mínimo 4.5:1 para texto |
| Role | `role="listbox"` no grid, `role="option"` nos cards |

```tsx
<div role="listbox" aria-label="Planos disponíveis">
  {planos.map(plano => (
    <div
      key={plano.id}
      role="option"
      aria-selected={selected === plano.id}
      tabIndex={0}
    >
      {/* Card content */}
    </div>
  ))}
</div>
```

## 9. Critérios de Aceitação

- [ ] Exibe mais de 5 planos quando disponíveis
- [ ] Card recomendado é 5% maior que os demais
- [ ] Card recomendado tem borda e sombra de destaque
- [ ] Badge "Recomendado" exibido corretamente
- [ ] Preço formatado em R$ com separador de milhares
- [ ] Lista de benefícios com checkmarks
- [ ] CTA funcional em todos os cards
- [ ] Responsivo: 3 → 2 → 1 colunas
- [ ] Loading skeleton durante carregamento
- [ ] Plano atual desabilitado com badge
- [ ] Navegação por teclado funcional
- [ ] Redirecionamento correto para checkout

## 10. Notas Técnicas

- Usar `Intl.NumberFormat` para formatação de preços
- Cache de 10 minutos para dados de planos
- Preload do checkout ao hover no CTA
- Tracking de seleção para analytics
- Suporte a cupom de desconto via query param

## 11. Referências Cruzadas

| Documento | Relação |
|-----------|---------|
| [07-layout.md](./07-layout.md) | Layout pai com sidebar |
| [14-payment-checkout.md](./14-payment-checkout.md) | Destino após seleção |
| [15-special-functions.md](./15-special-functions.md) | Validação de plano |
| [style/09-plans.md](../style/09-plans.md) | Guia de estilo |
| [style/09-plans.jsx](../style/09-plans.jsx) | Exemplo de layout |
| [css_padrão.md](../css_padrão.md) | Design tokens |
| [SPEC/09-plans.md](../SPEC/09-plans.md) | Especificação técnica |
