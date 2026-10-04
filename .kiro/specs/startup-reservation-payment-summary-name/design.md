# startup-reservation-payment-summary-name Bugfix Design

## Overview

O fluxo de criação de startup em `/founder/startups/new` envia o payload validado do wizard para `POST /api/payment/startup-checkout`. O backend NestJS cria, em uma transação, um `Payment` `PENDING` com propósito `TOKEN_RESERVATION` e um `StartupDraft` persistente vinculado ao pagamento. Em seguida, o frontend navega para `/checkout/payment/:id`, cujo loader consulta `GET /api/payment/:id` por meio do BFF.

O defeito ocorre porque a projeção atual de `Payment` retorna o plano de uma assinatura e o investimento, mas não retorna o contexto comercial da reserva nem o nome do draft/startup. Quando o pagamento é `TOKEN_RESERVATION`, `CheckoutPaymentPage` cai nos textos fixos `Token Nexus AI` e `Acesso à inteligência de mercado`, que pertencem a outro produto.

A solução será uma correção de contrato e apresentação, sem alterar o pipeline financeiro. O backend continuará sendo a fonte de verdade para ownership, propósito, estado, valor, expiração, draft e rodada. `GET /payment/:id` passará a produzir uma projeção mínima e sanitizada de contexto de reserva. O BFF preservará a sessão, normalizará somente diferenças de nomes legados e entregará um contrato estável ao loader. O checkout escolherá a apresentação pelo `purpose`: reserva, assinatura e investimento terão contextos distintos.

A correção não cria startup no navegador, não confia em `founderId` enviado no payload, não duplica uma consulta para obter o nome e não altera `Payment`, `StartupDraft`, confirmação, PIX, cartão ou aplicação dos efeitos de domínio.

## Glossário

- **Bug_Condition (C)**: pagamento pertencente ao usuário autenticado, com `purpose = TOKEN_RESERVATION`, cuja origem é um `StartupDraft` ou uma campanha/rodada de startup, mas cuja resposta consumida pelo checkout não contém uma identidade comercial de reserva utilizável ou faz o componente usar fallback de assinatura.
- **Property (P)**: para todo pagamento que satisfaz C, o checkout deve apresentar `Reserva de token — <nome>` quando houver nome elegível, ou um estado neutro de identificação indisponível quando não houver, sem usar os textos de assinatura.
- **Preservation**: para entradas fora de C, especialmente `SUBSCRIPTION` e `INVESTMENT`, o propósito, o contexto comercial, os valores e os efeitos observáveis permanecem iguais.
- **`CreateStartupCheckoutDto`**: DTO de `POST /payment/checkout-draft`; contém `amount`, `method` e o `payload` validado do wizard. O payload não é fonte de autorização.
- **`StartupDraft`**: snapshot JSON persistente do formulário, vinculado 1:1 a `Payment` por `paymentId`, com status `PENDING_PAYMENT`, `PROCESSING`, `PROCESSED` ou `FAILED`.
- **`PaymentPresentation`**: projeção de leitura usada para exibir uma cobrança sem devolver o payload integral do draft.
- **`reservationContext`**: contexto opcional e discriminado para pagamentos `TOKEN_RESERVATION`, com origem, nome comercial, startup/slug quando autorizado e título da campanha/rodada quando existente.
- **Fonte persistida**: nome de `Startup` e dados da `Campaign` obtidos por relações autorizadas já existentes no Prisma.
- **Fonte de draft**: `payload.nomeFantasia` ou `payload.razaoSocial` do `StartupDraft` vinculado ao pagamento, preservado como snapshot do cadastro.
- **Fallback neutro**: apresentação que comunica que a identificação da startup está indisponível, sem inventar uma empresa, plano, campanha ou produto.
- **`F` / `F'`**: `F` é o comportamento atual sem a correção; `F'` é o comportamento após a projeção normalizada e a resolução de apresentação.

## Bug Details

### Bug Condition

A condição é composta: o pagamento precisa ser uma reserva de tokens relacionada ao cadastro de startup ou a uma campanha e a tela não pode obter um nome de reserva seguro. O problema não é a criação da cobrança nem a confirmação do pagamento; é a perda do contexto entre o `StartupDraft`/`Campaign` e o resumo da tela.

**Formal Specification:**

