# Plano — Rastreabilidade financeira, cupom integral e parcelamento

**Status:** Decisões de negócio aprovadas; implementação incremental em andamento  
**Data:** 2026-09-13  
**Escopo:** `Payment`, `Coupon`, `CouponUsage`, checkout, emissão EFI, configuração de parcelamento, contratos de API e documentação.

## Objetivo

Garantir que cada ordem com cupom possua uma trilha financeira estável e auditável, contendo cupom, valor bruto, desconto, principal após o desconto, juros quando aplicáveis e total efetivamente cobrado do cliente.

`Payment.amount` será o total final cobrado. O catálogo de cupons é preservado por inativação, e fatos financeiros nunca são reescritos a partir de campos mutáveis do catálogo.

## Decisões de negócio aprovadas

| Tema | Decisão |
| --- | --- |
| Subsídio do desconto | O desconto é absorvido pela plataforma. Em investimentos, tokens, valor bruto do investimento, captação da campanha, comissão de afiliado, NF e repasse da startup permanecem baseados no valor bruto; o desconto é um subsídio auditável da plataforma. |
| Cupom de 100% | A ordem é liquidada internamente como `PAID`, sem PIX, cartão, `txid`, `endToEndId` ou chamada à EFI, somente quando o cupom persistido é de 100%, o valor original é positivo, o total canônico é zero e a ordem não expirou. O cliente é enviado para uma tela de sucesso com retorno à Home. |
| Consumo do cupom | Um cupom só integra `usedCount` após a confirmação do `Payment`. Antes disso é uma reserva; expiração ou cancelamento pendente libera a capacidade novamente. |
| Parcelamento | A configuração administrativa determina máximo de parcelas, juros e parcela mínima. Quando houver cupom e cartão parcelado, os juros incidem sobre o principal já descontado. |
| Histórico do catálogo | Cupons com histórico são somente inativados. Não há exclusão física que destrua ou altere a trilha de uso. |

## Estado atual e lacunas

| Requisito | Estado atual | Lacuna |
| --- | --- | --- |
| Valor líquido no gateway | `CouponService.apply()` atualiza `Payment.amount`; PIX/cartão o relêem após lock de emissão | Correto para desconto parcial único, mas não há snapshot tipado completo nem regra de um cupom por ordem. |
| Cupom integral | Um cupom de 100% deixa `Payment.amount = 0`, mas a ordem segue `PENDING` | PIX/cartão ainda poderiam chamar a EFI com valor zero; os efeitos de domínio não são disparados. |
| Uso do cupom | `CouponUsage` e `Coupon.usedCount` são gravados no momento da aplicação | Uma ordem pendente, cancelada ou expirada já consome o cupom. |
| Histórico financeiro | `CouponUsage` guarda bruto, desconto e líquido; `serviceDetails` contém dados parciais | `GET /payment/:id` não devolve um snapshot estruturado e o JSON não é uma fonte imutável adequada. |
| Limite por ordem | A chave atual é `(couponId, paymentId)` | É possível aplicar cupons diferentes sucessivamente à mesma ordem. |
| Parcelamento | `InstallmentConfig` existe no backend | Checkout ativo usa opções fixas, não aplica juros/configuração vigente e a área administrativa ainda não a gerencia. |

## Invariantes finais

1. Uma ordem aceita zero ou um cupom.
2. A aplicação reserva o cupom; somente a transição canônica para `PAID` o resgata e contabiliza.
3. `originalAmount - discountAmount = discountedPrincipalAmount`, com duas casas e `ROUND_HALF_EVEN`.
4. Em PIX e cartão à vista, `Payment.amount = discountedPrincipalAmount`.
5. Em cartão parcelado com juros, os juros incidem sobre `discountedPrincipalAmount`; `Payment.amount = chargedAmount = discountedPrincipalAmount + interestAmount` e o snapshot preserva cada parcela.
6. Para cupom de 100%, `discountedPrincipalAmount = 0`, a ordem é `PAID` sem EFI e os efeitos de domínio são aplicados por `paymentId`.
7. Uma ordem pendente cancelada ou expirada libera somente uma reserva ainda não resgatada. Uma ordem `PAID` nunca devolve uso do cupom automaticamente.
8. Inativar um cupom bloqueia novas reservas, mas nunca invalida uma reserva válida já congelada nem apaga histórico.
9. Nenhuma rota genérica pode alterar valores, snapshot ou status de uma ordem emitida, paga, cancelada ou estornada.

