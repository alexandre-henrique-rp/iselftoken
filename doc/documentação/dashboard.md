# **nome:** Dashboard (Startup)
# **rota:** /dashboard

## **descrição:**
- Página protegida para startups logadas, exibindo métricas de desempenho, captações e interações com investidores.
- Interface personalizada para o papel de usuário `startup`.

## **tipo de acesso:**
- privado

## **funcionalidades embarcadas:**
- Exibição de métricas de captação (investimentos recebidos, interesse de investidores).
- Visão geral de interações e contatos com investidores.
- Ferramentas de gestão de captação (a implementar).

## **restrições:**
- Middleware (`src/middleware.ts`):
  - Requer sessão válida e `a2f-verified=true`.
  - Acesso permitido apenas se `session.user.role === 'startup'`; caso contrário, redireciona conforme `role` ou para `/auth` (se A2F pendente).

## **dependências:**
- Componentes: Componentes customizados para exibição de métricas e dados.
- Componentes de negócio: `StartupHome` (em `src/components/startupHome.tsx`).
- Layout protegido: `src/app/(protected)/layout.tsx` (passa `role` do servidor).
- Sidebar: `src/components/app-sidebar.tsx` (recebe `role` e filtra itens no `NavMain`).
- Hook de sessão: `src/hooks/useSession.ts` (busca `GET /api/auth`).
- Dados mock: `src/data/data.json` (utilizado para simulação de dados).

## **APIs utilizadas:**

### **GET /api/dashboard/startup** (pendente de confirmação)
- Busca dados do dashboard da startup (métricas e interações).
- Request: N/A (apenas autenticação via cookie/sessão).
- Responses:
  - Sucesso (200):
  ```json
  {
    "status": "success",
    "data": {
      "metricas": {...},
      "interacoes": [...]
    }
  }
  ```
  - Erro (401/403):
  ```json
  { "status": "error", "message": "Acesso negado ou sessão inválida" }
  ```

## **Navegação:**
- **Links de entrada:** `/dashboard` (após autenticação).
- **Links de saída:** `/auth` (se A2F pendente), `/logout` (para sair da aplicação).
- **Parâmetros de rota:** Nenhum, rota estática.

## **Estados e Dados:**
- **Estados locais:** Estados locais para gerenciar a exibição de dados.
- **Estados globais:** Utiliza context ou store global para gerenciar a sessão do usuário.
- **Cache:** Não utiliza cache específico.
- **Persistência:** Não há persistência de dados.

## **Validações:**
- **Formulários:** Não há formulários nesta página.
- **Inputs:** Não aplicável.
- **Permissões:** Verifica permissões de acesso com base no papel do usuário.

## **Tratamento de Erros:**
- **Errors boundaries:** Não há tratamento de erro específico.
- **Try/catch:** Não aplicável.
- **Fallbacks:** Não há estados de erro definidos.

## **Performance:**
- **Loading states:** Não há estados de carregamento visíveis.
- **Lazy loading:** Não implementado explicitamente.
- **Memoization:** Não há uso de `useMemo` ou `useCallback`.

## **SEO/Meta:**
- **Title:** 'iSelfToken - Dashboard da Startup'
- **Description:** Não especificado explicitamente no código.
- **Keywords:** Não especificado.

## **Fluxo atual (frontend):**
1. Usuário (`startup`) acessa `/dashboard`; middleware verifica sessão, A2F e role.
2. Página carrega dados via API (endpoint a confirmar, atualmente usando mock).
3. Exibe métricas e interações; sidebar filtrada por role permite navegação.

## **Melhorias sugeridas (próximos passos):**
- Implementar integração com API real para substituir dados mock.
- Adicionar ferramentas de gestão de captação.
- Adicionar feedback com `toast` para operações e erros.
- Confirmar endpoint exato e estrutura de dados da API.

## **Observações de UI:**
- Layout com sidebar à esquerda (via `AppSidebar`) e conteúdo principal à direita.
- Design responsivo para exibição de métricas e interações com investidores.
