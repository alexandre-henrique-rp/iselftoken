# PRD — Home Privada (08-home)

## 1. Visão Geral

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Marketplace privado com banners rotativos e seções de startups categorizadas |
| **Rota** | `/home` |
| **Path** | `app/routes/private/home/index.tsx` |
| **Componentes** | `app/routes/private/home/components/index.tsx` |
| **APIs** | `PrivateApi.home()`, `ApiPage.getBanner()` |
| **Tipo** | Private (requer autenticação) |
| **Design System** | Tailwind CSS v4 + shadcn/ui (tema stone) |

## 2. Dependências

### 2.1 APIs Utilizadas
```typescript
// app/api/privateApi.ts
PrivateApi.home(): Promise<HomePrivadaResponse>

// app/api/pageapi.ts
ApiPage.getBanner(): Promise<Banner[]>
```

### 2.2 Contextos
- `AuthContext` — verificação de autenticação
- `UserContext` — dados do usuário logado

### 2.3 Componentes UI
- `Carousel` — carrosséis de startups
- `Card` — cards de startup
- `Skeleton` — loading states
- `Badge` — selos de status

## 3. Requisitos Funcionais

### 3.1 Header Interno

| Elemento | Descrição | Comportamento |
|----------|-----------|---------------|
| Logo | iSelfToken à esquerda | Click → `/home` |
| Busca | Input com ícone de lupa | Filtra startups em tempo real |
| Perfil | Avatar do usuário | Click → `/perfil` |
| Notificações | Ícone de sino com badge | Click → dropdown de notificações |
| Logout | Ícone de saída | Click → logout com confirmação |

```typescript
interface HeaderProps {
  user: {
    nome: string;
    avatar?: string;
  };
  notificationCount: number;
  onSearch: (query: string) => void;
  onLogout: () => void;
}
```

### 3.2 Banner Rotativo

| Propriedade | Valor |
|-------------|-------|
| Intervalo de rotação | 5 segundos |
| Navegação manual | Não (apenas automática) |
| Indicadores | Barra de progresso por banner |
| Largura | 95% do container |
| Alinhamento | Centralizado |
| Altura | 300px desktop / 200px mobile |
| Transição | Fade com duração de 500ms |

```typescript
interface Banner {
  id: string;
  titulo: string;
  subtitulo?: string;
  imagemUrl: string;
  linkDestino?: string;
  ordem: number;
  ativo: boolean;
}

interface BannerCarouselProps {
  banners: Banner[];
  autoPlayInterval?: number; // default: 5000ms
}
```

**Comportamento do Banner:**
1. Carregar banners via `ApiPage.getBanner()`
2. Filtrar apenas `ativo === true`
3. Ordenar por campo `ordem`
4. Iniciar rotação automática
5. Pausar rotação no hover (desktop)
6. Reiniciar rotação ao sair do hover

### 3.3 Seções de Startups

| Seção | Selo | Layout | Dados |
|-------|------|--------|-------|
| Rodadas de Captação | `captacao` | Carousel | Startups com captação ativa |
| Startups Verificadas | `verificada` | Carousel | Badge verde de verificação |
| Startups Aceleradas | `acelerada` | Carousel | Badge dourado de aceleração |
| Startups em Aprovação | `aprovacao` | Carousel | Badge cinza de análise |
| Oportunidades | — | Grid 4x4 | Todas as startups disponíveis |

```typescript
interface StartupCard {
  id: string;
  nome: string;
  descricao: string;
  logoUrl: string;
  imagemCapa: string;
  categoria: string;
  segmento: string;
  selo: 'captacao' | 'verificada' | 'acelerada' | 'aprovacao' | null;
  valuationOfertado?: number;
  metaCaptacao?: number;
  valorCaptado?: number;
  percentualVendido?: number;
}

interface SecaoStartups {
  titulo: string;
  subtitulo?: string;
  tipo: 'carousel' | 'grid';
  selo: string | null;
  startups: StartupCard[];
}
```