## Arquitetura de dados recomendada

A evolução completa requer aprovação e migration SQLite. O desenho recomendado separa fato financeiro, reserva e histórico:

### `Payment`

- `amount`: total final cobrado ao cliente;
- `originalAmount`, `discountAmount`, `discountedPrincipalAmount`;
- `interestAmount`, `chargedAmount` e snapshot de parcelamento quando houver cartão parcelado;
- relação singular opcional com a aplicação de cupom.

### `PaymentCouponApplication` (nova tabela recomendada)

- `paymentId` único;
- `couponId`, `userId`;
- snapshots imutáveis de código, percentual e valores;
- `status`: `RESERVED`, `REDEEMED` ou `RELEASED`;
- `reservedAt`, `redeemedAt`, `releasedAt` e motivo de liberação.

### `Coupon`

- `usedCount`: apenas resgates confirmados;
- `reservedCount`: capacidade temporariamente bloqueada para garantir o limite sob concorrência;
- inativação lógica como única forma de exclusão administrativa com histórico.

### `CouponUsage`

Permanece como ledger histórico de usos confirmados, preservando usuário, ordem, bruto, desconto, líquido e snapshots necessários. Não é apagado em cancelamento; uma reserva não resgatada é registrada na aplicação, não como uso confirmado.

A duplicação é deliberada: `Payment` responde à leitura financeira da ordem, a aplicação registra o ciclo de vida da reserva e `CouponUsage` registra o uso confirmado para auditoria.

## Implementação incremental

### Fase A — Correção imediata: cupom de 100% sem EFI

1. Ao aplicar um cupom persistido de 100% sobre uma ordem com valor original positivo, ainda `PENDING` e não expirada, calcular total canônico zero e transicionar `Payment` condicionalmente para `PAID` na mesma unidade de trabalho que registra o desconto.
2. Não criar `txid`, `endToEndId`, QR Code, cobrança de cartão ou chamada à EFI.
3. Gravar `paidAt`, origem interna de liquidação por cupom e `AuditLog` específico.
4. Após o commit, disparar o pipeline idempotente de efeitos pelo `paymentId`; uma falha deixa `PAID + effectsAppliedAt = null` para reconciliação existente.
5. Bloquear defensivamente emissão PIX/cartão para valores menores ou iguais a zero.
6. Retornar ao frontend um resultado explícito de conclusão por cupom integral.
7. Criar rota de sucesso autenticada, com estado de processamento dos efeitos, estado de erro/retry e CTA para a Home. A rota nunca confia em query params para autorizar a confirmação.

> Esta fase não cria schema novo. Para o cupom integral, a confirmação e o uso são atômicos, portanto o consumo ocorre somente em uma ordem `PAID`.

### Fase B — Reserva, resgate e liberação para todos os cupons

1. Criar o schema de aplicação/reserva e migration manual que preserve dados, FKs e índices existentes.
2. Antes da migration, inventariar pagamentos com mais de um `CouponUsage`, divergência entre `Payment.amount` e `CouponUsage.finalAmount`, e registros sem vínculo de ordem.
3. Fazer backup testado e backfill somente de casos não ambíguos; composições históricas de cupom exigem resolução humana, nunca escolha automática.
4. Em aplicação parcial, validar `usedCount + reservedCount < maxUses`, criar reserva única e atualizar o valor líquido por CAS.
5. Na confirmação, converter `RESERVED -> REDEEMED`, reduzir `reservedCount`, incrementar `usedCount` uma única vez e criar/confirmar `CouponUsage` na mesma transação.
6. No cancelamento ou expiração, converter `RESERVED -> RELEASED` e reduzir `reservedCount` uma única vez.
7. Centralizar confirmação e cancelamento por `paymentId`, eliminando caminhos que fazem leitura seguida de atualização incondicional.

