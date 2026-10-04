# PRD — Recebimento da Captação (Processamento, Prorrogação e Parcelas)

**ID:** PAYOUT-CAPTACAO-01  
**Versão:** 1.0  
**Data:** 2026-09-14  
**Status:** Rascunho para aprovação  
**Prioridade:** Alta  
**Módulo:** Marketplace / Captação / Repasse de Fundos

---

## 1. Resumo Executivo

A **conclusão da captação** pode ocorrer por **meta atingida** (100% dos tokens vendidos) ou por **tempo** (período definido pelo Compliance expirou). A partir da conclusão:

1. O **founder** é notificado de que a captação concluiu e os valores estão **em processamento** (janela padrão de ∼7 dias, prorrogável).
2. O **Admin/Compliance** é notificado com um **link para a página de gestão de pagamentos da startup**, onde avalia o que foi captado, tokens vendidos e data de início da captação, podendo decidir:
   - **Prorrogar a captação** (identificou potencial): o founder recebe notificação + email com proposta, define a nova captação **somando o valor adicional ao captado**, paga a **nova reserva de tokens calculada apenas sobre o valor adicional**, e o sistema **reativa automaticamente** a captação por um novo período definido pelo Compliance.
   - **Finalizar definitivamente**: o Compliance define as **parcelas** (mínimo 12, com juros/configuração do financeiro), liberando a **página de solicitação de parcela** para o founder.
3. O founder pode solicitar **1 parcela por mês** (não acumulável no mesmo mês; parcelas não sacadas ficam disponíveis nos meses seguintes, sem expirar). Para solicitar, ele precisa preencher o **relatório do mês** (destinação do recurso conforme a captação, se houve lucro, se alcançou marco, mensagem aos investidores), que é **publicado no relatório mensal da página de transparência**.
4. O **Financeiro/Admin** lista as **solicitações de parcelas**, posta o **comprovante do pagamento** e marca como pago. O comprovante é exibido no relatório da página de transparência.
5. A **página de transparência** (disponível para o founder e para os investidores) apresenta o **relatório mensal + comprovante** e os **tópicos de discussão**, onde investidores fazem perguntas e o founder responde.

Este PRD **estabelece a especificação dessa etapa**, referenciando e estendendo os PRDs já concluídos de repasse e transparência.

---

## 2. Contexto e Estado Atual

| Artefato existente | O que cobre | Lacuna |
|---|---|---|
| `fluxo_startup.md` (§7–8) | Conclusão (`FUNDED`/`CLOSED`), requisição de parcelas, SLA 48h | Sem prorrogação, sem notificações de conclusão, sem parcelamento mínimo/juros, sem relatório obrigatório, sem comprovante |
| `concluido/PRD_FOUNDER_FINANCEIRO_REPASSE.md` | Página do founder `/founder/startups/:id/financeiro` (parcelas, solicitar, resubmit) | Não contempla o desenho novo de 1 parcela/mês + relatório obrigatório |
| `concluido/PRD_FINANCEIRO_REPASSE_FUNDOS.md` | Backend do repasse (Compliance delibera N parcelas; Financeiro configura valores) | A ser alinhado com o mínimo de 12 parcelas e juros |
| `concluido/PRD_PAGINA_TRANSPARENCIA.md` | Página de transparência (relatórios + discussão/upvotes) | A ser ampliada com comprovante de pagamento das parcelas |

**Regras de negócio novas (a espelhar em `CASE.md` quando o PRD for aprovado):** as regras detalhadas nas seções 4–11 deste documento.

---

## 3. Objetivos e Não-objetivos

### Objetivos

| # | Objetivo |
|---|---|
| O1 | Definir a máquina de estados da conclusão por meta OU tempo e a decisão do Admin/Compliance (prorrogar/finalizar). |
| O2 | Definir notificações/emails da conclusão (founder, Admin/Compliance) e da prorrogação. |
| O3 | Definir a prorrogação com meta somada e **reserva de tokens calculada apenas sobre o valor adicional**. |
| O4 | Definir o parcelamento (mín. 12 parcelas, juros/config do financeiro) e a regra de **1 parcela/mês com relatório obrigatório**. |
| O5 | Definir a página financeira (solicitações + comprovante) e a exibição do comprovante na transparência. |
| O6 | Integrar a transparência (relatório mensal + tópicos de discussão) para founder e investidores. |

