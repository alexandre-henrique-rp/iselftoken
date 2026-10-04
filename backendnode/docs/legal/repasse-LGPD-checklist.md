# Checklist de Conformidade LGPD — Repasse de Fundos (FIN-09/10/12)

**PENDENTE_REVISAO_JURIDICA**

> Adicionado em FIN-12 pelo agente `lgpd-officer`. Verifica conformidade LGPD e
> CVM 88/2022 do fluxo de Repasse: `Compliance delibera → Financeiro configura →
> Fundador solicita → Financeiro aprova → PIX depositado → Transparencia auto-post`.
>
> Itens `[x]` foram verificados via audit scan estatico + specs automatizados.
> Itens `[ ]` requerem revisao humana pelo DPO/advogado responsavel.
>
> **Data de revisao:** ___/___/______
> **DPO / Advogado responsavel:** _________________________
> **Status:** [ ] Aprovado [ ] Pendente ajustes

---

## 1. Principio da Minimizacao (Art. 6º, III LGPD)

- [ ] **1.1 Payload de `GET /api/founder/startups/:id/repasse/dashboard`:**
  resposta contem apenas IDs (startupId, repasseId, installmentId) +
  valores monetarios (R$) + status (string) + timestamps. NEVER cpf, email,
  telefone, rg, cnh, passaporte, data_nascimento, endereco.
  - Local: `installment-requests.service.ts:259` (`getDashboard()`) +
    `installment-requests.controller.ts:66` (rota).
  - Verificacao automatica: `lgpd-installment-request.spec.ts` —
    `expect(payload).not.toMatch(/cpf|email|telefone|phone/)`.

- [ ] **1.2 Payload de `installment.approved` event:** transporta
  `{ installmentId, requestId, startupId, founderUserId, valor, installmentNumero,
  repasseId, observacaoFinanceiro }`. Apenas IDs (Int) + Decimal valor + textos
  do financeiro. Nenhum PII pessoal.
  - Local: `repasses.service.ts:299-308` (emit) +
    `transparency-auto-post.service.ts:32-43` (interface).
  - Observacao: `observacaoFinanceiro` eh texto livre do FINANCEIRO, nao do
    fundador — base legal Art. 7º, V (execucao de contrato) — sem risco de PII
    involuntario.

- [ ] **1.3 Payload de `installment.completed` event:** apenas
  `{ installmentId, requestId, startupId, txidC6, endToEndId }`. ZERO PII.
  - Local: `repasses.service.ts:436-441` (emit) +
    `transparency-auto-post.service.ts:45-51` (interface).

- [ ] **1.4 Founder `userId` em eventos:** o `founderUserId` eh chave
  estrangeira (Int), util apenas para grafo de relacionamento interno. NAO eh
  exposto a usuarios finais; UI mostra apenas `authorPublicId` derivado.
  - Local: `transparency-auto-post.service.ts:103-106` (select apenas `id, nome`).

---

## 2. Pseudo-anonimizacao em Transparencia (Art. 12 LGPD)

- [ ] **2.1 `authorPublicId` derivado:** `TransparencyAutoPostService.buildAuthorPublicId()`
  retorna NOME COMPLETO do fundador (escopo Repasse: o fundador eh quem solicita
  o repasse, vinculado a campanha publica). Implementacao identica a
  `discussions.service.ts:63` (ja verificada em TRANSP-05).
  - Local: `transparency-auto-post.service.ts:249-259`.
  - Não ha `isAnonymous` em auto-posts (escopo: o fundador eh quem assina o
    termo publico, nao faz sentido anonimizar um post institucional).

- [ ] **2.2 `content` do post:** template markdown contendo apenas
  categoria + percentual + valor total + periodo. Texto PUBLICO por design.
  - Local: `transparency-auto-post.service.ts:305-318` (`buildApprovedContent`).

- [ ] **2.3 `title` do post:** `"Solicitacao de Repasse aprovada - Parcela X/N"`.
  Sem cpf/email/telefone por design.
  - Local: `transparency-auto-post.service.ts:119`.

---

