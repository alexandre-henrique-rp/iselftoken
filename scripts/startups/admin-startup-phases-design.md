# Admin Startup Pages — Redesenho das Fases

**Data:** 2026-09-15
**Páginas:** `/admin/startups` (tabela) · `/admin/startups/:id/1` (Fase 1) · `/admin/startups/:id/2` (Fase 2) · `/admin/startups/:id/3` (Fase 3)
**Base:** `scripts/startups/fluxo_startup.md` §4B — Visão Admin/Compliance — Etapas do Fluxo

---

## 1. Redesenho da Tabela — Coluna "Ações"

### 1.1 Antes (atual)

| Ícone | Ação | Condição |
|---|---|---|
| 👁 | Ver detalhes | Sempre → `/admin/startups/:id` |
| ✏️ | Editar | Sempre (modal) |
| 🛡 | Gerenciar selos | Sempre (modal) |
| ✅ | Aprovar | `status ∈ {pending, em_analise}` (POST inline) |
| ❌ | Rejeitar | `status ∈ {pending, em_analise}` (modal) |

### 1.2 Depois (redesenho)

| Botão | URL | Etapa | Libera ao aprovar |
|---|---|---|---|
| **Fase 1** | `/admin/startups/:id/1` | Cadastro + Reserva | Etapa 2 — Edição do Cadastro |
| **Fase 2** | `/admin/startups/:id/2` | Edição do Cadastro | Etapa 3 — Detalhes de Captação |
| **Fase 3** | `/admin/startups/:id/3` | Detalhes de Captação | Etapa 4 — Taxas e Serviços |

### 1.3 Layout na tabela

```text
| ID    │ Startup    │ Fundador │ Segmento │ Status      │ Cadastro │ Ações          │
│───────│────────────│──────────│──────────│─────────────│──────────│────────────────│
│#000123│ Acme Tech  │ João S.  │ Fintech  │ ⚠️ Em análise│ 15/08/25 │ [Fase 1][Fase 2][Fase 3]│
│#000456│ Beta Inc   │ Maria P. │ SaaS     │ ✅ Aprovada  │ 01/03/24 │ [Fase 1][Fase 2][Fase 3]│
│#000789│ Gamma Labs │ —        │ Health.. │ ❌ Rejeitada │ 22/11/23 │ [Fase 1][Fase 2][Fase 3]│
```

### 1.4 Estado dos botões por gate de pagamento

Cada botão de fase tem 3 estados visuais, determinados pelo pagamento correspondente:

| Fase | Gate | Estado visual | CSS |
|---|---|---|---|
| **Fase 1** | `TOKEN_RESERVATION` PAID | 🔓 Ativo | `bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-black` |
| **Fase 1** | Não pago | 🔒 Trancado | `bg-white/5 text-muted-foreground border-white/10 cursor-not-allowed opacity-40` + ícone lock |
| **Fase 2** | Taxa de Compliance PAID | 🔓 Ativo | `bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-black` |
| **Fase 2** | Não pago | 🔒 Trancado | `bg-white/5 text-muted-foreground border-white/10 cursor-not-allowed opacity-40` + ícone lock |
| **Fase 3** | Tudo pago (reserva + taxa + serviços) | 🔓 Ativo | `bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-black` |
| **Fase 3** | Não pago | 🔒 Trancado | `bg-white/5 text-muted-foreground border-white/10 cursor-not-allowed opacity-40` + ícone lock |

**Layout na tabela:**

```text
| ID      │ Startup    │ Fundador │ Segmento │ Status      │ Cadastro │ Ações                         │
|─────────│────────────│──────────│──────────│─────────────│──────────│───────────────────────────────│
│#000123  │ Acme Tech  │ João S.  │ Fintech  │ ⚠️ Em análise│ 15/08/25 │ [🔓Fase 1] [🔒Fase 2] [🔒Fase 3] │
│#000456  │ Beta Inc   │ Maria P. │ SaaS     │ ✅ Aprovada  │ 01/03/24 │ [🔓Fase 1] [🔓Fase 2] [🔒Fase 3] │
│#000789  │ Gamma Labs │ —        │ Health.. │ ❌ Rejeitada │ 22/11/23 │ [🔓Fase 1] [🔓Fase 2] [🔓Fase 3] │
```

### 1.5 Regras de gating