### Não-objetivos (fora deste PRD)

- ❌ Chat 1-1 / mensagens assíncronas — segue a decisão revertida de `PRD_PAGINA_TRANSPARENCIA.md` (discussão por tópicos, já em `CASE.md`).
- ❌ Investimento secundário/marketplace de tokens — escopo separado.
- ❌ Criptografia ponta-a-ponta dos relatórios.
- ❌ Cálculo automático de juros compostos — o **Financeiro configura** valores/juros por parcela (modelo flexível do repasse já existente).

---

## 4. Máquina de Estados da Conclusão

### 4.1 Modos de conclusão

```
                    ┌─────────────────────────────┐
                    │      CAMPANHA  OPEN         │
                    └───────────┬─────────────────┘
                                │
            ┌───────────────────┴───────────────────┐
            │                                       │
   (meta atingida: 100% tokens)             (período do Compliance
            │                              expirou por tempo)
            ▼                                       ▼
        FUNDED                              Conclusão por Tempo
            │                                       │
            └───────────────┬───────────────────────┘
                            ▼
              AWAITING_PAYOUT_DECISION
        (valores em processamento, ∼7 dias úteis,
         janela prorrogável pelo Admin/Financeiro)
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
   [PRORROGAR]                       [FINALIZAR DEFINITIVAMENTE]
   (ver seção 6)                    (ver seção 7 → parcelas)
```

- **Meta atingida:** `OPEN → FUNDED` (100% dos tokens vendidos; investidores não podem mais comprar).
- **Por tempo:** ao expirar o período definido pelo Compliance, a captação é **encerrada automaticamente** (sem cancelamento manual do founder) e segue para processamento — mesmo que não tenha atingido 100%.
- Em ambos os casos a startup entra no estado **`AWAITING_PAYOUT_DECISION`** (processamento).

### 4.2 Decisão do Admin/Compliance (janela ∼7 dias, prorrogável)

- Padrão: **7 dias úteis** para o Admin/Compliance decidir. A janela pode ser **prorrogada** via configuração/`Admin/Financeiro` (modelo de SLA configuração, alinhado ao fluxo de repasse).
- Enquanto estiver em processamento, não há novas vendas, não há prorrogação e não há parcelas.

### 4.3 Campo de decisão registrado na campanha/processo

| Campo | Tipo | Exemplo |
|---|---|---|
| `conclusionReason` | enum | `META_ATINGIDA` \| `TEMPO_EXPIRADO` |
| `payoutDecision` | enum | `PRORROGAR` \| `FINALIZAR_DEFINITIVAMENTE` (nulo enquanto não decidido) |
| `payoutDecisionAt` | DateTime | preenchido pela decisão |
| `decisionDeadline` | DateTime | = conclusão + 7 dias úteis (prorrogável) |

> **Decisão arquitetural (consistente com `PRD_COMPLIANCE_STARTUP_CAMPANHA`):** manter os 6 status atuais do enum `CampaignStatus` (`DRAFT, OPEN, PAUSED, CLOSED, FUNDED, PAID_OUT`). O estado de processamento/decisão é representado por **entidades auxiliares** (`PayoutProcess` / `CampaignExtension`), e não por novos valores no enum.

---

## 5. Notificações e Comunicações

### 5.1 Ao concluir a captação

| Destinatário | Canal | Conteúdo | Ação / CTA |
|---|---|---|---|
| **Founder** | Notificação in-app + email | "Sua captação foi concluída! Os valores estão sendo processados." | Sem CTA obrigatório; exibir ao dashboard |
| **Admin/Compliance** | Notificação in-app | "A captação da startup <nome> finalizou" | Link para **Página de Gestão de Pagamentos da Startup** (seção 6) |

- Texto informa que **esta etapa pode levar cerca de 7 dias** e **pode ser prorrogada**.
- A notificação do Admin/Compliance inclui também um aviso de **prazo de decisão** (deadline) para não encerrar pendente.

