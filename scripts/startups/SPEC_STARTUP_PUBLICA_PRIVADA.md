# SPEC — Implementação das Páginas Pública e Privada da Startup

**ID:** STARTUP-DETAIL-01  
**Versão:** 1.0  
**Data:** 2026-09-04  
**Status:** Rascunho técnico — depende da aprovação do PRD  
**Base:** `scripts/PRD_STARTUP_PUBLICA_PRIVADA.md`

## 1. Objetivo técnico

Implementar dois detalhes separados por autorização e contrato:

- **Público:** `/s/:slugOrId`, fora do layout, SSR, BFF e DTO público mínimo.
- **Privado:** `/startups/:id`, sob o layout, SSR com `serverFetch`, TanStack Query hidratado, DTO completo autorizado e fluxo de investimento existente.

Não reutilizar `GET /startup/:id` como payload de investidor. Esse endpoint é genérico, ligado ao módulo de CRUD/edição e pode evoluir com campos que não devem chegar ao investidor.

## 2. Diagnóstico técnico do estado atual

| Área | Código atual | Ação desta SPEC |
|---|---|---|
| Rota pública | `frontend/app/routes.ts` → `s/:slugOrId` | Manter fora do layout |
| Página pública | `routes/public/startup-public.tsx` | Extrair shell/loader/SEO para componentes e BFF |
| Loader público | Chama `BACKEND_URL/marketplace/public/:slugOrId` diretamente | Trocar por `serverFetch` ou fetch BFF público conforme padrão definido |
| Rota privada | `routes/private/startup-detail.tsx` | Manter dentro do layout |
| BFF privado | `routes/api/startup.$id.ts` chama `/marketplace/startup/:id` | Criar BFF dedicado de investidor e migrar hook |
| Hook privado | `use-startup-detail.ts`, `staleTime=30s` | Centralizar query options em `app/lib/queries.ts` e hidratar no loader |
| Dados de sessão | Layout já hidrata `me` e `auth-status` | Não repetir fetch na rota filha |
| Investimento | `InvestmentSidebar` → `/api/investments` → checkout | Preservar e adaptar somente ao novo DTO |
| Backend detalhe | Controller marketplace atual só possui listas | Criar serviços/controllers de detalhe público e investidor |

## 3. Arquitetura de rotas

### 3.1 Frontend

Registrar em `frontend/app/routes.ts`:

```ts
// Público, antes do prefixo de rotas autenticadas
route("s/:slugOrId", "routes/public/startup-public.tsx"),

// BFFs públicos/privados — dentro de prefix("api", [...])
route("marketplace/startups/:slugOrId", "routes/api/marketplace-startups.$slugOrId.ts"),
route("investor/startups/:id", "routes/api/investor-startups.$id.ts"),

// Privado, dentro do prefixo/layout existente
route("startups/:id", "routes/private/startup-detail.tsx"),
```

Os nomes dos arquivos são sugestão; a regra obrigatória é manter path HTTP com barras e arquivos BFF em kebab-case, conforme `frontend/AGENTS.md`.

### 3.2 Backend

Contratos propostos:

```text
GET /marketplace/startups/:slugOrId/public
  Auth: não
  Response: PublicStartupDetailDto
  Cache: público, curto, somente se a política permitir indexação

GET /investor/startups/:id/detail
  Auth: AuthGuard + autorização de sessão/2FA
  Response: InvestorStartupDetailDto
  Cache: privado/no-store no HTTP; TanStack Query no cliente
```

O controller de investidor deve ficar em módulo próprio ou em uma área de leitura claramente protegida. Não adicionar esses endpoints ao controller público sem guard acidentalmente omitido.

### 3.3 Canonicalização pública

- `/s/:slug` é a URL canônica, compartilhável e indexável.
- `/s/:id` é apenas fallback de compatibilidade; com slug existente, responde `301` para `/s/:slug`.
- O `canonical` do HTML aponta sempre para `/s/:slug`.
- A URL numérica recebe `noindex, follow` quando não for redirecionada.
- `/startups/:id` é privada e não participa de SEO.

## 4. Contratos de dados

