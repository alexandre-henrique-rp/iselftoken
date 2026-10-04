# LGPD Review — Sprint S01 (Refatoração Campaigns)

> **Data:** 2026-07-29
> **Auditor:** lgpd-officer agent (Harness v6 — triagem automatizada)
> **Escopo:** S01.1 a S01.3a (SystemConfig + snapshots + 2 novos endpoints + auditoria CVM)
> **Base normativa:** LGPD (Lei 13.709/2018) + Resoluções CD/ANPD 4/2023, 15/2024, 18/2024 + CVM 88/2022 + Marco Civil da Internet

---

## Veredicto Geral

**❌ REPROVADO** — Sprint S01 introduziu tratamento de dados pessoais (IP, User-Agent, dados financeiros de startup, aceites de termos CVM) **sem** o conjunto mínimo de salvaguardas LGPD esperadas para um sistema em produção.

**S01 é compatível com regulação de software funcional, mas NÃO com regulação de proteção de dados.** Múltiplos findings de severidade `critical` e `high` foram identificados; **a sprint NÃO pode ser declarada "LGPD-compliant" e o deploy em produção deve ser bloqueado** até que os 7 blockers sejam sanados (ou aceitos formalmente pelo controlador com registro de risco).

---

## Sumário Executivo de Achados

| # | ID | Severidade | Categoria | Bloqueia deploy? |
|---|---|---|---|---|
| 1 | LGPD-FIND-S01-001 | 🔴 Critical | Cobrança automática sem base legal | **SIM** |
| 2 | LGPD-FIND-S01-002 | 🔴 Critical | IP/User-Agent nulos no caminho de criação | **SIM** |
| 3 | LGPD-FIND-S01-003 | 🟠 High | DPO/Encarregado não designado (Art. 41) | **SIM** |
| 4 | LGPD-FIND-S01-004 | 🟠 High | Aceite de termo sem texto + versionamento | **SIM** |
| 5 | LGPD-FIND-S01-005 | 🟠 High | Auditoria CVM sem retenção definida | **SIM** |
| 6 | LGPD-FIND-S01-006 | 🟠 High | SystemConfig sem histórico + FK quebrada | **SIM** |
| 7 | LGPD-FIND-S01-007 | 🟠 High | Direitos do titular Art. 18 ausentes | **SIM** |
| 8 | LGPD-FIND-S01-008 | 🟡 Medium | Sem plano de resposta a incidente | NÃO |
| 9 | LGPD-FIND-S01-009 | 🟡 Medium | Sem RIPD para equity crowdfunding | NÃO |
| 10 | LGPD-FIND-S01-010 | 🟢 Low | SistemaConfig sem alerta em mudança crítica | NÃO |

**Stats:** 2 critical · 5 high · 2 medium · 1 low · 0 informational

---

## 1. Cobrança Automática de Compliance Fee (R$ 500 após FUNDED)

### 1.1 Achados

#### 🔴 LGPD-FIND-S01-001 — Listener de cobrança automática **NÃO IMPLEMENTADO**

**Evidência:**
- ADR-008 §Implementation notes (linha 125) lista: `src/api/campaigns/service/compliance-fee.listener.ts (novo listener)`.
- Busca no filesystem (`glob '**/compliance-fee*'` em `src/`): **"No files found"**.
- Busca por `chargeComplianceFee|cobrarCompliance|FUNDED.*listener|campaign.funded` em `src/`: **0 matches**.
- `EventEmitter2` está configurado em `app.module.ts:53`, mas **nenhum emit/listen de `campaign.funded` ou `compliance.fee.*`** existe em nenhum arquivo.
- Schema `Campaign.complianceFeeBilled Boolean @default(false)` (`schema.prisma:655`) **nunca será setado para `true`** porque nada escreve nele.

**Impacto regulatório:** a S01 prometeu um comportamento que não existe. Se o time acredita que está cobrando R$ 500 automaticamente, está **enganado**. Se o deploy for para produção,会发现 `complianceFeeBilled=false` em todas as campanhas FUNDED para sempre, e o ADR-008 é um documento "aspiracional" sem reflexo no código.

**Risco LGPD:**
- Se a cobrança for implementada depois sem termo de aceite → **cobrança sem base legal** (Art. 7º) → ANPD pode classificar como abuso (Art. 51) + dano moral coletivo (CDC + LGPD).
- Se a startup for cobrada sem aviso prévio, fere Art. 6º, VI (transparência) + CDC Art. 6º (direito à informação clara).

