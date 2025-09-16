---
description: Página de gerenciamento de startups /dashboard_startups - Dashboard do Fundador
---

# Página `/dashboard_startups`
# Título: Dashboard
# SubTítulo: Gerenciamento de Startups

## Descrição Geral
Página responsável pelo gerenciamento completo de startups do usuário fundador. Esta página é exclusiva para o role "fundador" (definido no perfil) e apresenta uma interface moderna e funcional com cards de estatísticas, tabela responsiva de startups e modais para operações CRUD.

### Funcionalidades Principais
- Dashboard com métricas em tempo real
- Tabela responsiva com filtros e busca
- Modais para cadastro/edição com validação robusta
- Estados de loading e feedback visual
- Responsividade mobile-first
- Acessibilidade completa

## Arquitetura de Componentes

### 1. Dashboard Statistics (`StartupStatsCards`)
**Tipo:** Server Component
**Props:** `{ stats: StartupStats }`

Cards mostrando métricas essenciais:
- **Investimento Total**: Valor total captado (formatado em BRL)
- **Total de Investidores**: Número único de investidores
- **Startups Ativas**: Status aprovadas/operando
- **Startups Pendentes**: Status em análise/aprovação
- **Loading states** com skeleton loaders
- **Responsividade** com grid adaptativo

### 2. Startup Table (`StartupDataTable`)
**Tipo:** Server Component com client interactions
**Props:** `{ startups: Startup[], totalCount: number }`

**Colunas:**
- ID, Nome, CNPJ (com máscara), Área de Atuação
- Estágio, Meta de Captação (formatada), Status, Ações

**Funcionalidades:**
- **Paginação server-side** (10 itens por página)
- **Filtros avançados**: status, área, estágio, meta de captação
- **Busca em tempo real**: nome, CNPJ
- **Ordenação**: todas as colunas
- **Responsividade**: cards em mobile, tabela em desktop
- **Estados de loading** com skeleton rows
- **Empty state** quando não há dados

### 3. Add Startup Button (`AddStartupButton`)
- Botão primário com ícone "+" 
- Loading state durante operações
- Tooltip explicativo

### 4. Startup Form Modal (`StartupFormModal`)
**Tipo:** Client Component
**Bibliotecas:** react-hook-form + Zod + remask

#### Seções do Formulário

##### **Informações Básicas**
- **Status**: Badge visual (não editável) - "Em Análise", "Aprovada", "Ativa", "Pausada", "Rejeitada"
- **Nome**: input text (obrigatório, min: 2, max: 100)
- **País**: select (obrigatório)
  - Select carregado pela API `http://3.23.98.16/apiV0/countries`
  - Valor: `iso3`, Label: `emoji + native`
  - Exemplo: "🇧🇷 Brasil" (valor: "BRA")
  - **Tradução de Labels**: Suporte a múltiplos idiomas
    - Inglês Internacional (EN-US)
    - Inglês Britânico (EN-GB) 
    - Português Brasil (PT-BR)
    - Português Portugal (PT-PT)
    - Espanhol (ES)
    - Usar biblioteca de i18n para traduzir `name` baseado no locale atual
- **Ícone do País**: emoji visual (não editável)
  - Renderizado automaticamente quando país for selecionado
  - Busca pelo `iso3` e exibe a propriedade `emoji`
  - Em edição: apenas renderiza o emoji, só muda se trocar o país

  
- **CNPJ**: input com máscara usando `applyCnpjMask` (obrigatório, validação de CNPJ válido)
- **Data de Fundação**: date picker (obrigatório, não permite datas futuras)
- **Área de Atuação**: select (obrigatório)
  - Fintech, Healthtech, Edtech, Agrotech, Retailtech, Lawtech/Legaltech, Construtech, Foodtech, SaaS, Marketplace
- **Estágio**: select (obrigatório)
  - Ideação, MVP, Operação, Tração, ScaleUp, Incubadora, Aceleradora

##### **Links e Presença Digital**
- **Site**: input URL (validação de URL válida)
- **Redes Sociais** (componente `SocialMediaFields`):
  - Facebook, Instagram, LinkedIn, Twitter/X, YouTube
  - Validação de URL para cada rede social
- **Logo**: upload de imagem (comp-543.json)
  - Formatos: PNG, JPG (max: 2MB)
  - Preview da imagem
  - Drag & drop support

