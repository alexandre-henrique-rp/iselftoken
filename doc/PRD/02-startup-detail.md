# PRD — Página Pública de Startup (02-startup-detail)

## 1. Visão Geral

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Exibir detalhes da oferta de uma startup com conteúdo público e conteúdo protegido por autenticação |
| **Rota** | `/startup/:id` |
| **Path** | `app/routes/page/startup/index.tsx` |
| **Componentes únicos** | `app/routes/page/startup/components/index.tsx` |
| **API** | `ApiPage.StartupIdPublic()` |
| **Tipo** | Pública (com seções protegidas) |
| **Design System** | Tailwind CSS v4 + shadcn/ui (tema stone) |
| **Referência de Estilo** | `doc/css_padrão.md`, `doc/style/02-startup-detail-documentation.md` |

---

## 2. Dependências e Componentes

### 2.1 Componentes shadcn/ui
```bash
npx shadcn@latest add card
npx shadcn@latest add button
npx shadcn@latest add accordion
npx shadcn@latest add dialog
npx shadcn@latest add tabs
npx shadcn@latest add progress
npx shadcn@latest add avatar
```

### 2.2 Componentes Customizados
- `MetricCard` — exibição de métricas numéricas
- `TeamCard` — card de membro da equipe
- `RiskCard` — card de fator de risco
- `DocumentCard` — card de documento para download
- `FaqItem` — item de FAQ com accordion
- `UpdateCard` — card de atualização/novidade
- `CommentCard` — card de comentário do fórum
- `InnerAuthBanner` — modal de exigência de login

---

## 3. Requisitos Funcionais (Ponto a Ponto)

### 3.1 Header Fixo Minimalista

| Elemento | Especificação |
|----------|---------------|
| **Posição** | `sticky top-0 z-50` |
| **Background** | `bg-stone-950/80 backdrop-blur-md` |
| **Borda** | `border-b border-stone-800` |

**Conteúdo:**
1. **Logo "iSelfToken" (esquerda)** — link para `/`
2. **Seletor de idioma/país** — BR/PT/EN/ES
3. **Botão "Cadastre-se"** — `bg-blue-600` → rota `/cadastro`

### 3.2 Hero da Oferta (Layout em 2 Colunas)

**Coluna Esquerda (70%):**

| Elemento | Descrição |
|----------|-----------|
| Breadcrumb | `Home > Startups > {categoria} > {nome}` |
| Logo | Imagem circular da startup (80x80px) |
| Nome | `text-3xl font-bold` |
| Categoria | Badge com categoria (ex: "FinTech") |
| Localização | Ícone + cidade/país |
| Slogan | `text-xl text-stone-400` |
| Descrição | Texto de apresentação (max 300 caracteres) |

**CTAs:**
| Botão | Estilo | Ação |
|-------|--------|------|
| Investir | `bg-blue-600 hover:bg-blue-700` | Abre modal de investimento ou redireciona |
| Falar com a plataforma | `bg-stone-800 border border-stone-600` | Abre WhatsApp/contato |

**Links Auxiliares:**
- Documento essencial (PDF) — ícone de download
- Compartilhamento social — Facebook, Twitter, LinkedIn, WhatsApp

**Coluna Direita (30%):**

**Card Sticky de Progresso:**
```typescript
interface ProgressoCard {
  metaCaptacao: number;      // valor em BRL
  captacaoAtual: number;     // valor em BRL
  percentualCaptado: number; // 0-100
  equityOfertado: number;    // percentual
  valuation: number;         // valor em BRL
  investimentoMinimo: number;
  investimentoMaximo: number;
  diasRestantes: number;
  totalInvestidores: number;
}
```

| Campo | Formato |
|-------|---------|
| Barra de progresso | Percentual visual com cor `blue-600` |
| Meta de captação | `R$ 500.000` |
| Captado até agora | `R$ 245.000 (49%)` |
| Equity ofertado | `10%` |
| Valuation | `R$ 5.000.000` |
| Investimento mínimo | `R$ 100` |
| Investimento máximo | `R$ 50.000` |
| Dias restantes | `45 dias` |
| Investidores | `127 investidores` |

