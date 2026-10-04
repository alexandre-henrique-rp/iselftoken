# PRD — Módulo Financeiro: Repasse de Fundos ao Fundador

**Data:** 2026-08-14 (última atualização 2026-08-15)  
**Status:** Planejamento  
**Prioridade:** Alta  
**Área:** Frontend (Founder) + Backend (FundTransfer, Notifications)  
**Referência:** B12 — Repasse de Fundos

> **ATUALIZADO 2026-08-15:** Decisoes consolidadas conforme discucao do usuario. Ver `CASE.md` §[Repasse] e FIN-09..FIN-12 no `todo/todo.json`. Mudancas em relacao a versao original:
> 1. **Compliance** passa a ser ator real do fluxo (delibera quantidade de parcelas). Financeiro configura valor/data.
> 2. **Valor FIXO por parcela** (decidido pelo Financeiro no momento do configure). Centavos residuais absorvidos pela ultima parcela.
> 3. **SLA de 5 dias UTEIS** contados a partir da SOLICITACAO ENVIADA (cobre aprovacao + PIX). Alerta visual quando faltar < 24h.
> 4. **Alocacao por PORCENTAGEM** (soma = 100%), nao mais valor absoluto. Backend converte em R$ no momento da aprovacao.
> 5. **Auto-post na Transparencia**: ao APROVAR solicitacao, gera automaticamente `TransparencyPost type=FINANCIAL_REPORT` (idempotente via `sourceType+sourceId`). Atualiza o mesmo post na conclusao. Rejeicao NAO gera post.

---

## 1. Contexto

Após uma rodada de captação ser concluída com sucesso (`FUNDED`), a startup precisa solicitar o repasse dos valores captados. Esse repasse é feito em **parcelas** definidas pelo financeiro (default 12x, podendo ser mais), garantindo transparência e prestação de contas aos investidores.

O fundador deve justificar o uso de cada parcela via formulário de alocação, e o financeiro aprova/rejeita cada solicitação individualmente.

---

## 2. O Que Já Existe (Implementado)

### Backend ✅

| Feature | Status | Detalhes |
|---------|--------|----------|
| Model `FundTransfer` (Prisma) | ✅ | Parcelas com `status`, `scheduledDate`, `amount`, `txIdBancario` |
| Model `NotaFiscal` (Prisma) | ✅ | NF sequencial por repasse |
| Model `Withdrawal` (Prisma) | ✅ | Saques com `bankInfo`, `status`, `approvedBy` |
| `POST /founder/startups/:id/repasse/initiate` | ✅ | Cria NF + 3 parcelas (atual: fixo 3x a cada 30 dias) |
| `GET /founder/startups/:id/repasse` | ✅ | Consulta status (NF + parcelas) |
| Cron diário 09:00 BRT | ✅ | Processa parcelas PENDING com `scheduledDate <= now` |
| `POST /wallet/withdraw` | ⚠️ Parcial | Cria transação + bloqueia saldo, sem processamento automático |
| Admin listagem de saques | ✅ | `GET /admin/financeiro/withdrawals` |
| Integração C6 PIX (gateway) | ✅ | `IC6PixAdapter.transferBancario()` |
| Desconto de comissões de afiliado | ✅ | `AffiliateCommissionService.getTotalDueByCampaign()` |
| Notificação por email | ❌ | Apenas AuditLog |
| Definição de quantidade de parcelas pelo financeiro | ❌ | Fixo em 3 (constante `REPASSE_PARCELAS = 3`) |

### Frontend ⚠️

| Feature | Status | Detalhes |
|---------|--------|----------|
| BFF `GET/POST /api/founder/startups/:id/repasse` | ✅ | Proxy funcional com testes |
| Hook `useFundTransferStatus` | ✅ | Polling inteligente com refetchInterval |
| Hook `useInitiateFundTransfer` | ✅ | Mutation com invalidation |
| Tipos `fund-transfer-types.ts` | ✅ | TransferStatus, FundTransferInstallment, etc |
| `fund-transfer-panel.tsx` (UI do fundador) | ❌ DELETADO | Foi removido no último commit |
| Formulário de saque investidor | ⚠️ Placeholder | UI sem integração backend |
| Tela admin saques | ✅ | Tabela paginada funcional |
| Gate de repasse (nova rodada) | ✅ | Bloqueia nova rodada se repasse pendente |

---

## 3. O Que Precisa Ser Implementado