Os DTOs devem ser construídos por seleção explícita do Prisma, nunca por spread de `startup` ou `campaign` inteiros.

### 4.1 `PublicStartupDetailDto`

```ts
interface PublicStartupDetailDto {
  id: number;
  slug: string;
  name: string;
  logoUrl: string | null;
  coverUrl: string | null;
  category: string | null;
  stage: string | null;
  publicDescription: string;
  publicVideoUrl: string | null;
  problem: string | null;
  solution: string | null;
  campaign: {
    id: number;
    status: "OPEN";
    goalAmount: number;
    raisedAmount: number;
    progressPercent: number;
    equityOffered: number;
  } | null;
  seo: {
    canonicalPath: string;
    indexable: boolean;
  };
}
```

**Não incluir:** `tokenPrice`, `tokensAvailable`, `totalTokens`, `valuation`, `investorCount` nominal, e-mails, CPF/CNPJ de pessoas, dados bancários, documentos, URLs de download privadas, dados internos de score, payload do founder ou qualquer campo sem finalidade de divulgação aprovada.

O contrato público deve conter somente meta, valor captado, progresso e equity dentro da campanha `OPEN`. O preço do token, mínimo, prazo, valuation e tokens disponíveis ficam exclusivamente no contrato privado.

### 4.2 `InvestorStartupDetailDto`

```ts
interface InvestorStartupDetailDto {
  id: number;
  slug: string | null;
  name: string;
  logoUrl: string | null;
  coverUrl: string | null;
  category: string | null;
  stage: string | null;
  description: string | null;
  publicVideoUrl: string | null;
  campaign: {
    id: number;
    status: string;
    title: string | null;
    goalAmount: number;
    raisedAmount: number;
    progressPercent: number;
    deadline: string | null;
    remainingDays: number | null;
    equityOffered: number | null;
    minimumInvestment: number;
    tokenPrice: number;
    totalTokens: number;
    tokensSold: number;
    tokensAvailable: number;
  };
  metrics: {
    valuation: number | null;
    investorCount: number;
  };
  thesis: {
    problem: string | null;
    solution: string | null;
    differentiator: string | null;
    revenueModel: string | null;
    targetMarket: string | null;
  };
  team: Array<{
    displayName: string;
    role: string | null;
    avatarUrl: string | null;
    bio: string | null;
  }>;
  documents: Array<{
    id: string;
    type: string;
    displayName: string;
    downloadable: boolean;
  }>;
  risks: Array<{
    title: string;
    description: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
  }>;
  forum: {
    enabled: boolean;
    topicCount: number;
  };
  investment: {
    campaignId: number;
    tokenPrice: number;
    minimumInvestment: number;
    tokensAvailable: number;
    canInvest: boolean;
    blockedReason: "KYC_REQUIRED" | "SUBSCRIPTION_REQUIRED" | null;
  };
}
```

O backend deve calcular `tokensAvailable = max(totalTokens - tokensSold, 0)` e `canInvest` a partir das regras vigentes. O frontend usa esses campos para UX, mas o `InvestmentsService` permanece autoridade no momento da criação.

A lista de investidores deve ser agregada. Nunca retornar nomes, emails, CPF, telefone ou identificadores diretos de outros investidores.

## 5. BFFs

### 5.1 BFF público

Arquivo sugerido: `frontend/app/routes/api/marketplace-startups.$slugOrId.ts`.

Responsabilidades:

- Validar `slugOrId` e limitar tamanho/charset.
- Chamar `BACKEND_URL/marketplace/startups/:slugOrId/public`.
- Não repassar cookies de sessão como requisito de autenticação.
- Preservar status de 404/410 e traduzir envelope `ResponseDto` para resposta HTTP coerente.
- Não logar slug junto com dados pessoais ou payload completo.

### 5.2 BFF privado

Arquivo sugerido: `frontend/app/routes/api/investor-startups.$id.ts`.

Responsabilidades:

- Aceitar apenas ID numérico válido.
- Repassar `Cookie` da request para `BACKEND_URL/investor/startups/:id/detail`.
- Retornar 401/403/404 sem mascarar uma falha de autorização como dado vazio.
- Não fazer fallback silencioso para endpoint CRUD público.
- Usar `ResponseDto` do backend sem expor stack trace.

