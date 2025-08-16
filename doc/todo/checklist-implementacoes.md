# Checklist de Implementações - iSelfToken

## ✅ Sprint 1: Configuração Base e Estrutura

### Configuração do Projeto
- [x] Configuração Next.js 15.4.6 com App Router
- [x] Configuração TypeScript
- [x] Configuração ESLint e Prettier
- [x] Configuração Tailwind CSS (implícito via globals.css)
- [x] Estrutura de pastas seguindo Clean Architecture

### Componentes UI Base (Shadcn-inspired)
- [x] `Avatar` component
- [x] `Badge` component
- [x] `Button` component com variantes
- [x] `Card` components (Card, CardContent, CardHeader, CardTitle)
- [x] `Dialog` components (Modal system)
- [x] `Form` components (Field, Label, Message)
- [x] `Input` component
- [x] `Label` component
- [x] `Progress` component
- [x] `Switch` component
- [x] `Tabs` components

## ✅ Sprint 2: Páginas Públicas de Autenticação

### Página Home (`/`)
- [x] Landing page principal (`src/app/(public)/page.tsx`)
- [x] Carrossel de oportunidades
- [x] Cards de perfil de investidores
- [x] Seção de testemunhos
- [x] Integração com dados mock

### Página de Login (`/login`)
- [x] Formulário de login (`src/app/(public)/login/page.tsx`)
- [x] Componente `LoginForm` (`src/components/login-form.tsx`)
- [x] Validação com Zod (email + password)
- [x] Integração react-hook-form
- [x] Tratamento de erros inline

### Página de Registro (`/register`)
- [x] Modal de seleção de perfil (`src/app/(public)/register/page.tsx`)
- [x] `InvestorForm` component (`src/components/register/InvestorForm.tsx`)
- [x] `StartupForm` component (`src/components/register/StartupForm.tsx`)
- [x] Schemas Zod para validação (investorSchema, startupSchema)
- [x] Máscaras para CPF, CNPJ, telefone, CEP (react-input-mask)
- [x] Sanitização de dados mascarados antes do envio
- [x] TypeScript types (InvestorFormInputs, StartupFormInputs)

### Páginas de Recuperação de Senha
- [x] Página recuperar senha (`/recuperar-senha`)
- [x] Página redefinir senha (`/redefinir-senha`)
- [x] Validação Zod para emails e senhas
- [x] Confirmação de senha com validação

### Página de Autenticação 2FA
- [x] Página A2F (`/a2f`)
- [x] Input de 6 dígitos numéricos
- [x] Navegação automática entre campos
- [x] Validação Zod para código de 6 dígitos

### Página de Termos de Uso
- [x] Página termos de uso (`/termos-de-uso`)

## ✅ Sprint 3: Componentes de Negócio

### Componentes de Exibição
- [x] `CarouselNav` - Navegação do carrossel
- [x] `Carousel` - Sistema de carrossel
- [x] `ExploreOpportunities` - Seção de oportunidades
- [x] `InvestmentCard` - Card de investimento
- [x] `ProfileCard` - Card de perfil
- [x] `StartupCard` - Card de startup
- [x] `StartupTestimonialCard` - Card de testemunho de startup
- [x] `TestimonialCard` - Card de testemunho genérico

### Dados Mock
- [x] `src/data/categoria.ts` - Categorias de negócio
- [x] `src/data/profile.ts` - Perfis de investidores
- [x] `src/data/startups.ts` - Dados de startups

### Utilitários
- [x] `src/lib/utils.ts` - Utilitários gerais

## ✅ Sprint 4: Documentação e Contexto

### Documentação Técnica
- [x] `doc/context/01-tecnologias-arquitetura.md`
- [x] `doc/context/02-visão-geral-princípios-regras.md`
- [x] `doc/context/frontend-register.md`
- [x] `doc/context/frontend-login.md`
- [x] `doc/context/frontend-a2f.md`
- [x] `doc/context/frontend-recuperar-redefinir-senha.md`

### Configurações do Projeto
- [x] `package.json` com dependências
- [x] `tsconfig.json` configurado
- [x] `next.config.ts` configurado
- [x] `components.json` para UI components
- [x] `.prettierrc.json` formatação
- [x] `eslint.config.mjs` linting
- [x] `.editorconfig` padronização
- [x] `.gitignore` configurado

## 🚧 Pendências Identificadas

### Backend Integration
- [ ] Conectar formulários de registro ao backend
- [ ] Implementar autenticação real no login
- [ ] Implementar envio de email para recuperação de senha
- [ ] Implementar envio de código A2F
- [ ] Implementar persistência de dados

### Testes (TDD)
- [ ] Testes unitários para schemas Zod
- [ ] Testes de integração para react-hook-form
- [ ] Testes E2E para fluxos de autenticação
- [ ] Testes para componentes UI

### Funcionalidades Avançadas
- [ ] Dashboard de investidor (área protegida)
- [ ] Dashboard de startup (área protegida)
- [ ] Sistema de matching investidor-startup
- [ ] Sistema de notificações
- [ ] Chat/mensageria entre usuários

### Performance e SEO
- [ ] Otimização de imagens
- [ ] Meta tags para SEO
- [ ] Análise de performance (Core Web Vitals)
- [ ] PWA features (opcional)

## 📊 Status do Projeto

**Páginas Implementadas:** 7/7 páginas públicas  
**Componentes UI:** 11/11 componentes base  
**Formulários:** 4/4 formulários de autenticação  
**Documentação:** 6/6 arquivos de contexto  

**Próxima Sprint Sugerida:** Integração com Backend e Testes