> Esta fase requer aprovação explícita para schema, migration e backfill de dados financeiros.

### Fase C — Parcelamento e configuração administrativa

1. Integrar `InstallmentConfig` à emissão efetiva de cartão, não apenas ao fluxo legado de pré-cotação.
2. Fazer o backend calcular opções elegíveis, aplicar máximo configurado e parcela mínima, calcular juros compostos sobre o principal já descontado e persistir o snapshot antes de chamar a EFI.
3. Criar BFFs e uma seção especializada em `/admin/config` para `ADMIN` e `FINANCEIRO` gerenciarem taxa mensal, máximo de parcelas, parcela mínima e histórico de vigências.
4. Remover opções fixas e rótulos de “sem juros” do frontend; a UI consome exclusivamente valores e parcelas retornados pelo backend.
5. Expor no checkout a decomposição: valor original, desconto, principal após desconto, juros, número/valor das parcelas e total final.

### Fase D — Contratos, proteção e efeitos financeiros

1. `GET /payment/:id` deve expor `coupon: null | { code, percent, originalAmount, discountAmount, discountedPrincipalAmount, interestAmount, finalAmount, status, appliedAt }`.
2. Restringir `PATCH /payment/:id` para impedir alteração financeira de ordens protegidas.
3. Registrar o subsídio da plataforma de maneira consultável, sem reduzir o valor econômico da campanha, tokens, comissões ou repasses.
4. Atualizar listagens administrativas e histórico de cupom para consumir o snapshot estruturado, não `serviceDetails`.

## Corridas e idempotência obrigatórias

- Aplicar cupom × emissão PIX/cartão: CAS exige `PENDING`, ausência de identificadores EFI e lock livre; quem vencer bloqueia o outro.
- Cupom integral × cron/admin/webhook: apenas o vencedor de `PENDING -> PAID` ou `PENDING -> CANCELED` pode resgatar/liberar a reserva.
- Dois cupons para a mesma ordem: unicidade física por `paymentId` na aplicação.
- Última vaga de cupom limitado: capacidade controlada por `usedCount + reservedCount` de modo condicional/atômico.
- Reentrega RabbitMQ, cron ou refresh: resgate/liberação são transições condicionais e idempotentes.
- Inativação após reserva: não invalida um snapshot/reserva já aceita.

## Testes e critérios de aceite

1. Cupom de 100% confirma `Payment` sem chamar adaptadores EFI, preserva campos EFI nulos, dispara efeitos uma única vez e mostra a tela de sucesso após refresh.
2. Desconto parcial reserva o cupom sem incrementar uso; confirmação resgata uma única vez; cancelamento/expiração libera uma única vez.
3. Segundo cupom na mesma ordem é rejeitado sem alterar valores.
4. Limite de uso não é ultrapassado sob concorrência.
5. PIX/cartão recebem exatamente o total final canônico e recusam total zero.
6. Parcelamento usa a configuração vigente, calcula juros sobre o principal já descontado e mantém a mesma quantia no snapshot, na UI e na EFI.
7. `/admin/config` permite a administração auditável da configuração de parcelamento com autorização backend.
8. A migration preserva histórico e bloqueia registros ambíguos para revisão humana.
9. Captação, comissão e repasse permanecem baseados no bruto por se tratar de subsídio explícito da plataforma.

## Fora de escopo da Fase A

- Migration de reserva e backfill de dados existentes;
- gestão visual completa de parcelamento em `/admin/config`;
- integração do cálculo de juros ao checkout de cartão;
- liberação automática de lock EFI após timeout ambíguo.
