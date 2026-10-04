# Implementation Plan

## Contexto e ordem de execução

Este plano implementa o bugfix descrito em `bugfix.md` e `design.md` usando a metodologia de condição de bug. A ordem é obrigatória: observar/reproduzir no código sem correção, registrar o comportamento não afetado, implementar a projeção e a apresentação, reexecutar as mesmas propriedades e fechar com a validação completa.

**Condição de bug (`C(X)`)**: pagamento autorizado com `purpose = TOKEN_RESERVATION`, originado por `StartupDraft` ou por relação explícita com `Campaign`, cuja resposta não possui identidade comercial de reserva utilizável ou cuja tela usa os fallbacks de assinatura.

**Comportamento esperado (`P`)**: apresentar `Reserva de token — <nome>` usando a precedência documentada; quando não houver nome elegível, apresentar `Reserva de token` com identificação indisponível, nunca `Token Nexus AI` ou `Acesso à inteligência de mercado`.

**Preservação (`¬C(X)`)**: manter propósito, ownership, valores, método, status, expiração, efeitos de pagamento, apresentação de assinatura/investimento, SSR/BFF e proteção LGPD para entradas fora da condição de bug.

**Dependências globais**:
- Ler as seções `Bug Condition`, `Expected Behavior`, `Preservation Requirements`, `Correctness Properties` e `Testing Strategy` de `design.md` antes de executar cada grupo.
- Não criar migration nem alterar `Payment`, `StartupDraft`, `Campaign` ou qualquer enum/schema: o schema SQLite já contém as relações necessárias.
- Não iniciar servidores em modo watch. Para E2E, usar os serviços locais já iniciados pelo ambiente ou solicitar que sejam iniciados manualmente.
- Não adicionar dependências externas.

---

