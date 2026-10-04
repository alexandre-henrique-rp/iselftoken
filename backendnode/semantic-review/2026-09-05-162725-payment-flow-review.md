# Correção do fluxo de pagamento EFI + migração de mensageria para RabbitMQ

Unifica os efeitos de domínio de um pagamento confirmado em `processPaymentEffects` (idempotente, transacional por `purpose`), corrige o bug do cartão que não ativava o plano, e migra a entrega assíncrona de webhooks de BullMQ/Redis para RabbitMQ com filas duráveis + DLQ. O caminho normal publica `payment.confirmed` no broker e um consumer aplica os efeitos; um fallback inline cobre o broker indisponível. A sessão Redis passa a ser atualizada in-place (`refreshUserSubscriptions`) em vez de deletada, para o gate de rota liberar o plano sem novo login.

**Watch for:** existe um **buraco de idempotência que causa pago-sem-plano** (confirmado): quando `processWebhookPaymentReceived` marca `PAID` mas falha em publicar E em rodar o fallback (crash entre o `update` e o publish/fallback), qualquer reentrega curto-circuita no `status === 'PAID'` e **nunca reaplica os efeitos** — e não há cron que reconcilie `PAID` sem efeito (o cron só olha `PENDING`). Além disso, o `Nack(true)` sem TTL de backoff gera **requeue em loop apertado** (confirmado), e a race entre `refreshUserSubscriptions` e `updateSession` do AuthGuard pode **reverter a liberação do plano** (provável).

**Verdict**: NEEDS_CHANGES

## High-level view

O ponto central da refatoração — `processPaymentEffects` como fonte única — está correto e as transações com relê-de-status dentro do `$transaction` blindam bem contra dupla-ativação concorrente. O problema não está na duplicação de efeito; está na **garantia de entrega quando o primeiro processamento falha parcialmente**.

O marco `PAID` é gravado *antes* de publicar `payment.confirmed`. A idempotência do webhook é toda ancorada em "se já está PAID, retorna cedo" — mas esse retorno cedo acontece antes de reemitir o evento/fallback. Então "PAID gravado" e "efeitos aplicados" não são o mesmo estado, e nada detecta a diferença. A rede de segurança pensada (fallback inline + reentrega do broker) só funciona quando o publish falha de forma limpa e o processo continua vivo; ela não cobre crash no meio nem a reentrega subsequente.

A topologia RabbitMQ está durável e com DLX corretos, mas falta o mecanismo de backoff: `Nack(true)` devolve a mensagem imediatamente à cabeça da fila, então uma falha transitória (DB momentaneamente fora) vira um hot-loop de reentrega até estourar os 5 attempts e cair na DLQ, sem espaçamento. E a DLQ não tem consumer nem runbook de reprocessamento documentado — mensagem que chega lá é pagamento confirmado sem efeito aplicado, parada.

Na sessão, `refreshUserSubscriptions` preserva TTL e demais campos corretamente, mas faz read-modify-write sem atomicidade contra o `updateSession` do AuthGuard, que reescreve o payload inteiro (incluindo um array de `subscriptions` possivelmente stale) num request concorrente — janela real logo após o pagamento, quando o front faz polling.

<details>
<summary>Issues (9)</summary>

