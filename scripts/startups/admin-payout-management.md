# Admin Payout Management — Gestão de Captações e Parcelas

**Data:** 2026-09-15
**Atualizado:** 2026-09-16 — fluxo refinado (configuração → liberação → solicitação → repasse)
**Página:** `/admin/payouts` — consolidado de captações finalizadas + solicitações de parcela
**Stack:** React Router 7 (SSR) · Tailwind 4 · shadcn/ui · TanStack Query 5
**Base:** `scripts/startups/PRD_RECEBIMENTO_CAPTACAO.md` (§6, §7, §9) + `scripts/startups/fluxo_startup.md` (§7)

---

## 1. Objetivo

Consolidar em uma única página o gerenciamento de dois cenários:

| # | Cenário | Descrição | Ação principal |
|---|---|---|---|
| 1 | **Captação finalizada — decisão pendente** | Startup em `FUNDED` → `AWAITING_PAYOUT_DECISION` (processamento, ∼7 dias). Admin decide prorrogar ou finalizar. | Decisão (Prorrogar / Finalizar) |
| 2 | **Repasse — solicitações de parcela** | Apenas após founder solicitar preenchendo o formulário. Financeiro aprova + marca como pago. | Aprovar / Rejeitar / Marcar como Pago |

**Fluxo de repasse (requisito):** O repasse só acontece a partir do momento em que o founder solicita preenchendo a solicitação. A decisão de finalizar definitivamente (configuração) libera o botão **"Solicitar Parcela"** no dashboard da startup. Após a solicitação, a parcela aparece na coluna Repasse para aprovação do Financeiro.

---

## 2. Layout Geral

```text
┌──────────────────────────────────────────────────────────────────────┐
│ ← Voltar                    GESTÃO DE PAGAMENTOS / PAYOUTS           │
│                                                                      │
│  ┌─ FILTROS ──────────────────────────────────────────────────────┐ │
│  │  [Buscar startup]  [Status ▾]  [Categoria ▾]  [Aplicar] [⟳] │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ╔══════════════════════════════════════════════════════════════╗   │
│  ║  CATEGORIA 1: CAPTAÇÃO FINALIZADA — PARCELA PENDENTE    [N] ║   │
│  ╚══════════════════════════════════════════════════════════════╝   │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  Tabela / Cards de startups aguardando decisão de payout      │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ╔══════════════════════════════════════════════════════════════╗   │
│  ║  CATEGORIA 2: SOLICITAÇÕES DE PARCELA PENDENTES       [N] ║   │
│  ╚══════════════════════════════════════════════════════════════╝   │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  Tabela / Cards de solicitações de parcela aguardando análise │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Categoria 1 — Captação Finalizada, Primeira Parcela Pendente

### 3.1 O que mostra

Startups com `CampaignStatus = FUNDED` + `PayoutProcess` existente com `payoutDecision = null` (ainda não decidido).

### 3.2 Dados exibidos por startup

| Dado | Fonte | Exemplo |
|---|---|---|
| Startup | `Startup.nome` | Acme Technology |
| ID | `Startup.id` | #000123 |
| Motivo conclusão | `PayoutProcess.conclusionReason` | META_ATINGIDA / TEMPO_EXPIRADO |
| Valor captado | `Campaign.amountRaised` | R$ 300.000,00 |
| Meta | `Campaign.targetAmount` | R$ 500.000,00 |
| Tokens vendidos | Contagem tokens | 7.500 |
| Data início captação | `Campaign.startedAt` | 12/08/2025 |
| Data conclusão | `PayoutProcess.concludedAt` | 15/08/2025 |
| Janela de decisão | `PayoutProcess.decisionDeadline` | Expira em 2d 04h |
| Status | `CampaignStatus` | FUNDED (processamento) |

### 3.3 Ações

| Ação | Condição | Ação no clique |
|---|---|---|
| **[Prorrogar Captação]** | Sempre disponível (enquanto `AWAITING_PAYOUT_DECISION`) | Abre modal/bloco: define novo período → notifica founder → founder paga nova reserva → reativação automática |
| **[Finalizar Definitivamente ▾]** | Sempre disponível | Dropdown: abre bloco de definição de parcelas (mín. 12, juros/config) → confirma → libera solicitação de parcela para founder |

### 3.4 Wireframe por startup (card)

```text
┌──────────────────────────────────────────────────────────────┐
│ ← Notificações             GESTÃO DE PAGAMENTOS — Acme Tech │
├──────────────────────────────────────────────────────────────┤
│ ⚠ Janela de decisão: 7 dias úteis (prorrogável) · expira  │
│    em 2d 04h                                               │
│                                                                │
│ ┌───────────┬───────────┬───────────┬───────────┬─────────┐ │
│ │ CAPTADO   │ META      │ PROGRESSO │ TOKENS    │ INÍCIO  │ │
│ │ R$300.000 │ R$500.000 │ ████░░ 60%│ 7.500    │ 12/08/25│ │
│ └───────────┴───────────┴───────────┴───────────┴─────────┘ │
│                                                                │
│ Motivo: (●) META ATINGIDA  ( ) TEMPO EXPIRADO                │
│ Valor: R$300.000 · Meta: R$500.000                           │
│ Tokens: 7.500 · Início: 12/08/2025                           │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ [ PRORROGAR CAPTAÇÃO ]          [ FINALIZAR ▾ ]          ││
│ │  · Novo período: [30 ▾] dias  · Abre "Definir Parcelas" ││
│ │    (modal: mín. 12, juros/config Financeiro)             ││
│ └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### 3.5 Fluxo — Prorrogar

