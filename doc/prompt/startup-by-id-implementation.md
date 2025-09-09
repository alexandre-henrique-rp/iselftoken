# Prompt para Implementação da Página `/startup/:id`

## 🎯 **OBJETIVO PRINCIPAL**
Implementar uma página híbrida (pública-privada) de detalhes de startup no projeto iSelfToken, seguindo Clean Architecture, DDD e princípios SOLID, com seções públicas e privadas controladas por autenticação.

## 📋 **CONTEXTO DO PROJETO**
- **Framework:** Next.js 15.4.6 com App Router
- **Stack:** React 19, TypeScript 5, Tailwind CSS 4, Shadcn UI
- **Arquitetura:** Clean Architecture com DDD
- **Validação:** Zod + react-hook-form
- **Autenticação:** Sistema A2F com middleware de proteção
- **Localização:** Arquivo deve ser criado em `src/app/(public)/startup/[id]/page.tsx`

## 🎨 **REFERÊNCIA DE DESIGN**
- **Inspiração:** https://eqseed.com/investir/jetbov2025#novidades
- **Padrões CSS:** Seguir `doc/context/05-padroes-e-css.md` ou componentes Shadcn estabelecidos
- **Recursos adicionais:** Dribbble ou Pinterest para inspirações mantendo padrão estabelecido

## 🏗️ **ESTRUTURA DETALHADA DA PÁGINA**

### **SEÇÃO 1: Apresentação da Startup** (Pública)
```typescript
interface StartupHeaderProps {
  logo: string;
  name: string;
  subtitle: string;
}
```
- Logo da startup (lado esquerdo)
- Nome da startup (ao lado do logo)
- Subtítulo da startup (abaixo do nome)

### **SEÇÃO 2: Informações Financeiras** (Pública)
```typescript
interface FinancialInfoProps {
  targetAmount: number;
  currentAmount: number;
  percentage: number;
}
```
- Objetivo financeiro da startup
- Barra de progresso de investimento
- Valor total investido e porcentagem alcançada

### **SEÇÃO 3: Informações de Equity - Card 1** (Pública)
```typescript
interface EquityInfo1Props {
  totalEquity: number;
  remainingTokens: number;
  investedEquity: number;
  totalInvestors: number;
}
```
- Valor total de equity
- Quantidade de tokens restantes
- Valor total de equity investido
- Total de investidores

### **SEÇÃO 4: Informações de Equity - Card 2** (Pública)
```typescript
interface EquityInfo2Props {
  affiliateToken?: string;
  userRole?: 'investidor' | 'startup' | 'admin' | 'afiliado';
  isAuthenticated: boolean;
}
```
- Link de compartilhamento (apenas para role 'afiliado')
- Botão "Comprar Token" com lógica condicional:
  - Se URL contém `?token=token_afiliado`: vincula compra ao afiliado
  - Se não autenticado: redireciona para `/login`
  - Se autenticado: redireciona para página de compra

### **SEÇÃO 5: Pitch de Vendas** (Pública)
```typescript
interface PitchVideoProps {
  youtubeVideoId: string;
}
```
- Embed do vídeo do YouTube com pitch de vendas

### **SEÇÃO 6: Análise da Startup** (Pública)
```typescript
interface AnalysisVideoProps {
  thumbnailUrl: string;
  youtubeVideoId: string;
}
```
- Thumbnail da análise
- Modal com vídeo do YouTube ao clicar na imagem

### **SEÇÃO 7: Resumo da Startup** (Privada - Bloqueada)
```typescript
interface StartupSummaryProps {
  markdownContent: string;
  isAuthenticated: boolean;
}
```
- Conteúdo em Markdown convertido para HTML
- Seção bloqueada com modal flutuante para não autenticados

## 🔒 **SISTEMA DE BLOQUEIO**

### **Modal de Bloqueio - Especificações:**
```typescript
interface BlockingModalProps {
  isVisible: boolean;
  onClose?: never; // Modal não pode ser fechado
}
```

**Comportamento:**
- Modal flutuante independente da posição de rolagem
- Aparece apenas na seção privada (seção 7)
- Não pode ser clicado nem fechado
- Desaparece automaticamente quando volta para seções públicas
- Conteúdo da seção fica embaçado (blur) quando modal está ativo

**Implementação CSS:**
```css
.blurred-content {
  filter: blur(8px);
  pointer-events: none;
}

.blocking-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
}
```

## 🔧 **REQUISITOS TÉCNICOS**

### **1. Estrutura de Componentes**
```
src/app/(public)/startup/[id]/
├── page.tsx (página principal)
├── components/
│   ├── StartupHeader.tsx
│   ├── FinancialInfo.tsx
│   ├── EquityCard1.tsx
│   ├── EquityCard2.tsx
│   ├── PitchVideo.tsx
│   ├── AnalysisVideo.tsx
│   ├── StartupSummary.tsx
│   └── BlockingModal.tsx
```

### **2. Hooks Necessários**
```typescript
// Hook para detectar autenticação
const useAuth = () => {
  // Implementar usando useSession existente
}

// Hook para detectar seção visível
const useVisibleSection = () => {
  // Implementar com Intersection Observer
}

// Hook para parâmetros da URL
const useStartupParams = () => {
  // Extrair ID da startup e token do afiliado
}
```

