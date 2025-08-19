# **nome:** Autenticação de Dois Fatores (A2F)
# **rota:** [/auth]

## **descrição:**
- Página de autenticação de dois fatores (A2F) da plataforma iSelfToken, onde os usuários inserem o código de 6 dígitos recebido por e-mail para verificar sua identidade após o login.

## **tipo de acesso:**
- público (com restrição de redirecionamento para usuários não autenticados ou já verificados)

## **funcionalidades embarcadas:**
- Formulário com 6 campos de entrada para dígitos individuais do código A2F.
- Foco automático no próximo campo ao digitar um dígito.
- Suporte para colar um código de 6 dígitos, distribuindo automaticamente nos campos.
- Feedback visual para erros de validação ou código inválido.
- Recarregamento da página após validação bem-sucedida para aplicar redirecionamento baseado na role do usuário.

## **restrições:**
- Usuários não autenticados ou sem sessão são redirecionados para `/login`.
- Usuários já autenticados com A2F verificado são redirecionados para `/`.
- O código deve ter exatamente 6 dígitos numéricos.

## **dependências:**
- Componentes: `Input` (`src/components/ui/input.tsx`), `Button` (`src/components/ui/button.tsx`).
- Hooks customizados: `useSession` (`src/hooks/useSession.ts`) para verificar estado de autenticação e recarregar dados.
- Bibliotecas externas: `react-hook-form`, `zod`, `sonner` (para mensagens toast).

## **APIs utilizadas:**

### **API Interna:**
- **Endpoint:** `GET /api/auth/a2f`
- **Autenticação:** Sim (requer sessão ativa)
- **Request:**
  - Nenhum corpo de requisição, apenas verifica a sessão atual.
- **Response:**
```json
{
  "status": "success",
  "message": "Código A2F enviado para o e-mail",
  "codigo": "string (apenas em ambiente de desenvolvimento, para teste)"
}
```

- **Endpoint:** `PUT /api/auth/a2f/put`
- **Autenticação:** Sim (requer sessão ativa)
- **Request:**
```json
{
  "status": true
}
```
- **Response:**
```json
{
  "status": "success",
  "message": "Código A2F validado com sucesso"
}
```

## **Navegação:**
- **Links de entrada:** `/login` (após autenticação inicial).
- **Links de saída:** `/` (após validação A2F bem-sucedida, redirecionado pelo middleware conforme role), `/login` (se não autenticado).
- **Parâmetros de rota:** Nenhum, rota estática.

## **Estados e Dados:**
- **Estados locais:** `codigo` (para comparar com entrada do usuário em dev), `isLoading` (controle de estado de carregamento).
- **Estados globais:** Estado de sessão obtido via `useSession`.
- **Cache:** Não utiliza cache específico.
- **Persistência:** Não há persistência de dados local, apenas cookies gerenciados pelo backend.

## **Validações:**
- **Formulários:** Schema `zod` valida `code` como string de 6 dígitos numéricos.
- **Inputs:** Cada campo aceita apenas um dígito, com foco automático e validação em tempo real.
- **Permissões:** Middleware verifica estado de autenticação e A2F.

## **Tratamento de Erros:**
- **Errors boundaries:** Não há tratamento específico de erro de renderização.
- **Try/catch:** Erros de API são capturados e exibidos via `toast`.
- **Fallbacks:** Mensagens de erro como 'Código inválido' ou 'Erro ao buscar código A2F' exibidas ao usuário.

## **Performance:**
- **Loading states:** Estado de carregamento (`isLoading`) exibido durante chamadas de API.
- **Lazy loading:** Não implementado.
- **Memoization:** Não há uso de `useMemo` ou `useCallback`.

## **SEO/Meta:**
- **Title:** 'Autenticação - iSelfToken'
- **Description:** Não especificado.
- **Keywords:** Não especificado.

## **Observações sobre Implementação:**
- O código A2F é retornado na resposta da API apenas em ambiente de desenvolvimento para fins de teste. Em produção, isso deve ser removido por segurança.
- O envio de e-mail com o código A2F é gerenciado pelo backend via `nodemailer`, utilizando módulos separados para envio, templates HTML/texto e geração de código (`src/modules/email/`, `src/model/email/`, `src/modules/codigo/`).
- Após validação bem-sucedida, a página é recarregada para que o middleware aplique o redirecionamento correto baseado na role do usuário (`startup` -> `/dashboard`, `investidor` -> `/home`, outros a definir).

## **Melhorias Sugeridas:**
- Implementar expiração do código A2F (ex.: 5 minutos).
- Adicionar limite de tentativas de validação com bloqueio temporário.
- Armazenar código A2F de forma segura no backend (ex.: hash ou banco temporário) ao invés de retornar em dev.
- Adicionar funcionalidade de reenvio de código com cooldown (ex.: esperar 30s).
- Melhorar UX com estado de carregamento durante o recarregamento da página.