## 6. SSR e TanStack Query

### 6.1 Chaves centralizadas

Adicionar em `frontend/app/lib/queries.ts`:

```ts
export const queryKeys = {
  // ...chaves existentes
  marketplace: {
    publicStartup: (slugOrId: string) =>
      ["marketplace", "public-startup", slugOrId] as const,
  },
  investor: {
    startupDetail: (id: string | number) =>
      ["investor", "startup-detail", String(id)] as const,
  },
};
```

As funções `publicStartupQueryOptions` e `investorStartupDetailQueryOptions` devem ficar no mesmo arquivo ou em módulo de queries importado por ele, sem strings mágicas duplicadas.

### 6.2 Loader público

O loader de `/s/:slugOrId` deve:

1. Validar o parâmetro.
2. Chamar o BFF local com `serverFetch(request, "/api/marketplace/startups/:slugOrId")`, que então acessa o contrato público do backend.
3. Transformar 404 em estado de página não encontrada.
4. Popular o `queryClient` com a chave pública se o componente usar `useQuery`.
5. Retornar `dehydratedState` e o identificador canônico.
6. Gerar `meta` usando somente o DTO público.

Como a rota não exige sessão, não deve chamar `users/me`, `auth/status` ou o loader do layout.

### 6.3 Loader privado

O loader de `/startups/:id` deve:

1. Receber o cookie da request através de `serverFetch`.
2. Buscar o detalhe privado no servidor.
3. Redirecionar/propagar 401 e 403 conforme o layout atual.
4. Popular `queryClient.setQueryData(investorStartupDetailQueryOptions(id).queryKey, detail)`.
5. Retornar `dehydrate(queryClient)` e `id`.
6. Manter o referral tracking como operação best-effort, sem bloquear o carregamento da startup.

O componente deve usar `HydrationBoundary` e `useQuery` com a mesma chave do loader. O primeiro render não deve disparar uma segunda requisição por estar sem dados hidratados.

### 6.4 Cache

- Público: `staleTime` curto, entre 30 e 60 segundos, conforme volatilidade da campanha; headers públicos somente se não houver risco de dados errados após mudança de status.
- Privado: `staleTime` de 30 segundos no TanStack Query, sem `Cache-Control: public`.
- Investimento criado: invalidar a query privada da startup e queries de carteira/investimentos afetadas quando o fluxo retornar ao detalhe.
- Não usar `refetchOnWindowFocus` agressivo.

## 7. Componentização frontend

### 7.1 Público

Extrair da rota para `frontend/app/components/startup-public/`:

- `public-startup-page.tsx` — shell visual.
- `public-startup-hero.tsx` — logo, capa, identidade e badge.
- `public-startup-campaign.tsx` — meta, progresso e prazo aprovados.
- `public-startup-pitch.tsx` — vídeo, problema e solução.
- `public-investor-cta.tsx` — login/cadastro com redirect seguro.
- `public-startup-related.tsx` — opcional e não bloqueante.
- `public-startup-seo.ts` — construção de metadados e JSON-LD.

A rota deve permanecer pequena: loader, meta, `ErrorBoundary` e composição do componente.

### 7.2 Privado

Reutilizar/adaptar `frontend/app/components/startup-detail/`:

- `StartupHero` recebe dados reais do DTO.
- `PitchVideo` recebe `publicVideoUrl` e placeholder de ausência.
- `MetricsGrid` recebe métricas calculadas pelo backend (incluindo 3 preços de token: base, venda, reserva).
- `AllocationChart` recebe a alocação de recursos (§3A do fluxo_startup) com slider + input numérico sincronizados; validação de soma = 100%.
- `BusinessSummary` recebe `thesis` em vez de texto estático.
- `TeamSection` recebe apenas equipe autorizada.
- `RiskDocs` recebe documentos/riscos e usa download autenticado/presigned.
- `RealInvestors` exibe somente agregados anonimizados.
- `InvestorForum` recebe status/contagem e trata indisponibilidade.
- `InvestmentSidebar` recebe o objeto `investment` e a campanha ativa.

