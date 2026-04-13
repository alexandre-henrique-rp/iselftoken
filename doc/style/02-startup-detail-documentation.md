# Documentação Técnica - Página de Detalhes da Startup

## Informações Gerais

| Propriedade | Valor |
|-------------|-------|
| **Rota** | `/startup/:id` |
| **Path** | `/app/routes/page/startup/index.tsx` |
| **Componentes Únicos** | `/app/routes/page/startup/components/index.tsx` |
| **API Route** | `ApiPage.StartupIdPublic()` |
| **Tipo** | Pública (com conteúdo protegido) |
| **Framework** | React + Tailwind CSS v4 |
| **Tema** | Dark (padrão) com suporte a Light |
| **Design System** | shadcn/ui (tema stone) |

---

## Dependências

### Ícones (Lucide React)

```jsx
import { 
  ChevronRight, 
  Globe, 
  Share2, 
  Download, 
  FileText, 
  Play,
  Users,
  TrendingUp,
  Target,
  Award,
  AlertTriangle,
  MessageSquare,
  Image,
  HelpCircle,
  Calendar,
  Quote,
  Folder,
  ExternalLink,
  Lock,
  X,
  Linkedin,
  Twitter,
  Facebook,
  Link2,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  BarChart3,
  Zap,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  Send,
  Heart
} from 'lucide-react';
```

### Hooks React

```jsx
import React, { useState, useRef, useEffect } from 'react';
```

---

## Estrutura da Página

A página é composta por **16 seções principais**, divididas em conteúdo **público** e **protegido**:

### Conteúdo Público (sem login)
1. [Header](#1-header)
2. [Hero da Oferta](#2-hero-da-oferta)
3. [Apresentação aos Investidores](#3-apresentação-aos-investidores)

### Conteúdo Protegido (requer login)
4. [Resumo/Análise da Oferta](#4-resumoanálise-da-oferta)
5. [O Negócio](#5-o-negócio)
6. [Realizações (Métricas)](#6-realizações-métricas)
7. [Mercado Potencial](#7-mercado-potencial)
8. [Metas com Investimento](#8-metas-com-investimento)
9. [Equipe Executiva](#9-equipe-executiva)
10. [Fatores de Risco](#10-fatores-de-risco)
11. [Informações Essenciais](#11-informações-essenciais)
12. [Galeria](#12-galeria)
13. [FAQ](#13-faq)
14. [Atualizações/Novidades](#14-atualizaçõesnovidades)
15. [Depoimentos](#15-depoimentos)
16. [Documentos](#16-documentos)
17. [Comentários/Fórum](#17-comentáriosfórum)
18. [Investidores](#18-investidores)
19. [Footer](#19-footer)

---

## Sistema de Proteção de Conteúdo

### Componente: `ProtectedSection`

Wrapper que aplica blur e exibe modal de login quando o usuário não está autenticado.

#### Props

| Prop | Tipo | Descrição |
|------|------|-----------|
| `children` | ReactNode | Conteúdo a ser protegido |
| `isLocked` | boolean | Se `true`, aplica blur e mostra modal |

#### Comportamento

```
┌─────────────────────────────────────────────────────────────┐
│  CONTEÚDO PÚBLICO (Hero, Apresentação)                      │
│  ✓ Visível sem login                                        │
│  ✓ Sem blur                                                 │
│  ✓ Modal NÃO aparece                                        │
├─────────────────────────────────────────────────────────────┤
│  CONTEÚDO PROTEGIDO (Resumo em diante)                      │
│  ✗ Blur aplicado (blur-sm opacity-50)                       │
│  ✗ Seleção de texto desabilitada                            │
│  ✗ Modal flutuante aparece                                  │
├─────────────────────────────────────────────────────────────┤
│  FOOTER                                                      │
│  ✓ Visível sem login                                        │
│  ✓ Modal desaparece ao chegar aqui                          │
└─────────────────────────────────────────────────────────────┘
```

#### Lógica de Visibilidade do Modal

```javascript
// Modal aparece quando:
const hasEnteredSection = sectionTop < windowHeight / 2;  // Topo passou do meio da tela
const hasNotLeftSection = sectionBottom > headerOffset;    // Bottom ainda visível

setShowModal(hasEnteredSection && hasNotLeftSection);
```

#### Estilos Aplicados

| Estado | Classes |
|--------|---------|
| Conteúdo bloqueado | `blur-sm opacity-50 select-none` |
| Conteúdo liberado | Nenhuma classe adicional |

---

### Componente: `InnerAuthBanner`

Modal flutuante que solicita login/cadastro.

#### Características

| Propriedade | Valor |
|-------------|-------|
| Posição | `fixed` centralizado na viewport |
| Z-index | `z-[50]` |
| Largura máxima | `max-w-3xl` (768px) |
| Offset do header | `top: 80px` |
| Background | `bg-stone-900` sólido |
| Borda | `border border-stone-700` |
| Sombra | `shadow-2xl` |

#### Estrutura Visual

```
┌─────────────────────────────────────────────┐
│                    🔒                        │
│              (ícone Lock 32px)               │
│                                              │
│          Conteúdo Exclusivo                  │
│              (text-2xl bold)                 │
│                                              │
│   Faça login ou cadastre-se gratuitamente   │
│   para ver todos os detalhes desta oferta   │
│              (text-base stone-400)           │
│                                              │
│   ┌──────────────┐  ┌──────────────────┐    │
│   │    Entrar    │  │ Criar Conta Grátis│    │
│   │  (blue-600)  │  │   (stone-800)    │    │
│   └──────────────┘  └──────────────────┘    │
│                                              │
│   Cadastro rápido em menos de 2 minutos     │
│              (text-sm stone-500)             │
└─────────────────────────────────────────────┘
```

---

## 1. Header

### Descrição
Header fixo minimalista com navegação principal.

### Características

| Propriedade | Valor |
|-------------|-------|
| Posição | `fixed top-0` |
| Z-index | `z-50` |
| Background | `bg-stone-950/80 backdrop-blur-lg` |
| Altura | `h-16` (64px) |
| Borda | `border-b border-stone-800/50` |

### Elementos

| Elemento | Posição | Descrição |
|----------|---------|-----------|
| Logo "iSelfToken" | Esquerda | Link para home, cor `#d500f9` |
| Seletor de Idioma | Direita | Ícone Globe + "BR" |
| Botão "Cadastre-se" | Direita | `bg-blue-600` primário |

---

## 2. Hero da Oferta

### Descrição
Seção principal com informações da startup e card lateral de investimento.

### Layout

```
┌────────────────────────────────────┬─────────────────────┐
│  COLUNA ESQUERDA (flex-1)          │  COLUNA DIREITA     │
│                                    │  (400px, sticky)    │
│  • Breadcrumb                      │                     │
│  • Logo + Nome + Categoria         │  ┌─────────────────┐│
│  • Localização + Ano fundação      │  │ CARD DA OFERTA  ││
│  • Slogan (text-xl/2xl)            │  │                 ││
│  • Descrição                       │  │ • Valor captado ││
│  • Botões CTA                      │  │ • Meta          ││
│  • Links + Compartilhamento        │  │ • Progresso     ││
│                                    │  │ • Métricas      ││
│                                    │  │ • Botão Investir││
│                                    │  └─────────────────┘│
└────────────────────────────────────┴─────────────────────┘
```

### Breadcrumb

```
Home > Investir > [Nome da Startup]
```

### Informações da Startup

| Campo | Estilo |
|-------|--------|
| Logo | `w-16 h-16 rounded-xl` |
| Nome | `text-3xl md:text-4xl font-bold` |
| Categoria | Badge `bg-blue-600/20 text-blue-400` |
| Localização | Ícone MapPin + texto `stone-400` |
| Slogan | `text-xl md:text-2xl text-stone-200` |
| Descrição | `text-stone-400 leading-relaxed` |

### Botões de Ação

| Botão | Cor | Ícone |
|-------|-----|-------|
| Investir Agora | `bg-blue-600` + sombra | DollarSign |
| Falar com a Plataforma | `bg-green-600` | Phone |

### Links Auxiliares

| Link | Ícone |
|------|-------|
| Documento da Oferta (PDF) | FileText |
| Site Oficial | ExternalLink |

### Compartilhamento Social

| Rede | Ícone |
|------|-------|
| LinkedIn | Linkedin |
| Twitter | Twitter |
| Facebook | Facebook |
| Copiar Link | Link2 |

### Card da Oferta (Sticky)

Posição: `lg:sticky lg:top-24`

#### Estrutura

```
┌─────────────────────────────────────┐
│  Captação em andamento    ⏱ 12 dias │
├─────────────────────────────────────┤
│  R$ 630.000                         │
│  de R$ 840.000 (meta)               │
│                                     │
│  [████████████████░░░░░] 75%        │
├─────────────────────────────────────┤
│  Equity ofertado         15%        │
│  Valuation               R$ 4.2M    │
│  Investimento mínimo     R$ 100     │
│  Investimento máximo     R$ 50.000  │
│  Investidores            234        │
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │      💰 Investir Agora          ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

#### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `raised` | string | Valor já captado |
| `goal` | string | Meta da rodada |
| `equity` | string | Percentual de equity |
| `valuation` | string | Valuation atual |
| `minInvestment` | string | Investimento mínimo |
| `maxInvestment` | string | Investimento máximo |
| `investors` | number | Número de investidores |
| `deadline` | string | Dias restantes |

#### Barra de Progresso

```jsx
const progress = (soldTokens / totalTokens) * 100;

<div className="h-3 bg-stone-800 rounded-full overflow-hidden">
  <div 
    className="h-full bg-linear-to-r from-blue-600 to-blue-400 rounded-full"
    style={{ width: `${progress}%` }}
  />
</div>
```

---

## 3. Apresentação aos Investidores

### Descrição
Banner visual e métricas rápidas do negócio (conteúdo público).

### Banner Principal

| Propriedade | Valor |
|-------------|-------|
| Altura | `h-64 md:h-96` |
| Overlay | Gradiente `from-stone-950 via-stone-950/50 to-transparent` |
| Botão | "Assistir Pitch" com ícone Play |

### Métricas Rápidas

Grid 2x2 (mobile) ou 4x1 (desktop) com `MetricCard`:

| Métrica | Ícone | Cor |
|---------|-------|-----|
| MRR | DollarSign | green |
| Crescimento | TrendingUp | blue |
| Clientes | Users | purple |
| NPS | Zap | orange |

### Botão Download

```jsx
<button className="bg-stone-800 hover:bg-stone-700 border border-stone-700">
  <Download /> Baixar Apresentação Completa
</button>
```

---

## 4. Resumo/Análise da Oferta

### Descrição
Primeira seção protegida com texto explicativo do negócio.

### Características

| Propriedade | Valor |
|-------------|-------|
| Background | `bg-stone-900/30` |
| Ícone | BarChart3 (blue-400) |
| Título | "Resumo da Oferta" |

### Conteúdo

```jsx
<p className="text-stone-300 text-lg leading-relaxed whitespace-pre-line">
  {startup.businessSummary}
</p>
```

---

## 5. O Negócio

### Descrição
Detalhes sobre proposta de valor e diferenciais.

### Layout

Grid 2 colunas no desktop:

| Coluna | Conteúdo |
|--------|----------|
| Esquerda | Proposta de Valor (texto) |
| Direita | Lista de Diferenciais (com ícone Shield) |

### Lista de Diferenciais

```jsx
<li className="flex items-start gap-3 text-stone-400">
  <Shield className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
  Texto do diferencial
</li>
```

---

## 6. Realizações (Métricas)

### Descrição
Grid de métricas detalhadas do negócio.

### Layout

Grid 4x2 com `MetricCard`:

| Linha 1 | Linha 2 |
|---------|---------|
| MRR Atual | LTV Médio |
| Crescimento Mensal | CAC |
| Clientes Ativos | Churn Rate |
| NPS Score | Runway |

---

## 7. Mercado Potencial

### Descrição
Dados de mercado TAM/SAM/SOM.

### Cards de Mercado

Grid 4 colunas:

| Card | Descrição |
|------|-----------|
| TAM | Total Addressable Market |
| SAM | Serviceable Addressable Market |
| SOM | Serviceable Obtainable Market |
| Crescimento | Taxa anual de crescimento |

### Estrutura do Card

```jsx
<div className="bg-stone-900 rounded-xl border border-stone-800 p-5 text-center">
  <p className="text-stone-400 text-sm mb-2">TAM</p>
  <p className="text-2xl font-bold text-stone-50">R$ 12 bilhões</p>
</div>
```

---

## 8. Metas com Investimento

### Descrição
Lista de objetivos para os próximos 12 meses.

### Layout

Grid 2x3 (desktop) ou 1 coluna (mobile).

### Estrutura do Item

```jsx
<div className="flex items-center gap-3 bg-stone-900 rounded-xl border border-stone-800 p-4">
  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-sm">
    {index + 1}
  </div>
  <span className="text-stone-300">{goal}</span>
</div>
```

---

## 9. Equipe Executiva

### Descrição
Cards dos membros da equipe fundadora.

### Componente: `TeamCard`

#### Estrutura

```
┌─────────────────────────────────────────────┐
│  ┌──────┐                                   │
│  │ Foto │  Nome do Membro                   │
│  │64x64 │  Cargo (text-blue-400)            │
│  └──────┘                                   │
│                                             │
│  Mini-bio do membro da equipe...            │
│  (text-stone-400 text-sm)                   │
│                                             │
│  🔗 LinkedIn                                │
└─────────────────────────────────────────────┘
```

#### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | string | Nome completo |
| `role` | string | Cargo |
| `bio` | string | Mini-biografia |
| `image` | string | URL da foto |
| `linkedin` | string | URL do LinkedIn |

---

## 10. Fatores de Risco

### Descrição
Categorias de risco do investimento.

### Componente: `RiskCard`

#### Estrutura

```
┌─────────────────────────────────────────────┐
│  ⚠️  Categoria de Risco                     │
│      (amber-400)                            │
│                                             │
│  • Item de risco 1                          │
│  • Item de risco 2                          │
│  • Item de risco 3                          │
└─────────────────────────────────────────────┘
```

#### Categorias

| Categoria | Descrição |
|-----------|-----------|
| Risco de Investimento | Perda de capital, liquidez, diluição |
| Risco de Negócio | Regulação, competição, execução |
| Risco de Conversibilidade | Tokens, prazo de conversão |

---

## 11. Informações Essenciais

### Descrição
Grid de links para documentos principais.

### Layout

Grid 5 colunas (desktop):

| Link | Ícone |
|------|-------|
| Site Oficial | ExternalLink |
| Termos da Oferta | FileText |
| Análise de Mercado | BarChart3 |
| Docs. Jurídicos | Folder |
| Financeiro | DollarSign |

### Estrutura do Card

```jsx
<a className="flex flex-col items-center gap-3 bg-stone-900 rounded-xl border border-stone-800 p-5 hover:border-blue-500/50 hover:bg-stone-800/50 transition-all text-center group">
  <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center group-hover:bg-blue-600/30">
    <Icon className="w-6 h-6 text-blue-400" />
  </div>
  <span className="text-stone-300 text-sm font-medium">{label}</span>
</a>
```

---

## 12. Galeria

### Descrição
Grid de imagens com modal de visualização.

### Layout

Grid 3x2 com aspect-ratio `aspect-video`.

### Comportamento

- Hover: Zoom (`group-hover:scale-105`)
- Click: Abre modal fullscreen
- Modal: Background `bg-stone-950/90` com botão fechar

### Estado

```jsx
const [selectedImage, setSelectedImage] = useState(null);
```

---

## 13. FAQ

### Descrição
Accordion de perguntas frequentes.

### Componente: `FaqItem`

#### Props

| Prop | Tipo | Descrição |
|------|------|-----------|
| `question` | string | Pergunta |
| `answer` | string | Resposta |
| `isOpen` | boolean | Estado aberto/fechado |
| `onClick` | function | Handler de clique |

#### Estrutura

```
┌─────────────────────────────────────────────┐
│  Pergunta aqui?                         ▼   │
├─────────────────────────────────────────────┤
│  Resposta aparece quando aberto...          │
│  (text-stone-400)                           │
└─────────────────────────────────────────────┘
```

#### Estado

```jsx
const [openFaq, setOpenFaq] = useState(null);

// Toggle
onClick={() => setOpenFaq(openFaq === i ? null : i)}
```

---

## 14. Atualizações/Novidades

### Descrição
Timeline de marcos e releases recentes.

### Componente: `UpdateCard`

#### Estrutura

```
●  15 Jan 2026
│  Marco de 450 clientes atingido
│  Celebramos a marca de 450 clientes ativos...
│
●  02 Jan 2026
│  Parceria com Banco Inter
│  Fechamos integração exclusiva...
```

#### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `date` | string | Data formatada |
| `title` | string | Título do marco |
| `description` | string | Descrição breve |

---

## 15. Depoimentos

### Descrição
Cards de depoimentos de clientes/parceiros.

### Componente: `TestimonialCard`

#### Estrutura

```
┌─────────────────────────────────────────────┐
│  ❝                                          │
│  "Texto do depoimento aqui..."              │
│                                             │
│  ┌────┐                                     │
│  │Foto│  Nome da Pessoa                     │
│  └────┘  Cargo, Empresa                     │
└─────────────────────────────────────────────┘
```

#### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `text` | string | Texto do depoimento |
| `name` | string | Nome da pessoa |
| `role` | string | Cargo |
| `company` | string | Empresa |
| `image` | string | URL da foto |

---

## 16. Documentos

### Descrição
Lista de PDFs para download.

### Componente: `DocumentCard`

#### Estrutura

```
┌─────────────────────────────────────────────┐
│  📄  Apresentação para Investidores    ⬇️   │
│       PDF • 4.2 MB                          │
└─────────────────────────────────────────────┘
```

#### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | string | Nome do documento |
| `type` | string | Tipo (PDF) |
| `size` | string | Tamanho do arquivo |
| `url` | string | URL de download |

---

## 17. Comentários/Fórum

### Descrição
Seção de discussão entre investidores.

### Componentes

#### Regras do Fórum

```jsx
<p className="text-stone-400 mb-8">
  Mantenha o respeito e foque em discussões construtivas...
</p>
```

#### Input de Comentário

```
┌─────────────────────────────────────────────┐
│  ┌──┐  ┌─────────────────────────────────┐  │
│  │??│  │ Faça login para comentar...     │  │
│  └──┘  │                                 │  │
│        │                                 │  │
│        └─────────────────────────────────┘  │
│                              [📤 Enviar]    │
└─────────────────────────────────────────────┘
```

#### CommentCard

```
┌─────────────────────────────────────────────┐
│  👤 Investidor123              2 dias atrás │
│                                             │
│  Texto do comentário aqui...                │
│                                             │
│  ❤️ 12                                      │
└─────────────────────────────────────────────┘
```

---

## 18. Investidores

### Descrição
Lista de avatares dos investidores.

### Layout

Flex wrap com avatares circulares:

```
┌────────────────────────────────────────────────┐
│  👤 Investidores (234)           Ver todos →   │
│                                                │
│  ●  ●  ●  ●  ●  ●  ●  ●  [+226]               │
│  RM AS PO MC LF BS JC TM                       │
└────────────────────────────────────────────────┘
```

### Avatar

```jsx
<div className={`w-12 h-12 rounded-full bg-linear-to-br ${colors[color]} flex items-center justify-center`}>
  <span className="text-sm font-semibold text-white">{initials}</span>
</div>
```

### Cores dos Avatares

| Cor | Gradiente |
|-----|-----------|
| blue | `from-blue-600 to-blue-400` |
| green | `from-green-600 to-green-400` |
| purple | `from-purple-600 to-purple-400` |
| pink | `from-pink-600 to-pink-400` |
| orange | `from-orange-600 to-orange-400` |
| cyan | `from-cyan-600 to-cyan-400` |
| red | `from-red-600 to-red-400` |
| yellow | `from-yellow-600 to-yellow-400` |

---

## 19. Footer

### Descrição
Footer institucional idêntico à homepage.

### Layout

Grid 4 colunas (desktop) → 2 colunas (tablet) → 1 coluna (mobile).

### Colunas

| Coluna | Conteúdo |
|--------|----------|
| Marca | Logo + descrição |
| Plataforma | Links de navegação |
| Legal | Termos e Privacidade |
| Contato | Email e Telefone |

### Linha Inferior

```jsx
<p className="text-stone-500 text-sm text-center">
  © 2026 iSelfToken. Todos os direitos reservados.
</p>
```

---

## Componentes Reutilizáveis

### MetricCard

Card para exibição de métricas numéricas.

#### Props

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `icon` | Component | - | Ícone Lucide |
| `label` | string | - | Rótulo da métrica |
| `value` | string | - | Valor principal |
| `subvalue` | string | - | Valor secundário (opcional) |
| `color` | string | 'blue' | Cor do ícone |

#### Cores Disponíveis

| Cor | Gradiente |
|-----|-----------|
| blue | `from-blue-600 to-blue-500` |
| green | `from-green-600 to-green-500` |
| purple | `from-purple-600 to-purple-500` |
| orange | `from-orange-600 to-orange-500` |

---

## Modais

### Modal de Imagem (Galeria)

```jsx
{selectedImage && (
  <div 
    className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-stone-950/90"
    onClick={() => setSelectedImage(null)}
  >
    <img src={selectedImage} className="max-w-full max-h-full rounded-xl" />
    <button className="absolute top-4 right-4">
      <X className="w-8 h-8" />
    </button>
  </div>
)}
```

---

## Estrutura de Dados (Mock)

### Objeto Principal: `startupData`

```typescript
interface StartupData {
  // Identificação
  id: number;
  name: string;
  slogan: string;
  description: string;
  heroImage: string;
  logo: string;
  category: string;
  location: string;
  founded: string;
  website: string;
  
  // Oferta
  offer: {
    equity: string;
    valuation: string;
    minInvestment: string;
    maxInvestment: string;
    totalTokens: number;
    soldTokens: number;
    investors: number;
    deadline: string;
    raised: string;
    goal: string;
  };
  
  // Métricas
  metrics: {
    mrr: string;
    growth: string;
    clients: string;
    nps: string;
    ltv: string;
    cac: string;
    churn: string;
    runway: string;
  };
  
  // Conteúdo
  businessSummary: string;
  market: MarketData;
  goals: string[];
  team: TeamMember[];
  risks: RiskCategory[];
  documents: Document[];
  gallery: string[];
  faq: FaqItem[];
  updates: Update[];
  testimonials: Testimonial[];
  comments: Comment[];
  investors: Investor[];
}
```

---

## Estados da Aplicação

| Estado | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `isLoggedIn` | boolean | `false` | Controla acesso ao conteúdo protegido |
| `openFaq` | number \| null | `null` | Índice do FAQ aberto |
| `selectedImage` | string \| null | `null` | URL da imagem no modal |
| `showModal` | boolean | `false` | Visibilidade do modal de login (interno ao ProtectedSection) |

---

## Responsividade

### Breakpoints Utilizados

| Breakpoint | Uso |
|------------|-----|
| `sm` (640px) | Botões lado a lado no modal |
| `md` (768px) | Grids 2 colunas, banner maior |
| `lg` (1024px) | Layout 2 colunas no hero, sidebar sticky |
| `xl` (1280px) | - |

### Comportamentos Responsivos

| Componente | Mobile | Desktop |
|------------|--------|---------|
| Hero | 1 coluna | 2 colunas com sidebar |
| Métricas | 2x2 | 4x1 |
| Metas | 1 coluna | 3 colunas |
| Galeria | 2 colunas | 3 colunas |
| Footer | 1 coluna | 4 colunas |

---

## Checklist de Implementação

- [ ] Configurar rota `/startup/:id`
- [ ] Implementar API `ApiPage.StartupIdPublic()`
- [ ] Implementar `ProtectedSection` com detecção de scroll
- [ ] Implementar `InnerAuthBanner` (modal flutuante)
- [ ] Implementar `MetricCard`
- [ ] Implementar `TeamCard`
- [ ] Implementar `RiskCard`
- [ ] Implementar `DocumentCard`
- [ ] Implementar `FaqItem` (accordion)
- [ ] Implementar `UpdateCard` (timeline)
- [ ] Implementar `TestimonialCard`
- [ ] Implementar `CommentCard`
- [ ] Implementar modal de galeria
- [ ] Conectar autenticação real
- [ ] Testar responsividade
- [ ] Testar acessibilidade
- [ ] Otimizar imagens
- [ ] Implementar lazy loading

---

## Notas de Acessibilidade

- Contraste mínimo de texto: 4.5:1
- Focus visible em elementos interativos
- Alt text em todas as imagens
- Roles ARIA no accordion (FAQ)
- Trap focus no modal de login
- Escape fecha modais
- Navegação por teclado nos botões
