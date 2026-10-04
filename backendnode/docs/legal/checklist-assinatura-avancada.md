# Checklist de Verificacao Juridica — Assinatura Avancada (Lei 14.063/2020)

**PENDENTE_REVISAO_JURIDICA**

> Este documento contiene bullets verificaveis para o time juridico humano revisar
> antes de colocar a assinatura digital em producao. Cada item deve ser marcado
> como `[x]` apos validacao pelo advogado responsavel.
>
> **Data de revisao:** ___/___/______
> **Advogado responsavel:** _________________________
> **Status:** [ ] Aprovado [ ] Pendente ajustes

---

## 1. Identificacao Univoca do Signatario

- [ ] **Certificado X.509 com CN unico:** O certificado digital emitido para cada
  founder/startup inclui `CommonName` que identifica o signatário de forma unívoca
  (ex: `CPF-NUMBER` ou `CN=João Silva (CPF 123.456.789-00)`)
  - Local de implementacao: `ca-init.service.ts` (geração do certificado)

- [ ] **Serial number do certificado:** Cada certificado tem serial number único
  (128-bit random hex) que permite distinguir entre certificados de um mesmo titular
  - Local: `certificate.service.ts` -> `issue()`

- [ ] **Fingerprint SHA-256 da chave publica:** O certificado inclui
  `subjectKeyIdentifier` (SHA-256 da chave pública) para detecção de clones
  - Local: extensão `subjectKeyIdentifier` nos certificados CA

- [ ] **Vinculacao CPF-CNPJ:** O certificado do founder inclui o CPF do signatário;
  o certificado da startup inclui o CNPJ da pessoa jurídica
  - Validar que DTOs de onboarding capturam esses dados antes da emissão

---

## 2. Deteccao de Alteracao Posterior ao Sinal

- [ ] **Hash SHA-256 do PDF original:** O hash do documento (antes da assinatura)
  é calculado e armazenado junto com a assinatura em `SignatureAuditLog`
  - Local: `signature.service.ts` -> `signPdf()` (calcula hash antes de aplicar assinatura)

- [ ] **PAdES B-B com cadeia de certificação:** O PDF assinado inclui:
  - Assinatura criptográfica sobre o hash do documento
  - Cadeia de certificação (Root CA + Intermediate CA + certificado do signatário)
  - Timestamp de assinatura (para detectar replay attack)
  - Local: `signature.service.ts` + `node-signpdf` / `pdf-lib`

- [ ] **Integridade do PDF verificável:** O endpoint `/verificar/:documentId` valida
  `hashMatches: true` comparando o hash do PDF arquivado com o hash registrado
  no momento da assinatura
  - Local: `verificar.service.ts` -> `validateIntegrity()`

- [ ] **Nao há placeholder substituted:** O PDF final é um documento real (não um
  HTML convertido), com texto e estrutura imutável pós-assinatura
  - Verificar que o template do termo é gerado por `pdf-lib` (não `md-to-pdf`)

---

## 3. Trilha de Auditoria

- [ ] **IP do signatário:** `SignatureAuditLog` registra o endereço IP no momento
  da assinatura (coletado do request, campo `ipAddress`)
  - Local: `signature.service.ts` -> `signPdf()`

- [ ] **User-Agent do signatário:** Navegador/dispositivo que executou a assinatura
  é registrado (campo `userAgent`)
  - Local: `signature.service.ts`

- [ ] **Timestamp preciso:** Data/hora da assinatura em UTC (ISO 8601),
  com precisão de segundos, sincronizado com NTP
  - Local: campo `signedAt` em `SignedDocument`

- [ ] **Ação discriminada:** Cada ação no fluxo de assinatura gera um log
  separado: `aceite_checkbox`, `visualizacao_documento`, `assinatura_realizada`
  - Local: `SignatureAuditLog.action`

- [ ] **IP mascara em listagens publicas:** O endpoint `/verificar/:documentId`
  NUNCA expõe IP ou User-Agent do signatário (apenas campos não-PII são
  retornados ao público)
  - Local: `verificar.service.ts` -> mascara campos PII no response DTO

---

## 4. Pagina Publica de Verificacao

- [ ] **QR Code no PDF:** Todo PDF assinado contém QR code que aponta para
  `/verificar/:documentId` com o ID do documento
  - Local: `signature.service.ts` (insere QR code no PDF final)

- [ ] **Endpoint publicavel:** `/verificar/:documentId` não requer autenticação
  (rate-limited: 100 req/IP/min via ThrottlerGuard)
  - Local: `verificar.controller.ts`

- [ ] **Informacoes publicas apenas:** Response do `/verificar/:documentId`
  inclui apenas: tipo do documento, data de assinatura, versão do template,
  nome/mascara do signatário, status de validade do certificado
  - NUNCA expõe: CPF, CNPJ, IP, User-Agent, e-mail, telefone

- [ ] **Validade verificavel:** A resposta inclui `validation.certificatesActive=true`
  e `validation.hashMatches=true`, permitindo que qualquer terceiro confirme
  autenticidade sem acessar dados pessoais

---

## 5. Retencao e Preservacao (LGPD + Contabilidade)

- [ ] **Retencao minima de 7 anos:** `SignatureAuditLog` e `SignedDocument`
  são mantidos por 7 anos após a assinatura (LGPD Art. 7, V + contabilidade
  brasileira)
  - Local: politica de retenção em `StartupDeleteAuditLog.retentionUntil`
    (mesma política se aplica a documentos assinados)