1. **Pago-sem-plano por PAID-sem-efeito (BLOQUEADOR)** — `processWebhookPaymentReceived` marca `PAID` antes de publicar e o short-circuit `status==='PAID'` retorna antes de reemitir/fallback. Se publish e fallback falharem (ou crash no meio), a reentrega nunca reaplica efeitos. Persistir um flag `effectsAppliedAt` e reconciliar por ele, não por `PAID`.
2. **Cron não reconcilia PAID sem efeito (BLOQUEADOR)** — `expirePendingPayments` só varre `status: 'PENDING'`. Nenhuma rede pega um `PAID` cujo efeito nunca rodou. Adicionar varredura de `PAID` + `effectsAppliedAt = null`.
3. **Fallback inline não cobre o cenário que promete (BLOQUEADOR)** — o comentário diz que o inline evita pago-sem-efeito, mas ele só roda se `publish` retornar `false` de forma limpa e o processo sobreviver; crash/erro lançado no publish deixa PAID sem efeito e sem cobertura.
4. **Requeue em hot-loop (RISCO)** — `Nack(true)` em ambos consumers reentrega sem backoff/TTL; falha transitória (DB) vira loop apertado consumindo CPU/broker até esgotar 5 tentativas. Usar fila de retry com `x-message-ttl` + DLX em vez de requeue imediato.
5. **DLQ sem consumer nem runbook (RISCO)** — mensagem na `payments.effects.dlq` = pagamento confirmado sem efeito, parada, sem alarme nem reprocessamento documentado. Adicionar alerta + procedimento de replay.
6. **Race refreshUserSubscriptions × updateSession (RISCO)** — ambos fazem read-modify-write no mesmo `session:*` sem atomicidade; o `updateSession` do AuthGuard pode reescrever com `subscriptions` stale logo após o pagamento, revertendo a liberação do plano. Reprojetar subscriptions no AuthGuard a partir do DB, ou usar WATCH/MULTI/Lua.
7. **`payment.cancelled` só existe no EventEmitter, não no RabbitMQ (RISCO)** — a fila `payments.effects` faz bind em `payment.cancelled`, mas o cron/admin emitem cancelamento apenas via `EventEmitter2` in-process; se o processo cair antes do listener rodar, o cancelamento se perde (sem durabilidade). Confirmar se cancelamento precisa da mesma garantia e, se sim, publicar no broker.
8. **EfiWebhookConsumer audita antes de processar (MELHORIA)** — `logWebhook` grava `EFI_WEBHOOK_RECEIVED` antes do processamento; em reentrega após falha, gera múltiplos logs do mesmo webhook. O `alreadyProcessed` lê `WebhookLog.idempotencyKey`, mas o consumer nunca grava esse `WebhookLog` — só um AuditLog — então a idempotência por chave nunca dispara. Confirmar onde `WebhookLog` é persistido de fato.
9. **`amount` no evento é Decimal serializado (MELHORIA)** — `emitPaymentConfirmed` passa `amount: unknown` (Prisma Decimal); um "gancho futuro" que ler esse campo pega objeto Decimal, não number. Armadilha latente.

</details>

<details>
<summary>Details</summary>

## O buraco de idempotência: `PAID` gravado ≠ efeitos aplicados

Este é o próximo bug de pago-sem-plano, e está no coração exato do que a refatoração tentou blindar. `processWebhookPaymentReceived` (`payment.service.ts:339-400`) executa nesta ordem:

```
1. findUnique(txid)
2. if (status === 'PAID') return  ← short-circuit de idempotência
3. update -> status = PAID, paidAt, endToEndId   (COMMIT)
4. emitPaymentConfirmed (EventEmitter, best-effort)
5. published = await publisher.publishPaymentConfirmed(...)
6. if (!published) await processPaymentEffects(id)   ← fallback inline
```

O marco de idempotência é o passo 2, mas os efeitos de domínio só acontecem nos passos 5→consumer ou 6. Entre o commit do passo 3 e o passo 6 não há nada que garanta que o par (PAID, efeito) seja atômico. Dois cenários deixam `PAID` gravado e efeito nunca aplicado:

- **Crash entre 3 e 5/6.** O processo morre logo após o commit do `PAID`. A EFI reentrega o webhook (via retry HTTP) ou o cron tenta reconciliar. Ambos os caminhos chamam `processWebhookPaymentReceived` de novo → passo 2 vê `PAID` → **retorna sem publicar e sem fallback**. O plano nunca ativa. Dinheiro real cobrado, usuário volta pra /pricing.
- **Publish lança (não retorna `false`).** `publishPaymentConfirmed` engole erros e retorna `false`, então o fallback normalmente cobre. Mas se `amqp.publish` lançar de forma não capturada por um motivo fora do `try` (ou o `await` for interrompido), o passo 6 não roda. Mesmo desfecho.

A raiz é usar `status === 'PAID'` como proxy de "efeitos já aplicados". São estados diferentes. A correção é um marco separado e persistido — por exemplo `Payment.effectsAppliedAt` — gravado *dentro* de `processPaymentEffects`, e o short-circuit passa a ser:

```
if (payment.effectsAppliedAt) return;  // efeitos já aplicados, idempotente
// senão: (re)aplica efeitos, mesmo se já PAID
```

Assim a reentrega de um `PAID`-sem-efeito **reaplica** com segurança (cada efeito já relê seu próprio status na transação). Hoje o `if (status === 'PAID')` do passo 2 é justamente o que *impede* essa recuperação.

## O fallback inline não cobre o cenário que ele promete

O comentário em `payment.service.ts:381-388` afirma que o inline evita pago-sem-efeito. Ele cobre um caso — broker fora, publish retorna `false`, processo vivo. Mas não cobre crash, e não cobre a reentrega subsequente (que morre no short-circuit). A garantia real de "não perder efeito" precisa vir de um marco persistido + reconciliação, não do par publish/fallback.