### 3.4 Cards de Startup

| Elemento | Descrição |
|----------|-----------|
| Imagem | Logo ou capa da startup (aspect-ratio 16:9) |
| Nome | Título principal em bold |
| Categoria | Tag secundária com cor |
| Selo | Badge conforme seção |
| Progresso | Barra de captação (se aplicável) |
| CTA | Botão "Ver mais" |

```typescript
interface StartupCardProps {
  startup: StartupCard;
  showProgress?: boolean;
  onView: (id: string) => void;
}
```

**Dimensões do Card:**
- Desktop: `280px × 320px`
- Tablet: `240px × 280px`
- Mobile: `100% × auto`

### 3.5 Carousel de Startups

| Propriedade | Valor |
|-------------|-------|
| Items visíveis (desktop) | 4 |
| Items visíveis (tablet) | 2 |
| Items visíveis (mobile) | 1 |
| Navegação | Setas laterais |
| Scroll | Suave (smooth scroll) |
| Touch | Swipe habilitado |

```typescript
interface CarouselSecaoProps {
  titulo: string;
  startups: StartupCard[];
  onViewAll?: () => void;
}
```

### 3.6 Grid de Oportunidades

| Propriedade | Valor |
|-------------|-------|
| Colunas (desktop) | 4 |
| Colunas (tablet) | 2 |
| Colunas (mobile) | 1 |
| Gap | 24px |
| Items por página | 16 |
| Paginação | Botão "Carregar mais" |

## 4. Estruturas de Dados

### 4.1 Resposta da API Home

```typescript
interface HomePrivadaResponse {
  banners: Banner[];
  secoes: {
    captacao: StartupCard[];
    verificadas: StartupCard[];
    aceleradas: StartupCard[];
    aprovacao: StartupCard[];
    oportunidades: StartupCard[];
  };
  totalStartups: number;
  ultimaAtualizacao: string;
}
```

### 4.2 Exemplo de Resposta

```json
{
  "banners": [
    {
      "id": "banner-001",
      "titulo": "Nova rodada de captação",
      "subtitulo": "Invista em startups inovadoras",
      "imagemUrl": "/banners/captacao-2024.jpg",
      "linkDestino": "/startup/techflow",
      "ordem": 1,
      "ativo": true
    }
  ],
  "secoes": {
    "captacao": [
      {
        "id": "startup-001",
        "nome": "TechFlow",
        "descricao": "Soluções em automação",
        "logoUrl": "/logos/techflow.png",
        "imagemCapa": "/capas/techflow.jpg",
        "categoria": "Tecnologia",
        "segmento": "SaaS B2B",
        "selo": "captacao",
        "metaCaptacao": 500000,
        "valorCaptado": 250000,
        "percentualVendido": 50
      }
    ],
    "verificadas": [],
    "aceleradas": [],
    "aprovacao": [],
    "oportunidades": []
  },
  "totalStartups": 24,
  "ultimaAtualizacao": "2024-01-15T10:30:00Z"
}
```

## 5. Requisitos de UI/UX

### 5.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo]        [Busca]           [Perfil] [Notif] [Logout]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  BANNER ROTATIVO                       │  │
│  │                    (95% width)                         │  │
│  │  ○ ○ ● ○ ○  (indicadores)                             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Rodadas de Captação                          [Ver todos]   │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                          │
│  │Card │ │Card │ │Card │ │Card │  ◀ ▶                     │
│  └─────┘ └─────┘ └─────┘ └─────┘                          │
│                                                             │
│  Startups Verificadas                         [Ver todos]   │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                          │
│  │Card │ │Card │ │Card │ │Card │  ◀ ▶                     │
│  └─────┘ └─────┘ └─────┘ └─────┘                          │
│                                                             │
│  Oportunidades de Investimento                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                          │
│  │Card │ │Card │ │Card │ │Card │                          │
│  ├─────┤ ├─────┤ ├─────┤ ├─────┤                          │
│  │Card │ │Card │ │Card │ │Card │                          │
│  └─────┘ └─────┘ └─────┘ └─────┘                          │
│                                                             │
│              [Carregar mais]                                │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Cores e Estilos