### **3. Tipos TypeScript**
```typescript
interface Startup {
  id: string;
  name: string;
  subtitle: string;
  logo: string;
  targetAmount: number;
  currentAmount: number;
  totalEquity: number;
  remainingTokens: number;
  investedEquity: number;
  totalInvestors: number;
  pitchVideoId: string;
  analysisVideoId: string;
  analysisThumbnail: string;
  summaryMarkdown: string;
}

interface StartupPageProps {
  params: { id: string };
  searchParams: { token?: string };
}
```

### **4. Validação com Zod**
```typescript
const StartupParamsSchema = z.object({
  id: z.string().min(1, "ID da startup é obrigatório"),
});

const SearchParamsSchema = z.object({
  token: z.string().optional(),
});
```

## 🎨 **DIRETRIZES DE UI/UX**

### **Layout Responsivo:**
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Grid system com Tailwind CSS

### **Cores e Tema:**
- Seguir paleta estabelecida no projeto (#014f86 como cor principal)
- Suporte a dark/light mode
- Consistência com componentes Shadcn existentes

### **Animações:**
- Transições suaves entre seções (300ms ease-in-out)
- Fade in/out para modal de bloqueio
- Loading states para vídeos e conteúdo

### **Acessibilidade:**
- Semântica HTML adequada
- ARIA labels para elementos interativos
- Navegação por teclado
- Contraste adequado de cores

## 📊 **INTEGRAÇÃO COM API**

### **Endpoint Esperado:**
```typescript
// GET /api/startup/[id]
interface StartupApiResponse {
  status: 'success' | 'error';
  message: string;
  data: Startup;
}
```

### **Estados de Loading:**
```typescript
interface LoadingStates {
  startup: boolean;
  video: boolean;
  summary: boolean;
}
```

## 🧪 **TESTES REQUERIDOS**

### **Testes Unitários:**
- Renderização de componentes isolados
- Lógica de autenticação e bloqueio
- Validação de parâmetros da URL
- Conversão de Markdown para HTML

### **Testes de Integração:**
- Fluxo completo de visualização
- Redirecionamentos baseados em autenticação
- Comportamento do modal de bloqueio

### **Testes E2E:**
- Navegação entre seções
- Funcionalidade de compra de tokens
- Reprodução de vídeos

## 📝 **CRITÉRIOS DE ACEITAÇÃO**

### **Funcionalidades Obrigatórias:**
- [ ] Página renderiza corretamente com dados da startup
- [ ] Seções 1-6 são públicas e acessíveis a todos
- [ ] Seção 7 é bloqueada para usuários não autenticados
- [ ] Modal de bloqueio aparece/desaparece conforme navegação
- [ ] Botão "Comprar Token" funciona corretamente
- [ ] Vídeos do YouTube são reproduzidos adequadamente
- [ ] Conteúdo Markdown é convertido para HTML
- [ ] Link de afiliado funciona quando presente na URL

### **Performance:**
- [ ] Carregamento inicial < 2s
- [ ] Lazy loading para vídeos
- [ ] Otimização de imagens
- [ ] Bundle size otimizado

### **Responsividade:**
- [ ] Layout funcional em mobile (320px+)
- [ ] Adaptação adequada para tablet
- [ ] Experiência otimizada para desktop

## 🚀 **IMPLEMENTAÇÃO STEP-BY-STEP**

### **Fase 1: Estrutura Base**
1. Criar página principal em `src/app/(public)/startup/[id]/page.tsx`
2. Implementar componentes básicos das seções 1-3
3. Configurar roteamento dinâmico e validação de parâmetros

### **Fase 2: Funcionalidades Públicas**
1. Implementar seções 4-6 com vídeos do YouTube
2. Adicionar lógica de detecção de token de afiliado
3. Implementar botão "Comprar Token" com redirecionamentos

### **Fase 3: Sistema de Bloqueio**
1. Criar componente BlockingModal
2. Implementar hook useVisibleSection com Intersection Observer
3. Adicionar lógica de blur e bloqueio para seção 7

### **Fase 4: Integração e Polimento**
1. Conectar com API de dados da startup
2. Implementar conversão de Markdown para HTML
3. Adicionar estados de loading e tratamento de erros
4. Otimizar performance e acessibilidade

### **Fase 5: Testes e Validação**
1. Implementar testes unitários e de integração
2. Realizar testes de usabilidade
3. Validar performance e responsividade
4. Documentar componentes e funcionalidades

## 📚 **RECURSOS ADICIONAIS**

### **Bibliotecas Recomendadas:**
- `react-markdown` ou `marked` para conversão Markdown → HTML
- `react-intersection-observer` para detecção de seções visíveis
- `react-youtube` ou embed nativo para vídeos do YouTube

### **Componentes Shadcn Necessários:**
- Button, Card, Progress, Modal/Dialog
- Badge, Avatar, Separator
- Skeleton para loading states

### **Documentação de Referência:**
- [Next.js App Router](https://nextjs.org/docs/app)
- [Shadcn UI Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)

---

**Nota:** Este prompt deve ser executado seguindo rigorosamente os princípios de Clean Code, DDD e SOLID estabelecidos no projeto iSelfToken. Qualquer dúvida sobre implementação deve ser resolvida consultando a documentação existente em `doc/context/` e `doc/documentação/`.