```text
FUNCTION isBugCondition(input)
  INPUT: input containing authenticated viewer, Payment and checkout response
  OUTPUT: boolean

  reservation := input.payment.purpose == TOKEN_RESERVATION
  ownerOrAuthorizedAdmin := input.viewer owns input.payment
                           OR input.viewer has an explicitly authorized admin role
  hasReservationOrigin := input.payment.startupDraft exists
                          OR input.payment.campaignId exists
  usesSubscriptionFallback := input.checkoutTitle == "Token Nexus AI"
                              OR input.checkoutDescription ==
                                 "Acesso à inteligência de mercado"
  missingReservationContext := input.response.reservationContext is absent
                               OR input.response.reservationContext.displayName is absent

  RETURN reservation
         AND ownerOrAuthorizedAdmin
         AND hasReservationOrigin
         AND (usesSubscriptionFallback OR missingReservationContext)
END FUNCTION
```

Na implementação atual, `PaymentService.findOne()` seleciona `subscription`, `investment` e IDs básicos, mas não seleciona `startupDraft` nem uma projeção da startup/rodada. O BFF `payment.$id.ts` apenas normaliza `plan.nome`/`plan.descricao`. `CheckoutPaymentPage` então usa `payment.subscription?.plan?.name ?? "Token Nexus AI"` e `payment.subscription?.plan?.description ?? "Acesso à inteligência de mercado"`, inclusive para uma reserva sem assinatura.

### Rastreamento atual do fluxo

1. `frontend/app/routes.ts` registra `founder/startups/new`, `api/payment/startup-checkout`, `api/payment/:id` e `checkout/payment/:id`.
2. `frontend/app/routes/private/create-startup.tsx` é um shell SSR e renderiza `NewStartupWizard` dentro de `HydrationBoundary`.
3. `frontend/app/components/founder/new-startup-wizard.tsx` valida o formulário, remove campos de upload/UI, higieniza o CNPJ e faz `POST /api/payment/startup-checkout` com `payload`, `amount` e `method`. O navegador só usa o `paymentId` retornado para navegar.
4. `frontend/app/routes/api/payment.startup-checkout.ts` propaga o cookie HTTP-only e encaminha para `POST ${BACKEND_URL}/payment/checkout-draft`; não registra nem devolve o payload integral.
5. `backendnode/src/api/payment/payment.controller.ts` protege `/payment` com `AuthGuard` e chama `PaymentService.createStartupCheckout(dto, req.user.id)`.
6. `backendnode/src/api/payment/payment.service.ts:createStartupCheckout()` valida campos do payload, upload ownership, CNPJ, limites financeiros e duplicidade; dentro de `$transaction`, cria `Payment` `PENDING` e `StartupDraft` `PENDING_PAYMENT` com o mesmo `founderId` de `req.user.id`.
7. O backend retorna apenas `paymentId`, `draftId`, `amount`, `method`, `purpose` e `status`.
8. `frontend/app/routes/private/checkout-payment.tsx:loader()` consulta o BFF por `serverFetch(request, /api/payment/:id)`. Isso preserva a sessão no SSR e evita uma consulta cliente adicional.
9. `frontend/app/routes/api/payment.$id.ts` encaminha o cookie ao backend e normaliza os campos legados do plano. Ele ainda não normaliza um contexto de reserva.
10. `backendnode/src/api/payment/payment.service.ts:findOne()` consulta o pagamento por ID, compara `payment.userId` com `req.user.id` e retorna o shape atual. O relacionamento `Payment.startupDraft` e o caminho `Payment.campaign.startup` existem no schema, mas não fazem parte do `select` atual.
11. `CheckoutPaymentPage` exibe o resumo e delega PIX/cartão aos componentes existentes. A confirmação continua sendo tratada por `PixPayment`, `CreditCardForm`, polling e `PaymentService.processPaymentEffects()`.
12. Na confirmação `TOKEN_RESERVATION`, `processTokenReservationPayment()` procura o draft por `paymentId`, cria a startup a partir do snapshot e marca o draft como `PROCESSED`. Esta lógica não deve ser modificada pelo bugfix.

### Exemplos