## A reconciliação (cron) olha o estado errado

`PaymentCronService.expirePendingPayments` (`payment.cron.ts:56-60`) só busca `status: 'PENDING'`. A reconciliação smart via EFI recupera PIX que confirmou no gateway mas cujo webhook se perdeu — mas só age sobre *PENDING*. Um `Payment` que já está `PAID` sem efeito aplicado é **invisível** para o cron: não é PENDING (não entra no `findMany`) e não é candidato a nada. É exatamente o registro deixado pelo buraco acima, e nada o recupera. Uma segunda varredura — `status: 'PAID'` com marco de efeito nulo e `paidAt` mais velho que alguns minutos → `processPaymentEffects(id)` — fecharia o ciclo. Sem marco de efeito persistido, essa varredura nem é possível hoje.

## Duplicação de efeito e atomicidade concorrente

No happy path, publish OK → só o consumer chama `processPaymentEffects`; o inline não roda (`if (!published)`). Não há dupla ativação inline+consumer. Sob execução concorrente (duas entregas simultâneas, ou fallback + reentrega tardia), as transações protegem: `activateSubscriptionForPayment` (`payment.service.ts:610-625`) relê `subscription.status` dentro do `$transaction` e só ativa se `!== 'ACTIVE'`; `confirmInvestment` (`investments.service.ts`) relê `investment.status` dentro do `$transaction`, retorna `false` se já não é `PENDING`, e incrementa `tokensSold` na mesma transação — nunca CONFIRMED sem tokensSold. A janela entre o `findUnique` externo e o relê interno é benigna porque a decisão real é sempre a leitura dentro da transação.

A ressalva fica na emissão de tokens *após* o commit em `confirmInvestment`: se ela falhar, o investimento fica CONFIRMED sem tokens até um reprocesso. `emitTokensForInvestment` é descrito como idempotente e a reentrega da mensagem chama tudo de novo — mas isso só recupera se a mensagem for reentregue. Se o consumer já deu ack (efeito "concluído" do ponto de vista do broker) e a emissão falhou depois, não há reentrega e os tokens ficam pendentes silenciosamente. Vale checar se a emissão de tokens deveria entrar na transação ou ter seu próprio marco de reconciliação.

## Requeue sem backoff vira hot-loop

Ambos os consumers, em falha transitória, retornam `Nack(true)` (`payment-effects.consumer.ts:75`, `efi-webhook.consumer.ts:83`), que recoloca a mensagem na cabeça da fila imediatamente. Se a causa é o DB momentaneamente indisponível, a mensagem é reprocessada em loop apertado — CPU e broker girando — até esgotar `MAX_DELIVERY_ATTEMPTS = 5` em milissegundos e cair na DLQ, muito antes de o DB voltar. O comentário em `messaging.constants.ts:49-52` menciona "backoff via x-message-ttl na fila de retry", mas isso não está implementado: não há fila de retry com TTL na topologia (`messaging.module.ts`), só a DLQ terminal. O padrão correto é `Nack(false)` para uma fila de retry com `x-message-ttl` + DLX de volta à fila principal (dead-letter delay), espaçando as tentativas.

## DLQ é terminal e silenciosa

A topologia (`messaging.module.ts:60-101`) declara DLX + DLQs duráveis e o roteamento (`deadLetterRoutingKey`) casa com o binding das DLQs — mensagem esgotada chega lá em vez de sumir. Mas nada consome as DLQs, não há alerta, e não há runbook de replay. Uma mensagem em `payments.effects.dlq` é um pagamento confirmado cujo efeito falhou 5x: precisa de visibilidade operacional (alarme) e de procedimento de reprocessamento manual documentado. Em dinheiro real, DLQ silenciosa = pago-sem-plano que ninguém vê.

## Contrato de shape: dois canais, dois formatos

O EventEmitter in-process usa shape **aninhado** (`{ paymentId, payment: {...}, reason? }`) e o listener `subscriptions.service.ts` lê `payload.payment` — casa; como o listener virou no-op de notificação, divergência aqui não causaria dano de domínio. O RabbitMQ usa shape **plano** (`PaymentConfirmedMessage`) e o `PaymentEffectsConsumer` lê `msg.paymentId` e relê o Payment do DB — robusto porque não confia no resto do payload.

O risco está em `payment.cancelled`: a fila `payments.effects` faz bind nele (`messaging.module.ts:66`), mas nada publica `payment.cancelled` no broker — o cron e o admin emitem só via EventEmitter. O bind existe mas a mensagem nunca chega por ali; o cancelamento roda in-process, sem durabilidade. Se reverter o plano de quem não pagou tem a mesma criticidade de ativá-lo, merece a mesma garantia de entrega; hoje não tem.

