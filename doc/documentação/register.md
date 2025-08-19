# **nome:** Registro
# **rota:** [/register]

## **descrição:**
- Página de cadastro de novos usuários na plataforma iSelfToken, permitindo a escolha entre perfis de investidor ou startup, com formulários específicos para cada tipo.

## **tipo de acesso:**
- público

## **funcionalidades embarcadas:**
- Modal de seleção de perfil (investidor ou startup).
- Formulários específicos para cada tipo de perfil (`InvestorForm` e `StartupForm`).
- Validação de dados em tempo real com feedback visual.
- Redirecionamento para login após conclusão do cadastro.

## **restrições:**
- Usuários já autenticados com A2F verificado são redirecionados para a página inicial (`/`).
- Usuários autenticados sem A2F verificado são redirecionados para `/auth`.
- Validações rigorosas de formato para campos como CPF, CNPJ, telefone e CEP.

## **dependências:**
- Componentes: `InvestorForm` (`src/components/register/InvestorForm.tsx`), `StartupForm` (`src/components/register/StartupForm.tsx`), `Dialog` (de `@radix-ui/react-dialog`).
- Hooks customizados: `useSession` (`src/hooks/useSession.ts`) para verificar estado de autenticação.
- Bibliotecas externas: `react-hook-form`, `zod`, `remask` (para máscaras de entrada).

## **APIs utilizadas:**
- Nenhuma API é chamada diretamente nesta página. Os dados do formulário serão enviados ao backend em uma etapa futura (pendente de implementação).

## **Navegação:**
- **Links de entrada:** `/` (home), `/login`.
- **Links de saída:** `/login` (após conclusão do cadastro), `/` (se já autenticado com A2F).
- **Parâmetros de rota:** Nenhum, rota estática.

## **Estados e Dados:**
- **Estados locais:** `selectedProfile` (controla o perfil escolhido), `open` (controla o modal de seleção).
- **Estados globais:** Estado de sessão obtido via `useSession`.
- **Cache:** Não utiliza cache específico.
- **Persistência:** Não há persistência de dados local.

## **Validações:**
- **Formulários:** Schemas `zod` específicos para investidor (`investorSchema`) e startup (`startupSchema`), com validações de obrigatoriedade, formato (CPF, CNPJ, telefone, CEP) e correspondência de senha.
- **Inputs:** Máscaras aplicadas via `remask` e sanitização de dados antes do envio.
- **Permissões:** Middleware redireciona usuários já autenticados.

## **Tratamento de Erros:**
- **Errors boundaries:** Não há tratamento específico de erro de renderização.
- **Try/catch:** Não há operações assíncronas diretas na página.
- **Fallbacks:** Mensagens de erro de validação exibidas inline nos formulários.

## **Performance:**
- **Loading states:** Estado de carregamento (`loading`) exibido enquanto a sessão é verificada.
- **Lazy loading:** Não implementado.
- **Memoization:** Não há uso de `useMemo` ou `useCallback`.

## **SEO/Meta:**
- **Title:** 'Registro - iSelfToken'
- **Description:** Não especificado.
- **Keywords:** Não especificado.