- **Cadastro com nome fantasia**: `StartupDraft.payload = { nomeFantasia: "Acme Saúde", razaoSocial: "Acme Saúde Tecnologia Ltda", ... }`, `Payment.purpose = TOKEN_RESERVATION`, status `PENDING`. Resultado atual: `Token Nexus AI`. Resultado esperado: `Reserva de token — Acme Saúde`, com a descrição de reserva e sem dados do payload.
- **Cadastro sem nome fantasia utilizável**: `nomeFantasia = "   "` e `razaoSocial = "Acme Saúde Tecnologia Ltda"`. O backend não deve aceitar a inconsistência no fluxo normal, mas a leitura deve ser resiliente. Resultado esperado: `Reserva de token — Acme Saúde Tecnologia Ltda`.
- **Reserva legada com campanha**: `Payment.campaignId = 42`, `Campaign.title = "Rodada Seed 2026"`, `Campaign.startup.nome = "Acme Saúde"`. Resultado esperado: nome da startup persistida como identidade principal e `Rodada: Rodada Seed 2026` como contexto secundário.
- **Draft processado**: `StartupDraft.status = PROCESSED`, `Payment.effectsAppliedAt` preenchido e `Payment` ainda consultado pelo dono. O snapshot de nome continua disponível para leitura do resumo; o checkout não deve exigir um novo pagamento nem consultar por nome/CNPJ.
- **Nenhum nome elegível**: draft sem strings utilizáveis e sem startup/campanha relacionada. Resultado esperado: `Reserva de token` + `Identificação da startup indisponível`; nunca `Token Nexus AI` ou `Acesso à inteligência de mercado`.
- **Assinatura**: `Payment.purpose = SUBSCRIPTION` com `subscription.plan.nome = "Fundador"` e descrição válida. Resultado esperado: o nome e a descrição do plano continuam iguais ao comportamento atual.
- **Investimento**: `Payment.purpose = INVESTMENT` com campanha e startup autorizadas. Resultado esperado: continua sendo apresentado como investimento, sem tentar ler `StartupDraft` e sem reclassificar como reserva.
- **Acesso cruzado**: usuário B solicita `/api/payment/:id` de pagamento pertencente ao usuário A. Resultado esperado: `404` neutro, sem revelar se o pagamento existe, seu propósito, nome, campanha ou status.

## Expected Behavior

### Fonte de verdade e precedência

A resolução deve distinguir identidade comercial da rodada. `Campaign.title` nunca substitui o nome da startup.

Para `TOKEN_RESERVATION`, a precedência é:

1. **Startup persistida relacionada à campanha**: `Campaign.startup.nome`; se vazio, `Campaign.startup.razao_social`.
2. **Snapshot do draft**: `StartupDraft.payload.nomeFantasia`, após `trim`; se vazio, `StartupDraft.payload.razaoSocial`, após `trim`.
3. **Fallback neutro**: nenhum nome artificial. A UI usa `Identificação da startup indisponível`.

A fonte deve ser explicitada no contexto (`PERSISTED_STARTUP`, `DRAFT_PAYLOAD` ou `NONE`) para testes e observabilidade funcional, mas não para expor detalhes internos. Quando houver campanha, seu título deve ser retornado em campo separado como `campaign.title`; não deve participar da escolha de `displayName`.

Para o fluxo novo, o `StartupDraft.payload` é o snapshot canônico enquanto a startup ainda não existe. Depois de `PROCESSED`, o snapshot permanece associado ao `Payment` e continua sendo uma fonte de leitura válida. O backend não deve tentar localizar uma startup por nome, CNPJ ou fundador para reconstruir a relação, pois isso é ambíguo e pode vazar dados. A fonte persistida só é usada quando há relação explícita, hoje `Payment.campaignId -> Campaign.startup`.

### Contrato normalizado

O endpoint `GET /payment/:id` continuará devolvendo o envelope `ResponseDto` existente e preservará os campos atuais. A projeção adicionará um contexto opcional estável, sem payload integral:

```text
PaymentSummary
  id: number
  amount: number
  method: "PIX" | "CREDIT_CARD"
  purpose: PaymentPurpose
  status: PaymentStatus
  txid: string | null
  qrCodeBase64: string | null
  copyPastePix: string | null
  paidAt: string | null
  expiresAt: string | null
  effectsAppliedAt: string | null
  investmentId: number | null
  subscription: SubscriptionSummary | null
  investment: InvestmentSummary | null
  reservationContext: ReservationContext | null

ReservationContext
  kind: "STARTUP_RESERVATION"
  displayName: string | null
  nameSource: "PERSISTED_STARTUP" | "DRAFT_PAYLOAD" | "NONE"
  startup: {
    slug: string | null
    displayName: string | null
  } | null
  campaign: {
    title: string | null
  } | null
```

Regras do contrato:

