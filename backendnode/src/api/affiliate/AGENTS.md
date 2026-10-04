# Affiliate

**Propósito:** Programa de afiliados. Startups aderem ao programa (aprovado pela iSelfToken), usuários se candidatam a afiliado de uma startup, e sobre cada venda de token atribuída a um afiliado a startup paga **duas** comissões — uma ao afiliado e outra à iSelfToken — ambas descontadas do repasse.

## Funil de três etapas

O ponto que mais confunde: aprovar não é um ato único. São três decisões de atores diferentes, e cada endpoint só aceita a transição da sua etapa.

1. **Adesão da startup** — o fundador solicita (`AffiliateProgram` nasce `PENDING`); a admin da iSelfToken aprova e **fixa os percentuais definitivos**, podendo sobrepor os sugeridos pelo fundador.
2. **Candidatura** — usuário elegível se candidata (`Affiliation` nasce `PENDING_FOUNDER`); o fundador tria. Aprovar aqui **não ativa** o afiliado, apenas encaminha para `PENDING_ADMIN`.
3. **Aval final** — a admin aprova, gravando `tokensAllocated` e gerando o `purchaseLinkUrl` com o código do afiliado. Só então o status vira `ACTIVE`.

## Atribuição de uma venda

Duas vias, com precedência definida em `resolveAttribution`:

- `CHECKOUT_CODE` — `affiliateCode` informado no `CreateInvestmentDto`, persistido em `Investment.affiliateCode`. **Vence** o vínculo por link, por ser a manifestação mais recente e explícita do investidor.
- `LINK` — vínculo persistente gravado em `AffiliateReferral` quando o investidor chega por `POST /affiliate/track`.

Em ambas, a atribuição só vale se a afiliação estiver `ACTIVE`, pertencer ao programa **daquela startup** e o afiliado não for o próprio investidor.

## Cálculo e liquidação

`AffiliateCommission` congela `baseAmount`, os dois percentuais e os dois valores na apuração — mudança posterior nos percentuais do programa **não** reescreve comissão já apurada. Um investimento gera no máximo uma comissão (`investmentId` é `@unique`, o que também torna a apuração idempotente).

Estados: `PENDING → PAYABLE → PAID`. Marcar `PAID` credita a carteira do afiliado (`WalletType.AFFILIATE_COMMISSION`) dentro da mesma transação da mudança de status, para que lançamento e status nunca divirjam.

## Armadilhas

- **A apuração não pode derrubar a confirmação do investimento.** Em `investments.service.ts`, a chamada a `createForInvestment` está dentro de um `try/catch` deliberado, **fora** do caminho crítico: os tokens já foram emitidos e uma falha na comissão não pode desfazê-los. Como a apuração é idempotente, pode ser reprocessada depois.
- **`getTotalDueByCampaign` é por campanha, não por startup.** O repasse (`fund-transfer.service.ts`) acontece por campanha `FUNDED`; usar o recorte por startup descontaria comissões de outras campanhas. Existe também `getTotalDueByStartup` para relatórios — não use no repasse.
- **Comissões `CANCELED` não oneram a startup** e por isso ficam fora de ambas as somas.
- **`AffiliateGuard` exige assinatura ativa** do `plano-afiliado` (R$ 85/ano) além de papel `FOUNDER` ou `INVESTOR`. O plano estava com `visivel = 0` no banco e foi tornado visível junto com esta feature.
**Dependências:**

- `[../../prisma]` — `AffiliateProgram`, `Affiliation`, `AffiliateReferral`, `AffiliateCommission`
- `[../../auth]` — `AuthGuard` e `AdminGuard`
- `[../investments]` e `[../payment]` — consomem `AffiliateCommissionService` (apuração e desconto no repasse)
- `finance_config` — `affiliate.defaultAffiliatePct` (3) e `affiliate.defaultPlatformPct` (2)

**Filtros de listagem (founder):**
- `listAffiliationsForFounder(founderId, { status?, startupId? })` — `startupId` filtra candidaturas de uma startup específica (acesso direto pelo dashboard do fundador via botão Handshake).

**Mapa de Arquivos:**
- `affiliate.controller.ts` — `AffiliateController` (afiliado), `FounderAffiliateController`, `AdminAffiliateController`
- `affiliate.service.ts` — funil das três etapas, vitrine e painel do afiliado
- `affiliate-commission.service.ts` — atribuição, apuração, totais para o repasse e liquidação
- `affiliate.guard.ts` — papel elegível + assinatura ativa do plano-afiliado
- `dto/affiliate.dto.ts` — payloads de adesão, decisões, tracking e mudança de status
- `affiliate.module.ts` — exporta `AffiliateCommissionService`