Criar, se necessário, `InvestorStartupDetailPage` como componente de composição. A rota privada não deve conter markup complexo.

## 8. Fluxo de compra

1. Usuário autenticado acessa o detalhe privado.
2. `investment.canInvest` e `campaign.status` determinam o estado visual.
3. Ao clicar em investir, abrir modal local.
4. Validar no cliente:
   - valor informado;
   - valor mínimo;
   - preço positivo;
   - pelo menos um token;
   - tokens calculados não excedem disponibilidade exibida.
5. Se KYC estiver pendente/reprovado, orientar o usuário para concluir o perfil sem expor documentos.
6. Enviar:

```json
{
  "campaignId": 123,
  "amount": 1000
}
```

para `POST /api/investments` com cookies de sessão.

7. O backend valida subscription ativa, campanha `OPEN`, mínimo, preço e quantidade. Não confiar nas validações do frontend.
8. Em sucesso, extrair `data.payment.id`.
9. Navegar para `/checkout/payment/:paymentId`.
10. A confirmação do pagamento continua idempotente e dispara a emissão de tokens no pipeline existente.

O `affiliateCode` atualmente usado pela UI deve ser tratado como decisão de contrato: o DTO backend lido nesta análise não o declara. Não adicioná-lo silenciosamente ao fluxo sem alinhar controller, DTO, auditoria e regras de comissão.

## 9. Autorização, LGPD e segurança

- Público: somente campos explicitamente permitidos no `PublicStartupDetailDto`.
- Privado: `AuthGuard` e validação de sessão/2FA pelo layout e endpoint.
- Downloads: documentos apenas por endpoint autenticado e URL presigned de expiração curta.
- Nunca retornar dados bancários da startup ao investidor.
- Nunca retornar PII de investidores; usar contagem e agregados.
- Não registrar CPF, email, telefone, cookie, token ou payload financeiro completo em logs.
- Sanitizar/limitar conteúdo textual antes de renderizar JSON-LD e meta tags.
- Redirecionamento pós-login deve aceitar somente paths internos iniciados por `/` e rejeitar `//`, esquemas e hosts externos.
- Não usar `localStorage` para sessão ou token.
- Rate limit no endpoint público de detalhe e cache controlado para evitar abuso/scraping excessivo.

## 10. Estados e erros

| Situação | Público | Privado |
|---|---|---|
| Loading | Skeleton SSR/hydration | Skeleton SSR/hydration |
| Startup inexistente | 404 amigável + voltar ao marketplace | 404 amigável |
| Não elegível para divulgação | 404/410 sem detalhes internos | 403/404 conforme regra |
| Sessão ausente | Nunca bloqueia a leitura pública | Redirect server-side para login/2FA |
| Sem plano ativo | Não se aplica | Comportamento atual do layout, aguardando decisão de produto |
| Campanha sem `OPEN` | 404/indisponível, sem expor detalhes internos | 404/indisponível, sem CTA de investimento |
| KYC pendente | Não exibir estado privado | CTA orienta completar KYC |
| Endpoint opcional falha | Bloco vazio/retry | Bloco vazio/retry, página continua |
| Backend 5xx | Erro temporário + retry | Erro temporário + retry |

## 11. Backend: serviços e consultas

### 11.1 Serviço público

Criar `PublicStartupDetailService` no módulo marketplace ou módulo de leitura público. A consulta deve:

- Resolver `slugOrId` por slug preferencial ou ID numérico de fallback.
- Se o parâmetro for ID numérico e existir slug, responder com `301` para `/s/:slug` antes de renderizar a página.
- Selecionar somente startup elegível com campanha `OPEN`; qualquer outro status retorna 404/indisponível.
- Selecionar logo/capa e a campanha `OPEN` mais recente.
- Retornar somente campos do DTO público: identidade, descrição pública, meta, captado, progresso e equity.
- Calcular progresso com funções determinísticas.
- Não incluir prazo, preço do token, mínimo, valuation, tokens, equipe, sócios, documentos, founder, banco ou investidores individuais.

### 11.2 Serviço privado