- [ ] **Exclusao logica apenas:** Registros de assinatura NAO sao hard-deleted.
  A exclusão de startup por COMPLIANCE preserva os logs de assinatura.
  - Local: Prisma `SignedDocument` não tem `deletedAt`

- [ ] **Backup automatico:** Logs de auditoria sao includos no pipeline de
  backup diario do banco de dados
  - Verificar com time de infra que backup cobre tabelas de PKI

---

## 6. Nao-Repudio

- [ ] **Assinatura digital avançada (nao simples):** O termo é assinado com
  chave privada do signatário (emitida pelo nosso sistema), não apenas com
  um código enviado por e-mail
  - Local: `signature.service.ts` -> `signPdf()` usa chave do certificado X.509

- [ ] **Certificado com par de chaves:** Cada signatário recebe um certificado
  X.509 com chave privada única (RSA 2048) armazenada no KeyStorageService
  - Local: `CertificateService.issue()` + `InMemoryKeyStorageService`

- [ ] **Revogacao por motivo:** `CertificateService.revoke(certId, reason)`
  permite revogar um certificado antes da expiração com motivo documentado
  - Local: `certificate.service.ts` -> `revoke()`

- [ ] **Nao-ha delegacao:** A chave privada não é compartilhada nem delegável.
  O signatário é a única pessoa que possui acesso à sua chave privada
  (armazenada no KeyStorageService, não exposta ao signatário)

---

## 7. Mitigacao de Vazamentos PII

- [ ] **CPF/CNPJ mascarados na pagina publica:** `/verificar/:documentId`
  retorna `masked: "***.***.***-57"` para CPF e `**.***.***/****-90"` para CNPJ
  - Local: `verificar.service.ts` -> mascara methods

- [ ] **Logs nao contem PII em plaintext:** `SignatureAuditLog` registra IP e
  UA, mas esses campos sao:
  - Marcados como PII no schema Prisma
  - Redatados em queries de listagem para usuarios comuns
  - Acessíveis apenas para role COMPLIANCE

- [ ] **Nao-há armazenamento de chave privada em banco:** A chave privada do
  signatário JAMAIS é armazenada no banco de dados. Apenas o `privateKeyRef`
  (path no KeyStorageService) é persistido
  - Local: Prisma `CertificateAuthority.privateKeyRef` + `Certificate.privateKeyRef`

---

## 8. Processo de Revogacao e Disaster Recovery

- [ ] **Procedimento documentado:** Existe runbook de disaster recovery para
  revogação da Root CA e regeneração de toda a cadeia
  - Local: `AGENTS.md` -> secao "PKI — Disaster Recovery Runbook"

- [ ] **Revogacao de emergencia:** O sistema permite revogar imediatamente um
  certificado de founder/startup via `DELETE /admin/certificates/:id`
  (role COMPLIANCE)
  - Local: `certificate.service.ts` + controller

- [ ] **Notificacao ao titular:** Em caso de revogação, o signatário é
  notificado por e-mail com o motivo (se revogação forçada)
  - Verificar se `CertificateService.revoke()` envia notificação

---

## 9. Conformidade com Lei 14.063/2020 Art. 4º

- [ ] **Assinatura avancada:** O sistema implementa todos os requisitos do
  Art. 4º (identificação unívoca, detecção de alteração, assinatura com
  chave privada, vínculo lógico com documento)

- [ ] **Documentacao deconformidade:** Este checklist documenta a conformidade
  técnica para eventual demonstração em processo judicial ou auditoria

- [ ] **Nao-e ICP-Brasil:** Fica claro que a plataforma NÃO é uma AC credenciada
  ICP-Brasil e que os certificados NÃO são certificados ICP-Brasil qualificados

---

## Status de Revisao

| Item | Status | Observacao |
|------|--------|------------|
| 1.1  | [ ]   |            |
| 1.2  | [ ]   |            |
| 1.3  | [ ]   |            |
| 1.4  | [ ]   |            |
| 2.1  | [ ]   |            |
| 2.2  | [ ]   |            |
| 2.3  | [ ]   |            |
| 2.4  | [ ]   |            |
| 3.1  | [ ]   |            |
| 3.2  | [ ]   |            |
| 3.3  | [ ]   |            |
| 3.4  | [ ]   |            |
| 3.5  | [ ]   |            |
| 4.1  | [ ]   |            |
| 4.2  | [ ]   |            |
| 4.3  | [ ]   |            |
| 4.4  | [ ]   |            |
| 5.1  | [ ]   |            |
| 5.2  | [ ]   |            |
| 5.3  | [ ]   |            |
| 6.1  | [ ]   |            |
| 6.2  | [ ]   |            |
| 6.3  | [ ]   |            |
| 6.4  | [ ]   |            |
| 7.1  | [ ]   |            |
| 7.2  | [ ]   |            |
| 7.3  | [ ]   |            |
| 8.1  | [ ]   |            |
| 8.2  | [ ]   |            |
| 8.3  | [ ]   |            |
| 9.1  | [ ]   |            |
| 9.2  | [ ]   |            |
| 9.3  | [ ]   |            |

**Total: 33 items | Revisados: ___ | Pendentes: ___**