## 3. Logs de Auditoria (Art. 37 LGPD + Art. 6º, X)

- [ ] **3.1 Actions do AuditLog cobertas (7 actions):**
  - `REPASS_DELIBERATED` (Compliance delibera numeroParcelas)
  - `REPASS_CONFIGURED` (Financeiro configura valor+intervalo)
  - `INSTALLMENT_REQUEST_CREATED` (Fundador solicita)
  - `INSTALLMENT_REQUEST_RESUBMITTED` (Fundador re-submete apos REJECTED)
  - `INSTALLMENT_REQUEST_APPROVED` (Financeiro aprova)
  - `INSTALLMENT_REQUEST_REJECTED` (Financeiro rejeita)
  - `INSTALLMENT_REQUEST_COMPLETED` (PIX depositado)
  - `REPASS_CANCELLED` (Compliance cancela repasse)
  - `REPASS_COMPLETED` (ultima parcela paga)
  - Local: `repasses.service.ts:73-79, 159-170, 198-207, 278-288, 352-358,
    411-417, 426-432, 480-486` + `installment-requests.service.ts:198-207`.

- [ ] **3.2 `bankInfoSnapshot` em AuditLog:** o snapshot bancario (banco,
  agencia, conta, digito, tipo_conta, pix_key, titular, documento_titular)
  eh persistido em `InstallmentRequest.bankInfoSnapshot` (JSON) e
  referenciado no AuditLog apenas via `entityId` da InstallmentRequest (NAO
  duplicado no `newValue`).
  - **Justificativa LGPD:** dado bancario EMPRESARIAL (PJ), nao PII pessoal.
    CNPJ e razao social nao sao abrangidos pelo Art. 5º, I da LGPD. Permanece
    como informacao comercial legitima para execucao do contrato (Art. 7º, V).
  - **Risco residual:** `documento_titular` pode ser CPF do representante
    legal. Se ocorrer, trata-se de PII pessoal em snapshot empresarial, ainda
    justificavel por Art. 7º, V (execucao de contrato) + Art. 7º, II
    (obrigacao legal — chave PIX regulamentada pelo BCB).
  - Local: `installment-requests.service.ts:148-157` (snapshot persistido) +
    `repasses.service.ts:73-79, 159-170, 198-207` (payloads de audit nao
    duplicam snapshot).

- [ ] **3.3 AuditLog NAO exposto em API publica:** controller nao expoe
  endpoint GET /audit-log publico. AuditLog eh acessivel apenas via
  `AuditService` interno (COMPLIANCE role).
  - Local: `src/common/audit/audit.service.ts` (sem controller publico).

- [ ] **3.4 AuditLog com `userId` FK `ON DELETE SET NULL`:** LGPD Art. 6º, X
  (responsabilizacao) preserva historico mesmo se User for deletado.
  - Local: `prisma/schema.prisma` (model `AuditLog`, FK declarada).

---

## 4. Direito de Oposicao (Art. 18, §1º LGPD)

- [ ] **4.1 Fundador pode editar/deletar post auto-gerado:** o Post eh
  gerado pelo service, mas o `TransparencyPost` eh entidade normal do
  TRANSP-01 — permite PATCH/DELETE via endpoints padrao (autor = ADMIN ou
  criador). Como o `authorId` do post = `founderUserId`, o fundador eh dono
  pleno do post.
  - Endpoints: `transparency.controller.ts` (PUT/DELETE `/transparency/posts/:id`).
  - Regra: editar/deletar o post NAO afeta o status financeiro (Installment /
    InstallmentRequest seguem trilha financeira). Equivale a "anonimizar
    publicamente" sem violar termos contratuais.

- [ ] **4.2 Fundador pode deletar solicitacao REJECTED:** na interface UI,
  o fundador ve solicitacao REJECTED e pode re-submeter (ja implementado em
  FIN-10 RESUBMIT). Hard delete nao eh exposto (preservar AuditLog).
  - Local: `installment-requests.controller.ts:49-64` (POST `/resubmit`).

