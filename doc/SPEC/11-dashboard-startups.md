# SPEC — Dashboard Startups (11-dashboard-startups)

## 1. Objetivo
- Padronizar o dashboard de startups do usuário.

## 2. Referências
- PRD: `../PRD/11-dashboard-startups.md`
- Descritivo: `../descritivo/11-dashbord_startp.md`
- Style: `../style/11-dashbord_startp.md`
- Exemplo: `../style/11-dashbord_startp.jsx`
- CSS padrão: `../css_padrão.md`

## 3. Rotas e Caminhos
- **Rota:** `startups/dashboard`
- **Path:** `app/routes/private/startups/index.tsx`
- **Componentes únicos:** `app/routes/private/startups/components/*`

## 4. APIs
- `StartupApi.listMyStartups()`
- `StartupApi.create()`
- `StartupApi.delete()`

## 5. Fluxo Principal
1. Buscar startups do usuário.
2. Aplicar filtros e busca.
3. Renderizar lista e ações (editar/gerenciar).

## 6. Estados
- `filters`, `searchTerm`, `isLoading`, `error`.

## 7. Validações
- Validar lista vazia para exibir empty state.

## 8. Componentes
- Filtros, lista de cards, empty state.

## 9. Regras de UI
- Cards horizontais responsivos.
- Badges de status com cores definidas.

## 10. Acessibilidade
- Foco visível nos botões de ação.

## 11. Exemplo JSX
```jsx
<StartupFilters value={filters} onChange={setFilters} />

{startups.map((startup) => (
  <StartupRow key={startup.id} data={startup} />
))}
```
obs: foi removido o botão de adicionar startup
