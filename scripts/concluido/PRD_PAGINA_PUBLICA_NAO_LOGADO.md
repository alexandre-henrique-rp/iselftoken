# PRD 2 — Página Pública da Startup para Não-Logados (Layout, CTA e SEO)

**Data:** 15/08/2026  
**Autor:** Agente IA  
**Status:** Rascunho  
**Prioridade:** Média  
**Módulo:** Frontend — Landing Page / Startup Detail Público

---

## 1. Contexto

Hoje a landing page (`/`) lista startups publicamente, mas ao clicar no card para ver detalhes, o usuário é redirecionado ao login (rota `/startups/:id` está dentro do layout privado). Precisamos criar uma experiência pública parcial que:

1. Mostre informações suficientes para gerar interesse
2. Bloqueie informações sensíveis/detalhadas e a ação de investir
3. Incentive o cadastro na plataforma
4. Tenha SEO personalizado por startup para compartilhamento e indexação

---

## 2. Proposta de Experiência

### 2.1 Fluxo do Visitante Não-Logado

```
Visitante → Landing (/) → Clica em startup
     ↓
Página de detalhe PÚBLICA (/s/{slug}) — informações parciais, sem investir
     ↓
CTA: "Crie sua conta para investir" / "Faça login"
     ↓
Cadastro/Login → Redirect para /startups/:id (versão completa logada)
```

### 2.2 Rota Proposta

Nova rota pública: **`/s/:slugOrId`**

- Não requer autenticação
- Renderiza versão parcial da página (dados públicos apenas)
- CTA para cadastro/login
- Suporta slug amigável (`/s/techinnovate`) e fallback numérico (`/s/123`)
- Separada da versão logada (`/startups/:id`) para manter componentes limpos

---

## 3. Wireframe — Versão B (Preview com Seções Abertas)

> A página pública mostra informações parciais suficientes para gerar interesse, bloqueia dados sensíveis e ações de investimento, e incentiva o cadastro. O vídeo de apresentação do founder é exibido publicamente como gancho de conversão.

