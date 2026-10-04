# PRD — Módulo de Captação & Tokenização

> **Versão**: 2.0  
> **Data**: 11/08/2026  
> **Autor**: Engenharia IselfToken  
> **Status**: Draft para revisão  
> **Regulação base**: Resolução CVM 88/2022 (Equity Crowdfunding)

---

## 1. Visão Geral

O módulo de Captação é o coração financeiro da plataforma IselfToken. Ele gerencia o ciclo de vida completo de uma oferta pública de tokenização: desde o cadastro inicial da startup pelo fundador, passando por pagamento de taxas, curadoria regulatória (Compliance), emissão de tokens, abertura da campanha para investidores e, eventualmente, encerramento e repasse de fundos.

### 1.1 Objetivos do Módulo

1. Permitir que startups registrem ofertas de captação de forma guiada (wizard por etapas)
2. Garantir conformidade regulatória total com a CVM 88/2022 antes da publicação
3. Proteger investidores via validação rigorosa de dados e documentos
4. Manter rastro auditável de todas as operações financeiras (LGPD + CVM)
5. Impedir fraudes via regras de concorrência atômica na emissão de tokens

### 1.2 Princípio Fundamental — Campanha Única Ativa

> **REGRA DE OURO**: Uma startup pode ter NO MÁXIMO uma campanha em estado ATIVO (status `OPEN`) a qualquer momento. A abertura de nova rodada SÓ é permitida quando a rodada anterior foi 100% FINALIZADA (`CLOSED` ou `FUNDED` + `PAID_OUT`) E passaram-se pelo menos 3 meses do encerramento.

---

## 2. Máquina de Estados (Lifecycle)

### 2.1 Status da Startup (`StartupStatus`)

```
PENDING
  │
  ▼
PENDING_RESERVATION_PAYMENT ──(pagamento confirmado)──► RESERVATION_PAID
                                                            │
                                                            ▼
                                                   PENDING_CURATOR_REVIEW
                                                            │
                                              ┌─────────────┴─────────────┐
                                              ▼                           ▼
                                          APPROVED                    REJECTED
                                              │                           │
                                              ▼                           ▼
                                            LIVE                      DECLINED
```

| Status | Descrição | Quem muda |
|--------|-----------|-----------|
| `PENDING` | Startup recém-criada, aguardando submissão | Sistema |
| `PENDING_RESERVATION_PAYMENT` | Aguardando pagamento da taxa de reserva | Sistema |
| `RESERVATION_PAID` | Pagamento confirmado, aguardando curadoria | Webhook C6/Manual |
| `PENDING_CURATOR_REVIEW` | Em fila para análise do Compliance | Sistema |
| `APPROVED` | Aprovada pelo Compliance, pronta para captação | Compliance |
| `LIVE` | Campanha ativa recebendo investimentos | Sistema |
| `REJECTED` | Rejeitada com justificativa formal | Compliance |
| `DECLINED` | Rejeitada definitivamente (sem recurso) | Admin |

### 2.2 Status da Campanha (`CampaignStatus`)

```
DRAFT ──(compliance aprova)──► OPEN ──(admin pausa)──► PAUSED
                                 │                        │
                                 │               (admin retoma)
                                 │                        │
                                 ▼                        ▼
                               CLOSED ◄────────── (deadline atingido / admin finaliza)
                                 │
                        (100% tokens vendidos)
                                 │
                                 ▼
                               FUNDED ──(repasse concluído)──► PAID_OUT
```

| Status | Significado | Pré-condição de entrada |
|--------|-------------|------------------------|
| `DRAFT` | Rascunho (pós-pagamento, pré-compliance) | Startup com `RESERVATION_PAID` |
| `OPEN` | Campanha ativa, aceitando investimentos | Compliance aprovou a startup |
| `PAUSED` | Suspensa temporariamente (manutenção/regulatório) | Admin/Compliance intervém |
| `CLOSED` | Encerrada (deadline ou decisão admin) | Deadline atingido OU admin finaliza |
| `FUNDED` | 100% dos tokens vendidos com sucesso | `tokensSold == totalTokens` |
| `PAID_OUT` | Repasse de fundos ao fundador concluído | Todas as transferências confirmadas |

### 2.3 Regras de Transição da Campanha

| De | Para | Gatilho | Validação |
|----|------|---------|-----------|
| `DRAFT` → `OPEN` | Compliance aprova | `POST /admin/compliance/startup/:id/decide` | Todos os 4 blocos de compliance validados |
| `OPEN` → `PAUSED` | Admin suspende | `PATCH /campaigns/:id/action` | Justificativa obrigatória |
| `PAUSED` → `OPEN` | Admin retoma | `PATCH /campaigns/:id/action` | — |
| `OPEN` → `CLOSED` | Deadline atinge | Cron job (`CampaignDeadlineWorker`) | `NOW() >= campaign.deadline` |
| `OPEN` → `FUNDED` | 100% vendido | Automático no `confirmInvestment` | `tokensSold == totalTokens` |
| `CLOSED` → `FUNDED` | Captação mínima atingida | Validação pós-fechamento | `tokensSold >= minTokensRequired` |
| `FUNDED` → `PAID_OUT` | Repasse concluído | Sistema de transferência (B12) | Todos FundTransfer em status `COMPLETED` |

---

## 3. Regra de Campanha Única Ativa (Regra B05)

### 3.1 Invariantes

1. **Uma startup NÃO pode ter duas campanhas com status `OPEN` ou `PAUSED` simultaneamente.**
2. **Nova rodada requer**: rodada anterior com status `CLOSED`, `FUNDED` ou `PAID_OUT`.
3. **Carência de 3 meses**: contados a partir de `campaign.closedAt` da rodada anterior.
4. **Rodada anterior 100% vendida**: `tokensSold >= totalTokens` obrigatório.
5. **Visibilidade no frontend**: o botão "Abrir Nova Rodada" SÓ aparece quando TODAS as condições acima são satisfeitas.

### 3.2 Implementação (Backend)

```typescript
// CampaignsCreateService.requestNewRound()
// 1. Busca última campanha CLOSED/FUNDED
// 2. Valida tokensSold == totalTokens
// 3. Valida (NOW - closedAt) >= 90 dias
// 4. Se qualquer condição falha → BadRequestException
```

### 3.3 Implementação (Frontend)

```typescript
// founder-new-round.tsx — LOADER (gate de acesso à página)
// A PÁGINA NÃO EXISTE para o fundador até que a captação anterior seja FINALIZADA.
// Se qualquer pré-condição falha → redirect para dashboard com toast explicativo.
// O link/botão para "Nova Rodada" NÃO é renderizado no menu/cards enquanto
// não houver captação anterior com status terminal (CLOSED/FUNDED/PAID_OUT).

export async function loader({ request, params }) {
  // 1. Busca startup e campanhas
  // 2. Se NÃO existe campanha anterior FINALIZADA → redirect
  // 3. Se existe campanha ATIVA (OPEN/PAUSED/DRAFT) → redirect
  // 4. Se tokensSold < totalTokens → redirect
  // 5. Se closedAt + 90 dias > NOW() → redirect
  // Só se TODAS passam: renderiza a página
}
```

