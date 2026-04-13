# PRD — Criar Startup (12-create-startup)

## 1. Visão Geral

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Cadastro de nova startup com formulário multi-etapas (wizard) |
| **Rota** | `/dashboard/startups/create` |
| **Path** | `app/routes/private/dashboard/startups/create/index.tsx` |
| **Componentes** | `app/routes/private/dashboard/startups/create/components/index.tsx` |
| **API** | `StartupApi.create()` |
| **Tipo** | Private (requer plano fundador) |
| **Design System** | Tailwind CSS v4 + shadcn/ui (tema stone) |

## 2. Dependências

### 2.1 APIs Utilizadas
```typescript
// app/api/startupApi.ts
StartupApi.create(data: CreateStartupDTO): Promise<Startup>
StartupApi.uploadLogo(file: File): Promise<UploadResponse>
StartupApi.uploadPitchDeck(file: File): Promise<UploadResponse>
```

### 2.2 Contextos
- `AuthContext` — verificação de autenticação
- `UserContext` — dados do usuário e plano

### 2.3 Validação de Acesso
```typescript
import { validateFundadorPlan } from '@/lib/special-functions';

if (!validateFundadorPlan(user)) {
  redirect('/plans');
}
```

### 2.4 Componentes UI
- `Stepper` — indicador de progresso
- `Card` — containers por etapa
- `Input` — campos de texto
- `Select` — dropdowns
- `Textarea` — descrições
- `FileUpload` — uploads
- `Button` — navegação e submit

## 3. Requisitos Funcionais

### 3.1 Header com Breadcrumb

| Elemento | Descrição | Ação |
|----------|-----------|------|
| Link voltar | "← Voltar para Dashboard" | Navega para `/dashboard/startups` |
| Título | "Nova Startup" | — |
| Subtítulo | Etapa atual | — |

```typescript
interface CreateHeaderProps {
  etapaAtual: number;
  totalEtapas: number;
  onBack: () => void;
}
```

### 3.2 Stepper de Progresso

| Etapa | Nome | Ícone |
|-------|------|-------|
| 1 | Informações básicas | Building2 |
| 2 | Captação e valuation | TrendingUp |
| 3 | Mídias e redes sociais | Image |
| 4 | Informações bancárias | CreditCard |

```typescript
interface StepperProps {
  etapas: {
    numero: number;
    nome: string;
    icone: string;
    completa: boolean;
    atual: boolean;
  }[];
  onStepClick?: (etapa: number) => void;
}
```

### 3.3 Etapa 1: Informações Básicas

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| Nome da startup | text | Sim | 3-100 caracteres |
| Razão social | text | Sim | 5-150 caracteres |
| CNPJ | text | Sim | 14 dígitos, formato válido |
| País | select | Sim | Lista de países |
| Área de atuação | select | Sim | Lista predefinida |
| Estágio | select | Sim | Pre-seed, Seed, Series A, etc. |
| Descrição | textarea | Sim | 50-2000 caracteres |

```typescript
interface Etapa1Data {
  nome: string;
  razaoSocial: string;
  cnpj: string;
  pais: {
    iso3: string;
    nome: string;
    emoji: string;
  };
  areaAtuacao: string;
  estagio: 'pre_seed' | 'seed' | 'series_a' | 'series_b' | 'series_c';
  descricao: string;
}
```

**Áreas de Atuação:**
- Tecnologia / SaaS
- Fintech
- HealthTech
- EdTech
- AgriTech
- CleanTech
- E-commerce
- Logística
- Outros

**Estágios:**
- Pre-seed (Ideia/MVP)
- Seed (Produto validado)
- Series A (Tração inicial)
- Series B (Escala)
- Series C+ (Expansão)

### 3.4 Etapa 2: Captação e Valuation

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| Meta de captação | currency | Sim | Mín. R$ 50.000 |
| Equity oferecido | percent | Sim | 1-49% |
| Valuation | currency | Calculado | Automático |
| Total de tokens | number | Sim | Mín. 1000 |
| Preço por token | currency | Calculado | Automático |