## Sessão: preserva TTL e campos, mas corre com o AuthGuard

`refreshUserSubscriptions` (`session.service.ts:410-447`) está correto no isolado: pula sessões de outro user (`session.id !== userId`), pula as expirando (`ttl <= 0`, não recria sessão de deslogado), sobrescreve só `session.subscriptions` e regrava com o TTL restante, preservando `af2Verified`/`lastAccessAt`/role. Usuário deslogado (sem chave) → nenhuma sessão casa → count 0.

O problema é a concorrência com `updateSession` do AuthGuard (`auth.guard.ts:122-124`), que num request qualquer reescreve o payload **inteiro** de volta no Redis (`updateSession(sessionId, user)`), incluindo o `user.subscriptions` lido no início daquele request — possivelmente **antes** do `refreshUserSubscriptions`. Sequência que reverte o plano:

```
t0  front faz polling do pagamento; AuthGuard lê session (subscriptions = [PENDING])
t1  webhook confirma → refreshUserSubscriptions escreve subscriptions = [ACTIVE]
t2  request do t0 termina; updateSession regrava payload inteiro → subscriptions = [PENDING]
```

Resultado: gate volta a barrar, rebote para /pricing — o exato sintoma que a mudança quer matar, reaparecendo de forma intermitente. Ambos fazem read-modify-write sem atomicidade sobre a mesma chave. Mitigações: no AuthGuard, não persistir `subscriptions` da sessão (reprojetar do DB, ou omitir o campo no `updateSession`), ou serializar o RMW com WATCH/MULTI ou script Lua. A janela é estreita mas real e frequente justamente no pós-pagamento, quando o polling está ativo.

## Boot resiliente do broker tem um ponto cego no cartão

`connectionInitOptions: { wait: false }` (`messaging.module.ts:46`) deixa o app subir com o broker fora, e o `EfiController` responde 503 quando `publish` falha (`efi.controller.ts`), fazendo a EFI reenviar — protege o webhook PIX. O cartão não tem equivalente: `generateCardCheckout` → `processWebhookPaymentReceived` aplica o efeito inline na mesma request, então com broker fora depende inteiramente do fallback inline — e é justamente o caminho onde o crash pós-`PAID` não tem rede de reconciliação.

</details>

<details>
<summary>File map</summary>

- `src/api/payment/payment.service.ts` — `processPaymentEffects` unificado; `processWebhookPaymentReceived` marca PAID + publish + fallback inline (contém o buraco PAID-sem-efeito); emit aninhado; `invalidateUserSession` via `refreshUserSubscriptions`.
- `src/messaging/messaging.module.ts` — topologia RabbitMQ (exchange topic, DLX, filas duráveis). Falta fila de retry com TTL.
- `src/messaging/payment.publisher.ts` — publish persistente, retorna boolean para o fallback.
- `src/messaging/payment-effects.consumer.ts` — consome `payment.confirmed`, ack manual, `Nack(true)` sem backoff, DLQ após 5.
- `src/messaging/efi-webhook.consumer.ts` — consome webhook PIX cru; idempotência via WebhookLog (nunca gravado neste caminho); mesmo padrão de Nack.
- `src/messaging/messaging.constants.ts` — nomes de exchange/filas/routing keys, `MAX_DELIVERY_ATTEMPTS`, shapes das mensagens.
- `src/api/investments/investments.service.ts` — `confirmInvestment` idempotente + `$transaction` (CONFIRMED + tokensSold); tokens após commit.
- `src/api/subscriptions/subscriptions.service.ts` — `handlePaymentConfirmed` virou no-op de notificação; `handlePaymentCancelled` resiliente.
- `src/api/payment/payment.cron.ts` — emite `payment.cancelled` ao expirar; reconciliação só de PENDING (não cobre PAID-sem-efeito).
- `src/auth/session/session.service.ts` — `refreshUserSubscriptions` in-place; corre com `updateSession` do AuthGuard.
- `src/api/payment/efi/efi.controller.ts` — publica webhook no broker; 503 se broker fora.
- `src/api/payment/efi/efi.module.ts` + `payment.module.ts` — remove BullMQ; `forwardRef`; registra consumers.
- `src/common/health.controller.ts` — `/ready` reporta rabbitmq (`@Optional` AmqpConnection).
- deletados: `src/queues/webhook-processor.processor.ts`, `webhook.producer.ts`, `queue.module.ts`.

Diff completo: `git diff main` em `backendnode/`.

</details>