> **IMPORTANTE**: Esta não é apenas uma validação — a página LITERALMENTE não aparece no menu/dashboard do fundador até que a primeira captação esteja finalizada. Não é um botão desabilitado; é invisível.

### 3.4 Mensagens de Bloqueio

| Código de Erro | Mensagem PT-BR |
|----------------|----------------|
| `RODADA_ANTERIOR_NAO_VENDIDA` | "A rodada anterior precisa estar 100% vendida para iniciar uma nova." |
| `INTERVALO_MINIMO_3_MESES` | "É preciso esperar 3 meses desde o encerramento da rodada anterior." |
| `STARTUP_ALREADY_HAS_CAMPAIGN` | "Esta startup já possui campanha ativa. Use nova rodada quando a atual encerrar." |
| `CAMPANHA_ATIVA_EXISTENTE` | "Já existe uma campanha ativa (OPEN/PAUSED). Finalize-a primeiro." |

---

## 4. Fluxo Completo por Etapas (Steps)

O processo de captação segue um pipeline linear com gates rígidos entre etapas. Nenhuma etapa pode ser pulada.

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌────────────┐
│  STEP 1-3   │────►│   CHECKOUT   │────►│  COMPLIANCE  │────►│  CAMPANHA  │
│  Wizard     │     │  Pagamento   │     │  Curadoria   │     │  ATIVA     │
│  Fundador   │     │  Reserva     │     │  Regulatória │     │  (OPEN)    │
└─────────────┘     └──────────────┘     └──────────────┘     └────────────┘
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
  Dados Básicos       Taxa 5% meta       Validação 4 blocos    Investidores
  + Bancário          + Fast Track       + PKI + CVM docs      comprando
  + Valuation         (opcional)         + Emissão tokens      tokens