### 5.2 Ao prorrogar (decisão Admin/Compliance = PRORROGAR)

| Destinatário | Canal | Conteúdo | Ação / CTA |
|---|---|---|---|
| **Founder** | Notificação in-app + email | "Identificamos potencial em sua captação! Se tiver interesse em prorrogar, clique para definir a nova captação." | CTA → **Página de Prorrogação** (seção 6.3) |
| **Founder** | Notificação in-app | Nova reserva paga → "Captação reativada!" | Sem CTA (status `OPEN`) |

### 5.3 Ao finalizar definitivamente

| Destinatário | Canal | Conteúdo | Ação / CTA |
|---|---|---|---|
| **Founder** | Notificação in-app + email | "Captação finalizada. Suas parcelas foram liberadas (Nx, cronograma mensal)." | CTA → Página de solicitação de parcela (seção 8) |
| **Founder** | Notificação in-app | Parcela marcada como paga pelo Financeiro | CTA → Transparência (comprovante disponível) |

### 5.4 Padrão geral (consistente com o fluxo)

As notificações são disparadas **ao final de cada etapa** seguindo o padrão: (a) conclusão, (b) próximos passos, (c) pendência/prazo financeiro (quando houver), (d) notificação específica de pagamento quando `PAID`.

---

## 6. Página de Gestão de Pagamentos da Startup (Admin/Compliance)

**Rota:** `/admin/startups/:id/pagamentos` (área Admin/Compliance) — link direto da notificação de conclusão.

### 6.1 Dados exibidos

| Dado | Fonte |
|---|---|
| Valor captado | Campanha (`amountRaised`) |
| Meta da captação | Campanha (`targetAmount`) |
| Tokens vendidos | Contagem de tokens emitidos da rodada |
| Data de início da captação | `Campaign.startedAt` |
| Data de conclusão / motivo | `conclusionReason` + `concludedAt` |
| Status atual | `FUNDED` / processo de payout |

### 6.2 Ações disponíveis

- **Prorrogar Captação** → inicia o fluxo da seção 6.3 (define novo período + dispara proposta ao founder).
- **Finalizar Definitivamente** → abre o bloco de **definição de parcelas** (seção 7), e após confirmar, libera a página de solicitação do founder.

### 6.3 Fluxo de Prorrogação

```
Admin/Compliance decide PRORROGAR
   ↓ define novo período da extensão (ex.: +30/60 dias)
   ↓ dispara notificação + email ao founder ("identificamos potencial... interesse?")
Founder acessa a Página de Prorrogação `/founder/startups/:id/prorrogacao`
   ↓ define o valor ADICIONAL (ex.: R$ 200.000,00)
   ↓ sistema CALCULA a NOVA META SOMADA (ex.: R$ 500k → R$ 700k) — somente leitura
   ↓ sistema CALCULA a RESERVA DE TOKENS SOMENTE SOBRE O VALOR ADICIONAL
   ↓ founder paga a nova reserva (mesmo fluxo do checkout da Etapa 1: Pix 24h)
   ↓ pagamento confirmado (PAID)
   ↓ sistema REATIVA automaticamente a captação (OPEN)
   ↓ novo prazo = período definido pelo Compliance
```

**Cálculo da nova meta e da reserva (exemplo):**

| Item | Valor |
|---|---|
| Meta inicial | R$ 500.000,00 |
| Adicional definido na prorrogação | + R$ 200.000,00 |
| **Nova meta exibida na página** | **R$ 700.000,00** (read-only, auto-somada) |
| Preço do token (oficial, config) | R$ 40,00 |
| **Reserva de tokens da prorrogação** | **R$ 200.000,00 ÷ R$ 40,00 = 5.000 tokens** |
| Período de reativação | Definido pelo Compliance (ex.: 30/60 dias) |

**Regras:**
- A reserva é calculada **somente sobre o valor adicional**, mesmo que a página exiba a meta total somada.
- O founder **não edita** a meta somada nem o cálculo de tokens — são derivados.
- Enquanto a reserva da extensão não for paga, a campanha permanece sem reativação (não volta para `OPEN`).
- A reativação é **automática** após confirmação do pagamento (mesmo handler de `PAID` do fluxo de pagamento).
- Não há segunda cobrança da Taxa de Compliance na prorrogação (contexto da Central de Pendências/serviços).