```typescript
interface Etapa2Data {
  metaCaptacao: number;
  equityOferecido: number;
  valuation: number; // calculado
  totalTokens: number;
  precoToken: number; // calculado
  prazoCapitacao?: number; // dias
}
```

**Cálculos Automáticos:**
```typescript
// Valuation = (Meta de captação / Equity) × 100
const valuation = (metaCaptacao / equityOferecido) * 100;

// Preço por token = Meta de captação / Total de tokens
const precoToken = metaCaptacao / totalTokens;
```

**Exemplo:**
- Meta: R$ 500.000
- Equity: 10%
- Valuation: R$ 5.000.000
- Tokens: 100.000
- Preço/token: R$ 5,00

### 3.5 Etapa 3: Mídias e Redes Sociais

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| Logo | file | Sim | JPG/PNG, max 2MB, 400x400px |
| Pitch deck | file | Não | PDF, max 20MB |
| Vídeo pitch | url | Não | YouTube/Vimeo URL |
| Website | url | Não | URL válida |
| LinkedIn | url | Não | URL LinkedIn |
| Instagram | url | Não | URL Instagram |
| Twitter/X | url | Não | URL Twitter |
| Outras redes | dynamic | Não | Lista dinâmica |

```typescript
interface Etapa3Data {
  logo: File | string;
  pitchDeck?: File | string;
  videoPitch?: string;
  redesSociais: {
    website?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
    outras: {
      nome: string;
      url: string;
    }[];
  };
}
```

**Lista Dinâmica de Redes:**
- Botão "Adicionar rede social"
- Campos: Nome da rede + URL
- Limite: 5 redes adicionais

### 3.6 Etapa 4: Informações Bancárias

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| Banco | select | Sim | Lista de bancos |
| Tipo de conta | select | Sim | Corrente/Poupança |
| Agência | text | Sim | 4 dígitos |
| Conta | text | Sim | Formato válido |
| Dígito | text | Sim | 1-2 dígitos |
| Titular | text | Sim | Nome completo |
| CPF/CNPJ titular | text | Sim | Documento válido |

```typescript
interface Etapa4Data {
  banco: {
    codigo: string;
    nome: string;
  };
  tipoConta: 'corrente' | 'poupanca';
  agencia: string;
  conta: string;
  digito: string;
  titular: string;
  documentoTitular: string;
  chavePix?: string;
}
```

**Bancos Principais:**
- Banco do Brasil (001)
- Bradesco (237)
- Caixa (104)
- Itaú (341)
- Santander (033)
- Nubank (260)
- Inter (077)
- C6 Bank (336)

### 3.7 Navegação entre Etapas

| Botão | Visibilidade | Ação |
|-------|--------------|------|
| Anterior | Etapas 2-4 | Volta uma etapa |
| Próximo | Etapas 1-3 | Avança (valida etapa atual) |
| Salvar rascunho | Todas | Salva progresso |
| Criar startup | Etapa 4 | Submit final |

```typescript
interface WizardNavigationProps {
  etapaAtual: number;
  totalEtapas: number;
  isValid: boolean;
  isLoading: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}
```

## 4. Estruturas de Dados

### 4.1 CreateStartupDTO

```typescript
interface CreateStartupDTO {
  // Etapa 1
  nome: string;
  razaoSocial: string;
  cnpj: string;
  paisIso3: string;
  areaAtuacao: string;
  estagio: string;
  descricao: string;

  // Etapa 2
  metaCaptacao: number;
  equityOferecido: number;
  totalTokens: number;
  prazoCapitacao?: number;

  // Etapa 3
  logoUrl: string;
  pitchDeckUrl?: string;
  videoPitch?: string;
  redesSociais: Record<string, string>;

  // Etapa 4
  dadosBancarios: {
    banco: string;
    tipoConta: string;
    agencia: string;
    conta: string;
    digito: string;
    titular: string;
    documentoTitular: string;
    chavePix?: string;
  };
}
```