Criar `InvestorStartupDetailService` em módulo de leitura protegido. A consulta deve:

- Buscar startup por ID e exigir campanha `OPEN` para a experiência de oportunidade.
- Se não houver campanha `OPEN`, retornar 404/indisponível conforme a política de rota; não renderizar a startup como oportunidade investível.
- Selecionar a campanha `OPEN` mais recente.
- Agregar contagem de investimentos sem retornar investidores.
- Buscar equipe e sócios autorizados; documentos ficam fora do primeiro escopo e nunca devem aparecer no público.
- Calcular `tokensAvailable` sem permitir valor negativo.
- Retornar `canInvest` e `blockedReason` coerentes com as regras vigentes.

### 11.3 Fonte dos valores

O preço de compra deve ser lido de `Campaign.tokenPrice`, que representa o valor oficial configurado e mantido por Admin/Financeiro. A página pública não recebe esse campo. A página privada o exibe para o investidor, mas o backend valida novamente o valor no `InvestmentsService`; o frontend nunca pode definir ou substituir o preço.

## 12. Plano de arquivos

### Backend

```text
backendnode/src/api/marketplace/
├── marketplace.controller.ts                 # manter listas
├── public-startup-detail.controller.ts       # novo GET público
├── public-startup-detail.service.ts          # nova query pública
├── investor-startup-detail.controller.ts     # novo GET protegido
├── investor-startup-detail.service.ts        # nova query privada
├── dto/public-startup-detail.dto.ts
├── dto/investor-startup-detail.dto.ts
└── *.spec.ts
```

Se a organização do projeto preferir módulo `investor`, mover os arquivos mantendo o contrato e o guard. Não criar migration apenas para esta separação sem identificar campo ausente.

### Frontend

```text
frontend/app/
├── routes/public/startup-public.tsx          # shell público pequeno
├── routes/private/startup-detail.tsx         # shell privado + loader SSR
├── routes/api/marketplace-startups.$slugOrId.ts
├── routes/api/investor-startups.$id.ts
├── components/startup-public/*
├── components/startup-detail/*               # adaptar componentes existentes
├── hooks/use-investor-startup-detail.ts
└── lib/queries.ts                             # chaves/options canônicas
```

## 13. Testes obrigatórios

### Backend unitários

- Resolve por slug e redireciona ID numérico para slug com `301` quando houver slug.
- Retorna 404 para startup inexistente ou campanha diferente de `OPEN` no público.
- Público contém somente identidade, meta, captado, progresso e equity; não contém campos proibidos.
- Privado seleciona campanha `OPEN` correta, equipe/sócios autorizados e preço oficial da campanha.
- Campanha ausente retorna 404/indisponível e não permite investimento.
- `tokensAvailable` nunca fica negativo.
- Agregação de investidores não retorna PII.
- Guard bloqueia endpoint privado sem sessão.

### Frontend unitários

- `PublicStartupDetailDto` renderiza somente blocos públicos.
- CTA gera `/login?redirect=/startups/:id` e `/register?redirect=/startups/:id` com encoding correto.
- Redirect externo é rejeitado.
- Query keys público/privado são distintas e estáveis.
- Modal calcula tokens e mostra mínimo/disponibilidade.
- Estados loading/error/empty e campanha não `OPEN`.

### E2E / Playwright

1. Visitante abre `/s/slug` sem layout privado.
2. Visitante vê conteúdo parcial e não encontra token price/tokens/documentos no HTML.
3. CTA público abre login/cadastro com redirect.
4. Usuário autenticado abre `/startups/:id` com dados SSR e sem request duplicado inicial.
5. Usuário sem autorização é redirecionado server-side.
6. Campanha OPEN permite abrir modal.
7. Campanha diferente de `OPEN` não aparece na rota de oportunidade e retorna estado 404/indisponível; não é apenas um CTA desabilitado.
8. Aporte válido cria investimento e navega ao checkout por `paymentId`.
9. Aporte abaixo do mínimo ou acima da disponibilidade é bloqueado no UX e rejeitado pelo backend quando forçado.
10. Mobile exibe CTA sem quebrar leitura ou esconder conteúdo sob o rodapé fixo.

