# Regras de Negócio: Home Page Protegida (/home)

## Visão Geral do Fluxo

1.  O usuário, após autenticado, acessa a rota `/home`.
2.  O `layout` que envolve a página verifica se a sessão do usuário é válida. Se não for, ele é redirecionado para `/login`.
3.  A página `home` inicia, em **paralelo**, múltiplas buscas por dados para preencher seus componentes (banners, startups em destaque, etc.).
4.  Enquanto os dados de uma seção estão sendo carregados, um "esqueleto" (skeleton) de interface é exibido no lugar.
5.  Conforme os dados de cada seção chegam, o esqueleto daquela seção é substituído pelo componente real (ex: um carrossel de startups), sem precisar esperar que o restante da página termine de carregar.

---

### Arquitetura e Comportamento (`/src/app/(protected)/home/page.tsx`)

-   **Função**: Orquestrar a exibição da página principal da plataforma, que é composta por vários carrosséis de conteúdo.
-   **Renderização Dinâmica**: A página é marcada com `export const dynamic = 'force-dynamic'`, o que instrui o Next.js a renderizá-la a cada nova requisição. Isso garante que os dados exibidos sejam sempre os mais recentes, em vez de usar uma versão estática (cache) da página.
-   **Carregamento Paralelo com Suspense**:
    1.  Esta é a principal característica arquitetural da página. Ela é dividida em componentes "Loader" menores e assíncronos (ex: `FeaturedStartupsLoader`, `AdCarouselLoader`).
    2.  Cada `Loader` é responsável por uma única tarefa: buscar os dados de sua seção específica e, ao final, renderizar o componente de UI correspondente (ex: `<AppleCarouselWrapper />`).
    3.  Cada um desses `Loader`s é envolvido por um componente `<Suspense>` do React.
    4.  **Benefício**: Isso permite que todas as buscas de dados (para banners, startups em destaque, verificadas, etc.) aconteçam ao mesmo tempo, em paralelo. A página não precisa esperar a consulta mais lenta terminar para começar a ser exibida.
    5.  **Fallback de UI**: A propriedade `fallback` do `<Suspense>` define o que será mostrado enquanto o componente `Loader` está "suspenso" (aguardando seus dados). Neste caso, são exibidos os componentes `CarouselSkeleton` ou `Skeleton`, que simulam a estrutura da UI final, melhorando a percepção de velocidade para o usuário.

---

### Fonte de Dados (`/src/data/home-data.ts`)

-   **Função**: Atua como uma camada de acesso a dados para a página `home`. Centraliza todas as funções que buscam os dados a serem exibidos.
-   **Implementação Atual (Mock)**:
    1.  Atualmente, as funções neste arquivo **não fazem chamadas a uma API externa real**.
    2.  Elas geram dados de exemplo (mocados) e usam `await new Promise(resolve => setTimeout(resolve, ...))` para simular um atraso de rede (latência).
    3.  Isso é útil para desenvolver e testar a interface de carregamento (skeletons e `Suspense`) sem depender de um backend funcional.
-   **Funções Exportadas:**
    -   `getAdBanners()`: Simula a busca por banners de publicidade.
    -   `getFeaturedStartups()`: Simula a busca por startups na categoria "Em Destaque".
    -   `getVerifiedStartups()`: Simula a busca por startups na categoria "Verificadas".
    -   `getAcceleratedStartups()`: Simula a busca por startups na categoria "Aceleradas".
    -   `getApprovalPhaseStartups()`: Simula a busca por startups na categoria "Em Fase de Aprovação".

---

### Componentes de UI

-   **`AdCarousel` e `AppleCarouselWrapper`**: São componentes de apresentação. Eles recebem os dados (buscados pelos `Loader`s) e são responsáveis apenas por renderizar a interface do carrossel. A lógica de negócio (busca de dados) não está neles.