- `reservationContext` só é preenchido para `purpose = TOKEN_RESERVATION`; para outros propósitos deve ser `null`.
- Objetos ausentes são `null`, não formas diferentes de `undefined`, para que o BFF e o frontend tenham comportamento previsível.
- `displayName` é texto comercial sanitizado e limitado ao tamanho já permitido pelo domínio; não inclui CNPJ, email, telefone, dados bancários ou payload arbitrário.
- `startup.slug` é opcional e só é incluído quando a relação persistida estiver autorizada. Não introduzir `startup.id` interno no novo contexto.
- `campaign.title` é opcional e só é incluído quando existir a relação `campaignId`; não expor snapshots financeiros, investimento individual ou documentos.
- Assinatura continua com `subscription.plan.nome`/`descricao` no backend e `plan.name`/`description` normalizados no BFF para compatibilidade com o componente atual.
- O backend é a fonte de `purpose`, amount, status, ownership e relações; o frontend não pode substituir o nome recebido por um valor do histórico local, query string ou estado do wizard.

### Função de apresentação esperada

```text
FUNCTION expectedBehavior(payment)
  IF payment.purpose == TOKEN_RESERVATION THEN
    name := payment.reservationContext?.displayName
    title := "Reserva de token"
    IF name is non-empty THEN title := title + " — " + name
    description := "Taxa para iniciar o cadastro e a análise da startup."
    round := payment.reservationContext?.campaign?.title
    RETURN { title, description, round, neutral: name is empty }
  END IF

  IF payment.purpose == SUBSCRIPTION THEN
    RETURN subscriptionPlanPresentation(payment.subscription)
  END IF

  IF payment.purpose == INVESTMENT THEN
    RETURN investmentPresentation(payment.investment)
  END IF

  RETURN purposeFallbackPresentation(payment.purpose)
END FUNCTION
```

### Preservation Requirements

**Unchanged Behaviors:**

- A criação do `Payment` e do `StartupDraft` continua atômica, idempotente em relação a drafts pendentes e associada ao usuário da sessão, nunca a um `founderId` recebido pelo cliente.
- `amount`, `method`, `purpose`, `status`, `expiresAt`, `txid`, QR Code, copia-e-cola, polling PIX, pagamento por cartão e redirecionamento de sucesso permanecem inalterados.
- `SUBSCRIPTION` continua exibindo o plano real (`nome`, `descricao`, `slug`, período quando usado), inclusive a regra de isenção de KYC do plano afiliado.
- `INVESTMENT` continua exibindo o contexto de campanha/startup permitido e não depende de `StartupDraft`.
- `PaymentService.processPaymentEffects()` continua sendo a fonte única e idempotente dos efeitos: ativar assinatura, confirmar investimento/emissão de tokens e processar a reserva.
- O BFF continua propagando somente o cookie de sessão ao backend, sem armazenar token em localStorage e sem logar payload.
- O loader SSR de `checkout-payment.tsx` continua usando o BFF local e a resposta inicial continua sendo carregada no servidor, sem `fetch` adicional em `useEffect` para obter o nome.
- Consultas de pagamento de outro usuário continuam indistinguíveis de pagamento inexistente para o cliente. Roles administrativos só podem usar uma autorização explícita e recebem a mesma projeção mínima.

**Escopo:**

Entradas fora de `TOKEN_RESERVATION` originado do cadastro de startup devem permanecer funcionalmente equivalentes. A mudança de apresentação se restringe ao resumo da reserva e aos novos campos opcionais do contrato; não altera o schema de cobrança, os gateways, o ledger, a aplicação de cupons ou o fluxo de confirmação.

## Hypothesized Root Cause

1. **Projeção incompleta no `PaymentService.findOne()`**: o `select` atual inclui `subscription` e `investment`, mas não inclui `startupDraft` nem `campaign.startup`, embora as relações existam no Prisma.
   - `Payment.startupDraft` é a correlação explícita para o fluxo novo.
   - `Payment.campaign` é a correlação explícita para reservas legadas ou de rodada existente.

2. **Contrato orientado a assinatura**: `PaymentSummary` foi modelado em torno de `subscription.plan` e do investimento. Não há união discriminada por `purpose` nem `reservationContext`.

3. **Fallback incorreto na UI**: `CheckoutPaymentPage` usa textos de produto como fallback para qualquer pagamento sem plano. Isso mascara a ausência de dados e associa uma reserva a um produto não relacionado.

4. **Normalização limitada no BFF**: `payment.$id.ts` corrige somente `plan.nome` → `plan.name` e `plan.descricao` → `plan.description`; não existe normalização de reserva, `null` estável ou distinção de contexto.

5. **Ausência de correlação direta Payment → Startup no fluxo novo**: a criação ocorre antes da startup persistida. O schema já garante a correlação Payment → StartupDraft, portanto não é seguro tentar inferir uma startup por CNPJ/nome. O draft deve continuar sendo a fonte snapshot até existir relação persistida explícita via campanha.