```

### 4.1 STEP 1 — Informações da Startup

**Rota**: `/founder/startups/new` (Aba 1)  
**Objetivo**: Coletar dados corporativos e de identidade legal da startup.

| Campo | Tipo | Validação | Obrigatório |
|-------|------|-----------|:-----------:|
| CNPJ (`cnpj`) | text + máscara | IN RFB 2.229/2024 alfanumérico. DV1+DV2. Status ATIVA na RF. | ✅ |
| Nome Fantasia (`nomeFantasia`) | text | Min 2 chars. Auto-fill via busca CNPJ. | ✅ |
| Razão Social (`razaoSocial`) | text | Min 3 chars. Auto-fill via busca CNPJ. | ✅ |
| Data de Abertura (`dataAbertura`) | text | Min 4 chars. Aceita ano ou dd/mm/aaaa. | ✅ |
| País Sede (`paisIso3`) | select | ISO3 (3 letras). Default: `"BRA"`. | ✅ |
| Categoria (`categoryId`) | select cascata | FK numérica. Reset área ao mudar (ADR-007 §3.2). | ✅ |
| Área de Atuação (`areaAtuacaoId`) | select cascata | FK numérica. Desabilitado sem categoria. Cross-valida pertencimento. | ✅ |
| Estágio (`estagio`) | select | Enum: ideacao, mvp, operacao, tracao, escala. Define limites da Aba 3. | ✅ |
| Descrição (`descricao`) | textarea | 10-500 chars. | ✅ |
| Logo (`logoFileId`) | file upload | PNG/JPEG/SVG. Via `POST /api/uploads`. | ❌ |
| Pitch Deck (`pitchDeckFileId`) | file upload | PDF apenas. Via `POST /api/uploads`. | ❌ |
| Vídeo Pitch (`videoPitch`) | url | URL YouTube válida ou vazio. | ❌ |
| Website (`website`) | url | URL válida ou vazio. | ❌ |
| LinkedIn (`linkedin`) | url | URL LinkedIn válida ou vazio. | ❌ |

**Integrações**:
- `GET /api/geral/cnpj/:cnpj` — Busca dados na Receita Federal (auto-fill)
- `GET /api/categories` — Lista categorias
- `GET /api/categories/:categoryId/areas` — Áreas filtradas por categoria
- `POST /api/uploads` — Upload de logo/pitch deck com validação MIME e processamento síncrono

### 4.2 STEP 2 — Dados Bancários

**Rota**: `/founder/startups/new` (Aba 2)  
**Objetivo**: Registrar conta bancária para recebimento futuro dos recursos captados.

| Campo | Tipo | Validação | Obrigatório |
|-------|------|-----------|:-----------:|
| Titular da Conta (`titular`) | text | Min 3 chars. Deve corresponder à Razão Social ou CPF do sócio. | ✅ |
| Banco (`banco`) | select | Uma das 39 instituições homologadas (`BANK_OPTIONS`). | ✅ |
| Agência (`agencia`) | text | Min 1 char. Formato numérico (ex: `0001`). | ✅ |
| Número da Conta (`conta`) | text | Min 1 char. Formato numérico. | ✅ |
| Dígito (`digito`) | text | Min 1 char. Dígito verificador. | ✅ |
| Tipo de Conta (`tipoConta`) | select | `corrente` (default) ou `poupanca`. | ✅ |

**Regras de Compliance Financeiro**:
- O titular da conta DEVE ser a pessoa jurídica (CNPJ) ou um dos sócios cadastrados
- Dados bancários são encriptados em repouso (AES-256)
- Alteração de dados bancários pós-aprovação requer solicitação ao Compliance (`DataChangeRequest`)
- Log de auditoria registra quem/quando alterou dados bancários

**Bancos Homologados** (39 instituições):
99Pay, Agibank, Banco BS2, Banco BTG Pactual, Banco do Brasil, Banco Pan, Banco Safra, Banco Votorantim (BV), Bank of America, Banrisul, Bradesco, BNP Paribas, C6 Bank, Caixa Econômica Federal, Citibank, Deutsche Bank, Digio, HSBC, Inter, Itaú Unibanco, JP Morgan, Mercado Pago, Modalmais, Neon, Next (Bradesco), Nubank, Original, PagBank (PagSeguro), PayPal, PicPay, Revolut, Santander, Scotiabank, Sicoob, Sicredi, Sofisa Direto, Stone, Wells Fargo, Wise.

### 4.3 STEP 3 — Captação & Valuation

**Rota**: `/founder/startups/new` (Aba 3)  
**Objetivo**: Definir os parâmetros financeiros da oferta de tokenização.

| Campo | Tipo | Validação | Obrigatório |
|-------|------|-----------|:-----------:|
| Meta de Captação (`metaCaptacao`) | number (R$) | Min R$ 100.000. Máx dinâmico por estágio (ver tabela). | ✅ |
| Equity Oferecido (`equityOferecido`) | number (%) | Min 5%, Máx 49%. Default: 10%. | ✅ |
| Moeda (`moeda`) | select (disabled) | Fixo: Real (R$). Campo read-only. | ✅ |
| Fast Track Review (`wantsFastTrackReview`) | checkbox | Boolean. Se true, adiciona R$ 500 ao checkout. | ❌ |

**Limites de Captação por Estágio** (configurável via `/admin/config/fundraising`):

| Estágio | Piso (R$) | Teto (R$) |
|---------|-----------|-----------|
| Ideação | 100.000 | 250.000 |
| MVP | 100.000 | 500.000 |
| Operação | 100.000 | 1.000.000 |
| Tração | 100.000 | 2.500.000 |
| Escala | 100.000 | 5.000.000 |

**Cálculos Automáticos (ADR-008 Modelo A)**:

```
tokenBaseValue     = targetAmount / totalTokens          (valor de face)
tokenSellPrice     = tokenBaseValue                      (preço de venda = face)
adminFeeValue      = targetAmount × PLATFORM_ADMIN_FEE_PCT (20% da meta)
tokenMintingCost   = totalTokens × TOKEN_MINT_FEE        (custo cunhagem)
taxaReserva        = targetAmount × 0.05                 (5% da meta — pago no checkout)
```

**Ação de Submissão**:
1. Valida schema Zod completo (`newStartupSchema`)
2. `POST /api/startup` — cria startup + campanha DRAFT
3. Redireciona para `/founder/startups/:campaignId/checkout` com produtos:
   - `TOKEN_RESERVATION` (5% da meta — obrigatório)
   - `FAST_TRACK_REVIEW` (R$ 500 — opcional)

### 4.4 STEP 4 — Checkout & Pagamento da Reserva

**Rota**: `/founder/startups/:id/checkout`  
**Objetivo**: Coletar o pagamento da taxa de reserva de tokens para formalizar a intenção de captação.

**Produtos do Checkout**:

| Item | Valor | Obrigatório | Descrição |
|------|-------|:-----------:|-----------|
| Taxa de Reserva de Tokens | 5% da meta de captação | ✅ | Garante a geração dos tokens e entrada na fila de curadoria |
| Fast Track Review | R$ 500,00 (fixo, configurável) | ❌ | Priorização na fila de análise do Compliance |

**Métodos de Pagamento**: PIX (via C6 Bank API)

**Fluxo de Pagamento**:
1. Sistema gera QR Code PIX via C6 Bank
2. Investidor paga via app bancário
3. Webhook C6 confirma pagamento → `Payment.status = PAID`
4. **OU** Admin/Financeiro confirma manualmente (comprovante obrigatório)
5. Sistema atualiza `Startup.status` → `RESERVATION_PAID` → `PENDING_CURATOR_REVIEW`
6. Notificação enviada ao Compliance

**Regras de Expiração**:
- PIX gerado expira em 30 minutos
- Startup permanece em `PENDING_RESERVATION_PAYMENT` até pagamento ou cancelamento
- Após 72h sem pagamento: dados movidos para tabela de rascunhos (`startup_drafts`)

**Registro Financeiro (Auditoria)**:

| Campo Registrado | Objetivo |
|-----------------|----------|
| `Payment.userId` | Quem pagou |
| `Payment.amount` | Valor exato |
| `Payment.purpose` | `TOKEN_RESERVATION` |
| `Payment.txid` | ID da transação PIX (C6) |
| `Payment.endToEndId` | End-to-end ID do BACEN |
| `Payment.paidAt` | Timestamp exato do pagamento |
| `Payment.manualApprovedById` | Se aprovação manual: quem aprovou |
| `Payment.manualJustification` | Se manual: justificativa obrigatória |
| `Payment.manualComprovanteKey` | Se manual: comprovante em S3 |

### 4.5 STEP 5 — Dados Complementares (Pós-Pagamento)

**Rota**: `/founder/startups/:id/edit` + `/founder/startups/:id/edit/captacao`  
**Objetivo**: Completar dados exigidos pela CVM 88/2022 antes da curadoria.  
**Pré-condição**: `Startup.status == RESERVATION_PAID` ou superior.

Este step é composto por múltiplas sub-abas acessíveis via layout de edição:

#### 5.1 Identidade Corporativa Completa
- Endereço completo (CEP + auto-fill ViaCEP)
- Redes sociais adicionais (Instagram, Twitter/X, YouTube)
- Tagline/Slogan
- Descrição detalhada (1000 chars)

#### 5.2 Equipe (Founders, Advisors, Employees)
- Mínimo 1 founder obrigatório
- Cada membro: Nome, Cargo, LinkedIn, Mini Bio
- Advisors e employees opcionais

#### 5.3 Documentos Regulatórios (CVM 88/2022)

**Grupos de Documentos**:

| Grupo | Documento | Obrigatoriedade | Dispensa ("Não se aplica") |
|-------|-----------|:--------------:|:--------------------------:|
| **Obrigatórios CVM** | Material Informativo Essencial (MIE) | ✅ | ❌ |
| | Contrato Social / Estatuto | ✅ | ❌ |
| | Cartão CNPJ | ✅ | ❌ |
| | Balanço Exercício Atual | ✅ | ✅ (empresa < 1 ano) |
| | Declaração de Veracidade | ✅ | ❌ |
| | Ata de Eleição de Adm. | ✅ | ✅ (LTDA sem conselho) |
| **Condicionais** | Balanço Exercício Anterior | Condicional | ✅ |
| | Procuração | Condicional | ✅ |
| | CV / Histórico dos Sócios | Condicional | ✅ |
| **Recomendados** | Pitch Deck PDF | ❌ | — |
| | Projeções Financeiras | ❌ | — |
| | Modelo de Contrato da Oferta | ❌ | — |
| | Comprovante Endereço PJ | ❌ | — |
| | Declaração de Receita Anual | ❌ | — |
| **Plataforma** | Termo da Plataforma | ✅ | ❌ |
| | Documentos Avulsos (OUTRO) | ❌ | — |

**Regras de Upload**:
- Todos os arquivos passam por validação de MIME, sanitização e processamento síncrono antes de serem disponibilizados
- Formato aceito: PDF (application/pdf)
- Tamanho máximo: 10MB por arquivo
- Storage: bucket `document` no RustFS (S3-compatible)
- Metadados: `StartupDocument` (categoria, nome, s3Key, mimetype, sizeBytes, uploadedById)

#### 5.4 Dados Bancários Detalhados
- Adição de documento do titular (CPF/CNPJ)
- Chave PIX (opcional)
- Cross-validação: titular deve ser PJ (CNPJ) ou sócio registrado

#### 5.5 Termo de Adesão Digital
- Assinatura PKI X.509 (CA interna)
- QR Code de verificação pública gerado automaticamente
- Hash SHA-256 do documento para integridade
- Endpoint público de verificação: `GET /api/verificar/:documentId`

### 4.6 STEP 6 — Detalhamento da Captação (Dados CVM da Rodada)

**Rota**: `/founder/startups/:id/edit/captacao`  
**Objetivo**: Preencher dados de compliance da oferta exigidos pela CVM 88/2022.

#### Sub-Aba 1: Valores de Captação & Tokenização (Read-Only)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Meta de Captação (R$) | display | Valor fixado na submissão inicial. Imutável. |
| Equity Oferecido (%) | display | Percentual fixado na oferta. Imutável. |
| Moeda | display | Real (R$). Fixo. |
| Resumo Tokenização | display | Tokens calculados, preço base, taxa de reserva, desconto 20% admin. |

#### Sub-Aba 2: Destinação de Recursos & Metas

| Campo | Tipo | Validação |
|-------|------|-----------|
| O que espera alcançar (`esperaAlcancar`) | textarea | 10-2000 chars |
| Alocação Fundador (%) | number | 0-100 |
| Alocação Desenvolvimento (%) | number | 0-100 |
| Alocação Comercial/Equipe (%) | number | 0-100 |
| Alocação Marketing (%) | number | 0-100 |
| Alocação Nuvem/Infra (%) | number | 0-100 |
| Alocação Jurídico (%) | number | 0-100 |
| Alocação Reserva de Caixa (%) | number | 0-100 |

> **VALIDAÇÃO ESTRITA**: A soma dos 7 campos de alocação DEVE ser EXATAMENTE 100%. Backend rejeita com `@ValidateSum100()` customizado.

#### Sub-Aba 3: Tese de Negócios & Mercado

| Campo | Validação |
|-------|-----------|
| Problema que resolve (`problema`) | 10-2000 chars |
| Solução proposta (`solucao`) | 10-2000 chars |
| Diferencial competitivo (`diferencial`) | 10-2000 chars |
| Modelo de receita (`modeloReceita`) | 10-2000 chars |
| Mercado-alvo (`mercadoAlvo`) | 10-2000 chars |

#### Sub-Aba 4: Governança & Operação

| Campo | Validação |
|-------|-----------|
| Quantidade de sócios (`sociosCount`) | Int positivo, min 1 |
| Dedicação dos fundadores (`dedicacao`) | Min 5 chars |
| Potenciais compradores M&A (`compradores`) | 10-2000 chars |
| Investimento prévio (`investimentoPrevio`) | Opcional, max 2000 chars |
| Concorrência (`concorrencia`) | 10-2000 chars |

#### Sub-Aba 5: Benefícios e Participação nos Lucros

| Campo | Validação |
|-------|-----------|
| Oferecer Participação nos Lucros (`ofereceLucros`) | Boolean |
| Faturamento Mínimo p/ Lucros (`faturamentoMinimoLucros`) | Condicional: obrigatório se ofereceLucros=true |
| Descrição dos Lucros (`lucrosDescricao`) | Condicional: 10-2000 chars se ofereceLucros=true |
| Oferecer Benefícios (`ofereceBeneficios`) | Boolean |
| Descrição dos Benefícios (`beneficiosDescricao`) | Condicional: 10-4000 chars se ofereceBeneficios=true |

### 4.7 STEP 7 — Curadoria Regulatória (Compliance Approve)

**Rota**: `/compliance/startups/:id`  
**Ator**: Operador de Compliance (role `COMPLIANCE`)  
**Pré-condição**: `Startup.status == PENDING_CURATOR_REVIEW`  
**Objetivo**: Validar integralmente a startup antes de autorizar emissão de tokens e abertura da captação.

---

#### Checklist de Validação Obrigatória (4 Blocos)

O Compliance DEVE validar TODOS os 4 blocos antes de emitir decisão. Cada bloco tem critérios específicos e todos devem estar ✅ para aprovação.

---

**BLOCO 1 — Dados do Fundador (Solicitante)**

| Item Auditado | Critério de Validação | Status |
|---------------|----------------------|--------|
| Nome Completo | Confere com documento oficial + Contrato Social | ✅/❌ |
| Email e Telefone | Email verificado (2FA). Telefone de contato válido. | ✅/❌ |
| Documento (CPF/CNH) | CPF válido na Receita Federal. Maioridade ≥ 18 anos. | ✅/❌ |
| Endereço Pessoal | Logradouro, cidade, UF, CEP completos. | ✅/❌ |
| KYC Biometria | 4 arquivos: Avatar, Comprovante Residência, Documento, Biometria Facial. Status = `APPROVED`. | ✅/❌ |

> **GATE**: Se KYC do fundador != `APPROVED`, a startup NÃO pode ser aprovada. Link direto para `/compliance/users/:id` para análise do KYC.

---

**BLOCO 2 — Dados da Startup (Empresa)**

| Item Auditado | Critério de Validação | Status |
|---------------|----------------------|--------|
| CNPJ válido e ATIVO | Consulta Receita Federal em tempo real. IN RFB 2.229/2024. | ✅/❌ |
| Razão Social e Nome Fantasia | Confere com Receita e Junta Comercial. | ✅/❌ |
| Data de Fundação e País | Coerente com CNPJ. | ✅/❌ |
| Categoria, Área e Estágio | Classificação compatível com o pitch. Flag `needs_manual_review` verificada. | ✅/❌ |
| Endereço Sede | Completo e verificável. | ✅/❌ |
| Pitch e Descrição | Problema, solução, modelo de receita e mercado alvo preenchidos adequadamente. | ✅/❌ |
| Mídias e Redes Sociais | Links funcionais (site, LinkedIn, Instagram, YouTube). Verificação manual. | ℹ️ (informativo) |
| Documentação CVM (17 tipos) | Todos os obrigatórios presentes ou com justificativa "Não se aplica". | ✅/❌ |
| Termo de Adesão | Assinado digitalmente (PKI X.509). Certificado válido. | ✅/❌ |
| Dados Bancários | Titular confere. Banco homologado. Conta válida. | ✅/❌ |

---

**BLOCO 3 — Dados da Captação**

| Item Auditado | Critério de Validação | Status |
|---------------|----------------------|--------|
| Meta de Captação | Dentro dos limites do estágio (R$ 100k–5M). | ✅/❌ |
| Equity Oferecido | Entre 5% e 49%. | ✅/❌ |
| Valuation Pre/Post-Money | Cálculo coerente: `PreMoney = Meta / (1 - Equity) - Meta`. | ✅/❌ |
| Tokenomics | Preço × Quantidade = Meta. Sem tokens fracionários. | ✅/❌ |
| Destinação de Recursos | Soma = EXATAMENTE 100%. Alocações plausíveis. | ✅/❌ |
| Tese de Negócio | Todos os campos de pitch preenchidos com min chars. | ✅/❌ |
| Governança | Sócios ≥ 1. Dedicação definida. Compradores e concorrência. | ✅/❌ |
| Lucros e Benefícios | Se oferece lucros, faturamento mínimo definido. Se benefícios, descrição adequada. | ✅/❌ |

---

**BLOCO 4 — Ordem de Emissão de Tokens & Decisão**

| Item / Ação | Critério | Ação Disponível |
|-------------|----------|-----------------|
| Pagamento da Reserva | `Payment.status == PAID` confirmado | Display (valor + data) |
| Quantidade de Tokens | Coerente com meta ÷ preço | Display |
| **APROVAR** | Todos os 3 blocos acima ✅ | `POST /admin/compliance/startup/:id/decide` → `{ decision: "APPROVED" }` |
| **REJEITAR** | Qualquer bloco com ❌ | `POST /admin/compliance/startup/:id/decide` → `{ decision: "REJECTED", reason: "..." }` |

**Ações Pós-Decisão**:

| Decisão | Efeito no Sistema |
|---------|-------------------|
| APROVADO | Startup → `APPROVED`. Campaign → `OPEN`. Worker emite tokens (assíncrono). Certificado PKI gerado. Fundador notificado. |
| REJEITADO | Startup → `REJECTED`. Fundador notificado com motivo. Pode corrigir e ressubmeter. |

### 4.8 STEP 8 — Emissão de Tokens (Token Generate)

**Tipo**: Ordem de Serviço Assíncrona & Auditável  
**Ator**: Worker automatizado (pós-aprovação Compliance)  
**Pré-condição**: `Payment.status == PAID` + `Compliance decision == APPROVED`

#### Regras Estritas de Emissão

| # | Regra | Consequência de Violação |
|---|-------|--------------------------|
| 1 | Tokens JAMAIS gerados antes de `Payment.status == PAID` | Emissão bloqueada. Log de tentativa suspeita. |
| 2 | Tokens JAMAIS gerados antes de aprovação Compliance | Worker verifica flag antes de processar. |
| 3 | Concorrência via `SELECT ... FOR UPDATE SKIP LOCKED` | Workers paralelos processam ordens distintas sem colisão. ACID completo. |
| 4 | Cada token recebe hash SHA-256 único | Garantia de unicidade e verificabilidade pública. |
| 5 | Certificado de Titularidade gerado e assinado (PKI X.509) | Prova legal de propriedade dos tokens. |

#### Fluxo de Emissão

```
[Compliance Aprova]
       │
       ▼