##### **Apresentação**
- **Vídeo Pitch**: input URL (validação YouTube)
- **Pitch PDF**: input URL (validação de link público)
- **Descritivo Básico**: textarea (obrigatório, min: 10, max: 200)
  - Descrição básica para marketplace
- **Imagem Marketplace**: input URL (validação de URL de imagem)
  - Imagem para exibição no marketplace
- **Descrição de Objetivo**: textarea (obrigatório, min: 50, max: 1000)
  - Descrição completa para página da startup

##### **Dados Bancários** (componente `BankingFields`)
- **Banco**: input text (obrigatório)
- **Agência**: input text com máscara (obrigatório)
- **Conta**: input text com dígito verificador (obrigatório)
- **Tipo**: select (Conta Corrente, Conta Poupança, Digital) - obrigatório
- **Titular**: input text (obrigatório)

##### **Investimento e Equity**
- **Meta de Captação**: input currency com máscara BRL (obrigatório)
- **Equity Oferecido**: input percentage (obrigatório, 1-49%)
- **Valuation Calculado**: display readonly (calculado automaticamente)
  - Fórmula: `(Meta de Captação / Equity) * 100`
  - Preview em tempo real

#### Validações de Negócio (Schema Zod)

```typescript
const startupSchema = z.object({
  nome: z.string().min(2, 'Nome muito curto').max(100, 'Nome muito longo'),
  pais: z.string().min(3, 'País obrigatório'), // iso3
  cnpj: z.string().refine(validateCNPJ, 'CNPJ inválido'),
  dataFundacao: z.date().max(new Date(), 'Data não pode ser futura'),
  areaAtuacao: z.enum(['Fintech', 'Healthtech', 'Edtech', 'Agrotech', 'Retailtech', 'Lawtech', 'Construtech', 'Foodtech', 'SaaS', 'Marketplace']),
  estagio: z.enum(['Ideação', 'MVP', 'Operação', 'Tração', 'ScaleUp', 'Incubadora', 'Aceleradora']),
  site: z.string().url('URL inválida').optional(),
  videoYoutube: z.string().refine(isYouTubeUrl, 'URL do YouTube inválida').optional(),
  pitchPdf: z.string().url('URL inválida').optional(),
  descritivoBasico: z.string().min(10, 'Muito curto').max(200, 'Muito longo'),
  imagemMarketplace: z.string().url('URL inválida').optional(),
  descricaoObjetivo: z.string().min(50, 'Muito curto').max(1000, 'Muito longo'),
  metaCaptacao: z.number()
    .refine((val, ctx) => {
      const estagio = ctx.parent.estagio
      if (['Ideação', 'MVP'].includes(estagio)) {
        return val >= 100000 && val <= 500000
      }
      return val <= 15000000
    }, 'Meta de captação inválida para o estágio'),
  equityOferecido: z.number().min(1, 'Mínimo 1%').max(49, 'Máximo 49%'),
  // ... campos bancários e redes sociais
})
```

#### Estados e Feedback Visual
- **Cards de alerta** para validações de meta de captação
- **Loading states** em todas as operações assíncronas
- **Toast notifications** para success/error
- **Error boundaries** para falhas críticas
- **Retry mechanism** para uploads

### 5. Action Buttons

#### **Edit Button** (`EditStartupButton`)
- Ícone de edição com tooltip
- Abre modal pré-preenchido
- Loading state durante fetch de dados

#### **Delete Button** (`DeleteStartupButton`)
- Ícone de exclusão com confirmação
- Modal de confirmação com detalhes da startup
- Ação irreversível com dupla confirmação
- Loading state durante operação

#### **History Button** (`StartupHistoryButton`)
Modal com tabela de histórico:
- **Colunas**: ID, Valor Captado, Data da Captação, Status da Campanha
- **Paginação** para grandes volumes
- **Filtros**: período, status
- **Export**: CSV/Excel

#### **Investors Button** (`StartupInvestorsButton`)
Modal com tabela de investidores:
- **Colunas**: ID, Nome, Email (privacidade), Total de Tokens, Data
- **Privacidade**: email mascarado se investidor não autorizar
- **Filtros**: período, valor investido
- **Export**: CSV respeitando privacidade

## Aspectos Técnicos