6. **Risco de regressão por mistura de propósitos**: uma correção que simplesmente troque os textos fixos por `startupDraft.payload.nomeFantasia` para todos os pagamentos pode vazar dados de draft ou alterar assinaturas/investimentos. A resolução precisa ser condicionada a `purpose` e a uma projeção autorizada.

## Correctness Properties

Property 1: Bug Condition - Contexto comercial da reserva no resumo

_For any_ pagamento autenticado que satisfaça `isBugCondition(input)`, a função corrigida SHALL retornar um `reservationContext` normalizado e o checkout SHALL exibir `Reserva de token — <displayName>` quando `displayName` for elegível, ou `Reserva de token` com `Identificação da startup indisponível` quando não for, nunca exibindo `Token Nexus AI` nem `Acesso à inteligência de mercado`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - Propósitos não afetados e efeitos de pagamento

_For any_ pagamento que não satisfaça `isBugCondition(input)`, a função corrigida SHALL preservar o mesmo propósito, valor, método, status, expiração, autorização, contexto de assinatura/investimento e efeitos observáveis de `F`, incluindo PIX, cartão, polling, confirmação idempotente e redirecionamento.

**Validates: Requirements 2.6, 2.9, 3.1, 3.2, 3.3, 3.5, 3.7**

Property 3: Preservation - Ownership e minimização de dados

_For any_ combinação de `paymentId` e usuário que não seja o proprietário nem um papel administrativo explicitamente autorizado, `F'` SHALL retornar o mesmo erro neutro de recurso inexistente/não autorizado e não SHALL retornar nome, draft, startup, campanha, CPF, email, telefone, CNPJ, banco ou payload.

**Validates: Requirements 2.7, 3.4**

Property 4: Contrato estável e resolução de precedência

_For any_ reserva autorizada, `F'` SHALL escolher `Campaign.startup.nome`, depois `Campaign.startup.razao_social`, depois `StartupDraft.payload.nomeFantasia`, depois `StartupDraft.payload.razaoSocial`, sempre após trim e somente dentro da relação explícita do pagamento; `campaign.title` SHALL permanecer separado do `displayName`, e campos não disponíveis SHALL ser `null`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.7**

## Fix Implementation

### Changes Required

#### 1. Backend — projeção autorizada do pagamento

**Arquivos:**

- `backendnode/src/api/payment/payment.controller.ts`
- `backendnode/src/api/payment/payment.service.ts`
- Opcionalmente criar um tipo/mapper co-local em `backendnode/src/api/payment/` para a projeção de leitura.

**Função:** `PaymentService.findOne(id, userId, role?)`.

**Mudanças:**

1. Manter `AuthGuard`, receber a identidade da sessão e manter o lookup por `Payment.id`.
2. Preservar o filtro de ownership. Se o produto exigir leitura administrativa, fazê-la somente por papel explícito (`ADMIN`, `FINANCEIRO` ou outro guard já aprovado), nunca por parâmetro do frontend; caso contrário, manter owner-only para o checkout.
3. Expandir o `select` mínimo somente para:
   - `startupDraft.status` e `startupDraft.payload` internamente no service, lendo apenas `nomeFantasia` e `razaoSocial` para a resposta;
   - `campaign.title`, `campaign.startup.nome`, `campaign.startup.razao_social` e `campaign.startup.slug` quando `campaignId` existir;
   - campos de pagamento e relações atuais já consumidos pelo checkout.
4. Não retornar `StartupDraft.payload` integral. O mapper deve construir `reservationContext` e descartar os demais campos.
5. Retornar `reservationContext = null` para `SUBSCRIPTION`, `INVESTMENT` e demais propósitos.
6. Para `TOKEN_RESERVATION`, aplicar a precedência documentada, normalizar whitespace e limitar strings antes de serializar.
7. Não modificar `createStartupCheckout()`, `processTokenReservationPayment()` ou `effectsAppliedAt`, salvo para reutilizar tipos/mapper sem mudar seus efeitos.

#### 2. Backend — DTO/documentação do contrato

**Arquivos:**

- `backendnode/src/api/payment/dto/create-startup-checkout.dto.ts` — permanece responsável apenas pelo POST de criação; não adicionar nome de apresentação como autoridade do cliente.
- `backendnode/src/api/payment/payment.controller.ts` — atualizar `ApiOperation`/resposta documentada se houver DTO de resposta.
- Criar, se necessário, `backendnode/src/api/payment/entities/payment-summary.entity.ts` ou tipo equivalente somente para documentar o response DTO; não duplicar regras em múltiplos mappers.

