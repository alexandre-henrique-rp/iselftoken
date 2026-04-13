# Plano de Cópia: Código React → Pencil MCP

## Objetivo
Copiar os layouts do frontend iSelfToken (React + Tailwind + shadcn/ui) para o Pencil MCP, mantendo fidelidade ao design existente com suporte a Dark Mode e Light Mode.

---

## Sessão 1: Homepage (INDEX)
**Status:** ✅ CONCLUÍDO

### Estrutura por componentes (Opção A):

#### Sessão 1a: Header + HeroSection
**Status:** ✅ CONCLUÍDO

#### Sessão 1b: Rodadas de Captação + CallToAction
**Status:** ✅ CONCLUÍDO

#### Sessão 1c: Todas as Startups
**Status:** ✅ CONCLUÍDO

#### Sessão 1d: Oportunidades + Filtros
**Status:** ✅ CONCLUÍDO

#### Sessão 1e: Depoimentos
**Status:** ✅ CONCLUÍDO

#### Sessão 1f: Footer
**Status:** ✅ CONCLUÍDO

---

## Sessão 2: Páginas Públicas
**Status:** 🟡 EM ANDAMENTO

### Páginas a copiar:
- [x] `/login` - Página de login (Login Dark criado)
- [ ] `/cadastro` - Página de registro
- [ ] `/checkout` - Página de checkout
- [ ] `/startup/:id` - Detalhes da startup

### Componentes necessários:
- [x] LoginPage (split-screen com AuthHero)
- [ ] RegisterForm
- [ ] CheckoutForm

---

## Sessão 3: Layout Privado (Dashboard)
**Status:** 🔴 PENDENTE

### Estrutura a copiar:
- [ ] Sidebar (app-sidebar)
- [ ] Nav principal (nav-main)
- [ ] Nav usuário (nav-user)
- [ ] Team switcher
- [ ] Breadcrumb

### Páginas privadas:
- [ ] `/home` - Dashboard principal
- [ ] `/perfil` - Perfil do usuário
- [ ] `/planos` - Planos de assinatura
- [ ] `/startups` - Lista de startups
- [ ] `/startups/new` - Criar startup
- [ ] `/startups/:id` - Editar startup
- [ ] `/investimentos` - Meus investimentos

---

## Sessão 4: Componentes UI (shadcn/ui)
**Status:** 🔴 PENDENTE

### Componentes a copiar:
- [ ] Button (variantes: default, destructive, outline, secondary, ghost)
- [ ] Input
- [ ] Select
- [ ] Dialog
- [ ] Sheet (sidebar mobile)
- [ ] Dropdown Menu
- [ ] Toast (Sonner)
- [ ] Badge
- [ ] Card
- [ ] Avatar
- [ ] Skeleton

---

## Sessão 5: Design System & Cores
**Status:** 🔴 PENDENTE

### Tokens já definidos (verificar/atualizar):
- [ ] `--primary`: #a855f7 (light) / #c084fc (dark)
- [ ] `--background`: #f8f7fa (light) / #1c1917 (dark)
- [ ] `--foreground`: #2d293b (light) / #fafaf9 (dark)
- [ ] `--card`: #fefefe (light) / #292524 (dark)
- [ ] `--muted`: #e8e6ed (light) / #44403c (dark)
- [ ] `--border`: #d1d1d6 (light) / rgba(255,255,255,0.1) (dark)
- [ ] `--destructive`: #ef4444 (light) / #f87171 (dark)
- [ ] `--accent`: #e0f2fe (light) / #44403c (dark)
- [ ] `--brand-magenta`: #d500f9

---

## Sessão 6: Componentes de Investimento
**Status:** 🔴 PENDENTE

### Componentes específicos iSelfToken:
- [ ] RodadaCard (card de rodada de investimento)
- [ ] OpportunityCard (card de oportunidade)
- [ ] Carousel3D (efeito 3D)
- [ ] TestimonialInvestorCard
- [ ] TestimonialFounderCard
- [ ] SkeletonCard / SkeletonWideCard / SkeletonTestimonial

---

## Sessão 7: Selectors Geográficos
**Status:** 🔴 PENDENTE

### Componentes de localização:
- [ ] selectPais
- [ ] selectEstado
- [ ] selectCidade

---

## Sessão 8: Export & Integração
**Status:** 🔴 PENDENTE

### Tarefas finais:
- [ ] Revisão geral Dark Mode
- [ ] Revisão geral Light Mode
- [ ] Documentação das variáveis
- [ ] Export ou geração de código

---

## Como Executar

1. **Sessão atual:** Sessão 1 - Homepage
2. **Para continuar:** Executar `/start-work` e pedir para continuar da sessão 1
3. **Checkpoint:** A cada sessão concluída, tiramos screenshot para validar

---

## Notas Importantes

- Usar variáveis `$--*-dark` e `$--*-light` para temas
- Manter estrutura de componentes idêntica ao código React
- Props e children seguir a hierarquia do código fonte
- Cada sessão = 1 checkpoint de validação