| Regra | Gate | Implementação |
|---|---|---|
| **Fase 1** só libera quando pagamento da reserva de token é confirmado | `Payment.purpose = TOKEN_RESERVATION` AND `Payment.status = PAID` | Verificar na tabela e na página Fase 1 |
| **Fase 2** só libera quando pagamento da taxa de compliance é confirmado | `Payment.purpose = TOKEN_COMPLIANCE` (ou equivalente) AND `Payment.status = PAID` | Verificar na tabela e na página Fase 2 |
| **Fase 3** só libera quando TUDO está pago | Todas as payment entries da startup com `status = PAID` | Verificar na tabela e na página Fase 3 |
| Botão trancado não é clicável | Qualquer fase com gate não atendido | `cursor-not-allowed`, `pointer-events: none`, título com razão |
| Tooltip no botão trancado | Qualquer fase | `title="Aguardando pagamento da reserva de token"` |
| Todas as 3 fases SÃO MOSTRADAS na tabela | §4B: "cada startup exibe um botão por etapa" | Visíveis mas com estado locked/unlocked |
| Fase N libera visualmente Fase N+1 para o Admin APÓS gate | §4B | Gate payment PAID (liberação automática) |

### 1.6 Gates detalhados

| Fase | Pagamento gate | Campo verificado | Quando desbloqueia |
|---|---|---|---|
| Fase 1 | Token Reservation | `Payment.where(purpose=TOKEN_RESERVATION).status=PAID` | Pagamento pix/reserva confirmado |
| Fase 2 | Taxa Compliance | `Payment.where(purpose=COMPLIANCE_FEE).status=PAID` | Taxa de compliance paga |
| Fase 3 | Tudo pago | Todas payments `status=PAID` | Reserva + taxa + serviços pagos |

**Nota:** Se uma startup não tem um payment de determinado tipo (ex.: taxas extras não se aplicam), esse gate é considerado automaticamente atendido para aquela fase. Gate check:
- Fase 1 gate: TOKEN_RESERVATION existe AND PAID = true; NÃO existe = gate skip (pago por default)
- Fase 2 gate: COMPLIANCE_FEE existe AND PAID = true; NÃO existe = gate skip
- Fase 3 gate: ALL payments existent have PAID = true; NO payments = gate skip

### 1.7 Layout do botão com gate

```text
🔓 Fase 1    🔒 Fase 2    🔒 Fase 3
(pago)       (aguardando   (aguardando
              taxa)         tudo)

Fase 1: title="Pagamento da reserva confirmado · 15/08/2025 14:30"
Fase 2: title="Aguardando pagamento da taxa de compliance"
Fase 3: title="Aguardando confirmação de todos os pagamentos"
```

---

## 2. Fase 1 — `/admin/startups/:id/1` — Cadastro + Reserva

### 2.1 Layout

