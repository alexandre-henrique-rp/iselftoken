# Composição de página

## Introdução
- A composição de página é um dos principais aspectos da composição de página. Ela é responsável por organizar os elementos da página em uma hierarquia lógica e visual.

## regras
-  as page.tsx deve ser server component
-  os componentes devem ser client component conforme a necessidade visando a hidratação parcial
-  os componentes devem ser reutilizáveis
-  os componentes devem ser testáveis
-  as requisições imediatas deve ser feitas na page.tsx

## Estrutura

  (protected)
  (public)
    |
    |- login
      |- page.tsx
      |- 
  components
    |- logincomponents.tsx
    