### 3.3 Apresentação aos Investidores (Público)

| Elemento | Descrição |
|----------|-----------|
| Banner | Imagem grande (aspect-ratio 21:9) com overlay escuro |
| Resumo do negócio | Texto explicativo (max 500 caracteres) |
| Métricas rápidas | Grid 4 colunas com MRR, crescimento, NPS, clientes |
| Botão | **Baixar apresentação** (PDF) |

**Estrutura de Métricas:**
```typescript
interface MetricaRapida {
  label: string;    // "MRR", "Crescimento", "NPS", "Clientes"
  valor: string;    // "R$ 50k", "+120%", "72", "1.500+"
  icone: string;    // nome do ícone Lucide
}
```

### 3.4 Seções de Conteúdo (Ordem Visual)

#### Seção Pública (SEM blur)
1. Hero da oferta
2. Apresentação aos investidores

#### Seções Protegidas (COM blur)

A partir da seção 3, aplicar proteção:

| # | Seção | Descrição |
|---|-------|-----------|
| 3 | Resumo/Análise da oferta | Card informativo + call-to-action para login |
| 4 | O Negócio | Texto explicativo sobre produto, proposta, diferenciais |
| 5 | Realizações | Métricas-chave: receita, crescimento, LTV/CAC, prêmios |
| 6 | Mercado Potencial | Dados de mercado, TAM/SAM/SOM, estatísticas |
| 7 | Metas (12 meses) | Lista de objetivos e plano de expansão |
| 8 | Equipe Executiva | Cards dos fundadores com cargo e mini-bio |
| 9 | Fatores de Risco | Categorias: investimento, negócio, conversibilidade |
| 9.1 | Informações essenciais | Grid de links: site, termos, análise, jurídico, financeiro |
| 10 | Galeria | Fotos em grid com modal de visualização |
| 11 | FAQ | Accordion com perguntas frequentes |
| 12 | Atualizações | Timeline com marcos recentes |
| 13 | Depoimentos | Relatos de clientes/parceiros |
| 14 | Documentos | Lista de PDFs para download |
| 15 | Comentários/Fórum | Lista de comentários + CTA para login |
| 15.1 | Investidores | Avatares dos investidores + link "Ver todos" |

### 3.5 Estruturas de Dados por Seção

```typescript
// Seção O Negócio
interface SecaoNegocio {
  problema: string;
  solucao: string;
  diferencial: string;
  modeloReceita: string;
}

// Seção Realizações
interface Realizacao {
  id: string;
  titulo: string;
  valor: string;
  descricao?: string;
  icone: string;
}

// Seção Mercado
interface MercadoPotencial {
  tam: string;          // Total Addressable Market
  sam: string;          // Serviceable Addressable Market
  som: string;          // Serviceable Obtainable Market
  estatisticas: Array<{ label: string; valor: string }>;
}

// Seção Metas
interface Meta {
  id: string;
  titulo: string;
  descricao: string;
  prazo: string;
  status: 'pendente' | 'em_andamento' | 'concluida';
}

// Seção Equipe
interface MembroEquipe {
  id: string;
  nome: string;
  cargo: string;
  bio: string;
  fotoUrl: string;
  linkedin?: string;
}

// Seção Fatores de Risco
interface FatorRisco {
  id: string;
  categoria: 'investimento' | 'negocio' | 'conversibilidade' | 'mercado';
  titulo: string;
  descricao: string;
}

// Seção Galeria
interface ItemGaleria {
  id: string;
  tipo: 'imagem' | 'video';
  url: string;
  thumbnail: string;
  titulo?: string;
}

// Seção FAQ
interface FaqItem {
  id: string;
  pergunta: string;
  resposta: string;
}

// Seção Atualizações
interface Atualizacao {
  id: string;
  data: string;
  titulo: string;
  descricao: string;
  tipo: 'marco' | 'release' | 'noticia';
}

// Seção Depoimentos
interface Depoimento {
  id: string;
  texto: string;
  autor: string;
  cargo: string;
  empresa: string;
  fotoUrl?: string;
}

// Seção Documentos
interface Documento {
  id: string;
  titulo: string;
  tipo: 'pdf' | 'doc' | 'xls';
  tamanho: string;
  url: string;
  categoria: 'juridico' | 'financeiro' | 'apresentacao' | 'termos';
}

// Seção Comentários
interface Comentario {
  id: string;
  autor: {
    nome: string;
    avatar: string;
  };
  texto: string;
  data: string;
  respostas?: Comentario[];
}

// Seção Investidores
interface Investidor {
  id: string;
  nome: string;
  avatar: string;
}
```

