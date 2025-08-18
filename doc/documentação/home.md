# **nome:** Home (Investidor)
# **rota:** /home

## **descrição:**
- Página protegida para investidores logados, exibindo oportunidades de investimento e portfólio.
- Interface personalizada para o papel de usuário `investidor`.

## **tipo de acesso:**
- privado

## **funcionalidades embarcadas:**
- Exibição de oportunidades de captação (startups disponíveis para investimento).
- Visão do portfólio do investidor (investimentos realizados).
- Filtros ou busca de captações (a implementar).

## **restrições:**
- Middleware (`src/middleware.ts`):
  - Requer sessão válida e `a2f-verified=true`.
  - Acesso permitido apenas se `session.user.role === 'investidor'`; caso contrário, redireciona conforme `role` ou para `/auth` (se A2F pendente).

## **dependências:**
- Componentes: `Card`, `Button`, e outros da biblioteca customizada.
- Componentes de negócio: `StartupCard` (em `src/components/`).
- Layout protegido: `src/app/(protected)/layout.tsx` (passa `role` do servidor).
- Sidebar: `src/components/app-sidebar.tsx` (recebe `role` e filtra itens no `NavMain`).
- Hook de sessão: `src/hooks/useSession.ts` (busca `GET /api/auth`).

## **APIs utilizadas:**

### **GET /api/home/investidor** (pendente de confirmação)
- Busca dados do home do investidor (oportunidades e portfólio).
- Request: N/A (apenas autenticação via cookie/sessão).
- Responses:
  - Sucesso (200):
  ```json
  {
    "status": "success",
    "data": {
      "oportunidades": [...],
      "portfolio": {...}
    }
  }
  ```
  - Erro (401/403):
  ```json
  { "status": "error", "message": "Acesso negado ou sessão inválida" }
  ```

## **Navegação:**
- **Links de entrada:** `/home` (após autenticação).
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
- **Title:** 'iSelfToken - Home do Investidor'
- **Description:** Não especificado explicitamente no código.
- **Keywords:** Não especificado.

## **Fluxo atual (frontend):**
1. Usuário (`investidor`) acessa `/home`; middleware verifica sessão, A2F e role.
2. Página carrega dados via API (endpoint a confirmar).
3. Exibe oportunidades de investimento e portfólio; sidebar filtrada por role permite navegação.

## **Melhorias sugeridas (próximos passos):**
- Implementar filtros e busca para captações.
- Adicionar feedback com `toast` para operações e erros.
- Confirmar endpoint exato e estrutura de dados da API.

## **Observações de UI:**
- Layout com sidebar à esquerda (via `AppSidebar`) e conteúdo principal à direita.
- Design responsivo para exibição de cards de startups e métricas de portfólio.
