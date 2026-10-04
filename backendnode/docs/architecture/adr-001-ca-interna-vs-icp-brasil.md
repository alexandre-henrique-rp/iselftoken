# ADR-001: Certificate Authority Interna vs ICP-Brasil

## Status

**Accepted** -- Marco M6 (10/07/2026)

## Context

A plataforma Iselftoken permite captação de investimento em startups via termos de adesão digitais.
Esses termos precisam ser assinados com **presunção de validade jurídica** para que tenham
efeito legal frente ao ordenamento brasileiro.

A Lei 14.063/2020 (Lei das Assinaturas Digitais) define três níveis de assinatura:

| Nível | Descrição | Presunção |
|-------|-----------|-----------|
| **Assinatura simples** | Apenas e-mail ou método equivocado | Não presume autenticidade |
| **Assinatura avançada** | Identificação unívoca + detecção de alteração | Presunção relativa (inverte-se ônus) |
| **Assinatura qualificada** | ICP-Brasil + certificado emitido por AC credenciada | Presunção absoluta |

Nosso cenário é uma **plataforma de captação de investimento** (não é um cartório nem um
órgão público). Assinar um termo de investimento com ICP-Brasil qualificada seria:

1. Proibitivo em custo (R$ 200-500 por certificado + AC credenciada)
2. Burocrático demais para o fluxo de onboarding de fundadores
3. Desnecessário para o nível de presunção que precisamos

Precizamos de uma solução que:
- Identifique o signatário de forma unívoca (CPF + certificado X.509)
- Detecte qualquer alteração posterior no documento (hash SHA-256 + PAdES B-B)
- Mantenha trilha de auditoria (IP + User-Agent + timestamp)
- Forneça página pública de verificação para terceiros

## Decision

Adotamos uma **CA interna própria (X.509 avançado)** com as seguintes características:

- **Tipo de certificado:** X.509 v3, RSA 2048-bit, SHA-256
- **Padrão de assinatura:** PKCS#7 / CMS com `AdES-BES` (Baseline)
- **Formato do documento:** PAdES B-B (PDF Advanced Electronic Signature - Baseline B)
- **Base legal:** Lei 14.063/2020, Art. 4º - assinatura eletrônica avançada
- **Cadeia de certificação:** Root CA (auto-assinada, offline) -> Intermediate CA (online)
- **Armazenamento de chaves:** HashiCorp Vault Transit Engine (produção) / stub in-memory (dev)
- **Trilha de auditoria:** SignatureAuditLog com IP + User-Agent + timestamp + ação

**Não** adotamos ICP-Brasil qualificada porque o ônus de uma AC credenciada não se justifica
para o modelo de plataforma de captação.

## Consequences

### Positivos

- **Custo controlado:** Sem pagamento recorrente a AC terceira
- **Autonomia:** Controle total sobre ciclo de vida dos certificados
- **Conformidade técnica:** Atende ao Art. 4º da Lei 14.063/2020 (assinatura avançada)
- **Trilha auditoria:** logs de IP/UA/timestamp para cada assinatura
- **Página pública:** Qualquer terceiro pode verificar autenticidade via QR code no PDF

### Negativos (e mitigações)

- **Ônus probatório maior que ICP-Brasil:** A assinatura avançada tem presunção relativa,
  não absoluta. Em caso de disputa, podemos necesitar de evidências complementares.
  **Mitigação:** trilha de auditoria robusta + página pública de verificação + hash SHA-256
  do documento intacto.

- **Revogação manual:** Não há CRL/OCSP automático.
  **Mitigação:** certificado com validade de 1 ano para founders; revogação por
  `CertificateService.revoke()` com motivo persistido no banco.

- **Chave privada da Root CA em Vault:** Se o Vault for comprometido, toda a cadeia é
  comprometida.
  **Mitigação:** Root CA offline (chave privada armazenada no Vault Transit, que nunca
  exporta a chave - operações de assinatura via API). Intermediate/leaf keys são
  stub in-memory em runtime (não são Root CA keys).

