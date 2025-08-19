# **nome:** Recuperação de Senha
# **rota:** [/recuperar-senha]

## **descrição:**
- Página para recuperação de senha na plataforma iSelfToken, permitindo que usuários solicitem um link de redefinição de senha via e-mail.

## **tipo de acesso:**
- público

## **funcionalidades embarcadas:**
- Formulário com campo para inserção de e-mail.
- Validação de formato de e-mail.
- Feedback visual sobre o envio do e-mail de recuperação.
- Redirecionamento para login após solicitação bem-sucedida.

## **restrições:**
- Usuários já autenticados com A2F verificado são redirecionados para a página inicial (`/`).
- Usuários autenticados sem A2F verificado são redirecionados para `/auth`.
- Campo de e-mail deve seguir formato válido.

## **dependências:**
- Componentes: `Input` (`src/components/ui/input.tsx`), `Button` (`src/components/ui/button.tsx`), `Card` (`src/components/ui/card.tsx`).
- Hooks customizados: `useSession` (`src/hooks/useSession.ts`) para verificar estado de autenticação.
- Bibliotecas externas: `react-hook-form`, `zod`, `sonner` (para mensagens toast).

## **APIs utilizadas:**
- Nenhuma API é chamada diretamente nesta página. A integração com o backend para envio de e-mail de recuperação está pendente de implementação.

## **Navegação:**
- **Links de entrada:** `/login`.
- **Links de saída:** `/login` (após solicitação de recuperação), `/` (se já autenticado com A2F), `/auth` (se autenticado sem A2F).
- **Parâmetros de rota:** Nenhum, rota estática.

## **Estados e Dados:**
- **Estados locais:** `loading` (controla estado de carregamento da sessão), `isSubmitted` (indica se o formulário foi enviado).
- **Estados globais:** Estado de sessão obtido via `useSession`.
- **Cache:** Não utiliza cache específico.
- **Persistência:** Não há persistência de dados local.

## **Validações:**
- **Formulários:** Schema `zod` valida `email` como string com formato de e-mail válido.
- **Inputs:** Campo de e-mail é obrigatório e deve seguir formato correto.
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
- **Title:** 'Recuperar Senha - iSelfToken'
- **Description:** Não especificado.
- **Keywords:** Não especificado.

## **Observações sobre Implementação:**
- A integração com o backend para envio de e-mail de recuperação de senha ainda não foi implementada. Atualmente, a página apenas simula o envio com um atraso de 1 segundo e exibe uma mensagem de sucesso.

## **Melhorias Sugeridas:**
- Implementar integração com API para envio de e-mail de recuperação.
- Adicionar tratamento de erro para casos em que o e-mail não está registrado na base de dados (sem revelar se o e-mail existe por segurança).
- Melhorar UX com estado de carregamento real durante o envio do e-mail.
