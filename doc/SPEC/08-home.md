# SPEC — Home Privada (08-home)

## 1. Objetivo
- Padronizar a home privada (marketplace) com banner e seções de startups.

## 2. Referências
- PRD: `../PRD/08-home.md`
- Descritivo: `../descritivo/08-home.md`
- Style: `../style/08-home.md`
- Exemplo: `../style/08-home.jsx`
- CSS padrão: `../css_padrão.md`

## 3. Rotas e Caminhos
- **Rota:** `/home`
- **Path:** `app/routes/private/home/index.tsx`
- **Componentes únicos:** `app/routes/private/home/components/*`

## 4. APIs
- `PrivateApi.home()`
- `ApiPage.getBanner()`

## 5. Fluxo Principal
1. Buscar banners e dados das seções.
2. Renderizar header interno.
3. Exibir banner automático (5s).
4. Renderizar carrosséis e grid de oportunidades.

## 6. Estados
- `activeBannerIndex`, `isLoading`, `error`.

## 7. Validações
- Garantir `banners.length > 0` antes de iniciar timer.

## 8. Componentes
- `BannerSlider`, `StartupCard`, `SectionHeader`.

## 9. Regras de UI
- Banner sem botões de navegação.
- Grid de oportunidades em 4 colunas (responsivo).

## 10. Acessibilidade
- Foco visível nos botões.
- Alt text nas imagens.

## 11. Exemplo JSX
```jsx
<BannerSlider banners={banners} />

<Section title="Rodadas de Captação">
  <Carousel>
    {startups.map((startup) => (
      <StartupCard key={startup.id} data={startup} />
    ))}
  </Carousel>
</Section>
```