#### 🔴 LGPD-FIND-S01-002 — Base legal da cobrança **não documentada nem implementada**

**Perguntas sem resposta no código atual:**

| Pergunta LGPD | Resposta encontrada |
|---|---|
| Qual a **base legal** (Art. 7º)? | **Não declarada em nenhum arquivo.** |
| Existe **termo de aceite** documentado? | **Não.** Não há arquivo de termo nem referência a texto jurídico. |
| Startup pode **opt-out** antes da cobrança? | **Não implementado.** Schema só tem flag booleano `complianceFeeBilled`. |
| Onde fica **evidência do consentimento** (audit log)? | **N/A** — não há consentimento coletado. |
| Como startup é **notificada** da cobrança? | **Nenhum canal** — nenhum e-mail, nenhum job, nada. |
| Qual o **prazo de contestação**? | **Não definido.** |
| O que acontece se startup **recusar pagar**? | **Não definido.** Sem bloqueio, sem cancelamento, sem escalonamento. |

**Base legal aplicável (proposta pelo auditor):**
- **Art. 7º, V (execução de contrato):** só é válida se a startup **assina contrato de adesão** explicitamente aceitando a cobrança. Hoje, não existe nem o contrato nem o momento de aceite.
- **Alternativa — Art. 7º, II (cumprimento de obrigação legal/regulatória):** pode-se argumentar que o compliance fee é contraprestação pela **fiscalização CVM 88/2022** que a plataforma faz. Mas mesmo assim, **precisa ser divulgada** na política de privacidade e no termo de uso.
- **Consentimento (Art. 7º, I) é inadequado** aqui porque é obrigatório para usar o serviço — vira "consentimento condicionado" e é vetado pela LGPD Art. 8º, §3º.

### 1.2 Recomendações (não aplicar, apenas propor)

> As recomendações abaixo são **PROPOSTAS DE MUDANÇA** para sprints futuras. O lgpd-officer **não implementa** código.

#### R1.1 — Implementar o listener (ALTA PRIORIDADE)

**Descrição:** Criar `src/api/campaigns/service/compliance-fee.listener.ts` que escute `campaign.funded` (emitido pelo service que transiciona status para FUNDED) e dispare a cobrança.

```typescript
// PROPOSTA — NÃO APLICAR AGORA
@Injectable()
export class ComplianceFeeListener {
  @OnEvent('campaign.funded')
  async handleCampaignFunded(payload: { campaignId: number }) {
    const fee = await this.configService.get('COMPLIANCE_FEE');
    await this.billingService.chargeStartup(payload.campaignId, fee, {
      legalBasis: 'Art. 7º, V — execução de contrato',
      contractReference: 'termo-adesao-digital-v1.0',
    });
    await this.prisma.campaign.update({
      where: { id: payload.campaignId },
      data: { complianceFeeBilled: true, complianceFeeBilledAt: new Date() },
    });
  }
}
```

**Esforço:** alto (2-3 dias incluindo módulo de billing + testes).

#### R1.2 — Vincular o listener a um termo de aceite REAL

**Descrição:** Antes de implementar a cobrança, criar:

1. `docs/legal/termo-adesao-digital.md` — texto jurídico do termo (com versão, ex: `v1.0.0`).
2. Campo `Campaign.termoAdesaoAceitoEm DateTime?` — quando foi aceito.
3. Campo `Campaign.termoAdesaoVersao String?` — qual versão do termo.
4. Hash SHA-256 do texto aceito em `Campaign.termoAdesaoHash String?` — prova de integridade.
5. **Bloqueio**: se `termoAdesaoAceitoEm === null` no momento da transição OPEN → FUNDED, **abortar transição** com 412 Precondition Failed.

**Esforço:** alto (4-5 dias incluindo revisão jurídica do termo).

#### R1.3 — Política de notificação + contestação

**Descrição:** Documentar em `docs/legal/compliance-fee-policy.md`:

- Notificação por e-mail 5 dias antes da cobrança (template).
- Prazo de contestação: **10 dias úteis** (padrão de mercado).
- Se startup recusar: campanha permanece `FUNDED` mas em estado `compliance_disputed` (novo status intermediário). Founder tem 30 dias para resolver; senão repasse é bloqueado.
- Comunicação via DPO (e-mail a definir).

**Esforço:** médio (1-2 dias para policy + templates; mudanças de schema para novo status).

---

## 2. Auditoria CVM (`CampaignOfferAuditLog`)