## **UX/Validações:**
- Somente dígitos (0-9), 1 caractere por input, totalizando 6.
- Mensagens de erro via `zod` e `toast`.
- Permite colar os 6 dígitos distribuindo nos inputs.

## **restrições:**
- Requer sessão autenticada para acessar `/auth` (middleware controla redirecionamentos).
- Cookie: `a2f-verified` é lido/escrito por utilitários em `src/context/auth/`:
  - `GetA2fVerified()`, `SetA2fVerified(value)`, `DeleteA2fVerified()`.
- Em desenvolvimento, o endpoint retorna o `codigo` no JSON apenas para testes (remover em produção).

## **Middleware (src/middleware.ts):**
- Bypass para todas as rotas `/api/*`.
- Se `session` e `!a2fVerified` e `pathname !== '/auth'` => redireciona para `/auth`.
- Em `/auth`: se `session` e `a2fVerified` => redireciona para `/`.
- Em `/login`: se `!a2fVerified` => redireciona para `/auth`.
- Em `/`: se `session.user.role === 'startup'` => `/dashboard`; se `investidor` => `/home`.

## **Fluxo de Autenticação A2F**
1. Usuário faz login (`POST /api/auth`), criando cookie de sessão.
2. Middleware detecta sessão sem A2F verificado e redireciona para `/auth`.
3. Na página `/auth`, um `GET /api/auth/a2f` é chamado ao carregar, gerando e enviando código por e-mail.
4. Usuário insere código; se válido, `PUT /api/auth/a2f/put` define `a2f-verified=true`.
5. Página recarrega, middleware detecta A2F verificado e redireciona por role (`/dashboard` ou `/home`).

## **Integração com Middleware**
- Middleware (`src/middleware.ts`) verifica cookie `a2f-verified`.
- Se `session` existe mas `a2fVerified` é `false`, redireciona para `/auth` (exceto em rotas `/api/*`).
- Se ambos existem e estão verificados, permite acesso a rotas protegidas e redireciona de `/auth` para homepage.

## **Observações**
- Em produção, o código A2F não deve ser retornado na resposta do `GET /api/auth/a2f` por segurança.
- E-mail é enviado via SMTP com Nodemailer, usando variáveis de ambiente (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `APP_NAME`).
- Templates de e-mail (HTML e texto) estão embutidos no código, com design responsivo e branding do iSelfToken.

## **Melhorias Sugeridas**
- Implementar expiração do código A2F (ex.: 5 minutos).
- Adicionar limite de tentativas para inserção de código.
- Armazenar código A2F de forma segura (ex.: banco de dados ou cache) em vez de mock.
- Remover retorno do código na resposta em produção.
- Adicionar funcionalidade de reenvio de código com cooldown.
- Incluir testes de integração para o fluxo completo de A2F.

## **Observações de UI:**
- Imagem randômica: `/image-01.jpg`…`/image-04.jpg`.
- Logo no topo: `/logo.png`.

## **Autenticação de Dois Fatores (A2F)**

## **Descrição Geral**
- Conjunto de endpoints e funcionalidades para gerenciar autenticação de dois fatores no sistema iSelfToken.
- Objetivo: Adicionar camada extra de segurança ao processo de login, exigindo código enviado ao e-mail do usuário após autenticação inicial.
- Localização dos Endpoints:
  - `src/app/api/auth/a2f/route.ts` (envio de código A2F).
  - `src/app/api/auth/a2f/put/route.ts` (validação de código A2F).
- Localização da Página: `src/app/(public)/auth/page.tsx` (interface para inserção do código A2F).

## **Tipo de Acesso**
- **Protegido**: Endpoints de A2F requerem sessão válida (usuário já autenticado via `POST /api/auth`).
- **Público com Redirecionamento**: Página `/auth` é acessível publicamente, mas middleware redireciona usuários sem sessão ou com A2F já verificado.

## **Dependências**
- **Internas**:
  - `GetSessionServer`, `SetA2fVerified` de `@/context/auth` (gerenciamento de sessão e verificação A2F).
  - `generateA2fCode` de `@/modules/codigo/a2f` (geração de código A2F de 6 dígitos).
  - Templates de e-mail: `buildA2fHtmlTemplate` e `buildA2fTextTemplate` de `@/model/email/html/auth-a2f` e `@/model/email/text/auth-a2f` (formatação de mensagens).
  - Nodemailer para envio de e-mails (simulado ou configurado via variáveis de ambiente).
- **Externas**:
  - `NextResponse` de `next/server` para respostas HTTP.
  - `react-hook-form` e `zod` no frontend para validação do formulário de código.

## **Endpoints de A2F**