---

## 7. Parcelas (Mínimo 12, Juros/Config Financeiro)

### 7.1 Composição do parcelamento

- Ao **finalizar definitivamente**, o Compliance define a **quantidade de parcelas** (N, **mínimo de 12**).
- O **Financeiro configura** valores e eventuais **juros** por parcela (modelo flexível, coerente com `PRD_FINANCEIRO_REPASSE_FUNDOS`).
- O **total a liberar** corresponde ao valor captado (base + extensão, quando houve prorrogação).

### 7.2 Cronograma e regra de 1 parcela/mês

| Regra | Descrição |
|---|---|
| Frequência | **1 parcela por mês** |
| Não cumulativo | Não é possível sacar mais de 1 parcela no mesmo mês |
| Parcela não sacada | **Não expira** — "vai para o mês seguinte": continua disponível em meses futuros, sempre respeitando o limite de 1/mês |
| Relatório obrigatório | Para solicitar a parcela do mês, o founder deve ter preenchido o **relatório do mês** (seção 8.1) |
| SLA | Manutenção do SLA configurável para análise (o atual de 48h é base; janela de ∼7 dias de processamento é do payout, não da parcela) |

### 7.3 Status de cada parcela

```
AWAITING_REQUEST → REQUESTED → APPROVED → PAID
                        ├→ REJECTED → (resubmit)
```

Reuso dos status e endpoints de repasse existentes, com o acréscimo do **comprovante** (seção 9) e da regra mensal + relatório (seção 8).

---

## 8. Página de Solicitação de Parcela (Founder)

**Rota:** `/founder/startups/:id/financeiro` (evolução da página atual de repasse).

### 8.1 Form — Solicitação da parcela do mês

| Campo | Label | Tipo | Validação |
|---|---|---|---|
| installments | Parcela a resgatar | Select/Stepper | Somente a parcela disponível do mês atual |
| valorSolicitado | Valor a receber | Texto (R$) | Calculado (valor + juros configurados) |
| dadosBancarios | Dados bancários para recebimento | Objeto | Titular, banco, agência, conta, dígito |

### 8.2 Form — Relatório do mês (obrigatório para solicitar)

| Campo | Label | Tipo | Validação |
|---|---|---|---|
| usoRecurso | Para onde o recurso será utilizado | Textarea | Obrigatório; alinhado às categorias de **alocação da captação** (seção 3A do fluxo) |
| teveLucro | A startup teve lucro neste período? | Radio (Sim/Não) | Obrigatório |
| marcoAlcancado | Alcançou algum marco/desenvolvimento? | Radio (Sim/Não) + Textarea opcional | Obrigatório o Sim/Não |
| mensagemInvestidores | Mensagem para os investidores | Textarea | Obrigatório (torna-se a "mensagem do mês" na transparência) |

- Ao **salvar**, o relatório é **publicado como relatório do mês na página de transparência** (seção 10).
- Sem relatório do mês preenchido/salvo, a solicitação da parcela fica **bloqueada** (relatório obrigatório).

---

## 9. Página do Financeiro/Admin — Solicitações e Comprovante

**Rota:** `/financeiro/repasse` (lista) e `/financeiro/repasse/:solicitacaoId` (detalhe).

- **Listar** todas as solicitações de parcelas (status, startup, parcela, valor, data).
- No **detalhe**: o Financeiro/Admin visualiza a solicitação completa (form + relatório do mês), **anexa o comprovante do pagamento** e **marca como paga**.
- O **comprovante** fica disponível para exibição no **relatório da página de transparência** (seção 10).

| Ação | Campo |
|---|---|
| comprovante | Upload (PDF/imagem, validado MIME/tamanho — padrão de uploads do AGENTS.md) |
| marcarPago | Status da parcela → `PAID` + TXID opcional |

---

## 10. Página de Transparência (Founder + Investidores)

**Rota:** `/startups/:id/transparency`