```text
Admin clica [Prorrogar]
  ↓ define novo período (+30/60 dias)
  ↓ dispara notificação + email ao founder
  ↓ Founder acessa /founder/startups/:id/prorrogacao
  ↓ Define valor ADICIONAL (ex.: R$200.000)
  ↓ Sistema calcula NOVA META SOMADA (read-only: R$700.000)
  ↓ Sistema calcula RESERVA sobre ADICIONAL (R$200k ÷ R$40 = 5.000 tokens)
  ↓ Founder paga nova reserva (Pix 24h)
  ↓ Pagamento confirmado → reativação automática (OPEN)
  ↓ Novo prazo definido pelo Compliance
```

### 3.6 Fluxo — Finalizar Definitivamente

```text
Admin clica [Finalizar Definitivamente]
  ↓ Abre modal "Definir Parcelas"
  ↓ Define quantidade (mín. 12): [24 ▾]
  ↓ Define juros: [1,5% a.m. ▾] (config Financeiro)
  ↓ Sistema calcula tabela de parcelas (valor base + juros + previsão)
  ↓ Regra: 1 parcela/mês · não sacadas não expiram
  ↓ Admin confirma [CONFIRMAR E LIBERAR]
  ↓ PayoutProcess atualizado → founder recebe notificação
  ↓ BOTÃO "SOLICITAR PARCELA" LIBERADO no dashboard da startup (coluna Ações)
  ↓ Founder acessa dashboard → clica [Solicitar Parcela]
  ↓ Preenche formulário (parcela, alocação, observação) → submete
  ↓ InstallmentRequest criado (status REQUESTED)
  ↓ Admin vê na Categoria 2 de /admin/payouts
```

---

## 4. Categoria 2 — Solicitações de Parcela Pendentes

### 4.1 O que mostra

Apenas startups que já tiveram solicitação de parcela criada pelo founder (preenchendo o formulário de solicitação no dashboard). Antes de o founder solicitar, esta categoria fica vazia.

**Condição de exibição:** `InstallmentRequest` existe com status `REQUESTED` ou `APPROVED` — gerado somente após founder submeter o formulário de solicitação de parcela.

### 4.2 Dados exibidos por solicitação

| Dado | Fonte | Exemplo |
|---|---|---|
| Startup | `Startup.nome` | Acme Technology |
| Solicitação ID | `PayoutReport.solicitacaoId` | #SOL-2026-0412 |
| Parcela | `Installment.number` | #3 de 24 |
| Valor | `Installment.totalAmount` | R$ 21.145,84 |
| Status | `Installment.status` | REQUESTED / APPROVED |
| Relatório do mês | `PayoutReport` exists? | ✅ Preenchido / ❌ Vazio (bloqueado) |
| Data solicitação | `PayoutReport.createdAt` | 20/08/2025 |
| Previsão pagamento | `Installment.scheduledDate` | 01/Out/2025 |

### 4.3 Ações por status

**Status REQUESTED** (founder solicitou, Financeiro ainda não analisou):