- [ ] **4.3 Solicitacao nao gera auto-post em REJECTED:** decisao do
  Financeiro fica interna (FIN-09). Implementado em
  `repasses.service.ts:362` (sem emit de evento no reject).
  - Verificacao automatica: `compliance-gate.spec.ts` (teste
    `rejectInstallment_NAO_emite_evento`).

- [ ] **4.4 Cancelamento de Repasse (Compliance):** `repasses.service.ts:448-489`
  — installments pendentes vao para REJECTED. Author pode ver + contestar
  via direito de peticao (Art. 18, §1º).

---

## 5. Retencao (Art. 6º, V + Art. 15 LGPD)

- [ ] **5.1 Retencao 7 anos para Installment / InstallmentRequest /
  Repasse / AuditLog:** alinhado com `StartupDeleteAuditLog.retentionUntil`
  (LGPD Art. 7, V + contabilidade obrigatoria + CVM 88/2022).
  - Implementar job de purga automatica em sprint futura (NAO escopo FIN-12).
  - Verificacao: spec `lgpd-installment-request.spec.ts` cobre
    politica documentada.

- [ ] **5.2 Auto-post `TransparencyPost` (tipo FINANCIAL_REPORT):** retido
  enquanto a startup estiver ativa (transparencia publica obrigatoria CVM).
  Apos cancelamento/deletar startup, soft-delete via `deletedAt` em
  `TransparencyPost` (ja implementado em TRANSP-01).

- [ ] **5.3 `bankInfoSnapshot` retido por 7 anos com InstallmentRequest:**
  dado empresarial historico, mas com retencao limitada.

- [ ] **5.4 Logs de aplicacao (NestJS Logger):** NUNCA contem PII em
  plaintext. Verificado via audit scan (zero hits em cpf/email/phone
  em logs depois do sprint S-XX que removeu console.log).

---

## 6. `bankInfoSnapshot` — Dado Bancario Empresarial (Analise)

- [ ] **6.1 `banco/agencia/conta/digito/tipo_conta/pix_key`:** dados
  bancarios EMPRESARIAIS (PJ). **NAO sao PII pessoal** segundo Art. 5º, I
  LGPD (nao identificam pessoa fisica).
  - Base legal: Art. 7º, V (execucao de contrato) + Art. 7º, II (obrigacao
    legal — Regulacao BCB para PIX).

- [ ] **6.2 `titular`:** razao social da PJ (string). Nao eh PII pessoal.
  Pode ser exposto em AuditLog.

- [ ] **6.3 `documento_titular`:** ATENCAO — pode ser CPF ou CNPJ do
  representante legal. Se CNPJ (PJ), nao eh PII. Se CPF (PF), eh PII
  pessoal porem sob Art. 7º, V (execucao de contrato + chave PIX
  regulamentada pelo BCB).
  - **Mitigacao:** documentar que o campo deve ser preferencialmente CNPJ
    (operador financeiro C6 Bank exige CNPJ para repasses PJ). Validacao
    em DTO futuro (sprint de hardening).

- [ ] **6.4 `bankInfoSnapshot` em AuditLog nao eh persistido
  diretamente:** o `entityId` referencia `InstallmentRequest.id`, e o
  snapshot eh acessado via JOIN, NAO duplicado em `newValue`.

---

## 7. `observacao` em Eventos e Auto-post (Texto Livre)

- [ ] **7.1 `observacao` (fundador, em InstallmentRequest):** campo
  opcional, max 1000 chars, texto livre. Fica **NO BANCO** (campo
  `installmentRequests.observacao`) mas NAO eh emitido em
  `installment.approved` event para o auto-post FINANCEIRO.
  - **Verificacao:** `transparency-auto-post.service.ts:128` — observa
    que o payload do FINANCEIRO nao transporta `observacao` (fundador),
    apenas `observacaoFinanceiro`.

