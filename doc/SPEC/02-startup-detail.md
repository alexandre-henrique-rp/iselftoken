# SPEC — Página de Detalhes da Startup (02-startup-detail)

## 1. Objetivo
- Padronizar a implementação da página de detalhes da startup com conteúdo público e protegido.

## 2. Referências
- PRD: `../PRD/02-startup-detail.md`
- Descritivo: `../descritivo/02-page_startup_id.md`
- Style: `../style/02-startup-detail-documentation.md`
- Exemplo: `../style/02-startup-detail-page.jsx`
- CSS padrão: `../css_padrão.md`

## 3. Rotas e Caminhos
- **Rota:** `/startup/:id`
- **Path:** `app/routes/page/startup/index.tsx`
- **Componentes únicos:** `app/routes/page/startup/components/*`

## 4. APIs
- `ApiPage.StartupIdPublic()`

## 5. Fluxo Principal
1. Buscar dados da startup pelo `:id`.
2. Renderizar conteúdo público (header, hero, apresentação).
3. Aplicar bloqueio (blur + modal) nas seções protegidas.
4. Renderizar footer sem bloqueio.

## 6. Estados
- `isLoading`, `error`, `isLocked`, `showModal`, `openFaq`, `selectedImage`.

## 7. Validações
- Validar `:id` antes de buscar dados.
- Garantir listas não vazias antes de renderizar grids e carrosséis.

## 8. Contratos de Dados
```ts
interface StartupDetail {
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
  businessSummary: string;
  market: Array<{ label: string; value: string }>;
  goals: string[];
  team: Array<{ name: string; role: string; bio: string; image: string; linkedin?: string }>;
  risks: Array<{ category: string; items: string[] }>;
  documents: Array<{ name: string; type: string; size: string; url: string }>;
  gallery: string[];
  faq: Array<{ question: string; answer: string }>;
  updates: Array<{ date: string; title: string; description: string }>;
  testimonials: Array<{ text: string; name: string; role: string; company?: string; image?: string }>;
  comments: Array<{ user: string; text: string; time: string; likes: number }>;
  investors: Array<{ initials: string; color: string }>;
}
```

## 9. Componentes
- `MetricCard`, `TeamCard`, `RiskCard`, `DocumentCard`, `FaqItem`, `UpdateCard`, `CommentCard`.

## 10. Regras de UI
- Seção `ProtectedSection` aplica `blur-sm` e `opacity-50`.
- Modal `InnerAuthBanner` aparece enquanto a área protegida estiver visível.
- Modal some no footer.

## 11. Acessibilidade
- ESC fecha modais.
- aria-label em botões.

## 12. Exemplo JSX
```jsx
<ProtectedSection isLocked={isLocked}>
  <ResumoOferta data={startup.businessSummary} />
  <MetricGrid metrics={startup.metrics} />
  <Gallery images={startup.gallery} onSelect={setSelectedImage} />
</ProtectedSection>
```