| Ação | Condição | Ação no clique |
|---|---|---|
| **[Aprovar]** | Relatório do mês preenchido | Altera status → `APPROVED` |
| **[Rejeitar]** | Sempre | Modal com justificativa → `REJECTED` (founder pode resubmitir) |
| **[Bloqueado]** | Relatório vazio | Badge "Relatório obrigatório" + tooltip |

**Status APPROVED** (Financeiro aprovou, aguardando pagamento):

| Ação | Condição | Ação no clique |
|---|---|---|
| **[Upload Comprovante]** | Sempre | Modal upload PDF/imagem (validado MIME/tamanho) |
| **[Marcar como Pago]** | Comprovante anexado | Altera status → `PAID` + TXID opcional |

### 4.4 Wireframe por solicitação (card detalhe)

```text
┌──────────────────────────────────────────────────────────────┐
│ ← Voltar                     SOLICITAÇÃO #SOL-2026-0412     │
│                                                                │
│  Startup: Acme Technology · #000123                            │
│  Parcela: #3 de 24 · R$ 21.145,84 · Previsão: 01/Out/2025    │
│  Status: APPROVED                                                │
│                                                                │
│  ┌─ RELATÓRIO DO MÊS ──────────────────────────────────────┐│
│  │  Uso do recurso: Desenvolvimento                        ││
│  │  Lucro?: Sim                                            ││
│  │  Marco: v2.0 lançado                                   ││
│  │  Mensagem: "Lançamos a versão 2.0..."                  ││
│  │  ✅ Preenchido (publicado na transparência)             ││
│  └─────────────────────────────────────────────────────────┘│
│                                                                │
│  ┌─ COMPROVANTE ───────────────────────────────────────────┐│
│  │  [ Upload PDF/imagem ✓ ]  (se ainda não enviado)       ││
│  │  [Ver comprovante] [Download] (se enviado)              ││
│  └─────────────────────────────────────────────────────────┘│
│                                                                │
│  [✓] Aprovar            [✗] Rejeitar                         │
│  [📎] Marcar como Pago (comprovante obrigatório)             │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### 4.5 Wireframe da lista de solicitações

```text
┌─────── SOLICITAÇÕES DE PARCELAS ────────┐
│ Filtros: [Status ▾][Startup ▾] [Buscar]│
│                                          │
│ ┌────────────────────────────────────┐  │
│ │#SOL-0412 <Acme Tech> #3 REQ ▸   │  │
│ │Valor: R$21.145,84 · Status: REQ│  │
│ │Relatório: ✅ Preenchido          │  │
│ │[ Aprovar ] [ Rejeitar ]          │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │#SOL-0411 <Beta Inc> #2 APPR ▸   │  │
│ │Valor: R$20.833,00 · Status: APPR│  │
│ │Relatório: ✅ Preenchido          │  │
│ │[ Marcar Pago ] [ Rejeitar ]      │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │#SOL-0410 <Gamma Labs> #1 PAID ✓ │  │
│ │Valor: R$20.833,00 · Status: PAID │  │
│ │Comprovante: [Ver]                 │  │
│ └────────────────────────────────────┘  │
│                                          │
│ Filtros: [Status ▾][Startup ▾] [Buscar]│
└──────────────────────────────────────────┘
```

---

## 5. Filtros da Página

| Filtro | Tipo | Opções | Aplica em |
|---|---|---|---|
| Buscar | Texto | Nome/ID da startup | Ambas categorias |
| Status | Select | Todas, Pendente, Aprovado, Pago, Rejeitado | Cat 2 (Installment.status) |
| Categoria | Segmented | Todas, Finalizadas, Solicitações | Toggle entre as duas tabelas |
| Data range | Date picker | Data início → Data fim | Ambas |

---

## 6. Componentes necessários

### 6.1 Novos componentes

| Component | Path | Função |
|---|---|---|
| `PayoutPage` | `app/routes/private/admin.payouts.tsx` | Página principal (shell + filtros + 2 categorias) |
| `PayoutCategory` | `app/components/admin/payout/payout-category.tsx` | Wrapper de categoria (título + contador + tabela) |
| `PayoutDecisionCard` | `app/components/admin/payout/payout-decision-card.tsx` | Card de decisão (Cat 1: prorrogar/finalizar) |
| `InstallmentList` | `app/components/admin/payout/installment-list.tsx` | Lista de solicitações (Cat 2) |
| `InstallmentCard` | `app/components/admin/payout/installment-card.tsx` | Card de solicitação detalhe |
| `DefineParcelasModal` | `app/components/admin/payout/define-parcelas-modal.tsx` | Modal de definir parcelas (mín. 12, juros) |
| `PayoutFilters` | `app/components/admin/payout/payout-filters.tsx` | Filtros da página |
| `PayoutSummary` | `app/components/admin/payout/payout-summary.tsx` | Resumo: total captado, tokens, etc. |
| `ComprovanteUpload` | `app/components/admin/payout/comprovante-upload.tsx` | Upload de comprovante |
| `RepasseTable` | `app/components/admin/payout/repasse-table.tsx` | Tabela responsiva (mobile cards + desktop table) |

### 6.2 Botão "Solicitar Parcela" — liberação por configuração

O botão **Solicitar Parcela** aparece no dashboard da startup (coluna Ações) **somente quando** o Admin/Compliance clicou em **Finalizar Definitivamente** e salvou a configuração de parcelas.

| Condição | Comportamento |
|---|---|
| Campanha `FUNDED` + repasse NÃO configurado | Botão **não aparece** |
| Campanha `FUNDED` + repasse configurado (mín. 12 parcelas) | Botão **aparece** na coluna Ações |
| Founder clica em Solicitar Parcela | Abre formulário (parcela, valor, alocação, observação) → cria `InstallmentRequest` com status `REQUESTED` |
| Após criação | Installment aparece em `/admin/payouts` Categoria 2 |

**Regra:** 1 parcela por mês. Founder só pode solicitar a parcela do mês vigente se não tiver solicitado anteriormente naquele mês. Parcela não sacada não expira.

### 6.3 Reutilizar existentes

| Component | Origem | Reuso |
|---|---|---|
| `InitialsImage` | `app/components/ui/initials-image.tsx` | Avatar startup na lista |
| `Badge` | shadcn/ui | Status badges |
| `DashboardBackgroundWatermark` | `app/components/founder/dashboard-background-watermark.tsx` | Background |

---

## 7. BFFs / Endpoints necessários

### 7.1 Lista consolidada (GET)

| Endpoint | Método | Descrição | Retorna |
|---|---|---|---|
| `/api/admin/payouts` | GET | Lista consolidada (ambas categorias) | `{ payouts: [...], installments: [...], filters }` |
| `/api/admin/payouts/:id/decision` | POST | Prorrogar ou Finalizar | `{ decision, deadline }` |
| `/api/admin/payouts/:id/parcelas` | POST | Definir parcelas | `{ installments: [...] }` |
| `/api/admin/installments/:id/approve` | POST | Aprovar solicitação | `{ status: APPROVED }` |
| `/api/admin/installments/:id/reject` | POST | Rejeitar | `{ status: REJECTED, reason }` |
| `/api/admin/installments/:id/mark-paid` | POST | Marcar como pago | `{ status: PAID, txId? }` |
| `/api/admin/installments/:id/comprovante` | POST | Upload comprovante | `{ url, expiresAt }` |

### 7.2 Reuso existente

| Endpoint | Método | Origem |
|---|---|---|
| `/api/admin/startups/:id` | GET | `admin.startups.$id.ts` |
| `/api/admin/financeiro/dashboard` | GET | `admin.financeiro.dashboard.ts` |
| `/api/founder/startups/:id/repasse/dashboard` | GET | `founder.startups.$id.repasse.dashboard.ts` |

---

## 8. Rotas necessárias

| Rota | Arquivo | Descrição |
|---|---|---|
| `/admin/payouts` | `app/routes/private/admin.payouts.tsx` | Página consolidada (nova) |

---

## 9. Decisões de Design

| Decisão | Justificativa |
|---|---|
| Página única `/admin/payouts` | O admin precisa ver TODOS os payout-related em um lugar; evitar navegação entre páginas |
| Duas categorias visuais separadas | Contexto diferente (decisão vs. análise); reduz erro |
| Filtro por "Categoria" | Permite focar em uma categoria sem scrollar |
| Prorrogar como botão primário (Cat 1) | Ação mais comum; identificada pelo admin como potencial |
| Finalizar como dropdown | Menos comum; evita clique acidental |
| Modal "Definir Parcelas" (Cat 1) | Formulário complexo (mín. 12, juros, preview tabela) cabe melhor em modal |
| Aprovar inline (Cat 2) | Ação rápida sem modal; apenas mudar status |
| Rejeitar com justificativa (Cat 2) | LGPD: razão documentada |
| Marcar como pago com upload comprovante | Financeiro precisa de evidência; comprovante fica na transparência |
| Relatório obrigatório bloqueia aprovação | Regra de negócio do PRD_RECEBIMENTO §7.2 |
| Cat 2 vazia até founder solicitar | Repasse só existe após founder preencher formulário; evita confusão |
| Botão "Solicitar Parcela" liberado por configuração | Finalizar definitivamente cria a configuração → libera ação no dashboard da startup |
| 1 parcela/mês (não cumulativo) | Regra do PRD_RECEBIMENTO §7.2; não sacada → rola p/ próximo mês |
| Fundo preto puro, magenta #d500f9 | STYLE_GUIDE: Glass panels, 3xl radius |

---

## 10. Regras de negócio

| Regra | Fonte | Implementação |
|---|---|---|
| Janela de decisão: 7 dias úteis (prorrogável) | PRD_RECEBIMENTO §4.2 | Banner countdown na Cat 1 |
| Parcelas mínimas: 12 | PRD_RECEBIMENTO §7.1 | Validação no DefineParcelasModal |
| 1 parcela/mês, não cumulativo | PRD_RECEBIMENTO §7.2 | Regra no backend; não sacada → rola p/ próximo |
| Relatório obrigatório para solicitar | PRD_RECEBIMENTO §8.2 | Bloqueia aprovar se não preenchido |
| Comprovante obrigatório para marcar pago | PRD_RECEBIMENTO §9 | Botão desabilitado até upload |
| Não cumulativo: parcelas não sacadas não expiram | PRD_RECEBIMENTO §7.2 | Exibição no relatório |
| CNPJ mascarado na listagem | AGENTS.md §LGPD | `12.345.xxx/xxxx-xx` |
| Status badges: primary/warning/destructive | Design tokens | Aprovada/Em análise/Rejeitada |
| Fundo preto puro, magenta #d500f9 | STYLE_GUIDE | Glass panels, 3xl radius |

---

## 11. Pendências

| Item | Prioridade | Notas |
|---|---|---|
| Criar `PayoutProcess` no backend | Alta | Entidade não existe ainda (PRD §13) |
| Criar `PayoutReport` no backend | Alta | Entidade não existe ainda |
| Criar `Installment` reuso com campos adicionais | Média | Verificar se modelo existe |
| Implementar endpoints da seção 7.1 | Alta | Novos endpoints |
| Criar route `/admin/payouts` no `routes.ts` | Alta | Nova rota |
| Criar todos os componentes da seção 6.1 | Alta | ~10 componentes |
| **Botão "Solicitar Parcela" no dashboard da startup** | **Alta** | **Visível quando repasse configurado; action → formulário de solicitação** |
| **BFF GET `/api/admin/payouts` — incluir repasse + mesVigenteRecebido** | **Alta** | **Categoria 2 só retorna após founder solicitar** |
| **Lógica 1 parcela/mês no backend** | **Alta** | **Impedir solicitação duplicada no mesmo mês** |
| Testes E2E | Média | Fluxo decisão + fluxo parcela |
| Atualizar `CASE.md` com regras de payout | Média | Regras de negócio |

---

## 12. Wireframes

### 12.1 Admin/Compliance — `/admin/payouts` (decisão + repasse)

```text
┌──────────────────────────────────────────────────────────────────────┐
│ ← Voltar                    GESTÃO DE REPASSE                       │
├──────────────────────────────────────────────────────────────────────┤
│ ⚠ Janela de decisão: 7 dias úteis (prorrogável) · expira em 2d 04h│
│                                                                      │
│ ┌─ FILTROS ──────────────────────────────────────────────────────┐ │
│ │ [Buscar] [Status ▾] [Categoria ▾] [Aplicar] [⟳]              │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ╔══ RESUMO ═══════════════════════════════════════╗             │
│ ║ Em decisão: N  │  Solicitações: N               ║             │
│ ╚═══════════════════════════════════════════════════╝             │
│                                                                      │
│ ╔══ CONFIGURAÇÃO ═══════════════════════════════════════╗      │
│ ║ Campanhas aguardando decisão: [N]                       ║      │
│ ║                                                          ║      │
│ ║ ┌─ <Startup> ───────────────────────────────────────┐  ║      │
│ ║ │ Captado: R$300k · Meta: R$500k                    │  ║      │
│ ║ │ Progresso: ████░░ 60% · Tokens: 7.500/10.000      │  ║      │
│ ║ │ Conclusão: (●) META ATINGIDA                       │  ║      │
│ ║ │ Janela: expira em 2d 04h                           │  ║      │
│ ║ │                                                      │  ║      │
│ ║ │ [ PRORROGAR CAPTAÇÃO ]                              │  ║      │
│ ║ │ [ FINALIZAR DEFINITIVAMENTE ▾ ]                     │  ║      │
│ ║ │  → Define Parcelas (mín. 12, juros/config)          │  ║      │
│ ║ └──────────────────────────────────────────────────────┘  ║      │
│ ╚═════════════════════════════════════════════════════════════╝      │
│                                                                      │
│ ╔══ REPASSE ════════════════════════════════════════════════╗   │
│ ║ Solicitações pendentes: [N]                               ║   │
│ ║                                                            ║   │
│ ║ ┌─ <Startup> — Parcela #3 de 24 ─────────────────────┐ ║   │
│ ║ │ Valor: R$21.145,84 · Previsão: 01/Out/2025        │ ║   │
│ ║ │ Status: SOLICITADA · Relatório: ✅ Preenchido      │ ║   │
│ ║ │                                                      │ ║   │
│ ║ │ [ Aprovar ] [ Rejeitar ] [ Marcar como Pago ]       │ ║   │
│ ║ └──────────────────────────────────────────────────────┘ ║   │
│ ╚══════════════════════════════════════════════════════════════╝   │
└──────────────────────────────────────────────────────────────────────┘
```

### 12.2 Modal "Definir Parcelas" (mín. 12, juros)

```text
┌─────────────── DEFINIR PARCELAS — <Startup> ────────────────────────┐
│ Total a liberar: R$ 500.000,00 · Conclusão: 12/08/2026                │
│ Quantidade (mín. 12): [ 24 ▾ ]   Juros: [ 1,5% a.m. ▾ ] (config)    │
│ ┌───────────────────────────────────────────────────────────────────┐ │
│ │ Parcela   Valor base    Juros    Total        Previsão            │ │
│ │ #1       20.833,34     312,50   21.145,84    01/Out/2026          │ │
│ │ #2       20.833,33     312,50   21.145,83    01/Nov/2026          │ │
│ │ ...    ...           ...      ...          ...                     │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│ Regra: 1 parcela/mês · não sacadas não expiram (rolam p/ próximo)    │
│ ┌───────────────────────────────────────────────────────────────────┐ │
│ │                     [ CANCELAR ]   [ CONFIRMAR E LIBERAR ]        │ │
│ └───────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### 12.3 Founder — Página de Prorrogação (`/founder/startups/:id/prorrogacao`)