```
┌─────────────────────────────────────────────────────────────────┐
│ [Navbar: Logo iSelfToken | Login | Criar Conta]                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐                                                    │
│  │  LOGO   │  NOME DA STARTUP              [Categoria badge]    │
│  │         │  "Descrição completa da startup com até            │
│  └─────────┘   300 caracteres visíveis para gerar interesse"    │
│                                                                 │
│  Estágio: Tração · Fundada em: 2024 · São Paulo, SP            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🎬 VÍDEO DE APRESENTAÇÃO                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │              [YouTube Embed / Thumbnail]                 │    │
│  │                     ▶ PLAY                              │    │
│  │                                                         │    │
│  │              (embed do youtube_url da startup)           │    │
│  └─────────────────────────────────────────────────────────┘    │
│  * Vídeo gravado pelo founder apresentando a startup.           │
│    NÃO é o pitch deck (documento).                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RODADA DE CAPTAÇÃO                                             │
│  ─────────────────                                              │
│                                                                 │
│  Meta: R$ 500.000    │    Mín. Investimento: R$ 1.000           │
│  Prazo: 45 dias      │    Equity: 5%                            │
│                                                                 │
│  [████████████████░░░░░░░░░] 67% captado                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  💡 O PROBLEMA                                                   │
│  Texto do problema que a startup resolve (visível)              │
│                                                                 │
│  🚀 A SOLUÇÃO                                                    │
│  Texto da solução proposta (visível)                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  🔒 PARA VER MAIS E INVESTIR                            │    │
│  │                                                         │    │
│  │  Crie sua conta gratuita para acessar:                  │    │
│  │    ✓ Equipe completa e fundadores                       │    │
│  │    ✓ Pitch deck e documentos                            │    │
│  │    ✓ Diferencial competitivo e modelo de receita        │    │
│  │    ✓ Análise de risco                                   │    │
│  │    ✓ Fórum de investidores                              │    │
│  │    ✓ Investir com PIX, cartão ou boleto                 │    │
│  │                                                         │    │
│  │  [██████ CRIAR CONTA E INVESTIR ██████]                 │    │
│  │                                                         │    │
│  │  Já tem conta? Fazer login                              │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  STARTUPS SIMILARES                                             │
│  [Card 1] [Card 2] [Card 3]                                    │
├─────────────────────────────────────────────────────────────────┤
│  [Footer]                                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Informações: O Que Mostrar vs Esconder

### 4.1 Visível para não-logados (público)

| Informação | Justificativa |
|-----------|---------------|
| Nome da startup | Identidade básica |
| Logo | Visual |
| Categoria / Área de atuação | Contexto do setor |
| Estágio (MVP, Tração, etc.) | Maturidade |
| Descrição (até 300 chars) | Gancho de interesse |
| **Vídeo de apresentação (YouTube)** | **Conteúdo visual do founder. NÃO é o pitch deck.** |
| Problema que resolve | Pitch narrativo |
| Solução proposta | Pitch narrativo |
| Meta de captação | Âncora de valor |
| Mínimo de investimento | Barreira de entrada |
| Progresso (% captado) | Prova social / urgência |
| Prazo restante | Urgência |
| Equity oferecido | Proposta de valor |

### 4.2 Bloqueado (somente para logados)

| Informação | Motivo do bloqueio |
|-----------|-------------------|
| **Botão "Investir" / Sidebar de investimento** | **Ação requer autenticação** |
| Valuation completo | Dado financeiro sensível |
| Preço do token | Incentivo ao cadastro |
| Tokens disponíveis | Incentivo ao cadastro |
| Número de investidores | Prova social exclusiva |
| Equipe / Time | Conteúdo premium |
| Documentos (pitch deck) | Conteúdo premium |
| Análise de risco | Conteúdo premium |
| Fórum de investidores | Interação requer auth |
| Modelo de receita (detalhado) | Conteúdo premium |
| Diferencial competitivo | Conteúdo premium |
| Dados bancários | Sensível |

---

## 5. SEO Personalizado por Startup

### 5.1 Meta Tags Dinâmicas

Cada página pública (`/s/:slugOrId`) deve gerar meta tags específicas para indexação e compartilhamento em redes sociais:

```typescript
export function meta({ data }: Route.MetaArgs) {
  const startup = data?.startup;
  if (!startup) return [{ title: "Startup | iSelfToken" }];

  const title = `${startup.name} — Invista em ${startup.category} | iSelfToken`;
  const description = (startup.description || "").slice(0, 160)
    || `Invista na ${startup.name} com tokens digitais. Meta: ${startup.goal}`;
  const image = startup.logo || "https://iselftoken.net/og-default.png";
  const url = `https://iselftoken.net/s/${startup.slug || startup.id}`;

  return [
    { title },
    { name: "description", content: description },
    { name: "robots", content: "index, follow" },
    { rel: "canonical", href: url },

    // Open Graph (Facebook, LinkedIn, WhatsApp)
    { property: "og:type", content: "product" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: `Logo da ${startup.name}` },
    { property: "og:url", content: url },
    { property: "og:site_name", content: "iSelfToken" },
    { property: "og:locale", content: "pt_BR" },

    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    { name: "twitter:site", content: "@iSelfToken" },
  ];
}
```

### 5.2 Structured Data (JSON-LD)

Cada página deve emitir schema.org `InvestmentOrDeposit` para melhorar a indexação:

```json
{
  "@context": "https://schema.org",
  "@type": "InvestmentOrDeposit",
  "name": "Rodada de Captação — {nome}",
  "description": "{descrição até 300 chars}",
  "url": "https://iselftoken.net/s/{slug}",
  "image": "{logo_url}",
  "provider": {
    "@type": "Organization",
    "name": "iSelfToken",
    "url": "https://iselftoken.net"
  },
  "offers": {
    "@type": "Offer",
    "priceCurrency": "BRL",
    "price": "{minInvestment}",
    "availability": "https://schema.org/InStock",
    "validThrough": "{deadline ISO}"
  },
  "category": "{categoria}",
  "fundingGoal": {
    "@type": "MonetaryAmount",
    "currency": "BRL",
    "value": "{targetAmount}"
  }
}
```

### 5.3 Regras de Indexação

| Cenário | Meta robots | Motivo |
|---------|-------------|--------|
| Campanha OPEN | `index, follow` | Página ativa e indexável |
| Campanha encerrada (grace ≤ 10 dias) | `index, follow` | Ainda relevante |
| Campanha encerrada > 10 dias | `noindex, follow` | Remove da busca |
| Startup não aprovada / sem campanha | Retorna 404 | Não existe publicamente |

### 5.4 URL Amigável (Slug)

| Formato | Exemplo | Uso |
|---------|---------|-----|
| Slug (preferido) | `/s/techinnovate` | SEO-friendly, compartilhável |
| ID numérico (fallback) | `/s/123` | Compatibilidade/legacy |

O campo `slug` já existe no model Startup (`slug: String @unique`). O loader deve aceitar ambos:

```typescript
// Se param é numérico → busca por id; senão → busca por slug
const startup = isNaN(Number(params.slugOrId))
  ? await findBySlug(params.slugOrId)
  : await findById(Number(params.slugOrId));
