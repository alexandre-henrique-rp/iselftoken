# PRD — Editar Startup (13-update-startup)

## 1. Visão Geral

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Editar dados de uma startup existente com abas internas |
| **Rota** | `/dashboard/startups/:id/edit` |
| **Path** | `app/routes/private/dashboard/startups/[id]/edit/index.tsx` |
| **Componentes** | `app/routes/private/dashboard/startups/[id]/edit/components/index.tsx` |
| **APIs** | `StartupApi.getById()`, `StartupApi.update()` |
| **Tipo** | Private (requer plano fundador + ser dono da startup) |
| **Design System** | Tailwind CSS v4 + shadcn/ui (tema stone) |

## 2. Dependências

### 2.1 APIs Utilizadas
```typescript
// app/api/startupApi.ts
StartupApi.getById(id: string): Promise<Startup>
StartupApi.update(id: string, data: UpdateStartupDTO): Promise<Startup>
StartupApi.uploadLogo(file: File): Promise<UploadResponse>
StartupApi.uploadPitchDeck(file: File): Promise<UploadResponse>
StartupApi.addTeamMember(id: string, member: TeamMember): Promise<void>
StartupApi.removeTeamMember(id: string, memberId: string): Promise<void>
```

### 2.2 Contextos
- `AuthContext` — verificação de autenticação
- `UserContext` — dados do usuário e plano

### 2.3 Validação de Acesso
```typescript
import { validateFundadorPlan } from '@/lib/special-functions';

// Verificar plano fundador
if (!validateFundadorPlan(user)) {
  redirect('/plans');
}

// Verificar propriedade da startup
const startup = await StartupApi.getById(id);
if (startup.ownerId !== user.id) {
  redirect('/dashboard/startups');
}
```

### 2.4 Componentes UI
- `Tabs` — navegação entre abas
- `Card` — containers por seção
- `Input` — campos de texto
- `Select` — dropdowns
- `Textarea` — descrições
- `FileUpload` — uploads
- `Button` — ações
- `Progress` — barra de recursos

## 3. Requisitos Funcionais

### 3.1 Header da Página

| Elemento | Descrição | Ação |
|----------|-----------|------|
| Título | "Editar Startup: {nome}" | — |
| Status | Badge com status atual | — |
| Breadcrumb | Dashboard > Startups > Editar | Navegação |

```typescript
interface EditHeaderProps {
  startup: {
    nome: string;
    status: 'aprovada' | 'em_analise' | 'rejeitada';
  };
  onBack: () => void;
}
```

### 3.2 Sistema de Abas

| Aba | Descrição | Ícone |
|-----|-----------|-------|
| Dados Gerais | Informações básicas da startup | FileText |
| Localização | Endereço e país | MapPin |
| Financeiro | Captação e uso de recursos | TrendingUp |
| Time | Membros da equipe | Users |
| Configurações | Opções avançadas | Settings |

```typescript
interface TabsConfig {
  tabs: {
    id: string;
    label: string;
    icon: string;
    component: React.ComponentType;
  }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}
```

### 3.3 Aba: Dados Gerais

| Campo | Tipo | Editável | Validação |
|-------|------|----------|-----------|
| Nome | text | Sim | 3-100 caracteres |
| Razão social | text | Não (após aprovação) | — |
| CNPJ | text | Não (após aprovação) | — |
| Área de atuação | select | Sim | Lista predefinida |
| Estágio | select | Sim | Lista predefinida |
| Descrição | textarea | Sim | 50-2000 caracteres |
| Logo | file | Sim | JPG/PNG, max 2MB |
| Pitch deck | file | Sim | PDF, max 20MB |
| Vídeo pitch | url | Sim | YouTube/Vimeo |

```typescript
interface DadosGeraisForm {
  nome: string;
  razaoSocial: string; // readonly após aprovação
  cnpj: string; // readonly após aprovação
  areaAtuacao: string;
  estagio: string;
  descricao: string;
  logoUrl: string;
  pitchDeckUrl?: string;
  videoPitch?: string;
  redesSociais: Record<string, string>;
}
```

### 3.4 Aba: Localização