```text
┌──────────────────────────────────────────────────────────────────────┐
│ ← Voltar à gestão de startups                                        │
│                                                                      │
│  ═══  Etapa 1 — Cadastro + Reserva                              │
│  FASE 1 — Cadastro + Reserva                                       │
│  Startup: <Nome> · #000123                                        │
│  Status da startup: ⚠️ Em análise                                │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─ DADOS DO WIZARD (read-only) ──────────────────────────────┐   │
│  │                                                                │   │
│  │  ┌─ Identidade ─────────────────────────────────────┐  │   │
│  │  │  Nome Fantasia: Acme Tech                       │  │   │
│  │  │  Razão Social: Acme Technology Ltda.            │  │   │
│  │  │  CNPJ: 12.345.xxx/xxxx-xx                       │  │   │
│  │  │  Data de Abertura: 01/03/2024                   │  │   │
│  │  │  País: BRA · Categoria: Fintech                 │  │   │
│  │  │  Área de Atuação: Inteligência Artificial       │  │   │
│  │  │  Estágio: MVP                                   │  │   │
│  │  │  Descrição: [texto]                             │  │   │
│  │  │  Logo: [imagem] · Pitch Deck: [PDF]             │  │   │
│  │  │  Vídeo Pitch: [link YouTube]                    │  │   │
│  │  │  Site: [url] · LinkedIn: [url]                  │  │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                                │   │
│  │  ┌─ Dados Bancários ────────────────────────────────┐  │   │
│  │  │  Titular: João Silva                              │  │   │
│  │  │  Banco: Itaú · Tipo: PF                           │  │   │
│  │  │  Agência: 1234 · Conta: 56789-1 · Dígito: 0      │  │   │
│  │  │  Chave PIX: cpf@email                             │  │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                                │   │
│  │  ┌─ Captação & Valuation ───────────────────────────┐  │   │
│  │  │  Meta de Captação: R$ 500.000,00                  │  │   │
│  │  │  Equity Oferecido: 10%                            │  │   │
│  │  │  Moeda: R$ (Real)                                 │  │   │
│  │  │  Fast Track: [✓] / [ ]                            │  │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ COMPROVANTE DE PAGAMENTO ──────────────────────────────┐       │
│  │                                                                │       │
│  │  Último pagamento:                                             │       │
│  │  ┌────────────────────────────────────────────────────┐       │       │
│  │  │  Data/Hora: 15/08/2025 14:30:22                    │       │       │
│  │  │  Valor: R$ 1.000,00 (10.000 tokens × R$ 0,10)     │       │       │
│  │  │  Status: ✅ PAID                                   │       │       │
│  │  │  Método: Pix                                      │       │       │
│  │  │  Transaction ID: txn_xxx                           │       │       │
│  │  └────────────────────────────────────────────────────┘       │       │
│  │                                                                │       │
│  │  Histórico de status:                                          │       │
│  │  ┌────────────────────────────────────────────────────┐       │       │
│  │  │  PENDING  →  PAID  ✅  (15/08/2025 14:30)         │       │       │
│  │  │  EXPIRED  →  reembolsado (não se aplica)          │       │       │
│  │  │  FAILED   →  nunca ocorreu                         │       │       │
│  │  │  CANCELED →  nunca ocorreu                         │       │       │
│  │  └────────────────────────────────────────────────────┘       │       │
│  │                                                                │       │
│  │  Pagamentos gerados:                                           │       │
│  │  [1] Pix PENDING (12/08/2025) → PAID (15/08/2025)            │       │
│  │  [2] Pix EXPIRED (10/08/2025) → Gerar Novo Pagamento          │       │       │
│  │                                                                │       │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ AÇÕES DE APROVAÇÃO ──────────────────────────────────┐        │
│  │                                                                │        │
│  │  ⚠️ Gate: Etapa preenchida + pagamento confirmado → Etapa 2 liberada automaticamente
│  │                                                                │        │
│  │  [✅ Aprovar Etapa 1]    [❌ Rejeitar / Solicitar ajustes]  │        │
│  │                                                                │        │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Seções detalhadas

#### Dados do Wizard (read-only)

| Sub-seção | Fonte dos dados | Condição de exibição |
|---|---|---|
| Identidade | Wizard Etapa 1 (Identidade) | Sempre (se startup existe) |
| Dados Bancários | Wizard Etapa 2 (Bancário) | Se dados preenchidos |
| Captação & Valuation | Wizard Etapa 3 (Captação) | Se dados preenchidos |
| Logo/Pitch Deck | Upload do founder | Se existem arquivos |

**Layout:** 3 cards em coluna (mobile) ou grid 3 colunas (desktop).
**Card styling:** `glass-panel rounded-3xl p-4 sm:p-8` + título + ícone (IdCard, Landmark, Lightbulb).

#### Comprovante de Pagamento

**Último pagamento (card principal):**

| Campo | Label | Valor |
|---|---|---|
| Data/Hora | "Pagamento em" | DD/MM/AAAA HH:MM:SS (pt-BR) |
| Valor | "Valor" | `formatBRL` + calculado (tokens × preço) |
| Status | "Status" | Badge: PENDING (warning) / PAID (primary) / EXPIRED (destructive) / FAILED (destructive) / CANCELED (muted) |
| Método | "Método" | Pix / cartão / etc. |
| Transaction ID | "ID da transação" | mono font |

**Histórico de status (card secundário):**

Timeline visual mostrando todos os status do Payment `TOKEN_RESERVATION` em ordem cronológica:

```text
PENDING ──→ PAID ✅    (se pago)
   \
    └──→ EXPIRED       (se expirou)
   \
    └──→ FAILED        (se falhou)
   \
    └──→ CANCELED      (se cancelado)