### 3.6 Footer Institucional

Igual ao da Homepage — grid 4 colunas, responsivo.

---

## 4. Regras de Proteção de Conteúdo

### 4.1 Comportamento Visual

| Estado | Estilo |
|--------|--------|
| Conteúdo bloqueado | `blur-sm opacity-50 select-none pointer-events-none` |
| Conteúdo liberado | Estilos normais |

### 4.2 Modal de Autenticação (`InnerAuthBanner`)

**Características:**
- Posição fixa dentro da área protegida
- Aparece quando o usuário rola até a seção protegida
- Desaparece quando chega ao footer

**Conteúdo do Modal:**
```typescript
interface AuthBannerContent {
  titulo: string;           // "Acesse o conteúdo completo"
  subtitulo: string;        // "Faça login ou cadastre-se para ver..."
  botaoLogin: string;       // "Entrar"
  botaoCadastro: string;    // "Criar conta"
  rotaLogin: string;        // "/login"
  rotaCadastro: string;     // "/cadastro"
}
```

**Estilo:**
```css
.inner-auth-banner {
  @apply fixed left-1/2 -translate-x-1/2;
  @apply bg-stone-900/95 backdrop-blur-lg;
  @apply border border-stone-700 rounded-xl;
  @apply p-6 shadow-2xl;
  @apply z-40;
}
```

### 4.3 Regras de Exibição

1. **Usuário não autenticado:**
   - Seções 1-2: visíveis normalmente
   - Seções 3+: blur aplicado
   - Modal de autenticação visível

2. **Usuário autenticado:**
   - Todas as seções visíveis
   - Sem blur
   - Sem modal

---

## 5. Requisitos de UI/UX

### 5.1 Tema e Cores
| Elemento | Classe Tailwind |
|----------|-----------------|
| Background | `bg-stone-950` |
| Cards | `bg-stone-900 border-stone-800` |
| Texto principal | `text-stone-50` |
| Texto secundário | `text-stone-400` |
| Botão primário | `bg-blue-600` |
| Barra de progresso | `bg-blue-600` |
| Badges | `bg-stone-800 text-stone-300` |

### 5.2 Layout Responsivo

| Breakpoint | Layout |
|------------|--------|
| Mobile | 1 coluna, card de progresso no topo |
| Tablet | 1 coluna, card de progresso sticky lateral |
| Desktop | 2 colunas (70/30), card sticky |

### 5.3 Card Sticky

```css
.card-progresso {
  @apply sticky top-20;
  @apply max-h-[calc(100vh-6rem)];
  @apply overflow-y-auto;
}
```

---

## 6. Estados e Feedbacks

### 6.1 Loading
- Skeleton para hero e card de progresso
- Skeleton para cada seção individual
- Shimmer effect durante carregamento

### 6.2 Erro
- Mensagem: "Não foi possível carregar os dados da startup."
- Botão **Tentar novamente**
- Fallback para página 404 se startup não existir

### 6.3 Vazio
- Placeholders para seções sem conteúdo
- Mensagem contextual (ex: "Nenhuma atualização ainda")

---

## 7. Acessibilidade