## 14. Ordem de implementação

1. Aprovar decisões de produto do PRD.
2. Fechar DTOs e política pública/privada com Compliance.
3. Implementar queries/services backend e testes de contrato.
4. Implementar BFFs e registrar rotas.
5. Migrar loaders para SSR + hidratação.
6. Refatorar componentes públicos e privados para payloads reais.
7. Integrar sidebar ao fluxo de investimento existente.
8. Executar testes unitários, typecheck, build e Playwright.
9. Atualizar Swagger e snapshot OpenAPI.
10. Fazer revisão LGPD/segurança e validação visual responsiva.

## 15. Critérios de pronto técnico

- Nenhuma página pública depende do layout autenticado.
- Nenhum BFF de detalhe chama endpoint inexistente ou endpoint CRUD genérico sem contrato.
- Loader privado hidrata o mesmo `queryKey` consumido pelo componente.
- Não há request duplicado inicial de detalhe ou autenticação.
- O DTO público não contém campos privados por seleção e teste automatizado.
- A página privada usa dados reais da startup e da campanha ativa, sem placeholders para seções que o contrato promete.
- O fluxo de investimento continua compatível com `InvestmentsService` e checkout por `paymentId`.
- Swagger, testes e build passam.
- As decisões pendentes do PRD estão registradas antes de qualquer migration ou mudança de regra financeira.


## 16. SPEC do ciclo de vida da ordem e checkout

### 16.1 Ordem canônica

A ordem de investimento deve ser criada pelo fluxo já adotado:

```text
POST /api/investments
  → Investment(PENDING) + Payment(PENDING)
  → TokenReservation(RESERVED)
  → /checkout/payment/:paymentId
```

A criação de `Investment`, `Payment` e `TokenReservation` deve ser uma única transação. A quantidade reservada é `tokensQty`, calculada usando o `Campaign.tokenPrice` oficial. A disponibilidade deve considerar:

```text
tokensAvailable = totalTokens - tokensSold - reservationsAtivas
```

O frontend não pode criar Payment separado para o mesmo investimento nem confiar somente no cálculo client-side.

### 16.2 Estados e transições

> **Nota:** Esta seção expande e complementa `§15. Checkout, confirmação e expiração` do `PRD_STARTUP_PUBLICA_PRIVADA.md`. O PRD §15 define a jornada aprovada e os critérios de aceite (AC-11 a AC-20); esta seção SPEC detalha a implementação técnica das transições, endpoints, e segurança. Juntas formam a especificação canônica do fluxo de ordem.

O schema atual inclui `PaymentStatus.EXPIRED` (decisão aprovada — ver `fluxo_startup.md` §1). A transição de expiração segue:

```text
Investment.PENDING + Payment.PENDING + Reservation.RESERVED
  ├─ pagamento confirmado
  │    └─ Payment.PAID → efeitos → Investment.CONFIRMED
  │                              ├─ Reservation.CONFIRMED
  │                              └─ Token emitido
  ├─ cancelamento explícito
  │    └─ Payment.CANCELED → Investment.CANCELED → Reservation.DISCARDED
  ├─ expiresAt atingido sem pagamento
  │    └─ Payment.EXPIRED → Investment.CANCELED → Reservation.DISCARDED
  └─ pagamento confirmado após polling com reconciliação
       └─ Payment.PAID (confirmado tardiamente) → efeitos aplicados
```

A transição deve ser idempotente e protegida contra corrida entre webhook, polling, cancelamento e cron. Se o gateway indicar pagamento confirmado, o caminho de confirmação vence o caminho de expiração.

O schema inclui `PaymentStatus.EXPIRED` (novo estado, decisão aprovada). A transição `PENDING → EXPIRED` é acionada pelo cron quando `expiresAt <= now`. Registro obrigatório em `AuditLog`.

### 16.3 Endpoints propostos

#### Cancelar ordem pelo investidor

```text
POST /investments/:id/cancel
Auth: AuthGuard
Regra: somente dono do Investment; somente PENDING
Efeito: Payment CANCELED + Investment CANCELED + Reservation DISCARDED
Body opcional: { reason: "USER_ABANDONED" | "CHECKOUT_EXPIRED" }
```