- [ ] 1. Escrever teste exploratório da condição de bug antes da correção
  - **Property 1: Bug Condition** - Contexto comercial ausente em reserva de token
  - **CRITICAL**: escrever e executar este teste contra o código não corrigido; a falha é esperada e confirma o defeito.
  - **DO NOT** corrigir o teste ou o código quando ele falhar nesta etapa.
  - **GOAL**: obter contraexemplos concretos e distinguir perda de contexto do PaymentService/BFF do fallback incorreto da UI.
  - **Scoped PBT Approach**: usar fixtures determinísticas e, onde houver suporte, gerar combinações de nomes vazios, somente whitespace e nomes válidos; manter pelo menos os casos reproduzíveis de cadastro com `nomeFantasia`, fallback para `razaoSocial`, campanha persistida, draft processado e ausência total de identidade.
  - Exercitar `PaymentService.findOne()` com pagamento próprio `TOKEN_RESERVATION` e `StartupDraft.payload` contendo `nomeFantasia: "Acme Saúde"`; registrar que o retorno atual não possui `reservationContext` e que o resumo cai em `Token Nexus AI`/`Acesso à inteligência de mercado`.
  - Repetir com `nomeFantasia` vazio/whitespace e `razaoSocial` válida; o teste deve documentar a ausência da representação esperada no código não corrigido.
  - Repetir com relação explícita `Payment.campaign -> Campaign.startup` e `Campaign.title`; registrar que o select atual não fornece o contexto completo de startup/rodada para o contrato do checkout.
  - Repetir com `StartupDraft.status = PROCESSED` para confirmar que o snapshot de leitura deve permanecer disponível e que a confirmação/efeitos não são a causa do bug.
  - Incluir um caso sem nome elegível para demonstrar que o fallback atual é indevidamente um produto de assinatura.
  - Verificar que a resposta exploratória não deve ser usada para justificar o retorno do payload integral: CPF, email, telefone, CNPJ, dados bancários e campos arbitrários do draft continuam proibidos.
  - Documentar no teste ou no relatório de execução os contraexemplos encontrados, por exemplo: `TOKEN_RESERVATION + nomeFantasia "Acme Saúde"` sem `reservationContext`, título `Token Nexus AI` e descrição `Acesso à inteligência de mercado`.
  - **EXPECTED OUTCOME**: falha no código não corrigido, sem remover os testes; após a implementação, o mesmo teste será reexecutado e deverá passar.
  - **Arquivos-alvo**: `backendnode/src/api/payment/payment.service.spec.ts`; teste de apresentação a ser criado em `frontend/app/lib/payment-presentation.test.ts` (ou caminho co-local equivalente); fixtures de integração somente se já houver infraestrutura compatível.
  - _Bug_Condition: `purpose === TOKEN_RESERVATION` AND owner/authorized viewer AND (`startupDraft` exists OR `campaignId` exists) AND (reservationContext ausente/não utilizável OR fallbacks de assinatura usados)._ 
  - _Expected_Behavior: contrato com `reservationContext` sanitizado e apresentação de reserva ou fallback neutro, sem os dois textos de assinatura._
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 2. Escrever testes de preservação antes da implementação
  - **Property 2: Preservation** - Propósitos não afetados e efeitos observáveis
  - **IMPORTANT**: seguir observação-first: executar primeiro contra o código não corrigido e registrar as saídas reais antes de fixar as asserções.
  - Observar e capturar uma assinatura `SUBSCRIPTION` com plano válido (`nome`, `descricao`, `slug`, `periodoMeses`) e confirmar a apresentação atual.
  - Observar e capturar um `INVESTMENT` com campanha/startup autorizada e confirmar que ele não depende de `StartupDraft` nem deve ser reclassificado como reserva.
  - Observar pagamentos sem contexto comercial específico e registrar somente o fallback genérico de propósito que já seja permitido para o caso, sem assumir novos textos.
  - Verificar que owner continua autorizado, usuário não proprietário continua recebendo erro neutro `404` e que trocar o `id` na URL não revela propósito, status, startup, campanha ou dados pessoais.
  - Verificar que o wizard continua enviando `amount`, `method` e payload validado ao endpoint de checkout e que o navegador não gera `founderId`, nome, status ou identidade artificialmente.
  - Registrar que o loader SSR consulta o BFF local uma vez, que a sessão é encaminhada e que não há consulta independente posterior para startup/draft.
  - Preservar geração/consulta de PIX, cartão, polling, expiração, confirmação idempotente, redirecionamento e `effectsAppliedAt` como comportamento fora da condição de bug.
  - **PBT recomendado**: gerar propósitos `SUBSCRIPTION`, `INVESTMENT` e outros não-reserva, com dados opcionais de plano/campanha, e verificar que a função de apresentação mantém o ramo correspondente; gerar combinações de status de draft apenas em reservas para assegurar que a leitura não altera efeitos.
  - **EXPECTED OUTCOME**: os testes de preservação passam no código não corrigido e devem continuar passando após a correção.
  - **Arquivos-alvo**: `backendnode/src/api/payment/payment.service.spec.ts`; testes de `frontend/app/lib/payment-presentation.test.ts`; testes de BFF/integral existentes ou novos co-located conforme a configuração Vitest.
  - _Non-Bug Condition: `NOT isBugCondition(input)`, especialmente `SUBSCRIPTION` com plano válido, `INVESTMENT` com campanha autorizada e consultas owner/cross-owner conforme o contrato existente._
  - _Preservation: manter purpose, amount, method, status, expiresAt, txid, QR/copia-e-cola, autorização, efeitos e apresentações específicas sem waterfall adicional._
  - _Requirements: 2.6, 2.9, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 3. Implementar a correção de identificação do resumo de reserva
  - **Dependências**: tarefas 1 e 2 concluídas; contraexemplos e comportamento baseline documentados. Nenhuma migration/schema é necessária.
  - **Critério do parent task**: o contrato de leitura está documentado e implementado de ponta a ponta; reservas usam somente contexto autorizado; assinaturas/investimentos e o pipeline financeiro permanecem equivalentes.

  - [ ] 3.1 Inspecionar e congelar o contrato normalizado de `PaymentSummary`
    - Consolidar no design/implementação os campos atuais consumidos pelo checkout e adicionar `reservationContext: ReservationContext | null` com `null` estável quando ausente.
    - Definir `ReservationContext` como discriminado por `kind: "STARTUP_RESERVATION"`, com `displayName`, `nameSource`, `startup` (`slug`, `displayName`) e `campaign` (`title`), sem `startup.id` interno e sem payload integral.
    - Manter `purpose`, `amount`, `method`, `status`, `txid`, QR, expiração, `effectsAppliedAt`, `investment` e `subscription` no contrato existente.
    - Documentar/atualizar Swagger somente se houver DTO de resposta explícito, sem aceitar `displayName`, `startupId`, `campaignId` ou `founderId` enviados pelo cliente.
    - Confirmar que nenhum campo novo exige alteração de schema ou geração de migration.
    - _Contract: `reservationContext` é `null` para `SUBSCRIPTION`, `INVESTMENT` e demais propósitos; para reserva, campos indisponíveis são `null`._
    - _Requirements: 2.1, 2.4, 2.7, 2.8, 2.9_

  - [ ] 3.2 Implementar mapper/projeção autorizada em `PaymentService.findOne`
    - **Arquivos-alvo**: `backendnode/src/api/payment/payment.service.ts`; opcionalmente um mapper/tipo co-local em `backendnode/src/api/payment/` e `backendnode/src/api/payment/payment.controller.ts` para documentação.
    - Preservar `AuthGuard`, a assinatura do controller e o filtro owner `payment.userId === req.user.id`; qualquer leitura administrativa deve continuar dependendo de autorização explícita já aprovada, nunca de parâmetro do frontend.
    - Expandir o `select` mínimo somente para `startupDraft.status`, `startupDraft.payload` internamente, `campaign.title`, `campaign.startup.nome`, `campaign.startup.razao_social` e `campaign.startup.slug`, além dos campos/relations já consumidos.
    - Para `TOKEN_RESERVATION`, resolver precedência após `trim`: startup persistida relacionada à campanha (`nome`, depois `razao_social`), depois `StartupDraft.payload.nomeFantasia`, depois `StartupDraft.payload.razaoSocial`, e finalmente `displayName: null`/`nameSource: "NONE"`.
    - Manter `campaign.title` separado de `displayName`; nunca usar o título da rodada como nome da startup.
    - Sanitizar e limitar os textos comerciais conforme os limites já permitidos pelo domínio; não serializar payload integral, CNPJ, CPF, email, telefone, dados bancários, documentos, IDs internos adicionais ou dados de auditoria.
    - Retornar `reservationContext: null` fora de `TOKEN_RESERVATION` e manter as relações de subscription/investment sem reinterpretá-las.
    - Não alterar `createStartupCheckout`, `processTokenReservationPayment`, `processPaymentEffects`, expiração, confirmação, PIX, cartão ou `effectsAppliedAt`.
    - _Bug_Condition: pagamento autenticado `TOKEN_RESERVATION` com `StartupDraft`/`Campaign` relacionado e contexto perdido no response atual._
    - _Expected_Behavior: projeção autorizada fornece nome persistido, snapshot do draft ou `null`, com rodada separada e sem PII._
    - _Preservation: ownership, status HTTP neutro para acesso cruzado, efeitos e campos financeiros permanecem inalterados._
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7, 2.9, 3.4_

  - [ ] 3.3 Atualizar testes unitários do backend e cobertura de precedência/minimização
    - **Arquivos-alvo**: `backendnode/src/api/payment/payment.service.spec.ts`; novo spec co-local do mapper se ele for extraído.
    - Cobrir `nomeFantasia`, fallback para `razaoSocial`, nomes persistidos da campanha, fallback persistido `nome` → `razao_social`, campanha sem nome, draft `PENDING_PAYMENT`/`PROCESSING`/`PROCESSED`/`FAILED` e ausência total de identidade.
    - Assegurar que `nameSource` seja `PERSISTED_STARTUP`, `DRAFT_PAYLOAD` ou `NONE` de forma determinística e que `campaign.title` não influencie o `displayName`.
    - Assegurar que `SUBSCRIPTION` e `INVESTMENT` mantenham os dados anteriores e que `reservationContext` seja `null` fora de reserva.
    - Cobrir owner autorizado, usuário diferente e role administrativa somente se a autorização explícita já existir no controller/service; não abrir nova permissão no bugfix.
    - Usar mocks Prisma que demonstrem o `select` mínimo e as relações explícitas, sem consultar startup por nome, CNPJ ou fundador.
    - Verificar ausência de CPF, email, telefone, CNPJ, dados bancários, documentos e payload extra em `JSON.stringify(response)`.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7, 2.8, 3.1, 3.2, 3.4_

  - [ ] 3.4 Normalizar o contrato no BFF sem waterfall
    - **Arquivo-alvo**: `frontend/app/routes/api/payment.$id.ts`; atualizar `frontend/app/routes.ts` somente se a implementação revelar que o registro atual estiver ausente/incorreto.
    - Preservar `GET`, `BACKEND_URL`, encaminhamento do cookie HTTP-only, status HTTP e envelope `ResponseDto` do backend.
    - Normalizar aliases legados `plan.nome`/`plan.descricao` para `plan.name`/`plan.description` sem quebrar `slug` ou demais dados do plano.
    - Normalizar `reservationContext` para shape estável, usando `null` quando o backend não enviar o campo; não construir nome a partir de URL, estado local, payload do wizard ou histórico.
    - Não fazer chamada adicional para startup, draft ou campanha; não registrar body, payload, CNPJ, dados de pagamento ou PII.
    - Criar/atualizar teste do BFF com resposta de sucesso, erro upstream, cookie forwarding, aliases do plano, contexto de reserva completo e contexto ausente.
    - _Requirements: 2.4, 2.7, 3.3, 3.4, 3.6, 3.7_

  - [ ] 3.5 Criar tipo e função pura de apresentação no frontend
    - **Arquivos-alvo**: preferencialmente criar `frontend/app/lib/payment-presentation.ts` e teste co-local; atualizar `frontend/app/routes/private/checkout-payment.tsx` apenas para consumir o tipo/função.
    - Modelar `PaymentSummary` e `ReservationContext` exatamente conforme o contrato BFF; não inventar campos que o backend não retorna.
    - Implementar `getPaymentPresentation(payment)` com ramos explícitos para `TOKEN_RESERVATION`, `SUBSCRIPTION`, `INVESTMENT` e fallback genérico permitido para outros propósitos.
    - Para reserva, retornar título `Reserva de token` com ` — <displayName>` apenas para nome não vazio; retornar descrição `Taxa para iniciar o cadastro e a análise da startup.` e, quando disponível, linha separada `Rodada: <campaign.title>`.
    - Para reserva sem nome, retornar estado neutro `Identificação da startup indisponível`; nunca selecionar os fallbacks de assinatura.
    - Para assinatura, preservar `plan.name`, `plan.description`, `slug` e período usados pelo checkout atual.
    - Para investimento, preservar a apresentação e o contexto de campanha/startup já permitido, sem ler `StartupDraft`.
    - Manter `amount`, cupom, método, PIX, cartão, polling, redirecionamentos e callbacks atuais fora da função de apresentação.
    - _Expected_Behavior: `TOKEN_RESERVATION` nunca exibe `Token Nexus AI` nem `Acesso à inteligência de mercado`; os demais propósitos permanecem discriminados._
    - _Requirements: 2.2, 2.3, 2.5, 2.6, 2.8, 3.1, 3.2, 3.3_

  - [ ] 3.6 Remover os fallbacks incorretos do resumo e preservar SSR
    - **Arquivo-alvo**: `frontend/app/routes/private/checkout-payment.tsx` e, se necessário pela convenção de shell, componente de checkout em `frontend/app/components/checkout/`.
    - Substituir o acesso direto `payment.subscription?.plan?.name ?? "Token Nexus AI"` e a descrição correspondente por `getPaymentPresentation(payment)`.
    - Renderizar contexto de rodada somente quando `reservationContext.campaign.title` estiver disponível; não inventar rodada para draft pendente.
    - Renderizar a identificação neutra para reserva sem nome e garantir por teste que os dois textos antigos não aparecem em nenhum ramo de `TOKEN_RESERVATION`.
    - Manter o loader `serverFetch(request, /api/payment/:id)`, o carregamento server-first e a ausência de `fetch` adicional em `useEffect` para startup/draft.
    - Revisar estados Loading/Empty/Error/Data afetados sem introduzir requisição duplicada ou estado local para o nome.
    - Conferir responsividade do resumo em mobile, tablet e desktop se o markup for alterado; não mudar o design system fora do necessário.
    - _Requirements: 2.2, 2.3, 2.5, 2.6, 3.1, 3.2, 3.6, 3.7_

  - [ ] 3.7 Implementar testes unitários/property-based da apresentação
    - **Arquivos-alvo**: `frontend/app/lib/payment-presentation.test.ts` (ou spec co-local equivalente) e tipos associados.
    - Testar precedência com strings vazias/whitespace: startup persistida `nome`, persistida `razao_social`, draft `nomeFantasia`, draft `razaoSocial`, e `NONE`.
    - Testar que `campaign.title` é secundário, que strings somente whitespace nunca são exibidas e que campos ausentes se comportam como `null`.
    - Testar cada propósito e a propriedade de que `reservationContext` não afeta assinaturas/investimentos.
    - Se o setup Vitest suportar uma biblioteca de geração já instalada, usar property-based testing sem adicionar dependência; caso contrário, usar tabela abrangente de exemplos determinísticos e registrar a limitação.
    - _Requirements: 2.2, 2.3, 2.5, 2.6, 2.8, 3.1, 3.2, 3.3_

  - [ ] 3.8 Criar integração API/BFF para ownership e LGPD
    - **Arquivos-alvo**: `backendnode/test/e2e/flows/founder-dashboard-integration.e2e-spec.ts` ou novo fluxo co-local dedicado; testes do BFF no diretório de testes frontend conforme configuração existente.
    - Criar founder, `Payment TOKEN_RESERVATION` e `StartupDraft` em transação/fixture; consultar `GET /payment/:id` pelo proprietário e validar o contrato normalizado.
    - Cobrir reserva com campanha/startup persistida, draft pendente, draft processado, razão social como fallback e ausência de identidade.
    - Consultar o mesmo payment com outro usuário e validar `404` neutro, sem revelar existência, propósito, nome, campanha, status ou payload.
    - Validar que apenas campos comerciais mínimos aparecem e que CPF, email, telefone, CNPJ completo, dados bancários, documentos e payload integral não aparecem.
    - Validar no BFF cookie forwarding, status upstream, envelope e ausência de chamada secundária; usar mocks/spies em vez de gateway financeiro real.
    - Confirmar que a leitura não executa efeitos de domínio nem altera `status`, `paidAt`, `effectsAppliedAt` ou o estado do draft.
    - _Requirements: 2.4, 2.7, 2.8, 2.9, 3.4, 3.7_

  - [ ] 3.9 Criar/estender E2E do fluxo completo founder → checkout
    - **Arquivos-alvo**: `frontend/test/e2e/flows/founder-dashboard-integration.spec.ts` ou novo spec dedicado; helpers em `frontend/test/e2e/flows/setup/test-helpers.ts` somente se necessário.
    - Reutilizar o setup de founder/admin existente e navegar por interação real para `/founder/startups/new` (não apenas inserir estado no navegador).
    - Preencher `nomeFantasia`, `razaoSocial`, CNPJ fictício e campos mínimos; submeter `Cadastrar e Pagar Reserva`; aguardar `/checkout/payment/:id`.
    - Verificar `Reserva de token — <nomeFantasia>`, a descrição de reserva e a ausência de `Token Nexus AI`/`Acesso à inteligência de mercado`.
    - Adicionar variação sem nome fantasia utilizável para validar `razaoSocial` e, se fixture suportar, reserva sem identidade para validar o fallback neutro.
    - Confirmar que PIX/cartão e valor continuam presentes, sem efetuar gateway real; se houver simulação dev aprovada, verificar que confirmação/redirecionamento continuam funcionando.
    - Verificar que o fluxo não dispara uma consulta adicional independente para buscar o nome após a hidratação SSR, usando interceptação de requests quando for estável no ambiente.
    - Usar apenas dados fictícios e limpar recursos criados ao final.
    - _Requirements: 2.2, 2.3, 2.5, 2.8, 2.9, 3.5, 3.6, 3.7_

  - [ ] 3.10 Verificar a mesma exploração como comportamento esperado
    - **Property 1: Expected Behavior** - Reserva exibe contexto comercial ou fallback neutro
    - **IMPORTANT**: reexecutar exatamente o teste da tarefa 1; não escrever uma nova versão da propriedade.
    - Para todo caso com nome persistido elegível, confirmar `reservationContext.nameSource = PERSISTED_STARTUP` e `Reserva de token — <nome>`.
    - Para draft sem nome fantasia utilizável e com razão social válida, confirmar `nameSource = DRAFT_PAYLOAD` e uso da razão social.
    - Para ausência total de nome, confirmar `displayName: null`/`nameSource: NONE`, título `Reserva de token` e identificação indisponível.
    - Confirmar que `campaign.title` aparece apenas como rodada e nunca substitui o nome da startup.
    - Confirmar que os dois textos de assinatura não aparecem em qualquer reserva.
    - **EXPECTED OUTCOME**: propriedade passa após a implementação, cobrindo todos os inputs de `C(X)`.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.11 Verificar os mesmos testes de preservação
    - **Property 2: Preservation** - Assinatura, investimento, autorização e efeitos permanecem
    - **IMPORTANT**: reexecutar exatamente os testes da tarefa 2; não escrever testes substitutos.
    - Confirmar que subscription continua mostrando plano real, investment continua mostrando campanha/startup autorizada e fallback genérico permitido não muda fora da condição.
    - Confirmar que amount, method, purpose, status, expiração, PIX, cartão, polling, confirmação idempotente, redirecionamentos e efeitos permanecem.
    - Confirmar que owner continua autorizado, acesso cruzado continua neutro e nenhuma PII/payload é adicionada à resposta.
    - Confirmar que o wizard e o loader SSR continuam com o mesmo contrato operacional e sem waterfall.
    - **EXPECTED OUTCOME**: testes passam após a implementação, sem regressão observável.
    - _Requirements: 2.6, 2.7, 2.9, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ] 3.12 Avaliar atualização de `CASE.md` condicionalmente
    - Revisar as regras descobertas durante a implementação contra `CASE.md`, especialmente `[Pagamento] — Reserva de Tokens e Checkout` e `[Autenticação] — Login e Sessão`.
    - Se não houver regra de negócio nova — situação esperada, pois o design apenas explicita uma projeção já suportada pelas relações existentes — não alterar `CASE.md`.
    - Se surgir uma regra nova, atualizar somente a seção de domínio apropriada nos blocos Geral/Backend/Frontend, sem registrar detalhes de implementação transitórios ou PII.
    - Registrar no resultado da tarefa se `CASE.md` permaneceu inalterado ou qual regra nova foi adicionada.
    - _Requirements: 2.7, 2.9, 3.4_