### 2.1 Achados

#### 🔴 LGPD-FIND-S01-002 — IP e User-Agent gravados como `null` no caminho de criação

**Evidência (`campaigns-create.service.ts:88-95`):**

```typescript
await this.prisma.$executeRawUnsafe(
  `INSERT INTO campaign_offer_audit_logs (campaignId, action, ip, userAgent, userId, occurredAt)
   VALUES (?, ?, ?, ?, ?, NOW())`,
  campaignId, action,
  null,    // <-- IP sempre null
  null,    // <-- UserAgent sempre null
  userId ?? null,
);
```

E o `campaigns.controller.ts` (linhas 88-91, 102-108, 154) **não** extrai `req.headers['x-forwarded-for']` nem `req.headers['user-agent']` para passar ao service nos métodos:
- `createFirstCampaign` (POST /:startupId)
- `requestNewRound` (POST /:startupId/new-round)
- `executeAction` (PATCH /:id/action)

Apenas `update` (linhas 175-178) e `updateDraft` (linhas 133-136) **passam** IP/UA corretamente.

**Impacto:** quando a startup cria a campanha aceitando `aceiteTermoRepasse=true`, **não há evidência** de que aquele IP/aquele User-Agent foram os do aceite. Em caso de disputa, **o registro de auditoria é inútil**.

**Base legal:** LGPD Art. 7º, §2º — "O consentimento será revogável a qualquer momento, mediante manifestação expressa do titular". Sem evidência do IP/UA do momento do aceite, não há como provar que o consentimento foi **livre e inequívoco** (Art. 8º).

#### 🟠 LGPD-FIND-S01-005 — Sem política de retenção; dados pessoais indefinidos

**Evidência (`schema.prisma:735-747`):**

```prisma
model CampaignOfferAuditLog {
  id         Int      @id @default(autoincrement())
  campaignId Int
  campaign   Campaign @relation(fields: [campaignId], references: [id])
  action     String
  ip         String?     // <-- dado pessoal (Art. 5º, I)
  userAgent  String?     // <-- dado pessoal (potencialmente identifica dispositivo)
  userId     Int?
  occurredAt DateTime @default(now())
  @@index([campaignId])
  @@map("campaign_offer_audit_logs")
}
```

**Não há** campo `retentionUntil`, `expiresAt`, nem job de purga. Tabela é append-only por design (não tem DELETE/Update na lógica).

**Base legal:**
- **LGPD Art. 5º, I** — IP e User-Agent são **dados pessoais** (identificam ou podem identificar pessoa física).
- **Art. 6º, V** (necessidade) — retenção deve ser a **mínima necessária**.
- **Art. 16** (eliminação) — "os dados pessoais serão eliminados após o término de seu tratamento [...] sendo autorizada a conservação para as seguintes finalidades: I — cumprimento de obrigação legal ou regulatória pelo controlador; [...]".
- **CVM 88/2022 + obrigação contábil (Lei 6.404/76 Art. 177)** — oferta pública de valores mobiliários tem retenção mínima de **5 anos** (CVM) + **5 anos** (contábil) = **conservador: 10 anos**, **mínimo recomendável: 7 anos**.

**Recomendação:** política de retenção de **7 anos** após `occurredAt` (compatível com obrigação fiscal/contábil/CVM), com job de purga que **anonimiza** (não deleta — porque o log pode ser exigido judicialmente) substituindo IP por `0.0.0.0` e UserAgent por `[REDACTED]`. Os 7 anos são **necessários e justificáveis** segundo Art. 16, I.

#### 🟠 LGPD-FIND-S01-004 — Aceite de termo sem texto + versionamento

**Evidência (`update-campaign.dto.ts:172`, `schema.prisma:679-680`):**

```typescript
@ApiPropertyOptional({ description: 'Aceite do termo de repasse' })
@IsOptional()
@IsBoolean()
aceiteTermoRepasse?: boolean;
```

```prisma
aceiteTermoRepasse   Boolean @default(false) // Art. 7º, V LGPD
declaracaoVeracidade Boolean @default(false) // Art. 6º, IX LGPD
```

**Problemas:**

