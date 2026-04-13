# Documentação Técnica - Homepage iSelfToken

## Informações Gerais

| Propriedade | Valor |
|-------------|-------|
| **Rota** | `/` |
| **Path** | `/app/routes/page/index/index.tsx` |
| **Componentes Únicos** | `/app/routes/page/index/components/index.tsx` |
| **API Route** | `ApiPage.get()`, `ApiPage.depoimentos()`, `ApiPage.fundadores()` |
| **Tipo** | Pública |
| **Framework** | React + Tailwind CSS v4 |
| **Tema** | Dark (padrão) com suporte a Light |
| **Design System** | shadcn/ui (tema stone) |

---

## Componentes shadcn/ui Recomendados

```bash
# Hero Section
npx shadcn add @tailark/hero-section-4

# Theme Toggler (Light/Dark)
npx shadcn@latest add @magicui/animated-theme-toggler
```

---

## Dependências

### Ícones (Lucide React)

```jsx
import { 
  ChevronLeft, 
  ChevronRight, 
  Globe, 
  Linkedin, 
  Youtube, 
  ExternalLink, 
  Zap, 
  Shield, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  Clock, 
  Rocket, 
  Briefcase, 
  GraduationCap, 
  Cpu, 
  Database, 
  MoreHorizontal 
} from 'lucide-react';
```

---

## Estrutura da Página

A homepage é composta por **10 seções principais**:

1. [Header](#1-header)
2. [Hero Section](#2-hero-section)
3. [Rodadas de Captação](#3-rodadas-de-captação)
4. [Como Funciona (Call to Action)](#4-como-funciona-call-to-action)
5. [Startups Verificadas](#5-startups-verificadas)
6. [Startups Aceleradas](#6-startups-aceleradas)
7. [Startups em Fase de Aprovação](#7-startups-em-fase-de-aprovação)
8. [Oportunidades de Investimento](#8-oportunidades-de-investimento)
9. [Depoimentos](#9-depoimentos)
10. [Footer](#10-footer)

---

## 1. Header

### Descrição
Header fixo minimalista com navegação principal.

### Características
- **Posição**: Fixo no topo (`fixed top-0`)
- **Background**: Semi-transparente com blur (`bg-stone-950/80 backdrop-blur-lg`)
- **Altura**: 64px (`h-16`)
- **Borda inferior**: Sutil (`border-b border-stone-800/50`)

### Elementos

| Elemento | Posição | Descrição |
|----------|---------|-----------|
| Logo "iSelfToken" | Esquerda | Cor da marca `#d500f9` (magenta/roxo) |
| Seletor de Idioma | Direita | Ícone Globe + código do país (ex: "BR") |
| Botão "Entrar" | Direita | Botão secundário com borda |

### Código de Referência
```jsx
<header className="fixed top-0 left-0 right-0 z-50 bg-stone-950/80 backdrop-blur-lg border-b border-stone-800/50">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between h-16">
      <span className="text-xl font-bold" style={{ color: '#d500f9' }}>iSelfToken</span>
      {/* ... botões */}
    </div>
  </div>
</header>
```

---

## 2. Hero Section

### Descrição
Seção principal de apresentação com título impactante e CTAs.

### Layout
- **Padding top**: 128px (para compensar header fixo)
- **Container**: Máximo 6xl, centralizado
- **Background**: Gradientes decorativos e blurs coloridos

### Tipografia

| Elemento | Mobile | Desktop | Peso | Cor |
|----------|--------|---------|------|-----|
| "iSelfToken" | `text-9xl` (128px) | `text-[16rem]` (256px) | Bold (700) | `#d500f9` |
| "Crowdfunding" | `text-6xl` (60px) | `text-9xl` (128px) | Bold (700) | `stone-400` |
| Frase de valor | `text-xl` | `text-2xl` | Medium (500) | `stone-200` |
| Texto de apoio | `text-lg` | `text-lg` | Normal (400) | `stone-400` |

### Botões de Ação (CTAs)

| Botão | Cor | Ícone | Rota Sugerida |
|-------|-----|-------|---------------|
| "Captar Investimento" | Gradiente fuchsia (`from-fuchsia-600 to-fuchsia-500`) | Rocket | `/captacao` |
| "Comece a Investir" | Azul (`blue-600`) | TrendingUp | `/investimento/all` |

### Efeitos Visuais
- Gradiente de fundo: `from-blue-600/5 via-transparent to-transparent`
- Blur fuchsia: Posição esquerda superior
- Blur azul: Posição direita

---

## 3. Rodadas de Captação

### Descrição
Carousel 3D com perspectiva exibindo startups em rodadas de captação ativas.

### Componente: `Carousel3D`

#### Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `children` | ReactNode | - | Cards a serem exibidos |
| `title` | string | - | Título da seção |
| `cardHeight` | number | 600 | Altura do container em pixels |
| `cardSpacing` | number | 320 | Espaçamento entre cards |

#### Características
- **Perspectiva 3D**: `perspective: 1200px`
- **Rotação**: Cards laterais rotacionam em Y (`rotateY`)
- **Escala**: Cards laterais reduzem proporcionalmente
- **Opacidade**: Diminui conforme distância do centro
- **Brilho**: Diminui conforme distância do centro
- **Loop infinito**: Navegação circular
- **Indicadores**: Pontos clicáveis na parte inferior

#### Navegação
- Botões de seta (esquerda/direita)
- Clique direto nos cards laterais
- Clique nos indicadores

### Componente: `RodadaCard`

Card grande para rodadas de captação ativas.

#### Dimensões
- **Largura**: 360px (min e max)
- **Altura total**: ~550px

#### Estrutura do Card

```
┌─────────────────────────────────────┐
│ [Imagem 176px]                      │
│ ┌─────────┐            ┌──────────┐ │
│ │ Badges  │            │ Categoria│ │
│ └─────────┘            └──────────┘ │
│                        ┌──────────┐ │
│                        │ Deadline │ │
│                        └──────────┘ │
├─────────────────────────────────────┤
│ Nome da Startup (xl, bold)          │
│ Descrição (sm, 2 linhas)            │
│                                     │
│ ┌───────────┐ ┌───────────┐         │
│ │ Equity    │ │ Valuation │         │
│ │ Ofertado  │ │           │         │
│ └───────────┘ └───────────┘         │
│                                     │
│ Progresso da Rodada          XX%    │
│ [████████████░░░░░░░░]              │
│ XXXX tokens vendidos    Meta: XXXXX │
│                                     │
│ ─────────────────────────────────── │
│ 👥 XXX investidores     Mín. R$ XXX │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │      Investir Agora      →      │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### Campos de Dados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | number | Identificador único |
| `name` | string | Nome da startup |
| `description` | string | Descrição breve |
| `image` | string | URL da imagem de capa |
| `valuation` | string | Percentual de equity ofertado |
| `currentValue` | string | Valuation atual (ex: "R$ 4.2M") |
| `totalTokens` | number | Total de tokens da rodada |
| `soldTokens` | number | Tokens já vendidos |
| `badges` | string[] | Selos (Verificada, Top Pick, etc.) |
| `minInvestment` | string | Investimento mínimo |
| `deadline` | string | Dias restantes |
| `investors` | number | Número de investidores |
| `category` | string | Categoria (FinTech, HealthTech, etc.) |

#### Indicador de Urgência
- Deadline ≤ 5 dias: Background vermelho (`bg-red-500/90`)
- Deadline > 5 dias: Background escuro transparente

#### Barra de Progresso
- Background: `stone-800`
- Preenchimento: Gradiente azul (`from-blue-600 via-blue-500 to-blue-400`)
- Efeito: Animação de pulse com overlay branco

---

## 4. Como Funciona (Call to Action)

### Descrição
Seção explicativa com dois cards lado a lado para diferentes públicos.

### Layout
- **Grid**: 2 colunas no desktop, 1 coluna no mobile
- **Gap**: 24px (lg:32px)
- **Max-width**: 5xl centralizado

### Background Decorativo
- Gradiente vertical
- Linhas horizontais (topo e fundo)
- Blurs coloridos nos cantos

### Card "Para Fundadores"

| Propriedade | Valor |
|-------------|-------|
| Cor do ícone | Gradiente fuchsia |
| Cor da borda (hover) | `fuchsia-500/50` |
| Cor do botão | Gradiente fuchsia |
| Ícone | Rocket |

**Benefícios listados:**
1. Processo 100% digital e simplificado
2. Acesso a investidores globais
3. Suporte jurídico e regulatório

### Card "Para Investidores"

| Propriedade | Valor |
|-------------|-------|
| Cor do ícone | Gradiente azul |
| Cor da borda (hover) | `blue-500/50` |
| Cor do botão | Gradiente azul |
| Ícone | TrendingUp |

**Benefícios listados:**
1. Startups verificadas e curadas
2. Investimento mínimo acessível
3. Liquidez através de tokens

### Efeitos nos Cards
- Hover: Borda colorida + glow interno
- Transição: 500ms
- Sombra no botão que aumenta no hover

---

## 5. Startups Verificadas

### Descrição
Carousel 3D com startups que passaram pelo processo de verificação.

### Configuração do Carousel

| Prop | Valor |
|------|-------|
| `cardHeight` | 320px |
| `cardSpacing` | 300px |

### Componente: `MediumCard`

Card médio para listagem de startups.

#### Dimensões
- **Largura**: 280px (min e max)

#### Estrutura

```
┌─────────────────────────────────┐
│ ┌────┐                          │
│ │ X  │  (Inicial do nome)       │
│ └────┘                          │
│                                 │
│ Nome da Startup (lg, semibold)  │
│ Descrição (sm, 2 linhas)        │
│                                 │
│ ┌─────────┐ ┌─────────┐         │
│ │ Badge 1 │ │ Badge 2 │         │
│ └─────────┘ └─────────┘         │
│                                 │
│ Categoria          Ver mais →   │
└─────────────────────────────────┘
```

#### Campos de Dados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | number | Identificador único |
| `name` | string | Nome da startup |
| `description` | string | Descrição breve |
| `category` | string | Categoria/segmento |
| `badges` | string[] | Selos de verificação |

---

## 6. Startups Aceleradas

### Descrição
Carousel 3D com startups em programa de aceleração.

### Configuração do Carousel

| Prop | Valor |
|------|-------|
| `cardHeight` | 320px |
| `cardSpacing` | 300px |

### Card Utilizado
`MediumCard` (mesmo componente das Verificadas)

### Background da Seção
`bg-stone-900/30` (levemente diferenciado)

---

## 7. Startups em Fase de Aprovação

### Descrição
Carousel 3D com startups aguardando aprovação na plataforma.

### Configuração do Carousel

| Prop | Valor |
|------|-------|
| `cardHeight` | 320px |
| `cardSpacing` | 300px |

### Card Utilizado
`MediumCard` (mesmo componente)

### Badge Específico
- "Em Aprovação": Cor amber/warning (`bg-amber-600/20 text-amber-400`)

---

## 8. Oportunidades de Investimento

### Descrição
Grid de cards com filtro por categoria.

### Layout
- **Grid**: 1 coluna (mobile) → 2 colunas (sm) → 3 colunas (lg) → 4 colunas (xl)
- **Gap**: 16px

### Filtros Disponíveis

| Key | Label |
|-----|-------|
| `all` | Todas |
| `fintech` | FinTech |
| `healthtech` | HealthTech |
| `edtech` | EdTech |
| `tech-ia` | Tech / IA |
| `saas` | SaaS |
| `outros` | Outros |

### Comportamento dos Filtros
- Clique no filtro → Navega para `/investimento/:filter`
- Filtro ativo: `bg-blue-600 text-white`
- Filtro inativo: `bg-stone-800 text-stone-400` com borda

### Componente: `OportunidadeCard`

Card compacto para grid de oportunidades.

#### Estrutura

```
┌─────────────────────────────────┐
│ ┌────┐                          │
│ │Icon│  (Ícone da categoria)    │
│ └────┘                          │
│                                 │
│ Nome da Startup (base, semibold)│
│ Tipo (sm, stone-500)            │
│                                 │
│ Ver mais →                      │
└─────────────────────────────────┘
```

#### Ícones por Categoria

| Categoria | Ícone |
|-----------|-------|
| FinTech | Briefcase |
| HealthTech | Shield |
| EdTech | GraduationCap |
| Tech / IA | Cpu |
| SaaS | Database |
| Outros | MoreHorizontal |

---

## 9. Depoimentos

### 9.1 Depoimentos de Investidores

#### Configuração do Carousel

| Prop | Valor |
|------|-------|
| `cardHeight` | 280px |
| `cardSpacing` | 340px |

#### Componente: `DepoimentoInvestidorCard`

```
┌─────────────────────────────────────┐
│ "Texto do depoimento em itálico     │
│  entre aspas..."                    │
│                                     │
│ ┌────┐                              │
│ │ XX │  Nome do Investidor          │
│ └────┘  Investidor/Investidora      │
└─────────────────────────────────────┘
```

#### Campos de Dados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | number | Identificador único |
| `text` | string | Texto do depoimento |
| `name` | string | Nome completo |
| `role` | string | "Investidor" ou "Investidora" |
| `initials` | string | Iniciais para o avatar |

#### Avatar
- Gradiente azul (`from-blue-600 to-blue-400`)
- Formato circular
- Iniciais em branco

### 9.2 Depoimentos de Fundadores

#### Configuração do Carousel

| Prop | Valor |
|------|-------|
| `cardHeight` | 320px |
| `cardSpacing` | 340px |

#### Componente: `DepoimentoFundadorCard`

```
┌─────────────────────────────────────┐
│ "Texto do depoimento em itálico     │
│  entre aspas..."                    │
│                                     │
│ ┌────┐                    ┌─┐┌─┐┌─┐ │
│ │ XX │  Nome do Fundador  │in││▶││🔗││
│ └────┘  CEO, Empresa      └─┘└─┘└─┘ │
└─────────────────────────────────────┘
```

#### Campos de Dados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | number | Identificador único |
| `text` | string | Texto do depoimento |
| `name` | string | Nome completo |
| `role` | string | Cargo e empresa (ex: "CEO, TechFlow") |
| `initials` | string | Iniciais para o avatar |
| `linkedin` | string | URL do LinkedIn |
| `youtube` | string | URL do YouTube |
| `website` | string | URL do site |

#### Avatar
- Gradiente fuchsia (`from-fuchsia-600 to-fuchsia-400`)
- Formato circular
- Iniciais em branco

#### Ícones Sociais
- LinkedIn, YouTube, ExternalLink (website)
- Hover: Background `stone-800`, cor mais clara

---

## 10. Footer

### Layout
- **Grid**: 4 colunas (desktop) → 2 colunas (tablet) → 1 coluna (mobile)
- **Gap**: 40px

### Colunas

#### Coluna 1 - Marca
- Logo "iSelfToken" em `#d500f9`
- Texto descritivo sobre a plataforma

#### Coluna 2 - Plataforma
Links:
- Para Investidores
- Para Projetos
- iSelfToken Education

#### Coluna 3 - Legal
Links:
- Termos de Uso
- Privacidade

#### Coluna 4 - Contato
- Email: contato@iselftoken.com
- Telefone: +55 11 9999-9999

### Linha Inferior
- Separador: `border-t border-stone-800`
- Copyright centralizado: "© 2026 iSelfToken. Todos os direitos reservados."

---

## Componente: Badge

Componente reutilizável para exibir selos/tags.

### Variantes de Cor

| Badge | Variante | Background | Texto | Borda |
|-------|----------|------------|-------|-------|
| Verificada | success | `green-600/20` | `green-400` | `green-500/30` |
| Top Pick | brand | `fuchsia-600/20` | `fuchsia-400` | `fuchsia-500/30` |
| Acelerada | primary | `blue-600/20` | `blue-400` | `blue-500/30` |
| ESG | success | `green-600/20` | `green-400` | `green-500/30` |
| Em Aprovação | warning | `amber-600/20` | `amber-400` | `amber-500/30` |
| Compliance | success | `green-600/20` | `green-400` | `green-500/30` |
| B2B | default | `stone-800` | `stone-300` | `stone-700` |
| Hardware | default | `stone-800` | `stone-300` | `stone-700` |

---

## Paleta de Cores

### Cores da Marca

| Token | Valor | Uso |
|-------|-------|-----|
| Brand | `#d500f9` | Logo, elementos de destaque |
| Primary | `#2563eb` (blue-600) | Botões, links, ações |
| Primary Light | `#eff6ff` (blue-50) | Fundos, hovers |
| Primary Dark | `#1d4ed8` (blue-700) | Estados pressed |

### Cores Neutras (Tema Dark)

| Elemento | Classe Tailwind | Hex |
|----------|-----------------|-----|
| Background | `stone-950` | `#0c0a09` |
| Card/Surface | `stone-900` | `#1c1917` |
| Borda | `stone-800` | `#292524` |
| Texto Secundário | `stone-400` | `#a8a29e` |
| Texto Principal | `stone-50` | `#fafaf9` |

### Cores Semânticas

| Status | Classe | Uso |
|--------|--------|-----|
| Sucesso | `green-500` | Confirmações, verificações |
| Aviso | `amber-500` | Alertas, pendências |
| Erro | `red-500` | Erros, urgência |
| Info | `blue-500` | Informações |

---

## Responsividade

### Breakpoints

| Breakpoint | Min Width | Prefixo |
|------------|-----------|---------|
| Mobile | 0px | (base) |
| sm | 640px | `sm:` |
| md | 768px | `md:` |
| lg | 1024px | `lg:` |
| xl | 1280px | `xl:` |
| 2xl | 1536px | `2xl:` |

### Comportamento por Seção

| Seção | Mobile | Tablet | Desktop |
|-------|--------|--------|---------|
| Hero (título) | text-9xl | - | text-[16rem] |
| Como Funciona | 1 coluna | - | 2 colunas |
| Oportunidades | 1 coluna | 2 colunas | 4 colunas |
| Footer | 1 coluna | 2 colunas | 4 colunas |
| Carousels | Touch scroll | Botões | Botões |

---

## Animações e Transições

### Transições Globais
- Duração padrão: `duration-200` a `duration-500`
- Easing: `ease-out`

### Efeitos Específicos

| Componente | Efeito | Propriedade |
|------------|--------|-------------|
| Cards | Hover border | `hover:border-stone-600` |
| Imagens | Zoom | `group-hover:scale-105` |
| Botões | Sombra | `hover:shadow-*-500/40` |
| Carousel | Perspectiva 3D | `rotateY`, `scale`, `opacity` |
| Progress bar | Pulse | `animate-pulse` |
| Seta do botão | Translate | `group-hover/btn:translate-x-1` |

---

## Rotas Relacionadas

| Ação | Rota |
|------|------|
| Ver detalhes da startup | `/startup/:id` |
| Captar investimento | `/captacao` |
| Investir | `/investimento/all` |
| Filtrar oportunidades | `/investimento/:filter` |

---

## Dados Mock (Desenvolvimento)

### Quantidade de Itens

| Seção | Quantidade |
|-------|------------|
| Rodadas de Captação | 8 startups |
| Startups Verificadas | 4 startups |
| Startups Aceleradas | 4 startups |
| Startups em Aprovação | 3 startups |
| Oportunidades | 16 startups |
| Depoimentos Investidores | 6 depoimentos |
| Depoimentos Fundadores | 6 depoimentos |

---

## Checklist de Implementação

- [ ] Configurar Tailwind CSS v4 com tema stone
- [ ] Instalar componentes shadcn/ui necessários
- [ ] Implementar componente `Carousel3D`
- [ ] Implementar componente `Badge`
- [ ] Implementar `RodadaCard`
- [ ] Implementar `MediumCard`
- [ ] Implementar `OportunidadeCard`
- [ ] Implementar `DepoimentoInvestidorCard`
- [ ] Implementar `DepoimentoFundadorCard`
- [ ] Conectar APIs de dados
- [ ] Implementar navegação entre rotas
- [ ] Testar responsividade
- [ ] Testar acessibilidade (contraste, foco visível)
- [ ] Otimizar imagens
- [ ] Implementar lazy loading nos carousels

---

## Notas de Acessibilidade

- Contraste mínimo de texto: 4.5:1
- Focus visible em elementos interativos
- Navegação por teclado nos carousels
- Alt text nas imagens
- Roles ARIA quando necessário
- Indicadores visuais de estado (hover, focus, active)