O `CreateStartupCheckoutDto.payload` continua aceitando os campos do wizard porque o draft precisa do snapshot completo, mas a resposta GET usa a projeção normalizada. O cliente nunca poderá enviar `displayName`, `startupId`, `campaignId` ou `founderId` para escolher a identidade apresentada.

#### 3. BFF — normalização sem waterfall

**Arquivo:** `frontend/app/routes/api/payment.$id.ts`.

**Mudanças:**

1. Preservar método GET, `BACKEND_URL`, cookie forwarding, status HTTP e envelope do backend.
2. Normalizar somente aliases legados do plano e o novo `reservationContext`, garantindo `null` estável quando ausente.
3. Não buscar `StartupDraft`, startup ou campanha em endpoint separado.
4. Não inserir nome vindo da URL, estado de navegação ou payload local; o BFF apenas adapta a resposta autorizada do backend.
5. Não registrar no log body, payload, CNPJ ou dados de pagamento.

A rota já está registrada como `payment/:id` antes das rotas de pagamento derivadas em `frontend/app/routes.ts`; nenhuma nova rota é necessária.

#### 4. Frontend — tipo e resolução de apresentação

**Arquivos:**

- `frontend/app/routes/private/checkout-payment.tsx` — atualizar `PaymentSummary` e substituir a escolha direta de textos por uma função de apresentação por propósito.
- Preferencialmente criar `frontend/app/lib/payment-presentation.ts` para `getPaymentPresentation(payment)`, mantendo a route abaixo do limite de responsabilidade visual e permitindo testes unitários puros.
- Se a equipe preferir manter o tipo local, a interface deve refletir exatamente o contrato normalizado e não adicionar campos que o backend não retorna.

**Mudanças:**

1. Adicionar `reservationContext` nullable e seus tipos discriminados.
2. Para `TOKEN_RESERVATION`, renderizar `Reserva de token` e o nome retornado, com linha opcional `Rodada: <campaign.title>`.
3. Para reserva sem nome, renderizar `Identificação da startup indisponível`; remover os dois fallbacks de assinatura desse ramo.
4. Para `SUBSCRIPTION`, manter `plan.name`, `plan.description` e o slug usados pelo fluxo atual.
5. Para `INVESTMENT`, manter uma apresentação específica de investimento e os dados autorizados existentes.
6. Não criar estado local para nome, não gerar nome no browser e não refazer GET após hidratação. O loader atual já faz a chamada server-first ao BFF.
7. Manter os componentes `PixPayment` e `CreditCardForm` recebendo somente `paymentId`, valor e callbacks atuais.

#### 5. Schema e migração

**Decisão:** não criar migration nesta correção.

O schema ativo `backendnode/prisma/schema.sqlite.prisma` já possui a correlação necessária:

- `Payment.startupDraft StartupDraft?`;
- `StartupDraft.paymentId Int @unique`;
- `StartupDraft.payload Json`;
- `Payment.campaignId` → `Campaign`;
- `Campaign.startup` → `Startup`.

O snapshot do draft permanece disponível depois de `PROCESSED`, e a campanha persistida pode fornecer a startup quando há `campaignId`. Portanto, adicionar `startupId` em `Payment` ou duplicar nome em uma nova coluna aumentaria o risco e exigiria migration SQLite sem necessidade para o bug atual.

Se uma evolução futura exigir correlação direta de todo pagamento de reserva com uma startup persistida sem campanha, ela deve ser uma decisão separada: migration em `prisma/migrations-sqlite/`, backfill auditável e novo campo público/opaque ID. Esse trabalho não faz parte desta correção e não deve ser simulado no frontend.

#### 6. Compatibilidade e não regressão

- Não alterar `PaymentPurpose`, `PaymentStatus`, `PaymentMethod`, `StartupDraftStatus` ou relações existentes.
- Não alterar cálculo da taxa de reserva, cupom, expiração ou método de pagamento.
- Não alterar o pipeline RabbitMQ/EFI, `processPaymentEffects`, reconciliação, DLQ ou atualização de sessão.
- Preservar o shape legado de `subscription.plan` no backend e os aliases esperados pela tela.
- Não tratar `TOKEN_RESERVATION` como `SUBSCRIPTION` só porque a reserva não tem plano.

## Testing Strategy

### Validation Approach

A estratégia segue duas fases: primeiro reproduzir o defeito com uma resposta sem contexto de reserva; depois validar a projeção corrigida, a precedência de nomes e a preservação dos outros propósitos. Os testes não devem alterar schema nem depender de um gateway financeiro real.

### Exploratory Bug Condition Checking