[Worker detecta ordem pendente]
       │
       ▼
[SELECT ... FOR UPDATE SKIP LOCKED] ←── Trava atômica
       │
       ▼
[Gera N tokens com hash SHA-256]
       │
       ▼
[Persiste tokens na tabela `tokens`]
       │
       ▼
[Gera Certificado de Titularidade PDF]
       │
       ▼
[Assina com PKI X.509 (CA interna)]
       │
       ▼
[Upload certificado → RustFS (S3)]
       │
       ▼
[Atualiza campaign.status = OPEN]
       │
       ▼
[Notifica fundador: "Tokens emitidos, campanha ativa!"]
```

#### Certificado de Titularidade

Documento PDF gerado automaticamente contendo:
- Dados da startup (CNPJ, razão social)
- Dados do Compliance aprovador (nome, data de aprovação)
- Quantidade e hashes dos tokens emitidos
- Valor total da oferta
- Assinatura digital PKI X.509
- QR Code de verificação pública
- Timestamp de emissão (ISO 8601)

### 4.9 STEP 9 — Campanha Ativa (OPEN) — Captação de Investimentos

**Rota (Investidor)**: `/startups/:id` (marketplace)  
**Pré-condição**: `Campaign.status == OPEN`  
**Objetivo**: Receber investimentos até atingir meta ou deadline.

#### Regras de Operação

| Regra | Descrição |
|-------|-----------|
| Investimento Mínimo | Definido em `campaign.minInvestment` (configurável pelo fundador) |
| Reserva de Tokens | `TokenReservation` criada com status `RESERVED` antes do pagamento |
| Expiração de Reserva | Reserva expira em 30 min se pagamento não confirmado |
| Oversell Prevention | `tokensSold + reservedTokens <= totalTokens` verificado em tempo real |
| Confirmação | Webhook PIX → Investment `CONFIRMED` → Tokens emitidos para investidor |
| Cancelamento | Investidor pode cancelar até 7 dias após confirmação (CVM 88) |

#### Monitoramento em Tempo Real

| Métrica | Cálculo | Exibição |
|---------|---------|----------|
| % Captado | `(tokensSold × tokenPrice) / targetAmount × 100` | Barra de progresso |
| Tokens Restantes | `totalTokens - tokensSold - reservedTokens` | Badge numérico |
| Prazo Restante | `campaign.deadline - NOW()` | Countdown |
| Investidores | `COUNT(DISTINCT investments.userId)` | Contador |

### 4.10 STEP 10 — Encerramento & Repasse (CLOSED → FUNDED → PAID_OUT)

**Ator**: Sistema (cron) + Admin/Financeiro  
**Gatilhos de encerramento**:

| Condição | Resultado |
|----------|-----------|
| `tokensSold == totalTokens` | Campaign → `FUNDED` (100% vendido) |
| `NOW() >= deadline` + tokens vendidos > 0 | Campaign → `CLOSED` |
| `NOW() >= deadline` + ZERO tokens vendidos | Campaign → `CLOSED` (fracasso) |
| Admin finaliza manualmente | Campaign → `CLOSED` |

#### Fluxo de Repasse de Fundos (B12)

```
[Campaign FUNDED]
       │
       ▼