| Requisito | Implementação |
|-----------|---------------|
| Foco visível | `focus:ring-2 focus:ring-blue-500` |
| Alt text | Todas as imagens da galeria e logos |
| Teclado | Tab navega entre seções, Enter ativa |
| ESC | Fecha modais (galeria, investimento) |
| Aria labels | Todos os botões e links |
| Landmarks | `main`, `section`, `aside` |

---

## 8. Critérios de Aceitação

### 8.1 Header e Hero
- [ ] Logo clicável retorna para `/`
- [ ] Breadcrumb navegável
- [ ] Card de progresso exibe dados corretos
- [ ] Barra de progresso animada

### 8.2 Proteção de Conteúdo
- [ ] Blur aplicado corretamente a partir da seção 3
- [ ] Modal aparece ao rolar para área protegida
- [ ] Modal desaparece no footer
- [ ] Seleção de texto desabilitada em conteúdo bloqueado
- [ ] Após login, blur é removido

### 8.3 Seções
- [ ] Todas as 15 seções renderizam corretamente
- [ ] Galeria abre em modal
- [ ] FAQ com accordion funcional
- [ ] Documentos com download
- [ ] Comentários com CTA para login

### 8.4 Responsividade
- [ ] Layout adapta em mobile/tablet/desktop
- [ ] Card sticky funciona corretamente
- [ ] Modal de auth centralizado em todas as resoluções

---

## 9. Dados e API

### 9.1 Exemplo de Resposta da API

```json
{
  "error": false,
  "message": "Startup encontrada",
  "codigo": 200,
  "data": {
    "id": "startup-001",
    "nome": "TechFlow",
    "slogan": "Automatizando o futuro das fintechs",
    "descricao": "Plataforma SaaS de automação financeira...",
    "categoria": "FinTech",
    "localizacao": {
      "cidade": "São Paulo",
      "estado": "SP",
      "pais": "Brasil"
    },
    "logoUrl": "/images/techflow-logo.png",
    "bannerUrl": "/images/techflow-banner.jpg",
    "progresso": {
      "metaCaptacao": 500000,
      "captacaoAtual": 245000,
      "percentualCaptado": 49,
      "equityOfertado": 10,
      "valuation": 5000000,
      "investimentoMinimo": 100,
      "investimentoMaximo": 50000,
      "diasRestantes": 45,
      "totalInvestidores": 127
    },
    "metricas": [
      { "label": "MRR", "valor": "R$ 50k", "icone": "trending-up" },
      { "label": "Crescimento", "valor": "+120%", "icone": "chart-line" }
    ],
    "negocio": { ... },
    "realizacoes": [ ... ],
    "mercado": { ... },
    "metas": [ ... ],
    "equipe": [ ... ],
    "riscos": [ ... ],
    "galeria": [ ... ],
    "faq": [ ... ],
    "atualizacoes": [ ... ],
    "depoimentos": [ ... ],
    "documentos": [ ... ],
    "comentarios": [ ... ],
    "investidores": [ ... ]
  }
}
```

---

## 10. Observações Técnicas

1. **Componentes reutilizáveis:** Criar em `app/routes/page/startup/components/`
2. **Proteção de conteúdo:** Usar Context para gerenciar estado de autenticação
3. **Performance:** Lazy loading para galeria e seções inferiores
4. **SEO:** Meta tags dinâmicas com dados da startup
5. **Compartilhamento:** Open Graph tags para redes sociais

---

## 11. Referências Cruzadas

| Documento | Descrição |
|-----------|-----------|
| [SPEC/02-startup-detail.md](../SPEC/02-startup-detail.md) | Especificação técnica |
| [style/02-startup-detail-documentation.md](../style/02-startup-detail-documentation.md) | Documentação de estilos |
| [style/02-startup-detail-page.jsx](../style/02-startup-detail-page.jsx) | Exemplo de implementação |
| [descritivo/02-page_startup_id.md](../descritivo/02-page_startup_id.md) | Descrição funcional original |
| [PRD/03-auth-context.md](./03-auth-context.md) | Contexto de autenticação |
| [css_padrão.md](../css_padrão.md) | Design System |
