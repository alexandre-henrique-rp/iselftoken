# SPEC — Layout Privado (07-layout)

## 1. Objetivo
- Padronizar o layout privado com sidebar e breadcrumb.

## 2. Referências
- PRD: `../PRD/07-layout.md`
- Descritivo: `../descritivo/07-layout.md`
- CSS padrão: `../css_padrão.md`

## 3. Rotas e Caminhos
- **Path:** `app/routes/layout/index.tsx`
- **Componentes únicos:** `app/routes/layout/components/*`

## 4. Fluxo Principal
1. Renderizar sidebar com links autorizados.
2. Renderizar breadcrumb baseado na rota atual.
3. Exibir conteúdo do `<Outlet />`.

## 5. Estados
- `isCollapsed`, `activePath`, `breadcrumbItems`.

## 6. Validações
- Filtrar links por `authorization`.
- Garantir fallback quando rota não mapeada.

## 7. Componentes
- `Sidebar` (base shadcn `sidebar-07`).
- `Breadcrumb`.

## 8. Regras de UI
- Sidebar fixa e colapsável.
- Item ativo destacado.

## 9. Acessibilidade
- Foco visível nos itens do menu.
- Navegação por teclado.

## 10. Exemplo JSX
```jsx
<Layout>
  <Sidebar items={menuItems} />
  <main>
    <Breadcrumb items={breadcrumbItems} />
    <Outlet />
  </main>
</Layout>
```