### 3.1 Mudanças no Backend

#### A. Parcelamento Configurável (12x default)

**Atual:** `REPASSE_PARCELAS = 3` fixo com intervalo de 30 dias.  
**Novo:** O financeiro define a quantidade de parcelas (mínimo 12) e o intervalo.

```typescript
// Novo DTO para o financeiro configurar o repasse
class ConfigureRepasseDto {
  @IsInt() @Min(12)
  numeroParcelas: number; // default: 12

  @IsInt() @Min(15) @Max(60)
  intervaloDias: number; // default: 30

  @IsOptional() @IsString()
  observacaoFinanceiro?: string;
}
```

**Novo endpoint:**
```
POST /admin/financeiro/startups/:id/repasse/configure
Body: { numeroParcelas: 12, intervaloDias: 30 }
```

Esse endpoint:
1. Cria a NF
2. Gera N parcelas (FundTransfer) com status `AWAITING_REQUEST` (novo status)
3. Define `scheduledDate` como null (será preenchido quando o fundador solicitar cada parcela)
4. Marca a campanha como `transferConfigured = true`

#### B. Novo Status de FundTransfer

```
AWAITING_REQUEST → REQUESTED → PROCESSING → COMPLETED | FAILED | REJECTED
```

- `AWAITING_REQUEST` — parcela disponível para o fundador solicitar
- `REQUESTED` — fundador preencheu formulário, aguarda aprovação
- `PROCESSING` — financeiro aprovou, transferência em andamento
- `COMPLETED` — PIX/TED concluído
- `FAILED` — falha no gateway
- `REJECTED` — financeiro rejeitou (fundador pode reenviar)

#### C. Formulário de Solicitação de Parcela

**Novo endpoint (Fundador):**
```
POST /founder/startups/:id/repasse/installment/:installmentNumber/request
Body: RequestInstallmentDto
```

```typescript
class RequestInstallmentDto {
  // Alocação de recursos (obrigatórios, valores em R$)
  @IsNumber() @Min(0) marketing: number;
  @IsNumber() @Min(0) desenvolvimento: number;
  @IsNumber() @Min(0) infraestrutura: number;
  @IsNumber() @Min(0) pessoal: number;
  @IsNumber() @Min(0) juridico: number;
  @IsNumber() @Min(0) operacional: number;
  @IsNumber() @Min(0) reservaCaixa: number;

  // Observação livre (opcional)
  @IsOptional() @IsString() @MaxLength(1000)
  observacao?: string;
}
```

**Validações:**
- Soma das alocações == valor da parcela
- Parcela deve estar com status `AWAITING_REQUEST` ou `REJECTED` (permite reenvio)
- Parcela anterior (N-1) deve estar `COMPLETED` (sequencial)
- Startup pertence ao fundador autenticado

#### D. Aprovação/Rejeição de Parcela (Financeiro)

```
POST /admin/financeiro/repasse/installment/:id/approve
POST /admin/financeiro/repasse/installment/:id/reject
Body (reject): { motivo: string }
```

Ao aprovar:
1. Status → `PROCESSING`
2. `scheduledDate` = now
3. Cron processará no próximo ciclo (ou processamento imediato)
4. Email para fundador: "Parcela X aprovada, processando transferência"

Ao rejeitar:
1. Status → `REJECTED`
2. Email para fundador: "Parcela X rejeitada: {motivo}. Refaça a solicitação."
3. Fundador pode resubmeter

#### E. Notificações por Email

| Evento | Destinatário | Template |
|--------|-------------|----------|
| Repasse configurado pelo financeiro | Fundador | "Seu repasse foi autorizado. Solicite a 1ª parcela." |
| Parcela solicitada | Financeiro | "Startup X solicitou a parcela Y. Revise." |
| Parcela aprovada | Fundador | "Parcela X aprovada, transferência em processamento." |
| Parcela rejeitada | Fundador | "Parcela X rejeitada: {motivo}. Corrija e reenvie." |
| Parcela paga (COMPLETED) | Fundador | "Parcela X depositada com sucesso. Valor: R$ Y." |
| Todas as parcelas pagas | Fundador + Financeiro | "Repasse concluído! Todas as 12 parcelas foram transferidas." |

---

### 3.2 Mudanças no Frontend

#### A. Página do Fundador: Solicitação de Saque (`/founder/startups/:id/repasse`)

**Componentes:**

