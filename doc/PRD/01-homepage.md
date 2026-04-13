# PRD — Homepage Pública (01-homepage)

## 1. Visão Geral

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Apresentar a iSelfToken, listar startups por segmentos e conduzir o usuário para captação ou investimento |
| **Rota** | `/` |
| **Path** | `app/routes/page/index/index.tsx` |
| **Componentes únicos** | `app/routes/page/index/components/index.tsx` |
| **APIs** | `ApiPage.get()`, `ApiPage.depoimentos()`, `ApiPage.fundadores()` |
| **Tipo** | Pública |
| **Design System** | Tailwind CSS v4 + shadcn/ui (tema stone) |
| **Referência de Estilo** | `doc/css_padrão.md`, `doc/style/01-homepage-documentation.md` |

---

## 2. Dependências e Componentes

### 2.1 Componentes shadcn/ui
```bash
npx shadcn@latest add @magicui/animated-theme-toggler
npx shadcn@latest add button
npx shadcn@latest add card
```

### 2.2 Ícones
- Lucide React para ícones gerais
- SVG customizado para seta do seletor de idioma

---

## 3. Requisitos Funcionais (Ponto a Ponto)

### 3.1 Header Fixo Minimalista

| Elemento | Especificação |
|----------|---------------|
| **Posição** | Fixo no topo (`sticky top-0`) |
| **Background** | `bg-stone-950/80 backdrop-blur-md` |
| **Borda** | `border-b border-stone-800` |
| **Z-index** | `z-50` |

**Conteúdo do Header:**

1. **Logo "iSelfToken" (esquerda)**
   - Cor: `#d500f9` (magenta/roxo da marca)
   - Fonte: Inter, `font-bold text-xl`
   - Link para `/`

2. **Ações (direita)**
   - **Seletor de idioma/país:**
     ```html
     <option value="pt-BR">BR 🇧🇷</option>
     <option value="pt-PT">PT 🇵🇹</option>
     <option value="en-US">EN 🇺🇸</option>
     <option value="es-ES">ES 🇪🇸</option>
     ```
     - Ícone SVG de seta:
     ```jsx
     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
     </svg>
     ```
   - **Botão "Entrar":** `bg-blue-600 hover:bg-blue-700` → rota `/login`
   - **animated-theme-toggler:** ao lado do botão Entrar

### 3.2 Hero Principal

**Layout:**
- Centralizado com tipografia grande
- Background com gradientes decorativos e blurs suaves

**Conteúdo:**
| Elemento | Estilo |
|----------|--------|
| Título principal | "iSelfToken" — `text-5xl md:text-6xl font-bold` |
| Subtítulo | "Crowdfunding" — `text-3xl md:text-4xl font-semibold` |
| Frase de valor | "Invista em startups promissoras via tokenização de equity" — `text-xl text-stone-400` |
| Texto de apoio | Explicação da conexão investidores/fundadores — `text-base text-stone-500` |

**CTAs (Call to Action):**
| Botão | Estilo | Rota |
|-------|--------|------|
| Captar Investimento | `bg-blue-600 hover:bg-blue-700` | `/cadastro` |
| Comece a Investir | `bg-stone-800 hover:bg-stone-700 border border-stone-600` | `/cadastro` |

### 3.3 Seção Rodadas de Captação (Carousel)

**Comportamento:**
- Carrossel horizontal com rolagem por botões
- Botões de navegação no canto superior direito do container

**Regras de Visibilidade dos Botões:**
| Condição | Ação |
|----------|------|
| Primeiro card visível | Ocultar botão **back** |
| Último card visível | Ocultar botão **front** |

**Cards Grandes — Estrutura:**
```typescript
interface StartupCaptacaoCard {
  id: string;
  nome: string;
  descricao: string;
  imagemUrl: string;
  selos: string[];           // ex: ["Verificada", "Acelerada"]
  valuationOfertado: number; // percentual
  valorAtual: number;        // em BRL
  totalTokens: number;
  tokensVendidos: number;
}
```

**Campos do Card:**
- Imagem de apresentação (aspect-ratio 16:9)
- Nome da startup
- Breve descrição (max 120 caracteres)
- Selos aplicados pela plataforma (badges)
- Valuation ofertado (%)
- Valor atual da startup (formatado em R$)
- Total de tokens
- Tokens vendidos (com barra de progresso)
- Botão **Ver mais** → `/startup/:id`

### 3.4 Seção "Como Funciona?" (CTA)

**Layout:** Dois cards lado a lado (grid 2 colunas no desktop)

**Card Para Fundadores:**
| Elemento | Conteúdo |
|----------|----------|
| Título | "Para Fundadores" |
| Mensagem | Incentivo para captar investimento com solução segura, rápida e 100% digital |
| Badges | "Startups verificadas", "Processo simplificado" |
| CTA | **comece a captar agora** → `/cadastro` |

**Card Para Investidores:**
| Elemento | Conteúdo |
|----------|----------|
| Título | "Para Investidores" |
| Mensagem | Convite para investir em startups promissoras com liquidez via tokenização |
| Badges | "Investimento mínimo baixo", "Diversificação" |
| CTA | **comece a investir agora** → `/cadastro` |

