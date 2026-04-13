# PRD — Dashboard Minhas Startups (11-dashboard-startups)

## 1. Visão Geral

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Listar e gerenciar startups criadas pelo usuário |
| **Rota** | `/dashboard/startups` |
| **Path** | `app/routes/private/dashboard/startups/index.tsx` |
| **Componentes** | `app/routes/private/dashboard/startups/components/index.tsx` |
| **APIs** | `StartupApi.listMyStartups()`, `StartupApi.create()` |
| **Tipo** | Private (requer plano fundador) |
| **Design System** | Tailwind CSS v4 + shadcn/ui (tema stone) |

## 2. Dependências

### 2.1 APIs Utilizadas
```typescript
// app/api/startupApi.ts
StartupApi.listMyStartups(): Promise<MinhasStartupsResponse>
StartupApi.create(data: CreateStartupDTO): Promise<Startup>
StartupApi.delete(id: string): Promise<void>
```

### 2.2 Contextos
- `AuthContext` — verificação de autenticação
- `UserContext` — dados do usuário e plano

### 2.3 Validação de Acesso
```typescript
// Verificar plano fundador
import { validateFundadorPlan } from '@/lib/special-functions';

if (!validateFundadorPlan(user)) {
  redirect('/plans');
}
```

### 2.4 Componentes UI
- `Card` — cards de startup
- `Table` — visualização tabela
- `Badge` — status
- `Button` — ações
- `Input` — busca
- `Select` — filtros
- `Skeleton` — loading

## 3. Requisitos Funcionais

### 3.1 Header da Página

| Elemento | Descrição | Ação |
|----------|-----------|------|
| Título | "Minhas Startups" | — |
| Subtítulo | Total de startups | — |
| Botão criar | "Criar startup" | Redireciona para `/dashboard/startups/create` |

```typescript
interface DashboardHeaderProps {
  titulo: string;
  totalStartups: number;
  onCreateClick: () => void;
}
```

### 3.2 Filtros

| Filtro | Tipo | Opções |
|--------|------|--------|
| Status | select | Todas, Aprovada, Em análise, Rejeitada |
| Campanha | select | Todas, Em edição, Aberto, Financiado, Reprovado, Pago |
| Busca | text | Por nome ou segmento |

```typescript
interface FiltrosStartup {
  status: 'todas' | 'aprovada' | 'em_analise' | 'rejeitada';
  campanha: 'todas' | 'edicao' | 'aberto' | 'financiado' | 'reprovado' | 'pago';
  busca: string;
}

interface FiltrosProps {
  filtros: FiltrosStartup;
  onChange: (filtros: FiltrosStartup) => void;
  onClear: () => void;
}
```

### 3.3 Lista de Startups

| Campo | Descrição | Tipo |
|-------|-----------|------|
| Logo | Imagem da startup | image |
| Nome | Nome da startup | text |
| Segmento | Área de atuação | text |
| Status | Aprovada/Análise/Rejeitada | badge |
| Estágio | Estágio do negócio | text |
| Tokens | Total de tokens | number |
| % Vendido | Percentual de tokens vendidos | progress |
| Campanha | Status da campanha | badge |
| Criação | Data de criação | date |
| Ações | Ver/Editar | buttons |

```typescript
interface StartupListItem {
  id: string;
  logo: string;
  nome: string;
  segmento: string;
  status: 'aprovada' | 'em_analise' | 'rejeitada';
  estagio: string;
  totalTokens: number;
  tokensVendidos: number;
  percentualVendido: number;
  statusCampanha: 'edicao' | 'aberto' | 'financiado' | 'reprovado' | 'pago';
  createdAt: string;
}

interface StartupListProps {
  startups: StartupListItem[];
  viewMode: 'cards' | 'table';
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}
```

### 3.4 Visualização em Cards

```typescript
interface StartupCardProps {
  startup: StartupListItem;
  onView: () => void;
  onEdit: () => void;
}
```

**Layout do Card:**
- Horizontal para melhor leitura em mobile
- Logo à esquerda (80x80px)
- Informações à direita
- Badges de status
- Botões de ação no rodapé

### 3.5 Visualização em Tabela

```typescript
interface StartupTableProps {
  startups: StartupListItem[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}
```

**Colunas ordenáveis:**
- Nome
- Status
- Campanha
- % Vendido
- Data de criação

### 3.6 Estado Vazio