| Elemento | Classe Tailwind |
|----------|-----------------|
| Background | `bg-stone-950` |
| Card background | `bg-stone-900` |
| Card hover | `hover:bg-stone-800` |
| Título seção | `text-stone-100 text-xl font-semibold` |
| Badge Captação | `bg-purple-600 text-white` |
| Badge Verificada | `bg-green-600 text-white` |
| Badge Acelerada | `bg-yellow-600 text-black` |
| Badge Aprovação | `bg-stone-600 text-white` |
| CTA Button | `bg-[#d500f9] hover:bg-[#b000d4] text-white` |

### 5.3 Responsividade

| Breakpoint | Comportamento |
|------------|---------------|
| `< 640px` | 1 coluna, header compacto |
| `640px - 1024px` | 2 colunas, sidebar colapsada |
| `> 1024px` | 4 colunas, layout completo |

## 6. Estados e Feedbacks

### 6.1 Loading

```typescript
interface LoadingState {
  banners: boolean;
  secoes: {
    captacao: boolean;
    verificadas: boolean;
    aceleradas: boolean;
    aprovacao: boolean;
    oportunidades: boolean;
  };
}
```

- Skeleton loader para banners (1 bloco)
- Skeleton loader para cada seção (4 cards por linha)
- Loading independente por seção

### 6.2 Estados de Erro

| Erro | Mensagem | Ação |
|------|----------|------|
| Falha no banner | "Não foi possível carregar os banners" | Botão "Tentar novamente" |
| Falha na seção | "Erro ao carregar startups" | Botão "Recarregar" |
| Timeout | "Conexão lenta" | Retry automático após 5s |

### 6.3 Estado Vazio

| Seção | Mensagem | CTA |
|-------|----------|-----|
| Captação | "Nenhuma rodada de captação ativa" | "Explorar startups" |
| Verificadas | "Nenhuma startup verificada" | — |
| Oportunidades | "Nenhuma oportunidade disponível" | "Voltar em breve" |

## 7. Acessibilidade

| Requisito | Implementação |
|-----------|---------------|
| Navegação por teclado | Tab entre seções, Arrow keys no carousel |
| Focus visible | `focus-visible:ring-2 focus-visible:ring-[#d500f9]` |
| Alt text | Todas as imagens com descrição |
| ARIA labels | `aria-label` nos botões de navegação |
| Landmarks | `<main>`, `<nav>`, `<section>` semânticos |
| Contrast | Mínimo 4.5:1 para texto |

## 8. Critérios de Aceitação

- [ ] Banner rotativo funciona com intervalo de 5 segundos
- [ ] Banner pausa no hover e retoma ao sair
- [ ] Carrosséis navegam com setas e touch/swipe
- [ ] Cards exibem selo correto conforme seção
- [ ] Busca filtra startups em tempo real
- [ ] Grid responsivo (4→2→1 colunas)
- [ ] Loading skeleton durante carregamento
- [ ] Erro exibe mensagem com retry
- [ ] Estado vazio exibe CTA apropriado
- [ ] Navegação por teclado funcional
- [ ] Click em "Ver mais" redireciona para `/startup/:id`

## 9. Notas Técnicas

- Usar `IntersectionObserver` para lazy loading de imagens
- Cache de 5 minutos para dados de startups
- Prefetch de imagens do próximo banner
- Debounce de 300ms na busca
- Evitar re-render desnecessário com `useMemo` nas listas

## 10. Referências Cruzadas

| Documento | Relação |
|-----------|---------|
| [07-layout.md](./07-layout.md) | Layout pai com sidebar |
| [02-startup-detail.md](./02-startup-detail.md) | Destino do "Ver mais" |
| [css_padrão.md](../css_padrão.md) | Design tokens |
| [SPEC/08-home.md](../SPEC/08-home.md) | Especificação técnica |
