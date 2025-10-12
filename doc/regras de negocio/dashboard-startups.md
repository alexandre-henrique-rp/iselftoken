# Regras de Negócio: Dashboard de Startups

## Visão Geral

O Dashboard de Startups é um módulo de CRUD (Create, Read, Update, Delete) que permite aos usuários (presumivelmente, fundadores) gerenciar suas startups na plataforma. Ele é composto por uma página de listagem principal, uma página de criação e uma página de edição.

---

### 1. Página de Listagem (`/dashboard_startups`)

-   **Função**: Exibir uma lista paginada, filtrável e pesquisável de todas as startups associadas ao usuário.

-   **Arquitetura e Comportamento:**
    1.  **Renderização Dinâmica**: A página utiliza `export const dynamic = 'force-dynamic'` para garantir que os dados sejam sempre buscados do servidor a cada visita.
    2.  **Busca de Dados no Servidor**: A página (Server Component) lê os parâmetros de filtro da URL (`searchParams`) como página, limite, termo de busca, status, etc.
    3.  **Carregamento com Suspense**: Utiliza `<Suspense>` para carregar de forma independente os cards de estatísticas (`StartupStatsCards`) e a tabela de dados (`StartupDataTable`), melhorando a percepção de velocidade.
    4.  **Fonte de Dados (Mock)**: Atualmente, a função `GetDados` busca os dados de um arquivo mock (`@/data/mock/startups-mock`) e aplica a lógica de paginação e filtro no servidor, simulando o comportamento de uma API real.

-   **Componente de Tabela (`<StartupDataTable />`)**:
    1.  **Interatividade**: É um Client Component que gerencia a interação do usuário com os filtros (busca, selects de status, etc.) e a paginação.
    2.  **Atualização via URL**: Quando um usuário altera um filtro ou muda de página, o componente atualiza os parâmetros de busca na URL (`router.replace(...)`).
    3.  **Revalidação no Servidor**: A mudança na URL faz com que o Next.js re-renderize a página no servidor, que por sua vez busca os dados com os novos filtros e os envia para a tabela, atualizando a visualização.

---

### 2. Página de Criação (`/dashboard_startups/startup`)

-   **Função**: Fornecer um formulário em branco para o cadastro de uma nova startup.

-   **Arquitetura e Comportamento:**
    1.  É uma página simples que renderiza o componente reutilizável `<StartupForm />`.
    2.  Passa a prop `mode="create"` para indicar ao formulário que ele deve executar uma operação de criação.

---

### 3. Página de Edição (`/dashboard_startups/startup/[id]`)

-   **Função**: Fornecer um formulário preenchido com os dados de uma startup existente para edição.

-   **Arquitetura e Comportamento:**
    1.  **Busca de Dados no Servidor**: A página extrai o `id` da startup da URL.
    2.  Faz uma chamada `fetch` para a API interna (`/api/startup/[id]`) para obter os dados da startup específica.
    3.  Se a startup não for encontrada, exibe uma página 404.
    4.  Renderiza o componente `<StartupForm />`, passando `mode="edit"` e os dados obtidos na prop `initialData`.

---

### 4. Componente Principal: `<StartupForm />`

-   **Função**: É o coração do sistema de criação e edição, sendo um formulário completo e reutilizável.

-   **Regras de Negócio:**
    1.  **Reutilização**: Adapta seu comportamento com base na prop `mode` (`create` ou `edit`).
    2.  **Validação com Zod**: Utiliza um `startupSchema` do Zod para validar rigorosamente todos os campos, como:
        -   `nome`, `cnpj`, `data_fundacao` são obrigatórios.
        -   `meta_captacao` deve ser um valor entre R$ 100.000,00 e R$ 15.000.000,00 (ou 0).
        -   `equity_oferecido` deve ser entre 0.1% e 100%.
    3.  **Submissão (`onSubmit`)**: 
        -   Verifica a prop `mode` para definir o método HTTP (`POST` para criar, `PUT` para editar) e a URL da API (`/api/startup` ou `/api/startup/[id]`).
        -   Envia os dados do formulário em formato JSON para a API correspondente.
        -   Exibe notificações (toast) de sucesso ou erro.
        -   Em caso de sucesso, redireciona o usuário de volta para a página de listagem (`/dashboard_startups`).

---

### 5. Rotas da API (`/api/startup/...`)

-   **Função**: Servir de fonte de dados para as páginas do dashboard.
-   **Implementação Atual (Mock)**:
    1.  `/api/startup/dashboard`: Retorna uma lista paginada de startups do arquivo mock, simulando filtros.
    2.  `/api/startup/dashboard/stats`: Retorna dados estatísticos mocados.
    3.  `/api/startup/[id]`: Retorna uma única startup do arquivo mock com base no ID.
    4.  **Importante**: Nenhuma dessas rotas, no estado atual, interage com um banco de dados ou API externa real. Elas existem para simular o backend e permitir o desenvolvimento do frontend.