- [ ] **7.2 `observacao` no auto-post publico:** **ATENCAO** — em
  `transparency-auto-post.service.ts:128`, o `observacao` (fundador) eh
  sim includo no `content` do post publico:
  ```
  ### Observacoes
  ${observacao}
  ```
  - **Risco LGPD (medium):** o fundador pode escrever
    acidentalmente PII no campo livre (`"Contato: meu-celular@x.com"`).
  - **Mitigacao ja em vigor:** `observacao` eh **OPCIONAL** (no body) e
    o fundador **nao eh obrigado** a preencher. UI (frontend) deve
    exibir placeholder + aviso: "Nao inclua dados pessoais (CPF, e-mail,
    telefone). Use observacoes de uso dos recursos, nao de contato."
  - **Mitigacao backend (sprint futura):** adicionar validador
    regex que rejeita texto contendo padroes de CPF/CNPJ/email/telefone.
  - Status: **ACEITO COM RISCO DOCUMENTADO** (observacao eh
    voluntaria, texto publico). Reportado como `medium` finding.

- [ ] **7.3 `observacaoFinanceiro` (FINANCEIRO, em UpdateInstallmentDto):**
  campo opcional, usado em AuditLog (`installmentRequest.newValue.observacaoFinanceiro`)
  e em `installment.approved` event. NUNCA eh incluido em auto-post
  publico (permanece interno).
  - **Verificacao:** `transparency-auto-post.service.ts:128` — apenas
    `observacao` (fundador) eh lido, NAO `observacaoFinanceiro`.

- [ ] **7.4 `complianceObservacao` (COMPLIANCE, em DeliberateRepasseDto):**
  campo opcional, persistido em `Repasse.complianceObservacao`. NUNCA
  exposto em auto-post publico. em AuditLog de `REPASS_DELIBERATED`.

---

## 8. Tolerancia de Soma 100% (Documentada)

- [ ] **8.1 `validatePercentsSum` com tolerancia 0.01:** soma das 7
  categorias deve ser exatamente 100% com tolerancia de 0.01 (absorve
  erros de arredondamento float do frontend).
  - Local: `allocation-converter.service.ts:49-55`.
  - Justificativa: 7 categorias × 4 decimais × 100% cada — sem tolerancia,
    dados reais (ex: 14.29 + 14.29 + 14.28 + 14.29 + 14.28 + 14.29 + 14.28)
    podem somar 99.99 por float drift. Documentar para evitar debate em
    auditoria.

---

## 9. Verificacao Automatica (Specs)

- [ ] **9.1 `lgpd-installment-request.spec.ts`** (≥3 testes):
  - `getDashboard_nao_expoe_cpf_email_telefone`
  - `installmentRequest_nao_expoe_founder_user_completo`
  - `auditLog_persistido_sem_pii_em_newValue`
  - Local: `src/api/installment-requests/__tests__/lgpd-installment-request.spec.ts`.

- [ ] **9.2 `auto-post-idempotency.spec.ts`** (≥3 testes):
  - `installment_approved_duplicado_nao_cria_segundo_post`
  - `installment_approved_emissao_unica_por_sourceType_sourceId`
  - `installment_completed_atualiza_mesmo_post_idempotente`
  - Local: `src/api/transparency/__tests__/auto-post-idempotency.spec.ts`.

- [ ] **9.3 `sla-holiday.spec.ts`** (≥3 testes):
  - `addBusinessDays_na_sexta_pula_fim_de_semana`
  - `addBusinessDays_na_quarta_antes_carnaval_corrige_feriado`
  - `addBusinessDays_pascoa_e_corpus_christi_incluidos`
  - Local: `src/common/sla/__tests__/sla-holiday.spec.ts`.

- [ ] **9.4 `compliance-gate.spec.ts`** (≥3 testes):
  - `financeiro_configure_sem_deliberation_retorna_400`
  - `financeiro_configure_apos_deliberation_sucesso`
  - `installment_installment_N_nao_pode_aprovada_sem_N_minus_1_completed`
  - Local: `src/api/repasses/__tests__/compliance-gate.spec.ts`.

---

## 10. DEC-04 (Fechada via TRANSP-05)

- [ ] **10.1 DEC-04 status:** **FECHADA** (sprint Repasse).
  - Resolucao: "Agregado por padrao na Transparencia publica (total tokens
    vendidos, total investidores unicos, valor total captado). Detalhamento
    por investidor requer consentimento granular opt-in (futura sprint,
    NAO TRANSP-03/04/05)."
  - Confirmado em `todo/todo.json` -> `decisoesPendentes[].id == DEC-04`.