| Campo | Tipo | Validação |
|-------|------|-----------|
| País | select | Lista com emoji e ISO3 |
| Estado/Região | text/select | Obrigatório |
| Cidade | text | Obrigatório |
| Endereço | text | Opcional |
| CEP | text | Formato válido |

```typescript
interface LocalizacaoForm {
  pais: {
    iso3: string;
    nome: string;
    emoji: string;
  };
  estado: string;
  cidade: string;
  endereco?: string;
  cep?: string;
  coordenadas?: {
    lat: number;
    lng: number;
  };
}
```

**Seleção de País:**
- Dropdown com bandeira (emoji) + nome
- Retorna objeto `{ iso3, nome, emoji }`
- Busca por nome ou código

### 3.5 Aba: Financeiro

| Seção | Campos |
|-------|--------|
| Captação | Meta, equity, valuation (readonly) |
| Tokens | Total, vendidos, preço unitário |
| Uso de recursos | Distribuição percentual |

```typescript
interface FinanceiroForm {
  captacao: {
    meta: number;
    equity: number;
    valuation: number; // calculado, readonly
    arrecadado: number; // readonly
    percentualCaptado: number; // readonly
  };
  tokens: {
    total: number;
    vendidos: number; // readonly
    disponiveis: number; // readonly
    precoUnitario: number;
  };
  usoRecursos: {
    categoria: string;
    percentual: number;
    descricao?: string;
  }[];
}
```

**Uso de Recursos (Regra dos 100%):**
```typescript
// A soma dos percentuais DEVE ser exatamente 100%
const totalPercentual = usoRecursos.reduce(
  (acc, item) => acc + item.percentual,
  0
);

if (totalPercentual !== 100) {
  throw new Error('A soma dos recursos deve ser 100%');
}
```

**Categorias de Uso:**
- Marketing e vendas
- Desenvolvimento de produto
- Operações
- Contratações
- Infraestrutura
- Reserva/Capital de giro
- Outros

### 3.6 Aba: Time

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Membros | lista | Cards de membros |
| Adicionar | botão | Modal para novo membro |
| Editar | ação | Editar membro existente |
| Remover | ação | Confirmar remoção |

```typescript
interface TeamMember {
  id: string;
  nome: string;
  cargo: string;
  foto?: string;
  linkedin?: string;
  bio?: string;
  fundador: boolean;
}

interface TimeForm {
  membros: TeamMember[];
  onAdd: (member: Omit<TeamMember, 'id'>) => void;
  onEdit: (id: string, member: Partial<TeamMember>) => void;
  onRemove: (id: string) => void;
}
```

**Modal Adicionar Membro:**
- Nome completo (obrigatório)
- Cargo (obrigatório)
- Foto (opcional, upload)
- LinkedIn (opcional)
- Bio curta (opcional, max 300 chars)
- É fundador? (checkbox)

### 3.7 Aba: Configurações

| Opção | Tipo | Descrição |
|-------|------|-----------|
| Visibilidade | toggle | Pública ou privada |
| Notificações | toggle | Receber e-mails |
| Dados bancários | form | Conta para recebimento |
| Excluir startup | botão | Exclusão permanente |

```typescript
interface ConfigForm {
  visibilidade: 'publica' | 'privada';
  notificacoes: {
    novosInvestidores: boolean;
    atualizacoesCaptacao: boolean;
    mensagens: boolean;
  };
  dadosBancarios: {
    banco: string;
    agencia: string;
    conta: string;
    digito: string;
    titular: string;
    documento: string;
    chavePix?: string;
  };
}
```

### 3.8 Barra de Ações Fixa

| Botão | Posição | Ação | Estado |
|-------|---------|------|--------|
| Cancelar | Esquerda | Descarta alterações | Sempre visível |
| Salvar | Direita | Salva alterações | Desabilitado se inválido |

```typescript
interface ActionBarProps {
  hasChanges: boolean;
  isValid: boolean;
  isLoading: boolean;
  onCancel: () => void;
  onSave: () => void;
}
```

## 4. Estruturas de Dados

### 4.1 UpdateStartupDTO