BFF:

```text
POST /api/investments/:id/cancel
```

O endpoint deve ser idempotente: se já estiver `CANCELED`, retornar o estado atual; se estiver `PAID`/`CONFIRMED`, rejeitar cancelamento e nunca desfazer uma compra confirmada por esse endpoint.

#### Confirmação da compra

```text
GET /investments/:id/confirmation
Auth: AuthGuard
Regra: somente dono do Investment
Response: InvestmentConfirmationDto
```

BFF e rota:

```text
GET /api/investments/:id/confirmation
GET /investments/:id/success
```

O endpoint deve retornar somente dados do próprio usuário:

```ts
interface InvestmentConfirmationDto {
  investmentId: number | string;
  paymentId: number | string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "REFUNDED";
  paymentStatus: "PENDING" | "PAID" | "CANCELED" | "REFUNDED";
  effectsApplied: boolean;
  tokenIssuanceStatus: "PENDING" | "COMPLETED" | "FAILED";
  startup: {
    id: number | string;
    name: string;
    slug: string | null;
    logoUrl: string | null;
  };
  campaign: {
    id: number | string;
    title: string;
    status: string;
  };
  amount: number;
  tokenPrice: number;
  tokensQty: number;
  confirmedAt: string | null;
  transparencyUrl: string | null;
}
```

`transparencyUrl` só pode ser preenchida depois que o token estiver confirmado. A resposta nunca deve incluir tokens/hash de outros usuários, PII de investidores ou dados bancários.

### 16.4 Expiração e cron

- `Payment.expiresAt` é a fonte de verdade.
- Criar a ordem com TTL de 24 horas configurável; recomendação inicial: 24h.
- Propagar o mesmo TTL ao PIX/EFI. Não manter 24h no banco e tempo diferente no gateway.
- Criar cron de alta frequência, recomendado a cada minuto, para ordens `PENDING` com `expiresAt <= now`.
- Antes do cancelamento, reconciliar PIX/cartão quando houver identificador de gateway.
- Dentro de transação, reler o Payment/Investment/Reservation e cancelar somente se ainda estiverem pendentes.
- Registrar `AuditLog` com `PAYMENT_EXPIRED`/`INVESTMENT_CANCELED`, `reason`, timestamps e IDs opacos.
- Publicar `payment.cancelled` apenas depois do commit; consumidores devem ser idempotentes.
- A rotina de 24 horas permanece como backstop de limpeza para ordens sem `expiresAt`, desde que não sobrescreva pagamentos confirmados.

### 16.5 Cancelamento por abandono

O frontend deve oferecer:

- botão explícito “Cancelar pagamento e sair”;
- chamada `POST /api/investments/:id/cancel`;
- tentativa best-effort em `pagehide` usando `fetch(..., { keepalive: true, credentials: "include" })`, sem considerar essa chamada garantia de negócio;
- TTL/cron como garantia definitiva.

Não usar `beforeunload` como única proteção. Também não cancelar quando houver somente `visibilitychange` para aba em segundo plano.

### 16.6 Checkout SSR, polling e overlay

O loader de `/checkout/payment/:id` deve:

1. carregar Payment e a ordem vinculada no servidor via BFF com cookie;
2. hidratar uma query `paymentCheckoutQueryOptions(paymentId)`;
3. retornar `expiresAt`, `investmentId`, `startup` e `tokenQty` no payload;
4. redirecionar 401/403 corretamente;
5. não buscar `/api/users/me` novamente — consumir `useUser()`/dados do layout;
6. iniciar polling somente para estados não terminais;
7. considerar terminais `PAID`, `CANCELED`, `REFUNDED` e `EXPIRED` se um estado futuro for aprovado;
8. quando `expiresAt <= now`, exibir overlay com `backdrop-blur`, camada opaca/translúcida e mensagem de expiração;
9. impedir os componentes PIX/cartão de fazer novas chamadas enquanto o overlay estiver ativo;
10. redirecionar para `/investments/:id/success` somente após confirmar `Investment.CONFIRMED` e tokens emitidos.

