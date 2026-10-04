# Checklist LGPD — Sistema de Email Templates

**Versão:** 1.0 (2026-08-22)
**Aplicável a:** Sprint FIN-05 — EmailTemplate system + RepassesNotificationService
**Base legal:** Lei 13.709/2018 (LGPD) — Arts. 7º, 46, 50, 51

---

## 1. Escopo e Princípios

Este checklist cobre o tratamento de dados pessoais em **templates de email** armazenados no banco (`EmailTemplate` + `EmailTemplateVersion`) e nas notificações transacionais disparadas pelo `RepassesNotificationService`.

**Princípios aplicados:**
- **Necessidade** (Art. 6º III) — só variáveis dinâmicas via `{{variavel}}`, nunca PII hardcoded
- **Segurança** (Art. 46) — endpoints admin com AuthGuard + AdminGuard; cache Redis não exposto
- **Prevenção** (Art. 50) — detecção automática bloqueia salvar PII em conteúdo
- **Transparência** (Art. 9º) — audit log de toda edição/publicação

---

## 2. Cenários Cobertos

### 2.1 Detecção de PII no conteúdo do template

| Cenário | Detecção | Bloqueio | Observação |
|---|---|---|---|
| CPF hardcoded (ex: `123.456.789-00`) | Regex `/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g` | Save bloqueado | Match dentro de `{{variavel}}` é ignorado (placeholder dinâmico, não hardcoded) |
| Email hardcoded (ex: `user@example.com`) | Regex `/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g` | Save bloqueado | Idem — exceções para placeholders |
| Telefone BR hardcoded (ex: `(11) 98765-4321`) | Regex `/\(\d{2}\)\s?9?\d{4}-?\d{4}/g` | Save bloqueado | Idem |
| RG / CNPJ hardcoded | Fora do escopo atual | Manual | Recomenda-se ampliar detector em sprint futura (sugestão: TASK-LGPD-FUT-01) |

### 2.2 Auditoria

| Operação | Audit log | Dados registrados |
|---|---|---|
| Criar versão DRAFT | `EMAIL_TEMPLATE_CREATED` | templateId, slug, version, createdByUserId, createdAt |
| Editar versão DRAFT | `EMAIL_TEMPLATE_UPDATED` | templateId, versionId, subjectBefore/After, htmlHashBefore/After |
| Publicar versão | `EMAIL_TEMPLATE_PUBLISHED` | templateId, versionId, publishedByUserId, publishedAt, diff completo |

**Retenção:** AuditLog segue política existente do projeto (mínimo 5 anos conforme regra de negócio).

### 2.3 Acesso e Exposição

| Recurso | Quem acessa | LGPD relevante |
|---|---|---|
| `GET /api/admin/email-templates` | Admin (AdminGuard) | OK — funcionalidade administrativa |
| `GET /api/admin/email-templates/:slug` | Admin | OK |
| `POST/PATCH /preview` | Admin | OK — preview usa dados fake, não reais |
| Cache Redis `email-template:active:{slug}` | Backend (interno) | Nunca exposto ao frontend/public |
| Email enviado | Destinatário (user logado ou role-específico) | Conteúdo renderizado de variáveis dinâmicas + template do banco |

### 2.4 Notificações do Repasse

| Evento | Quem recebe | Variáveis com PII potencial | Mitigação |
|---|---|---|---|
| `installment.requested` | Financeiros (role=FINANCEIRO) | `founderName`, `startupName` (não-PII mas identificável) | Sem CPF/email/telefone hardcoded |
| `installment.approved` | Fundador (owner da startup) | `founderName`, conta destino (em `{{dashboardUrl}}` apenas) | OK |
| `installment.rejected` | Fundador | `rejectionReason` (texto livre — cuidado!) | Validação no editor: rejeitar motivo se contiver PII hardcoded |
| `installment.completed` | Fundador | `txidC6` (não é PII, é identificador transacional) | OK |
| `repasse.configured` | Fundador | `valorParcela`, `intervaloDias` (não-PII) | OK |
| `repasse.concluded` | Fundador + Financeiro | Sem PII | OK |

**Observação importante:** `rejectionReason` é texto livre preenchido pelo Financeiro ao rejeitar parcela. Se o Financeiro escrever um motivo contendo CPF do fundador, esse dado vai para o email. **Mitigação recomendada (sprint futura):**
- Adicionar detector de PII no campo `rejectionReason` antes de persistir (mesma lógica do template validator)
- Ou adicionar warning no frontend quando o Financeiro digitar motivo que parece conter dados sensíveis