- **Quem vê:** founder e investidores (token holders) da startup. Sem tokens → acesso negado (regra vigente da transparência).
- **Relatório mensal:** publica o relatório do mês salvo na solicitação de parcela (uso do recurso, lucro, marco, mensagem do mês).
- **Comprovante:** o comprovante anexado pelo Financeiro aparece **no relatório** correspondente.
- **Tópicos de discussão:** investidores fazem perguntas em tópicos e o **founder responde dentro do tópico** (modelo de `CASE.md` — [Transparência] Discussão e Relatório Vigente). A "mensagem do mês" do relatório complementa a discussão.

---

## 11. Fluxo Ponta a Ponta

```
OPEN ──(meta 100%)──► FUNDED ◄──(período expirado)──── OPEN
        │                                           │
        └───────────► AWAITING_PAYOUT_DECISION ◄─────┘
                           (∼7 dias, prorrogável)
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
       PRORROGAR                    FINALIZAR DEFINITIVAMENTE
            │                             │
   Founder define adicional               │
   meta somada (read-only)                │
   reserva sobre o adicional              │
   paga reserva new                       │
            │                             │
   REATIVAÇÃO AUTOMÁTICA                  ▼
   OPEN (novo período)         Parcelas (N ≥ 12, juros/config)
                                    │
                          Página de solicitação (founder)
                                    │
                  Requisito: relatório do mês (obrigatório)
                                    │
   1 parcela/mês (não sacada → rola p/ próx. mês)
                                    │
                  Financeiro: comprovante + marcar pago
                                    │
                  Transparência: relatório + comprovante + discussão
```

---

## 12. Wireframes

### 12.1 Admin/Compliance — Gestão de Pagamentos da Startup (decisão)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Notificações                    GESTÃO DE PAGAMENTOS — <Startup>          │
├──────────────────────────────────────────────────────────────────────────────┤
│ ⚠ Janela de decisão: 7 dias úteis (prorrogável) · expira em 2d 04h          │
│                                                                              │
│ ┌────────────┬────────────┬────────────┬────────────┬────────────────────┐   │
│ │ CAPTADO    │ META       │ PROGRESSO  │ TOKENS     │ DATA DE INÍCIO     │   │
│ │ R$ 300.000 │ R$ 500.000 │ ████░░ 60% │ 7.500      │ 12/08/2026         │   │
│ └────────────┴────────────┴────────────┴────────────┴────────────────────┘   │
│                                                                              │
│ Motivo da conclusão:  (●) META ATINGIDA   ( ) TEMPO EXPIRADO                 │
│ Valor captado:   R$ 300.000,00 · Meta: R$ 500.000,00                        │
│ Tokens vendidos: 7.500 · Início da captação: 12/08/2026                     │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐    │
│ │ [ PRORROGAR CAPTAÇÃO ]          [ FINALIZAR DEFINITIVAMENTE ▾ ]      │    │
│ │  · Novo período: [30 ▾] dias     · Abre "Definir Parcelas" (modal)   │    │
│ └──────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Admin/Financeiro — Modal "Definir Parcelas" (mín. 12, juros)