**Goal:** reproduzir o comportamento em código não corrigido antes da implementação, confirmando que o problema é a ausência do contexto e o fallback fixo, não a criação do pagamento.

**Test Plan:**

1. Criar um usuário founder e um `Payment` `TOKEN_RESERVATION` com `StartupDraft` `PENDING_PAYMENT` contendo nome fantasia.
2. Consultar `GET /payment/:id` e registrar que o response atual não possui `reservationContext`.
3. Renderizar/carregar `/checkout/payment/:id` e observar os textos `Token Nexus AI` e `Acesso à inteligência de mercado`.
4. Repetir com campanha legada, draft processado e nome fantasia vazio para separar as causas.

**Test Cases:**

1. **Draft com nome fantasia**: deve falhar no código não corrigido por não exibir o nome comercial.
2. **Draft com fallback para razão social**: deve falhar ou não possuir representação explícita.
3. **Campanha persistida**: deve falhar por não retornar `Campaign.startup`/`Campaign.title` no select.
4. **Reserva sem identidade**: deve demonstrar que o fallback atual é indevidamente um produto de assinatura.
5. **Assinatura válida**: deve passar no código não corrigido e servir de baseline de preservação.
6. **Acesso cruzado**: deve continuar negado e não pode ser “corrigido” com remoção do filtro de usuário.

**Expected Counterexamples:**

- Ausência de nome/contexto na resposta de `GET /payment/:id`.
- Título e descrição de assinatura usados para uma cobrança `TOKEN_RESERVATION`.
- Nenhum campo do payload integral deve aparecer na resposta, mesmo durante a exploração.

### Fix Checking

**Goal:** provar que todo input que satisfaz C recebe o contexto correto ou o fallback neutro.

**Pseudocode:**

```text
FOR ALL input WHERE isBugCondition(input) DO
  response := paymentService.findOne_authorized(input.paymentId, input.viewer)
  presentation := getPaymentPresentation(response.data)

  ASSERT response.data.purpose == TOKEN_RESERVATION
  ASSERT presentation.title startsWith "Reserva de token"
  ASSERT presentation.title != "Token Nexus AI"
  ASSERT presentation.description != "Acesso à inteligência de mercado"

  IF eligiblePersistedNameExists(input) THEN
    ASSERT response.data.reservationContext.nameSource == "PERSISTED_STARTUP"
  ELSE IF eligibleDraftNameExists(input) THEN
    ASSERT response.data.reservationContext.nameSource == "DRAFT_PAYLOAD"
  ELSE
    ASSERT presentation.neutral == true
  END IF
END FOR
```

### Unit Tests

- `PaymentService.findOne()` retorna `reservationContext` com `Campaign.startup.nome`.
- Fallback de startup persistida de `nome` para `razao_social`.
- Fallback do draft de `nomeFantasia` para `razaoSocial` após `trim`.
- `Campaign.title` é retornado separado e nunca usado como nome da startup.
- Draft `PENDING_PAYMENT`, `PROCESSING`, `PROCESSED` e `FAILED` não expõe payload integral.
- Reserva sem nome retorna `displayName: null`, `nameSource: NONE` e não aciona fallback de assinatura.
- Função `getPaymentPresentation()` produz o título/descrição corretos para reserva com e sem nome.
- `SUBSCRIPTION` continua usando o plano e `INVESTMENT` continua usando a campanha.

### Property-Based Tests

- Gerar combinações de strings vazias, whitespace e nomes válidos para `nomeFantasia`, `razaoSocial`, `Startup.nome` e `Startup.razao_social`; verificar a precedência e que strings só de whitespace nunca são exibidas.
- Gerar cada `PaymentPurpose` e verificar que `reservationContext` só aparece para `TOKEN_RESERVATION`.
- Gerar estados de draft e combinações de campanha/draft; verificar que a resolução nunca consulta por nome/CNPJ fora das relações explícitas e nunca retorna payload extra.
- Gerar usuários proprietários, não proprietários e roles administrativas; verificar que o contrato é retornado somente para owner ou autorização administrativa explícita.
- Verificar a propriedade de preservação: para assinaturas e investimentos, a saída da apresentação corrigida mantém os campos observáveis da apresentação original.

### Preservation Checking

**Goal:** verificar que F' não altera comportamentos para `NOT isBugCondition(input)`.

**Pseudocode:**