[Nota Fiscal emitida pelo Fundador]
       │
       ▼
[Admin/Financeiro valida NF]
       │
       ▼
[FundTransfer criado com status PENDING]
       │
       ▼
[Transferência bancária executada (TED/PIX)]
       │
       ▼
[FundTransfer → COMPLETED]
       │
       ▼
[Campaign → PAID_OUT]
       │
       ▼
[Nova rodada habilitada (após 3 meses)]
```

### 4.11 STEP 11 — Nova Rodada (Somente Pós-Finalização Completa)

**Rota**: `/founder/startups/:id/new-round`  
**Visibilidade**: A PÁGINA INTEIRA só é renderizada/acessível quando a captação anterior foi FINALIZADA.

> **REGRA CRÍTICA**: A rota `/founder/startups/:id/new-round` NÃO DEVE existir como link clicável, botão visível, ou item de menu para o fundador ENQUANTO a primeira (ou atual) captação não estiver com status terminal (`CLOSED`, `FUNDED` ou `PAID_OUT`). Se o fundador tentar acessar a URL diretamente (digitando no browser), deve receber redirect para o dashboard com toast explicativo.

**Pré-condições (TODAS obrigatórias para EXIBIR a página)**:

| # | Condição | Verificação | Se falha |
|---|----------|-------------|----------|
| 1 | Startup com status `APPROVED` ou `LIVE` | `startup.status IN ('APPROVED', 'LIVE')` | Redirect → dashboard |
| 2 | Existe pelo menos 1 campanha anterior FINALIZADA | `EXISTS campaign WHERE status IN ('CLOSED','FUNDED','PAID_OUT')` | Página não existe |
| 3 | Nenhuma campanha ativa (OPEN/PAUSED/DRAFT) | `NOT EXISTS campaign WHERE status IN ('OPEN','PAUSED','DRAFT')` | Redirect + toast |
| 4 | Última campanha 100% vendida | `lastCampaign.tokensSold == lastCampaign.totalTokens` | Redirect + toast |
| 5 | Carência de 3 meses cumprida | `NOW() - lastCampaign.closedAt >= 90 dias` | Redirect + toast |
| 6 | Repasse de fundos concluído | `lastCampaign.status == 'PAID_OUT'` | Redirect + toast |

**Implementação do Gate (Frontend)**:

```typescript
// Loader de founder-new-round.tsx
// 1. Busca startup + última campanha
// 2. Se QUALQUER pré-condição falha → throw redirect("/founder/dashboard")
// 3. Flash message via searchParams: ?blocked=MOTIVO
```

**Implementação do Gate (Backend)**:

```typescript
// POST /campaigns/:startupId/new-round
// Mesmo check no service — defense in depth
// Se condições falham → 400 BadRequestException com código estruturado
```

**Onde o link/botão aparece (quando permitido)**:
- Dashboard do Fundador (`/founder/dashboard`): card da startup com badge "Nova rodada disponível"
- Detalhe da startup (somente se todas condições OK)
- **NUNCA** aparece se a captação atual está em andamento (OPEN/PAUSED/DRAFT)

**Campos da Nova Rodada** (visíveis somente quando a página é acessível):

| Campo | Tipo | Validação |
|-------|------|-----------|
| Título (`title`) | text | Obrigatório, max 120 chars |
| Meta de Captação (R$) | number | Dentro dos limites SystemConfig |
| Investimento Mínimo (R$) | number | > 0 |
| Valuation (R$) | number | > 0 |
| Preço do Token (R$) | number | > 0 |
| Total de Tokens | number | Inteiro, dentro dos limites |
| Deadline | date | Futuro |
| Comissão Afiliado (%) | select | 5% ou 10% (congelada após lançamento) |
| Descrição | text | Opcional |

**Mensagens de Bloqueio (Toast no redirect)**:

| Situação | Mensagem |
|----------|----------|
| Campanha ainda em OPEN/PAUSED | "Sua captação atual ainda está em andamento. Finalize-a antes de abrir uma nova rodada." |
| Campanha em DRAFT (pré-compliance) | "Sua captação está aguardando aprovação. Não é possível abrir outra rodada." |
| Tokens não 100% vendidos | "A rodada anterior precisa estar 100% vendida para iniciar uma nova." |
| Carência de 3 meses | "É preciso esperar 3 meses desde o encerramento da rodada anterior." |
| Repasse não concluído | "O repasse de fundos da rodada anterior precisa ser concluído primeiro." |

---

## 5. Modelo de Dados Financeiros (Compliance & Auditoria)

### 5.1 Configurações Financeiras Dinâmicas (`SystemConfig`)

Todas as taxas e limites são configuráveis pelo Admin via `/admin/config`:

| Chave | Descrição | Valor Default | Tipo |
|-------|-----------|:-------------:|------|
| `TOKEN_BASE_VALUE` | Valor base (face) de cada token | R$ 10,00 | Decimal(15,4) |
| `TOKEN_TRANSACTION_FEE` | Taxa de transação sobre o valor base | R$ 0,50 | Decimal(15,4) |
| `TOKEN_MINT_FEE` | Custo de geração por token | R$ 0,50 | Decimal(15,4) |
| `PLATFORM_ADMIN_FEE_PCT` | % da meta que vai para admin (taxa plataforma) | 0.20 (20%) | Decimal(15,4) |
| `COMPLIANCE_FEE` | Taxa fixa pós-`FUNDED` cobrada da startup | R$ 0,00 | Decimal(15,4) |
| `CAMPAIGN_MIN_TARGET` | Captação mínima por campanha | R$ 100.000 | Decimal(15,4) |
| `CAMPAIGN_MAX_TARGET` | Captação máxima por campanha | R$ 5.000.000 | Decimal(15,4) |
| `CAMPAIGN_MIN_TOKENS` | Mínimo de tokens por campanha | 100 | Decimal(15,4) |
| `CAMPAIGN_MAX_TOKENS` | Máximo de tokens por campanha | 500.000 | Decimal(15,4) |

### 5.2 Snapshots Financeiros por Campanha (ADR-008)

Gravados na criação da campanha para reconstruir cálculos históricos sem depender de configs que podem mudar:

| Snapshot | Fórmula | Propósito |
|----------|---------|-----------|
| `tokenBaseValue` | `targetAmount / totalTokens` | Valor de face do token |
| `tokenSellPrice` | `= tokenBaseValue` (Modelo A) | Preço de venda para investidor |
| `adminFeeValue` | `targetAmount × PLATFORM_ADMIN_FEE_PCT` | Receita da plataforma |
| `tokenMintingCost` | `totalTokens × TOKEN_MINT_FEE` | Custo operacional de emissão |

### 5.3 Registro de Auditoria CVM (`CampaignOfferAuditLog`)

Log imutável de aceites de termos regulatórios:

| Campo | Descrição |
|-------|-----------|
| `campaignId` | FK para campanha |
| `action` | `ACEITE_TERMO_REPASSE` ou `DECLARACAO_VERACIDADE` |
| `ip` | IP do solicitante |
| `userAgent` | User-Agent do navegador |
| `userId` | Quem aceitou |
| `occurredAt` | Timestamp exato |

> **LGPD**: Logs mantidos por mínimo de 5 anos. IP e User-Agent não são expostos em APIs públicas.

---

## 6. APIs (Contratos de Interface)

### 6.1 Criação & Submissão

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/api/startup` | Cria startup + campanha DRAFT | Founder |
| `POST` | `/api/startup/:id/draft` | Salva rascunho (não persiste) | Founder |
| `GET` | `/api/startup/:id/draft` | Recupera rascunho | Founder |
| `DELETE` | `/api/startup/:id/draft` | Descarta rascunho | Founder |