```text
┌─────────────────────── DEFINIR PARCELAS — <Startup> ────────────────────────┐
│ Total a liberar: R$ 500.000,00 · Conclusão: 12/08/2026                      │
│ Quantidade (mín. 12): [ 24 ▾ ]   Juros: [ 1,5% a.m. ▾ ] (config Financeiro) │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ Parcela   Valor base    Juros    Total        Previsão                │   │
│ │  #1       20.833,34     312,50   21.145,84    01/Out/2026             │   │
│ │  #2       20.833,33     312,50   21.145,83    01/Nov/2026             │   │
│ │  ...      ...           ...      ...          ...                     │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│ Regra: 1 parcela/mês · não sacadas não expiram (rolam p/ próximo mês)        │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │                            [ CANCELAR ]   [ CONFIRMAR E LIBERAR ]     │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 12.3 Founder — Página de Prorrogação

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Dashboard                     PRORROGAÇÃO DA CAPTAÇÃO — <Startup>         │
│ Identificamos potencial em sua captação! Defina o valor adicional.            │
│                                                                              │
│ ┌───────────────────────────┐  ┌──────────────────────────────────────────┐  │
│ │ VALOR ADICIONAL           │  │ NOVA META (exibição automática)          │  │
│ │  Meta original R$500.000  │  │ R$ 500.000 + R$ 200.000 = R$ 700.000,00  │  │
│ │  Adicional   [ R$200.000 ]│  │ (read-only — não editável)               │  │
│ │  Preço token: R$ 40,00    │  │                                          │  │
│ │  Período novo: 30 dias    │  │ RESERVA DE TOKENS (só sobre o adicional) │  │
│ │  (definido Compliance)    │  │ R$ 200.000 ÷ R$ 40 = 5.000 tokens        │  │
│ └───────────────────────────┘  │                                          │  │
│                                │ ┌──────────────────────────────────────┐ │  │
│                                │ │ [ PAGAR RESERVA — R$ 200.000,00 ]    │ │  │
│                                │ │ Após pagamento → reativação automática│ │  │
│                                │ └──────────────────────────────────────┘ │  │
│                                └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 12.4 Founder — Solicitação de Parcela + Relatório do Mês

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Dashboard                             FINANCEIRO — <Startup>             │
│ TOTAL R$ 500k · RECEBIDO R$ 125k · PENDENTE R$ 375k · PARCELAS 1/24           │
│                                                                              │
│ ═══ CRONOGRAMA MENSAL (1 parcela/mês · não cumulativo) ═══                   │
│   Set ● (paga)   Out ▲ (atual)   Nov ○   Dez ○   Jan ○   ...                 │
│   Parcela do mês: #3 · R$ 20.833,00 · não sacada → rola p/ próximo mês       │
│                                                                              │
│ ═══ RELATÓRIO DO MÊS (obrigatório para solicitar) ═══                        │
│ Uso do recurso (alinhado à alocação 3A): [ Desenvolvimento ▾ ]               │
│ A startup teve lucro?               (●) Sim    ( ) Não                       │
│ Alcançou marco/desenvolvimento?     ( ) Sim    (●) Não  [ detalhe ▾ ]        │
│ Mensagem para os investidores:      [ "Lançamos a versão 2.0..."          ]  │
│                                                                              │
│ [ SALVAR RELATÓRIO → Transparência ]          [ SOLICITAR PARCELA (bloqueado │
│  (publica no relatório do mês)                 enquanto relatório vazio) ]   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 12.5 Financeiro/Admin — Lista de Solicitações + Detalhe (comprovante)

```text
┌─────── SOLICITAÇÕES DE PARCELAS ────────┐   ┌────────────────────────────────┐
│ Filtros: [Status ▾][Startup ▾] [Buscar]  │   │ DETALHE — #SOL-2026-0412       │
│ ┌────────────────────────────────────┐  │   │ Startup: <nome>                │
│ │#SOL-0412 <Startup> #3 REQUIRED ▸   │  │   │ Parcela: #3 · R$ 20.833,00     │
│ │#SOL-0411 <Startup> #2 APPROVED ▸   │  │   │ Banco: 0001-9 ...              │
│ │#SOL-0410 <Startup> #1 PAID ✓       │  │   │ Relatório do mês (visualizar)  │
│ │...                                  │  │   │ Comprovante do pagamento:      │
│ └────────────────────────────────────┘  │   │ [ Upload PDF/imagem ✓ ]         │
│                                          │   │ [ MARCAR COMO PAGO ]           │
└──────────────────────────────────────────┘   └────────────────────────────────┘
```

### 12.6 Página de Transparência (melhorada — relatório + comprovante + discussão)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Voltar                         TRANSPARÊNCIA — <Startup>                 │
│                                                                              │
│ ┌─────────────────────────────────────────┐  ┌─────────────────────────────┐  │
│ │ RELATÓRIO DO MÊS — Out/2026            │  │ DISCUSSÃO                    │  │
│ │ Uso do recurso: Desenvolvimento        │  │ 🡒 "Como foi o aporte?"   Investidor 1
│ │ Houve lucro?: Sim                       │  │    o founder respondeu      │  │
│ │ Marco: v2.0 lançado                     │  │ 🡒 "Próximas metas?"   Investidor 2
│ │ Mensagem do mês:                        │  │    o founder respondeu      │  │
│ │  "Lançamos a versão 2.0..."             │  │ [ Novo tópico ]              │  │
│ │ ┌────────────────────────────────────┐  │  └─────────────────────────────┘  │
│ │ │ 📎 Comprovante parcela #3 (PDF)    │  │                                   │
│ │ └────────────────────────────────────┘  │                                   │
│ └─────────────────────────────────────────┘                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Fundo escuro**, cards translúcidos, destaque `#d500f9` (magenta brand) nos CTAs de dinheiro.
- **12.1/12.2** são do Admin/Compliance/Financeiro (backoffice); **12.3/12.4** do founder; **12.5** do Financeiro; **12.6** pública para founder + investidores (token holders).