- [ ] 4. Checkpoint de validação completa
  - **Dependências**: todas as tarefas 1–3 concluídas e nenhuma falha aberta.
  - Backend unitário: executar `pnpm test -- --runInBand` em `backendnode` e, quando aplicável, testes focados do `PaymentService`.
  - Backend build/type safety: executar `pnpm run build` em `backendnode`.
  - Backend integração/E2E: executar `pnpm run test:e2e:flows` com SQLite de teste/fixtures isoladas; não usar gateway financeiro real.
  - Frontend unitário: executar `pnpm run test` em `frontend` (Vitest em modo `--run`).
  - Frontend typecheck: executar `pnpm run typecheck` em `frontend`.
  - Frontend build: executar `pnpm run build` em `frontend`.
  - Frontend E2E: executar `pnpm run test:e2e:playwright` com backend/frontend já iniciados manualmente e filtros do fluxo quando necessário; usar o comando de execução única, nunca modo watch/UI para a validação final.
  - Confirmar que não existem mudanças em schema/migrations, dependências novas, logs de payload/PII, chamadas diretas ao backend a partir do frontend ou fetch adicional para nome.
  - Confirmar critérios de saída do design: contrato mínimo, ownership/LGPD, precedência, ausência dos fallbacks de assinatura em reserva, preservação de subscription/investment e fluxo E2E completo.
  - **EXPECTED OUTCOME**: todos os testes, typecheck e builds passam; se qualquer validação falhar, corrigir a causa e repetir somente a validação afetada antes de concluir.
  - _Requirements: 2.1, 2.4, 2.7, 2.8, 2.9, 3.1, 3.2, 3.4, 3.6, 3.7_

## Critérios de conclusão

- A resposta autorizada de `GET /payment/:id` diferencia `TOKEN_RESERVATION` dos demais propósitos e contém apenas a projeção comercial mínima.
- A precedência é persistida → draft (`nomeFantasia` → `razaoSocial`) → fallback neutro, sempre após `trim`; campanha/rodada permanece separada.
- `Token Nexus AI` e `Acesso à inteligência de mercado` não aparecem em nenhum resumo de reserva, inclusive quando não há nome.
- `SUBSCRIPTION`, `INVESTMENT`, ownership, LGPD, SSR/BFF, PIX, cartão, polling, expiração, confirmação e efeitos de domínio permanecem preservados.
- Existem testes exploratórios e de preservação escritos antes da implementação, reexecutados após o fix, além de testes unitários, property-based quando suportado, integração API/BFF, ownership/LGPD e E2E do wizard até o checkout.
- `pnpm run test`, `pnpm run typecheck`, `pnpm run build` e os comandos backend/E2E apropriados passam em execução única.
- `CASE.md` só é modificado se uma regra de negócio nova for realmente descoberta; caso contrário, permanece inalterado.