1. **Campo é booleano puro** — sem texto do termo, sem hash, sem URL para o termo completo. Não há como provar qual foi o texto que o founder viu/aceitou.
2. **Sem versionamento** — se a redação do termo mudar, a tabela `CampaignOfferAuditLog` terá aceite "true" sem indicar qual versão foi aceita.
3. **Base legal ambígua no schema:** comentário diz "Art. 7º, V (execução de contrato)" mas a CVM 88/2022 obriga declarações específicas que se parecem mais com **consentimento** (Art. 7º, I).
4. **No `CampaignOfferAuditLog`**, o campo `action` é apenas `"ACEITE_TERMO_REPASSE"` ou `"DECLARACAO_VERACIDADE"` — não há referência à versão do termo.

**Base legal violada:** Art. 8º, §1º (consentimento deve ser **específico e destacado em finalidade específica**).

### 2.2 Recomendações

#### R2.1 — Corrigir IP/UA no caminho de criação (CRÍTICO — bloqueia deploy)

**Descrição:**
1. Em `campaigns.controller.ts`, **adicionar** extração de IP/UA em `createFirstCampaign`, `requestNewRound` e `executeAction` (padrão idêntico ao que já existe em `update` linhas 175-178 e `updateDraft` linhas 133-136).
2. Em `campaigns-create.service.ts`, **alterar assinatura** de `createAuditLogEntry` e `createCvmAuditLogs` para receber `ip` e `userAgent` como parâmetros (como já faz `campaigns-state.service.ts:81-106`).
3. Passar IP/UA do controller para o service em todos os métodos que chamam `createCvmAuditLogs`.

**Esforço:** baixo (1-2h — copy-paste + ajustar testes).

#### R2.2 — Versionar o termo e gravar hash

**Descrição:**
1. Adicionar campos:
   ```prisma
   model CampaignOfferAuditLog {
     // ... existentes
     termoVersao String?  // ex: "1.0.0"
     termoHash   String?  // SHA-256 do texto do termo no momento do aceite
   }
   ```
2. Mover texto do termo para `docs/legal/termo-repasse-cvm88-v1.0.0.md` e computar hash em build-time.
3. No service, calcular hash do termo atual e gravar junto com o aceite.

**Esforço:** médio (1 dia + revisão jurídica do termo).

#### R2.3 — Política de retenção para `CampaignOfferAuditLog`

**Descrição:**
1. Migration: `ALTER TABLE campaign_offer_audit_logs ADD COLUMN retentionUntil DATETIME NULL;` + backfill `retentionUntil = DATE_ADD(occurredAt, INTERVAL 7 YEAR)`.
2. Cron job diário (similar a `cert-expiration.cron.ts` em `src/common/pki/`):
   ```typescript
   @Cron('0 3 * * *')  // 3h da manhã
   async purgeExpiredAuditLogs() {
     const expired = await this.prisma.campaignOfferAuditLog.findMany({
       where: { retentionUntil: { lt: new Date() } },
     });
     for (const log of expired) {
       await this.prisma.campaignOfferAuditLog.update({
         where: { id: log.id },
         data: {
           ip: '0.0.0.0',       // anonimização
           userAgent: '[REDACTED]',
         },
       });
     }
   }
   ```
3. Documentar em `docs/data-retention.md` (não existe hoje — criar).

**Esforço:** médio (2 dias).

#### R2.4 — Criptografia em repouso para IP/UA (Art. 6º, VII)

**Descrição:** IP e User-Agent em texto plano no DB. Embora não sejam "dado sensível" (Art. 5º, II), são **dado pessoal** (Art. 5º, I) e devem ter proteção (Art. 6º, VII + Art. 46).

**Opções:**
- **Criptografia em coluna** (AES-256-GCM via `ENCRYPT()`/`DECRYPT()` do MySQL ou via Prisma middleware) — exige rotação de chave.
- **Hash de IP + truncação** — armazenar SHA-256(IP + salt) e truncar para `/24` (IPv4) ou `/48` (IPv6). User-Agent → categorizar (`mobile`, `desktop`, `bot`) e descartar texto integral.

**Recomendação pragmática:** **truncamento de IP** (já é padrão de mercado para analytics; preserva utilidade para antifraude) + **categorização de User-Agent**. Isso atende Art. 6º, V (necessidade) e Art. 6º, VII (segurança) sem overhead de criptografia.

**Esforço:** baixo (1 dia).

---

## 3. Configurações Dinâmicas (`SystemConfig`)

### 3.1 Achados

#### 🟠 LGPD-FIND-S01-006 — `updatedBy` sem FK + sem histórico

**Evidência (`schema.prisma:1103-1112`):**

