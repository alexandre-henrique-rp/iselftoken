# SPEC — Homepage Pública (01-homepage)

## 1. Objetivo
- Padronizar a homepage pública com seções de carrossel e CTA.

## 2. Referências
- PRD: `../PRD/01-homepage.md`
- Descritivo: `../descritivo/01-homepage.md`
- Style: `../style/01-homepage-documentation.md`
- Exemplo: `../style/01iselftoken-homepage.jsx`
- CSS padrão: `../css_padrão.md`

## 3. Rotas e Caminhos
- **Rota:** `/`
- **Path:** `app/routes/page/index/index.tsx`
- **Componentes únicos:** `app/routes/page/index/components/*`

## 4. APIs
- `ApiPage.get()`
- `ApiPage.depoimentos()`
- `ApiPage.fundadores()`

## 5. Fluxo Principal
1. Buscar dados base da homepage.
2. Buscar depoimentos (investidores e fundadores).
3. Renderizar header → hero → seções com carrosséis → CTA → depoimentos → footer.

## 6. Estados
- `isLoading`: loading por seção (startups e depoimentos).
- `error`: falha por endpoint com retry.

## 7. Validações
- Respostas das APIs devem conter arrays válidos antes de renderizar carrosséis.

## 8. Contratos de Dados
```ts
interface StartupCard {
  id: number;
  name: string;
  description: string;
  image: string;
  category: string;
  badges: string[];
  valuation?: string;
  currentValue?: string;
  totalTokens?: number;
  soldTokens?: number;
}

interface Testimonial {
  id: number;
  text: string;
  name: string;
  role: string;
  initials: string;
  linkedin?: string;
  youtube?: string;
  website?: string;
}
```

## 9. Componentes
- `Carousel3D`
- `RodadaCard`
- `MediumCard`
- `OportunidadeCard`
- `DepoimentoInvestidorCard`
- `DepoimentoFundadorCard`
- `Badge`

## 10. Regras de UI
- Botões de carrossel ocultos no início/fim.
- Seção “Oportunidades” em grid 4x4 (responsivo).

## 11. Acessibilidade
- Foco visível em botões e links.
- Alt text obrigatório nas imagens.
- Navegação por teclado nos carrosséis.

## 12. Exemplo JSX
```jsx
<main>
  <Header />
  <Hero />

  <Carousel3D title="Rodadas de Captação">
    {startups.map((startup) => (
      <RodadaCard key={startup.id} data={startup} />
    ))}
  </Carousel3D>

  <SectionCTA />
  <Footer />
</main>
```