### **POST /api/auth/a2f**
- **Descrição**: Envia um código A2F de 6 dígitos para o e-mail do usuário autenticado.
- **Funcionalidade**:
  - Verifica sessão atual via `GetSessionServer`.
  - Gera código A2F com `generateA2fCode()`.
  - Simula envio de e-mail com Nodemailer (em produção, usa SMTP configurado via variáveis de ambiente como `SMTP_HOST`, `SMTP_USER`, etc.).
  - Retorna código no response apenas em ambiente de desenvolvimento (`NODE_ENV !== 'production'`) para fins de teste.
- **Request**: N/A (autenticação via cookie/sessão).
- **Responses**:
  - Sucesso (200):
    ```json
    {
      "message": "Código A2F enviado",
      "codigo": "123456" // apenas em dev
    }
    ```
  - Erro (401):
    ```json
    { "error": "Usuário não autenticado" }
    ```
  - Erro (500):
    ```json
    { "error": "Erro ao solicitar A2F" }
    ```
- **Restrições**: Requer sessão válida; retorna erro se usuário não estiver logado.
- **Observações de Segurança**:
  - Código não é retornado em produção (apenas logado no console do servidor).
  - E-mail enviado para endereço fixo ou baseado na sessão do usuário.

### **PUT /api/auth/a2f/put**
- **Descrição**: Valida o código A2F inserido pelo usuário e marca a sessão como verificada.
- **Funcionalidade**:
  - Recebe código no corpo da requisição.
  - Verifica sessão via `GetSessionServer`.
  - Simula validação (atualmente aceita status booleano no body para teste).
  - Marca sessão como verificada com `SetA2fVerified(true)`.
- **Request**:
  ```json
  { "status": true } // simulação para teste
  ```
- **Responses**:
  - Sucesso (200):
    ```json
    { "ok": true, "message": "A2F verificado" }
    ```
  - Erro (401):
    ```json
    { "error": "Usuário não autenticado" }
    ```
  - Erro (500):
    ```json
    { "error": "Erro ao verificar A2F" }
    ```
- **Restrições**: Requer sessão válida; retorna erro se usuário não estiver logado.
- **Observações**:
  - Validação real do código pendente (atualmente simulação com `status: true`).
  - Após sucesso, middleware redireciona usuário para rota protegida baseada no `role`.

## **Página de A2F (/auth)**
- **Descrição**: Interface pública para inserção do código A2F.
- **Funcionalidades**:
  - Formulário com 6 campos de dígito único, gerenciados por `react-hook-form` e validados por `zod`.
  - Botão para solicitar novo código (chama `POST /api/auth/a2f`).
  - Submissão do código chama `PUT /api/auth/a2f/put`.
  - Feedback com `toast` (via Sonner) para sucesso ou erro.
- **Restrições**: Middleware redireciona usuários não logados para `/login` ou com A2F já verificado para rota protegida (ex.: `/home` ou `/dashboard`).
- **Dependências**: Componentes UI customizados, `useSession` para verificar estado, `useRouter` para redirecionamentos.
- **Fluxo**:
  1. Usuário logado acessa `/auth`; middleware verifica A2F pendente.
  2. Usuário solicita código via botão (chama `POST /api/auth/a2f`).
  3. Insere código e submete (chama `PUT /api/auth/a2f/put`).
  4. Após sucesso, página recarrega e middleware redireciona conforme `role`.

## **Fluxo Geral de A2F**
1. Usuário realiza login via `POST /api/auth`, criando cookie de sessão.
2. Middleware detecta `a2f-verified=false` e redireciona para `/auth`.
3. Usuário solicita código via `POST /api/auth/a2f`; sistema envia e-mail com código (em dev, retorna código no response).
4. Usuário insere código na página `/auth` e submete via `PUT /api/auth/a2f/put`.
5. Sistema marca sessão como `a2f-verified=true`; recarrega página e redireciona para rota protegida.

## **Melhorias Sugeridas (Próximos Passos)**
- Implementar validação real do código A2F em `PUT /api/auth/a2f/put` (comparação com código gerado/armazenado).
- Adicionar expiração de código (ex.: 5 minutos) e limite de tentativas.
- Implementar cooldown para reenvio de código via `POST /api/auth/a2f`.
- Armazenar código A2F de forma segura (ex.: cache Redis ou banco) ao invés de log no console.
- Testes TDD para geração, envio e validação de código, cobrindo casos de erro (ex.: código inválido, expirado).
- UX: Adicionar indicador de carregamento na página `/auth` durante chamadas de API.

## **Observações de Segurança**
- Código A2F não é exposto em produção (apenas logado no servidor), protegendo contra interceptação.
- E-mails enviados via SMTP seguro (configurado por variáveis de ambiente).
- Sessão só é liberada para rotas protegidas após A2F verificado, garantindo segurança adicional.
- Melhorias pendentes: expiração de código, limite de tentativas e armazenamento seguro.