```prisma
model SystemConfig {
  id          Int      @id @default(autoincrement())
  key         String   @unique
  value       Decimal  @db.Decimal(15, 4)
  description String?  @db.Text
  updatedAt   DateTime @updatedAt
  updatedBy   Int?     // User ID que alterou (log-only, sem FK)

  @@map("system_configs")
}
```

**Problemas:**

1. **`updatedBy Int?` sem `@relation`** — comentário diz "log-only, sem FK", mas isso é **anti-pattern**:
   - Se User for deletado, o `updatedBy` aponta para user inexistente (registro órfão).
   - Não há integridade referencial: alteração via Prisma pode setar `updatedBy: 999999` (id inválido) sem erro.

2. **Sem tabela de histórico:** `SystemConfig` guarda apenas o estado atual. Quem mudou `PLATFORM_ADMIN_FEE_PCT` de 0.20 para 0.25 em 2026-XX-XX? **Não há resposta** — perdeu-se.

3. **Sem alerta** quando config crítica muda (ex: `PLATFORM_ADMIN_FEE_PCT`, `COMPLIANCE_FEE`, `CAMPAIGN_MIN_TARGET`). Conforme `seed-system-config.ts:36-44`, essas são configs que afetam **valores financeiros e compliance** — mudanças devem ser auditáveis em tempo real.

4. **Service (`system-config.service.ts:109-128`)** chama `setConfig` corretamente gravando `updatedBy: userId`, mas não há listener que notifique DPO/admin quando config crítica muda.

**Base legal violada:**
- **Art. 6º, X (responsabilização e prestação de contas)** — controlador deve **demonstrar conformidade**.
- **Art. 37 (registros das operações de tratamento)** — "O controlador e o operador, no âmbito de suas competências, pelo tratamento de dados pessoais, individualmente ou por meio de associações, poderão formular regras de boas práticas [...]" — inclui manter registros.
- **Art. 50 (boas práticas e governança)** — mudanças em configs de compliance devem ser rastreáveis.

#### 🟢 LGPD-FIND-S01-010 — Sem alerta em mudança crítica

**Evidência:** já descrita acima — `setConfig` não emite evento nem notifica ninguém.

**Impacto:** admin financeiro pode alterar `COMPLIANCE_FEE` de R$ 500 para R$ 5000 sem que DPO/CTO saibam em tempo real. Apenas descobririam na próxima auditoria.

### 3.2 Recomendações

#### R3.1 — Adicionar FK em `SystemConfig.updatedBy` → `User`

**Descrição:**
```prisma
model SystemConfig {
  // ...
  updatedById Int?
  updatedBy   User? @relation(fields: [updatedById], references: [id], onDelete: SetNull)
  @@map("system_configs")
}
```

**Justificativa:** integridade referencial. Se User for deletado (raro mas possível), `updatedById` vira `NULL` mas o registro histórico **permanece** (Art. 16 — eliminação ≠ desreferenciação).

**Esforço:** baixo (1h + migration).

#### R3.2 — Criar tabela de histórico `SystemConfigHistory`

**Descrição:**
```prisma
model SystemConfigHistory {
  id          Int      @id @default(autoincrement())
  key         String
  oldValue    Decimal? @db.Decimal(15, 4)
  newValue    Decimal  @db.Decimal(15, 4)
  changedById Int
  changedBy   User @relation(fields: [changedById], references: [id], onDelete: Restrict)
  changedAt   DateTime @default(now())
  reason      String?  @db.Text  // "ajuste inflação", "decisão board", etc.
  ipAddress   String?
  userAgent   String?
  
  @@index([key, changedAt])
  @@map("system_config_history")
}
```

**Preenchimento:** no `setConfig` (`system-config.service.ts:109`), após `upsert`, fazer `$transaction` com INSERT em `SystemConfigHistory` contendo `oldValue`, `newValue`, `changedById`, `reason` (do body do request), `ipAddress`, `userAgent`.

**Esforço:** médio (1-2 dias + migration + novos campos no DTO).

#### R3.3 — Notificação ao DPO em mudança de config crítica

**Descrição:**
1. Criar decorator `@CriticalConfig(key: string)` para marcar configs críticas.
2. Listener que, ao detectar mudança em config crítica, envia e-mail ao DPO + Slack notification com snapshot da mudança.
3. Lista de configs críticas: `PLATFORM_ADMIN_FEE_PCT`, `COMPLIANCE_FEE`, `CAMPAIGN_MIN_TARGET`, `CAMPAIGN_MAX_TARGET`, `TOKEN_TRANSACTION_FEE`.

