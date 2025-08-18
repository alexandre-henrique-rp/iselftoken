# **nome:** Login
# **rota:** [/login]

## **descrição:**
- Página de autenticação de usuários, permitindo acesso à plataforma iSelfToken mediante inserção de credenciais (e-mail e senha).

## **tipo de acesso:**
- público

## **funcionalidades embarcadas:**
- Formulário de login com campos para e-mail e senha.
- Validação de entrada de dados.
- Redirecionamento para autenticação de dois fatores (A2F) ou página inicial após login bem-sucedido.
- Links para recuperação de senha e registro de novos usuários.

## **restrições:**
- Usuários já autenticados com A2F verificado são redirecionados para a página inicial (`/`).
- Usuários autenticados sem A2F verificado são redirecionados para `/auth`.
- Validação de formato de e-mail e obrigatoriedade de senha.

## **dependências:**
- Componentes: `LoginForm` (`src/components/login-form.tsx`).
- Hooks customizados: `useSession` (`src/hooks/useSession.ts`) para verificar estado de autenticação.
- Bibliotecas externas: `react-hook-form` e `zod` para validação de formulário.

## **APIs utilizadas:**

### **API Interna:**
- **Endpoint:** `POST /api/auth`
- **Autenticação:** Não
- **Request:**
```json
{
  "email": "string (endereço de e-mail do usuário)",
  "password": "string (senha do usuário)"
}
```
- **Response:**
```json
{
  "status": "success",
  "message": "Autenticado com sucesso",
  "data": {
    "user": {
      "id": "string",
      "email": "string",
      "role": "string (investidor, startup, admin, afiliado)"
    }
  }
}
```

## **Navegação:**
- **Links de entrada:** `/` (home), `/register`.
- **Links de saída:** `/auth` (para A2F), `/` (após login bem-sucedido), `/recuperar-senha` (para recuperação de senha), `/register` (para novos usuários).
- **Parâmetros de rota:** Nenhum, rota estática.

## **Estados e Dados:**
- **Estados locais:** Estado de carregamento (`loading`) gerenciado pelo hook `useSession`.
- **Estados globais:** Estado de sessão obtido via `useSession`.
- **Cache:** Não utiliza cache específico.
- **Persistência:** Não há persistência de dados local.

## **Validações:**
- **Formulários:** Schema `zod` valida `email` (formato de e-mail válido) e `password` (campo obrigatório).
- **Inputs:** Regras de obrigatoriedade e formato aplicadas via `react-hook-form` e `zod`.
- **Permissões:** Middleware redireciona usuários já autenticados.

## **Tratamento de Erros:**
- **Errors boundaries:** Não há tratamento específico de erro de renderização.
- **Try/catch:** Não há operações assíncronas diretas na página.
- **Fallbacks:** Mensagens de erro de validação exibidas no formulário.

## **Performance:**
- **Loading states:** Estado de carregamento (`loading`) exibido enquanto a sessão é verificada.
- **Lazy loading:** Não implementado.
- **Memoization:** Não há uso de `useMemo` ou `useCallback`.

## **SEO/Meta:**
- **Title:** 'Login - iSelfToken'
- **Description:** Não especificado.
- **Keywords:** Não especificado.