1. **Header de Transparência** — texto explicativo sobre o processo
2. **Stepper de Parcelas** — progresso visual (parcela 1/12, 2/12, etc)
3. **Card da Parcela Atual** — com status e ação disponível
4. **Formulário de Solicitação** — campos de alocação de recursos
5. **Histórico de Parcelas** — tabela com todas as parcelas passadas

**Fluxo de tela:**

```
Estado 1: AWAITING_REQUEST (botão "Solicitar Saque" visível)
  → Formulário aberto com:
    - Valor da parcela (readonly, definido pelo financeiro)
    - Banco/Agência/Conta (readonly, puxado da startup)
    - Campos de alocação: marketing, desenvolvimento, infra, pessoal, jurídico, operacional, reserva
    - Barra de progresso: soma dos campos vs total da parcela
    - Observação (textarea, opcional)
    - Botão "Solicitar Saque"

Estado 2: REQUESTED (aguardando aprovação)
  → Card informativo: "Solicitação enviada. Aguardando aprovação do financeiro."
  → Formulário preenchido em modo readonly (não editável)

Estado 3: PROCESSING (transferência em andamento)
  → Card: "Transferência em processamento..."

Estado 4: COMPLETED (parcela paga)
  → Card verde: "Parcela 3/12 depositada em DD/MM/YYYY"
  → Se próxima parcela disponível → botão para próxima

Estado 5: REJECTED (rejeitada)
  → Card vermelho: "Parcela rejeitada. Motivo: {motivo}"
  → Formulário reaberto para reenvio

Estado 6: Última parcela COMPLETED
  → Botão desaparece
  → Mensagem: "Repasse concluído! Todas as parcelas foram transferidas."
```

#### B. Painel Admin: Configuração e Aprovação de Repasse

**Rota:** `/financeiro/repasse` (nova)

**Funcionalidades:**
1. Lista de campanhas FUNDED aguardando configuração de repasse
2. Modal de configuração: definir número de parcelas + intervalo
3. Lista de solicitações pendentes (parcelas com status REQUESTED)
4. Visualização do formulário de alocação do fundador
5. Botões Aprovar / Rejeitar (com campo de motivo no rejeitar)

---

## 4. Campos do Formulário de Solicitação de Parcela

| Campo | Tipo | Obrigatório | Fonte |
|-------|------|-------------|-------|
| Valor da parcela | `number` (readonly) | — | Definido pelo financeiro |
| Banco | `string` (readonly) | — | Dados bancários da startup |
| Agência | `string` (readonly) | — | Dados bancários da startup |
| Conta | `string` (readonly) | — | Dados bancários da startup |
| Marketing | `number` (R$) | ✅ | Fundador preenche |
| Desenvolvimento | `number` (R$) | ✅ | Fundador preenche |
| Infraestrutura | `number` (R$) | ✅ | Fundador preenche |
| Pessoal (RH) | `number` (R$) | ✅ | Fundador preenche |
| Jurídico/Compliance | `number` (R$) | ✅ | Fundador preenche |
| Operacional | `number` (R$) | ✅ | Fundador preenche |
| Reserva de Caixa | `number` (R$) | ✅ | Fundador preenche |
| Observações | `text` (max 1000 chars) | ❌ | Fundador preenche |

**Regra:** Soma de todos os campos de alocação (marketing + dev + infra + pessoal + jurídico + operacional + reserva) **DEVE ser igual** ao valor da parcela.

---