```typescript
interface EmptyStateProps {
  titulo: string;
  mensagem: string;
  ctaLabel: string;
  onCtaClick: () => void;
}

// Configuração
{
  titulo: "Nenhuma startup cadastrada",
  mensagem: "Comece criando sua primeira startup e atraia investidores.",
  ctaLabel: "Criar minha primeira startup",
  onCtaClick: () => navigate('/dashboard/startups/create')
}
```

### 3.7 Paginação

```typescript
interface PaginacaoProps {
  paginaAtual: number;
  totalPaginas: number;
  totalItems: number;
  itensPorPagina: number;
  onPageChange: (pagina: number) => void;
}
```

## 4. Estruturas de Dados

### 4.1 Resposta da API

```typescript
interface MinhasStartupsResponse {
  startups: StartupListItem[];
  total: number;
  pagina: number;
  totalPaginas: number;
  itensPorPagina: number;
  estatisticas: {
    total: number;
    aprovadas: number;
    emAnalise: number;
    rejeitadas: number;
    campanhasAbertas: number;
  };
}
```

### 4.2 Exemplo de Resposta

```json
{
  "startups": [
    {
      "id": "startup-001",
      "logo": "/logos/techflow.png",
      "nome": "TechFlow",
      "segmento": "SaaS B2B",
      "status": "aprovada",
      "estagio": "Seed",
      "totalTokens": 100000,
      "tokensVendidos": 45000,
      "percentualVendido": 45,
      "statusCampanha": "aberto",
      "createdAt": "2024-01-01T10:00:00Z"
    },
    {
      "id": "startup-002",
      "logo": "/logos/greentech.png",
      "nome": "GreenTech",
      "segmento": "CleanTech",
      "status": "em_analise",
      "estagio": "Pre-seed",
      "totalTokens": 50000,
      "tokensVendidos": 0,
      "percentualVendido": 0,
      "statusCampanha": "edicao",
      "createdAt": "2024-01-10T14:30:00Z"
    }
  ],
  "total": 2,
  "pagina": 1,
  "totalPaginas": 1,
  "itensPorPagina": 10,
  "estatisticas": {
    "total": 2,
    "aprovadas": 1,
    "emAnalise": 1,
    "rejeitadas": 0,
    "campanhasAbertas": 1
  }
}
```

## 5. Requisitos de UI/UX

### 5.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Minhas Startups                         [+ Criar startup]  │
│  2 startups cadastradas                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Status [▼ Todas]  Campanha [▼ Todas]  [🔍 Buscar...] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Cards]  [Tabela]                                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ┌────┐                                              │   │
│  │ │LOGO│  TechFlow                    ● Aprovada      │   │
│  │ └────┘  SaaS B2B | Seed                             │   │
│  │                                                     │   │
│  │         Tokens: 100.000  |  Vendido: 45%            │   │
│  │         ████████████░░░░░░░░                        │   │
│  │                                                     │   │
│  │         Campanha: ● Aberto                          │   │
│  │                                                     │   │
│  │         [Ver detalhes]  [Editar]                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ┌────┐                                              │   │
│  │ │LOGO│  GreenTech                   ● Em análise    │   │
│  │ └────┘  CleanTech | Pre-seed                        │   │
│  │                                                     │   │
│  │         Tokens: 50.000   |  Vendido: 0%             │   │
│  │         ░░░░░░░░░░░░░░░░░░░░                        │   │
│  │                                                     │   │
│  │         Campanha: ● Em edição                       │   │
│  │                                                     │   │
│  │         [Ver detalhes]  [Editar]                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                    ◀ 1 de 1 ▶                               │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Cores e Estilos

| Elemento | Classe Tailwind |
|----------|-----------------|
| Background página | `bg-stone-950` |
| Card startup | `bg-stone-900 border border-stone-800 rounded-lg p-4` |
| Card hover | `hover:border-stone-700 transition-colors` |
| Título página | `text-2xl font-bold text-stone-100` |
| Subtítulo | `text-sm text-stone-400` |
| Nome startup | `text-lg font-semibold text-stone-100` |
| Segmento | `text-sm text-stone-400` |
| Badge Aprovada | `bg-green-600/20 text-green-400` |
| Badge Em análise | `bg-yellow-600/20 text-yellow-400` |
| Badge Rejeitada | `bg-red-600/20 text-red-400` |
| Badge Campanha Aberto | `bg-blue-600/20 text-blue-400` |
| Badge Campanha Financiado | `bg-purple-600/20 text-purple-400` |
| Progress bar | `bg-stone-700` com fill `bg-[#d500f9]` |
| Botão criar | `bg-[#d500f9] hover:bg-[#b000d4] text-white` |
| Botão ver | `bg-stone-800 hover:bg-stone-700 text-stone-100` |
| Botão editar | `border border-stone-700 hover:bg-stone-800` |

