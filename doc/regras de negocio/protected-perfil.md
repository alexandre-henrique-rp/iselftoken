# Regras de Negócio: Página de Perfil (/perfil)

## Visão Geral do Fluxo

1.  O usuário acessa a página `/perfil`.
2.  O servidor (Server Component) busca a sessão atual para obter o ID do usuário.
3.  Com o ID, o servidor faz uma requisição à API interna (`/api/perfil/[id]`), que por sua vez busca os dados completos do usuário na API externa principal.
4.  A página é renderizada com os dados do usuário já preenchidos em um formulário.
5.  O usuário pode editar seus dados, fazer upload de avatar, documento e realizar a captura biométrica.
6.  Ao clicar em "Salvar Alterações", o formulário (Client Component) envia os dados atualizados para a API interna (`/api/perfil/[id]`) via `PUT`.
7.  A API interna repassa esses dados para a API externa, que efetiva a atualização no banco de dados.
8.  O usuário recebe uma notificação de sucesso e a página é recarregada para exibir os dados atualizados.

---

### Frontend - `page.tsx` (Server Component)

-   **Função**: Orquestrar a busca inicial dos dados do perfil do usuário.
-   **Regras de Negócio:**
    1.  A página é marcada com `export const dynamic = 'force-dynamic'` para garantir que os dados do perfil sejam sempre buscados do servidor a cada visita.
    2.  Utiliza a função `GetSessionServer()` para obter a sessão do usuário e extrair seu ID.
    3.  Chama a função `request()`, que faz um `fetch` para a API interna (`/api/perfil/[id]`) para obter todos os detalhes do perfil.
    4.  Renderiza o componente cliente `<PerfilForm />`, passando os dados obtidos como a prop `perfil`.

---

### Frontend - `perfil-form.tsx` (Client Component)

-   **Função**: Gerenciar a interface, validação e submissão do formulário de edição de perfil.
-   **Regras de Negócio:**
    1.  **Gerenciamento de Estado**: Utiliza `react-hook-form` para gerenciar o estado do formulário e `zod` para as regras de validação.
    2.  **Validação**: Garante que campos como `nome` e `email` atendam aos critérios mínimos (ex: nome com pelo menos 2 caracteres, email em formato válido).
    3.  **Busca de CEP**: Possui uma função (`handleCepChange`) que, ao digitar um CEP válido de 8 dígitos, busca automaticamente o endereço correspondente na API do ViaCEP e preenche os campos de endereço, bairro, cidade e UF.
    4.  **Upload de Arquivos**: Gerencia o estado de arquivos para o avatar e documento, que serão enviados junto com o formulário.
    5.  **Captura Biométrica**: Integra o componente `<BotaoIselfBioWebcam />` para realizar a captura da biometria facial, armazenando a imagem como uma string `base64`.
    6.  **Submissão (`onSubmit`)**: 
        -   Cria um objeto `FormData`. Este formato é essencial para enviar tanto dados de texto quanto arquivos (avatar, documento) na mesma requisição.
        -   Adiciona todos os campos do formulário ao `FormData`.
        -   Envia uma requisição `PUT` para a API interna (`/api/perfil/[id]`) com o `FormData` no corpo.
        -   Exibe uma notificação de sucesso ou erro com base na resposta da API.
        -   Em caso de sucesso, recarrega a página (`window.location.reload()`) após um breve intervalo para exibir os dados atualizados.

---

### Backend (`/api/perfil/[id]/route.ts`)

-   **Função**: Atuar como um proxy seguro entre o frontend da aplicação e a API externa principal onde os dados dos usuários residem.

-   **Método `GET`**:
    1.  Recebe um `id` de usuário pela URL.
    2.  Faz uma requisição `GET` para a API externa (`${process.env.NEXTAUTH_API_URL}/users/[id]`).
    3.  Repassa a resposta (os dados do usuário) da API externa para o componente de servidor que a chamou (`perfil/page.tsx`).

-   **Método `PUT`**:
    1.  Recebe um `id` de usuário pela URL.
    2.  Recebe os dados do formulário como `FormData` (`req.formData()`).
    3.  Repassa diretamente o `FormData` no corpo de uma requisição `PUT` para a API externa (`${process.env.NEXTAUTH_API_URL}/users/[id]`).
    4.  Retorna a resposta da API externa (sucesso ou erro) para o formulário no frontend que originou a chamada.