## 5. Fluxo Completo (End-to-End)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Rodada conclui (FUNDED)                                       │
├─────────────────────────────────────────────────────────────────┤
│ 2. Financeiro revisa campanha                                    │
│    → Define: 12 parcelas, intervalo 30 dias                      │
│    → POST /admin/financeiro/startups/:id/repasse/configure       │
│    → Cria NF + 12 parcelas AWAITING_REQUEST                      │
│    → Email para fundador: "Repasse autorizado"                   │
├─────────────────────────────────────────────────────────────────┤
│ 3. Fundador acessa /founder/startups/:id/repasse                 │
│    → Vê parcela 1/12 com botão "Solicitar Saque"                 │
│    → Preenche formulário de alocação de recursos                 │
│    → POST /founder/startups/:id/repasse/installment/1/request    │
│    → Status: AWAITING_REQUEST → REQUESTED                        │
│    → Email para financeiro: "Parcela 1 solicitada"               │
├─────────────────────────────────────────────────────────────────┤
│ 4. Financeiro revisa solicitação                                 │
│    → Visualiza alocação do fundador                              │
│    → Opção A: Aprova → status PROCESSING → cron paga            │
│    → Opção B: Rejeita → status REJECTED + motivo                 │
├─────────────────────────────────────────────────────────────────┤
│ 5. Se aprovado:                                                  │
│    → Cron processa PIX/TED via C6                                │
│    → Status: PROCESSING → COMPLETED                              │
│    → Email para fundador: "Parcela depositada!"                  │
│    → Formulário vira relatório (readonly) no histórico           │
│    → Próxima parcela (2/12) fica disponível                      │
├─────────────────────────────────────────────────────────────────┤
│ 6. Se rejeitado:                                                 │
│    → Fundador recebe email com motivo                            │
│    → Pode resubmeter (status volta pra AWAITING_REQUEST)         │
├─────────────────────────────────────────────────────────────────┤
│ 7. Repete 3-6 para cada parcela (2/12, 3/12, ..., 12/12)        │
├─────────────────────────────────────────────────────────────────┤
│ 8. Última parcela COMPLETED                                      │
│    → Botão desaparece                                            │
│    → Mensagem de conclusão                                       │
│    → Email final para fundador + financeiro                      │
│    → Dados públicos na página de transparência                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Impacto no Schema (Migration)

```sql
-- Alterar enum FundTransferStatus
ALTER TABLE fund_transfers 
  MODIFY COLUMN status ENUM('AWAITING_REQUEST','REQUESTED','PROCESSING','COMPLETED','FAILED','REJECTED');

-- Adicionar campos ao FundTransfer
ALTER TABLE fund_transfers ADD COLUMN allocation JSON NULL;  -- campos de alocação
ALTER TABLE fund_transfers ADD COLUMN observacao TEXT NULL;
ALTER TABLE fund_transfers ADD COLUMN rejectionReason TEXT NULL;
ALTER TABLE fund_transfers ADD COLUMN requestedAt DATETIME NULL;
ALTER TABLE fund_transfers ADD COLUMN approvedAt DATETIME NULL;
ALTER TABLE fund_transfers ADD COLUMN approvedBy INT NULL;

-- Alterar campo scheduledDate para nullable (será preenchido na aprovação)
ALTER TABLE fund_transfers MODIFY COLUMN scheduledDate DATETIME NULL;

-- Nova coluna na campanha
ALTER TABLE campaigns ADD COLUMN repasseConfigured BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN repasseParcelas INT DEFAULT 12;
ALTER TABLE campaigns ADD COLUMN repasseIntervaloDias INT DEFAULT 30;
```

---

## 7. Arquivos a Criar/Modificar

### Backend

| Ação | Arquivo |
|------|---------|
| Modificar | `src/api/payment/fund-transfer.service.ts` — adaptar para N parcelas e novo fluxo |
| Modificar | `src/api/payment/fund-transfer.controller.ts` — novo endpoint de request |
| Criar | `src/api/payment/dto/configure-repasse.dto.ts` |
| Criar | `src/api/payment/dto/request-installment.dto.ts` |
| Modificar | `src/api/admin/admin-financeiro.controller.ts` — endpoints configure/approve/reject |
| Modificar | `prisma/schema.prisma` — alterações no model FundTransfer |
| Criar | Migration Prisma |
| Criar | `src/api/payment/fund-transfer-notification.service.ts` — emails |

### Frontend

| Ação | Arquivo |
|------|---------|
| Criar | `app/routes/private/founder-repasse.tsx` — página principal do fundador |
| Criar | `app/components/founder/repasse-installment-form.tsx` — formulário de alocação |
| Criar | `app/components/founder/repasse-stepper.tsx` — stepper visual |
| Criar | `app/components/founder/repasse-history.tsx` — histórico de parcelas |
| Criar | `app/routes/private/financeiro-repasse.tsx` — painel admin |
| Criar | `app/components/financeiro/repasse-config-modal.tsx` — modal de configuração |
| Criar | `app/components/financeiro/repasse-review-modal.tsx` — review da solicitação |
| Modificar | `app/hooks/use-fund-transfer-status.ts` — adaptar para novo schema |
| Modificar | `app/lib/fund-transfer-types.ts` — novos status e tipos |
| Criar | `app/routes/api/founder.startups.$id.repasse.installment.ts` — BFF |
| Criar | `app/routes/api/admin.financeiro.repasse.ts` — BFF admin |