**Esforço:** médio (2-3 dias + integração com `src/email/`).

#### R3.4 — Endpoint admin para DPO consultar histórico

**Descrição:** `GET /admin/configs/:key/history?page=1&limit=25` retorna últimas N mudanças daquela chave. Protegido por guard que aceita ADMIN + COMPLIANCE (DPO). Prazo de retenção: **10 anos** (Art. 16, I — obrigação legal/regulatória).

**Esforço:** baixo (1 dia).

---

## 4. Bloqueios Transversais (afetam toda a sprint)

### 🟠 LGPD-FIND-S01-003 — DPO/Encarregado NÃO designado

**Evidência:** busca por `DPO|Encarregado|encarregado` em `src/` retorna **apenas** referências ao endpoint MinIO (`MINIO_ENDPOINT`), **nenhuma** menção a Encarregado de Dados.

**Base legal:** **Art. 41 LGPD** — "O controlador deverá indicar encarregado pelo tratamento de dados pessoais". A designação é **obrigatória**, sob pena de sanção (já aplicada: Telekall Infoservice 2023-2024, multas de R$ 14.400).

**Recomendação R-DPO:**
1. Designar formalmente um DPO (pode ser o CTO/founder em startup early-stage, **mas precisa ser documentado**).
2. Criar e-mail dedicado `dpo@iselftoken.com.br` (não pode ser `contato@` ou e-mail pessoal).
3. Publicar nome + e-mail em:
   - Política de privacidade (`docs/legal/politica-privacidade.md` — não existe, criar).
   - Rodapé do site/app.
   - Formulário de consentimento.
   - Página de contato.
4. Comunicar à ANPD via portal gov.br/anpd (Res. CD/ANPD 18/2024).

**Esforço:** baixo (1 dia para documentação) + 1 dia para configuração de e-mail + 1 dia para publicação.

---

### 🟠 LGPD-FIND-S01-007 — Direitos do titular (Art. 18) **não implementados**

**Evidência:** busca por `/api/privacy|/users/me.*export|right.*to.*deletion|portability` em `src/` retorna **nenhum endpoint de privacidade**. Existe apenas `users/me` para perfil básico, **sem exportação/eliminação/portabilidade**.

**Base legal:** LGPD Art. 18, I-IX e §1º — **10 direitos** que devem ser atendidos em **15 dias** (Res. CD/ANPD 15/2024).

**Checklist de ausência:**

| Direito (Art. 18) | Endpoint/UI? | Prazo 15d? | Log de atendimento? |
|---|---|---|---|
| I — confirmação de tratamento | ❌ | ❌ | ❌ |
| II — acesso | ❌ (parcial via `users/me`) | ❌ | ❌ |
| III — correção | ✅ (PATCH /users/me) | n/a | ❌ |
| IV — anonimização/bloqueio/eliminação parcial | ❌ | ❌ | ❌ |
| V — portabilidade | ❌ | ❌ | ❌ |
| VI — eliminação (consentimento) | ❌ | ❌ | ❌ |
| VII — info sobre compartilhamento | ❌ | ❌ | ❌ |
| VIII — info sobre não-consentimento | ❌ | ❌ | ❌ |
| IX — revogação do consentimento | ❌ | ❌ | ❌ |
| §1º — oposição | ❌ | ❌ | ❌ |

**Recomendação R-RIGHTS:**
1. Criar módulo `src/api/privacy/` com os 10 endpoints:
   - `GET /api/privacy/treatments` (Art. 18, I)
   - `GET /api/privacy/my-data` (Art. 18, II)
   - `PATCH /api/privacy/my-data` (Art. 18, III)
   - `POST /api/privacy/my-data/anonymize` (Art. 18, IV)
   - `GET /api/privacy/portability` (Art. 18, V) — JSON/CSV
   - `DELETE /api/privacy/my-data` (Art. 18, VI) — soft-delete + job de purga
   - `GET /api/privacy/sharing` (Art. 18, VII)
   - `GET /api/privacy/no-consent-info` (Art. 18, VIII)
   - `POST /api/privacy/revoke-consent` (Art. 18, IX)
   - `POST /api/privacy/opposition` (Art. 18, §1º)
2. Tabela `PrivacyRequest` com `userId, requestType, requestedAt, fulfilledAt, responsePayload`.
3. Cron que verifica SLA de 15 dias e alerta DPO se atrasar.

**Esforço:** alto (1-2 sprints dedicada). **NÃO bloqueia S01** se houver **roadmap explícito** para S02.