```text
┌──────────────────────────────────────────────────────────────────────┐
│ ← Dashboard                     PRORROGAÇÃO DA CAPTAÇÃO — <Startup>  │
│ Identificamos potencial em sua captação! Defina o valor adicional.    │
│                                                                      │
│ ┌───────────────────────────┐  ┌──────────────────────────────────┐│
│ │ VALOR ADICIONAL            │  │ NOVA META (exibição automática)  ││
│ │  Meta original R$500.000  │  │ R$ 500.000 + R$ 200.000 = R$700k││
│ │  Adicional   [ R$200.000] │  │ (read-only — não editável)       ││
│ │  Preço token: R$ 40,00    │  │                                    ││
│ │  Período: 30 dias         │  │ RESERVA DE TOKENS (só sobre o adicional) │
│ │  (definido Compliance)    │  │ R$ 200.000 ÷ R$ 40 = 5.000 tokens││
│ └───────────────────────────┘  │                                    ││
│                                │ ┌──────────────────────────────────┐││
│                                │ │ [ PAGAR RESERVA — R$ 200.000] │││
│                                │ │ Após pagamento → reativação automática│
│                                │ └──────────────────────────────────┘││
│                                └──────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

### 12.4 Founder — Dashboard (botão "Solicitar Parcela")

```text
┌── Dashboard — <Startup> ──┐
│                             │
│ Status: FUNDED              │
│ Captado: R$ 300k · Meta: R$500k│
│                             │
│ AÇÕES: [▶ Ver] [✏️ Editar] [🛡 Selos] [📋 Solicitar Parcela] ← NOVO│
│                             │
│ [📋 Solicitar Parcela] = visível SOMENTE quando│
│ o admin clicou Finalizar Definitivamente e configurou parcelas │
└─────────────────────────────┘
```

### 12.5 Founder — Formulário de Solicitação de Parcela (`/founder/campaigns/:campaignId/financeiro`)

```text
┌── Solicitar Parcela #3 — R$ 21.145,84 ──┐
│                                            │
│ Distribuição de recursos (soma = 100%):    │
│ Marketing [25%] · Dev [30%] · Infra [20%]  │
│ Pessoal [10%] · Jurídico [5%] · Caixa [10%]│
│                                            │
│ Observação: "Recursos destinados ao..."    │
│                                            │
│ [SOLICITAR PARCELA]  [Cancelar]            │
└────────────────────────────────────────────┘
```

### 12.6 Financeiro — `/financeiro/repasse/:id` (aprovar/rejeitar/marcar pago)

```text
┌── Repasse #ID — Financeiro ──┐
│                                │
│ [Aprovar] [Rejeitar] [Marcar Pago] │
│                                │
│ ┌─ Solicitação #SOL-0412 ──┐ │
│ │ Startup: Acme Tech        │ │
│ │ Parcela #3 · R$ 21.145,84│ │
│ │ Relatório: ✅ Preenchido  │ │
│ │ Comprovante: —            │ │
│ │                            │ │
│ │ [ Upload Comprovante ]    │ │
│ │ [ MARCAR COMO PAGO ] ← desabilitado sem comprovante │
│ └────────────────────────────┘ │
└──────────────────────────────────┘
```

### 12.7 Transparência — relatório do mês + comprovante

```text
┌── TRANSPARÊNCIA — <Startup> ──┐
│                                │
│ RELATÓRIO DO MÊS — Out/2025   │
│ Uso do recurso: Desenvolvimento│
│ Lucro: Sim · Marco: v2.0      │
│ Mensagem: "Lançamos..."       │
│ 📎 Comprovante parcela #3     │
│                                │
│ DISCUSSÃO                      │
│ "Como foi o aporte?" — Investidor → Founder respondeu │
└──────────────────────────────────┘
```

---

## 13. Esquema e Entidades (Proposta)

| Entidade | Campos principais | Relação |
|---|---|---|
| `PayoutProcess` | `campaignId`, `conclusionReason`, `payoutDecision`, `decisionDeadline`, `decisionAt` | 1:1 com campanha finalizada |
| `CampaignExtension` | `campaignId`, `additionalAmount`, `totalAmountShown`, `tokenReserve`, `periodDays`, `status` | 1:N com campanha |
| `Payment` (reuso) | novo tipo `TOKEN_RESERVATION_EXTENSION` | liga à CampaignExtension; statuses incluem `PENDING`, `PAID`, `CANCELED`, `EXPIRED` |
| `Installment` (reuso) | quantidade mínima 12, valor + juros configurados | ajustado à regra mensal |
| `InstallmentRequest` | `installmentId`, `campaignId`, `startupId`, `status`, `submittedAt`, `allocationPercents`, `observacao` | 1:1 com Installment; status: `REQUESTED` → `APPROVED` → `PAID` ou `REJECTED` |
| `PayoutReport` | `installmentRequestId`, `usoRecurso`, `teveLucro`, `marcoAlcancado`, `mensagemInvestidores` | 1:1 com InstallmentRequest |
| `PayoutComprovante` | `installmentRequestId`, arquivo (S3 privado) | 1:1 com InstallmentRequest |

> Decisão: **não** adicionar novos valores ao enum `CampaignStatus`; estados de processamento em entidades auxiliares.

---

## 14. Frontend — Rotas e Componentes

| Rota | Página | Componentes principais |
|---|---|---|
| `/admin/payouts` | Gestão de Repasse (Admin/Compliance) | `PayoutsScreen`, `PayoutFilters`, `PayoutSummary`, `PayoutCategory`, `PayoutDecisionCard`, `DefineParcelasModal`, `InstallmentCard`, `PayoutCategory` |
| `/founder/startups/:id/prorrogacao` | Prorrogação (founder) | `ExtensionForm`, `ReservaExtensionSummary` |
| `/founder/campaigns/:campaignId/financeiro` | Solicitação de parcela + relatório do mês | `RepasseDashboard`, `RepasseInstallmentForm`, `RelatorioMesForm` |
| `/financeiro/repasse/:repasseId` | Detalhe da solicitação (Financeiro) | `SolicitacaoDetail`, `ComprovanteUpload` |
| `/startups/:id/transparency` | Transparência (relatório + comprovante + discussão) | `RelatorioMes`, `ComprovanteCard`, `DiscussionTopics` |

---

## 15. Critérios de Aceite

- [ ] **AC-01:** Captação conclui por meta atingida (`FUNDED`) ou por tempo (período expirado → encerramento automático).
- [ ] **AC-02:** Ao concluir, o founder recebe notificação de conclusão + processamento; Admin/Compliance recebe notificação com link para a gestão de pagamentos.
- [ ] **AC-03:** Janela de decisão padrão de ∼7 dias úteis, prorrogável via Admin/Financeiro.
- [ ] **AC-04:** Decisão `PRORROGAR` dispara notificação + email ao founder com interesse/próximo passo.
- [ ] **AC-05:** Na prorrogação, a página exibe a **meta somada** (ex.: R$ 700k) e a reserva de tokens é calculada **apenas sobre o adicional** (R$ 200k).
- [ ] **AC-06:** Após o pagamento da nova reserva, a captação é **reativada automaticamente** (`OPEN`) pelo período definido pelo Compliance.
- [ ] **AC-07:** Decisão `FINALIZAR_DEFINITIVAMENTE` exige definição de parcelas com **mínimo de 12** e configuração de valores/juros pelo Financeiro.
- [ ] **AC-08:** Só é possível solicitar **1 parcela por mês**; parcelas não sacadas não expiram (seguem disponíveis nos próximos meses).
- [ ] **AC-09:** A solicitação exige o **relatório do mês** obrigatório (uso do recurso, lucro, marco, mensagem) — bloqueada sem ele.
- [ ] **AC-10:** O relatório salvo é publicado como **relatório do mês na transparência**.
- [ ] **AC-11:** O Financeiro/Admin anexa o **comprovante** e marca como pago; o comprovante aparece no relatório da transparência.
- [ ] **AC-12:** A transparência lista relatório mensal + comprovante + tópicos de discussão (perguntas do investidor → respostas do founder).
- [ ] **AC-13:** Botão "Solicitar Parcela" **só aparece** no dashboard da startup quando a configuração do repasse foi finalizada pelo Admin.
- [ ] **AC-14:** Categoria 2 em `/admin/payouts` **só exibe** startups com solicitação de parcela efetivamente criada pelo founder.
- [ ] **AC-15:** BFF GET `/api/admin/payouts` inclui `mesVigenteRecebido` para cada repasse configurado.

---

## 16. Decisões em Aberto / Riscos

- **Arredondamento de tokens** na reserva da prorrogação (inteiro para baixo vs fracionário) — precisa de decisão com Financeiro.
- **Prazo máximo de prorrogações por rodada** (limite de extensões vs teto de tempo acumulado) — recomendável definir teto (ex.: no máximo 1 extensão + teto de tempo) para compliance.
- **Incidência de juros** configurada pelo Financeiro (fluxo de parcelas) — validar regras de divulgação (transparência do custo total).
- **Limite máximo de parcelas** — config Financeiro define (testes mostram max 18); frontend deve respeitar.
- Ao **aprovar** este PRD, espelhar as novas regras em `CASE.md` (Regra de Ouro — `AGENTS.md` §10).
- **Mês vigente:** como determinar "mes vigente" no backend? Usar data atual vs `scheduledDate` da parcela? Precisa de decisão.
- **Bloqueio de duplicidade:** como impedir founder de solicitar 2 parcelas no mesmo mês? Verificação no backend no POST `/api/founder/startups/:id/repasse/installments/:id/request`.