### 4.2 Estado do Wizard

```typescript
interface WizardState {
  etapaAtual: number;
  etapasCompletas: number[];
  dados: {
    etapa1: Partial<Etapa1Data>;
    etapa2: Partial<Etapa2Data>;
    etapa3: Partial<Etapa3Data>;
    etapa4: Partial<Etapa4Data>;
  };
  rascunhoId?: string;
  isLoading: boolean;
  errors: Record<string, string>;
}
```

## 5. Requisitos de UI/UX

### 5.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ← Voltar para Dashboard                                    │
│                                                             │
│  Nova Startup                                               │
│  Etapa 1 de 4: Informações básicas                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ● ─────── ○ ─────── ○ ─────── ○                    │   │
│  │  1.Info   2.Captação  3.Mídias  4.Banco             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ INFORMAÇÕES BÁSICAS                                 │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │ Nome da startup *                                   │   │
│  │ [________________________________________]          │   │
│  │                                                     │   │
│  │ Razão social *                                      │   │
│  │ [________________________________________]          │   │
│  │                                                     │   │
│  │ CNPJ *                                              │   │
│  │ [__.___.___/____-__]                               │   │
│  │                                                     │   │
│  │ País *                    Área de atuação *         │   │
│  │ [▼ Brasil 🇧🇷]            [▼ Tecnologia / SaaS]    │   │
│  │                                                     │   │
│  │ Estágio *                                           │   │
│  │ [▼ Seed - Produto validado]                        │   │
│  │                                                     │   │
│  │ Descrição *                                         │   │
│  │ ┌────────────────────────────────────────────┐     │   │
│  │ │                                            │     │   │
│  │ │                                            │     │   │
│  │ └────────────────────────────────────────────┘     │   │
│  │ 0/2000 caracteres                                  │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│              [Salvar rascunho]         [Próximo →]          │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Layout Etapa 2 (Captação)