```text
FOR ALL input WHERE NOT isBugCondition(input) DO
  original := observe(F(input))
  fixed := observe(F_prime(input))

  ASSERT fixed.purpose == original.purpose
  ASSERT fixed.amount == original.amount
  ASSERT fixed.method == original.method
  ASSERT fixed.status == original.status
  ASSERT fixed.authorization == original.authorization
  ASSERT paymentEffects(fixed) == paymentEffects(original)

  IF input.purpose == SUBSCRIPTION THEN
    ASSERT fixed.subscriptionPresentation == original.subscriptionPresentation
  END IF

  IF input.purpose == INVESTMENT THEN
    ASSERT fixed.investmentPresentation == original.investmentPresentation
  END IF
END FOR
```

**Preservation Test Cases:**

1. **Assinatura com plano**: nome, descrição, slug, KYC exemption e redirecionamento permanecem.
2. **Investimento com campanha**: startup/campanha autorizada permanece, sem leitura de draft.
3. **PIX**: geração do QR, `qrCodeBase64`, `copyPastePix`, polling e atualização de status permanecem.
4. **Cartão**: tokenização/checkout EFI, aprovação/recusa e revalidação permanecem.
5. **Expiração/cancelamento**: overlay, cancelamento best-effort, reserva liberada e botão para refazer permanecem.
6. **Pagamento próprio vs cruzado**: owner continua autorizado; outro usuário recebe erro neutro.
7. **SSR/hidratação**: loader consulta uma vez o BFF local; não há fetch cliente adicional para o nome.
8. **Cupons**: valor retornado pelo backend e bloqueio após `txid` permanecem sem alteração.

### Integration Tests

Backend NestJS/Prisma:

- Subir banco SQLite de teste, criar founder, draft e payment em `$transaction`, chamar `GET /payment/:id` e validar o contrato normalizado.
- Validar a seleção de startup/campanha em pagamento legado com `campaignId`.
- Validar `404` para `paymentId` de outro usuário e ausência de campos sensíveis no JSON.
- Confirmar que `processPaymentEffects()` ainda processa o draft, cria a startup, marca `PROCESSED` e preenche `effectsAppliedAt`; a leitura do resumo não deve mudar esses efeitos.
- Confirmar que assinaturas e investimentos continuam com seus campos e relações atuais.

BFF:

- Testar `frontend/app/routes/api/payment.$id.ts` com cookie forwarding, status upstream, aliases de plano e `reservationContext` nullable.
- Garantir que nenhuma chamada adicional a startup/draft é feita pelo BFF.
- Garantir que resposta de erro upstream não é convertida em sucesso nem perde o status HTTP.

Frontend:

- Testar a função de apresentação com todos os propósitos e os quatro níveis de fallback.
- Renderizar o resumo com `TOKEN_RESERVATION` e verificar nome, campanha opcional e estado neutro.
- Verificar que os textos antigos de assinatura não aparecem em qualquer reserva.

### E2E Tests

Adicionar ou estender o fluxo em `frontend/test/e2e/flows/founder-dashboard-integration.spec.ts` ou criar um fluxo dedicado de checkout de reserva:

1. Criar/autenticar founder via helpers existentes.
2. Navegar para `/founder/startups/new`.
3. Preencher `nomeFantasia`, `razaoSocial`, CNPJ e campos mínimos do wizard.
4. Submeter `Cadastrar e Pagar Reserva`.
5. Aguardar `/checkout/payment/:id`.
6. Verificar `Reserva de token — <nomeFantasia>` e que o texto de assinatura não existe.
7. Verificar uma variação sem nome fantasia utilizável e confirmar razão social.
8. Verificar uma reserva sem identidade por fixture e confirmar o fallback neutro.
9. Confirmar que o método PIX/cartão e a área de pagamento continuam disponíveis.
10. Em ambiente dev/mock, simular pagamento e verificar que a confirmação/redirecionamento continuam funcionando sem regressão.

O E2E deve incluir um caso de acesso cruzado por request context separado, verificando status 404. Dados de teste devem usar nomes fictícios, nunca CPF, email ou CNPJ real. Não é necessário iniciar servidor em modo watch; os comandos de validação devem usar execução única (`vitest --run`, `jest --runInBand` ou configuração Playwright existente).

### Critérios de saída

- Todos os testes de unidade do `PaymentService`, mapper de apresentação e BFF passam.
- Testes de integração comprovam owner/role, minimização de dados e compatibilidade de `SUBSCRIPTION`/`INVESTMENT`.
- E2E comprova o fluxo real do wizard até o resumo da reserva.
- Nenhuma migration ou alteração de schema é criada nesta implementação.
- O diff de implementação, quando a próxima fase for autorizada, não deve conter logs de payload, dados pessoais ou fetch adicional para o nome.