---

## 13. Esquema e Entidades (Proposta)

| Entidade | Campos principais | Relação |
|---|---|---|
| `PayoutProcess` | `campaignId`, `conclusionReason`, `payoutDecision`, `decisionDeadline`, `decisionAt` | 1:1 com campanha finalizada |
| `CampaignExtension` | `campaignId`, `additionalAmount`, `totalAmountShown`, `tokenReserve`, `periodDays`, `status` (`PENDING_RESERVATION_PAYMENT`, `RESERVATION_PAID`, `REACTIVATED`) | 1:N com campanha |
| `Payment` (reuso) | novo tipo `TOKEN_RESERVATION_EXTENSION` | liga à `CampaignExtension`; statuses incluem `PENDING`, `PAID`, `CANCELED`, `EXPIRED` |
| `Installment` (reuso) | quantidade mínima 12, valor + juros configurados | ajustado à regra mensal |
| `PayoutReport` | `solicitacaoId`, `usoRecurso`, `teveLucro`, `marcoAlcancado`, `mensagemInvestidores` | 1:1 com solicitação |
| `PayoutComprovante` | `solicitacaoId`, arquivo (S3 privado) | 1:1 com solicitação |

> Decisão: **não** adicionar novos valores ao enum `CampaignStatus`; estados de processamento em entidades auxiliares.

---

## 14. Frontend — Rotas e Componentes

| Rota | Página | Componentes principais |
|---|---|---|
| `/admin/startups/:id/pagamentos` | Gestão de pagamentos (Admin/Compliance) | `PayoutDecisionPanel`, `PayoutSummary`, `DefineParcelasModal` |
| `/founder/startups/:id/prorrogacao` | Prorrogação (founder) | `ExtensionForm`, `ReservaExtensionSummary` |
| `/founder/startups/:id/financeiro` | Solicitação de parcela + relatório do mês | `RepasseDashboard`, `RepasseInstallmentForm`, `RelatorioMesForm` |
| `/financeiro/repasse` | Lista de solicitações | `SolicitacoesList` |
| `/financeiro/repasse/:id` | Detalhe da solicitação | `SolicitacaoDetail`, `ComprovanteUpload` |
| `/startups/:id/transparency` | Transparência (relatório + comprovante + discussão) | `RelatorioMes`, `ComprovanteCard`, `DiscussionTopics` |

---

## 15. Critérios de Aceite

- [ ] **AC-01:** Captação conclui por meta atingida (`FUNDED`) ou por tempo (período expirado → encerramento automático sem ação do founder).
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

---

## 16. Decisões em Aberto / Riscos

- **Arredondamento de tokens** na reserva da prorrogação (inteiro para baixo vs fracionário) — precisa de decisão com Financeiro.
- **Prazo máximo de prorrogações por rodada** (limite de extensões vs teto de tempo acumulado) — recomendável definir teto (ex.: no máximo 1 extensão + teto de tempo) para compliance.
- **Incidência de juros** configurada pelo Financeiro (fluxo de parcelas) — validar regras de divulgação (transparência do custo total).
- Ao **aprovar** este PRD, espelhar as novas regras em `CASE.md` (Regra de Ouro — `AGENTS.md` §10).

---