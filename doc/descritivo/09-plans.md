# plans

## **rota:** /plans
## **path:** app/routes/private/plans/index.tsx
## **component únicos:** app/routes/private/plans/components/index.tsx
## **api route:** ApiPage.getPlans()
## **Type:** private

## **funcionalidade:**
- página de seleção de planos com foco em adesão
- título central: "Escolha sua taxa de adesão"
- subtítulo informando validade do plano (ex: 1 ano)
- lista de cards de planos (pode renderizar **mais de 5 planos**)
- cada card contém:
  - badge de destaque (ex: **Recomendado**)
  - ícone representativo do plano
  - nome do plano (ex: Investidor, Fundador)
  - preço anual com unidade (ex: 50/ano)
  - breve descrição do plano
  - botão principal **Começar agora**
  - lista de benefícios com check
- **card recomendado** deve ter tamanho **5% maior** que os demais
- cards alinhados em grade responsiva (desktop: 2+ colunas; mobile: 1 coluna)

## **sugestão de componentes shadcn:"
- price: `npx shadcn add @tailark/pricing-3`