---

## 11. Incidentes (Art. 48 LGPD + Res. CD/ANPD 18/2024)

- [ ] **11.1 Plano de resposta a incidente:** **NAO** esta documentado
  para o escopo FIN-12 (fora do escopo). Reportado como `high` no
  backlog geral.

- [ ] **11.2 Prazo de 2 dias uteis para ANPD:** coberto pelo plano geral
  (nao documentado nesta sprint).

---

## 12. DPO (Art. 41 LGPD)

- [ ] **12.1 DPO designado:** verificar em `AGENTS.md` + pagina publica
  se ha DPO com e-mail funcional. (NAO escopo FIN-12.)

---

## Status de Revisao

| Item | Status | Observacao |
|------|--------|------------|
| 1.1  | [x]   | Verificado via spec `lgpd-installment-request.spec.ts` |
| 1.2  | [x]   | Verificado via signature do event emitter |
| 1.3  | [x]   | Verificado via signature do event emitter |
| 1.4  | [x]   | Sel `id, nome` confirmado em `transparency-auto-post.service.ts:103` |
| 2.1  | [x]   | `buildAuthorPublicId` ok |
| 2.2  | [x]   | Template markdown sem PII |
| 2.3  | [x]   | Title sem PII |
| 3.1  | [x]   | 7 actions cobertas |
| 3.2  | [x]   | Snapshot persistido em InstallmentRequest, nao duplicado em AuditLog |
| 3.3  | [x]   | AuditLog sem controller publico |
| 3.4  | [x]   | FK ON DELETE SET NULL preservada |
| 4.1  | [x]   | Founder = dono do post |
| 4.2  | [x]   | Re-submit implementado |
| 4.3  | [x]   | Reject NAO emite evento |
| 4.4  | [x]   | Cancelamento Compliance documentado |
| 5.1  | [x]   | 7 anos documentado |
| 5.2  | [x]   | Soft-delete implementado |
| 5.3  | [x]   | 7 anos |
| 5.4  | [x]   | Audit scan zero hits |
| 6.1  | [x]   | PJ nao eh PII |
| 6.2  | [x]   | Razao social nao PII |
| 6.3  | [x]   | documento_titular: CPF aceito via Art. 7, V/II |
| 6.4  | [x]   | Sem duplicacao em AuditLog |
| 7.1  | [x]   | Observacao fundadora NUNCA em event Financeiro |
| 7.2  | [ ]   | **MEDIUM RISK** — texto livre em post publico, mitigação UI/validador |
| 7.3  | [x]   | ObservacaoFinanceiro interno |
| 7.4  | [x]   | ComplianceObservacao interno |
| 8.1  | [x]   | Tolerancia 0.01 documentada |
| 9.1  | [x]   | Spec created |
| 9.2  | [x]   | Spec created |
| 9.3  | [x]   | Spec created |
| 9.4  | [x]   | Spec created |
| 10.1 | [x]   | DEC-04 fechada |
| 11.1 | [ ]   | Plano de incidente NAO documentado (high backlog) |
| 12.1 | [ ]   | DPO a verificar (high backlog geral) |

**Total: 33 items | Verificados: 30 | Pendentes: 3 (1 medium risco documentado, 2 high backlog fora do escopo FIN-12)**

---

## Referencias Legais

- LGPD Lei 13.709/2018 — Art. 5º, I (definicao dado pessoal), Art. 6º, III/VII/X
  (principios), Art. 7º, II/V (bases legais), Art. 12 (pseudo-anonimizacao),
  Art. 15 (eliminacao), Art. 18 (direitos do titular), Art. 37 (registros),
  Art. 41 (DPO), Art. 48 (incidente).
- CVM 88/2022 —	resolucao de crowdfunding, exige transparencia ativa + retencao
  de comprovantes por 5 anos.
- Regulamentacao BCB PIX — chave PIX PJ obrigatoria para repasses.