---

## 8. Cronograma Estimado

| Fase | Descrição | Esforço |
|------|-----------|---------|
| 1 | Migration + DTOs + alterações no service (backend) | 6h |
| 2 | Endpoints novos (configure, request, approve, reject) | 4h |
| 3 | Serviço de notificação por email | 3h |
| 4 | Página do fundador (formulário + stepper + histórico) | 8h |
| 5 | Painel admin financeiro (configuração + review) | 6h |
| 6 | Testes E2E do fluxo completo | 4h |

**Total estimado:** ~31h

---

## 9. Critérios de Aceite

### Fundador
- [ ] Botão "Solicitar Saque" visível apenas quando parcela tem status `AWAITING_REQUEST`
- [ ] Botão desaparece após solicitar a última parcela
- [ ] Formulário exibe valor da parcela (readonly) e dados bancários da startup
- [ ] Soma dos campos de alocação deve ser == valor da parcela (validação client + server)
- [ ] Todos os campos de alocação são obrigatórios exceto observação
- [ ] Após enviar, formulário fica readonly (não editável)
- [ ] Se rejeitado, formulário reabre para correção
- [ ] Parcelas são sequenciais (só solicita N se N-1 está COMPLETED)
- [ ] Texto explicativo sobre transparência visível na página

### Financeiro (Admin)
- [ ] Pode configurar número de parcelas (mín. 12) e intervalo (15-60 dias)
- [ ] Pode visualizar formulário de alocação do fundador
- [ ] Pode aprovar ou rejeitar cada parcela individualmente
- [ ] Ao rejeitar, campo de motivo é obrigatório
- [ ] Lista de solicitações pendentes com filtro por status

### Notificações
- [ ] Email enviado ao fundador quando repasse é configurado
- [ ] Email enviado ao financeiro quando parcela é solicitada
- [ ] Email enviado ao fundador quando parcela é aprovada
- [ ] Email enviado ao fundador quando parcela é rejeitada (com motivo)
- [ ] Email enviado ao fundador quando parcela é depositada
- [ ] Email final quando todas as parcelas são concluídas

### Transparência
- [ ] Após COMPLETED, parcela vira registro readonly no histórico
- [ ] Dados de alocação ficam disponíveis para a página de transparência (público)

---

## 10. Decisões que Requerem Aprovação

> **ATUALIZADO 2026-08-15:** Decisoes 1..5 resolvidas conforme discucao consolidada. Detalhes em `CASE.md` §[Repasse].

1. ✅ **FECHADA** — N parcelas configuraveis pelo Compliance (12..60, default 12). Impacto: migration + ajustar cron + testes e2e
2. ✅ **FECHADA** — Status `AWAITING_REQUEST`/`REJECTED` adicionados (e mais `CONFIGURED, IN_PROGRESS, COMPLETED, CANCELLED` no novo model `Repasse`; `REQUESTED, APPROVED, PROCESSING, COMPLETED, REJECTED` no novo model `InstallmentRequest`)
3. ✅ **FECHADA** — `allocationPercents` e `allocationValues` como JSON no model `InstallmentRequest` (mais simples; relatorios SQL especificos podem ser feitos sob demanda em sprints futuras)
4. ✅ **FECHADA** — Sequencial obrigatoria (parcela N so pode ser solicitada apos N-1 `COMPLETED`)
5. ✅ **FECHADA** — Conforme DEC-04 (consolidada na rodada TRANSP-03/04/05): agregado por padrao na pagina publica; detalhamento individual requer consentimento granular opt-in (sprint futura, NAO TRANSP-09/10)

### Decisoes NOVAS (FIN-09/10)
6. ✅ **FECHADA** — Compliance delibera quantidade; Financeiro configura valor + intervalo + valor ultima parcela (com centavos absorvidos)
7. ✅ **FECHADA** — SLA 5 dias UTEIS contados da SUBMISSAO da solicitacao, nao da aprovacao. Pulando sabado/domingo + feriados nacionais BR
8. ✅ **FECHADA** — Alocacao por PORCENTAGEM com soma = 100%. UI usa slider + input numerico sincronizado
9. ✅ **FECHADA** — Auto-post na Transparencia: gerado ao APROVAR, ATUALIZADO ao CONCLUIR. NAO criado se REJEITAR