O overlay deve ser acessível: foco no diálogo, `role="alertdialog"`, título, descrição e botão “Refazer investimento”. A página subjacente permanece visualmente desfocada, mas não deve continuar operável.

### 16.7 Página de sucesso

Criar rota privada shell:

```text
frontend/app/routes/private/investment-success.tsx
```

Registrar:

```ts
route("investments/:id/success", "routes/private/investment-success.tsx")
```

Criar componentes:

```text
frontend/app/components/investment-success/
├── investment-success-card.tsx
├── investment-success-summary.tsx
└── investment-success-actions.tsx
```

A página deve usar loader SSR + `HydrationBoundary` para a primeira leitura. Se `effectsApplied=false`, mostrar estado de processamento e polling moderado; não mostrar “tokens comprados” como definitivo antes de `CONFIRMED`. Depois de confirmado, exibir total de tokens e o botão para a transparência existente:

```text
/founder/startups/:startupId/transparencia
```

A ação deve falhar com estado amigável se o token ainda não estiver disponível, sem tentar burlar o `TokenGateGuard`.

### 16.8 Invalidação TanStack Query

Adicionar chaves em `app/lib/queries.ts`:

```ts
investments: {
  detail: (id: string | number) => ["investments", "detail", String(id)] as const,
  confirmation: (id: string | number) => ["investments", "confirmation", String(id)] as const,
},
checkout: {
  payment: (id: string | number) => ["checkout", "payment", String(id)] as const,
},
```

Após cancelar:

- invalidar checkout/payment;
- invalidar investment/detail e investment/confirmation;
- voltar para `/startups/:id`.

Após confirmação:

- invalidar checkout/payment;
- invalidar investment/confirmation;
- invalidar `/investments` e carteira/token queries;
- não refazer queries de autenticação do layout.

### 16.9 Segurança e auditoria

- Não excluir fisicamente Payment, Investment ou Reservation; usar estados e auditoria.
- O cancelamento deve verificar ownership no backend, não somente no BFF.
- O ID do Payment não autoriza acessar outro investimento.
- Não logar CPF, email, dados de cartão, QR completo ou payload financeiro desnecessário.
- O cron deve usar `userId: null` no AuditLog por ser ação de sistema.
- O webhook, polling, cron e cancel endpoint precisam suportar reentrega idempotente.

### 16.10 Testes específicos

#### Backend

- Criação atômica de Investment + Payment + Reservation.
- Reserva impede oversell concorrente.
- Cancelamento do dono cancela os três registros de forma idempotente.
- Usuário não dono recebe 403.
- Cancelamento não afeta pagamento `PAID`/investimento `CONFIRMED`.
- Cron cancela apenas ordens vencidas e não pagas.
- Cron reconcilia gateway antes de cancelar.
- Pagamento confirmado após polling aplica efeitos uma vez.
- Página de confirmação só libera `transparencyUrl` após token confirmado.
- Retorno não expõe dados de outro investidor.

#### Frontend

- Countdown usa `expiresAt` do servidor.
- Overlay blur bloqueia interação após expiração.
- Botão “Cancelar pagamento e sair” chama o endpoint correto.
- Abandono usa keepalive best-effort, sem depender dele para consistência.
- Estado `PAID` sem efeitos mostra processamento, não sucesso definitivo.
- Página de sucesso mostra startup, valor e quantidade de tokens.
- Botão de transparência aparece somente após confirmação.
- Recarregar a página mantém o estado correto sem criar novo Payment.

#### E2E

1. Investir cria uma única ordem e abre checkout.
2. PIX/cartão aprovado leva à confirmação da compra.
3. Confirmação mostra total de tokens e startup correta.
4. Botão de transparência abre a rota existente e passa pelo gate de token.
5. Cancelamento explícito torna a ordem inutilizável.
6. Ordem expirada exibe blur/overlay e obriga refazer o investimento.
7. Fechar/reabrir o navegador não deixa ordem PENDING indefinidamente.
8. Webhook atrasado não cancela um pagamento que o gateway já confirmou.
9. Usuário A não acessa confirmação, checkout ou transparência vinculados ao usuário B.
