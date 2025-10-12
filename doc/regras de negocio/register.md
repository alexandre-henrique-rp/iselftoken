# Regras de Negócio: Cadastro de Usuário (Register)

## Visão Geral do Fluxo

O processo de cadastro é uma experiência guiada em múltiplos passos para garantir que todos os dados necessários sejam coletados de forma organizada.

1.  **Busca de Dados Iniciais**: Ao acessar a página `/register`, o servidor busca uma lista de países de uma API externa para popular o formulário.
2.  **Modal de Localização**: Um modal inicial obriga o usuário a selecionar seu País, Estado e Cidade. A seleção de um item filtra as opções do item seguinte (ex: selecionar um país carrega a lista de estados correspondente).
3.  **Seleção de Perfil**: Após a localização, o usuário é apresentado ao formulário principal, onde deve escolher o tipo de perfil: Investidor, Fundador ou Afiliado.
4.  **Preenchimento do Formulário**: O usuário preenche os campos de dados pessoais, endereço e credenciais. O formulário possui validações para garantir a integridade dos dados.
5.  **Submissão**: Ao completar e submeter o formulário, os dados são enviados para a rota de API específica do perfil escolhido (ex: `/api/register/investidor`).
6.  **Criação e Ativação**: O backend recebe os dados, cria o usuário na API externa e já o ativa em uma segunda chamada.
7.  **Início do A2F**: Assim como no login, um código de verificação é gerado e um token JWT é criado para iniciar o fluxo de Autenticação de Dois Fatores (A2F).
8.  **Redirecionamento**: O usuário é redirecionado para a página de A2F para verificar seu e-mail e ativar completamente a conta.

---

### Frontend

#### 1. `src/app/(public)/register/page.tsx`

-   **Função**: Componente de servidor que prepara os dados para a página de registro.
-   **Regras de Negócio:**
    1.  Antes de renderizar a página, faz uma chamada de API para `${process.env.NEXTAUTH_API_URL}/countries` para obter a lista de todos os países.
    2.  Renderiza o componente cliente `<RegisterFlow />`, passando a lista de países como `props`.

#### 2. `src/components/register/RegisterFlow.tsx`

-   **Função**: Gerencia toda a interface e o estado do fluxo de cadastro multi-passos.
-   **Regras de Negócio:**
    1.  **Modal de Localização**: Exibe um modal inicial que não pode ser fechado sem preenchimento.
    2.  **Carregamento Dinâmico**: Conforme o usuário seleciona um país, faz uma chamada à API interna (`/api/location/states`) para buscar os estados. Ao selecionar um estado, chama (`/api/location/cities`) para buscar as cidades.
    3.  **Formulário Principal**: Após a localização, exibe o componente `<InvestorForm />` (que na verdade lida com todos os tipos de perfil).

#### 3. `src/components/register/InvestorForm.tsx` (Componente principal do formulário)

-   **Função**: Contém a lógica do formulário de múltiplos passos, validações e submissão.
-   **Regras de Negócio:**
    1.  **Seleção de Perfil**: O primeiro passo é a escolha entre 'Investidor', 'Fundador' e 'Afiliado'.
    2.  **Validação com Zod**: Utiliza `zod` para validar todos os campos, incluindo:
        -   Nome, email, CPF (validado com algoritmo), telefone.
        -   Senha (mínimo de 8 caracteres, com letras, números e símbolos) e confirmação de senha.
        -   Endereço completo (CEP, etc.).
        -   Aceite dos termos de uso é obrigatório.
    3.  **Submissão**: Ao submeter, a função `onSubmit` determina a URL da API correta com base no perfil selecionado (`userType`).
    4.  Envia uma requisição `POST` para a API correspondente (ex: `/api/register/investidor`) com todos os dados do formulário.
    5.  Em caso de sucesso, redireciona o usuário para a URL de A2F retornada pela API.
    6.  Em caso de erro, exibe uma notificação (toast) com a mensagem de erro.

---

### Backend (`/api/register/*`)

As três rotas (`/api/register/investidor`, `/api/register/fundador`, `/api/register/afiliado`) seguem uma lógica quase idêntica.

-   **Função**: Receber os dados do formulário, criar o usuário na API externa e iniciar o fluxo de verificação de e-mail (A2F).
-   **Regras de Negócio Comuns:**
    1.  Recebe os dados do novo usuário via `POST`.
    2.  Realiza uma limpeza nos dados (ex: remove máscaras de CPF, CEP e telefone com `replace(/\D/g, '')`).
    3.  Gera um código de A2F de 6 dígitos.
    4.  Envia os dados limpos, junto com o código A2F, para a API externa principal (ex: `${process.env.NEXTAUTH_API_URL}/register/investor`).
    5.  Se a API externa retornar erro, a rota repassa o erro para o frontend.
    6.  Se a criação na API externa for bem-sucedida, ela retorna um `usuario_id`.
    7.  **Imediatamente**, a rota faz uma **segunda chamada** para a API externa para ativar a conta recém-criada (ex: `${process.env.NEXTAUTH_API_URL}/activate/investor`), usando o `usuario_id`.
    8.  Cria um token JWT com validade de **20 minutos**, contendo o código A2F e o `usuario_id`.
    9.  Retorna uma resposta de sucesso para o frontend, contendo a URL para a página de A2F (ex: `/auth/SEU_TOKEN_JWT`).