### Performance
- **Server Components** para dados estáticos
- **Lazy loading** para modais pesados
- **Debounce** nas buscas (300ms)
- **Memoização** de componentes pesados

### Acessibilidade
- **ARIA labels** completos
- **Navegação por teclado** em todos os modais
- **Screen reader** friendly
- **Contraste WCAG AA** em todos os elementos
- **Focus management** adequado

### Responsividade
- **Mobile-first** design
- **Breakpoints**: sm (640px), md (768px), lg (1024px)
- **Tabela responsiva**: cards em mobile
- **Touch-friendly** buttons (min 44px)

### Estados de Loading
- **Skeleton loaders** para tabelas e cards
- **Shimmer effects** durante carregamento
- **Progress indicators** para uploads
- **Optimistic updates** onde aplicável

### Tratamento de Erros
- **Error boundaries** por seção
- **Fallback UI** para componentes quebrados
- **Retry mechanisms** com backoff
- **User-friendly error messages**

## Implementação Técnica

### Validação com Zod + react-hook-form
- Schema tipado para toda a estrutura
- Validação em tempo real
- Mensagens de erro personalizadas
- Integração com `@hookform/resolvers/zod`

### Máscaras e Formatação
- **CNPJ**: `applyCnpjMask` de `src/lib/mask-utils.ts`
- **Valores monetários**: formatação BRL automática
- **Percentuais**: formatação com %
- **Datas**: formato brasileiro (DD/MM/AAAA)

### Integração com API
- **Loading states** para todas as operações
- **Error handling** robusto
- **Retry logic** para falhas temporárias
- **Optimistic updates** para melhor UX

### Internacionalização (i18n)
- **Biblioteca**: `next-intl` (já configurada no projeto)
- **Suporte a idiomas**:
  - Inglês Internacional (EN-US)
  - Inglês Britânico (EN-GB) 
  - Português Brasil (PT-BR) - padrão
  - Português Portugal (PT-PT)
  - Espanhol (ES)
- **Tradução de países**: Usar `name` da API traduzido conforme locale
- **Labels do formulário**: Todos os textos devem ser traduziveis
- **Mensagens de validação**: Internacionalizadas via Zod + i18n



## API de Países