```typescript
interface UpdateStartupDTO {
  // Dados Gerais
  nome?: string;
  areaAtuacao?: string;
  estagio?: string;
  descricao?: string;
  logoUrl?: string;
  pitchDeckUrl?: string;
  videoPitch?: string;
  redesSociais?: Record<string, string>;

  // Localização
  paisIso3?: string;
  estado?: string;
  cidade?: string;
  endereco?: string;
  cep?: string;

  // Financeiro
  usoRecursos?: {
    categoria: string;
    percentual: number;
    descricao?: string;
  }[];

  // Configurações
  visibilidade?: 'publica' | 'privada';
  notificacoes?: Record<string, boolean>;
  dadosBancarios?: {
    banco: string;
    agencia: string;
    conta: string;
    digito: string;
    titular: string;
    documento: string;
    chavePix?: string;
  };
}
```

### 4.2 Estado do Formulário

```typescript
interface EditFormState {
  originalData: Startup;
  currentData: Startup;
  activeTab: string;
  hasChanges: boolean;
  isLoading: boolean;
  errors: Record<string, string>;
  isSaving: boolean;
}
```

## 5. Requisitos de UI/UX

### 5.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ← Dashboard / Startups                                     │
│                                                             │
│  Editar Startup: TechFlow                    ● Aprovada     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Dados Gerais] [Localização] [Financeiro] [Time] [⚙] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ DADOS GERAIS                                        │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │ Nome *                                              │   │
│  │ [TechFlow_______________________________]           │   │
│  │                                                     │   │
│  │ Razão social                     🔒 Não editável    │   │
│  │ [TechFlow Soluções Ltda__________]                 │   │
│  │                                                     │   │
│  │ CNPJ                             🔒 Não editável    │   │
│  │ [12.345.678/0001-90______________]                 │   │
│  │                                                     │   │
│  │ Área de atuação *                 Estágio *         │   │
│  │ [▼ Tecnologia / SaaS]            [▼ Seed]          │   │
│  │                                                     │   │
│  │ Descrição *                                         │   │
│  │ ┌────────────────────────────────────────────┐     │   │
│  │ │ TechFlow é uma startup de automação...    │     │   │
│  │ └────────────────────────────────────────────┘     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                          [Cancelar]        [Salvar]         │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Layout Aba Financeiro (Uso de Recursos)

