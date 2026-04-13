# create startup

## **rota:** /dashboard/startups
## **path:** app/routes/private/dashboard/startups/index.tsx
## **component únicos:** app/routes/private/dashboard/startups/components/index.tsx
## **api route:** StartupApi.create()
## **Type:** private

## **funcionalidade:**
- página de dashboard para listar as startups do usuário
- cabeçalho com título "Minhas Startups" e botão **Criar startup**
- filtros rápidos por status (ex: Aprovada, Em análise, Rejeitada), campanha (ex: EM EDIÇÃO, ABERTO, FINANCIADO, REPROVADO, PAGO)
- busca por nome/segmento
- lista em cards ou tabela responsiva com:
  - logo/imagem da startup
  - nome e segmento
  - status atual
  - estágio atual
  - total de tokens
  - tokens vendidos
  - percentual vendido
  - status da captação (status da campanha)
  - data de criação
  - botão **Ver detalhes** (rota `/dashboard/startups/:id`)
  - botão **Editar** (rota `/dashboard/startups/:id/edit`)
- estado vazio com CTA para criar a primeira startup