### 2.5 Templates Herdados (legado `.ts`)

Os 5 templates legados em `src/email/templates/*.ts` (welcome, verification-code, validation-email, forgot-password, rejection-notification) foram **migrados para o banco** via seed (`prisma/seed-email-templates.ts`). O `EmailService` mantém fallback para os arquivos `.ts` caso o template não exista no banco (defesa em profundidade para primeira execução antes do seed).

**Auditoria da migração:**
- Data: 2026-08-22
- Templates movidos: 5
- Templates novos: 6 (do repasse)
- Total no banco após seed: 11
- Arquivos `.ts` originais: **MANTIDOS** como fallback (não deletar até validação em produção)

---

## 3. Validações Implementadas (Testes)

| Teste | Arquivo | Cobertura |
|---|---|---|
| `lgpd-email-template.validator.spec.ts` | 8 testes | Detecta CPF, email, telefone em html/subject/text; ignora em `{{var}}`; lida com false-positives comuns (datas, números) |
| `email-render.service.spec.ts` | 5 testes | Interpolação básica, escape HTML anti-XSS, validação de required variables |
| `email-templates.service.spec.ts` | 6 testes | CRUD de versões, publish atômico, cache invalidation, getActiveBySlug |
| `repasses-notification.service.spec.ts` | 5 testes | Cada listener dispara EmailService com template slug correto |

**Total:** 24 testes automatizados.

---

## 4. Riscos Conhecidos & Mitigações Futuras

| Risco | Severidade | Mitigação planejada |
|---|---|---|
| Editor admin incluir PII hardcoded via copy-paste | Média | Detector regex já bloqueia salvar. **Futuro:** adicionar warning visual inline enquanto digita (não bloqueia mas alerta) |
| `rejectionReason` conter PII | Baixa-Média | **Futuro:** TASK-LGPD-FUT-01 — detector de PII no DTO `RejectInstallmentDto.motivo` |
| Cache Redis servir template antigo após publish | Baixa | Invalidação implementada em `publishVersion`. Cobertura: publish atômico + invalidate + audit |
| Versão DRAFT ficar órfã (criada mas nunca publicada) | Baixa | **Futuro:** cron de limpeza que arquiva DRAFTs > 90 dias |
| Editor sem rate limiting | Baixa | Endpoints admin sob `ThrottlerGuard` global já existente. OK |

---

## 5. Conformidade por Artigo da LGPD

| Artigo | Requisito | Status |
|---|---|---|
| Art. 6º (Princípios) | Necessidade, adequação, segurança | ✅ Variáveis dinâmicas + detector PII |
| Art. 7º (Bases legais) | Consentimento ou execução de contrato | ✅ Repasses são execução de contrato (termo de adesão assinado) |
| Art. 9º (Informação) | Titular informado sobre tratamento | ✅ Templates devem informar finalidade (ex: "Este email confirma sua solicitação de repasse") |
| Art. 33 (Transferência internacional) | AWS SES pode estar fora do Brasil | ⚠️ **Fora de escopo desta sprint.** Avaliar em sprint dedicada de LGPD global |
| Art. 46 (Segurança) | Medidas técnicas adequadas | ✅ AdminGuard + AuthGuard + LGPD validator + Audit log + cache invalidation |
| Art. 48 (Relatório de impacto) | RIPD quando tratamento de alto risco | ⚠️ **Fora de escopo.** Recomenda-se RIPD em sprint futura se houver ampliação de escopo |
| Art. 50 (Boas práticas) | Adotar padrões mínimos | ✅ Versionamento completo + audit log + cache + DTO validation |

---

## 6. Aprovação

| Papel | Nome | Data | Assinatura |
|---|---|---|---|
| DPO | _pendente_ | _pendente_ | _pendente_ |
| CTO | _pendente_ | _pendente_ | _pendente_ |
| Compliance Lead | _pendente_ | _pendente_ | _pendente_ |

---

## 7. Referências

- Lei 13.709/2018 (LGPD) — íntegra em `~/.config/opencode/training/lgpd-brasil.md`
- PRD FINANCEIRO — `scripts/PRD_FINANCEIRO.md`
- CASE.md §[Repasse] — regras de negócio do fluxo de repasse
- Tests specs — `src/api/email-templates/__tests__/` e `src/api/repasses/__tests__/`