```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────┐   │
│  │ CAPTAÇÃO E VALUATION                                │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │ Meta de captação *                                  │   │
│  │ R$ [500.000,00]                                    │   │
│  │                                                     │   │
│  │ Equity oferecido *                                  │   │
│  │ [10] %                                             │   │
│  │                                                     │   │
│  │ ┌───────────────────────────────────────────────┐  │   │
│  │ │  💡 Valuation calculado                       │  │   │
│  │ │                                               │  │   │
│  │ │  R$ 5.000.000,00                             │  │   │
│  │ │  (Meta ÷ Equity × 100)                       │  │   │
│  │ └───────────────────────────────────────────────┘  │   │
│  │                                                     │   │
│  │ Total de tokens *                                   │   │
│  │ [100.000]                                          │   │
│  │                                                     │   │
│  │ Preço por token (calculado)                         │   │
│  │ R$ 5,00                                            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│        [← Anterior]  [Salvar rascunho]  [Próximo →]         │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Cores e Estilos

| Elemento | Classe Tailwind |
|----------|-----------------|
| Background página | `bg-stone-950` |
| Card formulário | `bg-stone-900 border border-stone-800 rounded-lg p-6` |
| Stepper ativo | `bg-[#d500f9] text-white` |
| Stepper completo | `bg-green-600 text-white` |
| Stepper pendente | `bg-stone-700 text-stone-400` |
| Input | `bg-stone-800 border-stone-700 text-stone-100` |
| Input focus | `focus:border-[#d500f9] focus:ring-[#d500f9]` |
| Valuation box | `bg-stone-800/50 border border-[#d500f9]/30 rounded-lg p-4` |
| Botão primário | `bg-[#d500f9] hover:bg-[#b000d4] text-white` |
| Botão secundário | `bg-stone-800 hover:bg-stone-700 text-stone-100` |
| Botão outline | `border border-stone-700 hover:bg-stone-800` |

### 5.4 Máscaras de Input

```typescript
const masks = {
  cnpj: '##.###.###/####-##',
  telefone: '(##) #####-####',
  cep: '#####-###',
  agencia: '####',
  conta: '######-#',
  currency: 'R$ #.###.###,##'
};
```

## 6. Estados e Feedbacks

### 6.1 Validação por Etapa

| Etapa | Validação |
|-------|-----------|
| 1 | Todos os campos obrigatórios preenchidos |
| 2 | Meta > 50k, Equity 1-49%, Tokens > 1000 |
| 3 | Logo obrigatório, URLs válidas |
| 4 | Dados bancários completos |

### 6.2 Estados de Loading

| Ação | Comportamento |
|------|---------------|
| Navegando | Spinner no botão |
| Upload | Progress bar com percentual |
| Salvando rascunho | Toast + indicador |
| Criando startup | Modal de progresso |

### 6.3 Feedbacks

| Evento | Feedback |
|--------|----------|
| Etapa validada | Checkmark verde no stepper |
| Erro de validação | Mensagem inline + borda vermelha |
| Rascunho salvo | Toast success |
| Startup criada | Modal de sucesso + redirecionamento |
| Erro na criação | Toast error + manter dados |

### 6.4 Confirmação de Saída

```typescript
// Alerta ao tentar sair com dados não salvos
useBeforeUnload((event) => {
  if (hasUnsavedChanges) {
    event.preventDefault();
    return "Você tem alterações não salvas. Deseja sair?";
  }
});
```

## 7. Fluxo do Wizard

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Etapa 1 │───▶│ Etapa 2 │───▶│ Etapa 3 │───▶│ Etapa 4 │
│  Info   │    │Captação │    │ Mídias  │    │ Banco   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │
     └──────────────┴──────────────┴──────────────┘
                         │
                    [Salvar rascunho]
                         │
                         ▼
                  ┌─────────────┐
                  │  Rascunho   │
                  │  salvo em   │
                  │ localStorage│
                  └─────────────┘
```

## 8. Acessibilidade

| Requisito | Implementação |
|-----------|---------------|
| Labels | Todos os inputs com `<label>` + `htmlFor` |
| Erros | `aria-invalid`, `aria-describedby` |
| Stepper | `aria-current="step"` no passo atual |
| Focus | Foco no primeiro input ao mudar etapa |
| Navegação | Tab order lógica, Enter para submeter |

## 9. Critérios de Aceitação

- [ ] Stepper mostra progresso correto
- [ ] Navegação entre etapas funciona
- [ ] Validação por etapa bloqueia avanço
- [ ] CNPJ com máscara e validação
- [ ] Valuation calcula automaticamente
- [ ] Preço por token calcula automaticamente
- [ ] Upload de logo funciona
- [ ] Upload de pitch deck funciona
- [ ] Lista dinâmica de redes funciona
- [ ] Dados bancários validados
- [ ] Rascunho salva no localStorage
- [ ] Confirmação ao sair com dados não salvos
- [ ] Criação com sucesso redireciona
- [ ] Erro exibe mensagem clara
- [ ] Formulário responsivo em mobile

## 10. Notas Técnicas

- Usar `react-hook-form` para gerenciamento
- Validação com `zod` por etapa
- Dados do wizard em `useState` ou `useReducer`
- Rascunho em `localStorage` com `debounce`
- Upload com compressão de imagem
- Integração com API de validação CNPJ

## 11. Referências Cruzadas

| Documento | Relação |
|-----------|---------|
| [07-layout.md](./07-layout.md) | Layout pai com sidebar |
| [11-dashboard-startups.md](./11-dashboard-startups.md) | Origem da navegação |
| [13-update-startup.md](./13-update-startup.md) | Edição (estrutura similar) |
| [15-special-functions.md](./15-special-functions.md) | Validação de plano |
| [css_padrão.md](../css_padrão.md) | Design tokens |
| [SPEC/12-create-startup.md](../SPEC/12-create-startup.md) | Especificação técnica |
