# Signature

**Propósito:** Módulo de assinatura digital PAdES de documentos PDF (Termo de Adesão). Aplica assinatura digital Basic B-B usando certificados X.509 emitidos pela PKI interna e chaves privadas armazenadas no KeyStorageService.

**Dependências:**
- `[../common/pki](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/pki/AGENTS.md)` (emissão de certificados X.509 e bootstrap da CA)
- `[../common/pki/key-storage](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/pki/key-storage)` (`IKeyStorageService` e `KEY_STORAGE_SERVICE` para recuperar chave privada)
- `node-forge` — conversão PEM → P12 e manipulação de certificados
- `node-signpdf` — aplicação da assinatura PAdES no buffer PDF
- `pdf-lib` / `pdfkit` (transitivo via node-signpdf) — manipulação do PDF

**Mapa de Arquivos:**
- [signature.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/signature/signature.module.ts) - módulo NestJS que importa `PkiModule` e provê `SignatureService`
- [signature.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/signature/signature.service.ts) - serviço `signPdf(input)` que retorna buffer assinado + hash SHA-256 + metadados
- [signature.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/signature/signature.service.spec.ts) - testes unitários do serviço de assinatura