```

**Pagamentos gerados (lista):**

Se houve múltiplos pagamentos (ex.: founder gerou novo pagamento após expirar), listar todos com:
- Número sequencial [1], [2], [3]...
- Tipo (Pix/PIX)
- Status inicial → Status final com datas
- Se expirou/generou novo: indicador visual

#### Ações de Aprovação

| Botão | Ativo quando | Gate | Ação | Design |
|---|---|---|---|---|
| ✅ Aprovar Etapa 1 | Wizard completo + `Payment TOKEN_RESERVATION` = **PAID** | Pagamento confirmado | POST aprovar Etapa 1 → **registra validação dos dados** (não bloqueia Etapa 2 — liberação automática via payment PAID) | `bg-primary text-black hover:bg-primary/90` |
| ❌ Rejeitar / Solicitar ajustes | Sempre (independente de pagamento) | Sem gate | Modal com justificativa (min 20 chars) | `bg-destructive text-white hover:bg-destructive/90` |

**Gate visual:** Se pagamento não confirmado, mostrar banner abaixo do comprovante:
```text
🔒 Pagamento da reserva ainda não confirmado.
A Etapa 2 será liberada automaticamente quando o pagamento for confirmado (PAID).
Status atual: PENDING desde 12/08/2025 09:00
```

Quando o pagamento é confirmado (PAID), a Etapa 2 fica disponível para o founder automaticamente (sem necessidade de aprovação). O botão ✅ Aprovar registra a validação dos dados como auditoria/qualidade.

**Fluxo no botão Aprovar:**
1. Admin clica ✅ Aprovar
2. Modal de confirmação: "Aprovar Etapa 1 — Cadastro + Reserva? Isso registra a validação dos dados como auditoria (não bloqueia a Etapa 2 — liberação automática via pagamento)."
3. Confirma → POST validação → toast sucesso "Dados validados com sucesso" → Fase 2 já está disponível para o founder (pagamento confirmado)
4. Se wizard incompleto ou pagamento PENDING → toast erro: "Etapa incompleta ou pagamento pendente"

### 2.3 Regras (per fluxo_startup.md §4B)

| Regra | Implementação |
|---|---|
| Mostrar dados como no wizard (identidade, bancário, captação & valuation) | 3 cards read-only, sem informação extra |
| Painel de pagamento mostra se pagou ou não | Badge PAID/PENDING/EXPIRED/FAILED/CANCELED |
| Segundo pagamento indica erro/expiração da primeira | Lista "Pagamentos gerados" com indicador |
| Histórico de status (PENDING, EXPIRED, PAID, FAILED, CANCELED) | Timeline visual |
| Aprovar habilitado SOMENTE com etapa completa + paga | Verificar wizard completo + Payment PAID |
| Rejeitar com justificativa | Modal com textarea min 20 chars |
| Pagamento PAID → Etapa 2 liberada automaticamente para o founder | Payment TOKEN_RESERVATION = PAID → transição automática (sem gate de aprovação) |
| Prazo Pix 24h para reserva | Mostrar countdown/badge no comprovante |

### 2.4 Dados do Payment `TOKEN_RESERVATION` necessários

A página Fase 1 precisa dos seguintes dados do payment:

| Campo | Descrição | Fonte |
|---|---|---|
| `id` | ID do pagamento | Payment table |
| `status` | PENDING/PAID/EXPIRED/FAILED/CANCELED | Payment table |
| `amount` | Valor da reserva (tokens × authFeePerToken) | Payment table |
| `createdAt` | Data de criação do pagamento | Payment table |
| `paidAt` | Data do pagamento confirmado | Payment table |
| `expiresAt` | Expiração (createdAt + 24h) | Payment table |
| `paymentMethod` | Pix/cartão | Payment table |
| `transactionId` | ID da transação financeira | Payment table |
| `history` | Histórico de status com timestamps | Auditoria / PaymentStatusLog |

### 2.5 Componentes necessários (novos)

| Component | Path | Função |
|---|---|---|
| `PhaseHeader` | `app/components/admin/phase/phase-header.tsx` | Breadcrumb + título da fase + status startup |
| `WizardDataCard` | `app/components/admin/phase/wizard-data-card.tsx` | Card read-only com dados do wizard por seção |
| `PaymentReceipt` | `app/components/admin/phase/payment-receipt.tsx` | Comprovante: último pagamento + dados |
| `PaymentHistory` | `app/components/admin/phase/payment-history.tsx` | Timeline de status + lista de pagamentos |
| `PhaseApprovalActions` | `app/components/admin/phase/phase-approval.tsx` | Botões Aprovar/Rejeitar + gate visual |
| `PhaseApproveModal` | `app/components/admin/phase/phase-approve-modal.tsx` | Modal de confirmação de aprovação |
| `PhaseRejectModal` | `app/components/admin/phase/phase-reject-modal.tsx` | Modal de rejeição com justificativa |

### 2.6 Route shell (admin-startup-phase1.tsx)

```text
Meta + Loader (GET /api/admin/startups/:id + GET /api/admin/startups/:id/payment)
→ PhaseHeader
→ WizardDataCard (3 seções)
→ PaymentReceipt + PaymentHistory
→ PhaseApprovalActions
```

---

## 3. Fase 2 — `/admin/startups/:id/2` — Edição do Cadastro

**Gate:** Taxa de Compliance **PAID** — Fase 2 só libera quando a taxa de compliance foi paga

**Status:** A ser detalhado quando Fase 2 for iniciada.

**Conteúdo esperado** (per fluxo_startup.md §4B):
- Etapa 1 já aprovada (auditoria) + Seções 2 completas: Identidade, Localização, Bancário, Documentos, Termo de Adesão
- Painel de pagamento da Taxa de Compliance (PENDING/PAID)
- Etapa 1 aprovada + Etapa 2 aprovada → libera Etapa 3

**Aprovar Etapa 2 gate:**
| Botão | Ativo quando | Gate |
|---|---|---|
| ✅ Aprovar Etapa 2 | **Etapa 1 já aprovada** + Seções 2 completas + `Payment TAXA_COMPLIANCE` = **PAID** | Etapa 1 aprovada + pagamento da taxa confirmado |
| ❌ Rejeitar | Sempre | Sem gate |

---

## 4. Fase 3 — `/admin/startups/:id/3` — Detalhes de Captação

**Gate:** **Tudo pago** — Fase 3 só libera quando todos os pagamentos (reserva + taxa + serviços) estão confirmados

**Status:** A ser detalhado quando Fase 3 for iniciada.

**Conteúdo esperado** (per fluxo_startup.md §4B):
- Tese de negócio, alocação de recursos, dividendos, benefícios, afiliação
- Painel de pagamento (se aplicável)
- Aprovar → libera Etapa 4

**Aprovar Etapa 3 gate:**
| Botão | Ativo quando | Gate |
|---|---|---|
| ✅ Aprovar Etapa 3 | Todas payments = **PAID** | Reserva + taxa + serviços pagos |
| ❌ Rejeitar | Sempre | Sem gate |

**Checklist de pagamento para Fase 3:**
| Pagamento | Status esperado |
|---|---|
| Token Reservation (reserva) | ✅ PAID |
| Taxa de Compliance | ✅ PAID |
| Serviços extras (Fast Track, etc.) | ✅ PAID (se existir) |

---

## 5. Wireframe da tabela — Ações atualizadas

### 5.1 Tabela desktop (atual)

```text
| ID      │ Startup    │ Fundador │ Segmento │ Status      │ Cadastro │ Ações                    │
|─────────│────────────│──────────│──────────│─────────────│──────────│──────────────────────────│
│#000123  │ Acme Tech  │ João S.  │ Fintech  │⚠️ Em análise│ 15/08/25 │ [Fase 1][Fase 2][Fase 3] │
│#000456  │ Beta Inc   │ Maria P. │ SaaS     │✅ Aprovada  │ 01/03/24 │ [Fase 1][Fase 2][Fase 3] │
│#000789  │ Gamma Labs │ —        │ Health.. │❌ Rejeitada │ 22/11/23 │ [Fase 1][Fase 2][Fase 3] │
```

### 5.2 Tabela mobile (cards atualizados)

```text
┌──────────────────────────────────┐
│ [Logo]  Acme Tech        ⚠️ Em  │
│         #000123                    │
│  Fundador: João S.    Cad: 15/08│
│  Segmento: Fintech    Score: 85  │
│                                  │
│  [Fase 1] [Fase 2] [Fase 3]     │
└──────────────────────────────────┘
```

### 5.3 Mudanças no `AdminStartupTable`

| Item | Atual | Novo |
|---|---|---|
| Ações por linha | 👁 ✏️ 🛡 ✅ ❌ (5 ícones) | [Fase 1] [Fase 2] [Fase 3] (3 links/botões) |
| Visual | Ícones com tooltips | Texto "Fase N" em pill/badge |
| Link | 👁 → `/admin/startups/:id` | Fase 1 → `/admin/startups/:id/1` etc. |
| Largura | 5 ícones | 3 botões de texto (mais compacto) |
| Acessibilidade | `aria-label="Ver detalhes"` | `aria-label="Fase 1 — Cadastro + Reserva"` |

---

## 6. Componentes a criar/modificar

### 6.1 Novos componentes (Fase 1 page)

| Component | Path | Linhas estimadas |
|---|---|---|
| `PhaseHeader` | `app/components/admin/phase/phase-header.tsx` | ~30 |
| `WizardDataCard` | `app/components/admin/phase/wizard-data-card.tsx` | ~80 |
| `PaymentReceipt` | `app/components/admin/phase/payment-receipt.tsx` | ~60 |
| `PaymentHistory` | `app/components/admin/phase/payment-history.tsx` | ~70 |
| `PhaseApprovalActions` | `app/components/admin/phase/phase-approval.tsx` | ~50 |
| `PhaseApproveModal` | `app/components/admin/phase/phase-approve-modal.tsx` | ~40 |
| `PhaseRejectModal` | `app/components/admin/phase/phase-reject-modal.tsx` | ~50 |
| Route shell | `app/routes/private/admin.startup-phase1.tsx` | ~20 |

### 6.2 Modificações (tabela)

| Component | Mudança |
|---|---|
| `AdminStartupTable.tsx` | Substituir 5 ações por 3 botões Fase |
| `AdminStartupTable.tsx` — Actions sub-component | Substituir `StartupActions` por `PhaseActions` |
| `admin-startups-content.tsx` | Sem mudanças (shell 4 estados mantido) |

### 6.3 Novas rotas necessárias

| Rota | Arquivo | Descrição |
|---|---|---|
| `/admin/startups/:id/1` | `app/routes/private/admin.startup-phase1.tsx` | Fase 1 — Cadastro + Reserva |
| `/admin/startups/:id/2` | `app/routes/private/admin.startup-phase2.tsx` | Fase 2 — Edição do Cadastro (TBD) |
| `/admin/startups/:id/3` | `app/routes/private/admin.startup-phase3.tsx` | Fase 3 — Detalhes de Captação (TBD) |

### 6.4 BFFs necessários para Fase 1

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/admin/startups/:id` | GET | Dados da startup (já existe) |
| `/api/admin/startups/:id/payment` | GET | Dados do Payment TOKEN_RESERVATION (novo) |
| `/api/admin/startups/:id/approve-phase-1` | POST | Aprovar Etapa 1 (novo ou reusar existente) |
| `/api/admin/startups/:id/reject-phase-1` | POST | Rejeitar Etapa 1 (novo ou reusar existente) |

