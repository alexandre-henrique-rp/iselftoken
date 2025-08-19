# **nome:** Redefinição de Senha
# **rota:** [/redefinir-senha]

## **descrição:**
- Página para redefinição de senha na plataforma iSelfToken, acessível via link temporário enviado por e-mail, permitindo que usuários criem uma nova senha.

## **tipo de acesso:**
- público

## **funcionalidades embarcadas:**
- Formulário com campos para nova senha e confirmação de senha.
- Validação de senha quanto a tamanho mínimo e correspondência entre os campos.
- Feedback visual sobre o sucesso ou falha na redefinição.
- Redirecionamento para login após redefinição bem-sucedida.

## **restrições:**
- Usuários já autenticados com A2F verificado são redirecionados para a página inicial (`/`).
- Usuários autenticados sem A2F verificado são redirecionados para `/auth`.
- Nova senha deve ter pelo menos 8 caracteres.
- Campos de senha e confirmação devem corresponder.

## **dependências:**
- Componentes: `Input` (`src/components/ui/input.tsx`), `Button` (`src/components/ui/button.tsx`), `Card` (`src/components/ui/card.tsx`).
- Hooks customizados: `useSession` (`src/hooks/useSession.ts`) para verificar estado de autenticação.
- Bibliotecas externas: `react-hook-form`, `zod`, `sonner` (para mensagens toast).

## **APIs utilizadas:**
- Nenhuma API é chamada diretamente nesta página. A integração com o backend para validação do token e atualização da senha está pendente de implementação.

## **Navegação:**
- **Links de entrada:** Acessível via link temporário enviado por e-mail (de `/recuperar-senha`).
- **Links de saída:** `/login` (após redefinição bem-sucedida), `/` (se já autenticado com A2F), `/auth` (se autenticado sem A2F).
- **Parâmetros de rota:** Nenhum, rota estática (token deve ser gerenciado via query ou backend).

## **Estados e Dados:**
- **Estados locais:** `loading` (controla estado de carregamento da sessão), `isSubmitted` (indica se o formulário foi enviado).
- **Estados globais:** Estado de sessão obtido via `useSession`.
- **Cache:** Não utiliza cache específico.
- **Persistência:** Não há persistência de dados local.

## **Validações:**
- **Formulários:** Schema `zod` valida `password` (mínimo de 8 caracteres) e `confirmPassword` (deve corresponder a `password`).
- **Inputs:** Campos são obrigatórios com regras de tamanho e correspondência.
- **Permissões:** Middleware redireciona usuários já autenticados.

## **Tratamento de Erros:**
- **Errors boundaries:** Não há tratamento específico de erro de renderização.
- **Try/catch:** Não há operações assíncronas diretas na página.
- **Fallbacks:** Mensagens de erro de validação exibidas inline no formulário.

## **Performance:**
- **Loading states:** Estado de carregamento (`loading`) exibido enquanto a sessão é verificada.
- **Lazy loading:** Não implementado.
- **Memoization:** Não há uso de `useMemo` ou `useCallback`.

## **SEO/Meta:**
- **Title:** 'Redefinir Senha - iSelfToken'
- **Description:** Não especificado.
- **Keywords:** Não especificado.

## **Observações sobre Implementação:**
- A integração com o backend para validação do token de redefinição e atualização da senha ainda não foi implementada. Atualmente, a página apenas simula a redefinição com um atraso de 1 segundo e exibe uma mensagem de sucesso.
- O token de redefinição deve ser passado via query parameter ou gerenciado pelo backend, mas isso não está implementado.

## **Melhorias Sugeridas:**
- Implementar integração com API para validar token de redefinição e atualizar senha.
- Adicionar tratamento de erro para tokens inválidos ou expirados.
- Melhorar UX com estado de carregamento real durante a redefinição.
- Implementar verificação de força da senha com feedback visual (ex.: barra de força).