### 5.3 Responsividade

| Breakpoint | Layout |
|------------|--------|
| Desktop (`≥ 1024px`) | Cards em 2 colunas ou tabela |
| Tablet (`768px - 1023px`) | Cards em 1 coluna |
| Mobile (`< 768px`) | Cards horizontais empilhados |

### 5.4 Toggle Cards/Tabela

```typescript
interface ViewToggleProps {
  viewMode: 'cards' | 'table';
  onChange: (mode: 'cards' | 'table') => void;
}
```

## 6. Estados e Feedbacks

### 6.1 Loading

| Estado | Comportamento |
|--------|---------------|
| Carregando lista | Skeleton cards (3 itens) |
| Aplicando filtro | Spinner inline |
| Mudando página | Fade out/in na lista |

### 6.2 Estados de Erro

| Erro | Mensagem | Ação |
|------|----------|------|
| Falha ao carregar | "Não foi possível carregar suas startups" | Botão "Tentar novamente" |
| Sem permissão | "Você precisa do plano Fundador" | Botão "Ver planos" |
| Timeout | "Conexão lenta" | Retry automático |

### 6.3 Feedbacks de Ação

| Ação | Feedback |
|------|----------|
| Filtro aplicado | Lista atualiza instantaneamente |
| Busca | Debounce 300ms + loading |
| Ordenação | Indicador de coluna ordenada |

## 7. Fluxo de Navegação

```
┌─────────────────┐     ┌─────────────────┐
│  Dashboard      │────▶│  Ver detalhes   │
│  Startups       │     │  /startup/:id   │
└─────────────────┘     └─────────────────┘
        │
        │──────────────▶┌─────────────────┐
        │               │  Editar         │
        │               │  /dashboard/    │
        │               │  startups/:id   │
        │               └─────────────────┘
        │
        └──────────────▶┌─────────────────┐
                        │  Criar          │
                        │  /dashboard/    │
                        │  startups/create│
                        └─────────────────┘
```

## 8. Acessibilidade

| Requisito | Implementação |
|-----------|---------------|
| Focus visible | `focus-visible:ring-2 focus-visible:ring-[#d500f9]` |
| Navegação teclado | Tab entre cards/linhas, Enter para ação |
| Screen readers | `aria-label` em badges e ações |
| Tabela | `role="table"`, `scope="col"` nos headers |
| Status | `aria-live="polite"` para atualizações |

```tsx
// Exemplo de card acessível
<article
  role="article"
  aria-label={`Startup ${startup.nome}`}
  tabIndex={0}
>
  <Badge aria-label={`Status: ${startup.status}`}>
    {startup.status}
  </Badge>
</article>
```

## 9. Critérios de Aceitação

- [ ] Lista carrega startups do usuário logado
- [ ] Filtro por status funciona corretamente
- [ ] Filtro por campanha funciona corretamente
- [ ] Busca por nome/segmento funciona
- [ ] Toggle cards/tabela persiste preferência
- [ ] Cards exibem todas as informações
- [ ] Barra de progresso reflete % vendido
- [ ] Badges com cores corretas por status
- [ ] Botão "Ver detalhes" redireciona
- [ ] Botão "Editar" redireciona
- [ ] Botão "Criar startup" redireciona
- [ ] Estado vazio exibe CTA
- [ ] Paginação funciona
- [ ] Responsivo em mobile
- [ ] Verifica plano fundador no acesso

## 10. Notas Técnicas

- Cache de 2 minutos para lista de startups
- Debounce de 300ms na busca
- Preferência de visualização em `localStorage`
- Usar `Intl.NumberFormat` para números
- Lazy loading de logos
- Skeleton com mesma altura dos cards

## 11. Referências Cruzadas

| Documento | Relação |
|-----------|---------|
| [07-layout.md](./07-layout.md) | Layout pai com sidebar |
| [12-create-startup.md](./12-create-startup.md) | Criar nova startup |
| [13-update-startup.md](./13-update-startup.md) | Editar startup |
| [02-startup-detail.md](./02-startup-detail.md) | Ver detalhes |
| [15-special-functions.md](./15-special-functions.md) | Validação de plano |
| [css_padrão.md](../css_padrão.md) | Design tokens |
| [SPEC/11-dashboard-startups.md](../SPEC/11-dashboard-startups.md) | Especificação técnica |