### 6.2 Edição & Complementação

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `PATCH` | `/api/startup/:id` | Atualiza dados gerais | Founder (owner) |
| `PATCH` | `/api/startup/:id/banking` | Atualiza dados bancários | Founder (owner) |
| `PATCH` | `/api/startup/:id/team` | Atualiza equipe | Founder (owner) |
| `PATCH` | `/api/campaigns/:id` | Atualiza campos CVM da campanha | Founder (owner) |
| `PUT` | `/api/campaigns/:id/resources` | Substitui alocações (soma=100%) | Founder (owner) |
| `POST` | `/api/founder/startups/:id/change-requests` | Solicita alteração pós-aprovação | Founder |

### 6.3 Documentos

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/api/startup/:id/documents` | Lista documentos | Founder / Compliance |
| `POST` | `/api/startup/:id/documents` | Upload de documento | Founder |
| `DELETE` | `/api/startup/:id/documents/:docId` | Remove documento | Founder |
| `GET` | `/api/startup/:id/documents/:docId/download` | Download (presigned URL) | Founder / Compliance |

### 6.4 Pagamento & Checkout

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/api/payment/startup-checkout` | Dados do checkout | Founder |
| `POST` | `/api/payment` | Gera pagamento PIX | Founder |
| `POST` | `/api/payment/webhook` | Callback C6 Bank (PIX pago) | Sistema (signature) |