### Técnicas

- A Root CA tem validade de 10 anos; se precisar revogar antes, há procedure de
  disaster recovery documentada em `AGENTS.md`.
- O certificado da CA interna **NÃO** é uma ICP-Brasil e **NÃO** deve ser apresentado
  como tal a nenhum órgão ou autoridade.

## Alternatives Considered

### 1. Clicksign / DocuSign / HelloSign

**Descrição:** APIs de assinatura eletrônica de terceiros (SaaS).

**Prós:**
- Integração rápida (REST API)
- Presunção de validade jurídica (alguns provedores são qualificados ICP-Brasil)
- Sem infraestrutura própria

**Contras:**
- **Lock-in externo:** Dados de signatários em servidores de terceiros
- **Custo recorrente:** Planos por envelope/assinatura (R$ 5-50 por transação)
- **Customização limitada:** Template de documento restrito
- **Latência:** Dependência de API externa para cada assinatura

**Decisão:** Descartado por lock-in e custo recorrente. Para uma plataforma que pode
assinar milhares de termos, o custo SaaS é proibitivo.

### 2. ICP-Brasil Qualificada (AC credenciada)

**Descrição:** Certificados digitais emitidos por Autoridades Certificadoras credenciadas
pela ICP-Brasil (Serpro, Certisign, etc.), no padrão ICP-Brasil.

**Prós:**
- Presunção absoluta de autenticidade (Art. 10, Lei 14.063/2020)
- Validade jurídica plena perante qualquer órgão público ou privado
-smartcard/token obrigatório = dupla fator físico

**Contras:**
- **Custo:** R$ 200-500 por certificado + emissão + renovação anual
- **Burocracia:** Usuario precisa de smartcard/token ou instalado
- **Fluxo de onboarding:** Incompatível com cadastro 100% digital de fundadores
- **Infraestrutura:** AC credenciada exige compliance rigoroso (SOC 2, auditeite, etc.)

**Decisão:** Descartado por custo e incompatibilidade com o fluxo de onboarding digital.
Usado apenas se o marco regulatório exigir explicitamente ICP-Brasil qualificada para
investimento em startups.

### 3. CA interna (nossa escolha)

- **Custo:** mínimo (infraestrutura Vault existente)
- **Flexibilidade:** controle total sobre ciclo de vida e política de certificados
- **Conformidade:** Lei 14.063/2020 Art. 4º (assinatura avançada)
- **Risco:** ônus probatório maior que ICP-Brasil qualificada

## References

- [Lei 14.063/2020 (Lei das Assinaturas Digitais)](http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/L14063.htm)
- [MLDC/TI - Assinatura Digital Avançada vs Qualificada](https://www.gov.br/iti/pt-br/assuntos/faq/perguntas-frequentes-1/arquivos/perguntas-frequentes-assinatura-digital-avancada.pdf)
- [PAdES - ETSI TS 102 778](https://www.etsi.org/deliver/etsi_ts/102700_102799/10277804/01.01.01_60/ts_10277804v010101p.pdf)
- [HashiCorp Vault Transit Engine](https://developer.hashicorp.com/vault/docs/secrets/transit)

## Notas de Implementação

- A cadeia de certificação é: `Root CA (RSA 2048, 10 anos) -> Intermediate CA (RSA 2048, 5 anos)`
- Root CA: `ISELFTOKEN ROOT CA G1` — auto-assinada, offline
- Intermediate CA: `ISELFTOKEN INTERMEDIATE CA G1` — assinado pela Root CA
- Certificados de founders e startups: emitidos pela Intermediate CA, validade 1 ano
- Armazenamento em produção: Vault Transit Engine (`KEY_STORAGE_MODE=vault`)
- Armazenamento em dev: stub in-memory criptografado com AES-256-GCM

---

*Este ADR não substitui revisão jurídica formal. Documento como ponto de partida
para discussão com o time legal.*