**Endpoint:** `http://3.23.98.16/apiV0/countries`
**Método:** GET
**Exemplo de resposta:** 
```json
{
    "status": "success",
    "message": "Todos os países",
    "data": [
        {
            "id": 1,
            "name": "Afghanistan",
            "iso3": "AFG",
            "iso2": "AF",
            "numeric_code": "004",
            "phonecode": "93",
            "capital": "Kabul",
            "currency": "AFN",
            "currency_name": "Afghan afghani",
            "currency_symbol": "؋",
            "tld": ".af",
            "native": "افغانستان",
            "region": "Asia",
            "region_id": "3",
            "subregion": "Southern Asia",
            "subregion_id": "14",
            "nationality": "Afghan",
            "timezones": "[{zoneName:'Asia\\/Kabul',gmtOffset:16200,gmtOffsetName:'UTC+04:30',abbreviation:'AFT',tzName:'Afghanistan Time'}]",
            "latitude": "33.00000000",
            "longitude": "65.00000000",
            "emoji": "🇦🇫",
            "emojiU": "U+1F1E6 U+1F1EB"
        },
        {
            "id": 2,
            "name": "Aland Islands",
            "iso3": "ALA",
            "iso2": "AX",
            "numeric_code": "248",
            "phonecode": "358",
            "capital": "Mariehamn",
            "currency": "EUR",
            "currency_name": "Euro",
            "currency_symbol": "€",
            "tld": ".ax",
            "native": "Åland",
            "region": "Europe",
            "region_id": "4",
            "subregion": "Northern Europe",
            "subregion_id": "18",
            "nationality": "Aland Island",
            "timezones": "[{zoneName:'Europe\\/Mariehamn',gmtOffset:7200,gmtOffsetName:'UTC+02:00',abbreviation:'EET',tzName:'Eastern European Time'}]",
            "latitude": "60.11666700",
            "longitude": "19.90000000",
            "emoji": "🇦🇽",
            "emojiU": "U+1F1E6 U+1F1FD"
        },
        {
            "id": 3,
            "name": "Albania",
            "iso3": "ALB",
            "iso2": "AL",
            "numeric_code": "008",
            "phonecode": "355",
            "capital": "Tirana",
            "currency": "ALL",
            "currency_name": "Albanian lek",
            "currency_symbol": "Lek",
            "tld": ".al",
            "native": "Shqipëria",
            "region": "Europe",
            "region_id": "4",
            "subregion": "Southern Europe",
            "subregion_id": "16",
            "nationality": "Albanian ",
            "timezones": "[{zoneName:'Europe\\/Tirane',gmtOffset:3600,gmtOffsetName:'UTC+01:00',abbreviation:'CET',tzName:'Central European Time'}]",
            "latitude": "41.00000000",
            "longitude": "20.00000000",
            "emoji": "🇦🇱",
            "emojiU": "U+1F1E6 U+1F1F1"
        },
        {
            "id": 4,
            "name": "Algeria",
            "iso3": "DZA",
            "iso2": "DZ",
            "numeric_code": "012",
            "phonecode": "213",
            "capital": "Algiers",
            "currency": "DZD",
            "currency_name": "Algerian dinar",
            "currency_symbol": "دج",
            "tld": ".dz",
            "native": "الجزائر",
            "region": "Africa",
            "region_id": "1",
            "subregion": "Northern Africa",
            "subregion_id": "1",
            "nationality": "Algerian",
            "timezones": "[{zoneName:'Africa\\/Algiers',gmtOffset:3600,gmtOffsetName:'UTC+01:00',abbreviation:'CET',tzName:'Central European Time'}]",
            "latitude": "28.00000000",
            "longitude": "3.00000000",
            "emoji": "🇩🇿",
            "emojiU": "U+1F1E9 U+1F1FF"
        },
        {
            "id": 5,
            "name": "American Samoa",
            "iso3": "ASM",
            "iso2": "AS",
            "numeric_code": "016",
            "phonecode": "1",
            "capital": "Pago Pago",
            "currency": "USD",
            "currency_name": "United States dollar",
            "currency_symbol": "$",
            "tld": ".as",
            "native": "American Samoa",
            "region": "Oceania",
            "region_id": "5",
            "subregion": "Polynesia",
            "subregion_id": "22",
            "nationality": "American Samoan",
            "timezones": "[{zoneName:'Pacific\\/Pago_Pago',gmtOffset:-39600,gmtOffsetName:'UTC-11:00',abbreviation:'SST',tzName:'Samoa Standard Time'}]",
            "latitude": "-14.33333333",
            "longitude": "-170.00000000",
            "emoji": "🇦🇸",
            "emojiU": "U+1F1E6 U+1F1F8"
        },
        {
            "id": 6,
            "name": "Andorra",
            "iso3": "AND",
            "iso2": "AD",
            "numeric_code": "020",
            "phonecode": "376",
            "capital": "Andorra la Vella",
            "currency": "EUR",
            "currency_name": "Euro",
            "currency_symbol": "€",
            "tld": ".ad",
            "native": "Andorra",
            "region": "Europe",
            "region_id": "4",
            "subregion": "Southern Europe",
            "subregion_id": "16",
            "nationality": "Andorran",
            "timezones": "[{zoneName:'Europe\\/Andorra',gmtOffset:3600,gmtOffsetName:'UTC+01:00',abbreviation:'CET',tzName:'Central European Time'}]",
            "latitude": "42.50000000",
            "longitude": "1.50000000",
            "emoji": "🇦🇩",
            "emojiU": "U+1F1E6 U+1F1E9"
        },
        {
            "id": 7,
            "name": "Angola",
            "iso3": "AGO",
            "iso2": "AO",
            "numeric_code": "024",
            "phonecode": "244",
            "capital": "Luanda",
            "currency": "AOA",
            "currency_name": "Angolan kwanza",
            "currency_symbol": "Kz",
            "tld": ".ao",
            "native": "Angola",
            "region": "Africa",
            "region_id": "1",
            "subregion": "Middle Africa",
            "subregion_id": "2",
            "nationality": "Angolan",
            "timezones": "[{zoneName:'Africa\\/Luanda',gmtOffset:3600,gmtOffsetName:'UTC+01:00',abbreviation:'WAT',tzName:'West Africa Time'}]",
            "latitude": "-12.50000000",
            "longitude": "18.50000000",
            "emoji": "🇦🇴",
            "emojiU": "U+1F1E6 U+1F1F4"
        },
    ]
}
```

    
  
  