### 3.5 Seções de Startups (Carousels)

**Seções disponíveis:**
1. Startups Verificadas
2. Startups Aceleradas
3. Startups em Aprovação

**Cards Médios — Estrutura:**
```typescript
interface StartupCard {
  id: string;
  nome: string;
  descricao: string;
  logoUrl: string;
  categoria: string;        // ex: "FinTech", "HealthTech"
  selo: 'verificada' | 'acelerada' | 'aprovacao';
}
```

**Campos do Card Médio:**
- Logo ou imagem (circular ou quadrado arredondado)
- Nome da startup
- Breve descrição (max 80 caracteres)
- Selo conforme seção
- Categoria/segmento
- Botão **Ver mais** → `/startup/:id`

### 3.6 Oportunidades de Investimento (Grid)

**Layout:**
- Grid 4x4 no desktop
- Responsivo: 1 col mobile, 2 cols tablet, 4 cols desktop

**Filtros por Categoria:**
| Filtro | Valor da Rota |
|--------|---------------|
| Todos | `all` |
| FinTech | `fintech` |
| HealthTech | `healthtech` |
| EdTech | `edtech` |
| Tech / IA | `tech-ia` |
| SaaS | `saas` |
| Outros | `outros` |

**Navegação:** Ao clicar no filtro → `/investimento/:filter`

**Card Compacto:**
- Ícone do tipo de startup
- Nome da startup
- Tipo/categoria
- Botão **Ver mais** → `/startup/:id`

### 3.7 Depoimentos de Investidores

**Layout:**
| Dispositivo | Colunas |
|-------------|---------|
| Desktop | 3 cards por linha |
| Tablet | 2 cards por linha |
| Mobile | 1 card por linha |

**Card de Depoimento:**
```typescript
interface DepoimentoInvestidor {
  id: string;
  texto: string;          // entre aspas
  avatar: string;         // iniciais ou imagem
  nome: string;
  papel: string;          // "Investidor" / "Investidora"
}
```

**Estilo:** Fundo escuro (`bg-stone-900`), bordas suaves (`rounded-lg border-stone-800`)

**Quantidade:** Mínimo 3, ideal 6-8 depoimentos

### 3.8 Depoimentos de Fundadores

**Layout:** Igual aos depoimentos de investidores

**Card de Depoimento de Fundador:**
```typescript
interface DepoimentoFundador {
  id: string;
  texto: string;
  avatar: string;
  nome: string;
  cargo: string;          // ex: "CEO, TechFlow"
  empresa: string;
  redesSociais: {
    linkedin?: string;
    youtube?: string;
    website?: string;
  };
}
```

**Ícones de Redes Sociais:** LinkedIn, YouTube, Website (abrem em nova aba)

### 3.9 Footer Institucional

**Layout:** Grid 4 colunas no desktop

| Coluna | Conteúdo |
|--------|----------|
| 1 - Marca | Logo "iSelfToken" + texto explicativo da proposta |
| 2 - Plataforma | Links: "Para Investidores", "Para Projetos", "iSelfToken Education" |
| 3 - Legal | Links: "Termos de Uso", "Privacidade" |
| 4 - Contato | Links: "Email", "Telefone" |

**Linha inferior:** Separador + direitos autorais centralizados
```
© 2026 iSelfToken. Todos os direitos reservados.
```

**Responsivo:**
- Tablet: 2 colunas por linha
- Mobile: 1 coluna por linha

---

## 4. Requisitos de UI/UX

### 4.1 Tema e Cores
| Elemento | Classe Tailwind |
|----------|-----------------|
| Background | `bg-stone-950` |
| Texto principal | `text-stone-50` |
| Texto secundário | `text-stone-400` |
| Cards | `bg-stone-900 border-stone-800` |
| Botão primário | `bg-blue-600 hover:bg-blue-700` |
| Logo marca | `text-[#d500f9]` |

### 4.2 Tipografia
- Fonte: Inter
- Hierarquia: H1 (`text-5xl`), H2 (`text-3xl`), H3 (`text-xl`), Body (`text-base`)

### 4.3 Carrosséis
- Rolagem suave (`scroll-smooth`)
- Botões discretos no canto superior direito
- Indicador visual do progresso (opcional)

### 4.4 Layout Responsivo
| Breakpoint | Comportamento |
|------------|---------------|
| Mobile (< 640px) | 1 coluna, CTAs empilhados |
| Tablet (640-1024px) | 2 colunas |
| Desktop (> 1024px) | 4 colunas, layout completo |

---

## 5. Estados e Feedbacks

### 5.1 Loading
- Skeleton/shimmer para seções de startups
- Skeleton para depoimentos
- Spinner sutil no header durante carregamento inicial

### 5.2 Erro
- Mensagem amigável: "Não foi possível carregar as startups. Tente novamente."
- Botão **Tentar novamente** para retry