### 6.5 Compliance & Curadoria

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/admin/startups` | Lista startups (paginado, filtro status) | Admin / Compliance |
| `GET` | `/admin/startups/:id` | Detalhe completo para auditoria | Compliance |
| `POST` | `/admin/compliance/startup/:id/decide` | Aprovar/Rejeitar | Compliance |
| `GET` | `/admin/compliance/dashboard` | KPIs (pendentes, aprovadas hoje) | Compliance |

### 6.6 Campanhas & Rodadas

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/api/campaigns` | Lista campanhas públicas | Público |
| `GET` | `/api/campaigns/:id` | Detalhe da campanha | Público |
| `POST` | `/campaigns/:startupId/new-round` | Abre nova rodada (Regra B05) | Founder |
| `PATCH` | `/campaigns/:id/action` | State machine (PAUSE/RESUME/FINISH) | Admin |
| `GET` | `/api/campaigns/:id/resources` | Alocações de recursos | Público |

### 6.7 Tokens & Verificação

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/api/tokens/certificate/:orderId` | Download certificado de titularidade | Founder / Admin |
| `GET` | `/api/verificar/:documentId` | Verificação pública de documento assinado | **Público** |
| `GET` | `/api/verificar-token/:hash` | Verificação pública de token | **Público** |

---

## 7. Regras de Compliance & Validação de Dados

### 7.1 Validação em Camadas (Defense in Depth)

| Camada | Responsabilidade | Tecnologia |
|--------|-----------------|------------|
| **Frontend** | UX feedback imediato + formatação | Zod schemas + react-hook-form |
| **API Gateway** | Rate limiting + headers seguros | Helmet + ThrottlerGuard |
| **Controller** | Validação de entrada estrutural | class-validator + ValidationPipe |
| **Service** | Regras de negócio + limites dinâmicos | CampaignFinancialHelper + SystemConfig |
| **Database** | Constraints + integridade referencial | Prisma + MySQL (FK, UNIQUE, NOT NULL) |

### 7.2 Validações Financeiras Obrigatórias

| Validação | Onde | Código de Erro |
|-----------|------|----------------|
| Meta ≥ CAMPAIGN_MIN_TARGET | Service | `TARGET_BELOW_MINIMUM` |
| Meta ≤ CAMPAIGN_MAX_TARGET | Service | `TARGET_ABOVE_MAXIMUM` |
| Tokens ≥ CAMPAIGN_MIN_TOKENS | Service | `TOKENS_BELOW_MINIMUM` |
| Tokens ≤ CAMPAIGN_MAX_TOKENS | Service | `TOKENS_ABOVE_MAXIMUM` |
| Equity entre 5% e 49% | Frontend + Backend | Zod + class-validator |
| Soma alocações = 100% | Frontend (superRefine) + Backend (@ValidateSum100) | `RESOURCE_SUM_NOT_100` |
| tokensSold ≤ totalTokens | Investment Service | `TOKENS_SOLD_OUT` |
| Reserva não duplicada | TokenReservation | UNIQUE constraint |

### 7.3 Validações de CNPJ (IN RFB 2.229/2024)

| Check | Descrição |
|-------|-----------|
| Formato | 14 chars alfanuméricos (legado: numérico puro; novo: A-Z + 0-9) |
| DV1 e DV2 | Algoritmo oficial RFB com pesos cíclicos [2..9] |
| Status ATIVA | Consulta real-time na Receita Federal |
| Unicidade | UNIQUE constraint no banco (`startup.cnpj`) |
| Blacklist | CNPJs em situação BAIXADA/CANCELADA/SUSPENSA rejeitados |

### 7.4 Proteção contra Fraude

| Mecanismo | Implementação |
|-----------|---------------|
| Idempotência de Emissão | Verifica se tokens já existem antes de emitir (investment.tokens.length > 0) |
| FOR UPDATE SKIP LOCKED | Workers paralelos sem colisão (MySQL 8+) |
| Token Hash Único | SHA-256 com salt. UNIQUE constraint no banco. |
| Rate Limiting | ThrottlerGuard em endpoints de pagamento |
| Double-Spending Prevention | TokenReservation com TTL + status machine |
| Audit Trail | CampaignOfferAuditLog para aceites. Payment com txid/endToEndId. |

### 7.5 LGPD & Retenção de Dados

| Dado | Classificação | Retenção | Acesso |
|------|--------------|----------|--------|
| CPF/CNPJ do fundador | Dado Pessoal Sensível | 5 anos pós-encerramento | Compliance + Admin |
| Dados bancários | Dado Financeiro | Duração da operação + 5 anos | Financeiro + Admin |
| Logs de auditoria | Evidência Legal | Mínimo 5 anos | Compliance (read-only) |
| IP/User-Agent (audit) | Metadado | 5 anos | Não exposto via API |
| Documentos CVM | Regulatório | Duração da oferta + 5 anos | Compliance + Founder |

---

## 8. Edição da Startup (Pós-Criação)

**Rota**: `/founder/startups/:id/edit`  
**Layout**: `edit-startup-layout.tsx` com sidebar de navegação entre abas.

### 8.1 Aba Identidade

Campos completos de identidade legal, branding, localização e redes sociais. Inclui busca CNPJ com auto-fill e endereço via ViaCEP.

**Campos sensíveis pós-aprovação** (requerem `DataChangeRequest`):
- CNPJ
- Razão Social
- Dados Bancários

> Alteração desses campos após status `APPROVED`/`LIVE` gera solicitação formal ao Compliance via `POST /api/founder/startups/:id/change-requests`.

### 8.2 Aba Time

Lista dinâmica de membros com roles (Founder, Advisor, Employee). Cada membro exige nome, cargo, LinkedIn e mini-bio.

### 8.3 Aba Documentos

Upload de documentos regulatórios com categorias CVM (17 tipos). Suporte a dispensa com justificativa ("Não se aplica"). Inclui Termo de Adesão Digital com assinatura PKI.

### 8.4 Aba Bancário

Dados bancários completos para repasse. Inclui documento do titular e chave PIX opcional.

---

## 9. Configurações Administrativas

### 9.1 Painel de Configuração Financeira

**Rota**: `/admin/config`  
**Endpoint**: `GET/PATCH /admin/config/fundraising`

Todas as 9 chaves de `FinancialConfigs` são editáveis pelo Admin. Mudanças afetam APENAS novas campanhas (snapshots protegem campanhas existentes).

### 9.2 Limites por Estágio

Os limites por estágio são validados no frontend (UX imediata) e re-validados no backend (segurança):

| Configuração | Frontend | Backend |
|--------------|----------|---------|
| Limites por estágio | Constante `LIMITES_CAPTACAO` no schema Zod | `SystemConfig` dinâmico |
| Equity min/max | Loader `/admin/config/fundraising` | `SystemConfig` |
| Token price | Loader | `SystemConfig` |

> **NOTA**: O frontend usa valores do Loader (SSR) que vêm do backend. Não há valores hardcoded que contradigam o backend.

---

## 10. Riscos & Mitigações

| # | Risco | Impacto | Probabilidade | Mitigação |
|---|-------|---------|:-------------:|-----------|
| 1 | Oversell de tokens (vender mais do que existe) | Alto | Baixa | `TokenReservation` + `FOR UPDATE SKIP LOCKED` + constraint `tokensSold ≤ totalTokens` |
| 2 | Pagamento duplicado de reserva | Médio | Baixa | Idempotência via `Payment.txid` UNIQUE + verificação de `reservationFeePaid` |
| 3 | Startup fraudulenta passa no compliance | Alto | Média | Checklist rigoroso de 4 blocos + KYC biométrico obrigatório + documentos CVM |
| 4 | Dados bancários incorretos no repasse | Alto | Baixa | Cross-validação titular vs CNPJ/sócio + confirmação manual do Financeiro |
| 5 | Configuração financeira alterada afeta campanhas ativas | Médio | Baixa | Snapshots ADR-008 congelam valores na criação. Configs novas só afetam novas campanhas. |
| 6 | Worker de emissão processa mesma ordem 2x | Médio | Baixa | Idempotência + `FOR UPDATE SKIP LOCKED` + check `tokens.length > 0` |
| 7 | Fundador tenta abrir duas rodadas simultâneas | Médio | Média | Regra B05 no service + constraint lógica no frontend (gate no botão) |
| 8 | Deadline vencido sem encerramento automático | Baixo | Média | Cron job `CampaignDeadlineWorker` verifica a cada 5 min |
| 9 | Documento com conteúdo malicioso enviado | Alto | Baixa | Validação de MIME, sanitização e controle de disponibilidade antes de disponibilizar o arquivo |
| 10 | Perda de sessão durante wizard longo | Baixo | Alta | Auto-save via rascunho (`POST /api/startup/:id/draft`) a cada mudança de step |

---

## 11. Métricas de Sucesso (KPIs)

### 11.1 Métricas do Módulo

| KPI | Meta | Medição |
|-----|------|---------|
| Taxa de conversão wizard → checkout | ≥ 60% | `COUNT(startups com pagamento) / COUNT(startups criadas)` |
| Tempo médio de curadoria (compliance) | ≤ 48h | `AVG(decidedAt - submittedAt)` |
| Taxa de aprovação compliance | ≥ 70% | `COUNT(APPROVED) / COUNT(decididas)` |
| Taxa de captação bem-sucedida | ≥ 50% | `COUNT(FUNDED) / COUNT(OPEN que passaram deadline)` |
| Tempo médio para 100% captado | ≤ 60 dias | `AVG(fundedAt - openedAt)` para campanhas FUNDED |
| Taxa de cancelamento de investimento | ≤ 5% | `COUNT(CANCELED) / COUNT(CONFIRMED)` |

### 11.2 Métricas de Saúde do Sistema

| Métrica | Alerta |
|---------|--------|
| Fila de compliance pendente | > 20 startups sem decisão em 48h |
| Pagamentos PIX não confirmados | > 10 payments PENDING por > 1h |
| Workers de emissão parados | 0 tokens emitidos em 24h com ordens pendentes |
| Reservas expiradas sem liberação | > 5 TokenReservations RESERVED por > 1h |

---

## 12. Dependências & Integrações Externas

| Serviço | Uso no Módulo | Fallback |
|---------|---------------|----------|
| Receita Federal (CNPJ) | Validação de status ATIVA + auto-fill | Preenchimento manual |
| C6 Bank (PIX) | Geração QR Code + Webhooks de pagamento | Aprovação manual pelo Financeiro |
| ViaCEP | Auto-fill de endereço por CEP | Preenchimento manual |
| Pipeline de uploads | Validação de MIME, sanitização e processamento síncrono | Upload rejeitado quando inválido |
| RustFS (S3) | Storage de documentos, logos, certificados | N/A (critical path) |
| Redis | Session cache + TTL de reservas | N/A (critical path) |
| PKI Interna (CA) | Assinatura de termos e certificados | N/A (critical path) |

---

## 13. Glossário

| Termo | Definição |
|-------|-----------|
| **Campanha / Rodada** | Uma oferta pública de tokens vinculada a uma startup. Cada campanha tem meta, prazo e tokens. |
| **Taxa de Reserva** | 5% da meta de captação, paga pelo fundador para garantir a geração dos tokens. |
| **Fast Track Review** | Serviço pago (R$ 500) que prioriza a startup na fila do Compliance. |
| **Tokenomics** | Conjunto de cálculos financeiros: preço, quantidade, taxas e custos dos tokens. |
| **Snapshot Financeiro** | Valores congelados na criação da campanha (protegem contra mudanças de config). |
| **Regra B05** | Regra de negócio que impede nova rodada sem finalização + carência da anterior. |
| **MIE** | Material Informativo Essencial — documento obrigatório pela CVM 88/2022. |
| **FOR UPDATE SKIP LOCKED** | Técnica SQL para concorrência atômica entre workers sem deadlock. |
| **DataChangeRequest** | Solicitação formal de alteração de dados sensíveis pós-aprovação. |
| **ADR-008** | Architecture Decision Record que define o modelo de cálculo financeiro. |

---

## 14. Notas de Implementação

### 14.1 O que já está implementado

- ✅ Wizard de 3 etapas no frontend (create-startup.tsx)
- ✅ Schema Zod com validação CNPJ alfanumérico (new-startup-schema.ts)
- ✅ CampaignsCreateService com regra B05 + snapshots ADR-008
- ✅ CampaignFinancialHelper com validação de limites + cálculo
- ✅ Compliance approve/reject via AdminComplianceController
- ✅ TokensService com emissão por investment (hash SHA-256)
- ✅ SystemConfig com FinancialConfigs (9 chaves)
- ✅ CampaignResourceAllocation com soma=100%
- ✅ AuditLog CVM (aceiteTermoRepasse, declaracaoVeracidade)
- ✅ TokenReservation para prevenção de oversell
- ✅ Estado machine de Campaign (DRAFT→OPEN→PAUSED→CLOSED→FUNDED→PAID_OUT)
- ✅ Documentos CVM com 16 categorias em enum

### 14.2 O que precisa ser implementado/melhorado

- ⬜ Modelo `TokenIssuanceOrder` no Prisma (hoje é conceito sem tabela)
- ⬜ Cron job `CampaignDeadlineWorker` para encerramento automático
- ⬜ Gate no frontend para bloquear nova rodada com banner detalhado de razões
- ⬜ Validação explícita de "nenhuma campanha OPEN/PAUSED" no service (além da B05)
- ⬜ Checklist formal de Compliance no frontend (hoje é visual, sem tracking de items)
- ⬜ Encriptação AES-256 de dados bancários em repouso
- ⬜ Endpoint de métricas/KPIs do módulo de captação
- ⬜ Webhook de notificação automática quando deadline é atingido
- ⬜ Auto-save de rascunho durante wizard (save parcial por step)
- ⬜ Fluxo de ressubmissão pós-rejeição (hoje rejeição é terminal)

---

*Documento gerado com base na análise do codebase atual (backend NestJS + frontend React) e especificação de negócio existente. Revisão humana recomendada antes de iniciar desenvolvimento.*