---

### 🟡 LGPD-FIND-S01-008 — Sem plano de resposta a incidente

**Evidência:** busca por `docs/incidents.md` ou `*incident-response*` em `backendnode/`: **não encontrado**.

**Base legal:** Art. 48 LGPD + Res. CD/ANPD 18/2024 — comunicação à ANPD em **2 dias úteis** + comunicação aos titulares afetados.

**Recomendação R-INCIDENT:**
1. Criar `docs/incidents/incident-response-playbook.md` com:
   - Definição de "incidente" (Art. 5º, XV).
   - Equipe de resposta (24/7? em startup: 1 pessoa de plantão).
   - Runbook de contenção (1h target).
   - Avaliação de risco (4h target) usando checklist Art. 48.
   - Template de notificação ANPD (link para portal).
   - Template de notificação a titulares.
   - Lista de logs a preservar (NUNCA deletar logs pós-incidente — Art. 6º, X).
2. Integrar com Sentry/PagerDuty (já tem Sentry configurado conforme `docs/sentry-setup.md`).
3. Simulado (tabletop) trimestral.

**Esforço:** baixo (1-2 dias para playbook). **Bloqueador conceitual** mas pode ser endereçado em S02.

---

### 🟡 LGPD-FIND-S01-009 — Sem RIPD para equity crowdfunding

**Evidência:** busca por `docs/ripd/` ou `RIPD|DPIA|dpi-a` em `backendnode/`: **não encontrado**.

**Base legal:** Art. 38 LGPD — RIPD obrigatório quando tratamento pode gerar **risco alto** às garantias e princípios. Critérios da ANPD incluem:
- Tratamento de dados sensíveis em larga escala.
- **Tratamento para fins de mercado de capitais** ← este caso é equity crowdfunding (CVM 88/2022).
- Perfilamento, scoring.
- Crianças/adolescentes.
- Transferência internacional.

**Recomendação R-RIPD:**
1. Criar `docs/ripd/campaigns-ripd-v1.md` antes de ir para produção, contendo:
   - Descrição do tratamento (ciclo da campanha, quem é o titular, quais dados).
   - Bases legais (Art. 7º, V para cadastro; Art. 7º, II para CVM 88/2022; Art. 7º, I para aceite de termos).
   - Riscos identificados: cobrança sem base legal; auditoria CVM com dado pessoal em texto plano; ausência de DPO; ausência de Art. 18.
   - Medidas de mitigação (cada finding acima é uma mitigação).
   - Salvaguardas (TLS, criptografia, controle de acesso, logs de auditoria).
   - Revisão anual ou em mudança significativa.
2. Assinar pelo DPO (ou CTO enquanto não há DPO).

**Esforço:** médio (3-5 dias com revisão jurídica). **Bloqueador conceitual**, pode ser endereçado em S02 se houver commitment.

---

## 5. Resumo Executivo

| Severidade | Item | Ação Requerida | Sprint alvo |
|---|---|---|---|
| 🔴 Crítica | LGPD-FIND-S01-001 | Implementar listener de cobrança + base legal explícita | **S01.4 (hotfix antes de produção)** ou **bloquear deploy** |
| 🔴 Crítica | LGPD-FIND-S01-002 | Passar IP/UA em TODOS os caminhos de aceite de termo | **S01.4 (hotfix)** |
| 🟠 Alta | LGPD-FIND-S01-003 | Designar DPO + publicar e-mail + comunicar ANPD | **S02** |
| 🟠 Alta | LGPD-FIND-S01-004 | Versionar termo + gravar hash + bloquear aceite sem termo lido | **S02** |
| 🟠 Alta | LGPD-FIND-S01-005 | Política de retenção de 7 anos + job de purga + truncamento de IP | **S02** |
| 🟠 Alta | LGPD-FIND-S01-006 | FK em `updatedBy` + tabela de histórico + alerta ao DPO | **S02** |
| 🟠 Alta | LGPD-FIND-S01-007 | Implementar endpoints Art. 18 (10 direitos) | **S03-S04** |
| 🟡 Média | LGPD-FIND-S01-008 | Plano de resposta a incidente (runbook + simulados) | **S02** |
| 🟡 Média | LGPD-FIND-S01-009 | RIPD para equity crowdfunding | **S02** |
| 🟢 Baixa | LGPD-FIND-S01-010 | Alerta em mudança de SystemConfig crítica | **S03** |

---

## 6. Bloqueios para Deploy

