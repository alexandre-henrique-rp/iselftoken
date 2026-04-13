# layout

## **rota:**
## **path:** app/routes/layout/index.tsx
## **component únicos:** app/routes/layout/components/index.tsx
## **Type:** private

## **componente shadcn:**
- inalação: [npx shadcn@latest add sidebar-07](npx shadcn@latest add sidebar-07)
- documentação: [https://ui.shadcn.com/docs/components/sidebar](https://ui.shadcn.com/docs/components/sidebar)

## **menu lateral (layout padrão):**
- sidebar fixa à esquerda com largura média
- topo do menu com logo/nome da plataforma e seletor de workspace/empresa
- botão de colapsar/expandir a sidebar
- seção **Platform** (links principais):
  - Playground
  - History
  - Starred
  - Settings
  - Models
  - Documentation
- a lista de links deve ser um JSON com as chaves: `name`, `icon`, `path`, `authorization`
- separação visual entre grupos (divisores)
- seção **Projects**:
  - Design Engineering
  - Sales & Marketing
  - Travel
  - More
- rodapé da sidebar com perfil do usuário (avatar + nome + e-mail)
- item ativo destacado com fundo/ícone diferente
- suporte a submenu recorrível nos itens com dropdown

## **guia de páginas (breadcrumb):**
- localizado no topo da área de conteúdo (header interno)
- mostra o caminho da navegação atual (ex: "Building Your Application > Data Fetching")
- cada item é clicável, exceto o último (página atual)
- separador visual entre níveis ("/" ou ">")
- **identificação automática:**
  - ler a rota atual e mapear para o título da página
  - montar o breadcrumb com base no mapa de rotas (ex: `/home/startups/123`)
  - se não houver mapeamento, exibir apenas o título da rota atual