---

## 7. Decisões de Design

| Decisão | Justificativa |
|---|---|
| 3 botões Fase em vez de 5 ações | Simplifica: visão por etapa é mais clara que ação individual |
| Fase N como link (não modal) | Página cheia de dados não cabe em modal; link permite navegação direta |
| Wizard data em 3 cards separados | Alinha com a estrutura do wizard (3 etapas: Identidade, Bancário, Captação) |
| Payment receipt como card separado | Deve ser destacado — é o gate de transição entre fases |
| Timeline de status vs lista de pagamentos | Timeline mostra FLUXO; lista mostra REEMBOLSO/REEMISSÃO — complementares |
| Badge PAID em primary, EXPIRED em destructive | Coerência com status badges da tabela |
| Gate visual explícito | Evita tentativas de aprovar etapa incompleta; payment PAID libera próxima fase automaticamente (fluxo_startup.md §4B) |
| Aprovar como link direto (não form inline como antes) | Fase 1 é página inteira; aprovação é decisiva → modal de confirmação |
| Rejeitar mantém modal com justificativa | LGPD: razão da rejeição deve ser documentada (min 20 chars) |

---

## 8. Pendências

| Item | Prioridade | Notas |
|---|---|---|
| Fase 2 page design | Alta | Etapa 2 — Edição do Cadastro: 5 abas + taxa compliance |
| Fase 3 page design | Alta | Etapa 3 — Captação: tese, alocação, dividendos, benefícios |
| Endpoint GET payment por startup | Média | Precisa verificar se já existe no backend |
| Endpoint aprovar/rejeitar por fase | Média | Verificar se `/api/admin/startups/:id/status` cobre |
| Atualizar `admin-startup-table.tsx` | Alta | Substituir StartupActions por PhaseActions |
| Testes E2E para fluxo Fase 1 | Média | Criar em `test/e2e/flows/` |
| Atualizar `scripts/startups/admin-startup-pages-design.md` | Média | Incluir Fase 1/2/3 na tabela |