### **SIM — Deploy em produção bloqueado por 7 findings:**

1. 🔴 LGPD-FIND-S01-001 — cobrança automática sem base legal nem termo de aceite (se implementada depois sem safeguards, configura **infração direta** à LGPD).
2. 🔴 LGPD-FIND-S01-002 — auditoria CVM incompleta no caminho de criação (evidência de consentimento fragilizada).
3. 🟠 LGPD-FIND-S01-003 — ausência de DPO fere Art. 41 (multa histórica: R$ 14.400 por infração).
4. 🟠 LGPD-FIND-S01-004 — aceite de termo sem texto/versionamento/hash (consentimento sem prova de validade).
5. 🟠 LGPD-FIND-S01-005 — retenção indefinida de dado pessoal (Art. 16, Art. 6º, V).
6. 🟠 LGPD-FIND-S01-006 — histórico de mudanças em SystemConfig ausente (Art. 6º, X + Art. 37).
7. 🟠 LGPD-FIND-S01-007 — Art. 18 não atendido (titular sem canal para exercer direitos).

### Aceite formal de risco

Se o controlador (CTO/founder) decidir deployar mesmo assim, **deve registrar formalmente**:

```markdown
## DECLARAÇÃO DE ACEITE DE RISCO — Sprint S01

Eu, [NOME], na qualidade de controlador dos dados tratados pela plataforma iSelfToken,
DECLARO estar ciente dos 7 achados LGPD acima reportados pelo lgpd-officer agent e
DECIDO, por minha conta e risco, deployar a Sprint S01 em produção.

Estou ciente de que:
1. A ANPD pode aplicar multa de até 2% do faturamento do grupo econômico (limitada a R$ 50M).
2. Titulares podem mover ação coletiva com base no CDC + LGPD (dano moral).
3. Em caso de incidente, ausência de DPO + ausência de Art. 18 agravam a sanção.
4. As correções estão planejadas para S02-S04 conforme tabela acima.

Assinatura: ___________________
Data: ____/____/2026
```

**Sem esta declaração**, o lgpd-officer recomenda **loopback para phase.5.build** com rework focado nos 7 blockers.

---

## 7. Validação de Compliance (checagens obrigatórias)

- ✅ **LGPD Art. 5º (definição de dado pessoal)** — citado em LGPD-FIND-S01-005 (IP e User-Agent são dado pessoal).
- ✅ **LGPD Art. 7º (bases legais)** — citado em LGPD-FIND-S01-001 (Art. 7º, V ou II) e LGPD-FIND-S01-004 (Art. 7º, I).
- ✅ **LGPD Art. 16 (eliminação)** — citado em LGPD-FIND-S01-005 (retensão justificada por obrigação legal/regulatória).
- ✅ **LGPD Art. 18 (direitos do titular)** — citado em LGPD-FIND-S01-007 (10 direitos ausentes).
- ✅ **CVM 88/2022** — referenciada em LGPD-FIND-S01-001 (obrigação de compliance fee) e LGPD-FIND-S01-005 (obrigação de retenção de registros de oferta).

---

## 8. Notas para o orchestrator

1. **LGPD Officer é triagem, não parecer jurídico formal.** Para os 2 findings críticos (`-001` e `-002`), recomenda-se escalação para advogado especializado em proteção de dados antes de qualquer deploy.

2. **A sprint S01 é tecnicamente sólida** (zero erros de tipo, 67 testes passando, validações dinâmicas funcionando). O que falta é **conformidade regulatória de proteção de dados** — uma camada que normalmente é tratada em paralelo, não em série.

3. **Caminho de menor risco para destravar o gate:**
   - Hotfix de 1 dia: LGPD-FIND-S01-002 (passar IP/UA nos 3 controllers faltantes) + LGPD-FIND-S01-006 (FK em `updatedBy`).
   - S02 dedicada: DPO + endpoints Art. 18 + retenção de 7 anos + RIPD.
   - S03: feature de compliance fee completa (termo + listener + billing module + opt-out).

4. **Próxima revisão sugerida:** após hotfix de LGPD-FIND-S01-002 (re-execução do scan).

---

**Aviso do agente:** Esta é uma ferramenta de **triagem automatizada**, não substitui advogado(a) humano(a). Em caso de dúvida complexa (cobrança sem base legal, retenção indefinida, ausência de DPO), **bloqueie e escale**. A opinião acima é fundamentada em lei, mas a **decisão final** é do controlador com seu/sua advogado(a).