```
┌─────────────────────────────────────────────────────────────┐
│  USO DE RECURSOS                                            │
│  A soma deve ser exatamente 100%                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Marketing e vendas                          [30] %   │   │
│  │ ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Desenvolvimento de produto                  [40] %   │   │
│  │ ████████████████████████████████░░░░░░░░░░░░░░░░░  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Operações                                   [20] %   │   │
│  │ ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Reserva                                     [10] %   │   │
│  │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Total: 100% ✓                      [+ Adicionar categoria] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Cores e Estilos

| Elemento | Classe Tailwind |
|----------|-----------------|
| Background página | `bg-stone-950` |
| Card premium | `bg-stone-900 border border-stone-800 rounded-xl p-6` |
| Tab ativa | `border-b-2 border-[#d500f9] text-stone-100` |
| Tab inativa | `text-stone-400 hover:text-stone-200` |
| Input readonly | `bg-stone-800/50 text-stone-500 cursor-not-allowed` |
| Input | `bg-stone-800 border-stone-700 text-stone-100` |
| Progress bar | `bg-stone-700` com fill dinâmico |
| Barra ações | `bg-stone-900/80 backdrop-blur border-t border-stone-800` |
| Botão salvar | `bg-[#d500f9] hover:bg-[#b000d4] text-white` |
| Badge status | Cores conforme status |

### 5.4 Transições entre Tabs

```css
/* Transição suave ao mudar de aba */
.tab-content {
  @apply transition-all duration-300 ease-in-out;
}

.tab-enter {
  @apply opacity-0 translate-x-4;
}

.tab-enter-active {
  @apply opacity-100 translate-x-0;
}
```

## 6. Estados e Feedbacks

### 6.1 Loading

| Estado | Comportamento |
|--------|---------------|
| Carregando startup | Skeleton em todo formulário |
| Salvando | Spinner no botão + barra desabilitada |
| Upload | Progress bar com percentual |
| Mudando aba | Fade transition |

### 6.2 Validação

| Regra | Feedback |
|-------|----------|
| Campo obrigatório vazio | Borda vermelha + mensagem |
| Uso de recursos ≠ 100% | Alerta + botão desabilitado |
| URL inválida | Mensagem inline |
| Arquivo muito grande | Toast de erro |

### 6.3 Dirty State

```typescript
// Detectar alterações não salvas
const hasChanges = useMemo(() => {
  return JSON.stringify(originalData) !== JSON.stringify(currentData);
}, [originalData, currentData]);

// Alerta ao sair
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasChanges]);
```

### 6.4 Toasts

| Evento | Tipo | Mensagem |
|--------|------|----------|
| Salvo com sucesso | success | "Startup atualizada com sucesso!" |
| Erro ao salvar | error | "Erro ao salvar. Tente novamente." |
| Membro adicionado | success | "Membro adicionado à equipe" |
| Membro removido | info | "Membro removido da equipe" |

## 7. Fluxo de Edição

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Carregar   │────▶│   Editar    │────▶│   Salvar    │
│   Startup   │     │   Campos    │     │  Alterações │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           │                    ▼
                           │             ┌─────────────┐
                           │             │   Validar   │
                           │             │   Dados     │
                           │             └─────────────┘
                           │                    │
                           ▼                    │
                    ┌─────────────┐             │
                    │  Alternar   │◀────────────┘
                    │    Abas     │
                    └─────────────┘
```

## 8. Acessibilidade

| Requisito | Implementação |
|-----------|---------------|
| Tabs | `role="tablist"`, `role="tab"`, `role="tabpanel"` |
| Tab navegação | Arrow keys para navegar, Enter para selecionar |
| Focus | `focus-visible:ring-2 focus-visible:ring-[#d500f9]` |
| Campos readonly | `aria-readonly="true"` |
| Erros | `aria-invalid`, `aria-describedby` |
| Barra fixa | `role="toolbar"` |

```tsx
// Exemplo de tabs acessíveis
<div role="tablist" aria-label="Seções da startup">
  <button
    role="tab"
    aria-selected={activeTab === 'dados'}
    aria-controls="panel-dados"
    tabIndex={activeTab === 'dados' ? 0 : -1}
  >
    Dados Gerais
  </button>
</div>
<div
  role="tabpanel"
  id="panel-dados"
  aria-labelledby="tab-dados"
>
  {/* Conteúdo */}
</div>
```

## 9. Critérios de Aceitação

- [ ] Carrega dados da startup corretamente
- [ ] Tabs navegam entre seções
- [ ] Campos readonly após aprovação (CNPJ, razão social)
- [ ] Uso de recursos soma exatamente 100%
- [ ] Seleção de país retorna { iso3, nome, emoji }
- [ ] Upload de logo/pitch deck funciona
- [ ] Adicionar/remover membros do time funciona
- [ ] Barra de ações fixa no bottom
- [ ] Botão salvar desabilitado se inválido
- [ ] Alerta ao sair com alterações não salvas
- [ ] Toast de sucesso/erro ao salvar
- [ ] Transições suaves entre tabs
- [ ] Responsivo em mobile
- [ ] Verifica propriedade da startup

## 10. Notas Técnicas

- Usar `react-hook-form` para gerenciamento de formulário
- Validação com `zod` schemas por aba
- Estado centralizado com `useReducer`
- Comparação deep para detectar mudanças
- Throttle no salvamento automático (opcional)
- Cache de 5 minutos para dados da startup

## 11. Referências Cruzadas

| Documento | Relação |
|-----------|---------|
| [07-layout.md](./07-layout.md) | Layout pai com sidebar |
| [11-dashboard-startups.md](./11-dashboard-startups.md) | Origem da navegação |
| [12-create-startup.md](./12-create-startup.md) | Criação (estrutura similar) |
| [15-special-functions.md](./15-special-functions.md) | Validação de plano |
| [css_padrão.md](../css_padrão.md) | Design tokens |
| [SPEC/13-update-startup.md](../SPEC/13-update-startup.md) | Especificação técnica |