```

### 5.5 Sitemap Dinâmico

Rota: `/sitemap.xml`

Lista todas as startups com campanha elegível (OPEN ou grace):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://iselftoken.net/s/techinnovate</loc>
    <lastmod>2026-08-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### 5.6 Performance SEO

| Requisito | Implementação |
|-----------|--------------|
| SSR (Server-Side Rendering) | React Router 7 já faz SSR — dados no loader |
| LCP < 2.5s | Logo com tamanho fixo, YouTube embed lazy (`loading="lazy"`) |
| CLS < 0.1 | Placeholders com aspect-ratio para vídeo (16:9) e logo |
| Meta viewport | Já configurado no layout root |
| `lang="pt-BR"` | Verificar/adicionar no `<html>` |
| Favicon | Já existe |
| robots.txt | Permitir `/s/*` |

---

## 6. CTA (Call to Action)

### 6.1 Textos

| Posição | Texto Principal | Texto Secundário |
|---------|----------------|-----------------|
| Seção bloqueada | "Crie sua conta gratuita para acessar" | Lista de itens premium |
| Botão principal | "Criar conta e investir" | — |
| Link secundário | "Já tem conta? Fazer login" | — |
| Urgência (se prazo < 7 dias) | "Últimos X dias para investir!" | Badge no topo |

### 6.2 Redirect pós-cadastro

Após cadastro/login, redirect de volta para a startup:
- CTA Criar conta: `/register?redirect=/startups/{id}`
- CTA Login: `/login?redirect=/startups/{id}`
- Após auth bem-sucedida → redirect para a versão completa logada

---

## 7. Impacto Técnico

| Arquivo | Alteração |
|---------|-----------|
| `frontend/app/routes.ts` | Nova rota `route("s/:slugOrId", "routes/public/startup-public.tsx")` |
| `frontend/app/routes/public/startup-public.tsx` | **NOVO** — Página pública parcial com SEO |
| `frontend/app/components/landing/navbar.tsx` | Garantir botões Login/Criar Conta visíveis |
| `backendnode/src/api/marketplace/marketplace.service.ts` | Novo método `getStartupPublicDetail(slugOrId)` retornando apenas dados públicos |
| Landing page cards (`/`) | Link dos cards: de `/startups/:id` para `/s/:slug` |
| `frontend/app/routes/public/sitemap.xml.ts` | **NOVO** — Rota para sitemap dinâmico |

---

## 8. Critérios de Aceite

- [ ] **AC-01:** Página `/s/:slug` acessível sem autenticação
- [ ] **AC-02:** Mostra dados públicos: nome, logo, categoria, descrição, vídeo, progresso, meta, prazo, equity, problema, solução
- [ ] **AC-03:** NÃO mostra: valuation, preço token, equipe, documentos, análise de risco, fórum
- [ ] **AC-04:** NÃO permite investir (sem sidebar de investimento)
- [ ] **AC-05:** CTA "Criar conta" redireciona para `/register?redirect=/startups/:id`
- [ ] **AC-06:** CTA "Login" redireciona para `/login?redirect=/startups/:id`
- [ ] **AC-07:** Após auth, redirect funciona corretamente para a versão completa
- [ ] **AC-08:** Cards na landing (`/`) linkam para `/s/:slug` (rota pública)
- [ ] **AC-09:** Meta tags OG (og:title, og:description, og:image) preenchidas dinamicamente
- [ ] **AC-10:** JSON-LD schema.org presente na página
- [ ] **AC-11:** Sitemap dinâmico gerado com startups elegíveis
- [ ] **AC-12:** Responsivo (mobile-first)
- [ ] **AC-13:** Vídeo de apresentação embed funciona sem auth
- [ ] **AC-14:** Startups não aprovadas ou sem campanha retornam 404

---

## 9. Fora de Escopo

- Lógica de campos bloqueados durante edição (PRD 1)
- Funcionalidades do compliance (PRD 3)
- Share buttons / Social proof widgets
- Analytics de conversão (GA4 events)
- Sistema de comentários públicos
- A/B testing de CTAs