### 5.3 Vazio
- Placeholder quando seções retornarem lista vazia
- Mensagem: "Nenhuma startup disponível no momento."
- CTA contextual (ex: "Seja o primeiro a se cadastrar")

---

## 6. Dados e Estruturas

### 6.1 Tipos TypeScript

```typescript
// Startup para carrossel de captação
interface StartupCaptacao {
  id: string;
  nome: string;
  descricao: string;
  imagemUrl: string;
  selos: ('verificada' | 'acelerada' | 'aprovacao')[];
  valuationOfertado: number;
  valorAtual: number;
  totalTokens: number;
  tokensVendidos: number;
  categoria: string;
}

// Startup para cards médios
interface StartupCard {
  id: string;
  nome: string;
  descricao: string;
  logoUrl: string;
  categoria: string;
  selo: 'verificada' | 'acelerada' | 'aprovacao';
}

// Depoimento de investidor
interface DepoimentoInvestidor {
  id: string;
  texto: string;
  avatar: string;
  nome: string;
  papel: 'Investidor' | 'Investidora';
}

// Depoimento de fundador
interface DepoimentoFundador {
  id: string;
  texto: string;
  avatar: string;
  nome: string;
  cargo: string;
  empresa: string;
  redesSociais: {
    linkedin?: string;
    youtube?: string;
    website?: string;
  };
}

// Resposta da API
interface HomePageData {
  rodadasCaptacao: StartupCaptacao[];
  startupsVerificadas: StartupCard[];
  startupsAceleradas: StartupCard[];
  startupsAprovacao: StartupCard[];
  oportunidades: StartupCard[];
  depoimentosInvestidores: DepoimentoInvestidor[];
  depoimentosFundadores: DepoimentoFundador[];
}
```

### 6.2 Exemplo de Resposta da API

```json
{
  "error": false,
  "message": "Dados carregados com sucesso",
  "codigo": 200,
  "data": {
    "rodadasCaptacao": [
      {
        "id": "startup-001",
        "nome": "TechFlow",
        "descricao": "Plataforma de automação para fintechs",
        "imagemUrl": "/images/techflow.jpg",
        "selos": ["verificada", "acelerada"],
        "valuationOfertado": 10,
        "valorAtual": 5000000,
        "totalTokens": 10000,
        "tokensVendidos": 4500,
        "categoria": "FinTech"
      }
    ],
    "startupsVerificadas": [],
    "startupsAceleradas": [],
    "startupsAprovacao": [],
    "oportunidades": [],
    "depoimentosInvestidores": [],
    "depoimentosFundadores": []
  }
}
```

---

## 7. Acessibilidade

| Requisito | Implementação |
|-----------|---------------|
| Foco visível | `focus:ring-2 focus:ring-blue-500 focus:ring-offset-2` |
| Alt text | Todas as imagens com descrição |
| Navegação teclado | Tab para navegar, Enter para ativar |
| Carrosséis | Botões acessíveis, aria-labels |
| Contraste | Mínimo 4.5:1 para textos |
| Leitor de tela | Landmarks semânticos (header, main, footer) |

---

## 8. Critérios de Aceitação

### 8.1 Header
- [ ] Logo clicável retorna para `/`
- [ ] Seletor de idioma funcional com 4 opções
- [ ] Botão Entrar redireciona para `/login`
- [ ] Theme toggler alterna entre dark/light
- [ ] Header permanece fixo ao rolar

### 8.2 Hero
- [ ] Textos renderizados corretamente
- [ ] CTAs navegam para rotas corretas
- [ ] Layout responsivo funcionando

### 8.3 Carrosséis
- [ ] Botões front/back funcionais
- [ ] Regras de visibilidade dos botões aplicadas
- [ ] Scroll suave entre cards
- [ ] Cards clicáveis navegam para `/startup/:id`

### 8.4 Filtros de Oportunidades
- [ ] Todos os filtros navegam para `/investimento/:filter`
- [ ] Grid responsivo (1/2/4 colunas)

### 8.5 Estados
- [ ] Loading exibe skeletons
- [ ] Erro exibe mensagem com retry
- [ ] Vazio exibe placeholder

---

## 9. Observações Técnicas

1. **shadcn/ui:** Usar apenas via import e customização com `className`
2. **Componentes UI:** Evitar modificar arquivos em `app/components/ui` diretamente
3. **CSS:** Garantir consistência com `app/app.css` e `doc/css_padrão.md`
4. **Performance:** Lazy loading para imagens de startups
5. **SEO:** Meta tags para descrição e Open Graph

---

## 10. Referências Cruzadas

| Documento | Descrição |
|-----------|-----------|
| [SPEC/01-homepage.md](../SPEC/01-homepage.md) | Especificação técnica detalhada |
| [style/01-homepage-documentation.md](../style/01-homepage-documentation.md) | Documentação de estilos |
| [style/01iselftoken-homepage.jsx](../style/01iselftoken-homepage.jsx) | Exemplo de implementação |
| [descritivo/01-homepage.md](../descritivo/01-homepage.md) | Descrição funcional original |
| [css_padrão.md](../css_padrão.md) | Design System |
